// 게임판 엔진: 캔버스 애니메이션, 입력, 매치·낙하·연쇄 흐름.
// React는 점수판·버튼·오버레이를 맡고, 매 프레임 바뀌는 판 상태는 여기서 직접 관리한다.
import { N, T, START_MOVES, GEMS, HINT_IDLE_SEC } from './constants';
import { findMatches, findHint, randomTypes, groupScore } from './logic';
import { buildSprites } from './gems';

const SWAP_SPEED = 7;  // 칸/초
const GRAVITY = 55;    // 칸/초²
const CELL_A = '#211d3b', CELL_B = '#1a1730', GOLD = '#ffcf3d', KB = '#8fd3ff';

const rnd = (n) => Math.floor(Math.random() * n);
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const gem = (t, r, c, y) => ({ t, r, c, x: c, y: y ?? r, vy: 0, s: 1, falling: y != null && y < r });
const adjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
const same = (a, b) => a && b && a.r === b.r && a.c === b.c;

export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{sound, onHud:(h:{score,moves})=>void, onCombo:(n)=>void, onGameOver:(score)=>void}} opts
   */
  constructor(canvas, { sound, onHud, onCombo, onGameOver }) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = sound;
    this.cb = { onHud, onCombo, onGameOver };
    this.S = 60; this.W = 480; this.dpr = 1; this.sprites = [];
    this.grid = []; this.dying = []; this.particles = []; this.floats = [];
    this.score = 0; this.moves = START_MOVES; this.busy = false; this.over = false;
    this.sel = null; this.hint = null; this.idle = 0; this.kb = null; this.down = null;
    this.waiters = []; this.dead = false; this.last = 0; this.landedAt = 0;

    this.listeners = {
      pointerdown: (e) => this.onPointerDown(e),
      pointermove: (e) => this.onPointerMove(e),
      pointerup: () => { this.down = null; },
      pointercancel: () => { this.down = null; },
      keydown: (e) => this.onKey(e),
    };
    for (const [k, fn] of Object.entries(this.listeners)) canvas.addEventListener(k, fn);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.raf = requestAnimationFrame((t) => { this.last = t; this.frame(t); });
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    for (const [k, fn] of Object.entries(this.listeners)) this.cv.removeEventListener(k, fn);
    this.waiters = [];
  }

  /* ---------- 공개 동작 ---------- */
  async newGame() {
    this.over = false; this.score = 0; this.moves = START_MOVES;
    this.sel = null; this.hint = null; this.idle = 0;
    this.dying = []; this.particles = []; this.floats = [];
    this.hud();
    this.busy = true;
    this.dropIn(randomTypes());
    await this.settle();
    this.busy = false;
  }

  showHint() {
    if (this.busy || this.over) return;
    this.hint = findHint(this.types());
    this.sound.hint();
  }

  isBusy() { return this.busy; }

  /* ---------- 판 상태 ---------- */
  types() { return this.grid.map((row) => row.map((g) => (g ? g.t : -1))); }
  hud() { this.cb.onHud({ score: this.score, moves: this.moves }); }

  dropIn(t) {
    this.grid = t.map((row, r) => row.map((v, c) => gem(v, r, c, r - N - 0.3 - c * 0.12)));
  }

  swapCells(a, b) {
    const ga = this.grid[a.r][a.c], gb = this.grid[b.r][b.c];
    this.grid[a.r][a.c] = gb; this.grid[b.r][b.c] = ga;
    ga.r = b.r; ga.c = b.c; gb.r = a.r; gb.c = a.c;
    ga.falling = gb.falling = false;
  }

  collapse() {
    for (let c = 0; c < N; c++) {
      let w = N - 1;
      for (let r = N - 1; r >= 0; r--) {
        const g = this.grid[r][c];
        if (!g) continue;
        if (r !== w) { this.grid[w][c] = g; this.grid[r][c] = null; g.r = w; g.falling = true; g.vy = 0; }
        w--;
      }
      for (let r = w; r >= 0; r--) this.grid[r][c] = gem(rnd(T), r, c, r - (w + 1) - 0.2);
    }
  }

  /* ---------- 게임 흐름 ---------- */
  async doSwap(a, b) {
    if (this.busy || this.over) return;
    this.busy = true; this.hint = null; this.idle = 0; this.sel = null;
    this.sound.swap();
    this.swapCells(a, b);
    await this.settle(); if (this.dead) return;

    if (!findMatches(this.types()).cells.size) {
      this.sound.fail();
      this.swapCells(a, b);
      await this.settle();
      this.busy = false;
      return;
    }
    this.moves--; this.hud();
    await this.resolve(); if (this.dead) return;
    this.busy = false; this.idle = 0;
    if (this.moves <= 0) { this.over = true; this.cb.onGameOver(this.score); }
  }

  async resolve() {
    let combo = 0;
    for (;;) {
      const { cells, groups } = findMatches(this.types());
      if (!cells.size) break;
      combo++;
      for (const grp of groups) {
        const n = grp.length, p = groupScore(n, combo);
        this.score += p;
        const cx = grp.reduce((s, [, c]) => s + c, 0) / n + 0.5;
        const cy = grp.reduce((s, [r]) => s + r, 0) / n + 0.5;
        this.floats.push({ x: cx, y: cy, text: '+' + p, life: 1, color: n >= 4 ? GOLD : '#ffffff' });
      }
      this.hud();
      if (combo >= 2) this.cb.onCombo(combo);
      this.sound.match(combo);
      for (const k of cells) {
        const r = Math.floor(k / N), c = k % N, g = this.grid[r][c];
        if (!g) continue;
        this.dying.push(g); this.burst(g); this.grid[r][c] = null;
      }
      await wait(160); if (this.dead) return;
      this.collapse();
      await this.settle(); if (this.dead) return;
    }
    if (!findHint(this.types())) await this.reshuffle();
  }

  async reshuffle() {
    this.floats.push({ x: N / 2, y: N / 2, text: '더 맞출 수 없어 섞는 중', life: 1.4, color: KB });
    await wait(500); if (this.dead) return;
    for (const row of this.grid) for (const g of row) if (g) this.dying.push(g);
    this.grid = this.grid.map((row) => row.map(() => null));
    await this.settle(); if (this.dead) return;
    this.dropIn(randomTypes());
    await this.settle();
  }

  burst(g) {
    const col = GEMS[g.t];
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3;
      this.particles.push({
        x: g.c + 0.5, y: g.r + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5,
        life: 1, size: 0.05 + Math.random() * 0.05, color: i % 3 ? col.light : col.mid,
      });
    }
  }

  /* ---------- 애니메이션 ---------- */
  settled() {
    return this.dying.length === 0 &&
      this.grid.every((row) => row.every((g) => !g || (g.x === g.c && g.y === g.r)));
  }
  settle() {
    return new Promise((res) => (this.settled() ? res() : this.waiters.push(res)));
  }

  resize() {
    this.W = this.cv.clientWidth || 480;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.W * this.dpr);
    this.S = this.W / N;
    this.sprites = buildSprites(Math.ceil(this.S * this.dpr));
  }

  frame(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let landed = false;

    for (const row of this.grid) for (const g of row) {
      if (!g) continue;
      if (g.x !== g.c) {
        const d = g.c - g.x, st = SWAP_SPEED * dt;
        g.x = Math.abs(d) <= st ? g.c : g.x + Math.sign(d) * st;
      }
      if (g.y !== g.r) {
        if (g.falling && g.y < g.r) {
          g.vy += GRAVITY * dt;
          g.y = Math.min(g.r, g.y + g.vy * dt);
          if (g.y === g.r) { g.vy = 0; g.falling = false; landed = true; }
        } else {
          const d = g.r - g.y, st = SWAP_SPEED * dt;
          g.y = Math.abs(d) <= st ? g.r : g.y + Math.sign(d) * st;
        }
      } else g.falling = false;
    }
    if (landed && now - this.landedAt > 90) { this.landedAt = now; this.sound.land(); }

    for (const g of this.dying) g.s -= dt * 6;
    this.dying = this.dying.filter((g) => g.s > 0);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.life -= dt * 1.6; }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) { f.y -= dt * 0.9; f.life -= dt * 1.1; }
    this.floats = this.floats.filter((f) => f.life > 0);

    if (!this.busy && !this.over && this.grid.length) {
      this.idle += dt;
      if (this.idle > HINT_IDLE_SEC && !this.hint) this.hint = findHint(this.types());
    }

    this.draw(now);
    if (this.waiters.length && this.settled()) {
      const w = this.waiters; this.waiters = []; w.forEach((f) => f());
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  rr(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  draw(now) {
    const { ctx, S, W } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);

    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      ctx.fillStyle = (r + c) % 2 ? CELL_B : CELL_A;
      this.rr(c * S + 1.5, r * S + 1.5, S - 3, S - 3, S * 0.14); ctx.fill();
    }
    if (this.sel) {
      const { r, c } = this.sel;
      ctx.fillStyle = 'rgba(255,207,61,.18)'; this.rr(c * S + 1.5, r * S + 1.5, S - 3, S - 3, S * 0.14); ctx.fill();
      ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; this.rr(c * S + 3, r * S + 3, S - 6, S - 6, S * 0.12); ctx.stroke();
    }
    if (this.hint && !this.busy) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.35 * Math.sin(now / 160)})`; ctx.lineWidth = 3;
      for (const h of this.hint) { this.rr(h.c * S + 4, h.r * S + 4, S - 8, S - 8, S * 0.12); ctx.stroke(); }
    }
    if (this.kb) {
      ctx.strokeStyle = KB; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      this.rr(this.kb.c * S + 5, this.kb.r * S + 5, S - 10, S - 10, S * 0.1); ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.save();
    this.rr(0, 0, W, W, 14); ctx.clip();
    const drawOne = (g, scale) => {
      const sz = S * scale, cx = (g.x + 0.5) * S, cy = (g.y + 0.5) * S;
      if (cy < -S) return;
      ctx.drawImage(this.sprites[g.t], cx - sz / 2, cy - sz / 2, sz, sz);
    };
    for (const row of this.grid) for (const g of row) {
      if (!g) continue;
      const isSel = same(this.sel, g) && g.x === g.c && g.y === g.r;
      drawOne(g, isSel ? 1.06 + 0.05 * Math.sin(now / 110) : 1);
    }
    for (const g of this.dying) { ctx.globalAlpha = Math.max(0, g.s); drawOne(g, 1 + (1 - g.s) * 0.5); }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x * S, p.y * S, p.size * S * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(S * 0.42)}px Jua, "Malgun Gothic", sans-serif`;
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 1.5);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,40,.9)'; ctx.strokeText(f.text, f.x * S, f.y * S);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x * S, f.y * S);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- 입력 (PRD F-02~F-04) ---------- */
  cellAt(e) {
    const rect = this.cv.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const c = Math.floor(x / (rect.width / N)), r = Math.floor(y / (rect.height / N));
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c, x, y } : null;
  }

  onPointerDown(e) {
    this.sound.init(); this.kb = null;
    if (this.busy || this.over) return;
    const p = this.cellAt(e);
    if (!p) return;
    this.idle = 0; this.hint = null;
    if (this.sel && adjacent(this.sel, p)) { this.doSwap(this.sel, p); this.down = null; return; }
    this.sel = same(this.sel, p) ? null : { r: p.r, c: p.c };
    this.down = p;
    try { this.cv.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
  }

  onPointerMove(e) {
    const { down } = this;
    if (!down || this.busy || this.over) return;
    const rect = this.cv.getBoundingClientRect(), cell = rect.width / N;
    const dx = e.clientX - rect.left - down.x, dy = e.clientY - rect.top - down.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.35) return;
    const to = Math.abs(dx) > Math.abs(dy)
      ? { r: down.r, c: down.c + Math.sign(dx) }
      : { r: down.r + Math.sign(dy), c: down.c };
    this.down = null;
    if (to.r >= 0 && to.r < N && to.c >= 0 && to.c < N) this.doSwap({ r: down.r, c: down.c }, to);
  }

  onKey(e) {
    const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!this.kb) this.kb = { r: 3, c: 3 };
    if (dirs[e.key]) {
      e.preventDefault();
      const [dr, dc] = dirs[e.key];
      const to = { r: Math.max(0, Math.min(N - 1, this.kb.r + dr)), c: Math.max(0, Math.min(N - 1, this.kb.c + dc)) };
      if (this.sel && !this.busy && !this.over && adjacent(this.sel, to)) { this.sound.init(); this.doSwap(this.sel, to); }
      this.kb = to;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); this.sound.init();
      if (this.busy || this.over) return;
      this.sel = same(this.sel, this.kb) ? null : { ...this.kb };
    } else if (e.key === 'Escape') {
      this.sel = null;
    }
  }
}

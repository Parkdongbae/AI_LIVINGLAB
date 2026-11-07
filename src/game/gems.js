// 보석 그림 (PRD 6장: 왼쪽 위에서 빛이 비치는 다면체)
import { GEMS } from './constants';

function poly(n, rot, r = 1) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    p.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return p;
}

// 바깥 꼭짓점, 윗면 중심, 윗면 크기 비율
function shape(t) {
  switch (t) {
    case 0: return { pts: poly(4, -Math.PI / 2, 0.98), c: [0, 0], k: 0.5 };                 // 마름모
    case 1: return { pts: [[0, -0.92], [0.98, 0.78], [-0.98, 0.78]], c: [0, 0.22], k: 0.42, dy: -0.12 }; // 삼각형
    case 2: return { pts: [[-0.55, -0.72], [0.55, -0.72], [0.95, -0.18], [0, 0.95], [-0.95, -0.18]], c: [0, -0.3], k: 0.5 }; // 다이아몬드 컷
    case 3: return { pts: poly(8, Math.PI / 8, 0.97), c: [0, 0], k: 0.55 };                // 팔각형
    case 4: return { pts: poly(6, 0, 0.97), c: [0, 0], k: 0.52 };                          // 육각형
    default: return { pts: poly(8, Math.PI / 8, 0.95), c: [0, 0], k: 0.5, round: true };   // 팔각형 + 둥근 중심
  }
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}
function path(g, P) {
  g.beginPath();
  P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
}

export function drawGem(g, t, cx, cy, R) {
  const col = GEMS[t], s = shape(t), dy = (s.dy || 0) * R;
  const P = s.pts.map(([x, y]) => [cx + x * R, cy + y * R + dy]);
  const C = [cx + s.c[0] * R, cy + s.c[1] * R + dy];
  const I = P.map(([x, y]) => [C[0] + (x - C[0]) * s.k, C[1] + (y - C[1]) * s.k]);

  // 그림자 + 바탕
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = R * 0.25; g.shadowOffsetY = R * 0.1;
  path(g, P); g.fillStyle = col.dark; g.fill();
  g.restore();

  // 옆면: 빛 방향과 면의 방향에 따라 밝기
  const L = [-0.55, -0.83];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], ia = I[i], ib = I[(i + 1) % P.length];
    let nx = (a[0] + b[0]) / 2 - C[0], ny = (a[1] + b[1]) / 2 - C[1];
    const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    const l = (nx * L[0] + ny * L[1] + 1) / 2;
    g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...ib); g.lineTo(...ia); g.closePath();
    g.fillStyle = l > 0.5 ? mix(col.mid, col.light, (l - 0.5) * 1.6) : mix(col.dark, col.mid, l * 2);
    g.fill();
  }

  // 윗면
  const yTop = Math.min(...I.map((p) => p[1])), yBot = Math.max(...I.map((p) => p[1]));
  const grd = g.createLinearGradient(0, yTop, 0, yBot);
  grd.addColorStop(0, col.light); grd.addColorStop(1, col.mid);
  path(g, I); g.fillStyle = grd; g.fill();

  if (s.round) {
    const rg = g.createRadialGradient(C[0] - R * 0.1, C[1] - R * 0.12, 0, C[0], C[1], R * 0.48);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.45, col.light); rg.addColorStop(1, col.mid);
    g.beginPath(); g.arc(C[0], C[1], R * 0.4, 0, Math.PI * 2); g.fillStyle = rg; g.fill();
  }

  // 면 경계선과 테두리
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = Math.max(1, R * 0.03);
  for (let i = 0; i < P.length; i++) { g.beginPath(); g.moveTo(...P[i]); g.lineTo(...I[i]); g.stroke(); }
  path(g, I); g.stroke();
  g.lineJoin = 'round'; g.strokeStyle = col.edge; g.lineWidth = Math.max(1.5, R * 0.07);
  path(g, P); g.stroke();

  // 반짝임
  const ty = t === 1 ? R * 0.1 : 0;
  g.save(); g.globalAlpha = 0.85; g.fillStyle = '#fff';
  g.beginPath(); g.ellipse(C[0] - R * 0.2, C[1] - R * 0.2 + ty, R * 0.13, R * 0.055, -Math.PI / 4, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.6;
  g.beginPath(); g.arc(C[0] + R * 0.02, C[1] - R * 0.32 + ty * 1.2, R * 0.035, 0, Math.PI * 2); g.fill();
  g.restore();
}

/** 칸 크기(px)에 맞춘 보석 그림을 미리 그려 둔다 (PRD 7장: 성능) */
export function buildSprites(px) {
  return GEMS.map((_, t) => {
    const c = document.createElement('canvas');
    c.width = c.height = px;
    drawGem(c.getContext('2d'), t, px / 2, px / 2, px * 0.4);
    return c;
  });
}

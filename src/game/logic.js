// 게임 규칙 (PRD 4장). 모두 순수 함수이며, 판은 t[r][c] = 보석 종류(0~T-1), 빈칸은 -1.
import { N, T } from './constants';

const inBoard = (r, c) => r >= 0 && c >= 0 && r < N && c < N;

/** (r,c)를 왼쪽 위로 하는 2×2가 모두 같은 보석인지 */
export function squareAt(t, r, c) {
  if (!inBoard(r, c) || !inBoard(r + 1, c + 1)) return false;
  const v = t[r][c];
  return v >= 0 && t[r][c + 1] === v && t[r + 1][c] === v && t[r + 1][c + 1] === v;
}

/** (r,c)의 보석이 한 줄 3개 이상 또는 2×2에 속하는지 */
export function matchAt(t, r, c) {
  const v = t[r][c];
  if (v < 0) return false;
  let n = 1;
  for (let k = c - 1; k >= 0 && t[r][k] === v; k--) n++;
  for (let k = c + 1; k < N && t[r][k] === v; k++) n++;
  if (n >= 3) return true;
  n = 1;
  for (let k = r - 1; k >= 0 && t[k][c] === v; k--) n++;
  for (let k = r + 1; k < N && t[k][c] === v; k++) n++;
  if (n >= 3) return true;
  for (const [dr, dc] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
    if (squareAt(t, r + dr, c + dc)) return true;
  }
  return false;
}

/**
 * 판 전체의 매치를 찾는다.
 * @returns {{cells:Set<number>, groups:Array<Array<[number,number]>>}} cells는 r*N+c 키
 */
export function findMatches(t) {
  const cells = new Set();
  const groups = [];
  const scan = (get, toRC) => {
    for (let a = 0; a < N; a++) {
      let run = 1;
      for (let b = 1; b <= N; b++) {
        if (b < N && get(a, b) >= 0 && get(a, b) === get(a, b - 1)) { run++; continue; }
        if (run >= 3) {
          const grp = [];
          for (let k = b - run; k < b; k++) {
            const [r, c] = toRC(a, k);
            cells.add(r * N + c);
            grp.push([r, c]);
          }
          groups.push(grp);
        }
        run = 1;
      }
    }
  };
  scan((r, c) => t[r][c], (r, c) => [r, c]); // 가로
  scan((c, r) => t[r][c], (c, r) => [r, c]); // 세로
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      if (!squareAt(t, r, c)) continue;
      const grp = [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]];
      grp.forEach(([a, b]) => cells.add(a * N + b));
      groups.push(grp);
    }
  }
  return { cells, groups };
}

/** 매치를 만드는 교환 하나를 찾는다. 없으면 null */
export function findHint(types) {
  const t = types.map((row) => [...row]);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        if (!inBoard(r2, c2)) continue;
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]];
        const ok = matchAt(t, r, c) || matchAt(t, r2, c2);
        [t[r][c], t[r2][c2]] = [t[r2][c2], t[r][c]];
        if (ok) return [{ r, c }, { r: r2, c: c2 }];
      }
    }
  }
  return null;
}

/** 매치가 하나도 없고, 맞출 수 있는 수가 최소 하나 있는 새 판 */
export function randomTypes(rand = Math.random) {
  const rnd = () => Math.floor(rand() * T);
  for (;;) {
    const t = [];
    for (let r = 0; r < N; r++) {
      t.push([]);
      for (let c = 0; c < N; c++) {
        let v;
        do { v = rnd(); } while (
          (c >= 2 && t[r][c - 1] === v && t[r][c - 2] === v) ||
          (r >= 2 && t[r - 1][c] === v && t[r - 2][c] === v) ||
          (r >= 1 && c >= 1 && t[r - 1][c] === v && t[r][c - 1] === v && t[r - 1][c - 1] === v)
        );
        t[r].push(v);
      }
    }
    if (findHint(t)) return t;
  }
}

/** 매치 그룹 하나의 점수 (PRD 4.5) */
export function groupScore(size, combo) {
  const bonus = size === 4 ? 40 : size >= 5 ? 120 : 0;
  return (size * 10 + bonus) * combo;
}

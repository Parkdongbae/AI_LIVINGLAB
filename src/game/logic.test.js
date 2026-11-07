import { describe, expect, it } from 'vitest';
import { N } from './constants';
import { findHint, findMatches, groupScore, matchAt, randomTypes, squareAt } from './logic';

// 매치가 없는 기본 판: 대각선 줄무늬 (r + 2c) % 5 → 가로·세로·2×2 모두 같은 값이 이웃하지 않는다
const base = () => Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => (r + 2 * c) % 5));
const keys = (cells) => [...cells].sort((a, b) => a - b);

describe('기본 판', () => {
  it('매치가 없다', () => {
    expect(findMatches(base()).cells.size).toBe(0);
  });
});

describe('한 줄 매치', () => {
  it('가로 3개를 찾는다', () => {
    const t = base();
    t[0][0] = t[0][1] = t[0][2] = 5;
    const m = findMatches(t);
    expect(keys(m.cells)).toEqual([0, 1, 2]);
    expect(m.groups).toHaveLength(1);
  });
  it('세로 4개를 한 그룹으로 찾는다', () => {
    const t = base();
    for (let r = 2; r < 6; r++) t[r][3] = 5;
    const m = findMatches(t);
    expect(m.groups).toHaveLength(1);
    expect(m.groups[0]).toHaveLength(4);
  });
});

describe('2×2 정사각형 매치', () => {
  it('정사각형 4칸을 찾는다', () => {
    const t = base();
    t[3][4] = t[3][5] = t[4][4] = t[4][5] = 5;
    expect(squareAt(t, 3, 4)).toBe(true);
    const m = findMatches(t);
    expect(keys(m.cells)).toEqual([3 * N + 4, 3 * N + 5, 4 * N + 4, 4 * N + 5]);
    expect(m.groups).toHaveLength(1);
  });
  it('네 칸 모두에서 matchAt이 참이다', () => {
    const t = base();
    t[0][0] = t[0][1] = t[1][0] = t[1][1] = 5;
    for (const [r, c] of [[0, 0], [0, 1], [1, 0], [1, 1]]) expect(matchAt(t, r, c)).toBe(true);
    expect(matchAt(t, 2, 2)).toBe(false);
  });
  it('2×2만 만들 수 있는 교환도 힌트로 찾는다', () => {
    const t = base();
    // (0,0),(0,1),(1,0)은 5, (1,2)에 5 → (1,1)과 (1,2)를 바꾸면 2×2 완성
    t[0][0] = t[0][1] = t[1][0] = 5;
    t[1][2] = 5;
    expect(findMatches(t).cells.size).toBe(0);
    const h = findHint(t);
    expect(h).not.toBeNull();
    const swapped = t.map((row) => [...row]);
    const [a, b] = h;
    [swapped[a.r][a.c], swapped[b.r][b.c]] = [swapped[b.r][b.c], swapped[a.r][a.c]];
    expect(findMatches(swapped).cells.size).toBeGreaterThan(0);
  });
});

describe('새 판 만들기', () => {
  it('매치가 없고 맞출 수 있는 수가 있다', () => {
    for (let i = 0; i < 50; i++) {
      const t = randomTypes();
      expect(findMatches(t).cells.size).toBe(0);
      expect(findHint(t)).not.toBeNull();
    }
  });
});

describe('점수', () => {
  it('PRD 4.5 점수표를 따른다', () => {
    expect(groupScore(3, 1)).toBe(30);
    expect(groupScore(4, 1)).toBe(80);
    expect(groupScore(5, 1)).toBe(170);
    expect(groupScore(3, 3)).toBe(90);
  });
});

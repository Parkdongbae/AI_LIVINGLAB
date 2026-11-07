export const N = 8;            // 게임판 한 변의 칸 수
export const T = 6;            // 보석 종류 수
export const START_MOVES = 30; // 시작 이동 횟수
export const LOW_MOVES = 5;    // 이 값 이하이면 이동 횟수를 경고색으로 표시
export const HINT_IDLE_SEC = 7;
export const BEST_KEY = 'gemmine-best';

export const GEMS = [
  { name: '루비', light: '#ffb3b3', mid: '#e8323a', dark: '#8e0f18', edge: '#4f060b' },
  { name: '에메랄드', light: '#c4ffad', mid: '#2fb52a', dark: '#0f6410', edge: '#073807' },
  { name: '사파이어', light: '#d2e8ff', mid: '#3a86f0', dark: '#153f9a', edge: '#0a2259' },
  { name: '핑크 다이아', light: '#ffd8f5', mid: '#ee6fd0', dark: '#a3318a', edge: '#5a144c' },
  { name: '토파즈', light: '#fff5b8', mid: '#ffc21a', dark: '#c27400', edge: '#653a00' },
  { name: '자수정', light: '#f2e0ff', mid: '#a24ee6', dark: '#561a8e', edge: '#2e0e4a' },
];

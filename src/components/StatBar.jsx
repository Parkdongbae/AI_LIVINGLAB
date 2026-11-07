import { LOW_MOVES } from '../game/constants';

const fmt = (n) => n.toLocaleString('ko-KR');

export default function StatBar({ score, moves, best }) {
  return (
    <div className="stats">
      <div className="stat score"><span>점수</span><b>{fmt(score)}</b></div>
      <div className={`stat${moves <= LOW_MOVES ? ' low' : ''}`}><span>남은 이동</span><b>{moves}</b></div>
      <div className="stat"><span>최고 기록</span><b>{fmt(Math.max(best, score))}</b></div>
    </div>
  );
}

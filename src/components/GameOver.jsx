const fmt = (n) => n.toLocaleString('ko-KR');

export default function GameOver({ result, onAgain }) {
  if (!result) return null;
  return (
    <div className="over" role="dialog" aria-label="게임 종료">
      <h2>게임 종료</h2>
      <div className="big">{fmt(result.score)}</div>
      <p>{result.isNewBest ? '새 최고 기록이에요!' : `최고 기록 ${fmt(result.best)}점`}</p>
      <button className="primary" onClick={onAgain} autoFocus>다시 하기</button>
    </div>
  );
}

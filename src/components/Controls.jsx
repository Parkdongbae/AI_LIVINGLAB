export default function Controls({ soundOn, onHint, onToggleSound, onNewGame }) {
  return (
    <div className="controls">
      <button onClick={onHint}>힌트</button>
      <button onClick={onToggleSound} aria-pressed={soundOn}>{soundOn ? '소리 켜짐' : '소리 꺼짐'}</button>
      <span className="grow" />
      <button className="primary" onClick={onNewGame}>새 게임</button>
    </div>
  );
}

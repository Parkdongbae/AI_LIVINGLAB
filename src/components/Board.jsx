import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { GameEngine } from '../game/engine';

/**
 * 캔버스 게임판. 엔진을 만들고 없애는 일만 하고,
 * 부모에게는 newGame()·showHint()만 열어 둔다.
 */
const Board = forwardRef(function Board({ sound, onHud, onCombo, onGameOver, children }, ref) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  // 엔진은 한 번만 만들므로, 콜백은 ref로 최신 값을 넘긴다.
  const cbRef = useRef({ onHud, onCombo, onGameOver });
  cbRef.current = { onHud, onCombo, onGameOver };

  useEffect(() => {
    const engine = new GameEngine(canvasRef.current, {
      sound,
      onHud: (h) => cbRef.current.onHud(h),
      onCombo: (n) => cbRef.current.onCombo(n),
      onGameOver: (s) => cbRef.current.onGameOver(s),
    });
    engineRef.current = engine;
    engine.newGame();
    return () => engine.destroy();
  }, [sound]);

  useImperativeHandle(ref, () => ({
    newGame: () => engineRef.current?.newGame(),
    showHint: () => engineRef.current?.showHint(),
    isBusy: () => engineRef.current?.isBusy() ?? true,
  }), []);

  return (
    <div className="board-wrap">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="8×8 보석 게임판. 방향키로 이동, Enter로 선택 후 방향키로 교환"
      />
      {children}
    </div>
  );
});

export default Board;

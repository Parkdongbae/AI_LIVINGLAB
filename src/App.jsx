import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Board from './components/Board';
import StatBar from './components/StatBar';
import ComboBanner from './components/ComboBanner';
import GameOver from './components/GameOver';
import Controls from './components/Controls';
import { BEST_KEY, START_MOVES } from './game/constants';
import { createSound } from './game/sound';

function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* 저장이 막혀도 게임은 계속 */ }
}

export default function App() {
  const sound = useMemo(() => createSound(), []);
  const boardRef = useRef(null);
  const bestRef = useRef(loadBest());

  const [hud, setHud] = useState({ score: 0, moves: START_MOVES });
  const [best, setBest] = useState(bestRef.current);
  const [combo, setCombo] = useState(null);   // { n, id }
  const [result, setResult] = useState(null); // { score, isNewBest, best }
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => { sound.setEnabled(soundOn); }, [sound, soundOn]);

  const handleCombo = useCallback((n) => setCombo({ n, id: Date.now() + Math.random() }), []);

  const handleGameOver = useCallback((score) => {
    const isNewBest = score > bestRef.current;
    if (isNewBest) {
      bestRef.current = score;
      saveBest(score);
      setBest(score);
      sound.fanfare();
    }
    setResult({ score, isNewBest, best: bestRef.current });
  }, [sound]);

  const newGame = () => {
    sound.init();
    setResult(null);
    setCombo(null);
    boardRef.current?.newGame();
  };

  return (
    <div className="wrap">
      <header>
        <h1>보석 광산</h1>
        <span className="sub">같은 보석을 한 줄에 3개, 또는 2×2로 모으세요</span>
      </header>

      <StatBar score={hud.score} moves={hud.moves} best={best} />

      <Board ref={boardRef} sound={sound} onHud={setHud} onCombo={handleCombo} onGameOver={handleGameOver}>
        <ComboBanner combo={combo} />
        <GameOver result={result} onAgain={newGame} />
      </Board>

      <Controls
        soundOn={soundOn}
        onHint={() => { sound.init(); boardRef.current?.showHint(); }}
        onToggleSound={() => { sound.init(); setSoundOn((v) => !v); }}
        onNewGame={() => { if (!boardRef.current?.isBusy()) newGame(); }}
      />

      <p className="help">
        보석을 옆 칸으로 끌거나, 두 보석을 차례로 눌러 자리를 바꿉니다. 같은 보석이 2×2 정사각형으로 모여도 부서집니다.
        4개를 맞추면 +40, 5개 이상은 +120 보너스, 연쇄 콤보마다 점수가 배로 올라갑니다.
      </p>
    </div>
  );
}

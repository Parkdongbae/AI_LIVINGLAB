// 효과음 (PRD F-13). 브라우저 정책상 첫 조작 때 init()을 불러야 소리가 난다.
export function createSound() {
  let ac = null;
  let enabled = true;

  function init() {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      else if (ac.state === 'suspended') ac.resume();
    } catch { /* 소리 없이 진행 */ }
  }

  function tone(freq, dur, type = 'sine', vol = 0.1, when = 0) {
    if (!ac || !enabled) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + when;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch { /* 무시 */ }
  }

  return {
    init,
    setEnabled(v) { enabled = v; },
    swap: () => tone(420, 0.06, 'sine', 0.06),
    fail: () => tone(170, 0.14, 'square', 0.04),
    land: () => tone(140 + Math.random() * 40, 0.05, 'sine', 0.05),
    hint: () => tone(880, 0.1, 'sine', 0.05),
    match(combo) {
      const base = 520 * Math.pow(1.122, Math.min(combo, 8) - 1);
      tone(base, 0.18, 'triangle', 0.12);
      tone(base * 1.5, 0.22, 'sine', 0.07, 0.05);
    },
    fanfare() {
      [1, 1.26, 1.5].forEach((m, i) => tone(660 * m, 0.3, 'triangle', 0.1, i * 0.12));
    },
  };
}

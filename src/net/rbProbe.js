// Prueba del rollback (solo para tests): guarda el estado, simula, vuelve atrás y simula de nuevo con las
// mismas teclas. Si las dos pasadas no dan idéntico, devuelve la primera diferencia encontrada.
import { cloneVal, RUNNER_KEYS, KEEP_REF, FrameInput, stateHash } from './netplay.js';
import { mulberry32 } from '../core/utils.js';
import { useDetMath, restoreMath } from './detmath.js';

export async function rbProbe(app, gameId, { frames = 600, every = 90, span = 40, seed = 7 } = {}) {
  const runner = app.runner;
  const input = new FrameInput();
  let simMs = 0;
  const rng = mulberry32(seed);
  const keyRng = mulberry32(seed + 1);
  const BITS = [1, 2, 4, 8, 16, 32];
  const keys = new Map();
  const keyFor = (f) => {
    if (!keys.has(f)) {
      const k = [0, 1].map(() => { let held = 0; for (const b of BITS) if (keyRng() < 0.25) held |= b; return [held, keyRng() < 0.2 ? BITS[(keyRng() * 6) | 0] : 0, null]; });
      keys.set(f, k);
    }
    return keys.get(f);
  };
  const sim = (fn) => { const prev = Math.random; Math.random = rng; useDetMath(); try { return fn(); } finally { restoreMath(); Math.random = prev; } };
  const players = [{ name: 'A', char: 'volt', color: '#3985FF', acc: 'none' }, { name: 'B', char: 'mochi', color: '#FF654F', acc: 'none' }];
  const p = runner.play(gameId, { players, difficulty: 0.5, options: {}, mode: 'quick', online: true, input, clock: () => simMs, inputLag: 200 }).catch(() => {});
  sim(() => runner.createGame());
  runner.startCountdown();
  const step = (f) => {
    const k = keyFor(f);
    input.cur[0] = k[0]; input.cur[1] = k[1];
    simMs = f * (1000 / 60);
    sim(() => runner.frame(1 / 60, false));
  };
  const snap = () => { const memo = new Map(); const run = {}; const game = cloneVal(runner.game, memo); for (const k of RUNNER_KEYS) run[k] = cloneVal(runner[k], memo); return { game, run, rng: rng.s }; };
  const restore = (s) => {
    const live = runner.game;
    const memo = new Map([[s.game, live]]);
    for (const k of Object.keys(live)) if (!(k in s.game) && !KEEP_REF.has(k) && k.charCodeAt(0) !== 95) delete live[k];
    for (const k of Object.keys(s.game)) { if (KEEP_REF.has(k) || k.charCodeAt(0) === 95) continue; live[k] = cloneVal(s.game[k], memo); }
    for (const k of RUNNER_KEYS) runner[k] = cloneVal(s.run[k], memo);
    rng.s = s.rng;
  };
  // recorre el estado y devuelve la primera ruta donde dos estados difieren
  const diff = (a, b, path = 'game', depth = 0, seen = new Set()) => {
    if (depth > 8) return null;
    if (typeof a === 'function' && typeof b === 'function') return a.__rng && b.__rng && a.s !== b.s ? `${path}: azar ${a.s} vs ${b.s}` : null;
    if (typeof a !== typeof b) return `${path}: tipo ${typeof a} vs ${typeof b}`;
    if (typeof a === 'number') return Object.is(a, b) || a === b ? null : `${path}: ${a} vs ${b}`;
    if (typeof a !== 'object' || a === null || b === null) return a === b ? null : `${path}: ${String(a).slice(0, 40)} vs ${String(b).slice(0, 40)}`;
    if (seen.has(a)) return null;
    seen.add(a);
    if (a instanceof Map) { for (const [k, v] of a) { const r = diff(v, b.get(k), `${path}<${k}>`, depth + 1, seen); if (r) return r; } return a.size === b.size ? null : `${path}: tamaño`; }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (KEEP_REF.has(k) || k.charCodeAt(0) === 95 || k === 'result' || k === 'display') continue;
      const r = diff(a[k], b[k], `${path}.${k}`, depth + 1, seen);
      if (r) return r;
    }
    return null;
  };
  let f = 0;
  const issues = [];
  while (f < frames && runner.state !== 'done') {
    if (f > 30 && f % every === 0) {
      const s0 = snap();
      const hashes = [], states = [];
      for (let i = 0; i < span && runner.state !== 'done'; i++) { step(f + i); hashes.push(stateHash(runner)); states.push(snap()); }
      restore(s0);
      for (let i = 0; i < hashes.length; i++) {
        step(f + i);
        if (stateHash(runner) !== hashes[i]) {
          const endB = snap();
          issues.push({ frame: f + i, where: diff(states[i].game, endB.game) || JSON.stringify(Object.fromEntries(RUNNER_KEYS.map((k) => [k, [states[i].run[k], endB.run[k]]]).filter(([, [x, y]]) => JSON.stringify(x) !== JSON.stringify(y)))) });
          break;
        }
      }
      if (issues.length) break;
      f += hashes.length;
      continue;
    }
    step(f++);
  }
  runner.close?.();
  return { frames: f, issues };
}

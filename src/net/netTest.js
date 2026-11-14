// SOLO PRUEBAS (?test): juega un minijuego online entre dos pestañas del mismo navegador, conectadas por
// BroadcastChannel, con "bots" que aprietan teclas al azar. Sirve para comprobar que las dos compus
// simulan exactamente lo mismo (determinismo) en los 16 minijuegos.
import { Link, NetRound, stateHash } from './netplay.js';
import { mulberry32, NATIVE_RANDOM } from '../core/utils.js';

const KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyF', b: 'KeyG' };
const PLAYERS = [
  { name: 'Host', char: 'npc', color: '#FF654F', acc: {} },
  { name: 'Guest', char: 'formal', color: '#3985FF', acc: {} },
];

function key(type, code) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}

export async function netTest(app, { slot, channel, game, seed = 1234, speed = 4, D = 3, maxFrames = 3600, botSeed = 99, caos = false, renderTwice = false, netSim = null, rtt = 20 }) {
  const log = [];
  const logMap = new Map();
  // mala conexión simulada (al recibir): demora, altibajos, pérdida y picos
  const recv = (m) => round?.onMessage(m);
  const onMessage = !netSim ? recv : (m) => {
    if (netSim.loss && NATIVE_RANDOM() * 100 < netSim.loss) return;
    const spike = netSim.spike && NATIVE_RANDOM() < 0.01 ? netSim.spike : 0;
    setTimeout(() => recv(m), (netSim.lag || 0) + NATIVE_RANDOM() * (netSim.jitter || 0) + spike);
  };
  const link = new Link({ slot, secret: 'test', localChannel: channel, sendSignal: async () => {}, onMessage });
  let round = null;
  link.start();
  const runner = app.runner;
  const playP = runner.play(game, { online: true, players: PLAYERS.map((p) => ({ ...p })), difficulty: 0.5, caos, event: null, options: {}, label: 'TEST', mode: 'online' });
  playP.catch(() => {});
  // compu B: dibuja dos veces por cuadro (lo visual no debe cambiar la simulación)
  if (!runner._origRender) runner._origRender = runner.render.bind(runner);
  runner.render = renderTwice ? () => { runner._origRender(); runner._origRender(); } : runner._origRender;
  // bot: teclas al azar (distintas en cada compu), con su propio azar (no toca el de la partida)
  const rnd = mulberry32(botSeed + slot * 7777);
  const held = new Set();
  const bot = setInterval(() => {
    if (!round?.running) return;
    for (const a of ['up', 'down', 'left', 'right']) {
      if (rnd() < 0.25) {
        const on = rnd() < 0.5;
        if (on && !held.has(a)) { held.add(a); key('keydown', KEYS[a]); }
        if (!on && held.has(a)) { held.delete(a); key('keyup', KEYS[a]); }
      }
    }
    for (const a of ['a', 'b']) if (rnd() < 0.18) { key('keydown', KEYS[a]); setTimeout(() => key('keyup', KEYS[a]), 30 + rnd() * 60); }
  }, 45);
  const done = new Promise((resolve) => {
    round = new NetRound({ app, link, slot, round: 0, seed, speed, onEnd: (x) => resolve(x), net: () => ({ rtt, jitter: netSim?.jitter || 5 }) });
  });
  // registrar la huella cada 60 frames
  const origStep = round.step.bind(round);
  round.step = () => {
    const fr = round.f;
    const confirmed = round.inp[1 - round.slot].has(fr) && !(round.pendingBefore && round.pendingBefore(fr));
    origStep();
    // solo estados confirmados (con rollback, un frame predicho puede diferir un instante y después se corrige)
    if (round.f % 60 === 0 && confirmed) logMap.set(round.f, stateHash(runner));
    if (round.f >= maxFrames && round.running) round.finish('max');
  };
  // fluidez medida desde afuera: cuadros en los que la partida no pudo avanzar y saltos de más de 2 frames
  const m = { stallFrames: 0, stallMs: 0, maxStall: 0, bursts: 0, cur: 0 };
  const origFrame = round.frame.bind(round);
  round.frame = (dt, hidden) => {
    const f0 = round.f;
    origFrame(dt, hidden);
    if (!round.running && !round.ended) return;
    const df = round.f - f0;
    if (df === 0 && round.f > 5) { m.stallFrames++; m.stallMs += dt * 1000; m.cur += dt * 1000; if (m.cur > m.maxStall) m.maxStall = m.cur; } else m.cur = 0;
    if (df > 2 * speed) m.bursts++;
  };
  round.setReady(D);
  const end = await done;
  clearInterval(bot);
  for (const a of held) key('keyup', KEYS[a]);
  let result = null;
  if (end.reason === 'done') result = await playP.catch(() => null);
  const out = {
    reason: end.reason, frame: end.frame, log: [...logMap.entries()].sort((x, y) => x[0] - y[0]),
    result: result && { winner: result.winner, scores: result.scores, display: result.display, playSeconds: result.playSeconds, flags: result.flags, records: result.records },
    received: link.received,
    stats: { dUp: 0, dDown: 0, ...(round.stats || {}), ...m, D: round.D, rtt: round.rtt == null ? null : Math.round(round.rtt) },
  };
  setTimeout(() => { link.close(); runner.close(); }, 1500);
  return out;
}

// SOLO PRUEBAS (?test): una ronda 2v2 entre 2 a 4 pestañas (cada una hace de compu), conectadas de a pares por
// BroadcastChannel, con teclas al azar en cada jugador local. Sirve para comprobar que todas las compus simulan
// exactamente lo mismo (determinismo) con cualquier reparto de jugadores, bots incluidos.
import { Link, stateHash } from './netplay.js';
import { MeshRound } from './mesh.js';
import { mulberry32, NATIVE_RANDOM } from '../core/utils.js';

const PLAYERS = [
  { name: 'Azul 1', char: 'volt', color: '#3985FF', acc: {} },
  { name: 'Rojo 1', char: 'mochi', color: '#FF654F', acc: {} },
  { name: 'Azul 2', char: 'pico', color: '#25CFE6', acc: {} },
  { name: 'Rojo 2', char: 'brik', color: '#FF9E5E', acc: {} },
];
const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));

export async function meshTest(app, { me, devices, owner, local = {}, bots = {}, channel, game, seed = 1234, speed = 4, maxFrames = 1800, netSim = null, botSeed = 7, rtt = 30 }) {
  app.input.setTeamMode(true);
  const logMap = new Map();
  let round = null;
  const links = new Map();
  for (const d of devices) {
    if (d === me) continue;
    const recv = (m) => round?.onMessage(d, m);
    const onMessage = !netSim ? recv : (m) => {
      if (netSim.loss && NATIVE_RANDOM() * 100 < netSim.loss) return;
      setTimeout(() => recv(m), (netSim.lag || 0) + NATIVE_RANDOM() * (netSim.jitter || 0));
    };
    const l = new Link({ slot: me < d ? 0 : 1, secret: 't', localChannel: `${channel}-${Math.min(me, d)}-${Math.max(me, d)}`, sendSignal: async () => {}, onMessage });
    l.start();
    links.set(d, l);
  }
  const runner = app.runner;
  const playP = runner.play(game, { online: true, team: true, players: PLAYERS.map((p) => ({ ...p })), difficulty: 0.5, event: null, options: {}, label: 'TEST 2v2', mode: 'online' });
  playP.catch(() => {});
  // teclas al azar para cada jugador local de esta compu (con su propio azar: no toca el de la partida)
  const rnd = mulberry32(botSeed + me * 7777);
  const held = new Set();
  const ks = Object.values(local);
  const press = setInterval(() => {
    if (!round?.running) return;
    for (const k of ks) {
      const B = app.input.bindings[k];
      for (const a of ['up', 'down', 'left', 'right']) {
        if (rnd() < 0.25) {
          const code = B[a][0], on = rnd() < 0.5;
          if (on && !held.has(code)) { held.add(code); key('keydown', code); }
          if (!on && held.has(code)) { held.delete(code); key('keyup', code); }
        }
      }
      for (const a of ['a', 'b']) if (rnd() < 0.15) { const code = B[a][0]; key('keydown', code); setTimeout(() => key('keyup', code), 30 + rnd() * 60); }
    }
  }, 45);
  const done = new Promise((resolve) => {
    round = new MeshRound({ app, links, me, devices, owner, local, bots, round: 0, seed, speed, onEnd: resolve, net: () => ({ rtt, jitter: netSim?.jitter || 5 }) });
  });
  const origStep = round.step.bind(round);
  round.step = () => {
    const fr = round.f;
    const confirmed = round.peers.every((d) => round.inp[d].has(fr)) && !round.pendingBefore(fr);
    origStep();
    if (round.f % 60 === 0 && confirmed) logMap.set(round.f, stateHash(runner));
    if (round.f >= maxFrames && round.running) round.finish('max');
  };
  window.__mesh = round;
  round.setReady();
  const end = await done;
  clearInterval(press);
  for (const c of held) key('keyup', c);
  let result = null;
  if (end.reason === 'done') result = await playP.catch(() => null);
  const out = {
    reason: end.reason, frame: end.frame, log: [...logMap.entries()].sort((x, y) => x[0] - y[0]),
    result: result && { winner: result.winner, scores: result.scores },
    stats: { ...round.stats, D: round.D, rtt: round.rtt == null ? null : Math.round(round.rtt) },
  };
  setTimeout(() => { for (const l of links.values()) l.close(); runner.close(); app.input.setTeamMode(false); }, 1500);
  return out;
}

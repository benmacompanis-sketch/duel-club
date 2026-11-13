// SOLO PRUEBAS (?test): juega un minijuego online entre dos pestañas del mismo navegador, conectadas por
// BroadcastChannel, con "bots" que aprietan teclas al azar. Sirve para comprobar que las dos compus
// simulan exactamente lo mismo (determinismo) en los 16 minijuegos.
import { Link, NetRound, stateHash } from './netplay.js';
import { mulberry32 } from '../core/utils.js';

const KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyF', b: 'KeyG' };
const PLAYERS = [
  { name: 'Host', char: 'npc', color: '#FF654F', acc: {} },
  { name: 'Guest', char: 'formal', color: '#3985FF', acc: {} },
];

function key(type, code) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}

export async function netTest(app, { slot, channel, game, seed = 1234, speed = 4, D = 3, maxFrames = 3600, botSeed = 99, caos = false, renderTwice = false }) {
  const log = [];
  const link = new Link({ slot, secret: 'test', localChannel: channel, sendSignal: async () => {}, onMessage: (m) => round?.onMessage(m) });
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
    round = new NetRound({ app, link, slot, round: 0, seed, speed, onEnd: (x) => resolve(x) });
  });
  // registrar la huella cada 60 frames
  const origStep = round.step.bind(round);
  round.step = () => {
    origStep();
    if (round.f % 60 === 0) log.push([round.f, stateHash(runner)]);
    if (round.f >= maxFrames && round.running) round.finish('max');
  };
  round.setReady(D);
  const end = await done;
  clearInterval(bot);
  for (const a of held) key('keyup', KEYS[a]);
  let result = null;
  if (end.reason === 'done') result = await playP.catch(() => null);
  const out = {
    reason: end.reason, frame: end.frame, log,
    result: result && { winner: result.winner, scores: result.scores, display: result.display, playSeconds: result.playSeconds, flags: result.flags, records: result.records },
    received: link.received,
  };
  setTimeout(() => { link.close(); runner.close(); }, 1500);
  return out;
}

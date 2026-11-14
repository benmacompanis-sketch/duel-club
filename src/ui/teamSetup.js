// 2v2 LOCAL: equipo AZUL (J1 + J3) contra equipo ROJO (J2 + J4) en la misma compu.
// Cada lugar puede ser una persona (teclado o joystick) o un bot (con su dificultad). J1 siempre es una persona.
// Teclado: J1 WASD + F/G · J2 flechas + Enter/Shift der. · J3 IJKL + U/O · J4 teclado numérico 8456 + 0/punto.
// Joysticks (Gamepad API): pulsá A en un joystick para sumarlo al primer lugar humano sin joystick.
// El 2v2 local es casual: da XP y PIES a las cuentas que juegan como J1/J2, nunca ELO.
import { h, icon, keycap } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS, BOT_ORDER } from '../core/bots.js';
import { resultsScreen } from './results.js';
import { shade } from '../core/utils.js';

// minijuegos que funcionan bien en 2v2 (los demás quedan fuera hasta tener una adaptación de calidad)
export const TEAM_GAMES = [
  { id: 'pong', how: 'Dobles: en cada equipo uno defiende el arco y el otro juega adelante.' },
  { id: 'color', how: 'Los dos pintan para su equipo: repártanse el tablero, el escudo protege a los dos y el congelar frena a los dos rivales.' },
];
const TEAM_COLORS = ['#2E7BFF', '#FF4B3E'];

export function teamSetupScreen(ui, params = {}) {
  const app = ui.app;
  const scr = {};
  const S = (app.save.team ||= { slots: ['human', 'bot', 'bot', 'bot'], levels: ['normal', 'normal', 'normal', 'normal'], game: 'pong' });
  const input = app.input;
  input.setTeamMode(true);
  const body = h('div.team-body');
  const render = () => {
    const slotBox = (p) => {
      const human = p === 0 || S.slots[p] === 'human';
      const b = input.bindings[p];
      const pad = input.pads[p];
      const keys = pad != null ? h('span', `Joystick ${pad + 1}`) : h('span', keycap(b.up[0]), keycap(b.left[0]), keycap(b.down[0]), keycap(b.right[0]), ' · ', keycap(b.a[0]), keycap(b.b[0]));
      return h('div.team-slot' + (p % 2 ? '.red' : '.blue'),
        h('div.ts-head', h('b', `J${p + 1}`), h('small', p % 2 ? 'EQUIPO ROJO' : 'EQUIPO AZUL')),
        p === 0 ? h('span.ts-who', app.profiles[0].name)
          : h('div.ts-kind',
            h('button.solo-chip' + (human ? '.on' : ''), { nav: true, onclick: () => { S.slots[p] = 'human'; app.persist(); render(); } }, 'PERSONA'),
            h('button.solo-chip' + (!human ? '.on' : ''), { nav: true, onclick: () => { S.slots[p] = 'bot'; input.assignPad(p, null); app.persist(); render(); } }, 'BOT')),
        human ? h('div.ts-keys', keys, pad != null ? h('button.btn.small.ghost', { nav: true, onclick: () => { input.assignPad(p, null); render(); } }, 'QUITAR JOYSTICK') : null)
          : h('div.ts-kind', BOT_ORDER.map((l) => h('button.solo-chip' + (S.levels[p] === l ? '.on' : ''), { nav: true, style: { '--c': BOT_LEVELS[l].color }, onclick: () => { S.levels[p] = l; app.persist(); render(); } }, BOT_LEVELS[l].name))));
    };
    const gm = GAME_BY_ID[S.game] ? S.game : 'pong';
    body.replaceChildren(
      h('div.solo-side',
        h('h3', 'MINIJUEGO'),
        h('div.solo-grid', TEAM_GAMES.map((tg) => {
          const m = GAME_BY_ID[tg.id].meta;
          return h('button.solo-game' + (tg.id === gm ? '.sel' : ''), { nav: true, style: { '--c': m.color }, onclick: () => { S.game = tg.id; app.persist(); render(); } }, gameIcon(ui, scr, m, 54), h('span', m.name));
        })),
        h('p.muted.small', TEAM_GAMES.find((x) => x.id === gm)?.how || ''),
        h('p.muted.small', 'Por ahora el 2v2 está en los minijuegos que se juegan bien en equipo. Vamos a sumar más a medida que estén listos.'),
        h('div.solo-note', 'Pulsá A en un joystick para sumarlo. El 2v2 local da XP y PIES a las cuentas de J1 y J2; nunca ELO.'),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => start(gm) }, icon('play'), 'JUGAR 2v2')),
      h('div.solo-main', h('div.team-grid', slotBox(0), slotBox(1), slotBox(2), slotBox(3))));
  };
  // joystick nuevo: se suma al primer lugar humano sin joystick
  const off = input.on((e) => {
    if (!e.code?.startsWith('Pad') || e.action !== 'a' || e.player >= 0) return;
    const free = [0, 1, 2, 3].find((p) => (p === 0 || S.slots[p] === 'human') && input.pads[p] == null);
    if (free == null) return;
    input.assignPad(free, e.pad);
    app.audio.play('ready');
    ui.toast({ kind: 'ok', title: `Joystick ${e.pad + 1}`, text: `Ahora controla a J${free + 1}.` });
    render();
  });
  async function start(gameId) {
    app.audio.play('confirm');
    off();
    await runTeam(app, gameId, S);
  }
  scr.el = h('div.screen.solo-page', header(ui, '2v2 · EQUIPOS', 'Azul contra rojo en la misma compu, con personas o bots', () => back()), body);
  const back = () => { off(); input.setTeamMode(false); app.ui.goMenu(); };
  scr.onBack = back;
  scr.destroy = () => off();
  render();
  return scr;
}

function teamPlayers(app, S) {
  return [0, 1, 2, 3].map((p) => {
    const human = p === 0 || S.slots[p] === 'human';
    const base = p < 2 && human ? app.profiles[p] : null;
    const col = p < 2 ? TEAM_COLORS[p] : shade(TEAM_COLORS[p % 2], 0.35);
    if (base) return { ...base, color: col, acc: base.acc && typeof base.acc === 'object' ? { ...base.acc } : base.acc };
    const chars = ['volt', 'mochi', 'pico', 'brik'];
    return { name: human ? `J${p + 1}` : `BOT ${BOT_LEVELS[S.levels[p]].name.toUpperCase()}`, char: chars[p], color: col, acc: 'none', accountId: null, bot: human ? undefined : S.levels[p] };
  });
}

export async function runTeam(app, gameId, S) {
  for (;;) {
    const players = teamPlayers(app, S);
    const bots = {};
    for (const p of [1, 2, 3]) if (S.slots[p] !== 'human') bots[p] = S.levels[p];
    app.input.setTeamMode(true);
    let res;
    try {
      res = await app.runner.play(gameId, { players, team: true, bots, difficulty: 0.5, caos: false, event: null, options: app.save.gameOptions[gameId] || {}, label: '2v2', mode: 'quick' });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); app.ui.show(teamSetupScreen); return; }
      throw e;
    }
    // resultados por equipo: se muestran como "J1 & J3" contra "J2 & J4"
    const shown = [0, 1].map((t) => ({ ...players[t], name: `${players[t].name} & ${players[t + 2].name}`, bot: undefined, accountId: S.slots[t] === 'human' || t === 0 ? players[t].accountId : null }));
    const r2 = { ...res, players: shown };
    const humans = [true, S.slots[1] === 'human'];
    const rec = { newRecords: [false, false], server: app.accounts.submitMatch(r2, { mode: 'quick', humans }) };
    const action = await app.ui.ask(resultsScreen, {
      session: null, res: r2, rec,
      info: { quick: true, label: '2v2 · ' + (res.winner === 0 ? 'GANA EL EQUIPO AZUL' : res.winner === 1 ? 'GANA EL EQUIPO ROJO' : 'EMPATE') },
    });
    app.runner.close();
    if (action === 'rematch') continue;
    app.input.setTeamMode(false);
    app.audio.playMusic('menu');
    if (action === 'other') app.ui.show(teamSetupScreen);
    else app.ui.goMenu();
    return;
  }
}

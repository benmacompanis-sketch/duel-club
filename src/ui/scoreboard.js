// Torneo: presentación, hoja de ruta de rondas y tabla de clasificación.
import { h, icon } from './dom.js';
import { gameIcon } from './widgets.js';
import { GAME_BY_ID } from '../games/index.js';
import { portrait } from './results.js';

export function standingsScreen(ui, { session, phase, done }) {
  const app = ui.app;
  const scr = {};
  const P = session.players;
  const cur = session.currentRound;
  let picked = false;
  const t0 = performance.now();
  const go = (v) => {
    if (picked || performance.now() - t0 < 600) return;
    picked = true;
    app.audio.play('confirm');
    done(v);
  };

  const road = h('div.road', ...session.rounds.map((r, i) =>
    h('div.road-step' + (i === cur && phase !== 'final' ? '.cur' : '') + (r.done ? '.done' : ''),
      h('small', r.final ? 'x2 PUNTOS' : `RONDA ${i + 1}`),
      h('b' + (r.final ? '.final' : ''), r.final ? 'GRAN FINAL' : r.done ? ganadorRonda(r, P) : 'Por jugar'),
      h('div.games', ...r.games.map((id) => gameIcon(ui, scr, GAME_BY_ID[id].meta, 40))))));

  // tabla
  const rows = [0, 1].map((p) => {
    const played = session.results.length;
    return { p, pts: session.points[p], w: session.wins[p], d: session.draws, l: session.wins[1 - p], bonus: session.roundBonus[p], played };
  }).sort((a, b) => b.pts - a.pts || b.w - a.w);
  const table = h('table.st-table',
    h('thead', h('tr', ...['#', 'JUGADOR', 'PJ', 'G', 'E', 'P', 'BONUS', 'PTS'].map((t) => h('th', t)))),
    h('tbody', ...rows.map((r, i) => h('tr',
      h('td', rows[0].pts === rows[1].pts ? '1º' : `${i + 1}º`),
      h('td.name', h('div.pn', ui.preview(scr, 54, 54, (g, W, H, t) => portrait(g, P[r.p], W, H, t)), h('span', { style: { color: P[r.p].color } }, P[r.p].name))),
      h('td', String(r.played)), h('td', String(r.w)), h('td', String(r.d)), h('td', String(r.l)), h('td', `+${r.bonus}`),
      h('td', { style: { color: P[r.p].color } }, String(r.pts))))));

  const titles = {
    intro: ['COPA DUEL CLUB', 'PRESENTACIÓN DEL TORNEO'],
    round: [session.rounds[cur]?.final ? '¡GRAN FINAL!' : `RONDA ${cur + 1}`, 'CLASIFICACIÓN'],
    final: ['CLASIFICACIÓN FINAL', 'TORNEO TERMINADO'],
  }[phase];
  const roundInfo = phase === 'round' && session.rounds[cur - 1]
    ? h('div.muted', { style: { textAlign: 'center' } }, (() => {
      const r = session.rounds[cur - 1];
      return r.bonus >= 0 ? `${P[r.bonus].name} ganó la ronda ${cur} y suma +1 punto de bonus.` : `La ronda ${cur} terminó empatada: no hay bonus.`;
    })())
    : phase === 'intro' ? h('div.muted', { style: { textAlign: 'center', maxWidth: '760px' } },
      `${session.rounds.length} rondas de 2 minijuegos. Victoria 3 pts, empate 1. El ganador de cada ronda suma +1. La GRAN FINAL reparte puntos dobles.`) : null;

  scr.el = h('div.standings',
    h('div.kick', titles[1]),
    h('h1', titles[0]),
    roundInfo,
    road,
    phase !== 'intro' ? table : h('div.row', { style: { gap: '40px', fontFamily: 'var(--display)', fontSize: '26px' } },
      h('span', { style: { color: P[0].color } }, P[0].name), h('span', { style: { color: '#FFC93C' } }, 'VS'), h('span', { style: { color: P[1].color } }, P[1].name)),
    h('div.row',
      phase === 'round' ? h('button.btn.ghost', { nav: true, onclick: async () => { if (await ui.confirm({ title: '¿Abandonar el torneo?', text: 'Se perderá el progreso del torneo.', yes: 'Abandonar', no: 'Seguir' })) { picked = true; done('quit'); } } }, 'SALIR') : null,
      h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => go('continue') }, icon('play'), phase === 'final' ? 'VER CAMPEÓN' : phase === 'intro' ? 'COMENZAR TORNEO' : 'JUGAR RONDA')));
  scr.onBack = () => {};
  app.audio.playMusic(phase === 'final' ? 'champion' : 'results');
  if (phase !== 'intro') app.audio.play('score');
  return scr;
}

function ganadorRonda(r, P) {
  if (r.bonus === -1 || r.bonus == null) return 'Empate';
  return `Gana ${P[r.bonus].name}`;
}

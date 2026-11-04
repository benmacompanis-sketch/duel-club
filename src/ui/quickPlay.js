// QUICK PLAY: catálogo de los 12 minijuegos con detalle, opciones propias y récord.
import { h, icon } from './dom.js';
import { header, segGroup, gameIcon } from './widgets.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { EVENTS } from '../core/events.js';
import { runQuick } from '../core/tournamentManager.js';

export function quickPlayScreen(ui, params = {}) {
  const app = ui.app;
  const scr = {};
  const qcfg = (app.save.quick ||= { difficulty: 'normal', event: 'none' });
  let selected = params.selected && GAME_BY_ID[params.selected] ? params.selected : GAMES[0].meta.id;
  const detail = h('div.qp-detail');
  const grid = h('div.game-grid');

  GAMES.forEach((G, i) => {
    const m = G.meta;
    const card = h('button.game-card', {
      nav: true, style: { '--c': m.color }, dataset: { id: m.id },
      'data-autofocus': m.id === selected || null,
      onclick: () => { selected = m.id; renderDetail(); app.audio.play('click'); detail.querySelector('.play-btn')?.focus(); },
      ondblclick: () => play(),
      onfocus: () => { if (selected !== m.id) { selected = m.id; renderDetail(); } },
    },
    h('span.gc-num', String(i + 1).padStart(2, '0')),
    gameIcon(ui, scr, m, 96),
    h('span.gc-name', m.name),
    h('span.gc-cat', m.category));
    grid.append(card);
  });

  function play() {
    app.audio.play('confirm');
    runQuick(app, selected, { difficulty: qcfg.difficulty, event: qcfg.event === 'none' ? null : qcfg.event });
  }

  function renderDetail() {
    const m = GAME_BY_ID[selected].meta;
    grid.querySelectorAll('.game-card').forEach((c) => c.classList.toggle('sel', c.dataset.id === selected));
    const opts = (app.save.gameOptions[m.id] ||= {});
    const best = app.save.stats.games[m.id]?.best;
    const played = app.save.stats.games[m.id]?.played || 0;
    if (qcfg.event !== 'none' && qcfg.event !== 'random' && !(m.events || []).includes(qcfg.event)) qcfg.event = 'none';
    const optRows = (m.options || []).map((o) => segGroup(o.label, null, o.choices, () => opts[o.key] ?? o.def, (v) => { opts[o.key] = v; app.persist(); }, ui));
    const evChoices = [['none', 'Ninguno'], ['random', 'Aleatorio'], ...(m.events || []).map((id) => [id, EVENTS[id].short])];
    detail.replaceChildren(
      h('div.card',
        h('div.qp-title', gameIcon(ui, scr, m, 84), h('div', h('span.chip', { style: { borderColor: m.color, color: m.color, background: 'transparent' } }, m.category), h('h2', m.name))),
        h('p.qp-desc', m.description),
        h('div.qp-goal', 'Objetivo: ', m.goal),
        h('div.qp-best', played ? `Jugado ${played} ${played === 1 ? 'vez' : 'veces'}` : 'Todavía no jugado', best ? h('span', ' · Récord ', h('b', `${best.display}`), ` (${best.name})`) : null)),
      h('div.card.qp-opts',
        ...optRows,
        segGroup('Dificultad', null, [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil'], ['caos', 'CAOS']], () => qcfg.difficulty, (v) => { qcfg.difficulty = v; app.persist(); }, ui),
        segGroup('Evento', null, evChoices, () => qcfg.event, (v) => { qcfg.event = v; app.persist(); }, ui)),
      h('button.btn.green.big.wide.play-btn', { nav: true, onclick: play }, icon('play'), 'JUGAR'));
  }

  scr.el = h('div.page',
    header(ui, 'QUICK PLAY', 'Elegí un minijuego y jugá una partida directa.', () => ui.goMenu()),
    h('div.qp-body', grid, detail));
  renderDetail();
  scr.onBack = () => ui.goMenu();
  return scr;
}

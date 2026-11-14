// Pantalla UN JUGADOR: VS BOT, ESCALERA (singleplayer) y PRÁCTICA.
import { h, icon } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS, BOT_ORDER } from '../core/bots.js';
import { runVsBot, runPractice, runLadder, LADDER_LEVEL } from '../core/soloModes.js';
import { fmtN } from './kit.js';

const fmtSecs = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export function soloScreen(ui, params = {}) {
  const app = ui.app;
  const S = app.save.solo;
  const scr = {};
  let tab = params.tab || 'vs';
  let level = BOT_LEVELS[S.level] ? S.level : 'normal';
  let practiceOpp = 'idle';
  let game = GAME_BY_ID[S.game] ? S.game : GAMES[0].meta.id;
  const body = h('div.solo-body');
  const back = () => app.ui.goMenu();
  const again = (extra = {}) => ui.show(soloScreen, { tab, ...extra });
  const tabsEl = h('div.solo-tabs');

  function renderTabs() {
    tabsEl.replaceChildren(...[['vs', 'VS BOT', 'duel'], ['ladder', 'ESCALERA', 'trophy'], ['practice', 'PRÁCTICA', 'target']].map(([id, name, ic]) =>
      h('button.solo-tab' + (tab === id ? '.on' : ''), { nav: true, onclick: () => { tab = id; app.audio.play('click'); renderTabs(); render(); } }, icon(ic), name)));
  }

  function gameGrid(onPick) {
    return h('div.solo-grid', GAMES.map((G) => {
      const m = G.meta;
      return h('button.solo-game' + (m.id === game ? '.sel' : ''), {
        nav: true, style: { '--c': m.color }, dataset: { id: m.id },
        onclick: (e) => { game = m.id; S.game = game; app.persist(); e.currentTarget.parentNode.querySelectorAll('.solo-game').forEach((c) => c.classList.toggle('sel', c.dataset.id === game)); onPick?.(); app.audio.play('click'); },
        ondblclick: () => onPick?.(true),
      }, gameIcon(ui, scr, m, 54), h('span', m.name));
    }));
  }

  function render() {
    const acc = app.accounts.slotAccount(0);
    if (tab === 'vs') {
      const rec = () => {
        const v = S.vs[`${game}:${level}`];
        return v ? `Contra este bot en ${GAME_BY_ID[game].meta.name}: ${v.w} ganadas · ${v.l} perdidas · ${v.d} empates` : `Todavía no jugaste ${GAME_BY_ID[game].meta.name} contra el bot ${BOT_LEVELS[level].name}.`;
      };
      const recEl = h('p.muted.small', rec());
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'DIFICULTAD DEL BOT'),
          chips(BOT_ORDER.map((l) => [l, BOT_LEVELS[l].name, BOT_LEVELS[l].color]), () => level, (v) => { level = v; S.level = v; app.persist(); recEl.textContent = rec(); }),
          h('p.muted.small', 'Fácil reacciona lento y se equivoca. Experto casi no falla. El bot usa las mismas reglas y teclas que una persona.'),
          recEl,
          h('div.solo-note', acc ? `Con la cuenta de J1 (${acc.name}) ganás XP y PIES reducidos y sumás desafíos. Nunca da ELO.` : 'Como invitado no se guardan recompensas. Iniciá sesión con J1 para ganar XP y PIES.'),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => go() }, icon('play'), 'JUGAR')),
        h('div.solo-main', h('h3', 'MINIJUEGO'), gameGrid((now) => now && go())));
      const go = () => { app.audio.play('confirm'); runVsBot(app, game, level, () => again()); };
    } else if (tab === 'practice') {
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'RIVAL DE PRÁCTICA'),
          chips([['idle', 'Muñeco quieto', '#8C96B8'], ...BOT_ORDER.map((l) => [l, `Bot ${BOT_LEVELS[l].name}`, BOT_LEVELS[l].color])], () => practiceOpp, (v) => { practiceOpp = v; }),
          h('p.muted.small', 'Practicá controles y estrategias sin presión. La práctica no da XP, PIES ni ELO y no cuenta en estadísticas, logros ni desafíos.'),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); runPractice(app, game, practiceOpp, () => again()); } }, icon('play'), 'PRACTICAR')),
        h('div.solo-main', h('h3', 'MINIJUEGO'), gameGrid((now) => now && runPractice(app, game, practiceOpp, () => again()))));
    } else {
      const end = params.ladderEnd;
      const hist = S.history.filter((x) => x.kind === 'ladder').slice(0, 6);
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'LA ESCALERA DEL CLUB'),
          h('p', 'Los 16 minijuegos seguidos contra bots cada vez más difíciles: etapas 1–4 Fácil, 5–8 Normal, 9–12 Difícil y 13–16 Experto. Tenés 3 vidas: si perdés, se repite la etapa.'),
          h('div.ladder-steps', Array.from({ length: 16 }, (_, i) => h('span.ls.' + LADDER_LEVEL(i) + (i < S.best ? '.done' : ''), { title: `Etapa ${i + 1} · ${BOT_LEVELS[LADDER_LEVEL(i)].name}` }, i + 1))),
          h('div.solo-note', acc ? 'Cada etapa da XP y PIES (como VS BOT) y suma a los desafíos.' : 'Como invitado no se guardan recompensas.'),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); tab = 'ladder'; runLadder(app, (x) => again(x)); } }, icon('play'), 'EMPEZAR ESCALERA')),
        h('div.solo-main',
          end ? h('div.ladder-end' + (end.complete ? '.win' : ''), h('b', end.complete ? '¡COMPLETASTE LA ESCALERA!' : `Llegaste a la etapa ${end.stage + 1}`), h('span', `${end.stage} etapas superadas · ${fmtSecs(end.secs)}${end.record ? ' · ¡NUEVO RÉCORD!' : ''}`)) : null,
          h('div.solo-stats',
            stat('Mejor marca', S.best ? `${S.best} / 16 etapas` : '—'), stat('Mejor tiempo', S.bestTime && S.best ? fmtSecs(S.bestTime) : '—'),
            stat('Intentos', fmtN(S.runs)), stat('Escaleras completas', fmtN(S.wins))),
          h('h3', 'ÚLTIMOS INTENTOS'),
          hist.length ? h('div.solo-hist', hist.map((x) => h('div.sh-row', h('b', x.stage >= 16 ? 'COMPLETA' : `Etapa ${x.stage + 1}`), h('span', `${x.stage} superadas · ${fmtSecs(x.secs)}`), x.record ? h('small', 'RÉCORD') : null, h('small.muted', new Date(x.at).toLocaleDateString('es-AR')))))
            : h('p.muted', 'Todavía no intentaste la escalera.')));
    }
  }
  function chips(list, get, set) {
    const box = h('div.solo-chips');
    const paint = () => box.querySelectorAll('.solo-chip').forEach((c) => c.classList.toggle('on', c.dataset.v === get()));
    for (const [v, name, col] of list) box.append(h('button.solo-chip', { nav: true, dataset: { v }, style: { '--c': col }, onclick: () => { set(v); paint(); app.audio.play('click'); } }, name));
    paint();
    return box;
  }
  const stat = (k, v) => h('div.ss', h('small', k), h('b', v));

  scr.el = h('div.screen.solo-page',
    header(ui, 'UN JUGADOR', 'Contra bots · el ELO solo se juega online en competitivo', back),
    tabsEl, body);
  scr.onBack = back;
  renderTabs();
  render();
  return scr;
}

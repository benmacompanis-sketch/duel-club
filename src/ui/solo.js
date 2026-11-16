// Pantalla UN JUGADOR: VS BOT, ESCALERA (singleplayer) y PRÁCTICA.
import { h, icon } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS, BOT_ORDER } from '../core/bots.js';
import { runPuzzle, runStory, storyDone } from '../core/soloModes.js';
import { STORY, STORY_REWARD } from '../data/story.js';
import { PUZZLES, PUZZLE_CATS } from '../data/puzzles.js';
import { avatar } from './kit.js';
import { CHAR_BY_ID } from '../core/characters.js';
import { runVsBot, runPractice, runLadder, runSolo, LADDER_LEVEL, SOLO_GOALS, dailySolo, runSpChallenge, runEndless, runGhost, GHOST_GAMES, evName, fmtVal } from '../core/soloModes.js';
import { DIFFS } from '../core/tournamentManager.js';
import { loading, errorBox } from './kit.js';
import { errorText } from '../net/api.js';
import { fmtN } from './kit.js';

const fmtSecs = (s) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);

export function soloScreen(ui, params = {}) {
  const app = ui.app;
  const S = app.save.solo;
  const scr = {};
  let tab = params.tab || 'story';
  let level = BOT_LEVELS[S.level] ? S.level : 'normal';
  let practiceOpp = 'idle';
  let game = GAME_BY_ID[S.game] ? S.game : GAMES[0].meta.id;
  const body = h('div.solo-body');
  const back = () => app.ui.goMenu();
  const again = (extra = {}) => ui.show(soloScreen, { tab, ...extra });
  const tabsEl = h('div.solo-tabs');

  function renderTabs() {
    tabsEl.replaceChildren(...[['story', 'HISTORIA', 'crown'], ['puzzle', 'PUZZLE CLUB', 'target'], ['solo', 'SOLO', 'star'], ['daily', 'DAILY CHAOS', 'flame'], ['weekly', 'SEMANAL', 'crown'], ['endless', 'ENDLESS CLUB', 'arrow'], ['ghost', 'GHOST RUN', 'user'], ['vs', 'VS BOT', 'duel'], ['ladder', 'ESCALERA', 'trophy'], ['practice', 'PRÁCTICA', 'target']].map(([id, name, ic]) =>
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

  // ---------------------------------------------------------------- modos con servidor
  let specs = null;
  async function getSpecs() {
    if (specs) return specs;
    specs = await app.accounts.spSpecs();
    const pay = specs.weekly_payout;
    if (pay?.pies) ui.toast({ kind: 'ok', title: 'Desafío semanal', text: `Terminaste en el puesto ${pay.rank} de ${pay.total}: +${pay.pies} PIES.` });
    return specs;
  }
  const board = (list, gameId, empty) => h('div.sp-board', h('h3', 'RANKING'),
    list.length ? list.map((r) => h('div.sp-row' + (r.mine ? '.me' : ''), h('b', `#${r.pos}`), h('span', { style: { color: r.color || '#fff' } }, r.name), h('i', gameId ? fmtVal(gameId, r.best) : String(Math.round(r.best)))))
      : h('p.muted', empty));
  async function spView(kind) {
    body.replaceChildren(loading());
    let d, b;
    try { d = await getSpecs(); b = kind === 'endless' ? await app.accounts.spBoard('endless', 'all') : await app.accounts.spBoard(kind, d[kind].key); }
    catch (e) { body.replaceChildren(errorBox(errorText(e), () => spView(kind))); return; }
    if (tab !== kind) return;
    const acc = app.accounts.slotAccount(0);
    if (kind === 'endless') {
      const mine = d.mine?.endless;
      const end = params.endlessEnd;
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'ENDLESS CLUB'),
          h('p', 'Maratón infinita: minijuegos al azar con metas que suben, modificadores CAOS desde la etapa 5 y 3 vidas. Cada etapa superada suma puntos y sube el multiplicador.'),
          h('div.ss-total', h('b', mine ? fmtN(mine.best) : app.save.solo.endless?.best ? fmtN(app.save.solo.endless.best) : '—'), h('small', 'TU MEJOR PUNTAJE')),
          h('div.solo-note', acc ? 'Cada maratón da XP y PIES según las etapas (hasta 3 por día).' : 'Como invitado no entrás al ranking ni ganás recompensas.'),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); runEndless(app, (x) => again(x)); } }, icon('play'), 'EMPEZAR MARATÓN')),
        h('div.solo-main',
          end ? h('div.ladder-end' + (end.record ? '.win' : ''), h('b', `${fmtN(end.score)} puntos · ${end.stage} etapas`), h('span', `${fmtSecs(end.secs)}${end.record ? ' · ¡NUEVO RÉCORD!' : ''}${end.srv?.xp ? ` · +${end.srv.xp} XP · +${end.srv.pies} PIES` : ''}`)) : null,
          board(b.top || [], null, 'Todavía nadie jugó la maratón. ¡Sé el primero!')));
      return;
    }
    const spec = d[kind];
    const m = GAME_BY_ID[spec.game].meta;
    const mine = d.mine?.[kind];
    const ends = new Date(spec.ends_at);
    const left = Math.max(0, ends - Date.now());
    const leftTxt = left > 86400000 ? `${Math.floor(left / 86400000)} d ${Math.floor((left % 86400000) / 3600000)} h` : `${Math.floor(left / 3600000)} h ${Math.floor((left % 3600000) / 60000)} min`;
    body.replaceChildren(
      h('div.solo-side',
        h('h3', kind === 'daily' ? 'DAILY CHAOS' : 'WEEKLY CHALLENGE'),
        h('div.sp-game', { style: { '--c': m.color } }, gameIcon(ui, scr, m, 64), h('div', h('b', m.name), h('span', evName(spec.event)), kind === 'weekly' ? h('span', `Dificultad: ${DIFFS[spec.diff]?.label || spec.diff}`) : null)),
        h('div.sp-goals', spec.goals.map((g, i) => h('span', `${'★'.repeat(i + 1)} ${fmtVal(spec.game, g)}`))),
        h('p.muted.small', kind === 'daily' ? `El mismo desafío para todos, hoy. Cambia en ${leftTxt}.` : `El mismo desafío para todos durante la semana. Intentos ilimitados: cuenta tu mejor resultado. Termina en ${leftTxt}.`),
        mine ? h('div.ss-total', h('b', fmtVal(spec.game, mine.best)), h('small', kind === 'daily' ? `TU MEJOR · ${'★'.repeat(mine.stars || 0) || 'sin estrellas'}` : `TU MEJOR · ${mine.attempts} intentos`)) : null,
        h('div.solo-note', acc ? (kind === 'daily' ? 'Cada estrella nueva da XP y PIES.' : 'Participar da XP y PIES. Al terminar la semana, premio en PIES según tu puesto (top 1, 3, 10 y 25 %).') : 'Como invitado podés jugar, pero no entrás al ranking.'),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); runSpChallenge(app, kind, spec, () => { specs = null; again(); }); } }, icon('play'), 'JUGAR')),
      h('div.solo-main', board(b.top || [], spec.game, 'Todavía nadie jugó este desafío. ¡Sé el primero!')));
  }
  let ghostGame = GHOST_GAMES[game] ? game : 'race';
  async function ghostView() {
    const acc = app.accounts.slotAccount(0);
    const local = app.save.solo.ghosts || {};
    let list = [];
    body.replaceChildren(loading());
    if (acc) { try { list = await app.accounts.ghostList(ghostGame); } catch {} }
    if (tab !== 'ghost') return;
    if (!list.length) list = [local[ghostGame], local[ghostGame + ':last']].filter(Boolean);
    const names = { best: 'TU MEJOR', last: 'ÚLTIMO INTENTO', prev: 'MEJOR ANTERIOR' };
    const grid = h('div.solo-grid', Object.keys(GHOST_GAMES).map((id) => {
      const m = GAME_BY_ID[id].meta;
      return h('button.solo-game' + (id === ghostGame ? '.sel' : ''), { nav: true, style: { '--c': m.color }, onclick: () => { ghostGame = id; app.audio.play('click'); ghostView(); } }, gameIcon(ui, scr, m, 54), h('span', m.name));
    }));
    const go = (gh) => { app.audio.play('confirm'); runGhost(app, ghostGame, gh, () => again()); };
    body.replaceChildren(
      h('div.solo-side',
        h('h3', 'GHOST RUN'),
        h('p', GHOST_GAMES[ghostGame] === 'pose' ? 'Corré contra tu propio fantasma: ves tu intento anterior moviéndose a tu lado.' : 'Competí contra tu fantasma: abajo ves en vivo si vas ganando o perdiendo contra tu intento anterior.'),
        list.length ? h('div.gh-list', list.map((gh) => h('button.gh-item', { nav: true, onclick: () => go(gh) }, h('small', names[gh.label] || gh.label), h('b', fmtVal(ghostGame, gh.value)), h('span', 'JUGAR CONTRA ESTE'))))
          : h('p.muted', 'Todavía no tenés fantasmas en este minijuego.'),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => go(list.find((x) => x.label === 'best') || null) }, icon('play'), list.length ? 'CONTRA MI MEJOR' : 'GRABAR MI FANTASMA')),
      h('div.solo-main', h('h3', 'MINIJUEGO'), grid));
  }

  // progreso del servidor (Historia y Puzzle Club): se mezcla con el local, quedándose con lo más avanzado
  let synced = false;
  async function syncProgress() {
    if (synced || !app.accounts.slotAccount(0)) return;
    synced = true;
    try {
      const pr = await app.accounts.storyProgress();
      S.story ||= {}; S.puzzles ||= {};
      for (const [k, n] of Object.entries(pr.story || {})) S.story[k] = Math.max(S.story[k] || 0, n);
      for (const id of pr.puzzles || []) (S.puzzles[id] ||= { done: false, tries: 0 }).done = true;
      app.persist();
      if (tab === 'story' || tab === 'puzzle') render();
    } catch {}
  }
  function storyView() {
    const unlocked = (i) => i === 0 || storyDone(app, STORY[i - 1].id) >= STORY[i - 1].stages.length;
    const total = STORY.reduce((n, c) => n + Math.min(storyDone(app, c.id), c.stages.length), 0);
    body.replaceChildren(h('div.story-list',
      h('div.story-top', h('h3', 'HISTORIA DEL CLUB'), h('span', `${total} / ${STORY.length * 4} etapas`),
        h('small.muted', app.accounts.slotAccount(0) ? `Cada capítulo completo: +${STORY_REWARD.chapter.xp} XP y +${STORY_REWARD.chapter.pies} PIES.` : 'Como invitado se guarda tu avance, pero no hay recompensas.')),
      ...STORY.map((c, i) => {
        const n = Math.min(storyDone(app, c.id), c.stages.length), open = unlocked(i), fin = n >= c.stages.length;
        const hero = CHAR_BY_ID[c.hero];
        return h('button.story-ch' + (open ? '' : '.locked') + (fin ? '.done' : ''), {
          nav: true, style: { '--c': c.color }, disabled: !open,
          onclick: () => { app.audio.play('confirm'); runStory(app, c.id, () => again()); },
        },
        avatar(ui, scr, { char: hero.id, color: c.color, acc: null }, 92, { static: !open }),
        h('div.sc-main', h('small', `CAPÍTULO ${i + 1} · ${hero.name.toUpperCase()}`), h('b', c.title), h('span', c.theme),
          h('div.sc-steps', c.stages.map((st, k) => h('i' + (k < n ? '.on' : '') + (st.boss ? '.boss' : ''), { title: st.name })))),
        h('span.sc-go', open ? (fin ? 'REPETIR' : n ? 'SEGUIR' : 'JUGAR') : 'BLOQUEADO'));
      })));
    syncProgress();
  }
  function puzzleView() {
    const P = (S.puzzles ||= {});
    const solved = PUZZLES.filter((p) => P[p.id]?.done).length;
    body.replaceChildren(h('div.puzzle-wrap',
      h('div.story-top', h('h3', 'PUZZLE CLUB'), h('span', `${solved} / ${PUZZLES.length} resueltos`),
        h('small.muted', 'Desafíos armados a mano: siempre la misma partida, con límites. Todos tienen solución.')),
      ...PUZZLE_CATS.map((cat) => h('div.pz-cat', { style: { '--c': cat.color } },
        h('h4', icon(cat.icon), cat.name),
        h('div.pz-grid', PUZZLES.filter((p) => p.cat === cat.id).map((pz) => {
          const m = GAME_BY_ID[pz.game].meta, r = P[pz.id];
          return h('button.pz-card' + (r?.done ? '.done' : ''), { nav: true, style: { '--g': m.color }, onclick: () => { app.audio.play('confirm'); runPuzzle(app, pz.id, () => again()); } },
            gameIcon(ui, scr, m, 48),
            h('div.pz-main', h('b', pz.name), h('small', pz.goal), h('span.pz-meta', r?.done ? '✔ RESUELTO' : r?.tries ? `${r.tries} intentos` : m.name)));
        }))))));
    syncProgress();
  }

  function render() {
    const acc = app.accounts.slotAccount(0);
    if (tab === 'story') { storyView(); return; }
    if (tab === 'puzzle') { puzzleView(); return; }
    if (tab === 'daily' || tab === 'weekly' || tab === 'endless') { spView(tab); return; }
    if (tab === 'ghost') { ghostView(); return; }
    if (tab === 'solo') {
      const R = (S.solo ||= {});
      const day = dailySolo();
      const total = Object.keys(SOLO_GOALS).reduce((n, id) => n + (R[id]?.stars || 0), 0);
      const fmt = (id, v) => (v == null ? '—' : GAME_BY_ID[id].meta.record?.format ? GAME_BY_ID[id].meta.record.format(v) : String(v));
      const play = (id) => { app.audio.play('confirm'); runSolo(app, id, () => again()); };
      const today = new Date().toISOString().slice(0, 10);
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'DESAFÍOS SOLO'),
          h('p', 'Sin rival. Conseguí las tres estrellas en cada minijuego.'),
          h('div.ss-total', h('b', `${total} / ${Object.keys(SOLO_GOALS).length * 3}`), h('small', 'ESTRELLAS')),
          h('div.solo-daily' + (R[day]?.daily === today ? '.done' : ''),
            h('small', 'DESAFÍO DEL DÍA'), h('b', GAME_BY_ID[day].meta.name), h('span', SOLO_GOALS[day][2]),
            h('span', `Meta: ${fmt(day, SOLO_GOALS[day][1][2])} (3 estrellas)`),
            R[day]?.daily === today ? h('span.sd-ok', 'COMPLETADO HOY') : null),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => play(day) }, icon('play'), 'JUGAR')),
        h('div.solo-main', h('div.solo-goals', Object.keys(SOLO_GOALS).map((id) => {
          const m = GAME_BY_ID[id].meta, r = R[id] || {};
          return h('button.solo-goal', { nav: true, style: { '--c': m.color }, onclick: () => play(id) },
            gameIcon(ui, scr, m, 54),
            h('div.sg-main', h('b', m.name), h('small', SOLO_GOALS[id][2]),
              h('span.sg-best', r.best != null ? `Récord: ${fmt(id, r.best)}` : 'Sin jugar')),
            h('span.sr-stars', [1, 2, 3].map((i) => h('i' + (i <= (r.stars || 0) ? '.on' : ''), '★'))));
        }))));
    } else if (tab === 'vs') {
      const rec = () => {
        const v = S.vs[`${game}:${level}`];
        return v ? `Contra este bot en ${GAME_BY_ID[game].meta.name}: ${v.w} ganadas · ${v.l} perdidas · ${v.d} empates` : `Todavía no jugaste ${GAME_BY_ID[game].meta.name} contra el bot ${BOT_LEVELS[level].name}.`;
      };
      const recEl = h('p.muted.small', rec());
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'DIFICULTAD DEL BOT'),
          chips(BOT_ORDER.map((l) => [l, BOT_LEVELS[l].name, BOT_LEVELS[l].color]), () => level, (v) => { level = v; S.level = v; app.persist(); recEl.textContent = rec(); }),
          h('p.muted.small', 'Experto casi no falla.'),
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
          h('p.muted.small', 'Sin presión. No cuenta para nada.'),
          h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); runPractice(app, game, practiceOpp, () => again()); } }, icon('play'), 'PRACTICAR')),
        h('div.solo-main', h('h3', 'MINIJUEGO'), gameGrid((now) => now && runPractice(app, game, practiceOpp, () => again()))));
    } else {
      const end = params.ladderEnd;
      const hist = S.history.filter((x) => x.kind === 'ladder').slice(0, 6);
      body.replaceChildren(
        h('div.solo-side',
          h('h3', 'LA ESCALERA DEL CLUB'),
          h('p', 'Los 16 minijuegos seguidos, cada vez más difícil. Tenés 3 vidas.'),
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
    header(ui, 'UN JUGADOR', 'Desafíos, bots y práctica', back),
    tabsEl, body);
  scr.onBack = back;
  renderTabs();
  render();
  return scr;
}

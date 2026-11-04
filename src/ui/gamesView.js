// Minijuegos: los 16 juegos con su dominio (rango, progreso), desafíos propios, récord mundial y acceso directo.
import { h, icon } from './dom.js';
import { gameIcon } from './widgets.js';
import { GAMES } from '../games/index.js';
import { GAME_COLORS, MASTERY_RANKS, masteryPoints } from '../data/catalog.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MASTERY_NAMES, MASTERY_COLORS, fmtN, empty } from './kit.js';
import { quickPlayScreen } from './quickPlay.js';

export function gamesSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  const detail = h('div.gv-detail');
  let sel = ctx.params.game || GAMES[0].meta.id;
  let records = {};
  const grid = h('div.gv-grid', GAMES.map((G) => {
    const m = G.meta;
    const ms = me?.mastery?.[m.id];
    return h('button.gv-card', { nav: true, dataset: { id: m.id }, style: { '--gc': GAME_COLORS[m.id] || m.color || '#9B6CFF' }, onclick: () => { sel = m.id; app.audio.play('click'); renderDetail(); mark(); } },
      gameIcon(ui, owner, m, 64),
      h('b', m.name),
      h('small', m.category || ''),
      me ? h('span.gv-rank', { style: { color: MASTERY_COLORS[ms?.rank || 0] } }, MASTERY_NAMES[ms?.rank || 0]) : null,
      m.isNew ? h('span.gv-new', 'NUEVO') : null);
  }));
  const mark = () => grid.querySelectorAll('.gv-card').forEach((b) => b.classList.toggle('on', b.dataset.id === sel));
  function renderDetail() {
    const G = GAMES.find((x) => x.meta.id === sel);
    const m = G.meta;
    const ms = me?.mastery?.[m.id] || { played: 0, wins: 0, losses: 0, draws: 0, rank: 0, best_streak: 0 };
    const pts = masteryPoints(ms);
    const next = MASTERY_RANKS[ms.rank + 1];
    const prev = MASTERY_RANKS[ms.rank];
    const pct = next ? Math.min(100, ((pts - prev.points) / (next.points - prev.points)) * 100) : 100;
    const challenges = ACHIEVEMENTS.filter((a) => a.game === m.id);
    const wr = records[m.id];
    detail.replaceChildren(
      h('div.gv-head', { style: { '--gc': GAME_COLORS[m.id] } }, gameIcon(ui, owner, m, 96),
        h('div', h('small', m.category || ''), h('h2', m.name), h('p', m.desc || m.tagline || ''))),
      h('div.gv-cols',
        h('div.card',
          h('h3', 'Dominio'),
          me ? h('div',
            h('div.gv-rankbig', { style: { color: MASTERY_COLORS[ms.rank] } }, MASTERY_NAMES[ms.rank]),
            h('div.kbar', h('div.kbar-fill', { style: { width: pct + '%' } }), h('span', next ? `${pts} / ${next.points} pts → ${MASTERY_NAMES[ms.rank + 1]}` : 'Rango máximo')),
            h('p.muted.small', next ? `Próximo rango: +${next.keke} KEKE y +${next.pies} PIES${ms.rank + 1 === 4 ? ', skin y título exclusivos' : ''}.` : 'Skin y título de Maestro desbloqueados.'),
            h('div.kv', h('span', 'Partidas'), h('b', `${ms.played} (${ms.wins} V · ${ms.losses} D · ${ms.draws} E)`)),
            h('div.kv', h('span', '% de victorias'), h('b', ms.played ? Math.round((ms.wins / ms.played) * 100) + '%' : '—')),
            h('div.kv', h('span', 'Racha máxima'), h('b', fmtN(ms.best_streak))))
            : h('p.muted', 'Iniciá sesión para sumar dominio en este minijuego.'),
          h('div.kv', h('span', 'Récord mundial'), h('b', wr ? `${wr.display} · ${wr.name}` : '—'))),
        h('div.card',
          h('h3', `Desafíos · ${challenges.filter((a) => me?.achievements?.[a.id]).length}/${challenges.length}`),
          h('div.gv-ch', challenges.map((a) => {
            const done = !!me?.achievements?.[a.id];
            return h('div.gv-chi' + (done ? '.done' : ''), icon(done ? 'check' : a.icon), h('div', h('b', a.name), h('span', a.desc)));
          })))),
      h('div.row',
        h('button.btn.primary.big', { nav: true, onclick: () => { app.audio.play('confirm'); ui.show(quickPlayScreen, { selected: m.id }); } }, icon('play'), 'JUGAR'),
        h('p.muted.small', 'Se abre QUICK PLAY con este minijuego para elegir opciones y dificultad.')));
  }
  svc.worldRecords().then((r) => {
    records = Object.fromEntries(r.map((x) => [x.game, x]));
    if (!owner.disposed) renderDetail();
  }).catch(() => {});
  renderDetail();
  mark();
  return { el: h('div.gamesv', h('div.sec-head', h('h2', 'MINIJUEGOS'), h('p', '16 minijuegos 1v1. Cada uno tiene su propio dominio, desafíos y récord mundial.')), h('div.gv-wrap', grid, detail)) };
}

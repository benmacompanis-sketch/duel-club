// Rankings mundiales con datos reales del servidor: SUSI, nivel, KEKE, victorias, por minijuego
// y récords. Filtros General/Amigos, Top 10/Top 100, búsqueda y la posición propia aunque no esté arriba.
import { h, icon } from './dom.js';
import { tabs, loading, errorBox, empty, avatar, lookOf, levelBadge, resist, fmtN, tierName, timeAgo, gameChip, titleOf } from './kit.js';
import { GAME_IDS, GAME_NAMES, levelInfo } from '../data/catalog.js';
import { errorText } from '../net/api.js';

const KINDS = [['rating', 'SUSI'], ['level', 'Nivel'], ['keke', 'KEKE'], ['wins', 'Victorias'], ['game', 'Por minijuego'], ['records', 'Récords']];

export function rankingSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  let kind = ctx.params.kind || 'rating';
  let scope = 'global';
  let limit = 10;
  let game = ctx.params.game || 'reaction';
  let search = '';
  const bar = h('div');
  const filters = h('div.store-filters');
  const body = h('div.rank-body');
  const mineBox = h('div.rank-mine');

  function renderBar() {
    bar.replaceChildren(tabs(KINDS, kind, (v) => { kind = v; app.audio.play('click'); renderBar(); renderFilters(); load(); }));
  }
  function renderFilters() {
    if (kind === 'records') { filters.replaceChildren(); return; }
    const searchIn = h('input.acc-input.search-in.small', { type: 'text', nav: true, maxlength: 16, placeholder: 'Buscar jugador…', value: search, 'aria-label': 'Buscar en el ranking' });
    let timer;
    searchIn.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { search = searchIn.value.trim(); load(); }, 350); });
    filters.replaceChildren(...[
      kind === 'game' ? h('div.rar-filter.wrap', GAME_IDS.map((g) => h('button.rf' + (g === game ? '.on' : ''), { nav: true, onclick: () => { game = g; renderFilters(); load(); } }, GAME_NAMES[g]))) : null,
      h('div.rar-filter',
        ...[['global', 'General'], ['friends', 'Amigos']].map(([v, l]) => h('button.rf' + (scope === v ? '.on' : ''), { nav: true, disabled: v === 'friends' && !me ? true : null, onclick: () => { scope = v; renderFilters(); load(); } }, l)),
        h('span.rf-sep'),
        ...[[10, 'Top 10'], [100, 'Top 100']].map(([v, l]) => h('button.rf' + (limit === v ? '.on' : ''), { nav: true, onclick: () => { limit = v; renderFilters(); load(); } }, l)),
        h('span.rf-sep'), searchIn)].filter(Boolean));
  }
  const valueOf = (r) => {
    if (kind === 'rating') return [resist(r.value), `Mejor: ${fmtN(r.value2)}`];
    if (kind === 'level') return [levelBadge(levelInfo(r.value).level), `${fmtN(r.value)} KEKE`];
    if (kind === 'keke') return [h('b.rank-val', fmtN(r.value)), 'KEKE'];
    if (kind === 'wins') return [h('b.rank-val', fmtN(r.value)), `de ${fmtN(r.value2)} partidas`];
    return [h('b.rank-val', fmtN(r.value)), `victorias · ${fmtN(r.value2)} pts de dominio`];
  };
  function row(r) {
    const [v, sub] = valueOf(r);
    const isMe = me && r.username === me.username;
    return h('button.rank-row' + (r.pos === 1 ? '.top1' : r.pos <= 3 ? '.top3' : r.pos <= 10 ? '.top10' : '') + (isMe ? '.me' : ''), {
      nav: true, style: { '--c': r.color }, onclick: () => ctx.goto('profile', { user: r.username }),
    },
    h('span.rank-pos', r.pos <= 3 ? h('span.medal.m' + r.pos, String(r.pos)) : '#' + r.pos),
    avatar(ui, owner, lookOf(r), 44),
    h('div.rank-name', h('b', r.name, r.online ? h('span.dot-online') : null), h('small', `${titleOf(r)} · @${r.username}`)),
    h('div.rank-tags', levelBadge(r.level), kind !== 'rating' ? resist(r.rating, { short: true }) : h('span.muted.small', tierName(r.value))),
    h('div.rank-value', v, h('small', sub)));
  }
  async function load() {
    body.replaceChildren(loading());
    mineBox.replaceChildren();
    try {
      if (kind === 'records') {
        const recs = await svc.worldRecords();
        if (owner.disposed) return;
        const by = Object.fromEntries(recs.map((r) => [r.game, r]));
        body.replaceChildren(h('div.rec-grid', GAME_IDS.map((g) => {
          const r = by[g];
          return h('div.rec-card' + (r ? '' : '.empty'),
            gameChip(g),
            r ? h('b.rec-val', r.display) : h('b.rec-val', '—'),
            r ? h('button.linkbtn', { nav: true, style: { '--c': r.color || '#9B6CFF' }, onclick: () => r.username && ctx.goto('profile', { user: r.username }) }, r.name) : h('span.muted', 'Sin récord todavía'),
            r ? h('small', timeAgo(r.at)) : null);
        })), h('p.muted.small', 'Récords mundiales: solo cuentan las partidas de jugadores con cuenta. El servidor descarta valores imposibles.'));
        return;
      }
      const out = await svc.ranking(kind, { scope, p, game: kind === 'game' ? game : null, limit, search });
      if (owner.disposed) return;
      const rows = out.rows || [];
      body.replaceChildren(rows.length
        ? h('div.rank-list', rows.map(row))
        : empty(search ? 'Ningún jugador coincide con la búsqueda.' : scope === 'friends' ? 'Tus amigos todavía no tienen partidas en este ranking.' : 'Todavía no hay jugadores en este ranking. ¡Jugá una partida con cuenta para aparecer!', 'records'));
      if (me) {
        const mine = out.me;
        mineBox.replaceChildren(h('div.rank-mine-in',
          h('small', 'MI POSICIÓN'),
          mine ? h('b', `#${mine.pos}`) : h('b', '—'),
          h('span', mine ? `de ${fmtN(out.total)} jugadores` : 'Todavía no figurás en este ranking: jugá una partida con tu cuenta.')));
      }
    } catch (e) {
      body.replaceChildren(errorBox(errorText(e), load));
    }
  }
  renderBar();
  renderFilters();
  load();
  return { el: h('div.ranking', h('div.sec-head', h('h2', 'RANKING MUNDIAL'), h('p', 'Datos reales de todos los jugadores registrados. Sin cuentas ficticias.')), bar, filters, mineBox, body) };
}

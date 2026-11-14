// Logros: 148 logros en categorías, con dificultad, progreso, recompensas e íconos.
// Los secretos ocultan su descripción hasta desbloquearlos. Todo lo decide el servidor.
import { h, icon } from './dom.js';
import { ACHIEVEMENTS, ACH_CATEGORIES, TIERS, condProgress } from '../data/achievements.js';
import { ITEM_BY_ID, GAME_IDS, GAME_NAMES } from '../data/catalog.js';
import { tabs, empty, timeAgo, fmtN } from './kit.js';

export function achievementsSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  let cat = ctx.params.cat || 'all';
  let filter = 'all';
  const list = h('div.ach-list');
  const head = h('div.ach-head');
  const filters = h('div.store-filters');
  const unlocked = me?.achievements || {};
  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;

  head.replaceChildren(
    h('div.sec-head', h('h2', 'LOGROS'), h('p', me ? `${me.name} desbloqueó ${done} de ${total} logros.` : 'Iniciá sesión para desbloquear logros: se guardan en tu cuenta.')),
    h('div.ach-summary',
      h('div.ach-ring', { style: { '--pct': Math.round((done / total) * 100) } }, h('b', `${Math.round((done / total) * 100)}%`)),
      ...Object.entries(TIERS).map(([t, T]) => {
        const n = ACHIEVEMENTS.filter((a) => a.tier === t).length;
        const d = ACHIEVEMENTS.filter((a) => a.tier === t && unlocked[a.id]).length;
        return h('div.ach-tier', { style: { '--tc': T.color } }, h('b', `${d}/${n}`), h('small', T.name), h('span', `+${T.xp} XP · +${T.pies} PIES`));
      })));

  function renderFilters() {
    filters.replaceChildren(
      tabs([['all', 'Todos'], ...Object.entries(ACH_CATEGORIES)], cat, (v) => { cat = v; app.audio.play('click'); renderFilters(); renderList(); }, 'cat-tabs'),
      h('div.rar-filter', ...[['all', 'Todos'], ['done', 'Desbloqueados'], ['todo', 'Pendientes']].map(([v, l]) =>
        h('button.rf' + (filter === v ? '.on' : ''), { nav: true, onclick: () => { filter = v; renderFilters(); renderList(); } }, l))));
  }
  function row(a) {
    const got = !!unlocked[a.id];
    const hidden = a.secret && !got;
    const T = TIERS[a.tier];
    const prog = !got && !hidden ? condProgress(a.cond, me) : null;
    const rewards = a.rewards.map((r) => ITEM_BY_ID[r]?.name).filter(Boolean);
    return h('div.ach' + (got ? '.got' : '') + (hidden ? '.secret' : ''), { style: { '--tc': T.color } },
      h('span.ach-ico', icon(hidden ? 'lock' : a.icon)),
      h('div.ach-main',
        h('div.ach-title', h('b', hidden ? '???' : a.name), h('span.ach-tierchip', T.name), a.secret ? h('span.ach-tierchip.sec', 'SECRETO') : null,
          a.game ? h('span.ach-game', GAME_NAMES[a.game]) : null),
        h('p', hidden ? 'Logro secreto. Seguí jugando para descubrirlo.' : a.desc),
        prog ? h('div.ach-prog', h('div.kbar', h('div.kbar-fill', { style: { width: Math.min(100, Math.round((prog[0] / prog[1]) * 100)) + '%' } }), h('span', `${fmtN(Math.min(prog[0], prog[1]))} / ${fmtN(prog[1])}`))) : null),
      h('div.ach-rew',
        h('small', got ? `Desbloqueado ${timeAgo(unlocked[a.id])}` : 'Recompensa'),
        h('span', `+${T.xp} XP · +${T.pies} PIES`),
        rewards.length && !hidden ? h('em', rewards.join(' · ')) : null));
  }
  function renderList() {
    const items = ACHIEVEMENTS.filter((a) => (cat === 'all' || a.cat === cat) && (filter === 'all' || (filter === 'done') === !!unlocked[a.id]))
      .sort((a, b) => Number(!!unlocked[b.id]) - Number(!!unlocked[a.id]));
    if (cat === 'juegos' || cat === 'dominio') {
      // agrupados por minijuego
      const groups = GAME_IDS.map((g) => [g, items.filter((a) => a.game === g)]).filter(([, l]) => l.length);
      const other = items.filter((a) => !a.game);
      list.replaceChildren(...groups.map(([g, l]) => h('div.ach-group', h('h4', GAME_NAMES[g]), ...l.map(row))), ...other.map(row));
    } else {
      list.replaceChildren(...(items.length ? items.map(row) : [empty('No hay logros con ese filtro.', 'trophy')]));
    }
  }
  renderFilters();
  renderList();
  return { el: h('div.achievements', head, filters, list) };
}

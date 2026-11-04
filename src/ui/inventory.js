// Inventario: lo que tiene cada jugador (comprado, ganado o inicial), con filtros por categoría y
// rareza, equipar/desequipar, cómo se consiguió cada objeto y los objetos que todavía faltan.
import { h, icon } from './dom.js';
import { ALL_ITEMS, RARITIES } from '../data/catalog.js';
import { tabs, empty, avatar, lookOf, titleOf } from './kit.js';
import { CAT_TABS, itemCard, itemModal, isEquipped, toggleEquip } from './store.js';

const SLOT_NAMES = { skin: 'Skin', hat: 'Sombrero', face: 'Máscara', body: 'Accesorio', entrance: 'Entrada', victory: 'Victoria', emote: 'Emote', frame: 'Marco', card: 'Tarjeta', title: 'Título' };

export function inventorySection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  if (!me) {
    return {
      el: h('div.need-acc', icon('card'), h('h2', 'INVENTARIO'), h('p', 'Iniciá sesión para ver tus objetos, equiparlos y desbloquear más. Los invitados usan los personajes y accesorios básicos.'),
        h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => ctx.login(p) }, 'INICIAR SESIÓN / REGISTRARSE')),
    };
  }
  let cat = ctx.params.cat || 'all';
  let rar = 'all';
  let show = 'owned'; // owned | locked | all
  const grid = h('div.item-grid');
  const filters = h('div.store-filters');
  const loadout = h('div.loadout');

  function renderLoadout() {
    const acc = svc.slotAccount(p);
    const eq = acc.equipped || {};
    loadout.replaceChildren(
      h('div.lo-avatar', avatar(ui, owner, lookOf(acc), 120, { anim: 'idle' }), h('b', acc.name), h('span', titleOf(acc))),
      h('div.lo-slots', Object.entries(SLOT_NAMES).map(([slot, name]) => {
        const it = ALL_ITEMS.find((x) => x.id === eq[slot]);
        return h('button.lo-slot' + (it ? '.rar-' + it.rarity : ''), { nav: true, style: { '--rr': it ? RARITIES[it.rarity].color : '#3A4466' }, onclick: () => { cat = slot === 'card' ? 'card' : slot; show = 'owned'; renderFilters(); renderGrid(); } },
          h('small', name), h('b', it ? it.name : '—'));
      })));
  }
  function counts() {
    const owned = ALL_ITEMS.filter((it) => svc.owns(p, it.id)).length;
    return `${owned} / ${ALL_ITEMS.length} objetos`;
  }
  function renderFilters() {
    filters.replaceChildren(
      tabs(CAT_TABS, cat, (v) => { cat = v; app.audio.play('click'); renderFilters(); renderGrid(); }, 'cat-tabs'),
      h('div.rar-filter',
        ...[['owned', 'Míos'], ['locked', 'Bloqueados'], ['all', 'Todos']].map(([v, l]) => h('button.rf' + (show === v ? '.on' : ''), { nav: true, onclick: () => { show = v; renderFilters(); renderGrid(); } }, l)),
        h('span.rf-sep'),
        h('button.rf' + (rar === 'all' ? '.on' : ''), { nav: true, onclick: () => { rar = 'all'; renderFilters(); renderGrid(); } }, 'Todas'),
        ...Object.keys(RARITIES).map((r) => h('button.rf' + (rar === r ? '.on' : ''), { nav: true, style: { '--rr': RARITIES[r].color }, onclick: () => { rar = r; renderFilters(); renderGrid(); } }, RARITIES[r].name)),
        h('span.rf-count', counts())));
  }
  function renderGrid() {
    const list = ALL_ITEMS.filter((it) => {
      if (cat !== 'all' && it.category !== cat) return false;
      if (rar !== 'all' && it.rarity !== rar) return false;
      const own = svc.owns(p, it.id);
      return show === 'all' || (show === 'owned' ? own : !own);
    }).sort((a, b) => Number(isEquipped(me, b)) - Number(isEquipped(me, a)) || RARITIES[b.rarity].order - RARITIES[a.rarity].order);
    grid.replaceChildren(...(list.length ? list.map((it) => itemCard(ui, owner, it, p, open)) : [empty(show === 'owned' ? 'Todavía no tenés objetos de este tipo. ¡Pasá por la PIE STORE o desbloqueá logros!' : 'Nada por acá.', 'card')]));
  }
  function open(item) {
    app.audio.play('click');
    ui.modal(itemModal, { item, p, onChange: () => { renderLoadout(); renderGrid(); } });
  }
  renderLoadout();
  renderFilters();
  renderGrid();
  const el = h('div.inventory', h('div.sec-head', h('h2', 'INVENTARIO'), h('p', 'Equipá lo que quieras: el aspecto se ve en los minijuegos, en tu perfil y en el ranking.')), loadout, filters, grid);
  return { el };
}
export { toggleEquip };

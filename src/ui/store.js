// PIE STORE: tienda oficial de cosméticos. Se paga solo con PIES (moneda gratuita que se gana jugando).
// Los precios y las compras los valida el servidor; ningún objeto da ventajas en los minijuegos.
import { h, icon } from './dom.js';
import { STORE_ITEMS, ITEM_BY_ID, RARITIES, CATEGORIES } from '../data/catalog.js';
import { pies, rarityChip, itemPreview, tabs, empty, lookOf, piesIcon, fmtN } from './kit.js';
import { errorText } from '../net/api.js';

export const CAT_TABS = [
  ['all', 'Todo'], ['char', 'Personajes'], ['skin', 'Skins'], ['hat', 'Sombreros'], ['face', 'Máscaras'], ['body', 'Accesorios'],
  ['entrance', 'Entradas'], ['victory', 'Victorias'], ['emote', 'Emotes'], ['frame', 'Marcos'], ['card', 'Fondos de perfil'], ['title', 'Títulos'],
];
const RAR_ORDER = Object.keys(RARITIES);

/** ¿Está equipado este objeto? */
export function isEquipped(me, item) {
  if (!me) return false;
  if (item.category === 'char') return 'char_' + me.char === item.id;
  return me.equipped?.[item.category] === item.id;
}
/** Equipa o desequipa un objeto para el jugador p. */
export async function toggleEquip(ui, p, item) {
  const svc = ui.app.accounts;
  const me = svc.slotAccount(p);
  if (!me) return;
  try {
    if (item.category === 'char') await svc.setLook(p, { char: item.id.replace('char_', '') });
    else await svc.equip(p, item.category, isEquipped(me, item) ? null : item.id);
    ui.app.audio.play('confirm');
  } catch (e) {
    ui.app.audio.play('error');
    ui.toast({ kind: 'warn', title: 'No se pudo equipar', text: errorText(e) });
  }
}

/** Ventana de detalle de un objeto (tienda e inventario). */
export function itemModal(ui, { item, p, onChange }) {
  const app = ui.app;
  const svc = app.accounts;
  const m = {};
  const me = () => svc.slotAccount(p);
  const actions = h('div.dialog-actions');
  const R = RARITIES[item.rarity];
  function render() {
    const acc = me();
    const owned = svc.owns(p, item.id);
    const equipped = isEquipped(acc, item);
    actions.replaceChildren(h('button.btn.ghost', { nav: true, onclick: () => m.close() }, 'CERRAR'));
    if (!acc) {
      actions.append(h('button.btn.primary', { nav: true, onclick: () => m.close() }, 'INICIÁ SESIÓN PARA COMPRAR'));
    } else if (owned) {
      actions.append(h('button.btn.' + (equipped ? 'ghost' : 'primary'), { nav: true, 'data-autofocus': true, disabled: equipped && item.category === 'char' ? true : null, onclick: async () => { await toggleEquip(ui, p, item); render(); onChange?.(); } },
        equipped ? (item.category === 'char' ? 'EN USO' : 'DESEQUIPAR') : 'EQUIPAR'));
    } else if (item.price != null) {
      const enough = acc.pies >= item.price;
      actions.append(h('button.btn.green', { nav: true, 'data-autofocus': true, disabled: enough ? null : true, onclick: () => buy() },
        piesIcon(), enough ? `COMPRAR · ${fmtN(item.price)}` : `TE FALTAN ${fmtN(item.price - acc.pies)} PIES`));
    }
  }
  async function buy() {
    const ok = await ui.confirm({ title: `¿Comprar ${item.name}?`, text: `Cuesta ${fmtN(item.price)} PIES. Te quedarían ${fmtN(me().pies - item.price)} PIES.`, yes: 'Comprar', no: 'Cancelar', danger: false });
    if (!ok) return;
    try {
      await svc.buy(p, item.id);
      app.audio.play('unlock');
      app.renderer.overlayFx.confetti(640, 300, item.rarity === 'mythic' ? 120 : 60, 1.1, false);
      ui.toast({ kind: 'achievement', icon: 'pie', title: '¡Compra realizada!', name: item.name, text: `Ahora está en tu inventario.`, tier: item.rarity });
      render();
      onChange?.();
    } catch (e) {
      app.audio.play('error');
      ui.toast({ kind: 'warn', title: 'No se pudo comprar', text: errorText(e) });
    }
  }
  render();
  const acc = me();
  m.el = h('div.dialog.item-dialog.rar-glow-' + item.rarity, { style: { '--rr': R.color } },
    h('div.item-big', itemPreview(ui, m, item, 220, acc?.color || app.profiles[p].color, acc ? lookOf(acc) : { char: app.profiles[p].char, acc: null })),
    h('div.item-info',
      h('div.row', rarityChip(item.rarity), h('span.chip', CATEGORIES[item.category]?.name || item.category), item.meme ? h('span.chip.meme', 'MEME COLLECTION') : null),
      h('h2', item.name),
      h('p', item.desc),
      item.price != null ? h('div.item-price', pies(item.price, 'big')) : h('div.item-unlock', icon('lock'), h('span', item.unlock || 'Se desbloquea jugando')),
      svc.owns(p, item.id) ? h('div.item-owned', icon('check'), 'En tu inventario') : null,
      h('p.muted.small', 'Los cosméticos solo cambian el aspecto: no dan ninguna ventaja en los minijuegos.'),
      actions));
  m.onBack = () => m.close();
  return m;
}

/** Tarjeta de objeto para las grillas. */
export function itemCard(ui, owner, item, p, onOpen) {
  const svc = ui.app.accounts;
  const me = svc.slotAccount(p);
  const owned = svc.owns(p, item.id);
  const equipped = isEquipped(me, item);
  const R = RARITIES[item.rarity];
  const color = me?.color || ui.app.profiles[p].color;
  const look = me ? lookOf(me) : { char: ui.app.profiles[p].char, acc: null };
  return h('button.item-card.rar-' + item.rarity + (owned ? '.owned' : '') + (equipped ? '.equipped' : '') + (!owned && item.price == null ? '.locked' : ''), {
    nav: true, style: { '--rr': R.color }, title: item.name, onclick: () => onOpen(item),
  },
  h('div.ic-prev', itemPreview(ui, owner, item, 96, color, look, true)),
  h('div.ic-name', item.name),
  h('div.ic-foot',
    equipped ? h('span.ic-tag.eq', 'EQUIPADO')
      : owned ? h('span.ic-tag.own', icon('check'), 'TUYO')
        : item.price != null ? h('span.ic-price', piesIcon(), fmtN(item.price))
          : h('span.ic-tag.lock', icon('lock'), 'EXCLUSIVO')),
  item.rarity === 'mythic' ? h('span.ic-shine') : null);
}

export function storeSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  let cat = ctx.params.cat || 'all';
  let rar = 'all';
  let hideOwned = false;
  const grid = h('div.item-grid');
  const head = h('div.store-head');
  const filters = h('div.store-filters');
  function renderHead() {
    const me = svc.slotAccount(p);
    head.replaceChildren(
      h('div.store-brand', h('span.store-logo', piesIcon()), h('div', h('h2', 'PIE STORE'), h('p', '80 objetos · solo cosméticos · se paga con PIES ganados jugando'))),
      me ? h('div.store-bal', h('small', `SALDO DE ${me.name.toUpperCase()}`), pies(me.pies, 'big'), h('button.btn.small.ghost', { nav: true, onclick: () => ctx.goto('stats', { tab: 'pies' }) }, 'HISTORIAL DE PIES'))
        : h('div.store-bal', h('small', 'SIN CUENTA'), h('button.btn.small.primary', { nav: true, onclick: () => ctx.login(p) }, 'INICIÁ SESIÓN PARA COMPRAR')));
  }
  function renderFilters() {
    filters.replaceChildren(
      tabs(CAT_TABS, cat, (v) => { cat = v; app.audio.play('click'); renderFilters(); renderGrid(); }, 'cat-tabs'),
      h('div.rar-filter',
        h('button.rf' + (rar === 'all' ? '.on' : ''), { nav: true, onclick: () => { rar = 'all'; renderFilters(); renderGrid(); } }, 'Todas'),
        ...RAR_ORDER.map((r) => h('button.rf' + (rar === r ? '.on' : ''), { nav: true, style: { '--rr': RARITIES[r].color }, onclick: () => { rar = r; renderFilters(); renderGrid(); } }, RARITIES[r].name)),
        h('button.rf' + (hideOwned ? '.on' : ''), { nav: true, onclick: () => { hideOwned = !hideOwned; renderFilters(); renderGrid(); } }, hideOwned ? '✓ Ocultar lo que tengo' : 'Ocultar lo que tengo')));
  }
  function renderGrid() {
    const list = STORE_ITEMS
      .filter((it) => (cat === 'all' || it.category === cat) && (rar === 'all' || it.rarity === rar) && (!hideOwned || !svc.owns(p, it.id)))
      .sort((a, b) => RARITIES[a.rarity].order - RARITIES[b.rarity].order || a.price - b.price);
    grid.replaceChildren(...(list.length ? list.map((it) => itemCard(ui, owner, it, p, open)) : [empty('No hay objetos con ese filtro.', 'card')]));
  }
  function open(item) {
    app.audio.play('click');
    ui.modal(itemModal, { item, p, onChange: () => { renderHead(); renderGrid(); } });
  }
  renderHead();
  renderFilters();
  renderGrid();
  const el = h('div.store', head, filters, grid);
  const unsub = svc.on(() => { if (!owner.disposed) renderHead(); });
  return { el, destroy: unsub };
}

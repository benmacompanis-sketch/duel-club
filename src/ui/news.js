// NOVEDADES y REPORTES DE ERRORES.
// - Cartel de novedades: aparece una vez por cada actualización nueva y queda en la sección Novedades.
// - Reportar un error: con cuenta o como invitado. Se guarda en el servidor; el jugador ve el estado
//   (recibido, visto, arreglándolo, arreglado) y, con cuenta, recibe una notificación cuando se responde.
// - Panel de administración (solo cuentas marcadas como administradoras en el servidor).
import { h, icon } from './dom.js';
import { tabs, loading, errorBox, empty, timeAgo } from './kit.js';
import { NEWS, NEWS_KINDS, BUG_KINDS, BUG_STATUS } from '../data/news.js';
import { GAMES } from '../games/index.js';
import { rpc, errorText } from '../net/api.js';
import { APP_VERSION } from '../config.js';

const SEEN_KEY = 'duelclub.news.seen';
const BUGS_KEY = 'duelclub.bugs.v1';
let popupShown = false;

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
export const newsUnseen = () => load(SEEN_KEY, null) !== NEWS[0].id;
export const markNewsSeen = () => store(SEEN_KEY, NEWS[0].id);
const put = (el, ...nodes) => el.replaceChildren(...nodes.flat().filter((n) => n != null && n !== false));
const fmtDate = (d) => { const [y, m, dd] = d.split('-'); return `${Number(dd)}/${Number(m)}/${y}`; };

/** Tarjeta de una actualización. */
export function newsCard(ui, n, { onAction } = {}) {
  return h('article.news-card', { style: { '--c': n.color || '#9B6CFF' } },
    h('div.nc-head', h('span.nc-tag', n.tag || 'NOVEDAD'), h('small', `${fmtDate(n.date)} · versión ${n.version}`)),
    h('h3.nc-title', n.title),
    n.intro ? h('p.nc-intro', n.intro) : null,
    ...(n.blocks || []).map((b) => {
      const k = NEWS_KINDS[b.kind] || NEWS_KINDS.nuevo;
      return h('div.nc-block', { style: { '--k': k.color } },
        h('div.nc-kind', icon(k.icon), k.label),
        h('ul', ...b.items.map((it) => h('li', it))));
    }),
    n.action && onAction ? h('button.btn.primary.small', { nav: true, onclick: () => onAction(n.action) }, icon('play'), n.action.label) : null);
}

function runAction(ui, a) {
  if (a?.go === 'online') import('./online.js').then((m) => ui.show(m.onlineScreen));
}

/** Cartel emergente con la última novedad (una vez por actualización). */
export function newsModal(ui, { onOpenSection } = {}) {
  const m = {};
  const close = () => { markNewsSeen(); m.close?.(); };
  const n = NEWS[0];
  m.el = h('div.dialog.news-dialog',
    h('div.nd-kicker', icon('bell'), 'NOVEDADES DEL CLUB'),
    newsCard(ui, n),
    h('div.dialog-actions',
      h('button.btn.ghost', { nav: true, onclick: () => { close(); onOpenSection?.('report'); } }, 'REPORTAR ERROR'),
      h('button.btn', { nav: true, onclick: () => { close(); onOpenSection?.('news'); } }, 'VER TODAS'),
      n.action ? h('button.btn.green', { nav: true, onclick: () => { close(); runAction(ui, n.action); } }, icon('play'), n.action.label) : null,
      h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: close }, '¡GENIAL!')));
  m.onBack = close;
  return m;
}
/** Muestra el cartel si hay una actualización que este navegador todavía no vio. */
export function maybeShowNews(ui, onOpenSection) {
  const app = ui.app;
  if (popupShown || !newsUnseen() || app.runner.active || app.online || ui.modals.length) return;
  popupShown = true;
  ui.modal(newsModal, { onOpenSection });
}

/** Cartel fijo en Inicio. */
export function newsBanner(ui, ctx) {
  const n = NEWS[0];
  return h('div.news-banner', { style: { '--c': n.color || '#9B6CFF' } },
    h('button.nb-main', { nav: true, onclick: () => ctx.goto('news') },
      h('span.nb-tag', n.tag || 'NOVEDAD'),
      h('div.nb-text', h('b', n.title), h('span', n.intro || n.blocks?.[0]?.items?.[0] || '')),
      h('span.nb-more', 'NOVEDADES', icon('play'))),
    h('button.nb-bug', { nav: true, title: 'Reportar un error', onclick: () => ctx.goto('news', { tab: 'report' }) }, icon('flag'), h('span', '¿Un error?', h('br'), 'Reportalo')));
}

// ===================================================================================== SECCIÓN
export function newsSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  let tab = ctx.params?.tab || 'news';
  const body = h('div.news-body');
  const tabsBox = h('div');
  const viewer = () => svc.slotAccount(ctx.viewer) || svc.slotAccount(0) || svc.slotAccount(1) || null;
  const viewerUser = () => viewer()?.username || null;

  function render() {
    const isAdmin = !!viewer()?.is_admin;
    const list = [['news', 'NOVEDADES', 'bell'], ['report', 'REPORTAR UN ERROR', 'flag'], ['mine', 'MIS REPORTES', 'list']];
    if (isAdmin) list.push(['admin', 'ADMIN', 'shield']);
    put(tabsBox, tabs(list, tab, (t) => { tab = t; app.audio.play('click'); render(); }));
    if (tab === 'news') renderNews();
    else if (tab === 'report') renderReport();
    else if (tab === 'mine') renderMine();
    else if (tab === 'admin' && isAdmin) renderAdmin();
    else { tab = 'news'; renderNews(); }
  }

  // ---------------------------------------------------------------- novedades
  function renderNews() {
    markNewsSeen();
    ctx.refreshNav?.();
    put(body, h('div.news-list', NEWS.map((n) => newsCard(ui, n, { onAction: (a) => runAction(ui, a) }))));
  }

  // ---------------------------------------------------------------- reportar
  function renderReport() {
    const me = viewer();
    let kind = 'bug';
    const kinds = h('div.bug-kinds', BUG_KINDS.map(([id, label, desc]) =>
      h('button.bug-kind' + (id === kind ? '.on' : ''), { nav: true, dataset: { id }, onclick: (e) => {
        kind = id;
        kinds.querySelectorAll('.bug-kind').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
        app.audio.play('click');
      } }, h('b', label), h('span', desc))));
    const PLACES = ['General', 'Menú / pantallas', 'Jugar online', 'PIE STORE / inventario', 'Cuenta / perfil', 'Ranking / CLUB', ...GAMES.map((G) => G.meta.name)];
    const place = h('select.acc-input.bug-select', { nav: true, 'aria-label': 'Dónde pasó' }, ...PLACES.map((p) => h('option', { value: p }, p)));
    const desc = h('textarea.acc-input.bug-text', { nav: true, maxlength: 2000, rows: 5, 'aria-label': 'Qué pasó', placeholder: '¿Qué pasó? ¿Qué estabas haciendo? ¿Pasa siempre o una sola vez? Cuanto más detalle, más fácil de arreglar.' });
    const count = h('small.bug-count', '0 / 2000');
    desc.addEventListener('input', () => { count.textContent = `${desc.value.length} / 2000`; });
    const nameIn = me ? null : h('input.acc-input.bug-name', { type: 'text', nav: true, maxlength: 30, placeholder: 'Tu nombre (opcional)', 'aria-label': 'Tu nombre' });
    let withDiag = true;
    const diagToggle = h('button.toggle.on', { nav: true, 'aria-label': 'Incluir datos técnicos', onclick: () => { withDiag = !withDiag; diagToggle.classList.toggle('on', withDiag); app.audio.play('click'); } });
    const diagPreview = h('pre.bug-diag.hidden');
    const err = h('p.acc-error');
    const send = h('button.btn.green.big', { nav: true, onclick: () => submit() }, icon('check'), 'ENVIAR REPORTE');
    async function submit() {
      const text = desc.value.trim();
      if (text.length < 10) { err.textContent = 'Contanos un poco más (al menos 10 letras).'; app.audio.play('error'); desc.focus(); return; }
      err.textContent = '';
      send.disabled = true;
      send.replaceChildren('ENVIANDO…');
      try {
        const tok = me ? svc.tokenOf(me.username) : null;
        const out = await rpc('dc_bug_report', { p_token: tok, p_report: { kind, place: place.value, description: text, name: nameIn?.value?.trim() || null, diag: withDiag ? diagnostics(app) : {} } });
        const mine = load(BUGS_KEY, []);
        store(BUGS_KEY, [out.id, ...mine.filter((x) => x !== out.id)].slice(0, 50));
        app.audio.play('confirm');
        put(body, h('div.card.bug-thanks',
          h('div.ol-need-ico', icon('check')),
          h('h3', `¡GRACIAS! REPORTE #${out.num} RECIBIDO`),
          h('p', 'Lo vamos a revisar. ' + (me ? 'Cuando lo respondamos o lo arreglemos te llega una notificación.' : 'Podés ver cómo va en MIS REPORTES (desde esta compu).')),
          h('div.row.center',
            h('button.btn', { nav: true, onclick: () => { tab = 'mine'; render(); } }, 'VER MIS REPORTES'),
            h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => { tab = 'report'; render(); } }, 'REPORTAR OTRO'))));
        ui.focusFirst?.();
      } catch (e) {
        err.textContent = errorText(e);
        app.audio.play('error');
        send.disabled = false;
        send.replaceChildren(icon('check'), 'ENVIAR REPORTE');
      }
    }
    put(body, h('div.bug-form',
      h('div.card.bug-card',
        h('div.bug-who', icon('user'), me ? h('span', 'Reportás como ', h('b', me.name), ` (@${me.username}). Te avisamos cuando lo arreglemos.`) : h('span', 'Reportás como invitado. Si iniciás sesión, te avisamos cuando lo arreglemos.')),
        h('div.bug-label', '¿QUÉ TIPO DE PROBLEMA?'), kinds,
        h('div.bug-row', h('div.bug-label', '¿DÓNDE PASÓ?'), place, nameIn),
        h('div.bug-label', '¿QUÉ PASÓ?'), desc, count,
        h('div.opt', h('div.opt-label', h('b', 'Incluir datos técnicos'), h('span', 'Versión del juego, navegador, tamaño de pantalla y los últimos errores. Nada personal.'),
          h('button.linkbtn', { nav: true, onclick: () => { diagPreview.textContent = JSON.stringify(diagnostics(app), null, 2); diagPreview.classList.toggle('hidden'); } }, 'Ver qué se envía')), diagToggle),
        diagPreview, err,
        h('div.row', h('div.spacer'), send))));
  }

  // ---------------------------------------------------------------- mis reportes
  async function renderMine() {
    put(body, loading('Buscando tus reportes…'));
    try {
      const me = viewer();
      const ids = load(BUGS_KEY, []);
      const [own, local] = await Promise.all([
        me ? rpc('dc_my_bugs', { p_token: svc.tokenOf(me.username) }) : Promise.resolve([]),
        ids.length ? rpc('dc_bug_status', { p_ids: ids }) : Promise.resolve([]),
      ]);
      if (owner.disposed || tab !== 'mine') return;
      const seen = new Set();
      const list = [...own, ...local].filter((b) => !seen.has(b.id) && seen.add(b.id)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      put(body, list.length
        ? h('div.bug-list', list.map((b) => bugRow(b)))
        : h('div', empty('Todavía no enviaste reportes desde esta compu' + (me ? ' ni con tu cuenta.' : '.'), 'flag'),
          h('div.row.center', h('button.btn.primary', { nav: true, onclick: () => { tab = 'report'; render(); } }, 'REPORTAR UN ERROR'))));
    } catch (e) {
      put(body, errorBox(errorText(e), renderMine));
    }
  }
  function bugRow(b, extra = null) {
    const st = BUG_STATUS[b.status] || BUG_STATUS.nuevo;
    const k = BUG_KINDS.find((x) => x[0] === b.kind);
    return h('div.bug-row-item', { style: { '--s': st.color } },
      h('div.bri-head', h('b', `#${b.num}`), h('span.chip', k ? k[1] : b.kind), b.place ? h('span.muted', b.place) : null, h('div.spacer'),
        h('span.bri-status', st.label), h('small.muted', timeAgo(b.created_at))),
      h('p.bri-desc', b.description),
      b.reply ? h('div.bri-reply', icon('bolt'), h('span', h('b', 'Respuesta: '), b.reply)) : null,
      extra);
  }

  // ---------------------------------------------------------------- administración
  let adminFilter = 'nuevo';
  async function renderAdmin() {
    put(body, loading('Cargando reportes…'));
    try {
      const me = viewer();
      const out = await rpc('dc_admin_bugs', { p_token: svc.tokenOf(me.username), p_status: adminFilter === 'todos' ? null : adminFilter });
      if (owner.disposed || tab !== 'admin') return;
      const c = out.counts || {};
      const filters = h('div.tabs.bug-filters', [['nuevo', 'Nuevos'], ['visto', 'Vistos'], ['arreglando', 'Arreglando'], ['arreglado', 'Arreglados'], ['descartado', 'Revisados'], ['todos', 'Todos']].map(([id, label]) =>
        h('button.tab.small' + (id === adminFilter ? '.on' : ''), { nav: true, onclick: () => { adminFilter = id; renderAdmin(); } }, `${label}${id !== 'todos' && c[id] ? ' · ' + c[id] : ''}`)));
      put(body, h('div.bug-admin', filters,
        out.reports.length ? h('div.bug-list', out.reports.map((b) => adminRow(b, me))) : empty('No hay reportes en esta lista.', 'check')));
    } catch (e) {
      put(body, errorBox(errorText(e), renderAdmin));
    }
  }
  function adminRow(b, me) {
    const reply = h('input.acc-input.bug-reply-in', { type: 'text', nav: true, maxlength: 600, placeholder: 'Respuesta para el jugador (opcional)', value: b.reply || '' });
    const save = async (status) => {
      try {
        await rpc('dc_admin_bug_update', { p_token: svc.tokenOf(me.username), p_id: b.id, p_status: status, p_reply: reply.value.trim() || null });
        ui.toast({ kind: 'achievement', icon: 'check', title: `Reporte #${b.num}`, text: `Marcado como ${BUG_STATUS[status].label.toLowerCase()}${b.user ? ' · se le avisó al jugador' : ''}.` });
        renderAdmin();
      } catch (e) {
        ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) });
      }
    };
    const diag = h('pre.bug-diag.hidden', JSON.stringify(b.diag || {}, null, 2));
    return bugRow(b, h('div.bri-admin',
      h('small.muted', b.user ? `De ${b.name} (@${b.user})` : `De invitado${b.name ? ' · ' + b.name : ''}`, ' · ',
        h('button.linkbtn', { nav: true, onclick: () => diag.classList.toggle('hidden') }, 'datos técnicos')),
      diag, reply,
      h('div.row', ...['visto', 'arreglando', 'arreglado', 'descartado'].map((s) =>
        h('button.btn.small' + (s === 'arreglado' ? '.green' : '') + (b.status === s ? '.on' : ''), { nav: true, onclick: () => save(s) }, BUG_STATUS[s].label.toUpperCase())))));
  }

  const el = h('div.news-section',
    h('div.sec-head', h('h2', 'NOVEDADES'), h('p', 'Qué cambió en el juego, qué errores se arreglaron y un lugar para avisarnos si algo anda mal.')),
    tabsBox, body);
  render();
  return { el };
}

/** Datos técnicos que ayudan a reproducir un error (nada personal). */
export function diagnostics(app) {
  return {
    version: APP_VERSION,
    navegador: navigator.userAgent.slice(0, 220),
    idioma: navigator.language,
    pantalla: `${screen.width}x${screen.height} @${Math.round((devicePixelRatio || 1) * 100) / 100}`,
    ventana: `${innerWidth}x${innerHeight}`,
    seccion: app.save.lastSection || null,
    calidad: app.settings.quality,
    conexion: app.accounts.status,
    jugando: app.runner.active ? app.runner.gameId : null,
    online: app.online ? { modo: app.online.linkMode, ping: app.online.ping } : null,
    errores: (app.errorLog || []).slice(-6),
  };
}

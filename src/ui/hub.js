// Menú principal de la plataforma: barra superior (J1/J2, nivel, XP, PIES, ELO, notificaciones),
// barra lateral con todas las secciones y área de contenido. Todo se puede usar con teclado o mouse.
import { h, icon, toggleFullscreen } from './dom.js';
import { duoStage } from './menu.js';
import { pies, resist, levelBadge, xpBar, avatar, lookOf, titleOf, timeAgo, gameChip, errorBox, loading, fmtN } from './kit.js';
import { levelInfo, GAME_NAMES } from '../data/catalog.js';
import { accountModal } from './accountModal.js';
import { notificationsModal } from './notifications.js';
import { duelSetupScreen, tournamentSetupScreen, survivalSetupScreen } from './modeSetup.js';
import { quickPlayScreen } from './quickPlay.js';
import { settingsScreen } from './settings.js';
import { playerSelectScreen } from './playerSelect.js';
import { storeSection } from './store.js';
import { inventorySection } from './inventory.js';
import { achievementsSection } from './achievementsView.js';
import { profileSection } from './profile.js';
import { clubSection } from './club.js';
import { rankingSection } from './ranking.js';
import { statsSection } from './statsView.js';
import { gamesSection } from './gamesView.js';
import { onlineScreen } from './online.js';
import { passSection } from './pass.js';
import { newsSection, newsBanner, newsUnseen, maybeShowNews } from './news.js';

export const SECTIONS = [
  { id: 'home', name: 'Inicio', icon: 'star', color: '#9B6CFF' },
  { id: 'play', name: 'Jugar', icon: 'play', color: '#3985FF' },
  { id: 'games', name: 'Minijuegos', icon: 'list', color: '#48D597' },
  { id: 'profile', name: 'Perfil', icon: 'user', color: '#25CFE6' },
  { id: 'club', name: 'CLUB', icon: 'heart', color: '#FF5FA2' },
  { id: 'ranking', name: 'Ranking', icon: 'records', color: '#FFC93C' },
  { id: 'pass', name: 'Pase', icon: 'crown', color: '#FFC93C' },
  { id: 'store', name: 'PIE STORE', icon: 'pie', color: '#FFD16B' },
  { id: 'inventory', name: 'Inventario', icon: 'card', color: '#9B6CFF' },
  { id: 'achievements', name: 'Logros', icon: 'trophy', color: '#FF8E3C' },
  { id: 'stats', name: 'Estadísticas', icon: 'arrow', color: '#48D597' },
  { id: 'news', name: 'Novedades', icon: 'flame', color: '#25CFE6' },
  { id: 'settings', name: 'Configuración', icon: 'settings', color: '#8C96B8' },
];
const RENDER = {
  home: homeSection, play: playSection, games: gamesSection, profile: profileSection, club: clubSection, ranking: rankingSection,
  pass: passSection, store: storeSection, inventory: inventorySection, achievements: achievementsSection, stats: statsSection, news: newsSection,
};

/** Jugador que está "mirando" las secciones personales (J1 o J2). */
function defaultViewer(app) {
  const v = app.save.viewer;
  if ((v === 0 || v === 1) && app.accounts.slotAccount(v)) return v;
  if (app.accounts.slotAccount(0)) return 0;
  if (app.accounts.slotAccount(1)) return 1;
  return 0;
}

export function hubScreen(ui, params = {}) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  let section = params.section || app.save.lastSection || 'home';
  if (!SECTIONS.some((s) => s.id === section) || section === 'settings') section = 'home';
  let current = null;
  const ctx = {
    viewer: defaultViewer(app),
    params: params.sectionParams || {},
    setViewer(p) {
      ctx.viewer = p;
      app.save.viewer = p;
      app.persist();
      renderTop();
      open(section, ctx.params, true);
    },
    goto: (id, p = {}) => open(id, p),
    login: (p) => openAccount(p),
    refresh: () => open(section, ctx.params, true),
    refreshNav: () => renderNavDots(),
  };

  // ---------------------------------------------------------------- barra superior
  const top = h('div.topbar');
  function slotBox(p) {
    const me = svc.slotAccount(p);
    const prof = app.profiles[p];
    const sel = ctx.viewer === p && me;
    if (!me) {
      return h('button.tb-slot.guest' + (p ? '.right' : ''), { nav: true, style: { '--c': prof.color }, onclick: () => openAccount(p), title: 'Iniciar sesión o registrarse' },
        avatar(ui, scr, { char: prof.char, color: prof.color, acc: prof.acc }, 44, { seed: p }),
        h('div.tb-info', h('small', `J${p + 1} · INVITADO`), h('b', prof.name), h('em', 'Iniciá sesión para guardar tu progreso')));
    }
    const L = levelInfo(me.xp);
    return h('button.tb-slot' + (p ? '.right' : '') + (sel ? '.sel' : ''), {
      nav: true, style: { '--c': me.color }, title: `Ver como ${me.name}`,
      onclick: () => { if (ctx.viewer !== p) ctx.setViewer(p); else openAccount(p); },
    },
    avatar(ui, scr, lookOf(me), 44, { seed: p }),
    h('div.tb-info',
      h('small', `J${p + 1} · ${titleOf(me)}`),
      h('b', me.name, me.unread ? h('span.tb-dot', String(me.unread > 9 ? '9+' : me.unread)) : null),
      h('div.tb-line', levelBadge(L.level), xpBar(me.xp))),
    h('div.tb-cur', pies(me.pies), resist(me.rating, { short: true })));
  }
  function renderTop() {
    const anyAcc = svc.slotAccount(0) || svc.slotAccount(1);
    const unread = [0, 1].reduce((n, p) => n + (svc.slotAccount(p)?.unread || 0), 0);
    top.replaceChildren(
      slotBox(0),
      h('div.tb-mid',
        h('button.icon-btn.tb-bell' + (unread ? '.has' : ''), { nav: true, title: 'Notificaciones', onclick: () => anyAcc ? ui.modal(notificationsModal, { onChange: renderTop }) : openAccount(0) },
          icon('bell'), unread ? h('span.tb-badge', String(unread > 99 ? '99+' : unread)) : null),
        h('div.tb-status.' + svc.status, h('span.tb-led'), svc.status === 'online' ? 'EN LÍNEA' : svc.status === 'offline' ? 'SIN CONEXIÓN' : 'CONECTANDO')),
      slotBox(1));
  }
  function openAccount(p) {
    app.audio.play('click');
    ui.modal(accountModal, { p, onDone: () => { ctx.viewer = defaultViewer(app); renderTop(); open(section, ctx.params, true); } });
  }

  // ---------------------------------------------------------------- barra lateral
  const nav = h('nav.sidenav', SECTIONS.map((s) =>
    h('button.sn-btn', { nav: true, dataset: { id: s.id }, style: { '--accent': s.color }, onclick: () => open(s.id) },
      h('span.sn-ico', icon(s.icon)), h('span', s.name))));
  // punto en Novedades cuando hay una actualización que este navegador no vio
  function renderNavDots() {
    const b = nav.querySelector('.sn-btn[data-id="news"]');
    b?.querySelector('.sn-dot')?.remove();
    if (b && newsUnseen()) b.append(h('span.sn-dot'));
  }
  renderNavDots();
  const content = h('div.hub-content');

  function open(id, p = {}, silent = false) {
    if (id === 'settings') {
      app.audio.play('click');
      ui.show(settingsScreen, { back: () => ui.show(hubScreen, { section }) });
      return;
    }
    if (!silent) app.audio.play('click');
    section = id;
    ctx.params = p;
    app.save.lastSection = id;
    nav.querySelectorAll('.sn-btn').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
    try {
      current?.destroy?.();
    } catch {}
    // las vistas previas de la sección anterior se liberan con su dueño
    if (current) current.disposed = true;
    current = { disposed: false };
    const owner = current;
    let out;
    try {
      out = RENDER[id](ui, owner, ctx);
    } catch (e) {
      console.error(e);
      out = { el: errorBox('No se pudo abrir esta sección.') };
    }
    owner.destroy = out.destroy;
    out.el.classList.add('section');
    content.replaceChildren(out.el);
    content.scrollTop = 0;
  }

  scr.el = h('div.hub', top, h('div.hub-main', h('div.hub-side', h('div.side-logo', h('span.sl-duel', 'DUEL'), icon('bolt'), h('span.sl-club', 'CLUB')), nav,
    h('div.hub-side-foot',
      h('button.icon-btn', { nav: true, title: 'Jugadores', onclick: () => ui.show(playerSelectScreen, { title: 'JUGADORES', subtitle: 'Elegí personaje y color · iniciá sesión o jugá como invitado', onDone: () => ui.show(hubScreen, { section }), onBack: () => ui.show(hubScreen, { section }) }) }, icon('user')),
      h('button.icon-btn', { nav: true, title: 'Pantalla completa', onclick: () => toggleFullscreen() }, icon('fullscreen')))),
  content));
  renderTop();
  open(section, params.sectionParams || {}, true);
  // cartel de novedades (una vez por actualización)
  setTimeout(() => { if (!scr.disposed) maybeShowNews(ui, (tab) => open('news', { tab })); }, 900);
  const unsub = svc.on(() => { if (!scr.disposed) renderTop(); });
  scr.destroy = () => {
    unsub();
    try { current?.destroy?.(); } catch {}
    if (current) current.disposed = true;
  };
  scr.onBack = () => { if (section !== 'home') open('home'); };
  // los previews de las secciones usan "current" como dueño: el UI los limpia cuando current.disposed
  return scr;
}

// ================================================================== INICIO
function homeSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const passBox = h('div.home-pass', passSummary());
  const el = h('div.home',
    newsBanner(ui, ctx),
    h('div.home-hero',
      h('div.home-stage', duoStage(ui, owner, 600, 330, { scale: 1.45 })),
      h('div.home-cta',
        h('div.home-slogan', 'ONE CLUB.', h('br'), h('span', 'INFINITE DUELS.')),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); ui.show(duelSetupScreen); } }, icon('duel'), 'DUEL MODE'),
        h('div.row',
          h('button.btn', { nav: true, onclick: () => { app.audio.play('click'); ui.show(quickPlayScreen); } }, icon('quick'), 'QUICK PLAY'),
          h('button.btn', { nav: true, onclick: () => ctx.goto('play') }, icon('play'), 'MÁS MODOS')),
        h('div.home-acc', [0, 1].map((p) => {
          const me = svc.slotAccount(p);
          return me
            ? h('div.home-slot', { style: { '--c': me.color } }, h('b', `J${p + 1} · ${me.name}`), h('span', `Nivel ${me.level} · ${fmtN(me.today)} partidas hoy`))
            : h('button.home-slot.guest', { nav: true, onclick: () => ctx.login(p) }, h('b', `J${p + 1} · Invitado`), h('span', 'Iniciar sesión / Registrarse'));
        })))),
    h('div.home-grid',
      h('div.card.home-card', h('h3', icon('crown'), 'Pase y desafíos'), passBox),
      h('div.card.home-card', h('h3', icon('trophy'), 'Atajos'),
        h('div.home-links',
          link('PIE STORE', 'Cosméticos con PIES', 'store', '#FFD16B'),
          link('Ranking mundial', 'ELO, nivel y récords', 'ranking', '#FFC93C'),
          link('CLUB', 'Amigos, solicitudes y cara a cara', 'club', '#FF5FA2'),
          link('Logros', '152 logros, algunos secretos', 'achievements', '#FF8E3C')))));
  function link(t, s, id, c) {
    return h('button.home-link', { nav: true, style: { '--accent': c }, onclick: () => ctx.goto(id) }, h('b', t), h('span', s));
  }
  function passSummary() {
    const me = svc.slotAccount(ctx.viewer);
    if (!me) return [h('p.muted', 'Con una cuenta subís el Pase de Batalla y completás desafíos diarios y semanales.'), h('button.btn', { nav: true, onclick: () => ctx.login(ctx.viewer) }, 'INICIAR SESIÓN')];
    const P = me.pass;
    const out = [];
    if (P) {
      const into = P.level >= P.levels ? P.xp_per_level : P.xp % P.xp_per_level;
      out.push(h('div.hp-row', h('b', P.name), h('span', `Nivel ${P.level} / ${P.levels}${P.premium ? ' · PREMIUM' : ''}`)),
        h('div.ph-bar', h('i', { style: { width: `${(into / P.xp_per_level) * 100}%` } })));
    } else out.push(h('p.muted', 'No hay una temporada activa en este momento.'));
    const ready = (P?.ready || 0) + (me.challenges_ready || 0);
    out.push(h('button.btn' + (ready ? '.primary' : ''), { nav: true, onclick: () => ctx.goto('pass', { tab: P?.ready || !me.challenges_ready ? 'pass' : 'challenges' }) },
      ready ? `TENÉS ${ready} RECOMPENSA${ready > 1 ? 'S' : ''} PARA RECLAMAR` : 'VER PASE Y DESAFÍOS'));
    return out;
  }
  return { el };
}

// ================================================================== JUGAR
function playSection(ui, owner, ctx) {
  const app = ui.app;
  const MODES = [
    { id: 'duel', title: 'DUEL MODE', sub: 'La competición principal: de 3 a 12 minijuegos, un campeón.', color: '#3985FF', icon: 'duel', go: () => ui.show(duelSetupScreen) },
    { id: 'quick', title: 'QUICK PLAY', sub: 'Elegí un minijuego y jugá ya. Revancha con un botón.', color: '#48D597', icon: 'quick', go: () => ui.show(quickPlayScreen) },
    { id: 'tournament', title: 'TOURNAMENT', sub: 'Rondas, clasificación y una gran final que vale doble.', color: '#9B6CFF', icon: 'tournament', go: () => ui.show(tournamentSetupScreen) },
    { id: 'survival', title: 'SURVIVAL', sub: 'Vidas, etapas y dificultad que no para de subir.', color: '#FF654F', icon: 'survival', go: () => ui.show(survivalSetupScreen) },
  ];
  const el = h('div.play',
    h('div.sec-head', h('h2', 'JUGAR'), h('p', 'Las partidas entre cuentas dan XP, PIES y ELO. Contra invitados se gana XP y PIES, pero el ELO no cambia.')),
    h('button.online-card', { nav: true, 'data-autofocus': true, onclick: () => { app.audio.play('confirm'); ui.show(onlineScreen); } },
      h('span.oc-ico', icon('bolt')),
      h('div.oc-main', h('small', 'NUEVO'), h('b', 'JUGAR ONLINE'), h('span', 'Vos en tu compu, tu amigo en la suya. Buscá rival por ELO, creá una sala con código o desafiá a un amigo del CLUB.')),
      h('span.oc-go', icon('play'))),
    h('div.sec-sub', 'EN ESTA COMPU · DOS JUGADORES, UN TECLADO'),
    h('div.mode-grid', MODES.map((m) =>
      h('button.mode-card', { nav: true, style: { '--accent': m.color }, onclick: () => { app.audio.play('confirm'); m.go(); } },
        h('span.mode-ico', icon(m.icon)), h('b', m.title), h('span', m.sub)))),
    h('div.card.caos-card',
      h('div', h('b', 'DIFICULTAD CAOS'), h('p.muted', 'Disponible en todos los modos. Turbo, cámara lenta, controles invertidos, espejo, apagón y terremoto: siempre anunciados y siempre iguales para los dos.')),
      h('button.btn', { nav: true, onclick: () => { app.audio.play('click'); ui.show(playerSelectScreen, { title: 'JUGADORES', subtitle: 'Elegí personaje y color', onDone: () => ui.show(hubScreen, { section: 'play' }), onBack: () => ui.show(hubScreen, { section: 'play' }) }); } }, icon('user'), 'ELEGIR PERSONAJES')));
  return { el };
}

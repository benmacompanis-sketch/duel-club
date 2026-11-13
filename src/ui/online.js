// JUGAR ONLINE: cada jugador en su compu.
// Menú (buscar rival por SUSI, crear sala con código, entrar con código, desafiar a un amigo), esperas,
// presentación de cada ronda, resultados confirmados por el servidor, final de la serie y revancha.
import { h, icon, keycap } from './dom.js';
import { header, segGroup, toggleRow, gameIcon } from './widgets.js';
import { profileCard, avatar, lookOf, resist, levelBadge, empty, loading, errorBox, fmtN, gameChip, timeAgo } from './kit.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { rpc, errorText } from '../net/api.js';
import { OnlineMatch } from '../net/onlineMatch.js';
import { resultsScreen } from './results.js';
import { accountModal } from './accountModal.js';
import { W, H, text, panel, rgba } from '../core/utils.js';

const BEST = [[1, 'Única'], [3, 'Mejor de 3'], [5, 'Mejor de 5']];
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

/** Cuentas de esta compu que pueden jugar online (las iniciadas como J1 o J2). */
function localAccounts(app) {
  return [0, 1].map((p) => ({ p, me: app.accounts.slotAccount(p) })).filter((x) => x.me);
}
function pickUser(app) {
  const list = localAccounts(app);
  if (!list.length) return null;
  const saved = app.save.onlineUser;
  return (list.find((x) => x.me.username === saved) || list[0]).me.username;
}
function slotOf(app, user) {
  return [0, 1].find((p) => app.accounts.slotUser(p) === user) ?? 0;
}
const call = (app, user, fn, args = {}) => rpc(fn, { p_token: app.accounts.tokenOf(user), ...args });
/** replaceChildren ignorando los null (el DOM los convertiría en el texto "null"). */
const put = (el, ...nodes) => el.replaceChildren(...nodes.flat().filter((n) => n != null && n !== false));

export function shareLink(code) {
  return `${location.origin}${location.pathname}?sala=${code}`;
}

// ===================================================================================== MENÚ ONLINE
export function onlineScreen(ui, params = {}) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  const cfg = Object.assign({ best_of: 3, game: 'random', caos: false }, app.save.onlineCfg || {});
  const saveCfg = () => { app.save.onlineCfg = { ...cfg }; app.persist(); };
  let user = pickUser(app);
  const body = h('div.ol-body');
  const whoSlot = h('div.ol-who-slot');
  const back = () => ui.goMenu();

  function render() {
    user = user && localAccounts(app).some((x) => x.me.username === user) ? user : pickUser(app);
    if (!user) {
      whoSlot.replaceChildren();
      body.replaceChildren(h('div.card.ol-need',
        h('div.ol-need-ico', icon('user')),
        h('h3', 'NECESITÁS UNA CUENTA'),
        h('p.muted', 'Para jugar online cada uno entra con su cuenta desde su compu. Así el servidor sabe quién es quién y la partida cuenta para SUSI, KEKE y PIES.'),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => ui.modal(accountModal, { p: 0, onDone: render }) }, icon('user'), 'INICIAR SESIÓN O CREAR CUENTA')));
      ui.focusFirst();
      return;
    }
    app.save.onlineUser = user;
    const me = svc.cache.get(user);
    const accs = localAccounts(app);
    put(whoSlot,
      accs.length > 1 ? h('div.seg.ol-who-seg', accs.map((x) => h('button.seg-btn' + (x.me.username === user ? '.active' : ''), { nav: true, title: 'Jugar online como ' + x.me.name, onclick: () => { user = x.me.username; app.audio.play('click'); render(); } }, x.me.name))) : null,
      h('div.ol-who',
        avatar(ui, scr, lookOf(me), 46),
        h('div', h('small', 'JUGÁS COMO'), h('b', me?.name || user), h('div.row', levelBadge(me?.level || 1), resist(me?.rating || 1000, { short: true })))));

    // ---- buscar rival
    const findCard = h('div.card.ol-card', { style: { '--accent': '#3985FF' } },
      h('div.ol-card-head', h('span.ol-ico', icon('duel')), h('div', h('h3', 'BUSCAR RIVAL'), h('p.muted', 'Te emparejamos con alguien de SUSI parecido. Mejor de 3, minijuegos al azar.'))),
      h('ul.ol-points',
        h('li', icon('shield'), 'Rival de tu nivel (el rango se abre si tarda)'),
        h('li', icon('shuffle'), '3 minijuegos al azar, iguales para los dos'),
        h('li', icon('trophy'), 'Cada minijuego da SUSI, KEKE y PIES'),
        h('li', icon('check'), 'El resultado lo confirman las dos compus')),
      h('div.spacer'),
      h('button.btn.primary.big.wide', { nav: true, 'data-autofocus': true, onclick: () => startSearch(ui, user) }, icon('play'), 'BUSCAR PARTIDA'));

    // ---- sala con amigos
    const sel = h('select.acc-input.ol-select', { nav: true, 'aria-label': 'Minijuegos' },
      h('option', { value: 'random' }, 'Minijuegos al azar'),
      ...GAMES.map((G) => h('option', { value: G.meta.id }, G.meta.name)));
    sel.value = GAME_BY_ID[cfg.game] ? cfg.game : 'random';
    sel.addEventListener('change', () => { cfg.game = sel.value; saveCfg(); });
    const codeIn = h('input.acc-input.ol-code', { type: 'text', nav: true, maxlength: 5, placeholder: 'CÓDIGO', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Código de sala', value: params.code || '' });
    codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
    const joinErr = h('p.acc-error');
    const join = async () => {
      const code = codeIn.value.trim().toUpperCase();
      if (!CODE_RE.test(code)) { joinErr.textContent = 'El código tiene 5 letras o números (te lo pasa tu amigo).'; app.audio.play('error'); return; }
      joinErr.textContent = '';
      try {
        const v = await call(app, user, 'dc_online_join', { p_code: code });
        app.audio.play('confirm');
        runOnline(app, user, v);
      } catch (e) {
        joinErr.textContent = errorText(e);
        app.audio.play('error');
      }
    };
    scr.onEnter = (t) => { if (t === codeIn) join(); };
    const roomCard = h('div.card.ol-card', { style: { '--accent': '#48D597' } },
      h('div.ol-card-head', h('span.ol-ico', icon('heart')), h('div', h('h3', 'JUGAR CON UN AMIGO'), h('p.muted', 'Creá una sala y pasale el código (o el link) a tu amigo. Él lo pone acá y listo.'))),
      segGroup('Serie', null, BEST, () => cfg.best_of, (v) => { cfg.best_of = v; saveCfg(); }, ui),
      h('div.opt', h('div.opt-label', h('b', 'Minijuegos')), sel),
      toggleRow('Dificultad CAOS', 'Modificadores sorpresa, iguales para los dos', () => cfg.caos, (v) => { cfg.caos = v; saveCfg(); }, ui),
      h('button.btn.green.wide', { nav: true, onclick: () => createRoom(ui, user, { ...cfg }) }, icon('star'), 'CREAR SALA'),
      h('div.ol-or', h('span', 'o entrá a la sala de tu amigo')),
      h('div.ol-join', codeIn, h('button.btn.primary', { nav: true, onclick: join }, 'ENTRAR')),
      joinErr);

    // ---- desafiar amigos
    const friendsBox = h('div.ol-friends', loading('Cargando amigos…'));
    const challengeCard = h('div.card.ol-card', { style: { '--accent': '#FF5FA2' } },
      h('div.ol-card-head', h('span.ol-ico', icon('bolt')), h('div', h('h3', 'DESAFIAR A UN AMIGO'), h('p.muted', 'Le llega el desafío al instante si tiene DUEL CLUB abierto. Usa las opciones de la sala.'))),
      friendsBox);

    const inboxBox = h('div.ol-inbox');
    body.replaceChildren(inboxBox, h('div.ol-grid', findCard, roomCard, challengeCard),
      h('p.ol-note', icon('bolt'), ' La conexión es directa entre las dos compus (lo más rápido). Si alguna red no lo permite, la partida pasa por el servidor. Si alguien abandona o se desconecta, pierde la ronda en curso y la serie.'));
    ui.focusFirst();

    svc.friends(slotOf(app, user)).then((f) => {
      if (scr.disposed) return;
      const list = [...f.friends].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
      friendsBox.replaceChildren(list.length
        ? h('div.ol-flist', list.slice(0, 30).map((a) => h('div.ol-friend',
          avatar(ui, scr, lookOf(a), 40),
          h('div.ol-friend-main', h('b', a.name, a.online ? h('span.dot-online', { title: 'En línea' }) : null), h('small', a.online ? 'En línea' : `Activo ${timeAgo(a.last_seen)}`)),
          h('button.btn.small' + (a.online ? '.primary' : ''), { nav: true, onclick: () => challengeFriend(ui, user, a, { ...cfg }) }, icon('bolt'), 'DESAFIAR'))))
        : empty('Todavía no tenés amigos. Agregalos desde el CLUB.', 'heart'));
    }).catch((e) => { if (!scr.disposed) friendsBox.replaceChildren(errorBox(errorText(e))); });

    call(app, user, 'dc_online_inbox').then((list) => {
      if (scr.disposed || !list?.length) return;
      inboxBox.replaceChildren(...list.map((c) => challengeRow(ui, user, c, render)));
    }).catch(() => {});
  }

  scr.el = h('div.page.online-page',
    header(ui, 'JUGAR ONLINE', 'Cada uno desde su compu · cuenta para SUSI, KEKE y PIES', back,
      whoSlot),
    body);
  render();
  if (params.code && CODE_RE.test(params.code)) setTimeout(() => body.querySelector('.ol-join .btn')?.focus(), 50);
  scr.onBack = back;
  return scr;
}

function challengeRow(ui, user, c, after) {
  const app = ui.app;
  const g = c.game !== 'random' ? GAME_BY_ID[c.game]?.meta?.name : 'minijuegos al azar';
  return h('div.ol-challenge',
    avatar(ui, {}, lookOf(c.from), 44),
    h('div.grow', h('b', `${c.from?.name} te desafía${c.rematch ? ' (revancha)' : ''}`), h('small', `${c.best_of > 1 ? 'Mejor de ' + c.best_of : 'Partida única'} · ${g}${c.caos ? ' · CAOS' : ''}`)),
    h('button.btn.small.ghost', { nav: true, onclick: async () => { await call(app, user, 'dc_online_decline', { p_match: c.id }).catch(() => {}); after?.(); } }, 'RECHAZAR'),
    h('button.btn.small.green', { nav: true, onclick: () => acceptChallenge(app, user, c) }, 'ACEPTAR'));
}

async function acceptChallenge(app, user, c) {
  try {
    const v = await call(app, user, 'dc_online_join', { p_code: c.code });
    app.audio.play('confirm');
    runOnline(app, user, v);
  } catch (e) {
    app.ui.toast({ kind: 'warn', title: 'No se pudo aceptar', text: errorText(e) });
  }
}

// ===================================================================================== ESPERAS
/** Buscar rival: se pregunta al servidor cada 2 s hasta que aparezca alguien. */
export function startSearch(ui, user) {
  const app = ui.app;
  let stopped = false;
  let timer = null;
  const t0 = performance.now();
  const clock = h('b.ol-clock', '0:00');
  const info = h('small.muted', 'Buscando jugadores con SUSI parecido…');
  const err = h('p.acc-error');
  const tick = setInterval(() => {
    const s = Math.floor((performance.now() - t0) / 1000);
    clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 250);
  const stop = async (cancel) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    clearInterval(tick);
    close();
    if (cancel) await call(app, user, 'dc_online_cancel').catch(() => {});
  };
  const close = ui.modal((u) => ({
    el: h('div.dialog.ol-wait',
      h('div.ol-radar', h('span'), h('span'), h('span'), icon('duel')),
      h('h2', 'BUSCANDO RIVAL'), clock, info, err,
      h('div.dialog-actions', h('button.btn.ghost', { nav: true, 'data-autofocus': true, onclick: () => stop(true) }, 'CANCELAR'))),
    onBack: () => stop(true),
  }));
  const poll = async () => {
    if (stopped) return;
    try {
      const v = await call(app, user, 'dc_online_find');
      err.textContent = '';
      if (v?.id && v.status === 'playing') {
        await stop(false);
        app.audio.play('powerup');
        runOnline(app, user, v);
        return;
      }
      const n = Math.max(0, (v?.queue || 1) - 1);
      info.textContent = n ? `${n} jugador${n > 1 ? 'es' : ''} más buscando ahora` : 'Por ahora no hay nadie más buscando. Seguimos esperando…';
    } catch (e) {
      err.textContent = errorText(e);
    }
    timer = setTimeout(poll, 2000);
  };
  poll();
}

/** Crear sala (o desafío): muestra el código y espera a que entre el amigo. */
export async function createRoom(ui, user, opts, friend = null) {
  const app = ui.app;
  let v;
  try {
    v = friend
      ? await call(app, user, 'dc_online_challenge', { p_username: friend.username, p_opts: opts })
      : await call(app, user, 'dc_online_room', { p_opts: opts });
  } catch (e) {
    ui.toast({ kind: 'warn', title: friend ? 'No se pudo desafiar' : 'No se pudo crear la sala', text: errorText(e) });
    return;
  }
  app.audio.play('confirm');
  waitRoom(ui, user, v, friend);
}
export function challengeFriend(ui, user, friend, opts) {
  return createRoom(ui, user, opts || { best_of: 3, game: 'random', caos: false }, friend);
}

function waitRoom(ui, user, view, friend = null, title = null) {
  const app = ui.app;
  let stopped = false;
  let timer = null;
  const link = shareLink(view.code);
  const status = h('p.muted', friend ? `Le avisamos a ${friend.name}. Esperando que acepte…` : 'Esperando que entre tu amigo…');
  const copy = async (txt, btn) => {
    try {
      await navigator.clipboard.writeText(txt);
      btn.textContent = '¡COPIADO!';
    } catch {
      btn.textContent = 'Copialo a mano';
    }
    setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600);
  };
  const stop = async (cancel) => {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    close();
    if (cancel) await call(app, user, 'dc_online_cancel').catch(() => {});
  };
  const btnCode = h('button.btn.small', { nav: true, dataset: { label: 'COPIAR CÓDIGO' }, onclick: (e) => copy(view.code, e.currentTarget) }, 'COPIAR CÓDIGO');
  const btnLink = h('button.btn.small', { nav: true, dataset: { label: 'COPIAR LINK' }, onclick: (e) => copy(link, e.currentTarget) }, 'COPIAR LINK');
  const opts = `${view.best_of > 1 ? 'Mejor de ' + view.best_of : 'Partida única'} · ${view.games.every((g) => g === view.games[0]) ? GAME_BY_ID[view.games[0]]?.meta.name : 'minijuegos al azar'}${view.caos ? ' · CAOS' : ''}`;
  const close = ui.modal(() => ({
    el: h('div.dialog.ol-wait.ol-room',
      h('small.ol-kicker', title || (friend ? `DESAFÍO A ${friend.name.toUpperCase()}` : 'SALA PRIVADA')),
      h('div.ol-bigcode', view.code),
      h('p.muted', opts),
      h('div.row.center', btnCode, btnLink),
      h('div.ol-radar.small', h('span'), h('span'), h('span'), icon('user')),
      status,
      h('div.dialog-actions', h('button.btn.ghost', { nav: true, 'data-autofocus': true, onclick: () => stop(true) }, 'CANCELAR'))),
    onBack: () => stop(true),
  }));
  const poll = async () => {
    if (stopped) return;
    try {
      const v = await call(app, user, 'dc_online_state', { p_match: view.id });
      if (v.status === 'playing') {
        await stop(false);
        app.audio.play('powerup');
        runOnline(app, user, v);
        return;
      }
      if (v.status === 'cancelled') {
        status.textContent = v.end_reason === 'declined' ? `${friend?.name || 'Tu amigo'} rechazó el desafío.` : 'La sala se cerró.';
        app.audio.play('error');
        setTimeout(() => stop(false), 2200);
        return;
      }
    } catch (e) {
      status.textContent = errorText(e);
    }
    timer = setTimeout(poll, 1500);
  };
  poll();
}

// ===================================================================================== DESAFÍOS ENTRANTES
/** Revisa cada pocos segundos si alguien desafió a una cuenta de esta compu y lo avisa. */
export function startChallengeWatcher(app) {
  const seen = new Set();
  let busy = false;
  const check = async () => {
    if (busy || document.hidden || app.online || app.runner.active || app.accounts.status !== 'online') return;
    busy = true;
    try {
      for (const { me } of localAccounts(app)) {
        const list = await call(app, me.username, 'dc_online_inbox').catch(() => []);
        for (const c of list || []) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          if (app.ui.modals.length || app.online || app.runner.active) continue;
          app.audio.play('unlock');
          incomingModal(app.ui, me.username, me.name, c);
          return;
        }
      }
    } finally {
      busy = false;
    }
  };
  setInterval(check, 6000);
  setTimeout(check, 2500);
}

function incomingModal(ui, user, myName, c) {
  const app = ui.app;
  const g = c.game !== 'random' ? GAME_BY_ID[c.game]?.meta?.name : 'minijuegos al azar';
  let close;
  const decline = async () => {
    close();
    await call(app, user, 'dc_online_decline', { p_match: c.id }).catch(() => {});
  };
  close = ui.modal(() => ({
    el: h('div.dialog.ol-incoming',
      h('small.ol-kicker', `DESAFÍO ONLINE PARA ${myName.toUpperCase()}`),
      h('div.row.center', avatar(ui, {}, lookOf(c.from), 72)),
      h('h2', `${c.from?.name} te desafía${c.rematch ? ' a la revancha' : ''}`),
      h('p.muted', `${c.best_of > 1 ? 'Mejor de ' + c.best_of : 'Partida única'} · ${g}${c.caos ? ' · CAOS' : ''} · SUSI ${c.from?.rating ?? ''}`),
      h('div.dialog-actions',
        h('button.btn.ghost', { nav: true, onclick: decline }, 'RECHAZAR'),
        h('button.btn.green', { nav: true, 'data-autofocus': true, onclick: () => { close(); acceptChallenge(app, user, c); } }, icon('play'), 'ACEPTAR'))),
    onBack: () => close(),
  }));
}

// ===================================================================================== PARTIDA
/** Juega una serie online completa. */
export async function runOnline(app, user, view) {
  const ui = app.ui;
  if (app.online) app.online.close();
  ui.closeAllModals();
  const match = (app.online = new OnlineMatch(app, { user, view }));
  match.start();
  const applied = new Set();
  const applyOut = (r) => {
    const out = match.outFor(r);
    if (!out || applied.has(r)) return;
    applied.add(r);
    app.accounts.applyOnlineOut(out, r >= 0 ? match.view.games[r] : null);
  };
  let rematchView = null;
  try {
    app.audio.playMusic('menu');
    const go = await ui.ask(lobbyScreen, { match });
    match.fast = false;
    if (go === 'leave') await match.leave();
    let leaving = false;
    const hooks = {
      showIntro: (round, ready) => ui.show(roundIntroScreen, { match, round, ready, onLeave: () => askLeave() }),
      onEscape: () => askLeave(),
      overlay: (g, runner, round) => drawNetOverlay(g, match, round, runner),
    };
    async function askLeave() {
      if (leaving) return;
      leaving = true;
      const ok = await ui.confirm({ title: '¿Abandonar la partida online?', text: 'Perdés la ronda en curso y la serie (cuenta para SUSI).', yes: 'Abandonar', no: 'Seguir jugando' });
      leaving = false;
      if (ok) await match.leave();
    }
    while (match.view.status === 'playing' && !match.lost) {
      const r = match.view.round;
      const out = await match.playRound(r, hooks);
      if (out.reason === 'gone') break;
      if (out.reason === 'cancelled' && match.view.status !== 'playing') break;
      const reported = match.report(r, out);
      if (out.reason === 'done' && out.result) {
        const action = await ui.ask(resultsScreen, { session: null, res: out.result, rec: null, info: { online: resultsHooks(ui, match, r, reported, applyOut, out.result.winner) } });
        app.runner.close();
        if (action === 'leave') await match.leave();
      } else {
        app.runner.close();
        await ui.ask(voidScreen, { match, r, reason: out.reason });
      }
      await match.waitResolved(r, 8000);
      applyOut(r);
    }
    if (app.runner.active) app.runner.close();
    // esperar a que el servidor cierre la serie (recompensas finales)
    const t0 = performance.now();
    while (match.view.status === 'playing' && performance.now() - t0 < 6000) await new Promise((res) => setTimeout(res, 300));
    for (const k of Object.keys(match.view.outs || {})) applyOut(Number(k));
    app.audio.playMusic('champion');
    const action = await ui.ask(finalScreen, { match, applyOut });
    if (action?.rematch) rematchView = action.rematch;
  } catch (e) {
    console.error('DUEL CLUB online', e);
    ui.toast({ kind: 'warn', title: 'Partida online', text: 'Algo falló en la partida online. Volvés al menú.' });
  } finally {
    match.round?.dispose();
    if (app.runner.active) app.runner.close();
    match.close();
    if (app.online === match) app.online = null;
  }
  if (rematchView) return runOnline(app, user, rematchView);
  app.audio.playMusic('menu');
  ui.show(onlineScreen);
}

// ---------------------------------------------------------------------------------- lobby
function lobbyScreen(ui, { match, done }) {
  const app = ui.app;
  const scr = {};
  const t0 = performance.now();
  const v = match.view;
  const status = h('div.ol-link');
  const actions = h('div.dialog-actions');
  const games = v.games.every((g) => g === v.games[0]) ? GAME_BY_ID[v.games[0]]?.meta.name : 'Minijuegos al azar';
  let finished = false;
  const finish = (x) => {
    if (finished) return;
    finished = true;
    clearInterval(iv);
    unsub();
    done(x);
  };
  const leaveBtn = h('button.btn.ghost', { nav: true, onclick: async () => { if (await ui.confirm({ title: '¿Salir de la partida?', text: 'Si ya empezó la serie, cuenta como abandono.', yes: 'Salir', no: 'Quedarme' })) finish('leave'); } }, 'SALIR');
  actions.append(leaveBtn);
  let connectedAt = null;
  const update = () => {
    if (scr.disposed) return;
    if (match.view.status !== 'playing') return finish('gone');
    const mode = match.linkMode;
    const ping = match.ping;
    if (mode === 'p2p' || mode === 'relay') {
      connectedAt ??= performance.now();
      // si primero conecta el respaldo por el servidor, se esperan unos segundos a la conexión directa (menos retardo)
      const link = match.link;
      const directPending = mode === 'relay' && link?.pc && !link.p2pFailed;
      put(status, h('span.ol-led.on'), h('b', mode === 'p2p' ? 'CONEXIÓN DIRECTA' : 'CONECTADOS POR EL SERVIDOR'), ping != null ? h('span.muted', ` · ${ping} ms`) : null,
        directPending ? h('span.muted', ' · buscando conexión directa…') : null);
      const wait = directPending ? 7000 : 1600;
      if (performance.now() - connectedAt > wait && performance.now() - t0 > 3200 && (ping != null || performance.now() - connectedAt > 4000)) finish('go');
    } else {
      const secs = (performance.now() - t0) / 1000;
      put(status, h('span.ol-led'), h('b', 'CONECTANDO CON ' + (match.opp?.name || 'EL RIVAL').toUpperCase() + '…'),
        secs > 20 ? h('span.muted', ' · está tardando más de lo normal') : null);
    }
  };
  const iv = setInterval(update, 200);
  const unsub = match.on(update);
  scr.el = h('div.ol-lobby',
    h('div.ol-kicker', `${v.kind === 'ranked' ? 'PARTIDA POR SUSI' : v.kind === 'challenge' ? 'DESAFÍO ONLINE' : 'SALA ' + v.code} · ${v.best_of > 1 ? 'MEJOR DE ' + v.best_of : 'PARTIDA ÚNICA'} · ${games}${v.caos ? ' · CAOS' : ''}`),
    h('div.ol-vs',
      h('div.ol-side' + (match.slot === 0 ? '.me' : ''), profileCard(ui, scr, v.players[0], { compact: true }), h('span.ol-tag', match.slot === 0 ? 'VOS · J1' : 'RIVAL · J1')),
      h('div.ol-vs-mid', 'VS'),
      h('div.ol-side' + (match.slot === 1 ? '.me' : ''), profileCard(ui, scr, v.players[1], { compact: true }), h('span.ol-tag', match.slot === 1 ? 'VOS · J2' : 'RIVAL · J2'))),
    status,
    h('p.muted.ol-tip', 'Jugás con tus teclas de siempre (', keycap('KeyW'), keycap('KeyA'), keycap('KeyS'), keycap('KeyD'), ' + ', keycap('KeyF'), keycap('KeyG'), ' o flechas + ', keycap('Enter'), keycap('ShiftRight'), '). No hay pausa: ', keycap('Escape'), ' sirve para abandonar.'),
    actions);
  scr.onBack = () => leaveBtn.click();
  app.audio.play('whoosh');
  update();
  return scr;
}

// ---------------------------------------------------------------------------------- presentación de la ronda
function roundIntroScreen(ui, { match, round, ready, onLeave }) {
  const app = ui.app;
  const scr = {};
  const v = match.view;
  const gid = v.games[round.r];
  const meta = GAME_BY_ID[gid].meta;
  const me = match.players[match.slot];
  const opp = match.players[1 - match.slot];
  const AUTO = 15;
  const t0 = performance.now();
  let isReady = false;
  const myChip = h('div.ready-chip', 'Pulsá ', keycap('KeyF'), ' o ', keycap('Enter'), ' cuando estés listo');
  const oppChip = h('div.ready-chip', `Esperando a ${opp.name}…`);
  const setReady = () => {
    if (isReady) return;
    isReady = true;
    myChip.classList.add('on');
    myChip.textContent = '¡LISTO!';
    app.audio.play('ready');
    ready();
  };
  const iv = setInterval(() => {
    if (scr.disposed) return clearInterval(iv);
    if (round.remoteReady && !oppChip.classList.contains('on')) {
      oppChip.classList.add('on');
      oppChip.textContent = `¡${opp.name} está listo!`;
    }
    const left = Math.ceil(AUTO - (performance.now() - t0) / 1000);
    if (!isReady) {
      if (left <= 0) setReady();
      startBtn.textContent = `¡LISTO! (${Math.max(0, left)})`;
    } else startBtn.textContent = round.remoteReady ? '¡VAMOS!' : 'ESPERANDO AL RIVAL…';
  }, 200);
  const startBtn = h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: setReady }, '¡LISTO!');
  const wins = v.wins || [0, 0];
  scr.el = h('div.intro.ol-intro', { style: { '--c': meta.color } },
    h('div.intro-card',
      h('div.intro-info',
        h('div.intro-top', gameIcon(ui, scr, meta, 120),
          h('div', h('div.intro-kicker', `ONLINE · RONDA ${v.played + 1}${v.best_of > 1 ? ' · MEJOR DE ' + v.best_of : ''} · ${wins[match.slot]}–${wins[1 - match.slot]}`), h('h1.intro-title', meta.name), h('div.muted', meta.tagline))),
        h('p.intro-desc', meta.description),
        h('div.intro-goal', icon('trophy'), h('span', meta.goal))),
      h('div.intro-controls',
        h('div.ctrl-box', { style: { '--c': me.color } },
          h('div.ctrl-head', h('b', 'VOS · ' + me.name), h('small', `J${match.slot + 1} · ${match.slot === 0 ? 'IZQUIERDA' : 'DERECHA'}`)),
          ...meta.controls.map((c) => h('div.ctrl-row', h('span', c.label), h('span.keys', ...c.actions.map((a) => keycap(app.input.bindings[0][a][0])), h('em', ' o '), ...c.actions.map((a) => keycap(app.input.bindings[1][a][0]))))),
          myChip),
        h('div.ctrl-box.opp', { style: { '--c': opp.color } },
          h('div.ctrl-head', h('b', opp.name), h('small', `RIVAL · J${2 - match.slot}`)),
          h('p.muted', { style: { margin: '6px 0' } }, 'Juega desde su compu.'),
          oppChip)),
      h('div.intro-actions',
        h('button.btn.ghost', { nav: true, onclick: onLeave }, icon('back'), 'ABANDONAR'),
        h('span.tip', 'Sin pausa en online · arranca solo en ', AUTO, ' s'),
        startBtn)));
  scr.nav = false;
  scr.onKey = (e) => {
    if (e.repeat) return true;
    if (e.code === 'Escape') { onLeave(); return true; }
    if (e.player >= 0 && e.action === 'a') { setReady(); return true; }
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { setReady(); return true; }
    return e.player >= 0;
  };
  app.audio.playMusic('menu');
  return scr;
}

// ---------------------------------------------------------------------------------- resultados de la ronda
function resultsHooks(ui, match, r, reported, applyOut, winner) {
  const me = match.slot;
  const opp = 1 - me;
  const statusLine = h('div.ol-confirm', h('span.ol-led'), 'Confirmando el resultado con el servidor…');
  const seriesBox = h('div.ol-series');
  const board = h('div.board.ol-board', seriesBox, statusLine);
  let countdown = null;
  let contBtn = null;
  const renderSeries = () => {
    const v = match.view;
    const rounds = (v.rounds || []).filter((x) => !x.void);
    const wins = v.wins || [0, 0];
    const pl = match.players;
    const dots = h('div.dots', ...Array.from({ length: Math.max(v.best_of, rounds.length) }, (_, i) => {
      const x = rounds[i];
      const d = h('span.dot');
      if (x) d.style.background = x.winner >= 0 ? pl[x.winner].color : '#8C96B8';
      return d;
    }));
    seriesBox.replaceChildren(
      h('div.board-side', pl[0].name, h('div.board-pts', String(wins[0]))),
      h('div.board-center', h('b', v.best_of > 1 ? `SERIE · MEJOR DE ${v.best_of}` : 'PARTIDA ÚNICA'), dots),
      h('div.board-side.right', pl[1].name, h('div.board-pts', String(wins[1]))));
  };
  renderSeries();
  return {
    kicker: `ONLINE · RONDA ${match.view.played + 1}`,
    banner: winner === me ? '¡GANASTE!' : winner === -1 ? '¡EMPATE!' : `¡GANA ${match.players[1 - me].name.toUpperCase()}!`,
    board,
    next: null,
    actions: (choose) => {
      contBtn = h('button.btn.primary.big', { nav: true, 'data-autofocus': true, disabled: true, onclick: () => choose('continue') }, icon('play'), 'CONTINUAR');
      const leave = h('button.btn.ghost', { nav: true, onclick: async () => { if (await ui.confirm({ title: '¿Abandonar la serie?', text: 'Perdés la serie (cuenta para SUSI).', yes: 'Abandonar', no: 'Seguir' })) choose('leave'); } }, 'ABANDONAR');
      const el = h('div.res-actions', leave, contBtn);
      const created = performance.now();
      // continuar solo cuando el servidor confirmó; después arranca solo
      const iv = setInterval(() => {
        if (!el.isConnected && performance.now() - created > 1500) return clearInterval(iv);
        const v = match.view;
        const resolved = v.round > r || v.status !== 'playing';
        if (!resolved) return;
        contBtn.disabled = false;
        if (countdown == null) countdown = performance.now();
        const left = Math.ceil(8 - (performance.now() - countdown) / 1000);
        const last = v.status !== 'playing';
        contBtn.replaceChildren(icon('play'), last ? `VER RESULTADO (${Math.max(0, left)})` : `SIGUIENTE (${Math.max(0, left)})`);
        if (left <= 0) {
          clearInterval(iv);
          choose('continue');
        }
      }, 250);
      return el;
    },
    rewards: (set, scr) => {
      set(opp, [h('span.res-reward.wait', 'Esperando…')]);
      set(me, [h('span.res-reward.wait', 'Guardando…')]);
      reported.then((ok) => { if (!ok && !scr.disposed) statusLine.replaceChildren(h('span.ol-led.bad'), 'No se pudo enviar el resultado (reintentando con el estado del servidor).'); });
      const update = () => {
        if (scr.disposed) return unsub();
        renderSeries();
        const info = match.roundInfo(r);
        if (!info) return;
        if (info.void) {
          statusLine.replaceChildren(h('span.ol-led.bad'), 'Ronda anulada: las dos compus no vieron el mismo resultado. Se juega otra.');
          set(me, [h('span.res-reward.wait', 'Ronda anulada')]);
          set(opp, [h('span.res-reward.wait', 'Ronda anulada')]);
          return;
        }
        statusLine.replaceChildren(h('span.ol-led.on'), info.single ? 'Resultado confirmado (tu rival no respondió a tiempo).' : 'Resultado confirmado por las dos compus.');
        const d = info.d || [0, 0];
        const out = match.outFor(r);
        if (out) applyOut(r);
        set(me, out ? [
          h('span.res-reward.keke', `+${fmtN(out.keke)} KEKE`),
          out.pies ? h('span.res-reward.pies', `+${fmtN(out.pies)} PIES`) : null,
          d[me] ? h('span.res-reward' + (d[me] > 0 ? '.up' : '.down'), `${d[me] > 0 ? '+' : ''}${d[me]} SUSI`) : null,
          out.record ? h('span.res-reward.pies', '★ RÉCORD MUNDIAL') : null,
          out.factor < 1 ? h('span.res-reward.wait', out.factor === 0 ? 'Límite diario alcanzado' : 'Recompensa reducida (muchas partidas hoy)') : null,
        ] : [h('span.res-reward.wait', 'Guardando…')]);
        set(opp, [d[opp] ? h('span.res-reward' + (d[opp] > 0 ? '.up' : '.down'), `${d[opp] > 0 ? '+' : ''}${d[opp]} SUSI`) : h('span.res-reward.wait', 'Sin cambio de SUSI')]);
      };
      const unsub = match.on(update);
      update();
    },
  };
}

function voidScreen(ui, { match, r, reason, done }) {
  const scr = {};
  const why = reason === 'desync' ? 'Las dos compus dejaron de ver exactamente lo mismo.'
    : reason === 'stall' ? 'Se cortó la comunicación con tu rival durante la ronda.'
      : reason === 'error' ? 'El minijuego tuvo un error.'
        : 'La ronda no se pudo completar.';
  const msg = h('p.muted', 'Esperando al servidor…');
  scr.el = h('div.page.ol-void', h('div.card.ol-need', h('div.ol-need-ico', icon('bolt')), h('h3', 'RONDA ANULADA'), h('p', why), h('p.muted', 'No cuenta para nadie: se juega otra ronda.'), msg));
  match.waitResolved(r, 45000).then(() => {
    if (scr.disposed) return;
    msg.textContent = match.view.status === 'playing' ? 'Seguimos…' : 'La serie terminó.';
    setTimeout(() => done(), 1400);
  });
  scr.onBack = () => {};
  ui.app.audio.play('error');
  return scr;
}

// ---------------------------------------------------------------------------------- final de la serie
function finalScreen(ui, { match, applyOut, done }) {
  const app = ui.app;
  const scr = {};
  const me = match.slot;
  const pl = match.players;
  const body = h('div.ol-final-body');
  const actions = h('div.res-actions');
  let busy = false;
  let waiting = null;
  const render = () => {
    if (scr.disposed) return;
    const v = match.view;
    const wins = v.wins || [0, 0];
    const w = v.winner;
    const abandon = v.end_reason === 'abandon' || v.end_reason === 'left';
    const iLeft = abandon && w === 1 - me;
    const serie = v.best_of > 1;
    const banner = v.status === 'playing' ? 'CERRANDO LA SERIE…' : v.status === 'cancelled' ? 'PARTIDA CANCELADA'
      : w === me ? (abandon ? '¡TU RIVAL ABANDONÓ!' : serie ? '¡GANASTE LA SERIE!' : '¡GANASTE!')
        : w === -1 ? (serie ? 'SERIE EMPATADA' : 'EMPATE')
          : iLeft ? 'ABANDONASTE' : serie ? 'PERDISTE LA SERIE' : 'PERDISTE';
    const myD = (v.rounds || []).reduce((s, x) => s + (x.d?.[me] || 0), 0);
    const comp = match.outFor(-1);
    if (comp) applyOut(-1);
    const rows = (v.rounds || []).map((x) => h('div.ol-round' + (x.void ? '.void' : ''),
      gameChip(x.game),
      x.void ? h('span.muted', 'Anulada') : h('b', x.winner === -1 ? 'Empate' : x.winner === me ? 'Ganaste' : `Ganó ${pl[x.winner].name}`),
      x.void || x.forfeit ? h('span.muted', x.forfeit ? 'abandono' : '') : h('span', x.display ? `${x.display[me]} – ${x.display[1 - me]}` : ''),
      x.d?.[me] ? h('span.mrow-delta' + (x.d[me] > 0 ? '.up' : '.down'), `${x.d[me] > 0 ? '+' : ''}${x.d[me]}`) : h('span.mrow-delta', '—')));
    put(body,
      h('div.res-kicker', `ONLINE · ${v.best_of > 1 ? 'MEJOR DE ' + v.best_of : 'PARTIDA ÚNICA'}`),
      h('div.res-banner', banner),
      h('div.ol-final-score',
        h('div.ol-fs-side', { style: { '--c': pl[me].color } }, h('small', 'VOS'), h('b', pl[me].name), h('div.ol-fs-n', String(wins[me]))),
        h('span.ol-fs-dash', '–'),
        h('div.ol-fs-side', { style: { '--c': pl[1 - me].color } }, h('small', 'RIVAL'), h('b', pl[1 - me].name), h('div.ol-fs-n', String(wins[1 - me])))),
      h('div.ol-final-rew',
        myD ? h('span.res-reward' + (myD > 0 ? '.up' : '.down'), `${myD > 0 ? '+' : ''}${myD} SUSI en la serie`) : h('span.res-reward.wait', 'SUSI sin cambios'),
        comp ? h('span.res-reward.keke', `+${fmtN(comp.keke)} KEKE por la serie`) : null,
        comp?.pies ? h('span.res-reward.pies', `+${fmtN(comp.pies)} PIES por la serie`) : null),
      rows.length ? h('div.ol-rounds', ...rows) : null);
    // revancha
    const rm = v.rematch;
    const canRematch = v.status === 'finished' && v.players[1];
    put(actions,
      h('button.btn.ghost', { nav: true, onclick: () => { cancelWaiting(); done(null); } }, 'VOLVER'),
      canRematch ? (waiting
        ? h('button.btn', { nav: true, onclick: () => cancelWaiting(true) }, `ESPERANDO A ${pl[1 - me].name.toUpperCase()}… (CANCELAR)`)
        : h('button.btn.primary.big' + (rm && !rm.mine ? '.pulse' : ''), { nav: true, 'data-autofocus': true, onclick: rematch }, icon('play'), rm && !rm.mine ? `¡${pl[1 - me].name.toUpperCase()} QUIERE REVANCHA!` : 'REVANCHA'))
        : null);
  };
  async function rematch() {
    if (busy) return;
    busy = true;
    try {
      const nv = await match.call('dc_online_rematch', { p_match: match.view.id });
      if (nv.status === 'playing') return done({ rematch: nv });
      waiting = nv;
      render();
      pollNew();
    } catch (e) {
      ui.toast({ kind: 'warn', title: 'Revancha', text: errorText(e) });
    } finally {
      busy = false;
    }
  }
  let pollT = null;
  async function pollNew() {
    if (!waiting || scr.disposed) return;
    try {
      const nv = await match.call('dc_online_state', { p_match: waiting.id });
      if (nv.status === 'playing') return done({ rematch: nv });
      if (nv.status !== 'waiting') { waiting = null; render(); return; }
    } catch {}
    pollT = setTimeout(pollNew, 1500);
  }
  function cancelWaiting(rerender = false) {
    clearTimeout(pollT);
    if (waiting) match.call('dc_online_cancel').catch(() => {});
    waiting = null;
    if (rerender) render();
  }
  const unsub = match.on(() => { if (scr.disposed) unsub(); else render(); });
  scr.el = h('div.results.ol-final', { style: { '--c': match.view.winner >= 0 ? pl[match.view.winner].color : '#9B6CFF' } }, body, h('div.res-footer', h('div'), actions));
  render();
  scr.onBack = () => { cancelWaiting(); done(null); };
  const w = match.view.winner;
  app.audio.play(w === me ? 'win' : w === -1 ? 'draw' : 'lose');
  if (w === me) setTimeout(() => !scr.disposed && app.renderer.overlayFx.confetti(640, 300, 90, 1.2), 250);
  return scr;
}

// ---------------------------------------------------------------------------------- dibujo sobre el juego
function drawNetOverlay(g, match, round, runner) {
  const me = match.players[match.slot];
  const opp = match.players[1 - match.slot];
  const left = match.slot === 0;
  const ping = match.ping;
  const mode = match.linkMode;
  // quién sos: grande durante la cuenta regresiva, chico después
  if (runner.state === 'countdown') {
    const x = left ? 250 : W - 250;
    const a = Math.min(1, runner.cd * 3);
    panel(g, x - 110, H - 150, 220, 56, { r: 28, fill: rgba(me.color, 0.85 * a), stroke: '#fff', glow: me.color });
    text(g, left ? '◀ VOS · J1' : 'VOS · J2 ▶', x, H - 122, { size: 26, color: '#fff', alpha: a });
  }
  const pc = ping == null ? '#8C96B8' : ping < 90 ? '#48D597' : ping < 170 ? '#FFC93C' : '#FF654F';
  const label = `VOS · ${ping == null ? '…' : ping + ' ms'}${mode === 'relay' ? ' · SERVIDOR' : ''}`;
  const bx = left ? 14 : W - 14 - 190;
  panel(g, bx, H - 36, 190, 26, { r: 13, fill: 'rgba(11,16,32,0.72)', stroke: rgba(me.color, 0.9) });
  g.save();
  g.fillStyle = pc;
  g.beginPath();
  g.arc(bx + 16, H - 23, 5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  text(g, label, bx + 104, H - 23, { size: 12, body: true, weight: 800, color: '#fff' });
  if (round?.waiting) {
    const s = round.stall;
    panel(g, W / 2 - 230, 120, 460, 64, { r: 24, fill: 'rgba(11,16,32,0.88)', stroke: '#FFC93C' });
    text(g, `Esperando a ${opp.name}…`, W / 2, 144, { size: 22, color: '#fff' });
    text(g, s > 6 ? `Su conexión no responde (${Math.floor(s)} s). Si se desconectó, ganás por abandono.` : 'Conexión lenta', W / 2, 168, { size: 13, body: true, color: '#FFE3A0' });
  }
}

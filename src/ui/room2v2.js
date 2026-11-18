// 2v2 FLEXIBLE: elección de modalidad y lugar, sala con los 4 lugares, cuentas locales, bots, búsqueda y partida.
// Flujo: 2v2 → AMISTOSO / COMPETITIVO → En esta compu / Sala privada online / Entrar con código / Buscar partida
//        → sala (4 lugares por equipo, quién es cada uno y desde qué compu) → minijuego → confirmar → jugar.
import { h, icon } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { avatar, loading, fmtN } from './kit.js';
import { GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS, BOT_ORDER } from '../core/bots.js';
import { rpc } from '../net/api.js';
import { errorText } from '../net/api.js';
import { RoomSession, devKey, roomPlayers } from '../net/room.js';
import { mountMatchChat } from './matchChat.js';
import { teamSetupScreen, TEAM_GAMES } from './teamSetup.js';
import { keyName } from '../core/inputManager.js';
const keyNameShort = (c) => ({ ShiftRight: 'SHIFT', NumpadEnter: 'ENTER' }[c] || keyName(c));

const TEAM_NAME = ['EQUIPO AZUL', 'EQUIPO ROJO'];
/** replaceChildren sin los null (el navegador los escribiría como texto "null"). */
const put = (el, ...kids) => el.replaceChildren(...kids.flat().filter((x) => x != null && x !== false));
const MODE_TXT = {
  friendly: ['AMISTOSO', 'Esta partida no modifica tu ELO.', 'Para jugar con amigos y probar minijuegos. Se puede con bots e invitados.'],
  competitive: ['COMPETITIVO', 'Esta partida modificará tu ELO 2v2.', 'Cuatro personas con su cuenta, sin bots. Cambia el ELO 2v2 (separado del 1v1) y suma al ranking 2v2.'],
};
const STATUS_TXT = { new_accounts: 'No cambió el ELO: hay cuentas creadas hace menos de 24 horas.', limit: 'No cambió el ELO: este mismo grupo ya jugó 5 partidas competitivas hoy.', disputed: 'No cambió el ELO: las compus informaron resultados distintos.', void: 'La ronda no contó (corte o desincronización). No cambió el ELO de nadie.' };

/** ¿El servidor todavía no tiene las salas 2v2 instaladas? (la función no existe) */
const missingRpc = (e) => /could not find the function|does not exist|PGRST202/i.test(`${e?.message || ''} ${e?.detail || ''}`) || e?.code === 'PGRST202';
function notReady(ui) {
  ui.toast({ kind: 'warn', title: '2v2 online: casi listo', text: 'Las salas online se están activando en el servidor. Mientras tanto podés jugar 2v2 en esta compu.' });
  ui.show(teamSetupScreen);
}

/** Cuenta que conecta esta compu a la sala (J1 si tiene sesión; si no, cualquier sesión guardada). */
function deviceUser(app) {
  const s = app.accounts;
  return s.slotUser(0) || s.slotUser(1) || Object.keys(s.sessions || {})[0] || null;
}

// ------------------------------------------------------------------ pantalla de entrada
export function twoVTwoScreen(ui, params = {}) {
  const app = ui.app;
  const scr = {};
  let mode = params.mode || app.save.mode2v2 || 'friendly';
  const body = h('div.v2-body');
  const back = () => app.ui.goMenu();
  function render() {
    const user = deviceUser(app);
    const card = (id, ic, title, text, on) => h('button.v2-card' + (on ? '.on' : ''), { nav: true, onclick: () => { mode = id; app.save.mode2v2 = id; app.persist(); app.audio.play('click'); render(); } },
      h('span.v2-ic', icon(ic)), h('b', title), h('p', text), h('small', MODE_TXT[id][1]));
    const where = (ic, title, text, fn, disabled = false, why = '') => h('button.v2-where', { nav: true, disabled, title: why, onclick: fn }, h('span.v2-ic', icon(ic)), h('div', h('b', title), h('p', disabled && why ? why : text)));
    const codeIn = h('input.acc-input.v2-code', { type: 'text', maxlength: 6, placeholder: 'CÓDIGO', nav: true, 'aria-label': 'Código de sala', oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); } });
    const needAcc = !user ? 'Necesitás iniciar sesión con una cuenta (J1) para usar salas.' : '';
    put(body,
      h('div.v2-step', h('h3', '1 · MODALIDAD'), h('div.v2-modes',
        card('friendly', 'heart', 'AMISTOSO', MODE_TXT.friendly[2], mode === 'friendly'),
        card('competitive', 'trophy', 'COMPETITIVO', MODE_TXT.competitive[2], mode === 'competitive'))),
      h('div.v2-step', h('h3', '2 · DÓNDE JUEGAN'), h('div.v2-wheres',
        where('play', 'EN ESTA COMPU', 'Hasta 4 jugadores en el mismo teclado (o con joysticks), cada uno con su cuenta.', () => openRoom('local'), !user && mode === 'competitive', needAcc),
        where('bolt', 'SALA PRIVADA ONLINE', 'Creá una sala y pasá el código. Se puede mezclar: jugadores en esta compu, en otras compus y bots.', () => openRoom('private'), !user, needAcc),
        h('div.v2-where.code', h('span.v2-ic', icon('user')), h('div', h('b', 'ENTRAR CON CÓDIGO'), h('form.v2-join', { onsubmit: (e) => { e.preventDefault(); join(codeIn.value); } }, codeIn, h('button.btn.small.primary', { nav: true, type: 'submit', disabled: !user }, 'ENTRAR')), needAcc ? h('p', needAcc) : null)),
        mode === 'competitive' ? where('records', 'BUSCAR PARTIDA', 'Te emparejamos con rivales de ELO 2v2 parecido. Podés buscar solo o con un compañero en esta compu.', () => openRoom('search'), !user, needAcc) : null)),
      !user && mode === 'friendly' ? h('p.v2-note', 'Sin cuenta podés jugar igual en esta compu: ', h('button.linkbtn', { nav: true, onclick: () => ui.show(teamSetupScreen) }, 'abrir el 2v2 rápido sin cuentas'), '.') : null);
  }
  async function openRoom(kind) {
    const user = deviceUser(app);
    if (!user) {
      if (mode === 'friendly' && kind === 'local') return ui.show(teamSetupScreen);
      ui.toast({ kind: 'warn', title: 'Falta una cuenta', text: 'Iniciá sesión con J1 para usar salas.' });
      return;
    }
    body.replaceChildren(loading('Creando la sala…'));
    try {
      const v = await rpc('dc_room_create', { p_token: app.accounts.tokenOf(user), p_dev: devKey(), p_mode: mode });
      const ses = new RoomSession(app, { user, view: v });
      // la cuenta que conecta la compu ocupa el primer lugar azul (y J2, si tiene sesión, el segundo azul en local/búsqueda)
      await ses.call('dc_room_slot', { p_slot: 0, p_action: 'take', p_acc_token: app.accounts.tokenOf(user) }).then((x) => ses.setView(x)).catch(() => {});
      const u2 = app.accounts.slotUser(1);
      if (u2 && u2 !== user && kind !== 'private') await ses.call('dc_room_slot', { p_slot: 2, p_action: 'take', p_acc_token: app.accounts.tokenOf(u2) }).then((x) => ses.setView(x)).catch(() => {});
      if (kind === 'search') await ses.call('dc_room_queue', { p_on: true }).then((x) => ses.setView(x)).catch((e) => ui.toast({ kind: 'warn', title: 'No se pudo buscar', text: errorText(e) }));
      enterRoom(app, ses, kind);
    } catch (e) {
      if (missingRpc(e)) return notReady(ui);
      ui.toast({ kind: 'warn', title: 'No se pudo crear la sala', text: errorText(e) });
      render();
    }
  }
  async function join(code) {
    const user = deviceUser(app);
    if (!user || !code || code.length < 4) return;
    try {
      const v = await rpc('dc_room_join', { p_token: app.accounts.tokenOf(user), p_code: code, p_dev: devKey() });
      enterRoom(app, new RoomSession(app, { user, view: v }), 'private');
    } catch (e) { if (missingRpc(e)) return notReady(ui); ui.toast({ kind: 'warn', title: 'No se pudo entrar', text: errorText(e) }); }
  }
  render();
  scr.el = h('div.screen.v2-page', header(ui, '2v2', 'Amistoso o competitivo · en una compu, en varias o mezclado', back), body);
  scr.onBack = back;
  return scr;
}

// ------------------------------------------------------------------ sala
/** Controla una sala: muestra el lobby, juega cada ronda que arranca el anfitrión y vuelve al lobby. */
export function enterRoom(app, ses, kind = 'private') {
  const ui = app.ui;
  let playing = 0;
  let chat = null;
  const showLobby = () => { if (!ses.closed) ui.show(roomScreen, { ses, kind }); };
  const authors = () => ses.view.slots.filter((s) => s.kind === 'local' && s.dev === ses.me).map((s) => ({ name: s.name || 'Invitado', username: s.username || '', p: s.username && s.username === app.accounts.slotUser(1) ? 1 : 0 }));
  chat = mountMatchChat(app, { authors, send: (a, t) => ses.sendChat(a, t), subscribe: (fn) => ses.onChat(fn), context: `sala ${ses.view.code}`, visible: () => !ses.closed && (app.runner.active || !!document.querySelector('.room-page')) });
  ses.on(async () => {
    chat.refresh();
    const v = ses.view;
    if (ses.lost) { chat.destroy(); ses.close(); ui.toast({ kind: 'warn', title: 'Saliste de la sala', text: ses.lost === 'not_in_room' ? 'Esta compu ya no está en la sala (te echaron o la sala cerró).' : 'Se cerró tu sesión.' }); ui.show(twoVTwoScreen); return; }
    if (v.status === 'cancelled') { chat.destroy(); ses.close(); ui.toast({ kind: 'warn', title: 'Sala cerrada', text: v.note || 'El anfitrión cerró la sala.' }); ui.show(twoVTwoScreen); return; }
    if (v.status === 'playing' && playing !== v.round) {
      playing = v.round;
      const r = v.round;
      const out = await ses.playRound({
        onEscape: async () => {
          if (await ui.confirm({ title: '¿Salir de la partida?', text: v.mode === 'competitive' ? 'En COMPETITIVO, salir cuenta como abandono: tu equipo pierde.' : 'La ronda se corta para todos.', yes: 'Salir', no: 'Seguir jugando' })) {
            chat.destroy(); app.runner.close(); await ses.leave(); ui.show(twoVTwoScreen);
          }
        },
        overlay: (g, runner, round) => drawNet(g, round, ses),
      });
      if (ses.closed) return;
      await ses.report(r, out);
      app.runner.close();
      app.audio.playMusic('menu');
      showLobby();
    }
  });
  ses.start();
  ses.onLeave = () => chat?.destroy();
  showLobby();
}

function drawNet(g, round, ses) {
  if (!round?.waiting) return;
  g.save();
  g.fillStyle = 'rgba(13,11,20,0.78)';
  g.fillRect(440, 300, 400, 80);
  g.fillStyle = '#FFE45C';
  g.font = '700 22px sans-serif';
  g.textAlign = 'center';
  const names = round.waitingFor.map((d) => ses.view.devices.find((x) => x.idx === d)?.name || `compu ${d + 1}`).join(', ');
  g.fillText(`Esperando a: ${names}`, 640, 348);
  g.restore();
}

export function roomScreen(ui, { ses, kind }) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  const body = h('div.room-body');
  const off = ses.on(() => { if (!scr.disposed) render(); });
  const leave = async () => {
    if (!(await ui.confirm({ title: '¿Salir de la sala?', text: ses.isHost ? 'Sos el anfitrión: la sala se cierra para todos.' : 'Tus jugadores dejan sus lugares.', yes: 'Salir', no: 'Quedarme' }))) return;
    ses.onLeave?.();
    await ses.leave();
    ui.show(twoVTwoScreen);
  };
  async function act(fn, args = {}) {
    try { await ses.setView(await ses.call(fn, args)); } catch (e) { ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) }); }
  }
  function slotCard(s) {
    const v = ses.view;
    const x = v.slots.find((y) => y.slot === s);
    const team = s % 2;
    const mineDev = x && x.dev === ses.me;
    const single = v.devices.length <= 1;
    const local = ses.localMap();
    if (!x) {
      return h('div.rs-slot.empty.t' + team,
        h('small', `LUGAR ${s + 1}`), h('b', 'LIBRE'),
        h('div.rs-actions',
          h('button.btn.small.primary', { nav: true, onclick: () => pickLocal(s) }, icon('user'), 'JUGADOR DE ESTA COMPU'),
          ses.isHost && v.mode === 'friendly' ? h('div.rs-bots', BOT_ORDER.map((l) => h('button.btn.small', { nav: true, style: { '--c': BOT_LEVELS[l].color }, onclick: () => act('dc_room_slot', { p_slot: s, p_action: 'bot', p_arg: l }) }, `BOT ${BOT_LEVELS[l].name.toUpperCase()}`))) : null,
          !ses.isHost && v.mode === 'friendly' ? h('small.muted', 'El anfitrión puede poner un bot.') : null));
    }
    const pl = roomPlayers(v)[s];
    const dev = v.devices.find((d) => d.idx === x.dev);
    const k = single ? s : local[s];
    const keys = mineDev && x.kind === 'local' && k != null ? Object.values(app.input.bindings[k] || {}).slice(0, 4).map((c) => keyNameShort(c[0])).join(' ') : null;
    return h('div.rs-slot.t' + team + (mineDev ? '.mine' : ''),
      h('small', `LUGAR ${s + 1} · ${x.kind === 'bot' ? 'BOT' : x.username ? '@' + x.username : 'INVITADO'}`),
      h('div.rs-who', avatar(ui, scr, { char: pl.char, color: pl.color, acc: pl.acc }, 54, { static: true }),
        h('div', h('b', pl.name), x.kind === 'bot' ? h('span', 'Lo maneja la compu del anfitrión') : h('span', mineDev ? `Esta compu${keys ? ' · teclas ' + keys : ''}` : `Compu de ${dev?.name || '—'}`),
          x.rating2 != null ? h('span.rs-elo', `ELO 2v2: ${fmtN(x.rating2)}`) : null)),
      ses.isHost || mineDev ? h('button.btn.small.ghost.rs-x', { nav: true, title: 'Quitar del lugar', onclick: () => act('dc_room_slot', { p_slot: s, p_action: 'clear' }) }, icon('close')) : null);
  }
  /** Elegir qué jugador de esta compu ocupa el lugar: una cuenta guardada, otra cuenta (iniciar sesión) o invitado. */
  function pickLocal(s) {
    const v = ses.view;
    const inRoom = new Set(v.slots.map((x) => x.username).filter(Boolean));
    const saved = svc.savedAccounts().filter((a) => !inRoom.has(a.username));
    ui.modal((ui2) => {
      const m = {};
      const user = h('input.acc-input', { type: 'text', placeholder: 'usuario', nav: true, autocomplete: 'off' });
      const pass = h('input.acc-input', { type: 'password', placeholder: 'contraseña', nav: true });
      const take = async (username) => { m.close(); await act('dc_room_slot', { p_slot: s, p_action: 'take', p_acc_token: svc.tokenOf(username) }); };
      m.el = h('div.dialog.rs-pick',
        h('h2', `LUGAR ${s + 1} · ${TEAM_NAME[s % 2]}`),
        h('p.muted', 'Cada jugador entra con SU cuenta: así suma sus propias estadísticas, PIES y ELO. Las sesiones de las demás cuentas de esta compu no se tocan.'),
        saved.length ? h('div.rs-saved', saved.map((a) => h('button.btn', { nav: true, onclick: () => take(a.username) }, icon('user'), `${a.name} (@${a.username})`))) : null,
        h('form.rs-login', { onsubmit: async (e) => {
          e.preventDefault();
          try { const me = await svc.login(null, user.value.trim().toLowerCase(), pass.value); await take(me.username); }
          catch (err) { ui.toast({ kind: 'warn', title: 'No se pudo entrar', text: errorText(err) }); }
        } }, h('b', 'OTRA CUENTA'), user, pass, h('button.btn.primary', { nav: true, type: 'submit' }, 'INICIAR SESIÓN Y ENTRAR')),
        v.mode === 'friendly' ? h('button.btn.ghost', { nav: true, onclick: async () => { m.close(); await act('dc_room_slot', { p_slot: s, p_action: 'guest', p_arg: `Invitado ${s + 1}` }); } }, 'JUGAR COMO INVITADO (sin cuenta)') : h('p.small.muted', 'En COMPETITIVO no se permiten invitados.'),
        h('button.btn.ghost', { nav: true, onclick: () => m.close() }, 'CANCELAR'));
      m.onBack = () => m.close();
      return m;
    });
  }
  function render() {
    const v = ses.view;
    if (v.status === 'confirm') return renderConfirm(v);
    const mt = MODE_TXT[v.mode];
    const devs = v.devices;
    const allBlueOnly = v.slots.length && v.slots.every((s) => s.slot % 2 === 0 && s.kind === 'local' && s.username);
    put(body,
      h('div.room-top',
        h('div.room-code', h('small', 'CÓDIGO DE LA SALA'), h('b', v.code), h('button.btn.small', { nav: true, onclick: () => { navigator.clipboard?.writeText(v.code).catch(() => {}); ui.toast({ kind: 'ok', title: 'Código copiado', text: v.code }); } }, 'COPIAR')),
        h('div.room-mode.' + v.mode, h('b', mt[0]), h('span', mt[1])),
        ses.isHost && v.kind === 'private' ? h('div.room-mode-pick', ['friendly', 'competitive'].map((md) => h('button.btn.small' + (v.mode === md ? '.primary' : ''), { nav: true, onclick: () => act('dc_room_set', { p_mode: md, p_game: v.game }) }, MODE_TXT[md][0]))) : null),
      v.last ? lastBox(v) : null,
      v.note ? h('p.room-note', v.note) : null,
      h('div.room-teams',
        [0, 1].map((t) => h('div.room-team.t' + t, h('h3', TEAM_NAME[t]), slotCard(t), slotCard(t + 2)))),
      h('div.room-side',
        h('div.room-devs', h('h3', `COMPUS EN LA SALA (${devs.length}/4)`),
          devs.map((d) => h('div.rd' + (d.online ? '' : '.off'), h('i'), h('b', d.me ? 'Esta compu' : `Compu de ${d.name}`), h('small', `${v.slots.filter((s) => s.dev === d.idx && s.kind === 'local').length} jugador(es)${d.idx === 0 ? ' · anfitrión' : ''}${!d.me && ses.links.get(d.idx) ? ' · ' + (ses.links.get(d.idx).mode === 'p2p' ? 'conexión directa' : ses.links.get(d.idx).mode === 'relay' ? 'por el servidor' : 'conectando…') : ''}${ses.rtt[d.idx] != null ? ` · ${Math.round(ses.rtt[d.idx])} ms` : ''}`),
            ses.isHost && !d.me ? h('button.btn.small.ghost', { nav: true, onclick: async () => { if (await ui.confirm({ title: `¿Echar la compu de ${d.name}?`, text: 'Salen todos sus jugadores.', yes: 'Echar', no: 'Cancelar' })) act('dc_room_kick', { p_idx: d.idx }); } }, 'ECHAR') : null))),
        h('div.room-games', h('h3', 'MINIJUEGO'), h('div.rg-list', TEAM_GAMES.map(({ id, how }) => {
          const m = GAME_BY_ID[id].meta;
          return h('button.rg' + (v.game === id ? '.on' : ''), { nav: true, disabled: !ses.isHost, title: how, style: { '--c': m.color }, onclick: () => act('dc_room_set', { p_mode: v.mode, p_game: id }) }, gameIcon(ui, scr, m, 48), h('span', m.name));
        })), v.game ? h('small.rg-how', TEAM_GAMES.find((x) => x.id === v.game)?.how) : null, !ses.isHost ? h('small.muted', 'Lo elige el anfitrión.') : null),
        h('div.room-go',
          h('p.room-banner.' + v.mode, icon(v.mode === 'competitive' ? 'trophy' : 'heart'), mt[1]),
          ses.isHost
            ? h('button.btn.primary.big', { nav: true, disabled: !!v.why, onclick: start }, icon('play'), 'EMPEZAR')
            : h('p.muted', 'Esperando que el anfitrión empiece.'),
          v.why ? h('p.room-why', v.why) : null,
          ses.isHost && v.mode === 'competitive' && v.kind === 'private' && allBlueOnly
            ? h('button.btn.big' + (v.queued ? '.ghost' : '.gold'), { nav: true, onclick: () => act('dc_room_queue', { p_on: !v.queued }) }, icon('records'), v.queued ? 'CANCELAR BÚSQUEDA' : 'BUSCAR RIVALES')
            : null,
          v.queued ? h('p.room-search', `Buscando rivales… (${Math.round((Date.now() - new Date(v.queued_at)) / 1000)} s · el rango de ELO se abre con el tiempo)`) : null,
          h('button.btn.ghost', { nav: true, onclick: leave }, 'SALIR DE LA SALA'))));
  }
  async function start() {
    const v = ses.view;
    const ok = await ui.confirm({ title: v.mode === 'competitive' ? '¿Empezar partida COMPETITIVA?' : '¿Empezar partida AMISTOSA?', text: `${MODE_TXT[v.mode][1]}\n\n${[0, 1].map((t) => `${TEAM_NAME[t]}: ${roomPlayers(v).filter((_, s) => s % 2 === t).map((p) => p.name).join(' y ')}`).join('\n')}`, yes: 'Empezar', no: 'Todavía no', danger: false });
    if (ok) act('dc_room_start');
  }
  function lastBox(v) {
    const L = v.last;
    const win = L.winner === 0 || L.winner === 1 ? L.winner : null;
    const deltas = Object.entries(L.deltas || {});
    return h('div.room-last' + (win != null ? '.w' + win : ''),
      h('b', win != null ? `¡GANÓ EL ${TEAM_NAME[win]}!` : L.status === 'void' ? 'RONDA ANULADA' : L.winner === -1 ? 'EMPATE' : 'RESULTADO'),
      L.mode === 'competitive' && deltas.length ? h('div.rl-deltas', deltas.map(([u, d]) => h('span' + (d >= 0 ? '.up' : '.down'), `@${u} ${d >= 0 ? '+' : ''}${d}`))) : null,
      STATUS_TXT[L.status] ? h('small', STATUS_TXT[L.status]) : L.mode === 'friendly' ? h('small', 'Amistoso: el ELO no cambió.') : null);
  }
  function renderConfirm(v) {
    const me = v.devices.find((d) => d.me);
    const left = Math.max(0, Math.round((new Date(v.confirm_until) - new Date(v.now)) / 1000));
    put(body, h('div.room-confirm',
      h('h2', '¡PARTIDA ENCONTRADA!'),
      h('p', `COMPETITIVO · ${GAME_BY_ID[v.game]?.meta.name || ''} · confirmá en ${left} s`),
      h('div.room-teams', [0, 1].map((t) => h('div.room-team.t' + t, h('h3', TEAM_NAME[t]), roomPlayers(v).filter((_, s) => s % 2 === t).map((p) => h('div.rc-p', h('b', p.name), p.username ? h('small', '@' + p.username) : null))))),
      me?.confirmed ? h('p.muted', 'Confirmado. Esperando a los demás…') : h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => act('dc_room_confirm') }, icon('play'), 'CONFIRMAR'),
      h('button.btn.ghost', { nav: true, onclick: leave }, 'NO, SALIR')));
  }
  render();
  scr.el = h('div.screen.room-page', header(ui, 'SALA 2v2', kind === 'search' ? 'Búsqueda de partida competitiva' : 'Configurá los 4 lugares', leave), body);
  scr.onBack = leave;
  scr.destroy = () => { scr.disposed = true; off(); };
  return scr;
}

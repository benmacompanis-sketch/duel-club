// Centro de notificaciones (del servidor) + preferencias de qué avisos mostrar.
import { h, icon } from './dom.js';
import { tabs, timeAgo, loading, errorBox, empty } from './kit.js';
import { ACH_BY_ID } from '../data/achievements.js';
import { errorText } from '../net/api.js';
import { onlineScreen } from './online.js';

export const NOTIFY_KINDS = [
  ['friend', 'Amistad', 'Solicitudes y solicitudes aceptadas'],
  ['achievement', 'Logros', 'Logros desbloqueados'],
  ['level', 'Niveles', 'Subidas de nivel y recompensas'],
  ['mastery', 'Dominio', 'Nuevos rangos en minijuegos'],
  ['record', 'Récords', 'Récords mundiales y récords perdidos'],
  ['challenge', 'Desafíos online', 'Amigos que te desafían a jugar online'],
];
export function notifyEnabled(app, kind) {
  const k = kind.startsWith('friend') ? 'friend' : kind.startsWith('record') ? 'record' : kind;
  return app.save.settings.notify?.[k] !== false;
}
const KIND_ICON = { friend_request: 'user', friend_accept: 'heart', achievement: 'trophy', level: 'star', mastery: 'medal', record: 'records', record_lost: 'records', welcome: 'bolt', challenge: 'duel' };

export function notificationsModal(ui, { onChange }) {
  const app = ui.app;
  const svc = app.accounts;
  const m = {};
  const slots = [0, 1].filter((p) => svc.slotAccount(p));
  let p = slots.includes(app.save.viewer) ? app.save.viewer : slots[0];
  let showPrefs = false;
  const body = h('div.notif-body');
  const head = h('div.notif-tabs');

  async function load() {
    head.replaceChildren(
      slots.length > 1 ? tabs(slots.map((s) => [s, `J${s + 1} · ${svc.slotAccount(s).name}`]), p, (v) => { p = v; showPrefs = false; load(); }) : h('div'),
      h('button.btn.small.ghost', { nav: true, onclick: () => { showPrefs = !showPrefs; load(); } }, icon('settings'), showPrefs ? 'VER AVISOS' : 'PREFERENCIAS'));
    if (showPrefs) return renderPrefs();
    body.replaceChildren(loading());
    try {
      const list = await svc.notifications(p);
      if (m.closed) return;
      const shown = list.filter((n) => notifyEnabled(app, n.kind));
      body.replaceChildren(shown.length
        ? h('div.notif-list', shown.map((n) => {
          const ach = n.kind === 'achievement' ? ACH_BY_ID[n.data?.id || n.body] : null;
          const text = ach ? `${ach.name} — ${ach.desc}` : n.body || '';
          const actions = n.kind === 'friend_request' && n.data?.user
            ? h('div.row', h('button.btn.small.green', { nav: true, onclick: () => respond(n.data.user, true) }, 'ACEPTAR'), h('button.btn.small.ghost', { nav: true, onclick: () => respond(n.data.user, false) }, 'RECHAZAR'))
            : n.kind === 'challenge' && n.data?.code && Date.now() - new Date(n.at).getTime() < 15 * 60000
              ? h('div.row', h('button.btn.small.green', { nav: true, onclick: () => { m.close?.(); ui.show(onlineScreen, { code: n.data.code }); } }, 'IR A LA SALA ' + n.data.code))
              : null;
          return h('div.notif' + (n.read ? '' : '.unread'), h('span.notif-ico', icon(KIND_ICON[n.kind] || 'star')),
            h('div.notif-main', h('b', n.title), h('span', text), actions), h('small', timeAgo(n.at)));
        }))
        : empty('No hay notificaciones nuevas.', 'bell'));
      if (list.some((n) => !n.read)) {
        await svc.markRead(p).catch(() => {});
        onChange?.();
      }
    } catch (e) {
      body.replaceChildren(errorBox(errorText(e), load));
    }
  }
  async function respond(user, accept) {
    try {
      await svc.friendRespond(p, user, accept);
      ui.toast({ kind: 'achievement', icon: accept ? 'heart' : 'close', title: accept ? 'Amistad aceptada' : 'Solicitud rechazada', name: '@' + user });
      load();
    } catch (e) {
      ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) });
    }
  }
  function renderPrefs() {
    const s = (app.save.settings.notify ||= {});
    body.replaceChildren(h('div.notif-prefs',
      h('p.muted', 'Elegí qué avisos ves en el juego. Las notificaciones se guardan igual en tu cuenta.'),
      ...NOTIFY_KINDS.map(([k, name, desc]) => {
        const t = h('button.toggle' + (s[k] !== false ? '.on' : ''), { nav: true, 'aria-label': name, onclick: () => { s[k] = s[k] === false; t.classList.toggle('on', s[k] !== false); app.persist(); app.audio.play('click'); } });
        return h('div.opt', h('div.opt-label', h('b', name), h('span', desc)), t);
      })));
  }
  m.el = h('div.dialog.notif-dialog',
    h('div.acc-head', h('h2', 'NOTIFICACIONES'), h('button.icon-btn', { nav: true, title: 'Cerrar', onclick: () => m.close() }, icon('close'))),
    head, body);
  m.onBack = () => m.close();
  m.destroy = () => { m.closed = true; };
  load();
  return m;
}

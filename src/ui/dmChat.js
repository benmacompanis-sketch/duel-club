// CHAT PRIVADO entre dos amigos (nunca grupos). El servidor valida amistad, bloqueos, spam y tapa insultos.
// La conversación se actualiza cada 3 s mientras está abierta. Los mensajes se muestran como texto plano.
import { h, icon } from './dom.js';
import { avatar } from './kit.js';
import { errorText } from '../net/api.js';

const hhmm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function dmChatModal(ui, { p = 0, friend, onClose }) {
  const app = ui.app;
  const svc = app.accounts;
  const m = {};
  let last = null, timer = null, blocked = false, muted = false, sending = false;
  const list = h('div.dm-list');
  const input = h('input.acc-input.dm-in', { type: 'text', maxlength: 300, placeholder: 'Escribí un mensaje…', 'aria-label': 'Mensaje', nav: true });
  const status = h('small.dm-status.muted');
  const blockBtn = h('button.btn.small.ghost', { nav: true, onclick: () => toggle('block') });
  const muteBtn = h('button.btn.small.ghost', { nav: true, title: 'No ver sus mensajes durante las partidas', onclick: () => toggle('mute') });

  function bubble(x) {
    const b = h('div.dm-msg' + (x.mine ? '.mine' : ''), h('p', x.body), h('small', hhmm(x.at) + (x.mine && x.read ? ' · visto' : '')));
    if (!x.mine) b.append(h('button.dm-rep', { nav: true, title: 'Reportar este mensaje', onclick: () => report(x) }, icon('flag')));
    return b;
  }
  async function load(initial = false) {
    try {
      const out = await svc.dmThread(p, friend.username, initial ? null : last);
      if (m.closed) return;
      blocked = out.blocked;
      if (initial) list.replaceChildren();
      for (const x of out.msgs) { list.append(bubble(x)); last = Math.max(last ?? 0, x.id); }
      if (initial && !out.msgs.length) list.append(h('p.dm-empty.muted', `Todavía no hablaste con ${friend.name}. ¡Saludá!`));
      if (out.msgs.length) { list.querySelector('.dm-empty')?.remove(); list.scrollTop = list.scrollHeight; }
      paintHead();
      status.textContent = !out.friend ? 'Ya no son amigos: no se pueden mandar mensajes.' : blocked ? 'Hay un bloqueo entre ustedes: no se pueden mandar mensajes.' : '';
      input.disabled = !out.friend || blocked;
    } catch (e) {
      if (initial) list.replaceChildren(h('p.muted', errorText(e)));
    }
  }
  function paintHead() {
    blockBtn.replaceChildren(icon('close'), blocked ? 'DESBLOQUEAR' : 'BLOQUEAR');
    muteBtn.replaceChildren(icon('sound'), muted ? 'QUITAR SILENCIO' : 'SILENCIAR');
  }
  async function send() {
    const txt = input.value.trim();
    if (!txt || sending) return;
    sending = true;
    try {
      const x = await svc.dmSend(p, friend.username, txt);
      input.value = '';
      list.querySelector('.dm-empty')?.remove();
      list.append(bubble({ ...x, mine: true }));
      last = Math.max(last ?? 0, x.id);
      list.scrollTop = list.scrollHeight;
      app.audio.play('click');
    } catch (e) {
      ui.toast({ kind: 'warn', title: 'No se envió', text: errorText(e) });
    } finally { sending = false; input.focus(); }
  }
  async function toggle(kind) {
    const on = kind === 'block' ? !blocked : !muted;
    if (kind === 'block' && on && !(await ui.confirm({ title: `¿Bloquear a ${friend.name}?`, text: 'No te va a poder escribir y no vas a ver sus mensajes en las partidas. Lo podés deshacer cuando quieras.', yes: 'Bloquear', no: 'Cancelar' }))) return;
    try {
      const list2 = await svc.setBlock(p, friend.username, kind, on);
      app.chatBlocks = list2;
      if (kind === 'block') blocked = on; else muted = on;
      paintHead();
      ui.toast({ kind: 'ok', title: kind === 'block' ? (on ? 'Bloqueado' : 'Desbloqueado') : on ? 'Silenciado' : 'Ya no está silenciado', text: friend.name });
      load(true);
    } catch (e) { ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) }); }
  }
  async function report(x) {
    if (!(await ui.confirm({ title: 'Reportar mensaje', text: `«${x.body}»\n\nSe guarda para que lo revise un moderador.`, yes: 'Reportar', no: 'Cancelar' }))) return;
    try { await svc.chatReport(p, friend.username, 'dm', x.id, x.body); ui.toast({ kind: 'ok', title: 'Reporte enviado', text: 'Gracias por avisar.' }); }
    catch (e) { ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) }); }
  }
  svc.blocks(p).then((b) => { app.chatBlocks = b; muted = b.some((x) => x.username === friend.username && x.kind === 'mute'); paintHead(); }).catch(() => {});
  paintHead();
  m.el = h('div.dm-chat',
    h('div.dm-head', avatar(ui, m, { char: friend.char || 'volt', color: friend.color || '#3985FF', acc: null }, 52, { static: true }),
      h('div.dm-who', h('b', friend.name), h('small', `@${friend.username} · chat privado`)), muteBtn, blockBtn,
      h('button.icon-btn', { nav: true, title: 'Cerrar', onclick: () => m.close() }, icon('close'))),
    list,
    h('form.dm-form', { onsubmit: (e) => { e.preventDefault(); send(); } }, input, h('button.btn.primary', { nav: true, type: 'submit' }, 'ENVIAR')),
    status);
  m.onEnter = () => send();
  m.onBack = () => m.close();
  m.destroy = () => { m.closed = true; clearInterval(timer); onClose?.(); };
  load(true);
  timer = setInterval(() => { if (!document.hidden) load(false); }, 3000);
  setTimeout(() => input.focus(), 50);
  return m;
}

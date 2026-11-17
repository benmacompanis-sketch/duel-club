// CHAT DE PARTIDA (1v1 online y 2v2): ventanita flotante abajo a la derecha que se puede minimizar.
// Funciona con jugadores en la misma compu o en varias: cada mensaje dice qué jugador lo escribió.
// Moderación: filtro de palabras (al mandar y al recibir), límite de 5 mensajes cada 10 s, silenciar/bloquear
// (se guarda en la cuenta) y reportar (queda en el servidor con el texto y la sala).
import { h, icon } from './dom.js';
import { cleanChat } from '../core/chatFilter.js';
import { errorText } from '../net/api.js';

/**
 * @param {object} o
 * @param {() => {name, username, p}[]} o.authors  jugadores de esta compu que pueden escribir (p = J1/J2 con cuenta, o null)
 * @param {(author, text) => void} o.send
 * @param {(fn) => () => void} o.subscribe  recibe {from, user, text, mine}
 * @param {string} o.context  para los reportes (código de sala o id de la serie)
 */
export function mountMatchChat(app, { authors, send, subscribe, context }) {
  const ui = app.ui;
  const svc = app.accounts;
  let open = false, unread = 0, author = 0;
  const sent = [];
  const list = h('div.mc-list');
  const input = h('input.mc-in', { type: 'text', maxlength: 200, placeholder: 'Escribí y apretá Enter…', 'aria-label': 'Mensaje del chat de partida' });
  // Enter también es una tecla de jugador: el campo de texto la atiende primero (y no llega al juego)
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); doSend(); } else e.stopPropagation(); });
  const who = h('select.mc-who', { 'aria-label': 'Quién escribe' });
  const badge = h('span.mc-badge');
  const toggleBtn = h('button.mc-toggle', { title: 'Chat de la partida', onclick: () => setOpen(!open) }, icon('chat'), badge);
  const panel = h('div.mc-panel',
    h('div.mc-head', h('b', 'CHAT DE LA PARTIDA'), h('button.mc-x', { title: 'Minimizar', onclick: () => setOpen(false) }, '—')),
    list,
    h('form.mc-form', { onsubmit: (e) => { e.preventDefault(); doSend(); } }, who, input));
  const el = h('div.match-chat', panel, toggleBtn);
  document.body.append(el);

  const hidden = (user) => !!user && (app.chatBlocks || []).some((b) => b.username === user);
  function paintWho() {
    const list2 = authors();
    who.replaceChildren(...list2.map((a, i) => h('option', { value: i }, a.name)));
    who.style.display = list2.length > 1 ? '' : 'none';
    if (author >= list2.length) author = 0;
    who.value = String(author);
  }
  who.onchange = () => { author = +who.value; };
  function setOpen(v) {
    open = v;
    el.classList.toggle('open', open);
    if (open) { unread = 0; badge.textContent = ''; paintWho(); setTimeout(() => input.focus(), 30); list.scrollTop = list.scrollHeight; }
    else input.blur();
  }
  function doSend() {
    const a = authors()[author];
    const txt = cleanChat(input.value);
    if (!txt || !a) return;
    const now = performance.now();
    while (sent.length && now - sent[0] > 10000) sent.shift();
    if (sent.length >= 5) { addLine({ system: true, text: 'Muy rápido: esperá unos segundos.' }); return; }
    sent.push(now);
    input.value = '';
    send(a, txt);
  }
  function addLine(m) {
    const row = m.system ? h('div.mc-row.sys', m.text)
      : h('div.mc-row' + (m.mine ? '.mine' : ''), h('b', m.from + ':'), ' ', h('span', m.text),
        !m.mine && m.user ? h('button.mc-act', { title: 'Silenciar o reportar', onclick: () => moderate(m) }, icon('flag')) : null);
    list.append(row);
    while (list.children.length > 60) list.firstChild.remove();
    list.scrollTop = list.scrollHeight;
  }
  async function moderate(m) {
    const p = authors()[author]?.p ?? 0;
    if (!svc.slotAccount(p)) { ui.toast({ kind: 'warn', title: 'Necesitás una cuenta', text: 'Iniciá sesión para silenciar o reportar.' }); return; }
    const mute = await ui.confirm({ title: `${m.from}`, text: `«${m.text}»\n\n¿Querés silenciar a este jugador (no vas a ver sus mensajes) y reportar el mensaje?`, yes: 'Silenciar y reportar', no: 'Cancelar' });
    if (!mute) return;
    try {
      app.chatBlocks = await svc.setBlock(p, m.user, 'mute', true);
      await svc.chatReport(p, m.user, 'match', null, m.text, context).catch(() => {});
      ui.toast({ kind: 'ok', title: 'Silenciado y reportado', text: m.from });
      for (const r of [...list.children]) if (r.dataset.user === m.user) r.remove();
    } catch (e) { ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) }); }
  }
  const unsub = subscribe((m) => {
    if (!m.mine && hidden(m.user)) return;
    const text = cleanChat(m.text);
    if (!text) return;
    addLine({ ...m, text });
    list.lastChild.dataset.user = m.user || '';
    if (!open && !m.mine) { unread++; badge.textContent = String(unread); app.audio.play('click'); }
  });
  // T abre el chat (si no estás escribiendo en otro lado); Escape lo minimiza
  const onKey = (e) => {
    if (e.code === 'KeyT' && !open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) { e.preventDefault(); setOpen(true); }
    else if (e.code === 'Escape' && open && document.activeElement === input) { e.stopPropagation(); setOpen(false); }
  };
  window.addEventListener('keydown', onKey, true);
  if (!app.chatBlocks && svc.slotAccount(0)) svc.blocks(0).then((b) => { app.chatBlocks = b; }).catch(() => {});
  paintWho();
  return {
    refresh: paintWho,
    destroy() { unsub(); window.removeEventListener('keydown', onKey, true); el.remove(); },
  };
}

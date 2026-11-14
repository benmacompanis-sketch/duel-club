// Ventana de cuenta de un jugador (J1 o J2): iniciar sesión, crear cuenta, recuperar una cuenta de la
// versión anterior con su PIN, elegir una cuenta ya iniciada en esta compu, cerrar sesión o jugar de invitado.
import { h, icon } from './dom.js';
import { slugify } from '../core/accountService.js';
import { errorText } from '../net/api.js';
import { startGoogle, startEmail } from '../net/extAuth.js';
import { avatar, lookOf, levelBadge, resist } from './kit.js';

export function accountModal(ui, { p, onDone }) {
  const app = ui.app;
  const svc = app.accounts;
  let tab = 'login';
  let busy = false;
  const m = {};
  const otherUser = () => app.profiles[1 - p].accountId;

  const input = (id, type, ph, max, extra = {}) => h('input.acc-input#' + id, { type, maxlength: max, autocomplete: 'off', spellcheck: 'false', nav: true, placeholder: ph, ...extra });
  const userIn = input('acc-user', 'text', 'usuario', 16, { 'aria-label': 'Usuario' });
  const nameIn = input('acc-name', 'text', 'Nombre visible (ej.: Ana)', 16, { 'aria-label': 'Nombre visible' });
  const passIn = input('acc-pass', 'password', 'contraseña', 72, { 'aria-label': 'Contraseña' });
  const pass2In = input('acc-pass2', 'password', 'repetir contraseña', 72, { 'aria-label': 'Repetir contraseña' });
  const pinIn = input('acc-pin', 'password', 'PIN anterior (4 números)', 4, { inputmode: 'numeric', 'aria-label': 'PIN de la versión anterior' });
  pinIn.addEventListener('input', () => { pinIn.value = pinIn.value.replace(/\D/g, '').slice(0, 4); });
  userIn.addEventListener('input', () => {
    const v = userIn.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (v !== userIn.value) userIn.value = v;
  });
  nameIn.addEventListener('input', () => {
    if (tab === 'create' && !userIn.dataset.touched) userIn.value = slugify(nameIn.value) || '';
  });
  userIn.addEventListener('keydown', () => { userIn.dataset.touched = '1'; });
  const err = h('p.acc-error');
  const hint = h('p.acc-hint');
  const submitBtn = h('button.btn.primary', { nav: true, onclick: () => submit() });
  const fields = h('div.acc-fields');
  const saved = h('div.acc-saved');
  const tabsEl = h('div.tabs.acc-tabs');

  // Google / email (Supabase Auth): entrar, crear cuenta o vincular a la cuenta actual
  function extRow(mode) {
    return h('div.acc-ext',
      h('span.acc-or', mode === 'link' ? 'Vincular para entrar más fácil' : 'o entrá con'),
      h('button.btn.small.acc-google', { nav: true, onclick: () => { app.audio.play('click'); startGoogle(p, mode); } }, h('b.g-logo', 'G'), 'GOOGLE'),
      h('button.btn.small', { nav: true, onclick: () => emailLink(mode) }, icon('bell'), 'EMAIL'));
  }
  async function emailLink(mode) {
    const email = window.prompt('Tu email: te mandamos un link para entrar (sin contraseña).');
    if (!email) return;
    try {
      await startEmail(email.trim(), p, mode);
      ui.toast({ kind: 'ok', title: 'Revisá tu email', text: `Te mandamos un link a ${email.trim()}. Abrilo en este mismo navegador.` });
    } catch (e) {
      err.textContent = errorText(e);
      app.audio.play('error');
    }
  }

  function setTab(t) {
    tab = t;
    err.textContent = '';
    tabsEl.replaceChildren(...[['login', 'INICIAR SESIÓN'], ['create', 'CREAR CUENTA'], ['claim', 'CUENTA ANTERIOR']].map(([id, label]) =>
      h('button.tab' + (id === t ? '.on' : ''), { nav: true, onclick: () => { setTab(id); app.audio.play('click'); } }, label)));
    if (t === 'login') {
      fields.replaceChildren(label('Usuario', userIn), label('Contraseña', passIn), extRow('login'));
      submitBtn.textContent = 'ENTRAR';
      hint.textContent = 'Tu cuenta funciona en cualquier computadora o celular que abra DUEL CLUB.';
    } else if (t === 'create') {
      fields.replaceChildren(label('Nombre visible', nameIn), label('Usuario único', userIn), label('Contraseña (mín. 6)', passIn), label('Repetir', pass2In), extRow('login'));
      submitBtn.textContent = 'CREAR CUENTA';
      hint.textContent = 'Arrancás con 300 PIES de regalo.';
    } else {
      fields.replaceChildren(label('Usuario anterior', userIn), label('PIN anterior', pinIn), label('Nueva contraseña', passIn), label('Repetir', pass2In));
      submitBtn.textContent = 'RECUPERAR CUENTA';
      hint.textContent = '¿Tenías cuenta en la versión anterior (nombre + PIN)? Tu progreso se migró: confirmá tu PIN y elegí una contraseña nueva.';
    }
  }
  const label = (txt, el) => h('label.acc-field', h('span', txt), el);

  function renderSaved() {
    const list = svc.savedAccounts();
    const mine = app.profiles[p].accountId;
    saved.replaceChildren();
    if (!list.length) return;
    saved.append(h('small', 'CUENTAS INICIADAS EN ESTA COMPU'));
    for (const a of list) {
      const usedByOther = a.username === otherUser();
      const isMine = a.username === mine;
      saved.append(h('div.acc-row' + (isMine ? '.on' : ''),
        avatar(ui, m, lookOf(a), 40),
        h('div.acc-row-main', h('b', a.name || a.username), h('span', '@' + a.username), a.level ? h('div.row', levelBadge(a.level), resist(a.rating, { short: true })) : null),
        usedByOther ? h('span.chip', `ES J${2 - p}`)
          : isMine ? h('span.chip', `J${p + 1}`)
            : h('button.btn.small', { nav: true, onclick: () => choose(a.username) }, `USAR COMO J${p + 1}`),
        h('button.icon-btn.small', { nav: true, title: 'Cerrar sesión en esta compu', onclick: () => logout(a.username) }, icon('close'))));
    }
  }
  function choose(u) {
    try {
      svc.attach(p, u);
      app.audio.play('confirm');
      finish();
    } catch (e) {
      err.textContent = errorText(e);
    }
  }
  async function logout(u) {
    const ok = await ui.confirm({ title: 'Cerrar sesión', text: `Se cierra la sesión de @${u} en esta compu. El progreso queda guardado en el servidor.`, yes: 'Cerrar sesión', no: 'Cancelar' });
    if (!ok) return;
    await svc.logout(u);
    renderSaved();
  }

  async function submit() {
    if (busy) return;
    err.textContent = '';
    const user = userIn.value.trim().toLowerCase();
    const pass = passIn.value;
    const fail = (msg, el) => { err.textContent = msg; app.audio.play('error'); el?.focus(); };
    if (!/^[a-z0-9_-]{3,16}$/.test(user)) return fail('El usuario tiene que tener de 3 a 16 caracteres: letras, números, - o _.', userIn);
    if (user === otherUser()) return fail(`Esa cuenta ya está jugando como J${2 - p}.`, userIn);
    if (tab === 'create' && nameIn.value.trim().length < 3) return fail('El nombre visible tiene que tener al menos 3 caracteres.', nameIn);
    if (tab === 'claim' && !/^\d{4}$/.test(pinIn.value)) return fail('El PIN anterior tiene 4 números.', pinIn);
    if (pass.length < 6) return fail('La contraseña tiene que tener al menos 6 caracteres.', passIn);
    if (tab !== 'login' && pass !== pass2In.value) return fail('Las contraseñas no coinciden.', pass2In);
    busy = true;
    submitBtn.disabled = true;
    const prev = submitBtn.textContent;
    submitBtn.textContent = 'CONECTANDO…';
    try {
      if (tab === 'login') await svc.login(p, user, pass);
      else if (tab === 'create') await svc.register(p, user, nameIn.value.trim(), pass);
      else await svc.claim(p, user, pinIn.value, pass);
      app.audio.play('confirm');
      const me = svc.slotAccount(p);
      ui.toast({ kind: 'achievement', icon: 'user', title: tab === 'create' ? 'Cuenta creada' : tab === 'claim' ? 'Cuenta recuperada' : 'Sesión iniciada', name: me?.name || user, text: `Jugando como J${p + 1}.` });
      finish();
    } catch (e) {
      if (e.code === 'legacy_claim_required') {
        setTab('claim');
        userIn.value = user;
        passIn.value = '';
      }
      fail(errorText(e));
    } finally {
      busy = false;
      submitBtn.disabled = false;
      submitBtn.textContent = prev;
    }
  }

  async function rename() {
    const me = svc.slotAccount(p);
    if (!me) return;
    const name = window.prompt('Nuevo nombre visible (3 a 16 caracteres). Se puede cambiar una vez cada 7 días.', me.name);
    if (!name || name.trim() === me.name) return;
    try {
      await svc.rename(p, name.trim());
      app.audio.play('confirm');
      ui.toast({ kind: 'ok', title: 'Nombre cambiado', text: `Ahora te llamás ${svc.slotAccount(p).name}.` });
      finish();
    } catch (e) {
      err.textContent = errorText(e);
      app.audio.play('error');
    }
  }

  async function deleteAccount() {
    const me = svc.slotAccount(p);
    if (!me) return;
    const pass = window.prompt(`Para ELIMINAR la cuenta @${me.username} escribí tu contraseña. Se borra todo su progreso y no se puede deshacer.`);
    if (!pass) return;
    const ok = await ui.confirm({ title: '¿Eliminar la cuenta para siempre?', text: `Se borran XP, PIES, ELO, logros, inventario, amigos e historial de @${me.username}.`, yes: 'Eliminar', no: 'Cancelar' });
    if (!ok) return;
    try {
      await svc.deleteAccount(p, pass);
      ui.toast({ kind: 'warn', title: 'Cuenta eliminada', text: `@${me.username} ya no existe.` });
      finish();
    } catch (e) {
      err.textContent = errorText(e);
      app.audio.play('error');
    }
  }

  function guest() {
    if (app.profiles[p].accountId) svc.detach(p);
    app.audio.play('click');
    finish();
  }
  function finish() {
    m.close?.();
    onDone?.();
  }

  setTab('login');
  renderSaved();
  m.el = h('div.dialog.acc-dialog',
    h('div.acc-head', h('h2', `JUGADOR ${p + 1}`), h('button.icon-btn', { nav: true, title: 'Cerrar', onclick: () => finish() }, icon('close'))),
    saved,
    tabsEl,
    fields,
    err,
    hint,
    h('div.dialog-actions',
      h('button.btn.ghost', { nav: true, onclick: guest }, app.profiles[p].accountId ? 'JUGAR COMO INVITADO' : 'SEGUIR COMO INVITADO'),
      submitBtn),
    svc.slotAccount(p) ? h('div.acc-links',
      h('button.linkbtn', { nav: true, onclick: rename }, `Cambiar nombre visible (${svc.slotAccount(p).name})`),
      h('button.linkbtn', { nav: true, onclick: () => startGoogle(p, 'link') }, 'Vincular Google'),
      h('button.linkbtn', { nav: true, onclick: () => emailLink('link') }, 'Vincular email'),
      h('button.linkbtn.acc-delete', { nav: true, onclick: deleteAccount }, `Eliminar la cuenta @${svc.slotAccount(p).username}`)) : null);
  m.onBack = () => finish();
  m.onEnter = () => submit();
  return m;
}

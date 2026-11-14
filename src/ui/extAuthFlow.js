// Al volver de Google o del link del email: abre la sesión, pide usuario y nombre si la cuenta es nueva,
// o vincula Google/email a la cuenta del jugador.
import { h } from './dom.js';
import { consumeRedirect } from '../net/extAuth.js';
import { errorText } from '../net/api.js';
import { slugify } from '../core/accountService.js';

export async function handleExtAuth(app) {
  const r = consumeRedirect();
  if (!r) return;
  const ui = app.ui;
  if (r.error) { ui.toast({ kind: 'warn', title: 'No se pudo entrar', text: r.error }); return; }
  try {
    if (r.mode === 'link' && app.accounts.slotAccount(r.slot)) {
      await app.accounts.extLink(r.slot, r.token);
      ui.toast({ kind: 'ok', title: 'Cuenta vinculada', text: 'La próxima vez podés entrar con Google o con tu email.' });
      return;
    }
    const out = await app.accounts.extLogin(r.slot, r.token);
    if (out?.needs_signup) { ui.modal(signupModal, { app, r, email: out.email }); return; }
    ui.toast({ kind: 'ok', title: `¡Hola, ${out.name}!`, text: `Entraste como J${r.slot + 1}.` });
    ui.goMenu();
  } catch (e) {
    ui.toast({ kind: 'warn', title: 'No se pudo entrar', text: errorText(e) });
  }
}

function signupModal(ui, { app, r, email }) {
  const m = {};
  const nameIn = h('input.acc-input', { maxlength: 16, placeholder: 'Nombre visible (ej.: Ana)', nav: true, spellcheck: 'false' });
  const userIn = h('input.acc-input', { maxlength: 16, placeholder: 'usuario', nav: true, spellcheck: 'false' });
  let touched = false;
  nameIn.addEventListener('input', () => { if (!touched) userIn.value = slugify(nameIn.value) || ''; });
  userIn.addEventListener('input', () => { touched = true; userIn.value = userIn.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''); });
  const err = h('p.acc-error');
  const go = async () => {
    try {
      const me = await app.accounts.extLogin(r.slot, r.token, userIn.value.trim(), nameIn.value.trim());
      m.close?.();
      ui.toast({ kind: 'ok', title: `¡Bienvenido, ${me.name}!`, text: 'Tu cuenta quedó creada con 300 PIES de regalo.' });
      ui.goMenu();
    } catch (e) {
      err.textContent = errorText(e);
      app.audio.play('error');
    }
  };
  m.el = h('div.dialog.acc-dialog',
    h('h2', 'TERMINÁ TU CUENTA'),
    h('p.muted', `Entraste con ${email || 'tu cuenta'}. Elegí cómo te van a ver en el CLUB.`),
    h('div.acc-fields', h('label', h('span', 'Nombre visible'), nameIn), h('label', h('span', 'Usuario único'), userIn)),
    err,
    h('div.dialog-actions', h('button.btn.ghost', { nav: true, onclick: () => m.close?.() }, 'CANCELAR'), h('button.btn.primary', { nav: true, onclick: go }, 'CREAR CUENTA')));
  m.onEnter = go;
  setTimeout(() => nameIn.focus(), 50);
  return m;
}

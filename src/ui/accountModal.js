// Ventana de cuenta de un jugador: iniciar sesión con nombre + PIN o crear una cuenta nueva.
import { h, icon } from './dom.js';
import { drawCharacter } from '../core/characters.js';
import { slugify } from '../core/accountService.js';

export function accountModal(ui, { p, onDone }) {
  const app = ui.app;
  const svc = app.accounts;
  const prof = app.profiles[p];
  let tab = 'login';
  let busy = false;
  const m = {};

  const nameIn = h('input.acc-input#acc-name', { type: 'text', maxlength: 16, autocomplete: 'off', spellcheck: 'false', nav: true, placeholder: 'Ej.: Ana', 'aria-label': 'Nombre de cuenta' });
  const pinIn = h('input.acc-input.acc-pin#acc-pin', { type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off', nav: true, placeholder: '••••', 'aria-label': 'PIN de 4 números' });
  pinIn.addEventListener('input', () => { pinIn.value = pinIn.value.replace(/\D/g, '').slice(0, 4); });
  const err = h('p.acc-error');
  const hint = h('p.acc-hint');
  const submitBtn = h('button.btn.primary', { nav: true, onclick: () => submit() });
  const recentBox = h('div.acc-recent');
  const tabs = h('div.tabs.acc-tabs',
    h('button.tab', { nav: true, dataset: { t: 'login' }, onclick: () => setTab('login') }, 'INICIAR SESIÓN'),
    h('button.tab', { nav: true, dataset: { t: 'create' }, onclick: () => setTab('create') }, 'CREAR CUENTA'));

  function setTab(t) {
    tab = t;
    err.textContent = '';
    tabs.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.t === t));
    submitBtn.textContent = t === 'login' ? 'ENTRAR' : 'CREAR CUENTA';
    hint.textContent = t === 'login'
      ? 'Usá la misma cuenta desde cualquier computadora que abra el juego.'
      : 'El nombre es único en el ranking (3 a 16 letras o números). La cuenta se crea con el personaje, color y accesorio que tenés elegidos.';
    recentBox.classList.toggle('hidden', t !== 'login' || !recentBox.childElementCount);
    app.audio.play('click');
  }

  function renderRecent() {
    const other = app.profiles[1 - p].accountId;
    const ids = svc.recent().filter((id) => id !== other);
    recentBox.replaceChildren(...ids.map((id) => {
      const a = svc.get(id);
      const label = a ? a.name : id;
      return h('button.acc-chip', { nav: true, onclick: () => { nameIn.value = label; pinIn.focus(); app.audio.play('click'); } },
        a ? ui.preview(m, 28, 28, (g, w, hh, t) => drawCharacter(g, { id: a.char, x: w / 2, y: hh + 4, s: 0.32, color: a.color, anim: 'idle', t, acc: a.acc, shadow: false })) : null,
        h('span', label));
    }));
    if (ids.length) recentBox.prepend(h('small', 'EN ESTA COMPU'));
  }

  async function submit() {
    if (busy) return;
    const name = nameIn.value.trim();
    const pin = pinIn.value.trim();
    err.textContent = '';
    if (!slugify(name)) { err.textContent = 'Escribí un nombre de 3 a 16 letras o números.'; app.audio.play('error'); nameIn.focus(); return; }
    if (!/^\d{4}$/.test(pin)) { err.textContent = 'El PIN tiene que tener 4 números.'; app.audio.play('error'); pinIn.focus(); return; }
    if (svc.mode === 'connecting') { err.textContent = 'Conectando con el ranking… probá en unos segundos.'; return; }
    busy = true;
    submitBtn.disabled = true;
    submitBtn.textContent = tab === 'login' ? 'ENTRANDO…' : 'CREANDO…';
    const r = tab === 'login' ? await svc.login(p, name, pin) : await svc.create(p, name, pin);
    busy = false;
    submitBtn.disabled = false;
    setTab(tab);
    if (r.error) {
      err.textContent = r.error;
      app.audio.play('error');
      return;
    }
    app.audio.play('ready');
    ui.toast({ title: tab === 'login' ? 'Sesión iniciada' : 'Cuenta creada', name: `¡Hola, ${r.account.name}!`, text: `Jugador ${p + 1} · ${r.account.rating} ELO`, time: 2600 });
    m.close();
    onDone?.(r.account);
  }

  m.el = h('div.dialog.acc-dialog', { style: { '--c': prof.color } },
    h('div.acc-head', h('span.chip', { style: { borderColor: prof.color, color: prof.color, background: 'transparent' } }, `JUGADOR ${p + 1}`), h('h2', 'Tu cuenta')),
    h('div.acc-mode', icon(svc.mode === 'cloud' ? 'records' : 'user'), svc.modeLabel),
    tabs,
    recentBox,
    h('label.acc-label', { for: 'acc-name' }, 'Nombre de cuenta'), nameIn,
    h('label.acc-label', { for: 'acc-pin' }, 'PIN (4 números)'), pinIn,
    err, hint,
    h('div.dialog-actions', h('button.btn.ghost', { nav: true, onclick: () => { app.audio.play('back'); m.close(); } }, 'CANCELAR'), submitBtn));
  m.onBack = () => m.close();
  m.onEnter = (target) => {
    if (target === nameIn && !pinIn.value) pinIn.focus();
    else submit();
  };
  nameIn.setAttribute('data-autofocus', '');
  renderRecent();
  setTab('login');
  if (!svc.canWrite && svc.mode !== 'connecting') {
    tabs.querySelector('[data-t="create"]').disabled = true;
  }
  return m;
}

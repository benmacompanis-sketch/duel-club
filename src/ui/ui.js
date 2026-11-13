// UI: gestor de pantallas DOM, modales, notificaciones, previsualizaciones animadas en canvas
// y navegación completa por teclado (flechas/WASD + ENTER/F, ESC/G para volver).
import { h, icon } from './dom.js';
import { titleScreen } from './menu.js';
import { hubScreen } from './hub.js';
import { quality } from '../core/utils.js';
import { levelInfo, SPECIAL_LEVELS, LEVEL_REWARDS, ITEM_BY_ID } from '../data/catalog.js';

const DIRS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
const ACTIVATE = new Set(['Enter', 'NumpadEnter', 'Space', 'KeyF']);
const BACK = new Set(['Escape', 'Backspace', 'KeyG', 'ShiftRight']);

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('ui');
    this.modalRoot = document.getElementById('modal');
    this.toastRoot = document.getElementById('toasts');
    this.screen = null;
    this.modals = [];
    this.previews = new Set();
    this.t = 0;
    app.input.on((e) => this.onKey(e));
    // el foco sigue al mouse para que teclado y mouse convivan
    this.root.addEventListener('mouseover', (e) => this.hoverFocus(e));
    this.modalRoot.addEventListener('mouseover', (e) => this.hoverFocus(e));
  }
  get audio() {
    return this.app.audio;
  }
  hoverFocus(e) {
    const el = e.target.closest?.('[data-nav]');
    // los campos de texto solo toman foco con clic: si no, las teclas de los jugadores se escribirían ahí
    if (el && el.matches('input[type="text"], input[type="password"], textarea')) return;
    const act = document.activeElement;
    if (act && act.matches?.('input[type="text"], input[type="password"], textarea')) return;
    if (el && document.activeElement !== el && !el.disabled) {
      el.focus({ preventScroll: true });
      this.audio.play('hover', { gap: 60 });
    }
  }

  // ------------------------------------------------------------ pantallas
  show(factory, params = {}) {
    this.closeAllModals();
    const old = this.screen;
    if (old) this.disposeScreen(old);
    const scr = factory(this, params) || {};
    scr.el.classList.add('screen');
    if (quality.animations) scr.el.classList.add('enter');
    this.screen = scr;
    this.root.append(scr.el);
    requestAnimationFrame(() => scr.el.classList.remove('enter'));
    this.focusFirst(scr);
    return scr;
  }
  disposeScreen(old) {
    try { old.destroy?.(); } catch (e) { console.error(e); }
    old.disposed = true;
    for (const p of [...this.previews]) if (p.owner === old) this.previews.delete(p);
    const el = old.el;
    el.classList.add('leave');
    el.style.pointerEvents = 'none';
    setTimeout(() => el.remove(), quality.animations ? 260 : 0);
  }
  clear() {
    this.closeAllModals();
    if (this.screen) this.disposeScreen(this.screen);
    this.screen = null;
  }
  /** Muestra una pantalla y espera a que llame a done(valor). */
  ask(factory, params = {}) {
    return new Promise((resolve) => {
      this.show(factory, { ...params, done: resolve });
    });
  }
  focusFirst(layer = this.top()) {
    if (!layer) return;
    const el = layer.el.querySelector('[data-autofocus]:not([disabled])') || this.navItems(layer)[0];
    if (el) el.focus({ preventScroll: true });
    else layer.el.setAttribute('tabindex', '-1'), layer.el.focus({ preventScroll: true });
  }
  goTitle() {
    this.show(titleScreen);
  }
  goMenu() {
    this.app.runner.close();
    this.app.audio.playMusic('menu');
    this.show(hubScreen);
  }

  // ------------------------------------------------------------ modales
  modal(factory, params = {}) {
    const m = factory(this, params);
    const wrap = h('div.modal-wrap', h('div.modal-backdrop'), m.el);
    m.wrap = wrap;
    m.el.classList.add('modal');
    this.modalRoot.append(wrap);
    this.modals.push(m);
    if (quality.animations) {
      wrap.classList.add('enter');
      requestAnimationFrame(() => wrap.classList.remove('enter'));
    }
    this.focusFirst(m);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      try { m.destroy?.(); } catch {}
      for (const p of [...this.previews]) if (p.owner === m) this.previews.delete(p);
      this.modals = this.modals.filter((x) => x !== m);
      wrap.remove();
      const top = this.top();
      if (top && !top.el.contains(document.activeElement)) this.focusFirst(top);
    };
    m.close = close;
    return close;
  }
  closeAllModals() {
    for (const m of [...this.modals]) m.close?.();
    this.modals = [];
  }
  confirm({ title, text, yes = 'Sí', no = 'No', danger = true }) {
    return new Promise((resolve) => {
      let close;
      const answer = (v) => {
        close();
        this.audio.play(v ? 'confirm' : 'back');
        resolve(v);
      };
      close = this.modal(() => {
        const el = h('div.dialog',
          h('h2', title),
          text ? h('p', text) : null,
          h('div.dialog-actions',
            h('button.btn.ghost', { nav: true, 'data-autofocus': true, onclick: () => answer(false) }, no),
            h('button.btn' + (danger ? '.danger' : '.primary'), { nav: true, onclick: () => answer(true) }, yes)));
        return { el, onBack: () => answer(false) };
      });
    });
  }
  top() {
    return this.modals.length ? this.modals[this.modals.length - 1] : this.screen;
  }

  // ------------------------------------------------------------ toasts
  toast(o) {
    // cola: como mucho 2 notificaciones visibles a la vez
    this.toastQueue ||= [];
    this.toastQueue.push(o);
    this.pumpToasts();
  }
  pumpToasts() {
    while (this.toastQueue.length && this.toastRoot.querySelectorAll('.toast:not(.out)').length < 2) this.showToast(this.toastQueue.shift());
  }
  showToast(o) {
    const el = h('div.toast' + (o.kind ? '.' + o.kind : '') + (o.tier ? '.t-' + o.tier : ''),
      o.icon ? h('div.toast-badge', icon(o.icon)) : null,
      h('div.toast-body',
        h('div.toast-title', o.title || ''),
        o.name ? h('div.toast-name', o.name) : null,
        o.text ? h('div.toast-text', o.text) : null,
        o.reward ? h('div.toast-reward', o.reward) : null));
    this.toastRoot.append(el);
    const time = o.time || 3800;
    setTimeout(() => { el.classList.add('out'); this.pumpToasts(); }, time);
    setTimeout(() => el.remove(), time + 500);
  }

  /** Animación de subida de nivel (el 67 tiene su propia ceremonia). */
  levelUp(level, who = '', levels = []) {
    if (this.app.save.settings.notify?.level === false) return;
    const special = SPECIAL_LEVELS[level];
    const title = levelInfo(25 * (level - 1) * (level + 2)).title;
    const items = levels.flatMap((l) => l.items || []).map((id) => ITEM_BY_ID[id]?.name).filter(Boolean);
    const piesTotal = levels.reduce((n, l) => n + (l.pies || 0), 0);
    const el = h('div.levelup' + (level === 67 ? '.l67' : ''),
      h('div.levelup-in',
        h('small', `${who ? who.toUpperCase() + ' · ' : ''}${level === 67 ? 'EL NÚMERO SAGRADO' : 'SUBISTE DE NIVEL'}`),
        h('b', String(level)),
        h('span', special || title),
        h('em', [piesTotal ? `+${piesTotal} PIES` : null, ...items].filter(Boolean).join(' · ') || '¡Seguí así!')));
    document.getElementById('stage').append(el);
    this.audio.play(level === 67 ? 'fanfare' : 'unlock');
    const fx = this.app.renderer.overlayFx;
    fx.confetti(640, 300, level === 67 ? 260 : 90, level === 67 ? 1.6 : 1.1, false);
    if (level === 67) setTimeout(() => fx.confetti(640, 200, 200, 1.8, false), 900);
    const time = level === 67 ? 5200 : 2600;
    setTimeout(() => el.classList.add('out'), time);
    setTimeout(() => el.remove(), time + 500);
  }

  // ------------------------------------------------------------ previews (canvas animados)
  /** Registra un canvas que se redibuja cada frame mientras su pantalla exista. */
  preview(owner, w, hgt, draw, cls = '') {
    const c = h('canvas.preview' + (cls ? '.' + cls : ''));
    c.style.width = w + 'px';
    c.style.height = hgt + 'px';
    const p = { owner, canvas: c, g: c.getContext('2d'), w, h: hgt, draw, px: 0 };
    this.previews.add(p);
    return c;
  }
  frame(dt) {
    this.t += dt;
    const r = this.app.renderer;
    const px = r.scale * r.dpr;
    for (const p of this.previews) {
      if (p.owner.disposed) {
        this.previews.delete(p);
        continue;
      }
      if (!p.canvas.isConnected) {
        this.previews.delete(p); // el canvas fue reemplazado: liberar
        continue;
      }
      if (p.px !== px) {
        p.canvas.width = Math.max(1, Math.round(p.w * px));
        p.canvas.height = Math.max(1, Math.round(p.h * px));
        p.px = px;
        p.static = false;
      }
      if (p.static) continue;
      const g = p.g;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, p.canvas.width, p.canvas.height);
      g.setTransform(px, 0, 0, px, 0, 0);
      try {
        const keep = p.draw(g, p.w, p.h, this.t, dt);
        if (keep === 'static' || !quality.animations) p.static = true;
      } catch (e) {
        console.error(e);
        this.previews.delete(p);
      }
    }
  }

  // ------------------------------------------------------------ navegación
  navItems(layer) {
    return [...layer.el.querySelectorAll('[data-nav]')].filter((el) => !el.disabled && el.offsetParent !== null && !el.closest('.hidden'));
  }
  onKey(e) {
    const layer = this.top();
    if (!layer || layer.el.classList.contains('leave')) return;
    if (this.app.runner.active && this.app.runner.state !== 'intro' && this.app.runner.state !== 'done' && !this.modals.length) return;
    if (e.typing) {
      if (e.event.target?.tagName === 'TEXTAREA' && (e.code === 'Enter' || e.code === 'NumpadEnter')) return;
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && layer.onEnter) {
        e.event.preventDefault();
        e.handled = true;
        layer.onEnter(e.event.target);
      } else if (e.code === 'Escape' && this.modals.includes(layer) && layer.onBack) {
        // ESC dentro de un campo de una ventana: cerrarla
        e.event.preventDefault();
        e.handled = true;
        layer.onBack();
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape') {
        e.event.preventDefault();
        e.event.target.blur();
        const next = this.navItems(layer).find((el) => !el.matches('input[type="text"], input[type="password"], textarea'));
        next?.focus({ preventScroll: true });
      }
      return;
    }
    if (layer.onKey && layer.onKey(e) === true) {
      e.event.preventDefault();
      e.handled = true; // evita que otro listener (p. ej. la pausa) procese la misma tecla
      return;
    }
    if (layer.nav === false) return;
    const code = e.code;
    const active = document.activeElement;
    if (DIRS[code]) {
      e.event.preventDefault();
      const dir = DIRS[code];
      if (active && active.type === 'range' && layer.el.contains(active) && (dir === 'left' || dir === 'right')) {
        const step = Number(active.step || 1) * (dir === 'left' ? -1 : 1);
        active.value = String(Math.min(Number(active.max), Math.max(Number(active.min), Number(active.value) + step)));
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      this.move(layer, dir);
    } else if (ACTIVATE.has(code)) {
      if (e.repeat) return;
      e.event.preventDefault();
      e.handled = true;
      if (active && layer.el.contains(active) && active.hasAttribute('data-nav')) {
        if (active.tagName === 'INPUT' && active.type === 'text') active.focus();
        else active.click();
      }
    } else if (BACK.has(code)) {
      if (e.repeat) return;
      e.event.preventDefault();
      e.handled = true;
      if (layer.onBack) {
        layer.onBack();
      }
    }
  }
  move(layer, dir) {
    const items = this.navItems(layer);
    if (!items.length) return;
    const cur = document.activeElement;
    if (!cur || !items.includes(cur)) {
      items[0].focus({ preventScroll: true });
      return;
    }
    const r0 = cur.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const dx = x - cx, dy = y - cy;
      let main, cross;
      if (dir === 'up') { main = -dy; cross = Math.abs(dx); if (r.bottom > r0.top + 2) continue; }
      else if (dir === 'down') { main = dy; cross = Math.abs(dx); if (r.top < r0.bottom - 2) continue; }
      else if (dir === 'left') { main = -dx; cross = Math.abs(dy); if (r.right > r0.left + 2) continue; }
      else { main = dx; cross = Math.abs(dy); if (r.left < r0.right - 2) continue; }
      if (main <= 0) continue;
      const score = main + cross * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) {
      best.focus({ preventScroll: true });
      best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.audio.play('hover');
    }
  }
}

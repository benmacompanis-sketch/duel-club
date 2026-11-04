// Componentes de UI reutilizables: encabezados, grupos de opciones, interruptores e íconos de juego.
import { h, icon } from './dom.js';

export function header(ui, title, sub, onBack, extra = null) {
  return h('div.page-header',
    h('button.icon-btn', { nav: true, title: 'Volver', onclick: () => { ui.app.audio.play('back'); onBack(); } }, icon('back')),
    h('div.grow', h('h1', title), sub ? h('p', sub) : null),
    extra);
}

/** Grupo segmentado. choices: [[valor, etiqueta], ...] */
export function segGroup(label, sub, choices, get, set, ui) {
  const seg = h('div.seg');
  const render = () => {
    seg.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', String(get()) === b.dataset.v));
  };
  for (const [v, lab, ic] of choices) {
    seg.append(h('button.seg-btn', {
      nav: true, dataset: { v: String(v) },
      onclick: () => { set(v); render(); ui?.app.audio.play('click'); },
    }, ic ? icon(ic) : null, lab));
  }
  render();
  const el = h('div.opt', h('div.opt-label', h('b', label), sub ? h('span', sub) : null), seg);
  el.refresh = render;
  return el;
}

export function toggleRow(label, sub, get, set, ui) {
  const t = h('button.toggle', { nav: true, 'aria-label': label });
  const render = () => t.classList.toggle('on', !!get());
  t.addEventListener('click', () => { set(!get()); render(); ui?.app.audio.play('click'); });
  render();
  return h('div.opt', h('div.opt-label', h('b', label), sub ? h('span', sub) : null), t);
}

export function rangeRow(label, sub, min, max, step, get, set, fmt = (v) => Math.round(v * 100) + '%') {
  const val = h('span.range-val', fmt(get()));
  const r = h('input', { type: 'range', min, max, step, value: get(), nav: true, 'aria-label': label });
  const paint = () => r.style.setProperty('--v', ((r.value - min) / (max - min)) * 100 + '%');
  r.addEventListener('input', () => { set(Number(r.value)); val.textContent = fmt(Number(r.value)); paint(); });
  paint();
  return h('div.opt', h('div.opt-label', h('b', label), sub ? h('span', sub) : null), r, val);
}

/** Canvas animado con el ícono de un minijuego. */
export function gameIcon(ui, owner, meta, size) {
  return ui.preview(owner, size, size, (g, w, hh, t) => {
    g.save();
    g.scale(w / 200, hh / 200);
    meta.drawIcon(g, t);
    g.restore();
  });
}

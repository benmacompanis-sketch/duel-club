// Pequeñas utilidades DOM + íconos SVG originales para la interfaz.
import { keyName } from '../core/inputManager.js';

/** h('div.card#id', {onclick, style, attrs}, ...hijos) */
export function h(sel, props = {}, ...children) {
  const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1));
      else el.id = part.slice(1);
    }
  }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = {};
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className += ' ' + v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) el.style.setProperty(sk, String(sv));
        else el.style[sk] = sv;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'nav') el.setAttribute('data-nav', '');
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function keycap(code, big = false) {
  return h('span.keycap' + (big ? '.big' : ''), keyName(code));
}
export function keycapsFor(input, p, actions) {
  return actions.map((a) => keycap(input.bindings[p][a][0]));
}

const I = (d, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  duel: I('<path d="M4 3l7 7-2 2-7-7V3zM20 3v2l-9 9 2 2 9-9V3h-2z" fill="currentColor"/><path d="M5 15l4 4-2 2-2-2-2 2-1-1 2-2-2-2zM19 15l-4 4 2 2 2-2 2 2 1-1-2-2 2-2z" fill="currentColor"/>'),
  quick: I('<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>'),
  tournament: I('<path d="M7 3h10v3h4v3a5 5 0 01-5 5h-.3A5 5 0 0113 16.7V19h3v2H8v-2h3v-2.3A5 5 0 018.3 14H8a5 5 0 01-5-5V6h4zm-2 5v1a3 3 0 002 2.8V8zm14 0h-2v3.8A3 3 0 0019 9z" fill="currentColor"/>'),
  survival: I('<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z" fill="currentColor"/>'),
  records: I('<path d="M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z" fill="currentColor"/>'),
  settings: I('<path d="M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM10.5 2h3l.5 2.6 1.9.8 2.2-1.5 2.1 2.1-1.5 2.2.8 1.9 2.5.4v3l-2.6.5-.8 1.9 1.5 2.2-2.1 2.1-2.2-1.5-1.9.8-.4 2.5h-3l-.5-2.6-1.9-.8-2.2 1.5-2.1-2.1 1.5-2.2-.8-1.9L2 13.5v-3l2.6-.5.8-1.9-1.5-2.2L6 3.8l2.2 1.5 1.9-.8z" fill="currentColor" fill-rule="evenodd"/>'),
  back: I('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  play: I('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  fullscreen: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  user: I('<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor"/>'),
  lock: I('<path d="M7 10V7a5 5 0 0110 0v3h1.5v11h-13V10zm2.5 0h5V7a2.5 2.5 0 00-5 0z" fill="currentColor"/>'),
  check: I('<path d="M4 12l5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  shuffle: I('<path d="M3 7h4l9 10h5M3 17h4l3-3.4M14 10.4L16 7h5M18 4l3 3-3 3M18 14l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  list: I('<path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="4" cy="6" r="1.6" fill="currentColor"/><circle cx="4" cy="12" r="1.6" fill="currentColor"/><circle cx="4" cy="18" r="1.6" fill="currentColor"/>'),
  close: I('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'),
  heart: I('<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z" fill="currentColor"/>'),
  sound: I('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8a5 5 0 010 8M18.5 5.5a8.5 8.5 0 010 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  // íconos de logros
  trophy: I('<path d="M7 3h10v3h4v3a5 5 0 01-5 5h-.3A5 5 0 0113 16.7V19h3v2H8v-2h3v-2.3A5 5 0 018.3 14H8a5 5 0 01-5-5V6h4z" fill="currentColor"/>'),
  star: I('<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z" fill="currentColor"/>'),
  medal: I('<path d="M7 2h4l1 4 1-4h4l-3 7a6 6 0 11-4 0z" fill="currentColor"/>'),
  flame: I('<path d="M12 2s6 5 6 11a6 6 0 01-12 0c0-3 2-5 2-5s0 3 2 4c0-5 2-10 2-10z" fill="currentColor"/>'),
  crown: I('<path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z" fill="currentColor"/>'),
  clock: I('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 7v5l3 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  hair: I('<path d="M4 20C8 14 9 8 8 3M12 20c2-6 2-11 1-17M20 20c-3-5-4-10-3-16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  arrow: I('<path d="M3 17l6-6 4 4 8-8M15 7h6v6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  bolt: I('<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>'),
  flag: I('<path d="M5 21V3h2v1h12l-3 5 3 5H7v7z" fill="currentColor"/>'),
  shield: I('<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/>'),
  boot: I('<path d="M6 3h6v9l7 3a3 3 0 012 3v2H4v-3l2-1z" fill="currentColor"/>'),
  ball: I('<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M3 12h18M12 3v18M6 5.5c3 3 3 10 0 13M18 5.5c-3 3-3 10 0 13" fill="none" stroke="#0B1020" stroke-width="1.5"/>'),
  card: I('<rect x="4" y="3" width="11" height="15" rx="2" fill="currentColor" opacity=".5"/><rect x="9" y="6" width="11" height="15" rx="2" fill="currentColor"/>'),
  brush: I('<path d="M20 3l1 1-9 10-2-2zM9 13l2 2c0 3-2 6-7 6 2-2 1-4 2-6s3-2 3-2z" fill="currentColor"/>'),
  fist: I('<path d="M6 8h11a3 3 0 013 3v4a6 6 0 01-6 6h-3a5 5 0 01-5-5zM6 8V5h3v3M10 8V4h3v4M14 8V5h3v3" fill="currentColor"/>'),
  target: I('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'),
  note: I('<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="6.5" cy="18" r="3" fill="currentColor"/><circle cx="17.5" cy="16" r="3" fill="currentColor"/>'),
  fish: I('<path d="M2 12c3-5 9-6 14-2l5-4v12l-5-4c-5 4-11 3-14-2z" fill="currentColor"/><circle cx="7" cy="11" r="1.2" fill="#0B1020"/>'),
  blocks: I('<path d="M3 13h6v6H3zM9 13h6v6H9zM9 7h6v6H9zM15 13h6v6h-6z" fill="currentColor"/>'),
};
export function icon(name) {
  const s = h('span.icon');
  s.innerHTML = ICONS[name] || '';
  return s;
}

export function toggleFullscreen() {
  try {
    // la promesa puede rechazarse (p. ej. dentro de un iframe o en móviles): se ignora
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })?.catch?.(() => {});
    else document.exitFullscreen?.()?.catch?.(() => {});
  } catch (e) {
    console.warn(e);
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

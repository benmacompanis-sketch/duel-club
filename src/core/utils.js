// Utilidades matemáticas, de color y de dibujo compartidas por todo el juego.

export const TAU = Math.PI * 2;
export const W = 1280; // resolución lógica del escenario
export const H = 720;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
// Azar "visual" (partículas, sonido, temblores de dibujo): usa siempre el Math.random original del navegador.
// En las partidas online Math.random se reemplaza por un RNG con semilla compartida mientras se simula,
// y lo puramente visual no debe consumir esa secuencia (depende de la calidad gráfica de cada compu).
export const NATIVE_RANDOM = Math.random.bind(Math);
export const vrand = (a = 0, b = 1) => a + NATIVE_RANDOM() * (b - a);
export const vchoice = (arr) => arr[Math.floor(NATIVE_RANDOM() * arr.length)];
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const approach = (v, target, delta) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const wrapAngle = (a) => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// RNG con semilla: permite que ambos jugadores reciban exactamente la misma secuencia (justicia).
export function mulberry32(seed) {
  // el estado queda en f.s para poder copiarlo y restaurarlo (rollback del modo online)
  const f = function () {
    f.s = (f.s + 0x6d2b79f5) >>> 0;
    let t = f.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.s = seed >>> 0;
  f.__rng = true;
  return f;
}
export const newSeed = () => (Math.random() * 2 ** 31) | 0;

// --- easing ---
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};

// --- colores ---
const rgbCache = new Map();
export function hexToRgb(hex) {
  let c = rgbCache.get(hex);
  if (c) return c;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  rgbCache.set(hex, c);
  return c;
}
export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
// amt > 0 aclara, amt < 0 oscurece
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return clamp(Math.round(out), 0, 255);
  };
  return '#' + [f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return '#' + a.map((v, i) => clamp(Math.round(lerp(v, b[i], t)), 0, 255).toString(16).padStart(2, '0')).join('');
}

export const PALETTE = {
  bg: '#15121F',
  bg2: '#1F1A2E',
  bg3: '#2A2440',
  p1: '#2E7BFF',
  p2: '#FF4B3E',
  violet: '#FFD23F',
  green: '#3DDC97',
  white: '#FFF4E0',
  yellow: '#FFD23F',
  muted: '#A79FB8',
};

// --- formato ---
export function fmtTime(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
export function fmtDuration(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min ${s} s`;
  return `${s} s`;
}
export function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('es', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// --- dibujo ---
export function roundRect(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export const FONT_DISPLAY = '"Bangers", "Lilita One", "Nunito Variable", system-ui, sans-serif';
export const FONT_BODY = '"Nunito Variable", "Nunito", system-ui, sans-serif';

/** Texto con opciones de contorno y brillo. */
export function text(g, str, x, y, o = {}) {
  const size = o.size || 24;
  g.save();
  g.font = `${o.weight || (o.body ? 600 : 400)} ${size}px ${o.body ? FONT_BODY : FONT_DISPLAY}`;
  g.textAlign = o.align || 'center';
  g.textBaseline = o.baseline || 'middle';
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  // letras de historieta: los títulos grandes llevan contorno de tinta y sombra dura (en lugar de brillo)
  const comic = !o.body && size >= 20 && o.comic !== false;
  const stroke = o.stroke || (comic ? '#0D0B14' : null);
  if (comic) {
    const d = Math.max(2, size * 0.07);
    g.lineJoin = 'round';
    g.lineWidth = o.strokeWidth || Math.max(3, size * 0.16);
    g.strokeStyle = '#0D0B14';
    g.fillStyle = '#0D0B14';
    g.strokeText(str, x + d, y + d);
    g.fillText(str, x + d, y + d);
  } else if (o.glow && quality.glow) {
    g.shadowColor = o.glow;
    g.shadowBlur = o.glowSize || size * 0.6;
  }
  if (stroke) {
    g.lineJoin = 'round';
    g.lineWidth = o.strokeWidth || Math.max(3, size * 0.16);
    g.strokeStyle = stroke;
    g.strokeText(str, x, y);
  }
  g.fillStyle = o.color || PALETTE.white;
  g.fillText(str, x, y);
  g.restore();
}

export function panel(g, x, y, w, h, o = {}) {
  // panel de historieta: sombra dura de tinta, relleno casi opaco, contorno de tinta grueso y el color por dentro
  const r = Math.min(o.r ?? 18, 8);
  g.save();
  roundRect(g, x + 4, y + 4, w, h, r);
  g.fillStyle = 'rgba(13,11,20,0.85)';
  g.fill();
  roundRect(g, x, y, w, h, r);
  let fill = o.fill || '#221C33';
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(fill);
  if (m && Number(m[4]) < 0.9) fill = `rgba(${m[1]},${m[2]},${m[3]},${Math.max(0.92, Number(m[4]))})`;
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = (o.lineWidth || 2) + 3;
  g.strokeStyle = '#0D0B14';
  g.stroke();
  if (o.stroke) {
    roundRect(g, x + 3.5, y + 3.5, w - 7, h - 7, Math.max(0, r - 3));
    g.lineWidth = o.lineWidth || 2;
    g.strokeStyle = o.stroke;
    g.stroke();
  }
  g.restore();
}

// ------------------------------------------------------------------ piezas de historieta
const INK = '#0D0B14';
/** Estallido de cómic (globo de impacto) con contorno de tinta y sombra dura. */
export function burst(g, x, y, r, color, o = {}) {
  const n = o.points || 14, rot = o.rot || 0, inner = o.inner ?? 0.72, sx = o.sx || 1.25;
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const rr = i % 2 ? r * inner * (0.92 + ((i * 37) % 7) / 50) : r * (0.94 + ((i * 53) % 9) / 60);
    pts.push([x + Math.cos(a) * rr * sx, y + Math.sin(a) * rr]);
  }
  const path = () => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); };
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.translate(6, 6); path(); g.fillStyle = INK; g.fill(); g.translate(-6, -6);
  path(); g.fillStyle = color; g.fill();
  g.lineJoin = 'round'; g.lineWidth = o.line || 5; g.strokeStyle = INK; g.stroke();
  g.restore();
}
/** Panel inclinado de historieta: color sólido, tramado, tinta gruesa y sombra dura. */
export function comicPanel(g, x, y, w, h, fill, o = {}) {
  const sk = o.skew ?? 10;
  const path = (dx = 0, dy = 0) => {
    g.beginPath();
    g.moveTo(x + sk + dx, y + dy); g.lineTo(x + w + dx, y + (o.tilt || 0) + dy);
    g.lineTo(x + w - sk + dx, y + h + dy); g.lineTo(x + dx, y + h - (o.tilt || 0) + dy); g.closePath();
  };
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  path(5, 5); g.fillStyle = INK; g.fill();
  path(); g.fillStyle = fill; g.fill();
  if (o.dots !== false) { g.save(); path(); g.clip(); g.fillStyle = halftone(g, o.dotColor || 'rgba(13,11,20,0.22)'); g.fillRect(x, y, w, h); g.restore(); }
  path(); g.lineWidth = o.line || 4; g.lineJoin = 'round'; g.strokeStyle = INK; g.stroke();
  g.restore();
}
const htCache = new Map();
/** Patrón de tramado de puntos (se cachea por color). */
/**
 * Capa QUIETA de pantalla completa (fondo del escenario, textura de puntos): se dibuja una sola vez a la resolución
 * real de la pantalla y después solo se copia. Rellenar con un patrón toda la pantalla en cada cuadro era lo que más
 * gastaba en los celulares (millones de píxeles por cuadro en pantallas de alta densidad).
 */
const LAYERS = new Map();
export function cachedLayer(g, key, draw) {
  const t = g.getTransform();
  const sx = Math.hypot(t.a, t.b) || 1;
  const k = key + '@' + sx.toFixed(3);
  let c = LAYERS.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * sx));
    c.height = Math.max(1, Math.round(H * sx));
    const cg = c.getContext('2d');
    cg.scale(c.width / W, c.height / H);
    draw(cg);
    if (LAYERS.size > 12) LAYERS.delete(LAYERS.keys().next().value);
    LAYERS.set(k, c);
  }
  g.drawImage(c, 0, 0, W, H);
}

export function halftone(g, color = 'rgba(13,11,20,0.2)', step = 9, r = 1.9) {
  const key = color + step + r;
  let pat = htCache.get(key);
  if (pat) return pat;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(step, step) : Object.assign(document.createElement('canvas'), { width: step, height: step });
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.beginPath(); x.arc(step / 2, step / 2, r, 0, Math.PI * 2); x.fill();
  pat = g.createPattern(c, 'repeat');
  htCache.set(key, pat);
  return pat;
}

export function glowCircle(g, x, y, r, color, alpha = 1) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, rgba(color, 0.55 * alpha));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// Calidad visual global (la ajusta Settings): afecta brillo, partículas y resolución.
export const quality = {
  level: 'high',
  glow: false,
  particles: 1,
  dprCap: 2,
  animations: true,
  set(level, animations = true) {
    this.level = level;
    this.animations = animations;
    // estilo historieta: sin brillos neón (tinta y sombras duras); el halo queda solo para efectos puntuales
    this.glow = false;
    this.particles = level === 'high' ? 1 : level === 'medium' ? 0.6 : 0.3;
    this.dprCap = level === 'high' ? 2 : level === 'medium' ? 1.5 : 1;
  },
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

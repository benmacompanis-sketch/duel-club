// Personajes originales de DUEL CLUB, dibujados 100% con Canvas.
// Cada uno tiene silueta, personalidad y detalles propios; el cuerpo toma el color del
// jugador para que siempre se identifique a quién pertenece.
// Animaciones: idle, run, jump, fall, win, lose, celebrate, attack, block, hurt, dizzy.
import { TAU, shade, mix, rgba, roundRect, quality } from './utils.js';

export const CHARACTERS = [
  { id: 'volt', name: 'Volt', title: 'El robot optimista', accent: '#7CF7FF', accent2: '#FFD84D', unlock: null,
    bio: 'Funciona a pura energía positiva. Su antena se ilumina cuando huele una victoria.' },
  { id: 'mochi', name: 'Mochi', title: 'La gelatina imparable', accent: '#FF9ECF', accent2: '#FFFFFF', unlock: null,
    bio: 'Blandita por fuera, competitiva por dentro. Rebota de cualquier derrota.' },
  { id: 'pico', name: 'Pico', title: 'El ave veloz', accent: '#FFB547', accent2: '#FFE08A', unlock: null,
    bio: 'Nunca aprendió a volar, así que aprendió a correr más rápido que nadie.' },
  { id: 'brik', name: 'Brik', title: 'El gólem de bloques', accent: '#FFE066', accent2: '#2A2F45', unlock: null,
    bio: 'Construido ladrillo a ladrillo. Lento para hablar, rapidísimo para ganar.' },
  { id: 'nimbus', name: 'Nimbus', title: 'El espíritu de tormenta', accent: '#FFE45C', accent2: '#BFE9FF', unlock: 'first_win',
    bio: 'Siempre parece dormido... hasta que cae el primer rayo.' },
  { id: 'fang', name: 'Fang', title: 'La zorrita astuta', accent: '#FFF1DC', accent2: '#FF8FB1', unlock: 'five_wins',
    bio: 'Lee a sus rivales como un libro abierto. Y se ríe del final.' },
  { id: 'ozzy', name: 'Ozzy', title: 'El visitante de un ojo', accent: '#B8FF6A', accent2: '#FFFFFF', unlock: 'streak3',
    bio: 'Vino de otra galaxia a estudiar los juegos terrestres. Ya es adicto.' },
  { id: 'rex', name: 'Rex', title: 'El mini dino campeón', accent: '#FFD23F', accent2: '#FFFFFF', unlock: 'champion',
    bio: 'Bracitos cortos, ambición enorme. Solo aparece ante verdaderos campeones.' },
];
export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export const ACCESSORIES = [
  { id: 'none', name: 'Ninguno', unlock: null },
  { id: 'cap', name: 'Gorra', unlock: null },
  { id: 'bow', name: 'Moño', unlock: null },
  { id: 'party', name: 'Gorro de fiesta', unlock: null },
  { id: 'headphones', name: 'Auriculares', unlock: 'beat_perfect' },
  { id: 'shades', name: 'Gafas de sol', unlock: 'lightning' },
  { id: 'helmet', name: 'Casco de piloto', unlock: 'clean_race' },
  { id: 'halo', name: 'Aureola', unlock: 'by_a_hair' },
  { id: 'horns', name: 'Casco vikingo', unlock: 'survivor' },
  { id: 'tophat', name: 'Galera', unlock: 'tournament_king' },
  { id: 'crown', name: 'Corona', unlock: 'all_games' },
];
export const ACC_BY_ID = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a]));

export const PLAYER_COLORS = [
  { id: 'blue', hex: '#3985FF', name: 'Azul' },
  { id: 'red', hex: '#FF654F', name: 'Rojo' },
  { id: 'violet', hex: '#9B6CFF', name: 'Violeta' },
  { id: 'green', hex: '#48D597', name: 'Verde' },
  { id: 'yellow', hex: '#FFC23C', name: 'Amarillo' },
  { id: 'pink', hex: '#FF5FA2', name: 'Rosa' },
  { id: 'cyan', hex: '#25CFE6', name: 'Turquesa' },
  { id: 'orange', hex: '#FF8E3C', name: 'Naranja' },
];

// ----------------------------------------------------------------------------------
// Estado de animación común
// ----------------------------------------------------------------------------------
function animState(anim, t, seed) {
  const s = {
    y: 0, sx: 1, sy: 1, rot: 0, armL: 0.25, armR: 0.25, leg: 0, eyes: 'open', mouth: 'smile',
    gray: 0, look: 0.4, headY: 0, flip: 1, shake: 0,
  };
  const blink = (t + seed) % 3.4 < 0.12;
  switch (anim) {
    case 'idle':
      s.sy = 1 + Math.sin(t * 2.6) * 0.025;
      s.sx = 1 - Math.sin(t * 2.6) * 0.015;
      s.armL = 0.25 + Math.sin(t * 2.6) * 0.06;
      s.armR = 0.25 + Math.sin(t * 2.6 + 1) * 0.06;
      if (blink) s.eyes = 'closed';
      break;
    case 'run': {
      const ph = t * 13;
      s.y = -Math.abs(Math.sin(ph)) * 7;
      s.rot = 0.12;
      s.leg = Math.sin(ph);
      s.armL = 0.9 * Math.sin(ph);
      s.armR = -0.9 * Math.sin(ph);
      s.sy = 1 + Math.cos(ph * 2) * 0.03;
      s.mouth = 'open';
      if (blink) s.eyes = 'closed';
      break;
    }
    case 'jump':
      s.sy = 1.08; s.sx = 0.93; s.armL = 2.4; s.armR = 2.2; s.mouth = 'o'; s.leg = 0.6;
      break;
    case 'fall':
      s.armL = 2.6 + Math.sin(t * 22) * 0.5; s.armR = 2.6 - Math.sin(t * 22) * 0.5; s.eyes = 'hurt'; s.mouth = 'o';
      s.rot = Math.sin(t * 9) * 0.2;
      break;
    case 'win': {
      const ph = t * 6;
      s.y = -Math.abs(Math.sin(ph)) * 22;
      s.sy = 1 + Math.cos(ph * 2) * 0.05;
      s.armL = 2.7 + Math.sin(ph * 2) * 0.25;
      s.armR = 2.7 - Math.sin(ph * 2) * 0.25;
      s.eyes = 'happy'; s.mouth = 'open';
      break;
    }
    case 'celebrate': {
      const ph = t * 7;
      s.y = -Math.abs(Math.sin(ph)) * 16;
      s.flip = Math.cos(t * 3.5) >= 0 ? 1 : -1;
      s.sx = 0.75 + Math.abs(Math.cos(t * 3.5)) * 0.25;
      s.armL = 2.4 + Math.sin(ph * 2) * 0.6;
      s.armR = 1.2 + Math.sin(ph * 2 + 2) * 0.8;
      s.eyes = 'happy'; s.mouth = 'open';
      break;
    }
    case 'lose':
      s.sy = 0.93; s.sx = 1.04; s.rot = Math.sin(t * 1.4) * 0.04; s.headY = 4;
      s.armL = 0.05; s.armR = 0.05; s.eyes = 'sad'; s.mouth = 'sad'; s.gray = 0.4; s.look = 0;
      break;
    case 'attack':
      s.rot = 0.18; s.armR = 1.65; s.armL = -0.4; s.eyes = 'angry'; s.mouth = 'open'; s.sx = 1.06;
      break;
    case 'block':
      s.rot = -0.08; s.armR = 2.0; s.armL = 1.9; s.eyes = 'angry'; s.mouth = 'flat'; s.sy = 0.96;
      break;
    case 'hurt':
      s.rot = -0.22; s.armL = 1.4; s.armR = 1.6; s.eyes = 'hurt'; s.mouth = 'o'; s.shake = 2;
      break;
    case 'dizzy':
      s.rot = Math.sin(t * 5) * 0.12; s.eyes = 'dizzy'; s.mouth = 'o'; s.armL = 0.6; s.armR = 0.6;
      break;
    case 'aim':
      s.armR = 2.2; s.armL = 1.0; s.look = 0.8; s.eyes = 'open'; s.mouth = 'flat';
      if (blink) s.eyes = 'closed';
      break;
    case 'throw':
      s.armR = 2.9; s.armL = 1.6; s.y = -6; s.eyes = 'open'; s.mouth = 'open';
      break;
    default:
      if (blink) s.eyes = 'closed';
  }
  return s;
}

// Ojos genéricos según la emoción.
function drawEye(g, x, y, r, mode, look, color = '#0E1428', white = true) {
  g.save();
  g.translate(x, y);
  g.lineCap = 'round';
  g.lineWidth = Math.max(1.6, r * 0.42);
  g.strokeStyle = color;
  switch (mode) {
    case 'closed':
      g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke(); break;
    case 'happy':
      g.beginPath(); g.arc(0, r * 0.4, r * 0.9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); break;
    case 'sad':
      g.beginPath(); g.arc(0, -r * 0.6, r * 0.9, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      g.fillStyle = 'rgba(140,200,255,0.9)';
      g.beginPath(); g.ellipse(r * 0.6, r * 1.1, r * 0.28, r * 0.42, 0, 0, TAU); g.fill();
      break;
    case 'hurt':
      g.beginPath(); g.moveTo(-r * 0.8, -r * 0.6); g.lineTo(r * 0.6, 0); g.lineTo(-r * 0.8, r * 0.6); g.stroke(); break;
    case 'dizzy':
      g.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = i * 0.7, rr = (i / 18) * r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.stroke();
      break;
    case 'angry':
      if (white) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); g.fill(); }
      g.fillStyle = color; g.beginPath(); g.arc(look * r * 0.4, r * 0.1, r * 0.55, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-r * 1.2, -r * 1.25); g.lineTo(r * 1.1, -r * 0.65); g.stroke();
      break;
    default:
      if (white) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, r, r * 1.1, 0, 0, TAU); g.fill(); }
      g.fillStyle = color;
      g.beginPath(); g.ellipse(look * r * 0.35, r * 0.08, r * 0.62, r * 0.7, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(look * r * 0.35 + r * 0.25, -r * 0.25, r * 0.22, 0, TAU); g.fill();
  }
  g.restore();
}
function drawMouth(g, x, y, w, mode, color = '#0E1428') {
  g.save();
  g.translate(x, y);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = Math.max(1.6, w * 0.22);
  g.lineCap = 'round';
  g.beginPath();
  switch (mode) {
    case 'open':
      g.moveTo(-w, 0); g.quadraticCurveTo(0, w * 1.6, w, 0); g.closePath(); g.fill();
      g.fillStyle = '#FF7A8A'; g.beginPath(); g.ellipse(0, w * 0.55, w * 0.45, w * 0.25, 0, 0, TAU); g.fill();
      break;
    case 'sad': g.arc(0, w * 0.8, w * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); break;
    case 'o': g.ellipse(0, w * 0.2, w * 0.4, w * 0.5, 0, 0, TAU); g.fill(); break;
    case 'flat': g.moveTo(-w * 0.6, 0); g.lineTo(w * 0.6, 0); g.stroke(); break;
    default: g.arc(0, -w * 0.3, w * 0.75, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }
  g.restore();
}
// Brazo simple: ángulo 0 = colgando, PI/2 = hacia adelante, PI = arriba.
function limb(g, x, y, ang, len, width, color, handR, handColor) {
  const ex = x + Math.sin(ang) * len, ey = y + Math.cos(ang) * len;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
  if (handR) {
    g.fillStyle = handColor || color;
    g.beginPath(); g.arc(ex, ey, handR, 0, TAU); g.fill();
  }
  return [ex, ey];
}

// ----------------------------------------------------------------------------------
// Dibujos individuales (mirando a la derecha, pies en 0,0, altura ~100)
// ----------------------------------------------------------------------------------
const DRAW = {
  volt(g, s, c, t, ch) {
    const dark = '#4B5675', metal = '#AEB8D6';
    // piernas
    const lp = s.leg * 6;
    g.fillStyle = dark;
    roundRect(g, -16, -18 - Math.max(0, lp), 10, 18, 3); g.fill();
    roundRect(g, 6, -18 - Math.max(0, -lp), 10, 18, 3); g.fill();
    g.fillStyle = shade(c.body, -0.4);
    roundRect(g, -19, -6 - Math.max(0, lp), 15, 7, 3); g.fill();
    roundRect(g, 4, -6 - Math.max(0, -lp), 15, 7, 3); g.fill();
    // brazo trasero
    limb(g, -22, -44, -s.armL, 20, 6, metal, 6, c.body);
    // cuerpo
    g.fillStyle = c.body;
    roundRect(g, -23, -54, 46, 40, 10); g.fill();
    g.fillStyle = c.dark;
    roundRect(g, -23, -24, 46, 10, 5); g.fill();
    g.fillStyle = '#0E1630';
    roundRect(g, -12, -46, 24, 16, 5); g.fill();
    const blink = Math.sin(t * 4) > 0;
    g.fillStyle = blink ? ch.accent2 : shade(ch.accent2, -0.4);
    g.beginPath(); g.arc(-5, -38, 3, 0, TAU); g.fill();
    g.fillStyle = ch.accent;
    g.beginPath(); g.arc(5, -38, 3, 0, TAU); g.fill();
    // cabeza
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = c.light;
    roundRect(g, -27, -96, 54, 42, 12); g.fill();
    g.fillStyle = c.dark;
    roundRect(g, -31, -82, 6, 14, 3); g.fill();
    roundRect(g, 25, -82, 6, 14, 3); g.fill();
    g.fillStyle = '#0E1630';
    roundRect(g, -20, -89, 40, 28, 8); g.fill();
    // ojos de pantalla
    g.save();
    if (quality.glow) { g.shadowColor = ch.accent; g.shadowBlur = 8; }
    g.strokeStyle = ch.accent; g.fillStyle = ch.accent; g.lineWidth = 3; g.lineCap = 'round';
    const ex = 4 * s.look;
    for (const sx of [-8, 8]) {
      g.beginPath();
      if (s.eyes === 'closed') { g.moveTo(sx - 4 + ex, -76); g.lineTo(sx + 4 + ex, -76); g.stroke(); }
      else if (s.eyes === 'happy') { g.arc(sx + ex, -73, 4.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (s.eyes === 'sad') { g.arc(sx + ex, -80, 4.5, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
      else if (s.eyes === 'hurt' || s.eyes === 'dizzy') { g.moveTo(sx - 4, -80); g.lineTo(sx + 4, -72); g.moveTo(sx + 4, -80); g.lineTo(sx - 4, -72); g.stroke(); }
      else if (s.eyes === 'angry') { roundRect(g, sx - 4 + ex, -78, 8, 6, 2); g.fill(); g.beginPath(); g.moveTo(sx - 5, -84 + (sx < 0 ? 0 : 2)); g.lineTo(sx + 5, -84 + (sx < 0 ? 2 : 0)); g.stroke(); }
      else { roundRect(g, sx - 3.5 + ex, -81, 7, 10, 3); g.fill(); }
    }
    g.lineWidth = 2;
    g.beginPath();
    if (s.mouth === 'open') { g.arc(ex, -68, 4, 0, Math.PI); g.fill(); }
    else if (s.mouth === 'sad') { g.arc(ex, -64, 4, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
    else if (s.mouth === 'o') { g.arc(ex, -67, 2.5, 0, TAU); g.stroke(); }
    else { g.moveTo(ex - 4, -67); g.lineTo(ex + 4, -67); g.stroke(); }
    g.restore();
    // antena
    g.strokeStyle = metal; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -96); g.lineTo(Math.sin(t * 3) * 3, -108); g.stroke();
    g.fillStyle = ch.accent2;
    if (quality.glow) { g.shadowColor = ch.accent2; g.shadowBlur = 10 + Math.sin(t * 5) * 4; }
    g.beginPath(); g.arc(Math.sin(t * 3) * 3, -110, 4.5, 0, TAU); g.fill();
    g.shadowBlur = 0;
    g.restore();
    limb(g, 22, -44, s.armR, 20, 6, metal, 6.5, c.body);
  },

  mochi(g, s, c, t, ch) {
    const wob = Math.sin(t * 5) * 2;
    // brazo trasero (nub)
    const nub = (side, ang) => {
      const x = side * 30 + Math.sin(ang) * 10 * side, y = -26 - Math.cos(ang) * -8 - Math.sin(ang) * 14;
      g.fillStyle = c.dark;
      g.beginPath(); g.ellipse(x, y, 8, 6, side * 0.5, 0, TAU); g.fill();
    };
    nub(-1, s.armL);
    const grad = g.createLinearGradient(0, -74, 0, 0);
    grad.addColorStop(0, c.light);
    grad.addColorStop(1, c.body);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-38, -2);
    g.bezierCurveTo(-44 - wob, -40, -24, -76 + wob, 0, -76 + wob);
    g.bezierCurveTo(24, -76 + wob, 44 + wob, -40, 38, -2);
    g.quadraticCurveTo(0, 4, -38, -2);
    g.fill();
    g.fillStyle = c.dark;
    g.globalAlpha *= 0.35;
    g.beginPath(); g.ellipse(0, -2, 34, 5, 0, 0, TAU); g.fill();
    g.globalAlpha /= 0.35;
    // brillo
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.ellipse(-16, -56 + wob * 0.5, 7, 11, -0.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(-6, -66 + wob * 0.5, 3, 0, TAU); g.fill();
    // cara
    g.save();
    g.translate(4, s.headY);
    drawEye(g, -10, -40, 7, s.eyes, s.look);
    drawEye(g, 14, -40, 7, s.eyes, s.look);
    g.fillStyle = rgba(ch.accent, 0.75);
    g.beginPath(); g.ellipse(-20, -28, 6, 3.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(24, -28, 6, 3.5, 0, 0, TAU); g.fill();
    drawMouth(g, 2, -27, 5, s.mouth);
    g.restore();
    nub(1, s.armR);
  },

  pico(g, s, c, t, ch) {
    const leg = '#FF9B3D';
    g.strokeStyle = leg; g.lineWidth = 4; g.lineCap = 'round';
    const l1 = s.leg * 7, l2 = -s.leg * 7;
    for (const [lx, lo] of [[-9, l1], [9, l2]]) {
      g.beginPath(); g.moveTo(lx, -16); g.lineTo(lx + lo * 0.6, -2 - Math.max(0, lo) * 0.6); g.stroke();
      g.beginPath(); g.moveTo(lx + lo * 0.6 - 6, -1 - Math.max(0, lo) * 0.6); g.lineTo(lx + lo * 0.6 + 8, -1 - Math.max(0, lo) * 0.6); g.stroke();
    }
    // cola
    g.fillStyle = c.dark;
    g.beginPath(); g.moveTo(-26, -36); g.lineTo(-48, -50 + Math.sin(t * 4) * 3); g.lineTo(-44, -34); g.lineTo(-50, -26); g.lineTo(-24, -24); g.fill();
    // ala trasera
    const wing = (ang, front) => {
      g.save();
      g.translate(front ? 6 : -10, -46);
      g.rotate(-ang * 0.9 + 0.3);
      g.fillStyle = front ? c.body : c.dark;
      g.beginPath(); g.ellipse(0, 14, 8, 18, 0, 0, TAU); g.fill();
      g.strokeStyle = shade(c.body, -0.25); g.lineWidth = 1.5;
      if (front) { g.beginPath(); g.moveTo(-3, 16); g.lineTo(3, 26); g.moveTo(-5, 8); g.lineTo(3, 18); g.stroke(); }
      g.restore();
    };
    wing(s.armL, false);
    // cuerpo
    g.fillStyle = c.body;
    g.beginPath(); g.ellipse(0, -44, 30, 32, 0, 0, TAU); g.fill();
    g.fillStyle = c.light;
    g.beginPath(); g.ellipse(6, -34, 18, 20, 0, 0, TAU); g.fill();
    // cresta
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = ch.accent;
    for (let i = 0; i < 3; i++) {
      const a = -0.5 + i * 0.45 + Math.sin(t * 6 + i) * 0.08;
      g.save(); g.translate(-4 + i * 5, -72); g.rotate(a);
      g.beginPath(); g.ellipse(0, -10, 5, 13, 0, 0, TAU); g.fill();
      g.restore();
    }
    // ojos y pico
    drawEye(g, 0, -56, 6, s.eyes, s.look);
    drawEye(g, 16, -56, 6, s.eyes, s.look);
    g.fillStyle = '#FF9B3D';
    g.beginPath(); g.moveTo(18, -48); g.lineTo(38, -43); g.lineTo(18, -38); g.closePath(); g.fill();
    if (s.mouth === 'open' || s.mouth === 'o') {
      g.fillStyle = '#C8611E'; g.beginPath(); g.moveTo(18, -40); g.lineTo(32, -38); g.lineTo(18, -34); g.fill();
    }
    g.restore();
    wing(s.armR, true);
  },

  brik(g, s, c, t, ch) {
    const lp = s.leg * 5;
    g.fillStyle = c.dark;
    roundRect(g, -22, -18 - Math.max(0, lp), 16, 18, 3); g.fill();
    roundRect(g, 6, -18 - Math.max(0, -lp), 16, 18, 3); g.fill();
    // brazo trasero
    const arm = (side, ang, front) => {
      const sx = side * 30, sy = -54;
      const ex = sx + Math.sin(ang) * 18, ey = sy + Math.cos(ang) * 18;
      g.strokeStyle = c.dark; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      g.fillStyle = front ? c.body : c.dark;
      roundRect(g, ex - 9, ey - 9, 18, 18, 4); g.fill();
      g.strokeStyle = shade(c.body, -0.45); g.lineWidth = 1.5; g.stroke();
    };
    arm(-1, -s.armL, false);
    g.fillStyle = c.body;
    roundRect(g, -32, -64, 64, 50, 8); g.fill();
    g.strokeStyle = shade(c.body, -0.3); g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-32, -47); g.lineTo(32, -47); g.moveTo(-32, -31); g.lineTo(32, -31);
    g.moveTo(-6, -64); g.lineTo(-6, -47); g.moveTo(14, -47); g.lineTo(14, -31); g.moveTo(-16, -31); g.lineTo(-16, -14);
    g.stroke();
    // runa brillante
    g.save();
    if (quality.glow) { g.shadowColor = ch.accent; g.shadowBlur = 10; }
    g.strokeStyle = ch.accent; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-2, -44); g.lineTo(6, -38); g.lineTo(0, -32); g.lineTo(8, -26); g.stroke();
    g.restore();
    // cabeza
    g.save();
    g.translate(2, s.headY);
    g.fillStyle = c.light;
    roundRect(g, -20, -92, 40, 30, 6); g.fill();
    g.strokeStyle = shade(c.body, -0.15); g.lineWidth = 2;
    g.beginPath(); g.moveTo(-20, -77); g.lineTo(-8, -77); g.stroke();
    g.strokeStyle = '#1B2138'; g.lineWidth = 4; g.lineCap = 'round';
    const browTilt = s.eyes === 'angry' ? 3 : s.eyes === 'sad' ? -3 : 0;
    g.beginPath(); g.moveTo(-10, -86 - browTilt); g.lineTo(14, -86 + browTilt); g.stroke();
    drawEye(g, -4, -78, 4, s.eyes === 'open' ? 'open' : s.eyes, s.look);
    drawEye(g, 10, -78, 4, s.eyes === 'open' ? 'open' : s.eyes, s.look);
    drawMouth(g, 4, -69, 4, s.mouth);
    g.restore();
    arm(1, s.armR, true);
  },

  nimbus(g, s, c, t, ch) {
    const fy = -12 + Math.sin(t * 2.2) * 4;
    g.save();
    g.translate(0, fy);
    // gotas
    g.fillStyle = rgba(ch.accent2, 0.85);
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.2 + i * 0.33) % 1;
      g.globalAlpha = 1 - ph;
      g.beginPath(); g.ellipse(-14 + i * 14, -10 + ph * 18, 2.2, 3.4, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // rayito
    g.save();
    if (quality.glow) { g.shadowColor = ch.accent; g.shadowBlur = 8; }
    g.fillStyle = ch.accent;
    g.beginPath(); g.moveTo(4, -20); g.lineTo(-4, -6); g.lineTo(2, -6); g.lineTo(-3, 6); g.lineTo(9, -10); g.lineTo(3, -10); g.lineTo(8, -20); g.fill();
    g.restore();
    const puff = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const cloud = mix(c.body, '#FFFFFF', 0.45);
    const under = mix(c.body, '#FFFFFF', 0.15);
    // brazos nube
    puff(-36 - Math.sin(s.armL) * 6, -40 - Math.sin(s.armL) * 14, 9, under);
    puff(0, -30, 26, under);
    puff(-24, -34, 18, under);
    puff(24, -34, 18, under);
    puff(0, -50, 28, cloud);
    puff(-22, -44, 19, cloud);
    puff(24, -44, 19, cloud);
    puff(-10, -68, 18, cloud);
    puff(12, -66, 21, cloud);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.arc(-14, -72, 6, 0, TAU); g.fill();
    g.save();
    g.translate(2, s.headY);
    const eyesMode = s.eyes === 'open' ? 'sleepy' : s.eyes;
    if (eyesMode === 'sleepy') {
      for (const ex of [-10, 12]) {
        g.fillStyle = '#1B2138';
        g.beginPath(); g.arc(ex + s.look * 2, -48, 5, 0, Math.PI); g.fill();
        g.strokeStyle = '#1B2138'; g.lineWidth = 2.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(ex - 6, -48); g.lineTo(ex + 6, -48); g.stroke();
      }
    } else {
      drawEye(g, -10, -48, 5.5, eyesMode, s.look);
      drawEye(g, 12, -48, 5.5, eyesMode, s.look);
    }
    g.fillStyle = rgba('#FF9ECF', 0.6);
    g.beginPath(); g.ellipse(-20, -40, 5, 3, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(22, -40, 5, 3, 0, 0, TAU); g.fill();
    drawMouth(g, 1, -38, 4, s.mouth);
    g.restore();
    puff(36 + Math.sin(s.armR) * 6, -40 - Math.sin(s.armR) * 14, 9, cloud);
    g.restore();
  },

  fang(g, s, c, t, ch) {
    // cola
    g.save();
    g.translate(-16, -22);
    g.rotate(-0.4 + Math.sin(t * 3) * 0.15);
    g.fillStyle = c.body;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-30, 0, -40, -30, -26, -52); g.bezierCurveTo(-14, -36, -4, -24, 6, -8); g.fill();
    g.fillStyle = ch.accent;
    g.beginPath(); g.moveTo(-26, -52); g.bezierCurveTo(-34, -42, -34, -34, -30, -30); g.bezierCurveTo(-24, -36, -22, -42, -26, -52); g.fill();
    g.restore();
    // patas
    const lp = s.leg * 6;
    g.fillStyle = c.dark;
    roundRect(g, -12 + lp * 0.5, -16, 9, 16, 4); g.fill();
    roundRect(g, 4 - lp * 0.5, -16, 9, 16, 4); g.fill();
    limb(g, -10, -36, -s.armL, 13, 6, c.dark, 4, c.dark);
    // cuerpo
    g.fillStyle = c.body;
    g.beginPath(); g.ellipse(0, -30, 19, 18, 0, 0, TAU); g.fill();
    g.fillStyle = ch.accent;
    g.beginPath(); g.ellipse(4, -26, 10, 12, 0, 0, TAU); g.fill();
    // cabeza
    g.save();
    g.translate(2, s.headY);
    const ear = (x, flip) => {
      g.fillStyle = c.body;
      g.beginPath(); g.moveTo(x - 11, -74); g.lineTo(x + flip * 4, -100); g.lineTo(x + 12, -72); g.fill();
      g.fillStyle = ch.accent2;
      g.beginPath(); g.moveTo(x - 5, -76); g.lineTo(x + flip * 3, -93); g.lineTo(x + 6, -75); g.fill();
    };
    const twitch = Math.sin(t * 9) > 0.96 ? 2 : 0;
    ear(-13, -1);
    ear(15 + twitch, 1);
    g.fillStyle = c.body;
    g.beginPath(); g.ellipse(0, -64, 26, 22, 0, 0, TAU); g.fill();
    g.fillStyle = ch.accent;
    g.beginPath(); g.moveTo(-18, -56); g.quadraticCurveTo(10, -42, 28, -58); g.quadraticCurveTo(16, -66, 4, -60); g.quadraticCurveTo(-8, -66, -18, -56); g.fill();
    // ojos almendrados
    if (s.eyes === 'open' || s.eyes === 'angry') {
      for (const ex of [-6, 14]) {
        g.fillStyle = '#FFE58A';
        g.beginPath(); g.ellipse(ex, -68, 6, 4.5, ex < 0 ? 0.2 : -0.2, 0, TAU); g.fill();
        g.fillStyle = '#1B2138';
        g.beginPath(); g.ellipse(ex + s.look * 2, -68, 1.8, 4, 0, 0, TAU); g.fill();
      }
      if (s.eyes === 'angry') {
        g.strokeStyle = '#1B2138'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-12, -77); g.lineTo(-1, -73); g.moveTo(20, -77); g.lineTo(9, -73); g.stroke();
      }
    } else {
      drawEye(g, -6, -68, 5, s.eyes, s.look);
      drawEye(g, 14, -68, 5, s.eyes, s.look);
    }
    g.fillStyle = '#1B2138';
    g.beginPath(); g.ellipse(26, -59, 3.5, 2.6, 0, 0, TAU); g.fill();
    drawMouth(g, 18, -52, 3.5, s.mouth);
    g.strokeStyle = 'rgba(27,33,56,0.5)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(20, -56); g.lineTo(34, -60); g.moveTo(20, -54); g.lineTo(34, -52); g.stroke();
    g.restore();
    limb(g, 10, -36, s.armR, 13, 6, c.body, 4.5, ch.accent);
  },

  ozzy(g, s, c, t, ch) {
    // tentáculos
    const tent = (x0, phase, col, w) => {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, -30);
      for (let i = 1; i <= 6; i++) {
        const yy = -30 + i * 5;
        g.lineTo(x0 + Math.sin(t * 7 + phase + i * 0.8) * (2 + i * 0.7) + s.leg * i * 0.6, yy);
      }
      g.stroke();
    };
    tent(-18, 0, c.dark, 8); tent(18, 1.4, c.dark, 8);
    tent(-7, 2.2, c.body, 9); tent(7, 3.1, c.body, 9);
    // brazos-tentáculo
    const arm = (side, ang) => {
      const bx = side * 26, by = -44;
      const a = side > 0 ? ang : -ang;
      const ex = bx + Math.sin(a) * 22, ey = by + Math.cos(a) * 22;
      g.strokeStyle = side > 0 ? c.body : c.dark; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(bx, by);
      g.quadraticCurveTo(bx + side * 10, by + 6, ex, ey);
      g.stroke();
      g.fillStyle = ch.accent;
      g.beginPath(); g.arc(ex, ey, 3, 0, TAU); g.fill();
    };
    arm(-1, s.armL);
    // cúpula
    const grad = g.createRadialGradient(-8, -70, 4, 0, -52, 36);
    grad.addColorStop(0, c.light);
    grad.addColorStop(1, c.body);
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(0, -54, 32, 30, 0, Math.PI, 0); g.lineTo(32, -40); g.quadraticCurveTo(0, -24, -32, -40); g.closePath(); g.fill();
    // manchas
    g.fillStyle = rgba(ch.accent, 0.55);
    g.beginPath(); g.arc(-20, -66, 4, 0, TAU); g.arc(20, -72, 3, 0, TAU); g.arc(24, -50, 3.5, 0, TAU); g.fill();
    // antenas
    g.strokeStyle = c.dark; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-10, -82); g.lineTo(-16, -96 + Math.sin(t * 4) * 2); g.moveTo(10, -82); g.lineTo(16, -96 - Math.sin(t * 4) * 2); g.stroke();
    g.fillStyle = ch.accent;
    g.beginPath(); g.arc(-16, -97 + Math.sin(t * 4) * 2, 4, 0, TAU); g.arc(16, -97 - Math.sin(t * 4) * 2, 4, 0, TAU); g.fill();
    // ojo único
    g.save();
    g.translate(2, s.headY);
    if (s.eyes === 'open' || s.eyes === 'angry') {
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(0, -58, 15, 0, TAU); g.fill();
      g.fillStyle = ch.accent;
      g.beginPath(); g.arc(s.look * 6, -57, 8, 0, TAU); g.fill();
      g.fillStyle = '#1B2138';
      g.beginPath(); g.arc(s.look * 7, -57, 4.5, 0, TAU); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s.look * 7 + 3, -61, 2, 0, TAU); g.fill();
      if (s.eyes === 'angry') {
        g.fillStyle = c.body;
        g.beginPath(); g.moveTo(-17, -74); g.lineTo(17, -66); g.lineTo(17, -76); g.lineTo(-17, -76); g.fill();
      }
    } else {
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(0, -58, 14, 0, TAU); g.fill();
      drawEye(g, 0, -58, 9, s.eyes, s.look, '#1B2138', false);
    }
    drawMouth(g, 0, -38, 5, s.mouth);
    g.restore();
    arm(1, s.armR);
  },

  rex(g, s, c, t, ch) {
    // cola
    g.fillStyle = c.body;
    g.beginPath(); g.moveTo(-18, -44); g.quadraticCurveTo(-46, -30, -58, -14 + Math.sin(t * 3) * 3); g.quadraticCurveTo(-40, -18, -16, -18); g.fill();
    g.fillStyle = ch.accent;
    for (let i = 0; i < 3; i++) {
      const x = -30 - i * 9, y = -36 + i * 7;
      g.beginPath(); g.moveTo(x - 4, y + 2); g.lineTo(x - 1, y - 7); g.lineTo(x + 4, y + 1); g.fill();
    }
    // piernas
    const lp = s.leg * 6;
    g.fillStyle = c.dark;
    roundRect(g, -16 + lp * 0.5, -22, 13, 22, 5); g.fill();
    roundRect(g, 4 - lp * 0.5, -22, 13, 22, 5); g.fill();
    g.fillStyle = '#fff';
    for (const fx of [-16 + lp * 0.5, 4 - lp * 0.5]) { g.beginPath(); g.moveTo(fx + 10, -3); g.lineTo(fx + 16, -1); g.lineTo(fx + 10, 0); g.fill(); }
    // cuerpo
    g.fillStyle = c.body;
    g.beginPath(); g.ellipse(-2, -38, 26, 24, 0, 0, TAU); g.fill();
    g.fillStyle = c.light;
    g.beginPath(); g.ellipse(6, -32, 14, 17, 0.2, 0, TAU); g.fill();
    // púas del lomo
    g.fillStyle = ch.accent;
    for (let i = 0; i < 4; i++) {
      const a = -2.6 + i * 0.32;
      const x = -2 + Math.cos(a) * 25, y = -40 + Math.sin(a) * 24;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.moveTo(-5, 2); g.lineTo(0, -9); g.lineTo(5, 2); g.fill();
      g.restore();
    }
    // brazito trasero
    limb(g, 12, -40, -s.armL * 0.6 + 0.8, 8, 5, c.dark, 2.5);
    // cabeza
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = c.body;
    g.beginPath(); g.ellipse(10, -68, 22, 18, -0.1, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(28, -62, 16, 11, 0, 0, TAU); g.fill();
    g.fillStyle = ch.accent;
    g.beginPath(); g.moveTo(-2, -84); g.lineTo(2, -94); g.lineTo(8, -85); g.lineTo(13, -95); g.lineTo(17, -85); g.fill();
    g.fillStyle = '#1B2138';
    g.beginPath(); g.ellipse(39, -66, 2, 1.5, 0, 0, TAU); g.fill();
    if (s.mouth === 'open' || s.mouth === 'o') {
      g.fillStyle = '#3B1B2E';
      g.beginPath(); g.moveTo(16, -58); g.quadraticCurveTo(30, -46, 42, -58); g.closePath(); g.fill();
    } else {
      g.strokeStyle = '#1B2138'; g.lineWidth = 2;
      g.beginPath();
      if (s.mouth === 'sad') { g.moveTo(18, -55); g.quadraticCurveTo(30, -60, 40, -55); }
      else { g.moveTo(18, -58); g.quadraticCurveTo(30, -52, 42, -58); }
      g.stroke();
    }
    g.fillStyle = '#fff';
    for (const tx of [22, 29, 36]) { g.beginPath(); g.moveTo(tx, -58); g.lineTo(tx + 2.5, -54); g.lineTo(tx + 5, -58); g.fill(); }
    drawEye(g, 14, -72, 6, s.eyes, s.look);
    g.restore();
    limb(g, 16, -38, s.armR * 0.6 + 0.8, 9, 5, c.body, 3);
  },
};

// Anclajes de cabeza para accesorios: [x, y superior, ancho, y de ojos]
const HEAD = {
  volt: [0, -96, 54, -76], mochi: [2, -74, 56, -40], pico: [6, -70, 40, -56], brik: [2, -92, 40, -78],
  nimbus: [2, -96, 56, -60], fang: [2, -84, 46, -68], ozzy: [2, -84, 58, -58], rex: [10, -86, 42, -72],
};

function drawAccessory(g, id, charId, t, color) {
  const [hx, hy, hw, ey] = HEAD[charId] || [0, -90, 50, -70];
  g.save();
  g.translate(hx, hy);
  switch (id) {
    case 'cap':
      g.fillStyle = '#232A44';
      g.beginPath(); g.ellipse(0, 4, hw * 0.42, hw * 0.32, 0, Math.PI, 0); g.fill();
      roundRect(g, 0, -1, hw * 0.62, 6, 3); g.fill();
      g.fillStyle = color; g.beginPath(); g.arc(-2, -6, 4, 0, TAU); g.fill();
      break;
    case 'bow':
      g.translate(hw * 0.28, 2);
      g.fillStyle = '#FF5FA2';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -9); g.lineTo(-12, 9); g.fill();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(12, -9); g.lineTo(12, 9); g.fill();
      g.fillStyle = '#FFB3D1'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
      break;
    case 'party':
      g.rotate(-0.15);
      g.fillStyle = '#9B6CFF';
      g.beginPath(); g.moveTo(-12, 4); g.lineTo(0, -30); g.lineTo(12, 4); g.fill();
      g.fillStyle = '#FFC93C';
      g.beginPath(); g.moveTo(-8, -6); g.lineTo(8, -8); g.lineTo(6, -14); g.lineTo(-5, -12); g.fill();
      g.fillStyle = '#48D597'; g.beginPath(); g.arc(0, -31, 4.5, 0, TAU); g.fill();
      break;
    case 'headphones':
      g.strokeStyle = '#232A44'; g.lineWidth = 5;
      g.beginPath(); g.arc(0, 18, hw * 0.52, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
      g.fillStyle = '#232A44';
      roundRect(g, -hw * 0.58, 10, 12, 20, 5); g.fill();
      roundRect(g, hw * 0.58 - 12, 10, 12, 20, 5); g.fill();
      g.fillStyle = '#48D597';
      g.beginPath(); g.arc(-hw * 0.58 + 6, 20, 3, 0, TAU); g.arc(hw * 0.58 - 6, 20, 3, 0, TAU); g.fill();
      break;
    case 'shades': {
      const y = ey - hy;
      g.fillStyle = '#10131F';
      roundRect(g, -hw * 0.38, y - 6, hw * 0.34, 12, 4); g.fill();
      roundRect(g, hw * 0.06, y - 6, hw * 0.34, 12, 4); g.fill();
      g.fillRect(-hw * 0.06, y - 4, hw * 0.14, 3);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(-hw * 0.32, y - 4, 5, 3); g.fillRect(hw * 0.12, y - 4, 5, 3);
      break;
    }
    case 'helmet':
      g.fillStyle = '#F6F7FB';
      g.beginPath(); g.ellipse(0, 10, hw * 0.55, hw * 0.45, 0, Math.PI, 0); g.fill();
      g.fillStyle = color; g.fillRect(-4, 10 - hw * 0.45, 8, hw * 0.45);
      g.fillStyle = 'rgba(37,207,230,0.75)';
      roundRect(g, hw * 0.05, 2, hw * 0.48, 9, 4); g.fill();
      break;
    case 'halo':
      g.save();
      if (quality.glow) { g.shadowColor = '#FFE45C'; g.shadowBlur = 12; }
      g.strokeStyle = '#FFE45C'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, -14 + Math.sin(t * 3) * 2, hw * 0.36, 6, 0, 0, TAU); g.stroke();
      g.restore();
      break;
    case 'horns':
      g.fillStyle = '#E8E3D3';
      g.beginPath(); g.moveTo(-hw * 0.4, 0); g.quadraticCurveTo(-hw * 0.75, -8, -hw * 0.62, -26); g.quadraticCurveTo(-hw * 0.5, -10, -hw * 0.25, -4); g.fill();
      g.beginPath(); g.moveTo(hw * 0.4, 0); g.quadraticCurveTo(hw * 0.75, -8, hw * 0.62, -26); g.quadraticCurveTo(hw * 0.5, -10, hw * 0.25, -4); g.fill();
      g.fillStyle = '#8D97B5';
      g.beginPath(); g.ellipse(0, 6, hw * 0.45, hw * 0.36, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#C7CEE3'; g.fillRect(-hw * 0.45, 2, hw * 0.9, 5);
      break;
    case 'tophat':
      g.fillStyle = '#151A2C';
      roundRect(g, -hw * 0.4, 0, hw * 0.8, 6, 3); g.fill();
      roundRect(g, -hw * 0.26, -30, hw * 0.52, 32, 4); g.fill();
      g.fillStyle = color; g.fillRect(-hw * 0.26, -8, hw * 0.52, 6);
      break;
    case 'crown':
      g.save();
      if (quality.glow) { g.shadowColor = '#FFC93C'; g.shadowBlur = 10; }
      g.fillStyle = '#FFC93C';
      g.beginPath();
      g.moveTo(-hw * 0.34, 4); g.lineTo(-hw * 0.36, -16); g.lineTo(-hw * 0.17, -6); g.lineTo(0, -22); g.lineTo(hw * 0.17, -6); g.lineTo(hw * 0.36, -16); g.lineTo(hw * 0.34, 4);
      g.closePath(); g.fill();
      g.restore();
      g.fillStyle = '#FF5FA2'; g.beginPath(); g.arc(0, -4, 3, 0, TAU); g.fill();
      g.fillStyle = '#25CFE6'; g.beginPath(); g.arc(-hw * 0.2, -2, 2.5, 0, TAU); g.arc(hw * 0.2, -2, 2.5, 0, TAU); g.fill();
      break;
    default:
      break;
  }
  g.restore();
}

/**
 * Dibuja un personaje.
 * @param {CanvasRenderingContext2D} g
 * @param {object} o {id, x, y (pies), s (escala), color, anim, t, facing, acc, alpha, shadow}
 */
export function drawCharacter(g, o) {
  const ch = CHAR_BY_ID[o.id] || CHARACTERS[0];
  const t = o.t ?? performance.now() / 1000;
  const st = animState(o.anim || 'idle', t, (o.seed ?? 0) + ch.id.length * 0.37);
  if (o.eyes) st.eyes = o.eyes;
  const base = st.gray ? mix(o.color || '#3985FF', '#7C849E', st.gray) : o.color || '#3985FF';
  const c = { body: base, dark: shade(base, -0.32), light: shade(base, 0.28) };
  const s = o.s ?? 1;
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.translate(o.x, o.y);
  if (o.shadow !== false) {
    const sh = Math.max(0.3, 1 + st.y / 60);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(0, 0, 30 * s * sh, 7 * s * sh, 0, 0, TAU); g.fill();
  }
  g.scale(s * (o.facing ?? 1) * st.flip, s);
  if (st.shake) g.translate((Math.random() - 0.5) * st.shake * 2, 0);
  g.translate(0, st.y);
  g.rotate(st.rot);
  g.scale(st.sx, st.sy);
  DRAW[ch.id](g, st, c, t, ch);
  if (o.acc && o.acc !== 'none') {
    g.translate(0, st.headY);
    drawAccessory(g, o.acc, ch.id, t, base);
  }
  g.restore();
}

/** Retrato circular (para HUD y marcadores). */
export function drawPortrait(g, x, y, r, profile, o = {}) {
  g.save();
  g.beginPath(); g.arc(x, y, r, 0, TAU);
  g.fillStyle = o.bg || shade(profile.color, -0.6);
  g.fill();
  g.lineWidth = o.ring ?? 3;
  g.strokeStyle = profile.color;
  g.stroke();
  g.clip();
  drawCharacter(g, {
    id: profile.char, x, y: y + r * 1.35, s: (r / 46) * 1.05, color: profile.color, anim: o.anim || 'idle',
    t: o.t, acc: profile.acc, shadow: false, facing: o.facing ?? 1,
  });
  g.restore();
}

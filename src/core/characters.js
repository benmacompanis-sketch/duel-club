// Personajes originales de DUEL CLUB, dibujados 100% con Canvas.
// Cada uno tiene silueta, personalidad y detalles propios; el cuerpo toma el color del
// jugador para que siempre se identifique a quién pertenece.
// Animaciones: idle, run, jump, fall, win, lose, celebrate, attack, block, hurt, dizzy.
import { TAU, shade, mix, rgba, roundRect, quality, NATIVE_RANDOM } from './utils.js';
import { SKINS, HATS, FACES, BODIES, drawChairIcon } from './cosmetics.js';

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
  // MEME COLLECTION (diseños originales)
  { id: 'npc', name: 'Gerardo NPC', title: 'El ciudadano promedio', accent: '#F1C9A5', accent2: '#5B3A23', unlock: 'store', meme: true,
    bio: 'Camisa a cuadros, mirada perdida y una rutina impecable. Nadie sabe de dónde salió.' },
  { id: 'formal', name: 'Sr. Formalidad', title: 'El oficinista serio', accent: '#F1C9A5', accent2: '#1B2033', unlock: 'store', meme: true,
    bio: 'Llega a los duelos con planilla de Excel y corbata. No se ríe. Nunca.' },
  { id: 'frigo', name: 'Frigo-Bot', title: 'El electrodoméstico', accent: '#7CF7FF', accent2: '#F6F7FB', unlock: 'store', meme: true,
    bio: 'Una heladera con sueños competitivos. Mantiene la calma a 4 °C.' },
  { id: 'toasty', name: 'Tostadín', title: 'La tostadora valiente', accent: '#F2B66D', accent2: '#C9D0E3', unlock: 'store', meme: true,
    bio: 'Cuando algo le sale bien, salta una tostada. Cuando sale mal, también.' },
  { id: 'silla', name: 'La Silla', title: 'Leyenda de plástico', accent: '#F5F7FC', accent2: '#B8C0D6', unlock: 'secret', meme: true,
    bio: 'Sobrevivió a mil asados. Símbolo universal de la neutralidad. Personaje secreto.' },
  { id: 'creador', name: 'El Creador', title: 'El que hizo el club', accent: '#FFD16B', accent2: '#B98CFF', unlock: 'creator',
    bio: 'Diseñó cada minijuego, cada PIE y cada trampa. Nadie sabe qué hay debajo de la capucha.' },
  { id: 'tuntun', name: 'Tung Tung Tung Sahur', title: 'El ritmo del bosque', accent: '#8B5A2B', accent2: '#E8C99A', unlock: 'store', meme: true,
    bio: 'Un tronco con palillo de tambor que marca el ritmo del duelo. Tun. Tun. Tun.' },
];
export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// lista de la versión anterior (se conserva para compatibilidad)
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
  creador(g, s, c, t, ch) {
    const gold = '#FFD16B', goldD = '#C9962E', robe = shade(c.body, -0.25), robeD = shade(c.body, -0.5);
    // botas
    const lp = s.leg * 6;
    g.fillStyle = '#1B1430';
    roundRect(g, -15, -12 - Math.max(0, lp), 12, 12, 4); g.fill();
    roundRect(g, 3, -12 - Math.max(0, -lp), 12, 12, 4); g.fill();
    // capa trasera
    g.fillStyle = robeD;
    g.beginPath(); g.moveTo(-22, -64); g.quadraticCurveTo(-34 - Math.sin(t * 2) * 3, -20, -26, -6); g.lineTo(26, -6); g.quadraticCurveTo(34 + Math.sin(t * 2) * 3, -20, 22, -64); g.closePath(); g.fill();
    limb(g, -20, -56, -s.armL, 22, 9, robe, 6, gold);
    // túnica
    g.fillStyle = robe;
    g.beginPath(); g.moveTo(-20, -66); g.lineTo(20, -66); g.lineTo(26, -10); g.quadraticCurveTo(0, -4, -26, -10); g.closePath(); g.fill();
    // ribete y cinturón dorados
    g.fillStyle = gold;
    g.fillRect(-3, -64, 6, 54);
    roundRect(g, -22, -34, 44, 6, 3); g.fill();
    g.fillStyle = '#FF5FA2'; g.beginPath(); g.arc(0, -31, 4, 0, TAU); g.fill();
    // capucha
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = robe;
    g.beginPath(); g.moveTo(-26, -62); g.quadraticCurveTo(-30, -104, 0, -112); g.quadraticCurveTo(30, -104, 26, -62); g.closePath(); g.fill();
    g.strokeStyle = gold; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-24, -64); g.quadraticCurveTo(-27, -100, 0, -108); g.quadraticCurveTo(27, -100, 24, -64); g.stroke();
    // interior oscuro y ojos que brillan
    g.fillStyle = '#0B0618';
    g.beginPath(); g.ellipse(0, -80, 17, 15, 0, 0, TAU); g.fill();
    g.save();
    if (quality.glow) { g.shadowColor = gold; g.shadowBlur = 10; }
    g.fillStyle = gold; g.strokeStyle = gold; g.lineWidth = 3; g.lineCap = 'round';
    const ex = 3 * s.look;
    for (const sx of [-7, 7]) {
      g.beginPath();
      if (s.eyes === 'closed' || s.eyes === 'happy') { g.arc(sx + ex, -78, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (s.eyes === 'hurt' || s.eyes === 'dizzy') { g.moveTo(sx - 3, -84); g.lineTo(sx + 3, -77); g.moveTo(sx + 3, -84); g.lineTo(sx - 3, -77); g.stroke(); }
      else { g.ellipse(sx + ex, -80, 3.2, s.eyes === 'angry' ? 2 : 4, 0, 0, TAU); g.fill(); }
    }
    g.restore();
    // corona flotante
    const cy = -122 + Math.sin(t * 2.4) * 3;
    g.fillStyle = gold;
    g.beginPath(); g.moveTo(-13, cy + 7); g.lineTo(-13, cy - 3); g.lineTo(-6, cy + 2); g.lineTo(0, cy - 7); g.lineTo(6, cy + 2); g.lineTo(13, cy - 3); g.lineTo(13, cy + 7); g.closePath(); g.fill();
    g.fillStyle = goldD; g.fillRect(-13, cy + 5, 26, 3);
    g.restore();
    // brazo delantero con orbe
    limb(g, 20, -56, s.armR, 22, 9, robe, 6, gold);
    const ox = 20 + Math.sin(s.armR) * 30, oy = -56 + Math.cos(s.armR) * 30 - 10 + Math.sin(t * 3) * 3;
    g.save();
    if (quality.glow) { g.shadowColor = ch.accent2; g.shadowBlur = 14; }
    g.fillStyle = ch.accent2; g.beginPath(); g.arc(ox, oy, 6, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(ox - 2, oy - 2, 2, 0, TAU); g.fill();
    g.restore();
  },
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
  // ================================================================ MEME COLLECTION
  npc(g, s, c, t, ch) {
    const skin = '#F1C9A5', jeans = '#3D5A99';
    const lp = s.leg * 6;
    g.fillStyle = jeans;
    roundRect(g, -13, -26 - Math.max(0, lp), 11, 26, 3); g.fill();
    roundRect(g, 2, -26 - Math.max(0, -lp), 11, 26, 3); g.fill();
    g.fillStyle = '#2A2F45';
    roundRect(g, -15, -5 - Math.max(0, lp), 15, 6, 3); g.fill();
    roundRect(g, 1, -5 - Math.max(0, -lp), 15, 6, 3); g.fill();
    limb(g, -17, -54, -s.armL, 22, 8, c.dark, 4.5, skin);
    // camisa a cuadros
    g.fillStyle = c.body;
    roundRect(g, -19, -62, 38, 40, 7); g.fill();
    g.save();
    g.beginPath(); roundRect(g, -19, -62, 38, 40, 7); g.clip();
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = -18; x < 20; x += 9) g.fillRect(x, -62, 3.5, 40);
    for (let y = -60; y < -20; y += 9) g.fillRect(-19, y, 38, 3.5);
    g.restore();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(-6, -62); g.lineTo(0, -54); g.lineTo(6, -62); g.fill();
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = skin;
    roundRect(g, -16, -100, 32, 38, 13); g.fill();
    g.fillStyle = ch.accent2;
    g.beginPath(); g.moveTo(-17, -84); g.quadraticCurveTo(-18, -104, 0, -103); g.quadraticCurveTo(18, -104, 17, -86); g.quadraticCurveTo(4, -94, -17, -84); g.fill();
    const lx = s.look * 2.5;
    if (s.eyes === 'open' || s.eyes === 'closed') {
      g.fillStyle = '#1B2033';
      if (s.eyes === 'closed') { g.fillRect(-9 + lx, -80, 6, 2); g.fillRect(4 + lx, -80, 6, 2); }
      else { g.beginPath(); g.arc(-6 + lx, -79, 2.2, 0, TAU); g.arc(7 + lx, -79, 2.2, 0, TAU); g.fill(); }
    } else {
      drawEye(g, -6, -79, 4, s.eyes, s.look);
      drawEye(g, 7, -79, 4, s.eyes, s.look);
    }
    drawMouth(g, 1 + lx, -70, 4, s.mouth === 'smile' ? 'flat' : s.mouth);
    g.restore();
    limb(g, 17, -54, s.armR, 22, 8, c.body, 4.5, skin);
  },

  formal(g, s, c, t, ch) {
    const skin = '#F1C9A5', suit = '#4A5068';
    const lp = s.leg * 6;
    g.fillStyle = shade(suit, -0.2);
    roundRect(g, -13, -28 - Math.max(0, lp), 11, 28, 3); g.fill();
    roundRect(g, 2, -28 - Math.max(0, -lp), 11, 28, 3); g.fill();
    g.fillStyle = '#10131F';
    roundRect(g, -16, -5 - Math.max(0, lp), 16, 6, 3); g.fill();
    roundRect(g, 0, -5 - Math.max(0, -lp), 16, 6, 3); g.fill();
    // maletín en la mano trasera
    const [bx, by] = limb(g, -18, -56, -s.armL, 22, 8, shade(suit, -0.1), 4.5, skin);
    g.fillStyle = '#5B3A23'; roundRect(g, bx - 9, by + 2, 18, 13, 3); g.fill();
    g.fillStyle = '#FFD16B'; g.fillRect(bx - 2, by + 6, 4, 2);
    g.fillStyle = suit;
    roundRect(g, -20, -64, 40, 42, 7); g.fill();
    g.fillStyle = '#F6F7FB';
    g.beginPath(); g.moveTo(-8, -64); g.lineTo(0, -44); g.lineTo(8, -64); g.fill();
    g.fillStyle = c.body;
    g.beginPath(); g.moveTo(-3, -62); g.lineTo(3, -62); g.lineTo(4, -42); g.lineTo(0, -36); g.lineTo(-4, -42); g.fill();
    g.fillStyle = shade(suit, -0.25);
    g.beginPath(); g.moveTo(-20, -64); g.lineTo(-8, -64); g.lineTo(0, -44); g.lineTo(-12, -40); g.fill();
    g.beginPath(); g.moveTo(20, -64); g.lineTo(8, -64); g.lineTo(0, -44); g.lineTo(12, -40); g.fill();
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = skin;
    roundRect(g, -16, -102, 32, 40, 12); g.fill();
    g.fillStyle = ch.accent2;
    g.beginPath(); g.moveTo(-17, -88); g.quadraticCurveTo(-16, -106, 2, -105); g.quadraticCurveTo(18, -104, 17, -90); g.lineTo(-2, -97); g.closePath(); g.fill();
    // anteojos rectangulares
    g.strokeStyle = '#1B2033'; g.lineWidth = 2;
    g.strokeRect(-13, -86, 11, 8); g.strokeRect(2, -86, 11, 8);
    g.beginPath(); g.moveTo(-2, -82); g.lineTo(2, -82); g.stroke();
    const happy = s.eyes === 'happy';
    g.fillStyle = '#1B2033';
    if (s.eyes === 'closed' || happy) { g.fillRect(-10, -82, 6, 1.6); g.fillRect(5, -82, 6, 1.6); }
    else if (s.eyes === 'hurt' || s.eyes === 'dizzy') { drawEye(g, -7, -82, 3.4, s.eyes, 0); drawEye(g, 7, -82, 3.4, s.eyes, 0); }
    else { g.beginPath(); g.arc(-7 + s.look * 2, -82, 1.8, 0, TAU); g.arc(8 + s.look * 2, -82, 1.8, 0, TAU); g.fill(); }
    // cejas serias
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(-13, -90); g.lineTo(-3, -89); g.moveTo(3, -89); g.lineTo(13, -90); g.stroke();
    drawMouth(g, 1, -71, 4, s.mouth === 'open' ? 'o' : s.mouth === 'sad' ? 'sad' : 'flat');
    g.restore();
    limb(g, 18, -56, s.armR, 22, 8, suit, 4.5, skin);
  },

  frigo(g, s, c, t, ch) {
    const white = '#EEF1F8', metal = '#AEB8D6';
    const roll = s.leg * 2;
    g.fillStyle = '#2A2F45';
    g.beginPath(); g.arc(-14, -5, 5, 0, TAU); g.arc(14, -5, 5, 0, TAU); g.fill();
    g.fillStyle = metal; g.beginPath(); g.arc(-14 + roll, -5, 2, 0, TAU); g.arc(14 + roll, -5, 2, 0, TAU); g.fill();
    limb(g, -24, -56, -s.armL, 18, 5, metal, 5, c.body);
    g.fillStyle = white;
    roundRect(g, -24, -106, 48, 98, 10); g.fill();
    g.fillStyle = c.body; g.fillRect(-24, -66, 48, 4);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(14, -104, 8, 94);
    // manijas
    g.fillStyle = metal; roundRect(g, 16, -96, 4, 22, 2); g.fill(); roundRect(g, 16, -56, 4, 30, 2); g.fill();
    // imanes
    g.fillStyle = '#FF5FA2'; g.fillRect(-16, -54, 7, 7);
    g.fillStyle = '#FFC93C'; g.beginPath(); g.arc(-4, -40, 4, 0, TAU); g.fill();
    g.fillStyle = '#48D597'; g.fillRect(-18, -30, 10, 5);
    g.save();
    g.translate(0, s.headY);
    g.fillStyle = '#0E1630'; roundRect(g, -16, -98, 30, 24, 6); g.fill();
    g.save();
    if (quality.glow) { g.shadowColor = ch.accent; g.shadowBlur = 8; }
    g.strokeStyle = ch.accent; g.fillStyle = ch.accent; g.lineWidth = 2.4; g.lineCap = 'round';
    const ex = s.look * 3;
    for (const sx of [-8, 6]) {
      g.beginPath();
      if (s.eyes === 'closed') { g.moveTo(sx - 3 + ex, -88); g.lineTo(sx + 3 + ex, -88); g.stroke(); }
      else if (s.eyes === 'happy') { g.arc(sx + ex, -86, 3.5, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (s.eyes === 'sad') { g.arc(sx + ex, -91, 3.5, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
      else if (s.eyes === 'hurt' || s.eyes === 'dizzy') { g.moveTo(sx - 3, -91); g.lineTo(sx + 3, -85); g.moveTo(sx + 3, -91); g.lineTo(sx - 3, -85); g.stroke(); }
      else { roundRect(g, sx - 2.5 + ex, -92, 5, 7, 2); g.fill(); }
    }
    g.beginPath();
    if (s.mouth === 'open') { g.arc(ex - 1, -80, 3, 0, Math.PI); g.fill(); }
    else if (s.mouth === 'sad') { g.arc(ex - 1, -77, 3, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
    else { g.moveTo(ex - 4, -80); g.lineTo(ex + 2, -80); g.stroke(); }
    g.restore();
    // escarcha
    g.fillStyle = 'rgba(190,240,255,0.8)';
    g.font = '10px sans-serif'; g.fillText('4°', -20, -100 + 0);
    g.restore();
    limb(g, 24, -56, s.armR, 18, 5, metal, 5.5, c.body);
  },

  toasty(g, s, c, t, ch) {
    const chrome = '#C9D0E3';
    const lp = s.leg * 5;
    g.fillStyle = '#2A2F45';
    roundRect(g, -12, -18 - Math.max(0, lp), 8, 18, 3); g.fill();
    roundRect(g, 4, -18 - Math.max(0, -lp), 8, 18, 3); g.fill();
    limb(g, -15, -36, -s.armL, 14, 5, c.dark, 4.5);
    g.fillStyle = c.body; roundRect(g, -16, -46, 32, 30, 8); g.fill();
    g.fillStyle = c.dark; roundRect(g, -16, -24, 32, 8, 4); g.fill();
    g.save();
    g.translate(0, s.headY);
    // tostadas que saltan
    const up = s.eyes === 'happy' || s.mouth === 'open' ? 10 + Math.abs(Math.sin(t * 8)) * 8 : 2;
    g.fillStyle = '#D9944A';
    roundRect(g, -14, -96 - up, 12, 16, 4); g.fill(); roundRect(g, 3, -96 - up * 0.8, 12, 16, 4); g.fill();
    g.fillStyle = '#F2C78E';
    roundRect(g, -12, -94 - up, 8, 12, 3); g.fill(); roundRect(g, 5, -94 - up * 0.8, 8, 12, 3); g.fill();
    // cuerpo de tostadora
    g.fillStyle = chrome; roundRect(g, -23, -90, 46, 44, 11); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; roundRect(g, -19, -86, 6, 34, 3); g.fill();
    g.fillStyle = '#5E6788'; g.fillRect(-16, -90, 12, 4); g.fillRect(4, -90, 12, 4);
    g.fillStyle = '#2A2F45'; roundRect(g, 22, -74, 6, 14, 2); g.fill();
    drawEye(g, -8, -70, 4.5, s.eyes, s.look);
    drawEye(g, 9, -70, 4.5, s.eyes, s.look);
    g.fillStyle = rgba('#FF8E3C', 0.5);
    g.beginPath(); g.ellipse(-15, -61, 4, 2.5, 0, 0, TAU); g.ellipse(16, -61, 4, 2.5, 0, 0, TAU); g.fill();
    drawMouth(g, 1, -60, 5, s.mouth);
    g.restore();
    limb(g, 15, -36, s.armR, 14, 5, c.body, 4.5);
  },

  silla(g, s, c, t, ch) {
    const plastic = mix(c.body, '#FFFFFF', 0.72);
    const dark = shade(plastic, -0.14);
    const lp = s.leg * 7;
    // patas (las de adelante caminan)
    g.fillStyle = dark;
    g.fillRect(-20, -34, 6, 34 - Math.max(0, lp)); g.fillRect(14, -34, 6, 34 - Math.max(0, -lp));
    g.fillStyle = plastic;
    g.fillRect(-26, -34, 7, 34 - Math.max(0, -lp)); g.fillRect(19, -34, 7, 34 - Math.max(0, lp));
    // asiento
    g.fillStyle = plastic; roundRect(g, -30, -42, 60, 10, 4); g.fill();
    g.fillStyle = dark; g.fillRect(-28, -34, 56, 3);
    limb(g, -26, -50, -s.armL, 12, 4, dark, 3.5, plastic);
    g.save();
    g.translate(0, s.headY);
    // respaldo con cara
    g.fillStyle = plastic; roundRect(g, -26, -104, 52, 62, 12); g.fill();
    g.fillStyle = dark;
    for (let i = 0; i < 4; i++) roundRect(g, -19 + i * 10, -66, 6, 18, 3), g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; roundRect(g, -22, -100, 8, 26, 4); g.fill();
    drawEye(g, -8, -86, 5, s.eyes, s.look);
    drawEye(g, 9, -86, 5, s.eyes, s.look);
    drawMouth(g, 1, -75, 5, s.mouth);
    g.restore();
    limb(g, 26, -50, s.armR, 12, 4, dark, 3.5, plastic);
  },

  tuntun(g, s, c, t, ch) {
    const wood = '#9A6A3A', woodD = '#6E4524', woodL = '#C99A62';
    const lp = s.leg * 5;
    g.fillStyle = woodD;
    roundRect(g, -14, -16 - Math.max(0, lp), 10, 16, 4); g.fill();
    roundRect(g, 4, -16 - Math.max(0, -lp), 10, 16, 4); g.fill();
    limb(g, -20, -58, -s.armL, 18, 6, woodD, 5, woodL);
    // tronco
    g.fillStyle = wood; roundRect(g, -21, -104, 42, 92, 14); g.fill();
    g.strokeStyle = woodD; g.lineWidth = 2;
    for (const x of [-12, 2, 13]) { g.beginPath(); g.moveTo(x, -98); g.quadraticCurveTo(x + 3, -60, x - 1, -18); g.stroke(); }
    g.fillStyle = woodL; g.beginPath(); g.ellipse(0, -103, 20, 6, 0, 0, TAU); g.fill();
    g.strokeStyle = woodD; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -103, 12, 3.4, 0, 0, TAU); g.ellipse(0, -103, 5, 1.6, 0, 0, TAU); g.stroke();
    g.save();
    g.translate(0, s.headY);
    // vincha del color del jugador
    g.fillStyle = c.body; g.fillRect(-21, -96, 42, 7);
    g.beginPath(); g.moveTo(-21, -94); g.lineTo(-30, -88 + Math.sin(t * 8) * 3); g.lineTo(-28, -97); g.fill();
    // cara tallada
    g.fillStyle = '#2A1708';
    const ey = -80;
    if (s.eyes === 'closed' || s.eyes === 'happy') { g.fillRect(-12, ey, 9, 2.5); g.fillRect(4, ey, 9, 2.5); }
    else { g.beginPath(); g.ellipse(-7 + s.look * 2, ey, 4.5, 6, 0, 0, TAU); g.ellipse(9 + s.look * 2, ey, 4.5, 6, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-6 + s.look * 2, ey - 2, 1.4, 0, TAU); g.arc(10 + s.look * 2, ey - 2, 1.4, 0, TAU); g.fill(); }
    g.fillStyle = '#2A1708';
    if (s.mouth === 'open' || s.mouth === 'o') { g.beginPath(); g.ellipse(1, -64, 8, 6, 0, 0, TAU); g.fill(); }
    else if (s.mouth === 'sad') { g.lineWidth = 2.5; g.strokeStyle = '#2A1708'; g.beginPath(); g.arc(1, -58, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else { g.fillRect(-7, -66, 16, 3); }
    g.restore();
    // palillo de tambor en la mano delantera
    const swing = s.armR + Math.sin(t * 9) * (s.eyes === 'angry' || s.mouth === 'open' ? 0.4 : 0.08);
    const [hx, hy] = limb(g, 20, -58, swing, 18, 6, woodD, 5, woodL);
    g.save();
    g.translate(hx, hy);
    g.rotate(-swing + 2.2);
    g.fillStyle = '#E8C99A'; roundRect(g, -3, -34, 6, 38, 3); g.fill();
    g.fillStyle = '#F6E3C2'; g.beginPath(); g.arc(0, -35, 5.5, 0, TAU); g.fill();
    g.restore();
  },
};

// Anclajes de cabeza para accesorios: [x, y superior, ancho, y de ojos]
const HEAD = {
  volt: [0, -90, 54, -76], mochi: [2, -74, 56, -40], pico: [6, -70, 40, -56], brik: [2, -92, 40, -78],
  nimbus: [2, -96, 56, -60], fang: [2, -84, 46, -68], ozzy: [2, -84, 58, -58], rex: [10, -86, 42, -72],
  npc: [0, -100, 40, -80], formal: [0, -102, 40, -82], frigo: [0, -104, 48, -88], toasty: [2, -94, 46, -74],
  silla: [0, -104, 50, -86], tuntun: [0, -106, 42, -82], creador: [0, -112, 46, -82],
};
// Anclaje del cuello para accesorios de cuerpo: [x, y, ancho del torso]
const NECK = {
  volt: [0, -54, 46], mochi: [0, -30, 58], pico: [2, -44, 34], brik: [0, -56, 44], nimbus: [0, -36, 52], fang: [0, -40, 38],
  ozzy: [0, -36, 46], rex: [2, -46, 40], npc: [0, -60, 36], formal: [0, -62, 38], frigo: [0, -66, 46], toasty: [0, -46, 32],
  silla: [0, -52, 48], tuntun: [0, -54, 40], creador: [0, -62, 40],
};

// accesorios de la versión anterior -> objetos del catálogo
export const LEGACY_ACC = { cap: 'acc_cap', bow: 'acc_bow', party: 'acc_party', headphones: 'acc_headphones', shades: 'acc_shades', helmet: 'acc_helmet', halo: 'acc_halo', horns: 'acc_horns', tophat: 'acc_tophat', crown: 'acc_crown' };
// Accesorios que no le quedan bien a un personaje (por su forma): no se pueden equipar con ese personaje y,
// si ya estaban puestos y se cambia de personaje, no se dibujan.
export const ACC_BLOCK = {
  silla: ['body_bufanda', 'body_corbata', 'body_cadena', 'body_toalla', 'body_mochila'],
  mochi: ['body_corbata', 'body_cadena'],
  ozzy: ['body_corbata', 'body_mochila', 'body_cadena'],
  nimbus: ['body_corbata', 'body_mochila'],
  frigo: ['body_toalla'],
};
/** ¿Este accesorio le queda a este personaje? */
export const accFits = (charId, itemId) => !(ACC_BLOCK[charId] || []).includes(itemId);

/** Normaliza el "look" de un jugador: string de la versión anterior u objeto {skin, hat, face, body}. */
export function normLook(acc) {
  if (!acc || acc === 'none') return {};
  if (typeof acc === 'string') {
    const id = LEGACY_ACC[acc] || acc;
    return FACES[id] ? { face: id } : HATS[id] ? { hat: id } : {};
  }
  return acc;
}

// Lo que va en la nariz (nariz de payaso, bigote) se corre al hocico/pico en los personajes de perfil
const NOSE_ITEMS = new Set(['face_payaso', 'face_bigote']);
const NOSE = { rex: [24, -3], pico: [22, 0], fang: [18, 0], ozzy: [0, 12] };
function drawHead(g, look, charId, t, color) {
  const [hx, hy, hw, ey] = HEAD[charId] || [0, -90, 50, -70];
  if (look.face && FACES[look.face]) {
    g.save();
    const [nx, ny] = NOSE_ITEMS.has(look.face) ? NOSE[charId] || [0, 0] : [0, 0];
    g.translate(hx + nx, ey + ny);
    FACES[look.face](g, hw, t, color);
    g.restore();
  }
  if (look.hat && HATS[look.hat]) {
    g.save();
    g.translate(hx, hy);
    HATS[look.hat](g, hw, t, color);
    g.restore();
  }
}
function drawBodyItem(g, look, charId, t, color, back) {
  const b = look.body && BODIES[look.body];
  if (!b || !!b.back !== back) return;
  const [nx, ny, bw] = NECK[charId] || [0, -50, 44];
  g.save();
  g.translate(nx, ny);
  b.draw(g, bw, t, color);
  g.restore();
}

// lienzo auxiliar para aplicar el patrón de la skin solo dentro de la silueta
const OFF = [];
function offCanvas(i, w, h) {
  let c = OFF[i];
  if (!c) {
    c = OFF[i] = document.createElement('canvas');
    c.g = c.getContext('2d');
  }
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
  }
  return c;
}
let offIdx = 0;

/**
 * Dibuja un personaje.
 * @param {CanvasRenderingContext2D} g
 * @param {object} o {id, x, y (pies), s (escala), color, anim, t, facing, acc (look), alpha, shadow}
 *   acc: id de accesorio de la versión anterior o {skin, hat, face, body}
 */
export function drawCharacter(g, o) {
  const ch = CHAR_BY_ID[o.id] || CHARACTERS[0];
  const t = o.t ?? performance.now() / 1000;
  const st = animState(o.anim || 'idle', t, (o.seed ?? 0) + ch.id.length * 0.37);
  if (o.eyes) st.eyes = o.eyes;
  const look = { ...normLook(o.acc) };
  for (const k of ['hat', 'face', 'body']) if (look[k] && !accFits(ch.id, look[k])) delete look[k];
  const skin = look.skin && SKINS[look.skin];
  let base0 = o.color || '#3985FF';
  if (skin?.tint) base0 = skin.tint(base0);
  const base = st.gray ? mix(base0, '#7C849E', st.gray) : base0;
  const c = { body: base, dark: shade(base, -0.32), light: shade(base, 0.28) };
  const s = o.s ?? 1;
  const facing = (o.facing ?? 1) * st.flip;
  const shakeX = st.shake ? (NATIVE_RANDOM() - 0.5) * st.shake * 2 : 0;
  const bodyTf = (ctx, sc) => {
    ctx.scale(sc * facing, sc);
    if (shakeX) ctx.translate(shakeX, 0);
    ctx.translate(0, st.y);
    ctx.rotate(st.rot);
    ctx.scale(st.sx, st.sy);
  };
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  if (skin?.alpha) g.globalAlpha *= skin.alpha;
  g.translate(o.x, o.y);
  if (o.shadow !== false) {
    const sh = Math.max(0.3, 1 + st.y / 60);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(0, 0, 30 * s * sh, 7 * s * sh, 0, 0, TAU); g.fill();
  }
  const tf = g.getTransform();
  const px = Math.hypot(tf.a, tf.b) * s;
  if (quality.level !== 'low' && px > 0.05 && px < 12) {
    // ESTILO CÓMIC: todo el personaje (con accesorios) se arma en un lienzo auxiliar, se le da sombra de un
    // solo corte con tramado de puntos y un brillo duro, y después se dibuja con contorno de tinta grueso.
    const k = px;
    const W2 = Math.ceil(180 * k), H2 = Math.ceil(190 * k);
    const off = offCanvas(offIdx++ % 6, W2, H2);
    const og = off.g;
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.clearRect(0, 0, off.width, off.height);
    og.setTransform(k, 0, 0, k, 90 * k, 170 * k);
    if (look.body) {
      og.save(); bodyTf(og, 1); og.translate(0, st.headY * 0.5);
      drawBodyItem(og, look, ch.id, t, base, true);
      og.restore();
    }
    og.save();
    bodyTf(og, 1);
    inkOn(og);
    DRAW[ch.id](og, st, c, t, ch);
    inkOff(og);
    og.restore();
    og.globalCompositeOperation = 'source-atop';
    if (skin?.overlay) {
      og.save();
      skin.overlay(og, t, base);
      og.restore();
    }
    // sombra de un corte (lado derecho-abajo) con puntos de historieta
    og.save();
    og.beginPath(); og.moveTo(18, -170); og.lineTo(95, -170); og.lineTo(95, 25); og.lineTo(4, 25); og.closePath();
    og.fillStyle = 'rgba(20,10,45,0.22)';
    og.fill();
    og.clip();
    og.fillStyle = halftone(og);
    og.fillRect(-95, -170, 190, 195);
    og.restore();
    // brillo duro arriba a la izquierda
    og.fillStyle = 'rgba(255,255,255,0.22)';
    og.beginPath(); og.ellipse(-20, -96, 10, 18, -0.6, 0, TAU); og.fill();
    og.globalCompositeOperation = 'source-over';
    og.shadowBlur = 0;
    // accesorios del frente (se contornean junto con el personaje)
    if (look.hat || look.face || look.body) {
      og.save(); bodyTf(og, 1); og.translate(0, st.headY);
      drawBodyItem(og, look, ch.id, t, o.color || base, false);
      drawHead(og, look, ch.id, t, o.color || base);
      og.restore();
    }
    og.shadowBlur = 0;
    // silueta de tinta para el contorno
    const sil = offCanvas(6 + (offIdx % 2), W2, H2);
    const sg = sil.g;
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-over';
    sg.clearRect(0, 0, sil.width, sil.height);
    sg.drawImage(off, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = '#0D0B14';
    sg.fillRect(0, 0, W2, H2);
    sg.globalCompositeOperation = 'source-over';
    const dx = -90 * s, dy = -170 * s, dw = 180 * s * (W2 - 1) / W2, dh = 190 * s * (H2 - 1) / H2;
    const ow = 3.2 * s;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      g.drawImage(sil, 0, 0, W2 - 1, H2 - 1, dx + Math.cos(a) * ow, dy + Math.sin(a) * ow, dw, dh);
    }
    g.drawImage(off, 0, 0, W2 - 1, H2 - 1, dx, dy, dw, dh);
  } else {
    if (look.body) {
      g.save(); bodyTf(g, s); g.translate(0, st.headY * 0.5);
      drawBodyItem(g, look, ch.id, t, base, true);
      g.restore();
    }
    g.save();
    bodyTf(g, s);
    DRAW[ch.id](g, st, c, t, ch);
    g.restore();
    if (look.hat || look.face || look.body) {
      g.save();
      bodyTf(g, s);
      g.translate(0, st.headY);
      drawBodyItem(g, look, ch.id, t, o.color || base, false);
      drawHead(g, look, ch.id, t, o.color || base);
      g.restore();
    }
  }
  g.restore();
}

// LÍNEA DE HISTORIETA: mientras se dibuja el cuerpo, cada forma rellena lleva un trazo de tinta fino y cada
// trazo grueso (brazos, piernas) lleva un borde de tinta por debajo. Así los 15 personajes quedan entintados igual.
const INK = '#0D0B14';
function inkOn(g) {
  if (g.__inkFill) return;
  const fill = g.fill, stroke = g.stroke;
  g.__inkFill = fill; g.__inkStroke = stroke;
  g.fill = function (...a) {
    fill.apply(this, a);
    if (this.globalAlpha < 0.5 || this.globalCompositeOperation !== 'source-over' || isLight(this.fillStyle)) return;
    const lw = this.lineWidth, ss = this.strokeStyle, lj = this.lineJoin, sb = this.shadowBlur;
    this.lineWidth = 2.4; this.strokeStyle = INK; this.lineJoin = 'round'; this.shadowBlur = 0;
    if (a[0] instanceof Path2D) stroke.call(this, a[0]); else stroke.call(this);
    this.lineWidth = lw; this.strokeStyle = ss; this.lineJoin = lj; this.shadowBlur = sb;
  };
  g.stroke = function (...a) {
    if (this.lineWidth >= 4 && this.globalAlpha >= 0.5) {
      const lw = this.lineWidth, ss = this.strokeStyle, lc = this.lineCap, sb = this.shadowBlur;
      this.lineWidth = lw + 4.4; this.strokeStyle = INK; this.shadowBlur = 0;
      stroke.apply(this, a);
      this.lineWidth = lw; this.strokeStyle = ss; this.lineCap = lc; this.shadowBlur = sb;
    }
    stroke.apply(this, a);
  };
}
// brillos y blancos de los ojos no llevan tinta (si no, los ojos se ven como manchas negras)
function isLight(fs) {
  if (typeof fs !== 'string') return false;
  let r, gg, b, a = 1;
  if (fs[0] === '#') {
    const h = fs.length === 4 ? fs.slice(1).split('').map((x) => x + x).join('') : fs.slice(1, 7);
    r = parseInt(h.slice(0, 2), 16); gg = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = fs.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    [r, gg, b, a = 1] = m[1].split(',').map(Number);
  }
  return a < 0.6 || (0.299 * r + 0.587 * gg + 0.114 * b) / 255 > 0.86;
}
function inkOff(g) {
  if (!g.__inkFill) return;
  delete g.fill; delete g.stroke;
  g.__inkFill = null; g.__inkStroke = null;
}

// tramado de puntos (para las sombras estilo cómic)
let HALFTONE = null;
function halftone(g) {
  if (HALFTONE) return HALFTONE;
  const c = document.createElement('canvas');
  c.width = c.height = 10;
  const d = c.getContext('2d');
  d.fillStyle = 'rgba(15,8,35,0.3)';
  d.beginPath(); d.arc(2.5, 2.5, 1.5, 0, TAU); d.arc(7.5, 7.5, 1.5, 0, TAU); d.fill();
  HALFTONE = g.createPattern(c, 'repeat');
  return HALFTONE;
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

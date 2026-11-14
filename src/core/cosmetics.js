// Cosméticos dibujados con Canvas: skins (paleta + patrón), sombreros, máscaras/gafas, accesorios de
// cuerpo y efectos de entrada/victoria. Ninguno cambia el tamaño de colisión ni la jugabilidad.
import { TAU, shade, mix, rgba, roundRect, quality } from './utils.js';

const star = (g, x, y, r, n = 5, inner = 0.45) => {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
};
const glow = (g, color, blur) => {
  if (quality.glow) {
    g.shadowColor = color;
    g.shadowBlur = blur;
  }
};

// ------------------------------------------------------------------ SKINS
// tint(base) -> color del cuerpo; overlay(g, t, base) dibuja dentro de la silueta (x -75..75, y -140..20)
const stripes = (g, color, w, gap, ang = -0.6) => {
  g.save();
  g.rotate(ang);
  g.fillStyle = color;
  for (let x = -220; x < 220; x += gap) g.fillRect(x, -260, w, 520);
  g.restore();
};
export const SKINS = {
  skin_rayas: { overlay: (g) => stripes(g, 'rgba(255,255,255,0.28)', 7, 18) },
  skin_lunares: {
    overlay: (g) => {
      g.fillStyle = 'rgba(255,255,255,0.42)';
      for (let y = -140; y < 20; y += 16) for (let x = -80 + ((y / 16) % 2 ? 8 : 0); x < 80; x += 16) { g.beginPath(); g.arc(x, y, 3.4, 0, TAU); g.fill(); }
    },
  },
  skin_cuadros: {
    overlay: (g) => {
      g.fillStyle = 'rgba(255,255,255,0.22)';
      for (let y = -140; y < 20; y += 12) g.fillRect(-80, y, 160, 6);
      for (let x = -80; x < 80; x += 12) g.fillRect(x, -140, 6, 160);
    },
  },
  skin_camuflaje: {
    tint: (b) => mix(b, '#5B6B3A', 0.55),
    overlay: (g) => {
      const blobs = [[-30, -90, 16, '#3C4A26'], [20, -60, 18, '#7C8B4F'], [-10, -30, 14, '#2E3A1E'], [30, -110, 12, '#3C4A26'], [-40, -50, 12, '#7C8B4F'], [10, -15, 15, '#4E5E30']];
      for (const [x, y, r, c] of blobs) { g.fillStyle = rgba(c, 0.75); g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0.5, 0, TAU); g.fill(); }
    },
  },
  skin_retro: {
    overlay: (g) => {
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = -140; y < 20; y += 4) g.fillRect(-80, y, 160, 1.6);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let y = -140; y < 20; y += 8) for (let x = -80; x < 80; x += 8) if (((x + y) / 8) % 2 === 0) g.fillRect(x, y, 4, 4);
    },
  },
  skin_neon: {
    tint: (b) => mix(b, '#141933', 0.6),
    overlay: (g, t, b) => {
      g.strokeStyle = rgba(shade(b, 0.4), 0.85);
      g.lineWidth = 2;
      glow(g, b, 8);
      for (let y = -130; y < 20; y += 14) { g.beginPath(); g.moveTo(-80, y + Math.sin(t * 2 + y) * 2); g.lineTo(80, y); g.stroke(); }
    },
  },
  skin_hielo: {
    tint: (b) => mix(b, '#A9E8FF', 0.6),
    overlay: (g, t) => {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 12; i++) {
        const x = -60 + ((i * 37) % 120), y = -130 + ((i * 53) % 140);
        const a = 0.4 + Math.sin(t * 3 + i) * 0.4;
        g.globalAlpha = Math.max(0, a);
        star(g, x, y, 3.5, 4, 0.3); g.fill();
      }
      g.globalAlpha = 1;
    },
  },
  skin_selva: {
    tint: (b) => mix(b, '#2F9E5B', 0.45),
    overlay: (g) => {
      g.fillStyle = 'rgba(20,80,40,0.55)';
      for (let i = 0; i < 9; i++) {
        const x = -60 + ((i * 29) % 120), y = -125 + ((i * 41) % 140);
        g.beginPath(); g.ellipse(x, y, 12, 5, i, 0, TAU); g.fill();
      }
    },
  },
  skin_fuego: {
    tint: (b) => mix(b, '#FF5A1F', 0.55),
    overlay: (g, t) => {
      const grd = g.createLinearGradient(0, 20, 0, -120);
      grd.addColorStop(0, 'rgba(255,214,77,0.75)');
      grd.addColorStop(0.5, 'rgba(255,90,31,0.3)');
      grd.addColorStop(1, 'rgba(255,90,31,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(-80, 20);
      for (let x = -80; x <= 80; x += 10) g.lineTo(x, -30 - Math.abs(Math.sin(t * 6 + x * 0.2)) * 50);
      g.lineTo(80, 20);
      g.fill();
    },
  },
  skin_cyber: {
    tint: (b) => mix(b, '#1B2440', 0.55),
    overlay: (g, t) => {
      g.strokeStyle = 'rgba(37,207,230,0.8)';
      g.lineWidth = 1.6;
      glow(g, '#25CFE6', 6);
      const paths = [[-50, -120, -50, -80, -20, -80], [30, -130, 30, -95, 55, -95], [-40, -40, -10, -40, -10, -10], [20, -60, 45, -60, 45, -20]];
      for (const [a, b2, c2, d, e, f] of paths) { g.beginPath(); g.moveTo(a, b2); g.lineTo(c2, d); g.lineTo(e, f); g.stroke(); g.fillStyle = '#25CFE6'; g.beginPath(); g.arc(e, f, 2.5, 0, TAU); g.fill(); }
      const k = (t * 0.8) % 1;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(-50, -120 + k * 40, 2, 0, TAU); g.fill();
    },
  },
  skin_cristal: {
    tint: (b) => mix(b, '#CFF4FF', 0.5),
    overlay: (g, t) => {
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 1.2;
      const pts = [[-60, -130], [0, -100], [50, -135], [-40, -60], [30, -50], [-60, 0], [10, 10], [60, -10]];
      g.beginPath();
      for (let i = 0; i < pts.length - 2; i++) { g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.lineTo(...pts[i + 2]); }
      g.stroke();
      const x = -80 + ((t * 70) % 200);
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.save(); g.rotate(-0.5); g.fillRect(x, -200, 14, 400); g.restore();
    },
  },
  skin_volcan: {
    tint: () => '#2A2230',
    overlay: (g, t) => {
      g.strokeStyle = `rgba(255,${120 + Math.sin(t * 4) * 40},40,0.9)`;
      g.lineWidth = 2.4;
      glow(g, '#FF6A2A', 8);
      g.beginPath();
      g.moveTo(-40, -130); g.lineTo(-25, -95); g.lineTo(-38, -60); g.lineTo(-20, -20);
      g.moveTo(35, -120); g.lineTo(20, -80); g.lineTo(40, -45); g.lineTo(25, 0);
      g.moveTo(-25, -95); g.lineTo(10, -88);
      g.stroke();
    },
  },
  skin_galaxia: {
    tint: () => '#2A1A5E',
    overlay: (g, t) => {
      const grd = g.createRadialGradient(10, -70, 5, 10, -70, 90);
      grd.addColorStop(0, 'rgba(255,95,162,0.45)');
      grd.addColorStop(0.6, 'rgba(57,133,255,0.2)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(-80, -140, 160, 160);
      g.fillStyle = '#fff';
      for (let i = 0; i < 22; i++) {
        const x = -70 + ((i * 47) % 140), y = -135 + ((i * 71) % 150);
        g.globalAlpha = 0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.6;
        g.fillRect(x, y, 1.8, 1.8);
      }
      g.globalAlpha = 1;
    },
  },
  skin_glitch: {
    overlay: (g, t, b) => {
      const seed = Math.floor(t * 8);
      for (let i = 0; i < 5; i++) {
        const y = -140 + ((seed * 31 + i * 47) % 160);
        g.fillStyle = i % 2 ? 'rgba(255,0,110,0.35)' : 'rgba(0,229,255,0.35)';
        g.fillRect(-80 + ((seed + i) % 3) * 4, y, 160, 4 + (i % 3) * 3);
      }
      g.fillStyle = rgba(shade(b, 0.5), 0.15);
      g.fillRect(-80, -140, 160, 160);
    },
  },
  skin_fantasma: {
    alpha: 0.62,
    tint: (b) => mix(b, '#E9F0FF', 0.6),
    overlay: (g, t) => {
      g.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-30 + i * 22, -40 - Math.sin(t * 2 + i) * 20, 18, 8, 0, 0, TAU); g.fill(); }
    },
  },
  skin_oro: {
    tint: () => '#E8B437',
    overlay: (g, t) => {
      const x = -120 + ((t * 90) % 260);
      const grd = g.createLinearGradient(x - 30, 0, x + 30, 0);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(0.5, 'rgba(255,250,210,0.75)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.rotate(-0.4); g.fillStyle = grd; g.fillRect(x - 30, -220, 60, 440); g.restore();
    },
  },
  skin_samurai: {
    tint: () => '#B3262E',
    overlay: (g) => {
      g.fillStyle = 'rgba(255,209,107,0.75)';
      for (let y = -60; y < 10; y += 11) g.fillRect(-80, y, 160, 2.2);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = -55; y < 10; y += 11) g.fillRect(-80, y, 160, 3);
    },
  },
  skin_cosmico: {
    tint: () => '#1A1240',
    overlay: (g, t) => {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.6 + i * 2.1;
        const grd = g.createRadialGradient(Math.cos(a) * 30, -70 + Math.sin(a) * 30, 2, Math.cos(a) * 30, -70 + Math.sin(a) * 30, 70);
        grd.addColorStop(0, ['rgba(255,59,92,0.55)', 'rgba(155,108,255,0.55)', 'rgba(37,207,230,0.5)'][i]);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(-80, -140, 160, 160);
      }
      g.fillStyle = '#fff';
      for (let i = 0; i < 16; i++) { g.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.5; star(g, -70 + ((i * 53) % 140), -135 + ((i * 37) % 150), 2.2, 4, 0.35); g.fill(); }
      g.globalAlpha = 1;
    },
  },
  // ---- set del creador
  skin_creador: {
    tint: () => '#3B1C7A',
    overlay: (g, t) => {
      g.strokeStyle = 'rgba(255,209,107,0.85)';
      g.lineWidth = 2.2;
      for (let i = 0; i < 6; i++) {
        const y = -130 + i * 26;
        g.beginPath(); g.moveTo(-80, y); g.lineTo(-30 + i * 6, y); g.lineTo(-20 + i * 6, y + 12); g.lineTo(80, y + 12); g.stroke();
      }
      g.fillStyle = '#FFD16B';
      for (let i = 0; i < 6; i++) { g.globalAlpha = 0.5 + Math.sin(t * 4 + i) * 0.5; g.beginPath(); g.arc(-20 + i * 6, -118 + i * 26, 3, 0, TAU); g.fill(); }
      g.globalAlpha = 1;
    },
  },
  // ---- Pase de Batalla · Temporada 1
  skin_s1_holo: {
    tint: (b) => mix(b, '#D9E4FF', 0.55),
    overlay: (g, t) => {
      const x = Math.sin(t * 0.9) * 40;
      const grd = g.createLinearGradient(-90 + x, -140, 90 + x, 20);
      ['rgba(255,95,162,0.35)', 'rgba(255,201,60,0.3)', 'rgba(72,213,151,0.3)', 'rgba(37,207,230,0.35)', 'rgba(155,108,255,0.35)'].forEach((c, i) => grd.addColorStop(i / 4, c));
      g.fillStyle = grd;
      g.fillRect(-80, -140, 160, 160);
    },
  },
  skin_s1_tigre: {
    tint: () => '#F28A2E',
    overlay: (g) => {
      g.fillStyle = 'rgba(25,14,6,0.8)';
      for (let i = 0; i < 7; i++) {
        const y = -130 + i * 22;
        g.beginPath(); g.moveTo(-80, y); g.quadraticCurveTo(-40, y + 9, -18, y + 2); g.quadraticCurveTo(-40, y + 15, -80, y + 11); g.fill();
        g.beginPath(); g.moveTo(80, y + 8); g.quadraticCurveTo(40, y + 17, 18, y + 10); g.quadraticCurveTo(40, y + 23, 80, y + 19); g.fill();
      }
    },
  },
  skin_s1_carbono: {
    tint: () => '#1E2026',
    overlay: (g, t) => {
      for (let y = -140; y < 20; y += 8) for (let x = -80; x < 80; x += 8) {
        g.fillStyle = ((x + y) / 8) % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.25)';
        g.fillRect(x, y, 8, 4); g.fillRect(x + 4, y + 4, 4, 4);
      }
      g.fillStyle = 'rgba(255,209,107,0.85)';
      g.fillRect(-80, -66, 160, 2.5);
      const x = -120 + ((t * 70) % 260);
      g.fillStyle = 'rgba(255,240,200,0.22)'; g.save(); g.rotate(-0.5); g.fillRect(x, -220, 18, 440); g.restore();
    },
  },
  skin_s1_prisma: {
    tint: () => '#F4F6FF',
    overlay: (g, t) => {
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + i;
        g.fillStyle = `hsla(${(t * 60 + i * 60) % 360}, 90%, 60%, 0.35)`;
        g.beginPath(); g.moveTo(0, -60); g.lineTo(Math.cos(a) * 140, -60 + Math.sin(a) * 140); g.lineTo(Math.cos(a + 0.5) * 140, -60 + Math.sin(a + 0.5) * 140); g.fill();
      }
      g.fillStyle = '#fff';
      for (let i = 0; i < 10; i++) { g.globalAlpha = 0.4 + Math.sin(t * 4 + i * 1.7) * 0.4; star(g, -65 + ((i * 41) % 130), -130 + ((i * 29) % 140), 3, 4, 0.3); g.fill(); }
      g.globalAlpha = 1;
    },
  },
};
// skins de Maestría: dorado con franjas del color del minijuego
const MASTERY_COL = { reaction: '#FFC93C', race: '#25CFE6', pong: '#9B6CFF', platform: '#48D597', hoop: '#FF8E3C', memory: '#FF5FA2', color: '#48D597', arena: '#FF654F', target: '#FFC93C', beat: '#FF5FA2', fish: '#25CFE6', blocks: '#9B6CFF', sneak: '#6F7CFF', tennis: '#C6F04A', tower: '#FF9E5E', blast: '#FF4D6D' };
for (const [g, col] of Object.entries(MASTERY_COL)) {
  SKINS['skin_m_' + g] = {
    tint: () => '#D9A630',
    overlay: (ctx, t) => {
      stripes(ctx, rgba(col, 0.75), 6, 22, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      star(ctx, 0, -60 + Math.sin(t * 2) * 2, 7, 5); ctx.fill();
    },
  };
}

// ------------------------------------------------------------------ SOMBREROS (origen: parte superior de la cabeza)
export const HATS = {
  acc_cap(g, hw, t, col) {
    g.fillStyle = '#232A44';
    g.beginPath(); g.ellipse(0, 4, hw * 0.42, hw * 0.32, 0, Math.PI, 0); g.fill();
    roundRect(g, 0, -1, hw * 0.62, 6, 3); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(-2, -6, 4, 0, TAU); g.fill();
  },
  acc_bow(g, hw) {
    g.translate(hw * 0.28, 2);
    g.fillStyle = '#FF5FA2';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-12, -9); g.lineTo(-12, 9); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(12, -9); g.lineTo(12, 9); g.fill();
    g.fillStyle = '#FFB3D1'; g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill();
  },
  acc_party(g) {
    g.rotate(-0.15);
    g.fillStyle = '#9B6CFF';
    g.beginPath(); g.moveTo(-12, 4); g.lineTo(0, -30); g.lineTo(12, 4); g.fill();
    g.fillStyle = '#FFC93C';
    g.beginPath(); g.moveTo(-8, -6); g.lineTo(8, -8); g.lineTo(6, -14); g.lineTo(-5, -12); g.fill();
    g.fillStyle = '#48D597'; g.beginPath(); g.arc(0, -31, 4.5, 0, TAU); g.fill();
  },
  acc_headphones(g, hw) {
    g.strokeStyle = '#232A44'; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 18, hw * 0.52, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.fillStyle = '#232A44';
    roundRect(g, -hw * 0.58, 10, 12, 20, 5); g.fill();
    roundRect(g, hw * 0.58 - 12, 10, 12, 20, 5); g.fill();
    g.fillStyle = '#48D597';
    g.beginPath(); g.arc(-hw * 0.58 + 6, 20, 3, 0, TAU); g.arc(hw * 0.58 - 6, 20, 3, 0, TAU); g.fill();
  },
  acc_helmet(g, hw, t, col) {
    g.fillStyle = '#F6F7FB';
    g.beginPath(); g.ellipse(0, 10, hw * 0.55, hw * 0.45, 0, Math.PI, 0); g.fill();
    g.fillStyle = col; g.fillRect(-4, 10 - hw * 0.45, 8, hw * 0.45);
    g.fillStyle = 'rgba(37,207,230,0.75)';
    roundRect(g, hw * 0.05, 2, hw * 0.48, 9, 4); g.fill();
  },
  acc_halo(g, hw, t) {
    glow(g, '#FFE45C', 12);
    g.strokeStyle = '#FFE45C'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, -14 + Math.sin(t * 3) * 2, hw * 0.36, 6, 0, 0, TAU); g.stroke();
  },
  acc_horns(g, hw) {
    g.fillStyle = '#E8E3D3';
    g.beginPath(); g.moveTo(-hw * 0.4, 0); g.quadraticCurveTo(-hw * 0.75, -8, -hw * 0.62, -26); g.quadraticCurveTo(-hw * 0.5, -10, -hw * 0.25, -4); g.fill();
    g.beginPath(); g.moveTo(hw * 0.4, 0); g.quadraticCurveTo(hw * 0.75, -8, hw * 0.62, -26); g.quadraticCurveTo(hw * 0.5, -10, hw * 0.25, -4); g.fill();
    g.fillStyle = '#8D97B5';
    g.beginPath(); g.ellipse(0, 6, hw * 0.45, hw * 0.36, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#C7CEE3'; g.fillRect(-hw * 0.45, 2, hw * 0.9, 5);
  },
  acc_tophat(g, hw, t, col) {
    g.fillStyle = '#151A2C';
    roundRect(g, -hw * 0.4, 0, hw * 0.8, 6, 3); g.fill();
    roundRect(g, -hw * 0.26, -30, hw * 0.52, 32, 4); g.fill();
    g.fillStyle = col; g.fillRect(-hw * 0.26, -8, hw * 0.52, 6);
  },
  acc_crown(g, hw) {
    g.save(); glow(g, '#FFC93C', 10);
    g.fillStyle = '#FFC93C';
    g.beginPath();
    g.moveTo(-hw * 0.34, 4); g.lineTo(-hw * 0.36, -16); g.lineTo(-hw * 0.17, -6); g.lineTo(0, -22); g.lineTo(hw * 0.17, -6); g.lineTo(hw * 0.36, -16); g.lineTo(hw * 0.34, 4);
    g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#FF5FA2'; g.beginPath(); g.arc(0, -4, 3, 0, TAU); g.fill();
    g.fillStyle = '#25CFE6'; g.beginPath(); g.arc(-hw * 0.2, -2, 2.5, 0, TAU); g.arc(hw * 0.2, -2, 2.5, 0, TAU); g.fill();
  },
  hat_lana(g, hw, t, col) {
    g.fillStyle = shade(col, -0.15);
    g.beginPath(); g.ellipse(0, 6, hw * 0.48, hw * 0.4, 0, Math.PI, 0); g.fill();
    g.fillStyle = shade(col, 0.25); roundRect(g, -hw * 0.5, 0, hw, 9, 4); g.fill();
    g.fillStyle = '#F6F7FB'; g.beginPath(); g.arc(0, 4 - hw * 0.42, 7, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2;
    for (let x = -hw * 0.4; x < hw * 0.45; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 9); g.stroke(); }
  },
  hat_bandana(g, hw, t, col) {
    g.fillStyle = col;
    roundRect(g, -hw * 0.5, 8, hw, 9, 4); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-hw * 0.5, 11, hw, 2.5);
    g.fillStyle = col;
    g.beginPath(); g.moveTo(-hw * 0.48, 12); g.lineTo(-hw * 0.72, 18 + Math.sin(t * 6) * 3); g.lineTo(-hw * 0.7, 6); g.fill();
  },
  hat_gorra_atras(g, hw) {
    g.fillStyle = '#E8473A';
    g.beginPath(); g.ellipse(0, 4, hw * 0.42, hw * 0.32, 0, Math.PI, 0); g.fill();
    roundRect(g, -hw * 0.62, -1, hw * 0.5, 6, 3); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-4, -hw * 0.25, 8, 6);
  },
  hat_vaquero(g, hw) {
    g.fillStyle = '#8B5A2B';
    g.beginPath(); g.ellipse(0, 4, hw * 0.8, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#A06A35';
    roundRect(g, -hw * 0.3, -24, hw * 0.6, 28, 10); g.fill();
    g.fillStyle = '#3A2414'; g.fillRect(-hw * 0.3, -4, hw * 0.6, 5);
  },
  hat_cono(g, hw) {
    g.fillStyle = '#FF7A1A';
    g.beginPath(); g.moveTo(-hw * 0.32, 6); g.lineTo(0, -38); g.lineTo(hw * 0.32, 6); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(-hw * 0.2, -12); g.lineTo(hw * 0.2, -12); g.lineTo(hw * 0.14, -20); g.lineTo(-hw * 0.14, -20); g.fill();
    g.fillStyle = '#E8E3D3'; roundRect(g, -hw * 0.42, 3, hw * 0.84, 6, 2); g.fill();
  },
  hat_olla(g, hw) {
    g.fillStyle = '#9AA3BE';
    roundRect(g, -hw * 0.45, -16, hw * 0.9, 22, 6); g.fill();
    g.fillStyle = '#C9D0E3'; g.fillRect(-hw * 0.45, -14, hw * 0.9, 4);
    g.strokeStyle = '#5E6788'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(hw * 0.45, -8); g.lineTo(hw * 0.75, -12); g.stroke();
  },
  hat_kabuto(g, hw) {
    g.fillStyle = '#2B2F3F';
    g.beginPath(); g.ellipse(0, 8, hw * 0.55, hw * 0.45, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#B3262E'; g.fillRect(-hw * 0.6, 4, hw * 1.2, 6);
    g.fillStyle = '#FFD16B';
    g.beginPath(); g.arc(0, -hw * 0.3, hw * 0.34, Math.PI * 1.05, Math.PI * 1.95); g.arc(0, -hw * 0.3 + 4, hw * 0.28, Math.PI * 1.95, Math.PI * 1.05, true); g.fill();
  },
  hat_mago(g, hw, t) {
    g.fillStyle = '#3B2A8F';
    g.beginPath(); g.moveTo(-hw * 0.45, 6); g.quadraticCurveTo(-4, -20, 6, -46); g.quadraticCurveTo(4, -20, hw * 0.45, 6); g.fill();
    g.fillStyle = '#2A1E66'; g.beginPath(); g.ellipse(0, 6, hw * 0.62, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#FFD16B';
    for (const [x, y, r] of [[-6, -12, 4], [6, -26, 3], [-2, -2, 2.5]]) { g.globalAlpha = 0.6 + Math.sin(t * 4 + x) * 0.4; star(g, x, y, r); g.fill(); }
    g.globalAlpha = 1;
  },
  hat_gamer(g, hw, t) {
    const hue = (t * 120) % 360;
    g.strokeStyle = '#1B2033'; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 18, hw * 0.52, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.fillStyle = '#1B2033';
    roundRect(g, -hw * 0.6, 8, 13, 22, 5); g.fill();
    roundRect(g, hw * 0.6 - 13, 8, 13, 22, 5); g.fill();
    g.fillStyle = `hsl(${hue},95%,60%)`; glow(g, g.fillStyle, 10);
    roundRect(g, -hw * 0.6 + 3, 12, 7, 14, 3); g.fill();
    g.fillStyle = `hsl(${(hue + 120) % 360},95%,60%)`;
    roundRect(g, hw * 0.6 - 10, 12, 7, 14, 3); g.fill();
  },
  hat_corona_hielo(g, hw, t) {
    glow(g, '#A9E8FF', 12);
    g.fillStyle = 'rgba(190,240,255,0.92)';
    g.beginPath();
    g.moveTo(-hw * 0.36, 4);
    for (let i = 0; i <= 6; i++) { const x = -hw * 0.36 + (i * hw * 0.72) / 6; g.lineTo(x, i % 2 ? -8 : -24 - (i === 3 ? 6 : 0)); }
    g.lineTo(hw * 0.36, 4); g.closePath(); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#fff'; g.globalAlpha = 0.5 + Math.sin(t * 5) * 0.5; star(g, 0, -20, 4, 4, 0.3); g.fill(); g.globalAlpha = 1;
  },
  hat_cuernos_fuego(g, hw, t) {
    for (const side of [-1, 1]) {
      g.fillStyle = '#3A1010';
      g.beginPath(); g.moveTo(side * hw * 0.22, 4); g.quadraticCurveTo(side * hw * 0.55, -6, side * hw * 0.48, -28); g.quadraticCurveTo(side * hw * 0.36, -10, side * hw * 0.06, 2); g.fill();
      g.save(); glow(g, '#FF6A2A', 10);
      g.fillStyle = `rgba(255,${130 + Math.sin(t * 10 + side) * 50},40,0.9)`;
      g.beginPath(); g.ellipse(side * hw * 0.48, -32 - Math.abs(Math.sin(t * 9 + side)) * 4, 4, 8, 0, 0, TAU); g.fill();
      g.restore();
    }
  },
  hat_pato(g, hw, t) {
    const b = Math.sin(t * 4) * 1.5;
    g.fillStyle = '#FFD43B';
    g.beginPath(); g.ellipse(0, -8 + b, 16, 11, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(9, -20 + b, 8, 0, TAU); g.fill();
    g.fillStyle = '#FF8E3C'; g.beginPath(); g.moveTo(15, -21 + b); g.lineTo(24, -18 + b); g.lineTo(15, -16 + b); g.fill();
    g.fillStyle = '#10131F'; g.beginPath(); g.arc(11, -22 + b, 1.6, 0, TAU); g.fill();
    g.fillStyle = '#F2C21F'; g.beginPath(); g.ellipse(-4, -9 + b, 8, 5, -0.3, 0, TAU); g.fill();
  },
  hat_corona_xl(g, hw) {
    g.save(); glow(g, '#FFC93C', 16);
    g.fillStyle = '#FFC93C';
    const w = hw * 0.75;
    g.beginPath();
    g.moveTo(-w, 6); g.lineTo(-w * 1.05, -40); g.lineTo(-w * 0.5, -16); g.lineTo(0, -54); g.lineTo(w * 0.5, -16); g.lineTo(w * 1.05, -40); g.lineTo(w, 6);
    g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#FF3B5C'; g.beginPath(); g.arc(0, -10, 6, 0, TAU); g.fill();
    g.fillStyle = '#25CFE6'; g.beginPath(); g.arc(-w * 0.55, -6, 4.5, 0, TAU); g.arc(w * 0.55, -6, 4.5, 0, TAU); g.fill();
    g.fillStyle = '#fff'; for (const x of [-w * 1.05, 0, w * 1.05]) { g.beginPath(); g.arc(x, x === 0 ? -54 : -40, 4, 0, TAU); g.fill(); }
  },
  hat_corona_cosmica(g, hw, t) {
    g.save(); glow(g, '#9B6CFF', 14);
    g.fillStyle = '#6B4DFF';
    g.beginPath();
    g.moveTo(-hw * 0.36, 4); g.lineTo(-hw * 0.38, -18); g.lineTo(-hw * 0.18, -8); g.lineTo(0, -26); g.lineTo(hw * 0.18, -8); g.lineTo(hw * 0.38, -18); g.lineTo(hw * 0.36, 4);
    g.closePath(); g.fill(); g.restore();
    for (let i = 0; i < 3; i++) {
      const a = t * (1.2 + i * 0.4) + i * 2;
      const x = Math.cos(a) * hw * 0.6, y = -16 + Math.sin(a) * 9;
      g.fillStyle = ['#FF5FA2', '#25CFE6', '#FFD16B'][i];
      g.beginPath(); g.arc(x, y, 3.2 + i, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(0, -16, hw * 0.6, 9, 0, 0, TAU); g.stroke();
  },
  hat_corona_creador(g, hw, t) {
    g.save(); glow(g, '#FFD16B', 14);
    const y = -12 + Math.sin(t * 2.4) * 3, w = hw * 0.42;
    g.fillStyle = '#FFD16B';
    g.beginPath(); g.moveTo(-w, y + 8); g.lineTo(-w, y - 6); g.lineTo(-w * 0.45, y + 1); g.lineTo(0, y - 12); g.lineTo(w * 0.45, y + 1); g.lineTo(w, y - 6); g.lineTo(w, y + 8); g.closePath(); g.fill();
    g.fillStyle = '#B98CFF'; g.beginPath(); g.arc(0, y + 3, 3.5, 0, TAU); g.fill();
    g.restore();
  },
  hat_aureola67(g, hw, t) {
    g.save(); glow(g, '#FFD16B', 16);
    g.strokeStyle = '#FFD16B'; g.lineWidth = 5;
    const y = -16 + Math.sin(t * 3) * 2;
    g.beginPath(); g.ellipse(0, y, hw * 0.4, 7, 0, 0, TAU); g.stroke();
    g.restore();
    g.font = '900 11px "Russo One", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#FFF4CF';
    g.fillText('67', 0, y - 9);
  },
};

// ------------------------------------------------------------------ MÁSCARAS Y GAFAS (origen: altura de los ojos)
export const FACES = {
  acc_shades(g, hw) {
    g.fillStyle = '#10131F';
    roundRect(g, -hw * 0.38, -6, hw * 0.34, 12, 4); g.fill();
    roundRect(g, hw * 0.06, -6, hw * 0.34, 12, 4); g.fill();
    g.fillRect(-hw * 0.06, -4, hw * 0.14, 3);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(-hw * 0.32, -4, 5, 3); g.fillRect(hw * 0.12, -4, 5, 3);
  },
  face_bigote(g, hw) {
    g.fillStyle = '#2B1D14';
    g.beginPath();
    g.moveTo(0, 12); g.bezierCurveTo(-8, 6, -18, 8, -22, 16); g.bezierCurveTo(-14, 13, -8, 16, 0, 15);
    g.bezierCurveTo(8, 16, 14, 13, 22, 16); g.bezierCurveTo(18, 8, 8, 6, 0, 12); g.fill();
  },
  face_curita(g, hw) {
    g.save(); g.translate(hw * 0.22, 10); g.rotate(-0.5);
    g.fillStyle = '#F2C7A0'; roundRect(g, -11, -4, 22, 8, 4); g.fill();
    g.fillStyle = '#E4A97A'; g.fillRect(-4, -4, 8, 8);
    g.restore();
  },
  face_nerd(g, hw) {
    g.strokeStyle = '#1B2033'; g.lineWidth = 3;
    g.beginPath(); g.arc(-hw * 0.2, 0, 8, 0, TAU); g.moveTo(hw * 0.2 + 8, 0); g.arc(hw * 0.2, 0, 8, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-hw * 0.2 + 8, 0); g.lineTo(hw * 0.2 - 8, 0); g.stroke();
    g.fillStyle = 'rgba(200,230,255,0.25)'; g.beginPath(); g.arc(-hw * 0.2, 0, 7, 0, TAU); g.arc(hw * 0.2, 0, 7, 0, TAU); g.fill();
  },
  face_3d(g, hw) {
    g.fillStyle = '#F6F7FB'; roundRect(g, -hw * 0.42, -7, hw * 0.84, 14, 4); g.fill();
    g.fillStyle = 'rgba(255,60,60,0.85)'; roundRect(g, -hw * 0.38, -5, hw * 0.32, 10, 3); g.fill();
    g.fillStyle = 'rgba(40,140,255,0.85)'; roundRect(g, hw * 0.06, -5, hw * 0.32, 10, 3); g.fill();
  },
  face_monoculo(g, hw) {
    g.strokeStyle = '#FFD16B'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(hw * 0.2, 0, 8, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(220,240,255,0.3)'; g.fill();
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(hw * 0.2 + 6, 6); g.quadraticCurveTo(hw * 0.4, 20, hw * 0.3, 32); g.stroke();
  },
  face_payaso(g, hw) {
    g.save(); glow(g, '#FF3B5C', 6);
    g.fillStyle = '#FF3B5C'; g.beginPath(); g.arc(hw * 0.05, 9, 6.5, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(hw * 0.03, 7, 2, 0, TAU); g.fill();
  },
  face_visor(g, hw, t) {
    g.save(); glow(g, '#25CFE6', 10);
    g.fillStyle = 'rgba(37,207,230,0.85)';
    roundRect(g, -hw * 0.46, -6, hw * 0.92, 11, 5); g.fill();
    g.restore();
    g.fillStyle = '#E6FCFF';
    const x = -hw * 0.4 + ((t * 40) % (hw * 0.8));
    g.fillRect(x, -4, 3, 7);
    g.fillStyle = '#0B1020'; g.font = '700 5px monospace'; g.fillText('DC', hw * 0.22, 2);
  },
  face_menpo(g, hw) {
    g.fillStyle = '#2B2F3F';
    g.beginPath(); g.moveTo(-hw * 0.4, 6); g.lineTo(hw * 0.4, 6); g.lineTo(hw * 0.3, 24); g.lineTo(0, 30); g.lineTo(-hw * 0.3, 24); g.closePath(); g.fill();
    g.fillStyle = '#B3262E'; g.fillRect(-hw * 0.32, 12, hw * 0.64, 3);
    g.fillStyle = '#FFD16B'; for (const x of [-8, 0, 8]) g.fillRect(x - 1, 18, 2, 6);
  },
  face_fantasma(g, hw, t) {
    g.globalAlpha = 0.9;
    g.fillStyle = '#F2F5FF';
    g.beginPath(); g.ellipse(0, 6, hw * 0.42, hw * 0.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#10131F';
    g.beginPath(); g.ellipse(-hw * 0.16, 0, 4, 6, 0, 0, TAU); g.ellipse(hw * 0.16, 0, 4, 6, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 14, 7, 0.1, Math.PI - 0.1); g.fill();
    g.globalAlpha = 1;
  },
  face_aura(g, hw, t) {
    const drop = Math.min(1, (t % 4) / 0.6);
    g.save(); g.translate(0, -18 + drop * 18);
    g.fillStyle = '#0B0B0B';
    const px = 3;
    const rows = ['XXXXXXX.XXXXXXX', 'XWWXXXX.XWWXXXX', 'XXXXXX...XXXXXX', '.XXXX.....XXXX.'];
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'W' ? '#fff' : '#0B0B0B';
      g.fillRect(-22 + x * px, -6 + y * px, px, px);
    }));
    g.restore();
  },
};

// ------------------------------------------------------------------ ACCESORIOS DE CUERPO (origen: cuello)
// back = se dibuja detrás del personaje
export const BODIES = {
  body_bufanda: { draw(g, bw, t, col) {
    g.fillStyle = shade(col, 0.15); roundRect(g, -bw * 0.5, -6, bw, 11, 5); g.fill();
    g.fillStyle = shade(col, -0.1);
    g.save(); g.translate(-bw * 0.3, 2); g.rotate(0.25 + Math.sin(t * 4) * 0.08); roundRect(g, -5, 0, 10, 26, 4); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = -bw * 0.45; x < bw * 0.5; x += 8) g.fillRect(x, -6, 3, 11);
  } },
  body_corbata: { draw(g, bw, t, col) {
    g.fillStyle = '#E8473A';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, -7); g.lineTo(-11, 7); g.fill();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(11, -7); g.lineTo(11, 7); g.fill();
    g.fillStyle = '#B42F25'; g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); g.fill();
  } },
  body_capa: { back: true, draw(g, bw, t, col) {
    g.fillStyle = shade(col, -0.35);
    g.beginPath(); g.moveTo(-bw * 0.45, -2); g.lineTo(bw * 0.45, -2);
    g.quadraticCurveTo(bw * 0.7 + Math.sin(t * 5) * 6, 40, bw * 0.4, 58);
    g.lineTo(-bw * 0.4 - Math.sin(t * 5 + 1) * 6, 58); g.quadraticCurveTo(-bw * 0.7, 40, -bw * 0.45, -2); g.fill();
  } },
  body_mochila: { back: true, draw(g, bw) {
    g.fillStyle = '#3A4A7A'; roundRect(g, -bw * 0.72, 4, bw * 0.42, 34, 8); g.fill();
    g.fillStyle = '#FFC93C'; roundRect(g, -bw * 0.7, 18, bw * 0.38, 8, 3); g.fill();
  } },
  body_cadena: { draw(g, bw, t) {
    g.save(); glow(g, '#FFD16B', 6);
    g.strokeStyle = '#FFD16B'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, -4, bw * 0.38, 0.35, Math.PI - 0.35); g.stroke();
    g.fillStyle = '#FFD16B'; g.font = '900 14px "Russo One", sans-serif'; g.textAlign = 'center';
    g.fillText('$', 0, bw * 0.38 + 6);
    g.restore();
  } },
  body_alas_neon: { back: true, draw(g, bw, t, col) {
    g.save(); glow(g, col, 14);
    g.strokeStyle = shade(col, 0.45); g.lineWidth = 3; g.fillStyle = rgba(col, 0.25);
    for (const side of [-1, 1]) {
      const f = Math.sin(t * 6) * 0.15;
      g.save(); g.scale(side, 1); g.rotate(f);
      g.beginPath(); g.moveTo(bw * 0.2, 8); g.quadraticCurveTo(bw * 1.3, -30, bw * 1.25, 10); g.quadraticCurveTo(bw * 0.95, 4, bw * 0.95, 26); g.quadraticCurveTo(bw * 0.6, 18, bw * 0.2, 24); g.closePath();
      g.fill(); g.stroke(); g.restore();
    }
    g.restore();
  } },
  body_armadura_silla: { draw(g, bw) {
    g.fillStyle = 'rgba(245,247,252,0.95)';
    roundRect(g, -bw * 0.48, 4, bw * 0.96, 30, 8); g.fill();
    g.fillStyle = 'rgba(180,190,210,0.9)';
    for (let x = -bw * 0.36; x < bw * 0.4; x += bw * 0.18) roundRect(g, x, 9, bw * 0.1, 18, 3), g.fill();
    g.fillStyle = '#F5F7FC'; roundRect(g, -bw * 0.62, 0, bw * 0.24, 10, 4); g.fill(); roundRect(g, bw * 0.38, 0, bw * 0.24, 10, 4); g.fill();
  } },
  body_aura_fuego: { back: true, draw(g, bw, t) {
    g.save(); glow(g, '#FF5A1F', 18);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI - Math.PI;
      const r = bw * 1.05 + Math.sin(t * 8 + i) * 6;
      g.fillStyle = i % 2 ? 'rgba(255,90,31,0.55)' : 'rgba(255,209,107,0.5)';
      g.beginPath(); g.ellipse(Math.cos(a) * r * 0.8, 10 + Math.sin(a) * r, 8, 18 + Math.sin(t * 10 + i) * 5, a + Math.PI / 2, 0, TAU); g.fill();
    }
    g.restore();
  } },
  body_toalla: { draw(g, bw, t) {
    g.fillStyle = '#48D597';
    g.beginPath(); g.moveTo(-bw * 0.5, -4); g.lineTo(bw * 0.1, -6); g.lineTo(bw * 0.2, 2); g.lineTo(-bw * 0.35, 30 + Math.sin(t * 3) * 2); g.lineTo(-bw * 0.55, 26); g.closePath(); g.fill();
    g.fillStyle = '#FFD16B'; g.fillRect(-bw * 0.48, 22, bw * 0.18, 3);
    g.fillStyle = '#0B1020'; g.font = '900 8px "Russo One", sans-serif'; g.fillText('42', -bw * 0.2, 12);
  } },
};

// ------------------------------------------------------------------ EFECTOS (pantalla VS, resultados y campeón)
/** Efecto de entrada: dibuja alrededor de (x, y = pies) en el instante k (0..1) de la entrada. */
export function drawEntrance(g, id, x, y, k, t, col) {
  g.save();
  const a = 1 - k;
  switch (id) {
    case 'ent_teletransporte': {
      // anillos de energía que se cierran sobre el jugador
      glow(g, col, 18);
      g.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        const r = (1 - k) * (60 + i * 26);
        g.strokeStyle = rgba(col, a * (1 - i * 0.2));
        g.beginPath(); g.ellipse(x, y - 60 + i * 6, r, r * 0.3, 0, 0, TAU); g.stroke();
      }
      g.fillStyle = rgba('#ffffff', 0.35 * a); g.fillRect(x - 6 - 30 * a, 0, 12 + 60 * a, y);
      break;
    }
    case 'ent_burbujas':
      for (let i = 0; i < 18; i++) {
        const py = y - 20 - ((t * 120 + i * 40) % 200);
        g.strokeStyle = `rgba(160,230,255,${0.8 * a})`; g.lineWidth = 2;
        g.beginPath(); g.arc(x - 70 + ((i * 47) % 140), py, 6 + (i % 4) * 3, 0, TAU); g.stroke();
      }
      break;
    case 'ent_humo':
      for (let i = 0; i < 10; i++) {
        g.fillStyle = `rgba(200,205,220,${0.55 * a})`;
        g.beginPath(); g.arc(x + Math.cos(i) * (30 + k * 60), y - 30 - Math.sin(i * 1.7) * 40 * k, 18 + k * 20, 0, TAU); g.fill();
      }
      break;
    case 'ent_confeti':
      for (let i = 0; i < 40; i++) {
        g.fillStyle = ['#FF5FA2', '#FFD16B', '#48D597', '#3985FF', '#9B6CFF'][i % 5];
        g.globalAlpha = a;
        const px = x + ((i * 37) % 160) - 80, py = y - 220 + k * 240 + ((i * 53) % 60);
        g.save(); g.translate(px, py); g.rotate(t * 5 + i); g.fillRect(-3, -5, 6, 10); g.restore();
      }
      break;
    case 'ent_rayo':
      glow(g, '#FFE45C', 20);
      g.strokeStyle = `rgba(255,228,92,${a})`; g.lineWidth = 8;
      g.beginPath(); g.moveTo(x + 10, -10); g.lineTo(x - 20, y * 0.4); g.lineTo(x + 18, y * 0.55); g.lineTo(x - 6, y); g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.35 * a})`; g.fillRect(x - 200, 0, 400, y + 20);
      break;
    case 'ent_portal':
      glow(g, '#9B6CFF', 18);
      g.strokeStyle = `rgba(155,108,255,${a})`; g.lineWidth = 6;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x, y - 70, 50 + i * 12 + Math.sin(t * 6 + i) * 4, 90 + i * 12, 0, 0, TAU); g.stroke(); }
      break;
    case 'ent_alfombra':
      g.fillStyle = `rgba(200,30,50,${0.9 * a})`;
      g.beginPath(); g.moveTo(x - 40, y + 4); g.lineTo(x + 40, y + 4); g.lineTo(x + 140, y + 40); g.lineTo(x - 140, y + 40); g.fill();
      for (let i = 0; i < 6; i++) {
        if (Math.sin(t * 20 + i * 3) > 0.7) { g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(x - 160 + i * 64, y - 200 + (i % 2) * 60, 12, 0, TAU); g.fill(); }
      }
      break;
    case 'ent_meteorito':
      glow(g, '#FF8E3C', 24);
      g.fillStyle = `rgba(255,142,60,${a})`;
      g.beginPath(); g.arc(x + (1 - k) * 220, y - (1 - k) * 420, 26, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,209,107,${a * 0.7})`; g.lineWidth = 14;
      g.beginPath(); g.moveTo(x + (1 - k) * 220, y - (1 - k) * 420); g.lineTo(x + (1 - k) * 220 + 120, y - (1 - k) * 420 - 220); g.stroke();
      if (k > 0.85) { g.fillStyle = `rgba(255,209,107,${(1 - k) * 4})`; g.beginPath(); g.ellipse(x, y, 160 * k, 30, 0, 0, TAU); g.fill(); }
      break;
    case 'ent_creador': {
      glow(g, '#FFD16B', 26);
      g.strokeStyle = `rgba(255,209,107,${a})`; g.lineWidth = 10;
      g.beginPath(); g.moveTo(x, -10); g.lineTo(x, y); g.stroke();
      g.lineWidth = 3; g.strokeStyle = `rgba(185,140,255,${a})`;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x, y - 4, 40 + i * 30 + k * 60, 10 + i * 6, 0, 0, TAU); g.stroke(); }
      g.globalAlpha = a; g.fillStyle = '#FFF4CF'; g.font = '900 22px "Russo One", sans-serif'; g.textAlign = 'center';
      g.fillText('EL CREADOR', x, y - 170 - k * 30);
      break;
    }
    case 'ent_elegido':
      glow(g, '#FFD16B', 30);
      g.fillStyle = `rgba(255,209,107,${0.35 * a})`;
      g.beginPath(); g.moveTo(x - 30, -20); g.lineTo(x + 30, -20); g.lineTo(x + 90, y + 10); g.lineTo(x - 90, y + 10); g.fill();
      g.font = `900 ${60 + k * 20}px "Russo One", sans-serif`; g.textAlign = 'center';
      g.fillStyle = `rgba(255,244,207,${a})`; g.fillText('67', x, y - 210);
      break;
  }
  g.restore();
}

/** Efecto de victoria alrededor del ganador (x, y = pies), en loop. */
export function drawVictory(g, id, x, y, t, col) {
  g.save();
  switch (id) {
    case 'vic_corona': {
      // corona dorada que baja y brilla sobre el ganador
      const yy = y - 190 + Math.min(1, t * 1.5) * 40 + Math.sin(t * 3) * 4;
      glow(g, '#FFD16B', 24);
      g.fillStyle = '#FFD16B';
      g.beginPath(); g.moveTo(x - 36, yy + 22); g.lineTo(x - 36, yy - 6); g.lineTo(x - 18, yy + 8); g.lineTo(x, yy - 16); g.lineTo(x + 18, yy + 8); g.lineTo(x + 36, yy - 6); g.lineTo(x + 36, yy + 22); g.closePath(); g.fill();
      g.fillStyle = '#FF5FA2'; g.beginPath(); g.arc(x, yy + 10, 5, 0, TAU); g.fill();
      for (let i = 0; i < 8; i++) { const a2 = t * 2 + (i / 8) * TAU; g.globalAlpha = 0.6 + Math.sin(t * 6 + i) * 0.4; star(g, x + Math.cos(a2) * 60, yy + 4 + Math.sin(a2) * 18, 4, 4, 0.4); g.fill(); }
      break;
    }
    case 'vic_arcoiris':
      g.lineWidth = 9;
      ['#FF5FA2', '#FF8E3C', '#FFD16B', '#48D597', '#25CFE6', '#9B6CFF'].forEach((c, i) => {
        g.strokeStyle = c; g.globalAlpha = Math.min(1, t * 1.2);
        g.beginPath(); g.arc(x, y - 30, 190 - i * 10, Math.PI, Math.PI + Math.PI * Math.min(1, t * 0.9)); g.stroke();
      });
      break;
    case 'vic_aplausos':
      g.font = '28px sans-serif'; g.textAlign = 'center';
      for (let i = 0; i < 5; i++) { const ph = (t * 0.8 + i * 0.2) % 1; g.globalAlpha = 1 - ph; g.fillText('👏', x - 120 + i * 60, y - 40 - ph * 120); }
      break;
    case 'vic_fuegos':
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i * 0.33) % 1;
        const cx = x - 140 + i * 140, cy = y - 260 - i * 20;
        for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; g.fillStyle = ['#FF5FA2', '#FFD16B', '#25CFE6'][i]; g.globalAlpha = 1 - ph; g.beginPath(); g.arc(cx + Math.cos(a) * ph * 70, cy + Math.sin(a) * ph * 70, 3.5, 0, TAU); g.fill(); }
      }
      break;
    case 'vic_pies':
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.5 + i * 0.083) % 1;
        g.globalAlpha = 1 - ph * 0.6;
        drawPieIcon(g, x - 160 + ((i * 53) % 320), y - 320 + ph * 320, 11, t + i);
      }
      break;
    case 'vic_rayos':
      g.translate(x, y - 300); glow(g, '#FFD16B', 30);
      for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(255,209,107,${0.12 + Math.sin(t * 2 + i) * 0.06})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-30 + (i - 3) * 50, 320); g.lineTo(30 + (i - 3) * 50, 320); g.fill(); }
      break;
    case 'vic_silla': {
      const yy = y - 220 + Math.sin(t * 1.5) * 10;
      glow(g, '#FFD16B', 30);
      g.fillStyle = 'rgba(255,209,107,0.25)'; g.beginPath(); g.arc(x + 110, yy, 60, 0, TAU); g.fill();
      g.shadowBlur = 0;
      drawChairIcon(g, x + 110, yy, 1.1, '#F5F7FC');
      break;
    }
    case 'vic_supernova': {
      const ph = (t * 0.6) % 1;
      glow(g, '#FF3B5C', 30);
      g.strokeStyle = `rgba(255,59,92,${1 - ph})`; g.lineWidth = 6 * (1 - ph) + 1;
      g.beginPath(); g.arc(x, y - 80, 40 + ph * 260, 0, TAU); g.stroke();
      g.strokeStyle = `rgba(255,209,107,${1 - ph})`;
      g.beginPath(); g.arc(x, y - 80, 20 + ph * 180, 0, TAU); g.stroke();
      break;
    }
    case 'vic_creador': {
      for (let i = 0; i < 46; i++) {
        const ph = (t * 0.6 + i * 0.137) % 1;
        g.globalAlpha = 1 - ph;
        g.fillStyle = i % 2 ? '#FFD16B' : '#B98CFF';
        g.save(); g.translate(x - 220 + ((i * 97) % 440), y - 320 + ph * 340); g.rotate(t * 4 + i); g.fillRect(-4, -4, 8, 8); g.restore();
      }
      g.globalAlpha = 1; glow(g, '#FFD16B', 20); g.fillStyle = '#FFD16B';
      const cy = y - 230 + Math.sin(t * 2) * 6;
      g.beginPath(); g.moveTo(x - 40, cy + 22); g.lineTo(x - 40, cy - 8); g.lineTo(x - 20, cy + 8); g.lineTo(x, cy - 20); g.lineTo(x + 20, cy + 8); g.lineTo(x + 40, cy - 8); g.lineTo(x + 40, cy + 22); g.closePath(); g.fill();
      break;
    }
    case 'vic_icono':
      g.fillStyle = 'rgba(11,16,32,0.6)'; roundRect(g, x - 120, y - 330, 240, 70, 14); g.fill();
      glow(g, col, 20); g.strokeStyle = col; g.lineWidth = 4; roundRect(g, x - 120, y - 330, 240, 70, 14); g.stroke();
      g.font = '900 34px "Russo One", sans-serif'; g.textAlign = 'center'; g.fillStyle = Math.sin(t * 10) > -0.8 ? '#fff' : col;
      g.fillText('ÍCONO', x, y - 283);
      break;
  }
  g.restore();
}

/** Ícono de PIES (un piecito dorado). */
export function drawPieIcon(g, x, y, r, t = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(Math.sin(t * 2) * 0.15);
  g.fillStyle = '#FFD16B';
  g.beginPath(); g.ellipse(0, r * 0.25, r * 0.62, r * 0.85, 0, 0, TAU); g.fill();
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-r * 0.5 + i * r * 0.25, -r * 0.72 - (i === 0 ? r * 0.08 : 0), r * (i === 0 ? 0.24 : 0.17), 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-r * 0.2, r * 0.05, r * 0.15, r * 0.3, 0, 0, TAU); g.fill();
  g.restore();
}

/** La silla de plástico legendaria (también se usa en el personaje secreto). */
export function drawChairIcon(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = color;
  roundRect(g, -26, -50, 52, 44, 10); g.fill();
  g.fillStyle = shade(color, -0.12);
  for (let i = 0; i < 3; i++) roundRect(g, -18 + i * 13, -42, 8, 26, 3), g.fill();
  g.fillStyle = color;
  roundRect(g, -30, -6, 60, 10, 4); g.fill();
  g.fillRect(-28, 4, 6, 40); g.fillRect(22, 4, 6, 40);
  g.fillStyle = shade(color, -0.2);
  g.fillRect(-20, 4, 5, 34); g.fillRect(15, 4, 5, 34);
  g.restore();
}

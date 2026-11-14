// Renderer: escala el escenario lógico 1280x720 a cualquier ventana, gestiona los canvas
// (fondo animado, juego y capa de efectos) y provee el sistema de partículas/FX.
import { W, H, TAU, vrand as rand, clamp, rgba, quality, text, vchoice as choice, PALETTE, lerp } from './utils.js';

export class Renderer {
  constructor() {
    this.stage = document.getElementById('stage');
    this.bgCanvas = document.getElementById('bg');
    this.gameCanvas = document.getElementById('game');
    this.fxCanvas = document.getElementById('fx');
    this.bg = this.bgCanvas.getContext('2d');
    this.g = this.gameCanvas.getContext('2d');
    this.fxg = this.fxCanvas.getContext('2d');
    this.scale = 1;
    this.dpr = 1;
    this.bgFx = new Background();
    this.overlayFx = new FX(); // confeti y efectos sobre la UI
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const gut = vw < 900 ? 16 : 0; // margen lateral en pantallas angostas
    this.scale = Math.max(0.1, Math.min((vw - gut * 2) / W, vh / H));
    this.dpr = Math.min(window.devicePixelRatio || 1, quality.dprCap);
    document.documentElement.style.setProperty('--s', this.scale);
    const px = this.scale * this.dpr;
    for (const c of [this.gameCanvas, this.fxCanvas]) {
      c.width = Math.round(W * px);
      c.height = Math.round(H * px);
    }
    this.bgCanvas.width = Math.round(vw * this.dpr);
    this.bgCanvas.height = Math.round(vh * this.dpr);
    this.vw = vw;
    this.vh = vh;
  }

  beginGame() {
    const g = this.g;
    g.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.shadowBlur = 0;
    return g;
  }
  clearGame() {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }
  showGame(v) {
    this.gameCanvas.classList.toggle('visible', !!v);
    if (!v) this.clearGame();
  }

  renderBackground(dt, mode) {
    const g = this.bg;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bgFx.render(g, this.vw, this.vh, dt, mode);
  }

  renderOverlay(dt) {
    const g = this.fxg;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
    if (!this.overlayFx.active()) return;
    g.setTransform(this.scale * this.dpr, 0, 0, this.scale * this.dpr, 0, 0);
    this.overlayFx.update(dt);
    this.overlayFx.render(g);
  }
}

// Fondo de DUEL CLUB: una página de historieta. Viñetas inclinadas (nada simétrico) de colores saturados,
// cada una con tramado de puntos que crece hacia una esquina, calles blancas y borde de tinta.
// Se dibuja una vez por tamaño de pantalla y después solo se copia (barato).
const PAGE = [
  // [polígono en coordenadas 0..1, color, esquina de donde nacen los puntos grandes]
  [[[0, 0], [0.41, 0], [0.47, 0.47], [0, 0.41]], '#1E9BE0', [0, 0]],
  [[[0.425, 0], [1, 0], [1, 0.53], [0.49, 0.475]], '#E8203A', [1, 0.5]],
  [[[0, 0.425], [0.31, 0.455], [0.27, 1], [0, 1]], '#FF1F7A', [0, 1]],
  [[[0.325, 0.46], [1, 0.545], [1, 0.78], [0.3, 0.74]], '#FFC93C', [0.3, 0.74]],
  [[[0.285, 0.755], [0.72, 0.78], [0.72, 1], [0.285, 1]], '#8A10D8', [0.72, 0.78]],
  [[[0.735, 0.79], [1, 0.795], [1, 1], [0.735, 1]], '#00A651', [1, 1]],
];
class Background {
  constructor() {
    this.t = 0;
    this.tint = 0; // 0 = menú, 1 = juego (más oscuro)
    this.page = null;
  }
  buildPage(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    g.fillStyle = '#FFF4E0'; // calles de la página
    g.fillRect(0, 0, w, h);
    const sp = Math.max(9, Math.round(Math.min(w, h) / 70)); // separación de los puntos
    for (const [poly, col, [cx, cy]] of PAGE) {
      g.save();
      g.beginPath();
      poly.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)));
      g.closePath();
      g.fillStyle = col;
      g.fill();
      g.clip();
      // tramado: puntos más grandes cerca de la esquina "origen" de la viñeta
      const xs = poly.map((p) => p[0] * w), ys = poly.map((p) => p[1] * h);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const ox = cx * w, oy = cy * h;
      const far = Math.hypot(Math.max(Math.abs(x0 - ox), Math.abs(x1 - ox)), Math.max(Math.abs(y0 - oy), Math.abs(y1 - oy)));
      g.fillStyle = 'rgba(10,6,20,0.62)';
      let row = 0;
      for (let y = y0 - sp; y < y1 + sp; y += sp * 0.87, row++) {
        for (let x = x0 - sp + (row % 2 ? sp / 2 : 0); x < x1 + sp; x += sp) {
          const f = 1 - Math.min(1, Math.hypot(x - ox, y - oy) / far);
          const r = sp * (0.08 + 0.42 * f * f);
          if (r < 0.5) continue;
          g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
      }
      g.restore();
      // borde de tinta
      g.beginPath();
      poly.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h)));
      g.closePath();
      g.lineWidth = Math.max(4, Math.min(w, h) / 160);
      g.strokeStyle = '#0D0B14';
      g.lineJoin = 'miter';
      g.stroke();
    }
    return c;
  }
  render(g, w, h, dt, mode) {
    if (quality.animations) this.t += dt;
    this.tint = lerp(this.tint, mode === 'game' ? 1 : 0, Math.min(1, dt * 3));
    if (!this.page || this.page.w !== w || this.page.h !== h) this.page = { w, h, c: this.buildPage(w, h) };
    g.drawImage(this.page.c, 0, 0, w, h);
    // atenuado para que la interfaz se lea (más oscuro durante los minijuegos)
    g.fillStyle = `rgba(16,12,26,${0.38 + this.tint * 0.42})`;
    g.fillRect(0, 0, w, h);
  }
}

// ---------------------------------------------------------------------------------
// FX: partículas, confeti, textos flotantes, sacudida de pantalla y destellos.
// Cada minijuego crea su propia instancia para que no queden restos entre partidas.
// ---------------------------------------------------------------------------------
const CONFETTI_COLORS = ['#2E7BFF', '#FF4B3E', '#FFD23F', '#3DDC97', '#FF3D8B', '#FFF4E0'];

export class FX {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.rings = [];
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashA = 0;
    this.flashColor = '#ffffff';
  }
  active() {
    return this.parts.length || this.texts.length || this.rings.length || this.flashA > 0.01;
  }
  clear() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.shakeAmt = 0;
    this.flashA = 0;
  }
  burst(x, y, color, n = 16, o = {}) {
    n = Math.max(1, Math.round(n * quality.particles));
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + rand(-(o.spread ?? 0.6), o.spread ?? 0.6) : rand(0, TAU);
      const sp = rand(o.minSpeed ?? 80, o.speed ?? 320);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.4, o.life ?? 0.9),
        max: 0,
        size: rand(o.minSize ?? 2, o.size ?? 5),
        color: Array.isArray(color) ? choice(color) : color,
        grav: o.gravity ?? 300,
        drag: o.drag ?? 1.8,
        kind: o.kind || 'dot',
        rot: rand(0, TAU),
        vr: rand(-10, 10),
      });
      this.parts[this.parts.length - 1].max = this.parts[this.parts.length - 1].life;
    }
  }
  confetti(x, y, n = 80, spread = 1.1, up = true) {
    n = Math.max(4, Math.round(n * quality.particles));
    for (let i = 0; i < n; i++) {
      const a = (up ? -Math.PI / 2 : rand(0, TAU)) + rand(-spread, spread);
      const sp = rand(250, 700);
      const life = rand(1.8, 3.2);
      this.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: rand(5, 10), color: choice(CONFETTI_COLORS), grav: 520, drag: 2.2,
        kind: 'confetti', rot: rand(0, TAU), vr: rand(-12, 12), flip: rand(0, TAU),
      });
    }
  }
  rain(n = 120) {
    n = Math.max(4, Math.round(n * quality.particles));
    for (let i = 0; i < n; i++) {
      const life = rand(2.5, 4.5);
      this.parts.push({
        x: rand(0, W), y: rand(-400, -10), vx: rand(-60, 60), vy: rand(100, 260), life, max: life,
        size: rand(6, 11), color: choice(CONFETTI_COLORS), grav: 90, drag: 0.4,
        kind: 'confetti', rot: rand(0, TAU), vr: rand(-8, 8), flip: rand(0, TAU),
      });
    }
  }
  ring(x, y, color, maxR = 80, life = 0.45, width = 4) {
    this.rings.push({ x, y, color, maxR, life, max: life, width });
  }
  float(x, y, str, color = '#F6F7FB', size = 28, o = {}) {
    this.texts.push({ x, y, str, color, size, life: o.life ?? 1.1, max: o.life ?? 1.1, vy: o.vy ?? -60, stroke: o.stroke ?? 'rgba(11,16,32,0.85)' });
  }
  shake(amount) {
    if (!quality.animations) return;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }
  flash(color = '#ffffff', a = 0.5) {
    if (!quality.animations) a *= 0.35;
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, a);
  }
  update(dt) {
    if (this.shakeAmt > 0.05) {
      this.shakeX = rand(-1, 1) * this.shakeAmt;
      this.shakeY = rand(-1, 1) * this.shakeAmt;
      this.shakeAmt *= Math.exp(-dt * 12);
    } else {
      this.shakeAmt = this.shakeX = this.shakeY = 0;
    }
    this.flashA *= Math.exp(-dt * 7);
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.flip != null) p.flip += dt * 9;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.exp(-dt * 2.5);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
  }
  render(g) {
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      g.strokeStyle = rgba(r.color, 1 - k);
      g.lineWidth = r.width * (1 - k) + 1;
      g.beginPath();
      g.arc(r.x, r.y, r.maxR * (0.2 + 0.8 * Math.sqrt(k)), 0, TAU);
      g.stroke();
    }
    for (const p of this.parts) {
      const a = clamp(p.life / p.max * 1.6, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      if (p.kind === 'confetti') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, Math.cos(p.flip));
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      } else if (p.kind === 'spark') {
        g.strokeStyle = p.color;
        g.lineWidth = p.size * 0.6;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        g.stroke();
      } else if (p.kind === 'star') {
        drawStar(g, p.x, p.y, p.size * 1.6, p.size * 0.7, 5, p.rot);
        g.fill();
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size * (0.4 + 0.6 * a), 0, TAU);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    for (const t of this.texts) {
      const k = t.life / t.max;
      const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      text(g, t.str, t.x, t.y, { size: t.size * pop, color: t.color, stroke: t.stroke, alpha: clamp(k * 2.5, 0, 1) });
    }
  }
  renderFlash(g) {
    if (this.flashA > 0.01) {
      g.fillStyle = rgba(this.flashColor, this.flashA);
      g.fillRect(0, 0, W, H);
    }
  }
}

export function drawStar(g, x, y, R, r, n = 5, rot = 0) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = rot - Math.PI / 2 + (i * Math.PI) / n;
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  g.closePath();
}

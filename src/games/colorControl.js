// JUEGO 07 — COLOR CONTROL (estrategia)
// Pintá las casillas que pisás. Robá territorio, usá potenciadores y cuidá las casillas doradas
// (valen doble). Gana quien controle el mayor porcentaje del tablero al final.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, mix, mulberry32, newSeed } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

const SIZES = { small: [16, 9], medium: [20, 11], large: [24, 13] };
const POWERS = {
  bomb: { name: '¡BOMBA DE PINTURA!', color: '#FFC93C' },
  speed: { name: '¡TURBO!', color: '#25CFE6' },
  shield: { name: '¡ESCUDO!', color: '#48D597' },
  freeze: { name: '¡CONGELAR!', color: '#9FD8FF' },
};

export default class ColorControl extends BaseGame {
  static meta = {
    id: 'color', num: 7, name: 'COLOR CONTROL', short: 'COLOR', category: 'Estrategia', color: '#48D597',
    tagline: 'El tablero es de quien lo pinta.',
    description: 'Cada casilla que pisás queda de tu color, incluso las de tu rival. Las casillas doradas valen doble. Agarrá potenciadores: bomba de pintura, turbo, escudo (tus casillas no se pueden robar) y congelar al rival.',
    goal: 'Terminá con el mayor porcentaje del tablero.',
    controls: [{ actions: ['up', 'down', 'left', 'right'], label: 'Moverse y pintar' }],
    events: ['speed', 'short', 'obstacles', 'mirror', 'invert'],
    options: [
      { key: 'size', label: 'Tablero', choices: [['small', 'Chico'], ['medium', 'Mediano'], ['large', 'Grande']], def: 'medium' },
      { key: 'time', label: 'Tiempo', choices: [[45, '45 s'], [60, '60 s'], [90, '90 s']], def: 60 },
    ],
    record: { label: 'Mayor % del tablero', better: 'higher', format: (v) => `${v.toFixed(1)}%` },
    drawIcon(g, t) {
      const n = 5, s = 28, ox = 30, oy = 30;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const v = Math.sin(c * 1.3 + r * 0.7 + t * 1.5);
        g.fillStyle = v > 0.3 ? '#3985FF' : v < -0.3 ? '#FF654F' : '#1A2446';
        roundRect(g, ox + c * s + 2, oy + r * s + 2, s - 4, s - 4, 6); g.fill();
      }
    },
  };

  init() {
    const [cols, rows] = SIZES[this.options.size ?? 'medium'] || SIZES.medium;
    this.cols = cols;
    this.rows = rows;
    this.cell = Math.floor(Math.min(1200 / cols, 596 / rows));
    this.ox = Math.round(W / 2 - (cols * this.cell) / 2);
    this.oy = Math.round(104 + (596 - rows * this.cell) / 2);
    this.duration = this.timed(this.options.time ?? 60);
    const rng = mulberry32(newSeed());
    // celdas: owner -1 libre, wall, gold
    this.cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) this.cells.push({ c, r, owner: -1, wall: false, gold: false, t: 9, lock: 0 });
    // muros simétricos (justo para ambos)
    const nWalls = Math.round(cols * rows * (0.035 + this.diff * 0.02 + (this.extraObstacles ? 0.05 : 0)));
    let placed = 0, guard = 0;
    while (placed < nWalls && guard++ < 500) {
      const c = 2 + Math.floor(rng() * (cols / 2 - 2)), r = Math.floor(rng() * rows);
      const a = this.at(c, r), b = this.at(cols - 1 - c, rows - 1 - r);
      if (a.wall || (r === Math.floor(rows / 2) && c < 3)) continue;
      a.wall = b.wall = true;
      placed += 2;
      if (rng() < 0.5 && c + 1 < cols / 2 - 1) { this.at(c + 1, r).wall = true; this.at(cols - 2 - c, rows - 1 - r).wall = true; placed += 2; }
    }
    // zonas doradas (valen doble) en posiciones simétricas
    const gz = [[Math.floor(cols / 2) - 1, 1], [Math.floor(cols / 2) - 1, rows - 3]];
    for (const [gc, gr] of gz) for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) {
      const k = this.at(gc + dc, gr + dr);
      if (k) { k.wall = false; k.gold = true; }
    }
    this.totalWeight = this.cells.reduce((s, k) => s + (k.wall ? 0 : k.gold ? 2 : 1), 0);
    const midR = Math.floor(rows / 2);
    this.bodies = [0, 1].map((p) => {
      const c = p ? cols - 2 : 1;
      this.at(c, midR).wall = false;
      return { x: this.ox + (c + 0.5) * this.cell, y: this.oy + (midR + 0.5) * this.cell, vx: 0, vy: 0, r: this.cell * 0.3, speed: 0, boost: 0, freeze: 0, shield: 0, face: p ? -1 : 1, moving: false };
    });
    this.totalWeight = this.cells.reduce((s, k) => s + (k.wall ? 0 : k.gold ? 2 : 1), 0);
    this.painted = [0, 0];
    this.steals = [0, 0];
    this.powerCount = [0, 0];
    this.powers = [];
    this.powerT = 4;
    this.banner = null;
    this.lastWarn = false;
    this.paintAt(0, this.bodies[0].x, this.bodies[0].y, true);
    this.paintAt(1, this.bodies[1].x, this.bodies[1].y, true);
  }

  at(c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.cells[r * this.cols + c];
  }
  cellAt(x, y) {
    return this.at(Math.floor((x - this.ox) / this.cell), Math.floor((y - this.oy) / this.cell));
  }

  paintAt(p, x, y, silent = false) {
    const k = this.cellAt(x, y);
    if (!k || k.wall || k.owner === p) return;
    if (k.owner === 1 - p && this.bodies[1 - p].shield > 0) return; // escudo del rival
    if (k.owner === 1 - p) this.steals[p]++;
    k.owner = p;
    k.t = 0;
    this.painted[p]++;
    if (!silent) this.sfx('paint', { pitch: 0.8 + Math.random() * 0.5, gap: 40 });
  }

  pct() {
    const w = [0, 0];
    for (const k of this.cells) if (k.owner >= 0 && !k.wall) w[k.owner] += k.gold ? 2 : 1;
    return w.map((v) => (v / this.totalWeight) * 100);
  }

  ambient(dt) {
    for (const k of this.cells) k.t += dt;
    for (const pw of this.powers) pw.ph += dt;
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
  }

  update(dt) {
    this.ambient(dt);
    for (const p of [0, 1]) this.move(p, dt);
    // choque entre jugadores
    const [a, b] = this.bodies;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d, push = (min - d) / 2;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      if (Math.random() < 0.1) this.sfx('bounce', { gap: 200 });
    }
    // potenciadores
    this.powerT -= dt;
    if (this.powerT <= 0 && this.powers.length < 2) {
      this.powerT = rand(4, 6.5);
      const free = this.cells.filter((k) => !k.wall && Math.abs(k.c - this.cols / 2) < this.cols * 0.32);
      const k = choice(free);
      if (k) this.powers.push({ type: choice(Object.keys(POWERS)), x: this.ox + (k.c + 0.5) * this.cell, y: this.oy + (k.r + 0.5) * this.cell, ph: 0 });
    }
    for (let i = this.powers.length - 1; i >= 0; i--) {
      const pw = this.powers[i];
      for (const p of [0, 1]) {
        const bd = this.bodies[p];
        if (Math.hypot(bd.x - pw.x, bd.y - pw.y) < bd.r + 16) {
          this.applyPower(p, pw);
          this.powers.splice(i, 1);
          break;
        }
      }
    }
    if (!this.lastWarn && this.remaining <= 10) {
      this.lastWarn = true;
      this.sfx('alarm');
      this.banner = { text: '¡ÚLTIMOS 10 SEGUNDOS!', color: '#FF654F', t: 1.4 };
    }
    if (this.time >= this.duration) this.end();
  }

  move(p, dt) {
    const bd = this.bodies[p];
    bd.boost = Math.max(0, bd.boost - dt);
    bd.freeze = Math.max(0, bd.freeze - dt);
    bd.shield = Math.max(0, bd.shield - dt);
    const inp = this.inputs[p];
    let ix = inp.axisX(), iy = inp.axisY();
    if (bd.freeze > 0) ix = iy = 0;
    const len = Math.hypot(ix, iy) || 1;
    const max = (215 + this.diff * 40) * (bd.boost > 0 ? 1.6 : 1) * (this.cell / 54) ** 0.5;
    const tx = (ix / len) * max, ty = (iy / len) * max;
    const k = 1 - Math.exp(-14 * dt);
    bd.vx += (tx - bd.vx) * k;
    bd.vy += (ty - bd.vy) * k;
    if (ix) bd.face = Math.sign(ix);
    bd.moving = Math.hypot(bd.vx, bd.vy) > 30;
    // movimiento por ejes con colisión contra muros y bordes
    const tryMove = (nx, ny) => {
      const r = bd.r * 0.92;
      for (const [cx, cy] of [[nx - r, ny - r], [nx + r, ny - r], [nx - r, ny + r], [nx + r, ny + r]]) {
        const cell = this.cellAt(cx, cy);
        if (!cell || cell.wall) return false;
      }
      return true;
    };
    const nx = bd.x + bd.vx * dt;
    if (tryMove(nx, bd.y)) bd.x = nx; else bd.vx = 0;
    const ny = bd.y + bd.vy * dt;
    if (tryMove(bd.x, ny)) bd.y = ny; else bd.vy = 0;
    this.paintAt(p, bd.x, bd.y);
    if (bd.boost > 0 && bd.moving && Math.random() < 0.5) this.fx.burst(bd.x, bd.y, this.color(p), 1, { speed: 60, gravity: 0, life: 0.4, size: 5 });
  }

  applyPower(p, pw) {
    const P = POWERS[pw.type];
    this.powerCount[p]++;
    this.banner = { text: P.name, color: P.color, t: 1.2, p };
    this.sfx('powerup');
    this.fx.ring(pw.x, pw.y, P.color, 90);
    const bd = this.bodies[p];
    if (pw.type === 'bomb') {
      const cc = Math.floor((pw.x - this.ox) / this.cell), cr = Math.floor((pw.y - this.oy) / this.cell);
      for (let r = cr - 2; r <= cr + 2; r++) for (let c = cc - 2; c <= cc + 2; c++) {
        const k = this.at(c, r);
        if (k && !k.wall && k.owner !== p && !(k.owner === 1 - p && this.bodies[1 - p].shield > 0)) {
          if (k.owner === 1 - p) this.steals[p]++;
          k.owner = p; k.t = -Math.hypot(c - cc, r - cr) * 0.05; this.painted[p]++;
        }
      }
      this.fx.burst(pw.x, pw.y, [this.color(p), '#fff'], 40, { speed: 420, gravity: 0 });
      this.fx.shake(8);
      this.sfx('hitHeavy');
    } else if (pw.type === 'speed') bd.boost = 4;
    else if (pw.type === 'shield') bd.shield = 5;
    else if (pw.type === 'freeze') {
      this.bodies[1 - p].freeze = 1.6;
      this.sfx('freeze');
      this.fx.burst(this.bodies[1 - p].x, this.bodies[1 - p].y, ['#9FD8FF', '#fff'], 24, { speed: 200, gravity: 0 });
    }
  }

  end() {
    const pc = this.pct();
    const r = pc.map((v) => Math.round(v * 10) / 10);
    this.finish({
      winner: BaseGame.decide(r[0], r[1]),
      scores: r,
      display: r.map((v) => `${v.toFixed(1)}%`),
      scoreLabel: '% del tablero',
      stats: [
        { label: 'Casillas pintadas', values: this.painted.map(String), raw: this.painted, better: 'high' },
        { label: 'Casillas robadas', values: this.steals.map(String), raw: this.steals, better: 'high' },
        { label: 'Potenciadores', values: this.powerCount.map(String), raw: this.powerCount, better: 'high' },
      ],
      records: r,
      flags: r.map((v) => ({ pct: v })),
      margin: Math.abs(Math.round(r[0]) - Math.round(r[1])),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    this.arenaBG(g, '#0E1630', '#0A0F22');
    const S = this.cell;
    panel(g, this.ox - 10, this.oy - 10, this.cols * S + 20, this.rows * S + 20, { r: 18, fill: '#0B1124', stroke: 'rgba(155,108,255,0.35)' });
    for (const k of this.cells) {
      const x = this.ox + k.c * S, y = this.oy + k.r * S;
      if (k.wall) {
        g.fillStyle = '#231A4A';
        roundRect(g, x + 2, y + 2, S - 4, S - 4, 8); g.fill();
        g.fillStyle = '#4A3A99';
        roundRect(g, x + 2, y + 2, S - 4, S - 12, 8); g.fill();
        g.strokeStyle = 'rgba(155,108,255,0.5)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 12, y + 10); g.lineTo(x + S - 12, y + S - 18); g.moveTo(x + S - 12, y + 10); g.lineTo(x + 12, y + S - 18); g.stroke();
        continue;
      }
      let base = (k.c + k.r) % 2 ? '#141C3A' : '#18213F';
      if (k.owner >= 0) base = (k.c + k.r) % 2 ? this.color(k.owner) : shade(this.color(k.owner), -0.1);
      const pop = k.t < 0.25 && k.t >= 0 ? 1 + (1 - k.t / 0.25) * 0.15 : 1;
      const sz = (S - 4) * pop;
      g.fillStyle = base;
      roundRect(g, x + S / 2 - sz / 2, y + S / 2 - sz / 2, sz, sz, 8); g.fill();
      if (k.owner >= 0) {
        g.fillStyle = 'rgba(255,255,255,0.14)';
        roundRect(g, x + 6, y + 5, S - 12, 5, 3); g.fill();
        if (this.bodies[k.owner].shield > 0) { g.strokeStyle = 'rgba(72,213,151,0.7)'; g.lineWidth = 2; roundRect(g, x + 4, y + 4, S - 8, S - 8, 6); g.stroke(); }
      }
      if (k.gold) {
        g.strokeStyle = rgba('#FFC93C', 0.7 + Math.sin(t * 4) * 0.25);
        g.lineWidth = 3;
        roundRect(g, x + 4, y + 4, S - 8, S - 8, 7); g.stroke();
        g.fillStyle = rgba('#FFE08A', 0.85);
        drawStar(g, x + S / 2, y + S / 2, S * 0.16, S * 0.07, 5); g.fill();
      }
    }
    // potenciadores
    for (const pw of this.powers) {
      const P = POWERS[pw.type];
      const by = pw.y + Math.sin(pw.ph * 4) * 4;
      glowCircle(g, pw.x, by, 40, P.color, 0.9);
      g.fillStyle = '#0B1020';
      g.beginPath(); g.arc(pw.x, by, 17, 0, TAU); g.fill();
      g.strokeStyle = P.color; g.lineWidth = 3;
      g.beginPath(); g.arc(pw.x, by, 17, 0, TAU); g.stroke();
      this.powerIcon(g, pw.type, pw.x, by, P.color);
    }
    // jugadores
    const order = this.bodies[0].y < this.bodies[1].y ? [0, 1] : [1, 0];
    for (const p of order) {
      const bd = this.bodies[p];
      const col = this.color(p);
      if (bd.shield > 0) { g.strokeStyle = rgba('#48D597', 0.6 + Math.sin(t * 10) * 0.3); g.lineWidth = 3; g.beginPath(); g.arc(bd.x, bd.y - 10, bd.r + 16, 0, TAU); g.stroke(); }
      g.fillStyle = rgba(col, 0.35);
      g.beginPath(); g.ellipse(bd.x, bd.y + bd.r * 0.6, bd.r * 1.2, bd.r * 0.5, 0, 0, TAU); g.fill();
      drawCharacter(g, { id: this.players[p].char, x: bd.x, y: bd.y + bd.r * 0.6, s: this.cell / 110, color: col, anim: bd.freeze > 0 ? 'hurt' : bd.moving ? 'run' : 'idle', t: t + p, facing: bd.face, acc: this.players[p].acc, shadow: false });
      if (bd.freeze > 0) {
        g.fillStyle = rgba('#BFE9FF', 0.45);
        roundRect(g, bd.x - bd.r - 6, bd.y - this.cell * 0.9, bd.r * 2 + 12, this.cell * 1.05, 8); g.fill();
      }
    }
  }

  powerIcon(g, type, x, y, col) {
    g.save();
    g.translate(x, y);
    g.fillStyle = col;
    g.strokeStyle = col;
    g.lineWidth = 3;
    g.lineCap = 'round';
    if (type === 'bomb') { g.beginPath(); g.arc(0, 2, 8, 0, TAU); g.fill(); g.beginPath(); g.moveTo(4, -5); g.quadraticCurveTo(8, -10, 11, -8); g.stroke(); }
    else if (type === 'speed') { g.beginPath(); g.moveTo(2, -10); g.lineTo(-6, 2); g.lineTo(0, 2); g.lineTo(-2, 10); g.lineTo(6, -2); g.lineTo(0, -2); g.closePath(); g.fill(); }
    else if (type === 'shield') { g.beginPath(); g.moveTo(0, -10); g.lineTo(8, -6); g.quadraticCurveTo(8, 6, 0, 10); g.quadraticCurveTo(-8, 6, -8, -6); g.closePath(); g.fill(); }
    else { for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke(); } }
    g.restore();
  }

  renderHUD(g) {
    const pc = this.pct();
    this.hudTop(g, { scores: pc.map((v) => `${v.toFixed(0)}%`), sub: this.bodies.map((b, p) => (b.shield > 0 ? 'Escudo activo' : b.boost > 0 ? 'Turbo' : b.freeze > 0 ? '¡Congelado!' : `${this.painted[p]} pintadas`)), timer: this.remaining });
    // barra de dominio
    const x0 = W / 2 - 220, wbar = 440, y = 86;
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, x0, y, wbar, 10, 5); g.fill();
    g.fillStyle = this.color(0);
    roundRect(g, x0, y, (wbar * pc[0]) / 100, 10, 5); g.fill();
    g.fillStyle = this.color(1);
    roundRect(g, x0 + wbar - (wbar * pc[1]) / 100, y, (wbar * pc[1]) / 100, 10, 5); g.fill();
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 3);
      text(g, this.banner.text, W / 2, 400, { size: 54, color: '#fff', glow: this.banner.color, stroke: '#0B1020', alpha: a });
    }
  }
}

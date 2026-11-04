// JUEGO 03 — PONG CHAOS (precisión)
// Paletas con efecto, remate potenciado (SMASH) y caos progresivo: bumpers, muro móvil,
// multibola, paletas mini y turbo. La pelota acelera con cada golpe.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, ease } from '../core/utils.js';

const TOP = 100, BOT = 704, PW = 16, BR = 11;
const CHAOS = [
  { id: 'multi', name: '¡MULTIBOLA!', color: '#FFC93C' },
  { id: 'surge', name: '¡TURBO!', color: '#FF8E3C' },
  { id: 'mini', name: '¡PALETAS MINI!', color: '#FF5FA2' },
  { id: 'wall', name: '¡MURO MÓVIL!', color: '#9B6CFF' },
];

export default class PongChaos extends BaseGame {
  static meta = {
    id: 'pong', num: 3, name: 'PONG CHAOS', short: 'PONG', category: 'Precisión', color: '#9B6CFF',
    tagline: 'El clásico de paletas, pero nada se queda quieto.',
    description: 'Defendé tu arco con la paleta. Donde la pelota toque la paleta define el ángulo, y moverte al golpear le da efecto. Pulsá ACCIÓN justo antes del contacto para un SMASH. Cada tanto, el caos cambia las reglas.',
    goal: 'Llegá primero a la puntuación objetivo.',
    controls: [{ actions: ['up', 'down'], label: 'Mover paleta' }, { actions: ['a'], label: 'Smash (justo antes del golpe)' }],
    events: ['speed', 'obstacles', 'mirror', 'invert'],
    options: [{ key: 'target', label: 'Puntos', choices: [[5, '5'], [7, '7'], [10, '10']], def: 7 }],
    record: { label: 'Golpes en una partida', better: 'higher', format: (v) => `${v} golpes` },
    drawIcon(g, t) {
      g.fillStyle = '#3985FF'; roundRect(g, 26, 60 + Math.sin(t * 2) * 20, 14, 70, 7); g.fill();
      g.fillStyle = '#FF654F'; roundRect(g, 160, 70 - Math.sin(t * 2) * 20, 14, 70, 7); g.fill();
      g.strokeStyle = 'rgba(155,108,255,0.5)'; g.setLineDash([8, 8]); g.lineWidth = 3;
      g.beginPath(); g.moveTo(100, 20); g.lineTo(100, 180); g.stroke(); g.setLineDash([]);
      const bx = 100 + Math.sin(t * 3) * 52, by = 100 + Math.cos(t * 4.2) * 40;
      glowCircle(g, bx, by, 30, '#ffffff', 0.6);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 10, 0, TAU); g.fill();
      g.fillStyle = '#9B6CFF'; g.beginPath(); g.arc(100, 60, 10, 0, TAU); g.arc(100, 140, 10, 0, TAU); g.fill();
    },
  };

  init() {
    this.target = this.options.target ?? 7;
    this.score = [0, 0];
    this.paddles = [0, 1].map((p) => ({ x: p ? W - 60 : 60, y: (TOP + BOT) / 2, vy: 0, h: 116, smash: 0, smashCd: 0, flash: 0 }));
    this.baseSpeed = 470 + this.diff * 110;
    this.balls = [];
    this.trail = [];
    this.bumpers = [];
    this.wall = null;
    this.hits = [0, 0];
    this.smashes = [0, 0];
    this.rally = 0;
    this.bestRally = 0;
    this.maxSpeed = 0;
    this.chaosT = 0;
    this.chaosEvery = Math.max(8, 14 - this.diff * 3);
    this.effect = null; // efecto caótico activo
    this.banner = null;
    this.serveT = 1.0;
    this.serveTo = Math.random() < 0.5 ? 0 : 1;
    this.react = [null, null];
    this.limit = this.timed(200);
    if (this.extraObstacles) this.addBumpers(true);
  }

  addBumpers(extra = false) {
    if (this.bumpers.length) return;
    this.bumpers.push({ x: W / 2 - 170, y: 260, r: 26, ph: 0, amp: 140, sp: 1.1, hit: 0 });
    this.bumpers.push({ x: W / 2 + 170, y: 540, r: 26, ph: Math.PI, amp: 140, sp: 1.1, hit: 0 });
    if (extra) this.bumpers.push({ x: W / 2, y: 400, r: 22, ph: 1.5, amp: 200, sp: 1.6, hit: 0 });
  }

  serve() {
    const dir = this.serveTo === 0 ? -1 : 1;
    const a = rand(-0.45, 0.45);
    const sp = this.baseSpeed;
    this.balls = [{ x: W / 2, y: rand(TOP + 150, BOT - 150), vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, last: -1, smash: 0, main: true }];
    this.rally = 0;
    this.sfx('whoosh');
  }

  ambient(dt) {
    for (const p of this.paddles) p.flash = Math.max(0, p.flash - dt * 3);
    for (const p of [0, 1]) this.react[p] = Math.max(0, (this.react[p] || 0) - dt);
  }

  update(dt) {
    this.ambient(dt);
    // paletas
    for (const p of [0, 1]) {
      const pd = this.paddles[p];
      const inp = this.inputs[p];
      const dir = inp.axisY();
      const max = 700;
      pd.vy += (dir * max - pd.vy) * Math.min(1, dt * 18);
      pd.y = clamp(pd.y + pd.vy * dt, TOP + pd.h / 2, BOT - pd.h / 2);
      if (pd.y <= TOP + pd.h / 2 + 0.1 || pd.y >= BOT - pd.h / 2 - 0.1) pd.vy = 0;
      pd.smash = Math.max(0, pd.smash - dt);
      pd.smashCd = Math.max(0, pd.smashCd - dt);
      if (inp.pressed('a') && pd.smashCd <= 0) { pd.smash = 0.2; pd.smashCd = 0.45; }
      const targetH = (this.effect?.id === 'mini' ? 70 : 116) + (this.diff < 0.3 ? 14 : 0);
      pd.h += (targetH - pd.h) * Math.min(1, dt * 6);
    }
    // caos progresivo
    if (this.score[0] + this.score[1] >= 2 || this.time > 18) this.addBumpers();
    this.chaosT += dt;
    if (this.effect) {
      this.effect.t -= dt;
      if (this.effect.t <= 0) this.endEffect();
    } else if (this.chaosT >= this.chaosEvery && this.balls.length) {
      this.chaosT = 0;
      this.startEffect(choice(CHAOS));
    }
    for (const b of this.bumpers) {
      b.hit = Math.max(0, b.hit - dt * 3);
      b.ph += dt * b.sp;
    }
    if (this.wall) {
      this.wall.ph += dt * 1.4;
      this.wall.y = (TOP + BOT) / 2 + Math.sin(this.wall.ph) * 190;
    }
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    // saque
    if (!this.balls.length) {
      this.serveT -= dt;
      if (this.serveT <= 0) this.serve();
      return;
    }
    // pelotas con subpasos (evita atravesar paletas a alta velocidad)
    for (const ball of [...this.balls]) {
      const sp = Math.hypot(ball.vx, ball.vy) * (this.effect?.id === 'surge' ? 1.35 : 1);
      const steps = Math.ceil((sp * dt) / 6);
      const k = this.effect?.id === 'surge' ? 1.35 : 1;
      for (let i = 0; i < steps; i++) {
        if (!this.stepBall(ball, (dt / steps) * k)) break;
      }
      ball.smash = Math.max(0, ball.smash - dt);
    }
    if (this.trail.length > 60) this.trail.splice(0, this.trail.length - 60);
    for (const b of this.balls) this.trail.push({ x: b.x, y: b.y, c: b.last >= 0 ? this.color(b.last) : '#ffffff', s: b.smash > 0 });
    for (const tr of this.trail) tr.a = (tr.a ?? 1) - dt * 3;
    this.trail = this.trail.filter((tr) => tr.a > 0);
    if (this.time >= this.limit) this.end();
  }

  stepBall(b, dt) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y < TOP + BR) { b.y = TOP + BR; b.vy = Math.abs(b.vy); this.sfx('bounce', { pitch: 0.8 }); this.fx.burst(b.x, b.y, '#9B6CFF', 5, { speed: 120, gravity: 0 }); }
    if (b.y > BOT - BR) { b.y = BOT - BR; b.vy = -Math.abs(b.vy); this.sfx('bounce', { pitch: 0.8 }); this.fx.burst(b.x, b.y, '#9B6CFF', 5, { speed: 120, gravity: 0 }); }
    // paletas
    for (const p of [0, 1]) {
      const pd = this.paddles[p];
      const movingToward = p === 0 ? b.vx < 0 : b.vx > 0;
      if (!movingToward) continue;
      const face = p === 0 ? pd.x + PW / 2 : pd.x - PW / 2;
      const crossed = p === 0 ? b.x - BR <= face && b.x > pd.x - PW : b.x + BR >= face && b.x < pd.x + PW;
      if (crossed && Math.abs(b.y - pd.y) <= pd.h / 2 + BR) {
        const off = clamp((b.y - pd.y) / (pd.h / 2), -1, 1);
        const ang = off * 1.0;
        let speed = Math.min(1300, Math.hypot(b.vx, b.vy) * 1.05 + 8);
        const smash = pd.smash > 0;
        if (smash) {
          speed = Math.min(1500, speed * 1.3);
          this.smashes[p]++;
          b.smash = 0.9;
          pd.smash = 0;
          this.sfx('smash');
          this.fx.shake(8);
          this.fx.float(pd.x + (p ? -60 : 60), pd.y - 50, '¡SMASH!', this.color(p), 30);
        } else this.sfx('paddle', { pitch: 0.9 + Math.random() * 0.2 });
        const dir = p === 0 ? 1 : -1;
        b.vx = Math.cos(ang) * speed * dir;
        b.vy = Math.sin(ang) * speed + pd.vy * 0.22;
        b.x = face + dir * (BR + 1);
        b.last = p;
        pd.flash = 1;
        this.hits[p]++;
        this.rally++;
        this.bestRally = Math.max(this.bestRally, this.rally);
        this.maxSpeed = Math.max(this.maxSpeed, speed);
        this.fx.burst(face, b.y, [this.color(p), '#fff'], smash ? 26 : 12, { angle: p === 0 ? 0 : Math.PI, spread: 1.1, speed: smash ? 520 : 300, gravity: 0, kind: 'spark' });
        this.fx.ring(face, b.y, this.color(p), smash ? 90 : 50);
      }
    }
    // bumpers
    for (const bm of this.bumpers) {
      const by = bm.y + Math.sin(bm.ph) * bm.amp;
      const dx = b.x - bm.x, dy = b.y - by;
      const d = Math.hypot(dx, dy);
      if (d < bm.r + BR) {
        const nx = dx / d, ny = dy / d;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= 2 * vn * nx;
          b.vy -= 2 * vn * ny;
          // evitar trayectorias demasiado verticales
          if (Math.abs(b.vx) < Math.hypot(b.vx, b.vy) * 0.35) b.vx = Math.sign(b.vx || 1) * Math.hypot(b.vx, b.vy) * 0.35;
        }
        b.x = bm.x + nx * (bm.r + BR + 1);
        b.y = by + ny * (bm.r + BR + 1);
        bm.hit = 1;
        this.sfx('bounce', { pitch: 1.4 });
        this.fx.ring(bm.x, by, '#9B6CFF', 60);
      }
    }
    // muro móvil
    if (this.wall) {
      const wl = this.wall;
      const hx = 12, hy = 70;
      const cx = clamp(b.x, wl.x - hx, wl.x + hx), cy = clamp(b.y, wl.y - hy, wl.y + hy);
      const dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy < BR * BR) {
        if (Math.abs(dx) >= Math.abs(dy)) { b.vx = -b.vx; b.x = cx + Math.sign(dx || -b.vx) * (BR + 1); }
        else { b.vy = -b.vy; b.y = cy + Math.sign(dy || 1) * (BR + 1); }
        this.sfx('block');
        this.fx.burst(b.x, b.y, '#C4A9FF', 10, { speed: 200, gravity: 0 });
      }
    }
    // goles
    if (b.x < -BR * 2 || b.x > W + BR * 2) {
      const scorer = b.x < 0 ? 1 : 0;
      this.goal(scorer, b);
      return false;
    }
    return true;
  }

  goal(p, b) {
    this.balls = this.balls.filter((x) => x !== b);
    this.score[p]++;
    this.react[p] = 1.5;
    this.sfx('score');
    this.fx.flash(this.color(p), 0.25);
    this.fx.shake(10);
    this.fx.burst(p ? 20 : W - 20, b.y, [this.color(p), '#fff', '#FFC93C'], 40, { angle: p ? 0 : Math.PI, spread: 1.2, speed: 600 });
    this.fx.float(p ? 220 : W - 220, (TOP + BOT) / 2, '¡GOL!', this.color(p), 52);
    if (this.score[p] >= this.target) return this.end();
    if (!this.balls.length) {
      this.serveT = 1.0;
      this.serveTo = 1 - p;
      if (this.effect && this.effect.id === 'multi') this.endEffect();
    }
  }

  startEffect(c) {
    this.effect = { id: c.id, t: c.id === 'wall' ? 10 : 7 };
    this.banner = { text: c.name, color: c.color, t: 1.6 };
    this.sfx('powerup');
    this.fx.flash(c.color, 0.18);
    if (c.id === 'multi' && this.balls.length) {
      const b = this.balls[0];
      this.balls.push({ x: b.x, y: b.y, vx: -b.vx * 0.9, vy: b.vy + rand(-150, 150), last: -1, smash: 0 });
    }
    if (c.id === 'wall') this.wall = { x: W / 2, y: (TOP + BOT) / 2, ph: 0 };
  }
  endEffect() {
    if (this.effect?.id === 'wall') this.wall = null;
    if (this.effect?.id === 'multi' && this.balls.length > 1) this.balls.length = 1;
    this.effect = null;
  }

  end() {
    const [a, b] = this.score;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Goles',
      stats: [
        { label: 'Golpes', values: this.hits.map(String), raw: this.hits, better: 'high' },
        { label: 'Smashes', values: this.smashes.map(String), raw: this.smashes, better: 'high' },
        { label: 'Rally más largo', values: [String(this.bestRally), String(this.bestRally)] },
      ],
      records: this.hits.slice(),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    this.arenaBG(g, '#0E1430', '#0A0F22');
    // halos de arco
    for (const p of [0, 1]) {
      const x = p ? W : 0;
      const grd = g.createLinearGradient(x, 0, p ? W - 200 : 200, 0);
      grd.addColorStop(0, rgba(this.color(p), 0.22 + (this.react[p] ? 0.2 : 0)));
      grd.addColorStop(1, rgba(this.color(p), 0));
      g.fillStyle = grd;
      g.fillRect(p ? W - 200 : 0, TOP, 200, BOT - TOP);
    }
    this.grid(g, 0, TOP, W, BOT - TOP, 40);
    // personajes de fondo
    for (const p of [0, 1]) {
      const anim = this.react[p] > 0 ? 'win' : this.react[1 - p] > 0 ? 'lose' : 'idle';
      g.save();
      g.globalAlpha = 0.18;
      drawCharacter(g, { id: this.players[p].char, x: p ? W * 0.75 : W * 0.25, y: BOT - 30, s: 3.2, color: this.color(p), anim, t: t + p, facing: p ? -1 : 1, acc: this.players[p].acc, shadow: false });
      g.restore();
      text(g, String(this.score[p]), p ? W * 0.75 : W * 0.25, 250, { size: 150, color: rgba(this.color(p), 0.22) });
    }
    // bordes
    g.fillStyle = '#9B6CFF';
    g.fillRect(0, TOP - 4, W, 4);
    g.fillRect(0, BOT, W, 4);
    g.strokeStyle = 'rgba(246,247,251,0.18)';
    g.lineWidth = 4;
    g.setLineDash([14, 16]);
    g.beginPath(); g.moveTo(W / 2, TOP); g.lineTo(W / 2, BOT); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.arc(W / 2, (TOP + BOT) / 2, 80, 0, TAU); g.stroke();
    // bumpers
    for (const bm of this.bumpers) {
      const by = bm.y + Math.sin(bm.ph) * bm.amp;
      g.strokeStyle = 'rgba(155,108,255,0.15)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(bm.x, bm.y - bm.amp); g.lineTo(bm.x, bm.y + bm.amp); g.stroke();
      glowCircle(g, bm.x, by, bm.r * 2.6, '#9B6CFF', 0.6 + bm.hit);
      g.fillStyle = bm.hit > 0 ? '#E3D6FF' : '#9B6CFF';
      g.beginPath(); g.arc(bm.x, by, bm.r * (1 + bm.hit * 0.2), 0, TAU); g.fill();
      g.fillStyle = '#0B1020';
      g.beginPath(); g.arc(bm.x, by, bm.r * 0.45, 0, TAU); g.fill();
    }
    if (this.wall) {
      g.fillStyle = '#9B6CFF';
      if (quality.glow) { g.save(); g.shadowColor = '#9B6CFF'; g.shadowBlur = 20; }
      roundRect(g, this.wall.x - 12, this.wall.y - 70, 24, 140, 10); g.fill();
      if (quality.glow) g.restore();
    }
    // estela
    for (const tr of this.trail) {
      g.globalAlpha = Math.max(0, tr.a) * 0.6;
      g.fillStyle = tr.s ? '#FFC93C' : tr.c;
      g.beginPath(); g.arc(tr.x, tr.y, BR * tr.a * (tr.s ? 1.3 : 1), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // paletas
    for (const p of [0, 1]) {
      const pd = this.paddles[p];
      const col = this.color(p);
      const charge = pd.smash > 0;
      g.save();
      if (quality.glow) { g.shadowColor = charge ? '#FFC93C' : col; g.shadowBlur = 18 + pd.flash * 20; }
      g.fillStyle = charge ? '#FFE08A' : pd.flash > 0.5 ? '#ffffff' : col;
      roundRect(g, pd.x - PW / 2, pd.y - pd.h / 2, PW, pd.h, 8); g.fill();
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      roundRect(g, pd.x - PW / 2 + 3, pd.y - pd.h / 2 + 6, 4, pd.h - 12, 2); g.fill();
    }
    // pelotas
    for (const b of this.balls) {
      glowCircle(g, b.x, b.y, 40, b.smash > 0 ? '#FFC93C' : '#ffffff', 0.7);
      g.fillStyle = b.smash > 0 ? '#FFE08A' : '#ffffff';
      g.beginPath(); g.arc(b.x, b.y, BR, 0, TAU); g.fill();
    }
    if (!this.balls.length && this.serveT > 0 && this.time > 0) {
      const k = this.serveT;
      text(g, 'SAQUE', W / 2, (TOP + BOT) / 2, { size: 30, color: rgba('#F6F7FB', 0.5 + 0.5 * Math.sin(t * 10)) });
      g.fillStyle = rgba('#F6F7FB', 0.5);
      g.beginPath();
      const d = this.serveTo === 0 ? -1 : 1;
      g.moveTo(W / 2 + d * 70, (TOP + BOT) / 2); g.lineTo(W / 2 + d * 50, (TOP + BOT) / 2 - 12); g.lineTo(W / 2 + d * 50, (TOP + BOT) / 2 + 12); g.fill();
      void k;
    }
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.score, sub: [`Objetivo: ${this.target}`, `Objetivo: ${this.target}`],
      center: this.effect ? CHAOS.find((c) => c.id === this.effect.id).name.replace(/¡|!/g, '') : 'CAOS',
      centerSub: this.effect ? `${Math.ceil(this.effect.t)} s` : `en ${Math.max(0, Math.ceil(this.chaosEvery - this.chaosT))} s`,
      centerSize: 18,
    });
    if (this.banner) {
      const k = 1 - this.banner.t / 1.6;
      const a = Math.min(1, this.banner.t * 3);
      text(g, this.banner.text, W / 2, 400, { size: 64 * (0.7 + ease.outBack(Math.min(1, k * 3)) * 0.3), color: '#fff', glow: this.banner.color, stroke: '#0B1020', alpha: a });
    }
  }
}

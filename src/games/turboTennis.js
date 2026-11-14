// JUEGO 14 — TURBO TENNIS (deportes)
// Tenis arcade de costado: red, piques, saque y volea. El golpe se apunta con la dirección
// (adelante = profundo, atrás = corto) y el timing: un golpe perfecto sale más rápido; uno tardío
// puede irse afuera o a la red. Cada 4 golpes del rally la pelota acelera (TURBO).
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade } from '../core/utils.js';

const SERVE_LIMIT = 5; // segundos máximos para sacar
const GROUND = 612, NET_X = W / 2, NET_TOP = 528, COURT_L = 110, COURT_R = W - 110, BR = 11;
const REACH = 86;

export default class TurboTennis extends BaseGame {
  static meta = {
    id: 'tennis', num: 14, name: 'TURBO TENNIS', short: 'TENNIS', category: 'Deportes', color: '#C6F04A', isNew: true,
    tagline: 'Tenis arcade a toda velocidad: cada rally es más rápido.',
    description: 'Movete con IZQUIERDA/DERECHA y saltá con ARRIBA. Pulsá ACCIÓN 1 cuando la pelota esté cerca para pegarle: mantené ADELANTE para un tiro profundo o ATRÁS para uno corto. ACCIÓN 2 es un globo alto (o un remate si la pelota viene alta). La pelota puede picar una sola vez en tu lado.',
    goal: 'Llegá primero a la cantidad de puntos (con 2 de diferencia).',
    controls: [{ actions: ['left', 'right'], label: 'Moverse' }, { actions: ['up'], label: 'Saltar' }, { actions: ['a'], label: 'Golpe' }, { actions: ['b'], label: 'Globo / remate' }],
    events: ['speed', 'lowgrav', 'mirror', 'invert'],
    options: [{ key: 'target', label: 'Puntos', choices: [[5, '5'], [7, '7'], [11, '11']], def: 7 }],
    record: { label: 'Golpes en una partida', better: 'higher', format: (v) => `${v} golpes` },
    drawIcon(g, t) {
      g.fillStyle = '#1F5F3A'; g.fillRect(10, 140, 180, 50);
      g.fillStyle = '#fff'; g.fillRect(98, 100, 4, 50); g.fillRect(10, 138, 180, 3);
      const k = (t * 0.8) % 1, x = 30 + k * 140, y = 130 - Math.sin(k * Math.PI) * 90;
      glowCircle(g, x, y, 22, '#C6F04A', 0.5);
      g.fillStyle = '#C6F04A'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
      g.strokeStyle = '#3985FF'; g.lineWidth = 6; g.beginPath(); g.ellipse(30, 120, 12, 16, -0.4, 0, TAU); g.stroke();
      g.strokeStyle = '#FF654F'; g.beginPath(); g.ellipse(172, 120, 12, 16, 0.4, 0, TAU); g.stroke();
    },
  };

  init() {
    this.target = this.options.target ?? 7;
    this.g = 1250 * this.gravityScale;
    this.score = [0, 0];
    this.pl = [0, 1].map((p) => ({ p, x: p ? W - 260 : 260, y: GROUND, vx: 0, vy: 0, side: p ? 1 : -1, swing: 0, swingCd: 0, lob: false, hits: 0, aces: 0, winners: 0, faults: 0, anim: 'idle', jumps: 0 }));
    this.ball = null;
    this.server = Math.random() < 0.5 ? 0 : 1;
    this.servesLeft = 2;
    this.state = 'serve';
    this.stateT = 0.8;
    this.rally = 0;
    this.bestRally = 0;
    this.turbo = 1;
    this.lastHit = -1;
    this.bounces = 0;
    this.bounceSide = 0;
    this.returned = false;
    this.trail = [];
    this.msg = null;
    this.limit = this.timed(240);
    this.duration = this.limit;
  }

  sideOf(x) {
    return x < NET_X ? 0 : 1;
  }
  setupServe() {
    const s = this.pl[this.server];
    s.x = this.server ? COURT_R - 60 : COURT_L + 60;
    this.pl[1 - this.server].x = this.server ? COURT_L + 160 : COURT_R - 160;
    this.ball = { x: s.x + (this.server ? -26 : 26), y: GROUND - 150, vx: 0, vy: -380, toss: true, spin: 0, tossT: 0 };
    this.rallyT = 0;
    this.lastHit = -1;
    this.bounces = 0;
    this.rally = 0;
    this.turbo = 1;
    this.returned = false;
    this.ballDead = false;
    this.trail = [];
    this.state = 'play';
    this.sfx('whoosh');
  }

  update(dt) {
    if (this.time >= this.limit) return this.end();
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
    for (const pl of this.pl) this.updatePlayer(pl, dt);
    if (this.state === 'serve' || this.state === 'point') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.setupServe();
      return;
    }
    const b = this.ball;
    if (!b) return;
    // saque: la pelota sube y baja hasta que el que saca le pegue
    if (b.toss) {
      b.vy += this.g * 0.55 * dt;
      b.y += b.vy * dt;
      if (b.y > GROUND - 70) { b.y = GROUND - 70; b.vy = -380; }
      b.tossT += dt;
      this.tryHit(this.pl[this.server], true);
      // el saque no puede quedar esperando para siempre: a los 5 s se saca solo (un saque suave al centro)
      if (b.toss && b.tossT >= SERVE_LIMIT) this.autoServe();
      return;
    }
    // ninguna jugada dura para siempre: a los 30 s se repite el punto (sin sumar para nadie)
    this.rallyT += dt;
    if (this.rallyT > 30 && !this.ballDead) return this.letPoint();
    const steps = 3;
    for (let i = 0; i < steps; i++) this.stepBall(b, dt / steps);
    this.trail.push({ x: b.x, y: b.y });
    if (this.trail.length > 18) this.trail.shift();
    for (const pl of this.pl) this.tryHit(pl, false);
  }
  updatePlayer(pl, dt) {
    const inp = this.inputs[pl.p];
    const ax = inp.axisX();
    const minX = pl.p ? NET_X + 30 : COURT_L - 70, maxX = pl.p ? COURT_R + 70 : NET_X - 30;
    const sp = 430 + this.diff * 40;
    pl.vx += (ax * sp - pl.vx) * Math.min(1, dt * 14);
    pl.x = clamp(pl.x + pl.vx * dt, minX, maxX);
    if (inp.pressed('up') && pl.y >= GROUND - 0.5) { pl.vy = -560; pl.jumps++; this.sfx('jump'); }
    pl.vy += this.g * dt;
    pl.y = Math.min(GROUND, pl.y + pl.vy * dt);
    if (pl.y >= GROUND) pl.vy = 0;
    pl.swing = Math.max(0, pl.swing - dt);
    pl.swingCd = Math.max(0, pl.swingCd - dt);
    if ((inp.pressed('a') || inp.pressed('b')) && pl.swingCd <= 0) {
      pl.swing = 0.22; pl.swingCd = 0.38; pl.lob = inp.pressed('b');
      this.sfx('whoosh', { pitch: 1.4 });
    }
    pl.anim = pl.swing > 0 ? 'attack' : pl.y < GROUND - 1 ? 'jump' : Math.abs(pl.vx) > 40 ? 'run' : 'idle';
  }
  tryHit(pl, serve) {
    const b = this.ball;
    if (!b || pl.swing <= 0) return;
    if (!serve && this.lastHit === pl.p && this.bounces === 0) return;
    if (!serve && this.sideOf(b.x) !== pl.p) return;
    const hx = pl.x + (pl.p ? -22 : 22), hy = pl.y - 62;
    const d = Math.hypot(b.x - hx, b.y - hy);
    if (d > REACH) return;
    // calidad del golpe: más cerca del punto dulce = mejor
    const q = clamp(1 - d / REACH, 0, 1);
    const inp = this.inputs[pl.p];
    const fwd = inp.axisX() * (pl.p ? -1 : 1); // 1 = adelante (hacia la red)
    const dir = pl.p ? -1 : 1;
    const opp = 1 - pl.p;
    let depth = 0.55 + fwd * 0.3; // 0 = cerca de la red, 1 = fondo
    const smash = pl.lob && b.y < pl.y - 130 && !serve;
    const lob = pl.lob && !smash;
    if (serve) depth = 0.55 + fwd * 0.2;
    // error según timing: un golpe pobre puede irse afuera o a la red
    const err = (1 - q) * (1 - q) * rand(-0.55, 0.55);
    const near = opp ? NET_X + 40 : NET_X - 40, far = opp ? COURT_R - 20 : COURT_L + 20;
    let tx = near + (far - near) * clamp(depth + err, -0.25, 1.25);
    const speed = (lob ? 360 : smash ? 1040 : 560 + q * 180) * this.turbo * (1 + this.diff * 0.12);
    let vx = dir * speed;
    let T = Math.abs(tx - b.x) / speed;
    let vy;
    if (smash) {
      vy = 260;
      tx = b.x + vx * 0.6;
    } else {
      vy = (GROUND - BR - b.y - 0.5 * this.g * T * T) / T;
      if (lob) vy = Math.min(vy, -760);
      // asegurar que pase la red (salvo errores grandes)
      for (let k = 0; k < 6; k++) {
        const tn = Math.abs(NET_X - b.x) / Math.abs(vx);
        const yn = b.y + vy * tn + 0.5 * this.g * tn * tn;
        if (yn < NET_TOP - 18 - (err < -0.3 ? -40 : 0)) break;
        vx *= 0.9;
        T = Math.abs(tx - b.x) / Math.abs(vx);
        vy = (GROUND - BR - b.y - 0.5 * this.g * T * T) / T;
      }
    }
    b.vx = vx;
    b.vy = vy;
    b.toss = false;
    b.spin = rand(-1, 1);
    this.lastHit = pl.p;
    this.bounces = 0;
    pl.swing = 0;
    pl.hits++;
    if (!serve) {
      this.rally++;
      this.returned = this.returned || pl.p !== this.server;
      this.bestRally = Math.max(this.bestRally, this.rally);
      if (this.rally % 4 === 0) {
        this.turbo = Math.min(1.6, this.turbo * 1.08);
        this.fx.float(b.x, b.y - 40, 'TURBO', '#C6F04A', 26);
        this.sfx('boost');
      }
    }
    this.sfx(smash ? 'hitHeavy' : 'hit', { pitch: 0.9 + q * 0.4 });
    this.fx.burst(b.x, b.y, smash ? '#FFC93C' : '#C6F04A', smash ? 20 : 10, { speed: 220 });
    if (q > 0.82 && !serve) this.fx.float(hx, hy - 50, '¡PERFECTO!', this.color(pl.p), 20);
    if (smash) this.fx.shake(8);
  }
  autoServe() {
    const pl = this.pl[this.server];
    const b = this.ball;
    // la pelota baja hasta la raqueta del que saca y sale un golpe correcto
    b.x = pl.x + (pl.p ? -22 : 22);
    b.y = pl.y - 62;
    pl.swing = 0.22;
    pl.lob = false;
    this.tryHit(pl, true);
    this.fx.float(pl.x, pl.y - 120, 'SAQUE AUTOMÁTICO', this.color(pl.p), 18);
  }
  letPoint() {
    this.ballDead = true;
    this.msg = { text: 'SE REPITE', sub: 'La jugada se hizo eterna: nuevo saque', col: '#8C96B8', t: 1.4 };
    this.state = 'point';
    this.stateT = 1.4;
  }
  stepBall(b, dt) {
    b.vy += this.g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // red
    if (Math.abs(b.x - NET_X) < BR + 4 && b.y > NET_TOP) {
      b.x = NET_X - Math.sign(b.vx) * (BR + 5);
      b.vx *= -0.25;
      this.sfx('block');
      if (!this.ballDead) this.pointTo(1 - this.lastHit, 'RED');
    }
    if (b.y >= GROUND - BR) {
      b.y = GROUND - BR;
      b.vy *= -0.68;
      b.vx *= 0.92;
      this.sfx('land');
      this.fx.ring(b.x, GROUND, '#ffffff', 26, 0.3, 2);
      if (this.ballDead) return;
      const side = this.sideOf(b.x);
      const inCourt = b.x >= COURT_L && b.x <= COURT_R;
      if (this.bounces === 0) {
        if (!inCourt || side === this.lastHit || this.lastHit < 0) return this.pointTo(1 - Math.max(0, this.lastHit), inCourt ? 'MAL PIQUE' : 'AFUERA');
        this.bounces = 1;
        this.bounceSide = side;
      } else {
        // segundo pique: punto para el que pegó último
        const wasAce = this.rally === 0 && this.lastHit === this.server;
        this.pointTo(this.lastHit, wasAce ? '¡ACE!' : '¡PUNTO!', wasAce);
      }
    }
    if (b.x < -60 || b.x > W + 60) {
      if (!this.ballDead) {
        if (this.bounces === 0) this.pointTo(1 - this.lastHit, 'AFUERA');
        else this.pointTo(this.lastHit, '¡PUNTO!');
      }
    }
  }
  pointTo(p, why, ace = false) {
    if (this.ballDead) return;
    this.ballDead = true;
    this.score[p] += 1;
    if (ace) this.pl[p].aces++;
    if (why === '¡PUNTO!' || ace) this.pl[p].winners++;
    else this.pl[1 - p].faults++;
    this.msg = { text: why, sub: `Punto para ${this.name(p)}`, col: this.color(p), t: 1.4 };
    this.sfx(ace ? 'fanfare' : 'point');
    this.fx.confetti(p ? W * 0.75 : W * 0.25, 300, 30, 0.8);
    this.state = 'point';
    this.stateT = 1.4;
    // saque alterno cada 2 puntos
    this.servesLeft--;
    if (this.servesLeft <= 0) { this.server = 1 - this.server; this.servesLeft = 2; }
    const [a, c] = this.score;
    if ((a >= this.target || c >= this.target) && Math.abs(a - c) >= 2) this.end();
  }
  end() {
    if (this.done) return;
    const [a, b] = this.score;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Puntos',
      stats: [
        { label: 'Golpes', values: this.pl.map((p) => String(p.hits)), raw: this.pl.map((p) => p.hits), better: 'high' },
        { label: 'Aces', values: this.pl.map((p) => String(p.aces)), raw: this.pl.map((p) => p.aces), better: 'high' },
        { label: 'Tiros ganadores', values: this.pl.map((p) => String(p.winners)), raw: this.pl.map((p) => p.winners), better: 'high' },
        { label: 'Errores', values: this.pl.map((p) => String(p.faults)), raw: this.pl.map((p) => p.faults), better: 'low' },
        { label: 'Rally más largo', values: [String(this.bestRally), String(this.bestRally)] },
      ],
      records: this.pl.map((p) => p.hits),
      flags: this.pl.map((p) => ({ aces: p.aces, winners: p.winners })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    // cielo/estadio
    const sky = g.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#0E1638'); sky.addColorStop(1, '#1B2A5E');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) glowCircle(g, 120 + i * 210, 120, 70, '#FFFFFF', 0.06);
    // tribuna
    g.fillStyle = '#141C3D'; g.fillRect(0, 300, W, GROUND - 300);
    for (let i = 0; i < 90; i++) {
      const x = (i * 97) % W, y = 320 + ((i * 53) % 150);
      g.fillStyle = ['#3985FF', '#FF654F', '#9B6CFF', '#FFC93C'][i % 4];
      g.globalAlpha = 0.25 + Math.abs(Math.sin(t * 2 + i)) * 0.15;
      g.beginPath(); g.arc(x, y + Math.sin(t * 4 + i) * (this.msg ? 4 : 1), 6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // cancha
    g.fillStyle = '#1F6B45'; g.fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle = '#2C8A59'; g.fillRect(COURT_L, GROUND, COURT_R - COURT_L, 26);
    g.fillStyle = '#fff'; g.fillRect(COURT_L, GROUND, 4, 26); g.fillRect(COURT_R - 4, GROUND, 4, 26); g.fillRect(COURT_L, GROUND, COURT_R - COURT_L, 3);
    // red
    g.fillStyle = '#E8ECF8'; g.fillRect(NET_X - 3, NET_TOP, 6, GROUND - NET_TOP);
    g.strokeStyle = 'rgba(232,236,248,0.45)'; g.lineWidth = 1;
    for (let y = NET_TOP + 8; y < GROUND; y += 8) { g.beginPath(); g.moveTo(NET_X - 12, y); g.lineTo(NET_X + 12, y); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(NET_X - 14, NET_TOP - 4, 28, 6);
    // jugadores
    for (const pl of this.pl) {
      drawCharacter(g, { id: this.players[pl.p].char, x: pl.x, y: pl.y, s: 0.95, color: this.color(pl.p), anim: pl.anim, t: t + pl.p, facing: pl.p ? -1 : 1, acc: this.players[pl.p].acc });
      // raqueta
      const ang = pl.swing > 0 ? (1 - pl.swing / 0.22) * 2.2 - 1.2 : -0.4;
      g.save();
      g.translate(pl.x + (pl.p ? -18 : 18), pl.y - 58);
      g.scale(pl.p ? -1 : 1, 1);
      g.rotate(ang);
      g.strokeStyle = '#E8ECF8'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -10); g.stroke();
      g.strokeStyle = this.color(pl.p); g.lineWidth = 4;
      g.beginPath(); g.ellipse(40, -15, 15, 11, -0.35, 0, TAU); g.stroke();
      g.restore();
    }
    // pelota
    const b = this.ball;
    if (b) {
      this.trail.forEach((p, i) => { g.fillStyle = rgba('#C6F04A', (i / this.trail.length) * 0.35); g.beginPath(); g.arc(p.x, p.y, BR * (i / this.trail.length), 0, TAU); g.fill(); });
      g.fillStyle = 'rgba(0,0,0,0.3)';
      // sombra: se achica con la altura de la pelota (nunca con radio negativo, aunque suba mucho)
      g.beginPath(); g.ellipse(b.x, GROUND + 4, Math.max(2, BR * (1 - (GROUND - b.y) / 900)), 4, 0, 0, TAU); g.fill();
      glowCircle(g, b.x, b.y, 26 * this.turbo, '#C6F04A', 0.4);
      g.fillStyle = '#D8FF5A'; g.beginPath(); g.arc(b.x, b.y, BR, 0, TAU); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, BR - 3, 0.3 + t * 8 * (b.spin || 0.5), 1.8 + t * 8 * (b.spin || 0.5)); g.stroke();
    }
    this.vignette(g);
  }
  renderHUD(g) {
    const sv = this.pl.map((p) => (this.server === p.p ? 'SACA' : ''));
    this.hudTop(g, { scores: this.score, center: `A ${this.target}`, centerSub: `Rally ${this.rally}${this.turbo > 1.001 ? ' · TURBO x' + this.turbo.toFixed(2) : ''}`, sub: sv });
    if (this.msg) {
      const a = Math.min(1, this.msg.t * 2);
      text(g, this.msg.text, W / 2, 230, { size: 64, color: '#fff', glow: this.msg.col, alpha: a, stroke: 'rgba(11,16,32,0.9)', strokeWidth: 10 });
      text(g, this.msg.sub, W / 2, 284, { size: 20, color: '#fff', alpha: a, body: true, weight: 800 });
    }
    if (this.ball?.toss) {
      panel(g, W / 2 - 190, H - 42, 380, 30, { r: 15, fill: 'rgba(11,16,32,0.8)', stroke: this.color(this.server) });
      const left = this.ball?.toss ? Math.max(0, Math.ceil(SERVE_LIMIT - this.ball.tossT)) : null;
      text(g, `Saca ${this.name(this.server)}: ACCIÓN cuando baje la pelota${left != null && left <= 3 ? ` · saque automático en ${left}` : ''}`, W / 2, H - 27, { size: 14, color: '#fff', body: true, weight: 700 });
    }
  }
}

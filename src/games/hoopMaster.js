// JUEGO 05 — HOOP MASTER (puntería)
// Un aro compartido con tablero doble. Ajustá el ángulo, mantené ACCIÓN para cargar potencia
// y soltá para lanzar. Tiros lejanos valen 3, los limpios suman bonus y el aro termina moviéndose.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, lerp, text, panel, rgba, roundRect, glowCircle, quality, shade, ease } from '../core/utils.js';

const FLOOR = 640, BR = 14, RIM = 46, RIMR = 5;
const BOARD_TOP = 160, BOARD_BOT = 62; // tablero doble: desde hoop.y-160 hasta hoop.y-62 (deja pasar la pelota por debajo)
const SPOTS = [260, 390, 520]; // distancia al aro: cerca, media, lejos (3 pts)

export default class HoopMaster extends BaseGame {
  static meta = {
    id: 'hoop', num: 5, name: 'HOOP MASTER', short: 'HOOP', category: 'Puntería', color: '#FF8E3C',
    tagline: 'Dos tiradores, un aro y cero excusas.',
    description: 'Ajustá el ángulo, mantené ACCIÓN para cargar la potencia (sube y baja) y soltá para lanzar. Cada canasta te aleja del aro: desde la línea lejana vale 3. Los tiros limpios suman +1, el aro dorado da bonus y en la segunda mitad el aro se mueve.',
    goal: 'Sumá más puntos antes de que termine el tiempo.',
    controls: [{ actions: ['left', 'right'], label: 'Ajustar ángulo' }, { actions: ['a'], label: 'Mantener: potencia · Soltar: lanzar' }],
    events: ['short', 'lowgrav', 'double', 'mirror', 'invert', 'obstacles'],
    options: [{ key: 'time', label: 'Tiempo', choices: [[45, '45 s'], [60, '60 s'], [90, '90 s']], def: 60 }],
    record: { label: 'Puntos en una partida', better: 'higher', format: (v) => `${v} pts` },
    drawIcon(g, t) {
      g.fillStyle = '#E8E3D3'; g.fillRect(96, 30, 8, 70);
      g.strokeStyle = '#FF654F'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(62, 100); g.lineTo(138, 100); g.stroke();
      g.strokeStyle = 'rgba(246,247,251,0.6)'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(64 + i * 18, 102); g.lineTo(76 + i * 12, 140); g.stroke(); }
      const k = (t * 0.7) % 1;
      const x = lerp(20, 100, k), y = 170 - Math.sin(k * Math.PI) * 120 + k * 10;
      g.fillStyle = '#FF8E3C'; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill();
      g.strokeStyle = '#7A3A10'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.moveTo(x - 16, y); g.lineTo(x + 16, y); g.stroke();
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 60);
    this.hoop = { x: W / 2, y: 260, baseX: W / 2, moving: false, ph: 0, net: 0 };
    this.shooters = [0, 1].map((p) => ({
      spot: 0, x: this.spotX(p, 0), tx: this.spotX(p, 0), ang: 66, power: 0, pdir: 1, charging: false, reload: 0, throwT: 0, happy: 0,
    }));
    this.balls = [];
    this.score = [0, 0];
    this.shots = [0, 0];
    this.makes = [0, 0];
    this.swishes = [0, 0];
    this.bonusHits = [0, 0];
    this.gold = null;
    this.goldT = 8;
    this.blockers = [];
    if (this.extraObstacles) this.blockers.push({ x: W / 2, y: 470, w: 120, h: 14, ph: 0 });
    this.preview = this.diff < 0.3 ? 0.55 : this.diff < 0.8 ? 0.32 : 0.16;
  }
  spotX(p, i) {
    return p === 0 ? W / 2 - SPOTS[i] : W / 2 + SPOTS[i];
  }

  ambient(dt) {
    for (const s of this.shooters) {
      s.x += (s.tx - s.x) * Math.min(1, dt * 6);
      s.throwT = Math.max(0, s.throwT - dt);
      s.happy = Math.max(0, s.happy - dt);
    }
    this.hoop.net = Math.max(0, this.hoop.net - dt * 2);
  }

  update(dt) {
    this.ambient(dt);
    const grav = 1300 * this.gravityScale;
    // aro móvil en la segunda mitad
    if (!this.hoop.moving && this.time > this.duration / 2) {
      this.hoop.moving = true;
      this.sfx('alarm');
      this.fx.float(W / 2, 170, '¡EL ARO SE MUEVE!', '#FFC93C', 34, { life: 1.6, vy: -20 });
    }
    if (this.hoop.moving) {
      this.hoop.ph += dt * (0.7 + this.diff * 0.4);
      this.hoop.x = this.hoop.baseX + Math.sin(this.hoop.ph) * 150;
    }
    for (const bl of this.blockers) { bl.ph += dt; bl.x = W / 2 + Math.sin(bl.ph * 1.3) * 200; }
    // aro dorado de bonus
    this.goldT -= dt;
    if (!this.gold && this.goldT <= 0) {
      this.gold = { x: rand(380, 900), y: rand(140, 220), t: 6, ph: 0 };
      if (Math.abs(this.gold.x - this.hoop.x) < 140) this.gold.x += this.gold.x < this.hoop.x ? -160 : 160;
      this.sfx('coin');
    }
    if (this.gold) {
      this.gold.t -= dt;
      this.gold.ph += dt;
      if (this.gold.t <= 0) { this.gold = null; this.goldT = rand(7, 11); }
    }
    // tiradores
    for (const p of [0, 1]) {
      const s = this.shooters[p];
      const inp = this.inputs[p];
      s.reload = Math.max(0, s.reload - dt);
      const ax = inp.axisX();
      // ángulo: para J1 "derecha" baja el tiro (hacia el aro); en J2 se refleja
      const dir = p === 0 ? 1 : -1;
      s.ang = clamp(s.ang - ax * dir * 55 * dt, 18, 82);
      if (inp.held('a') && s.reload <= 0) {
        if (!s.charging) { s.charging = true; s.power = 0; s.pdir = 1; }
        s.power += s.pdir * dt * (0.85 + this.diff * 0.35);
        if (s.power >= 1) { s.power = 1; s.pdir = -1; }
        if (s.power <= 0) { s.power = 0; s.pdir = 1; }
      } else if (s.charging) {
        s.charging = false;
        this.throwBall(p);
      }
    }
    // pelotas
    for (const b of this.balls) this.stepBall(b, dt, grav);
    this.ballCollisions();
    this.balls = this.balls.filter((b) => b.life > 0);
    if (this.time >= this.duration) this.end();
  }

  launchVel(s, p) {
    const sp = lerp(520, 1180, s.power);
    const a = (s.ang * Math.PI) / 180;
    return [Math.cos(a) * sp * (p === 0 ? 1 : -1), -Math.sin(a) * sp];
  }
  hand(p) {
    const s = this.shooters[p];
    return [s.x + (p === 0 ? 22 : -22), FLOOR - 92];
  }

  throwBall(p) {
    const s = this.shooters[p];
    const [x, y] = this.hand(p);
    const [vx, vy] = this.launchVel(s, p);
    this.balls.push({ p, x, y, vx, vy, life: 4, touched: false, scored: false, gold: false, spot: s.spot, rot: 0, rest: 0 });
    this.shots[p]++;
    s.reload = 0.45;
    s.throwT = 0.3;
    this.sfx('whoosh');
  }

  stepBall(b, dt, grav) {
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      const py = b.y;
      b.vy += grav * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      b.rot += (b.vx * h) / BR;
      const hp = this.hoop;
      // aros (dos puntos del aro)
      for (const rx of [hp.x - RIM, hp.x + RIM]) this.circleBounce(b, rx, hp.y, RIMR, 0.6, true);
      // tablero doble central (sobre el aro)
      this.rectBounce(b, hp.x - 5, hp.y - BOARD_TOP, 10, BOARD_TOP - BOARD_BOT, 0.6);
      for (const bl of this.blockers) this.rectBounce(b, bl.x - bl.w / 2, bl.y - bl.h / 2, bl.w, bl.h, 0.7);
      // canasta: cruza la línea del aro hacia abajo entre los dos puntos
      if (!b.scored && py < hp.y && b.y >= hp.y && b.vy > 0 && Math.abs(b.x - hp.x) < RIM - RIMR - 2) {
        b.scored = true;
        this.score_(b);
      }
      // aro dorado
      if (this.gold && !b.gold && Math.hypot(b.x - this.gold.x, b.y - this.gold.y) < 22) {
        b.gold = true;
        const pts = 3 * this.scoreMul();
        this.score[b.p] += pts;
        this.bonusHits[b.p]++;
        this.sfx('powerup');
        this.fx.ring(this.gold.x, this.gold.y, '#FFC93C', 80);
        this.fx.float(this.gold.x, this.gold.y - 30, `+${pts} BONUS`, '#FFC93C', 28);
        this.gold = null;
        this.goldT = rand(7, 11);
      }
      // suelo y paredes
      if (b.y > FLOOR - BR) {
        b.y = FLOOR - BR;
        if (Math.abs(b.vy) > 120) this.sfx('bounce', { pitch: 0.6, gap: 60 });
        b.vy = -b.vy * 0.55;
        b.vx *= 0.8;
        if (Math.abs(b.vy) < 60) { b.vy = 0; b.rest += h; }
      }
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * 0.6; }
      if (b.y < 96 + BR) { b.y = 96 + BR; b.vy = Math.abs(b.vy) * 0.5; }
    }
    b.life -= dt;
    if (b.rest > 0.6) b.life = Math.min(b.life, 0.3);
  }

  circleBounce(b, cx, cy, r, rest, isRim) {
    const dx = b.x - cx, dy = b.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < r + BR && d > 0) {
      const nx = dx / d, ny = dy / d;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + rest) * vn * nx;
        b.vy -= (1 + rest) * vn * ny;
        if (isRim) { b.touched = true; this.sfx('rim', { gap: 80 }); }
      }
      b.x = cx + nx * (r + BR);
      b.y = cy + ny * (r + BR);
    }
  }
  rectBounce(b, x, y, w, h, rest) {
    const cx = clamp(b.x, x, x + w), cy = clamp(b.y, y, y + h);
    const dx = b.x - cx, dy = b.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < BR * BR) {
      const d = Math.sqrt(d2) || 1;
      const nx = d2 ? dx / d : 0, ny = d2 ? dy / d : -1;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        b.vx -= (1 + rest) * vn * nx;
        b.vy -= (1 + rest) * vn * ny;
        b.touched = true;
        this.sfx('block', { gap: 80 });
      }
      b.x = cx + nx * BR;
      b.y = cy + ny * BR;
    }
  }
  ballCollisions() {
    const bs = this.balls;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], b = bs[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < BR * 2 && d > 0) {
        const nx = dx / d, ny = dy / d;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx; a.vy += rel * ny;
          b.vx -= rel * nx; b.vy -= rel * ny;
          a.touched = b.touched = true;
          this.sfx('bounce', { pitch: 1.3 });
        }
        const push = (BR * 2 - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  score_(b) {
    const p = b.p;
    let pts = b.spot === 2 ? 3 : 2;
    const swish = !b.touched;
    if (swish) { pts += 1; this.swishes[p]++; }
    pts *= this.scoreMul();
    this.score[p] += pts;
    this.makes[p]++;
    this.hoop.net = 1;
    this.sfx(swish ? 'swish' : 'score');
    this.fx.burst(this.hoop.x, this.hoop.y + 20, [this.color(p), '#fff', '#FFC93C'], 26, { speed: 300 });
    this.fx.float(this.hoop.x, this.hoop.y - 50, `+${pts}${swish ? ' ¡LIMPIO!' : ''}`, this.color(p), swish ? 34 : 30);
    const s = this.shooters[p];
    s.happy = 0.8;
    s.spot = (s.spot + 1) % SPOTS.length;
    s.tx = this.spotX(p, s.spot);
  }

  end() {
    const [a, b] = this.score;
    const pct = this.shots.map((n, p) => (n ? Math.round((this.makes[p] / n) * 100) : 0));
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Puntos',
      stats: [
        { label: 'Canastas', values: this.makes.map((m, p) => `${m}/${this.shots[p]}`), raw: this.makes, better: 'high' },
        { label: '% de acierto', values: pct.map((v) => v + '%'), raw: pct, better: 'high' },
        { label: 'Tiros limpios', values: this.swishes.map(String), raw: this.swishes, better: 'high' },
        { label: 'Aros dorados', values: this.bonusHits.map(String), raw: this.bonusHits, better: 'high' },
      ],
      records: [a, b],
      flags: this.swishes.map((s) => ({ swishes: s })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    // gimnasio nocturno
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#141A3A');
    bg.addColorStop(1, '#0C1028');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      glowCircle(g, 120 + i * 210, 110, 120, '#9B6CFF', 0.25);
      g.fillStyle = 'rgba(246,247,251,0.6)';
      g.fillRect(100 + i * 210, 98, 40, 6);
    }
    // gradas
    for (let r = 0; r < 4; r++) {
      g.fillStyle = r % 2 ? '#161D40' : '#19214A';
      g.fillRect(0, 400 + r * 30, W, 30);
      for (let i = 0; i < 40; i++) {
        const x = i * 34 + (r % 2) * 17;
        const bob = Math.sin(t * 3 + i + r) * 2;
        g.fillStyle = ['#2B3566', '#3B2E66', '#2E4B66'][(i + r) % 3];
        g.beginPath(); g.arc(x, 410 + r * 30 + bob, 9, 0, TAU); g.fill();
      }
    }
    // cancha
    const fl = g.createLinearGradient(0, FLOOR, 0, H);
    fl.addColorStop(0, '#C97B3E');
    fl.addColorStop(1, '#8A4E25');
    g.fillStyle = fl;
    g.fillRect(0, FLOOR, W, H - FLOOR);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 2;
    for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 30, H); g.stroke(); }
    // marcas de distancia
    for (const p of [0, 1]) {
      SPOTS.forEach((d, i) => {
        const x = this.spotX(p, i);
        g.fillStyle = i === 2 ? '#FFC93C' : 'rgba(246,247,251,0.6)';
        g.fillRect(x - 20, FLOOR + 6, 40, 5);
        text(g, i === 2 ? '3 PTS' : '2 PTS', x, FLOOR + 30, { size: 12, body: true, weight: 800, color: i === 2 ? '#FFC93C' : 'rgba(246,247,251,0.6)' });
      });
    }
    this.drawHoop(g, t);
    for (const bl of this.blockers) {
      g.fillStyle = '#9B6CFF';
      roundRect(g, bl.x - bl.w / 2, bl.y - bl.h / 2, bl.w, bl.h, 7); g.fill();
    }
    if (this.gold) {
      const a = Math.min(1, this.gold.t);
      g.save();
      g.globalAlpha = a;
      glowCircle(g, this.gold.x, this.gold.y, 60, '#FFC93C', 0.8);
      g.strokeStyle = '#FFC93C';
      g.lineWidth = 6;
      g.beginPath(); g.ellipse(this.gold.x, this.gold.y, 24, 24 * Math.abs(Math.cos(this.gold.ph * 2)) + 4, 0, 0, TAU); g.stroke();
      text(g, '+3', this.gold.x, this.gold.y - 40, { size: 18, color: '#FFE08A' });
      g.restore();
    }
    // tiradores, guías y barras de potencia
    for (const p of [0, 1]) this.drawShooter(g, p, t);
    for (const b of this.balls) this.drawBall(g, b);
  }

  drawHoop(g, t) {
    const hp = this.hoop;
    // brazo de soporte
    g.fillStyle = '#5A6380';
    g.fillRect(hp.x - 3, 96, 6, hp.y - BOARD_TOP - 96);
    // tablero doble
    g.fillStyle = 'rgba(246,247,251,0.9)';
    roundRect(g, hp.x - 5, hp.y - BOARD_TOP, 10, BOARD_TOP - BOARD_BOT, 4); g.fill();
    g.fillStyle = '#FF654F';
    g.fillRect(hp.x - 5, hp.y - BOARD_BOT - 34, 10, 26);
    // soporte del aro (detrás, no colisiona)
    g.strokeStyle = 'rgba(90,99,128,0.8)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(hp.x, hp.y - BOARD_BOT); g.lineTo(hp.x - RIM + 6, hp.y); g.moveTo(hp.x, hp.y - BOARD_BOT); g.lineTo(hp.x + RIM - 6, hp.y); g.stroke();
    // red
    g.strokeStyle = 'rgba(246,247,251,0.7)';
    g.lineWidth = 1.6;
    const sway = Math.sin(t * 18) * hp.net * 6;
    for (let i = 0; i <= 6; i++) {
      const x0 = hp.x - RIM + (i * RIM * 2) / 6;
      const x1 = hp.x - RIM * 0.6 + (i * RIM * 1.2) / 6 + sway;
      g.beginPath(); g.moveTo(x0, hp.y); g.lineTo(x1, hp.y + 46 + hp.net * 10); g.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      const y = hp.y + k * 14 + hp.net * k * 3;
      const w = RIM * (1 - k * 0.13);
      g.beginPath(); g.moveTo(hp.x - w + sway * k / 3, y); g.lineTo(hp.x + w + sway * k / 3, y); g.stroke();
    }
    // aro
    g.save();
    if (quality.glow) { g.shadowColor = '#FF654F'; g.shadowBlur = 12; }
    g.strokeStyle = '#FF654F';
    g.lineWidth = 6;
    g.beginPath(); g.ellipse(hp.x, hp.y, RIM, 6, 0, 0, TAU); g.stroke();
    g.restore();
  }

  drawShooter(g, p, t) {
    const s = this.shooters[p];
    const col = this.color(p);
    const dir = p === 0 ? 1 : -1;
    // trayectoria de ayuda
    if (s.charging || s.reload <= 0) {
      const [hx, hy] = this.hand(p);
      const fake = { ...s, power: s.charging ? s.power : 0.55 };
      const [vx, vy] = this.launchVel(fake, p);
      const grav = 1300 * this.gravityScale;
      g.fillStyle = rgba(col, s.charging ? 0.9 : 0.35);
      for (let i = 1; i <= 14; i++) {
        const tt = (i / 14) * this.preview;
        const x = hx + vx * tt, y = hy + vy * tt + 0.5 * grav * tt * tt;
        g.beginPath(); g.arc(x, y, 3.2 * (1 - i / 20), 0, TAU); g.fill();
      }
    }
    let anim = 'idle';
    if (s.happy > 0) anim = 'win';
    else if (s.throwT > 0) anim = 'throw';
    else if (s.charging) anim = 'aim';
    else if (Math.abs(s.x - s.tx) > 4) anim = 'run';
    drawCharacter(g, { id: this.players[p].char, x: s.x, y: FLOOR, s: 0.95, color: col, anim, t: t + p, facing: dir, acc: this.players[p].acc });
    // pelota en mano
    if (s.reload <= 0 && !s.throwT) {
      const [hx, hy] = this.hand(p);
      this.drawBall(g, { x: hx, y: hy, p, rot: 0 });
    }
    // medidor de potencia
    const mx = s.x + dir * -52, my = FLOOR - 130;
    g.fillStyle = 'rgba(11,16,32,0.75)';
    roundRect(g, mx - 9, my, 18, 100, 9); g.fill();
    const pw = s.charging ? s.power : 0;
    const grd = g.createLinearGradient(0, my + 100, 0, my);
    grd.addColorStop(0, '#48D597');
    grd.addColorStop(0.6, '#FFC93C');
    grd.addColorStop(1, '#FF654F');
    g.fillStyle = grd;
    roundRect(g, mx - 6, my + 3 + 94 * (1 - pw), 12, 94 * pw, 6); g.fill();
    text(g, `${Math.round(s.ang)}°`, mx, my - 14, { size: 13, body: true, weight: 800, color: col });
  }

  drawBall(g, b) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.rot || 0);
    g.fillStyle = '#FF8E3C';
    g.beginPath(); g.arc(0, 0, BR, 0, TAU); g.fill();
    g.strokeStyle = '#7A3A10';
    g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(-BR, 0); g.lineTo(BR, 0); g.moveTo(0, -BR); g.lineTo(0, BR); g.stroke();
    g.beginPath(); g.arc(-BR * 1.2, 0, BR, -0.8, 0.8); g.stroke();
    g.beginPath(); g.arc(BR * 1.2, 0, BR, Math.PI - 0.8, Math.PI + 0.8); g.stroke();
    g.restore();
    g.strokeStyle = this.color(b.p);
    g.lineWidth = 3;
    g.beginPath(); g.arc(b.x, b.y, BR + 2, 0, TAU); g.stroke();
  }

  renderHUD(g) {
    this.hudTop(g, { scores: this.score, sub: this.makes.map((m, p) => `${m} canastas · ${['cerca', 'media', 'lejos'][this.shooters[p].spot]}`), timer: this.remaining });
    this.hudTimeBar(g);
  }
}

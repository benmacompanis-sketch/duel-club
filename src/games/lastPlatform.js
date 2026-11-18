// JUEGO 04 — LAST PLATFORM (habilidad)
// Arena de plataformas que se desmoronan. Saltá, empujá y esquivá los láseres.
// Pierde la ronda quien cae al vacío. Al mejor de 3 rondas.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, approach, ease, halftone, comicPanel } from '../core/utils.js';

const TW = 40, TH = 18;
const LAYOUTS = [
  {
    name: 'Clásico',
    rows: [[580, 160, 1120], [440, 80, 280], [440, 1000, 1200], [320, 520, 760]],
    movers: [{ x: 380, y: 450, w: 3, ax: 1, range: 520, sp: 0.6 }],
    spawn: [[220, 560], [1060, 560]],
  },
  {
    name: 'Islas',
    rows: [[570, 120, 360], [570, 520, 760], [570, 920, 1160], [420, 300, 460], [420, 820, 980], [280, 560, 720]],
    movers: [{ x: 420, y: 330, w: 2, ay: 1, range: 240, sp: 0.7 }, { x: 820, y: 330, w: 2, ay: 1, range: 240, sp: 0.7, ph: Math.PI }],
    spawn: [[240, 540], [1040, 540]],
  },
  {
    name: 'Puentes',
    rows: [[600, 200, 520], [600, 760, 1080], [470, 80, 240], [470, 1040, 1200], [350, 360, 920], [230, 560, 720]],
    movers: [{ x: 480, y: 500, w: 3, ax: 1, range: 200, sp: 0.4 }, { x: 540, y: 620, w: 2, ax: 1, range: 160, sp: 0.9 }],
    spawn: [[300, 580], [980, 580]],
  },
];

export default class LastPlatform extends BaseGame {
  static meta = {
    id: 'platform', num: 4, name: 'LAST PLATFORM', short: 'PLATFORM', category: 'Habilidad', color: '#48D597',
    tagline: 'El suelo se acaba. Tu equilibrio, no.',
    description: 'Las baldosas se desmoronan si te quedás quieto encima y la arena se achica sin parar. Saltá entre plataformas, subite a las móviles, esquivá los láseres y empujá a tu rival con el dash. Cada ronda tenés 2 vidas: si te caés, volvés en una nube.',
    goal: 'No caigas. Ganá 2 rondas.',
    controls: [
      { actions: ['left', 'right'], label: 'Moverse' },
      { actions: ['up', 'a'], label: 'Saltar' },
      { actions: ['b'], label: 'Dash / empujón' },
    ],
    events: ['speed', 'lowgrav', 'obstacles', 'mirror', 'invert'],
    options: [],
    record: { label: 'Tiempo en pie (partida)', better: 'higher', format: (v) => `${v.toFixed(1)} s` },
    drawIcon(g, t) {
      const fall = (t * 40) % 80;
      g.fillStyle = '#48D597';
      for (let i = 0; i < 4; i++) { roundRect(g, 24 + i * 38, 130, 34, 16, 4); g.fill(); }
      g.globalAlpha = 1 - fall / 80;
      roundRect(g, 24 + 4 * 38, 130 + fall, 34, 16, 4); g.fill();
      g.globalAlpha = 1;
      g.fillStyle = '#2A8A63';
      roundRect(g, 70, 80, 60, 14, 4); g.fill();
      drawCharacter(g, { id: 'pico', x: 70, y: 130, s: 0.5, color: '#3985FF', anim: 'run', t, shadow: false });
      drawCharacter(g, { id: 'mochi', x: 112, y: 80 - Math.abs(Math.sin(t * 3)) * 16, s: 0.45, color: '#FF654F', anim: 'jump', t, facing: -1, shadow: false });
    },
  };

  init() {
    this.roundWins = [0, 0];
    this.round = 0;
    this.alive = [0, 0];
    this.pushes = [0, 0];
    this.jumps = [0, 0];
    this.fallsCount = [0, 0];
    this.startRound();
  }

  startRound() {
    this.round++;
    const L = choice(LAYOUTS);
    this.layout = L;
    this.tiles = [];
    for (const [y, x0, x1] of L.rows) {
      for (let x = x0; x + TW <= x1 + 0.5; x += TW) this.tiles.push({ x, y, state: 'ok', t: 0, stand: 0, vy: 0, dy: 0 });
    }
    this.movers = L.movers.map((m) => ({ ...m, ox: m.x, oy: m.y, ph: m.ph || 0, dx: 0, dy: 0, px: m.x, py: m.y }));
    this.bodies = [0, 1].map((p) => ({
      x: L.spawn[p][0], y: L.spawn[p][1] - 2, vx: 0, vy: 0, w: 32, h: 54, ground: null, coyote: 0, buffer: 0,
      face: p ? -1 : 1, dash: 0, dashCd: 0, stun: 0, dead: false, deadAt: 0, anim: 'idle', jumpHeld: false, dashHit: false, lives: 2, inv: 0,
    }));
    this.lasers = [];
    this.laserT = 3;
    this.shrinkT = 0;
    this.roundTime = 0;
    this.sudden = false;
    this.state = 'play';
    this.roundEnd = 0;
    this.roundWinner = null;
  }

  get standTime() {
    return Math.max(0.7, 1.45 - this.diff * 0.45) * (this.sudden ? 0.5 : 1);
  }

  ambient(dt) {
    for (const m of this.movers) this.moveMover(m, dt);
  }
  moveMover(m, dt) {
    m.px = m.x; m.py = m.y;
    if (m.sp) {
      m.ph += dt * m.sp;
      if (m.ax) m.x = m.ox + (Math.sin(m.ph) * 0.5 + 0.5) * m.range;
      if (m.ay) m.y = m.oy + (Math.sin(m.ph) * 0.5 + 0.5) * m.range;
    }
    m.dx = m.x - m.px; m.dy = m.y - m.py;
  }

  update(dt) {
    if (this.frozen(dt)) return;
    this.roundTime += dt;
    for (const m of this.movers) this.moveMover(m, dt);
    // las nubes de reaparición duran unos segundos
    for (const m of this.movers) if (m.cloud) m.life -= dt;
    this.movers = this.movers.filter((m) => !m.cloud || m.life > 0);
    if (this.state === 'play') {
      for (const p of [0, 1]) if (!this.bodies[p].dead) this.alive[p] += dt;
      if (this.roundTime > this.timed(45) && !this.sudden) {
        this.sudden = true;
        this.sfx('alarm');
        this.fx.float(W / 2, 200, '¡MUERTE SÚBITA!', '#FF654F', 46, { life: 1.8, vy: -20 });
      }
    }
    this.updateTiles(dt);
    this.updateLasers(dt);
    for (const p of [0, 1]) this.updateBody(p, dt);
    this.bodyCollision();
    // fin de ronda
    if (this.state === 'play') {
      const dead = this.bodies.map((b) => b.dead);
      if (dead[0] || dead[1]) {
        this.state = 'grace';
        this.roundEnd = 0;
      }
    } else if (this.state === 'grace') {
      this.roundEnd += dt;
      if (this.roundEnd > 0.3) {
        const dead = this.bodies.map((b) => b.dead);
        let w = -1;
        if (dead[0] && !dead[1]) w = 1;
        else if (dead[1] && !dead[0]) w = 0;
        this.roundWinner = w;
        if (w >= 0) {
          this.roundWins[w]++;
          this.sfx('score');
          this.fx.confetti(this.bodies[w].x, this.bodies[w].y - 40, 50, 0.8);
        } else this.sfx('draw');
        this.state = 'result';
        this.roundEnd = 0;
      }
    } else if (this.state === 'result') {
      this.roundEnd += dt;
      if (this.roundEnd > 2.0) {
        if (this.roundWins[0] >= 2 || this.roundWins[1] >= 2 || this.round >= 5) this.end();
        else this.startRound();
      }
    }
  }

  updateTiles(dt) {
    // reducción progresiva desde los bordes
    this.shrinkT += dt;
    const every = (this.sudden ? 0.6 : Math.max(1.6, 3.4 - this.diff * 1.2)) * (this.extraObstacles ? 0.7 : 1);
    if (this.state === 'play' && this.roundTime > 4 && this.shrinkT >= every) {
      this.shrinkT = 0;
      const ok = this.tiles.filter((tl) => tl.state === 'ok');
      if (ok.length > 4) {
        ok.sort((a, b) => Math.abs(b.x + TW / 2 - W / 2) - Math.abs(a.x + TW / 2 - W / 2));
        const pick = ok[Math.floor(Math.random() * Math.min(3, ok.length))];
        pick.state = 'shake';
        pick.t = 0;
      }
    }
    for (const tl of this.tiles) {
      if (tl.state === 'shake') {
        tl.t += dt;
        if (tl.t > 0.6) { tl.state = 'fall'; tl.vy = 0; this.sfx('tap'); }
      } else if (tl.state === 'fall') {
        tl.vy += 1400 * dt;
        tl.dy += tl.vy * dt;
      } else if (tl.state === 'ok') {
        tl.stand = Math.max(0, tl.stand - dt * 0.6);
      }
    }
    this.tiles = this.tiles.filter((tl) => tl.dy < 400);
  }

  updateLasers(dt) {
    if (this.state !== 'play') return;
    this.laserT -= dt;
    const freq = Math.max(2.2, 6 - this.diff * 2.2) * (this.extraObstacles ? 0.55 : 1);
    if (this.laserT <= 0 && this.roundTime > 3) {
      this.laserT = rand(freq * 0.8, freq * 1.3);
      // elegir una columna cerca de algún jugador para que sea amenaza real
      const target = this.bodies[Math.random() < 0.5 ? 0 : 1];
      const x = clamp(target.x + rand(-140, 140), 80, W - 80);
      this.lasers.push({ x, w: 70, t: 0, warn: 1.2, on: 0.5, hit: [false, false] });
      this.sfx('warn');
    }
    for (const lz of this.lasers) {
      lz.t += dt;
      if (lz.t > lz.warn && lz.t < lz.warn + lz.on) {
        if (!lz.zapped) { lz.zapped = true; this.sfx('zap'); this.fx.shake(6); }
        for (const p of [0, 1]) {
          const b = this.bodies[p];
          if (!b.dead && !lz.hit[p] && Math.abs(b.x - lz.x) < lz.w / 2 + b.w / 2) {
            lz.hit[p] = true;
            const dir = b.x < lz.x ? -1 : 1;
            b.vx = dir * 520;
            b.vy = -640 * Math.sqrt(this.gravityScale);
            b.stun = 0.45;
            b.ground = null;
            this.fx.burst(b.x, b.y - 30, ['#FF654F', '#FFC93C', '#fff'], 24, { speed: 380, kind: 'spark' });
          }
        }
      }
    }
    this.lasers = this.lasers.filter((lz) => lz.t < lz.warn + lz.on + 0.2);
  }

  updateBody(p, dt) {
    const b = this.bodies[p];
    if (b.dead) return;
    const inp = this.inputs[p];
    const playing = this.state === 'play' || this.state === 'grace';
    const g = 1750 * this.gravityScale;
    b.stun = Math.max(0, b.stun - dt);
    b.dashCd = Math.max(0, b.dashCd - dt);
    b.coyote = Math.max(0, b.coyote - dt);
    b.buffer = Math.max(0, b.buffer - dt);
    const ax = playing && b.stun <= 0 ? inp.axisX() : 0;
    if (ax) b.face = ax;
    // dash / empujón
    if (playing && inp.pressed('b') && b.dashCd <= 0 && b.stun <= 0) {
      b.dash = 0.18;
      b.dashCd = 1.1;
      b.dashHit = false;
      b.vx = b.face * 760;
      if (!b.ground) b.vy = Math.min(b.vy, -60);
      this.sfx('dash');
      this.fx.burst(b.x, b.y - 26, this.color(p), 10, { angle: b.face > 0 ? Math.PI : 0, spread: 0.5, speed: 220, gravity: 0 });
    }
    if (b.dash > 0) {
      b.dash -= dt;
    } else {
      const target = ax * 330;
      const accel = b.ground ? 2600 : 1500;
      b.vx = approach(b.vx, target, accel * dt);
    }
    // salto (con coyote time y buffer)
    const jumpPressed = playing && b.stun <= 0 && (inp.pressed('up') || inp.pressed('a'));
    const jumpHeld = inp.held('up') || inp.held('a');
    if (jumpPressed) b.buffer = 0.12;
    if (b.ground) b.coyote = 0.1;
    if (b.buffer > 0 && b.coyote > 0) {
      b.vy = -640;
      b.ground = null;
      b.coyote = 0;
      b.buffer = 0;
      this.jumps[p]++;
      this.sfx('jump', { pitch: p ? 1.1 : 1 });
    }
    if (!jumpHeld && b.vy < -260) b.vy += g * dt * 1.4; // salto variable
    b.vy += g * dt;
    b.vy = Math.min(b.vy, 1100);
    // plataforma móvil: arrastrar
    if (b.ground && b.ground.mover) { b.x += b.ground.ref.dx; b.y += b.ground.ref.dy; }
    const prevBottom = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.x = clamp(b.x, 16, W - 16);
    // colisión de una vía con baldosas y plataformas móviles
    const wasGround = b.ground;
    b.ground = null;
    if (b.vy >= 0) {
      for (const tl of this.tiles) {
        if (tl.state === 'fall') continue;
        if (b.x + b.w / 2 > tl.x + 2 && b.x - b.w / 2 < tl.x + TW - 2 && prevBottom <= tl.y + 1 && b.y >= tl.y) {
          b.y = tl.y; b.vy = 0; b.ground = { tile: tl };
        }
      }
      for (const m of this.movers) {
        const mw = m.w * TW;
        if (b.x + b.w / 2 > m.x && b.x - b.w / 2 < m.x + mw && prevBottom <= m.y + 1 + Math.max(0, m.dy) && b.y >= m.y) {
          b.y = m.y; b.vy = 0; b.ground = { mover: true, ref: m };
        }
      }
    }
    if (b.ground && !wasGround) { this.sfx('land'); this.fx.burst(b.x, b.y, 'rgba(246,247,251,0.6)', 6, { angle: -Math.PI / 2, spread: 1.4, speed: 120, gravity: 300, life: 0.4 }); }
    // pisar baldosas acelera su caída
    if (b.ground?.tile && playing) {
      const tl = b.ground.tile;
      if (tl.state === 'ok') {
        tl.stand += dt * 1.6;
        if (tl.stand > this.standTime) { tl.state = 'shake'; tl.t = 0; }
      }
    }
    // caída al vacío
    if (b.y > H + 80 && b.lives > 1 && this.state === 'play') {
      // le queda otra vida: vuelve en una nube lejos del rival
      b.lives--;
      this.fallsCount[p]++;
      this.sfx('lose');
      this.fx.burst(b.x, H - 10, [this.color(p), '#fff'], 30, { angle: -Math.PI / 2, spread: 0.6, speed: 600 });
      this.fx.shake(8);
      this.respawn(p);
      return;
    }
    b.inv = Math.max(0, b.inv - dt);
    if (b.y > H + 80) {
      b.dead = true;
      b.deadAt = this.roundTime;
      this.fallsCount[p]++;
      this.sfx('lose');
      this.fx.burst(b.x, H - 10, [this.color(p), '#fff'], 40, { angle: -Math.PI / 2, spread: 0.6, speed: 700 });
      this.fx.shake(12);
    }
    // animación
    if (b.stun > 0) b.anim = 'hurt';
    else if (b.dash > 0) b.anim = 'attack';
    else if (!b.ground) b.anim = b.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(b.vx) > 40) b.anim = 'run';
    else b.anim = 'idle';
  }

  respawn(p) {
    const b = this.bodies[p], o = this.bodies[1 - p];
    const ok = this.tiles.filter((tl) => tl.state === 'ok');
    let x = W / 2 - 60, y = 300;
    if (ok.length) {
      let best = ok[0];
      for (const tl of ok) if (Math.abs(tl.x - o.x) - tl.y * 0.3 > Math.abs(best.x - o.x) - best.y * 0.3) best = tl;
      x = clamp(best.x - TW, 40, W - 160); y = Math.max(170, best.y - 130);
    }
    this.movers.push({ cloud: true, life: 3.2, x, y, w: 3, ox: x, oy: y, ph: 0, sp: 0, dx: 0, dy: 0, px: x, py: y });
    Object.assign(b, { x: x + 60, y: y - 2, vx: 0, vy: 0, stun: 0, dash: 0, ground: null, inv: 1.4 });
    this.fx.burst(x + 60, y - 30, ['#fff', this.color(p)], 16, { speed: 200 });
    this.fx.float(x + 60, y - 90, '¡OTRA VIDA!', this.color(p), 24);
  }

  bodyCollision() {
    const [a, b] = this.bodies;
    if (a.dead || b.dead) return;
    const ox = a.w / 2 + b.w / 2 - Math.abs(a.x - b.x);
    const oy = Math.min(a.y, b.y) - Math.max(a.y - a.h, b.y - b.h);
    if (ox > 0 && oy > 0) {
      // pisotón: el de arriba rebota
      if (oy < ox && Math.abs(a.y - b.y) > 20) {
        const top = a.y < b.y ? a : b, bot = top === a ? b : a;
        if (top.vy > 0) {
          top.y = bot.y - bot.h;
          top.vy = -520;
          bot.vy = Math.max(bot.vy, 200);
          this.sfx('bounce');
        }
        return;
      }
      const dir = a.x < b.x ? -1 : 1;
      a.x += dir * ox / 2;
      b.x -= dir * ox / 2;
      // dash contra el rival = empujón fuerte
      for (const [s, o, sp] of [[a, b, 0], [b, a, 1]]) {
        if (s.dash > 0 && !s.dashHit && !(o.inv > 0)) {
          s.dashHit = true;
          o.vx = s.face * 720;
          o.vy = -380 * Math.sqrt(this.gravityScale);
          o.stun = 0.4;
          o.ground = null;
          s.vx *= 0.2;
          this.pushes[sp]++;
          this.sfx('hitHeavy');
          this.fx.shake(9);
          this.impact(0.07);
          this.fx.float((a.x + b.x) / 2, Math.min(a.y, b.y) - 70, '¡PAF!', '#FFE08A', 26);
          this.fx.burst((a.x + b.x) / 2, Math.min(a.y, b.y) - 30, ['#fff', '#FFC93C', this.color(sp)], 20, { speed: 380, kind: 'star' });
        }
      }
      const avg = (a.vx + b.vx) / 2;
      if (a.dash <= 0 && b.dash <= 0) { a.vx = avg + dir * 60; b.vx = avg - dir * 60; }
    }
  }

  end() {
    const [a, b] = this.roundWins;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Rondas ganadas',
      stats: [
        { label: 'Tiempo en pie', values: this.alive.map((v) => `${v.toFixed(1)} s`), raw: this.alive, better: 'high' },
        { label: 'Empujones', values: this.pushes.map(String), raw: this.pushes, better: 'high' },
        { label: 'Saltos', values: this.jumps.map(String) },
        { label: 'Caídas', values: this.fallsCount.map(String), raw: this.fallsCount, better: 'low' },
      ],
      records: this.alive.slice(),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  camera(g) {
    const live = this.bodies.filter((b) => !b.dead);
    if (!live.length) return this.zoomCam(g, W / 2, H / 2, 1);
    const xs = live.map((b) => b.x), ys = live.map((b) => b.y);
    const span = Math.max(...xs) - Math.min(...xs) + (Math.max(...ys) - Math.min(...ys)) * 1.4;
    const z = clamp(1.36 - span / 1700, 1.06, 1.3);
    this.zoomCam(g, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2 - 40, z);
  }
  render(g) {
    const t = this.realTime;
    this.stageLayer(g, 'platform', (cg) => {
      const sky = cg.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#1A2E66'); sky.addColorStop(0.7, '#2B1F5C'); sky.addColorStop(1, '#4A1F4F');
      cg.fillStyle = sky; cg.fillRect(0, 0, W, H);
      cg.fillStyle = halftone(cg, 'rgba(255,255,255,0.06)', 12, 2.4); cg.fillRect(0, 0, W, H * 0.6);
      // luna con contorno de tinta
      glowCircle(cg, 1040, 200, 170, '#9FB7FF', 0.45);
      cg.fillStyle = '#F2F5FF'; cg.beginPath(); cg.arc(1040, 200, 52, 0, TAU); cg.fill();
      cg.lineWidth = 5; cg.strokeStyle = '#0D0B14'; cg.stroke();
      cg.fillStyle = 'rgba(13,11,20,0.12)'; cg.beginPath(); cg.arc(1024, 188, 12, 0, TAU); cg.arc(1060, 216, 9, 0, TAU); cg.fill();
      for (let i = 0; i < 40; i++) { cg.fillStyle = 'rgba(255,244,224,0.6)'; cg.fillRect((i * 197) % W, 100 + ((i * 89) % 260), 3, 3); }
      // islas flotantes lejanas
      for (const [ix, iy, iw] of [[140, 230, 120], [420, 170, 90], [760, 250, 140]]) {
        cg.fillStyle = '#26386E';
        cg.beginPath(); cg.moveTo(ix, iy); cg.lineTo(ix + iw, iy); cg.lineTo(ix + iw * 0.6, iy + 50); cg.lineTo(ix + iw * 0.35, iy + 40); cg.closePath(); cg.fill();
        cg.lineWidth = 4; cg.strokeStyle = '#0D0B14'; cg.stroke();
        cg.fillStyle = '#3DDC97'; cg.fillRect(ix, iy - 7, iw, 9); cg.strokeRect(ix, iy - 7, iw, 9);
      }
      // montañas con contorno
      cg.fillStyle = '#1F2B5A';
      cg.beginPath(); cg.moveTo(0, H);
      for (let x = 0; x <= W; x += 80) cg.lineTo(x, 430 + Math.sin(x * 0.011) * 50 + Math.sin(x * 0.03) * 20);
      cg.lineTo(W, H); cg.closePath(); cg.fill();
      cg.lineWidth = 5; cg.strokeStyle = '#0D0B14'; cg.stroke();
      cg.fillStyle = halftone(cg, 'rgba(13,11,20,0.3)', 9, 2); cg.fill();
    });
    // vacío: lava de historieta que late
    const v = g.createLinearGradient(0, H - 130, 0, H);
    v.addColorStop(0, 'rgba(255,101,79,0)');
    v.addColorStop(1, `rgba(255,101,79,${0.5 + Math.sin(t * 3) * 0.1})`);
    g.fillStyle = v; g.fillRect(0, H - 130, W, 130);
    g.fillStyle = '#FF8E3C';
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, H - 18 - Math.sin(x * 0.05 + t * 3) * 7);
    g.lineTo(W, H); g.closePath(); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
    // láseres (aviso)
    for (const lz of this.lasers) {
      if (lz.t < lz.warn) {
        const blink = Math.sin(lz.t * 22) > 0;
        g.fillStyle = rgba('#FF654F', blink ? 0.2 : 0.08);
        g.fillRect(lz.x - lz.w / 2, 0, lz.w, H);
        g.strokeStyle = '#FFD23F'; g.setLineDash([12, 10]); g.lineWidth = 3;
        g.strokeRect(lz.x - lz.w / 2, 0, lz.w, H);
        g.setLineDash([]);
        text(g, '!', lz.x, 140, { size: 40, color: '#FFD23F' });
      }
    }
    // baldosas: bloques de historieta (verde = firme, amarillo = gastada, naranja = por caer)
    g.lineJoin = 'round';
    for (const tl of this.tiles) {
      const shake = tl.state === 'shake' ? Math.sin(tl.t * 60) * 2 : 0;
      const x = tl.x + shake, y = tl.y + tl.dy;
      const danger = tl.state === 'ok' ? tl.stand / this.standTime : 1;
      const base = tl.state === 'ok' ? (danger > 0.5 ? '#FFD23F' : '#3DDC97') : tl.state === 'shake' ? '#FF8E3C' : '#8A5A44';
      g.globalAlpha = tl.state === 'fall' ? Math.max(0, 1 - tl.dy / 300) : 1;
      g.fillStyle = shade(base, -0.45); g.fillRect(x + 1, y + 2, TW - 2, TH);
      g.fillStyle = base; g.fillRect(x + 1, y, TW - 2, TH - 5);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 4, y + 3, TW - 10, 3);
      g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.strokeRect(x + 1, y, TW - 2, TH + 2);
      if (tl.state === 'shake' || danger > 0.5) {
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 10, y); g.lineTo(x + 18, y + 9); g.lineTo(x + 26, y + 4); g.lineTo(x + 32, y + 12); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // plataformas móviles y nubes de reaparición
    for (const m of this.movers) {
      const mw = m.w * TW;
      if (m.cloud) {
        g.globalAlpha = Math.min(1, m.life * 2) * (m.life < 1 && Math.floor(t * 10) % 2 ? 0.5 : 1);
        g.fillStyle = '#FFF4E0';
        g.beginPath();
        for (let i = 0; i < 4; i++) g.arc(m.x + 14 + i * (mw - 28) / 3, m.y + 6, 18, 0, TAU);
        g.fill(); g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
        g.fillStyle = '#FFF4E0'; g.fillRect(m.x + 8, m.y, mw - 16, 18);
        g.globalAlpha = 1;
        continue;
      }
      g.fillStyle = '#5B3FB5'; g.fillRect(m.x, m.y + 4, mw, TH);
      g.fillStyle = '#B49BFF'; g.fillRect(m.x, m.y, mw, TH - 4);
      g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.strokeRect(m.x, m.y, mw, TH + 4);
      for (let i = 0; i < m.w; i++) { g.fillStyle = '#FFF4E0'; g.beginPath(); g.arc(m.x + TW / 2 + i * TW, m.y + 7, 3.5, 0, TAU); g.fill(); }
    }
    // láseres activos
    for (const lz of this.lasers) {
      if (lz.t >= lz.warn && lz.t < lz.warn + lz.on) {
        const k = 1 - (lz.t - lz.warn) / lz.on;
        g.fillStyle = rgba('#0D0B14', 0.8 * k); g.fillRect(lz.x - lz.w / 2 - 4, 0, lz.w + 8, H);
        g.fillStyle = rgba('#FF3B5C', k); g.fillRect(lz.x - lz.w / 2, 0, lz.w, H);
        g.fillStyle = rgba('#FFF4E0', k); g.fillRect(lz.x - lz.w * 0.16, 0, lz.w * 0.32, H);
      }
    }
    // jugadores
    for (const p of [0, 1]) {
      const b = this.bodies[p];
      if (b.dead) continue;
      let anim = b.anim;
      if (this.state === 'result') anim = this.roundWinner === p ? 'win' : 'idle';
      const blink = b.inv > 0 && Math.floor(t * 14) % 2 === 0;
      drawCharacter(g, { id: this.players[p].char, x: b.x, y: b.y, s: 0.7, color: this.color(p), anim, t: t + p, facing: b.face, acc: this.players[p].acc, alpha: blink ? 0.4 : 1 });
      if (b.dashCd > 0) {
        g.fillStyle = '#0D0B14'; g.fillRect(b.x - 19, b.y + 6, 38, 8);
        g.fillStyle = this.color(p); g.fillRect(b.x - 17, b.y + 8, 34 * (1 - b.dashCd / 1.1), 4);
      }
      // vidas sobre la cabeza
      for (let i = 0; i < 2; i++) {
        const hx = b.x - 10 + i * 20, hy = b.y - 92;
        g.fillStyle = i < b.lives ? this.color(p) : 'rgba(13,11,20,0.55)';
        g.beginPath(); g.arc(hx - 4, hy, 5, Math.PI, 0); g.arc(hx + 4, hy, 5, Math.PI, 0); g.lineTo(hx, hy + 10); g.closePath(); g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#0D0B14'; g.stroke();
      }
    }
  }

  renderHUD(g) {
    const sub = this.bodies.map((b) => (b.dead ? 'Se cayó' : `${b.lives} ${b.lives === 1 ? 'vida' : 'vidas'} · ganá 2 rondas`));
    this.hudTop(g, {
      scores: this.roundWins, sub,
      center: `RONDA ${this.round}`, centerSub: this.sudden ? '¡MUERTE SÚBITA!' : this.layout.name,
    });
    if (this.state === 'result') {
      const w = this.roundWinner;
      const msg = w >= 0 ? `¡${this.name(w).toUpperCase()} GANA LA RONDA!` : '¡CAYERON LOS DOS!';
      this.callout(g, msg, { y: 330, size: 38, k: this.roundEnd * 3, color: w >= 0 ? this.color(w) : '#FFD23F' });
    }
  }
}

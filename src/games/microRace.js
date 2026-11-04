// JUEGO 02 — MICRO RACE (carreras)
// Carrera vista desde arriba. Aceleración automática, A/D para girar y S para frenar/derrapar.
// Pistas definidas con splines Catmull-Rom; progreso medido sobre la línea central.
import { BaseGame } from './baseGame.js';
import { drawPortrait } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, shade, wrapAngle, choice, mulberry32, fmtTime, quality } from '../core/utils.js';

const TRACKS = {
  oval: {
    name: 'Óvalo Neón',
    pts: [[230, 175], [640, 150], [1050, 175], [1175, 330], [1110, 560], [880, 640], [720, 560], [560, 560], [400, 640], [170, 560], [105, 330]],
    obstacles: [[0.18, -0.4], [0.42, 0.45], [0.7, -0.35], [0.88, 0.3]],
    boosts: [[0.08, 0], [0.55, 0.1]],
    mud: [[0.33, 0.3], [0.78, -0.2]],
  },
  serpent: {
    name: 'Serpentina',
    pts: [[170, 180], [430, 150], [560, 270], [700, 160], [980, 160], [1170, 270], [1110, 410], [920, 440], [1100, 540], [1000, 655], [700, 610], [430, 665], [180, 600], [290, 450], [130, 330]],
    obstacles: [[0.12, 0.35], [0.3, -0.35], [0.5, 0.35], [0.66, -0.3], [0.86, 0.35]],
    boosts: [[0.04, 0], [0.4, 0], [0.74, 0]],
    mud: [[0.22, 0], [0.6, 0.35]],
  },
  bay: {
    name: 'Bahía Horquilla',
    pts: [[230, 165], [1050, 165], [1180, 268], [1050, 370], [660, 370], [500, 410], [470, 470], [500, 530], [660, 570], [1060, 570], [1175, 630], [1050, 690], [230, 690], [110, 570], [220, 445], [140, 330], [130, 230]],
    obstacles: [[0.15, 0.35], [0.27, -0.4], [0.47, 0.35], [0.6, -0.35], [0.75, 0.35], [0.9, -0.3]],
    boosts: [[0.07, 0], [0.43, 0], [0.68, 0]],
    mud: [[0.36, 0.25], [0.84, 0]],
  },
};
const HALF = 44; // media anchura de la pista
const WALL = HALF + 40;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}
function buildTrack(points, step = 7) {
  const raw = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    for (let k = 0; k < 40; k++) raw.push(catmull(p0, p1, p2, p3, k / 40));
  }
  // remuestreo uniforme por longitud de arco
  const out = [raw[0]];
  let acc = 0;
  for (let i = 1; i <= raw.length; i++) {
    const a = raw[i - 1], b = raw[i % raw.length];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let start = 0;
    while (acc + seg - start >= step) {
      const need = step - acc;
      start += need;
      const k = start / Math.hypot(b[0] - a[0], b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      acc = 0;
    }
    acc += seg - start;
  }
  if (Math.hypot(out[out.length - 1][0] - out[0][0], out[out.length - 1][1] - out[0][1]) < step * 0.5) out.pop();
  return out.map((p, i) => {
    const nx = out[(i + 1) % out.length], pv = out[(i - 1 + out.length) % out.length];
    const ang = Math.atan2(nx[1] - pv[1], nx[0] - pv[0]);
    return { x: p[0], y: p[1], ang, nx: -Math.sin(ang), ny: Math.cos(ang) };
  });
}

export default class MicroRace extends BaseGame {
  static meta = {
    id: 'race', num: 2, name: 'MICRO RACE', short: 'RACE', category: 'Carreras', color: '#25CFE6',
    tagline: 'Pequeños autos, grandes rivalidades.',
    description: 'Los autos aceleran solos: vos girás. Frená antes de las curvas cerradas para derrapar, pisá las flechas para turbo y esquivá conos, barro y a tu rival. Salirte de la pista te frena.',
    goal: 'Completá las vueltas antes que tu rival.',
    controls: [{ actions: ['left', 'right'], label: 'Girar' }, { actions: ['down'], label: 'Frenar / derrapar' }],
    events: ['speed', 'obstacles', 'mirror', 'invert'],
    options: [
      { key: 'track', label: 'Pista', choices: [['random', 'Azar'], ['oval', 'Óvalo'], ['serpent', 'Serpentina'], ['bay', 'Bahía']], def: 'random' },
      { key: 'laps', label: 'Vueltas', choices: [[2, '2'], [3, '3'], [4, '4']], def: 3 },
    ],
    record: { label: 'Mejor vuelta', better: 'lower', format: (v) => `${v.toFixed(2)} s` },
    drawIcon(g, t) {
      g.strokeStyle = '#2A3566'; g.lineWidth = 34; g.lineCap = 'round';
      g.beginPath(); g.ellipse(100, 100, 66, 46, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(37,207,230,0.7)'; g.lineWidth = 2; g.setLineDash([8, 8]);
      g.beginPath(); g.ellipse(100, 100, 66, 46, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      const car = (a, col) => {
        const x = 100 + Math.cos(a) * 66, y = 100 + Math.sin(a) * 46;
        g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
        g.fillStyle = col; roundRect(g, -14, -8, 28, 16, 5); g.fill();
        g.fillStyle = '#0B1020'; g.fillRect(2, -6, 6, 12);
        g.restore();
      };
      car(t * 1.6, '#3985FF');
      car(t * 1.6 - 0.5, '#FF654F');
    },
  };

  init() {
    let tid = this.options.track ?? 'random';
    if (!TRACKS[tid]) tid = choice(Object.keys(TRACKS));
    this.trackId = tid;
    const def = TRACKS[tid];
    this.track = this.fitTrack(buildTrack(def.pts));
    this.N = this.track.length;
    this.laps = this.options.laps ?? 3;
    this.maxSpeed = 300 + this.diff * 70;
    const sample = (f, off) => {
      const s = this.track[Math.floor(f * this.N) % this.N];
      return { x: s.x + s.nx * off * HALF, y: s.y + s.ny * off * HALF, idx: Math.floor(f * this.N) % this.N };
    };
    this.obstacles = def.obstacles.map(([f, o]) => ({ ...sample(f, o), r: 12, kind: 'cone', hit: 0 }));
    const nObs = Math.round(this.diff * 3) + (this.extraObstacles ? 5 : 0);
    const rng = mulberry32(this.trackId.length * 977 + nObs);
    for (let i = 0; i < nObs; i++) {
      const f = 0.1 + rng() * 0.85;
      this.obstacles.push({ ...sample(f, (rng() - 0.5) * 1.3), r: 13, kind: 'barrel', hit: 0 });
    }
    // no obstáculos sobre la línea de salida
    this.obstacles = this.obstacles.filter((o) => o.idx > 30 && o.idx < this.N - 30);
    this.boosts = def.boosts.map(([f, o]) => ({ ...sample(f, o), ang: this.track[Math.floor(f * this.N) % this.N].ang }));
    this.mud = def.mud.slice(0, this.diff >= 0.5 ? 2 : 1).map(([f, o]) => ({ ...sample(f, o), r: 34 }));
    const s0 = this.track[this.N - 10];
    this.cars = [0, 1].map((p) => ({
      x: s0.x + s0.nx * (p ? 20 : -20), y: s0.y + s0.ny * (p ? 20 : -20),
      ang: s0.ang, vx: 0, vy: 0, speed: 0, idx: this.N - 10, prog: -10, lap: 0,
      boost: 0, crashes: 0, spin: 0, lapStart: 0, lapTimes: [], bestLap: null, finished: null, offroad: false, topSpeed: 0, bumpCd: 0,
    }));
    this.skids = [];
    this.raceTime = 0;
    this.limit = this.timed(140);
    this.duration = 0;
    this.bakeTrack();
  }

  // Encaja la pista en el área visible (debajo del HUD) con escala uniforme.
  fitTrack(tr) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of tr) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
    const AX0 = 74, AX1 = W - 74, AY0 = 146, AY1 = H - 58;
    const k = Math.min((AX1 - AX0) / (x1 - x0), (AY1 - AY0) / (y1 - y0), 1.08);
    const ox = (AX0 + AX1) / 2 - ((x0 + x1) / 2) * k, oy = (AY0 + AY1) / 2 - ((y0 + y1) / 2) * k;
    return tr.map((s) => ({ ...s, x: s.x * k + ox, y: s.y * k + oy }));
  }

  bakeTrack() {
    const r = this.app.renderer;
    const px = Math.min(2, r.scale * r.dpr);
    this.bakePx = px;
    const c = document.createElement('canvas');
    c.width = Math.round(W * px);
    c.height = Math.round(H * px);
    const g = c.getContext('2d');
    g.scale(px, px);
    // terreno
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0F2A2E');
    bg.addColorStop(1, '#0B1D22');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const rng = mulberry32(42);
    g.fillStyle = 'rgba(72,213,151,0.08)';
    for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(rng() * W, rng() * H, 2 + rng() * 6, 0, TAU); g.fill(); }
    const path = () => {
      g.beginPath();
      this.track.forEach((s, i) => (i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y)));
      g.closePath();
    };
    g.lineJoin = 'round';
    g.lineCap = 'round';
    // barrera exterior
    path(); g.strokeStyle = 'rgba(155,108,255,0.18)'; g.lineWidth = WALL * 2 + 10; g.stroke();
    path(); g.strokeStyle = '#0D1E24'; g.lineWidth = WALL * 2; g.stroke();
    // pianos (curbs)
    path(); g.strokeStyle = '#F6F7FB'; g.lineWidth = HALF * 2 + 12; g.stroke();
    path(); g.setLineDash([16, 16]); g.strokeStyle = '#FF654F'; g.stroke(); g.setLineDash([]);
    // asfalto
    path(); g.strokeStyle = '#2A3150'; g.lineWidth = HALF * 2; g.stroke();
    path(); g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = HALF * 1.2; g.stroke();
    // línea central
    path(); g.setLineDash([18, 22]); g.strokeStyle = 'rgba(246,247,251,0.28)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    // línea de meta a cuadros
    const s = this.track[0];
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.ang);
    for (let i = -6; i < 6; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#F6F7FB' : '#0B1020';
      g.fillRect(-8 + j * 8, i * (HALF / 6), 8, HALF / 6);
    }
    g.restore();
    // barro
    for (const m of this.mud) {
      g.fillStyle = '#5A4630';
      g.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU, rr = m.r * (0.8 + 0.25 * Math.sin(k * 2.7));
        g.lineTo(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr * 0.8);
      }
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.ellipse(m.x - 8, m.y - 6, 8, 4, 0.3, 0, TAU); g.fill();
    }
    this.baked = c;
  }

  ambient(dt) {
    for (const o of this.obstacles) o.hit = Math.max(0, o.hit - dt * 3);
  }

  nearest(car) {
    let best = car.idx, bd = Infinity;
    for (let k = -35; k <= 35; k++) {
      const i = (car.idx + k + this.N) % this.N;
      const s = this.track[i];
      const d = (s.x - car.x) ** 2 + (s.y - car.y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return [best, Math.sqrt(bd)];
  }

  update(dt) {
    this.raceTime += dt;
    this.ambient(dt);
    for (let p = 0; p < 2; p++) this.updateCar(p, dt);
    this.carCollision();
    // skids
    for (let i = this.skids.length - 1; i >= 0; i--) {
      this.skids[i].a -= dt * 0.25;
      if (this.skids[i].a <= 0) this.skids.splice(i, 1);
    }
    // fin de carrera
    const fin = this.cars.map((c) => c.finished);
    if (fin[0] != null || fin[1] != null || this.raceTime >= this.limit) this.end();
  }

  updateCar(p, dt) {
    const c = this.cars[p];
    const inp = this.inputs[p];
    const steer = inp.axisX();
    const brake = inp.held('down');
    c.boost = Math.max(0, c.boost - dt);
    c.spin = Math.max(0, c.spin - dt);
    c.bumpCd = Math.max(0, c.bumpCd - dt);
    const [idx, dist] = this.nearest(c);
    c.offroad = dist > HALF + 4;
    let inMud = false;
    for (const m of this.mud) if (Math.hypot(m.x - c.x, m.y - c.y) < m.r) inMud = true;
    let target = this.maxSpeed * (c.offroad ? 0.45 : 1) * (inMud ? 0.45 : 1) * (c.boost > 0 ? 1.5 : 1);
    if (c.spin > 0) target *= 0.3;
    if (brake) c.speed = Math.max(40, c.speed - 520 * dt);
    else if (c.speed < target) c.speed = Math.min(target, c.speed + (c.boost > 0 ? 600 : 240) * dt);
    else c.speed = Math.max(target, c.speed - 380 * dt);
    const turn = 3.1 * clamp(c.speed / 140, 0.25, 1) * (brake ? 1.45 : 1);
    if (c.spin > 0) c.ang += 9 * dt;
    else c.ang += steer * turn * dt;
    // agarre: con freno y giro el auto derrapa
    const grip = brake && steer ? 2.6 : c.offroad || inMud ? 4 : 9;
    const tx = Math.cos(c.ang) * c.speed, ty = Math.sin(c.ang) * c.speed;
    const k = 1 - Math.exp(-grip * dt);
    c.vx += (tx - c.vx) * k;
    c.vy += (ty - c.vy) * k;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.topSpeed = Math.max(c.topSpeed, Math.hypot(c.vx, c.vy));
    // derrape: marcas en el asfalto
    const slip = Math.abs(wrapAngle(Math.atan2(c.vy, c.vx) - c.ang));
    if (c.speed > 120 && (slip > 0.25 || brake)) {
      if (this.skids.length < 500) this.skids.push({ x: c.x - Math.cos(c.ang) * 10, y: c.y - Math.sin(c.ang) * 10, a: 0.5 });
      if (Math.random() < 0.3) this.fx.burst(c.x, c.y, 'rgba(200,200,220,0.5)', 1, { speed: 40, gravity: 0, life: 0.5, size: 6 });
    }
    if (c.offroad && c.speed > 80 && Math.random() < 0.4) this.fx.burst(c.x, c.y, '#3E6B4A', 1, { speed: 80, gravity: 0, life: 0.4, size: 4 });
    if (c.boost > 0 && Math.random() < 0.8) this.fx.burst(c.x - Math.cos(c.ang) * 16, c.y - Math.sin(c.ang) * 16, ['#FFC93C', '#FF8E3C'], 1, { angle: c.ang + Math.PI, spread: 0.3, speed: 160, gravity: 0, life: 0.3, size: 5 });
    // muro exterior
    const s = this.track[idx];
    const dx = c.x - s.x, dy = c.y - s.y;
    if (dist > WALL) {
      const nx = dx / dist, ny = dy / dist;
      c.x = s.x + nx * WALL;
      c.y = s.y + ny * WALL;
      const vn = c.vx * nx + c.vy * ny;
      if (vn > 0) { c.vx -= 1.6 * vn * nx; c.vy -= 1.6 * vn * ny; }
      this.crash(c, p, c.x, c.y, 0.55);
    }
    if (c.x < 12 || c.x > W - 12) { c.x = clamp(c.x, 12, W - 12); c.vx *= -0.4; }
    if (c.y < 96 || c.y > H - 10) { c.y = clamp(c.y, 96, H - 10); c.vy *= -0.4; }
    // obstáculos
    for (const o of this.obstacles) {
      const ox = c.x - o.x, oy = c.y - o.y;
      const d = Math.hypot(ox, oy);
      if (d < o.r + 13) {
        const nx = ox / (d || 1), ny = oy / (d || 1);
        c.x = o.x + nx * (o.r + 13);
        c.y = o.y + ny * (o.r + 13);
        c.vx = nx * 120;
        c.vy = ny * 120;
        o.hit = 1;
        this.crash(c, p, o.x, o.y, 0.35, true);
      }
    }
    // turbos
    for (const b of this.boosts) {
      if (Math.hypot(b.x - c.x, b.y - c.y) < 30 && c.boost < 0.9) {
        c.boost = 1.3;
        this.sfx('boost');
        this.fx.ring(b.x, b.y, '#FFC93C', 50);
      }
    }
    // progreso / vueltas
    let d = idx - c.idx;
    if (d < -this.N / 2) d += this.N;
    if (d > this.N / 2) d -= this.N;
    c.prog += d;
    c.idx = idx;
    const lap = Math.floor(c.prog / this.N);
    if (lap > c.lap) {
      c.lap = lap;
      if (lap >= 1) {
        const lt = this.raceTime - c.lapStart;
        c.lapTimes.push(lt);
        c.bestLap = c.bestLap == null ? lt : Math.min(c.bestLap, lt);
        c.lapStart = this.raceTime;
        if (lap >= this.laps) {
          c.finished = this.raceTime;
          this.sfx('fanfare');
          this.fx.confetti(c.x, c.y, 60, 1.2);
        } else {
          this.sfx('coin');
          this.fx.float(c.x, c.y - 30, lap === this.laps - 1 ? '¡ÚLTIMA VUELTA!' : `VUELTA ${lap + 1}`, this.color(p), 22);
        }
      } else c.lapStart = this.raceTime;
    }
  }

  crash(c, p, x, y, keep, spin = false) {
    if (c.bumpCd > 0) return;
    c.bumpCd = 0.5;
    c.crashes++;
    c.speed *= keep;
    if (spin && c.speed > 60) c.spin = 0.35;
    this.sfx('crash');
    this.fx.shake(5);
    this.fx.burst(x, y, ['#FFC93C', '#F6F7FB', this.color(p)], 14, { speed: 260, gravity: 0, kind: 'spark', life: 0.4 });
  }

  carCollision() {
    const [a, b] = this.cars;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 26 && d > 0) {
      const nx = dx / d, ny = dy / d, push = (26 - d) / 2;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        a.vx += rel * nx * 0.8; a.vy += rel * ny * 0.8;
        b.vx -= rel * nx * 0.8; b.vy -= rel * ny * 0.8;
        if (Math.abs(rel) > 60) {
          this.crash(a, 0, (a.x + b.x) / 2, (a.y + b.y) / 2, 0.8);
          this.crash(b, 1, (a.x + b.x) / 2, (a.y + b.y) / 2, 0.8);
        }
      }
    }
  }

  end() {
    const [a, b] = this.cars;
    let winner;
    if (a.finished != null || b.finished != null) {
      if (a.finished != null && b.finished != null) winner = a.finished === b.finished ? -1 : a.finished < b.finished ? 0 : 1;
      else winner = a.finished != null ? 0 : 1;
    } else winner = BaseGame.decide(a.prog, b.prog);
    const lapsDone = this.cars.map((c) => Math.max(0, Math.min(this.laps, c.lap)));
    const fmt = (v) => (v == null ? '—' : `${v.toFixed(2)} s`);
    this.finish({
      winner,
      scores: lapsDone,
      display: this.cars.map((c, p) => (c.finished != null ? fmtTime(c.finished) + (p === winner ? '' : '') : `${lapsDone[p]}/${this.laps}`)),
      scoreLabel: winner >= 0 && this.cars[winner].finished != null ? 'Tiempo / vueltas' : 'Vueltas',
      banner: winner >= 0 && this.cars[winner].finished != null ? '¡META!' : '¡TIEMPO!',
      stats: [
        { label: 'Mejor vuelta', values: this.cars.map((c) => fmt(c.bestLap)), raw: this.cars.map((c) => c.bestLap ?? 999), better: 'low' },
        { label: 'Choques', values: this.cars.map((c) => String(c.crashes)), raw: this.cars.map((c) => c.crashes), better: 'low' },
        { label: 'Vel. máxima', values: this.cars.map((c) => `${Math.round(c.topSpeed / 3)} km/h`), raw: this.cars.map((c) => c.topSpeed), better: 'high' },
      ],
      records: this.cars.map((c) => c.bestLap),
      flags: this.cars.map((c) => ({ crashes: c.crashes })),
      margin: null,
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    if (this.baked) g.drawImage(this.baked, 0, 0, W, H);
    const t = this.realTime;
    for (const s of this.skids) {
      g.fillStyle = `rgba(10,12,20,${s.a})`;
      g.fillRect(s.x - 2, s.y - 2, 4, 4);
    }
    for (const b of this.boosts) {
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.ang);
      const pulse = 0.6 + Math.sin(t * 8) * 0.4;
      g.fillStyle = rgba('#FFC93C', 0.25);
      roundRect(g, -26, -26, 52, 52, 10); g.fill();
      g.strokeStyle = rgba('#FFC93C', pulse);
      g.lineWidth = 5; g.lineJoin = 'round';
      for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-14 + i * 14, -14); g.lineTo(0 + i * 14, 0); g.lineTo(-14 + i * 14, 14); g.stroke(); }
      g.restore();
    }
    for (const o of this.obstacles) {
      g.save();
      g.translate(o.x, o.y + o.hit * -3);
      if (o.kind === 'cone') {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(3, 4, 13, 9, 0, 0, TAU); g.fill();
        g.fillStyle = '#FF8E3C'; g.beginPath(); g.arc(0, 0, 12, 0, TAU); g.fill();
        g.fillStyle = '#F6F7FB'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
        g.fillStyle = '#FF8E3C'; g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill();
      } else {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(3, 4, 14, 10, 0, 0, TAU); g.fill();
        g.fillStyle = '#9B6CFF'; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill();
        g.strokeStyle = '#D9C8FF'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.stroke();
      }
      g.restore();
    }
    // autos (el que va atrás se dibuja primero)
    const order = this.cars[0].prog < this.cars[1].prog ? [0, 1] : [1, 0];
    for (const p of order) this.drawCar(g, p, t);
  }

  drawCar(g, p, t) {
    const c = this.cars[p];
    const col = this.color(p);
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.ang);
    if (quality.glow && c.boost > 0) { g.shadowColor = '#FFC93C'; g.shadowBlur = 20; }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(g, -17, -10, 38, 24, 7); g.fill();
    g.shadowBlur = 0;
    // ruedas
    g.fillStyle = '#10131F';
    for (const [wx, wy] of [[-11, -12], [-11, 8], [9, -12], [9, 8]]) { roundRect(g, wx - 5, wy, 10, 4, 2); g.fill(); }
    g.fillStyle = col;
    roundRect(g, -18, -10, 36, 20, 7); g.fill();
    g.fillStyle = shade(col, -0.3);
    roundRect(g, -18, -10, 8, 20, 4); g.fill();
    g.fillStyle = shade(col, 0.35);
    roundRect(g, 10, -8, 7, 16, 3); g.fill();
    g.fillStyle = '#F6F7FB';
    g.fillRect(-2, -10, 3, 20);
    g.restore();
    // piloto
    drawPortrait(g, c.x, c.y, 9, this.players[p], { t: t + p, ring: 2 });
  }

  renderHUD(g) {
    const pos = this.cars[0].prog >= this.cars[1].prog ? [1, 2] : [2, 1];
    this.hudTop(g, {
      scores: pos.map((x) => `${x}º`),
      sub: this.cars.map((c) => `Vuelta ${Math.min(this.laps, c.lap + 1)}/${this.laps}`),
      timer: null,
      center: fmtTime(this.raceTime) + '.' + String(Math.floor((this.raceTime % 1) * 10)),
      centerSub: TRACKS[this.trackId].name,
      centerSize: 24,
    });
    if (this.raceTime > this.limit - 15 && this.raceTime < this.limit) {
      text(g, `Límite en ${Math.ceil(this.limit - this.raceTime)} s`, W / 2, 104, { size: 16, body: true, color: '#FF8A78' });
    }
  }
}

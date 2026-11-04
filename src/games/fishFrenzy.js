// JUEGO 11 — FISH FRENZY (coordinación)
// Cada jugador pesca en su propia zona con exactamente la misma secuencia de peces (justo).
// Mové el bote, bajá el anzuelo, enganchá con ACCIÓN y recogé manteniendo ACCIÓN sin que se
// corte la línea (tensión). Basura resta puntos (podés soltarla) y las medusas paralizan.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, lerp, text, panel, rgba, roundRect, glowCircle, quality, shade, mulberry32, newSeed, ease } from '../core/utils.js';

const SURF = 236, BOTTOM = 700, HALF = W / 2;
const KINDS = {
  sardine: { name: 'Sardina', pts: 10, speed: 170, size: 16, color: '#9FC7FF', strength: 0.25, depth: [270, 420], weight: 30 },
  clown: { name: 'Payaso', pts: 20, speed: 120, size: 20, color: '#FF8E3C', strength: 0.4, depth: [320, 560], weight: 24 },
  puffer: { name: 'Globo', pts: 30, speed: 70, size: 24, color: '#FFE08A', strength: 0.55, depth: [380, 620], weight: 14 },
  sword: { name: 'Espada', pts: 50, speed: 210, size: 30, color: '#7C8CFF', strength: 0.85, depth: [520, 670], weight: 8 },
  golden: { name: 'Dorado legendario', pts: 100, speed: 290, size: 22, color: '#FFC93C', strength: 1.0, depth: [560, 670], weight: 1.6 },
  boot: { name: 'Bota', pts: -15, speed: 40, size: 20, color: '#6B4E3A', junk: true, depth: [300, 660], weight: 9 },
  can: { name: 'Lata', pts: -10, speed: 50, size: 14, color: '#9AA5BF', junk: true, depth: [280, 640], weight: 9 },
  jelly: { name: 'Medusa', pts: 0, speed: 45, size: 22, color: '#FF7AC6', sting: true, depth: [300, 620], weight: 8 },
};

export default class FishFrenzy extends BaseGame {
  static meta = {
    id: 'fish', num: 11, name: 'FISH FRENZY', short: 'FISH', category: 'Coordinación', color: '#25CFE6',
    tagline: 'Paciencia de pescador, reflejos de gato.',
    description: 'Mové el bote y la profundidad del anzuelo. Cuando un pez pase por el anzuelo, pulsá ACCIÓN para engancharlo y después MANTENÉ ACCIÓN para recoger: si la tensión llega al rojo, la línea se corta. Botas y latas restan puntos (ACCIÓN 2 suelta la línea) y las medusas te paralizan. ¿Te animás con el dorado legendario?',
    goal: 'Sumá más puntos pescando antes de que termine el tiempo.',
    controls: [
      { actions: ['left', 'right'], label: 'Mover bote' },
      { actions: ['up', 'down'], label: 'Subir / bajar anzuelo' },
      { actions: ['a'], label: 'Enganchar · mantener para recoger' },
      { actions: ['b'], label: 'Soltar la línea' },
    ],
    events: ['speed', 'short', 'double', 'obstacles', 'invert'],
    options: [{ key: 'time', label: 'Tiempo', choices: [[45, '45 s'], [60, '60 s'], [90, '90 s']], def: 60 }],
    record: { label: 'Puntos en una partida', better: 'higher', format: (v) => `${v} pts` },
    drawIcon(g, t) {
      g.fillStyle = '#0E3B5C'; roundRect(g, 10, 70, 180, 120, 18); g.fill();
      g.strokeStyle = '#7CF7FF'; g.lineWidth = 3; g.beginPath();
      for (let x = 10; x <= 190; x += 10) g.lineTo(x, 70 + Math.sin(x * 0.1 + t * 3) * 3); g.stroke();
      g.strokeStyle = '#F6F7FB'; g.lineWidth = 2; g.beginPath(); g.moveTo(100, 30); g.lineTo(100, 120 + Math.sin(t * 2) * 10); g.stroke();
      const fx = 60 + ((t * 40) % 100);
      g.fillStyle = '#FF8E3C'; g.beginPath(); g.ellipse(fx, 140, 22, 12, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(fx - 18, 140); g.lineTo(fx - 34, 128); g.lineTo(fx - 34, 152); g.fill();
      g.fillStyle = '#0B1020'; g.beginPath(); g.arc(fx + 10, 137, 3, 0, TAU); g.fill();
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 60);
    this.seed = newSeed();
    this.rngs = [mulberry32(this.seed), mulberry32(this.seed)];
    this.zones = [0, 1].map((p) => ({
      p, ox: p * HALF, boat: HALF / 2, boatV: 0, depth: 320, hooked: null, tension: 0, prog: 0, stun: 0,
      fish: [], spawnT: 0.2, caught: [], snaps: 0, junk: 0, catches: 0, golden: 0, pull: 0, pullT: 0, reeling: false, splash: 0, flying: [],
    }));
    this.score = [0, 0];
    this.weights = Object.entries(KINDS).map(([k, v]) => [k, v.weight * (v.junk || v.sting ? 1 + this.diff * 0.6 + (this.extraObstacles ? 1.2 : 0) : 1)]);
    this.totalW = this.weights.reduce((s, x) => s + x[1], 0);
    this.goldenSpawned = [false, false];
  }

  pickKind(rng) {
    let r = rng() * this.totalW;
    for (const [k, w] of this.weights) { r -= w; if (r <= 0) return k; }
    return 'sardine';
  }

  spawn(z) {
    const rng = this.rngs[z.p];
    let kind = this.pickKind(rng);
    // el dorado aparece como mucho una vez por partida, después de la mitad
    if (kind === 'golden' && (this.goldenSpawned[z.p] || this.time < this.duration * 0.35)) kind = 'sardine';
    if (kind === 'golden') this.goldenSpawned[z.p] = true;
    const K = KINDS[kind];
    const fromLeft = rng() < 0.5;
    const dir = (fromLeft ? 1 : -1) * (z.p === 1 ? -1 : 1); // la zona 2 es espejo de la 1
    const lx = dir > 0 ? -40 : HALF + 40;
    const y = lerp(K.depth[0], K.depth[1], rng());
    z.fish.push({ kind, x: lx, y, baseY: y, dir, speed: K.speed * (0.85 + rng() * 0.3) * (1 + this.diff * 0.25), ph: rng() * TAU, size: K.size, caughtT: 0 });
  }

  ambient(dt) {
    for (const z of this.zones) {
      z.splash = Math.max(0, z.splash - dt * 2);
      for (const f of z.flying) f.t += dt;
      z.flying = z.flying.filter((f) => f.t < 0.9);
    }
  }

  update(dt) {
    this.ambient(dt);
    for (const z of this.zones) this.updateZone(z, dt);
    if (this.time >= this.duration) this.end();
  }

  hookPos(z) {
    return [z.boat + Math.sin(this.realTime * 2 + z.p) * 3, z.depth];
  }

  updateZone(z, dt) {
    const p = z.p;
    const inp = this.inputs[p];
    z.stun = Math.max(0, z.stun - dt);
    // aparición de peces (misma secuencia para ambos)
    z.spawnT -= dt;
    if (z.spawnT <= 0) {
      this.spawn(z);
      z.spawnT = 0.8 + this.rngs[p]() * 0.9 - this.diff * 0.2;
    }
    // bote y anzuelo
    const ax = z.hooked ? 0 : inp.axisX();
    z.boatV += (ax * 260 - z.boatV) * Math.min(1, dt * 8);
    z.boat = clamp(z.boat + z.boatV * dt, 50, HALF - 50);
    if (!z.hooked && z.stun <= 0) {
      const ay = inp.axisY();
      z.depth = clamp(z.depth + ay * 280 * dt, SURF + 30, BOTTOM - 20);
    }
    const [hx, hy] = this.hookPos(z);
    // peces
    for (const f of z.fish) {
      if (f === z.hooked) continue;
      f.ph += dt * 3;
      f.x += f.dir * f.speed * dt;
      f.y = f.baseY + Math.sin(f.ph) * (f.kind === 'jelly' ? 14 : 8);
      // medusa: pica al anzuelo libre
      if (KINDS[f.kind].sting && !z.hooked && z.stun <= 0 && Math.hypot(f.x - hx, f.y - hy) < f.size + 8) {
        z.stun = 1.3;
        this.sfx('zap');
        this.fx.burst(z.ox + hx, hy, ['#FF7AC6', '#fff'], 16, { speed: 200, gravity: 0, kind: 'spark' });
        this.fx.float(z.ox + hx, hy - 30, '¡PICADURA!', '#FF7AC6', 22);
      }
    }
    z.fish = z.fish.filter((f) => f === z.hooked || (f.x > -80 && f.x < HALF + 80));
    // enganchar
    if (!z.hooked && z.stun <= 0 && inp.pressed('a')) {
      let best = null, bd = Infinity;
      for (const f of z.fish) {
        if (KINDS[f.kind].sting) continue;
        const d = Math.hypot(f.x - hx, f.y - hy);
        if (d < f.size + 16 && d < bd) { bd = d; best = f; }
      }
      if (best) {
        z.hooked = best;
        z.prog = 0;
        z.tension = 0.15;
        z.pull = 0;
        z.pullT = 0.5;
        this.sfx('splash');
        this.fx.burst(z.ox + hx, hy, ['#BFE9FF', '#fff'], 10, { speed: 160, gravity: 0 });
      } else this.sfx('tap');
    }
    // soltar la línea
    if (z.hooked && inp.pressed('b')) {
      z.hooked.dir *= -1;
      z.hooked = null;
      z.tension = 0;
      this.sfx('back');
    }
    // recoger
    if (z.hooked) {
      const f = z.hooked;
      const K = KINDS[f.kind];
      z.reeling = inp.held('a');
      if (K.junk) {
        // la basura sube sola si recogés, sin pelea
        if (z.reeling) z.prog += dt * 0.9;
      } else {
        // tirones del pez
        z.pullT -= dt;
        if (z.pullT <= 0) {
          z.pull = z.pull > 0 ? 0 : K.strength;
          z.pullT = z.pull > 0 ? 0.35 + Math.random() * 0.5 : 0.5 + Math.random() * 0.9 - K.strength * 0.3;
        }
        if (z.reeling) {
          z.prog += dt * (0.55 - K.strength * 0.25) * (z.pull > 0 ? 0.4 : 1);
          z.tension += dt * (0.25 + z.pull * 1.25 + this.diff * 0.1);
          if (Math.random() < 0.5) this.sfx('reel', { gap: 70 });
        } else {
          z.tension -= dt * 0.9;
          z.prog -= dt * 0.12 * K.strength;
        }
        z.tension = clamp(z.tension, 0, 1.2);
        z.prog = Math.max(0, z.prog);
        if (z.tension >= 1) {
          // ¡se cortó la línea!
          z.snaps++;
          this.sfx('snap');
          this.fx.float(z.ox + z.boat, SURF - 60, '¡SE CORTÓ!', '#FF654F', 26);
          f.dir *= -1;
          f.speed *= 1.6;
          z.hooked = null;
          z.tension = 0;
          z.depth = Math.max(SURF + 30, z.depth - 40);
          return;
        }
      }
      // el pez se mueve con el anzuelo, que sube según el progreso
      const startY = f.baseY;
      z.depth = lerp(startY, SURF - 6, clamp(z.prog, 0, 1));
      f.x = z.boat + Math.sin(this.realTime * 14) * (K.junk ? 2 : 10 * (1 + z.pull));
      f.y = z.depth + 6;
      if (z.prog >= 1) this.land(z, f);
    } else z.tension = Math.max(0, z.tension - dt);
  }

  land(z, f) {
    const p = z.p;
    const K = KINDS[f.kind];
    const pts = K.pts * (K.pts > 0 ? this.scoreMul() : 1);
    this.score[p] += pts;
    z.fish = z.fish.filter((x) => x !== f);
    z.hooked = null;
    z.tension = 0;
    z.depth = SURF + 60;
    z.splash = 1;
    z.flying.push({ kind: f.kind, x: z.boat, t: 0 });
    if (K.junk) {
      z.junk++;
      this.sfx('bad');
      this.fx.float(z.ox + z.boat, SURF - 80, `${pts} ${K.name}`, '#FF8A78', 26);
    } else {
      z.catches++;
      z.caught.push(f.kind);
      if (f.kind === 'golden') {
        z.golden++;
        this.sfx('fanfare');
        this.fx.confetti(z.ox + z.boat, SURF - 40, 70, 1.0);
        this.fx.flash('#FFC93C', 0.3);
      } else this.sfx('score', { pitch: K.pts >= 50 ? 1.25 : 1 });
      this.fx.burst(z.ox + z.boat, SURF, ['#BFE9FF', '#fff', K.color], 24, { angle: -Math.PI / 2, spread: 0.9, speed: 380 });
      this.fx.float(z.ox + z.boat, SURF - 90, `+${pts} ${K.name.toUpperCase()}`, this.color(p), 26);
    }
  }

  end() {
    const [a, b] = this.score;
    const Z = this.zones;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Puntos',
      stats: [
        { label: 'Peces', values: Z.map((z) => String(z.catches)), raw: Z.map((z) => z.catches), better: 'high' },
        { label: 'Mejor pieza', values: Z.map((z) => (z.caught.length ? KINDS[z.caught.reduce((m, k) => (KINDS[k].pts > KINDS[m].pts ? k : m))].name : '—')) },
        { label: 'Líneas cortadas', values: Z.map((z) => String(z.snaps)), raw: Z.map((z) => z.snaps), better: 'low' },
        { label: 'Basura', values: Z.map((z) => String(z.junk)), raw: Z.map((z) => z.junk), better: 'low' },
      ],
      records: [a, b],
      flags: Z.map((z) => ({ golden: z.golden })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    for (const z of this.zones) {
      g.save();
      g.beginPath();
      g.rect(z.ox, 0, HALF, H);
      g.clip();
      g.translate(z.ox, 0);
      this.drawZone(g, z, t);
      g.restore();
    }
    // separador
    g.fillStyle = '#0B1020';
    g.fillRect(HALF - 4, 90, 8, H);
    g.fillStyle = 'rgba(155,108,255,0.6)';
    g.fillRect(HALF - 1, 90, 2, H);
  }

  drawZone(g, z, t) {
    const col = this.color(z.p);
    // cielo
    const sky = g.createLinearGradient(0, 90, 0, SURF);
    sky.addColorStop(0, '#2A2060');
    sky.addColorStop(1, '#FF8E7A');
    g.fillStyle = sky;
    g.fillRect(0, 90, HALF, SURF - 90);
    glowCircle(g, HALF * 0.75, SURF - 10, 90, '#FFC93C', 0.8);
    g.fillStyle = '#FFD27A';
    g.beginPath(); g.arc(HALF * 0.75, SURF - 4, 36, Math.PI, 0); g.fill();
    // agua
    const wat = g.createLinearGradient(0, SURF, 0, H);
    wat.addColorStop(0, '#1E6E9A');
    wat.addColorStop(0.5, '#124C74');
    wat.addColorStop(1, '#0A2742');
    g.fillStyle = wat;
    g.fillRect(0, SURF, HALF, H - SURF);
    // rayos de luz
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * 170 + t * 12) % (HALF + 200)) - 100;
      g.beginPath(); g.moveTo(x, SURF); g.lineTo(x + 50, SURF); g.lineTo(x + 140, H); g.lineTo(x + 60, H); g.fill();
    }
    // fondo: arena y algas
    g.fillStyle = '#C9A46A';
    g.beginPath(); g.moveTo(0, H); g.lineTo(0, BOTTOM); for (let x = 0; x <= HALF; x += 40) g.lineTo(x, BOTTOM + Math.sin(x * 0.05) * 6); g.lineTo(HALF, H); g.fill();
    g.strokeStyle = '#2E9E6A';
    g.lineWidth = 6;
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * 105;
      g.beginPath(); g.moveTo(x, BOTTOM + 4);
      for (let k = 1; k <= 5; k++) g.lineTo(x + Math.sin(t * 1.5 + k + i) * 8, BOTTOM - k * 16);
      g.stroke();
    }
    // peces
    for (const f of z.fish) this.drawFish(g, f, t);
    // línea y anzuelo
    const [hx, hy] = this.hookPos(z);
    const tipX = z.boat + 46, tipY = SURF - 70;
    g.strokeStyle = z.tension > 0.75 ? '#FF654F' : 'rgba(246,247,251,0.85)';
    g.lineWidth = z.tension > 0.75 ? 2.5 : 1.6;
    g.beginPath(); g.moveTo(tipX, tipY); g.quadraticCurveTo(hx + 20, SURF - 10 + (z.hooked ? 0 : 30), hx, hy); g.stroke();
    g.strokeStyle = z.stun > 0 ? '#FF7AC6' : '#E8EDF7';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(hx, hy - 6); g.lineTo(hx, hy + 6); g.arc(hx - 5, hy + 6, 5, 0, Math.PI * 0.9); g.stroke();
    if (z.stun > 0) { g.fillStyle = rgba('#FF7AC6', 0.4); g.beginPath(); g.arc(hx, hy, 18 + Math.sin(t * 30) * 3, 0, TAU); g.fill(); }
    // olas
    g.strokeStyle = 'rgba(191,233,255,0.7)';
    g.lineWidth = 3;
    g.beginPath();
    for (let x = 0; x <= HALF; x += 8) g.lineTo(x, SURF + Math.sin(x * 0.04 + t * 2.5) * 4);
    g.stroke();
    // bote y personaje
    const by = SURF + Math.sin(t * 2.2 + z.p) * 3;
    drawCharacter(g, { id: this.players[z.p].char, x: z.boat - 6, y: by - 16, s: 0.62, color: col, anim: z.hooked ? 'attack' : z.flying.length ? 'win' : 'idle', t: t + z.p, facing: 1, acc: this.players[z.p].acc, shadow: false });
    g.fillStyle = shade(col, -0.25);
    g.beginPath(); g.moveTo(z.boat - 60, by - 20); g.lineTo(z.boat + 60, by - 20); g.lineTo(z.boat + 42, by + 8); g.lineTo(z.boat - 42, by + 8); g.closePath(); g.fill();
    g.fillStyle = shade(col, 0.2);
    g.fillRect(z.boat - 60, by - 22, 120, 6);
    g.strokeStyle = '#8A5A33';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(z.boat + 10, by - 30); g.lineTo(tipX, tipY); g.stroke();
    if (z.splash > 0) { g.strokeStyle = rgba('#BFE9FF', z.splash); g.lineWidth = 3; g.beginPath(); g.ellipse(z.boat, SURF, 80 * (1.2 - z.splash), 10, 0, 0, TAU); g.stroke(); }
    // peces voladores (captura)
    for (const fl of z.flying) {
      const k = fl.t / 0.9;
      const x = lerp(fl.x, fl.x - 30, k), y = SURF - Math.sin(k * Math.PI) * 120;
      this.drawFish(g, { kind: fl.kind, x, y, dir: 1, ph: fl.t * 20, size: KINDS[fl.kind].size }, t);
    }
    // medidor de tensión / progreso
    if (z.hooked && !KINDS[z.hooked.kind].junk) {
      const mx = z.boat < HALF / 2 ? z.boat + 90 : z.boat - 110;
      panel(g, mx, 110, 22, 110, { r: 11, fill: 'rgba(11,16,32,0.85)', stroke: 'rgba(246,247,251,0.3)' });
      const tk = clamp(z.tension, 0, 1);
      g.fillStyle = tk > 0.75 ? '#FF654F' : tk > 0.45 ? '#FFC93C' : '#48D597';
      roundRect(g, mx + 4, 114 + 102 * (1 - tk), 14, 102 * tk, 7); g.fill();
      text(g, 'TENSIÓN', mx + 11, 232, { size: 10, body: true, weight: 800, color: tk > 0.75 ? '#FF8A78' : 'rgba(246,247,251,0.7)' });
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.lineWidth = 6;
      g.beginPath(); g.arc(z.boat, by - 120, 20, 0, TAU); g.stroke();
      g.strokeStyle = col;
      g.beginPath(); g.arc(z.boat, by - 120, 20, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(z.prog, 0, 1)); g.stroke();
      if (z.pull > 0) text(g, '¡TIRA!', z.boat, by - 154, { size: 16, color: '#FF8A78' });
    } else if (z.hooked) {
      text(g, 'Basura: ACCIÓN 2 para soltar', z.boat, 120, { size: 14, body: true, weight: 700, color: '#FFB3A7' });
    }
  }

  drawFish(g, f, t) {
    const K = KINDS[f.kind];
    g.save();
    g.translate(f.x, f.y);
    g.scale(f.dir >= 0 ? 1 : -1, 1);
    const s = f.size;
    if (f.kind === 'boot') {
      g.fillStyle = K.color;
      roundRect(g, -s * 0.6, -s, s * 0.7, s * 1.4, 4); g.fill();
      roundRect(g, -s * 0.6, s * 0.1, s * 1.3, s * 0.5, 6); g.fill();
      g.fillStyle = '#3A2A1E'; g.fillRect(-s * 0.6, s * 0.5, s * 1.3, 4);
    } else if (f.kind === 'can') {
      g.rotate(0.6 + Math.sin(f.ph) * 0.2);
      g.fillStyle = K.color;
      roundRect(g, -s * 0.5, -s, s, s * 2, 3); g.fill();
      g.fillStyle = '#FF654F'; g.fillRect(-s * 0.5, -s * 0.3, s, s * 0.6);
    } else if (f.kind === 'jelly') {
      glowCircle(g, 0, 0, s * 2, '#FF7AC6', 0.5);
      g.fillStyle = rgba(K.color, 0.85);
      g.beginPath(); g.arc(0, 0, s, Math.PI, 0); g.quadraticCurveTo(0, s * 0.3, -s, 0); g.fill();
      g.strokeStyle = rgba(K.color, 0.7); g.lineWidth = 2.5;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * s * 0.35, 2); g.quadraticCurveTo(i * s * 0.35 + Math.sin(t * 5 + i) * 6, s, i * s * 0.35, s * 1.6); g.stroke(); }
    } else {
      if (f.kind === 'golden') glowCircle(g, 0, 0, s * 3, '#FFC93C', 0.9);
      const wag = Math.sin(f.ph * 3) * 0.3;
      g.fillStyle = shade(K.color, -0.2);
      g.save(); g.translate(-s * 0.9, 0); g.rotate(wag);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-s * 0.8, -s * 0.6); g.lineTo(-s * 0.8, s * 0.6); g.fill();
      g.restore();
      g.fillStyle = K.color;
      const puff = f.kind === 'puffer' ? 1 + Math.max(0, Math.sin(f.ph)) * 0.25 : 1;
      g.beginPath(); g.ellipse(0, 0, s * (f.kind === 'sword' ? 1.3 : 1), s * 0.6 * puff, 0, 0, TAU); g.fill();
      if (f.kind === 'sword') { g.strokeStyle = shade(K.color, 0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(s * 1.2, -2); g.lineTo(s * 2.1, -4); g.stroke(); }
      if (f.kind === 'clown') { g.fillStyle = '#fff'; g.fillRect(-s * 0.2, -s * 0.55, s * 0.22, s * 1.1); g.fillRect(s * 0.4, -s * 0.45, s * 0.18, s * 0.9); }
      if (f.kind === 'puffer') { g.strokeStyle = shade(K.color, -0.3); g.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.55 * puff); g.lineTo(Math.cos(a) * s * 1.15, Math.sin(a) * s * 0.75 * puff); g.stroke(); } }
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(-s * 0.1, -s * 0.22, s * 0.5, s * 0.15, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 0.55, -s * 0.12, s * 0.18, 0, TAU); g.fill();
      g.fillStyle = '#0B1020'; g.beginPath(); g.arc(s * 0.6, -s * 0.12, s * 0.09, 0, TAU); g.fill();
    }
    g.restore();
  }

  renderHUD(g) {
    this.hudTop(g, { scores: this.score, sub: this.zones.map((z) => `${z.catches} peces${z.golden ? ' · ¡DORADO!' : ''}`), timer: this.remaining });
    this.hudTimeBar(g);
  }
}

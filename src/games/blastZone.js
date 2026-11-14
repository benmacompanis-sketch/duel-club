// JUEGO 16 — BLAST ZONE (supervivencia)
// Arena vista desde arriba con peligros cada vez más intensos: zonas de energía que se marcan antes de
// estallar, barridos de láser, orbes que rebotan y un anillo seguro que se achica. Cada jugador tiene
// 3 escudos. ACCIÓN 1 = esquive (breve invulnerabilidad), ACCIÓN 2 = empujón al rival.
// Gana el último con escudos o, si ambos aguantan, el que tenga más escudos al final.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, choice } from '../core/utils.js';

const AX = 90, AY = 112, AW = W - 180, AH = H - 140;
const CX = AX + AW / 2, CY = AY + AH / 2;
const PHASES = [
  { name: 'ZONAS DE ENERGÍA', color: '#FF4D6D', bg: '#1A1030' },
  { name: '¡LÁSERES!', color: '#25CFE6', bg: '#0F1A33' },
  { name: '¡ORBES REBOTANDO!', color: '#FFC93C', bg: '#1F1726' },
  { name: '¡EL ANILLO SE CIERRA!', color: '#9B6CFF', bg: '#160F33' },
];

export default class BlastZone extends BaseGame {
  static meta = {
    id: 'blast', num: 16, name: 'BLAST ZONE', short: 'BLAST', category: 'Supervivencia', color: '#FF4D6D', isNew: true,
    tagline: 'Esquivá todo lo que se mueve. Y lo que está por estallar, también.',
    description: 'Las zonas marcadas estallan en energía después del aviso: salí rápido. Cada 15 segundos la arena cambia y suma peligros (láseres, orbes, anillo que se cierra). Tenés 3 escudos. ACCIÓN 1 = esquive con invulnerabilidad. ACCIÓN 2 = empujón al rival si está cerca.',
    goal: 'Ser el último con escudos, o tener más escudos al terminar.',
    controls: [{ actions: ['up', 'down', 'left', 'right'], label: 'Moverse' }, { actions: ['a'], label: 'Esquive' }, { actions: ['b'], label: 'Empujón' }],
    events: ['speed', 'short', 'mirror', 'invert', 'obstacles'],
    options: [{ key: 'time', label: 'Duración', choices: [[60, '60 s'], [75, '75 s'], [90, '90 s']], def: 75 }],
    record: { label: 'Segundos con escudos', better: 'higher', format: (v) => `${Math.round(v)} s` },
    drawIcon(g, t) {
      g.fillStyle = '#1A1030'; g.fillRect(10, 10, 180, 180);
      const k = (t * 0.8) % 1;
      g.strokeStyle = `rgba(255,77,109,${1 - k})`; g.lineWidth = 6;
      g.beginPath(); g.arc(100, 100, 20 + k * 60, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,77,109,0.3)'; g.beginPath(); g.arc(60, 60, 26, 0, TAU); g.fill();
      g.fillStyle = '#25CFE6'; g.fillRect(20, 150 + Math.sin(t * 2) * 10, 160, 5);
      g.fillStyle = '#3985FF'; g.beginPath(); g.arc(140, 70, 12, 0, TAU); g.fill();
      g.fillStyle = '#FF654F'; g.beginPath(); g.arc(70, 130, 12, 0, TAU); g.fill();
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 75);
    this.pl = [0, 1].map((p) => ({
      p, x: CX + (p ? 180 : -180), y: CY, vx: 0, vy: 0, lives: 3, inv: 1.2, dash: 0, dashCd: 0, pushCd: 0, stun: 0, face: p ? -1 : 1,
      hitsTaken: 0, dodges: 0, pushes: 0, alive: true, out: null, near: 0,
    }));
    this.zones = []; // {x,y,r,warn,t}
    this.lasers = []; // {axis,pos,dir,speed,warn,t}
    this.orbs = []; // {x,y,vx,vy,r}
    this.ring = Math.hypot(AW, AH) / 2 + 40;
    this.zoneT = 1.2;
    this.laserT = 4;
    this.phase = 0;
    this.banner = { text: PHASES[0].name, color: PHASES[0].color, t: 2 };
    this.target = 0;
  }

  get rate() {
    return 1 + this.time / 40 + this.diff * 0.3 + (this.extraObstacles ? 0.25 : 0);
  }

  update(dt) {
    if (this.time >= this.duration || this.pl.some((p) => !p.alive)) return this.end();
    const ph = Math.min(3, Math.floor(this.time / 15));
    if (ph !== this.phase) {
      this.phase = ph;
      this.banner = { text: PHASES[ph].name, color: PHASES[ph].color, t: 2 };
      this.sfx('alarm');
      if (ph >= 2) for (let i = 0; i < 2; i++) this.addOrb();
    }
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    for (const P of this.pl) this.updatePlayer(P, dt);
    this.pushCheck();
    // zonas: se apuntan alternadamente a cada jugador (justo para los dos)
    this.zoneT -= dt * this.rate;
    if (this.zoneT <= 0) {
      this.zoneT = rand(1.1, 1.6);
      const P = this.pl[this.target];
      this.target = 1 - this.target;
      const lead = 0.55;
      const x = clamp(P.x + P.vx * lead + rand(-70, 70), AX + 40, AX + AW - 40);
      const y = clamp(P.y + P.vy * lead + rand(-70, 70), AY + 40, AY + AH - 40);
      this.zones.push({ x, y, r: rand(62, 92) + this.phase * 6, warn: Math.max(0.75, 1.25 - this.time / 120), t: 0, boom: false });
      if (this.phase >= 1 && Math.random() < 0.35) {
        // zona espejada para el otro lado de la arena
        this.zones.push({ x: 2 * CX - x, y: 2 * CY - y, r: rand(62, 90), warn: 1.2, t: 0, boom: false });
      }
    }
    for (const z of this.zones) {
      z.t += dt;
      if (!z.boom && z.t >= z.warn) {
        z.boom = true;
        this.sfx('crash', { gap: 40 });
        this.fx.burst(z.x, z.y, ['#FF4D6D', '#FFC93C', '#FFFFFF'], 18, { speed: 260 });
        this.fx.shake(4);
        for (const P of this.pl) if (Math.hypot(P.x - z.x, P.y - z.y) < z.r + 14) this.hit(P, z.x, z.y);
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.warn + 0.35);
    // láseres desde la fase 2
    if (this.phase >= 1) {
      this.laserT -= dt * this.rate;
      if (this.laserT <= 0) {
        this.laserT = rand(3.2, 4.6);
        const horiz = Math.random() < 0.5;
        const dir = Math.random() < 0.5 ? 1 : -1;
        this.lasers.push({ horiz, pos: horiz ? (dir > 0 ? AY : AY + AH) : dir > 0 ? AX : AX + AW, dir, speed: 210 + this.time * 2, warn: 1.1, t: 0, gap: rand(0.25, 0.75) });
      }
    }
    for (const L of this.lasers) {
      L.t += dt;
      if (L.t < L.warn) continue;
      L.pos += L.dir * L.speed * dt;
      for (const P of this.pl) {
        const along = L.horiz ? (P.x - AX) / AW : (P.y - AY) / AH;
        const inGap = Math.abs(along - L.gap) < 0.09;
        const d = L.horiz ? Math.abs(P.y - L.pos) : Math.abs(P.x - L.pos);
        if (d < 14 && !inGap) this.hit(P, P.x, P.y);
      }
    }
    this.lasers = this.lasers.filter((L) => (L.horiz ? L.pos >= AY - 10 && L.pos <= AY + AH + 10 : L.pos >= AX - 10 && L.pos <= AX + AW + 10));
    // orbes
    for (const o of this.orbs) {
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.x < AX + o.r || o.x > AX + AW - o.r) { o.vx *= -1; o.x = clamp(o.x, AX + o.r, AX + AW - o.r); this.sfx('tick'); }
      if (o.y < AY + o.r || o.y > AY + AH - o.r) { o.vy *= -1; o.y = clamp(o.y, AY + o.r, AY + AH - o.r); this.sfx('tick'); }
      for (const P of this.pl) if (Math.hypot(P.x - o.x, P.y - o.y) < o.r + 14) this.hit(P, o.x, o.y);
    }
    // anillo seguro (fase 4)
    if (this.phase >= 3) {
      const minR = 170;
      this.ring = Math.max(minR, this.ring - dt * 22 * this.rate);
      for (const P of this.pl) if (Math.hypot(P.x - CX, P.y - CY) > this.ring) { P.near += dt; if (P.near > 0.6) { P.near = 0; this.hit(P, CX, CY); } } else P.near = 0;
    }
  }
  addOrb() {
    const a = rand(0, TAU);
    this.orbs.push({ x: CX + rand(-200, 200), y: AY + 60, vx: Math.cos(a) * 230, vy: Math.abs(Math.sin(a)) * 230 + 80, r: 18 });
  }
  updatePlayer(P, dt) {
    if (!P.alive) return;
    const inp = this.inputs[P.p];
    P.inv = Math.max(0, P.inv - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.pushCd = Math.max(0, P.pushCd - dt);
    P.dash = Math.max(0, P.dash - dt);
    P.stun = Math.max(0, P.stun - dt);
    let ax = inp.axisX(), ay = inp.axisY();
    const len = Math.hypot(ax, ay) || 1;
    ax /= len; ay /= len;
    if (ax) P.face = Math.sign(ax);
    if (inp.pressed('a') && P.dashCd <= 0 && (ax || ay)) {
      P.dash = 0.22; P.dashCd = 2.4; P.inv = Math.max(P.inv, 0.32); P.dodges++;
      P.vx = ax * 820; P.vy = ay * 820;
      this.sfx('dash');
      this.fx.burst(P.x, P.y, this.color(P.p), 10, { speed: 140 });
    }
    if (inp.pressed('b') && P.pushCd <= 0) P.pushReq = 0.12;
    P.pushReq = Math.max(0, (P.pushReq || 0) - dt);
    const sp = (300 + this.diff * 25) * (P.stun > 0 ? 0.25 : 1);
    if (P.dash <= 0) {
      P.vx += (ax * sp - P.vx) * Math.min(1, dt * 12);
      P.vy += (ay * sp - P.vy) * Math.min(1, dt * 12);
    }
    P.x = clamp(P.x + P.vx * dt, AX + 16, AX + AW - 16);
    P.y = clamp(P.y + P.vy * dt, AY + 16, AY + AH - 16);
  }
  pushCheck() {
    const [a, b] = this.pl;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    for (const P of this.pl) {
      if (!P.pushReq || P.pushCd > 0) continue;
      const O = this.pl[1 - P.p];
      P.pushReq = 0;
      P.pushCd = 1.6;
      this.sfx('whoosh');
      if (d < 90 && O.alive) {
        const nx = (O.x - P.x) / (d || 1), ny = (O.y - P.y) / (d || 1);
        O.vx = nx * 700; O.vy = ny * 700; O.stun = 0.35; O.dash = 0.18;
        P.pushes++;
        this.sfx('hit');
        this.fx.ring((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff', 60, 0.35, 3);
      }
    }
  }
  hit(P, fx, fy) {
    if (!P.alive || P.inv > 0) return;
    if (this.opts.solo && P.p === 1) return; // modo SOLO: el muñeco no participa
    P.lives--;
    P.hitsTaken++;
    P.inv = 1.4;
    const d = Math.hypot(P.x - fx, P.y - fy) || 1;
    P.vx = ((P.x - fx) / d) * 420; P.vy = ((P.y - fy) / d) * 420; P.dash = 0.15;
    this.sfx('hitHeavy');
    this.fx.flash(this.color(P.p), 0.25);
    this.fx.float(P.x, P.y - 40, P.lives > 0 ? `-1 ESCUDO` : '¡SIN ESCUDOS!', '#fff', 22);
    if (P.lives <= 0) {
      P.alive = false;
      P.out = this.time;
      this.fx.burst(P.x, P.y, [this.color(P.p), '#ffffff'], 30, { speed: 260 });
    }
  }
  end() {
    if (this.done) return;
    const lives = this.pl.map((P) => Math.max(0, P.lives));
    const alive = this.pl.map((P) => (P.alive ? Math.min(this.time, this.duration) : P.out));
    const w = lives[0] !== lives[1] ? (lives[0] > lives[1] ? 0 : 1) : alive[0] !== alive[1] ? (alive[0] > alive[1] ? 0 : 1) : -1;
    this.finish({
      winner: w,
      scores: lives,
      display: lives.map((l, i) => (this.pl[i].alive ? `${l} escudos` : `Fuera · ${alive[i].toFixed(1)} s`)),
      scoreLabel: 'Escudos restantes',
      banner: this.pl.some((P) => !P.alive) ? '¡FUERA DE COMBATE!' : '¡SOBREVIVIERON!',
      stats: [
        { label: 'Tiempo con escudos', values: alive.map((v) => `${v.toFixed(1)} s`), raw: alive, better: 'high' },
        { label: 'Golpes recibidos', values: this.pl.map((P) => String(P.hitsTaken)), raw: this.pl.map((P) => P.hitsTaken), better: 'low' },
        { label: 'Esquives', values: this.pl.map((P) => String(P.dodges)) },
        { label: 'Empujones conectados', values: this.pl.map((P) => String(P.pushes)), raw: this.pl.map((P) => P.pushes), better: 'high' },
      ],
      records: alive.map((v) => Math.round(v * 10) / 10),
      flags: this.pl.map((P) => ({ hitsTaken: P.hitsTaken, pushes: P.pushes })),
      margin: Math.abs(lives[0] - lives[1]),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    const ph = PHASES[this.phase];
    this.arenaBG(g, ph.bg, '#0B1020');
    g.fillStyle = 'rgba(255,255,255,0.03)';
    roundRect(g, AX, AY, AW, AH, 20); g.fill();
    this.grid(g, AX, AY, AW, AH, 40, rgba(ph.color, 0.08));
    g.strokeStyle = rgba(ph.color, 0.6); g.lineWidth = 3;
    roundRect(g, AX, AY, AW, AH, 20); g.stroke();
    // anillo seguro
    if (this.phase >= 3) {
      g.save();
      g.beginPath(); g.rect(AX, AY, AW, AH); g.arc(CX, CY, this.ring, 0, TAU, true); g.clip('evenodd');
      g.fillStyle = 'rgba(155,108,255,0.22)'; g.fillRect(AX, AY, AW, AH);
      g.restore();
      g.strokeStyle = '#B49BFF'; g.lineWidth = 4; g.setLineDash([14, 10]);
      g.beginPath(); g.arc(CX, CY, this.ring, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    // zonas
    for (const z of this.zones) {
      if (!z.boom) {
        const k = z.t / z.warn;
        g.fillStyle = `rgba(255,77,109,${0.12 + k * 0.2})`;
        g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.fill();
        g.strokeStyle = `rgba(255,77,109,${0.5 + Math.sin(t * 20) * 0.3})`; g.lineWidth = 3;
        g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,77,109,0.45)';
        g.beginPath(); g.arc(z.x, z.y, z.r * k, 0, TAU); g.fill();
      } else {
        const k = (z.t - z.warn) / 0.35;
        glowCircle(g, z.x, z.y, z.r * (1 + k * 0.3), '#FFC93C', 0.7 * (1 - k));
      }
    }
    // láseres
    for (const L of this.lasers) {
      const warn = L.t < L.warn;
      g.save();
      if (!warn && quality.glow) { g.shadowColor = '#25CFE6'; g.shadowBlur = 18; }
      g.fillStyle = warn ? `rgba(37,207,230,${0.25 + Math.sin(t * 24) * 0.2})` : '#7CF7FF';
      const thick = warn ? 4 : 8;
      if (L.horiz) {
        const gx = AX + L.gap * AW;
        g.fillRect(AX, L.pos - thick / 2, gx - 0.09 * AW - AX, thick);
        g.fillRect(gx + 0.09 * AW, L.pos - thick / 2, AX + AW - gx - 0.09 * AW, thick);
      } else {
        const gy = AY + L.gap * AH;
        g.fillRect(L.pos - thick / 2, AY, thick, gy - 0.09 * AH - AY);
        g.fillRect(L.pos - thick / 2, gy + 0.09 * AH, thick, AY + AH - gy - 0.09 * AH);
      }
      g.restore();
    }
    // orbes
    for (const o of this.orbs) {
      glowCircle(g, o.x, o.y, o.r * 2.4, '#FFC93C', 0.4);
      g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(o.x, o.y, o.r, 0, TAU); g.fill();
      g.fillStyle = '#FF8E3C'; g.beginPath(); g.arc(o.x, o.y, o.r * 0.55, 0, TAU); g.fill();
    }
    // jugadores
    for (const P of this.pl) {
      if (!P.alive) continue;
      const blink = P.inv > 0 && Math.floor(t * 14) % 2 === 0;
      g.strokeStyle = rgba(this.color(P.p), 0.7); g.lineWidth = 3;
      g.beginPath(); g.ellipse(P.x, P.y + 14, 22, 8, 0, 0, TAU); g.stroke();
      // escudos alrededor
      for (let i = 0; i < P.lives; i++) {
        const a = t * 2 + (i * TAU) / 3 + P.p;
        g.fillStyle = this.color(P.p);
        g.beginPath(); g.arc(P.x + Math.cos(a) * 30, P.y - 18 + Math.sin(a) * 12, 4.5, 0, TAU); g.fill();
      }
      drawCharacter(g, { id: this.players[P.p].char, x: P.x, y: P.y + 14, s: 0.5, color: this.color(P.p), anim: P.stun > 0 ? 'dizzy' : P.dash > 0 ? 'jump' : Math.hypot(P.vx, P.vy) > 40 ? 'run' : 'idle', t: t + P.p, facing: P.face, acc: this.players[P.p].acc, alpha: blink ? 0.35 : 1, shadow: false });
    }
    this.vignette(g);
  }
  renderHUD(g) {
    const t = this.realTime;
    this.hudTop(g, { scores: this.pl.map((P) => Math.max(0, P.lives)), timer: this.remaining, sub: this.pl.map((P) => `Esquive ${P.dashCd > 0 ? P.dashCd.toFixed(1) + ' s' : 'LISTO'} · Empujón ${P.pushCd > 0 ? P.pushCd.toFixed(1) + ' s' : 'LISTO'}`) });
    this.hudTimeBar(g, 86);
    if (this.banner) {
      const a = Math.min(1, this.banner.t);
      text(g, this.banner.text, W / 2, H / 2 - 40, { size: 58, color: '#fff', glow: this.banner.color, alpha: a * (0.7 + Math.sin(t * 10) * 0.3), stroke: 'rgba(11,16,32,0.9)', strokeWidth: 10 });
    }
  }
}

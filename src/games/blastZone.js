// JUEGO 16 — BLAST ZONE (supervivencia)
// Arena vista desde arriba con peligros cada vez más intensos: zonas de energía que se marcan antes de
// estallar, barridos de láser, orbes que rebotan y un anillo seguro que se achica. Cada jugador tiene
// 3 escudos. ACCIÓN 1 = esquive (breve invulnerabilidad), ACCIÓN 2 = empujón al rival.
// Gana el último con escudos o, si ambos aguantan, el que tenga más escudos al final.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, choice, cachedLayer, halftone, burst, mix } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

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
    description: 'Las zonas marcadas estallan en energía después del aviso: salí rápido. Cada 15 segundos la arena cambia y suma peligros (láseres, orbes, anillo que se cierra). Tenés 3 escudos y cada tanto aparece uno para agarrar (si estás lleno, te da unos segundos de estrella invencible). ACCIÓN 1 = esquive con invulnerabilidad. ACCIÓN 2 = empujón: mandá a tu rival contra el peligro.',
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
    // 2v2: J1+J3 (azul) contra J2+J4 (rojo); un equipo queda fuera cuando sus dos jugadores se quedan sin escudos
    const POS = this.team ? [[-220, -70], [220, -70], [-140, 90], [140, 90]] : [[-180, 0], [180, 0]];
    this.pl = Array.from({ length: this.np }, (_, p) => ({
      p, x: CX + POS[p][0], y: CY + POS[p][1], vx: 0, vy: 0, lives: 3, inv: 1.2, dash: 0, dashCd: 0, pushCd: 0, stun: 0, face: p % 2 ? -1 : 1,
      hitsTaken: 0, dodges: 0, pushes: 0, alive: true, out: null, near: 0,
    }));
    this.zones = []; // {x,y,r,warn,t}
    this.lasers = []; // {axis,pos,dir,speed,warn,t}
    this.orbs = []; // {x,y,vx,vy,r}
    this.ring = Math.hypot(AW, AH) / 2 + 40;
    this.zoneT = 1.6;
    this.laserT = 4;
    this.pickups = []; // escudos para agarrar {x, y, t}
    this.pickT = 9;
    this.phase = 0;
    this.phaseMsg = { text: PHASES[0].name, color: PHASES[0].color, t: 2 };
    this.target = 0;
  }

  get rate() {
    return 0.85 + this.time / 50 + this.diff * 0.3 + (this.extraObstacles ? 0.25 : 0);
  }

  update(dt) {
    if (this.time >= this.duration || this.teamOut()) return this.end();
    if (this.frozen(dt)) return;
    const ph = Math.min(3, Math.floor(this.time / 15));
    if (ph !== this.phase) {
      this.phase = ph;
      this.phaseMsg = { text: PHASES[ph].name, color: PHASES[ph].color, t: 2 };
      this.sfx('alarm');
      if (ph >= 2) for (let i = 0; i < 2; i++) this.addOrb();
    }
    if (this.phaseMsg) { this.phaseMsg.t -= dt; if (this.phaseMsg.t <= 0) this.phaseMsg = null; }
    for (const P of this.pl) this.updatePlayer(P, dt);
    this.pushCheck();
    // zonas: se apuntan alternadamente a cada jugador (justo para los dos)
    this.zoneT -= dt * this.rate;
    if (this.zoneT <= 0) {
      this.zoneT = this.phase === 0 ? rand(1.5, 2.0) : rand(1.1, 1.6);
      const P = this.pl[this.target];
      this.target = (this.target + 1) % this.np;
      const lead = 0.55;
      const x = clamp(P.x + P.vx * lead + rand(-70, 70), AX + 40, AX + AW - 40);
      const y = clamp(P.y + P.vy * lead + rand(-70, 70), AY + 40, AY + AH - 40);
      this.zones.push({ x, y, r: rand(62, 92) + this.phase * 6, warn: Math.max(0.8, 1.45 - this.time / 110), t: 0, boom: false });
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
        for (const P of this.pl) if (Math.hypot(P.x - z.x, P.y - z.y) < z.r + 16) this.hit(P, z.x, z.y);
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.warn + 0.35);
    // escudos para agarrar: aparecen lejos de las zonas y duran 7 s
    this.pickT -= dt;
    if (this.pickT <= 0 && this.pickups.length < 2) {
      this.pickT = rand(10, 13);
      this.pickups.push({ x: rand(AX + 90, AX + AW - 90), y: rand(AY + 80, AY + AH - 80), t: 0 });
    }
    for (const k of this.pickups) {
      k.t += dt;
      for (const P of this.pl) {
        if (!P.alive || k.got || Math.hypot(P.x - k.x, P.y - k.y) > 40) continue;
        k.got = true;
        if (P.lives < 3) { P.lives++; this.fx.float(P.x, P.y - 60, '+1 ESCUDO', '#3DDC97', 26); }
        else { P.star = 3; P.inv = Math.max(P.inv, 3); this.fx.float(P.x, P.y - 60, '¡ESTRELLA!', '#FFD23F', 28); }
        P.picks = (P.picks || 0) + 1;
        this.sfx('coin');
        this.fx.ring(k.x, k.y, '#3DDC97', 70, 0.4, 5);
      }
    }
    this.pickups = this.pickups.filter((k) => !k.got && k.t < 7);
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
    P.star = Math.max(0, (P.star || 0) - dt);
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
  /** ¿Algún equipo (o jugador, en 1v1) quedó entero fuera de combate? */
  teamOut() {
    return [0, 1].some((t) => this.pl.every((P) => P.p % 2 !== t || !P.alive));
  }
  pushCheck() {
    for (const P of this.pl) {
      if (!P.pushReq || P.pushCd > 0) continue;
      // empuja al rival vivo más cercano (nunca al compañero)
      let O = null, d = Infinity;
      for (const Q of this.pl) {
        if (Q.p % 2 === P.p % 2 || !Q.alive) continue;
        const dq = Math.hypot(Q.x - P.x, Q.y - P.y);
        if (dq < d) { d = dq; O = Q; }
      }
      if (!O) O = this.pl[1 - (P.p % 2)];
      const a = P, b = O;
      P.pushReq = 0;
      P.pushCd = 1.6;
      this.sfx('whoosh');
      if (d < 100 && O.alive) {
        const nx = (O.x - P.x) / (d || 1), ny = (O.y - P.y) / (d || 1);
        O.vx = nx * 860; O.vy = ny * 860; O.stun = 0.5; O.dash = 0.22;
        this.impact(0.06);
        this.fx.float((a.x + b.x) / 2, (a.y + b.y) / 2 - 50, '¡PUM!', '#FFE08A', 26);
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
    this.fx.shake(8);
    this.impact(0.08);
    this.fx.float(P.x, P.y - 40, P.lives > 0 ? `-1 ESCUDO` : '¡SIN ESCUDOS!', '#fff', 22);
    if (P.lives <= 0) {
      P.alive = false;
      P.out = this.time;
      this.fx.burst(P.x, P.y, [this.color(P.p), '#ffffff'], 30, { speed: 260 });
    }
  }
  end() {
    if (this.done) return;
    // en 2v2 se suma por equipo (escudos y tiempo con escudos de los dos)
    const T = (f) => [0, 1].map((t) => this.pl.filter((P) => P.p % 2 === t).reduce((a, P) => a + f(P), 0));
    const lives = T((P) => Math.max(0, P.lives));
    const alive = T((P) => (P.alive ? Math.min(this.time, this.duration) : P.out));
    const teamAlive = [0, 1].map((t) => this.pl.some((P) => P.p % 2 === t && P.alive));
    const w = lives[0] !== lives[1] ? (lives[0] > lives[1] ? 0 : 1) : alive[0] !== alive[1] ? (alive[0] > alive[1] ? 0 : 1) : -1;
    this.finish({
      winner: w,
      scores: lives,
      display: lives.map((l, i) => (teamAlive[i] ? `${l} escudos` : `Fuera · ${alive[i].toFixed(1)} s`)),
      scoreLabel: 'Escudos restantes',
      banner: this.pl.some((P) => !P.alive) ? '¡FUERA DE COMBATE!' : '¡SOBREVIVIERON!',
      stats: [
        { label: 'Tiempo con escudos', values: alive.map((v) => `${v.toFixed(1)} s`), raw: alive, better: 'high' },
        { label: 'Golpes recibidos', values: T((P) => P.hitsTaken).map(String), raw: T((P) => P.hitsTaken), better: 'low' },
        { label: 'Esquives', values: T((P) => P.dodges).map(String) },
        { label: 'Empujones conectados', values: T((P) => P.pushes).map(String), raw: T((P) => P.pushes), better: 'high' },
      ],
      records: this.team ? [null, null] : alive.map((v) => Math.round(v * 10) / 10),
      flags: [0, 1].map((t) => ({ hitsTaken: T((P) => P.hitsTaken)[t], pushes: T((P) => P.pushes)[t] })),
      margin: Math.abs(lives[0] - lives[1]),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    const ph = PHASES[this.phase];
    // piso de la arena (quieto, uno por fase): baldosas de historieta con borde de tinta
    cachedLayer(g, `blast:${this.phase}`, (cg) => {
      cg.fillStyle = mix(ph.bg, '#0B1020', 0.3); cg.fillRect(0, 0, W, H);
      cg.fillStyle = halftone(cg, rgba(ph.color, 0.18), 12, 2.4); cg.fillRect(0, 0, W, H);
      cg.save();
      roundRect(cg, AX, AY, AW, AH, 14); cg.clip();
      const T = 55;
      for (let y = AY; y < AY + AH; y += T) for (let x = AX; x < AX + AW; x += T) {
        cg.fillStyle = ((x - AX) / T + (y - AY) / T) % 2 ? mix(ph.bg, ph.color, 0.16) : mix(ph.bg, ph.color, 0.08);
        cg.fillRect(x, y, T, T);
      }
      cg.fillStyle = halftone(cg, 'rgba(13,11,20,0.22)', 9, 1.8); cg.fillRect(AX, AY, AW, AH);
      cg.strokeStyle = 'rgba(13,11,20,0.35)'; cg.lineWidth = 2;
      cg.beginPath();
      for (let x = AX; x <= AX + AW; x += T) { cg.moveTo(x, AY); cg.lineTo(x, AY + AH); }
      for (let y = AY; y <= AY + AH; y += T) { cg.moveTo(AX, y); cg.lineTo(AX + AW, y); }
      cg.stroke();
      // círculo central
      cg.strokeStyle = rgba(ph.color, 0.5); cg.lineWidth = 6;
      cg.beginPath(); cg.arc(CX, CY, 120, 0, TAU); cg.stroke();
      cg.restore();
      // borde: valla de peligro amarilla y negra
      cg.lineWidth = 16; cg.strokeStyle = '#0D0B14'; roundRect(cg, AX - 6, AY - 6, AW + 12, AH + 12, 18); cg.stroke();
      cg.setLineDash([22, 22]); cg.lineWidth = 8; cg.strokeStyle = '#FFD23F'; roundRect(cg, AX - 6, AY - 6, AW + 12, AH + 12, 18); cg.stroke(); cg.setLineDash([]);
    });
    // anillo seguro
    if (this.phase >= 3) {
      g.save();
      g.beginPath(); g.rect(AX, AY, AW, AH); g.arc(CX, CY, this.ring, 0, TAU, true); g.clip('evenodd');
      g.fillStyle = 'rgba(120,70,230,0.38)'; g.fillRect(AX, AY, AW, AH);
      g.fillStyle = halftone(g, 'rgba(13,11,20,0.35)', 10, 2.4); g.fillRect(AX, AY, AW, AH);
      g.restore();
      g.lineWidth = 9; g.strokeStyle = '#0D0B14';
      g.beginPath(); g.arc(CX, CY, this.ring, 0, TAU); g.stroke();
      g.strokeStyle = '#D9C8FF'; g.lineWidth = 4; g.setLineDash([16, 12]); g.lineDashOffset = -t * 40;
      g.beginPath(); g.arc(CX, CY, this.ring, 0, TAU); g.stroke(); g.setLineDash([]);
    }
    // escudos para agarrar
    for (const k of this.pickups) {
      const bob = Math.sin(t * 4 + k.x) * 5, blink = k.t > 5.5 && Math.floor(t * 10) % 2;
      if (blink) continue;
      g.fillStyle = 'rgba(13,11,20,0.35)'; g.beginPath(); g.ellipse(k.x, k.y + 22, 22, 7, 0, 0, TAU); g.fill();
      g.save(); g.translate(k.x, k.y - 6 + bob);
      g.beginPath(); g.moveTo(0, -22); g.lineTo(18, -14); g.lineTo(16, 6); g.lineTo(0, 20); g.lineTo(-16, 6); g.lineTo(-18, -14); g.closePath();
      g.fillStyle = '#3DDC97'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.fillStyle = '#fff'; g.fillRect(-3, -10, 6, 18); g.fillRect(-9, -4, 18, 6);
      g.restore();
    }
    // zonas: círculo de peligro con franjas que se llena; al estallar, globo de "¡BOOM!"
    for (const z of this.zones) {
      if (!z.boom) {
        const k = z.t / z.warn;
        g.fillStyle = `rgba(255,77,109,${0.18 + k * 0.22})`;
        g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,77,109,0.55)';
        g.beginPath(); g.arc(z.x, z.y, z.r * k, 0, TAU); g.fill();
        g.lineWidth = 7; g.strokeStyle = '#0D0B14';
        g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke();
        g.lineWidth = 5; g.strokeStyle = '#FFD23F'; g.setLineDash([12, 10]); g.lineDashOffset = t * 30;
        g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke(); g.setLineDash([]);
        if (k > 0.55 && Math.floor(t * 12) % 2) text(g, '!', z.x, z.y, { size: 40, color: '#FFD23F' });
      } else {
        const k = (z.t - z.warn) / 0.35;
        burst(g, z.x, z.y, z.r * (0.9 + k * 0.35), k < 0.5 ? '#FFD23F' : '#FF8E3C', { points: 12, rot: z.x, inner: 0.62, sx: 1.1, alpha: 1 - k * 0.8 });
        if (k < 0.7) text(g, 'BOOM', z.x, z.y, { size: 30 * (1 + k * 0.3), color: '#FF3B5C', alpha: 1 - k });
      }
    }
    // láseres: emisores en el borde y rayo con contorno
    for (const L of this.lasers) {
      const warn = L.t < L.warn;
      const thick = warn ? 6 : 16;
      const seg = (x, y, w, h) => {
        if (w <= 0 || h <= 0) return;
        g.fillStyle = '#0D0B14'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle = warn ? (Math.floor(t * 16) % 2 ? '#25CFE6' : '#0F3A48') : '#25CFE6'; g.fillRect(x, y, w, h);
        if (!warn) { g.fillStyle = '#E6FDFF'; if (w > h) g.fillRect(x, y + h / 2 - 2, w, 4); else g.fillRect(x + w / 2 - 2, y, 4, h); }
      };
      if (L.horiz) {
        const gx = AX + L.gap * AW;
        seg(AX, L.pos - thick / 2, gx - 0.09 * AW - AX, thick);
        seg(gx + 0.09 * AW, L.pos - thick / 2, AX + AW - gx - 0.09 * AW, thick);
      } else {
        const gy = AY + L.gap * AH;
        seg(L.pos - thick / 2, AY, thick, gy - 0.09 * AH - AY);
        seg(L.pos - thick / 2, gy + 0.09 * AH, thick, AY + AH - gy - 0.09 * AH);
      }
    }
    // orbes: bombas con pinchos
    for (const o of this.orbs) {
      g.save(); g.translate(o.x, o.y); g.rotate(t * 3);
      g.fillStyle = '#0D0B14';
      for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); g.beginPath(); g.moveTo(-6, -o.r + 2); g.lineTo(0, -o.r - 12); g.lineTo(6, -o.r + 2); g.fill(); }
      g.restore();
      g.fillStyle = '#FF8E3C'; g.beginPath(); g.arc(o.x, o.y, o.r + 2, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(o.x - 5, o.y - 6, o.r * 0.35, 0, TAU); g.fill();
    }
    // jugadores (más grandes que antes)
    for (const P of [...this.pl].sort((a, b) => a.y - b.y)) {
      if (!P.alive) continue;
      const col = this.color(P.p);
      const blink = P.inv > 0 && !(P.star > 0) && Math.floor(t * 14) % 2 === 0;
      g.fillStyle = 'rgba(13,11,20,0.4)'; g.beginPath(); g.ellipse(P.x, P.y + 22, 30, 10, 0, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = col; g.beginPath(); g.ellipse(P.x, P.y + 22, 30, 10, 0, 0, TAU); g.stroke();
      if (P.star > 0) { g.fillStyle = Math.floor(t * 12) % 2 ? '#FFD23F' : '#FFF4E0'; drawStar(g, P.x, P.y - 20, 50, 26, 5, t * 4); g.fill(); }
      drawCharacter(g, { id: this.players[P.p].char, x: P.x, y: P.y + 22, s: 0.72, color: col, anim: P.stun > 0 ? 'dizzy' : P.dash > 0 ? 'jump' : Math.hypot(P.vx, P.vy) > 40 ? 'run' : 'idle', t: t + P.p, facing: P.face, acc: this.players[P.p].acc, alpha: blink ? 0.35 : 1, shadow: false });
      // escudos: corazones-escudo sobre la cabeza
      for (let i = 0; i < 3; i++) {
        const sx = P.x - 26 + i * 26, sy = P.y - 92;
        g.save(); g.translate(sx, sy);
        g.beginPath(); g.moveTo(0, -10); g.lineTo(9, -6); g.lineTo(8, 3); g.lineTo(0, 10); g.lineTo(-8, 3); g.lineTo(-9, -6); g.closePath();
        g.fillStyle = i < P.lives ? col : 'rgba(13,11,20,0.55)'; g.fill();
        g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.stroke();
        g.restore();
      }
    }
  }
  renderHUD(g) {
    const sc = [0, 1].map((t) => this.pl.filter((P) => P.p % 2 === t).reduce((a, P) => a + Math.max(0, P.lives), 0));
    const sub = this.team
      ? [0, 1].map((t) => this.pl.filter((P) => P.p % 2 === t).map((P) => `J${P.p + 1}: ${P.alive ? Math.max(0, P.lives) + ' escudos' : 'fuera'}`).join(' · '))
      : this.pl.map((P) => `Esquive ${P.dashCd > 0 ? P.dashCd.toFixed(1) + ' s' : 'LISTO'} · Empujón ${P.pushCd > 0 ? P.pushCd.toFixed(1) + ' s' : 'LISTO'}`);
    this.hudTop(g, { scores: sc, timer: this.remaining, sub });
    this.hudTimeBar(g, 86);
    if (this.phaseMsg) {
      const m = this.phaseMsg;
      this.callout(g, m.text, { y: H / 2 - 40, size: 54, k: (2 - m.t) * 3, alpha: Math.min(1, m.t * 2), color: m.color, light: m.color === '#FFC93C' });
    }
  }
}

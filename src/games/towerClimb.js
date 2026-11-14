// JUEGO 15 — TOWER CLIMB (plataformas)
// Carrera vertical en pantalla dividida: la misma torre para los dos (generada con la misma semilla).
// Plataformas normales, móviles, que se desmoronan y resortes; láseres que se prenden y apagan;
// estrellas que cargan un SUPER SALTO. Gana quien llega arriba primero (o el más alto al final).
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, mulberry32 } from '../core/utils.js';

const TW = 520, HALF = 640, PAD = 60, PT = 14;
const FINISH = 1500; // 150 m
const GRAV = 1900, JUMP = 760, SUPER = 1180, SPRING = 1250;

export default class TowerClimb extends BaseGame {
  static meta = {
    id: 'tower', num: 15, name: 'TOWER CLIMB', short: 'TOWER', category: 'Plataformas', color: '#FF9E5E', isNew: true,
    tagline: 'La misma torre, dos escaladores, una sola cima.',
    description: 'Subí la torre saltando de plataforma en plataforma. Las grises se mueven, las agrietadas se rompen, los resortes te lanzan alto. Esquivá los láseres cuando están encendidos. Las estrellas cargan un SUPER SALTO (ACCIÓN 2). Si te caés, volvés a la última bandera.',
    goal: 'Llegar primero a los 150 m (o estar más alto cuando se termina el tiempo).',
    controls: [{ actions: ['left', 'right'], label: 'Moverse' }, { actions: ['a'], label: 'Saltar (también ARRIBA)' }, { actions: ['b'], label: 'Super salto (con estrella)' }],
    events: ['speed', 'short', 'lowgrav', 'mirror', 'invert', 'obstacles'],
    options: [{ key: 'time', label: 'Tiempo', choices: [[60, '60 s'], [90, '90 s'], [120, '120 s']], def: 90 }],
    record: { label: 'Altura máxima', better: 'higher', format: (v) => `${Math.round(v)} m` },
    drawIcon(g, t) {
      g.fillStyle = '#2A1F3F'; g.fillRect(50, 10, 100, 180);
      g.fillStyle = '#FF9E5E';
      for (const [x, y, w] of [[60, 160, 50], [100, 120, 45], [65, 80, 45], [105, 40, 40]]) { roundRect(g, x, y, w, 10, 4); g.fill(); }
      const k = (t * 0.7) % 1;
      glowCircle(g, 85 + Math.sin(k * TAU) * 20, 150 - k * 110, 20, '#FFD16B', 0.5);
      g.fillStyle = '#FFD16B'; g.beginPath(); g.arc(85 + Math.sin(k * TAU) * 20, 150 - k * 110, 8, 0, TAU); g.fill();
      g.fillStyle = '#48D597'; g.fillRect(118, 18, 4, 22); g.beginPath(); g.moveTo(122, 18); g.lineTo(140, 24); g.lineTo(122, 30); g.fill();
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 90);
    this.g = GRAV * this.gravityScale;
    const rng = mulberry32((Math.random() * 1e9) | 0);
    this.buildTower(rng);
    this.pl = [0, 1].map((p) => ({
      p, x: TW / 2 + (p ? 30 : -30), y: PT, vx: 0, vy: 0, on: this.plats[0], coyote: 0, buffer: 0, face: p ? -1 : 1,
      cam: 0, best: 0, check: 0, stun: 0, dead: 0, stars: 0, falls: 0, jumps: 0, supers: 0, crumble: new Map(), finished: null,
    }));
    this.winner = null;
    this.endT = 0;
  }

  buildTower(rng) {
    const R = (a, b) => a + rng() * (b - a);
    const plats = [{ id: 0, x: 0, y: 0, w: TW, type: 'n' }];
    const lasers = [];
    const stars = [];
    const checks = [0];
    let y = 0, cx = TW / 2, id = 1;
    while (y < FINISH) {
      y += R(80, 104);
      const w = R(100, 150);
      cx = clamp(cx + R(-200, 200), w / 2 + 10, TW - w / 2 - 10);
      const hard = y / FINISH;
      const roll = rng();
      const type = y > 150 && roll < 0.18 + hard * 0.12 ? 'c' : y > 200 && roll < 0.36 + hard * 0.1 ? 'm' : 'n';
      plats.push({ id: id++, x: cx - w / 2, y, w, type, amp: R(50, 90), sp: R(1.1, 1.8), ph: R(0, TAU) });
      // ruta alternativa: otra plataforma (a veces con resorte o estrella)
      if (rng() < 0.55) {
        const w2 = R(80, 120);
        const side = cx < TW / 2 ? 1 : -1;
        const x2 = clamp(cx + side * R(170, 260), w2 / 2 + 10, TW - w2 / 2 - 10);
        if (Math.abs(x2 - cx) > (w + w2) / 2 + 20) {
          const t2 = rng() < 0.3 ? 's' : 'n';
          plats.push({ id: id++, x: x2 - w2 / 2, y: y + R(-10, 14), w: w2, type: t2, amp: 0, sp: 0, ph: 0 });
          if (t2 === 'n' && rng() < 0.35) stars.push({ x: x2, y: y + 52, id: stars.length });
        }
      }
      // láseres más espaciados y lentos (ciclo de 3,8 a 4,8 s, encendidos un 40%) con aviso previo
      if (y > 300 && Math.floor(y / 280) > lasers.length && rng() < 0.8) lasers.push({ y: y + 44, period: R(3.8, 4.8), ph: R(0, 4), on: 0.4 });
      if (Math.floor(y / 300) > checks.length - 1) checks.push(y);
    }
    if (this.extraObstacles) for (const l of lasers) l.on = 0.5;
    this.plats = plats;
    this.lasers = lasers;
    this.stars = stars;
    this.checks = checks;
    this.finishY = y + 90;
    plats.push({ id: id++, x: 0, y: this.finishY, w: TW, type: 'f' });
  }
  platX(pl, t) {
    return pl.type === 'm' ? pl.x + Math.sin(t * pl.sp + pl.ph) * pl.amp : pl.x;
  }
  laserOn(l, t) {
    return ((t + l.ph) % l.period) / l.period < l.on;
  }
  /** Avisa 0,7 s antes de que el láser se prenda. */
  laserWarn(l, t) {
    const ph = ((t + l.ph) % l.period) / l.period;
    return ph > 1 - 0.7 / l.period;
  }
  solid(P, plat) {
    const c = P.crumble.get(plat.id);
    return !c || c.state !== 'gone';
  }

  update(dt) {
    if (this.winner != null) {
      this.endT += dt;
      if (this.endT > 1.2) this.end();
      for (const P of this.pl) this.updatePlayer(P, dt * 0.3);
      return;
    }
    if (this.time >= this.duration) return this.end();
    for (const P of this.pl) this.updatePlayer(P, dt);
  }
  updatePlayer(P, dt) {
    const t = this.time;
    const inp = this.inputs[P.p];
    // plataformas que se desmoronan (estado propio de cada jugador)
    for (const [id, c] of P.crumble) {
      c.t -= dt;
      if (c.state === 'shake' && c.t <= 0) { c.state = 'gone'; c.t = 3; if (P.on?.id === id) P.on = null; }
      else if (c.state === 'gone' && c.t <= 0) P.crumble.delete(id);
    }
    if (P.dead > 0) {
      P.dead -= dt;
      if (P.dead <= 0) {
        const cy = this.checks.filter((c) => c <= P.best + 1).pop() || 0;
        const plat = this.plats.reduce((best, pl) => (Math.abs(pl.y - cy) < Math.abs(best.y - cy) && pl.type !== 'c' ? pl : best), this.plats[0]);
        P.x = this.platX(plat, t) + plat.w / 2; P.y = plat.y + PT; P.vx = 0; P.vy = 0; P.on = plat;
      }
      return;
    }
    P.stun = Math.max(0, P.stun - dt);
    const ax = P.stun > 0 ? 0 : inp.axisX();
    if (ax) P.face = ax;
    const sp = 330 + this.diff * 30;
    P.vx += (ax * sp - P.vx) * Math.min(1, dt * (P.on ? 16 : 7));
    if (inp.pressed('a') || inp.pressed('up')) P.buffer = 0.12;
    P.buffer = Math.max(0, P.buffer - dt);
    P.coyote = P.on ? 0.1 : Math.max(0, P.coyote - dt);
    if (P.buffer > 0 && P.coyote > 0 && P.stun <= 0) {
      P.vy = JUMP; P.on = null; P.coyote = 0; P.buffer = 0; P.jumps++;
      this.sfx('jump');
    }
    if (inp.pressed('b') && P.stars > 0 && P.stun <= 0) {
      P.stars--; P.vy = SUPER; P.on = null; P.supers++;
      this.sfx('boost');
      this.fx.burst(this.sx(P, P.x), this.sy(P, P.y), '#FFD16B', 16, { speed: 220 });
    }
    // movimiento con plataforma
    if (P.on) {
      const plat = P.on;
      const dx = this.platX(plat, t) - this.platX(plat, t - dt);
      P.x += dx;
      if (!this.solid(P, plat) || P.x < this.platX(plat, t) - 6 || P.x > this.platX(plat, t) + plat.w + 6) P.on = null;
    }
    if (!P.on) P.vy -= this.g * dt;
    const oldY = P.y;
    P.x = clamp(P.x + P.vx * dt, 12, TW - 12);
    P.y += P.vy * dt;
    if (!P.on && P.vy <= 0) {
      for (const plat of this.plats) {
        const top = plat.y + PT;
        if (oldY >= top - 0.5 && P.y <= top && this.solid(P, plat)) {
          const px = this.platX(plat, t);
          if (P.x >= px - 6 && P.x <= px + plat.w + 6) {
            P.y = top;
            if (plat.type === 's') {
              P.vy = SPRING; this.sfx('boost');
              this.fx.burst(this.sx(P, P.x), this.sy(P, P.y), '#48D597', 12, { speed: 180 });
              break;
            }
            P.vy = 0; P.on = plat;
            if (oldY - P.y > 4) this.sfx('land');
            if (plat.type === 'c' && !P.crumble.has(plat.id)) P.crumble.set(plat.id, { state: 'shake', t: 0.45 });
            if (plat.type === 'f' && this.winner == null) this.reachTop(P);
            break;
          }
        }
      }
    } else if (P.on) {
      P.y = P.on.y + PT;
      P.vy = 0;
    }
    // estrellas
    for (const st of this.stars) {
      if (st.taken?.[P.p]) continue;
      if (Math.abs(st.x - P.x) < 26 && Math.abs(st.y - (P.y + 30)) < 34) {
        (st.taken ||= {})[P.p] = true;
        P.stars++;
        this.sfx('coin');
        this.fx.float(this.sx(P, st.x), this.sy(P, st.y) - 20, 'SUPER SALTO', '#FFD16B', 20);
      }
    }
    // láseres
    for (const l of this.lasers) {
      if (P.stun <= 0 && this.laserOn(l, t) && P.y < l.y + 6 && P.y + 60 > l.y - 6) {
        P.stun = 0.7; P.vy = Math.min(P.vy, -120); P.on = null;
        this.sfx('zap');
        this.fx.burst(this.sx(P, P.x), this.sy(P, l.y), '#FF4D6D', 18, { speed: 240 });
        this.fx.shake(5);
      }
    }
    P.best = Math.max(P.best, P.y);
    // caída: vuelve a la última bandera
    if (P.y < P.cam - 140) {
      P.dead = 0.8; P.falls++;
      this.sfx('lose');
    }
    // cámara
    const target = Math.max(0, P.y - 300);
    P.cam += (target - P.cam) * Math.min(1, dt * (target > P.cam ? 5 : 2.5));
  }
  reachTop(P) {
    this.winner = P.p;
    P.finished = this.time;
    this.sfx('fanfare');
    this.fx.confetti(P.p ? W * 0.75 : W * 0.25, 200, 120, 1.2);
  }
  end() {
    if (this.done) return;
    const m = this.pl.map((P) => Math.round(P.best / 10));
    const w = this.winner != null ? this.winner : BaseGame.decide(m[0], m[1]);
    this.finish({
      winner: w,
      scores: m,
      display: this.pl.map((P, i) => (P.finished != null ? `¡CIMA! ${P.finished.toFixed(1)} s` : `${m[i]} m`)),
      scoreLabel: 'Altura',
      banner: this.winner != null ? '¡CIMA!' : '¡TIEMPO!',
      stats: [
        { label: 'Altura máxima', values: m.map((v) => v + ' m'), raw: m, better: 'high' },
        { label: 'Caídas', values: this.pl.map((P) => String(P.falls)), raw: this.pl.map((P) => P.falls), better: 'low' },
        { label: 'Saltos', values: this.pl.map((P) => String(P.jumps)) },
        { label: 'Super saltos', values: this.pl.map((P) => String(P.supers)) },
      ],
      records: m,
      flags: this.pl.map((P, i) => ({ height: m[i], falls: P.falls })),
      margin: Math.abs(m[0] - m[1]),
    });
  }

  // ------------------------------------------------------------------ dibujo
  sx(P, x) { return P.p * HALF + PAD + x; }
  sy(P, y) { return H - 40 - (y - P.cam); }
  render(g) {
    const t = this.realTime;
    for (const P of this.pl) {
      g.save();
      g.beginPath(); g.rect(P.p * HALF, 0, HALF, H); g.clip();
      this.renderHalf(g, P, t);
      g.restore();
    }
    // divisor con el progreso de ambos
    g.fillStyle = '#0B1020'; g.fillRect(HALF - 10, 0, 20, H);
    const top = 110, bot = H - 30;
    g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, HALF - 4, top, 8, bot - top, 4); g.fill();
    for (const P of this.pl) {
      const k = clamp(P.y / this.finishY, 0, 1);
      const y = bot - k * (bot - top);
      g.fillStyle = this.color(P.p);
      g.beginPath(); g.arc(HALF + (P.p ? 5 : -5), y, 7, 0, TAU); g.fill();
    }
    g.fillStyle = '#48D597'; g.fillRect(HALF - 8, top - 4, 16, 4);
  }
  renderHalf(g, P, t) {
    const x0 = P.p * HALF;
    const bg = g.createLinearGradient(0, 0, 0, H);
    const k = clamp(P.cam / this.finishY, 0, 1);
    bg.addColorStop(0, k > 0.7 ? '#1B1450' : '#141A3A');
    bg.addColorStop(1, '#0B1020');
    g.fillStyle = bg; g.fillRect(x0, 0, HALF, H);
    // estrellas de fondo con parallax
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 40; i++) {
      const sx = x0 + ((i * 131) % HALF), sy = (((i * 89) + P.cam * 0.2) % H);
      g.fillRect(sx, sy, 2, 2);
    }
    // pared de la torre
    g.fillStyle = '#231B3D'; g.fillRect(x0 + PAD - 18, 0, 14, H); g.fillRect(x0 + PAD + TW + 4, 0, 14, H);
    g.fillStyle = 'rgba(255,158,94,0.06)';
    const off = (P.cam * 0.5) % 40;
    for (let y = -40; y < H; y += 40) for (let x = 0; x < TW; x += 60) g.fillRect(x0 + PAD + x + ((Math.floor((y + P.cam * 0.5) / 40) % 2) * 30), y + off, 56, 36);
    // banderas de control
    for (const c of this.checks) {
      if (!c) continue;
      const y = this.sy(P, c + PT);
      if (y < -40 || y > H + 40) continue;
      g.fillStyle = '#C9D0E3'; g.fillRect(x0 + PAD + 6, y - 46, 3, 46);
      g.fillStyle = P.best >= c ? '#48D597' : '#8C96B8';
      g.beginPath(); g.moveTo(x0 + PAD + 9, y - 46); g.lineTo(x0 + PAD + 30, y - 40); g.lineTo(x0 + PAD + 9, y - 34); g.fill();
      text(g, `${Math.round(c / 10)} m`, x0 + PAD + 46, y - 40, { size: 11, color: '#8C96B8', body: true, weight: 800 });
    }
    // plataformas
    for (const plat of this.plats) {
      const y = this.sy(P, plat.y + PT);
      if (y < -30 || y > H + 30) continue;
      const px = x0 + PAD + this.platX(plat, this.time);
      const c = P.crumble.get(plat.id);
      if (c?.state === 'gone') continue;
      const shake = c?.state === 'shake' ? Math.sin(t * 60) * 2 : 0;
      const col = plat.type === 'f' ? '#48D597' : plat.type === 'm' ? '#9AA3BE' : plat.type === 'c' ? '#B07A52' : plat.type === 's' ? '#48D597' : '#FF9E5E';
      g.fillStyle = shade(col, -0.35);
      roundRect(g, px + shake, y + 4, plat.w, PT, 6); g.fill();
      g.fillStyle = col;
      roundRect(g, px + shake, y, plat.w, PT, 6); g.fill();
      if (plat.type === 'c') { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + plat.w * 0.3, y); g.lineTo(px + plat.w * 0.4, y + PT); g.moveTo(px + plat.w * 0.7, y); g.lineTo(px + plat.w * 0.6, y + PT); g.stroke(); }
      if (plat.type === 's') { g.strokeStyle = '#E8ECF8'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(px + plat.w / 2 - 12, y - 4 - i * 4); g.lineTo(px + plat.w / 2 + 12, y - 6 - i * 4); } g.stroke(); }
      if (plat.type === 'f') text(g, '★ CIMA ★', px + plat.w / 2, y - 26, { size: 26, color: '#BFFFE0', glow: '#48D597' });
    }
    // láseres
    for (const l of this.lasers) {
      const y = this.sy(P, l.y);
      if (y < -20 || y > H + 20) continue;
      const on = this.laserOn(l, this.time);
      g.fillStyle = '#3A2F55'; g.fillRect(x0 + PAD - 18, y - 8, 18, 16); g.fillRect(x0 + PAD + TW, y - 8, 18, 16);
      if (on) {
        g.save();
        if (quality.glow) { g.shadowColor = '#FF4D6D'; g.shadowBlur = 16; }
        g.fillStyle = 'rgba(255,77,109,0.9)'; g.fillRect(x0 + PAD, y - 3, TW, 6);
        g.restore();
      } else if (this.laserWarn(l, this.time)) {
        // aviso: parpadea antes de prenderse
        g.fillStyle = `rgba(255,201,60,${0.35 + 0.35 * Math.sin(this.time * 30)})`;
        for (let x = 0; x < TW; x += 18) g.fillRect(x0 + PAD + x, y - 2, 10, 4);
      } else {
        g.fillStyle = 'rgba(255,77,109,0.18)';
        for (let x = 0; x < TW; x += 18) g.fillRect(x0 + PAD + x, y - 1, 8, 2);
      }
    }
    // estrellas
    for (const st of this.stars) {
      if (st.taken?.[P.p]) continue;
      const y = this.sy(P, st.y);
      if (y < -20 || y > H + 20) continue;
      glowCircle(g, x0 + PAD + st.x, y, 22, '#FFD16B', 0.5);
      g.save(); g.translate(x0 + PAD + st.x, y); g.rotate(t * 2);
      g.fillStyle = '#FFD16B'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4.5 : 11; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.fill(); g.restore();
    }
    // jugador
    if (P.dead <= 0) {
      const anim = P.stun > 0 ? 'hurt' : !P.on ? (P.vy > 0 ? 'jump' : 'fall') : Math.abs(P.vx) > 40 ? 'run' : 'idle';
      if (P.finished != null) glowCircle(g, this.sx(P, P.x), this.sy(P, P.y) - 30, 70, '#48D597', 0.5);
      drawCharacter(g, { id: this.players[P.p].char, x: this.sx(P, P.x), y: this.sy(P, P.y), s: 0.6, color: this.color(P.p), anim: P.finished != null ? 'celebrate' : anim, t: t + P.p, facing: P.face, acc: this.players[P.p].acc });
    } else {
      text(g, '¡A LA BANDERA!', x0 + HALF / 2, H / 2, { size: 26, color: '#fff', glow: this.color(P.p) });
    }
    // altura
    panel(g, x0 + HALF / 2 - 70, H - 46, 140, 34, { r: 17, fill: 'rgba(11,16,32,0.8)', stroke: this.color(P.p) });
    text(g, `${Math.round(P.y / 10)} m${P.stars ? '  ★' + P.stars : ''}`, x0 + HALF / 2, H - 29, { size: 18, color: '#fff' });
  }
  renderHUD(g) {
    this.hudTop(g, { scores: this.pl.map((P) => Math.round(P.best / 10)), timer: this.remaining, sub: this.pl.map((P) => `Meta: ${Math.round(this.finishY / 10)} m · caídas ${P.falls}`), scoreSize: 30 });
    this.hudTimeBar(g, 86);
  }
}

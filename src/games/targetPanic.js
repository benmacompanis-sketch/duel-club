// JUEGO 09 — TARGET PANIC (precisión y reflejos)
// Cada jugador mueve su mira y dispara a SUS blancos (de su color). Los dorados son de quien
// llegue primero, las minas restan. Disparar al blanco del rival lo destruye (le negás puntos).
// Los aciertos seguidos suben el multiplicador; fallar lo reinicia.
import { BaseGame } from './baseGame.js';
import { drawPortrait } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, ease, cachedLayer, halftone } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

const MAG = 6; // tiros por cargador
const TOP = 110;

export default class TargetPanic extends BaseGame {
  static meta = {
    id: 'target', num: 9, name: 'TARGET PANIC', short: 'TARGET', category: 'Precisión', color: '#FFC93C',
    tagline: 'Apuntá rápido. Apuntá bien. Apuntá a lo tuyo.',
    description: 'Mové tu mira y disparale a los blancos de TU color. Los dorados valen mucho y son del primero que los toque; las minas moradas restan y cortan tu combo. Si le disparás a un blanco del rival, se lo robás (no suma, pero no le deja nada). Mantené ACCIÓN 2 para apuntar con precisión.',
    goal: 'Sumá más puntos que tu rival antes del final.',
    controls: [
      { actions: ['up', 'down', 'left', 'right'], label: 'Mover mira' },
      { actions: ['a'], label: 'Disparar' },
      { actions: ['b'], label: 'Mantener: mira de precisión' },
    ],
    events: ['speed', 'short', 'double', 'obstacles', 'mirror', 'invert'],
    options: [{ key: 'time', label: 'Tiempo', choices: [[30, '30 s'], [45, '45 s'], [60, '60 s']], def: 45 }],
    record: { label: 'Puntos en una partida', better: 'higher', format: (v) => `${v} pts` },
    drawIcon(g, t) {
      for (const [x, y, c, s] of [[70, 80, '#3985FF', 1], [140, 120, '#FF654F', 0.8], [100, 150, '#FFC93C', 0.6]]) {
        const r = 30 * s;
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.fillStyle = '#F6F7FB'; g.beginPath(); g.arc(x, y, r * 0.66, 0, TAU); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r * 0.33, 0, TAU); g.fill();
      }
      const cx = 100 + Math.cos(t * 2) * 40, cy = 100 + Math.sin(t * 3) * 30;
      g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy, 18, 0, TAU); g.moveTo(cx - 28, cy); g.lineTo(cx - 10, cy); g.moveTo(cx + 10, cy); g.lineTo(cx + 28, cy); g.moveTo(cx, cy - 28); g.lineTo(cx, cy - 10); g.moveTo(cx, cy + 10); g.lineTo(cx, cy + 28); g.stroke();
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 45);
    // cargador: 6 tiros; se recarga solo (de a uno) o del todo en 0,9 s al vaciarse. Cadencia máxima: 3,5 tiros/s
    // 2v2: cada jugador tiene su mira y su cargador; los puntos y los blancos son del EQUIPO (lado)
    const AX = this.team ? [0.2, 0.8, 0.36, 0.64] : [0.28, 0.72];
    this.aims = Array.from({ length: this.np }, (_, p) => ({ x: W * AX[p], y: 420, vx: 0, vy: 0, cd: 0, recoil: 0, ammo: MAG, refill: 0, reload: 0, flash: 0 }));
    this.targets = [];
    this.spawnT = 0.4;
    this.score = [0, 0];
    const per = () => Array(this.np).fill(0);
    this.combo = per();
    this.maxCombo = per();
    this.shots = per();
    this.hits = per();
    this.bombs = per();
    this.denies = per();
    this.golds = per();
    this.frenzy = false;
    this.banner = null;
    this.holes = [];
  }

  mult(p) {
    return Math.min(4, 1 + Math.floor(this.combo[p] / 5));
  }

  spawn() {
    // dificultad progresiva: con el correr de la partida hay más blancos móviles y viven menos
    const prog = this.duration ? clamp(this.time / this.duration, 0, 1) : 0;
    const d = this.diff + prog * 0.35;
    const life = rand(2.8, 3.9) - d * 0.6;
    const moving = Math.random() < 0.25 + d * 0.35;
    const mk = (owner, x, y, mirror) => {
      const t = { owner, x, y, r: owner === 'gold' ? 28 : owner === 'bomb' ? 30 : 40, life, max: life, vx: 0, vy: 0, ph: rand(0, TAU), kind: 'still', dead: false };
      if (moving) {
        t.kind = choice(['line', 'sine']);
        t.vx = rand(80, 170) * (Math.random() < 0.5 ? -1 : 1) * (1 + d * 0.3);
        t.vy = t.kind === 'line' ? rand(-90, 90) : 0;
        if (mirror) { t.vx = -mirror.vx; t.vy = mirror.vy; t.kind = mirror.kind; t.ph = mirror.ph; }
      }
      this.targets.push(t);
      return t;
    };
    // pares simétricos: cada jugador recibe exactamente las mismas oportunidades
    const x = rand(90, W / 2 - 60), y = rand(TOP + 50, H - 60);
    const a = mk(0, x, y);
    mk(1, W - x, y, a);
    if (Math.random() < 0.28) {
      const g = mk('gold', rand(W * 0.35, W * 0.65), rand(TOP + 60, H - 80));
      g.vx = rand(180, 260) * (Math.random() < 0.5 ? -1 : 1);
      g.vy = rand(-140, 140);
      g.kind = 'line';
      g.life = g.max = 2.4;
    }
    const bombChance = 0.25 + d * 0.2 + (this.extraObstacles ? 0.35 : 0);
    if (Math.random() < bombChance) {
      const bx = rand(120, W - 120), by = rand(TOP + 60, H - 60);
      mk('bomb', bx, by);
      if (this.extraObstacles && Math.random() < 0.5) mk('bomb', W - bx, by);
    }
  }

  ambient(dt) {
    for (const h of this.holes) h.a -= dt * 0.8;
    this.holes = this.holes.filter((h) => h.a > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
  }

  update(dt) {
    this.ambient(dt);
    if (!this.frenzy && this.remaining <= 10) {
      this.frenzy = true;
      this.banner = { text: '¡FRENESÍ!', color: '#FF8E3C', t: 1.4 };
      this.sfx('alarm');
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawn();
      this.spawnT = Math.max(0.3, 0.68 - this.diff * 0.22) * (this.frenzy ? 0.55 : 1);
    }
    // blancos
    for (const t of this.targets) {
      t.life -= dt;
      t.ph += dt * 3;
      if (t.kind === 'line') {
        t.x += t.vx * dt; t.y += t.vy * dt;
        if (t.x < 60 || t.x > W - 60) t.vx *= -1;
        if (t.y < TOP + 30 || t.y > H - 40) t.vy *= -1;
      } else if (t.kind === 'sine') {
        t.x += t.vx * dt;
        t.y += Math.cos(t.ph) * 60 * dt;
        if (t.x < 60 || t.x > W - 60) t.vx *= -1;
      }
    }
    this.targets = this.targets.filter((t) => t.life > 0 && !t.dead);
    // miras
    for (let p = 0; p < this.np; p++) this.updateAim(p, dt);
    if (this.time >= this.duration) this.end();
  }

  updateAim(p, dt) {
    const a = this.aims[p];
    const inp = this.inputs[p];
    a.cd = Math.max(0, a.cd - dt);
    a.recoil = Math.max(0, a.recoil - dt * 6);
    a.flash = Math.max(0, a.flash - dt * 8);
    if (a.reload > 0) {
      a.reload -= dt;
      if (a.reload <= 0) { a.ammo = MAG; a.refill = 0; this.sfx('tick'); }
    } else if (a.ammo < MAG && a.cd <= 0) {
      a.refill += dt;
      if (a.refill >= 0.3) { a.refill = 0; a.ammo++; }
    }
    const ix = inp.axisX(), iy = inp.axisY();
    const len = Math.hypot(ix, iy) || 1;
    const sp = inp.held('b') ? 240 : 640;
    const k = 1 - Math.exp(-18 * dt);
    a.vx += ((ix / len) * sp - a.vx) * k;
    a.vy += ((iy / len) * sp - a.vy) * k;
    a.x = clamp(a.x + a.vx * dt, 20, W - 20);
    a.y = clamp(a.y + a.vy * dt, TOP, H - 16);
    if (inp.pressed('a')) {
      if (a.cd <= 0 && a.reload <= 0 && a.ammo > 0) this.shoot(p);
      else if (a.reload > 0 || a.ammo <= 0) this.sfx('tick', { gap: 120 });
    }
  }

  shoot(p) {
    const a = this.aims[p];
    a.cd = 0.28;
    a.recoil = 1;
    a.flash = 1;
    a.ammo--;
    a.refill = 0;
    if (a.ammo <= 0) a.reload = 0.9;
    this.shots[p]++;
    this.sfx('shoot', { pitch: p ? 1.15 : 1 });
    // el blanco más cercano bajo la mira (se prioriza el de arriba en la lista: más reciente)
    let hit = null, best = Infinity;
    for (const t of this.targets) {
      const d = Math.hypot(t.x - a.x, t.y - a.y);
      const r = t.r * (0.7 + 0.3 * (t.life / t.max));
      if (d < r && d < best) { best = d; hit = t; }
    }
    if (!hit) {
      this.combo[p] = 0;
      this.holes.push({ x: a.x, y: a.y, a: 1 });
      this.fx.burst(a.x, a.y, 'rgba(246,247,251,0.6)', 5, { speed: 90, gravity: 0, life: 0.3 });
      return;
    }
    hit.dead = true;
    const col = this.color(p);
    const s = this.side(p);
    if (hit.owner === 'bomb') {
      const pts = 15 * this.scoreMul();
      this.score[s] -= pts;
      this.combo[p] = 0;
      this.bombs[p]++;
      this.sfx('bad');
      this.fx.shake(8);
      this.fx.burst(hit.x, hit.y, ['#9B6CFF', '#2A1F4F', '#FF654F'], 30, { speed: 380 });
      this.fx.float(hit.x, hit.y - 20, `−${pts}`, '#FF654F', 34);
      return;
    }
    if (hit.owner === 1 - s) {
      // robo: destruye el blanco del rival sin sumar ni cortar el combo
      this.denies[p]++;
      this.sfx('pop', { pitch: 0.8 });
      this.fx.burst(hit.x, hit.y, [this.color(1 - s), '#fff'], 14, { speed: 250 });
      this.fx.float(hit.x, hit.y - 20, '¡ROBADO!', col, 22);
      return;
    }
    this.hits[p]++;
    this.combo[p]++;
    this.maxCombo[p] = Math.max(this.maxCombo[p], this.combo[p]);
    const precise = best < hit.r * 0.3;
    const base = hit.owner === 'gold' ? 25 : precise ? 15 : 10;
    if (hit.owner === 'gold') this.golds[p]++;
    const m = this.mult(p);
    const pts = base * m * this.scoreMul();
    this.score[s] += pts;
    this.sfx(hit.owner === 'gold' ? 'coin' : 'pop', { pitch: 1 + Math.min(0.6, this.combo[p] * 0.03) });
    if (this.combo[p] % 5 === 0) { this.sfx('combo'); this.fx.float(a.x, a.y - 60, `COMBO x${m}`, '#FFC93C', 26); }
    this.fx.burst(hit.x, hit.y, hit.owner === 'gold' ? ['#FFC93C', '#fff'] : [col, '#fff'], hit.owner === 'gold' ? 28 : 16, { speed: 300 });
    this.fx.ring(hit.x, hit.y, hit.owner === 'gold' ? '#FFC93C' : col, hit.r * 2);
    this.fx.float(hit.x, hit.y - 24, `+${pts}${precise && hit.owner !== 'gold' ? ' ¡CENTRO!' : ''}`, hit.owner === 'gold' ? '#FFC93C' : col, 24);
  }

  end() {
    const [a, b] = this.score;
    // en 2v2 las estadísticas se suman por equipo
    const T = (arr) => (this.team ? [arr[0] + arr[2], arr[1] + arr[3]] : arr.slice());
    const TM = (arr) => (this.team ? [Math.max(arr[0], arr[2]), Math.max(arr[1], arr[3])] : arr.slice());
    const hits = T(this.hits), shots = T(this.shots), mc = TM(this.maxCombo);
    const acc = shots.map((s, p) => (s ? Math.round((hits[p] / s) * 100) : 0));
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Puntos',
      stats: [
        { label: 'Aciertos', values: hits.map(String), raw: hits, better: 'high' },
        { label: 'Precisión', values: acc.map((v) => v + '%'), raw: acc, better: 'high' },
        { label: 'Combo máximo', values: mc.map(String), raw: mc, better: 'high' },
        { label: 'Dorados', values: T(this.golds).map(String), raw: T(this.golds), better: 'high' },
        { label: 'Robos', values: T(this.denies).map(String), raw: T(this.denies), better: 'high' },
        { label: 'Minas tocadas', values: T(this.bombs).map(String), raw: T(this.bombs), better: 'low' },
      ],
      records: this.team ? [null, null] : [a, b],
      flags: mc.map((c) => ({ maxCombo: c })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  ghostScore(p) { return this.score[p]; }
  render(g) {
    const t = this.realTime;
    // galería de tiro de feria (quieta): pared de madera, estantes, cortinas rojas y toldo a rayas
    cachedLayer(g, 'target:booth', (cg) => {
      const wall = cg.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, '#5A2E1E'); wall.addColorStop(1, '#3A1C14');
      cg.fillStyle = wall; cg.fillRect(0, 0, W, H);
      cg.strokeStyle = 'rgba(13,11,20,0.45)'; cg.lineWidth = 3;
      for (let x = 0; x < W; x += 64) { cg.beginPath(); cg.moveTo(x, TOP); cg.lineTo(x, H); cg.stroke(); }
      cg.fillStyle = halftone(cg, 'rgba(13,11,20,0.25)', 10, 2); cg.fillRect(0, 0, W, H);
      // estantes donde corren los blancos
      for (let i = 0; i < 4; i++) {
        const y = 230 + i * 140;
        cg.fillStyle = '#0D0B14'; cg.fillRect(0, y - 2, W, 18);
        cg.fillStyle = '#C98B4B'; cg.fillRect(0, y, W, 12);
        cg.fillStyle = 'rgba(255,255,255,0.25)'; cg.fillRect(0, y + 2, W, 3);
      }
      // cortinas
      for (const [x0, dir] of [[0, 1], [W, -1]]) {
        cg.fillStyle = '#C8203A';
        cg.beginPath(); cg.moveTo(x0, TOP - 10); cg.lineTo(x0 + dir * 90, TOP - 10);
        cg.quadraticCurveTo(x0 + dir * 40, 420, x0 + dir * 70, H); cg.lineTo(x0, H); cg.closePath(); cg.fill();
        cg.lineWidth = 5; cg.strokeStyle = '#0D0B14'; cg.stroke();
        cg.strokeStyle = 'rgba(13,11,20,0.35)'; cg.lineWidth = 3;
        for (let k = 1; k < 4; k++) { cg.beginPath(); cg.moveTo(x0 + dir * k * 20, TOP); cg.quadraticCurveTo(x0 + dir * k * 9, 420, x0 + dir * k * 16, H); cg.stroke(); }
      }
      // toldo a rayas con borde ondulado
      for (let x = 0, i = 0; x < W; x += 80, i++) { cg.fillStyle = i % 2 ? '#FFF4E0' : '#E8203A'; cg.fillRect(x, 0, 80, TOP - 20); }
      cg.beginPath(); cg.moveTo(0, TOP - 20);
      for (let x = 0; x < W; x += 80) cg.arc(x + 40, TOP - 20, 40, Math.PI, 0, true);
      cg.lineTo(W, 0); cg.lineTo(0, 0); cg.closePath();
      cg.save(); cg.clip();
      for (let x = 0, i = 0; x < W; x += 80, i++) { cg.fillStyle = i % 2 ? '#FFF4E0' : '#E8203A'; cg.fillRect(x, 0, 80, TOP + 30); }
      cg.restore();
      cg.lineWidth = 5; cg.strokeStyle = '#0D0B14'; cg.stroke();
    });
    // bombillas de feria
    for (let i = 0; i < 32; i++) {
      const on = Math.sin(t * 6 + i * 0.8) > 0;
      g.fillStyle = on ? '#FFE08A' : '#7A5A2A';
      g.beginPath(); g.arc(20 + i * 40, TOP + 14, 6, 0, TAU); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = '#0D0B14'; g.stroke();
    }
    for (const h of this.holes) {
      g.fillStyle = `rgba(13,11,20,${0.7 * h.a})`;
      g.beginPath(); g.arc(h.x, h.y, 5, 0, TAU); g.fill();
    }
    for (const tg of this.targets) this.drawTarget(g, tg, t);
    for (let p = 0; p < this.np; p++) this.drawAim(g, p, t);
  }

  drawTarget(g, tg, t) {
    const k = tg.life / tg.max;
    const r = tg.r * (0.5 + 0.5 * k) * (k > 0.92 ? ease.outBack((1 - k) / 0.08) : 1);
    g.save();
    g.translate(tg.x, tg.y);
    g.globalAlpha = Math.min(1, k * 4);
    g.lineJoin = 'round';
    if (tg.owner === 'bomb') {
      g.fillStyle = '#0D0B14';
      for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); g.beginPath(); g.moveTo(-6, -r * 0.8); g.lineTo(0, -r * 1.25); g.lineTo(6, -r * 0.8); g.fill(); }
      g.fillStyle = '#7B3FE4';
      g.beginPath(); g.arc(0, 0, r * 0.85, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, TAU); g.fill();
      g.strokeStyle = '#FFF4E0'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.28, -r * 0.28); g.lineTo(r * 0.28, r * 0.28); g.moveTo(r * 0.28, -r * 0.28); g.lineTo(-r * 0.28, r * 0.28); g.stroke();
    } else if (tg.owner === 'gold') {
      glowCircle(g, 0, 0, r * 2.4, '#FFC93C', 1);
      drawStar(g, 3, 4, r * 1.15, r * 0.52, 5, t * 2); g.fillStyle = '#0D0B14'; g.fill();
      drawStar(g, 0, 0, r * 1.15, r * 0.52, 5, t * 2); g.fillStyle = '#FFD23F'; g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.fillStyle = '#FFF4E0'; g.beginPath(); g.arc(0, 0, r * 0.22, 0, TAU); g.fill();
    } else {
      const col = this.color(tg.owner);
      // palito de feria
      g.fillStyle = '#0D0B14'; g.fillRect(-5, r - 4, 10, 30);
      g.fillStyle = '#C98B4B'; g.fillRect(-3, r - 4, 6, 28);
      g.fillStyle = '#0D0B14'; g.beginPath(); g.arc(4, 6, r + 2, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.fillStyle = '#FFF4E0'; g.beginPath(); g.arc(0, 0, r * 0.68, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.arc(0, 0, r * 0.4, 0, TAU); g.fill();
      g.fillStyle = '#FFF4E0'; g.beginPath(); g.arc(0, 0, r * 0.14, 0, TAU); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      text(g, this.team ? (tg.owner ? 'ROJO' : 'AZUL') : `J${tg.owner + 1}`, 0, -r - 12, { size: 13, body: true, weight: 900, color: '#FFF4E0', stroke: '#0D0B14' });
    }
    // anillo de vida restante
    g.globalAlpha = 0.9;
    g.lineWidth = 6; g.strokeStyle = '#0D0B14';
    g.beginPath(); g.arc(0, 0, r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
    g.lineWidth = 3; g.strokeStyle = tg.owner === 'bomb' ? '#B49BFF' : k < 0.3 ? '#FF654F' : '#FFF4E0';
    g.stroke();
    g.restore();
  }

  drawAim(g, p, t) {
    const a = this.aims[p];
    const col = this.color(p);
    const precise = this.inputs[p].held('b');
    const r = (precise ? 14 : 20) + a.recoil * 6;
    g.save();
    g.translate(a.x, a.y);
    g.lineCap = 'round';
    for (const [lw, c] of [[9, '#0D0B14'], [4.5, col]]) {
      g.strokeStyle = c; g.lineWidth = lw;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      g.beginPath();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(dx * (r - 6), dy * (r - 6)); g.lineTo(dx * (r + 12), dy * (r + 12)); }
      g.stroke();
    }
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
    // fogonazo del disparo
    if (a.flash > 0) { g.globalAlpha = a.flash; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r + 10 * (1 - a.flash), 0, TAU); g.stroke(); g.globalAlpha = 1; }
    // balas del cargador (o barra de recarga)
    if (a.reload > 0) {
      g.fillStyle = 'rgba(11,16,32,0.7)'; g.fillRect(-24, r + 16, 48, 6);
      g.fillStyle = col; g.fillRect(-24, r + 16, 48 * (1 - a.reload / 0.9), 6);
    } else {
      for (let i = 0; i < MAG; i++) { g.fillStyle = i < a.ammo ? col : 'rgba(246,247,251,0.18)'; g.fillRect(-22 + i * 8, r + 16, 5, 7); }
    }
    g.restore();
    drawPortrait(g, a.x + 30, a.y + 30, 12, this.players[p], { t: t + p, ring: 2 });
    if (this.team) text(g, `J${p + 1}`, a.x - 32, a.y - 28, { size: 14, body: true, weight: 900, color: col });
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.score,
      sub: [0, 1].map((p) => {
        const c = this.team ? Math.max(this.combo[p], this.combo[p + 2]) : this.combo[p];
        const q = this.team && this.combo[p + 2] > this.combo[p] ? p + 2 : p;
        return c ? `Combo ${c} · x${this.mult(q)}` : 'Sin combo';
      }),
      timer: this.remaining,
    });
    this.hudTimeBar(g);
    if (this.banner) {
      this.callout(g, this.banner.text, { y: 380, size: 64, k: (1.5 - this.banner.t) * 3, alpha: Math.min(1, this.banner.t * 3), color: this.banner.color, light: this.banner.color === '#FFC93C' || this.banner.color === '#FFD23F' });
    }
  }
}

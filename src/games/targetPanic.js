// JUEGO 09 — TARGET PANIC (precisión y reflejos)
// Cada jugador mueve su mira y dispara a SUS blancos (de su color). Los dorados son de quien
// llegue primero, las minas restan. Disparar al blanco del rival lo destruye (le negás puntos).
// Los aciertos seguidos suben el multiplicador; fallar lo reinicia.
import { BaseGame } from './baseGame.js';
import { drawPortrait } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, ease } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

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
    this.aims = [0, 1].map((p) => ({ x: p ? W * 0.72 : W * 0.28, y: 420, vx: 0, vy: 0, cd: 0, recoil: 0 }));
    this.targets = [];
    this.spawnT = 0.4;
    this.score = [0, 0];
    this.combo = [0, 0];
    this.maxCombo = [0, 0];
    this.shots = [0, 0];
    this.hits = [0, 0];
    this.bombs = [0, 0];
    this.denies = [0, 0];
    this.golds = [0, 0];
    this.frenzy = false;
    this.banner = null;
    this.holes = [];
  }

  mult(p) {
    return Math.min(4, 1 + Math.floor(this.combo[p] / 5));
  }

  spawn() {
    const d = this.diff;
    const life = rand(2.6, 3.8) - d * 0.6;
    const moving = Math.random() < 0.35 + d * 0.35;
    const mk = (owner, x, y, mirror) => {
      const t = { owner, x, y, r: owner === 'gold' ? 22 : owner === 'bomb' ? 26 : 32, life, max: life, vx: 0, vy: 0, ph: rand(0, TAU), kind: 'still', dead: false };
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
    for (const p of [0, 1]) this.updateAim(p, dt);
    if (this.time >= this.duration) this.end();
  }

  updateAim(p, dt) {
    const a = this.aims[p];
    const inp = this.inputs[p];
    a.cd = Math.max(0, a.cd - dt);
    a.recoil = Math.max(0, a.recoil - dt * 6);
    const ix = inp.axisX(), iy = inp.axisY();
    const len = Math.hypot(ix, iy) || 1;
    const sp = inp.held('b') ? 240 : 640;
    const k = 1 - Math.exp(-18 * dt);
    a.vx += ((ix / len) * sp - a.vx) * k;
    a.vy += ((iy / len) * sp - a.vy) * k;
    a.x = clamp(a.x + a.vx * dt, 20, W - 20);
    a.y = clamp(a.y + a.vy * dt, TOP, H - 16);
    if (inp.pressed('a') && a.cd <= 0) this.shoot(p);
  }

  shoot(p) {
    const a = this.aims[p];
    a.cd = 0.14;
    a.recoil = 1;
    this.shots[p]++;
    this.sfx('shoot', { pitch: p ? 1.15 : 1 });
    // el blanco más cercano bajo la mira (se prioriza el de arriba en la lista: más reciente)
    let hit = null, best = Infinity;
    for (const t of this.targets) {
      const d = Math.hypot(t.x - a.x, t.y - a.y);
      const r = t.r * (0.5 + 0.5 * (t.life / t.max));
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
    if (hit.owner === 'bomb') {
      const pts = 15 * this.scoreMul();
      this.score[p] -= pts;
      this.combo[p] = 0;
      this.bombs[p]++;
      this.sfx('bad');
      this.fx.shake(8);
      this.fx.burst(hit.x, hit.y, ['#9B6CFF', '#2A1F4F', '#FF654F'], 30, { speed: 380 });
      this.fx.float(hit.x, hit.y - 20, `−${pts}`, '#FF654F', 34);
      return;
    }
    if (hit.owner === 1 - p) {
      // robo: destruye el blanco del rival sin sumar ni cortar el combo
      this.denies[p]++;
      this.sfx('pop', { pitch: 0.8 });
      this.fx.burst(hit.x, hit.y, [this.color(1 - p), '#fff'], 14, { speed: 250 });
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
    this.score[p] += pts;
    this.sfx(hit.owner === 'gold' ? 'coin' : 'pop', { pitch: 1 + Math.min(0.6, this.combo[p] * 0.03) });
    if (this.combo[p] % 5 === 0) { this.sfx('combo'); this.fx.float(a.x, a.y - 60, `COMBO x${m}`, '#FFC93C', 26); }
    this.fx.burst(hit.x, hit.y, hit.owner === 'gold' ? ['#FFC93C', '#fff'] : [col, '#fff'], hit.owner === 'gold' ? 28 : 16, { speed: 300 });
    this.fx.ring(hit.x, hit.y, hit.owner === 'gold' ? '#FFC93C' : col, hit.r * 2);
    this.fx.float(hit.x, hit.y - 24, `+${pts}${precise && hit.owner !== 'gold' ? ' ¡CENTRO!' : ''}`, hit.owner === 'gold' ? '#FFC93C' : col, 24);
  }

  end() {
    const [a, b] = this.score;
    const acc = this.shots.map((s, p) => (s ? Math.round((this.hits[p] / s) * 100) : 0));
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Puntos',
      stats: [
        { label: 'Aciertos', values: this.hits.map(String), raw: this.hits, better: 'high' },
        { label: 'Precisión', values: acc.map((v) => v + '%'), raw: acc, better: 'high' },
        { label: 'Combo máximo', values: this.maxCombo.map(String), raw: this.maxCombo, better: 'high' },
        { label: 'Dorados', values: this.golds.map(String), raw: this.golds, better: 'high' },
        { label: 'Robos', values: this.denies.map(String), raw: this.denies, better: 'high' },
        { label: 'Minas tocadas', values: this.bombs.map(String), raw: this.bombs, better: 'low' },
      ],
      records: [a, b],
      flags: this.maxCombo.map((c) => ({ maxCombo: c })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    // galería de tiro
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1A1030');
    bg.addColorStop(1, '#0E0A20');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? 'rgba(155,108,255,0.05)' : 'rgba(255,201,60,0.03)';
      g.fillRect(i * 80, TOP - 10, 80, H);
    }
    g.strokeStyle = 'rgba(255,201,60,0.25)';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 220 + i * 140); g.lineTo(W, 220 + i * 140); g.stroke(); }
    // bombillas de feria
    for (let i = 0; i < 32; i++) {
      const on = Math.sin(t * 6 + i * 0.8) > 0;
      g.fillStyle = on ? '#FFE08A' : '#5A4A2A';
      g.beginPath(); g.arc(20 + i * 40, TOP - 6, 5, 0, TAU); g.fill();
    }
    for (const h of this.holes) {
      g.fillStyle = `rgba(0,0,0,${0.5 * h.a})`;
      g.beginPath(); g.arc(h.x, h.y, 5, 0, TAU); g.fill();
    }
    for (const tg of this.targets) this.drawTarget(g, tg, t);
    for (const p of [0, 1]) this.drawAim(g, p, t);
  }

  drawTarget(g, tg, t) {
    const k = tg.life / tg.max;
    const r = tg.r * (0.5 + 0.5 * k) * (k > 0.92 ? ease.outBack((1 - k) / 0.08) : 1);
    g.save();
    g.translate(tg.x, tg.y);
    g.globalAlpha = Math.min(1, k * 4);
    if (tg.owner === 'bomb') {
      glowCircle(g, 0, 0, r * 2, '#9B6CFF', 0.8);
      g.fillStyle = '#2A1F4F';
      for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); g.beginPath(); g.moveTo(-5, -r * 0.8); g.lineTo(0, -r * 1.2); g.lineTo(5, -r * 0.8); g.fill(); }
      g.fillStyle = '#9B6CFF';
      g.beginPath(); g.arc(0, 0, r * 0.85, 0, TAU); g.fill();
      g.strokeStyle = '#0B1020'; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.3); g.lineTo(r * 0.3, r * 0.3); g.moveTo(r * 0.3, -r * 0.3); g.lineTo(-r * 0.3, r * 0.3); g.stroke();
    } else if (tg.owner === 'gold') {
      glowCircle(g, 0, 0, r * 2.4, '#FFC93C', 1);
      g.fillStyle = '#FFC93C';
      drawStar(g, 0, 0, r * 1.1, r * 0.5, 5, t * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(0, 0, r * 0.25, 0, TAU); g.fill();
    } else {
      const col = this.color(tg.owner);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath(); g.arc(4, 6, r, 0, TAU); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.fillStyle = '#F6F7FB';
      g.beginPath(); g.arc(0, 0, r * 0.68, 0, TAU); g.fill();
      g.fillStyle = col;
      g.beginPath(); g.arc(0, 0, r * 0.4, 0, TAU); g.fill();
      g.fillStyle = '#F6F7FB';
      g.beginPath(); g.arc(0, 0, r * 0.14, 0, TAU); g.fill();
      text(g, `J${tg.owner + 1}`, 0, -r - 10, { size: 12, body: true, weight: 800, color: col });
    }
    // anillo de vida restante
    g.globalAlpha = 0.8;
    g.strokeStyle = tg.owner === 'bomb' ? '#9B6CFF' : 'rgba(246,247,251,0.7)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
    g.restore();
  }

  drawAim(g, p, t) {
    const a = this.aims[p];
    const col = this.color(p);
    const precise = this.inputs[p].held('b');
    const r = (precise ? 14 : 20) + a.recoil * 6;
    g.save();
    g.translate(a.x, a.y);
    if (quality.glow) { g.shadowColor = col; g.shadowBlur = 12; }
    g.strokeStyle = col;
    g.lineWidth = 4;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(dx * (r - 6), dy * (r - 6)); g.lineTo(dx * (r + 12), dy * (r + 12)); }
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
    g.restore();
    drawPortrait(g, a.x + 30, a.y + 30, 12, this.players[p], { t: t + p, ring: 2 });
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.score,
      sub: [0, 1].map((p) => (this.combo[p] ? `Combo ${this.combo[p]} · x${this.mult(p)}` : 'Sin combo')),
      timer: this.remaining,
    });
    this.hudTimeBar(g);
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 3);
      text(g, this.banner.text, W / 2, 380, { size: 80, color: '#fff', glow: this.banner.color, stroke: '#0B1020', alpha: a });
    }
  }
}

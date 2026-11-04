// JUEGO 08 — DUEL ARENA (combate arcade, caricaturesco y sin violencia gráfica)
// Combos de 3 golpes, patada aérea, bloqueo con parry, barra de energía y especial con
// enfriamiento. Al mejor de 3 rondas; gana la ronda quien deja al rival sin energía vital
// o tiene más vida al terminar el tiempo.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, approach, ease } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

const FLOOR = 610;
const STAGES = {
  dojo: { name: 'Dojo Neón', sky: ['#1C1440', '#0E0B24'], floor: '#2A1F4F', platform: null, vents: false },
  roof: { name: 'Azotea', sky: ['#0E2340', '#0A1226'], floor: '#232C4A', platform: { x: 520, y: 450, w: 240 }, vents: false },
  volcano: { name: 'Volcán', sky: ['#3A1420', '#140A12'], floor: '#3A2020', platform: null, vents: true },
};
const ATTACKS = [
  { dmg: 6, start: 0.07, active: 0.09, rec: 0.16, kb: 80, reach: 74, h: 46, y: -62 },
  { dmg: 6, start: 0.07, active: 0.09, rec: 0.18, kb: 100, reach: 80, h: 46, y: -58 },
  { dmg: 11, start: 0.11, active: 0.11, rec: 0.3, kb: 520, reach: 84, h: 56, y: -66, launch: -380 },
];
const AIR = { dmg: 9, start: 0.06, active: 0.18, rec: 0.2, kb: 340, reach: 64, h: 60, y: -36, launch: -200 };
const WORDS = ['¡PAF!', '¡ZAS!', '¡PUM!', '¡BONK!', '¡PLAF!'];

export default class DuelArena extends BaseGame {
  static meta = {
    id: 'arena', num: 8, name: 'DUEL ARENA', short: 'ARENA', category: 'Combate', color: '#FF654F',
    tagline: 'Golpes de dibujito animado, rivalidad de verdad.',
    description: 'Combate 2D por rondas. Encadená hasta 3 golpes, atacá en el aire con una patada, bloqueá (y pulsá bloquear justo antes del impacto para un PARRY). Los golpes cargan tu energía: con ABAJO + ATAQUE lanzás un orbe especial que luego necesita enfriarse.',
    goal: 'Ganá 2 rondas dejando a tu rival sin vida.',
    controls: [
      { actions: ['left', 'right'], label: 'Moverse' },
      { actions: ['up'], label: 'Saltar' },
      { actions: ['a'], label: 'Atacar (combo / aéreo)' },
      { actions: ['b'], label: 'Defender · parry' },
      { actions: ['down', 'a'], label: 'Especial (50% energía)' },
    ],
    events: ['speed', 'lowgrav', 'short', 'mirror', 'invert', 'obstacles'],
    options: [{ key: 'stage', label: 'Escenario', choices: [['random', 'Azar'], ['dojo', 'Dojo'], ['roof', 'Azotea'], ['volcano', 'Volcán']], def: 'random' }],
    record: { label: 'Daño causado en una partida', better: 'higher', format: (v) => `${Math.round(v)} de daño` },
    drawIcon(g, t) {
      const k = (Math.sin(t * 4) + 1) / 2;
      drawCharacter(g, { id: 'brik', x: 64, y: 168, s: 0.95, color: '#3985FF', anim: k > 0.6 ? 'attack' : 'idle', t, shadow: false });
      drawCharacter(g, { id: 'fang', x: 140, y: 168, s: 0.95, color: '#FF654F', anim: k > 0.6 ? 'hurt' : 'block', t, facing: -1, shadow: false });
      if (k > 0.6) { g.fillStyle = '#FFC93C'; drawStar(g, 104, 104, 22, 9, 6, t * 3); g.fill(); }
    },
  };

  init() {
    let sid = this.options.stage ?? 'random';
    if (!STAGES[sid]) sid = choice(Object.keys(STAGES));
    this.stageId = sid;
    this.stage = STAGES[sid];
    this.vents = this.stage.vents || this.extraObstacles;
    this.roundWins = [0, 0];
    this.round = 0;
    this.st = {
      hits: [0, 0], dmg: [0, 0], blocks: [0, 0], parries: [0, 0], specials: [0, 0], flawless: [0, 0],
    };
    this.startRound();
  }

  startRound() {
    this.round++;
    this.roundTime = this.timed(60);
    this.rt = 0;
    this.f = [0, 1].map((p) => ({
      x: p ? 860 : 420, y: FLOOR, vx: 0, vy: 0, w: 46, h: 96, face: p ? -1 : 1, hp: 100, shownHp: 100, en: 0,
      ground: true, atk: null, combo: 0, comboT: 0, stun: 0, block: false, blockT: 0, parryWin: 0, specCd: 0,
      hitFlash: 0, taken: 0, ko: false, anim: 'idle', airUsed: false,
    }));
    this.orbs = [];
    this.ventList = this.vents ? [{ x: 250, t: rand(2, 4), state: 'idle' }, { x: 1030, t: rand(3, 5), state: 'idle' }] : [];
    this.state = 'fight';
    this.endT = 0;
    this.hitStop = 0;
    this.roundWinner = null;
    this.announce = { text: `RONDA ${this.round}`, t: 1.2 };
  }

  ambient(dt) {
    if (this.announce) { this.announce.t -= dt; if (this.announce.t <= 0) this.announce = null; }
    for (const f of this.f) {
      f.shownHp = approach(f.shownHp, f.hp, dt * 40);
      f.hitFlash = Math.max(0, f.hitFlash - dt * 5);
    }
  }

  update(dt) {
    this.ambient(dt);
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    if (this.state === 'fight') {
      this.rt += dt;
      for (const p of [0, 1]) this.control(p, dt);
    } else {
      this.endT += dt;
      if (this.endT > 2.4) {
        if (this.roundWins[0] >= 2 || this.roundWins[1] >= 2 || this.round >= 5) return this.end();
        this.startRound();
        return;
      }
    }
    for (const p of [0, 1]) this.physics(p, dt);
    this.separate();
    this.updateOrbs(dt);
    this.updateVents(dt);
    if (this.state === 'fight') {
      const ko = this.f.map((f) => f.hp <= 0);
      if (ko[0] || ko[1] || this.rt >= this.roundTime) this.endRound(ko);
    }
  }

  control(p, dt) {
    const f = this.f[p], o = this.f[1 - p];
    const inp = this.inputs[p];
    f.stun = Math.max(0, f.stun - dt);
    f.specCd = Math.max(0, f.specCd - dt);
    f.parryWin = Math.max(0, f.parryWin - dt);
    f.comboT = Math.max(0, f.comboT - dt);
    if (f.comboT <= 0) f.combo = 0;
    if (f.stun > 0) { f.block = false; return; }
    // orientar hacia el rival cuando no ataca
    if (!f.atk && f.ground) f.face = o.x > f.x ? 1 : -1;
    // bloqueo
    const wantBlock = inp.held('b') && f.ground && !f.atk;
    if (inp.pressed('b')) f.parryWin = 0.13;
    f.block = wantBlock;
    // ataque / especial (con buffer: una pulsación durante un golpe encadena el siguiente)
    f.queued = Math.max(0, (f.queued || 0) - dt);
    if (inp.pressed('a')) {
      if (!f.atk) this.startAttack(p, inp.held('down'));
      else { f.queued = 0.3; f.queuedDown = inp.held('down'); }
    } else if (!f.atk && f.queued > 0) {
      f.queued = 0;
      this.startAttack(p, f.queuedDown || inp.held('down'));
    }
    // movimiento
    const ax = inp.axisX();
    const canMove = !f.block && !(f.atk && f.ground);
    const target = canMove ? ax * 310 : 0;
    f.vx = approach(f.vx, target, (f.ground ? 2400 : 1200) * dt);
    if (inp.pressed('up') && f.ground && !f.block && !f.atk) {
      f.vy = -780;
      f.ground = false;
      this.sfx('jump');
    }
    // avance del ataque
    if (f.atk) {
      const a = f.atk;
      a.t += dt;
      if (!a.hit && a.t >= a.start && a.t <= a.start + a.active) this.tryHit(p, a);
      if (a.t >= a.start + a.active + a.rec || (a.air && f.ground)) f.atk = null;
    }
  }

  startAttack(p, down) {
    const f = this.f[p];
    if (down && f.en >= 50 && f.specCd <= 0) this.special(p);
    else if (!f.ground && !f.airUsed) { f.atk = { ...AIR, t: 0, hit: false, air: true }; f.airUsed = true; this.sfx('dash'); }
    else if (f.ground) {
      const step = f.combo % 3;
      f.atk = { ...ATTACKS[step], t: 0, hit: false, step };
      f.combo = step + 1;
      f.comboT = 0.6;
      this.sfx('whoosh', { pitch: 1 + step * 0.2 });
      f.vx += f.face * (step === 2 ? 160 : 70);
    }
  }

  hitbox(f, a) {
    const x0 = f.face > 0 ? f.x + f.w * 0.2 : f.x - f.w * 0.2 - a.reach;
    return { x: x0, y: f.y + a.y - a.h / 2, w: a.reach, h: a.h };
  }
  tryHit(p, a) {
    const f = this.f[p], o = this.f[1 - p];
    const hb = this.hitbox(f, a);
    const ob = { x: o.x - o.w / 2, y: o.y - o.h, w: o.w, h: o.h };
    if (hb.x < ob.x + ob.w && hb.x + hb.w > ob.x && hb.y < ob.y + ob.h && hb.y + hb.h > ob.y) {
      a.hit = true;
      this.applyHit(p, a.dmg, a.kb, a.launch || -120, hb.x + hb.w / 2, hb.y + hb.h / 2, a.step === 2 || a.air);
    }
  }

  applyHit(p, dmg, kb, launch, hx, hy, heavy) {
    const f = this.f[p], o = this.f[1 - p];
    const facingAttacker = Math.sign(f.x - o.x) === o.face || (o.x === f.x);
    if (o.parryWin > 0 && o.ground && facingAttacker) {
      // PARRY: el atacante queda aturdido
      o.parryWin = 0;
      f.stun = 0.7;
      f.atk = null;
      f.vx = -f.face * 260;
      o.en = Math.min(100, o.en + 18);
      this.st.parries[1 - p]++;
      this.sfx('smash');
      this.fx.ring(hx, hy, '#FFE45C', 110, 0.5, 6);
      this.fx.float(o.x, o.y - 140, '¡PARRY!', '#FFE45C', 34);
      this.hitStop = 0.12;
      return;
    }
    if (o.block && facingAttacker) {
      const chip = dmg * 0.15;
      o.hp = Math.max(0, o.hp - chip);
      o.taken += chip;
      o.vx = f.face * kb * 0.6;
      o.en = Math.min(100, o.en + 6);
      f.en = Math.min(100, f.en + 4);
      this.st.blocks[1 - p]++;
      this.st.dmg[p] += chip;
      this.sfx('block');
      this.fx.burst(hx, hy, ['#9FD8FF', '#fff'], 10, { speed: 220, gravity: 0, kind: 'spark' });
      this.hitStop = 0.04;
      return;
    }
    o.hp = Math.max(0, o.hp - dmg);
    o.taken += dmg;
    o.stun = heavy ? 0.42 : 0.26;
    o.atk = null;
    o.vx = f.face * kb;
    o.vy = launch;
    o.ground = launch > -150 ? o.ground : false;
    o.hitFlash = 1;
    f.en = Math.min(100, f.en + 12);
    o.en = Math.min(100, o.en + 6);
    this.st.hits[p]++;
    this.st.dmg[p] += dmg;
    this.sfx(heavy ? 'hitHeavy' : 'hit', { pitch: 0.9 + Math.random() * 0.3 });
    this.fx.shake(heavy ? 10 : 5);
    this.hitStop = heavy ? 0.09 : 0.05;
    this.fx.burst(hx, hy, ['#FFC93C', '#fff', this.color(p)], heavy ? 18 : 10, { speed: heavy ? 420 : 300, gravity: 200, kind: 'star', size: 5 });
    if (heavy || Math.random() < 0.35) this.fx.float(hx, hy - 30, choice(WORDS), '#FFE08A', heavy ? 36 : 26);
  }

  special(p) {
    const f = this.f[p];
    f.en -= 50;
    f.specCd = 2.5;
    f.atk = { dmg: 0, start: 0.1, active: 0, rec: 0.3, reach: 0, h: 0, y: 0, t: 0, hit: true, special: true };
    this.st.specials[p]++;
    this.orbs.push({ p, x: f.x + f.face * 50, y: f.y - 60, vx: f.face * 620, life: 1.6, r: 20 });
    this.sfx('boost');
    this.fx.ring(f.x + f.face * 50, f.y - 60, this.color(p), 70);
  }

  updateOrbs(dt) {
    for (const ob of this.orbs) {
      ob.x += ob.vx * dt;
      ob.life -= dt;
      if (Math.random() < 0.7) this.fx.burst(ob.x, ob.y, [this.color(ob.p), '#fff'], 1, { speed: 60, gravity: 0, life: 0.3, size: 6 });
      const o = this.f[1 - ob.p];
      if (!ob.done && Math.abs(ob.x - o.x) < o.w / 2 + ob.r && ob.y > o.y - o.h && ob.y < o.y) {
        ob.done = true;
        ob.life = 0;
        const f = this.f[ob.p];
        const save = f.face;
        f.face = Math.sign(ob.vx);
        this.applyHit(ob.p, 14, 480, -340, ob.x, ob.y, true);
        f.face = save;
      }
    }
    this.orbs = this.orbs.filter((ob) => ob.life > 0 && ob.x > -40 && ob.x < W + 40);
  }

  updateVents(dt) {
    for (const v of this.ventList) {
      v.t -= dt;
      if (v.state === 'idle' && v.t <= 0) { v.state = 'warn'; v.t = 1.0; this.sfx('warn'); }
      else if (v.state === 'warn' && v.t <= 0) { v.state = 'fire'; v.t = 0.5; this.sfx('boost'); this.fx.shake(5); }
      else if (v.state === 'fire') {
        for (const f of this.f) {
          if (Math.abs(f.x - v.x) < 50 && f.y > FLOOR - 200 && !f.vented) {
            f.vented = true;
            f.vy = -900;
            f.ground = false;
            f.hp = Math.max(0, f.hp - 4);
            f.taken += 4;
            f.stun = 0.3;
          }
        }
        if (Math.random() < 0.9) this.fx.burst(v.x + rand(-20, 20), FLOOR, ['#FF8E3C', '#FFC93C', '#FF654F'], 2, { angle: -Math.PI / 2, spread: 0.3, speed: 700, gravity: 300, life: 0.6, size: 7 });
        if (v.t <= 0) { v.state = 'idle'; v.t = rand(3, 6); for (const f of this.f) f.vented = false; }
      }
    }
  }

  physics(p, dt) {
    const f = this.f[p];
    const grav = 2100 * this.gravityScale;
    f.vy += grav * dt;
    const prevY = f.y;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.ground = false;
    if (f.y >= FLOOR) { f.y = FLOOR; f.vy = 0; f.ground = true; }
    const pl = this.stage.platform;
    if (pl && f.vy >= 0 && prevY <= pl.y && f.y >= pl.y && f.x > pl.x && f.x < pl.x + pl.w) { f.y = pl.y; f.vy = 0; f.ground = true; }
    if (f.ground) {
      if (f.airUsed) { f.airUsed = false; }
      if (f.stun <= 0 && !f.atk) f.vx = approach(f.vx, f.vx, 0);
    }
    if (f.ground && f.stun > 0) f.vx = approach(f.vx, 0, 1800 * dt);
    f.x = clamp(f.x, 60, W - 60);
    // animación
    if (f.ko) f.anim = this.state === 'fight' ? 'dizzy' : 'lose';
    else if (this.state === 'roundEnd') f.anim = this.roundWinner === p ? 'win' : this.roundWinner === -1 ? 'idle' : 'lose';
    else if (f.stun > 0) f.anim = 'hurt';
    else if (f.atk) f.anim = 'attack';
    else if (f.block) f.anim = 'block';
    else if (!f.ground) f.anim = 'jump';
    else if (Math.abs(f.vx) > 40) f.anim = 'run';
    else f.anim = 'idle';
  }

  separate() {
    const [a, b] = this.f;
    const minD = (a.w + b.w) / 2;
    const dx = b.x - a.x;
    if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 80) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= s * push;
      b.x += s * push;
    }
  }

  endRound(ko) {
    this.state = 'roundEnd';
    this.endT = 0;
    let w;
    if (ko[0] && ko[1]) w = -1;
    else if (ko[0]) w = 1;
    else if (ko[1]) w = 0;
    else w = Math.abs(this.f[0].hp - this.f[1].hp) < 0.5 ? -1 : this.f[0].hp > this.f[1].hp ? 0 : 1;
    this.roundWinner = w;
    for (const p of [0, 1]) if (ko[p]) this.f[p].ko = true;
    if (w >= 0) {
      this.roundWins[w]++;
      if (this.f[w].taken <= 0) this.st.flawless[w]++;
      this.fx.confetti(this.f[w].x, this.f[w].y - 100, 50, 0.9);
    }
    const isKO = ko[0] || ko[1];
    this.announce = { text: isKO ? 'K.O.' : '¡TIEMPO!', t: 1.6, big: true };
    this.sfx(isKO ? 'hitHeavy' : 'bell');
    if (isKO) { this.fx.flash('#ffffff', 0.5); this.hitStop = 0.3; }
  }

  end() {
    const [a, b] = this.roundWins;
    const S = this.st;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Rondas ganadas',
      banner: '¡COMBATE TERMINADO!',
      stats: [
        { label: 'Golpes conectados', values: S.hits.map(String), raw: S.hits, better: 'high' },
        { label: 'Daño causado', values: S.dmg.map((v) => String(Math.round(v))), raw: S.dmg, better: 'high' },
        { label: 'Bloqueos', values: S.blocks.map(String), raw: S.blocks, better: 'high' },
        { label: 'Parrys', values: S.parries.map(String), raw: S.parries, better: 'high' },
        { label: 'Especiales', values: S.specials.map(String) },
      ],
      records: S.dmg.map((v) => Math.round(v)),
      flags: S.flawless.map((v) => ({ flawless: v })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    const S = this.stage;
    const sky = g.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, S.sky[0]);
    sky.addColorStop(1, S.sky[1]);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    if (this.stageId === 'dojo') {
      for (let i = 0; i < 5; i++) {
        const x = 140 + i * 250;
        g.fillStyle = '#251A52';
        g.fillRect(x - 6, 120, 12, FLOOR - 120);
        glowCircle(g, x, 200, 80, '#FF5FA2', 0.5);
        g.fillStyle = '#FF5FA2';
        roundRect(g, x - 26, 170, 52, 60, 14); g.fill();
        g.fillStyle = '#2A1F4F';
        g.fillRect(x - 26, 196, 52, 4);
      }
      g.strokeStyle = 'rgba(255,95,162,0.3)';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 150); g.quadraticCurveTo(W / 2, 110, W, 150); g.stroke();
    } else if (this.stageId === 'roof') {
      for (let i = 0; i < 18; i++) {
        const bw = 60 + (i * 31) % 50, bh = 120 + (i * 67) % 220, x = i * 74;
        g.fillStyle = '#13213F';
        g.fillRect(x, FLOOR - bh, bw, bh);
        g.fillStyle = 'rgba(37,207,230,0.35)';
        for (let k = 0; k < 5; k++) if ((i + k) % 2) g.fillRect(x + 10, FLOOR - bh + 16 + k * 22, 8, 10);
      }
      glowCircle(g, 1040, 170, 120, '#FFE08A', 0.6);
      g.fillStyle = '#FFF3C9';
      g.beginPath(); g.arc(1040, 170, 44, 0, TAU); g.fill();
    } else {
      g.fillStyle = '#2A0F18';
      g.beginPath(); g.moveTo(200, FLOOR); g.lineTo(560, 200); g.lineTo(720, 200); g.lineTo(1080, FLOOR); g.fill();
      glowCircle(g, 640, 200, 200, '#FF654F', 0.6 + Math.sin(t * 2) * 0.1);
      g.fillStyle = '#FF8E3C';
      g.beginPath(); g.ellipse(640, 204, 80, 14, 0, 0, TAU); g.fill();
    }
    // suelo
    g.fillStyle = S.floor;
    g.fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle = shade(S.floor, 0.25);
    g.fillRect(0, FLOOR, W, 6);
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x - 50, H); g.stroke(); }
    if (S.platform) {
      const pl = S.platform;
      g.fillStyle = '#3B4A7A';
      roundRect(g, pl.x, pl.y, pl.w, 18, 6); g.fill();
      g.fillStyle = '#25CFE6';
      g.fillRect(pl.x + 6, pl.y + 2, pl.w - 12, 3);
    }
    for (const v of this.ventList) {
      g.fillStyle = v.state === 'warn' ? (Math.sin(t * 30) > 0 ? '#FF8E3C' : '#7A2A1A') : '#4A1F1F';
      roundRect(g, v.x - 46, FLOOR - 4, 92, 12, 6); g.fill();
      if (v.state === 'fire') {
        const grd = g.createLinearGradient(0, FLOOR, 0, FLOOR - 260);
        grd.addColorStop(0, 'rgba(255,142,60,0.8)');
        grd.addColorStop(1, 'rgba(255,101,79,0)');
        g.fillStyle = grd;
        g.fillRect(v.x - 40, FLOOR - 260, 80, 260);
      }
    }
    // orbes
    for (const ob of this.orbs) {
      glowCircle(g, ob.x, ob.y, 60, this.color(ob.p), 1);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(ob.x, ob.y, ob.r * 0.6, 0, TAU); g.fill();
      g.strokeStyle = this.color(ob.p); g.lineWidth = 4;
      g.beginPath(); g.arc(ob.x, ob.y, ob.r, 0, TAU); g.stroke();
    }
    // luchadores
    for (const p of [0, 1]) this.drawFighter(g, p, t);
  }

  drawFighter(g, p, t) {
    const f = this.f[p];
    const col = this.color(p);
    if (f.block) {
      g.save();
      g.globalAlpha = 0.35;
      glowCircle(g, f.x + f.face * 24, f.y - 56, 70, '#9FD8FF', 1);
      g.globalAlpha = 0.8;
      g.strokeStyle = '#BFE9FF';
      g.lineWidth = 4;
      g.beginPath(); g.arc(f.x + f.face * 6, f.y - 56, 52, f.face > 0 ? -1 : Math.PI - 1, f.face > 0 ? 1 : Math.PI + 1); g.stroke();
      g.restore();
    }
    drawCharacter(g, { id: this.players[p].char, x: f.x, y: f.y, s: 1.15, color: f.hitFlash > 0.5 ? '#ffffff' : col, anim: f.anim, t: t + p, facing: f.face, acc: this.players[p].acc });
    if (f.atk && !f.atk.special && f.atk.t >= f.atk.start && f.atk.t <= f.atk.start + f.atk.active + 0.05) {
      const a = f.atk;
      const hb = this.hitbox(f, a);
      const cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
      g.save();
      g.strokeStyle = rgba(col, 0.85);
      g.lineWidth = a.step === 2 || a.air ? 10 : 6;
      g.lineCap = 'round';
      g.beginPath();
      if (a.air) g.arc(f.x, f.y - 50, 70, f.face > 0 ? 0 : Math.PI - 1.2, f.face > 0 ? 1.2 : Math.PI);
      else g.arc(f.x, cy, hb.w * 0.9, f.face > 0 ? -0.6 : Math.PI - 0.6, f.face > 0 ? 0.6 : Math.PI + 0.6);
      g.stroke();
      g.restore();
      void cx;
    }
    if (f.stun > 0 && f.ko) {
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * TAU) / 3;
        g.fillStyle = '#FFE45C';
        drawStar(g, f.x + Math.cos(a) * 30, f.y - 118 + Math.sin(a) * 8, 8, 3.5, 5, t * 3); g.fill();
      }
    }
  }

  renderHUD(g) {
    const t = this.realTime;
    for (const p of [0, 1]) {
      const f = this.f[p];
      const col = this.color(p);
      const left = p === 0;
      const bx = left ? 30 : W - 30 - 480;
      panel(g, bx - 10, 14, 500, 92, { r: 22, fill: 'rgba(11,16,32,0.75)', stroke: rgba(col, 0.6) });
      text(g, this.name(p).toUpperCase(), left ? bx + 4 : bx + 476, 32, { size: 17, align: left ? 'left' : 'right', color: '#fff' });
      // victorias de ronda
      for (let i = 0; i < 2; i++) {
        const cx = left ? bx + 300 + i * 26 : bx + 180 - i * 26;
        g.fillStyle = i < this.roundWins[p] ? '#FFC93C' : 'rgba(255,255,255,0.15)';
        drawStar(g, cx, 32, 10, 4.5, 5); g.fill();
      }
      // vida
      const hw = 480;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(g, bx, 48, hw, 22, 11); g.fill();
      const k1 = f.shownHp / 100, k2 = f.hp / 100;
      g.fillStyle = '#FFE0D9';
      if (left) roundRect(g, bx, 48, hw * k1, 22, 11); else roundRect(g, bx + hw * (1 - k1), 48, hw * k1, 22, 11);
      g.fill();
      g.fillStyle = k2 < 0.25 ? '#FF654F' : col;
      if (left) roundRect(g, bx, 48, hw * k2, 22, 11); else roundRect(g, bx + hw * (1 - k2), 48, hw * k2, 22, 11);
      g.fill();
      // energía
      const ew = 300;
      const ex = left ? bx : bx + hw - ew;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(g, ex, 78, ew, 12, 6); g.fill();
      const full = f.en >= 50;
      g.fillStyle = full ? (Math.sin(t * 10) > 0 ? '#FFE45C' : '#FFC93C') : '#9B6CFF';
      if (left) roundRect(g, ex, 78, ew * (f.en / 100), 12, 6); else roundRect(g, ex + ew * (1 - f.en / 100), 78, ew * (f.en / 100), 12, 6);
      g.fill();
      g.fillStyle = 'rgba(11,16,32,0.9)';
      g.fillRect(ex + ew / 2 - 1, 78, 2, 12);
      const cdTxt = f.specCd > 0 ? `ESPECIAL ${f.specCd.toFixed(1)} s` : full ? 'ESPECIAL LISTO' : 'ENERGÍA';
      text(g, cdTxt, left ? ex + ew + 12 : ex - 12, 84, { size: 12, align: left ? 'left' : 'right', body: true, weight: 800, color: full && f.specCd <= 0 ? '#FFE45C' : 'rgba(246,247,251,0.6)' });
    }
    const left = Math.max(0, this.roundTime - this.rt);
    panel(g, W / 2 - 60, 18, 120, 76, { r: 22, fill: 'rgba(11,16,32,0.85)', stroke: left < 10 ? '#FF654F' : 'rgba(155,108,255,0.7)' });
    text(g, String(Math.ceil(left)), W / 2, 50, { size: 38, color: left < 10 ? '#FF8A78' : '#fff' });
    text(g, `R${this.round} · ${this.stage.name}`, W / 2, 80, { size: 11, body: true, weight: 800, color: 'rgba(246,247,251,0.6)' });
    if (this.announce) {
      const k = this.announce.t;
      const a = Math.min(1, k * 3);
      const sc = this.announce.big ? 1.4 : 1;
      text(g, this.announce.text, W / 2, 330, { size: 90 * sc * (0.8 + 0.2 * ease.outBack(Math.min(1, (1.6 - k) * 4))), color: '#fff', glow: '#FF654F', stroke: '#0B1020', strokeWidth: 12, alpha: a });
    }
    if (this.state === 'roundEnd' && this.endT > 1.0) {
      const w = this.roundWinner;
      const msg = w >= 0 ? `${this.name(w).toUpperCase()} GANA LA RONDA` : 'RONDA EMPATADA';
      panel(g, W / 2 - 300, 420, 600, 64, { r: 32, fill: 'rgba(11,16,32,0.9)', stroke: w >= 0 ? this.color(w) : '#8C96B8' });
      text(g, msg, W / 2, 452, { size: 28, color: '#fff' });
    }
  }
}

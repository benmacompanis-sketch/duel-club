// JUEGO 08 — DUEL ARENA (combate arcade, caricaturesco y sin violencia gráfica)
// Combos de 3 golpes, patada aérea, bloqueo con parry, barra de energía y especial con
// enfriamiento. Al mejor de 3 rondas; gana la ronda quien deja al rival sin energía vital
// o tiene más vida al terminar el tiempo.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, approach, ease, comicPanel, halftone, burst } from '../core/utils.js';
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
      f.comboShow = Math.max(0, (f.comboShow || 0) - dt);
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
    // contador de combo: golpes seguidos sin que el rival se recupere
    f.comboN = (f.comboShow > 0 ? f.comboN || 0 : 0) + 1;
    f.comboShow = 1.1;
    o.comboN = 0; o.comboShow = 0;
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
  // cámara: sigue a los dos luchadores y se acerca cuando están cerca (al final de la ronda, al ganador)
  camera(g) {
    const [a, b] = this.f;
    let mx = (a.x + b.x) / 2, z = clamp(1.5 - Math.abs(a.x - b.x) / 1500, 1.16, 1.42);
    if (this.state === 'roundEnd' && this.roundWinner >= 0) { mx = this.f[this.roundWinner].x; z = 1.55; }
    const y0 = FLOOR - (H - 104) / z;
    this.zoomCam(g, mx, y0 + H / (2 * z), z);
  }
  // escenario quieto: se dibuja una vez (en alta resolución, porque la cámara lo agranda) y después se copia
  stageCanvas() {
    if (this._stage?.id === this.stageId) return this._stage.c;
    const k = 2;
    const c = document.createElement('canvas');
    c.width = W * k; c.height = H * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    const S = this.stage, INK = '#0D0B14';
    const sky = g.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, S.sky[0]); sky.addColorStop(1, S.sky[1]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // tramado de historieta en el cielo, más fuerte arriba
    g.fillStyle = halftone(g, 'rgba(255,255,255,0.06)', 12, 2.4); g.fillRect(0, 0, W, FLOOR * 0.6);
    g.lineJoin = 'round';
    if (this.stageId === 'dojo') {
      // cortinas, farolitos de papel y vigas con contorno de tinta
      g.fillStyle = '#3A1E6E'; g.fillRect(0, 96, W, 40);
      g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(-10, 96, W + 20, 40);
      for (let i = 0; i < 5; i++) {
        const x = 140 + i * 250;
        g.fillStyle = '#2A1A58'; g.fillRect(x - 10, 136, 20, FLOOR - 136);
        g.strokeRect(x - 10, 136, 20, FLOOR - 136);
        glowCircle(g, x, 210, 90, '#FF5FA2', 0.55);
        g.fillStyle = '#FF5FA2'; roundRect(g, x - 30, 170, 60, 74, 22); g.fill(); g.stroke();
        g.fillStyle = 'rgba(13,11,20,0.25)'; g.fillRect(x - 30, 196, 60, 5); g.fillRect(x - 30, 218, 60, 5);
        g.fillStyle = '#FFD23F'; g.fillRect(x - 8, 160, 16, 12); g.strokeRect(x - 8, 160, 16, 12);
      }
    } else if (this.stageId === 'roof') {
      glowCircle(g, 1040, 170, 150, '#FFE08A', 0.7);
      g.fillStyle = '#FFF3C9'; g.beginPath(); g.arc(1040, 170, 50, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
      g.fillStyle = 'rgba(13,11,20,0.12)'; g.beginPath(); g.arc(1024, 160, 12, 0, TAU); g.arc(1056, 190, 8, 0, TAU); g.fill();
      for (let i = 0; i < 18; i++) {
        const bw = 60 + (i * 31) % 50, bh = 120 + (i * 67) % 220, x = i * 74;
        g.fillStyle = i % 3 ? '#16264A' : '#1B2E58'; g.fillRect(x, FLOOR - bh, bw, bh);
        g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x, FLOOR - bh, bw, bh);
        g.fillStyle = '#FFE08A';
        for (let k2 = 0; k2 < 6; k2++) if ((i * 7 + k2 * 3) % 4 === 0) g.fillRect(x + 10 + (k2 % 2) * 22, FLOOR - bh + 16 + k2 * 22, 10, 12);
      }
    } else {
      g.fillStyle = '#4A1626';
      g.beginPath(); g.moveTo(140, FLOOR); g.lineTo(540, 210); g.lineTo(740, 210); g.lineTo(1140, FLOOR); g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
      g.fillStyle = halftone(g, 'rgba(13,11,20,0.25)', 10, 2.2);
      g.beginPath(); g.moveTo(640, 210); g.lineTo(740, 210); g.lineTo(1140, FLOOR); g.lineTo(760, FLOOR); g.closePath(); g.fill();
      // ríos de lava
      g.strokeStyle = '#FF8E3C'; g.lineWidth = 10; g.lineCap = 'round';
      g.beginPath(); g.moveTo(620, 214); g.quadraticCurveTo(590, 360, 520, FLOOR - 20); g.moveTo(680, 214); g.quadraticCurveTo(730, 380, 800, FLOOR - 10); g.stroke();
    }
    // piso: tablones en perspectiva con borde de tinta grueso
    g.fillStyle = S.floor; g.fillRect(0, FLOOR, W, H - FLOOR);
    g.fillStyle = halftone(g, 'rgba(13,11,20,0.28)', 9, 2); g.fillRect(0, FLOOR, W, H - FLOOR);
    g.strokeStyle = 'rgba(13,11,20,0.55)'; g.lineWidth = 3;
    g.beginPath();
    for (let x = -200; x < W + 200; x += 90) { g.moveTo(x, FLOOR); g.lineTo(W / 2 + (x - W / 2) * 1.8, H); }
    g.moveTo(0, FLOOR + 40); g.lineTo(W, FLOOR + 40);
    g.stroke();
    g.fillStyle = shade(S.floor, 0.35); g.fillRect(0, FLOOR, W, 8);
    g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(W, FLOOR); g.stroke();
    this._stage = { id: this.stageId, c };
    return c;
  }
  render(g) {
    const t = this.realTime;
    const S = this.stage;
    g.drawImage(this.stageCanvas(), 0, 0, W, H);
    if (this.stageId === 'volcano') glowCircle(g, 640, 210, 220, '#FF654F', 0.55 + Math.sin(t * 2) * 0.12);
    if (S.platform) {
      const pl = S.platform;
      g.fillStyle = '#3B4A7A';
      roundRect(g, pl.x, pl.y, pl.w, 20, 4); g.fill();
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.stroke();
      g.fillStyle = '#25CFE6';
      g.fillRect(pl.x + 6, pl.y + 3, pl.w - 12, 4);
    }
    for (const v of this.ventList) {
      g.fillStyle = v.state === 'warn' ? (Math.sin(t * 30) > 0 ? '#FF8E3C' : '#7A2A1A') : '#4A1F1F';
      roundRect(g, v.x - 46, FLOOR - 4, 92, 12, 4); g.fill();
      g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.stroke();
      if (v.state === 'fire') {
        const grd = g.createLinearGradient(0, FLOOR, 0, FLOOR - 260);
        grd.addColorStop(0, 'rgba(255,142,60,0.85)');
        grd.addColorStop(1, 'rgba(255,101,79,0)');
        g.fillStyle = grd;
        g.fillRect(v.x - 40, FLOOR - 260, 80, 260);
      }
      if (v.state === 'warn') text(g, '¡!', v.x, FLOOR - 40, { size: 30, color: '#FFD23F' });
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
      const bx = left ? 22 : W - 22 - 500;
      // panel de historieta del color del jugador
      comicPanel(g, bx, 10, 500, 96, shade(col, -0.5), { skew: left ? 12 : -12, tilt: left ? 3 : -3, dotColor: rgba(col, 0.3) });
      text(g, this.name(p).toUpperCase(), left ? bx + 26 : bx + 474, 30, { size: 20, align: left ? 'left' : 'right', color: '#fff' });
      // rondas ganadas: estrellas
      for (let i = 0; i < 2; i++) {
        const cx = left ? bx + 440 - i * 30 : bx + 60 + i * 30;
        g.fillStyle = i < this.roundWins[p] ? '#FFD23F' : 'rgba(13,11,20,0.6)';
        drawStar(g, cx, 30, 12, 5.5, 5); g.fill();
        g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.stroke();
      }
      // vida: barra gruesa con tinta, la parte perdida queda clara un momento
      const hw = 450, hx = left ? bx + 24 : bx + 26, hy = 46;
      g.fillStyle = '#15121F'; g.fillRect(hx, hy, hw, 26);
      const k1 = f.shownHp / 100, k2 = f.hp / 100;
      g.fillStyle = '#FFF4E0';
      if (left) g.fillRect(hx, hy, hw * k1, 26); else g.fillRect(hx + hw * (1 - k1), hy, hw * k1, 26);
      g.fillStyle = k2 < 0.25 ? (Math.sin(t * 12) > 0 ? '#FF3B5C' : '#FF654F') : col;
      if (left) g.fillRect(hx, hy, hw * k2, 26); else g.fillRect(hx + hw * (1 - k2), hy, hw * k2, 26);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      if (left) g.fillRect(hx, hy + 3, hw * k2, 6); else g.fillRect(hx + hw * (1 - k2), hy + 3, hw * k2, 6);
      g.lineWidth = 4; g.strokeStyle = '#0D0B14'; g.strokeRect(hx, hy, hw, 26);
      // energía (para el especial)
      const ew = 260, ex = left ? hx : hx + hw - ew, ey = 80;
      const full = f.en >= 50;
      g.fillStyle = '#15121F'; g.fillRect(ex, ey, ew, 14);
      g.fillStyle = full ? (Math.sin(t * 10) > 0 ? '#FFE45C' : '#FFC93C') : '#B49BFF';
      if (left) g.fillRect(ex, ey, ew * (f.en / 100), 14); else g.fillRect(ex + ew * (1 - f.en / 100), ey, ew * (f.en / 100), 14);
      g.fillStyle = '#0D0B14'; g.fillRect(ex + ew / 2 - 1.5, ey, 3, 14);
      g.lineWidth = 3; g.strokeStyle = '#0D0B14'; g.strokeRect(ex, ey, ew, 14);
      const cdTxt = f.specCd > 0 ? `ESPECIAL ${f.specCd.toFixed(1)} s` : full ? '¡ESPECIAL LISTO!' : 'ENERGÍA';
      text(g, cdTxt, left ? ex + ew + 10 : ex - 10, ey + 7, { size: 13, align: left ? 'left' : 'right', body: true, weight: 900, color: full && f.specCd <= 0 ? '#FFE45C' : '#FFF4E0' });
      // combo en curso
      if (f.comboShow > 0 && f.comboN >= 2) {
        const a = Math.min(1, f.comboShow * 3);
        const cx = left ? 150 : W - 150;
        burst(g, cx, 150, 46, col, { points: 12, rot: t, inner: 0.75, sx: 1.4, alpha: a });
        text(g, `${f.comboN} GOLPES`, cx, 152, { size: 24, color: '#fff', alpha: a });
      }
    }
    const left = Math.max(0, this.roundTime - this.rt);
    const low = left <= 10;
    const pulse = low ? 1 + Math.max(0, Math.sin(t * 10)) * 0.08 : 1;
    burst(g, W / 2, 50, 50 * pulse, low ? '#FF4B3E' : '#FFD23F', { points: 12, rot: t * 0.3, inner: 0.8, sx: 1.35 });
    text(g, String(Math.ceil(left)), W / 2, 50, { size: 38 * pulse, color: low ? '#fff' : '#15121F', comic: low });
    comicPanel(g, W / 2 - 70, 100, 140, 26, '#15121F', { skew: 8, dots: false, line: 3 });
    text(g, `RONDA ${this.round} · ${this.stage.name.toUpperCase()}`, W / 2, 113, { size: 12, body: true, weight: 900, color: '#FFF4E0' });
    if (this.announce) {
      const k = this.announce.t;
      const a = Math.min(1, k * 3);
      const intro = Math.min(1, ((this.announce.big ? 1.6 : 1.2) - k) * 4);
      this.callout(g, this.announce.text, { y: 300, size: this.announce.big ? 96 : 70, k: intro, alpha: a, color: this.announce.big ? '#FF3B5C' : '#FFD23F', rot: -0.06 });
    }
    if (this.state === 'roundEnd' && this.endT > 1.0) {
      const w = this.roundWinner;
      const msg = w >= 0 ? `¡${this.name(w).toUpperCase()} GANA LA RONDA!` : 'RONDA EMPATADA';
      this.callout(g, msg, { y: 470, size: 34, k: (this.endT - 1) * 3, color: w >= 0 ? this.color(w) : '#FFD23F' });
    }
  }
}

// JUEGO 13 — SHADOW SNEAK (estrategia/sigilo)
// Laberinto a oscuras y simétrico. Cada jugador lleva su propia luz. Recogé cristales, agarrá la
// LINTERNA para volverte cazador y atrapar al rival (le robás cristales), usá el sprint y dejá
// trampas de sombra que frenan a quien las pisa. Gana quien tenga más cristales al final.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, mulberry32 } from '../core/utils.js';

const COLS = 25, ROWS = 13, CELL = 44;
const OX = (W - COLS * CELL) / 2, OY = 118;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export default class ShadowSneak extends BaseGame {
  static meta = {
    id: 'sneak', num: 13, name: 'SHADOW SNEAK', short: 'SNEAK', category: 'Sigilo', color: '#6F7CFF', isNew: true,
    tagline: 'Un laberinto a oscuras, cristales y una linterna que lo cambia todo.',
    description: 'Movete por el laberinto y juntá cristales (los dorados valen 3). Solo ves lo que ilumina tu luz. Si agarrás la LINTERNA te volvés cazador unos segundos: tocá al rival para robarle 3 cristales. ACCIÓN 1 = sprint. ACCIÓN 2 = trampa de sombra que frena al que la pise.',
    goal: 'Tener más cristales cuando se acaba el tiempo.',
    controls: [{ actions: ['up', 'down', 'left', 'right'], label: 'Moverse' }, { actions: ['a'], label: 'Sprint' }, { actions: ['b'], label: 'Trampa de sombra' }],
    events: ['speed', 'short', 'mirror', 'invert', 'double', 'obstacles'],
    options: [{ key: 'time', label: 'Duración', choices: [[60, '60 s'], [90, '90 s'], [120, '120 s']], def: 90 }],
    record: { label: 'Cristales en una partida', better: 'higher', format: (v) => `${v} cristales` },
    drawIcon(g, t) {
      g.fillStyle = '#121735'; g.fillRect(10, 10, 180, 180);
      g.strokeStyle = '#6F7CFF'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(30, 40); g.lineTo(170, 40); g.moveTo(30, 100); g.lineTo(110, 100); g.moveTo(170, 100); g.lineTo(150, 100); g.moveTo(30, 160); g.lineTo(170, 160); g.moveTo(100, 40); g.lineTo(100, 70); g.stroke();
      glowCircle(g, 60 + Math.sin(t * 2) * 20, 130, 60, '#FFE9A8', 0.35);
      g.fillStyle = '#7CF7FF';
      for (const [x, y] of [[140, 70], [60, 70], [140, 130]]) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); }
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 90);
    const rng = mulberry32((Math.random() * 1e9) | 0);
    this.rng = rng;
    this.buildMaze(rng);
    const sp = 5.0 + this.diff * 0.7;
    this.pl = [0, 1].map((p) => {
      const cx = p ? COLS - 1 : 0, cy = p ? 0 : ROWS - 1;
      return { p, x: cx, y: cy, dir: [0, 0], want: [0, 0], speed: sp, gems: 0, sprint: 0, sprintCd: 0, trapCd: 0, hunter: 0, slow: 0, stun: 0, face: p ? -1 : 1, caught: 0, catches: 0, sprints: 0, collected: 0 };
    });
    this.gems = [];
    this.traps = [];
    this.lantern = null;
    this.lanternT = 9;
    this.light = 235 - this.diff * 30;
    this.spawnGems(10);
    if (this.extraObstacles) this.lanternT = 5;
  }

  // ------------------------------------------------------------------ laberinto simétrico
  buildMaze(rng) {
    // muros: wallR[y][x] = muro a la derecha de la celda, wallD[y][x] = muro debajo
    const half = Math.ceil(COLS / 2);
    const wallR = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
    const wallD = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
    const seen = Array.from({ length: ROWS }, () => Array(half).fill(false));
    const stack = [[0, 0]];
    seen[0][0] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < half && ny >= 0 && ny < ROWS && !seen[ny][nx];
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = opts[Math.floor(rng() * opts.length)];
      const nx = x + dx, ny = y + dy;
      if (dx === 1) wallR[y][x] = false; else if (dx === -1) wallR[y][nx] = false;
      else if (dy === 1) wallD[y][x] = false; else wallD[ny][x] = false;
      seen[ny][nx] = true;
      stack.push([nx, ny]);
    }
    // bucles extra para que haya rutas alternativas
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rng() * (half - 1)), y = Math.floor(rng() * ROWS);
      if (rng() < 0.5) wallR[y][x] = false; else if (y < ROWS - 1) wallD[y][x] = false;
    }
    // conectar el centro y espejar la mitad izquierda
    for (let y = 0; y < ROWS; y++) {
      if (y % 3 === 1 || y === Math.floor(ROWS / 2)) wallR[y][half - 2] = false;
      for (let x = 0; x < half; x++) {
        const mx = COLS - 1 - x;
        wallD[y][mx] = wallD[y][x];
        if (x < half - 1) wallR[y][mx - 1] = wallR[y][x];
      }
    }
    this.wallR = wallR;
    this.wallD = wallD;
  }
  open(x, y, dx, dy) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return false;
    if (dx === 1) return !this.wallR[y][x];
    if (dx === -1) return !this.wallR[y][nx];
    if (dy === 1) return !this.wallD[y][x];
    if (dy === -1) return !this.wallD[ny][x];
    return false;
  }

  spawnGems(n) {
    // de a pares espejados: el reparto es justo para los dos
    const taken = new Set(this.gems.map((g) => g.x + ',' + g.y));
    for (let i = 0; i < n; i += 2) {
      let tries = 0;
      while (tries++ < 40) {
        const x = Math.floor(rand(1, Math.floor(COLS / 2))), y = Math.floor(rand(0, ROWS));
        const mx = COLS - 1 - x;
        if (taken.has(x + ',' + y) || taken.has(mx + ',' + y)) continue;
        if (this.pl.some((pl) => Math.hypot(pl.x - x, pl.y - y) < 3 || Math.hypot(pl.x - mx, pl.y - y) < 3)) continue;
        const gold = Math.random() < 0.18;
        this.gems.push({ x, y, gold, t: rand(0, 6) }, { x: mx, y, gold, t: rand(0, 6) });
        taken.add(x + ',' + y); taken.add(mx + ',' + y);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ actualización
  update(dt) {
    if (this.time >= this.duration) return this.end();
    for (const pl of this.pl) this.updatePlayer(pl, dt);
    // linterna en el centro cada tanto
    if (!this.lantern && !this.pl.some((p) => p.hunter > 0)) {
      this.lanternT -= dt;
      if (this.lanternT <= 0) {
        this.lantern = { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2), t: 0 };
        this.sfx('alarm');
        this.fx.float(this.cx(this.lantern.x), this.cy(this.lantern.y) - 30, '¡LINTERNA!', '#FFE9A8', 26);
      }
    }
    if (this.gems.length < 8) this.spawnGems(6);
    // trampas
    for (const tr of this.traps) tr.t -= dt;
    this.traps = this.traps.filter((tr) => tr.t > 0);
    // contacto entre jugadores
    const [a, b] = this.pl;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.55) {
      const hunter = a.hunter > 0 && b.hunter <= 0 ? a : b.hunter > 0 && a.hunter <= 0 ? b : null;
      if (hunter) this.capture(hunter, hunter === a ? b : a);
    }
  }
  updatePlayer(pl, dt) {
    const inp = this.inputs[pl.p];
    pl.sprintCd = Math.max(0, pl.sprintCd - dt);
    pl.trapCd = Math.max(0, pl.trapCd - dt);
    pl.sprint = Math.max(0, pl.sprint - dt);
    pl.slow = Math.max(0, pl.slow - dt);
    pl.hunter = Math.max(0, pl.hunter - dt);
    if (pl.stun > 0) { pl.stun -= dt; return; }
    for (const [k, d] of Object.entries(DIRS)) if (inp.held(k)) pl.want = d;
    if (inp.pressed('a') && pl.sprintCd <= 0) {
      pl.sprint = 0.9; pl.sprintCd = 3.2; pl.sprints++;
      this.sfx('dash');
      this.fx.burst(this.cx(pl.x), this.cy(pl.y), this.color(pl.p), 10, { speed: 160 });
    }
    if (inp.pressed('b') && pl.trapCd <= 0) {
      pl.trapCd = 6;
      this.traps.push({ x: Math.round(pl.x), y: Math.round(pl.y), owner: pl.p, t: 9 });
      this.sfx('whoosh');
    }
    let speed = pl.speed * (pl.sprint > 0 ? 1.75 : 1) * (pl.slow > 0 ? 0.45 : 1) * (pl.hunter > 0 ? 1.12 : 1);
    let move = speed * dt;
    let guard = 0;
    while (move > 1e-6 && guard++ < 8) {
      const cx = Math.round(pl.x), cy = Math.round(pl.y);
      const atCenter = Math.abs(pl.x - cx) < 1e-4 && Math.abs(pl.y - cy) < 1e-4;
      // girar en el lugar o dar media vuelta en cualquier momento
      if (pl.want[0] === -pl.dir[0] && pl.want[1] === -pl.dir[1] && (pl.dir[0] || pl.dir[1])) pl.dir = pl.want;
      if (atCenter) {
        pl.x = cx; pl.y = cy;
        this.atCell(pl, cx, cy);
        if ((pl.want[0] || pl.want[1]) && this.open(cx, cy, pl.want[0], pl.want[1])) pl.dir = pl.want;
        else if (!this.open(cx, cy, pl.dir[0], pl.dir[1])) { pl.dir = [0, 0]; break; }
      }
      if (!pl.dir[0] && !pl.dir[1]) break;
      if (pl.dir[0]) pl.face = pl.dir[0];
      // distancia hasta el próximo centro de celda en la dirección actual
      const along = pl.dir[0] ? pl.x : pl.y;
      const target = pl.dir[0] + pl.dir[1] > 0 ? Math.floor(along + 1e-6) + 1 : Math.ceil(along - 1e-6) - 1;
      const dist = Math.abs(target - along);
      const step = Math.min(move, dist);
      pl.x += pl.dir[0] * step;
      pl.y += pl.dir[1] * step;
      move -= step;
      if (step >= dist - 1e-6) { pl.x = Math.round(pl.x); pl.y = Math.round(pl.y); }
    }
  }
  atCell(pl, x, y) {
    const i = this.gems.findIndex((g) => g.x === x && g.y === y);
    if (i >= 0) {
      const gm = this.gems[i];
      const v = (gm.gold ? 3 : 1) * this.scoreMul();
      pl.gems += v;
      pl.collected += v;
      this.gems.splice(i, 1);
      this.sfx(gm.gold ? 'coin' : 'point', { pitch: gm.gold ? 1 : 1 + Math.random() * 0.2 });
      this.fx.burst(this.cx(x), this.cy(y), gm.gold ? '#FFD16B' : '#7CF7FF', gm.gold ? 18 : 8, { speed: 150 });
      this.fx.float(this.cx(x), this.cy(y) - 18, `+${v}`, gm.gold ? '#FFD16B' : '#BFFAFF', 22);
    }
    if (this.lantern && this.lantern.x === x && this.lantern.y === y) {
      this.lantern = null;
      pl.hunter = 7;
      this.lanternT = rand(10, 14);
      this.sfx('boost');
      this.fx.flash('#FFE9A8', 0.25);
      this.fx.float(this.cx(x), this.cy(y) - 30, `¡${this.name(pl.p).toUpperCase()} CAZA!`, this.color(pl.p), 26);
    }
    const tr = this.traps.find((t) => t.x === x && t.y === y && t.owner !== pl.p);
    if (tr) {
      tr.t = 0;
      pl.slow = 2.2;
      this.sfx('block');
      this.fx.burst(this.cx(x), this.cy(y), '#2A2F55', 16, { speed: 120 });
    }
  }
  capture(h, prey) {
    const stolen = Math.min(3, prey.gems);
    prey.gems -= stolen;
    h.gems += stolen;
    prey.caught++;
    h.catches++;
    h.hunter = 0;
    prey.stun = 1.1;
    // la presa vuelve a su esquina
    prey.x = prey.p ? COLS - 1 : 0; prey.y = prey.p ? 0 : ROWS - 1; prey.dir = [0, 0];
    this.sfx('hitHeavy');
    this.fx.shake(10);
    this.fx.flash(this.color(h.p), 0.3);
    this.fx.float(this.cx(h.x), this.cy(h.y) - 30, stolen ? `¡ATRAPADO! +${stolen}` : '¡ATRAPADO!', '#fff', 30);
  }
  end() {
    const [a, b] = this.pl.map((p) => p.gems);
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      scoreLabel: 'Cristales',
      stats: [
        { label: 'Cristales juntados', values: this.pl.map((p) => String(p.collected)), raw: this.pl.map((p) => p.collected), better: 'high' },
        { label: 'Capturas', values: this.pl.map((p) => String(p.catches)), raw: this.pl.map((p) => p.catches), better: 'high' },
        { label: 'Veces atrapado', values: this.pl.map((p) => String(p.caught)), raw: this.pl.map((p) => p.caught), better: 'low' },
        { label: 'Sprints', values: this.pl.map((p) => String(p.sprints)) },
      ],
      records: [a, b],
      flags: this.pl.map((p) => ({ caught: p.caught, catches: p.catches })),
      margin: Math.abs(a - b),
    });
  }

  // ------------------------------------------------------------------ dibujo
  cx(x) { return OX + x * CELL + CELL / 2; }
  cy(y) { return OY + y * CELL + CELL / 2; }
  render(g) {
    const t = this.realTime;
    this.arenaBG(g, '#0C1030', '#070A18');
    // suelo
    g.fillStyle = '#121735';
    roundRect(g, OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, 14); g.fill();
    this.grid(g, OX, OY, COLS * CELL, ROWS * CELL, CELL, 'rgba(111,124,255,0.06)');
    // trampas
    for (const tr of this.traps) {
      const a = Math.min(1, tr.t);
      g.fillStyle = `rgba(20,22,48,${0.85 * a})`;
      g.beginPath(); g.arc(this.cx(tr.x), this.cy(tr.y), 16 + Math.sin(t * 5) * 2, 0, TAU); g.fill();
      g.strokeStyle = rgba(this.color(tr.owner), 0.5 * a); g.lineWidth = 2; g.stroke();
    }
    // cristales
    for (const gm of this.gems) this.drawGem(g, gm, t);
    if (this.lantern) {
      const x = this.cx(this.lantern.x), y = this.cy(this.lantern.y);
      glowCircle(g, x, y, 60 + Math.sin(t * 6) * 8, '#FFE9A8', 0.5);
      g.fillStyle = '#FFE9A8'; roundRect(g, x - 8, y - 12, 16, 22, 5); g.fill();
      g.fillStyle = '#6F5A1C'; g.fillRect(x - 9, y - 15, 18, 4);
    }
    // muros
    g.strokeStyle = '#6F7CFF'; g.lineWidth = 6; g.lineCap = 'round';
    if (quality.glow) { g.shadowColor = '#6F7CFF'; g.shadowBlur = 10; }
    g.beginPath();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const X = OX + x * CELL, Y = OY + y * CELL;
      if (this.wallR[y][x] && x < COLS - 1) { g.moveTo(X + CELL, Y); g.lineTo(X + CELL, Y + CELL); }
      if (this.wallD[y][x] && y < ROWS - 1) { g.moveTo(X, Y + CELL); g.lineTo(X + CELL, Y + CELL); }
    }
    g.rect(OX, OY, COLS * CELL, ROWS * CELL);
    g.stroke();
    g.shadowBlur = 0;
    // jugadores
    for (const pl of this.pl) {
      const x = this.cx(pl.x), y = this.cy(pl.y);
      if (pl.hunter > 0) glowCircle(g, x, y, 54 + Math.sin(t * 10) * 6, '#FFE9A8', 0.45);
      const moving = pl.dir[0] || pl.dir[1];
      drawCharacter(g, { id: this.players[pl.p].char, x, y: y + 16, s: 0.36, color: this.color(pl.p), anim: pl.stun > 0 ? 'dizzy' : moving ? 'run' : 'idle', t: t + pl.p, facing: pl.face, acc: this.players[pl.p].acc, shadow: false });
      if (pl.slow > 0) this.label(g, x, y - 30, 'LENTO', '#2A2F55');
    }
    // oscuridad: solo se ve alrededor de cada jugador (igual para los dos)
    this.renderDark(g, t);
    // los cristales dorados brillan apenas a través de la oscuridad
    for (const gm of this.gems) if (gm.gold) glowCircle(g, this.cx(gm.x), this.cy(gm.y), 22, '#FFD16B', 0.18);
    if (this.lantern) glowCircle(g, this.cx(this.lantern.x), this.cy(this.lantern.y), 40, '#FFE9A8', 0.35);
    this.vignette(g);
  }
  drawGem(g, gm, t) {
    const x = this.cx(gm.x), y = this.cy(gm.y) + Math.sin(t * 3 + gm.t) * 3;
    const col = gm.gold ? '#FFD16B' : '#7CF7FF';
    glowCircle(g, x, y, gm.gold ? 26 : 18, col, 0.4);
    g.save(); g.translate(x, y); g.rotate(Math.PI / 4 + Math.sin(t * 2 + gm.t) * 0.2);
    g.fillStyle = col; const s = gm.gold ? 9 : 7; g.fillRect(-s, -s, s * 2, s * 2);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-s, -s, s, s * 0.6);
    g.restore();
  }
  renderDark(g, t) {
    if (!this._dark) {
      this._dark = document.createElement('canvas');
      this._dark.width = W; this._dark.height = H;
    }
    const d = this._dark.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(4,6,16,0.9)';
    d.fillRect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16);
    d.globalCompositeOperation = 'destination-out';
    for (const pl of this.pl) {
      const r = this.light * (pl.hunter > 0 ? 1.35 : 1) + Math.sin(t * 3 + pl.p) * 4;
      const x = this.cx(pl.x), y = this.cy(pl.y);
      const grd = d.createRadialGradient(x, y, r * 0.55, x, y, r);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = grd;
      d.beginPath(); d.arc(x, y, r, 0, TAU); d.fill();
    }
    g.drawImage(this._dark, 0, 0);
    // tinte de la luz de cada jugador
    for (const pl of this.pl) glowCircle(g, this.cx(pl.x), this.cy(pl.y), this.light * 0.8, this.color(pl.p), 0.08);
  }
  renderHUD(g) {
    const t = this.realTime;
    this.hudTop(g, { scores: this.pl.map((p) => p.gems), timer: this.remaining, sub: this.pl.map((p) => (p.hunter > 0 ? `CAZADOR · ${p.hunter.toFixed(1)} s` : `Sprint ${p.sprintCd > 0 ? p.sprintCd.toFixed(1) + ' s' : 'LISTO'} · Trampa ${p.trapCd > 0 ? Math.ceil(p.trapCd) + ' s' : 'LISTA'}`)) });
    this.hudTimeBar(g, 86);
    if (this.pl.some((p) => p.hunter > 0)) {
      const h = this.pl.find((p) => p.hunter > 0);
      const a = 0.6 + Math.sin(t * 8) * 0.4;
      panel(g, W / 2 - 170, H - 40, 340, 30, { r: 15, fill: 'rgba(11,16,32,0.8)', stroke: '#FFE9A8' });
      text(g, `¡${this.name(h.p).toUpperCase()} ES EL CAZADOR!`, W / 2, H - 25, { size: 15, color: '#FFE9A8', alpha: a, body: true, weight: 800 });
    }
  }
}

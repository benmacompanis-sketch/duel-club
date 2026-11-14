// JUEGO 12 — BLOCK BATTLE (lógica y velocidad)
// Puzzle competitivo de piezas que caen, con identidad propia (bloques de cristal neón).
// Misma secuencia de piezas para ambos (bolsa de 7 con semilla). Completar líneas y encadenar
// combos envía filas de ataque al rival; limpiar líneas cancela las que te llegan.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, mulberry32, newSeed, shuffle, ease } from '../core/utils.js';

const COLS = 10, ROWS = 22, HIDDEN = 2, CELL = 27;
const KINDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const SHAPES = {
  I: { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 4, c: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
const COLORS = { I: '#25CFE6', O: '#FFC93C', T: '#9B6CFF', S: '#48D597', Z: '#FF5FA2', J: '#3985FF', L: '#FF8E3C', G: '#59627F' };
const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
const CLEAR_PTS = [0, 100, 300, 500, 800];
const ATTACK = [0, 0, 1, 2, 4];
const CLEAR_NAMES = ['', 'SIMPLE', 'DOBLE', 'TRIPLE', '¡CUÁDRUPLE!'];

function rotateCells(cells, n, dir) {
  return cells.map(([x, y]) => (dir > 0 ? [n - 1 - y, x] : [y, n - 1 - x]));
}

class Board {
  constructor(game, p, seed) {
    this.game = game;
    this.p = p;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.rng = mulberry32(seed); // secuencia de piezas (idéntica para ambos)
    this.holeRng = mulberry32(seed ^ 0x5bd1e995); // agujeros de basura: no altera la secuencia de piezas
    this.bag = [];
    this.queue = [];
    for (let i = 0; i < 5; i++) this.queue.push(this.draw());
    this.hold = null;
    this.canHold = true;
    this.piece = null;
    this.fallT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.das = { dir: 0, t: 0 };
    this.score = 0;
    this.lines = 0;
    this.combo = -1;
    this.maxCombo = 0;
    this.sent = 0;
    this.incoming = 0;
    this.quads = 0;
    this.pieces = 0;
    this.dead = false;
    this.flashRows = [];
    this.shake = 0;
    this.popup = null;
    this.spawn();
  }
  draw() {
    if (!this.bag.length) this.bag = shuffle(KINDS, this.rng);
    return this.bag.pop();
  }
  spawn(kind = null) {
    const k = kind || this.queue.shift();
    if (!kind) this.queue.push(this.draw());
    const s = SHAPES[k];
    const top = Math.min(...s.c.map((c) => c[1]));
    // aparece justo en la primera fila visible para que se vea al instante
    this.piece = { k, cells: s.c.map((c) => c.slice()), n: s.n, x: 3, y: HIDDEN - top };
    this.fallT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    if (this.collides(this.piece.cells, this.piece.x, this.piece.y)) {
      this.dead = true;
      this.piece = null;
    }
  }
  collides(cells, x, y) {
    for (const [cx, cy] of cells) {
      const gx = x + cx, gy = y + cy;
      if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
      if (gy >= 0 && this.grid[gy][gx]) return true;
    }
    return false;
  }
  move(dx) {
    const pc = this.piece;
    if (!pc || this.collides(pc.cells, pc.x + dx, pc.y)) return false;
    pc.x += dx;
    this.touchLock();
    return true;
  }
  rotate(dir) {
    const pc = this.piece;
    if (!pc || pc.k === 'O') return false;
    const rc = rotateCells(pc.cells, pc.n, dir);
    for (const [kx, ky] of KICKS) {
      if (!this.collides(rc, pc.x + kx, pc.y + ky)) {
        pc.cells = rc;
        pc.x += kx;
        pc.y += ky;
        this.touchLock();
        return true;
      }
    }
    return false;
  }
  touchLock() {
    if (this.lockT > 0 && this.lockResets < 15) { this.lockT = 0; this.lockResets++; }
  }
  grounded() {
    const pc = this.piece;
    return pc && this.collides(pc.cells, pc.x, pc.y + 1);
  }
  ghostY() {
    const pc = this.piece;
    let y = pc.y;
    while (!this.collides(pc.cells, pc.x, y + 1)) y++;
    return y;
  }
  hardDrop() {
    const pc = this.piece;
    if (!pc) return;
    const gy = this.ghostY();
    this.score += (gy - pc.y) * 2;
    pc.y = gy;
    this.lock(true);
  }
  holdPiece() {
    if (!this.canHold || !this.piece) return false;
    const cur = this.piece.k;
    if (this.hold) this.spawn(this.hold);
    else this.spawn();
    this.hold = cur;
    this.canHold = false;
    return true;
  }
  lock(hard = false) {
    const pc = this.piece;
    const g = this.game;
    for (const [cx, cy] of pc.cells) {
      const gy = pc.y + cy;
      if (gy >= 0) this.grid[gy][pc.x + cx] = pc.k;
    }
    this.pieces++;
    if (hard) this.shake = 1;
    // limpiar líneas
    const full = [];
    for (let r = 0; r < ROWS; r++) if (this.grid[r].every((c) => c)) full.push(r);
    const n = full.length;
    if (n) {
      for (const r of full) {
        this.grid.splice(r, 1);
        this.grid.unshift(Array(COLS).fill(null));
      }
      this.flashRows = full.map((r) => ({ r, t: 0.35 }));
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.lines += n;
      if (n === 4) this.quads++;
      const lvl = g.level;
      const pts = (CLEAR_PTS[n] * lvl + Math.max(0, this.combo) * 50 * lvl) * g.scoreMul();
      this.score += pts;
      // ataque = líneas según tipo + bonus de combo
      let atk = ATTACK[n] + (this.combo >= 2 ? 1 : 0) + (this.combo >= 4 ? 1 : 0) + (this.combo >= 6 ? 1 : 0);
      const cancel = Math.min(atk, this.incoming);
      this.incoming -= cancel;
      atk -= cancel;
      if (atk > 0) {
        g.boards[1 - this.p].incoming += atk;
        this.sent += atk;
        g.sendFx(this.p, atk);
      }
      this.popup = { text: CLEAR_NAMES[n] + (this.combo >= 1 ? ` · COMBO ${this.combo}` : ''), t: 1.2, n };
      g.sfx(n === 4 ? 'quad' : 'line', { pitch: 1 + n * 0.12 });
      for (const r of full) g.fx.burst(g.boardX(this.p) + (COLS * CELL) / 2, g.boardY() + (r - HIDDEN) * CELL + CELL / 2, ['#fff', COLORS[pc.k], g.color(this.p)], 20, { speed: 360, gravity: 400, size: 5 });
      if (n === 4) { g.fx.shake(10); g.fx.flash(g.color(this.p), 0.2); }
    } else {
      this.combo = -1;
      g.sfx('drop');
      // recibir ataques pendientes
      if (this.incoming > 0) this.addGarbage(Math.min(this.incoming, 8));
    }
    this.canHold = true;
    this.spawn();
  }
  addGarbage(n) {
    this.incoming -= n;
    const hole = Math.floor(this.holeRng() * COLS);
    for (let i = 0; i < n; i++) {
      if (this.grid[0].some((c) => c)) this.dead = true;
      this.grid.shift();
      const row = Array(COLS).fill('G');
      row[hole] = null;
      this.grid.push(row);
    }
    if (this.piece) while (this.piece.y > 0 && this.collides(this.piece.cells, this.piece.x, this.piece.y)) this.piece.y--;
    this.game.sfx('garbage');
    this.shake = 1;
  }
  update(dt, inp) {
    if (this.dead) return;
    const g = this.game;
    this.shake = Math.max(0, this.shake - dt * 5);
    if (this.popup) { this.popup.t -= dt; if (this.popup.t <= 0) this.popup = null; }
    for (const f of this.flashRows) f.t -= dt;
    this.flashRows = this.flashRows.filter((f) => f.t > 0);
    if (!this.piece) return;
    // movimiento lateral con DAS
    const dir = inp.axisX();
    if (inp.pressed('left')) { if (this.move(-1)) g.sfx('move'); this.das = { dir: -1, t: 0.15 }; }
    else if (inp.pressed('right')) { if (this.move(1)) g.sfx('move'); this.das = { dir: 1, t: 0.15 }; }
    else if (dir !== 0 && dir === this.das.dir) {
      this.das.t -= dt;
      while (this.das.t <= 0) { this.move(dir); this.das.t += 0.045; }
    } else this.das = { dir: 0, t: 0 };
    if (inp.pressed('up')) { if (this.rotate(1)) g.sfx('rotate'); }
    if (inp.pressed('b')) { if (this.holdPiece()) g.sfx('hold'); }
    if (inp.pressed('a')) { this.hardDrop(); return; }
    // gravedad
    const soft = inp.held('down');
    const interval = g.gravity() / (soft ? 18 : 1);
    if (this.grounded()) {
      this.lockT += dt;
      if (this.lockT >= 0.5) this.lock();
    } else {
      this.fallT += dt;
      while (this.fallT >= interval && !this.grounded()) {
        this.fallT -= interval;
        this.piece.y++;
        if (soft) this.score += 1;
      }
      if (this.grounded()) this.fallT = 0;
    }
  }
}

export default class BlockBattle extends BaseGame {
  static meta = {
    id: 'blocks', num: 12, name: 'BLOCK BATTLE', short: 'BLOCKS', category: 'Lógica', color: '#9B6CFF',
    tagline: 'Encajá, completá y mandale el problema al otro.',
    description: 'Cada uno tiene su tablero y recibe las mismas piezas. Completá líneas para sumar puntos; las líneas dobles, triples, cuádruples y los combos le envían filas de ataque a tu rival. Si limpiás líneas mientras te atacan, cancelás el ataque. Si tus bloques llegan arriba, perdés.',
    goal: 'Sobreviví más que tu rival o tené más puntos al final.',
    controls: [
      { actions: ['left', 'right'], label: 'Mover pieza' },
      { actions: ['up'], label: 'Rotar' },
      { actions: ['down'], label: 'Caída rápida' },
      { actions: ['a'], label: 'Caída instantánea' },
      { actions: ['b'], label: 'Guardar pieza' },
    ],
    events: ['speed', 'short', 'double', 'obstacles', 'invert'],
    options: [{ key: 'time', label: 'Tiempo', choices: [[90, '1:30'], [120, '2:00'], [180, '3:00']], def: 120 }],
    record: { label: 'Puntos en una partida', better: 'higher', format: (v) => `${v.toLocaleString('es')} pts` },
    drawIcon(g, t) {
      const cells = [[0, 4, 'J'], [1, 4, 'J'], [2, 4, 'S'], [3, 4, 'S'], [4, 4, 'I'], [0, 3, 'J'], [2, 3, 'S'], [3, 3, 'O'], [4, 3, 'O'], [0, 2, 'T'], [3, 2, 'O'], [4, 2, 'O']];
      for (const [x, y, k] of cells) { g.fillStyle = COLORS[k]; roundRect(g, 30 + x * 28, 30 + y * 28, 26, 26, 6); g.fill(); }
      const fy = 30 + ((t * 60) % 60);
      g.fillStyle = COLORS.T;
      for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1]]) { roundRect(g, 58 + x * 28, fy + y * 28 - 30, 26, 26, 6); g.fill(); }
    },
  };

  init() {
    this.duration = this.timed(this.options.time ?? 120);
    const seed = newSeed();
    this.boards = [new Board(this, 0, seed), new Board(this, 1, seed)];
    if (this.extraObstacles) for (const b of this.boards) { b.addGarbage(3); }
    this.attacks = [];
    this.levelShown = 1;
  }
  get level() {
    return 1 + Math.floor(this.time / 30) + (this.diff >= 1 ? 1 : 0);
  }
  gravity() {
    return Math.max(0.06, 0.85 - (this.level - 1) * 0.12 - this.diff * 0.2);
  }
  boardX(p) {
    return p === 0 ? 205 : W - 205 - COLS * CELL;
  }
  boardY() {
    return 116;
  }
  sendFx(p, n) {
    this.attacks.push({ from: p, n, t: 0 });
    this.sfx('whoosh');
  }

  ambient(dt) {
    for (const a of this.attacks) a.t += dt * 1.8;
    this.attacks = this.attacks.filter((a) => a.t < 1);
  }

  update(dt) {
    this.ambient(dt);
    // modo SOLO (desafíos en solitario): el tablero del rival queda quieto
    for (const p of [0, 1]) if (!(this.opts.solo && p === 1)) this.boards[p].update(dt, this.inputs[p]);
    if (this.level !== this.levelShown) {
      this.levelShown = this.level;
      this.sfx('powerup');
      this.fx.float(W / 2, 400, `NIVEL ${this.level}`, '#FFC93C', 40);
    }
    const dead = this.boards.map((b) => b.dead);
    if (dead[0] || dead[1] || this.time >= this.duration) this.end(dead);
  }

  end(dead) {
    const B = this.boards;
    let w;
    let banner = '¡TIEMPO!';
    if (dead[0] && dead[1]) w = BaseGame.decide(B[0].score, B[1].score);
    else if (dead[0]) { w = 1; banner = '¡TOPE!'; }
    else if (dead[1]) { w = 0; banner = '¡TOPE!'; }
    else w = BaseGame.decide(B[0].score, B[1].score);
    this.finish({
      winner: w,
      scores: B.map((b) => b.score),
      display: B.map((b) => b.score.toLocaleString('es')),
      scoreLabel: dead[0] || dead[1] ? 'Puntos (sobrevivió el ganador)' : 'Puntos',
      banner,
      stats: [
        { label: 'Líneas', values: B.map((b) => String(b.lines)), raw: B.map((b) => b.lines), better: 'high' },
        { label: 'Filas enviadas', values: B.map((b) => String(b.sent)), raw: B.map((b) => b.sent), better: 'high' },
        { label: 'Combo máximo', values: B.map((b) => String(Math.max(0, b.maxCombo))), raw: B.map((b) => b.maxCombo), better: 'high' },
        { label: 'Cuádruples', values: B.map((b) => String(b.quads)), raw: B.map((b) => b.quads), better: 'high' },
        { label: 'Piezas', values: B.map((b) => String(b.pieces)) },
      ],
      records: B.map((b) => b.score),
      flags: B.map((b) => ({ quads: b.quads })),
      margin: null,
    });
  }

  // ------------------------------------------------------------------ dibujo
  block(g, x, y, k, a = 1, s = CELL) {
    const c = COLORS[k];
    g.globalAlpha = a;
    g.fillStyle = shade(c, -0.35);
    roundRect(g, x + 1, y + 1, s - 2, s - 2, 6); g.fill();
    g.fillStyle = c;
    roundRect(g, x + 1, y + 1, s - 2, s - 5, 6); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(g, x + 4, y + 3, s - 10, s * 0.22, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.arc(x + s - 8, y + s - 10, s * 0.1, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }

  render(g) {
    const t = this.realTime;
    this.arenaBG(g, '#140F33', '#0B0A20');
    this.grid(g, 0, 90, W, H - 90, 54, 'rgba(155,108,255,0.05)');
    // centro: personajes y flechas de ataque
    for (const p of [0, 1]) {
      const b = this.boards[p];
      const anim = b.dead ? 'lose' : b.popup ? 'celebrate' : b.incoming > 3 ? 'hurt' : 'idle';
      drawCharacter(g, { id: this.players[p].char, x: W / 2 + (p ? 70 : -70), y: 640, s: 1.0, color: this.color(p), anim, t: t + p, facing: p ? -1 : 1, acc: this.players[p].acc });
    }
    text(g, 'VS', W / 2, 520, { size: 40, color: '#FFC93C', glow: '#FFC93C' });
    text(g, `NIVEL ${this.level}`, W / 2, 470, { size: 16, body: true, weight: 800, color: 'rgba(246,247,251,0.7)' });
    for (const a of this.attacks) {
      const x0 = a.from === 0 ? this.boardX(0) + COLS * CELL : this.boardX(1);
      const x1 = a.from === 0 ? this.boardX(1) : this.boardX(0) + COLS * CELL;
      const x = x0 + (x1 - x0) * ease.inOutQuad(a.t), y = 380 - Math.sin(a.t * Math.PI) * 140;
      glowCircle(g, x, y, 40, this.color(a.from), 1);
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(x, y, 10 + a.n * 2, 0, TAU); g.fill();
      text(g, `+${a.n}`, x, y - 28, { size: 18, color: this.color(a.from) });
    }
    for (const p of [0, 1]) this.drawBoard(g, p, t);
  }

  drawBoard(g, p, t) {
    const b = this.boards[p];
    const bx = this.boardX(p) + (b.shake ? Math.sin(t * 80) * b.shake * 3 : 0), by = this.boardY();
    const bw = COLS * CELL, bh = (ROWS - HIDDEN) * CELL;
    const col = this.color(p);
    panel(g, bx - 8, by - 8, bw + 16, bh + 16, { r: 14, fill: 'rgba(8,8,24,0.92)', stroke: rgba(col, 0.75), lineWidth: 3, glow: quality.glow ? col : null, glowSize: 18 });
    g.strokeStyle = 'rgba(155,108,255,0.08)';
    g.lineWidth = 1;
    g.beginPath();
    for (let c = 1; c < COLS; c++) { g.moveTo(bx + c * CELL, by); g.lineTo(bx + c * CELL, by + bh); }
    for (let r = 1; r < ROWS - HIDDEN; r++) { g.moveTo(bx, by + r * CELL); g.lineTo(bx + bw, by + r * CELL); }
    g.stroke();
    // celdas
    for (let r = HIDDEN; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = b.grid[r][c];
      if (k) this.block(g, bx + c * CELL, by + (r - HIDDEN) * CELL, k, b.dead ? 0.45 : 1);
    }
    for (const f of b.flashRows) {
      g.fillStyle = `rgba(255,255,255,${f.t / 0.35 * 0.8})`;
      g.fillRect(bx, by + (f.r - HIDDEN) * CELL, bw, CELL);
    }
    // pieza actual + fantasma
    if (b.piece && !b.dead) {
      const pc = b.piece;
      const gy = b.ghostY();
      for (const [cx, cy] of pc.cells) {
        const r = gy + cy - HIDDEN;
        if (r >= 0) {
          g.strokeStyle = rgba(COLORS[pc.k], 0.55);
          g.lineWidth = 2;
          roundRect(g, bx + (pc.x + cx) * CELL + 3, by + r * CELL + 3, CELL - 6, CELL - 6, 5); g.stroke();
        }
      }
      for (const [cx, cy] of pc.cells) {
        const r = pc.y + cy - HIDDEN;
        if (r >= 0) this.block(g, bx + (pc.x + cx) * CELL, by + r * CELL, pc.k);
      }
    }
    // barra de ataque entrante
    const mx = p === 0 ? bx + bw + 14 : bx - 24;
    g.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(g, mx, by, 10, bh, 5); g.fill();
    const inc = Math.min(b.incoming, ROWS - HIDDEN);
    if (inc) {
      g.fillStyle = Math.sin(t * 12) > 0 ? '#FF654F' : '#FF8A78';
      roundRect(g, mx, by + bh - inc * CELL, 10, inc * CELL, 5); g.fill();
    }
    // siguiente y guardada
    const sideX = p === 0 ? bx - 132 : bx + bw + 30;
    panel(g, sideX, by, 102, 300, { r: 14, fill: 'rgba(18,26,51,0.8)', stroke: 'rgba(155,108,255,0.3)' });
    text(g, 'SIGUIENTE', sideX + 51, by + 18, { size: 11, body: true, weight: 800, color: 'rgba(246,247,251,0.6)' });
    b.queue.slice(0, 4).forEach((k, i) => this.mini(g, k, sideX + 51, by + 56 + i * 62, i === 0 ? 18 : 14));
    panel(g, sideX, by + 316, 102, 100, { r: 14, fill: 'rgba(18,26,51,0.8)', stroke: b.canHold ? 'rgba(155,108,255,0.3)' : 'rgba(255,101,79,0.4)' });
    text(g, 'GUARDADA', sideX + 51, by + 334, { size: 11, body: true, weight: 800, color: 'rgba(246,247,251,0.6)' });
    if (b.hold) this.mini(g, b.hold, sideX + 51, by + 376, 16, b.canHold ? 1 : 0.4);
    panel(g, sideX, by + 432, 102, 120, { r: 14, fill: 'rgba(18,26,51,0.8)', stroke: 'rgba(155,108,255,0.3)' });
    text(g, 'LÍNEAS', sideX + 51, by + 452, { size: 11, body: true, weight: 800, color: 'rgba(246,247,251,0.6)' });
    text(g, String(b.lines), sideX + 51, by + 484, { size: 28, color: '#fff' });
    text(g, `ENVIADAS ${b.sent}`, sideX + 51, by + 522, { size: 11, body: true, weight: 800, color: col });
    if (b.popup) {
      const k = b.popup.t / 1.2;
      text(g, b.popup.text, bx + bw / 2, by + 200 - (1 - k) * 30, { size: b.popup.n === 4 ? 30 : 22, color: '#fff', glow: col, stroke: '#0B1020', alpha: Math.min(1, k * 3) });
    }
    if (b.dead) {
      panel(g, bx + 10, by + bh / 2 - 40, bw - 20, 80, { r: 20, fill: 'rgba(11,16,32,0.9)', stroke: '#FF654F' });
      text(g, '¡TOPE!', bx + bw / 2, by + bh / 2, { size: 40, color: '#FF8A78' });
    }
  }

  mini(g, k, cx, cy, s, a = 1) {
    const sh = SHAPES[k];
    const xs = sh.c.map((c) => c[0]), ys = sh.c.map((c) => c[1]);
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * s, h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
    for (const [x, y] of sh.c) this.block(g, cx - w / 2 + (x - Math.min(...xs)) * s, cy - h / 2 + (y - Math.min(...ys)) * s, k, a, s);
  }

  renderHUD(g) {
    this.hudTop(g, { scores: this.boards.map((b) => b.score.toLocaleString('es')), scoreSize: 26, sub: this.boards.map((b) => (b.incoming ? `¡${b.incoming} filas entrantes!` : b.combo > 0 ? `Combo ${b.combo}` : `Nivel ${this.level}`)), timer: this.remaining });
  }
}

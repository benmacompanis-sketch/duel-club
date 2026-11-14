// JUEGO 06 — MEMORY WAR (memoria)
// Por turnos: cada jugador mueve su cursor y da vuelta dos cartas. Si forman pareja, sigue.
// Equivocarse con una carta ya vista es un "error de memoria" y resta puntos.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, clamp, text, panel, rgba, roundRect, glowCircle, quality, shade, shuffle, ease } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

// --- símbolos originales (vectoriales) ---
const SYMBOLS = [
  ['star', '#FFC93C'], ['moon', '#9FB7FF'], ['bolt', '#FFE45C'], ['drop', '#25CFE6'], ['leaf', '#48D597'], ['flame', '#FF8E3C'],
  ['crown', '#FFC23C'], ['key', '#E8C267'], ['anchor', '#7FA8FF'], ['note', '#FF5FA2'], ['planet', '#B892FF'], ['gem', '#38E1D0'],
  ['spiral', '#FF7AC6'], ['eye', '#7CF7FF'], ['shroom', '#FF654F'], ['clover', '#5BE38E'], ['sun', '#FFB547'], ['rocket', '#E9EEFF'],
];
export function drawSymbol(g, id, color, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s / 40, s / 40);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const dark = shade(color, -0.45);
  switch (id) {
    case 'star': drawStar(g, 0, 2, 22, 10, 5); g.fill(); break;
    case 'moon': g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(10, -6, 17, 0, TAU); g.fill(); break;
    case 'bolt': g.beginPath(); g.moveTo(4, -22); g.lineTo(-12, 4); g.lineTo(0, 4); g.lineTo(-4, 22); g.lineTo(13, -4); g.lineTo(1, -4); g.closePath(); g.fill(); break;
    case 'drop': g.beginPath(); g.moveTo(0, -22); g.bezierCurveTo(14, -4, 16, 4, 16, 8); g.arc(0, 8, 16, 0, Math.PI); g.bezierCurveTo(-16, 4, -14, -4, 0, -22); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-6, 6, 3, 6, 0.3, 0, TAU); g.fill(); break;
    case 'leaf': g.beginPath(); g.moveTo(-18, 18); g.bezierCurveTo(-20, -10, 4, -22, 20, -20); g.bezierCurveTo(20, 4, 4, 20, -18, 18); g.fill(); g.strokeStyle = dark; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, 14); g.lineTo(12, -12); g.stroke(); break;
    case 'flame': g.beginPath(); g.moveTo(0, -24); g.bezierCurveTo(16, -6, 18, 8, 12, 16); g.bezierCurveTo(6, 24, -6, 24, -12, 16); g.bezierCurveTo(-18, 6, -8, -4, -6, -10); g.bezierCurveTo(-2, -4, 2, -6, 0, -24); g.fill(); g.fillStyle = '#FFE08A'; g.beginPath(); g.ellipse(0, 12, 6, 9, 0, 0, TAU); g.fill(); break;
    case 'crown': g.beginPath(); g.moveTo(-20, 14); g.lineTo(-22, -12); g.lineTo(-10, 0); g.lineTo(0, -18); g.lineTo(10, 0); g.lineTo(22, -12); g.lineTo(20, 14); g.closePath(); g.fill(); g.fillStyle = dark; g.fillRect(-20, 10, 40, 6); break;
    case 'key': g.beginPath(); g.arc(-10, -8, 10, 0, TAU); g.lineWidth = 6; g.stroke(); g.beginPath(); g.moveTo(-3, -1); g.lineTo(18, 20); g.moveTo(8, 10); g.lineTo(14, 4); g.moveTo(13, 15); g.lineTo(19, 9); g.stroke(); break;
    case 'anchor': g.lineWidth = 5; g.beginPath(); g.arc(0, -16, 5, 0, TAU); g.moveTo(0, -11); g.lineTo(0, 20); g.moveTo(-10, -4); g.lineTo(10, -4); g.moveTo(-18, 6); g.quadraticCurveTo(-14, 20, 0, 20); g.quadraticCurveTo(14, 20, 18, 6); g.stroke(); break;
    case 'note': g.beginPath(); g.ellipse(-8, 14, 9, 7, -0.4, 0, TAU); g.fill(); g.fillRect(-1, -20, 5, 34); g.beginPath(); g.moveTo(4, -20); g.quadraticCurveTo(20, -12, 14, 2); g.quadraticCurveTo(14, -8, 4, -10); g.fill(); break;
    case 'planet': g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.strokeStyle = shade(color, 0.4); g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 24, 8, -0.4, 0.2, Math.PI - 0.2); g.stroke(); g.fillStyle = dark; g.beginPath(); g.arc(-5, -4, 3, 0, TAU); g.fill(); break;
    case 'gem': g.beginPath(); g.moveTo(-18, -8); g.lineTo(-8, -18); g.lineTo(8, -18); g.lineTo(18, -8); g.lineTo(0, 20); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, -8); g.lineTo(18, -8); g.moveTo(-8, -18); g.lineTo(-4, -8); g.lineTo(0, 20); g.moveTo(8, -18); g.lineTo(4, -8); g.stroke(); break;
    case 'spiral': g.lineWidth = 4.5; g.beginPath(); for (let i = 0; i < 60; i++) { const a = i * 0.32, r = 1 + i * 0.36; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); break;
    case 'eye': g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(0, -20, 22, 0); g.quadraticCurveTo(0, 20, -22, 0); g.fill(); g.fillStyle = '#0B1020'; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(3, -3, 2.5, 0, TAU); g.fill(); break;
    case 'shroom': g.beginPath(); g.arc(0, -2, 20, Math.PI, 0); g.closePath(); g.fill(); g.fillStyle = '#F6F7FB'; g.fillRect(-7, -2, 14, 20); g.beginPath(); g.arc(-8, -10, 4, 0, TAU); g.arc(7, -12, 3.5, 0, TAU); g.fill(); break;
    case 'clover': for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) { g.beginPath(); g.arc(Math.cos(a) * 10, Math.sin(a) * 10 - 2, 10, 0, TAU); g.fill(); } g.lineWidth = 4; g.beginPath(); g.moveTo(0, 4); g.quadraticCurveTo(4, 14, 10, 20); g.stroke(); break;
    case 'sun': g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill(); g.lineWidth = 4; for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8; g.beginPath(); g.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); g.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); g.stroke(); } break;
    case 'rocket': g.beginPath(); g.moveTo(0, -24); g.quadraticCurveTo(12, -10, 10, 10); g.lineTo(-10, 10); g.quadraticCurveTo(-12, -10, 0, -24); g.fill(); g.fillStyle = '#FF654F'; g.beginPath(); g.moveTo(-10, 2); g.lineTo(-18, 16); g.lineTo(-8, 12); g.fill(); g.beginPath(); g.moveTo(10, 2); g.lineTo(18, 16); g.lineTo(8, 12); g.fill(); g.fillStyle = '#25CFE6'; g.beginPath(); g.arc(0, -6, 5, 0, TAU); g.fill(); g.fillStyle = '#FFC93C'; g.beginPath(); g.moveTo(-6, 12); g.lineTo(0, 24); g.lineTo(6, 12); g.fill(); break;
  }
  g.restore();
}

// menos tarjetas: partidas más ágiles sin perder el desafío (fácil 6 pares, normal 8, difícil 10)
const SIZES = { small: [4, 3], medium: [4, 4], large: [5, 4] };
const TIMES = { small: 70, medium: 95, large: 120 };

export default class MemoryWar extends BaseGame {
  static meta = {
    id: 'memory', num: 6, name: 'MEMORY WAR', short: 'MEMORY', category: 'Memoria', color: '#FF5FA2',
    tagline: 'Lo que ves, lo usás. Lo que olvidás, lo regalás.',
    description: 'Por turnos, mové tu cursor y dá vuelta dos cartas. Si forman pareja, te la quedás y seguís jugando (las rachas suman bonus). Si fallás, pasa el turno. Equivocarte con una carta que ya se había visto es un error de memoria y resta puntos. Cada turno tiene tiempo límite.',
    goal: 'Encontrá más parejas que tu rival (desempata el puntaje).',
    controls: [{ actions: ['up', 'down', 'left', 'right'], label: 'Mover cursor' }, { actions: ['a'], label: 'Dar vuelta carta' }],
    events: ['short', 'double'],
    options: [{ key: 'size', label: 'Tablero', choices: [['auto', 'Según dificultad'], ['small', '4×3'], ['medium', '4×4'], ['large', '5×4']], def: 'auto' }],
    record: { label: 'Puntos en una partida', better: 'higher', format: (v) => `${v} pts` },
    drawIcon(g, t) {
      const flip = (Math.sin(t * 2) + 1) / 2;
      for (let i = 0; i < 2; i++) {
        const x = 62 + i * 76, sc = i ? Math.abs(Math.cos(flip * Math.PI)) : 1;
        g.save(); g.translate(x, 100); g.scale(Math.max(0.05, sc), 1);
        const front = i === 0 || flip > 0.5;
        g.fillStyle = front ? '#F6F7FB' : '#5B3FB5';
        roundRect(g, -32, -44, 64, 88, 10); g.fill();
        if (front) drawSymbol(g, 'star', '#FFC93C', 0, 0, 40);
        g.restore();
      }
    },
  };

  init() {
    // tamaño: el elegido en las opciones del minijuego o, si no, según la dificultad
    const size = SIZES[this.options.size] ? this.options.size : this.diff <= 0.2 ? 'small' : this.diff >= 0.9 ? 'large' : 'medium';
    this.size = size;
    const [cols, rows] = SIZES[size];
    this.cols = cols;
    this.rows = rows;
    const n = (cols * rows) / 2;
    const syms = shuffle(SYMBOLS).slice(0, n);
    const deck = shuffle([...syms, ...syms]);
    // geometría
    const areaW = 760, areaH = 580, gap = 12;
    const ch = Math.min((areaH - gap * (rows - 1)) / rows, ((areaW - gap * (cols - 1)) / cols) / 0.78);
    const cw = ch * 0.78;
    this.cw = cw;
    this.ch = ch;
    this.ox = W / 2 - (cols * cw + (cols - 1) * gap) / 2;
    this.oy = 112 + (areaH - (rows * ch + (rows - 1) * gap)) / 2;
    this.gap = gap;
    this.cards = deck.map(([id, color], i) => ({
      id, color, i, c: i % cols, r: Math.floor(i / cols), up: false, flip: 0, owner: -1, seen: false, pop: 0, wobble: 0,
    }));
    this.cursor = [{ c: 0, r: 0 }, { c: cols - 1, r: rows - 1 }];
    this.turn = Math.random() < 0.5 ? 0 : 1;
    this.sel = [];
    this.pairs = [0, 0];
    this.points = [0, 0];
    this.errors = [0, 0];
    this.misses = [0, 0];
    this.run = 0;
    this.bestRun = [0, 0];
    this.turnMax = Math.max(5, 10 - this.diff * 4) * (this.event === 'short' ? 0.65 : 1);
    this.turnT = this.turnMax;
    this.wait = 0;
    this.msg = null;
    this.repeat = [{}, {}];
    // límite global para que la partida no se eternice
    this.duration = this.timed(TIMES[size]);
  }

  at(c, r) {
    return this.cards[r * this.cols + c];
  }
  pos(card) {
    return [this.ox + card.c * (this.cw + this.gap), this.oy + card.r * (this.ch + this.gap)];
  }

  ambient(dt) {
    for (const k of this.cards) {
      k.flip += ((k.up ? 1 : 0) - k.flip) * Math.min(1, dt * 12);
      k.pop = Math.max(0, k.pop - dt * 2);
      k.wobble = Math.max(0, k.wobble - dt * 3);
    }
    if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; }
  }

  // movimiento con repetición al mantener
  dirPressed(p, a, dt) {
    const inp = this.inputs[p];
    const rp = this.repeat[p];
    if (inp.pressed(a)) { rp[a] = 0.28; return true; }
    if (inp.held(a)) {
      rp[a] = (rp[a] ?? 0.28) - dt;
      if (rp[a] <= 0) { rp[a] = 0.09; return true; }
    } else rp[a] = 0.28;
    return false;
  }

  update(dt) {
    this.ambient(dt);
    if (this.time >= this.duration && this.wait <= 0) return this.end();
    const p = this.turn;
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) this.resolveWait();
      return;
    }
    // cursor del jugador activo
    const cur = this.cursor[p];
    if (this.dirPressed(p, 'left', dt)) { cur.c = Math.max(0, cur.c - 1); this.sfx('move'); }
    if (this.dirPressed(p, 'right', dt)) { cur.c = Math.min(this.cols - 1, cur.c + 1); this.sfx('move'); }
    if (this.dirPressed(p, 'up', dt)) { cur.r = Math.max(0, cur.r - 1); this.sfx('move'); }
    if (this.dirPressed(p, 'down', dt)) { cur.r = Math.min(this.rows - 1, cur.r + 1); this.sfx('move'); }
    // el rival que pulsa fuera de turno recibe un aviso visual
    if (this.inputs[1 - p].pressed('a')) this.cursor[1 - p].nudge = 0.4;
    for (const q of [0, 1]) if (this.cursor[q].nudge) this.cursor[q].nudge = Math.max(0, this.cursor[q].nudge - dt);
    if (this.inputs[p].pressed('a')) {
      const card = this.at(cur.c, cur.r);
      if (card.owner < 0 && !card.up) this.flipCard(card);
      else { card.wobble = 1; this.sfx('error'); }
    }
    this.turnT -= dt;
    if (this.turnT <= 0) {
      this.sfx('alarm');
      this.msg = { text: '¡SE ACABÓ EL TIEMPO!', color: '#FF654F', t: 1.2 };
      for (const k of this.sel) k.up = false;
      this.sel = [];
      this.passTurn();
    }
  }

  flipCard(card) {
    card.up = true;
    this.sel.push(card);
    this.sfx('flip', { pitch: 0.9 + this.sel.length * 0.15 });
    if (this.sel.length === 2) {
      const [a, b] = this.sel;
      if (a.id === b.id) {
        this.wait = 0.45;
        this.pending = 'match';
      } else {
        this.wait = 1.0;
        this.pending = 'miss';
        this.memoryError = a.seen || b.seen;
      }
    }
  }

  resolveWait() {
    const p = this.turn;
    const [a, b] = this.sel;
    if (this.pending === 'match') {
      a.owner = b.owner = p;
      a.pop = b.pop = 1;
      this.pairs[p]++;
      this.run++;
      this.bestRun[p] = Math.max(this.bestRun[p], this.run);
      const bonus = (this.run - 1) * 50;
      const pts = (100 + bonus) * this.scoreMul();
      this.points[p] += pts;
      this.sfx('match');
      for (const k of [a, b]) {
        const [x, y] = this.pos(k);
        this.fx.burst(x + this.cw / 2, y + this.ch / 2, [this.color(p), k.color, '#fff'], 16, { speed: 260 });
      }
      const [x, y] = this.pos(b);
      this.fx.float(x + this.cw / 2, y, this.run > 1 ? `+${pts} ¡RACHA x${this.run}!` : `+${pts}`, this.color(p), 26);
      this.sel = [];
      this.turnT = this.turnMax;
      if (this.pairs[0] + this.pairs[1] === this.cards.length / 2) return this.end();
    } else {
      a.seen = b.seen = true;
      a.up = b.up = false;
      this.misses[p]++;
      if (this.memoryError) {
        this.errors[p]++;
        this.points[p] = Math.max(0, this.points[p] - 50);
        this.msg = { text: '¡ERROR DE MEMORIA! −50', color: '#FF654F', t: 1.2 };
        this.sfx('bad');
        this.fx.shake(6);
      } else this.sfx('miss');
      this.sel = [];
      this.passTurn();
    }
  }

  passTurn() {
    for (const k of this.cards) if (k.up && k.owner < 0) k.seen = true;
    this.turn = 1 - this.turn;
    this.run = 0;
    this.turnT = this.turnMax;
    this.sfx('whoosh');
  }

  end() {
    let w = BaseGame.decide(this.pairs[0], this.pairs[1]);
    if (w === -1) w = BaseGame.decide(this.points[0], this.points[1]);
    this.finish({
      winner: w,
      scores: this.pairs.slice(),
      display: this.pairs.map((n, p) => `${n}`),
      scoreLabel: 'Parejas',
      stats: [
        { label: 'Puntos', values: this.points.map(String), raw: this.points, better: 'high' },
        { label: 'Mejor racha', values: this.bestRun.map(String), raw: this.bestRun, better: 'high' },
        { label: 'Fallos', values: this.misses.map(String), raw: this.misses, better: 'low' },
        { label: 'Errores de memoria', values: this.errors.map(String), raw: this.errors, better: 'low' },
      ],
      records: this.points.slice(),
      flags: this.bestRun.map((r) => ({ bestRun: r })),
      margin: Math.abs(this.pairs[0] - this.pairs[1]),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    this.arenaBG(g, '#1A1236', '#0B1020');
    this.grid(g, 0, 90, W, H - 90, 48, 'rgba(255,95,162,0.05)');
    // paneles laterales de jugadores
    for (const p of [0, 1]) {
      const x = p ? W - 175 : 175;
      const active = this.turn === p;
      const col = this.color(p);
      if (active) glowCircle(g, x, 420, 220, col, 0.7);
      panel(g, x - 135, 130, 270, 540, { r: 30, fill: active ? rgba(col, 0.16) : 'rgba(18,26,51,0.6)', stroke: active ? col : 'rgba(155,108,255,0.2)', lineWidth: active ? 3 : 1.5 });
      drawCharacter(g, { id: this.players[p].char, x, y: 430, s: 1.45, color: col, anim: active ? (this.run > 0 ? 'celebrate' : 'idle') : 'idle', t: t + p, facing: p ? -1 : 1, acc: this.players[p].acc });
      text(g, active ? 'SU TURNO' : 'ESPERANDO', x, 170, { size: 20, color: active ? '#fff' : 'rgba(246,247,251,0.4)' });
      if (active && this.wait <= 0) {
        // anillo de tiempo de turno
        const k = clamp(this.turnT / this.turnMax, 0, 1);
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.lineWidth = 8;
        g.beginPath(); g.arc(x, 520, 34, 0, TAU); g.stroke();
        g.strokeStyle = k < 0.3 ? '#FF654F' : col;
        g.beginPath(); g.arc(x, 520, 34, -Math.PI / 2, -Math.PI / 2 + TAU * k); g.stroke();
        text(g, String(Math.ceil(this.turnT)), x, 521, { size: 26, color: '#fff' });
      }
      text(g, `${this.pairs[p]}`, x, 600, { size: 52, color: '#fff', glow: col });
      text(g, 'PAREJAS', x, 638, { size: 13, body: true, weight: 800, color: 'rgba(246,247,251,0.6)' });
    }
    // cartas
    for (const k of this.cards) this.drawCard(g, k, t);
    // cursores
    for (const p of [0, 1]) {
      const cur = this.cursor[p];
      const active = this.turn === p;
      const card = this.at(cur.c, cur.r);
      const [x, y] = this.pos(card);
      const col = this.color(p);
      const pad = 6 + (active ? Math.sin(t * 8) * 2 : 0);
      g.save();
      g.globalAlpha = active ? 1 : 0.25 + (cur.nudge || 0);
      if (quality.glow && active) { g.shadowColor = col; g.shadowBlur = 18; }
      g.strokeStyle = col;
      g.lineWidth = active ? 5 : 3;
      roundRect(g, x - pad, y - pad, this.cw + pad * 2, this.ch + pad * 2, 14);
      g.stroke();
      g.restore();
      if (active) {
        panel(g, x + this.cw / 2 - 18, y - pad - 22, 36, 20, { r: 10, fill: col });
        text(g, `J${p + 1}`, x + this.cw / 2, y - pad - 12, { size: 12, body: true, weight: 800, color: '#0B1020' });
      }
    }
  }

  drawCard(g, k, t) {
    const [x, y] = this.pos(k);
    const cx = x + this.cw / 2, cy = y + this.ch / 2;
    const sx = Math.max(0.04, Math.abs(Math.cos(k.flip * Math.PI)));
    const front = k.flip > 0.5;
    const pop = 1 + ease.outBack(k.pop) * 0.06 * k.pop;
    g.save();
    g.translate(cx + (k.wobble ? Math.sin(k.wobble * 30) * 4 * k.wobble : 0), cy);
    g.scale(sx * pop, pop);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(g, -this.cw / 2 + 3, -this.ch / 2 + 5, this.cw, this.ch, 12); g.fill();
    if (front) {
      const own = k.owner >= 0 ? this.color(k.owner) : null;
      g.fillStyle = own ? shade(own, 0.75) : '#F6F7FB';
      roundRect(g, -this.cw / 2, -this.ch / 2, this.cw, this.ch, 12); g.fill();
      if (own) { g.strokeStyle = own; g.lineWidth = 4; roundRect(g, -this.cw / 2 + 2, -this.ch / 2 + 2, this.cw - 4, this.ch - 4, 10); g.stroke(); }
      g.fillStyle = rgba(k.color, 0.18);
      g.beginPath(); g.arc(0, 0, this.cw * 0.36, 0, TAU); g.fill();
      drawSymbol(g, k.id, k.color === '#E9EEFF' ? '#8A97C7' : k.color, 0, 0, this.cw * 0.5);
    } else {
      const grd = g.createLinearGradient(0, -this.ch / 2, 0, this.ch / 2);
      grd.addColorStop(0, '#3B2A7A');
      grd.addColorStop(1, '#241A52');
      g.fillStyle = grd;
      roundRect(g, -this.cw / 2, -this.ch / 2, this.cw, this.ch, 12); g.fill();
      g.strokeStyle = 'rgba(155,108,255,0.55)';
      g.lineWidth = 2;
      roundRect(g, -this.cw / 2 + 5, -this.ch / 2 + 5, this.cw - 10, this.ch - 10, 8); g.stroke();
      // patrón de rombos
      g.strokeStyle = 'rgba(155,108,255,0.22)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = -3; i <= 3; i++) {
        g.moveTo(i * 14 - this.ch / 2, -this.ch / 2 + 8); g.lineTo(i * 14 + this.ch / 2, this.ch / 2 - 8);
        g.moveTo(i * 14 + this.ch / 2, -this.ch / 2 + 8); g.lineTo(i * 14 - this.ch / 2, this.ch / 2 - 8);
      }
      g.save(); roundRect(g, -this.cw / 2 + 6, -this.ch / 2 + 6, this.cw - 12, this.ch - 12, 7); g.clip(); g.stroke(); g.restore();
      g.fillStyle = '#9B6CFF';
      drawStar(g, 0, 0, this.cw * 0.16, this.cw * 0.07, 4, t * 0.3); g.fill();
      if (k.seen) { g.fillStyle = 'rgba(255,201,60,0.8)'; g.beginPath(); g.arc(this.cw / 2 - 12, -this.ch / 2 + 12, 4, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.points, sub: this.pairs.map((n) => `${n} parejas`), scoreSize: 28,
      timer: this.remaining,
    });
    text(g, `TURNO J${this.turn + 1} · ${this.cards.length / 2 - this.pairs[0] - this.pairs[1]} parejas restantes`, W / 2, 98, { size: 13, body: true, weight: 800, color: this.color(this.turn) });
    if (this.msg) {
      const a = Math.min(1, this.msg.t * 3);
      panel(g, W / 2 - 230, 640, 460, 50, { r: 25, fill: 'rgba(11,16,32,0.9)', stroke: this.msg.color });
      text(g, this.msg.text, W / 2, 665, { size: 22, color: '#fff', alpha: a });
    }
  }
}

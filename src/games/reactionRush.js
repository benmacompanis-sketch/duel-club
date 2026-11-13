// JUEGO 01 — REACTION RUSH (reflejos)
// Esperá la señal y pulsá tu botón antes que el rival. Anticiparse regala la ronda.
// El tiempo de reacción se mide con la marca de tiempo real del evento de teclado.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { W, H, TAU, rand, choice, text, panel, rgba, roundRect, glowCircle, ease, quality, shade } from '../core/utils.js';

const WORDS = ['ESPERÁ', 'QUIETO', 'TODAVÍA NO', 'AGUANTÁ', 'CASI...', 'TRANQUI', 'NO TODAVÍA'];
const DECOY_WORDS = ['¡YO!', '¿YA?', '¡NO!', '¡UY!'];
const SIGNALS = ['flash', 'lights', 'word', 'bell'];
const SIGNAL_NAMES = { flash: 'Panel de neón', lights: 'Semáforo', word: 'Palabras', bell: 'Campana' };

export default class ReactionRush extends BaseGame {
  static meta = {
    id: 'reaction', num: 1, name: 'REACTION RUSH', short: 'REACTION', category: 'Reflejos', color: '#FFC93C',
    tagline: 'El más rápido del club se lleva todo.',
    description: 'Mirá el panel y esperá la señal verde. En cuanto aparezca, pulsá tu botón más rápido que tu rival. Si te anticipás —o caés en una señal falsa— le regalás la ronda.',
    goal: 'Ganá la mayoría de las rondas.',
    controls: [{ actions: ['a'], label: 'Reaccionar' }],
    events: ['speed', 'obstacles', 'mirror'],
    options: [{ key: 'rounds', label: 'Rondas', choices: [[3, '3'], [5, '5'], [7, '7']], def: 5 }],
    record: { label: 'Mejor reacción', better: 'lower', format: (v) => `${Math.round(v)} ms` },
    drawIcon(g, t) {
      g.fillStyle = '#1A2446';
      roundRect(g, 30, 40, 140, 100, 22); g.fill();
      const on = Math.sin(t * 3) > 0;
      g.fillStyle = on ? '#48D597' : '#2A3566';
      roundRect(g, 44, 54, 112, 72, 14); g.fill();
      if (on) { glowCircle(g, 100, 90, 90, '#48D597', 0.7); }
      text(g, on ? '¡YA!' : '...', 100, 92, { size: 34, color: on ? '#0B1020' : '#8C96B8' });
      g.fillStyle = '#FFC93C';
      g.beginPath(); g.ellipse(100, 168, 40, 14, 0, 0, TAU); g.fill();
      g.fillStyle = '#C9922B';
      g.fillRect(60, 168, 80, 12);
    },
  };

  init() {
    this.roundsTotal = this.options.rounds ?? 5;
    this.toWin = Math.floor(this.roundsTotal / 2) + 1;
    this.round = 0;
    this.voids = 0;
    this.wins = [0, 0];
    this.times = [[], []];
    this.falses = [0, 0];
    this.btn = [0, 0];
    this.lastMs = [null, null];
    this.msg = '';
    this.startRound();
  }

  startRound() {
    this.round++;
    this.state = 'prep';
    this.st = 0;
    this.sig = choice(SIGNALS);
    const d = this.diff;
    const minWait = this.sig === 'lights' ? 2.4 : 1.3;
    this.waitTime = rand(minWait, minWait + 2.2 + d * 1.2);
    // señales falsas: más frecuentes con la dificultad y el evento de obstáculos
    const decoyChance = Math.min(0.95, d * 0.7 + (this.extraObstacles ? 0.5 : 0));
    let n = 0;
    if (Math.random() < decoyChance) n = 1;
    if (d >= 1 && Math.random() < 0.5) n++;
    if (this.extraObstacles) n++;
    this.decoys = [];
    for (let i = 0; i < n; i++) {
      const tt = rand(0.6, Math.max(0.7, this.waitTime - 0.6));
      this.decoys.push({ t: tt, dur: 0.35, word: choice(DECOY_WORDS), fired: false });
    }
    this.decoys.sort((a, b) => a.t - b.t);
    this.pressAt = [null, null];
    this.react = [null, null];
    this.fs = -1;
    this.roundWinner = null;
    this.signalPerf = 0;
    this.wordIdx = 0;
    this.wordT = 0;
    this.lightsOn = 0;
    this.bellSwing = 0;
    this.msg = '';
  }

  onResume() {
    // si se pausó con la señal en pantalla, la ronda se repite para que sea justa
    if (this.state === 'signal') {
      this.round--;
      this.startRound();
    }
  }

  activeDecoy() {
    if (this.state !== 'wait') return null;
    return this.decoys.find((dc) => this.st >= dc.t && this.st < dc.t + dc.dur) || null;
  }

  update(dt) {
    this.st += dt;
    for (const p of [0, 1]) this.btn[p] = Math.max(0, this.btn[p] - dt * 4);
    const pressed = [this.inputs[0].pressed('a'), this.inputs[1].pressed('a')];
    for (const p of [0, 1]) if (pressed[p]) this.btn[p] = 1;

    if (this.state === 'prep') {
      if (this.st > 0.5) {
        const early = [0, 1].filter((p) => pressed[p]);
        if (early.length) return this.falseStart(early);
      }
      if (this.st >= 1.1) {
        this.state = 'wait';
        this.st = 0;
      }
    } else if (this.state === 'wait') {
      for (const dc of this.decoys) {
        if (!dc.fired && this.st >= dc.t) {
          dc.fired = true;
          this.sfx('decoy');
          if (this.sig === 'flash') this.fx.flash('#FF654F', 0.15);
        }
      }
      if (this.sig === 'lights') {
        const n = Math.min(3, Math.floor(this.st / 0.6) + 1);
        if (n > this.lightsOn) { this.lightsOn = n; this.sfx('tick'); }
      }
      if (this.sig === 'word') {
        this.wordT += dt;
        if (this.wordT > 0.55) { this.wordT = 0; this.wordIdx++; this.sfx('tap'); }
      }
      const early = [0, 1].filter((p) => pressed[p]);
      if (early.length) return this.falseStart(early);
      if (this.st >= this.waitTime) {
        this.state = 'signal';
        this.st = 0;
        this.signalPerf = this.now();
        this.sfx(this.sig === 'bell' ? 'bell' : 'signal');
        this.fx.flash(this.sig === 'flash' ? '#48D597' : '#ffffff', this.sig === 'flash' ? 0.5 : 0.18);
      }
    } else if (this.state === 'signal') {
      // online la pulsación llega unos frames después con la hora en que se hizo: si fue antes de ver la señal, es adelantada
      const early = [0, 1].filter((p) => pressed[p] && this.react[p] == null && (this.inputs[p].pressTime('a') ?? Infinity) < this.signalPerf);
      if (early.length) return this.falseStart(early);
      for (const p of [0, 1]) {
        if (pressed[p] && this.react[p] == null) {
          const t = this.inputs[p].pressTime('a') ?? this.now();
          this.react[p] = Math.max(1, t - this.signalPerf);
          this.pressAt[p] = this.st;
          this.sfx('hit', { pitch: p ? 1.2 : 1 });
          this.fx.burst(p ? 880 : 400, 520, this.color(p), 18, { speed: 300 });
        }
      }
      const first = this.pressAt.filter((x) => x != null);
      const timeout = this.st > 1.6;
      const settle = first.length === 1 && this.st - first[0] > 0.6;
      if (first.length === 2 || timeout || settle) this.resolve();
    } else if (this.state === 'resolve') {
      if (this.st >= 2.0) this.nextOrFinish();
    }
  }

  falseStart(players) {
    this.state = 'resolve';
    this.st = 0;
    this.sfx('false');
    this.fx.shake(10);
    if (players.length === 2) {
      this.falses[0]++;
      this.falses[1]++;
      this.fs = 2;
      this.roundWinner = -1;
      this.msg = '¡AMBOS SE ADELANTARON!';
    } else {
      const p = players[0];
      this.falses[p]++;
      this.fs = p;
      this.roundWinner = 1 - p;
      this.wins[1 - p]++;
      this.msg = `¡${this.name(p).toUpperCase()} SE ADELANTÓ!`;
      this.fx.burst(p ? 1030 : 250, 420, '#FF654F', 20);
    }
  }

  resolve() {
    this.state = 'resolve';
    this.st = 0;
    const [a, b] = this.react;
    this.lastMs = [a, b];
    for (const p of [0, 1]) if (this.react[p] != null) this.times[p].push(this.react[p]);
    if (a == null && b == null) {
      this.roundWinner = -1;
      this.msg = 'NADIE REACCIONÓ';
      this.sfx('miss');
      return;
    }
    let w;
    if (a != null && b != null) w = a === b ? -1 : a < b ? 0 : 1;
    else w = a != null ? 0 : 1;
    this.roundWinner = w;
    if (w >= 0) {
      this.wins[w]++;
      this.msg = `¡${this.name(w).toUpperCase()} FUE MÁS RÁPIDO!`;
      this.sfx('point');
      this.fx.confetti(w ? 1030 : 250, 380, 30, 0.9);
    } else this.msg = '¡EMPATE EXACTO!';
  }

  nextOrFinish() {
    const isVoid = this.roundWinner === -1;
    if (isVoid && this.voids < 3) {
      this.voids++;
      this.round--;
    }
    const done = this.wins[0] >= this.toWin || this.wins[1] >= this.toWin || this.round >= this.roundsTotal;
    if (!done) return this.startRound();
    const best = this.times.map((ts) => (ts.length ? Math.min(...ts) : null));
    const avg = this.times.map((ts) => (ts.length ? ts.reduce((s, v) => s + v, 0) / ts.length : null));
    const fmt = (v) => (v == null ? '—' : `${Math.round(v)} ms`);
    this.finish({
      winner: BaseGame.decide(this.wins[0], this.wins[1]),
      scores: this.wins.slice(),
      scoreLabel: 'Rondas ganadas',
      stats: [
        { label: 'Mejor reacción', values: best.map(fmt), raw: best.map((v) => v ?? 9999), better: 'low' },
        { label: 'Reacción media', values: avg.map(fmt), raw: avg.map((v) => v ?? 9999), better: 'low' },
        { label: 'Salidas en falso', values: this.falses.map(String), raw: this.falses, better: 'low' },
      ],
      records: best,
      flags: [{ best: best[0] }, { best: best[1] }],
      margin: Math.abs(this.wins[0] - this.wins[1]),
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    // cielo de atardecer neón
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1B1240');
    sky.addColorStop(0.55, '#3A1F55');
    sky.addColorStop(0.75, '#5A2A4F');
    sky.addColorStop(1, '#120C22');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    glowCircle(g, W / 2, 470, 300, '#FF8E3C', 0.5);
    // ciudad
    g.fillStyle = '#140D2A';
    for (let i = 0; i < 26; i++) {
      const bw = 40 + ((i * 37) % 50), bh = 60 + ((i * 53) % 150);
      const x = i * 52 - 20;
      g.fillRect(x, 520 - bh, bw, bh);
      g.fillStyle = 'rgba(255,201,60,0.35)';
      for (let k = 0; k < 4; k++) if ((i + k) % 3 === 0) g.fillRect(x + 8 + (k % 2) * 16, 520 - bh + 14 + k * 18, 6, 8);
      g.fillStyle = '#140D2A';
    }
    // suelo
    const fl = g.createLinearGradient(0, 520, 0, H);
    fl.addColorStop(0, '#24163F');
    fl.addColorStop(1, '#0B0818');
    g.fillStyle = fl;
    g.fillRect(0, 520, W, H - 520);
    g.strokeStyle = 'rgba(155,108,255,0.25)';
    g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(W / 2 + i * 20, 520); g.lineTo(W / 2 + i * 140, H); g.stroke(); }

    this.drawPanel(g, t);

    // pedestales y botones
    for (const p of [0, 1]) {
      const bx = p ? 880 : 400, by = 560;
      const col = this.color(p);
      g.fillStyle = '#1A2446';
      roundRect(g, bx - 46, by - 10, 92, 80, 12); g.fill();
      g.fillStyle = shade(col, -0.5);
      g.beginPath(); g.ellipse(bx, by - 6, 40, 14, 0, 0, TAU); g.fill();
      const press = this.btn[p] * 7;
      if (quality.glow && this.btn[p] > 0.1) { g.save(); g.shadowColor = col; g.shadowBlur = 30; }
      g.fillStyle = col;
      g.beginPath(); g.ellipse(bx, by - 16 + press, 34, 12, 0, 0, TAU); g.fill();
      g.fillRect(bx - 34, by - 16 + press, 68, 10 - press);
      if (quality.glow && this.btn[p] > 0.1) g.restore();
      g.fillStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.ellipse(bx - 10, by - 20 + press, 10, 3.5, 0, 0, TAU); g.fill();
    }
    // personajes
    for (const p of [0, 1]) {
      const x = p ? 1050 : 230;
      let anim = 'idle';
      if (this.state === 'signal' && this.react[p] != null) anim = 'attack';
      if (this.state === 'resolve') {
        if (this.fs === p || this.fs === 2) anim = 'dizzy';
        else if (this.roundWinner === p) anim = 'win';
        else if (this.roundWinner === 1 - p) anim = 'lose';
      }
      if (this.state === 'wait' && this.activeDecoy()) anim = 'hurt';
      drawCharacter(g, { id: this.players[p].char, x, y: 600, s: 2.3, color: this.color(p), anim, t: t + p * 0.7, facing: p ? -1 : 1, acc: this.players[p].acc });
    }
  }

  drawPanel(g, t) {
    const x = 400, y = 120, w = 480, h = 250;
    const signal = this.state === 'signal' || (this.state === 'resolve' && this.fs < 0 && this.react.some((v) => v != null));
    const decoy = this.activeDecoy();
    panel(g, x - 14, y - 14, w + 28, h + 28, { r: 34, fill: '#120F2A', stroke: 'rgba(155,108,255,0.5)', lineWidth: 3 });
    const inner = signal ? '#2DBF7E' : decoy && this.sig === 'flash' ? '#C9433A' : '#0E1530';
    panel(g, x, y, w, h, { r: 24, fill: inner, glow: signal ? '#48D597' : null, glowSize: 60 });
    const cx = x + w / 2, cy = y + h / 2;
    if (this.state === 'prep' && this.time === 0) {
      text(g, SIGNAL_NAMES[this.sig].toUpperCase(), cx, cy - 10, { size: 40, color: 'rgba(246,247,251,0.5)' });
      text(g, 'Esperá la señal verde', cx, cy + 40, { size: 18, body: true, color: 'rgba(246,247,251,0.5)' });
      return;
    }
    if (this.state === 'prep') {
      text(g, 'PREPARADOS...', cx, cy - 10, { size: 46, color: '#fff' });
      text(g, `Señal: ${SIGNAL_NAMES[this.sig]}`, cx, cy + 44, { size: 18, body: true, color: 'rgba(246,247,251,0.65)' });
      return;
    }
    if (this.state === 'resolve' && !signal) {
      text(g, this.fs >= 0 ? '¡FALTA!' : '...', cx, cy, { size: 64, color: this.fs >= 0 ? '#FF8A78' : '#8C96B8' });
      return;
    }
    switch (this.sig) {
      case 'flash':
        if (signal) text(g, '¡YA!', cx, cy, { size: 120, color: '#0B1020' });
        else if (decoy) text(g, '¡NO!', cx, cy, { size: 100, color: '#FFD1C9' });
        else text(g, '•  •  •', cx, cy, { size: 50, color: `rgba(140,150,184,${0.4 + Math.sin(t * 5) * 0.3})` });
        break;
      case 'lights': {
        for (let i = 0; i < 3; i++) {
          const lx = cx - 140 + i * 140, ly = cy;
          g.fillStyle = '#060914';
          g.beginPath(); g.arc(lx, ly, 52, 0, TAU); g.fill();
          let col = '#2A1720';
          if (signal) col = '#48D597';
          else if (decoy) col = '#FFC93C';
          else if (i < this.lightsOn) col = '#FF3B30';
          if (col !== '#2A1720') glowCircle(g, lx, ly, 100, col, 0.8);
          g.fillStyle = col;
          g.beginPath(); g.arc(lx, ly, 42, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.beginPath(); g.arc(lx - 12, ly - 14, 10, 0, TAU); g.fill();
        }
        break;
      }
      case 'word': {
        if (signal) text(g, '¡YA!', cx, cy, { size: 120, color: '#0B1020' });
        else if (decoy) text(g, decoy.word, cx, cy, { size: 96, color: '#FF8A78' });
        else text(g, WORDS[this.wordIdx % WORDS.length], cx, cy, { size: 62, color: '#C7CEE8' });
        break;
      }
      case 'bell': {
        let swing = 0;
        if (signal) swing = Math.sin(this.st * 24) * 0.5 * Math.max(0, 1 - this.st);
        else if (decoy) swing = Math.sin(t * 50) * 0.06;
        g.save();
        g.translate(cx, y + 34);
        g.rotate(swing);
        g.strokeStyle = '#8C96B8'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 24); g.stroke();
        const bc = signal ? '#FFE45C' : '#B08A2E';
        if (signal) glowCircle(g, 0, 100, 160, '#FFE45C', 0.9);
        g.fillStyle = bc;
        g.beginPath(); g.moveTo(-70, 150); g.quadraticCurveTo(-64, 30, 0, 24); g.quadraticCurveTo(64, 30, 70, 150); g.closePath(); g.fill();
        g.fillRect(-80, 146, 160, 14);
        g.fillStyle = shade(bc, -0.3);
        g.beginPath(); g.arc(0, 170, 14, 0, TAU); g.fill();
        g.restore();
        if (signal) text(g, '¡DING!', cx + 170, cy - 60, { size: 40, color: '#0B1020' });
        break;
      }
    }
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.wins, sub: [`Gana con ${this.toWin}`, `Gana con ${this.toWin}`],
      center: `RONDA ${Math.min(this.round, this.roundsTotal)}`, centerSub: `de ${this.roundsTotal}`,
    });
    // tiempos de reacción
    if (this.state === 'resolve' || this.state === 'signal') {
      for (const p of [0, 1]) {
        const v = this.react[p];
        const x = p ? 1050 : 230;
        if (v != null) {
          const k = Math.min(1, (this.state === 'signal' ? this.st - this.pressAt[p] : this.st + 0.4) * 4);
          text(g, `${Math.round(v)} ms`, x, 330, { size: 40 * ease.outBack(k), color: '#fff', stroke: '#0B1020', glow: this.color(p) });
        }
      }
    }
    if (this.state === 'resolve' && this.msg) {
      const k = Math.min(1, this.st * 3);
      panel(g, W / 2 - 330, 410, 660, 64, { r: 32, fill: 'rgba(11,16,32,0.88)', stroke: this.roundWinner >= 0 ? this.color(this.roundWinner) : '#8C96B8' });
      text(g, this.msg, W / 2, 442, { size: 28 * (0.7 + 0.3 * ease.outBack(k)), color: '#fff' });
    }
  }
}

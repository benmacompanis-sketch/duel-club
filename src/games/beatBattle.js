// JUEGO 10 — BEAT BATTLE (ritmo)
// Canciones originales generadas por el secuenciador del juego; las notas se derivan de los
// eventos reales de la canción (bombo, caja, melodía). La sincronización se basa en el reloj
// de alta precisión + marca de tiempo de cada pulsación, no en la animación.
import { BaseGame } from './baseGame.js';
import { drawCharacter } from '../core/characters.js';
import { compileSong, SONGS } from '../core/audioManager.js';
import { W, H, TAU, clamp, choice, text, panel, rgba, roundRect, glowCircle, quality, shade, ease } from '../core/utils.js';

const LANES = ['left', 'down', 'up', 'right'];
const HIT_Y = 610, TOP = 108, LANE_W = 72;
const WIN = { perfect: 0.045, great: 0.09, good: 0.135 };
const JUDGE = {
  perfect: { label: 'PERFECT', color: '#FFE45C', pts: 300 },
  great: { label: 'GREAT', color: '#48D597', pts: 200 },
  good: { label: 'GOOD', color: '#25CFE6', pts: 100 },
  miss: { label: 'MISS', color: '#FF654F', pts: 0 },
};
const SONG_IDS = ['beat1', 'beat2', 'beat3'];

function buildChart(song, diff) {
  const tier = diff < 0.3 ? 0 : diff < 0.8 ? 1 : 2;
  const grid = [4, 2, 1][tier];
  const minGap = [0.4, 0.21, diff > 1.1 ? 0.11 : 0.13][tier];
  const laneGap = [0.5, 0.26, 0.17][tier];
  const byStep = new Map();
  const add = (step, lane, prio, t) => {
    const cur = byStep.get(step);
    if (!cur || prio > cur.prio) byStep.set(step, { step, lane, prio, t, extra: cur ? cur.lane : null });
    else if (cur && cur.extra == null) cur.extra = lane;
  };
  let lastDeg = null, lane = 1;
  for (const e of song.events) {
    if (e.step % grid !== 0) continue;
    const bar = Math.floor(e.step / 16);
    if (e.inst === 'lead') {
      if (lastDeg != null) lane = clamp(lane + Math.sign(e.deg - lastDeg) * (Math.abs(e.deg - lastDeg) > 2 ? 2 : 1), 0, 3);
      if (lastDeg === e.deg) lane = (lane + 2) % 4;
      lastDeg = e.deg;
      add(e.step, lane, 3, e.time);
    } else if (e.inst === 'snare' && e.vel >= 0.85) add(e.step, bar % 2 ? 2 : 1, 2, e.time);
    else if (e.inst === 'clap') add(e.step, bar % 2 ? 1 : 2, 1.5, e.time);
    else if (e.inst === 'kick') add(e.step, bar % 2 ? 3 : 0, 1, e.time);
  }
  const steps = [...byStep.values()].sort((a, b) => a.step - b.step);
  const notes = [];
  const laneLast = [-9, -9, -9, -9];
  let last = -9;
  for (const s of steps) {
    if (s.t - last < minGap) continue;
    let ln = s.lane;
    if (s.t - laneLast[ln] < laneGap) {
      const alt = [0, 1, 2, 3].filter((l) => s.t - laneLast[l] >= laneGap).sort((a, b) => Math.abs(a - ln) - Math.abs(b - ln));
      if (!alt.length) continue;
      ln = alt[0];
    }
    notes.push({ t: s.t, lane: ln });
    laneLast[ln] = s.t;
    last = s.t;
    // acordes dobles en dificultad alta, sobre tiempos fuertes
    if (tier === 2 && s.extra != null && s.step % 8 === 0 && s.extra !== ln && s.t - laneLast[s.extra] >= laneGap) {
      notes.push({ t: s.t, lane: s.extra });
      laneLast[s.extra] = s.t;
    }
  }
  return notes;
}

export default class BeatBattle extends BaseGame {
  static meta = {
    id: 'beat', num: 10, name: 'BEAT BATTLE', short: 'BEAT', category: 'Ritmo', color: '#FF5FA2',
    tagline: 'Misma canción, mismo ritmo, un solo ganador.',
    description: 'Las notas bajan por cuatro carriles. Pulsá la dirección correcta justo cuando cada nota toca la línea. PERFECT, GREAT y GOOD suman puntos; los aciertos seguidos suben el multiplicador hasta x4. Si se te escapa una nota, el combo vuelve a cero.',
    goal: 'Hacé más puntos que tu rival en la misma canción.',
    controls: [{ actions: ['left', 'down', 'up', 'right'], label: 'Carriles ← ↓ ↑ →' }],
    events: ['double', 'speed'],
    noMusic: true,
    options: [
      { key: 'song', label: 'Canción', choices: [['random', 'Azar'], ['beat1', '108 BPM'], ['beat2', '124 BPM'], ['beat3', '140 BPM']], def: 'random' },
      { key: 'speed', label: 'Velocidad', choices: [[1, 'Normal'], [1.3, 'Rápida'], [1.6, 'Turbo']], def: 1 },
    ],
    record: { label: 'Puntos en una canción', better: 'higher', format: (v) => `${v} pts` },
    drawIcon(g, t) {
      const cols = ['#FF5FA2', '#25CFE6', '#48D597', '#FFC93C'];
      for (let i = 0; i < 4; i++) {
        g.fillStyle = 'rgba(255,255,255,0.06)';
        roundRect(g, 30 + i * 36, 20, 30, 160, 10); g.fill();
        const y = ((t * 90 + i * 47) % 150) + 20;
        g.fillStyle = cols[i];
        roundRect(g, 32 + i * 36, y, 26, 16, 6); g.fill();
      }
      g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(24, 150); g.lineTo(176, 150); g.stroke();
    },
  };

  init() {
    let sid = this.options.song ?? 'random';
    if (!SONGS[sid] || !SONG_IDS.includes(sid)) sid = choice(SONG_IDS);
    this.songId = sid;
    this.song = compileSong(sid);
    this.chart = buildChart(this.song, this.diff);
    this.speed = (430 + this.diff * 130) * (this.options.speed ?? 1) * (this.event === 'speed' ? 1.35 : 1);
    this.timeScale = 1; // la canción manda: el evento de velocidad acelera el desplazamiento de las notas
    this.lead = 2.0;
    this.started = false;
    this.songTime = -this.lead;
    this.notes = [0, 1].map(() => this.chart.map((n) => ({ ...n, hit: null })));
    this.next = [0, 0];
    this.score = [0, 0];
    this.combo = [0, 0];
    this.maxCombo = [0, 0];
    this.counts = [0, 1].map(() => ({ perfect: 0, great: 0, good: 0, miss: 0 }));
    this.judge = [null, null];
    this.laneFlash = [[0, 0, 0, 0], [0, 0, 0, 0]];
    this.duration = this.song.duration;
    this.fieldX = [W * 0.27, W * 0.73];
    this.player = null;
  }

  mult(p) {
    return Math.min(4, 1 + Math.floor(this.combo[p] / 10));
  }
  // el evento "puntos dobles" se aplica en el último tercio de la canción
  scoreMul() {
    return this.event === 'double' && this.songTime >= (this.song.duration * 2) / 3 ? 2 : 1;
  }
  offset() {
    return this.audio.latency() + (this.app.settings.beatOffset || 0) / 1000;
  }
  clock() {
    return performance.now() / 1000 - this.perfStart - this.offset();
  }

  startSong(from = 0, lead = this.lead) {
    this.perfStart = performance.now() / 1000 + lead - from;
    if (this.audio.ctx && this.audio.ctx.state === 'running') {
      this.player = this.audio.playSong(this.songId, { when: this.audio.ctx.currentTime + lead, offset: Math.max(0, from) });
    }
    this.started = true;
  }

  onPause() {
    this.pausedAt = this.songTime;
    if (this.player) this.audio.stopPlayer(this.player, 0.05);
    this.player = null;
  }
  onResume() {
    if (!this.started) return;
    this.startSong(Math.max(0, this.pausedAt), 1.2);
  }
  destroy() {
    if (this.player) this.audio.stopPlayer(this.player, 0.1);
    this.player = null;
    super.destroy();
  }

  ambient(dt) {
    for (const lf of this.laneFlash) for (let i = 0; i < 4; i++) lf[i] = Math.max(0, lf[i] - dt * 6);
    for (const j of this.judge) if (j) j.t -= dt;
  }

  update(dt) {
    this.ambient(dt);
    if (!this.started) this.startSong();
    this.songTime = this.clock();
    for (const p of [0, 1]) {
      const inp = this.inputs[p];
      const notes = this.notes[p];
      // notas perdidas
      while (this.next[p] < notes.length && this.songTime - notes[this.next[p]].t > WIN.good) {
        const n = notes[this.next[p]];
        if (!n.hit) { n.hit = 'miss'; this.registerJudge(p, 'miss', n.lane); }
        this.next[p]++;
      }
      for (let lane = 0; lane < 4; lane++) {
        if (!inp.pressed(LANES[lane])) continue;
        this.laneFlash[p][lane] = 1;
        const ts = inp.pressTime(LANES[lane]);
        const t = ts != null ? ts / 1000 - this.perfStart - this.offset() : this.songTime;
        // la nota sin acertar más cercana en ese carril dentro de la ventana
        let best = null, bd = Infinity;
        for (let i = this.next[p]; i < notes.length; i++) {
          const n = notes[i];
          if (n.t - t > WIN.good) break;
          if (n.lane !== lane || n.hit) continue;
          const d = Math.abs(n.t - t);
          if (d < bd) { bd = d; best = n; }
        }
        if (best && bd <= WIN.good) {
          const j = bd <= WIN.perfect ? 'perfect' : bd <= WIN.great ? 'great' : 'good';
          best.hit = j;
          this.registerJudge(p, j, lane);
        }
      }
      while (this.next[p] < notes.length && notes[this.next[p]].hit) this.next[p]++;
    }
    if (this.songTime > this.song.duration + 0.6) this.end();
  }

  registerJudge(p, j, lane) {
    this.counts[p][j]++;
    if (j === 'miss') {
      if (this.combo[p] >= 10) this.sfx('miss');
      this.combo[p] = 0;
    } else {
      this.combo[p]++;
      this.maxCombo[p] = Math.max(this.maxCombo[p], this.combo[p]);
      const pts = JUDGE[j].pts * this.mult(p) * this.scoreMul();
      this.score[p] += pts;
      const x = this.laneX(p, lane);
      this.fx.burst(x, HIT_Y, [JUDGE[j].color, this.color(p), '#fff'], j === 'perfect' ? 14 : 8, { speed: 260, gravity: 200, life: 0.5 });
      if (this.combo[p] % 25 === 0) { this.fx.float(this.fieldX[p], 300, `¡${this.combo[p]} COMBO!`, '#FFE45C', 34); this.sfx('combo'); }
      this.sfx('tap', { gap: 10 });
    }
    this.judge[p] = { j, t: 0.6 };
  }

  laneX(p, lane) {
    return this.fieldX[p] + (lane - 1.5) * LANE_W;
  }

  end() {
    if (this.player) this.audio.stopPlayer(this.player, 1.2);
    this.player = null;
    const [a, b] = this.score;
    const acc = this.counts.map((c) => {
      const total = c.perfect + c.great + c.good + c.miss;
      return total ? Math.round(((c.perfect + c.great * 0.75 + c.good * 0.4) / total) * 100) : 0;
    });
    const C = this.counts;
    this.finish({
      winner: BaseGame.decide(a, b),
      scores: [a, b],
      display: [a, b].map((v) => v.toLocaleString('es')),
      scoreLabel: 'Puntos',
      stats: [
        { label: 'PERFECT', values: C.map((c) => String(c.perfect)), raw: C.map((c) => c.perfect), better: 'high' },
        { label: 'GREAT', values: C.map((c) => String(c.great)) },
        { label: 'GOOD', values: C.map((c) => String(c.good)) },
        { label: 'MISS', values: C.map((c) => String(c.miss)), raw: C.map((c) => c.miss), better: 'low' },
        { label: 'Combo máximo', values: this.maxCombo.map(String), raw: this.maxCombo, better: 'high' },
        { label: 'Precisión', values: acc.map((v) => v + '%'), raw: acc, better: 'high' },
      ],
      records: [a, b],
      flags: [0, 1].map((p) => ({ perfects: C[p].perfect, maxCombo: this.maxCombo[p] })),
      margin: null,
    });
  }

  // ------------------------------------------------------------------ dibujo
  render(g) {
    const t = this.realTime;
    const beat = this.songTime * (this.song.bpm / 60);
    const pulse = this.songTime > 0 ? Math.pow(1 - (beat % 1), 3) : 0;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1F0F35');
    bg.addColorStop(1, '#0B0820');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // ecualizador de fondo
    for (let i = 0; i < 40; i++) {
      const hgt = 40 + Math.abs(Math.sin(i * 1.7 + beat * 1.5)) * 120 * (0.4 + pulse * 0.6);
      g.fillStyle = rgba(i % 2 ? '#9B6CFF' : '#FF5FA2', 0.12);
      g.fillRect(i * 32 + 4, H - hgt, 24, hgt);
    }
    glowCircle(g, W / 2, 380, 280 + pulse * 40, '#FF5FA2', 0.25 + pulse * 0.3);
    // personajes bailando en el centro
    for (const p of [0, 1]) {
      const anim = this.combo[p] >= 20 ? 'celebrate' : this.judge[p]?.j === 'miss' && this.judge[p].t > 0 ? 'hurt' : 'idle';
      const bob = -pulse * 10;
      drawCharacter(g, { id: this.players[p].char, x: W / 2 + (p ? 52 : -52), y: 560 + bob, s: 0.95, color: this.color(p), anim, t: anim === 'idle' ? beat * 0.8 + p : t + p, facing: p ? -1 : 1, acc: this.players[p].acc });
    }
    for (const p of [0, 1]) this.drawField(g, p, pulse);
  }

  drawField(g, p, pulse) {
    const cx = this.fieldX[p];
    const col = this.color(p);
    const fw = LANE_W * 4 + 16;
    panel(g, cx - fw / 2, TOP - 6, fw, H - TOP - 4, { r: 20, fill: 'rgba(8,10,24,0.82)', stroke: rgba(col, 0.5 + pulse * 0.3), lineWidth: 2 });
    const laneCols = ['#FF5FA2', '#25CFE6', '#48D597', '#FFC93C'];
    for (let l = 0; l < 4; l++) {
      const x = this.laneX(p, l);
      g.fillStyle = rgba(laneCols[l], 0.05 + this.laneFlash[p][l] * 0.25);
      g.fillRect(x - LANE_W / 2 + 3, TOP, LANE_W - 6, H - TOP - 14);
    }
    // línea de golpe y receptores
    g.fillStyle = rgba('#F6F7FB', 0.5);
    g.fillRect(cx - fw / 2 + 6, HIT_Y - 2, fw - 12, 4);
    for (let l = 0; l < 4; l++) {
      const x = this.laneX(p, l);
      const fl = this.laneFlash[p][l];
      this.arrow(g, x, HIT_Y, l, 30 * (1 + fl * 0.15), fl > 0.1 ? laneCols[l] : 'rgba(246,247,251,0.25)', true);
    }
    // notas visibles
    const notes = this.notes[p];
    for (let i = this.next[p]; i < notes.length; i++) {
      const n = notes[i];
      const y = HIT_Y - (n.t - this.songTime) * this.speed;
      if (y < TOP - 30) break;
      if (n.hit) continue;
      this.arrow(g, this.laneX(p, n.lane), y, n.lane, 30, laneCols[n.lane], false);
    }
    // notas fallidas que se van
    for (let i = Math.max(0, this.next[p] - 6); i < this.next[p]; i++) {
      const n = notes[i];
      if (n.hit !== 'miss') continue;
      const y = HIT_Y - (n.t - this.songTime) * this.speed;
      if (y > H) continue;
      g.globalAlpha = 0.3;
      this.arrow(g, this.laneX(p, n.lane), y, n.lane, 28, '#555', false);
      g.globalAlpha = 1;
    }
    // juicio
    const jd = this.judge[p];
    if (jd && jd.t > 0) {
      const J = JUDGE[jd.j];
      const k = 1 - jd.t / 0.6;
      text(g, J.label, cx, 662, { size: 34 * (1 + (1 - ease.outBack(Math.min(1, k * 4))) * 0.4), color: J.color, stroke: '#0B1020', alpha: Math.min(1, jd.t * 3) });
    }
    if (this.combo[p] >= 4) {
      text(g, String(this.combo[p]), cx, 380, { size: 64, color: '#fff', alpha: 0.32 });
      text(g, `COMBO · x${this.mult(p)}`, cx, 424, { size: 14, body: true, weight: 800, color: col, alpha: 0.6 });
    }
    if (this.songTime < 0 && this.started) {
      text(g, 'PREPARATE', cx, 300, { size: 26, color: rgba('#F6F7FB', 0.6) });
    }
  }

  arrow(g, x, y, lane, s, color, receptor) {
    g.save();
    g.translate(x, y);
    g.rotate([Math.PI, Math.PI / 2, -Math.PI / 2, 0][lane]);
    g.beginPath();
    g.moveTo(s * 0.8, 0);
    g.lineTo(0, -s * 0.8);
    g.lineTo(0, -s * 0.36);
    g.lineTo(-s * 0.75, -s * 0.36);
    g.lineTo(-s * 0.75, s * 0.36);
    g.lineTo(0, s * 0.36);
    g.lineTo(0, s * 0.8);
    g.closePath();
    if (receptor) {
      g.lineWidth = 4;
      g.strokeStyle = color;
      g.lineJoin = 'round';
      g.stroke();
    } else {
      if (quality.glow) { g.shadowColor = color; g.shadowBlur = 12; }
      g.fillStyle = color;
      g.fill();
      g.shadowBlur = 0;
      g.lineWidth = 2.5;
      g.strokeStyle = shade(color, -0.45);
      g.stroke();
    }
    g.restore();
  }

  renderHUD(g) {
    this.hudTop(g, {
      scores: this.score.map((v) => v.toLocaleString('es')), scoreSize: 28,
      sub: this.counts.map((c) => `${c.perfect} perfect · ${c.miss} miss`),
      center: SONGS[this.songId].title.toUpperCase(), centerSub: `${this.song.bpm} BPM`, centerSize: 16,
    });
    const k = clamp(this.songTime / this.song.duration, 0, 1);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, W / 2 - 200, 86, 400, 6, 3); g.fill();
    g.fillStyle = '#FF5FA2';
    roundRect(g, W / 2 - 200, 86, 400 * k, 6, 3); g.fill();
  }
}

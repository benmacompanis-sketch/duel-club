// AudioManager: identidad sonora 100% original generada con Web Audio API.
// - Sintetizador de efectos (SFX) con limitación de voces.
// - Secuenciador musical con "lookahead scheduling" sobre el reloj de audio (preciso).
// - Canciones compuestas proceduralmente con semilla fija (siempre suenan igual).
// El AudioContext se crea/reanuda con el primer gesto del usuario (política de autoplay).
import { mulberry32, clamp } from './utils.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10] };
const QUAL = { min: [0, 3, 7], maj: [0, 4, 7], sus2: [0, 2, 7], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10] };

// ------------------------------------------------------------------------------------
// Canciones (definición). prog: acordes por compás [desplazamiento desde la tónica, calidad].
// ------------------------------------------------------------------------------------
const DRUMS = {
  chill: { kick: 'x.........x.....', snare: '....x.......x...', hat: '..x...x...x...x.' },
  drive: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x.x.x...x.x.xx' },
  dance: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '....x.......x..x' },
  break: { kick: 'x.....x...x.....', snare: '....x.......x.x.', hat: 'x.x.x.x.x.x.x.xx' },
  half: { kick: 'x.......x.......', snare: '........x.......', hat: 'x...x...x...x...' },
};

export const SONGS = {
  menu: {
    title: 'Neón de Bienvenida', bpm: 100, key: 57, scale: 'minor', seed: 101, loop: true,
    prog: [[0, 'min7'], [-4, 'maj7'], [3, 'maj'], [-2, 'maj']],
    drums: 'chill', bassPattern: 'x..x..x...x..x..', arp: 'up8',
    sections: [
      { bars: 4, layers: ['pad', 'bass', 'arp', 'hat'] },
      { bars: 8, layers: ['pad', 'bass', 'arp', 'hat', 'kick', 'snare', 'lead'] },
      { bars: 4, layers: ['pad', 'bass', 'kick', 'hat', 'arp'] },
    ],
  },
  game: {
    title: 'Competencia', bpm: 124, key: 52, scale: 'minor', seed: 202, loop: true,
    prog: [[0, 'min'], [-4, 'maj'], [-2, 'maj'], [-5, 'min']],
    drums: 'drive', bassPattern: 'x.xx..x.x.xx..x.', arp: 'updown16',
    sections: [
      { bars: 4, layers: ['bass', 'kick', 'hat', 'arp'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'arp', 'lead'] },
      { bars: 4, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'stab'] },
    ],
  },
  tension: {
    title: 'Último Asalto', bpm: 136, key: 50, scale: 'minor', seed: 303, loop: true,
    prog: [[0, 'min'], [-4, 'maj'], [-7, 'min'], [-5, 'dom7']],
    drums: 'dance', bassPattern: 'x.x.x.x.x.x.x.x.', arp: 'up16',
    sections: [
      { bars: 4, layers: ['bass', 'kick', 'hat', 'arp'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
    ],
  },
  results: {
    title: 'Marcador', bpm: 92, key: 60, scale: 'major', seed: 404, loop: true,
    prog: [[0, 'maj7'], [-3, 'min7'], [5, 'maj7'], [7, 'maj']],
    drums: 'half', bassPattern: 'x.......x...x...', arp: 'up8',
    sections: [{ bars: 8, layers: ['pad', 'bass', 'arp', 'hat', 'kick', 'snare'] }],
  },
  champion: {
    title: 'Campeón', bpm: 118, key: 53, scale: 'major', seed: 505, loop: true,
    prog: [[0, 'maj'], [2, 'min'], [5, 'maj'], [7, 'maj']],
    drums: 'dance', bassPattern: 'x...x.x.x...x.x.', arp: 'updown16',
    sections: [{ bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] }],
  },
  // --- canciones de BEAT BATTLE (no se repiten en bucle) ---
  beat1: {
    title: 'Neón Nocturno', bpm: 108, key: 57, scale: 'minor', seed: 1108, loop: false,
    prog: [[0, 'min'], [-4, 'maj'], [3, 'maj'], [-2, 'maj']],
    drums: 'drive', bassPattern: 'x..x..x.x..x..x.', arp: 'up8',
    sections: [
      { bars: 2, layers: ['pad', 'hat'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'lead'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'arp', 'lead'] },
      { bars: 4, layers: ['pad', 'bass', 'kick', 'hat', 'stab'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
      { bars: 1, layers: ['pad'] },
    ],
  },
  beat2: {
    title: 'Pulso Arcade', bpm: 124, key: 55, scale: 'dorian', seed: 2124, loop: false,
    prog: [[0, 'min7'], [5, 'dom7'], [-2, 'maj'], [3, 'maj']],
    drums: 'dance', bassPattern: 'x.xx..x.x.x...x.', arp: 'updown16',
    sections: [
      { bars: 2, layers: ['bass', 'hat'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'lead'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
      { bars: 4, layers: ['bass', 'kick', 'hat', 'stab'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
      { bars: 1, layers: ['pad'] },
    ],
  },
  beat3: {
    title: 'Turbo Club', bpm: 140, key: 52, scale: 'minor', seed: 3140, loop: false,
    prog: [[0, 'min'], [-2, 'maj'], [-4, 'maj'], [-5, 'min']],
    drums: 'break', bassPattern: 'x.x.x.xxx.x.x.xx', arp: 'up16',
    sections: [
      { bars: 2, layers: ['kick', 'hat'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'hat', 'lead'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
      { bars: 4, layers: ['bass', 'kick', 'snare', 'hat', 'stab'] },
      { bars: 8, layers: ['pad', 'bass', 'kick', 'snare', 'clap', 'hat', 'arp', 'lead'] },
      { bars: 1, layers: ['pad'] },
    ],
  },
};

function chordTones(def, chord) {
  const root = def.key + chord[0];
  return QUAL[chord[1]].map((i) => root + i);
}
function fitRange(m, lo, hi) {
  while (m < lo) m += 12;
  while (m > hi) m -= 12;
  return m;
}
function nearestChordTone(m, tones) {
  let best = m, bd = 99;
  for (const t of tones) {
    for (let o = -24; o <= 24; o += 12) {
      const d = Math.abs(t + o - m);
      if (d < bd) { bd = d; best = t + o; }
    }
  }
  return best;
}

function makeMotif(rng) {
  const notes = [];
  let step = 0;
  while (step < 32) {
    const strong = step % 8 === 0;
    const r = rng();
    let dur = r < 0.42 ? 2 : r < 0.72 ? 4 : r < 0.86 ? 1 : r < 0.95 ? 3 : 6;
    if (step % 2 === 1 && dur > 1) dur = 1;
    dur = Math.min(dur, 32 - step);
    const rest = !strong && rng() < 0.2;
    if (!rest) notes.push({ step, dur });
    step += dur;
  }
  let deg = 2 + Math.floor(rng() * 3);
  const moves = [-2, -1, -1, 0, 1, 1, 1, 2, 2, -3, 3];
  for (const n of notes) {
    deg = clamp(deg + moves[Math.floor(rng() * moves.length)], 0, 9);
    n.deg = deg;
  }
  return notes;
}

/** Compila una canción a una lista de eventos {step, inst, notes, dur, vel}. */
export function compileSong(id) {
  const def = SONGS[id];
  const rng = mulberry32(def.seed);
  const scale = SCALES[def.scale];
  const motifs = [makeMotif(rng), makeMotif(rng)];
  const dr = DRUMS[def.drums];
  const ev = [];
  let bar = 0;
  const degToMidi = (deg) => def.key + 12 + scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
  for (const sec of def.sections) {
    for (let b = 0; b < sec.bars; b++, bar++) {
      const chord = def.prog[bar % def.prog.length];
      const tones = chordTones(def, chord);
      const base = bar * 16;
      const L = new Set(sec.layers);
      const lastOfPhrase = b === sec.bars - 1 && sec.bars >= 4;
      for (let s = 0; s < 16; s++) {
        const st = base + s;
        if (L.has('kick') && dr.kick[s] === 'x') ev.push({ step: st, inst: 'kick', vel: s === 0 ? 1 : 0.85 });
        if (L.has('snare')) {
          if (lastOfPhrase && s >= 12) ev.push({ step: st, inst: 'snare', vel: 0.45 + (s - 12) * 0.15 });
          else if (dr.snare[s] === 'x') ev.push({ step: st, inst: 'snare', vel: 0.9 });
        }
        if (L.has('clap') && dr.clap && dr.clap[s] === 'x') ev.push({ step: st, inst: 'clap', vel: 0.7 });
        if (L.has('hat') && dr.hat[s] === 'x') ev.push({ step: st, inst: 'hat', vel: s % 4 === 2 ? 0.8 : 0.5 });
        if (L.has('bass') && def.bassPattern[s] === 'x') {
          let m = fitRange(tones[0], 36, 50);
          if (s === 14 && rng() < 0.5) m = fitRange(tones[2], 36, 52);
          if (s % 8 === 6 && rng() < 0.3) m += 12;
          ev.push({ step: st, inst: 'bass', notes: [m], dur: 2, vel: 0.9 });
        }
        if (L.has('stab') && (s === 2 || s === 6 || s === 10 || s === 13)) {
          ev.push({ step: st, inst: 'stab', notes: tones.map((t) => fitRange(t, 60, 74)), dur: 1, vel: 0.6 });
        }
      }
      if (L.has('pad')) ev.push({ step: base, inst: 'pad', notes: tones.map((t) => fitRange(t, 55, 67)), dur: 16, vel: 0.5 });
      if (L.has('arp')) {
        const up = tones.map((t) => fitRange(t, 64, 76)).sort((a, c) => a - c);
        const seq = def.arp === 'updown16' ? [...up, up[0] + 12, ...up.slice(1).reverse()] : [...up, up[0] + 12];
        const step = def.arp === 'up8' ? 2 : 1;
        for (let s = 0, i = 0; s < 16; s += step, i++) ev.push({ step: base + s, inst: 'arp', notes: [seq[i % seq.length]], dur: step, vel: s % 4 === 0 ? 0.6 : 0.42 });
      }
      if (L.has('lead')) {
        const phraseBar = b % 8;
        const motif = motifs[phraseBar >= 4 && phraseBar < 6 ? 1 : 0];
        const half = (phraseBar % 2) * 16;
        const inBar = motif.filter((n) => n.step >= half && n.step < half + 16);
        inBar.forEach((n, i) => {
          let m = degToMidi(n.deg);
          if ((n.step - half) % 8 === 0) m = nearestChordTone(m, tones);
          if (phraseBar === 7 && i === inBar.length - 1) m = nearestChordTone(def.key + 12, [def.key]);
          m = fitRange(m, 67, 86);
          ev.push({ step: base + (n.step - half), inst: 'lead', notes: [m], dur: n.dur, vel: 0.55, deg: n.deg });
        });
      }
    }
  }
  ev.sort((a, c) => a.step - c.step);
  const stepDur = 60 / def.bpm / 4;
  for (const e of ev) e.time = e.step * stepDur;
  return { id, def, events: ev, stepDur, totalSteps: bar * 16, duration: bar * 16 * stepDur, bpm: def.bpm };
}

// ------------------------------------------------------------------------------------
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.55, sfx: 0.85 };
    this.compiled = new Map();
    this.players = new Set();
    this.currentMusic = null;
    this.currentId = null;
    this.lastPlay = new Map();
    this.voices = 0;
    this._timer = null;
    this.wantedMusic = null;
  }

  /** Debe llamarse dentro de un gesto del usuario. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        const c = this.ctx;
        this.comp = c.createDynamicsCompressor();
        this.comp.threshold.value = -14;
        this.comp.ratio.value = 4;
        this.master = c.createGain();
        this.musicBus = c.createGain();
        this.sfxBus = c.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(this.comp);
        this.comp.connect(c.destination);
        const len = c.sampleRate * 1;
        this.noise = c.createBuffer(1, len, c.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.applyVolumes();
        this._timer = setInterval(() => this.tick(), 25);
        if (this.wantedMusic) {
          const w = this.wantedMusic;
          this.wantedMusic = null;
          this.playMusic(w);
        }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      console.warn('Audio no disponible', e);
    }
  }
  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }
  now() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }
  latency() {
    if (!this.ctx) return 0;
    return (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
  }
  setVolumes(v) {
    Object.assign(this.vol, v);
    this.applyVolumes();
  }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const curve = (x) => x * x; // percepción logarítmica aproximada
    this.master.gain.setTargetAtTime(curve(this.vol.master), t, 0.03);
    this.musicBus.gain.setTargetAtTime(curve(this.vol.music) * 0.75, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(curve(this.vol.sfx), t, 0.03);
  }

  // ---------------- música ----------------
  song(id) {
    if (!this.compiled.has(id)) this.compiled.set(id, compileSong(id));
    return this.compiled.get(id);
  }
  playMusic(id) {
    if (!this.ctx) {
      this.wantedMusic = id;
      return;
    }
    if (this.currentId === id && this.currentMusic) return;
    this.stopMusic(0.8);
    this.currentId = id;
    if (!id) return;
    this.currentMusic = this.playSong(id, { loop: SONGS[id].loop, fadeIn: 1.2 });
  }
  stopMusic(fade = 0.5) {
    if (this.currentMusic) this.stopPlayer(this.currentMusic, fade);
    this.currentMusic = null;
    this.currentId = null;
  }
  /** Reproduce una canción en el instante `when` (reloj de audio) desde `offset` segundos. */
  playSong(id, { loop = false, when = null, offset = 0, fadeIn = 0.02 } = {}) {
    if (!this.ctx) return null;
    const song = this.song(id);
    const out = this.ctx.createGain();
    out.connect(this.musicBus);
    const t0 = when ?? this.ctx.currentTime + 0.08;
    out.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, t0 + fadeIn);
    let idx = song.events.findIndex((e) => e.time >= offset - 1e-6);
    if (idx < 0) idx = song.events.length;
    const p = { id, song, out, start: t0 - offset, idx, loop, loopN: 0, stopped: false };
    this.players.add(p);
    return p;
  }
  stopPlayer(p, fade = 0.3) {
    if (!p || p.stopped || !this.ctx) return;
    p.stopped = true;
    const t = this.ctx.currentTime;
    p.out.gain.cancelScheduledValues(t);
    p.out.gain.setValueAtTime(p.out.gain.value, t);
    p.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => {
      try { p.out.disconnect(); } catch {}
    }, fade * 1000 + 200);
    this.players.delete(p);
  }
  tick() {
    if (!this.ctx) return;
    const horizon = this.ctx.currentTime + 0.12;
    for (const p of this.players) {
      const evs = p.song.events;
      while (true) {
        if (p.idx >= evs.length) {
          if (p.loop) {
            p.idx = 0;
            p.loopN++;
            p.start += p.song.duration;
            continue;
          }
          break;
        }
        const e = evs[p.idx];
        const at = p.start + e.time;
        if (at > horizon) break;
        if (at >= this.ctx.currentTime - 0.05) this.playInst(e, Math.max(at, this.ctx.currentTime), p.song.stepDur, p.out);
        p.idx++;
      }
      if (!p.loop && p.idx >= evs.length && this.ctx.currentTime > p.start + p.song.duration + 2) this.stopPlayer(p, 0.1);
    }
  }

  // ---------------- instrumentos ----------------
  env(g, t, a, peak, d, sus, r, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sus, t + a, d);
    g.gain.setTargetAtTime(0.0001, t + Math.max(a, len), r);
  }
  osc(type, freq, t, stop, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }
  noiseSrc(t, stop, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(stop);
    return s;
  }
  gain(dest) {
    const g = this.ctx.createGain();
    g.connect(dest);
    return g;
  }
  filter(type, freq, q, dest) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }
  playInst(e, t, stepDur, out) {
    const c = this.ctx;
    const len = (e.dur || 1) * stepDur;
    const v = e.vel ?? 1;
    switch (e.inst) {
      case 'kick': {
        const g = this.gain(out);
        g.gain.setValueAtTime(0.9 * v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        const o = this.osc('sine', 150, t, t + 0.4, g);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        break;
      }
      case 'snare': {
        const g = this.gain(out);
        g.gain.setValueAtTime(0.42 * v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
        const f = this.filter('bandpass', 1900, 0.8, g);
        this.noiseSrc(t, t + 0.2, f);
        const g2 = this.gain(out);
        g2.gain.setValueAtTime(0.25 * v, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        this.osc('triangle', 190, t, t + 0.1, g2);
        break;
      }
      case 'clap': {
        const g = this.gain(out);
        const f = this.filter('bandpass', 1300, 1.2, g);
        g.gain.setValueAtTime(0.0001, t);
        for (let i = 0; i < 3; i++) {
          g.gain.setValueAtTime(0.35 * v, t + i * 0.012);
          g.gain.exponentialRampToValueAtTime(0.02, t + i * 0.012 + 0.01);
        }
        g.gain.setValueAtTime(0.3 * v, t + 0.036);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        this.noiseSrc(t, t + 0.22, f);
        break;
      }
      case 'hat': {
        const g = this.gain(out);
        g.gain.setValueAtTime(0.13 * v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        const f = this.filter('highpass', 7500, 0.5, g);
        this.noiseSrc(t, t + 0.06, f);
        break;
      }
      case 'bass': {
        const g = this.gain(out);
        this.env(g, t, 0.005, 0.32 * v, 0.08, 0.6, 0.04, len * 0.9);
        const f = this.filter('lowpass', 900, 4, g);
        f.frequency.setValueAtTime(1400, t);
        f.frequency.exponentialRampToValueAtTime(260, t + 0.18);
        const fr = mtof(e.notes[0]);
        this.osc('sawtooth', fr, t, t + len + 0.3, f);
        this.osc('square', fr / 2, t, t + len + 0.3, f);
        break;
      }
      case 'pad': {
        const g = this.gain(out);
        this.env(g, t, 0.35, 0.07 * v, 0.6, 0.85, 0.35, len * 0.95);
        const f = this.filter('lowpass', 1500, 0.7, g);
        for (const n of e.notes) {
          const fr = mtof(n);
          const o1 = this.osc('sawtooth', fr, t, t + len + 1.5, f);
          o1.detune.value = -8;
          const o2 = this.osc('sawtooth', fr, t, t + len + 1.5, f);
          o2.detune.value = 8;
        }
        break;
      }
      case 'arp': {
        const g = this.gain(out);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.11 * v, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(0.28, len * 1.6));
        const f = this.filter('lowpass', 3200, 1, g);
        this.osc('triangle', mtof(e.notes[0]), t, t + 0.32, f);
        this.osc('square', mtof(e.notes[0]) * 2, t, t + 0.12, this.gainValue(f, 0.18));
        break;
      }
      case 'stab': {
        const g = this.gain(out);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.09 * v, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        const f = this.filter('lowpass', 2600, 2, g);
        for (const n of e.notes) this.osc('square', mtof(n), t, t + 0.2, f);
        break;
      }
      case 'lead': {
        const g = this.gain(out);
        this.env(g, t, 0.01, 0.12 * v, 0.12, 0.7, 0.06, len * 0.92);
        const f = this.filter('lowpass', 2800, 1.5, g);
        const fr = mtof(e.notes[0]);
        const o = this.osc('square', fr, t, t + len + 0.4, f);
        const o2 = this.osc('sawtooth', fr, t, t + len + 0.4, this.gainValue(f, 0.5));
        o2.detune.value = 6;
        if (len > 0.25) {
          const lfo = c.createOscillator();
          const lg = c.createGain();
          lfo.frequency.value = 5.5;
          lg.gain.value = 9;
          lfo.connect(lg);
          lg.connect(o.detune);
          lfo.start(t + 0.15);
          lfo.stop(t + len + 0.4);
        }
        break;
      }
    }
  }
  gainValue(dest, v) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    return g;
  }

  // ---------------- efectos de sonido ----------------
  tone(freq, dur, { type = 'square', vol = 0.2, slide = null, at = 0, attack = 0.005, filter = null } = {}) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const g = this.gain(this.sfxBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const dest = filter ? this.filter(filter[0], filter[1], filter[2] ?? 1, g) : g;
    const o = this.osc(type, freq, t, t + dur + 0.05, dest);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    this.voices++;
    o.onended = () => {
      this.voices--;
      try { g.disconnect(); } catch {}
    };
    return o;
  }
  noiseHit(dur, { type = 'bandpass', freq = 1200, q = 1, vol = 0.3, at = 0, sweep = null } = {}) {
    const c = this.ctx;
    const t = c.currentTime + at;
    const g = this.gain(this.sfxBus);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const f = this.filter(type, freq, q, g);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const s = this.noiseSrc(t, t + dur + 0.05, f);
    this.voices++;
    s.onended = () => {
      this.voices--;
      try { g.disconnect(); } catch {}
    };
  }
  notes(list, step, opts) {
    list.forEach((m, i) => this.tone(mtof(m), opts.dur ?? step * 1.6, { ...opts, at: (opts.at || 0) + i * step }));
  }

  play(name, o = {}) {
    if (!this.ctx || this.ctx.state !== 'running' || this.vol.sfx <= 0 || this.vol.master <= 0) return;
    const now = performance.now();
    const minGap = o.gap ?? 28;
    if (now - (this.lastPlay.get(name) || 0) < minGap) return;
    if (this.voices > 40) return;
    this.lastPlay.set(name, now);
    const p = o.pitch ?? 1;
    try {
      switch (name) {
        case 'hover': this.tone(1100 * p, 0.05, { type: 'triangle', vol: 0.05 }); break;
        case 'click': this.tone(620 * p, 0.09, { type: 'square', vol: 0.09, slide: 1240 * p, filter: ['lowpass', 3000] }); break;
        case 'back': this.tone(560, 0.1, { type: 'square', vol: 0.08, slide: 300, filter: ['lowpass', 2400] }); break;
        case 'confirm': this.notes([76, 83], 0.06, { type: 'square', vol: 0.09, dur: 0.14, filter: ['lowpass', 3500] }); break;
        case 'ready': this.notes([72, 79, 84], 0.05, { type: 'triangle', vol: 0.16, dur: 0.16 }); break;
        case 'error': this.tone(150, 0.2, { type: 'square', vol: 0.12, slide: 110, filter: ['lowpass', 900] }); break;
        case 'count': this.tone(660, 0.18, { type: 'triangle', vol: 0.25 }); this.tone(1320, 0.08, { type: 'square', vol: 0.04 }); break;
        case 'go':
          this.notes([84, 88, 91], 0.0, { type: 'square', vol: 0.09, dur: 0.45, filter: ['lowpass', 4000] });
          this.tone(1760, 0.3, { type: 'triangle', vol: 0.15 });
          this.noiseHit(0.3, { type: 'highpass', freq: 3000, vol: 0.08 });
          break;
        case 'tick': this.tone(1500, 0.03, { type: 'square', vol: 0.05, filter: ['highpass', 1000] }); break;
        case 'alarm': this.tone(880, 0.12, { type: 'square', vol: 0.08 }); this.tone(880, 0.12, { type: 'square', vol: 0.08, at: 0.16 }); break;
        case 'hit':
          this.noiseHit(0.12, { type: 'bandpass', freq: 1400 * p, q: 0.8, vol: 0.32 });
          this.tone(180 * p, 0.12, { type: 'sine', vol: 0.35, slide: 70 });
          break;
        case 'hitHeavy':
          this.noiseHit(0.25, { type: 'lowpass', freq: 2200, vol: 0.4, sweep: 300 });
          this.tone(120, 0.3, { type: 'sine', vol: 0.5, slide: 40 });
          this.tone(900, 0.06, { type: 'square', vol: 0.06 });
          break;
        case 'block': this.tone(900, 0.08, { type: 'square', vol: 0.07, filter: ['bandpass', 1400, 4] }); this.noiseHit(0.06, { type: 'highpass', freq: 4000, vol: 0.12 }); break;
        case 'score': this.notes([72, 76, 79, 84].map((m) => m + 12 * Math.log2(p)), 0.05, { type: 'square', vol: 0.08, dur: 0.16, filter: ['lowpass', 4000] }); break;
        case 'point': this.tone(1046 * p, 0.12, { type: 'triangle', vol: 0.18 }); this.tone(2093 * p, 0.06, { type: 'sine', vol: 0.06 }); break;
        case 'coin': this.tone(988, 0.06, { type: 'square', vol: 0.07 }); this.tone(1319, 0.2, { type: 'square', vol: 0.07, at: 0.06 }); break;
        case 'win':
          this.notes([60, 64, 67, 72], 0.1, { type: 'square', vol: 0.09, dur: 0.22, filter: ['lowpass', 3600] });
          this.notes([76, 79, 84], 0.0, { type: 'triangle', vol: 0.14, dur: 0.9, at: 0.42 });
          this.notes([64, 67, 72], 0.0, { type: 'sawtooth', vol: 0.04, dur: 0.9, at: 0.42, filter: ['lowpass', 2000] });
          break;
        case 'lose': this.notes([67, 63, 60, 55], 0.14, { type: 'triangle', vol: 0.15, dur: 0.3 }); break;
        case 'draw': this.notes([67, 67], 0.18, { type: 'triangle', vol: 0.14, dur: 0.25 }); this.tone(mtof(71), 0.5, { type: 'triangle', vol: 0.1, at: 0.36 }); break;
        case 'fanfare':
          this.notes([60, 64, 67, 72, 67, 72, 76, 79], 0.09, { type: 'square', vol: 0.08, dur: 0.18, filter: ['lowpass', 3800] });
          this.notes([72, 76, 79, 84], 0.0, { type: 'sawtooth', vol: 0.05, dur: 1.4, at: 0.75, filter: ['lowpass', 2500] });
          this.noiseHit(1.2, { type: 'highpass', freq: 6000, vol: 0.05, at: 0.75 });
          break;
        case 'unlock':
          this.notes([79, 83, 86, 91, 95], 0.06, { type: 'triangle', vol: 0.14, dur: 0.3 });
          this.notes([91, 95, 98], 0.0, { type: 'sine', vol: 0.06, dur: 1.0, at: 0.3 });
          break;
        case 'whoosh': this.noiseHit(0.32, { type: 'bandpass', freq: 400, q: 1.4, vol: 0.22, sweep: 3200 }); break;
        case 'vs':
          this.tone(110, 0.6, { type: 'sine', vol: 0.55, slide: 35 });
          this.noiseHit(0.5, { type: 'lowpass', freq: 3000, vol: 0.35, sweep: 200 });
          this.tone(220, 0.4, { type: 'sawtooth', vol: 0.06, filter: ['lowpass', 900] });
          break;
        case 'jump': this.tone(300 * p, 0.14, { type: 'square', vol: 0.07, slide: 680 * p, filter: ['lowpass', 2500] }); break;
        case 'land': this.tone(140, 0.08, { type: 'sine', vol: 0.18, slide: 60 }); break;
        case 'dash': this.noiseHit(0.18, { type: 'bandpass', freq: 900, q: 2, vol: 0.18, sweep: 2500 }); break;
        case 'boost': this.tone(220, 0.45, { type: 'sawtooth', vol: 0.06, slide: 880, filter: ['lowpass', 2000] }); this.noiseHit(0.4, { type: 'bandpass', freq: 600, vol: 0.1, sweep: 3000 }); break;
        case 'crash': this.noiseHit(0.35, { type: 'lowpass', freq: 1800, vol: 0.38, sweep: 200 }); this.tone(90, 0.3, { type: 'sine', vol: 0.35, slide: 40 }); break;
        case 'bounce': this.tone(520 * p, 0.08, { type: 'sine', vol: 0.22, slide: 380 * p }); break;
        case 'paddle': this.tone(440 * p, 0.07, { type: 'square', vol: 0.1, filter: ['lowpass', 2000] }); this.tone(880 * p, 0.05, { type: 'triangle', vol: 0.08 }); break;
        case 'smash': this.tone(660, 0.12, { type: 'sawtooth', vol: 0.1, slide: 1500, filter: ['lowpass', 4000] }); this.noiseHit(0.15, { type: 'highpass', freq: 2500, vol: 0.2 }); break;
        case 'swish': this.noiseHit(0.35, { type: 'highpass', freq: 2500, vol: 0.12, sweep: 6000 }); this.tone(1568, 0.2, { type: 'sine', vol: 0.08, at: 0.05 }); break;
        case 'rim': this.tone(1180, 0.18, { type: 'sine', vol: 0.12 }); this.tone(1690, 0.12, { type: 'sine', vol: 0.08 }); break;
        case 'flip': this.noiseHit(0.05, { type: 'highpass', freq: 3000, vol: 0.14 }); this.tone(700 * p, 0.05, { type: 'triangle', vol: 0.08 }); break;
        case 'match': this.notes([84, 88, 91], 0.07, { type: 'triangle', vol: 0.14, dur: 0.22 }); break;
        case 'miss': this.tone(400, 0.18, { type: 'triangle', vol: 0.12, slide: 200 }); break;
        case 'paint': this.tone(500 * p, 0.05, { type: 'sine', vol: 0.04 }); break;
        case 'powerup': this.notes([72, 79, 84, 88, 91], 0.035, { type: 'square', vol: 0.07, dur: 0.1, filter: ['lowpass', 5000] }); break;
        case 'freeze': this.tone(2400, 0.4, { type: 'sine', vol: 0.08, slide: 1200 }); this.noiseHit(0.3, { type: 'highpass', freq: 5000, vol: 0.1 }); break;
        case 'zap': {
          const o = this.tone(90, 0.35, { type: 'sawtooth', vol: 0.12, filter: ['lowpass', 1800] });
          if (o) o.frequency.setValueAtTime(140, this.ctx.currentTime + 0.1);
          this.noiseHit(0.3, { type: 'bandpass', freq: 3000, q: 3, vol: 0.12 });
          break;
        }
        case 'warn': this.tone(1200, 0.08, { type: 'square', vol: 0.05, filter: ['lowpass', 3000] }); break;
        case 'shoot': this.noiseHit(0.08, { type: 'highpass', freq: 2000, vol: 0.18 }); this.tone(900, 0.08, { type: 'square', vol: 0.06, slide: 300 }); break;
        case 'pop': this.tone(900 * p, 0.1, { type: 'sine', vol: 0.25, slide: 260 * p }); this.noiseHit(0.05, { type: 'highpass', freq: 3500, vol: 0.1 }); break;
        case 'bad': this.tone(200, 0.25, { type: 'square', vol: 0.09, slide: 90, filter: ['lowpass', 1200] }); break;
        case 'combo': this.tone(880 * p, 0.1, { type: 'square', vol: 0.06, slide: 1760 * p, filter: ['lowpass', 5000] }); break;
        case 'reel': this.noiseHit(0.025, { type: 'bandpass', freq: 2500, q: 4, vol: 0.12 }); break;
        case 'splash': this.noiseHit(0.4, { type: 'lowpass', freq: 1400, vol: 0.25, sweep: 300 }); break;
        case 'snap': this.noiseHit(0.1, { type: 'highpass', freq: 1800, vol: 0.3 }); this.tone(300, 0.2, { type: 'triangle', vol: 0.12, slide: 120 }); break;
        case 'line': this.tone(523 * p, 0.25, { type: 'square', vol: 0.07, slide: 1046 * p, filter: ['lowpass', 4000] }); break;
        case 'quad':
          this.notes([72, 76, 79, 84, 88], 0.05, { type: 'square', vol: 0.08, dur: 0.3, filter: ['lowpass', 5000] });
          this.noiseHit(0.5, { type: 'highpass', freq: 4000, vol: 0.08 });
          break;
        case 'garbage': this.tone(80, 0.3, { type: 'sawtooth', vol: 0.12, slide: 50, filter: ['lowpass', 500] }); break;
        case 'drop': this.tone(200, 0.08, { type: 'sine', vol: 0.2, slide: 80 }); break;
        case 'rotate': this.tone(1200, 0.03, { type: 'triangle', vol: 0.05 }); break;
        case 'move': this.tone(800, 0.02, { type: 'triangle', vol: 0.03 }); break;
        case 'hold': this.tone(600, 0.06, { type: 'triangle', vol: 0.07, slide: 900 }); break;
        case 'pause': this.notes([72, 67], 0.07, { type: 'triangle', vol: 0.12, dur: 0.15 }); break;
        case 'resume': this.notes([67, 72], 0.07, { type: 'triangle', vol: 0.12, dur: 0.15 }); break;
        case 'tap': this.tone(1300, 0.03, { type: 'triangle', vol: 0.06 }); break;
        case 'false': this.tone(220, 0.35, { type: 'sawtooth', vol: 0.1, slide: 110, filter: ['lowpass', 1500] }); break;
        case 'decoy': this.tone(500, 0.12, { type: 'square', vol: 0.06, filter: ['lowpass', 1500] }); break;
        case 'signal': this.tone(1568, 0.25, { type: 'square', vol: 0.12, filter: ['lowpass', 5000] }); this.tone(2093, 0.2, { type: 'triangle', vol: 0.12 }); break;
        case 'bell': this.tone(1318, 0.8, { type: 'sine', vol: 0.2 }); this.tone(2637, 0.5, { type: 'sine', vol: 0.06 }); break;
        default: break;
      }
    } catch (e) {
      // nunca dejar que un efecto de sonido rompa el juego
    }
  }
}

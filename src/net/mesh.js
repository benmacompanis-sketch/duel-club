// 2v2 ONLINE FLEXIBLE: una ronda sincronizada entre 2, 3 o 4 compus, cada una con 1 a 4 jugadores.
//
// · Red en malla: cada par de compus tiene su propia conexión (Link: WebRTC directo o, si no se puede, el
//   servidor como respaldo). Con 4 compus son 6 conexiones; con 2 compus, una sola.
// · Cada compu manda, frame a frame, las teclas de SUS jugadores. La compu anfitriona (índice 0) además maneja
//   los bots y manda sus teclas como si fueran un jugador más: así los bots son idénticos en todas las compus.
// · Rollback igual que en el 1v1 (src/net/netplay.js): se simula por delante con teclas predichas y se corrige si
//   llegan distintas. La ventana de predicción y el retardo propio se adaptan al peor ping de la sala.
// · Cada segundo se compara una huella del estado con todas las compus: si no coincide, la ronda se anula.
// Dispositivo ≠ jugador: una compu puede tener 4 jugadores locales y otra ninguno (solo mira) — en ese caso igual
// manda frames vacíos para marcar el ritmo.
import { FrameInput, stateHash, cloneVal, KEEP_REF, RUNNER_KEYS, PROTO } from './netplay.js';
import { useDetMath, restoreMath } from './detmath.js';
import { BotInput } from '../core/bots.js';

const TICK = 1 / 60;
const TICK_MS = 1000 / 60;
const ACTS = ['up', 'down', 'left', 'right', 'a', 'b'];
const BIT = { up: 1, down: 2, left: 4, right: 8, a: 16, b: 32 };
const EMPTY = Object.freeze([0, 0, null]);
const D_MAX = 12;
const MAX_PRED = 8;
const MAX_PRED_HI = 18;
const NOFX = new Proxy({}, { get: () => () => {} });
const rbDelayFor = (rtt) => (rtt == null || rtt < 160 ? 2 : rtt < 300 ? 3 : 4);

export class MeshRound {
  /**
   * @param {object} o
   * @param {Map<number, Link>} o.links   conexión con cada otra compu (por índice)
   * @param {number} o.me                 índice de esta compu (0 = anfitrión)
   * @param {number[]} o.devices          índices de todas las compus de la ronda
   * @param {Object<number, number>} o.owner  lugar (0..3) → compu que manda sus teclas (los bots → anfitrión)
   * @param {Object<number, number>} o.local  lugar → número de jugador local en el teclado de esta compu (0..3)
   * @param {Object<number, string>} o.bots   lugar → nivel del bot (solo en el anfitrión)
   */
  constructor({ app, links, me, devices, owner, local = {}, bots = {}, round, seed, onEnd, speed = 1, net = null }) {
    this.app = app;
    this.links = links;
    this.me = me;
    this.devices = [...devices].sort((a, b) => a - b);
    this.peers = this.devices.filter((d) => d !== me);
    this.owner = owner;
    this.slotsOf = {};
    for (const d of this.devices) this.slotsOf[d] = [0, 1, 2, 3].filter((s) => owner[s] === d);
    this.local = local;
    this.botLevels = bots;
    this.r = round;
    this.seed = seed >>> 0;
    this.onEnd = onEnd || (() => {});
    this.speed = speed;
    this.net = net;
    this.input = new FrameInput();
    this.input.cur = [EMPTY, EMPTY, EMPTY, EMPTY];
    this.inp = {};
    this.remoteNext = {};
    this.remoteAck = {};
    this.remoteF = {};
    this.rttOf = {};
    this.lastRemoteAt = {};
    this.lastRemoteTs = {};
    this.got = {};
    this.ready = {};
    for (const d of this.devices) { this.inp[d] = new Map(); this.remoteNext[d] = 0; this.remoteAck[d] = -1; this.remoteF[d] = 0; this.got[d] = false; this.lastRemoteAt[d] = performance.now(); }
    this.D = 2;
    this.f = 0;
    this.localNext = 0;
    this.acc = 0;
    this.running = false;
    this.started = false;
    this.ended = false;
    this.isReady = false;
    this.goAt = null;
    this.pend = {}; // jugador local → teclas apretadas desde el último frame
    this.pendT = {};
    this.prevHeld = {};
    this.simMs = 0;
    this.dispMs = 0;
    this.viewAt = performance.now();
    this.hashes = new Map();
    this.remoteHashes = new Map();
    this.stall = 0;
    this.lastSend = 0;
    this.stats = { stallFrames: 0, stallMs: 0, maxStall: 0, steps: 0, rollbacks: 0, rbFrames: 0, predFrames: 0 };
    this.snaps = new Map();
    this.pred = new Map(); // frame → { compu: teclas predichas }
    this.botObjs = {};
    this.unsubKey = app.input.on((e) => this.onKey(e));
  }

  get rtt() {
    const v = this.peers.map((d) => this.rttOf[d]).filter((x) => x != null);
    return v.length ? Math.max(...v) : null;
  }
  send(d, msg, lossy = false) {
    this.links.get(d)?.send(msg, { lossy });
  }
  sendAll(msg, lossy = false) {
    for (const d of this.peers) this.send(d, msg, lossy);
  }

  // ------------------------------------------------------------------ arranque
  setReady() {
    if (this.isReady) return;
    this.isReady = true;
    this.D = rbDelayFor(this.net?.()?.rtt);
    const hs = () => {
      if (this.ended || (this.started && this.peers.every((d) => this.got[d]))) return clearInterval(this.hsTimer);
      if (this.me === this.devices[0]) {
        if (this.goAt != null) for (const d of this.peers) this.send(d, { t: 'r', r: this.r, v: PROTO, in: Math.round(this.goAt - performance.now()) });
      } else this.send(this.devices[0], { t: 'r', r: this.r, v: PROTO });
    };
    hs();
    this.hsTimer = setInterval(hs, 100);
    this.tryGo();
  }
  /** Anfitrión: cuando están todas las compus listas, fija el arranque un instante después. */
  tryGo() {
    if (this.me !== this.devices[0] || this.goAt != null || this.ended || !this.isReady) return;
    if (!this.peers.every((d) => this.ready[d])) return;
    const rtt = this.rtt ?? this.net?.()?.rtt ?? 120;
    this.schedule(performance.now() + Math.max(300, Math.min(1500, rtt * 2 + 150)));
  }
  schedule(at) {
    if (this.started || this.ended) return;
    if (this.goAt != null && at >= this.goAt) return;
    this.goAt = at;
    clearTimeout(this.goTimer);
    this.goTimer = setTimeout(() => this.start(), Math.max(0, at - performance.now()));
  }
  start() {
    if (this.started || this.ended) return;
    this.started = true;
    clearTimeout(this.goTimer);
    const runner = this.app.runner;
    const mine = this.slotsOf[this.me];
    for (let f = 0; f < this.D; f++) this.inp[this.me].set(f, mine.map(() => EMPTY));
    this.localNext = this.D;
    for (const d of this.peers) { this.remoteNext[d] = 0; while (this.inp[d].has(this.remoteNext[d])) this.remoteNext[d]++; }
    this.rngS = this.seed >>> 0;
    this.rng = () => {
      const st = (this.rngS = (this.rngS + 0x6d2b79f5) >>> 0);
      let t = st;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    runner.opts.input = this.input;
    runner.opts.clock = () => this.simMs;
    runner.opts.inputLag = (D_MAX + 1) * TICK;
    this.withSim(() => runner.createGame());
    runner.startCountdown();
    // bots (solo los maneja la compu anfitriona): miran la partida y "aprietan teclas" como un jugador más
    for (const s of mine) {
      if (this.botLevels[s]) {
        const b = new BotInput({ held: () => false, pressed: () => false, pressTime: () => null, anyPressed: () => false }, s, this.botLevels[s], runner.gameId);
        b.attach(runner.game);
        this.botObjs[s] = b;
      }
    }
    this.pressWin = runner.game?.constructor?.meta?.id === 'beat' ? 220 : 20;
    this.running = true;
    this.acc = 0;
    this.lastFrameAt = performance.now();
    this.app.net = this;
    this.bg = setInterval(() => {
      if (document.hidden && this.running) this.frame(Math.min(1, (performance.now() - this.lastFrameAt) / 1000), true);
    }, 100);
    this.sendInputs(performance.now());
  }
  withSim(fn) {
    const prev = Math.random;
    Math.random = this.rng;
    useDetMath();
    try {
      return fn();
    } finally {
      restoreMath();
      Math.random = prev;
    }
  }

  // ------------------------------------------------------------------ teclas de esta compu
  onKey(e) {
    if (e.repeat || e.typing || !this.running) return;
    const b = this.app.input.bindings;
    for (const s of this.slotsOf[this.me]) {
      const k = this.local[s];
      if (k == null || !b[k]) continue;
      for (const a of ACTS) {
        if (!b[k][a].includes(e.code)) continue;
        const ts = e.event?.timeStamp > 0 && Math.abs(e.event.timeStamp - performance.now()) < 1000 ? e.event.timeStamp : performance.now();
        const t = this.dispMs + Math.max(0, Math.min(50, ts - this.viewAt));
        this.pend[k] = (this.pend[k] || 0) | BIT[a];
        this.pendT[k] ||= {};
        if (this.pendT[k][a] == null) this.pendT[k][a] = Math.round(t * 10) / 10;
      }
    }
  }
  captureLocal(fr) {
    const inp = this.app.input;
    const recs = this.slotsOf[this.me].map((s) => {
      const bot = this.botObjs[s];
      if (bot) {
        bot.tick(TICK);
        let held = 0, pr = 0;
        for (const a of ACTS) { if (bot.cur.has(a)) held |= BIT[a]; if (bot.press.has(a)) pr |= BIT[a]; }
        return pr ? [held, pr, null] : [held, 0, null];
      }
      const k = this.local[s];
      if (k == null) return EMPTY;
      let held = 0;
      for (const a of ACTS) if (inp.held(k, a)) held |= BIT[a];
      // pulsaciones: las de teclado (con hora exacta) + las de joystick (flanco de lo que se mantiene apretado)
      const pr = (this.pend[k] || 0) | (held & ~(this.prevHeld[k] || 0));
      this.prevHeld[k] = held;
      const rec = pr ? [held, pr, this.pendT[k] || null] : [held, 0, null];
      this.pend[k] = 0;
      this.pendT[k] = null;
      return rec;
    });
    this.inp[this.me].set(fr, recs);
  }

  // ------------------------------------------------------------------ bucle
  frame(dt, hidden = false) {
    if (!this.running) return;
    const now = performance.now();
    this.lastFrameAt = now;
    this.acc = Math.min(this.acc + dt * this.speed, hidden ? 1 : 0.25);
    // todas las compus se acercan de a poco al mismo frame (promedio de dónde están las demás)
    const est = this.peers.filter((d) => this.got[d] && this.rttOf[d] != null).map((d) => this.remoteF[d] + ((Math.min(100, now - this.lastRemoteAt[d]) + this.rttOf[d] / 2) / TICK_MS) * this.speed);
    if (est.length) {
      const diff = this.f - est.reduce((a, x) => a + x, 0) / est.length;
      if (diff > 0.75) this.acc -= dt * Math.min(0.1, diff * 0.03) * this.speed;
      else if (diff < -0.75) this.acc += dt * Math.min(0.1, -diff * 0.03) * this.speed;
    }
    let steps = 0, stalled = false;
    const maxSteps = hidden ? 70 : (Math.max(1, Math.ceil(dt / TICK)) + 1) * Math.max(1, Math.round(this.speed));
    if (this.pred.size) this.reconcile();
    while (this.acc >= TICK && steps < maxSteps && this.running) {
      while (this.localNext <= this.f + this.D) { this.captureLocal(this.localNext++); this.dirty = true; }
      const missing = this.peers.filter((d) => !this.inp[d].has(this.f));
      if (missing.length) {
        if (!this.canPredict()) { stalled = true; break; }
        this.snaps.set(this.f, this.snapshot());
        const p = {};
        for (const d of missing) p[d] = this.predicted(d);
        this.pred.set(this.f, p);
        this.stats.predFrames++;
      }
      try {
        this.step();
      } catch (e) {
        console.error('DUEL CLUB: error en la simulación 2v2 online', e);
        this.finish('error');
        return;
      }
      this.acc -= TICK;
      steps++;
    }
    if (steps) { this.stall = 0; this.stats.steps += steps; this.dispMs = (this.f - 1) * TICK_MS; this.viewAt = now; }
    else if (stalled) { this.stall += dt; this.stats.stallFrames++; this.stats.stallMs += dt * 1000; this.stats.maxStall = Math.max(this.stats.maxStall, this.stall); }
    if (this.dirty || now - this.lastSend > 100) this.sendInputs(now);
    if (!hidden && this.app.runner.game) this.app.runner.render();
  }
  fixTimes(x, f) {
    if (!x || !x[2]) return x || EMPTY;
    const hi = f * TICK_MS, lo = (f - D_MAX - 2) * TICK_MS - this.pressWin;
    const t = {};
    for (const k of Object.keys(x[2])) {
      if (!(k in BIT)) continue;
      const v = Number(x[2][k]);
      t[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : hi - 3 * TICK_MS;
    }
    return [x[0], x[1], t];
  }
  step() {
    const f = this.f;
    const runner = this.app.runner;
    const pr = this.pred.get(f);
    let confirmed = true;
    for (const d of this.devices) {
      let recs = this.inp[d].get(f);
      if (!recs) { recs = pr?.[d]; confirmed = false; }
      this.slotsOf[d].forEach((s, i) => { this.input.cur[s] = this.fixTimes(recs?.[i], f); });
    }
    this.simMs = f * TICK_MS;
    this.withSim(() => runner.frame(TICK, false));
    this.f = f + 1;
    const old = f - 240;
    if (old >= 0 && this.peers.every((d) => old <= this.remoteAck[d])) for (const d of this.devices) this.inp[d].delete(old);
    if (f % 60 === 30 && confirmed && !this.pendingBefore(f)) this.checkHash(f);
    if (runner.state === 'done' || !runner.active) this.finish('done');
  }

  // ------------------------------------------------------------------ rollback
  pendingBefore(f) {
    for (const fr of this.pred.keys()) if (fr < f) return true;
    return false;
  }
  predWindow() {
    const rtt = this.rtt ?? this.net?.()?.rtt;
    if (rtt == null) return MAX_PRED;
    return Math.max(MAX_PRED, Math.min(MAX_PRED_HI, Math.ceil((rtt / 2 + 35) / TICK_MS) - this.D + 3));
  }
  canPredict() {
    if (!this.peers.every((d) => this.got[d])) return false;
    const minNext = Math.min(...this.peers.map((d) => this.remoteNext[d]));
    if (this.f >= minNext + this.predWindow()) return false;
    const r = this.app.runner;
    if (r.state === 'done' || (r.state === 'ending' && r.endT + TICK * (this.predWindow() + 2) > 1.7)) return false;
    return true;
  }
  predicted(d) {
    const last = this.inp[d].get(this.remoteNext[d] - 1);
    return this.slotsOf[d].map((_, i) => [last?.[i] ? last[i][0] : 0, 0, null]);
  }
  snapshot() {
    const r = this.app.runner;
    const memo = new Map();
    const game = cloneVal(r.game, memo);
    const run = {};
    for (const k of RUNNER_KEYS) run[k] = cloneVal(r[k], memo);
    return { game, run, rngS: this.rngS };
  }
  restore(snap) {
    const r = this.app.runner;
    const live = r.game;
    const memo = new Map([[snap.game, live]]);
    for (const k of Object.keys(live)) if (!(k in snap.game) && !KEEP_REF.has(k) && k.charCodeAt(0) !== 95) delete live[k];
    for (const k of Object.keys(snap.game)) {
      if (KEEP_REF.has(k) || k.charCodeAt(0) === 95) continue;
      live[k] = cloneVal(snap.game[k], memo);
    }
    for (const k of RUNNER_KEYS) r[k] = cloneVal(snap.run[k], memo);
    this.rngS = snap.rngS;
  }
  /** ¿Alguna predicción no coincidió con las teclas que llegaron? Se vuelve atrás y se recalcula en silencio. */
  reconcile() {
    let first = Infinity;
    for (const [fr, p] of this.pred) {
      for (const d of Object.keys(p)) {
        const a = this.inp[d].get(fr);
        if (!a) continue;
        if (a.some((x, i) => x[0] !== p[d][i][0] || x[1])) { first = Math.min(first, fr); break; }
      }
    }
    const confirmedAll = (fr) => this.peers.every((d) => this.inp[d].has(fr));
    if (first === Infinity) {
      for (const fr of [...this.pred.keys()].sort((a, b) => a - b)) {
        if (!confirmedAll(fr)) break;
        if (fr % 60 === 30) {
          const nx = this.snaps.get(fr + 1);
          if (nx) this.checkHash(fr, { game: nx.game, state: nx.run.state, cd: nx.run.cd, playSeconds: nx.run.playSeconds, caos: nx.run.caos });
        }
        this.pred.delete(fr);
        this.snaps.delete(fr);
      }
      return;
    }
    const target = this.f;
    this.restore(this.snaps.get(first));
    for (const fr of [...this.pred.keys()]) if (fr >= first || confirmedAll(fr)) { this.pred.delete(fr); this.snaps.delete(fr); }
    this.f = first;
    this.stats.rollbacks++;
    this.stats.rbFrames += target - first;
    const audio = this.app.audio, play = audio.play, game = this.app.runner.game, fx = game.fx;
    audio.play = () => {};
    game.fx = NOFX;
    try {
      while (this.f < target && this.running) {
        const missing = this.peers.filter((d) => !this.inp[d].has(this.f));
        if (missing.length) {
          if (!this.canPredict()) break;
          this.snaps.set(this.f, this.snapshot());
          const p = {};
          for (const d of missing) p[d] = this.predicted(d);
          this.pred.set(this.f, p);
        }
        this.step();
      }
    } finally {
      audio.play = play;
      game.fx = fx;
    }
  }

  // ------------------------------------------------------------------ mensajes
  sendInputs(now, linger = false) {
    const mine = this.inp[this.me];
    const n = this.slotsOf[this.me].length;
    for (const d of this.peers) {
      // a cada compu le reenvío todo lo que todavía no me confirmó (los paquetes se pueden perder)
      const from = this.remoteAck[d] + 1, to = this.localNext - 1;
      const data = [];
      for (let i = from; i <= to && data.length < 120; i++) {
        const recs = mine.get(i) || Array(n).fill(EMPTY);
        data.push(recs.map((x) => (x[1] ? x : [x[0]])));
      }
      const msg = { t: 'i', r: this.r, s: from, d: data, a: this.remoteNext[d] - 1, f: this.f, ts: Math.round(now) };
      if (this.lastRemoteTs[d] != null) msg.e = [this.lastRemoteTs[d], Math.round(now - this.lastRemoteAt[d])];
      if (linger) msg.end = this.endFrame;
      this.send(d, msg, true);
    }
    this.lastSend = now;
    this.dirty = false;
  }
  /** Mensaje de la compu d. */
  onMessage(d, m) {
    if (!m || m.r !== this.r || !(d in this.inp)) return;
    const now = performance.now();
    if (m.t === 'i') {
      this.got[d] = true;
      const map = this.inp[d];
      const n = this.slotsOf[d].length;
      for (let k = 0; k < m.d.length; k++) {
        const fr = m.s + k;
        if (fr >= 0 && !map.has(fr)) {
          const row = m.d[k] || [];
          const recs = [];
          for (let i = 0; i < n; i++) { const x = row[i] || [0]; recs.push(x.length === 1 ? [x[0], 0, null] : [x[0], x[1], x[2] || null]); }
          map.set(fr, recs);
        }
      }
      while (map.has(this.remoteNext[d])) this.remoteNext[d]++;
      if (m.a > this.remoteAck[d]) this.remoteAck[d] = m.a;
      if (m.f > this.remoteF[d]) this.remoteF[d] = m.f;
      this.lastRemoteTs[d] = m.ts;
      this.lastRemoteAt[d] = now;
      if (m.e) {
        const r = now - m.e[0] - m.e[1];
        if (r > 0 && r < 5000) this.rttOf[d] = this.rttOf[d] == null ? r : this.rttOf[d] * 0.85 + r * 0.15;
      }
      if (!this.started && this.isReady) this.schedule(now);
    } else if (m.t === 'r') {
      if (m.v !== PROTO) { this.protoMismatch = true; return; }
      this.ready[d] = true;
      if (this.me === this.devices[0]) this.tryGo();
      else if (d === this.devices[0] && typeof m.in === 'number' && this.isReady) {
        const lat = (this.rttOf[d] ?? this.net?.()?.rtt ?? 60) / 2;
        this.schedule(now + Math.max(0, m.in - lat));
      }
    } else if (m.t === 'h') {
      let hs = this.remoteHashes.get(m.f);
      if (!hs) this.remoteHashes.set(m.f, (hs = {}));
      hs[d] = m.h;
      const lh = this.hashes.get(m.f);
      if (lh != null && lh !== m.h) this.desync(m.f);
    } else if (m.t === 'x') {
      this.desync(m.f, true);
    }
  }
  checkHash(f, src = null) {
    const h = stateHash(src || this.app.runner);
    this.hashes.set(f, h);
    if (this.hashes.size > 30) this.hashes.delete(this.hashes.keys().next().value);
    if (this.remoteHashes.size > 40) this.remoteHashes.delete(this.remoteHashes.keys().next().value);
    this.sendAll({ t: 'h', r: this.r, f, h });
    const rh = this.remoteHashes.get(f);
    if (rh && Object.values(rh).some((x) => x !== h)) this.desync(f);
  }
  desync(f, remote = false) {
    if (this.ended) return;
    console.warn('DUEL CLUB 2v2: desincronización en el frame', f, remote ? '(avisó otra compu)' : '');
    let n = 0;
    const notify = () => { this.sendAll({ t: 'x', r: this.r, f }); if (++n >= 15) clearInterval(this.xTimer); };
    notify();
    this.xTimer = setInterval(notify, 120);
    this.finish('desync');
  }
  finish(reason) {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.endFrame = this.f;
    this.reason = reason;
    clearInterval(this.hsTimer);
    clearInterval(this.bg);
    clearTimeout(this.goTimer);
    if (this.app.net === this) this.app.net = null;
    this.unsubKey?.();
    const until = performance.now() + 8000;
    this.linger = setInterval(() => {
      if (this.peers.every((d) => this.remoteAck[d] >= this.localNext - 1) || performance.now() > until) return clearInterval(this.linger);
      this.sendInputs(performance.now(), true);
    }, 60);
    this.onEnd({ reason, frame: this.f });
  }
  dispose() {
    this.ended = true;
    this.running = false;
    clearInterval(this.hsTimer);
    clearInterval(this.bg);
    clearInterval(this.linger);
    clearInterval(this.xTimer);
    clearTimeout(this.goTimer);
    if (this.app.net === this) this.app.net = null;
    this.unsubKey?.();
  }
  get waiting() {
    return this.running && this.stall > 0.8;
  }
  /** Quién está trabando (para el cartel): compus de las que no llegan teclas. */
  get waitingFor() {
    return this.peers.filter((d) => this.remoteNext[d] <= this.f);
  }
}

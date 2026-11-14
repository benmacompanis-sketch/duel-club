// Juego online: cada jugador en su compu.
//
// Link     → conexión entre las dos compus. Primero intenta una conexión DIRECTA (WebRTC DataChannel,
//            la latencia más baja). Si no se puede abrir (algunas redes lo bloquean), los mensajes viajan
//            por el servidor (Supabase Realtime) como respaldo. La señalización (ofertas WebRTC) pasa por
//            las funciones dc_online_* del servidor.
// NetRound → simulación sincronizada en pasos fijos de 1/60 s ("lockstep" con retardo de entrada).
//            Las dos compus simulan exactamente la misma partida: mismas teclas en el mismo frame y la
//            misma semilla de azar. Solo viajan las teclas (unos bytes por frame), nunca la imagen.
//            Cada segundo se compara una huella del estado: si no coincide, la ronda se anula.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { mulberry32, NATIVE_RANDOM } from '../core/utils.js';
import { useDetMath, restoreMath } from './detmath.js';

export const TICK = 1 / 60;
const TICK_MS = 1000 / 60;
const ACTS = ['up', 'down', 'left', 'right', 'a', 'b'];
const BIT = { up: 1, down: 2, left: 4, right: 8, a: 16, b: 32 };
const EMPTY = Object.freeze([0, 0, null]);
const ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

/** Retardo de entrada (en frames) para una latencia de ida y vuelta dada. */
export function delayFor(rttMs, relay = false, jitterMs = 10) {
  const oneWay = (rttMs ?? 120) / 2;
  // ida + altibajos de la conexión + un frame de margen (por el respaldo del servidor llegan de a tandas de 50 ms)
  return Math.max(2, Math.min(12, Math.ceil((oneWay + Math.min(60, jitterMs) + (relay ? 55 : 8)) / TICK_MS) + 1));
}

// =====================================================================================================
export class Link {
  /**
   * @param {object} o
   * @param {0|1} o.slot            0 = J1 (crea la oferta), 1 = J2
   * @param {string} o.secret       nombre del canal de respaldo (lo da el servidor solo a los dos jugadores)
   * @param {(p:object)=>Promise} o.sendSignal  envía una señal WebRTC por el servidor
   * @param {(m:object, via:string)=>void} o.onMessage
   * @param {(mode:string)=>void} [o.onChange]
   */
  constructor({ slot, secret, sendSignal, onMessage, onChange, relayOnly = false, noRelay = false, localChannel = null, netSim = null }) {
    this.slot = slot;
    this.secret = secret;
    this.sendSignal = sendSignal;
    // solo pruebas: simula una mala conexión (demora en ms, altibajos en ms y % de mensajes perdidos) al recibir
    this.netSim = netSim && (netSim.lag || netSim.jitter || netSim.loss) ? netSim : null;
    this.onMessage = !this.netSim ? onMessage : (m, via) => {
      const n = this.netSim;
      if (n.loss && NATIVE_RANDOM() * 100 < n.loss) return;
      // cada tanto un pico de demora (como en una conexión real)
      const spike = n.spike && NATIVE_RANDOM() < 0.01 ? n.spike : 0;
      setTimeout(() => { if (!this.closed) onMessage(m, via); }, (n.lag || 0) + NATIVE_RANDOM() * (n.jitter || 0) + spike);
    };
    this.onChange = onChange || (() => {});
    this.mode = 'connecting'; // connecting | p2p | relay | down
    this.pc = null;
    this.dc = null;
    this.relay = null;
    this.relayReady = false;
    this.relayFailed = false;
    this.p2pFailed = false;
    this.pendingCands = [];
    this.remoteSet = false;
    this.sentDesc = false;
    this.closed = false;
    this.relayPending = null;
    this.relayTimer = null;
    this.lastRelay = 0;
    this.relayOnly = relayOnly;
    this.noRelay = noRelay;
    this.localChannel = localChannel; // solo pruebas: BroadcastChannel entre dos pestañas
    this.received = { p2p: 0, relay: 0, local: 0 };
  }

  start() {
    if (this.localChannel) {
      const bc = (this.bc = new BroadcastChannel('dc-' + this.localChannel));
      bc.onmessage = (e) => {
        if (e.data?._s === this.slot) return;
        this.received.local++;
        this.onMessage(e.data, 'local');
      };
      this.mode = 'p2p';
      this.onChange(this.mode);
      return;
    }
    if (!this.noRelay) this.startRelay().catch((e) => { console.warn('DUEL CLUB relay', e); this.relayFailed = true; this.update(); });
    if (!this.relayOnly && typeof RTCPeerConnection !== 'undefined') this.startP2P().catch((e) => { console.warn('DUEL CLUB p2p', e); this.p2pFailed = true; this.update(); });
    else this.p2pFailed = true;
  }

  update() {
    const m = this.closed ? 'down'
      : this.dc?.readyState === 'open' ? 'p2p'
        : this.relayReady ? 'relay'
          : this.p2pFailed && (this.relayFailed || this.noRelay) ? 'down' : 'connecting';
    if (m !== this.mode) {
      this.mode = m;
      this.onChange(m);
    }
  }
  get connected() {
    return this.mode === 'p2p' || this.mode === 'relay';
  }

  // ------------------------------------------------------------------ conexión directa (WebRTC)
  async startP2P() {
    const pc = (this.pc = new RTCPeerConnection({ iceServers: ICE }));
    pc.onicecandidate = (e) => {
      if (e.candidate && this.sentDesc && !this.closed) this.sendSignal({ type: 'cand', c: e.candidate.toJSON() }).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return; // conexión vieja (ya se renovó)
      if (pc.connectionState === 'failed') this.p2pFailed = true;
      this.update();
    };
    if (this.slot === 0) {
      this.bindChannel(pc.createDataChannel('duel', { ordered: false, maxRetransmits: 0 }));
      await pc.setLocalDescription(await pc.createOffer());
      await this.gathered(pc);
      if (this.closed) return;
      this.sentDesc = true;
      await this.sendSignal({ type: 'offer', sdp: pc.localDescription.sdp });
    } else {
      pc.ondatachannel = (e) => this.bindChannel(e.channel);
    }
  }
  gathered(pc, ms = 2500) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(t);
          resolve();
        }
      });
    });
  }
  /**
   * Rearma la conexión directa desde cero (uno de los dos volvió a entrar a la partida). Mientras tanto los
   * mensajes siguen viajando por el servidor.
   */
  restartP2P() {
    if (this.closed || this.bc) return;
    const old = this.pc;
    this.pc = null;
    try { this.dc?.close(); } catch {}
    try { old?.close(); } catch {}
    this.dc = null;
    this.remoteSet = false;
    this.sentDesc = false;
    this.pendingCands = [];
    this.p2pFailed = false;
    if (!this.relayOnly && typeof RTCPeerConnection !== 'undefined') this.startP2P().catch((e) => { console.warn('DUEL CLUB p2p', e); this.p2pFailed = true; this.update(); });
    else this.p2pFailed = true;
    this.update();
  }
  /** Señales del rival (llegan en orden por el servidor). */
  async handleSignal(p) {
    if (p?.type === 'renew') return this.restartP2P();
    const pc = this.pc;
    if (!pc || this.closed || !p) return;
    try {
      if (p.type === 'offer' && this.slot === 1 && !this.remoteSet) {
        await pc.setRemoteDescription({ type: 'offer', sdp: p.sdp });
        this.remoteSet = true;
        await this.flushCands();
        await pc.setLocalDescription(await pc.createAnswer());
        await this.gathered(pc);
        if (this.closed) return;
        this.sentDesc = true;
        await this.sendSignal({ type: 'answer', sdp: pc.localDescription.sdp });
      } else if (p.type === 'answer' && this.slot === 0 && !this.remoteSet) {
        await pc.setRemoteDescription({ type: 'answer', sdp: p.sdp });
        this.remoteSet = true;
        await this.flushCands();
      } else if (p.type === 'cand' && p.c) {
        if (this.remoteSet) await pc.addIceCandidate(p.c).catch(() => {});
        else this.pendingCands.push(p.c);
      }
    } catch (e) {
      console.warn('DUEL CLUB señal', e);
    }
  }
  async flushCands() {
    const list = this.pendingCands.splice(0);
    for (const c of list) await this.pc.addIceCandidate(c).catch(() => {});
  }
  bindChannel(ch) {
    this.dc = ch;
    ch.onopen = () => this.update();
    ch.onclose = () => { if (this.dc === ch) this.update(); };
    ch.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      this.received.p2p++;
      this.onMessage(m, 'p2p');
    };
  }

  // ------------------------------------------------------------------ respaldo por el servidor (Supabase Realtime)
  async startRelay() {
    const { RealtimeClient } = await import('@supabase/realtime-js');
    if (this.closed) return;
    const url = SUPABASE_URL.replace(/^http/, 'ws') + '/realtime/v1';
    const client = (this.rt = new RealtimeClient(url, { params: { apikey: SUPABASE_KEY }, heartbeatIntervalMs: 15000 }));
    const ch = (this.relay = client.channel('duel-' + this.secret, { config: { broadcast: { self: false, ack: false } } }));
    ch.on('broadcast', { event: 'm' }, (msg) => {
      const m = msg?.payload;
      if (!m || m._s === this.slot) return;
      this.received.relay++;
      this.onMessage(m, 'relay');
    });
    ch.subscribe((status) => {
      this.relayReady = status === 'SUBSCRIBED';
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.relayFailed = true;
      this.update();
    });
  }

  /**
   * Envía un mensaje al rival. lossy: paquetes de teclas (cada uno repite todo lo que el rival todavía no
   * confirmó), así que por el servidor se mandan como mucho 20 por segundo y se descartan los intermedios.
   */
  send(msg, { lossy = false } = {}) {
    if (this.closed) return false;
    if (this.bc) {
      this.bc.postMessage({ ...msg, _s: this.slot });
      return true;
    }
    if (this.dc?.readyState === 'open') {
      try {
        this.dc.send(JSON.stringify(msg));
        return true;
      } catch {}
    }
    if (this.relayReady && this.relay) {
      if (lossy) {
        this.relayPending = msg;
        const wait = 50 - (performance.now() - this.lastRelay);
        if (wait <= 0) this.flushRelay();
        else if (!this.relayTimer) this.relayTimer = setTimeout(() => { this.relayTimer = null; this.flushRelay(); }, wait);
        return true;
      }
      this.relay.send({ type: 'broadcast', event: 'm', payload: { ...msg, _s: this.slot } }).catch?.(() => {});
      return true;
    }
    return false;
  }
  flushRelay() {
    const m = this.relayPending;
    this.relayPending = null;
    if (!m || !this.relayReady || this.closed) return;
    this.lastRelay = performance.now();
    this.relay.send({ type: 'broadcast', event: 'm', payload: { ...m, _s: this.slot } }).catch?.(() => {});
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.relayTimer);
    try { this.dc?.close(); } catch {}
    try { this.pc?.close(); } catch {}
    try { this.relay?.unsubscribe(); } catch {}
    try { this.rt?.disconnect(); } catch {}
    try { this.bc?.close(); } catch {}
    this.mode = 'down';
  }
}

// =====================================================================================================
/** Teclas de los dos jugadores para el frame que se está simulando (misma interfaz que InputManager). */
export class FrameInput {
  constructor() {
    this.cur = [EMPTY, EMPTY];
  }
  held(p, a) {
    return (this.cur[p][0] & BIT[a]) !== 0;
  }
  pressed(p, a) {
    return (this.cur[p][1] & BIT[a]) !== 0;
  }
  pressTime(p, a) {
    const c = this.cur[p];
    return c[1] & BIT[a] && c[2] && c[2][a] != null ? c[2][a] : null;
  }
  anyPressed(p) {
    return this.cur[p][1] !== 0;
  }
}

// Huella del estado del minijuego (para detectar desincronizaciones). Recorre los datos del juego
// salvo lo visual/local: efectos, audio, lienzos y claves que empiezan con "_".
// 'result' y 'display' llevan textos armados con toLocaleString, que puede variar entre navegadores
const SKIP_KEYS = new Set(['app', 'audio', 'fx', 'players', 'inputs', 'opts', 'options', 'player', 'input', 'meta', 'result', 'display']);
function skipObj(v) {
  return (typeof Node !== 'undefined' && v instanceof Node)
    || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D)
    || (typeof CanvasGradient !== 'undefined' && v instanceof CanvasGradient)
    || (typeof CanvasPattern !== 'undefined' && v instanceof CanvasPattern)
    || (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas)
    || (typeof ImageData !== 'undefined' && v instanceof ImageData)
    || (typeof ImageBitmap !== 'undefined' && v instanceof ImageBitmap)
    || (typeof AudioNode !== 'undefined' && v instanceof AudioNode)
    || (typeof Path2D !== 'undefined' && v instanceof Path2D)
    || v instanceof Promise;
}
export function stateHash(runner) {
  let h = 0x811c9dc5;
  const f64 = new Float64Array(1);
  const u32 = new Uint32Array(f64.buffer);
  const seen = new Set();
  let budget = 40000;
  const mix = (x) => {
    h = Math.imul(h ^ (x | 0), 16777619) >>> 0;
  };
  const num = (v) => {
    f64[0] = v;
    mix(u32[0]);
    mix(u32[1]);
  };
  const walk = (v, depth) => {
    if (budget-- <= 0) return;
    switch (typeof v) {
      case 'number': num(v); return;
      case 'boolean': mix(v ? 3 : 5); return;
      case 'string':
        mix(v.length);
        for (let i = 0; i < v.length && i < 48; i++) mix(v.charCodeAt(i));
        return;
      case 'undefined': mix(7); return;
      case 'object': {
        if (v === null) { mix(11); return; }
        if (depth > 7 || seen.has(v) || skipObj(v)) return;
        seen.add(v);
        if (Array.isArray(v) || ArrayBuffer.isView(v)) {
          mix(v.length);
          for (let i = 0; i < v.length; i++) walk(v[i], depth + 1);
          return;
        }
        if (v instanceof Map) {
          mix(v.size);
          for (const [k, x] of v) { walk(k, depth + 1); walk(x, depth + 1); }
          return;
        }
        if (v instanceof Set) {
          mix(v.size);
          for (const x of v) walk(x, depth + 1);
          return;
        }
        for (const k of Object.keys(v)) {
          if (SKIP_KEYS.has(k) || k.charCodeAt(0) === 95 /* _ */) continue;
          mix(k.length);
          walk(v[k], depth + 1);
        }
        return;
      }
      default:
    }
  };
  walk(runner.game, 0);
  walk(runner.state, 0);
  num(runner.cd || 0);
  num(runner.playSeconds || 0);
  if (runner.caos) walk({ k: runner.caos.kind, p: runner.caos.phase, t: runner.caos.t, n: runner.caos.next }, 0);
  return h >>> 0;
}

// =====================================================================================================
export const PROTO = 2; // versión del protocolo entre compus (si no coincide, hay que recargar la página)
const D_MIN = 2;
const D_MAX = 12; // retardo de entrada máximo: 12 frames = 200 ms

/**
 * Una ronda (un minijuego) sincronizada entre las dos compus.
 * Ciclo: new → setReady(D) en las dos compus → el J1 fija el momento de arranque → start() en las dos casi a la
 * vez → frame(dt) en cada cuadro → fin (onEnd).
 *
 * Fluidez:
 *  - Cada compu aplica a SUS teclas un retardo propio (D frames). Si al rival le llegan justas, lo sube; si
 *    sobra margen, lo baja. Así no hay tirones cuando la conexión tiene altibajos.
 *  - Las dos compus corrigen de a poco su velocidad para ir por el mismo frame.
 *  - Si hubo que esperar teclas, la partida se pone al día de a poco (sin saltos).
 */
export class NetRound {
  constructor({ app, link, slot, round, seed, onEnd, speed = 1, net = null }) {
    this.app = app;
    this.link = link;
    this.slot = slot;
    this.r = round;
    this.seed = seed >>> 0;
    this.onEnd = onEnd || (() => {});
    this.speed = speed;
    this.net = net; // () => ({ rtt, jitter }) medidos antes de la ronda
    this.input = new FrameInput();
    this.inp = [new Map(), new Map()];
    this.D = 3;
    this.f = 0;
    this.localNext = 0;
    this.remoteNext = 0;
    this.remoteAck = -1;
    this.acc = 0;
    this.running = false;
    this.started = false;
    this.ended = false;
    this.ready = false;
    this.remoteReady = false;
    this.goAt = null; // momento de arranque en el reloj de esta compu
    this.gotRemoteInput = false;
    this.pendP = 0;
    this.pendT = null;
    this.simMs = 0;
    this.dispMs = 0;
    this.viewAt = performance.now();
    this.hashes = new Map();
    this.remoteHashes = new Map();
    this.stall = 0;
    this.rtt = null;
    this.remoteF = 0;
    this.lastRecv = performance.now();
    this.lastRemoteAt = performance.now();
    this.lastSend = 0;
    this.bias = 0;
    this.pressWin = 20;
    this.endFrame = null;
    this.peerBufMin = 99;
    this.peerBufSince = performance.now();
    this.lastBump = 0;
    this.stats = { stallFrames: 0, stallMs: 0, maxStall: 0, bursts: 0, steps: 0, dUp: 0, dDown: 0 };
    this.unsubKey = app.input.on((e) => this.onKey(e));
  }

  /** El jugador de esta compu está listo. D = retardo inicial de sus teclas (después se ajusta solo). */
  setReady(D) {
    if (this.ready) return;
    this.ready = true;
    this.D = Math.max(D_MIN, Math.min(D_MAX, Math.round(D) || 3));
    const hs = () => {
      if (this.ended || (this.started && (this.gotRemoteInput || this.slot === 1))) return clearInterval(this.hsTimer);
      const m = { t: 'r', r: this.r, v: PROTO };
      // el J1 avisa cuánto falta para arrancar (así las dos compus empiezan casi a la vez)
      if (this.slot === 0 && this.goAt != null) m.in = Math.round(this.goAt - performance.now());
      this.link.send(m);
    };
    hs();
    this.hsTimer = setInterval(hs, 100);
    this.tryGo();
  }
  /** J1: cuando los dos están listos, fija el arranque un instante después (para que el aviso llegue a tiempo). */
  tryGo() {
    if (this.slot !== 0 || this.goAt != null || this.ended || !this.ready || !this.remoteReady) return;
    const rtt = this.net?.()?.rtt ?? 120;
    this.schedule(performance.now() + Math.max(300, Math.min(1500, rtt * 2 + 150)));
  }
  schedule(at) {
    if (this.started || this.ended) return;
    if (this.goAt != null && at >= this.goAt) return; // nos quedamos con el aviso más temprano
    this.goAt = at;
    clearTimeout(this.goTimer);
    this.goTimer = setTimeout(() => this.start(), Math.max(0, at - performance.now()));
  }

  start() {
    if (this.started || this.ended) return;
    this.started = true;
    clearTimeout(this.goTimer);
    const runner = this.app.runner;
    // las primeras D teclas propias van vacías (retardo de entrada)
    for (let f = 0; f < this.D; f++) this.inp[this.slot].set(f, EMPTY);
    this.localNext = this.D;
    const rm = this.inp[1 - this.slot];
    this.remoteNext = 0;
    while (rm.has(this.remoteNext)) this.remoteNext++;
    this.rng = mulberry32(this.seed);
    runner.opts.input = this.input;
    runner.opts.clock = () => this.simMs;
    runner.opts.inputLag = (D_MAX + 1) * TICK; // constante: tiene que ser igual en las dos compus
    // el minijuego se vuelve a crear con la semilla compartida: lo que pasó durante la presentación no cuenta
    this.withSim(() => runner.createGame());
    runner.startCountdown();
    this.bias = runner.game?.netPressBias?.() || 0;
    // margen permitido hacia atrás para la hora de una pulsación (Beat Battle necesita más por la latencia del audio)
    this.pressWin = runner.game?.constructor?.meta?.id === 'beat' ? 220 : 20;
    this.running = true;
    this.acc = 0;
    this.lastFrameAt = performance.now();
    this.dispMs = 0;
    this.viewAt = performance.now();
    this.peerBufSince = performance.now();
    this.app.net = this;
    // si la pestaña queda oculta el navegador frena requestAnimationFrame: seguimos simulando igual
    this.bg = setInterval(() => {
      if (document.hidden && this.running) this.frame(Math.min(1, (performance.now() - this.lastFrameAt) / 1000), true);
    }, 100);
    this.sendInputs(performance.now());
  }
  /** Ejecuta un tramo de simulación con azar y matemática idénticos en las dos compus. */
  withSim(fn) {
    const prev = Math.random;
    const det = !this.app.noDetMath; // (solo pruebas: permite comprobar qué pasa sin la matemática propia)
    Math.random = this.rng;
    if (det) useDetMath();
    try {
      return fn();
    } finally {
      if (det) restoreMath();
      Math.random = prev;
    }
  }

  // ------------------------------------------------------------------ teclas de esta compu
  onKey(e) {
    if (e.repeat || e.typing || !this.running) return;
    const code = e.code;
    let act = null;
    for (const p of [0, 1]) {
      const b = this.app.input.bindings[p];
      for (const a of ACTS) if (b[a].includes(code)) act = a;
    }
    if (!act) return;
    // momento exacto de la pulsación en el reloj de la partida (lo que el jugador estaba viendo)
    const ts = e.event?.timeStamp > 0 && Math.abs(e.event.timeStamp - performance.now()) < 1000 ? e.event.timeStamp : performance.now();
    const t = this.dispMs + Math.max(0, Math.min(50, ts - this.viewAt)) - this.bias;
    this.pendP |= BIT[act];
    if (!this.pendT) this.pendT = {};
    if (this.pendT[act] == null) this.pendT[act] = Math.round(t * 10) / 10;
  }
  captureLocal(fr) {
    let held = 0;
    const inp = this.app.input;
    for (const a of ACTS) if (inp.held(0, a) || inp.held(1, a)) held |= BIT[a];
    const rec = this.pendP ? [held, this.pendP, this.pendT] : [held, 0, null];
    this.pendP = 0;
    this.pendT = null;
    this.inp[this.slot].set(fr, rec);
  }

  // ------------------------------------------------------------------ bucle
  frame(dt, hidden = false) {
    if (!this.running) return;
    const now = performance.now();
    this.lastFrameAt = now;
    this.acc = Math.min(this.acc + dt * this.speed, hidden ? 1 : 0.25);
    // las dos compus se acercan de a poco al mismo frame (la que va adelante frena, la que va atrás acelera)
    if (this.rtt != null && this.gotRemoteInput) {
      const since = Math.min(100, now - this.lastRemoteAt);
      const remoteNow = this.remoteF + ((since + this.rtt / 2) / TICK_MS) * this.speed;
      const diff = this.f - remoteNow;
      if (diff > 0.75) this.acc -= dt * Math.min(0.1, diff * 0.03) * this.speed;
      else if (diff < -0.75) this.acc += dt * Math.min(0.1, -diff * 0.03) * this.speed;
    }
    let steps = 0;
    let stalled = false;
    // si quedó tiempo acumulado (hubo que esperar teclas), se recupera de a un frame extra por cuadro: sin saltos
    const maxSteps = hidden ? 70 : (Math.max(1, Math.ceil(dt / TICK)) + 1) * Math.max(1, Math.round(this.speed));
    while (this.acc >= TICK && steps < maxSteps && this.running) {
      while (this.localNext <= this.f + this.D) {
        this.captureLocal(this.localNext++);
        this.dirty = true;
      }
      if (!this.inp[1 - this.slot].has(this.f)) {
        stalled = true;
        break;
      }
      try {
        this.step();
      } catch (e) {
        console.error('DUEL CLUB: error en la simulación online', e);
        this.app.logError?.(`online: ${e?.message}`);
        this.finish('error');
        return;
      }
      this.acc -= TICK;
      steps++;
    }
    // "trabado" = tiempo sin poder avanzar ni un frame (ir un poco adelantado y esperar es normal)
    if (steps) {
      this.stall = 0;
      this.stats.steps += steps;
      if (steps > 2 && !hidden) this.stats.bursts++;
    } else if (stalled) {
      this.stall += dt;
      this.stats.stallFrames++;
      this.stats.stallMs += dt * 1000;
      if (this.stall > this.stats.maxStall) this.stats.maxStall = this.stall;
    }
    if (steps) {
      this.dispMs = (this.f - 1) * TICK_MS;
      this.viewAt = now;
    }
    if (this.dirty || now - this.lastSend > 100) this.sendInputs(now);
    if (!hidden && this.app.runner.game) this.app.runner.render();
  }

  /**
   * La hora exacta de cada pulsación la manda cada compu (precisión para reflejos y ritmo). Para que nadie
   * pueda inventarse horas imposibles, se limita a un margen alrededor del frame al que pertenece.
   * Es una cuenta pura (frame y juego): da lo mismo en las dos compus.
   */
  fixTimes(x, f) {
    if (!x[2]) return x;
    const hi = f * TICK_MS;
    const lo = (f - D_MAX - 2) * TICK_MS - this.pressWin;
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
    this.input.cur[0] = this.fixTimes(this.inp[0].get(f), f);
    this.input.cur[1] = this.fixTimes(this.inp[1].get(f), f);
    this.simMs = f * TICK_MS;
    this.withSim(() => runner.frame(TICK, false));
    this.f = f + 1;
    const old = f - 240;
    if (old >= 0 && old <= this.remoteAck) {
      this.inp[0].delete(old);
      this.inp[1].delete(old);
    }
    if (f % 60 === 30) this.checkHash(f);
    if (runner.state === 'done' || !runner.active) this.finish('done');
  }

  sendInputs(now, linger = false) {
    const from = this.remoteAck + 1;
    const to = this.localNext - 1;
    const d = [];
    const mine = this.inp[this.slot];
    for (let i = from; i <= to && d.length < 120; i++) {
      const x = mine.get(i) || EMPTY;
      d.push(x[1] ? x : [x[0]]);
    }
    // b = cuántas teclas del rival tengo de sobra (él lo usa para ajustar su retardo)
    const msg = { t: 'i', r: this.r, s: from, d, a: this.remoteNext - 1, f: this.f, b: this.remoteNext - this.f, ts: Math.round(now) };
    if (this.lastRemoteTs != null) msg.e = [this.lastRemoteTs, Math.round(now - this.lastRemoteAt)];
    if (linger) msg.end = this.endFrame;
    this.link.send(msg, { lossy: true });
    this.lastSend = now;
    this.dirty = false;
  }

  /** Ajusta el retardo de MIS teclas según cuánto margen le queda al rival. */
  tuneDelay(b, now) {
    if (!this.running || this.f < 45) return;
    if (b < this.peerBufMin) this.peerBufMin = b;
    if (b <= 0 && this.D < D_MAX && now - this.lastBump > 450) {
      // al rival le llegan justas (o tarde): más retardo
      this.D++;
      this.lastBump = now;
      this.stats.dUp++;
      this.peerBufMin = 99;
      this.peerBufSince = now;
    } else if (now - this.peerBufSince > 5000) {
      // 5 s seguidos con margen de sobra: menos retardo (el objetivo es que al rival siempre le sobre 1 frame)
      if (this.peerBufMin >= 2 && this.D > D_MIN) { this.D--; this.stats.dDown++; }
      this.peerBufMin = 99;
      this.peerBufSince = now;
    }
  }

  // ------------------------------------------------------------------ mensajes del rival
  onMessage(m) {
    if (m.r !== this.r) return;
    const now = performance.now();
    if (m.t === 'i') {
      this.lastRecv = now;
      this.gotRemoteInput = true;
      const map = this.inp[1 - this.slot];
      for (let k = 0; k < m.d.length; k++) {
        const fr = m.s + k;
        if (fr >= 0 && !map.has(fr)) {
          const x = m.d[k];
          map.set(fr, x.length === 1 ? [x[0], 0, null] : [x[0], x[1], x[2] || null]);
        }
      }
      while (map.has(this.remoteNext)) this.remoteNext++;
      if (m.a > this.remoteAck) this.remoteAck = m.a;
      if (m.f > this.remoteF) this.remoteF = m.f;
      this.lastRemoteTs = m.ts;
      this.lastRemoteAt = now;
      if (m.e) {
        const r = now - m.e[0] - m.e[1];
        if (r > 0 && r < 5000) this.rtt = this.rtt == null ? r : this.rtt * 0.85 + r * 0.15;
      }
      if (typeof m.b === 'number') this.tuneDelay(m.b, now);
      // el rival ya arrancó y a mí no me llegó el aviso: arranco ya
      if (!this.started && this.ready) this.schedule(now);
    } else if (m.t === 'r') {
      this.lastRecv = now;
      if (m.v !== PROTO) { this.protoMismatch = true; return; }
      this.remoteReady = true;
      if (this.slot === 0) this.tryGo();
      else if (typeof m.in === 'number' && this.ready) {
        const lat = (this.net?.()?.rtt ?? 60) / 2;
        this.schedule(now + Math.max(0, m.in - lat));
      }
    } else if (m.t === 'h') {
      this.remoteHashes.set(m.f, m.h);
      const lh = this.hashes.get(m.f);
      if (lh != null && lh !== m.h) this.desync(m.f);
    } else if (m.t === 'x') {
      this.desync(m.f, true);
    }
  }

  checkHash(f) {
    const h = stateHash(this.app.runner);
    this.hashes.set(f, h);
    if (this.hashes.size > 30) this.hashes.delete(this.hashes.keys().next().value);
    this.link.send({ t: 'h', r: this.r, f, h });
    const rh = this.remoteHashes.get(f);
    if (rh != null && rh !== h) this.desync(f);
  }

  desync(f, remote = false) {
    if (this.ended) return;
    console.warn('DUEL CLUB: desincronización en el frame', f, remote ? '(avisó el rival)' : '');
    this.app.logError?.(`online: desincronización en el frame ${f} de ${this.app.runner.gameId}${remote ? ' (avisó el rival)' : ''}`);
    let n = 0;
    const notify = () => {
      this.link.send({ t: 'x', r: this.r, f });
      if (++n >= 15) clearInterval(this.xTimer);
    };
    notify();
    this.xTimer = setInterval(notify, 120);
    this.finish('desync');
  }

  /** La ronda terminó en esta compu: dejar de simular y seguir mandando teclas hasta que el rival confirme. */
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
      if (this.remoteAck >= this.localNext - 1 || performance.now() > until || this.link.closed) return clearInterval(this.linger);
      this.sendInputs(performance.now(), true);
    }, 60);
    this.onEnd({ reason, frame: this.f });
  }

  /** Cancela la ronda sin resultado (abandono, error). */
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

  /** Estado para el HUD: esperando al rival (solo si la espera se nota de verdad). */
  get waiting() {
    return this.running && this.stall > 0.8;
  }
}

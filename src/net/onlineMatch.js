// Una serie online (al mejor de 1, 3 o 5) entre dos cuentas, cada una en su compu.
// Se encarga de: conectar con el rival (Link), avisar al servidor que seguimos acá, jugar cada ronda
// sincronizada (NetRound), informar el resultado y seguir el estado que decide el servidor.
import { rpc, ApiError } from './api.js';
import { Link, NetRound, delayFor, PROTO } from './netplay.js';
import { PLAYER_COLORS } from '../core/characters.js';

const params = new URLSearchParams(location.search);

/** Ficha pública del servidor → jugador para dibujar. */
export function cardToPlayer(c) {
  return { name: c?.name || '—', char: c?.char || 'npc', color: c?.color || '#3985FF', acc: { ...(c?.equipped || {}) }, accountId: c?.username || null, username: c?.username || null };
}
export function matchPlayers(view) {
  const pl = view.players.map(cardToPlayer);
  if (pl[1] && pl[0].color?.toUpperCase() === pl[1].color?.toUpperCase()) {
    const alt = PLAYER_COLORS.find((c) => c.hex.toUpperCase() !== pl[0].color.toUpperCase() && (c.hex === '#FF654F' || c.hex === '#3985FF')) || PLAYER_COLORS[1];
    pl[1].color = alt.hex;
  }
  return pl;
}

export class OnlineMatch {
  constructor(app, { user, view }) {
    this.app = app;
    this.user = user;
    this.view = view;
    this.slot = view.slot;
    this.sigAfter = 0;
    this.listeners = new Set();
    this.early = [];
    this.round = null;
    this.rtt = null;
    this.pings = []; // últimas mediciones de ida y vuelta (ms)
    this.versionMismatch = false;
    this.closed = false;
    this.fast = true;
    this.errors = 0;
  }
  token() {
    return this.app.accounts.tokenOf(this.user);
  }
  call(fn, args = {}) {
    const tok = this.token();
    if (!tok) return Promise.reject(new ApiError('session_invalid'));
    return rpc(fn, { p_token: tok, ...args });
  }
  get opp() {
    return this.view.players[1 - this.slot];
  }
  get me() {
    return this.view.players[this.slot];
  }
  get players() {
    return matchPlayers(this.view);
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    for (const fn of [...this.listeners]) {
      try {
        fn(this);
      } catch (e) {
        console.error(e);
      }
    }
  }

  /** rejoin: esta compu vuelve a entrar a una partida en curso (recargó la página). */
  async start({ rejoin = false } = {}) {
    this.rejoined = rejoin;
    if (rejoin) {
      // le avisa al rival que rearme la conexión; las señales viejas (anteriores a este aviso) se ignoran
      try {
        const o = await this.call('dc_online_signal', { p_match: this.view.id, p_payload: { type: 'renew' } });
        if (o?.id) this.sigAfter = o.id;
      } catch {}
      if (this.closed) return;
    }
    this.link = new Link({
      slot: this.slot,
      secret: this.view.secret,
      sendSignal: (p) => this.call('dc_online_signal', { p_match: this.view.id, p_payload: p }),
      onMessage: (m, via) => this.onMessage(m, via),
      onChange: () => this.emit(),
      relayOnly: this.app.testMode && params.has('relay'),
      noRelay: this.app.testMode && params.has('norelay'),
      // solo pruebas: ?netsim=demora,altibajos,pérdida%,pico simula una mala conexión
      netSim: this.app.testMode && params.has('netsim') ? (([lag, jitter, loss, spike]) => ({ lag, jitter, loss, spike }))(params.get('netsim').split(',').map(Number)) : null,
    });
    this.link.start();
    this.poll();
    // mide la conexión entre rondas (rápido al principio, para tener varias muestras antes de jugar)
    let n = 0;
    this.pinger = setInterval(() => {
      if (this.round?.running || !this.link.connected) return;
      if (this.pings.length >= 8 && n++ % 3) return;
      this.link.send({ t: 'p', ts: Math.round(performance.now() * 10) / 10, v: PROTO });
    }, 200);
  }

  async poll() {
    if (this.closed) return;
    try {
      const v = await this.call('dc_online_state', { p_match: this.view.id, p_after: this.sigAfter });
      const sigs = v.signals || [];
      delete v.signals;
      this.errors = 0;
      this.setView(v);
      for (const s of sigs) {
        this.sigAfter = Math.max(this.sigAfter, s.id);
        await this.link.handleSignal(s.p);
      }
    } catch (e) {
      this.errors++;
      if (e.code === 'session_invalid' || e.code === 'not_found') {
        this.lost = e.code;
        this.emit();
      }
    }
    if (this.closed) return;
    const fast = this.fast || !this.link?.connected || this.waitingRound;
    this.pollTimer = setTimeout(() => this.poll(), fast ? 700 : 2000);
  }
  setView(v) {
    if (!v?.id) return;
    const prevStatus = this.view.status;
    this.view = v;
    if (v.status !== prevStatus && (v.status === 'finished' || v.status === 'cancelled')) this.finishedAt = performance.now();
    this.emit();
  }

  onMessage(m, via) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'p') {
      // versiones distintas del juego no pueden jugar entre sí (una de las dos tiene la página vieja abierta)
      if (m.v !== PROTO && !this.versionMismatch) { this.versionMismatch = true; this.emit(); }
      this.link.send({ t: 'q', ts: m.ts, v: PROTO });
      return;
    }
    if (m.t === 'q') {
      if (m.v !== PROTO && !this.versionMismatch) this.versionMismatch = true;
      const r = performance.now() - m.ts;
      if (r >= 0 && r < 8000) {
        this.pings.push(r);
        if (this.pings.length > 16) this.pings.shift();
        const sorted = [...this.pings].sort((a, b) => a - b);
        this.rtt = sorted[Math.floor(sorted.length / 2)]; // mediana
        this.jitter = sorted[Math.max(0, Math.ceil(sorted.length * 0.9) - 1)] - sorted[0];
      }
      this.emit();
      return;
    }
    // "volví a entrar": ¿la ronda r ya había arrancado en tu compu?
    if (m.t === 'rj') {
      const rd = this.round;
      const started = !!(rd && rd.r === m.r && rd.started);
      this.link.send({ t: 'rk', r: m.r, started });
      if (started && !rd.ended) this.onPeerRejoin?.(m.r);
      return;
    }
    if (m.t === 'rk') {
      this.rejoinAnswer?.(m);
      return;
    }
    if (typeof m.r !== 'number') return;
    if (this.round && m.r === this.round.r) this.round.onMessage(m);
    else if (!this.round || m.r > this.round.r) {
      this.early.push(m);
      if (this.early.length > 600) this.early.splice(0, this.early.length - 600);
    }
  }

  /** Latencia que se muestra (la de la ronda si está corriendo). */
  get ping() {
    const r = this.round?.rtt ?? this.rtt;
    return r == null ? null : Math.round(r);
  }
  get linkMode() {
    return this.link?.mode || 'connecting';
  }

  /** Después de volver a entrar: le pregunta al rival si la ronda r ya estaba en juego (espera hasta 8 s). */
  askRoundState(r) {
    return new Promise((resolve) => {
      let n = 0;
      const done = (v) => {
        clearInterval(iv);
        this.rejoinAnswer = null;
        resolve(v);
      };
      this.rejoinAnswer = (m) => { if (m.r === r) done(!!m.started); };
      const iv = setInterval(() => {
        if (this.closed || this.view.round !== r || this.view.status !== 'playing') return done(false);
        if (++n > 16) return done(false);
        this.link.send({ t: 'rj', r });
      }, 500);
      this.link.send({ t: 'rj', r });
    });
  }

  /**
   * Juega la ronda r. Devuelve {reason: 'done'|'desync'|'error'|'cancelled'|'gone', result?}.
   * hooks.showIntro(round) muestra la presentación; tiene que llamar a ready() cuando el jugador está listo.
   */
  playRound(r, hooks) {
    const app = this.app;
    const gid = this.view.games[r];
    const seed = (Number(this.view.seed) + r * 104729) >>> 0;
    const players = this.players;
    return new Promise((resolve) => {
      let settled = false;
      const end = (x) => {
        if (settled) return;
        settled = true;
        clearInterval(watch);
        resolve(x);
      };
      const round = (this.round = new NetRound({
        app, link: this.link, slot: this.slot, round: r, seed,
        speed: app.testMode && app.netSpeed ? app.netSpeed : 1,
        net: () => ({ rtt: this.rtt ?? 120, jitter: this.jitter ?? 20 }),
        onEnd: (x) => { if (x.reason !== 'done') end({ reason: x.reason }); },
      }));
      const early = this.early.filter((m) => m.r === r);
      this.early = this.early.filter((m) => m.r > r);
      early.forEach((m) => round.onMessage(m));
      app.runner.play(gid, {
        online: true, players, difficulty: 0.5, caos: !!this.view.caos, event: null, options: {},
        label: `ONLINE · RONDA ${this.view.played + 1}`, mode: 'online', canRestart: false,
        onEscape: () => hooks.onEscape?.(),
        netOverlay: (g, runner) => hooks.overlay?.(g, runner, round),
      }).then((result) => end({ reason: 'done', result }), () => end({ reason: 'cancelled' }));
      // el rival recargó la página con la ronda en juego: la ronda termina acá (el servidor se la da a esta compu)
      this.onPeerRejoin = (rr) => {
        if (rr !== r || settled) return;
        round.dispose();
        end({ reason: 'peer_rejoin' });
      };
      // la serie terminó en el servidor (abandono del rival) o el rival dejó de mandar teclas
      const watch = setInterval(() => {
        if (this.view.status !== 'playing') {
          round.dispose();
          end({ reason: 'gone' });
        } else if (round.running && round.stall > 20) {
          round.dispose();
          end({ reason: 'stall' });
        } else if (!round.started && round.ready && performance.now() - readyAt > 45000) {
          // los dos listos pero la ronda nunca arrancó (no llegan los mensajes del rival)
          round.dispose();
          end({ reason: 'stall' });
        }
      }, 250);
      let readyAt = Infinity;
      hooks.showIntro?.(round, () => {
        readyAt = Math.min(readyAt, performance.now());
        const relay = this.link.mode === 'relay';
        round.setReady(delayFor(this.rtt ?? (relay ? 160 : 80), relay, this.jitter ?? 20));
      });
    });
  }

  /**
   * Envía el resultado de la ronda. Es idempotente en el servidor (una fila por partida, ronda y jugador), así que
   * se reintenta sin riesgo hasta que el servidor lo tenga o la ronda se resuelva.
   */
  async report(r, out) {
    if (out.reason === 'peer_rejoin') return true; // lo resuelve el servidor con el aviso del rival
    const payload = out.reason === 'done' && out.result
      ? this.app.accounts.matchPayload(out.result)
      : { desync: true, reason: out.reason, game: this.view.games[r] };
    for (let i = 0; i < 20 && !this.closed; i++) {
      if (this.view.round > r || this.view.status !== 'playing') return true;
      try {
        const v = await this.call('dc_online_report', { p_match: this.view.id, p_round: r, p_report: payload });
        this.setView(v);
        return true;
      } catch (e) {
        if (e.code === 'session_invalid' || e.code === 'not_found') return false;
        await new Promise((res) => setTimeout(res, 1500 + i * 250));
      }
    }
    return false;
  }

  /**
   * Espera a que el servidor resuelva la ronda r (los dos informaron, o venció el plazo del servidor).
   * Una ronda ya jugada nunca se vuelve a jugar: se espera la resolución (el servidor siempre resuelve).
   */
  waitResolved(r, timeoutMs = 120000) {
    this.waitingRound = true;
    return new Promise((resolve) => {
      const t0 = performance.now();
      const finish = (ok) => {
        clearInterval(iv);
        this.waitingRound = false;
        resolve(ok);
      };
      const check = () => {
        if (this.closed || this.lost) return finish(false);
        if (this.view.round > r || this.view.status !== 'playing') return finish(true);
        if (performance.now() - t0 > timeoutMs) return finish(false);
      };
      const iv = setInterval(check, 200);
      check();
    });
  }

  roundInfo(r) {
    return (this.view.rounds || []).find((x) => x.r === r) || null;
  }
  outFor(r) {
    return this.view.outs?.[String(r)] || null;
  }

  async leave() {
    try {
      const v = await this.call('dc_online_leave', { p_match: this.view.id });
      this.setView(v);
    } catch {}
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.pollTimer);
    clearInterval(this.pinger);
    this.round?.dispose();
    this.link?.close();
    this.listeners.clear();
  }
}

// SALA 2v2: lo que hace esta compu mientras está en una sala (local, privada online o encontrada por búsqueda).
//  · Consulta el estado al servidor (~1 vez por segundo) y entrega las señales WebRTC a cada conexión.
//  · Mantiene una conexión (Link) con cada otra compu de la sala desde el lobby: así el ping ya está medido
//    cuando arranca la partida y el chat funciona antes, durante y después.
//  · Juega cada ronda: si la sala tiene una sola compu, en modo local (sin red); si tiene varias, con MeshRound.
//  · Informa el resultado al servidor (cada compu por separado; el servidor compara).
import { rpc, ApiError } from './api.js';
import { Link, PROTO } from './netplay.js';
import { MeshRound } from './mesh.js';
import { PLAYER_COLORS } from '../core/characters.js';

const DEV_KEY = 'dc-dev-key';
/** Clave de esta pestaña (identifica al dispositivo en la sala; sobrevive a recargar la página). */
export function devKey() {
  let k = null;
  try { k = sessionStorage.getItem(DEV_KEY); } catch {}
  if (!k) {
    k = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    try { sessionStorage.setItem(DEV_KEY, k); } catch {}
  }
  return k;
}
const BOT_CHARS = ['volt', 'mochi', 'pico', 'brik'];
const TEAM_COLORS = [['#3985FF', '#25CFE6'], ['#FF654F', '#FF9E5E']];

/** Jugadores para dibujar a partir de la vista del servidor (lugar 0..3). */
export function roomPlayers(view) {
  return [0, 1, 2, 3].map((s) => {
    const x = view.slots.find((y) => y.slot === s);
    const team = s % 2, alt = s >= 2 ? 1 : 0;
    if (!x) return { name: '—', char: '__none', color: TEAM_COLORS[team][alt], acc: 'none', hidden: true };
    if (x.kind === 'bot') return { name: `BOT ${({ easy: 'FÁCIL', normal: 'NORMAL', hard: 'DIFÍCIL', expert: 'EXPERTO' })[x.bot] || ''}`, char: BOT_CHARS[s], color: TEAM_COLORS[team][alt], acc: 'none', bot: x.bot };
    const col = x.color && PLAYER_COLORS.some((c) => c.hex.toUpperCase() === x.color.toUpperCase()) ? x.color : TEAM_COLORS[team][alt];
    return { name: x.name || 'Invitado', char: x.char || BOT_CHARS[s], color: col, acc: { ...(x.equipped || {}) }, accountId: x.username || null, username: x.username || null };
  });
}

export class RoomSession {
  constructor(app, { user, view }) {
    this.app = app;
    this.user = user; // cuenta que conectó esta compu a la sala
    this.dev = devKey();
    this.view = view;
    this.sigAfter = 0;
    this.links = new Map();
    this.rtt = {};
    this.listeners = new Set();
    this.chatListeners = new Set();
    this.closed = false;
  }
  get me() {
    return this.view.my_idx;
  }
  get isHost() {
    return this.me === 0;
  }
  call(fn, args = {}) {
    const tok = this.app.accounts.tokenOf(this.user);
    if (!tok) return Promise.reject(new ApiError('session_invalid'));
    return rpc(fn, { p_token: tok, p_room: this.view.id, p_dev: this.dev, ...args });
  }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  onChat(fn) { this.chatListeners.add(fn); return () => this.chatListeners.delete(fn); }
  emit() { for (const fn of [...this.listeners]) { try { fn(this); } catch (e) { console.error(e); } } }

  start() {
    this.poll();
    this.pinger = setInterval(() => {
      for (const [d, l] of this.links) if (l.connected && !this.round?.running) l.send({ t: 'p', ts: Math.round(performance.now() * 10) / 10, v: PROTO });
    }, 700);
  }
  async poll() {
    if (this.closed) return;
    try {
      const v = await this.call('dc_room_state', { p_after: this.sigAfter });
      this.errors = 0;
      await this.setView(v);
    } catch (e) {
      this.errors = (this.errors || 0) + 1;
      if (e.code === 'not_in_room' || e.code === 'session_invalid') { this.lost = e.code; this.emit(); return; }
    }
    if (this.closed) return;
    const fast = this.view.status === 'playing' || this.view.status === 'confirm' || [...this.links.values()].some((l) => !l.connected);
    this.pollTimer = setTimeout(() => this.poll(), fast ? 600 : 1200);
  }
  async setView(v) {
    if (!v?.id) return;
    const sigs = v.signals || [];
    delete v.signals;
    // la búsqueda encontró partida: esta compu pasa a la sala nueva con la misma clave
    if (v.status === 'moved' && v.moved_to) {
      this.view = { ...v, id: v.moved_to };
      for (const l of this.links.values()) l.close();
      this.links.clear();
      this.sigAfter = 0;
      this.emit();
      return;
    }
    this.view = v;
    this.syncLinks();
    for (const s of sigs) {
      this.sigAfter = Math.max(this.sigAfter, s.id);
      await this.links.get(s.from)?.handleSignal(s.p);
    }
    this.emit();
  }
  /** Una conexión por cada otra compu de la sala (se crean y cierran según quién está). */
  syncLinks() {
    const idxs = new Set(this.view.devices.map((d) => d.idx));
    for (const [d, l] of this.links) if (!idxs.has(d)) { l.close(); this.links.delete(d); }
    for (const d of idxs) {
      if (d === this.me || this.links.has(d)) continue;
      const lo = Math.min(d, this.me), hi = Math.max(d, this.me);
      const l = new Link({
        slot: this.me < d ? 0 : 1,
        secret: `${this.view.secret}-${lo}-${hi}`,
        sendSignal: (p) => this.call('dc_room_signal', { p_to: d, p_payload: p }),
        onMessage: (m) => this.onMessage(d, m),
        onChange: () => this.emit(),
      });
      l.start();
      this.links.set(d, l);
    }
  }
  onMessage(d, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'p') { this.links.get(d)?.send({ t: 'q', ts: m.ts, v: PROTO }); if (m.v !== PROTO) this.versionMismatch = true; return; }
    if (m.t === 'q') {
      const r = performance.now() - m.ts;
      if (r >= 0 && r < 8000) this.rtt[d] = this.rtt[d] == null ? r : this.rtt[d] * 0.7 + r * 0.3;
      if (m.v !== PROTO) this.versionMismatch = true;
      return;
    }
    if (m.t === 'c') {
      // chat: texto plano, largo limitado, y como mucho 5 mensajes cada 10 s por compu (aunque la otra compu esté modificada)
      const now = performance.now();
      const q = (this.chatRate ||= {})[d] ||= [];
      while (q.length && now - q[0] > 10000) q.shift();
      if (q.length >= 5) return;
      q.push(now);
      const msg = { from: String(m.n || '').slice(0, 24), user: String(m.u || '').slice(0, 24), text: String(m.x || '').slice(0, 200), dev: d, at: Date.now() };
      for (const fn of this.chatListeners) fn(msg);
      return;
    }
    this.round?.onMessage(d, m);
  }
  /** Chat de la sala/partida: le llega a todas las compus. author = {name, username} del jugador local que escribe. */
  sendChat(author, text) {
    const msg = { t: 'c', n: author.name, u: author.username || '', x: text };
    for (const l of this.links.values()) l.send(msg);
    for (const fn of this.chatListeners) fn({ from: author.name, user: author.username || '', text, dev: this.me, at: Date.now(), mine: true });
  }
  get maxRtt() {
    const v = Object.values(this.rtt).filter((x) => x != null);
    return v.length ? Math.max(...v) : null;
  }
  get allConnected() {
    return [...this.links.values()].every((l) => l.connected);
  }

  /** Lugares de esta compu → jugador del teclado (0..3), en orden. */
  localMap() {
    const mine = this.view.slots.filter((s) => s.kind === 'local' && s.dev === this.me).sort((a, b) => a.slot - b.slot);
    return Object.fromEntries(mine.map((s, i) => [s.slot, i]));
  }

  /**
   * Juega la ronda actual. Devuelve {reason, result?}. hooks.overlay(g, runner, round) dibuja el estado de la red.
   * Con una sola compu en la sala se juega local (las teclas de cada lugar son las del jugador J1..J4).
   */
  async playRound(hooks = {}) {
    const app = this.app;
    const v = this.view;
    const players = roomPlayers(v);
    const bots = Object.fromEntries(v.slots.filter((s) => s.kind === 'bot').map((s) => [s.slot, s.bot]));
    app.input.setTeamMode(true);
    const label = `2v2 ${v.mode === 'competitive' ? 'COMPETITIVO' : 'AMISTOSO'} · RONDA ${v.round}`;
    if (v.devices.length <= 1) {
      try {
        const result = await app.runner.play(v.game, { players, team: true, bots, difficulty: 0.5, caos: false, event: null, options: {}, label, mode: 'room2v2', canRestart: false, seed: Number(v.seed) || null });
        return { reason: 'done', result };
      } catch (e) {
        return { reason: 'cancelled' };
      }
    }
    // varias compus: todas simulan la misma partida
    const owner = {};
    for (const s of v.slots) owner[s.slot] = s.kind === 'bot' ? 0 : s.dev;
    for (const s of [0, 1, 2, 3]) if (owner[s] == null) owner[s] = 0;
    const devices = v.devices.map((d) => d.idx);
    return new Promise((resolve) => {
      let settled = false;
      const end = (x) => { if (settled) return; settled = true; clearInterval(watch); resolve(x); };
      const round = (this.round = new MeshRound({
        app, links: this.links, me: this.me, devices, owner, local: this.localMap(), bots: this.isHost ? bots : {},
        round: v.round, seed: Number(v.seed) >>> 0, net: () => ({ rtt: this.maxRtt ?? 120, jitter: 20 }),
        speed: app.testMode && app.netSpeed ? app.netSpeed : 1,
        onEnd: (x) => { if (x.reason !== 'done') end({ reason: x.reason }); },
      }));
      app.runner.play(v.game, {
        online: true, team: true, players, difficulty: 0.5, caos: false, event: null, options: {}, label, mode: 'room2v2', canRestart: false,
        onEscape: () => hooks.onEscape?.(),
        netOverlay: (g, runner) => hooks.overlay?.(g, runner, round),
      }).then((result) => end({ reason: 'done', result }), () => end({ reason: 'cancelled' }));
      const watch = setInterval(() => {
        if (this.view.status !== 'playing' || this.view.round !== v.round) { round.dispose(); end({ reason: 'gone' }); }
        else if (round.running && round.stall > 20) { round.dispose(); end({ reason: 'stall' }); }
        else if (!round.started && performance.now() - t0 > 45000) { round.dispose(); end({ reason: 'stall' }); }
      }, 250);
      const t0 = performance.now();
      // un momento para ver los controles en la presentación; después se arranca (todas las compus a la vez)
      setTimeout(() => round.setReady(), app.testMode && app.netSpeed ? 300 : 2500);
    });
  }
  /** Informa el resultado (se reintenta: el servidor guarda una sola fila por compu y ronda). */
  async report(round, out) {
    const r = out.result;
    const winner = out.reason === 'done' && r ? (r.winner === 0 || r.winner === 1 ? r.winner : -1) : 2;
    const scores = r ? { scores: r.scores, display: r.display } : { reason: out.reason };
    for (let i = 0; i < 15 && !this.closed; i++) {
      if (this.view.round !== round || this.view.status !== 'playing') return true;
      try {
        await this.setView(await this.call('dc_room_report', { p_round: round, p_winner: winner, p_scores: scores }));
        return true;
      } catch (e) {
        if (e.code === 'not_in_room' || e.code === 'session_invalid') return false;
        await new Promise((res) => setTimeout(res, 1200));
      }
    }
    return false;
  }
  async leave() {
    try { await this.call('dc_room_leave'); } catch {}
    this.close();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.pollTimer);
    clearInterval(this.pinger);
    this.round?.dispose();
    for (const l of this.links.values()) l.close();
    this.links.clear();
    this.listeners.clear();
    this.chatListeners.clear();
    this.app.input.setTeamMode(false);
  }
}

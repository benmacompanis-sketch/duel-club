// AccountService: cuentas reales en el servidor (Supabase) para J1 y J2.
// - El navegador guarda solo los tokens de sesión (uno por cuenta iniciada en esta compu).
// - XP, PIES, ELO, logros, inventario, estadísticas e historial viven en la base de datos
//   y los calcula el servidor. Aquí solo se muestran y se envían resultados de partidas.
// - Los invitados juegan sin cuenta: sus partidas no dan progreso permanente.
// - Si no hay conexión, los resultados quedan en una cola y se envían al volver la conexión.
import { rpc, ApiError, errorText, uid } from '../net/api.js';
import { ITEM_BY_ID, levelInfo, GAME_NAMES } from '../data/catalog.js';
import { ACH_BY_ID, TIERS } from '../data/achievements.js';
import { PLAYER_COLORS } from './characters.js';

const SESS_KEY = 'duelclub.sessions.v2';
const QUEUE_KEY = 'duelclub.queue.v2';
const DIFF_NAMES = { 0: 'easy', 0.5: 'normal', 1: 'hard' };

function load(key, def) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v && typeof v === 'object' ? v : def;
  } catch {
    return def;
  }
}
function store(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
}

/** Normaliza el nombre a usuario: minúsculas, sin acentos, letras/números/guiones. */
export function slugify(name) {
  const s = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s.length >= 3 && s.length <= 16 ? s : null;
}

export { levelInfo };

export class AccountService {
  constructor(app) {
    this.app = app;
    this.cache = new Map(); // usuario -> datos propios (dc_me)
    this.sessions = load(SESS_KEY, {}); // usuario -> token
    this.queue = Array.isArray(load(QUEUE_KEY, [])) ? load(QUEUE_KEY, []) : [];
    this.listeners = new Set();
    this.status = 'connecting'; // connecting | online | offline
    this.ready = false;
    this.pending = new Map(); // client_id -> {resolve}
    this.busy = false;
  }

  // ------------------------------------------------------------------ estado
  get mode() {
    return 'cloud';
  }
  get modeLabel() {
    if (this.status === 'online') return this.queue.length ? `En línea · enviando ${this.queue.length}` : 'En línea · progreso guardado en el servidor';
    if (this.status === 'offline') return this.queue.length ? `Sin conexión · ${this.queue.length} partidas en espera` : 'Sin conexión · se juega como invitado';
    return 'Conectando…';
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    for (const fn of [...this.listeners]) {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    }
  }
  saveSessions() {
    store(SESS_KEY, this.sessions);
  }
  saveQueue() {
    store(QUEUE_KEY, this.queue);
  }

  async init() {
    const users = Object.keys(this.sessions);
    let offline = false;
    await Promise.all(users.map(async (u) => {
      try {
        this.cache.set(u, await rpc('dc_me', { p_token: this.sessions[u] }));
      } catch (e) {
        if (e.code === 'session_invalid') delete this.sessions[u];
        else offline = true;
      }
    }));
    if (!users.length) {
      // comprobar la conexión con una lectura pública liviana
      try {
        await rpc('dc_world_records');
      } catch {
        offline = true;
      }
    }
    this.saveSessions();
    for (const p of [0, 1]) {
      const prof = this.app.profiles[p];
      if (prof.accountId && !this.sessions[prof.accountId]) prof.accountId = null;
      if (prof.accountId && prof.accountId === this.app.profiles[1 - p].accountId && p === 1) prof.accountId = null;
    }
    this.syncProfiles();
    this.status = offline ? 'offline' : 'online';
    this.ready = true;
    this.emit();
    this.processQueue();
    clearInterval(this._poll);
    this._poll = setInterval(() => this.poll(), 60000);
    window.addEventListener('online', () => this.poll());
  }

  async poll() {
    const users = this.slotUsers();
    if (!users.length) {
      if (this.status === 'offline') {
        try {
          await rpc('dc_world_records');
          this.status = 'online';
          this.emit();
        } catch {}
      }
      return;
    }
    for (const u of users) await this.refresh(u).catch(() => {});
    this.processQueue();
  }

  // ------------------------------------------------------------------ sesiones y slots J1/J2
  slotUsers() {
    return [0, 1].map((p) => this.slotUser(p)).filter(Boolean);
  }
  slotUser(p) {
    const id = this.app.profiles[p]?.accountId;
    return id && this.sessions[id] ? id : null;
  }
  slotAccount(p) {
    const u = this.slotUser(p);
    return u ? this.cache.get(u) || null : null;
  }
  tokenOf(u) {
    return u ? this.sessions[u] || null : null;
  }
  slotToken(p) {
    return this.tokenOf(this.slotUser(p));
  }
  /** Cuentas con sesión guardada en esta compu (para elegirlas rápido). */
  savedAccounts() {
    return Object.keys(this.sessions).map((u) => this.cache.get(u) || { username: u, name: u, offline: true });
  }
  get accounts() {
    return new Map(this.savedAccounts().map((a) => [a.username, a]));
  }

  /** Copia nombre, personaje, color y cosméticos de la cuenta a la ficha del jugador. */
  syncProfiles() {
    for (const p of [0, 1]) {
      const me = this.slotAccount(p);
      const prof = this.app.profiles[p];
      if (!me) continue;
      prof.name = me.name;
      prof.char = me.char;
      prof.color = me.color;
      prof.acc = { ...(me.equipped || {}) };
      prof.level = me.level;
    }
    this.app.persist();
  }

  attach(p, username) {
    if (!this.sessions[username]) throw new ApiError('session_invalid');
    if (this.app.profiles[1 - p].accountId === username) throw new ApiError('same_account');
    this.app.profiles[p].accountId = username;
    this.syncProfiles();
    this.emit();
  }
  detach(p) {
    const prof = this.app.profiles[p];
    prof.accountId = null;
    prof.name = `Jugador ${p + 1}`;
    prof.acc = 'none';
    prof.level = null;
    if (!['volt', 'mochi', 'pico', 'brik'].includes(prof.char)) prof.char = p ? 'mochi' : 'volt';
    this.app.persist();
    this.emit();
  }
  _afterAuth(p, out) {
    const me = out.me;
    this.sessions[me.username] = out.token;
    this.cache.set(me.username, me);
    this.saveSessions();
    this.status = 'online';
    if (p != null) {
      if (this.app.profiles[1 - p].accountId === me.username) this.detach(1 - p);
      this.app.profiles[p].accountId = me.username;
    }
    this.syncProfiles();
    this.emit();
    return me;
  }
  async register(p, username, name, password) {
    return this._afterAuth(p, await rpc('dc_register', { p_username: username, p_name: name, p_password: password }));
  }
  async login(p, username, password) {
    return this._afterAuth(p, await rpc('dc_login', { p_username: username, p_password: password }));
  }
  async claim(p, username, pin, password) {
    return this._afterAuth(p, await rpc('dc_claim', { p_username: username, p_pin: pin, p_password: password }));
  }
  async checkUsername(username) {
    return rpc('dc_check_username', { p_username: username });
  }
  async rename(p, name) {
    const out = await rpc('dc_rename', { p_token: this.slotToken(p), p_name: name });
    return this._setMe(out.me);
  }
  // ------------------------------------------------------------------ presencia (usuarios en línea de verdad)
  startPresence() {
    if (this._presT) return;
    let cid = null;
    try { cid = localStorage.getItem('dc_client'); } catch {}
    if (!cid) { cid = 'c' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem('dc_client', cid); } catch {} }
    const beat = async () => {
      if (document.hidden) return;
      const place = this.app.online?.active || this.app.online?.view ? 'online' : this.app.runner?.active ? 'match' : 'menu';
      try {
        this.presence = await rpc('dc_presence', { p_client: cid, p_token: this.slotToken(0) || this.slotToken(1) || null, p_place: place });
        this.emit();
      } catch {}
    };
    beat();
    this._presT = setInterval(beat, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  }
  async changePassword(p, oldPass, newPass) {
    return rpc('dc_change_password', { p_token: this.slotToken(p), p_old: oldPass, p_new: newPass });
  }
  /** Cierra la sesión en el servidor y la olvida en esta compu. */
  async logout(username) {
    const tok = this.sessions[username];
    for (const p of [0, 1]) if (this.app.profiles[p].accountId === username) this.detach(p);
    delete this.sessions[username];
    this.cache.delete(username);
    this.saveSessions();
    this.emit();
    if (tok) await rpc('dc_logout', { p_token: tok }).catch(() => {});
  }

  /** Elimina la cuenta del jugador p en el servidor (pide la contraseña). No se puede deshacer. */
  async deleteAccount(p, password) {
    const u = this.slotUser(p);
    await this._call(u, 'dc_delete_account', { p_password: password });
    for (const q of [0, 1]) if (this.app.profiles[q].accountId === u) this.detach(q);
    delete this.sessions[u];
    this.cache.delete(u);
    this.saveSessions();
    this.emit();
  }

  _sessionLost(username) {
    delete this.sessions[username];
    this.cache.delete(username);
    this.saveSessions();
    for (const p of [0, 1]) if (this.app.profiles[p].accountId === username) this.detach(p);
    this.app.ui?.toast({ title: 'Sesión cerrada', text: `La sesión de ${username} expiró. Volvé a iniciar sesión.`, kind: 'warn', icon: 'lock' });
  }
  async _call(username, fn, args = {}) {
    const tok = this.tokenOf(username);
    if (!tok) throw new ApiError('session_invalid');
    try {
      const out = await rpc(fn, { p_token: tok, ...args });
      this.status = 'online';
      return out;
    } catch (e) {
      if (e.code === 'session_invalid') this._sessionLost(username);
      if (e.code === 'network') {
        this.status = 'offline';
        this.emit();
      }
      throw e;
    }
  }
  _setMe(me) {
    if (!me?.username) return me;
    this.cache.set(me.username, me);
    this.syncProfiles();
    this.emit();
    return me;
  }
  /** Vuelve a leer las cuentas de J1 y J2 (p. ej. una amistad entre ellas da logros a las dos). */
  async refreshAll() {
    await Promise.all(this.slotUsers().map((u) => this.refresh(u).catch(() => {})));
  }
  async refresh(username) {
    return this._setMe(await this._call(username, 'dc_me'));
  }

  // ------------------------------------------------------------------ aspecto, tienda e inventario
  async setLook(p, { char, color } = {}) {
    const u = this.slotUser(p);
    if (!u) {
      const prof = this.app.profiles[p];
      if (char) prof.char = char;
      if (color) prof.color = color;
      this.app.persist();
      this.emit();
      return null;
    }
    const me = this.cache.get(u);
    if (me && (char == null || me.char === char) && (color == null || me.color?.toUpperCase() === color.toUpperCase())) return me;
    return this._setMe(await this._call(u, 'dc_set_look', { p_char: char ?? null, p_color: color ?? null }));
  }
  async equip(p, slot, item) {
    return this._setMe(await this._call(this.slotUser(p), 'dc_equip', { p_slot: slot, p_item: item }));
  }
  async buy(p, item) {
    const out = await this._call(this.slotUser(p), 'dc_buy', { p_item: item });
    this._setMe(out.me);
    this.announceAchievements(out.achievements, out.me?.name);
    return out;
  }
  // ------------------------------------------------------------------ pase de batalla y desafíos
  async pass(p, season = null) {
    return this._call(this.slotUser(p), 'dc_pass', { p_season: season });
  }
  async passBuy(p) {
    const out = await this._call(this.slotUser(p), 'dc_pass_buy');
    this._setMe(out.me);
    return out;
  }
  async passClaim(p, level = null, track = null) {
    const out = await this._call(this.slotUser(p), 'dc_pass_claim', { p_level: level, p_track: track });
    this._setMe(out.me);
    return out;
  }
  async challenges(p) {
    return this._call(this.slotUser(p), 'dc_challenges');
  }
  async challengeClaim(p, id) {
    const out = await this._call(this.slotUser(p), 'dc_challenge_claim', { p_id: id });
    this._setMe(out.me);
    this.announceLevels?.(out.levels, out.me?.name);
    return out;
  }
  async transactions(p) {
    return this._call(this.slotUser(p), 'dc_transactions');
  }
  owns(p, itemId) {
    const it = ITEM_BY_ID[itemId];
    if (!it) return false;
    if (it.default) return true;
    const me = this.slotAccount(p);
    return !!me?.inventory?.includes(itemId);
  }

  // ------------------------------------------------------------------ amigos y notificaciones
  async friends(p) {
    return this._call(this.slotUser(p), 'dc_friends');
  }
  async friendRequest(p, username) {
    const r = await this._call(this.slotUser(p), 'dc_friend_request', { p_username: username });
    this.refreshAll();
    return r;
  }
  async friendRespond(p, username, accept) {
    const r = await this._call(this.slotUser(p), 'dc_friend_respond', { p_username: username, p_accept: accept });
    await this.refreshAll();
    return r;
  }
  async friendRemove(p, username) {
    const r = await this._call(this.slotUser(p), 'dc_friend_remove', { p_username: username });
    this.refreshAll();
    return r;
  }
  async notifications(p) {
    return this._call(this.slotUser(p), 'dc_notifications');
  }
  async markRead(p, ids = null) {
    const r = await this._call(this.slotUser(p), 'dc_notifications_read', { p_ids: ids });
    const me = this.slotAccount(p);
    if (me) {
      me.unread = 0;
      this.emit();
    }
    return r;
  }

  // ------------------------------------------------------------------ lecturas públicas
  ranking(kind = 'rating', { scope = 'global', p = 0, game = null, limit = 50, offset = 0, search = '' } = {}) {
    return rpc('dc_ranking', {
      p_kind: kind, p_scope: scope, p_token: this.slotToken(p) || this.slotToken(1 - p) || null,
      p_game: game, p_limit: limit, p_offset: offset, p_search: search || null,
    });
  }
  profile(username) {
    return rpc('dc_profile', { p_username: username });
  }
  search(q) {
    return rpc('dc_search', { p_query: q });
  }
  h2h(a, b) {
    return rpc('dc_h2h', { p_a: a, p_b: b });
  }
  worldRecords() {
    return rpc('dc_world_records');
  }
  feed() {
    return rpc('dc_feed');
  }

  // ------------------------------------------------------------------ partidas
  /**
   * Envía el resultado de un minijuego. Solo cuenta para los jugadores con cuenta.
   * Devuelve una promesa con la respuesta del servidor (o null si nadie tiene cuenta).
   */
  submitMatch(res, { mode = 'quick', compId = null, difficulty = 0.5, caos = false, bot = null } = {}) {
    // contra un bot solo cuenta la cuenta de J1 (el servidor da XP y PIES reducidos, nunca ELO)
    const users = mode === 'bot' ? [this.slotUser(0), null] : [this.slotUser(0), this.slotUser(1)];
    if (!users[0] && !users[1]) return Promise.resolve(null);
    const payload = {
      client_id: uid('m'),
      comp_id: compId,
      mode,
      bot,
      difficulty: caos ? 'caos' : DIFF_NAMES[difficulty] || 'normal',
      ...this.matchPayload(res),
    };
    return this._enqueue({ kind: 'match', users, payload });
  }
  /** Datos de una partida terminada tal como los recibe el servidor (también se usa online). */
  matchPayload(res) {
    const meta = this.app.gameMeta?.(res.gameId);
    const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const fmt = (v) => (v == null ? null : meta?.record?.format ? meta.record.format(v) : String(v));
    return {
      game: res.gameId,
      winner: res.winner,
      scores: (res.scores || []).map(num),
      display: (res.display || []).map((s) => String(s ?? '')),
      duration: Math.round((res.playSeconds || 0) * 10) / 10,
      margin: num(res.margin),
      flags: (res.flags || [{}, {}]).map((f) => {
        const o = {};
        for (const [k, v] of Object.entries(f || {})) if (num(v) != null) o[k] = v;
        return o;
      }),
      records: (res.records || [null, null]).map(num),
      display_records: (res.records || [null, null]).map((v) => fmt(num(v))),
      names: res.players.map((pl) => pl.name),
      colors: res.players.map((pl) => pl.color),
    };
  }

  /** Envía una competición terminada (Duel, Torneo o Survival). */
  submitCompetition(session) {
    const users = [this.slotUser(0), this.slotUser(1)];
    if (!session.clientId || (!users[0] && !users[1])) return Promise.resolve(null);
    const payload = {
      client_id: session.clientId,
      mode: session.mode,
      winner: session.winner,
      points: session.points.slice(),
      deficit: session.maxDeficit.slice(),
      stage: session.stage,
      difficulty: session.cfg.caos ? 'caos' : session.cfg.difficulty || 'normal',
      names: session.players.map((pl) => pl.name),
    };
    return this._enqueue({ kind: 'comp', users, payload });
  }

  _enqueue(item) {
    item.tries = 0;
    this.queue.push(item);
    this.saveQueue();
    const p = new Promise((resolve) => this.pending.set(item.payload.client_id, resolve));
    this.processQueue();
    return p;
  }
  async processQueue() {
    if (this.busy) return;
    this.busy = true;
    try {
      while (this.queue.length) {
        const item = this.queue[0];
        const toks = item.users.map((u) => this.tokenOf(u));
        if (!toks[0] && !toks[1]) {
          this._done(item, null);
          continue;
        }
        try {
          const out = await rpc(item.kind === 'match' ? 'dc_submit_match' : 'dc_submit_comp', {
            p_tok1: toks[0], p_tok2: toks[1], [item.kind === 'match' ? 'p_match' : 'p_comp']: item.payload,
          });
          this.status = 'online';
          this._done(item, out);
          if (out?.slots) this.applyServerResult(out, item);
        } catch (e) {
          if (e.code === 'network') {
            this.status = 'offline';
            this.emit();
            clearTimeout(this._retry);
            this._retry = setTimeout(() => this.processQueue(), 20000);
            break;
          }
          if (e.code === 'too_fast' && item.tries++ < 12) {
            clearTimeout(this._retry);
            this._retry = setTimeout(() => this.processQueue(), 8000);
            break;
          }
          if (e.code === 'session_invalid') {
            // una de las sesiones expiró: averiguar cuál y reintentar sin ella
            for (const u of item.users) {
              if (!u || !this.sessions[u]) continue;
              try {
                await rpc('dc_me', { p_token: this.sessions[u] });
              } catch (err) {
                if (err.code === 'session_invalid') this._sessionLost(u);
              }
            }
            if (item.tries++ < 2) continue;
          }
          console.warn('DUEL CLUB: el servidor rechazó un resultado', e.code, item);
          this.app.ui?.toast({ title: 'Resultado no guardado', text: errorText(e), kind: 'warn' });
          this._done(item, null);
        }
      }
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  _done(item, out) {
    this.queue.shift();
    this.saveQueue();
    const res = this.pending.get(item.payload.client_id);
    if (res) {
      this.pending.delete(item.payload.client_id);
      res(out);
    }
  }

  /** Actualiza las cuentas con la respuesta del servidor y anuncia niveles, logros, dominio y récords. */
  applyServerResult(out, item) {
    const slots = out.slots || [];
    slots.forEach((s, i) => this.announceSlot(s, item.payload.game, item.payload.names?.[i]));
    this.syncProfiles();
    this.emit();
  }
  /** Resultado online propio (una ronda o la serie): actualiza la cuenta y anuncia logros y niveles. */
  applyOnlineOut(s, gameId) {
    if (!s) return;
    this.announceSlot(s, gameId, '');
    this.syncProfiles();
    this.emit();
  }
  announceSlot(s, gameId, fallbackName) {
    if (!s) return;
    const me = s.me;
    if (me) this.cache.set(me.username, me);
    const who = me?.name || fallbackName || '';
    let delay = 300;
    const later = (fn) => {
      setTimeout(fn, delay);
      delay += 650;
    };
    const allow = (k) => this.app.save.settings.notify?.[k] !== false;
    if (s.record && allow('record')) later(() => this.app.ui?.toast({ kind: 'record', icon: 'trophy', title: `¡Récord mundial de ${who}!`, name: GAME_NAMES[gameId] || '', text: 'Ya figura en el ranking de récords.' }));
    if (s.mastery && allow('mastery')) {
      const ranks = ['Principiante', 'Aficionado', 'Competente', 'Experto', 'Maestro'];
      later(() => this.app.ui?.toast({ kind: 'mastery', icon: 'medal', title: `Dominio de ${who}`, name: `${GAME_NAMES[s.mastery.game]}: ${ranks[s.mastery.rank]}`, text: s.mastery.rank === 4 ? 'Skin y título exclusivos desbloqueados.' : 'Nuevo rango y recompensas.' }));
    }
    const levels = [...(s.levels || []), ...(s.achievements || []).flatMap((a) => a.levels || [])];
    this.announceAchievements(s.achievements, who, () => delay);
    delay += (s.achievements?.length || 0) * 650;
    if (levels.length) {
      const top = levels.reduce((m, l) => (l.level > m.level ? l : m));
      later(() => this.app.ui?.levelUp?.(top.level, who, levels));
    }
  }
  announceAchievements(list, who, delayFn = () => 300) {
    if (!list?.length || this.app.save.settings.notify?.achievement === false) return;
    const base = delayFn();
    list.forEach((a, i) => {
      const def = ACH_BY_ID[a.id];
      const rewards = (a.rewards || []).map((r) => ITEM_BY_ID[r]?.name).filter(Boolean);
      setTimeout(() => {
        this.app.ui?.toast({
          kind: 'achievement', icon: def?.icon || 'trophy',
          title: who ? `¡Logro de ${who}!` : '¡Logro desbloqueado!',
          name: def?.name || a.id,
          text: def?.secret ? '¡Logro secreto descubierto! ' + (def?.desc || '') : def?.desc || '',
          reward: `+${a.xp} XP · +${a.pies} PIES${rewards.length ? ' · ' + rewards.join(', ') : ''}`,
          tier: def?.tier,
        });
        this.app.audio.play('unlock');
        if (TIERS[def?.tier]?.xp >= 100) this.app.renderer.overlayFx.confetti(640, 200, 50, 1.2, false);
      }, base + i * 650);
    });
  }
}

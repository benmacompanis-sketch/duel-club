// AccountService: cuentas de jugador que funcionan desde cualquier computadora.
// - Modo NUBE: cuando la página publicada tiene acceso a la base compartida (`db`), las cuentas,
//   el ranking mundial (ELO), los récords mundiales y el historial del club se guardan ahí.
// - Modo LOCAL: sin acceso a la nube (p. ej. `npm run dev`), lo mismo se guarda en este navegador.
// - Modo SOLO LECTURA: se ve el ranking pero los resultados no se guardan.
// Los datos compartidos son entrada de otras personas: se validan siempre y se muestran como texto.
import { CHARACTERS, ACCESSORIES, PLAYER_COLORS } from './characters.js';
import { ACHIEVEMENTS } from './achievementManager.js';
import { GAME_BY_ID } from '../games/index.js';

const CHAR_IDS = new Set(CHARACTERS.map((c) => c.id));
const ACC_IDS = new Set(ACCESSORIES.map((a) => a.id));
const ACH_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const BASE_RATING = 1000;
const SLUG_RE = /^[a-z0-9_-]{3,16}$/;

// Niveles: hace falta 25·(L−1)·(L+2) XP para llegar al nivel L (100, 250, 450, 700…)
export const xpForLevel = (L) => 25 * (L - 1) * (L + 2);
export function levelInfo(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  const cur = xpForLevel(L), next = xpForLevel(L + 1);
  return { level: L, xp, into: xp - cur, need: next - cur, progress: (xp - cur) / (next - cur), title: levelTitle(L) };
}
export function levelTitle(L) {
  if (L >= 30) return 'Leyenda del club';
  if (L >= 20) return 'Élite';
  if (L >= 15) return 'Veterano';
  if (L >= 10) return 'Competidor';
  if (L >= 5) return 'Aspirante';
  return 'Novato';
}
export const XP = { played: 10, win: 15, draw: 5, competition: 20, competitionWin: 60, achievement: 40 };

// Estilos de tarjeta de perfil (algunos se desbloquean por nivel)
export const CARD_THEMES = [
  { id: 'player', name: 'Mi color', level: 1 },
  { id: 'neon', name: 'Neón', level: 1, a: '#9B6CFF', b: '#3985FF' },
  { id: 'sunset', name: 'Atardecer', level: 1, a: '#FF8E3C', b: '#FF5FA2' },
  { id: 'ocean', name: 'Océano', level: 3, a: '#25CFE6', b: '#3985FF' },
  { id: 'forest', name: 'Bosque', level: 5, a: '#48D597', b: '#1E8C7A' },
  { id: 'gold', name: 'Oro', level: 10, a: '#FFD45C', b: '#FF8E3C' },
  { id: 'galaxy', name: 'Galaxia', level: 20, a: '#6B4DFF', b: '#140B3A', stars: true },
];
const CARD_IDS = new Set(CARD_THEMES.map((c) => c.id));

export function emptyAccountStats() {
  return {
    minigames: { wins: 0, losses: 0, draws: 0 },
    competitions: { wins: 0, losses: 0, draws: 0 },
    streak: 0, bestStreak: 0, gamesWon: {}, tournaments: 0, played: 0, timePlayed: 0, survivalBest: 0,
  };
}

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v, max, d = '') => (typeof v === 'string' ? v.slice(0, max) : d);

/** Normaliza el nombre a un identificador: minúsculas, sin acentos, letras/números/guiones. */
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

/** Valida y completa una cuenta leída de cualquier origen. */
export function sanitizeAccount(id, raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const st = r.stats && typeof r.stats === 'object' ? r.stats : {};
  const base = emptyAccountStats();
  const pair = (o) => ({ wins: num(o?.wins), losses: num(o?.losses), draws: num(o?.draws) });
  const gamesWon = {};
  if (st.gamesWon && typeof st.gamesWon === 'object') for (const [k, v] of Object.entries(st.gamesWon)) if (GAME_BY_ID[k]) gamesWon[k] = num(v);
  const achievements = {};
  if (r.achievements && typeof r.achievements === 'object') for (const [k, v] of Object.entries(r.achievements)) if (ACH_IDS.has(k)) achievements[k] = { ts: num(v?.ts, Date.now()) };
  const records = {};
  if (r.records && typeof r.records === 'object') for (const [k, v] of Object.entries(r.records)) if (GAME_BY_ID[k] && Number.isFinite(v)) records[k] = v;
  const friends = Array.isArray(r.friends) ? [...new Set(r.friends.filter((f) => typeof f === 'string' && SLUG_RE.test(f) && f !== id))].slice(0, 50) : [];
  const h2h = {};
  if (r.h2h && typeof r.h2h === 'object') for (const [k, v] of Object.entries(r.h2h)) if (SLUG_RE.test(k) && Array.isArray(v)) h2h[k] = [num(v[0]), num(v[1]), num(v[2])];
  const history = Array.isArray(r.history) ? r.history.slice(0, 25).map(sanitizeHistory).filter(Boolean) : [];
  return {
    id,
    name: str(r.name, 16, id).trim() || id,
    pin: str(r.pin, 128, ''),
    char: CHAR_IDS.has(r.char) ? r.char : 'volt',
    color: COLOR_RE.test(r.color) ? r.color : PLAYER_COLORS[0].hex,
    acc: ACC_IDS.has(r.acc) ? r.acc : 'none',
    rating: Math.round(num(r.rating, BASE_RATING)),
    createdAt: num(r.createdAt, Date.now()),
    updatedAt: num(r.updatedAt, 0),
    stats: {
      ...base,
      minigames: pair(st.minigames), competitions: pair(st.competitions),
      streak: num(st.streak), bestStreak: num(st.bestStreak), gamesWon, tournaments: num(st.tournaments),
      played: num(st.played), timePlayed: num(st.timePlayed), survivalBest: num(st.survivalBest),
    },
    achievements,
    records,
    xp: Math.max(0, Math.round(num(r.xp))),
    card: CARD_IDS.has(r.card) ? r.card : 'player',
    friends,
    h2h,
    history,
  };
}

function sanitizeHistory(e) {
  if (!e || typeof e !== 'object') return null;
  return {
    ts: num(e.ts, 0), game: GAME_BY_ID[e.game] ? e.game : null, title: str(e.title, 30),
    opp: { id: SLUG_RE.test(e.opp?.id) ? e.opp.id : null, name: str(e.opp?.name, 16, '—'), color: COLOR_RE.test(e.opp?.color) ? e.opp.color : '#8C96B8' },
    res: ['W', 'L', 'D'].includes(e.res) ? e.res : 'D', score: str(e.score, 24), elo: num(e.elo), comp: !!e.comp,
  };
}

async function hashPin(id, pin) {
  const text = `duelclub:${id}:${pin}`;
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 'sha256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // contexto sin crypto.subtle: hash simple (el PIN es un candado casual, no seguridad real)
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 'fnv:' + h.toString(16);
  }
}

// ---------------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------------
class LocalBackend {
  constructor(app) {
    this.app = app;
    this.kind = 'local';
  }
  get data() {
    const s = this.app.save;
    s.accounts ||= {};
    s.club ||= { records: {}, feed: [] };
    return s;
  }
  async start(onAccounts) {
    this.onAccounts = onAccounts;
    onAccounts(Object.entries(this.data.accounts).map(([id, a]) => sanitizeAccount(id, a)), true);
  }
  async fetch(id) {
    const a = this.data.accounts[id];
    return a ? sanitizeAccount(id, a) : null;
  }
  async create(acc) {
    if (this.data.accounts[acc.id]) return 'taken';
    this.data.accounts[acc.id] = toDoc(acc);
    this.app.persist();
    this.onAccounts(Object.entries(this.data.accounts).map(([id, a]) => sanitizeAccount(id, a)), true);
    return 'ok';
  }
  async save(acc) {
    this.data.accounts[acc.id] = toDoc(acc);
    this.app.persist();
  }
  async getClub() {
    return { records: { ...this.data.club.records }, feed: this.data.club.feed.slice() };
  }
  async saveRecords(records) {
    this.data.club.records = records;
    this.app.persist();
  }
  async saveFeed(feed) {
    this.data.club.feed = feed;
    this.app.persist();
  }
}

class CloudBackend {
  constructor(db) {
    this.db = db;
    this.kind = 'cloud';
    this.chains = new Map();
  }
  // una escritura a la vez por documento
  queue(path, fn) {
    const prev = this.chains.get(path) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    this.chains.set(path, next);
    return next;
  }
  async start(onAccounts, onError) {
    this.unsub = this.db.collection('players').onSnapshot(
      (snap) => onAccounts(snap.docs.filter((d) => d.exists).map((d) => sanitizeAccount(d.id, d.data())), !snap.metadata.fromCache),
      (e) => onError?.(e),
    );
  }
  async fetch(id) {
    const s = await this.db.doc('players/' + id).get();
    return s.exists ? sanitizeAccount(id, s.data()) : null;
  }
  async create(acc) {
    const ref = this.db.doc('players/' + acc.id);
    // reclamar el nombre de forma segura: lease corto + comprobar que no exista
    const lease = await ref.acquire({ holder: 'create-' + Math.random().toString(36).slice(2), ttlMs: 5000 });
    if (!lease.acquired) return 'taken';
    const s = await ref.get();
    if (s.exists && s.data()?.name) return 'taken';
    await ref.set(toDoc(acc));
    return 'ok';
  }
  save(acc) {
    const doc = toDoc(acc);
    return this.queue('players/' + acc.id, () => this.db.doc('players/' + acc.id).set(doc));
  }
  async getClub() {
    const [r, f] = await Promise.all([this.db.doc('club/records').get(), this.db.doc('club/feed').get()]);
    const records = r.exists && r.data()?.games && typeof r.data().games === 'object' ? r.data().games : {};
    const feed = f.exists && Array.isArray(f.data()?.items) ? f.data().items : [];
    return { records, feed };
  }
  saveRecords(records) {
    return this.queue('club/records', () => this.db.doc('club/records').set({ games: records }));
  }
  saveFeed(feed) {
    return this.queue('club/feed', () => this.db.doc('club/feed').set({ items: feed }));
  }
}

function toDoc(a) {
  return {
    name: a.name, pin: a.pin, char: a.char, color: a.color, acc: a.acc, rating: a.rating,
    createdAt: a.createdAt, updatedAt: Date.now(), stats: a.stats, achievements: a.achievements, records: a.records,
    xp: a.xp, card: a.card, friends: a.friends, h2h: a.h2h, history: a.history,
  };
}

function sanitizeRecord(gameId, r) {
  if (!r || typeof r !== 'object' || !Number.isFinite(r.value)) return null;
  return {
    value: r.value, display: str(r.display, 40, String(r.value)), playerId: str(r.playerId, 20), name: str(r.name, 16, '—'),
    char: CHAR_IDS.has(r.char) ? r.char : 'volt', color: COLOR_RE.test(r.color) ? r.color : '#9B6CFF', date: num(r.date, 0),
  };
}
function sanitizeFeedItem(e) {
  if (!e || typeof e !== 'object') return null;
  const pl = Array.isArray(e.players) ? e.players.slice(0, 2).map((p) => ({
    name: str(p?.name, 16, '—'), color: COLOR_RE.test(p?.color) ? p.color : '#8C96B8', accountId: str(p?.accountId, 20) || null,
  })) : [];
  if (pl.length !== 2) return null;
  return {
    ts: num(e.ts, 0), mode: str(e.mode, 12), title: str(e.title, 30), players: pl,
    score: Array.isArray(e.score) ? e.score.slice(0, 2).map((x) => str(String(x), 12)) : ['', ''],
    winner: [0, 1, -1].includes(e.winner) ? e.winner : -1, detail: str(e.detail, 40),
  };
}

// ---------------------------------------------------------------------------------
export class AccountService {
  constructor(app) {
    this.app = app;
    this.mode = 'connecting';
    this.accounts = new Map();
    this.listeners = new Set();
    this.synced = false;
    this.backend = null;
    this.saveTimers = new Map();
    this.warned = false;
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    for (const fn of [...this.listeners]) {
      try { fn(); } catch (e) { console.error(e); }
    }
  }
  get canWrite() {
    return this.mode === 'cloud' || this.mode === 'local';
  }
  get modeLabel() {
    return { connecting: 'Conectando…', cloud: 'Ranking mundial conectado', readonly: 'Solo lectura: los resultados no se guardan', local: 'Modo local: cuentas en este navegador' }[this.mode];
  }

  async init() {
    let db = null, user = null;
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      }
    } catch {
      db = null;
    }
    if (db) {
      this.backend = new CloudBackend(db);
      let write = null;
      try { write = user ? await user.can('data.write') : null; } catch { write = null; }
      this.mode = write === false ? 'readonly' : 'cloud';
      this.loadTimer = setTimeout(() => { if (!this.synced) { this.loadSlow = true; this.emit(); } }, 10000);
    } else {
      this.backend = new LocalBackend(this.app);
      this.mode = 'local';
    }
    await this.backend.start(
      (list, definitive) => {
        this.accounts = new Map(list.map((a) => [a.id, a]));
        if (definitive) { this.synced = true; clearTimeout(this.loadTimer); this.loadSlow = false; }
        this.refreshSlots();
        this.emit();
      },
      (e) => this.fail(e),
    );
    this.emit();
    this.loadClub();
  }
  fail(e) {
    console.warn('DUEL CLUB nube:', e?.code, e?.message);
    if (e?.code === 'invalid_argument' && this.mode === 'cloud') {
      // la plataforma rechazó la escritura: este visitante no puede guardar
      this.mode = 'readonly';
      this.emit();
    }
    if (!this.warned) {
      this.warned = true;
      this.app.ui.toast({ title: 'Nube no disponible', text: this.mode === 'readonly' ? 'Podés ver el ranking, pero tus resultados no se guardan en la nube.' : 'No se pudo guardar en la nube. Se reintentará en la próxima partida.', kind: 'warn', time: 5000 });
    }
  }
  async loadClub() {
    try {
      const club = await this.backend.getClub();
      this.records = {};
      for (const [k, v] of Object.entries(club.records || {})) { const r = GAME_BY_ID[k] ? sanitizeRecord(k, v) : null; if (r) this.records[k] = r; }
      this.feed = (club.feed || []).map(sanitizeFeedItem).filter(Boolean).slice(0, 60);
      this.emit();
    } catch (e) {
      this.records ||= {};
      this.feed ||= [];
    }
  }

  get(id) {
    return id ? this.accounts.get(id) || null : null;
  }
  slotAccount(p) {
    return this.get(this.app.profiles[p]?.accountId);
  }
  ranking() {
    return [...this.accounts.values()].sort((a, b) => b.rating - a.rating || b.stats.minigames.wins - a.stats.minigames.wins || a.name.localeCompare(b.name));
  }
  /** La apariencia de los jugadores conectados sigue a su cuenta. */
  refreshSlots() {
    const P = this.app.profiles;
    for (const p of [0, 1]) {
      const acc = this.get(P[p].accountId);
      if (acc) {
        P[p].name = acc.name;
        P[p].char = acc.char;
        P[p].acc = acc.acc;
        if (P[1 - p].color !== acc.color) P[p].color = acc.color;
      }
    }
  }
  rememberRecent(id) {
    const s = this.app.save;
    s.recentAccounts = [id, ...(s.recentAccounts || []).filter((x) => x !== id)].slice(0, 8);
    this.app.persist();
  }
  recent() {
    return (this.app.save.recentAccounts || []).filter((id) => typeof id === 'string');
  }

  // ------------------------------------------------------------- sesión
  async create(p, name, pin) {
    if (!this.canWrite) return { error: 'Este visitante no puede crear cuentas (solo lectura).' };
    const id = slugify(name);
    if (!id) return { error: 'El nombre debe tener entre 3 y 16 letras o números.' };
    if (!/^\d{4}$/.test(pin)) return { error: 'El PIN debe tener 4 números.' };
    const prof = this.app.profiles[p];
    const acc = sanitizeAccount(id, {
      name: name.trim().slice(0, 16), char: prof.char, color: prof.color, acc: prof.acc, rating: BASE_RATING, createdAt: Date.now(),
    });
    acc.pin = await hashPin(id, pin);
    try {
      const r = await this.backend.create(acc);
      if (r === 'taken') return { error: 'Ese nombre ya existe. Elegí otro o iniciá sesión.' };
    } catch (e) {
      this.fail(e);
      return { error: 'No se pudo crear la cuenta. Probá de nuevo.' };
    }
    this.accounts.set(id, acc);
    this.attach(p, acc);
    return { account: acc };
  }
  async login(p, name, pin) {
    const id = slugify(name);
    if (!id) return { error: 'Escribí el nombre de tu cuenta.' };
    let acc = this.get(id);
    if (!acc) {
      try { acc = await this.backend.fetch(id); } catch { acc = null; }
    }
    if (!acc) return { error: 'No existe una cuenta con ese nombre.' };
    if (this.app.profiles[1 - p].accountId === id) return { error: `${acc.name} ya está jugando como J${2 - p}.` };
    const h = await hashPin(id, pin);
    if (acc.pin && acc.pin !== h) return { error: 'PIN incorrecto.' };
    this.accounts.set(id, acc);
    this.attach(p, acc);
    return { account: acc };
  }
  attach(p, acc) {
    const prof = this.app.profiles[p];
    prof.accountId = acc.id;
    this.rememberRecent(acc.id);
    this.refreshSlots();
    this.app.persist();
    this.emit();
  }
  logout(p) {
    const prof = this.app.profiles[p];
    prof.accountId = null;
    prof.name = `Jugador ${p + 1}`;
    this.app.persist();
    this.emit();
  }
  /** Guarda la apariencia elegida en la cuenta del jugador. */
  setLook(p, look) {
    const acc = this.slotAccount(p);
    if (!acc) return;
    Object.assign(acc, look);
    this.scheduleSave(acc);
  }

  // ------------------------------------------------------------- niveles, tarjeta y amigos
  /** Suma XP; devuelve true si la cuenta subió de nivel (y lo anuncia). */
  addXp(a, n) {
    const before = levelInfo(a.xp).level;
    a.xp += n;
    const after = levelInfo(a.xp);
    if (after.level > before) {
      setTimeout(() => {
        this.app.ui.toast({ kind: 'achievement', icon: 'star', title: `¡${a.name} subió de nivel!`, name: `Nivel ${after.level} · ${after.title}`, text: CARD_THEMES.filter((t) => t.level === after.level).map((t) => `Nueva tarjeta: ${t.name}`).join(' · ') || 'Seguí jugando para desbloquear más estilos de tarjeta.' });
        this.app.audio.play('unlock');
      }, 900);
      return true;
    }
    return false;
  }
  level(a) {
    return levelInfo(a?.xp || 0);
  }
  setCard(p, themeId) {
    const a = this.slotAccount(p);
    const t = CARD_THEMES.find((x) => x.id === themeId);
    if (!a || !t || this.level(a).level < t.level) return false;
    a.card = themeId;
    this.scheduleSave(a, 300);
    this.emit();
    return true;
  }
  /** Posición en el ranking mundial (1 = primero). */
  rankOf(id) {
    const i = this.ranking().findIndex((a) => a.id === id);
    return i >= 0 ? i + 1 : null;
  }
  search(q) {
    const k = slugify(q) || String(q || '').toLowerCase().trim();
    if (!k) return [];
    return [...this.accounts.values()].filter((a) => a.id.includes(k) || a.name.toLowerCase().includes(k)).slice(0, 8);
  }
  isFriend(p, id) {
    return !!this.slotAccount(p)?.friends.includes(id);
  }
  addFriend(p, id) {
    const a = this.slotAccount(p);
    if (!a || !this.canWrite || id === a.id || !this.get(id) || a.friends.includes(id)) return false;
    a.friends = [...a.friends, id].slice(0, 50);
    this.scheduleSave(a, 200);
    this.emit();
    return true;
  }
  removeFriend(p, id) {
    const a = this.slotAccount(p);
    if (!a || !a.friends.includes(id)) return false;
    a.friends = a.friends.filter((x) => x !== id);
    this.scheduleSave(a, 200);
    this.emit();
    return true;
  }
  /** Juego favorito: el que más veces ganó. */
  favoriteGame(a) {
    const e = Object.entries(a.stats.gamesWon).sort((x, y) => y[1] - x[1])[0];
    return e ? { id: e[0], wins: e[1], name: GAME_BY_ID[e[0]]?.meta.name || e[0] } : null;
  }

  // ------------------------------------------------------------- guardado
  scheduleSave(acc, delay = 600) {
    if (!this.canWrite || !acc) return;
    clearTimeout(this.saveTimers.get(acc.id));
    this.saveTimers.set(acc.id, setTimeout(() => this.saveNow(acc), delay));
  }
  async saveNow(acc) {
    clearTimeout(this.saveTimers.get(acc.id));
    this.saveTimers.delete(acc.id);
    if (!this.canWrite) return;
    try {
      await this.backend.save(acc);
    } catch (e) {
      this.fail(e);
    }
  }

  // ------------------------------------------------------------- resultados
  /** Actualiza estadísticas, ELO y récords de las cuentas que jugaron un minijuego. */
  applyMinigame(res) {
    const ids = res.players.map((p) => p.accountId || null);
    const accs = ids.map((id) => this.get(id));
    const delta = [0, 0];
    const w = res.winner;
    for (const p of [0, 1]) {
      const a = accs[p];
      if (!a) continue;
      const s = a.stats;
      s.played++;
      s.timePlayed += res.playSeconds || 0;
      if (w === p) {
        s.minigames.wins++;
        s.streak++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        s.gamesWon[res.gameId] = (s.gamesWon[res.gameId] || 0) + 1;
      } else if (w === 1 - p) {
        s.minigames.losses++;
        s.streak = 0;
      } else {
        s.minigames.draws++;
        s.streak = 0;
      }
    }
    // XP para cada cuenta
    const xpGain = [0, 0];
    const levelUp = [false, false];
    for (const p of [0, 1]) {
      const a = accs[p];
      if (!a) continue;
      xpGain[p] = XP.played + (w === p ? XP.win : w === -1 ? XP.draw : 0);
      levelUp[p] = this.addXp(a, xpGain[p]);
    }
    // ELO: solo entre dos cuentas distintas (no se suman puntos contra invitados)
    if (accs[0] && accs[1] && accs[0] !== accs[1]) {
      const [A, B] = accs;
      const ea = 1 / (1 + Math.pow(10, (B.rating - A.rating) / 400));
      const sa = w === 0 ? 1 : w === 1 ? 0 : 0.5;
      const K = 24;
      const d = Math.round(K * (sa - ea));
      A.rating += d;
      B.rating -= d;
      delta[0] = d;
      delta[1] = -d;
    }
    // historial personal y cara a cara
    for (const p of [0, 1]) {
      const a = accs[p];
      if (!a) continue;
      const opp = res.players[1 - p];
      const r = w === p ? 'W' : w === 1 - p ? 'L' : 'D';
      a.history = [{
        ts: Date.now(), game: res.gameId, title: GAME_BY_ID[res.gameId]?.meta.name || res.gameId,
        opp: { id: opp.accountId || null, name: opp.name, color: opp.color }, res: r,
        score: `${res.display?.[p] ?? ''} – ${res.display?.[1 - p] ?? ''}`, elo: delta[p], comp: false,
      }, ...a.history].slice(0, 25);
      if (opp.accountId && opp.accountId !== a.id) {
        const e = (a.h2h[opp.accountId] ||= [0, 0, 0]);
        e[r === 'W' ? 0 : r === 'D' ? 1 : 2]++;
      }
    }
    // récords mundiales y personales
    const meta = GAME_BY_ID[res.gameId]?.meta;
    let recChanged = false;
    const worldNew = [false, false];
    if (meta?.record) {
      const better = meta.record.better === 'lower' ? (x, y) => x < y : (x, y) => x > y;
      this.records ||= {};
      for (const p of [0, 1]) {
        const a = accs[p];
        const v = res.records?.[p];
        if (!a || v == null || !Number.isFinite(v)) continue;
        if (a.records[res.gameId] == null || better(v, a.records[res.gameId])) a.records[res.gameId] = v;
        const cur = this.records[res.gameId];
        if (!cur || better(v, cur.value)) {
          this.records[res.gameId] = {
            value: v, display: meta.record.format ? meta.record.format(v) : String(v), playerId: a.id, name: a.name, char: a.char, color: a.color, date: Date.now(),
          };
          recChanged = true;
          worldNew[p] = true;
        }
      }
    }
    if (recChanged && this.canWrite) this.backend.saveRecords(this.records).catch((e) => this.fail(e));
    if (accs.some(Boolean)) this.emit();
    return { ratingDelta: delta, accounts: accs, worldNew, xpGain, levelUp };
  }
  applyCompetition(session) {
    const w = session.winner;
    for (const p of [0, 1]) {
      const a = this.get(session.players[p].accountId);
      if (!a) continue;
      const c = a.stats.competitions;
      this.addXp(a, XP.competition + (w === p ? XP.competitionWin : 0));
      if (w === p) { c.wins++; if (session.mode === 'tournament') a.stats.tournaments++; }
      else if (w === 1 - p) c.losses++;
      else c.draws++;
      if (session.mode === 'survival') a.stats.survivalBest = Math.max(a.stats.survivalBest, session.stage);
    }
    this.addFeed({
      mode: session.mode, title: { duel: 'Duel Mode', tournament: 'Torneo', survival: 'Survival' }[session.mode] || session.mode,
      players: session.players, winner: w,
      score: session.mode === 'survival' ? session.lives.map((l) => `${l} ♥`) : session.points.map(String),
      detail: session.mode === 'survival' ? `Etapa ${session.stage}` : `${session.results.length} minijuegos`,
    });
    this.flush(session.players);
  }
  addFeed(e) {
    if (!this.canWrite) return;
    const item = sanitizeFeedItem({
      ts: Date.now(), mode: e.mode, title: e.title, winner: e.winner, score: e.score, detail: e.detail,
      players: e.players.map((p) => ({ name: p.name, color: p.color, accountId: p.accountId || null })),
    });
    if (!item) return;
    this.feed = [item, ...(this.feed || [])].slice(0, 60);
    this.backend.saveFeed(this.feed).catch((err) => this.fail(err));
    this.emit();
  }
  /** Guarda en seguida las cuentas de estos jugadores. */
  flush(players) {
    for (const pl of players) {
      const a = this.get(pl.accountId);
      if (a) this.saveNow(a);
    }
  }
}

// StorageManager: persistencia segura en LocalStorage. Valida y fusiona con valores por
// defecto (datos corruptos o de versiones antiguas no rompen el juego) y cae a memoria si
// el navegador bloquea el almacenamiento.

const KEY = 'duelclub.save.v1';

export function defaultStats() {
  return {
    players: [emptyPlayerStats(), emptyPlayerStats()],
    games: {}, // id -> { played, wins:[0,0], draws, best:{value, display, name, slot, date} }
    competitions: { duel: 0, tournament: 0, survival: 0, quick: 0 },
    totalMinigames: 0,
    totalTime: 0,
    bestStreak: { value: 0, name: '' },
    survivalBest: { stage: 0, name: '', streak: 0 },
    headToHead: {},
  };
}
function emptyPlayerStats() {
  return {
    minigames: { wins: 0, losses: 0, draws: 0 },
    competitions: { wins: 0, losses: 0, draws: 0 },
    streak: 0,
    bestStreak: 0,
    gamesWon: {}, // id -> victorias (para "ganar todos los minijuegos")
    tournaments: 0,
  };
}

export function defaultSave() {
  return {
    version: 1,
    settings: {
      master: 0.8, music: 0.55, sfx: 0.85,
      animations: true, quality: 'high', beatOffset: 0, bindings: null, showHints: true,
    },
    profiles: [
      { name: 'Jugador 1', char: 'volt', color: '#3985FF', acc: 'none', accountId: null },
      { name: 'Jugador 2', char: 'mochi', color: '#FF654F', acc: 'none', accountId: null },
    ],
    recentAccounts: [],
    accounts: {}, // solo en modo local (sin nube)
    club: { records: {}, feed: [] }, // solo en modo local
    stats: defaultStats(),
    achievements: {},
    history: [],
    gameOptions: {},
    lastDuel: null,
  };
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
// Fusión profunda: solo acepta valores del mismo tipo que el valor por defecto.
function merge(def, val) {
  if (val === undefined || val === null) return def;
  if (Array.isArray(def)) return Array.isArray(val) ? val : def;
  if (isObj(def)) {
    if (!isObj(val)) return def;
    const out = { ...val };
    for (const k of Object.keys(def)) out[k] = merge(def[k], val[k]);
    return out;
  }
  if (def === null) return val;
  return typeof val === typeof def && !(typeof val === 'number' && !Number.isFinite(val)) ? val : def;
}

export class StorageManager {
  constructor() {
    this.available = true;
    this.data = defaultSave();
    this._timer = null;
    this.onError = null;
  }
  load() {
    let raw = null;
    try {
      const k = '__dc_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      raw = localStorage.getItem(KEY);
    } catch {
      this.available = false;
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.data = merge(defaultSave(), parsed);
        // perfiles: garantizar dos entradas válidas
        const defP = defaultSave().profiles;
        this.data.profiles = [0, 1].map((i) => merge(defP[i], this.data.profiles?.[i]));
        const defS = defaultStats();
        this.data.stats.players = [0, 1].map((i) => merge(defS.players[i], this.data.stats.players?.[i]));
        if (!Array.isArray(this.data.history)) this.data.history = [];
      } catch (e) {
        console.warn('DUEL CLUB: datos guardados dañados, se restablecen.', e);
        try {
          localStorage.setItem(KEY + '.backup', raw);
        } catch {}
        this.data = defaultSave();
      }
    }
    return this.data;
  }
  save() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.saveNow(), 150);
  }
  saveNow() {
    clearTimeout(this._timer);
    if (!this.available) return false;
    try {
      if (this.data.history.length > 60) this.data.history.length = 60;
      localStorage.setItem(KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.warn('DUEL CLUB: no se pudo guardar', e);
      this.onError?.(e);
      return false;
    }
  }
  resetStats() {
    this.data.stats = defaultStats();
    this.data.history = [];
    this.saveNow();
  }
  resetAchievements() {
    this.data.achievements = {};
    // si un perfil usaba algo bloqueado, volver a valores base
    this.saveNow();
  }
  get settings() {
    return this.data.settings;
  }
  get stats() {
    return this.data.stats;
  }
}

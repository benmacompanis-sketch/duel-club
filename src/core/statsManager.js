// StatsManager: traduce resultados de minijuegos y competiciones a estadísticas persistentes
// (victorias, rachas, récords por minijuego, historial y cara a cara).
import { GAME_BY_ID } from '../games/index.js';

export class StatsManager {
  constructor(app) {
    this.app = app;
  }
  get s() {
    return this.app.save.stats;
  }

  /** Registra un minijuego terminado. Devuelve info para la pantalla de resultados. */
  recordMinigame(res, mode) {
    const s = this.s;
    const id = res.gameId;
    const meta = GAME_BY_ID[id]?.meta;
    const out = { newRecords: [false, false] };
    s.totalMinigames++;
    s.totalTime += res.playSeconds || 0;
    const gs = (s.games[id] ||= { played: 0, wins: [0, 0], draws: 0, best: null });
    gs.played++;
    const P = s.players;
    if (res.winner === 0 || res.winner === 1) {
      const w = res.winner, l = 1 - w;
      gs.wins[w]++;
      P[w].minigames.wins++;
      P[l].minigames.losses++;
      P[w].streak++;
      P[l].streak = 0;
      P[w].gamesWon[id] = (P[w].gamesWon[id] || 0) + 1;
      if (P[w].streak > P[w].bestStreak) P[w].bestStreak = P[w].streak;
      if (P[w].streak > s.bestStreak.value) s.bestStreak = { value: P[w].streak, name: res.players[w].name };
    } else {
      gs.draws++;
      P[0].minigames.draws++;
      P[1].minigames.draws++;
      P[0].streak = 0;
      P[1].streak = 0;
    }
    // récords individuales
    if (meta?.record) {
      for (const p of [0, 1]) {
        const v = res.records?.[p];
        if (v == null || !Number.isFinite(v)) continue;
        const better = meta.record.better === 'lower' ? (a, b) => a < b : (a, b) => a > b;
        if (!gs.best || better(v, gs.best.value)) {
          gs.best = {
            value: v, display: meta.record.format ? meta.record.format(v) : String(v),
            name: res.players[p].name, char: res.players[p].char, color: res.players[p].color, slot: p, date: Date.now(),
          };
          out.newRecords[p] = true;
        }
      }
    }
    // cara a cara entre nombres
    const h2h = this.h2hEntry(res.players);
    if (res.winner >= 0) h2h.wins[res.players[res.winner].name] = (h2h.wins[res.players[res.winner].name] || 0) + 1;
    else h2h.draws++;
    if (mode === 'quick') {
      s.competitions.quick++;
      this.addHistory({
        mode: 'quick', title: meta?.name || id, players: res.players, score: res.display, winner: res.winner,
        detail: res.scoreLabel,
      });
    }
    this.app.persist();
    return out;
  }

  h2hKey(players) {
    return players.map((p) => p.name.trim().toLowerCase()).sort().join('|');
  }
  h2hEntry(players) {
    const key = this.h2hKey(players);
    return (this.s.headToHead[key] ||= { wins: {}, draws: 0 });
  }
  h2hText(players) {
    const e = this.s.headToHead[this.h2hKey(players)];
    if (!e) return null;
    const a = e.wins[players[0].name] || 0, b = e.wins[players[1].name] || 0;
    if (!a && !b && !e.draws) return null;
    return { a, b, draws: e.draws };
  }

  /** Registra una competición finalizada (duelo, torneo o supervivencia). */
  recordCompetition(session) {
    const s = this.s;
    s.competitions[session.mode] = (s.competitions[session.mode] || 0) + 1;
    const P = s.players;
    const w = session.winner;
    if (w === 0 || w === 1) {
      P[w].competitions.wins++;
      P[1 - w].competitions.losses++;
      if (session.mode === 'tournament') P[w].tournaments++;
    } else {
      P[0].competitions.draws++;
      P[1].competitions.draws++;
    }
    if (session.mode === 'survival') {
      if (session.stage > s.survivalBest.stage) {
        s.survivalBest = { stage: session.stage, name: w >= 0 ? session.players[w].name : '—', streak: Math.max(...session.survivalStreakBest) };
      }
    }
    const titles = { duel: 'Duel Mode', tournament: 'Torneo', survival: 'Survival' };
    this.addHistory({
      mode: session.mode,
      title: titles[session.mode] || session.mode,
      players: session.players,
      score: session.mode === 'survival' ? session.lives.map((l) => `${l} ♥`) : session.points.map(String),
      winner: w,
      detail: session.mode === 'survival' ? `Etapa ${session.stage}` : `${session.results.length} minijuegos`,
    });
    this.app.persist();
  }

  addHistory(e) {
    const h = this.app.save.history;
    h.unshift({
      ts: Date.now(),
      mode: e.mode,
      title: e.title,
      players: e.players.map((p) => ({ name: p.name, char: p.char, color: p.color })),
      score: e.score,
      winner: e.winner,
      detail: e.detail || '',
    });
    if (h.length > 60) h.length = 60;
  }
}

// TournamentManager: sesiones de competición y flujos de cada modo.
// Sistema global: victoria 3 pts, empate 1 pt para cada uno, derrota 0.
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { pickEvent } from './events.js';
import { shuffle, choice } from './utils.js';
import { vsScreen } from '../ui/vs.js';
import { resultsScreen } from '../ui/results.js';
import { championScreen } from '../ui/champion.js';
import { standingsScreen } from '../ui/scoreboard.js';
import { quickPlayScreen } from '../ui/quickPlay.js';

export const DIFFS = {
  easy: { label: 'Fácil', v: 0 },
  normal: { label: 'Normal', v: 0.5 },
  hard: { label: 'Difícil', v: 1 },
};

export class Session {
  constructor(mode, cfg, players) {
    this.mode = mode;
    this.cfg = cfg;
    this.players = players.map((p) => ({ ...p }));
    this.points = [0, 0];
    this.wins = [0, 0];
    this.draws = 0;
    this.results = [];
    this.startedAt = Date.now();
    this.playTime = 0;
    this.maxDeficit = [0, 0];
    this.lives = [cfg.lives || 0, cfg.lives || 0];
    this.stage = 0;
    this.survivalStreak = [0, 0];
    this.survivalStreakBest = [0, 0];
    this.recordsBroken = [];
    this.queue = [];
    this.rounds = [];
    this.roundBonus = [0, 0];
    this.tiebreak = false;
  }
  addResult(gameId, res, mult = 1) {
    const pts = [0, 0];
    if (res.winner === 0 || res.winner === 1) {
      pts[res.winner] = 3 * mult;
      this.wins[res.winner]++;
    } else {
      pts[0] = pts[1] = 1 * mult;
      this.draws++;
    }
    this.points[0] += pts[0];
    this.points[1] += pts[1];
    this.playTime += res.playSeconds || 0;
    for (const p of [0, 1]) this.maxDeficit[p] = Math.max(this.maxDeficit[p], this.points[1 - p] - this.points[p]);
    this.results.push({
      gameId, winner: res.winner, display: res.display, scores: res.scores, scoreLabel: res.scoreLabel, pts, mult,
      event: res.event, stats: res.stats, records: res.records, flags: res.flags,
    });
    return pts;
  }
  addBonus(p, n = 1) {
    this.points[p] += n;
    this.roundBonus[p] += n;
    for (const q of [0, 1]) this.maxDeficit[q] = Math.max(this.maxDeficit[q], this.points[1 - q] - this.points[q]);
  }
  get winner() {
    if (this.mode === 'survival') {
      if (this.lives[0] <= 0 && this.lives[1] <= 0) return -1;
      if (this.lives[0] <= 0) return 1;
      if (this.lives[1] <= 0) return 0;
      return -1;
    }
    if (this.points[0] === this.points[1]) return -1;
    return this.points[0] > this.points[1] ? 0 : 1;
  }
  get duration() {
    return (Date.now() - this.startedAt) / 1000;
  }
}

function snapshotPlayers(app) {
  return app.profiles.map((p) => ({ ...p }));
}

export function buildQueue(cfg) {
  const ids = GAMES.map((G) => G.meta.id);
  if (cfg.selection === 'manual' && cfg.manual?.length) return cfg.manual.slice();
  const out = [];
  if (!cfg.repeat) return shuffle(ids).slice(0, cfg.count);
  let bag = [];
  while (out.length < cfg.count) {
    if (!bag.length) bag = shuffle(ids);
    const id = bag.pop();
    if (out[out.length - 1] === id && bag.length) {
      bag.unshift(id);
      continue;
    }
    out.push(id);
  }
  return out;
}

/** Juega un minijuego dentro de una sesión. Devuelve false si se abandonó la competición. */
async function playOne(app, session, gameId, info) {
  const meta = GAME_BY_ID[gameId].meta;
  const event = info.event !== undefined ? info.event : session.cfg.events ? pickEvent(meta, info.eventChance ?? 0.6) : null;
  let res;
  try {
    res = await app.runner.play(gameId, {
      players: session.players,
      difficulty: info.difficulty ?? DIFFS[session.cfg.difficulty || 'normal'].v,
      event,
      options: app.save.gameOptions[gameId] || {},
      label: info.label,
      music: info.music,
      mode: session.mode,
      quitTitle: '¿Abandonar la competición?',
      quitText: 'Se perderá el progreso de toda la competición en curso.',
    });
  } catch (e) {
    if (e && e.cancelled) return false;
    throw e;
  }
  const rec = app.stats.recordMinigame(res, session.mode);
  rec.newRecords.forEach((v, p) => v && session.recordsBroken.push({ gameId, p }));
  Object.assign(rec, app.accounts.applyMinigame(res));
  app.achievements.evaluate({ type: 'minigame', res });
  app.accounts.flush(res.players);
  const before = session.points.slice();
  const livesBefore = session.lives.slice();
  if (session.mode === 'survival') {
    if (res.winner >= 0) {
      session.lives[1 - res.winner] = Math.max(0, session.lives[1 - res.winner] - 1);
      session.survivalStreak[res.winner]++;
      session.survivalStreak[1 - res.winner] = 0;
      session.survivalStreakBest[res.winner] = Math.max(session.survivalStreakBest[res.winner], session.survivalStreak[res.winner]);
    } else {
      session.survivalStreak = [0, 0];
    }
  }
  const gained = session.addResult(gameId, res, info.mult || 1);
  info.before = before;
  info.livesBefore = livesBefore;
  info.gained = gained;
  const action = await app.ui.ask(resultsScreen, { session, res, rec, info });
  app.runner.close();
  return action !== 'quit';
}

async function finishCompetition(app, session, rematch) {
  app.stats.recordCompetition(session);
  app.achievements.evaluate({ type: 'competition', session });
  app.accounts.applyCompetition(session);
  app.audio.playMusic('champion');
  const action = await app.ui.ask(championScreen, { session });
  if (action === 'rematch') return rematch();
  app.ui.goMenu();
}

// ------------------------------------------------------------------- DUEL MODE
export async function runDuel(app, cfg) {
  const session = new Session('duel', cfg, snapshotPlayers(app));
  session.queue = buildQueue(cfg);
  const n = session.queue.length;
  await app.ui.ask(vsScreen, { session, title: 'DUEL MODE', sub: `${n} minijuegos · ${DIFFS[cfg.difficulty].label}${cfg.events ? ' · Eventos especiales' : ''}` });
  for (let i = 0; i < n; i++) {
    const ok = await playOne(app, session, session.queue[i], {
      index: i, total: n, label: `MINIJUEGO ${i + 1} / ${n}`, next: session.queue[i + 1] || null, music: i === n - 1 ? 'tension' : 'game',
    });
    if (!ok) return app.ui.goMenu();
  }
  if (session.winner === -1 && cfg.tiebreak !== false) {
    session.tiebreak = true;
    const pool = ['reaction', 'pong', 'target', 'platform', 'arena'].filter((id) => GAME_BY_ID[id]);
    const gid = choice(pool.length ? pool : GAMES.map((G) => G.meta.id));
    const ok = await playOne(app, session, gid, { index: n, total: n, label: 'DESEMPATE · MUERTE SÚBITA', event: null, music: 'tension', tiebreak: true });
    if (!ok) return app.ui.goMenu();
  }
  return finishCompetition(app, session, () => runDuel(app, cfg));
}

// ------------------------------------------------------------------- TOURNAMENT
export async function runTournament(app, cfg) {
  const session = new Session('tournament', cfg, snapshotPlayers(app));
  const ids = GAMES.map((G) => G.meta.id);
  let bag = shuffle(ids);
  for (let r = 0; r < cfg.rounds; r++) {
    const games = [];
    for (let k = 0; k < 2; k++) {
      if (!bag.length) bag = shuffle(ids);
      games.push(bag.pop());
    }
    const final = r === cfg.rounds - 1;
    session.rounds.push({ games, final, name: final ? 'GRAN FINAL' : `RONDA ${r + 1}`, points: [0, 0], done: false });
  }
  session.currentRound = 0;
  await app.ui.ask(standingsScreen, { session, phase: 'intro' });
  await app.ui.ask(vsScreen, { session, title: 'TOURNAMENT', sub: `${cfg.rounds} rondas · La gran final vale doble` });
  for (let r = 0; r < session.rounds.length; r++) {
    session.currentRound = r;
    const round = session.rounds[r];
    if (r > 0) {
      const a = await app.ui.ask(standingsScreen, { session, phase: 'round' });
      if (a === 'quit') return app.ui.goMenu();
    }
    for (let k = 0; k < round.games.length; k++) {
      const before = session.points.slice();
      const ok = await playOne(app, session, round.games[k], {
        index: k, total: round.games.length, label: `${round.name} · JUEGO ${k + 1}/2${round.final ? ' · PUNTOS x2' : ''}`,
        mult: round.final ? 2 : 1, music: round.final ? 'tension' : 'game',
        next: round.games[k + 1] || session.rounds[r + 1]?.games[0] || null,
      });
      if (!ok) return app.ui.goMenu();
      round.points[0] += session.points[0] - before[0];
      round.points[1] += session.points[1] - before[1];
    }
    round.done = true;
    if (round.points[0] !== round.points[1]) {
      round.bonus = round.points[0] > round.points[1] ? 0 : 1;
      session.addBonus(round.bonus, 1);
    } else round.bonus = -1;
  }
  if (session.winner === -1) {
    session.tiebreak = true;
    const ok = await playOne(app, session, choice(['reaction', 'pong', 'target']), { label: 'DESEMPATE · MUERTE SÚBITA', event: null, music: 'tension' });
    if (!ok) return app.ui.goMenu();
  }
  session.currentRound = session.rounds.length;
  await app.ui.ask(standingsScreen, { session, phase: 'final' });
  return finishCompetition(app, session, () => runTournament(app, cfg));
}

// ------------------------------------------------------------------- SURVIVAL
export async function runSurvival(app, cfg) {
  const session = new Session('survival', cfg, snapshotPlayers(app));
  const base = DIFFS[cfg.difficulty].v;
  await app.ui.ask(vsScreen, { session, title: 'SURVIVAL', sub: `${cfg.lives} vidas cada uno · la dificultad sube en cada etapa` });
  const ids = GAMES.map((G) => G.meta.id);
  let bag = [];
  let last = null;
  while (session.lives[0] > 0 && session.lives[1] > 0) {
    session.stage++;
    if (!bag.length) bag = shuffle(ids).filter((id) => id !== last);
    const gid = bag.pop();
    last = gid;
    const diff = Math.min(1.7, base + (session.stage - 1) * 0.1);
    const ok = await playOne(app, session, gid, {
      label: `SURVIVAL · ETAPA ${session.stage}`, difficulty: diff, music: session.stage >= 6 ? 'tension' : 'game',
      eventChance: Math.min(0.85, 0.25 + session.stage * 0.07), survival: true,
    });
    if (!ok) return app.ui.goMenu();
    app.achievements.evaluate({ type: 'survivalStage', stage: session.stage, session });
  }
  return finishCompetition(app, session, () => runSurvival(app, cfg));
}

// ------------------------------------------------------------------- QUICK PLAY
export async function runQuick(app, gameId, cfg) {
  for (;;) {
    let res;
    const meta = GAME_BY_ID[gameId].meta;
    const event = cfg.event === 'random' ? pickEvent(meta, 1) : cfg.event || null;
    try {
      res = await app.runner.play(gameId, {
        players: snapshotPlayers(app),
        difficulty: DIFFS[cfg.difficulty || 'normal'].v,
        event,
        options: app.save.gameOptions[gameId] || {},
        label: 'QUICK PLAY',
        mode: 'quick',
      });
    } catch (e) {
      if (e && e.cancelled) {
        app.audio.playMusic('menu');
        app.ui.show(quickPlayScreen, { selected: gameId });
        return;
      }
      throw e;
    }
    const rec = app.stats.recordMinigame(res, 'quick');
    Object.assign(rec, app.accounts.applyMinigame(res));
    app.achievements.evaluate({ type: 'minigame', res });
    app.accounts.flush(res.players);
    if (res.players.some((pl) => pl.accountId)) {
      app.accounts.addFeed({ mode: 'quick', title: GAME_BY_ID[gameId].meta.name, players: res.players, winner: res.winner, score: res.display, detail: res.scoreLabel });
    }
    const action = await app.ui.ask(resultsScreen, { session: null, res, rec, info: { quick: true } });
    app.runner.close();
    if (action === 'rematch') continue;
    app.audio.playMusic('menu');
    if (action === 'other') app.ui.show(quickPlayScreen, { selected: gameId });
    else app.ui.goMenu();
    return;
  }
}

// Modos de UN JUGADOR contra bots:
//  · VS BOT: un minijuego contra un bot (Fácil, Normal, Difícil o Experto). Da XP y PIES reducidos (servidor), nunca ELO.
//  · ESCALERA (Singleplayer): los 16 minijuegos seguidos, con bots cada vez más difíciles y 3 vidas.
//    Récord de etapa y tiempo, e historial propio (no se mezcla con las estadísticas competitivas).
//  · PRÁCTICA: cualquier minijuego, con un muñeco quieto o un bot; no da recompensas ni cuenta para nada.
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS } from './bots.js';
import { resultsScreen } from '../ui/results.js';
import { h, icon } from '../ui/dom.js';
import { shuffle } from './utils.js';

const BOT_CHARS = ['volt', 'mochi', 'pico', 'brik'];

export function botProfile(app, level) {
  const L = BOT_LEVELS[level] || { name: 'Práctica', color: '#8C96B8' };
  const me = app.profiles[0];
  const char = BOT_CHARS.filter((c) => c !== me.char)[Math.floor(Math.random() * 3)];
  return { name: level === 'idle' ? 'MUÑECO' : `BOT ${L.name.toUpperCase()}`, char, color: me.color?.toUpperCase() === L.color.toUpperCase() ? '#8C96B8' : L.color, acc: 'none', accountId: null, bot: level };
}
function players(app, level) {
  const p0 = { ...app.profiles[0], acc: app.profiles[0].acc && typeof app.profiles[0].acc === 'object' ? { ...app.profiles[0].acc } : app.profiles[0].acc };
  return [p0, botProfile(app, level)];
}
function remember(app, entry) {
  const S = app.save.solo;
  S.history.unshift({ at: Date.now(), ...entry });
  S.history.length = Math.min(S.history.length, 30);
  app.persist();
}

async function playVsBot(app, gameId, level, { label, practice = false, solo = false } = {}) {
  return app.runner.play(gameId, {
    players: players(app, level),
    difficulty: 0.5,
    caos: false,
    event: null,
    options: app.save.gameOptions[gameId] || {},
    label,
    mode: practice ? 'practice' : 'bot',
    bot: level,
    solo,
  });
}

// ------------------------------------------------------------------- DESAFÍOS EN SOLITARIO (sin rival)
// Cada minijuego tiene una meta con 1, 2 y 3 estrellas según tu récord personal en esa partida.
// [mejor = 'higher' | 'lower', umbrales ★, ★★, ★★★, texto de la meta]
export const SOLO_GOALS = {
  reaction: ['lower', [350, 280, 220], 'Reaccioná lo más rápido posible (mejor tiempo)'],
  race: ['lower', [26, 22, 19], 'Contrarreloj: tu mejor vuelta'],
  hoop: ['higher', [15, 28, 40], 'Encestá todo lo que puedas'],
  target: ['higher', [500, 1000, 1600], 'Puntería: sumá puntos sin tocar bombas'],
  beat: ['higher', [40000, 80000, 120000], 'Seguí el ritmo de toda la canción'],
  fish: ['higher', [120, 220, 320], 'Pescá lo más valioso antes de que termine el tiempo'],
  blocks: ['higher', [3000, 8000, 15000], 'Maratón de bloques: hacé la mayor cantidad de puntos'],
  tower: ['higher', [50, 100, 150], 'Subí lo más alto posible (la cima son 150 m)'],
  color: ['higher', [35, 55, 75], 'Pintá la mayor parte del tablero'],
  sneak: ['higher', [10, 18, 26], 'Juntá cristales en el laberinto'],
  blast: ['higher', [30, 50, 70], 'Sobreviví a la zona de explosiones'],
};
export const soloStars = (gid, v) => {
  const G = SOLO_GOALS[gid];
  if (!G || v == null) return 0;
  return G[1].filter((t) => (G[0] === 'lower' ? v <= t : v >= t)).length;
};
/** Minijuego del desafío del día (igual para todos). */
export function dailySolo() {
  const ids = Object.keys(SOLO_GOALS);
  const day = Math.floor(Date.now() / 86400000);
  return ids[(day * 7 + 3) % ids.length];
}

export async function runSolo(app, gameId, back) {
  const S = app.save.solo;
  S.solo ||= {};
  for (;;) {
    let res;
    try {
      res = await playVsBot(app, gameId, 'idle', { label: 'DESAFÍO SOLO', practice: true, solo: true });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); return back(); }
      throw e;
    }
    const meta = GAME_BY_ID[gameId].meta;
    const v = typeof res.records?.[0] === 'number' ? res.records[0] : null;
    const G = SOLO_GOALS[gameId];
    const prev = S.solo[gameId] || { best: null, stars: 0, plays: 0 };
    const better = v != null && (prev.best == null || (G[0] === 'lower' ? v < prev.best : v > prev.best));
    const stars = soloStars(gameId, v);
    const rec = { ...prev, plays: prev.plays + 1, best: better ? v : prev.best, stars: Math.max(prev.stars, stars) };
    const daily = dailySolo() === gameId && stars >= 3 ? new Date().toISOString().slice(0, 10) : null;
    if (daily) rec.daily = daily;
    S.solo[gameId] = rec;
    app.persist();
    const fmt = (x) => (x == null ? '—' : meta.record?.format ? meta.record.format(x) : String(x));
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: null },
      info: {
        quick: true,
        practice: true,
        label: 'DESAFÍO SOLO',
        actions: (choose) => h('div.res-actions',
          h('div.solo-result',
            h('span.sr-stars', [1, 2, 3].map((i) => h('i' + (i <= stars ? '.on' : ''), '★'))),
            h('span', `${fmt(v)}${better ? ' · ¡NUEVO RÉCORD PERSONAL!' : prev.best != null ? ` · récord: ${fmt(prev.best)}` : ''}`)),
          h('button.btn', { nav: true, onclick: () => choose('menu') }, 'VOLVER'),
          h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), 'OTRA VEZ')),
      },
    });
    app.runner.close();
    if (action === 'rematch') continue;
    app.audio.playMusic('menu');
    return back();
  }
}

// ------------------------------------------------------------------- VS BOT
export async function runVsBot(app, gameId, level, back) {
  for (;;) {
    let res;
    try {
      res = await playVsBot(app, gameId, level, { label: `VS BOT · ${BOT_LEVELS[level].name.toUpperCase()}` });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); return back(); }
      throw e;
    }
    const S = app.save.solo;
    const k = `${gameId}:${level}`;
    const v = (S.vs[k] ||= { w: 0, l: 0, d: 0 });
    v[res.winner === 0 ? 'w' : res.winner === 1 ? 'l' : 'd']++;
    remember(app, { kind: 'vs', game: gameId, level, res: res.winner, display: res.display });
    const rec = { newRecords: [false, false], server: app.accounts.submitMatch(res, { mode: 'bot', bot: level }) };
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec,
      info: {
        quick: true,
        label: `VS BOT ${BOT_LEVELS[level].name.toUpperCase()}`,
        actions: (choose) => h('div.res-actions',
          h('button.btn', { nav: true, onclick: () => choose('menu') }, 'VOLVER'),
          h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), 'REVANCHA')),
      },
    });
    app.runner.close();
    if (action === 'rematch') continue;
    app.audio.playMusic('menu');
    return back();
  }
}

// ------------------------------------------------------------------- PRÁCTICA
export async function runPractice(app, gameId, level, back) {
  for (;;) {
    let res;
    try {
      res = await playVsBot(app, gameId, level, { label: 'PRÁCTICA · NO CUENTA', practice: true });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); return back(); }
      throw e;
    }
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: null },
      info: {
        quick: true,
        practice: true,
        label: 'PRÁCTICA',
        actions: (choose) => h('div.res-actions',
          h('span.muted.small', { style: { alignSelf: 'center' } }, 'Práctica: no da recompensas ni cuenta en estadísticas.'),
          h('button.btn', { nav: true, onclick: () => choose('menu') }, 'VOLVER'),
          h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), 'OTRA VEZ')),
      },
    });
    app.runner.close();
    if (action === 'rematch') continue;
    app.audio.playMusic('menu');
    return back();
  }
}

// ------------------------------------------------------------------- ESCALERA (SINGLEPLAYER)
export const LADDER_LEVEL = (stage) => (stage < 4 ? 'easy' : stage < 8 ? 'normal' : stage < 12 ? 'hard' : 'expert');

export async function runLadder(app, back) {
  const order = shuffle(GAMES.map((G) => G.meta.id));
  const run = { stage: 0, lives: 3, t0: Date.now(), results: [] };
  const S = app.save.solo;
  S.runs++;
  app.persist();
  while (run.stage < order.length && run.lives > 0) {
    const gid = order[run.stage];
    const level = LADDER_LEVEL(run.stage);
    let res;
    try {
      res = await playVsBot(app, gid, level, { label: `ESCALERA · ETAPA ${run.stage + 1}/16 · ${'♥'.repeat(run.lives)}` });
    } catch (e) {
      if (e?.cancelled) break;
      throw e;
    }
    const srv = app.accounts.submitMatch(res, { mode: 'bot', bot: level });
    run.results.push({ game: gid, level, res: res.winner });
    let msg;
    if (res.winner === 0) { run.stage++; msg = run.stage >= order.length ? '¡ESCALERA COMPLETA!' : `¡ETAPA SUPERADA! Sigue: ${GAME_BY_ID[order[run.stage]].meta.name}`; }
    else if (res.winner === 1) { run.lives--; msg = run.lives > 0 ? `Perdiste una vida · quedan ${run.lives}. Se repite la etapa.` : 'Sin vidas: fin de la escalera.'; }
    else msg = 'Empate: se repite la etapa sin perder vida.';
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: srv },
      info: {
        quick: true,
        label: `ESCALERA · ETAPA ${Math.min(16, run.stage + (res.winner === 0 ? 0 : 1))}/16`,
        actions: (choose) => h('div.res-actions',
          h('span.ladder-msg', msg),
          run.lives > 0 && run.stage < order.length
            ? [h('button.btn.ghost', { nav: true, onclick: () => choose('quit') }, 'TERMINAR'),
              h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => choose('continue') }, icon('play'), 'SEGUIR')]
            : h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => choose('quit') }, 'VER RESULTADO')),
      },
    });
    app.runner.close();
    if (action !== 'continue') break;
  }
  const secs = Math.round((Date.now() - run.t0) / 1000);
  const done = run.stage;
  const record = done > S.best || (done === S.best && done > 0 && (!S.bestTime || secs < S.bestTime));
  if (record) { S.best = done; S.bestTime = secs; }
  if (done >= 16) S.wins++;
  remember(app, { kind: 'ladder', stage: done, secs, lives: run.lives, record });
  app.audio.playMusic('menu');
  back({ ladderEnd: { stage: done, secs, record, complete: done >= 16 } });
}

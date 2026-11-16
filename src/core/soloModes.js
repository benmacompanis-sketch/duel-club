// Modos de UN JUGADOR contra bots:
//  · VS BOT: un minijuego contra un bot (Fácil, Normal, Difícil o Experto). Da XP y PIES reducidos (servidor), nunca ELO.
//  · ESCALERA (Singleplayer): los 16 minijuegos seguidos, con bots cada vez más difíciles y 3 vidas.
//    Récord de etapa y tiempo, e historial propio (no se mezcla con las estadísticas competitivas).
//  · PRÁCTICA: cualquier minijuego, con un muñeco quieto o un bot; no da recompensas ni cuenta para nada.
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { BOT_LEVELS } from './bots.js';
import { resultsScreen } from '../ui/results.js';
import { h, icon } from '../ui/dom.js';
import { shuffle, mulberry32 } from './utils.js';
import { DIFFS } from './tournamentManager.js';
import { SP_GAMES, ENDLESS, GHOST_GAMES, spStars } from '../data/spModes.js';
import { EVENTS } from './events.js';
import { CHAR_BY_ID } from './characters.js';
import { PUZZLE_BY_ID } from '../data/puzzles.js';
import { STORY_BY_ID, STORY_REWARD } from '../data/story.js';
import { storyScene } from '../ui/storyScene.js';

const BOT_CHARS = ['volt', 'mochi', 'pico', 'brik'];

export function botProfile(app, level) {
  const L = BOT_LEVELS[level] || { name: 'Práctica', color: '#8C96B8' };
  const me = app.profiles[0];
  const char = BOT_CHARS.filter((c) => c !== me.char)[Math.floor(Math.random() * 3)];
  return { name: level === 'idle' ? 'MUÑECO' : `BOT ${L.name.toUpperCase()}`, char, color: me.color?.toUpperCase() === L.color.toUpperCase() ? '#8C96B8' : L.color, acc: 'none', accountId: null, bot: level };
}
/** Rival con nombre y personaje propio (Historia). */
export function rivalProfile(app, rival) {
  const c = CHAR_BY_ID[rival.char] || CHAR_BY_ID.volt;
  const col = c.accent?.toUpperCase() === app.profiles[0].color?.toUpperCase() ? c.accent2 : c.accent;
  return { name: c.name.toUpperCase(), char: c.id, color: col, acc: 'none', accountId: null, bot: rival.level };
}
function players(app, level, solo = false, rival = null) {
  const p0 = { ...app.profiles[0], acc: app.profiles[0].acc && typeof app.profiles[0].acc === 'object' ? { ...app.profiles[0].acc } : app.profiles[0].acc };
  // modo solo: el otro lugar queda vacío (no se dibuja ningún rival)
  const p1 = solo ? { name: '', char: '__none', color: '#2A2440', acc: 'none', accountId: null, bot: 'idle', hidden: true } : rival ? rivalProfile(app, rival) : botProfile(app, level);
  return [p0, p1];
}
function remember(app, entry) {
  const S = app.save.solo;
  S.history.unshift({ at: Date.now(), ...entry });
  S.history.length = Math.min(S.history.length, 30);
  app.persist();
}

async function playVsBot(app, gameId, level, { label, practice = false, solo = false, event = null, diff = 'normal', seed = null, ghost = null, ghostRec = false, goal, rule = null, options = null, rival = null } = {}) {
  return app.runner.play(gameId, {
    players: players(app, level, solo, rival),
    rule,
    difficulty: DIFFS[diff]?.v ?? 0.5,
    caos: !!DIFFS[diff]?.caos,
    event,
    seed,
    ghost,
    ghostRec,
    ghostLower: SP_GAMES[gameId]?.[0] === 'lower',
    options: options || (seed != null ? {} : app.save.gameOptions[gameId] || {}),
    label,
    mode: practice ? 'practice' : 'bot',
    bot: level,
    solo,
    goal: goal || (solo && SOLO_GOALS[gameId] ? `Meta: ${SOLO_GOALS[gameId][2]}` : undefined),
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

// ------------------------------------------------------------------- DAILY CHAOS y WEEKLY CHALLENGE
const fmtVal = (gameId, v) => (v == null ? '—' : GAME_BY_ID[gameId].meta.record?.format ? GAME_BY_ID[gameId].meta.record.format(v) : String(Math.round(v * 10) / 10));
const evName = (id) => (id ? EVENTS[id]?.short || id : 'Sin modificador');

/** Juega el desafío del día o de la semana (spec viene del servidor: mismo minijuego, modificador y semilla para todos). */
export async function runSpChallenge(app, kind, spec, back) {
  const meta = GAME_BY_ID[spec.game].meta;
  for (;;) {
    let res;
    try {
      res = await playVsBot(app, spec.game, 'idle', {
        label: kind === 'daily' ? 'DAILY CHAOS' : 'WEEKLY CHALLENGE', practice: true, solo: true,
        event: spec.event, diff: spec.diff, seed: spec.seed,
        goal: `Meta: ★ ${fmtVal(spec.game, spec.goals[0])} · ★★ ${fmtVal(spec.game, spec.goals[1])} · ★★★ ${fmtVal(spec.game, spec.goals[2])}`,
      });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); return back(); }
      throw e;
    }
    const v = typeof res.records?.[0] === 'number' ? res.records[0] : null;
    const stars = spStars(spec.game, spec.goals, v);
    let srv = null, err = null;
    if (app.accounts.slotAccount(0) && v != null) {
      try { srv = await app.accounts.spSubmit(kind, spec.key, spec.game, v, { secs: Math.round(res.playSeconds || 0) }); } catch (e) { err = e; }
    }
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: null },
      info: {
        quick: true, practice: true, label: kind === 'daily' ? 'DAILY CHAOS' : 'WEEKLY CHALLENGE',
        actions: (choose) => h('div.res-actions',
          h('div.solo-result',
            kind === 'daily' ? h('span.sr-stars', [1, 2, 3].map((i) => h('i' + (i <= stars ? '.on' : ''), '★'))) : null,
            h('span', `${fmtVal(spec.game, v)}${srv?.improved ? ' · ¡NUEVO RÉCORD PERSONAL!' : srv ? ` · récord: ${fmtVal(spec.game, srv.best)}` : ''}`),
            srv ? h('span.muted', `Puesto ${srv.rank}${srv.xp ? ` · +${srv.xp} XP` : ''}${srv.pies ? ` · +${srv.pies} PIES` : ''}${srv.status === 'review' ? ' · en revisión' : ''}`)
              : h('span.muted', app.accounts.slotAccount(0) ? (err ? 'No se pudo guardar el resultado.' : '') : 'Como invitado no entrás al ranking.')),
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

// ------------------------------------------------------------------- ENDLESS CLUB
export async function runEndless(app, back) {
  const seed = (Date.now() & 0x7fffffff) >>> 0;
  const rng = mulberry32(seed);
  const ids = Object.keys(SP_GAMES);
  let bag = [];
  const run = { stage: 0, lives: ENDLESS.lives, score: 0, mult: 1, t0: Date.now(), games: [] };
  for (;;) {
    if (!bag.length) bag = shuffle(ids, rng);
    const gid = bag.shift();
    const stage = run.stage + 1;
    const goal = ENDLESS.goal(gid, stage);
    const event = ENDLESS.event(gid, stage, rng);
    const lower = SP_GAMES[gid][0] === 'lower';
    let res;
    try {
      res = await playVsBot(app, gid, 'idle', {
        label: `ENDLESS CLUB · ETAPA ${stage} · ${'♥'.repeat(run.lives)} · x${run.mult.toFixed(2)}`, practice: true, solo: true, event,
        goal: `Meta de la etapa: ${lower ? 'menos de' : 'al menos'} ${fmtVal(gid, goal)}`,
      });
    } catch (e) {
      if (e?.cancelled) break;
      throw e;
    }
    const v = typeof res.records?.[0] === 'number' ? res.records[0] : null;
    const passed = v != null && (lower ? v <= goal : v >= goal);
    let msg;
    if (passed) {
      run.stage = stage;
      const pts = Math.round(100 * run.mult);
      run.score += pts;
      run.mult = Math.min(3, run.mult + 0.25);
      msg = `¡ETAPA ${stage} SUPERADA! +${pts} puntos · multiplicador x${run.mult.toFixed(2)}`;
    } else {
      run.lives--;
      run.mult = 1;
      msg = run.lives > 0 ? `No llegaste a la meta: perdés una vida (quedan ${run.lives}).` : 'Sin vidas: fin de la maratón.';
    }
    run.games.push(gid);
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: null },
      info: {
        quick: true, practice: true, label: `ENDLESS CLUB · ETAPA ${stage}`,
        actions: (choose) => h('div.res-actions',
          h('span.ladder-msg', msg, h('br'), `Puntos: ${run.score} · Etapas superadas: ${run.stage}`),
          run.lives > 0
            ? [h('button.btn.ghost', { nav: true, onclick: () => choose('quit') }, 'TERMINAR'), h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => choose('continue') }, icon('play'), 'SEGUIR')]
            : h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => choose('quit') }, 'VER RESULTADO')),
      },
    });
    app.runner.close();
    if (action !== 'continue' || run.lives <= 0) break;
  }
  const secs = Math.round((Date.now() - run.t0) / 1000);
  let srv = null;
  if (app.accounts.slotAccount(0) && run.stage > 0) {
    try { srv = await app.accounts.spSubmit('endless', 'all', null, run.score, { stages: run.stage, secs }); } catch {}
  }
  const S = app.save.solo;
  S.endless ||= { best: 0, stage: 0, runs: 0 };
  S.endless.runs++;
  const record = run.score > S.endless.best;
  if (record) { S.endless.best = run.score; S.endless.stage = run.stage; }
  app.persist();
  app.audio.playMusic('menu');
  back({ endlessEnd: { ...run, secs, record, srv } });
}

// ------------------------------------------------------------------- GHOST RUN
export async function runGhost(app, gameId, ghost, back) {
  const meta = GAME_BY_ID[gameId].meta;
  const lower = SP_GAMES[gameId][0] === 'lower';
  for (;;) {
    let res;
    try {
      res = await playVsBot(app, gameId, 'idle', {
        label: 'GHOST RUN', practice: true, solo: true, ghost: ghost?.data || null, ghostRec: true,
        goal: ghost ? `Superá a tu fantasma: ${fmtVal(gameId, ghost.value)}` : 'Primera vuelta: grabá tu fantasma.',
      });
    } catch (e) {
      if (e?.cancelled) { app.audio.playMusic('menu'); return back(); }
      throw e;
    }
    const v = typeof res.records?.[0] === 'number' ? res.records[0] : null;
    const data = app.runner.takeGhost();
    const beat = ghost && v != null && (lower ? v < ghost.value : v > ghost.value);
    let srv = null;
    const local = (app.save.solo.ghosts ||= {});
    if (v != null && data) {
      const prev = local[gameId];
      if (!prev || (lower ? v < prev.value : v > prev.value)) local[gameId] = { label: 'best', value: v, data };
      local[gameId + ':last'] = { label: 'last', value: v, data };
      app.persist();
      if (app.accounts.slotAccount(0)) {
        try {
          await app.accounts.ghostSave(gameId, v, data);
          srv = await app.accounts.spSubmit('ghost', gameId, gameId, v, { secs: Math.round(res.playSeconds || 0) });
        } catch {}
      }
    }
    const action = await app.ui.ask(resultsScreen, {
      session: null, res, rec: { newRecords: [false, false], server: null },
      info: {
        quick: true, practice: true, label: 'GHOST RUN',
        actions: (choose) => h('div.res-actions',
          h('div.solo-result',
            h('b', ghost ? (beat ? '¡LE GANASTE A TU FANTASMA!' : 'EL FANTASMA GANÓ ESTA VEZ') : '¡FANTASMA GRABADO!'),
            h('span', `Vos: ${fmtVal(gameId, v)}${ghost ? ` · Fantasma: ${fmtVal(gameId, ghost.value)}` : ''}`),
            srv?.xp ? h('span.muted', `+${srv.xp} XP · +${srv.pies} PIES`) : null),
          h('button.btn', { nav: true, onclick: () => choose('menu') }, 'VOLVER'),
          h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), 'CONTRA EL MEJOR')),
      },
    });
    app.runner.close();
    if (action === 'rematch') { ghost = local[gameId] || ghost; continue; }
    app.audio.playMusic('menu');
    return back();
  }
}
export { GHOST_GAMES, evName, fmtVal };

// ------------------------------------------------------------------- PUZZLE CLUB e HISTORIA
/** Juega una partida con regla especial y muestra el resultado (reintentar / volver / seguir). */
async function playRuled(app, cfg, { label, nextLabel = null }) {
  const solo = !cfg.rival && (!cfg.opp || cfg.opp === 'idle');
  let res;
  try {
    res = await playVsBot(app, cfg.game, cfg.rival?.level || cfg.opp || 'idle', {
      label, practice: true, solo, event: cfg.event || null, diff: cfg.diff || 'normal', seed: cfg.seed ?? null,
      goal: cfg.goal, rule: cfg.rule(), options: cfg.options || {}, rival: cfg.rival || null,
    });
  } catch (e) {
    if (e?.cancelled) return { action: 'menu', ok: false };
    throw e;
  }
  const ok = !!res.rule?.win;
  const action = await app.ui.ask(resultsScreen, {
    session: null, res, rec: { newRecords: [false, false], server: null },
    info: {
      quick: true, practice: true, label,
      actions: (choose) => h('div.res-actions',
        h('div.solo-result.rule-' + (ok ? 'ok' : 'fail'), h('b', ok ? '¡LOGRADO!' : 'CASI…'), h('span', res.rule?.text || '')),
        h('button.btn', { nav: true, onclick: () => choose('menu') }, 'VOLVER'),
        ok && nextLabel ? h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('next') }, icon('play'), nextLabel)
          : h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), ok ? 'OTRA VEZ' : 'REINTENTAR')),
    },
  });
  app.runner.close();
  return { action, ok, secs: Math.round(res.playSeconds || 0) };
}

export async function runPuzzle(app, id, back) {
  const pz = PUZZLE_BY_ID[id];
  const S = app.save.solo;
  S.puzzles ||= {};
  for (;;) {
    const r = await playRuled(app, pz, { label: 'PUZZLE CLUB' });
    const rec = (S.puzzles[id] ||= { done: false, tries: 0 });
    rec.tries++;
    let srv = null;
    if (r.ok) {
      const first = !rec.done;
      rec.done = true;
      rec.at ||= Date.now();
      if (app.accounts.slotAccount(0)) { try { srv = await app.accounts.puzzleClear(id, r.secs); } catch {} }
      if (srv?.xp) app.ui.toast({ kind: 'ok', title: 'PUZZLE RESUELTO', text: `+${srv.xp} XP · +${srv.pies} PIES` });
      else if (first) app.ui.toast({ kind: 'ok', title: 'PUZZLE RESUELTO', text: pz.name });
    }
    app.persist();
    if (r.action === 'rematch') continue;
    app.audio.playMusic('menu');
    return back();
  }
}

/** Progreso local de la historia: S.story[cap] = etapas superadas (0–4). */
export const storyDone = (app, ch) => app.save.solo.story?.[ch] || 0;

export async function runStory(app, chId, back) {
  const ch = STORY_BY_ID[chId];
  const S = app.save.solo;
  S.story ||= {};
  // capítulo terminado: se vuelve a jugar desde el principio (sin recompensas repetidas)
  let i = storyDone(app, chId) >= ch.stages.length ? 0 : storyDone(app, chId);
  if (i === 0) { if ((await app.ui.ask(storyScene, { ch, lines: ch.intro, kind: 'intro' })) !== 'go') return back(); }
  for (;;) {
    const st = ch.stages[i];
    if ((await app.ui.ask(storyScene, { ch, lines: st.say, kind: 'stage', stage: i })) !== 'go') { app.audio.playMusic('menu'); return back(); }
    let r;
    for (;;) {
      r = await playRuled(app, { ...st, seed: null }, { label: `${ch.title} · ${i + 1}/${ch.stages.length}`, nextLabel: i < ch.stages.length - 1 ? 'SIGUIENTE' : 'FINAL' });
      if (r.action !== 'rematch') break;
    }
    if (!r.ok) { app.audio.playMusic('menu'); return back(); }
    const first = storyDone(app, chId) <= i;
    if (first) S.story[chId] = i + 1;
    app.persist();
    let srv = null;
    if (first && app.accounts.slotAccount(0)) { try { srv = await app.accounts.storyClear(chId, i, r.secs); } catch {} }
    const last = i === ch.stages.length - 1;
    if (srv?.xp) app.ui.toast({ kind: 'ok', title: last ? '¡CAPÍTULO COMPLETO!' : 'ETAPA SUPERADA', text: `+${srv.xp} XP · +${srv.pies} PIES` });
    if (last) {
      if (first) await app.ui.ask(storyScene, { ch, lines: ch.outro, kind: 'outro', reward: STORY_REWARD.chapter });
      app.audio.playMusic('menu');
      return back();
    }
    if (r.action !== 'next') { app.audio.playMusic('menu'); return back(); }
    i++;
  }
}

// Modos de SINGLEPLAYER con contenido automático (sin tareas manuales):
//  · DAILY CHAOS: un minijuego + un modificador CAOS fijo + meta de 3 estrellas, igual para todos ese día.
//  · WEEKLY CHALLENGE: un desafío por semana (minijuego, dificultad, modificador, semilla) con ranking mundial.
//  · ENDLESS CLUB: maratón infinita de minijuegos con metas que suben, vidas y multiplicador.
//  · GHOST RUN: competí contra tu propio intento anterior (fantasma reproducido).
// El servidor elige el diario y el semanal con la fecha y una semilla propia (supabase/migrations/019).
// Esta tabla es la fuente de verdad: scripts/gen-sp.mjs la copia al servidor para validar metas y recompensas.

// Juegos con meta individual: [mejor, [★, ★★, ★★★], eventos CAOS compatibles para el diario]
export const SP_GAMES = {
  reaction: ['lower', [350, 280, 220], ['speed', 'obstacles']],
  race: ['lower', [26, 22, 19], ['speed', 'invert', 'obstacles']],
  hoop: ['higher', [15, 28, 40], ['lowgrav', 'short', 'double', 'invert']],
  target: ['higher', [500, 1000, 1600], ['speed', 'short', 'double', 'invert']],
  beat: ['higher', [40000, 80000, 120000], ['speed', 'double']],
  fish: ['higher', [120, 220, 320], ['speed', 'short', 'double', 'invert']],
  blocks: ['higher', [3000, 8000, 15000], ['speed', 'short', 'double']],
  tower: ['higher', [50, 100, 150], ['lowgrav', 'short', 'speed', 'invert']],
  color: ['higher', [35, 55, 75], ['speed', 'short', 'obstacles', 'invert']],
  sneak: ['higher', [10, 18, 26], ['speed', 'short', 'double', 'invert']],
  blast: ['higher', [30, 50, 70], ['speed', 'obstacles', 'invert']],
};
// cuánto cambia la meta con cada modificador (para que siga siendo posible)
export const EVENT_GOAL = { speed: 0.9, short: 0.65, double: 1.25, invert: 0.85, lowgrav: 1, obstacles: 0.9, mirror: 0.9 };
export const WEEKLY_DIFFS = ['normal', 'hard', 'caos'];
export const DIFF_GOAL = { normal: 1, hard: 0.9, caos: 0.85 };

/** Metas [★, ★★, ★★★] ajustadas por modificador y dificultad. */
export function spGoals(game, event = null, diff = 'normal') {
  const [dir, base] = SP_GAMES[game];
  const f = (EVENT_GOAL[event] ?? 1) * (DIFF_GOAL[diff] ?? 1);
  return base.map((v) => (dir === 'lower' ? Math.round((v / f) * 10) / 10 : Math.round(v * f)));
}
export const spStars = (game, goals, v) => {
  if (v == null) return 0;
  const dir = SP_GAMES[game][0];
  return goals.filter((t) => (dir === 'lower' ? v <= t : v >= t)).length;
};

// ENDLESS CLUB
export const ENDLESS = {
  lives: 3,
  // meta de cada etapa: ★ (etapas 1–3), ★★ (4–8), ★★★ (9+), después sube 4 % por etapa hasta un tope de +25 %
  goal(game, stage) {
    const [dir, base] = SP_GAMES[game];
    const tier = stage <= 3 ? 0 : stage <= 8 ? 1 : 2;
    const extra = Math.min(1.25, 1 + Math.max(0, stage - 9) * 0.04);
    return dir === 'lower' ? Math.round((base[tier] / extra) * 10) / 10 : Math.round(base[tier] * extra);
  },
  // modificador CAOS desde la etapa 5, cada dos etapas
  event(game, stage, rng) {
    if (stage < 5 || stage % 2 === 0) return null;
    const ev = SP_GAMES[game][2];
    return ev[Math.floor(rng() * ev.length)];
  },
};

// GHOST RUN: minijuegos con fantasma. pose = se ve el recorrido; score = comparación de puntaje en vivo
export const GHOST_GAMES = { race: 'pose', tower: 'pose', hoop: 'score', target: 'score', beat: 'score', fish: 'score', blocks: 'score' };

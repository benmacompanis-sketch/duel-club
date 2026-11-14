// Desafíos diarios y semanales. Cada día (00:00 UTC) se eligen 3 diarios y cada lunes 3 semanales,
// iguales para todos. El servidor cuenta el progreso con las partidas que registra (no el navegador).
// métricas: play (minijuegos jugados), win (ganados), online (online jugados), online_win, bot_win,
// game (jugados de un minijuego puntual), caos (jugados con CAOS), comp (competiciones terminadas)
export const CHALLENGES = [
  // diarios
  { id: 'd_play5', period: 'daily', metric: 'play', target: 5, xp: 60, pies: 30, label: 'Jugá 5 minijuegos' },
  { id: 'd_play10', period: 'daily', metric: 'play', target: 10, xp: 100, pies: 50, label: 'Jugá 10 minijuegos' },
  { id: 'd_win3', period: 'daily', metric: 'win', target: 3, xp: 80, pies: 40, label: 'Ganá 3 minijuegos' },
  { id: 'd_win5', period: 'daily', metric: 'win', target: 5, xp: 120, pies: 60, label: 'Ganá 5 minijuegos' },
  { id: 'd_online2', period: 'daily', metric: 'online', target: 2, xp: 90, pies: 45, label: 'Jugá 2 minijuegos online' },
  { id: 'd_bot3', period: 'daily', metric: 'bot_win', target: 3, xp: 70, pies: 35, label: 'Ganale 3 veces a un bot' },
  { id: 'd_caos2', period: 'daily', metric: 'caos', target: 2, xp: 70, pies: 35, label: 'Jugá 2 minijuegos con CAOS' },
  { id: 'd_comp1', period: 'daily', metric: 'comp', target: 1, xp: 80, pies: 40, label: 'Terminá una competición (Duelo, Torneo o serie online)' },
  { id: 'd_g_reaction', period: 'daily', metric: 'game', game: 'reaction', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Reaction Rush' },
  { id: 'd_g_pong', period: 'daily', metric: 'game', game: 'pong', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Pong Chaos' },
  { id: 'd_g_race', period: 'daily', metric: 'game', game: 'race', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Micro Race' },
  { id: 'd_g_tennis', period: 'daily', metric: 'game', game: 'tennis', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Turbo Tennis' },
  { id: 'd_g_target', period: 'daily', metric: 'game', game: 'target', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Target Panic' },
  { id: 'd_g_blast', period: 'daily', metric: 'game', game: 'blast', target: 2, xp: 60, pies: 30, label: 'Jugá 2 veces Blast Zone' },
  // semanales
  { id: 'w_play40', period: 'weekly', metric: 'play', target: 40, xp: 300, pies: 150, label: 'Jugá 40 minijuegos' },
  { id: 'w_win20', period: 'weekly', metric: 'win', target: 20, xp: 350, pies: 180, label: 'Ganá 20 minijuegos' },
  { id: 'w_online10', period: 'weekly', metric: 'online', target: 10, xp: 400, pies: 200, label: 'Jugá 10 minijuegos online' },
  { id: 'w_onwin5', period: 'weekly', metric: 'online_win', target: 5, xp: 450, pies: 220, label: 'Ganá 5 minijuegos online' },
  { id: 'w_bot15', period: 'weekly', metric: 'bot_win', target: 15, xp: 300, pies: 150, label: 'Ganale 15 veces a un bot' },
  { id: 'w_comp5', period: 'weekly', metric: 'comp', target: 5, xp: 350, pies: 180, label: 'Terminá 5 competiciones' },
  { id: 'w_caos10', period: 'weekly', metric: 'caos', target: 10, xp: 300, pies: 150, label: 'Jugá 10 minijuegos con CAOS' },
];
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

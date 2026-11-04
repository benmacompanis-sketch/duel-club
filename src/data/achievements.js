// Logros de DUEL CLUB. Las condiciones (cond) las evalúa el SERVIDOR (supabase/migrations/002_rpc.sql)
// con los datos guardados de la cuenta y la partida recién enviada; el navegador solo las usa para
// mostrar el progreso. Los ids de la versión anterior se conservan para no perder logros.
//
// Tipos de condición (t):
//  stat     {k, gte}            columna de la cuenta (wins, played, best_streak, comp_wins, tournaments,
//                               survival_best, best_rating, pies_spent, time_played, draws, draw_streak, loss_streak)
//  level    {gte}               nivel de KEKE
//  gwins    {g, gte}            victorias en un minijuego      gstreak {g, gte} mejor racha en un minijuego
//  grank    {g, gte}            rango de dominio en un minijuego (0..4)
//  ranks    {gte, count}        cantidad de minijuegos con rango >= gte
//  gameswon {count, set}        minijuegos distintos ganados (set: 'orig' = los 12 originales)
//  gamesplayed {count}          minijuegos distintos jugados
//  flag     {g?, k, op, v, win?, lose?}  dato de la partida recién jugada (op: lt, lte, eq, gte, gt)
//  comp     {mode?, win?, lose?, deficit_gte?, margin_gte?, margin_eq?, games_gte?, diff?}
//  diffwin  {d}                 ganar un minijuego en una dificultad
//  charwin  {c}                 ganar un minijuego usando un personaje
//  friends  {gte}  items {gte}  achs {gte}  buys {gte}  daily {gte}  rival {gte}  friendwin {}
import { GAME_IDS, GAME_NAMES, ITEM_BY_ID } from './catalog.js';

export const TIERS = {
  normal: { name: 'Normal', color: '#48D597', keke: 40, pies: 25 },
  hard: { name: 'Difícil', color: '#9B6CFF', keke: 100, pies: 60 },
  legendary: { name: 'Legendario', color: '#FFD16B', keke: 250, pies: 150 },
};

export const ACH_CATEGORIES = {
  general: 'Progreso', juegos: 'Minijuegos', competicion: 'Competición', resistencia: 'SUSI',
  social: 'Social', coleccion: 'Colección', dominio: 'Dominio', meme: 'Absurdos', secreto: 'Secretos',
};

const A = (id, cat, tier, name, desc, icon, cond, rewards = [], extra = {}) => ({ id, cat, tier, name, desc, icon, cond, rewards, secret: false, ...extra });

// ---------------------------------------------------------------- desafíos por minijuego (5 cada uno)
// [id del desafío de habilidad, nombre, descripción, ícono, condición, recompensas]
const SKILL = {
  reaction: ['lightning', 'Rayo humano', 'Reaccioná en menos de 200 ms en Reaction Rush.', 'bolt', { t: 'flag', g: 'reaction', k: 'best', op: 'lt', v: 200 }, ['acc_shades']],
  race: ['clean_race', 'Piloto impecable', 'Ganá Micro Race sin chocar ni una vez.', 'flag', { t: 'flag', g: 'race', k: 'crashes', op: 'eq', v: 0, win: true }, ['acc_helmet']],
  pong: ['shutout', 'Muro de acero', 'Ganá Pong Chaos sin recibir goles.', 'shield', { t: 'flag', g: 'pong', k: 'opp', op: 'eq', v: 0, win: true }, []],
  platform: ['last_standing', 'Pies firmes', 'Ganá Last Platform sin perder ninguna ronda.', 'boot', { t: 'flag', g: 'platform', k: 'opp', op: 'eq', v: 0, win: true }, []],
  hoop: ['sniper', 'Sin tocar aro', 'Encestá 3 tiros limpios en una partida de Hoop Master.', 'ball', { t: 'flag', g: 'hoop', k: 'swishes', op: 'gte', v: 3 }, []],
  memory: ['memory_master', 'Memoria fotográfica', 'Encontrá 4 parejas seguidas en un mismo turno de Memory War.', 'card', { t: 'flag', g: 'memory', k: 'bestRun', op: 'gte', v: 4 }, ['title_ultimo_cerebro']],
  color: ['painter', 'Picasso digital', 'Conquistá el 60% del tablero en Color Control.', 'brush', { t: 'flag', g: 'color', k: 'pct', op: 'gte', v: 60 }, []],
  arena: ['flawless', 'Intocable', 'Ganá una ronda de Duel Arena sin recibir daño.', 'fist', { t: 'flag', g: 'arena', k: 'flawless', op: 'gte', v: 1 }, []],
  target: ['target_combo', 'Ojo de halcón', 'Alcanzá un combo de 15 en Target Panic.', 'target', { t: 'flag', g: 'target', k: 'maxCombo', op: 'gte', v: 15 }, []],
  beat: ['beat_perfect', '¡PERFECT!', 'Conseguí un PERFECT en Beat Battle.', 'note', { t: 'flag', g: 'beat', k: 'perfects', op: 'gte', v: 1 }, ['acc_headphones']],
  fish: ['golden_fish', 'Pez dorado', 'Pescá el legendario pez dorado en Fish Frenzy.', 'fish', { t: 'flag', g: 'fish', k: 'golden', op: 'gte', v: 1 }, []],
  blocks: ['quad', 'Cuádruple', 'Completá 4 líneas de una vez en Block Battle.', 'blocks', { t: 'flag', g: 'blocks', k: 'quads', op: 'gte', v: 1 }, []],
  sneak: ['sneak_ghost', 'Sombra perfecta', 'Ganá Shadow Sneak sin que te atrapen ni una vez.', 'shield', { t: 'flag', g: 'sneak', k: 'caught', op: 'eq', v: 0, win: true }, ['hat_corona_hielo']],
  tennis: ['tennis_aces', 'Saque imposible', 'Hacé 3 aces en una partida de Turbo Tennis.', 'ball', { t: 'flag', g: 'tennis', k: 'aces', op: 'gte', v: 3 }, ['skin_glitch']],
  tower: ['tower_sky', 'Rascacielos', 'Subí 120 metros en una partida de Tower Climb.', 'arrow', { t: 'flag', g: 'tower', k: 'height', op: 'gte', v: 120 }, ['skin_cristal']],
  blast: ['blast_untouched', 'Ni un rasguño', 'Ganá Blast Zone sin perder ninguna vida.', 'bolt', { t: 'flag', g: 'blast', k: 'hitsTaken', op: 'eq', v: 0, win: true }, ['hat_pato']],
};
const GAME_ICON = { reaction: 'bolt', race: 'flag', pong: 'shield', platform: 'boot', hoop: 'ball', memory: 'card', color: 'brush', arena: 'fist', target: 'target', beat: 'note', fish: 'fish', blocks: 'blocks', sneak: 'shield', tennis: 'ball', tower: 'arrow', blast: 'bolt' };

const PER_GAME = GAME_IDS.flatMap((g) => {
  const n = GAME_NAMES[g];
  const [sid, sname, sdesc, sicon, scond, srew] = SKILL[g];
  return [
    A(g + '_debut', 'juegos', 'normal', `Debut en ${n}`, `Ganá tu primera partida de ${n}.`, GAME_ICON[g], { t: 'gwins', g, gte: 1 }, [], { game: g }),
    A(sid, 'juegos', 'hard', sname, sdesc, sicon, scond, srew, { game: g }),
    A(g + '_racha', 'juegos', 'normal', `Dominando ${n}`, `Ganá 3 partidas seguidas de ${n}.`, 'flame', { t: 'gstreak', g, gte: 3 }, [], { game: g }),
    A(g + '_15', 'juegos', 'hard', `Especialista en ${n}`, `Ganá 15 partidas de ${n}.`, 'medal', { t: 'gwins', g, gte: 15 }, [], { game: g }),
    A(g + '_maestro', 'dominio', 'legendary', `Maestro de ${n}`, `Llegá al rango Maestro en ${n}.`, 'crown', { t: 'grank', g, gte: 4 }, [], { game: g }),
  ];
});

const GENERAL = [
  // ---------------------------------------------------------------- progreso (ids heredados)
  A('first_win', 'general', 'normal', 'Primera victoria', 'Ganá tu primer minijuego.', 'trophy', { t: 'stat', k: 'wins', gte: 1 }, ['char_nimbus']),
  A('five_wins', 'general', 'normal', 'Cinco estrellas', 'Ganá 5 minijuegos.', 'star', { t: 'stat', k: 'wins', gte: 5 }, ['char_fang']),
  A('ten_wins', 'general', 'normal', 'Leyenda local', 'Ganá 10 minijuegos.', 'medal', { t: 'stat', k: 'wins', gte: 10 }),
  A('wins_25', 'general', 'normal', 'Ya es costumbre', 'Ganá 25 minijuegos.', 'medal', { t: 'stat', k: 'wins', gte: 25 }, ['emo_signo']),
  A('wins_50', 'general', 'hard', 'Medio centenar', 'Ganá 50 minijuegos.', 'medal', { t: 'stat', k: 'wins', gte: 50 }),
  A('wins_100', 'general', 'hard', 'Triple dígito', 'Ganá 100 minijuegos.', 'trophy', { t: 'stat', k: 'wins', gte: 100 }, ['card_diamante']),
  A('wins_250', 'general', 'legendary', 'Esto ya es un trabajo', 'Ganá 250 minijuegos.', 'crown', { t: 'stat', k: 'wins', gte: 250 }, ['skin_cosmico']),
  A('marathon', 'general', 'normal', 'Maratón', 'Jugá 25 minijuegos.', 'clock', { t: 'stat', k: 'played', gte: 25 }),
  A('played_100', 'general', 'normal', 'Cliente frecuente', 'Jugá 100 minijuegos.', 'clock', { t: 'stat', k: 'played', gte: 100 }, ['card_minimal']),
  A('played_500', 'general', 'hard', 'Socio vitalicio', 'Jugá 500 minijuegos.', 'clock', { t: 'stat', k: 'played', gte: 500 }, ['hat_cono']),
  A('streak3', 'general', 'hard', 'En racha', 'Ganá 3 minijuegos seguidos.', 'flame', { t: 'stat', k: 'best_streak', gte: 3 }, ['char_ozzy']),
  A('streak5', 'general', 'hard', 'Imparable', 'Ganá 5 minijuegos seguidos.', 'flame', { t: 'stat', k: 'best_streak', gte: 5 }),
  A('streak10', 'general', 'legendary', 'Sin manos', 'Ganá 10 minijuegos seguidos.', 'flame', { t: 'stat', k: 'best_streak', gte: 10 }, ['title_sin_manos']),
  A('by_a_hair', 'general', 'hard', 'Por un pelo', 'Ganá un minijuego por un solo punto de diferencia.', 'hair', { t: 'flag', k: 'margin', op: 'eq', v: 1, win: true }, ['acc_halo']),
  A('all_games', 'general', 'legendary', 'Todoterreno', 'Ganá cada uno de los 12 minijuegos clásicos al menos una vez.', 'crown', { t: 'gameswon', count: 12, set: 'orig' }, ['acc_crown']),
  A('all16', 'general', 'legendary', 'Señor de los píxeles', 'Ganá los 16 minijuegos al menos una vez.', 'crown', { t: 'gameswon', count: 16 }, ['title_pixeles']),
  A('played_all', 'general', 'normal', 'Turista arcade', 'Jugá los 16 minijuegos al menos una vez.', 'list', { t: 'gamesplayed', count: 16 }),
  A('beat_combo', 'juegos', 'hard', 'Groove infinito', 'Hacé un combo de 50 notas en Beat Battle.', 'note', { t: 'flag', g: 'beat', k: 'maxCombo', op: 'gte', v: 50 }, ['vic_pies'], { game: 'beat' }),
  A('react150', 'juegos', 'legendary', 'Profesional del botón', 'Reaccioná en menos de 150 ms en Reaction Rush.', 'bolt', { t: 'flag', g: 'reaction', k: 'best', op: 'lt', v: 150 }, ['title_boton'], { game: 'reaction' }),
  A('lvl_5', 'general', 'normal', 'Primeros pasos', 'Llegá al nivel 5.', 'star', { t: 'level', gte: 5 }),
  A('lvl_10', 'general', 'normal', 'Ya no sos novato', 'Llegá al nivel 10.', 'star', { t: 'level', gte: 10 }),
  A('lvl_20', 'general', 'hard', 'Élite del club', 'Llegá al nivel 20.', 'star', { t: 'level', gte: 20 }),
  A('lvl_30', 'general', 'hard', 'Leyenda del Club', 'Llegá al nivel 30.', 'crown', { t: 'level', gte: 30 }),
  A('lvl_50', 'general', 'legendary', 'Maestro Arcade', 'Llegá al nivel 50.', 'crown', { t: 'level', gte: 50 }),
  A('lvl_67', 'secreto', 'legendary', 'El Elegido', 'Llegaste al nivel 67. El número sagrado.', 'crown', { t: 'level', gte: 67 }, [], { secret: true }),
  A('lvl_100', 'general', 'legendary', 'Inmortal', 'Llegá al nivel 100.', 'crown', { t: 'level', gte: 100 }),
  A('time10h', 'meme', 'legendary', 'Demasiado tiempo libre', 'Acumulá 10 horas de juego.', 'clock', { t: 'stat', k: 'time_played', gte: 36000 }, ['title_tiempo_libre']),

  // ---------------------------------------------------------------- SUSI
  A('res_1100', 'resistencia', 'normal', 'Subiendo', 'Llegá a 1100 de SUSI.', 'arrow', { t: 'stat', k: 'best_rating', gte: 1100 }),
  A('res_1200', 'resistencia', 'hard', 'Avanzado', 'Llegá a 1200 de SUSI.', 'arrow', { t: 'stat', k: 'best_rating', gte: 1200 }),
  A('res_1400', 'resistencia', 'hard', 'Experto', 'Llegá a 1400 de SUSI.', 'shield', { t: 'stat', k: 'best_rating', gte: 1400 }, ['emo_necesidad']),
  A('res_1600', 'resistencia', 'legendary', 'Élite competitiva', 'Llegá a 1600 de SUSI.', 'shield', { t: 'stat', k: 'best_rating', gte: 1600 }),
  A('res_1800', 'resistencia', 'legendary', 'Maestro del SUSI', 'Llegá a 1800 de SUSI.', 'crown', { t: 'stat', k: 'best_rating', gte: 1800 }, ['frame_cosmico']),
  A('res_2000', 'resistencia', 'legendary', 'Gran Maestro', 'Llegá a 2000 de SUSI.', 'crown', { t: 'stat', k: 'best_rating', gte: 2000 }, ['emo_aura']),

  // ---------------------------------------------------------------- competición (ids heredados)
  A('champion', 'competicion', 'hard', 'Campeón del club', 'Ganá una competición en DUEL MODE.', 'trophy', { t: 'comp', mode: 'duel', win: true }, ['char_rex']),
  A('comeback', 'competicion', 'legendary', 'Remontada épica', 'Ganá una competición después de ir perdiendo por 6 puntos o más.', 'arrow', { t: 'comp', win: true, deficit_gte: 6 }, ['title_cine']),
  A('tournament_king', 'competicion', 'hard', 'Rey del torneo', 'Ganá un TOURNAMENT completo.', 'crown', { t: 'comp', mode: 'tournament', win: true }, ['acc_tophat']),
  A('survivor', 'competicion', 'hard', 'Superviviente', 'Llegá a la etapa 8 en SURVIVAL.', 'heart', { t: 'stat', k: 'survival_best', gte: 8 }, ['acc_horns']),
  A('survival_12', 'competicion', 'legendary', 'Inmortal de Survival', 'Llegá a la etapa 12 en SURVIVAL.', 'heart', { t: 'stat', k: 'survival_best', gte: 12 }),
  A('comp_5', 'competicion', 'normal', 'Competidor nato', 'Ganá 5 competiciones.', 'trophy', { t: 'stat', k: 'comp_wins', gte: 5 }),
  A('comp_25', 'competicion', 'hard', 'Coleccionista de copas', 'Ganá 25 competiciones.', 'trophy', { t: 'stat', k: 'comp_wins', gte: 25 }, ['card_caos']),
  A('tourn_3', 'competicion', 'hard', 'Tricampeón', 'Ganá 3 torneos.', 'crown', { t: 'stat', k: 'tournaments', gte: 3 }),
  A('duel_12', 'competicion', 'hard', 'Maratón de duelos', 'Ganá un DUEL MODE de 12 minijuegos.', 'duel', { t: 'comp', mode: 'duel', win: true, games_gte: 12 }, ['emo_cine']),
  A('duel_1pt', 'competicion', 'hard', 'Gané de casualidad', 'Ganá una competición por un solo punto.', 'hair', { t: 'comp', win: true, margin_eq: 1 }, ['title_casualidad']),
  A('ceo_desastre', 'meme', 'normal', 'CEO del desastre', 'Perdé una competición por 10 puntos o más. Liderazgo.', 'arrow', { t: 'comp', lose: true, margin_gte: 10 }, ['title_ceo_desastre']),
  A('caos_win', 'competicion', 'normal', 'No era tan difícil', 'Ganá un minijuego en dificultad CAOS.', 'bolt', { t: 'diffwin', d: 'caos' }, ['title_no_era_dificil']),
  A('caos_tourn', 'competicion', 'legendary', 'Arquitecto del caos', 'Ganá un TOURNAMENT en dificultad CAOS.', 'bolt', { t: 'comp', mode: 'tournament', win: true, diff: 'caos' }, ['title_arquitecto']),

  // ---------------------------------------------------------------- social
  A('friend_1', 'social', 'normal', 'Ya no jugás solo', 'Agregá a tu primer amigo.', 'user', { t: 'friends', gte: 1 }),
  A('friend_5', 'social', 'hard', 'Alma del club', 'Tené 5 amigos en el CLUB.', 'user', { t: 'friends', gte: 5 }, ['title_social']),
  A('friend_win', 'social', 'normal', 'Entre amigos', 'Ganale un minijuego a alguien de tu lista de amigos.', 'heart', { t: 'friendwin' }),
  A('rival_25', 'social', 'hard', 'El verdadero problema', 'Jugá 25 minijuegos contra la misma cuenta.', 'duel', { t: 'rival', gte: 25 }, ['title_verdadero_problema']),

  // ---------------------------------------------------------------- colección y PIE STORE
  A('buy_1', 'coleccion', 'normal', 'Primera compra', 'Comprá algo en la PIE STORE.', 'star', { t: 'buys', gte: 1 }),
  A('items_10', 'coleccion', 'normal', 'Placard lleno', 'Conseguí 10 objetos (sin contar los iniciales).', 'card', { t: 'items', gte: 10 }),
  A('items_30', 'coleccion', 'hard', 'El coleccionista', 'Conseguí 30 objetos.', 'card', { t: 'items', gte: 30 }, ['title_coleccionista']),
  A('items_60', 'coleccion', 'legendary', 'Museo personal', 'Conseguí 60 objetos.', 'crown', { t: 'items', gte: 60 }, ['card_silla']),
  A('spend_5000', 'coleccion', 'hard', 'Inversor de PIES', 'Gastá 5000 PIES en total.', 'star', { t: 'stat', k: 'pies_spent', gte: 5000 }, ['body_armadura_silla']),
  A('achs_25', 'coleccion', 'hard', 'Cazador de logros', 'Desbloqueá 25 logros.', 'trophy', { t: 'achs', gte: 25 }),
  A('achs_60', 'coleccion', 'legendary', 'Completista', 'Desbloqueá 60 logros.', 'trophy', { t: 'achs', gte: 60 }, ['emo_contrato']),

  // ---------------------------------------------------------------- dominio
  A('mast_1', 'dominio', 'hard', 'Primer dominio', 'Llegá al rango Maestro en cualquier minijuego.', 'crown', { t: 'ranks', gte: 4, count: 1 }, ['card_cosmica']),
  A('mast_exp4', 'dominio', 'hard', 'Multitalento', 'Llegá a Experto o más en 4 minijuegos.', 'star', { t: 'ranks', gte: 3, count: 4 }),
  A('mast_all', 'secreto', 'legendary', 'Leyenda del arcade', 'Rango Maestro en los 16 minijuegos.', 'crown', { t: 'ranks', gte: 4, count: 16 }, [], { secret: true }),

  // ---------------------------------------------------------------- absurdos y secretos
  A('draws3', 'secreto', 'hard', 'Empate eterno', 'Empatá 3 minijuegos seguidos. Nadie quiso hacerse cargo.', 'hair', { t: 'stat', k: 'draw_streak', gte: 3 }, ['emo_empate'], { secret: true }),
  A('silla', 'secreto', 'legendary', 'La silla te eligió', 'Acumulá 10 empates. La silla de plástico, símbolo universal de la neutralidad, ahora es tuya.', 'crown', { t: 'stat', k: 'draws', gte: 10 }, ['char_silla'], { secret: true }),
  A('lose5', 'secreto', 'normal', 'No me salió', 'Perdé 5 minijuegos seguidos. Pasa.', 'arrow', { t: 'stat', k: 'loss_streak', gte: 5 }, ['title_no_me_salio'], { secret: true }),
  A('payaso', 'secreto', 'normal', 'Función completa', 'Perdé un minijuego sin sumar ni un punto.', 'star', { t: 'flag', k: 'score', op: 'eq', v: 0, lose: true }, ['face_payaso'], { secret: true }),
  A('daily50', 'secreto', 'hard', 'Toque pasto', 'Jugá 50 minijuegos en un mismo día.', 'clock', { t: 'daily', gte: 50 }, ['title_toque_pasto'], { secret: true }),
  A('exact67', 'secreto', 'hard', '67', 'Terminá un minijuego con exactamente 67 puntos.', 'star', { t: 'flag', k: 'score', op: 'eq', v: 67 }, ['title_el_de_67'], { secret: true }),
  A('npc_win', 'meme', 'normal', 'NPC certificado', 'Ganá un minijuego jugando con Gerardo NPC.', 'user', { t: 'charwin', c: 'char_npc' }, ['title_npc', 'card_npc']),
  A('innecesario', 'meme', 'hard', 'Absolutamente innecesario', 'Ganá un minijuego dejando a tu rival en cero.', 'shield', { t: 'flag', k: 'opp', op: 'eq', v: 0, win: true }, ['title_innecesario']),
];

export const ACHIEVEMENTS = [...GENERAL, ...PER_GAME];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// texto "cómo se desbloquea" para los objetos exclusivos
for (const a of ACHIEVEMENTS) {
  for (const r of a.rewards) {
    const item = ITEM_BY_ID[r];
    if (!item) throw new Error(`Recompensa inexistente ${r} en ${a.id}`);
    if (!item.unlock || item.unlock.startsWith('Logro')) item.unlock = a.secret ? 'Logro secreto' : `Logro: ${a.name}`;
  }
}

/**
 * Progreso [actual, objetivo] de una condición con los datos del perfil propio (`me` de la API).
 * Devuelve null si la condición depende de una partida concreta.
 */
export function condProgress(c, me) {
  if (!me) return null;
  const m = (g) => me.mastery?.[g] || {};
  switch (c.t) {
    case 'stat': return [Math.floor(me.stats?.[c.k] ?? 0), c.gte];
    case 'level': return [me.level, c.gte];
    case 'gwins': return [m(c.g).wins || 0, c.gte];
    case 'gstreak': return [m(c.g).best_streak || 0, c.gte];
    case 'grank': return [m(c.g).rank || 0, c.gte];
    case 'ranks': return [GAME_IDS.filter((g) => (m(g).rank || 0) >= c.gte).length, c.count];
    case 'gameswon': {
      const ids = c.set === 'orig' ? GAME_IDS.slice(0, 12) : GAME_IDS;
      return [ids.filter((g) => (m(g).wins || 0) > 0).length, c.count];
    }
    case 'gamesplayed': return [GAME_IDS.filter((g) => (m(g).played || 0) > 0).length, c.count];
    case 'friends': return [me.friends ?? 0, c.gte];
    case 'items': return [me.items_count ?? 0, c.gte];
    case 'achs': return [Object.keys(me.achievements || {}).length, c.gte];
    case 'buys': return [me.buys ?? 0, c.gte];
    default: return null;
  }
}

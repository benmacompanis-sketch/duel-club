// AchievementManager: logros con condiciones REALES verificadas a partir de los resultados
// y de las estadísticas persistidas. Desbloquean personajes y accesorios.
// Cada jugador conectado a una cuenta tiene sus propios logros (guardados en su cuenta);
// los invitados comparten los logros guardados en este navegador.
import { CHARACTERS, ACCESSORIES } from './characters.js';
import { GAMES } from '../games/index.js';

// c = { type, res, session, stage, p (jugador evaluado), me (sus estadísticas) }
const flag = (c, gameId, fn) => c.type === 'minigame' && c.res.gameId === gameId && !!fn(c.res.flags?.[c.p] || {}, c.p, c.res);
const comp = (c, mode) => c.type === 'competition' && (!mode || c.session.mode === mode) && c.session.winner === c.p;

export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'Primera victoria', desc: 'Ganá tu primer minijuego.', icon: 'trophy',
    test: (c) => c.me.minigames.wins >= 1, progress: (m) => [m.minigames.wins, 1] },
  { id: 'five_wins', name: 'Cinco estrellas', desc: 'Ganá 5 minijuegos.', icon: 'star',
    test: (c) => c.me.minigames.wins >= 5, progress: (m) => [m.minigames.wins, 5] },
  { id: 'ten_wins', name: 'Leyenda local', desc: 'Ganá 10 minijuegos.', icon: 'medal',
    test: (c) => c.me.minigames.wins >= 10, progress: (m) => [m.minigames.wins, 10] },
  { id: 'streak3', name: 'En racha', desc: 'Ganá 3 minijuegos seguidos.', icon: 'flame',
    test: (c) => c.me.streak >= 3, progress: (m) => [m.bestStreak, 3] },
  { id: 'all_games', name: 'Todoterreno', desc: 'Ganá cada uno de los 12 minijuegos al menos una vez.', icon: 'crown',
    test: (c) => GAMES.every((G) => (c.me.gamesWon[G.meta.id] || 0) > 0),
    progress: (m) => [GAMES.filter((G) => m.gamesWon[G.meta.id] > 0).length, 12] },
  { id: 'marathon', name: 'Maratón', desc: 'Jugá 25 minijuegos.', icon: 'clock',
    test: (c) => c.me.played >= 25, progress: (m) => [m.played, 25] },
  { id: 'by_a_hair', name: 'Por un pelo', desc: 'Ganá un minijuego por un solo punto de diferencia.', icon: 'hair',
    test: (c) => c.type === 'minigame' && c.res.winner === c.p && c.res.margin === 1 },
  { id: 'champion', name: 'Campeón del club', desc: 'Ganá una competición en DUEL MODE.', icon: 'trophy',
    test: (c) => comp(c, 'duel') },
  { id: 'comeback', name: 'Remontada épica', desc: 'Ganá una competición después de ir perdiendo por 6 puntos o más.', icon: 'arrow',
    test: (c) => comp(c) && c.session.maxDeficit[c.p] >= 6 },
  { id: 'tournament_king', name: 'Rey del torneo', desc: 'Ganá un TOURNAMENT completo.', icon: 'crown',
    test: (c) => comp(c, 'tournament') },
  { id: 'survivor', name: 'Superviviente', desc: 'Llegá a la etapa 8 en SURVIVAL.', icon: 'heart',
    test: (c) => c.type === 'survivalStage' && c.stage >= 8 },
  { id: 'lightning', name: 'Rayo humano', desc: 'Reaccioná en menos de 200 ms en REACTION RUSH.', icon: 'bolt',
    test: (c) => flag(c, 'reaction', (f) => f.best != null && f.best < 200) },
  { id: 'clean_race', name: 'Piloto impecable', desc: 'Ganá MICRO RACE sin chocar ni una vez.', icon: 'flag',
    test: (c) => flag(c, 'race', (f, p, r) => r.winner === p && f.crashes === 0) },
  { id: 'shutout', name: 'Muro de acero', desc: 'Ganá PONG CHAOS sin recibir goles.', icon: 'shield',
    test: (c) => flag(c, 'pong', (f, p, r) => r.winner === p && r.scores[1 - p] === 0) },
  { id: 'last_standing', name: 'Pies firmes', desc: 'Ganá LAST PLATFORM sin perder ninguna ronda.', icon: 'boot',
    test: (c) => flag(c, 'platform', (f, p, r) => r.winner === p && r.scores[1 - p] === 0) },
  { id: 'sniper', name: 'Sin tocar aro', desc: 'Encestá 3 tiros limpios en una partida de HOOP MASTER.', icon: 'ball',
    test: (c) => flag(c, 'hoop', (f) => f.swishes >= 3) },
  { id: 'memory_master', name: 'Memoria fotográfica', desc: 'Encontrá 4 parejas seguidas en un mismo turno de MEMORY WAR.', icon: 'card',
    test: (c) => flag(c, 'memory', (f) => f.bestRun >= 4) },
  { id: 'painter', name: 'Picasso digital', desc: 'Conquistá el 60% del tablero en COLOR CONTROL.', icon: 'brush',
    test: (c) => flag(c, 'color', (f) => f.pct >= 60) },
  { id: 'flawless', name: 'Intocable', desc: 'Ganá una ronda de DUEL ARENA sin recibir daño.', icon: 'fist',
    test: (c) => flag(c, 'arena', (f) => f.flawless > 0) },
  { id: 'target_combo', name: 'Ojo de halcón', desc: 'Alcanzá un combo de 15 en TARGET PANIC.', icon: 'target',
    test: (c) => flag(c, 'target', (f) => f.maxCombo >= 15) },
  { id: 'beat_perfect', name: '¡PERFECT!', desc: 'Conseguí un PERFECT en BEAT BATTLE.', icon: 'note',
    test: (c) => flag(c, 'beat', (f) => f.perfects >= 1) },
  { id: 'beat_combo', name: 'Groove infinito', desc: 'Hacé un combo de 50 notas en BEAT BATTLE.', icon: 'note',
    test: (c) => flag(c, 'beat', (f) => f.maxCombo >= 50) },
  { id: 'golden_fish', name: 'Pez dorado', desc: 'Pescá el legendario pez dorado en FISH FRENZY.', icon: 'fish',
    test: (c) => flag(c, 'fish', (f) => f.golden > 0) },
  { id: 'quad', name: 'Cuádruple', desc: 'Completá 4 líneas de una vez en BLOCK BATTLE.', icon: 'blocks',
    test: (c) => flag(c, 'blocks', (f) => f.quads > 0) },
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

// Recompensas derivadas de los personajes/accesorios
export function rewardOf(achId) {
  const ch = CHARACTERS.find((c) => c.unlock === achId);
  if (ch) return { type: 'char', id: ch.id, name: ch.name };
  const acc = ACCESSORIES.find((a) => a.unlock === achId);
  if (acc) return { type: 'acc', id: acc.id, name: acc.name };
  return null;
}

export class AchievementManager {
  constructor(app) {
    this.app = app;
  }
  /** Cuenta del jugador p (o null si juega como invitado). */
  account(p) {
    return this.app.accounts?.slotAccount(p) || null;
  }
  /** Mapa de logros del jugador p: su cuenta o, si es invitado, los de este navegador. */
  scope(p) {
    const a = this.account(p);
    return a ? a.achievements : this.app.save.achievements;
  }
  /** Estadísticas que usan las condiciones de logro para el jugador p. */
  statsFor(p) {
    const a = this.account(p);
    if (a) return a.stats;
    const s = this.app.save.stats;
    return { ...s.players[p], played: s.totalMinigames };
  }
  has(id, p = 0) {
    return !!this.scope(p)[id];
  }
  isCharUnlocked(charId, p = 0) {
    const ch = CHARACTERS.find((c) => c.id === charId);
    return !!ch && (!ch.unlock || this.has(ch.unlock, p));
  }
  isAccUnlocked(accId, p = 0) {
    const a = ACCESSORIES.find((x) => x.id === accId);
    return !!a && (!a.unlock || this.has(a.unlock, p));
  }
  /**
   * Evalúa los logros de cada jugador con el contexto dado (resultado de minijuego,
   * competición o etapa de supervivencia). Devuelve los desbloqueados ahora.
   */
  evaluate(ctx) {
    const newly = [];
    const players = ctx.res?.players || ctx.session?.players || this.app.profiles;
    const doneScopes = new Set();
    for (const p of [0, 1]) {
      const scope = this.scope(p);
      const me = this.statsFor(p);
      const c = { ...ctx, p, me };
      for (const a of ACHIEVEMENTS) {
        if (scope[a.id]) continue;
        let ok = false;
        try {
          ok = !!a.test(c);
        } catch (e) {
          console.warn('achievement check failed', a.id, e);
        }
        if (ok) {
          scope[a.id] = { ts: Date.now(), by: players?.[p]?.name || '' };
          if (this.account(p)) this.app.accounts.addXp(this.account(p), 40);
          newly.push({ a, p, name: players?.[p]?.name || '' });
        }
      }
      doneScopes.add(scope);
    }
    if (newly.length) {
      this.app.persist();
      for (const p of [0, 1]) if (this.account(p)) this.app.accounts.scheduleSave(this.account(p), 200);
      newly.forEach((n, i) => setTimeout(() => this.announce(n.a, n.name), 400 + i * 300));
    }
    return newly;
  }
  announce(a, who = '') {
    const r = rewardOf(a.id);
    this.app.ui.toast({
      kind: 'achievement',
      title: who ? `¡Logro de ${who}!` : '¡Logro desbloqueado!',
      name: a.name,
      text: a.desc,
      reward: r ? (r.type === 'char' ? `Nuevo personaje: ${r.name}` : `Nuevo accesorio: ${r.name}`) : null,
      icon: a.icon,
    });
    this.app.audio.play('unlock');
    this.app.renderer.overlayFx.confetti(200, 640, 40, 1.4, false);
  }
}

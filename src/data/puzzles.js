// PUZZLE CLUB: desafíos armados a mano con las mecánicas de los minijuegos.
// Cada puzzle usa una semilla fija (todos juegan exactamente la misma partida), una regla con límites y una meta.
// Las metas se comprobaron con bots (scripts de prueba): todas tienen una solución razonable.
// Recompensa: la primera vez que resolvés cada puzzle (servidor, migración 020).
import { budget, reach, clean, READ as R } from '../core/rules.js';

export const PUZZLE_CATS = [
  { id: 'mem', name: 'MEMORIA', color: '#FF5FA2', icon: 'star' },
  { id: 'aim', name: 'PUNTERÍA', color: '#FFC93C', icon: 'target' },
  { id: 'beat', name: 'RITMO', color: '#9B6CFF', icon: 'flame' },
  { id: 'jump', name: 'PLATAFORMAS', color: '#48D597', icon: 'arrow' },
  { id: 'time', name: 'CONTRARRELOJ', color: '#25CFE6', icon: 'clock' },
];

// opp: rival ('idle' = sin rival). seed: partida fija. rule(): regla nueva en cada intento.
export const PUZZLES = [
  // ---------------- MEMORIA
  { id: 'm1', cat: 'mem', game: 'memory', opp: 'easy', seed: 4101, options: { size: 'small' }, name: 'Memoria limpia',
    goal: 'Ganale al bot cometiendo como máximo 1 error de memoria (dar vuelta una carta que ya habías visto, sin hacer pareja).',
    rule: () => clean({ count: R.memErrors, max: 1, label: 'Errores' }) },
  { id: 'm2', cat: 'mem', game: 'memory', opp: 'easy', seed: 4102, options: { size: 'small' }, name: 'Pocas vueltas',
    goal: 'Ganale al bot fallando como máximo 4 parejas.',
    rule: () => clean({ count: R.memMisses, max: 4, label: 'Fallos' }) },
  { id: 'm3', cat: 'mem', game: 'memory', opp: 'normal', seed: 4103, options: { size: 'medium' }, name: 'Cero olvidos',
    goal: 'Tablero 4×4 contra el bot Normal: ganá sin ningún error de memoria.',
    rule: () => clean({ count: R.memErrors, max: 0, label: 'Errores' }) },
  // ---------------- PUNTERÍA
  { id: 'a1', cat: 'aim', game: 'hoop', opp: 'idle', seed: 4201, options: { time: 60 }, name: 'Tiro libre',
    goal: 'Meté 6 canastas con solo 12 pelotas.',
    rule: () => budget({ score: R.hoopMakes, need: 6, used: R.hoopShots, max: 12, sLabel: 'Canastas', uLabel: 'Pelotas' }) },
  { id: 'a2', cat: 'aim', game: 'target', opp: 'idle', seed: 4202, options: { time: 45 }, name: 'Francotirador',
    goal: 'Sumá 400 puntos con solo 25 disparos.',
    rule: () => budget({ score: R.score, need: 400, used: R.targetShots, max: 25, sLabel: 'Puntos', uLabel: 'Disparos' }) },
  { id: 'a3', cat: 'aim', game: 'target', opp: 'idle', seed: 4203, options: { time: 45 }, name: 'Campo minado',
    goal: 'Sumá 500 puntos sin tocar ni una sola mina.',
    rule: () => {
      const r = reach({ score: R.score, need: 500, sLabel: 'Puntos' });
      return { ...r, tick: (g) => (R.targetBombs(g) > 0 ? { win: false, text: '¡Tocaste una mina!' } : r.tick(g)), hud: (g) => `${r.hud(g)} · Minas ${R.targetBombs(g)}/0` };
    } },
  { id: 'a4', cat: 'aim', game: 'hoop', opp: 'idle', seed: 4204, options: { time: 45 }, event: 'lowgrav', name: 'Canasta lunar',
    goal: 'Con gravedad baja: meté 5 canastas con 9 pelotas.',
    rule: () => budget({ score: R.hoopMakes, need: 5, used: R.hoopShots, max: 9, sLabel: 'Canastas', uLabel: 'Pelotas' }) },
  // ---------------- RITMO
  { id: 'b1', cat: 'beat', game: 'beat', opp: 'idle', seed: 4301, options: { song: 'beat1', speed: 1 }, name: 'Sin pifiar',
    goal: 'Terminá la canción de 108 BPM con 12 fallos o menos.',
    rule: () => clean({ count: R.beatMiss, max: 12, label: 'Fallos', beat: false }) },
  { id: 'b2', cat: 'beat', game: 'beat', opp: 'idle', seed: 4302, options: { song: 'beat2', speed: 1 }, name: 'Combo 30',
    goal: 'Hacé un combo de 30 notas seguidas en la canción de 124 BPM.',
    rule: () => reach({ score: R.beatCombo, need: 30, sLabel: 'Combo máximo' }) },
  { id: 'b3', cat: 'beat', game: 'reaction', opp: 'easy', seed: 4303, options: { rounds: 5 }, name: 'Pulso firme',
    goal: 'Ganale al bot en Reaction Rush sin ninguna salida en falso.',
    rule: () => clean({ count: R.falses, max: 0, label: 'Salidas en falso' }) },
  // ---------------- PLATAFORMAS
  { id: 'j1', cat: 'jump', game: 'tower', opp: 'idle', seed: 4401, options: { time: 90 }, name: 'Saltos contados',
    goal: 'Subí 50 metros usando como máximo 7 saltos.',
    rule: () => budget({ score: R.towerM, need: 50, used: R.towerJumps, max: 7, sLabel: 'Metros', uLabel: 'Saltos', grace: 3 }) },
  { id: 'j2', cat: 'jump', game: 'tower', opp: 'idle', seed: 4402, options: { time: 60 }, name: 'Escalada exprés',
    goal: 'Llegá a 80 metros en menos de un minuto.',
    rule: () => reach({ score: R.towerM, need: 80, sLabel: 'Metros' }) },
  { id: 'j3', cat: 'jump', game: 'platform', opp: 'easy', seed: 4403, name: 'Pies de plomo',
    goal: 'Ganale al bot en Last Platform saltando como máximo 12 veces.',
    rule: () => clean({ count: R.platJumps, max: 12, label: 'Saltos' }) },
  // ---------------- CONTRARRELOJ
  { id: 't1', cat: 'time', game: 'fish', opp: 'idle', seed: 4501, options: { time: 45 }, name: 'Pesca rápida',
    goal: 'Juntá 90 puntos de pesca en 45 segundos.',
    rule: () => reach({ score: R.score, need: 90, sLabel: 'Puntos' }) },
  { id: 't2', cat: 'time', game: 'color', opp: 'idle', seed: 4502, options: { time: 30 }, name: 'Pintor veloz',
    goal: 'Pintá el 40 % del tablero en 30 segundos.',
    rule: () => reach({ score: R.colorPct, need: 40, sLabel: 'Pintado %', fmt: (v) => Math.floor(v) }) },
  { id: 't3', cat: 'time', game: 'sneak', opp: 'idle', seed: 4503, options: { time: 60 }, name: 'Ladrón de cristales',
    goal: 'Juntá 7 cristales en un minuto.',
    rule: () => reach({ score: R.gems, need: 7, sLabel: 'Cristales' }) },
  { id: 't4', cat: 'time', game: 'blocks', opp: 'idle', seed: 4504, options: { time: 90 }, name: 'Bloques al límite',
    goal: 'Hacé 1500 puntos en Block Battle en un minuto y medio.',
    rule: () => reach({ score: R.score, need: 1500, sLabel: 'Puntos' }) },
];
export const PUZZLE_BY_ID = Object.fromEntries(PUZZLES.map((p) => [p.id, p]));

// textos en inglés (i18n)
export const PUZZLE_EN = {
  'PUZZLE CLUB': 'PUZZLE CLUB', MEMORIA: 'MEMORY', PUNTERÍA: 'AIM', RITMO: 'RHYTHM', PLATAFORMAS: 'PLATFORMS', CONTRARRELOJ: 'TIME ATTACK',
  'Memoria limpia': 'Clean memory', 'Pocas vueltas': 'Few flips', 'Cero olvidos': 'Zero slips', 'Tiro libre': 'Free throw', Francotirador: 'Sniper',
  'Campo minado': 'Minefield', 'Canasta lunar': 'Moon hoops', 'Sin pifiar': 'No slips', 'Combo 30': 'Combo 30', 'Pulso firme': 'Steady hand',
  'Saltos contados': 'Counted jumps', 'Escalada exprés': 'Express climb', 'Pies de plomo': 'Lead feet', 'Pesca rápida': 'Quick fishing',
  'Pintor veloz': 'Speed painter', 'Ladrón de cristales': 'Crystal thief', 'Bloques al límite': 'Blocks on the edge',
  'Ganale al bot cometiendo como máximo 1 error de memoria (dar vuelta una carta que ya habías visto, sin hacer pareja).': 'Beat the bot with at most 1 memory slip (flipping a card you had already seen without making a pair).',
  'Ganale al bot fallando como máximo 4 parejas.': 'Beat the bot missing at most 4 pairs.',
  'Tablero 4×4 contra el bot Normal: ganá sin ningún error de memoria.': '4×4 board against the Normal bot: win without a single memory slip.',
  'Meté 6 canastas con solo 12 pelotas.': 'Score 6 baskets with only 12 balls.',
  'Sumá 400 puntos con solo 25 disparos.': 'Score 400 points with only 25 shots.',
  'Sumá 500 puntos sin tocar ni una sola mina.': 'Score 500 points without touching a single mine.',
  'Con gravedad baja: meté 5 canastas con 9 pelotas.': 'Low gravity: score 5 baskets with 9 balls.',
  'Terminá la canción de 108 BPM con 12 fallos o menos.': 'Finish the 108 BPM song with 12 misses or fewer.',
  'Hacé un combo de 30 notas seguidas en la canción de 124 BPM.': 'Hit a 30-note combo in the 124 BPM song.',
  'Ganale al bot en Reaction Rush sin ninguna salida en falso.': 'Beat the bot in Reaction Rush without a single false start.',
  'Subí 50 metros usando como máximo 7 saltos.': 'Climb 50 meters using at most 7 jumps.',
  'Llegá a 80 metros en menos de un minuto.': 'Reach 80 meters in under a minute.',
  'Ganale al bot en Last Platform saltando como máximo 12 veces.': 'Beat the bot in Last Platform jumping at most 12 times.',
  'Juntá 90 puntos de pesca en 45 segundos.': 'Get 90 fishing points in 45 seconds.',
  'Pintá el 40 % del tablero en 30 segundos.': 'Paint 40% of the board in 30 seconds.',
  'Juntá 7 cristales en un minuto.': 'Collect 7 crystals in one minute.',
  'Hacé 1500 puntos en Block Battle en un minuto y medio.': 'Score 1500 points in Block Battle in a minute and a half.',
};

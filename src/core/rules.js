// Reglas especiales para PUZZLE CLUB e HISTORIA.
// Cada regla se crea de nuevo en cada intento (guarda su propio estado) y el runner la revisa en cada cuadro:
//  · tick(game)  → null o { win, text }: termina la partida antes de tiempo (logrado o fallado).
//  · hud(game)   → texto del cartel amarillo de abajo (progreso en vivo).
//  · end(game, res) → { win, text } cuando la partida termina sola (tiempo cumplido, rival ganó…).

/** Llegá a `need` usando como máximo `max` de un recurso (tiros, saltos). La última jugada tiene unos segundos para resolverse. */
export function budget({ score, need, used, max, sLabel, uLabel, grace = 2.5 }) {
  let t0 = null;
  return {
    tick(g) {
      const s = score(g), u = used(g);
      if (s >= need) return { win: true, text: `¡Lo lograste con ${u} ${uLabel.toLowerCase()}!` };
      if (u > max) return { win: false, text: `Te pasaste de ${max} ${uLabel.toLowerCase()}.` };
      if (u >= max) {
        t0 ??= g.time;
        if (g.time - t0 > grace) return { win: false, text: `Se terminaron los ${uLabel.toLowerCase()}.` };
      }
      return null;
    },
    hud: (g) => `${sLabel} ${Math.floor(score(g))}/${need} · ${uLabel} ${used(g)}/${max}`,
    end: (g) => (score(g) >= need ? { win: true, text: '¡Lo lograste!' } : { win: false, text: 'Se terminó el tiempo.' }),
  };
}

/** Llegá a `need` antes de que termine el tiempo. */
export function reach({ score, need, sLabel, fmt = (v) => Math.floor(v) }) {
  return {
    tick: (g) => (score(g) >= need ? { win: true, text: '¡Meta cumplida!' } : null),
    hud: (g) => `${sLabel} ${fmt(score(g))} / ${fmt(need)}`,
    end: (g) => (score(g) >= need ? { win: true, text: '¡Meta cumplida!' } : { win: false, text: 'Se terminó el tiempo.' }),
  };
}

/** Terminá la partida sin pasarte de `max` en un contador (errores, fallos). Si win=true, además hay que ganarle al rival. */
export function clean({ count, max, label, beat = true }) {
  return {
    tick: (g) => (count(g) > max ? { win: false, text: `Demasiados ${label.toLowerCase()} (máximo ${max}).` } : null),
    hud: (g) => `${label} ${count(g)}/${max}`,
    end: (g, res) => {
      if (count(g) > max) return { win: false, text: `Demasiados ${label.toLowerCase()} (máximo ${max}).` };
      if (beat && res.winner !== 0) return { win: false, text: 'El rival ganó la partida.' };
      return { win: true, text: '¡Lo lograste!' };
    },
  };
}

/** Ganarle al rival (sin condiciones extra). */
export function beatRival() {
  return { end: (g, res) => (res.winner === 0 ? { win: true, text: '¡Ganaste!' } : { win: false, text: res.winner === -1 ? 'Empate: hay que ganar.' : 'El rival ganó la partida.' }) };
}

// lectores de cada minijuego (jugador 1 = índice 0)
export const READ = {
  score: (g) => g.ghostScore?.(0) ?? 0,
  hoopMakes: (g) => g.makes[0],
  hoopShots: (g) => g.shots[0],
  targetShots: (g) => g.shots[0],
  targetBombs: (g) => g.bombs[0],
  memErrors: (g) => g.errors[0],
  memMisses: (g) => g.misses[0],
  beatMiss: (g) => g.counts[0].miss,
  beatCombo: (g) => g.maxCombo[0],
  falses: (g) => g.falses[0],
  towerM: (g) => g.ghostScore(0),
  towerJumps: (g) => g.pl[0].jumps,
  platJumps: (g) => g.jumps[0],
  colorPct: (g) => g.pct()[0],
  gems: (g) => g.pl[0].gems,
};

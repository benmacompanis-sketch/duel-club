// Simula cuánto tarda un jugador en subir el CLUB PASS con la economía real del servidor.
// Uso: node scripts/sim-pass.mjs
// Fórmulas (supabase/migrations 002/005/009): minijuego local/quick = round((10 + 15 si gana | 5 si empata) · f),
// competición = round((20 + 60 si gana | 20 si empata) · f), f = 1 hasta 40 minijuegos por día, 0,5 hasta 80, 0 después.
// Desafíos: ~4 diarios (≈30 XP c/u) y ~3 semanales (≈120 XP c/u). Bono de regreso: 300 XP de pase dobles tras 48 h sin jugar.
import { clubXpForLevel, clubLevel, CLUB } from '../src/data/clubPass.js';

const PROFILES = [
  // [nombre, días por semana, minijuegos por día, % victorias, competiciones por día, desafíos diarios completados]
  ['Casual', 3, 10, 0.45, 1, 1],
  ['Frecuente', 5, 20, 0.5, 2, 2],
  ['Muy activo', 7, 40, 0.55, 4, 4],
];
function weekXp([, days, games, wr, comps, daily], restBonus) {
  let xp = 0;
  for (let d = 0; d < days; d++) {
    for (let g = 0; g < games; g++) {
      const f = g < 40 ? 1 : g < 80 ? 0.5 : 0;
      xp += Math.round((10 + (Math.random() < wr ? 15 : 5 * 0.2)) * f);
    }
    for (let c = 0; c < comps; c++) xp += Math.round(20 + (Math.random() < wr ? 60 : 0));
    xp += daily * 30;
  }
  xp += Math.min(3, days) * 120; // semanales
  if (restBonus) xp += 300; // volvió después de 48 h al menos una vez por semana
  return xp;
}
const target = [25, 50, 100, 150, 200, 250].map((L) => [L, clubXpForLevel(L)]);
console.log(`CLUB PASS · ${CLUB.levels} niveles · XP total para el 250: ${clubXpForLevel(CLUB.levels).toLocaleString('es-AR')} · prestigio: ${CLUB.prestigeXp} XP por nivel\n`);
for (const P of PROFILES) {
  const runs = [];
  for (let r = 0; r < 200; r++) {
    let xp = 0, w = 0; const hit = {};
    while (w < 600 && !hit[250]) {
      w++; xp += weekXp(P, P[1] <= 4);
      for (const [L, need] of target) if (!hit[L] && xp >= need) hit[L] = w;
    }
    runs.push(hit);
  }
  const avg = (L) => Math.round(runs.reduce((a, h) => a + (h[L] || 600), 0) / runs.length);
  const wk = Math.round(runs.length && weekXp(P, P[1] <= 4));
  console.log(`${P[0].padEnd(11)} (${P[1]} días/sem, ${P[2]} minijuegos/día, ~${wk} XP/sem): ` + target.map(([L]) => `nv ${L} ≈ ${avg(L)} sem`).join(' · '));
}
console.log('\nNivel según XP de ejemplo:', [1000, 10000, 50000, 130000, 200000].map((x) => `${x} XP → nv ${clubLevel(x).level}`).join(' · '));

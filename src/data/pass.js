// Pase de Batalla de DUEL CLUB: un solo nivel de pase por temporada, dos filas de recompensas
// (LIBRE para todos y PREMIUM para quien compra el pase con PIES). Nunca se usa dinero real.
// Esta es la fuente de verdad: scripts/gen-pass.mjs genera los datos que usa el servidor.

export const PASS_XP_PER_LEVEL = 500; // XP de pase por nivel (toda la XP que ganás en la temporada cuenta)

// Objetos exclusivos de la Temporada 1 (no se venden en la tienda)
export const PASS_ITEMS_S1 = {
  title_s1_fundador: ['title', 'epic', 'Fundador del Club', 'Tuvo el Pase Premium de la Temporada 1.'],
  title_s1_temporada: ['title', 'rare', 'Temporada 1', 'Jugó la primera temporada de DUEL CLUB.'],
  title_s1_caotico: ['title', 'epic', 'Caótico de temporada', 'Nivel 25 del Pase de la Temporada 1.'],
  title_s1_completo: ['title', 'legendary', 'Pase completo', 'Llegó al nivel 40 del Pase de la Temporada 1.'],
  card_s1_club: ['card', 'rare', 'Club Caótico', 'Tarjeta de la Temporada 1: violeta y amarillo.'],
  card_s1_noche: ['card', 'rare', 'Noche de club', 'Azul noche con luces de neón.'],
  card_s1_aurora: ['card', 'epic', 'Aurora', 'Verde y violeta polar, con brillo suave.'],
  card_s1_sintetico: ['card', 'epic', 'Synthwave', 'Atardecer retro con grilla de neón.'],
  card_s1_premium: ['card', 'legendary', 'Premium T1', 'Negro y oro, la tarjeta del Pase Premium.'],
  frame_s1_bronce: ['frame', 'rare', 'Marco de temporada', 'Bronce con brillo, Temporada 1.'],
  frame_s1_plasma: ['frame', 'epic', 'Marco de plasma', 'Borde de energía que late.'],
  frame_s1_prisma: ['frame', 'legendary', 'Marco prisma', 'Todos los colores del club girando.'],
  emo_s1_vamos: ['emote', 'uncommon', '"¡VAMOS!"', 'Para festejar cada punto.'],
  emo_s1_lag: ['emote', 'rare', '"FUE EL LAG"', 'La excusa universal.'],
  emo_s1_otra: ['emote', 'rare', '"OTRA"', 'Revancha ya.'],
  emo_s1_tilt: ['emote', 'epic', '"MODO TILT"', 'Cuando ya no hay vuelta atrás.'],
  emo_s1_ez: ['emote', 'epic', '"FÁCIL"', 'Solo si de verdad fue fácil.'],
  skin_s1_holo: ['skin', 'epic', 'Holográfica', 'Reflejos de arcoíris que se mueven.'],
  skin_s1_tigre: ['skin', 'epic', 'Tigre', 'Rayas salvajes.'],
  skin_s1_carbono: ['skin', 'legendary', 'Fibra de carbono', 'Tramado negro con detalles dorados.'],
  skin_s1_prisma: ['skin', 'mythic', 'Prisma', 'La skin final del Pase Premium: luz pura.'],
};

// Recompensas especiales por nivel: [libre, premium]. Los niveles que no figuran dan PIES.
const SPECIAL = {
  1: [null, 'title_s1_fundador'],
  3: ['emo_s1_vamos', null],
  4: [null, 'card_s1_aurora'],
  5: ['card_s1_club', null],
  6: [null, 'emo_s1_lag'],
  8: ['title_s1_temporada', 'skin_s1_holo'],
  10: ['frame_s1_bronce', 'frame_s1_plasma'],
  12: [null, 'emo_s1_tilt'],
  14: ['emo_s1_otra', 'card_s1_sintetico'],
  16: [null, 'skin_s1_tigre'],
  20: ['card_s1_noche', 'emo_s1_ez'],
  25: ['title_s1_caotico', 'card_s1_premium'],
  30: [null, 'skin_s1_carbono'],
  35: [null, 'frame_s1_prisma'],
  40: ['title_s1_completo', 'skin_s1_prisma'],
};

export function buildRewards(levels = 40) {
  const out = [];
  for (let L = 1; L <= levels; L++) {
    const [fi, pi] = SPECIAL[L] || [null, null];
    const freePies = 40 + 10 * Math.floor((L - 1) / 10);
    out.push({ level: L, track: 'free', item: fi, pies: fi ? 0 : L % 2 === 0 ? freePies : 25 });
    out.push({ level: L, track: 'premium', item: pi, pies: pi ? 0 : 100 + 10 * Math.floor((L - 1) / 10) });
  }
  return out;
}

export const SEASONS = [
  {
    id: 's1', name: 'Temporada 1 · Club Caótico', starts: '2026-11-14T00:00:00Z', ends: '2027-02-01T00:00:00Z',
    premiumPrice: 1500, levels: 40, rewards: buildRewards(40), items: PASS_ITEMS_S1,
  },
];

export const passLevel = (xp) => Math.min(40, 1 + Math.floor((xp || 0) / PASS_XP_PER_LEVEL));

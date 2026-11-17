// INSIGNIAS: escudito de historieta con un símbolo que se muestra al lado del nombre (perfil, ranking, salas).
// 8 se venden en la PIE STORE y 8 son exclusivas de cofres (id cx_…). No dan ninguna ventaja.
// [id, nombre ES, nombre EN, símbolo, color de fondo, color del símbolo, rareza]
const DEF = [
  ['badge_estrella', 'Estrellita', 'Little star', 'star', '#FFD23F', '#15121F', 'common'],
  ['badge_rayo', 'Rayo', 'Bolt', 'bolt', '#25CFE6', '#15121F', 'common'],
  ['badge_corazon', 'Corazón', 'Heart', 'heart', '#FF5FA2', '#FFFFFF', 'uncommon'],
  ['badge_hoja', 'Hojita', 'Leaf', 'leaf', '#48D597', '#15121F', 'uncommon'],
  ['badge_nota', 'Nota musical', 'Music note', 'note', '#9B6CFF', '#FFFFFF', 'rare'],
  ['badge_luna', 'Luna', 'Moon', 'moon', '#2B3A8F', '#FFE45C', 'rare'],
  ['badge_cohete', 'Cohete', 'Rocket', 'rocket', '#FF654F', '#FFFFFF', 'epic'],
  ['badge_trofeo', 'Trofeo', 'Trophy', 'trophy', '#C8743A', '#FFE07A', 'epic'],
  ['cx_badge_diamante', 'Diamante', 'Diamond', 'diamond', '#7AF7FF', '#2457D6', 'rare'],
  ['cx_badge_llama', 'Llamarada', 'Blaze', 'flame', '#FF8E3C', '#FFF4E0', 'rare'],
  ['cx_badge_sol', 'Sol', 'Sun', 'sun', '#FFC93C', '#C81D44', 'epic'],
  ['cx_badge_pata', 'Huellita', 'Paw', 'paw', '#FFB38A', '#4A2312', 'epic'],
  ['cx_badge_escudo', 'Escudo dorado', 'Golden shield', 'shield', '#FFD16B', '#7A4E06', 'legendary'],
  ['cx_badge_corona', 'Corona', 'Crown', 'crown', '#E0115F', '#FFD16B', 'legendary'],
  ['cx_badge_galaxia', 'Galaxia', 'Galaxy', 'star', '#3A1E8A', '#FF7AF2', 'mythic'],
  ['cx_badge_holo', 'Holo', 'Holo', 'diamond', 'holo', '#FFFFFF', 'mythic'],
];
export const BADGE_ITEMS = DEF.map(([id, name, en, glyph, c1, c2, rarity]) => ({
  id, category: 'badge', rarity, name: `Insignia ${name.toLowerCase()}`, en: `${en} badge`, glyph, c1, c2,
  desc: id.startsWith('cx_') ? 'Exclusivo de cofres: no se vende en la tienda.' : 'Se muestra al lado de tu nombre.',
  sale: !id.startsWith('cx_'), chest: id.startsWith('cx_'), ...(id.startsWith('cx_') ? { unlock: 'Solo en cofres' } : {}),
}));
export const BADGE_BY_ID = Object.fromEntries(BADGE_ITEMS.map((b) => [b.id, b]));

const GLYPH = {
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  bolt: 'M13 2L5 13h6l-2 9 9-12h-6z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zm0 0l7-7',
  note: 'M9 18a3 3 0 11-2-2.8V5l10-2v11a3 3 0 11-2-2.8V6.5L9 7.8z',
  moon: 'M15 3a9 9 0 100 18 7 7 0 010-18z',
  rocket: 'M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2zm-3 13l-3 4 4-1m5-3l3 4-4-1M12 7a2 2 0 100 4 2 2 0 000-4z',
  trophy: 'M7 3h10v4a5 5 0 01-10 0zM5 4H3a4 4 0 004 5M19 4h2a4 4 0 01-4 5M10 13h4v4h3v3H7v-3h3z',
  diamond: 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 18 3-18',
  flame: 'M12 2s6 5 6 11a6 6 0 01-12 0c0-3 2-5 2-5s0 3 2 4c0-5 2-10 2-10z',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  paw: 'M12 13c3 0 6 3 5 6-1 2-3 1-5 1s-4 1-5-1c-1-3 2-6 5-6zM6 9a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4zM9 4a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
};
/** SVG de la insignia (texto). */
export function badgeSvg(id) {
  const b = BADGE_BY_ID[id];
  if (!b) return '';
  const fill = b.c1 === 'holo' ? 'url(#bh)' : b.c1;
  const holo = b.c1 === 'holo' ? '<defs><linearGradient id="bh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5ac8"/><stop offset=".35" stop-color="#5ac8ff"/><stop offset=".65" stop-color="#a0ff78"/><stop offset="1" stop-color="#ffe65a"/></linearGradient></defs>' : '';
  const stroke = ['leaf', 'sun', 'diamond', 'trophy', 'rocket'].includes(b.glyph);
  return `<svg viewBox="0 0 32 36" aria-hidden="true">${holo}<path d="M16 1l14 5v11c0 9-6 15-14 18C8 32 2 26 2 17V6z" fill="${fill}" stroke="#0D0B14" stroke-width="2.5"/><g transform="translate(5 7) scale(.92)"><path d="${GLYPH[b.glyph]}" fill="${stroke ? 'none' : b.c2}" stroke="${stroke ? b.c2 : '#0D0B14'}" stroke-width="${stroke ? 2.4 : 1.1}" stroke-linejoin="round" stroke-linecap="round"/></g></svg>`;
}

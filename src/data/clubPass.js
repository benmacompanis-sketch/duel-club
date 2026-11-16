// CLUB PASS: el pase permanente de DUEL CLUB (sin temporadas, sin reinicios, sin vencimiento).
//  · 250 niveles con dos filas (LIBRE y PREMIUM) que avanzan juntas con la XP.
//  · El Premium se compra una sola vez con PIES (nunca dinero real) y entrega todo lo ya alcanzado.
//  · Después del 250 sigue el PRESTIGIO: niveles infinitos, con premio cada 10 niveles.
// Esta es la fuente de verdad: scripts/gen-pass.mjs genera los datos que usa el servidor (seed + migración).
// Los objetos nuevos son FAMILIAS generadas a partir de paletas y patrones que el juego ya sabe dibujar
// (tarjetas por CSS, marcos por CSS, skins por color + patrón en canvas, títulos y emotes de texto).

export const CLUB = {
  id: 'club',
  name: 'CLUB PASS',
  levels: 250,
  xpBase: 150, // XP del nivel 1 al 2
  xpGrowth: 3, // cada nivel pide 3 XP más que el anterior
  prestigeXp: 900, // cada nivel de prestigio (después del 250)
  premiumPrice: 3000,
};

/** XP total necesaria para llegar al nivel L (L ≥ 1). */
export function clubXpForLevel(L) {
  if (L <= 1) return 0;
  const k = Math.min(L, CLUB.levels) - 1;
  const base = k * CLUB.xpBase + (CLUB.xpGrowth * k * (k - 1)) / 2;
  return base + Math.max(0, L - CLUB.levels) * CLUB.prestigeXp;
}
/** Nivel (puede pasar de 250: prestigio) y progreso dentro del nivel. */
export function clubLevel(xp) {
  xp = Math.max(0, xp || 0);
  const cap = clubXpForLevel(CLUB.levels);
  let L;
  if (xp >= cap) L = CLUB.levels + Math.floor((xp - cap) / CLUB.prestigeXp);
  else {
    const a = CLUB.xpGrowth / 2, b = CLUB.xpBase - CLUB.xpGrowth / 2;
    L = 1 + Math.floor((-b + Math.sqrt(b * b + 4 * a * xp)) / (2 * a));
    while (clubXpForLevel(L + 1) <= xp) L++;
    while (L > 1 && clubXpForLevel(L) > xp) L--;
  }
  const cur = clubXpForLevel(L), next = clubXpForLevel(L + 1);
  return { level: L, into: xp - cur, need: next - cur, prestige: Math.max(0, L - CLUB.levels) };
}

// ------------------------------------------------------------------ familias de objetos
// [id, nombre ES, nombre EN, color 1, color 2, borde]
export const PALETTES = [
  ['mostaza', 'Mostaza', 'Mustard', '#E8B21E', '#5A3A06', '#FFE07A'], ['chicle', 'Chicle', 'Bubblegum', '#FF7EB6', '#5E1036', '#FFD1E6'],
  ['menta', 'Menta', 'Mint', '#57E2B0', '#0B4434', '#C9FFEC'], ['medianoche', 'Medianoche', 'Midnight', '#2B3A8F', '#070B24', '#8EA2FF'],
  ['volcan', 'Volcánico', 'Volcanic', '#E2491F', '#260803', '#FFB45E'], ['pantano', 'Pantano', 'Swamp', '#6F8F2C', '#18210A', '#D6F07A'],
  ['oceano', 'Océano profundo', 'Deep ocean', '#1C7FB8', '#04182B', '#7FE3FF'], ['sandia', 'Sandía', 'Watermelon', '#F2546B', '#0F3A1E', '#9CF07F'],
  ['lavanda', 'Lavanda', 'Lavender', '#A48BF0', '#241650', '#E5DBFF'], ['cobre', 'Cobre', 'Copper', '#C8743A', '#2E1406', '#FFC08A'],
  ['hielo', 'Hielo seco', 'Dry ice', '#BFE9FF', '#16384F', '#FFFFFF'], ['acido', 'Neón ácido', 'Acid neon', '#C6F04A', '#132006', '#F4FFB0'],
  ['ocaso', 'Ocaso', 'Dusk', '#FF8A4C', '#3A0E3E', '#FFD27A'], ['tinta', 'Tinta china', 'India ink', '#2A2A33', '#050507', '#E9E4D8'],
  ['papel', 'Papel viejo', 'Old paper', '#E9D8B0', '#5C4523', '#FFF6DE'], ['cereza', 'Cereza', 'Cherry', '#C81D44', '#2B0410', '#FF8AA6'],
  ['uva', 'Uva', 'Grape', '#6B2FA8', '#16052A', '#D2A8FF'], ['citrico', 'Cítrico', 'Citrus', '#FFB800', '#3D5A00', '#FFF27A'],
  ['pistacho', 'Pistacho', 'Pistachio', '#A9D47A', '#2F4219', '#EAFFD0'], ['coral', 'Coral', 'Coral', '#FF7A5C', '#3B1208', '#FFD0BE'],
  ['cielo', 'Cielo', 'Sky', '#5FB8FF', '#0E2D52', '#DDF0FF'], ['carbon', 'Carbón', 'Charcoal', '#3C3F48', '#101115', '#FF6A3D'],
  ['oroviejo', 'Oro viejo', 'Old gold', '#B8902E', '#2B200A', '#FFE7A0'], ['rubi', 'Rubí', 'Ruby', '#E0115F', '#300214', '#FF9CC3'],
  ['esmeralda', 'Esmeralda', 'Emerald', '#13A86B', '#032417', '#8CFFCF'], ['zafiro', 'Zafiro', 'Sapphire', '#2457D6', '#05123A', '#9DB8FF'],
  ['amatista', 'Amatista', 'Amethyst', '#9B4DE0', '#200838', '#E3C2FF'], ['ambar', 'Ámbar', 'Amber', '#F29B12', '#3A2002', '#FFD98A'],
  ['turquesa', 'Turquesa', 'Turquoise', '#20C4C4', '#043333', '#B5FFFF'], ['fucsia', 'Fucsia', 'Fuchsia', '#F02FC2', '#3A0430', '#FFB3EE'],
  ['tormenta', 'Tormenta', 'Storm', '#5B6B8C', '#141A26', '#FFE14D'], ['durazno', 'Durazno', 'Peach', '#FFB38A', '#4A2312', '#FFE6D6'],
  ['lima', 'Verde lima', 'Lime', '#7BE33B', '#163A06', '#E3FFB8'], ['granate', 'Granate', 'Garnet', '#8E1B2E', '#1F0309', '#FF8C9C'],
  ['arena', 'Arena', 'Sand', '#D9B77A', '#3B2C12', '#FFF0CC'], ['pizarra', 'Pizarra', 'Slate', '#55657A', '#121820', '#B9D0EA'],
  ['galaxia', 'Galaxia', 'Galaxy', '#3A1E8A', '#05021A', '#FF7AF2'], ['plasma', 'Plasma', 'Plasma', '#FF3DF2', '#1A0538', '#7AF7FF'],
  ['aurora', 'Aurora boreal', 'Northern lights', '#2DE0A0', '#130A3A', '#C08CFF'], ['magma', 'Magma', 'Magma', '#FF5A1F', '#140303', '#FFE14D'],
];
// patrones de tarjeta (CSS) y de skin (canvas)
export const PATTERNS = [
  ['tramado', 'Tramado', 'Halftone'], ['rayas', 'Rayas', 'Stripes'], ['cuadricula', 'Cuadrícula', 'Grid'], ['estallido', 'Estallido', 'Burst'],
  ['ondas', 'Ondas', 'Waves'], ['estrellas', 'Estrellas', 'Stars'], ['damero', 'Damero', 'Checker'], ['vinetas', 'Viñetas', 'Panels'],
];
export const SKIN_PATTERNS = ['tramado', 'rayas', 'estrellas', 'damero', 'ondas'];
export const FRAME_STYLES = [['tinta', 'de tinta', 'ink'], ['doble', 'doble', 'double'], ['punteado', 'punteado', 'dotted'], ['brillo', 'brillante', 'glowing']];

// títulos [ES, EN] (ordenados de menor a mayor prestigio)
const TITLES = [
  ['Recién llegado', 'Fresh arrival'], ['Calentando motores', 'Warming up'], ['Dedo rápido', 'Quick finger'], ['Sin miedo al ridículo', 'Fearless of embarrassment'],
  ['Habitué del club', 'Club regular'], ['Rey del rebote', 'Bounce king'], ['Puntería de feria', 'Fairground aim'], ['Siempre una más', 'Always one more'],
  ['Mano caliente', 'Hot hand'], ['El que no se rinde', 'Never gives up'], ['Experto en revanchas', 'Rematch expert'], ['Tiembla el tablero', 'Board shaker'],
  ['Corazón de arcade', 'Arcade heart'], ['Domador del caos', 'Chaos tamer'], ['Nervios de acero', 'Nerves of steel'], ['Leyenda de barrio', 'Neighborhood legend'],
  ['Viñeta principal', 'Main panel'], ['Protagonista', 'Protagonist'], ['Golpe de efecto', 'Plot twist'], ['Tinta indeleble', 'Indelible ink'],
  ['Héroe de historieta', 'Comic book hero'], ['Villano favorito', 'Favorite villain'], ['Última página', 'Last page'], ['Edición especial', 'Special edition'],
  ['Portada del mes', 'Cover of the month'], ['Número uno', 'Issue number one'], ['Coleccionable', 'Collectible'], ['Tirada limitada', 'Limited run'],
  ['Clásico del club', 'Club classic'], ['Mito del arcade', 'Arcade myth'], ['Imbatible (casi)', 'Unbeatable (almost)'], ['Fuera de serie', 'One of a kind'],
  ['Saga completa', 'Complete saga'], ['Edición de lujo', 'Deluxe edition'], ['Tapa dura', 'Hardcover'], ['Obra maestra', 'Masterpiece'],
  ['Más allá del cuadro', 'Beyond the panel'], ['Leyenda impresa', 'Printed legend'], ['Autor del caos', 'Author of chaos'], ['Inmortal del club', 'Club immortal'],
  ['Socio de honor', 'Honorary member'], ['Pase infinito', 'Infinite pass'], ['Nivel 100', 'Level 100'], ['Nivel 150', 'Level 150'],
  ['Nivel 200', 'Level 200'], ['CLUB PASS completo', 'CLUB PASS complete'], ['Fin de la historieta', 'The End'], ['Continuará…', 'To be continued…'],
];
// emotes [texto ES, texto EN]
const EMOTES = [
  ['¡POW!', 'POW!'], ['¡ZAS!', 'WHAM!'], ['¡BOING!', 'BOING!'], ['¡CRASH!', 'CRASH!'], ['ESO ES TODO', 'THAT’S ALL FOLKS'],
  ['CONTINUARÁ…', 'TO BE CONTINUED…'], ['¡QUÉ JUGADA!', 'WHAT A PLAY!'], ['MANO A MANO', 'HEAD TO HEAD'], ['NI CERCA', 'NOT EVEN CLOSE'],
  ['TE TENGO', 'GOT YOU'], ['UNA MÁS', 'ONE MORE'], ['ESTOY ON FIRE', 'I’M ON FIRE'], ['ME DISTRAJE', 'I GOT DISTRACTED'],
  ['FUE SUERTE', 'PURE LUCK'], ['EL TECLADO', 'IT WAS THE KEYBOARD'], ['¡KA-BOOM!', 'KA-BOOM!'],
];

const RAR = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const rarAt = (L, track) => {
  const t = L <= 50 ? 1 : L <= 100 ? 2 : L <= 150 ? 3 : L <= 200 ? 4 : 5;
  return RAR[Math.max(1, t - (track === 'free' ? 1 : 0))];
};

// Pools de objetos (el orden define en qué nivel aparecen)
function buildPools() {
  const cards = [], skins = [], frames = [], titles = [], emotes = [];
  PALETTES.forEach(([pid, es, en], i) => {
    const [pat, pes, pen] = PATTERNS[i % PATTERNS.length];
    cards.push({ id: `card_cp_${pid}`, category: 'card', name: `${es} · ${pes}`, en: `${en} · ${pen}`, palette: pid, pattern: pat });
    if (i % 2 === 0 || i >= 30) {
      const [pat2, pes2, pen2] = PATTERNS[(i + 3) % PATTERNS.length];
      cards.push({ id: `card_cp_${pid}_2`, category: 'card', name: `${es} · ${pes2}`, en: `${en} · ${pen2}`, palette: pid, pattern: pat2 });
    }
  });
  PALETTES.forEach(([pid, es, en], i) => {
    const pat = SKIN_PATTERNS[i % SKIN_PATTERNS.length];
    const P = PATTERNS.find((x) => x[0] === pat);
    skins.push({ id: `skin_cp_${pid}`, category: 'skin', name: `Skin ${es} ${P[1].toLowerCase()}`, en: `${en} ${P[2].toLowerCase()} skin`, palette: pid, pattern: pat });
  });
  PALETTES.filter((_, i) => i % 2 === 1).forEach(([pid, es, en], i) => {
    const [st, ses, sen] = FRAME_STYLES[i % FRAME_STYLES.length];
    frames.push({ id: `frame_cp_${pid}`, category: 'frame', name: `Marco ${es.toLowerCase()} ${ses}`, en: `${sen[0].toUpperCase() + sen.slice(1)} ${en.toLowerCase()} frame`, palette: pid, style: st });
  });
  TITLES.forEach(([es, en], i) => titles.push({ id: `title_cp_${i + 1}`, category: 'title', name: es, en }));
  EMOTES.forEach(([es, en], i) => emotes.push({ id: `emo_cp_${i + 1}`, category: 'emote', name: `"${es}"`, en: `"${en}"`, text: es, textEn: en }));
  return { cards, skins, frames, titles, emotes };
}

// Hitos: [libre, premium] fijos en niveles importantes
const MILESTONES = {
  1: [null, 'title_s1_fundador'], 50: ['title_cp_41', 'skin_s1_holo'], 100: ['title_cp_43', 'skin_s1_tigre'], 150: ['title_cp_44', 'skin_s1_carbono'],
  200: ['title_cp_45', 'frame_s1_prisma'], 250: ['title_cp_46', 'skin_s1_prisma'],
};
// Títulos de prestigio (solo se entregan en esos niveles de prestigio, fila libre)
export const PRESTIGE_TITLES = [
  [300, 'title_cp_p300', 'Prestigio I', 'Prestige I'], [400, 'title_cp_p400', 'Prestigio II', 'Prestige II'], [500, 'title_cp_p500', 'Prestigio III', 'Prestige III'],
  [750, 'title_cp_p750', 'Prestigio IV', 'Prestige IV'], [1000, 'title_cp_p1000', 'Prestigio Máximo', 'Max Prestige'],
];
/** Premio de un nivel de prestigio (después del 250): cada 10 niveles. */
export function prestigeReward(L, track) {
  if (L <= CLUB.levels || (L - CLUB.levels) % 10 !== 0) return null;
  const t = PRESTIGE_TITLES.find((x) => x[0] === L);
  if (track === 'free') return t ? { item: t[1], pies: 0 } : { item: null, pies: 150 };
  return { item: null, pies: 250 };
}

let cache = null;
/** Objetos nuevos del CLUB PASS + recompensas de los 250 niveles. */
export function buildClub(s1Items) {
  if (cache) return cache;
  const P = buildPools();
  const used = new Set(Object.values(MILESTONES).flat().filter(Boolean));
  // S1: los que no son hitos se reparten en los primeros tramos
  const s1Free = Object.keys(s1Items).filter((id) => !used.has(id) && /^(title|emo|card)_/.test(id));
  const s1Prem = Object.keys(s1Items).filter((id) => !used.has(id) && !s1Free.includes(id));
  const take = (arr) => { while (arr.length) { const x = arr.shift(); const id = typeof x === 'string' ? x : x.id; if (!used.has(id)) { used.add(id); return x; } } return null; };
  const freeQ = [...s1Free, ...interleave(P.titles.slice(0, 40), P.emotes)];
  const premQ = [...s1Prem, ...interleave(P.cards, P.skins, P.frames)];
  const items = {}; // id → objeto nuevo (con rareza definida por el nivel en que aparece)
  const rewards = [];
  const piesFree = (L) => 20 + 5 * Math.floor(L / 25);
  const piesPrem = (L) => 60 + 10 * Math.floor(L / 25);
  for (let L = 1; L <= CLUB.levels; L++) {
    for (const track of ['free', 'premium']) {
      const ms = MILESTONES[L]?.[track === 'free' ? 0 : 1];
      let id = ms || null;
      const wantItem = track === 'free' ? L % 5 === 0 : L % 2 === 1 || L % 10 === 0;
      if (!id && wantItem) {
        const x = take(track === 'free' ? freeQ : premQ);
        if (x) { id = typeof x === 'string' ? x : x.id; if (typeof x !== 'string') items[id] = { ...x, rarity: rarAt(L, track) }; }
      }
      rewards.push({ level: L, track, item: id, pies: id ? 0 : track === 'free' ? piesFree(L) : piesPrem(L) });
    }
  }
  // hitos y títulos de prestigio que todavía no tienen datos
  for (const t of P.titles) if (used.has(t.id) && !items[t.id] && !s1Items[t.id]) items[t.id] = { ...t, rarity: 'legendary' };
  for (const [, id, es, en] of PRESTIGE_TITLES) items[id] = { id, category: 'title', name: es, en, rarity: 'mythic', prestige: true };
  cache = { items, rewards, pools: P };
  return cache;
}
function interleave(...lists) {
  const out = [];
  const n = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < n; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}
export const PALETTE_BY_ID = Object.fromEntries(PALETTES.map((p) => [p[0], p]));

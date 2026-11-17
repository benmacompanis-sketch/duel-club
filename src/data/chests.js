// COFRES: bronce, plata, oro y mítico. El servidor abre los cofres (migración 021): el navegador nunca elige el premio.
// Esta tabla es la fuente de verdad; scripts/gen-chests.mjs la copia al servidor.
import { PALETTES, PATTERNS, SKIN_PATTERNS } from './clubPass.js';

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

// probabilidades por rareza (cada columna suma 100)
export const CHESTS = {
  bronze: { name: 'Cofre de bronce', en: 'Bronze chest', color: '#C8743A', color2: '#5A2E10', odds: [65, 25, 8, 2, 0, 0], price: 450, craft: 6 },
  silver: { name: 'Cofre de plata', en: 'Silver chest', color: '#C9D3E6', color2: '#46506A', odds: [40, 35, 17, 7, 1, 0], price: 1400, craft: 15 },
  gold: { name: 'Cofre de oro', en: 'Gold chest', color: '#FFD16B', color2: '#7A4E06', odds: [20, 30, 30, 17, 3, 0], price: 4000, craft: 40 },
  mythic: { name: 'Cofre mítico', en: 'Mythic chest', color: '#FF3B5C', color2: '#3A0618', odds: [0, 10, 25, 35, 20, 10], price: null, craft: null },
};
export const CHEST_ORDER = ['bronze', 'silver', 'gold', 'mythic'];
// premio especial independiente de la tabla: el PASE PREMIUM (en %). Si ya lo tenés: compensación especial.
export const PASS_JACKPOT = { gold: 0.5, mythic: 2 };
export const PASS_JACKPOT_COMP = { pies: 2500, shards: 25 };
// en vez de un objeto, a veces sale una bolsa de PIES de esa rareza (en %)
export const PIES_DROP = 15;
export const PIES_BY_RARITY = [60, 140, 350, 800, 1800, 4000];
// objeto repetido: no se pierde, se convierte en PIES + fragmentos según su rareza
export const DUP_COMP = [[25, 1], [60, 2], [150, 4], [350, 8], [800, 15], [2000, 30]];

// Cómo se consiguen (todo jugando; también se pueden comprar los de bronce, plata y oro con PIES)
export const CHEST_SOURCES = [
  ['Cada desafío diario reclamado', '+1 fragmento'],
  ['Cada desafío semanal reclamado', 'Cofre de plata'],
  ['Los 3 desafíos semanales de una semana', 'Cofre de oro extra'],
  ['Cada 5 niveles', 'Cofre de plata'],
  ['Cada 25 niveles', 'Cofre de oro'],
  ['Niveles 50, 100, 150…', 'Cofre mítico'],
  ['Cada 10 logros', 'Cofre de plata'],
  ['Daily Chaos con 3 estrellas', '+2 fragmentos'],
  ['Terminar toda la Historia del Club', 'Cofre mítico'],
  ['Fragmentos', 'Bronce 6 · Plata 15 · Oro 40'],
];

// ------------------------------------------------------------------ objetos EXCLUSIVOS de cofres (no se venden)
// tarjetas y marcos holográficos, skins con combinaciones propias, títulos y emotes.
const CHEST_TITLES = [
  ['Abridor serial', 'Serial opener', 'uncommon'], ['Me salió repetido', 'Got a duplicate', 'common'], ['Suerte de principiante', 'Beginner’s luck', 'common'],
  ['Coleccionista', 'Collector', 'rare'], ['Ojo de cofre', 'Chest eye', 'rare'], ['Brillo holográfico', 'Holo shine', 'epic'],
  ['Tesoro escondido', 'Hidden treasure', 'epic'], ['Llave maestra', 'Master key', 'legendary'], ['El de la suerte', 'The lucky one', 'legendary'],
  ['Tirada perfecta', 'Perfect roll', 'mythic'], ['Pirata del club', 'Club pirate', 'uncommon'], ['Mapa del tesoro', 'Treasure map', 'rare'],
];
const CHEST_EMOTES = [
  ['¡ME TOCÓ!', 'I GOT IT!', 'uncommon'], ['¿OTRO REPETIDO?', 'ANOTHER DUPE?', 'common'], ['¡LEGENDARIO!', 'LEGENDARY!', 'epic'],
  ['ABRÍ UNO MÁS', 'ONE MORE CHEST', 'common'], ['¡TESORO!', 'TREASURE!', 'rare'], ['¡HOLO!', 'HOLO!', 'legendary'],
];
const CARD_PAL = ['galaxia', 'plasma', 'aurora', 'magma', 'zafiro', 'rubi', 'esmeralda', 'amatista', 'oroviejo', 'tormenta', 'turquesa', 'fucsia'];
const CARD_RAR = ['rare', 'rare', 'rare', 'epic', 'epic', 'epic', 'epic', 'legendary', 'legendary', 'legendary', 'mythic', 'mythic'];
const FRAME_PAL = ['cobre', 'hielo', 'acido', 'ocaso', 'cereza', 'uva', 'lima', 'coral'];
const FRAME_RAR = ['uncommon', 'rare', 'rare', 'epic', 'epic', 'legendary', 'legendary', 'mythic'];
const SKIN_PAL = ['mostaza', 'chicle', 'menta', 'medianoche', 'volcan', 'oceano', 'sandia', 'lavanda', 'cielo', 'durazno'];
const SKIN_RAR = ['common', 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'epic', 'legendary', 'mythic'];
const PAL = Object.fromEntries(PALETTES.map((p) => [p[0], p]));

export const CHEST_ITEMS = [
  ...CARD_PAL.map((pid, i) => ({ id: `cx_card_${pid}`, category: 'card', rarity: CARD_RAR[i], name: `Holo ${PAL[pid][1]}`, en: `Holo ${PAL[pid][2]}`, palette: pid, pattern: 'holo' })),
  ...FRAME_PAL.map((pid, i) => ({ id: `cx_frame_${pid}`, category: 'frame', rarity: FRAME_RAR[i], name: `Marco holo ${PAL[pid][1].toLowerCase()}`, en: `${PAL[pid][2]} holo frame`, palette: pid, style: 'holo' })),
  ...SKIN_PAL.map((pid, i) => {
    const pat = SKIN_PATTERNS[(i + 2) % SKIN_PATTERNS.length];
    const P = PATTERNS.find((x) => x[0] === pat);
    return { id: `cx_skin_${pid}`, category: 'skin', rarity: SKIN_RAR[i], name: `Skin ${PAL[pid][1]} ${P[1].toLowerCase()} (cofre)`, en: `${PAL[pid][2]} ${P[2].toLowerCase()} skin (chest)`, palette: pid, pattern: pat };
  }),
  ...CHEST_TITLES.map(([es, en, rarity], i) => ({ id: `cx_title_${i + 1}`, category: 'title', rarity, name: es, en })),
  ...CHEST_EMOTES.map(([es, en, rarity], i) => ({ id: `cx_emo_${i + 1}`, category: 'emote', rarity, name: `"${es}"`, en: `"${en}"`, text: es, textEn: en })),
].map((x) => ({ ...x, desc: 'Exclusivo de cofres: no se vende en la tienda.', unlock: 'Solo en cofres', sale: false, chest: true }));

// textos en inglés (i18n)
export const CHEST_EN = {
  COFRES: 'CHESTS', Cofres: 'Chests', 'Cofre de bronce': 'Bronze chest', 'Cofre de plata': 'Silver chest', 'Cofre de oro': 'Gold chest', 'Cofre mítico': 'Mythic chest',
  'Exclusivo de cofres: no se vende en la tienda.': 'Chest exclusive: not sold in the store.', 'Solo en cofres': 'Chests only',
  'Cada desafío diario reclamado': 'Each daily challenge claimed', '+1 fragmento': '+1 shard', 'Cada desafío semanal reclamado': 'Each weekly challenge claimed',
  'Los 3 desafíos semanales de una semana': 'All 3 weekly challenges in a week', 'Cofre de oro extra': 'Extra gold chest', 'Cada 5 niveles': 'Every 5 levels',
  'Cada 25 niveles': 'Every 25 levels', 'Niveles 50, 100, 150…': 'Levels 50, 100, 150…', 'Cada 10 logros': 'Every 10 achievements',
  'Daily Chaos con 3 estrellas': 'Daily Chaos with 3 stars', '+2 fragmentos': '+2 shards', 'Terminar toda la Historia del Club': 'Finishing the whole Club Story',
  Fragmentos: 'Shards', 'Bronce 6 · Plata 15 · Oro 40': 'Bronze 6 · Silver 15 · Gold 40',
};

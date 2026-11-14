// Kit de interfaz de la plataforma: monedas, niveles, rangos, tarjetas de perfil, avatares con marco,
// vistas previas de objetos y pequeñas utilidades compartidas por todas las secciones.
import { h, icon } from './dom.js';
import { ITEM_BY_ID, RARITIES, levelInfo, resistTier, GAME_NAMES, GAME_COLORS, TITLES, LEVEL_TITLES } from '../data/catalog.js';
import { drawCharacter } from '../core/characters.js';
import { drawPieIcon, drawEntrance, drawVictory } from '../core/cosmetics.js';
import { TAU, rgba } from '../core/utils.js';

// ------------------------------------------------------------------ monedas y medidores
const PIE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15" rx="6.4" ry="7.6" fill="currentColor"/><circle cx="6.6" cy="5.6" r="2.4" fill="currentColor"/><circle cx="9.6" cy="4.2" r="1.8" fill="currentColor"/><circle cx="12.6" cy="4" r="1.7" fill="currentColor"/><circle cx="15.4" cy="4.8" r="1.6" fill="currentColor"/><circle cx="17.8" cy="6.4" r="1.4" fill="currentColor"/><ellipse cx="10" cy="13" rx="1.5" ry="3" fill="rgba(255,255,255,.45)"/></svg>';
const XP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.4L21 9l-5 4.4L17.4 20 12 16.6 6.6 20 8 13.4 3 9l6.4-.6z" fill="currentColor"/></svg>';
const RES_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/><path d="M8 12l3 3 5-6" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const svgSpan = (cls, svg) => {
  const s = h('span.' + cls);
  s.innerHTML = svg;
  return s;
};
export const fmtN = (n) => Math.round(n || 0).toLocaleString('es-AR');

/** Saldo de PIES con su ícono. */
export function pies(n, cls = '') {
  return h('span.pies' + (cls ? '.' + cls : ''), svgSpan('pies-ico', PIE_SVG), h('b', fmtN(n)), h('small', 'PIES'));
}
export function piesIcon() {
  return svgSpan('pies-ico', PIE_SVG);
}
export function xp(n) {
  return h('span.xp', svgSpan('xp-ico', XP_SVG), h('b', fmtN(n)), h('small', 'XP'));
}
/** ELO con su rango competitivo. */
export function resist(rating, opts = {}) {
  const tier = resistTier(rating || 1000);
  return h('span.resist', { style: { '--rc': tier.color }, title: `ELO · ${tier.name}` },
    svgSpan('res-ico', RES_SVG), h('b', fmtN(rating)), opts.short ? null : h('small', tier.name));
}
export function tierName(rating) {
  return resistTier(rating || 1000).name;
}
export function levelBadge(level) {
  return h('span.lvl' + (level === 67 ? '.lvl67' : level >= 100 ? '.lvl100' : level >= 50 ? '.lvl50' : ''), { title: `Nivel ${level}` }, h('small', 'NV'), String(level));
}
/** Barra de progreso de nivel (XP del nivel actual / necesario para el siguiente). */
export function xpBar(xpTotal) {
  const L = levelInfo(xpTotal || 0);
  return h('div.kbar', { title: `${fmtN(L.into)} / ${fmtN(L.need)} XP para el nivel ${L.level + 1}` },
    h('div.kbar-fill', { style: { width: Math.round(L.progress * 100) + '%' } }),
    h('span', `${fmtN(L.into)} / ${fmtN(L.need)}`));
}
export function rarityChip(r) {
  const R = RARITIES[r] || RARITIES.common;
  return h('span.rar.rar-' + r, { style: { '--rr': R.color } }, R.name);
}

/** Título visible: el equipado o el que corresponde por nivel. */
export function titleOf(me) {
  const id = me?.equipped?.title;
  if (id && ITEM_BY_ID[id]) return ITEM_BY_ID[id].name;
  return levelInfo(me?.xp || 0).title;
}
export function titleRarity(me) {
  const id = me?.equipped?.title;
  return (id && ITEM_BY_ID[id]?.rarity) || 'common';
}

// ------------------------------------------------------------------ avatar con marco
export function lookOf(me) {
  if (!me) return { char: 'volt', color: '#3985FF', acc: null };
  return { char: me.char, color: me.color, acc: me.equipped || me.acc || null };
}
/** Avatar circular animado con el marco equipado. look = {char, color, acc} */
export function avatar(ui, owner, look, size = 64, opts = {}) {
  const frame = opts.frame ?? look?.acc?.frame ?? null;
  const cv = ui.preview(owner, size, size, (g, w, hh, t) => {
    g.save();
    g.beginPath(); g.arc(w / 2, hh / 2, w / 2 - 1, 0, TAU);
    const grd = g.createRadialGradient(w / 2, hh * 0.35, 2, w / 2, hh / 2, w / 2);
    grd.addColorStop(0, rgba(look.color || '#3985FF', 0.55));
    grd.addColorStop(1, 'rgba(11,16,32,0.95)');
    g.fillStyle = grd; g.fill();
    g.clip();
    drawCharacter(g, { id: look.char || 'volt', x: w / 2, y: hh * 1.16, s: w / 98, color: look.color || '#3985FF', anim: opts.anim || 'idle', t: t + (opts.seed || 0), acc: look.acc, shadow: false });
    g.restore();
    return opts.static ? 'static' : undefined;
  });
  return h('div.avatar' + (frame ? '.fr.fr-' + frame : ''), { style: { width: size + 'px', height: size + 'px', '--c': look.color } }, cv);
}

// ------------------------------------------------------------------ tarjeta de perfil
/**
 * Tarjeta de perfil con el estilo equipado. me = datos públicos (dc_profile/dc_me/fila de ranking).
 * opts: {compact, onClick, extra}
 */
export function profileCard(ui, owner, me, opts = {}) {
  const card = me?.equipped?.card || 'card_clasica';
  const L = levelInfo(me?.xp || 0);
  const look = lookOf(me);
  const games = me?.played ? Math.round(((me.wins || 0) / me.played) * 100) + '%' : '—';
  const el = h('div.pcard.pc-' + card + (opts.compact ? '.compact' : '') + (L.level === 67 ? '.chosen' : ''),
    { style: { '--c': me?.color || '#3985FF' } },
    h('div.pc-deco'),
    h('div.pc-top',
      avatar(ui, owner, look, opts.compact ? 64 : 96, { anim: opts.anim || 'idle' }),
      h('div.pc-id',
        h('div.pc-name', me?.name || '—', me?.online ? h('span.dot-online', { title: 'En línea' }) : null),
        h('div.pc-title.tr-' + titleRarity(me), titleOf(me)),
        h('div.pc-user', '@' + (me?.username || '')),
        h('div.pc-badges', levelBadge(L.level), resist(me?.rating || 1000)))),
    opts.compact ? null : h('div.pc-bar', xpBar(me?.xp || 0)),
    opts.compact ? null : h('div.pc-stats',
      stat(fmtN(me?.played), 'Partidas'), stat(fmtN(me?.wins), 'Victorias'), stat(games, '% victorias'),
      stat(fmtN(me?.best_streak), 'Mejor racha'), stat(fmtN(me?.achievements_count ?? (typeof me?.achievements === 'number' ? me.achievements : Object.keys(me?.achievements || {}).length)), 'Logros')),
    opts.extra || null);
  if (L.level === 67) el.append(h('div.pc-67', '67'));
  return el;
}
function stat(v, label) {
  return h('div.pc-stat', h('b', String(v)), h('small', label));
}

// ------------------------------------------------------------------ vista previa de objetos
const CHAR_CATS = new Set(['char', 'skin', 'hat', 'face', 'body']);
/** Vista previa visual de un objeto del catálogo. */
export function itemPreview(ui, owner, item, size = 120, color = '#3985FF', baseLook = null, still = false) {
  const cat = item.category;
  const ret = still ? 'static' : undefined;
  if (CHAR_CATS.has(cat)) {
    // vista limpia: solo el personaje con el objeto que se muestra
    const look = {};
    let char = baseLook?.char || 'volt';
    if (char === 'tuntun' && cat !== 'char') char = 'volt';
    if (cat === 'char') char = item.id.replace('char_', '');
    else look[cat] = item.id;
    return ui.preview(owner, size, size, (g, w, hh, t) => {
      drawCharacter(g, { id: char, x: w / 2, y: hh * 0.93, s: (w / 130) * (cat === 'hat' ? 0.92 : 1.0), color, anim: 'idle', t: still ? 0.6 : t, acc: look, shadow: true });
      return ret;
    });
  }
  if (cat === 'entrance' || cat === 'victory') {
    return ui.preview(owner, size, size, (g, w, hh, t) => {
      g.save();
      g.scale(w / 320, hh / 320);
      if (cat === 'entrance') {
        const k = (t % 2.4) / 2.4;
        drawEntrance(g, item.id, 160, 290, Math.min(1, k * 1.3), t, color);
        drawCharacter(g, { id: baseLook?.char || 'volt', x: 160, y: 290, s: 1.35, color, anim: k > 0.75 ? 'celebrate' : 'idle', t, acc: baseLook?.acc, alpha: Math.min(1, k * 2) });
      } else {
        drawVictory(g, item.id, 160, 300, t, color);
        drawCharacter(g, { id: baseLook?.char || 'volt', x: 160, y: 300, s: 1.35, color, anim: 'win', t, acc: baseLook?.acc });
      }
      g.restore();
      return still ? undefined : undefined;
    });
  }
  if (cat === 'emote') return h('div.emote-prev', { style: { width: size + 'px', height: size + 'px' } }, emoteBubble(item.id));
  if (cat === 'frame') return h('div.frame-prev', { style: { width: size + 'px', height: size + 'px' } }, avatar(ui, owner, { ...(baseLook || {}), color, acc: { ...(baseLook?.acc || {}), frame: item.id } }, Math.round(size * 0.7), { frame: item.id }));
  if (cat === 'card') {
    return h('div.card-prev', { style: { width: size + 'px', height: size + 'px' } },
      h('div.pcard.mini.pc-' + item.id, { style: { '--c': color } }, h('div.pc-deco'), h('b', item.name)));
  }
  if (cat === 'title') return h('div.title-prev', { style: { width: size + 'px', height: size + 'px' } }, h('span.pc-title.tr-' + item.rarity, item.name));
  return h('div', { style: { width: size + 'px', height: size + 'px' } });
}
export function emoteBubble(id) {
  const it = ITEM_BY_ID[id];
  const txt = {
    emo_gg: 'GG', emo_jaja: 'JAJA', emo_vacio: '…', emo_signo: '¿?', emo_cine: 'CINE ABSOLUTO', emo_contrato: 'ESTO NO ESTABA EN EL CONTRATO',
    emo_necesidad: 'QUÉ NECESIDAD', emo_aura: '+1000 AURA', emo_serio: '-_-', emo_empate: 'NADIE QUISO HACERSE CARGO',
    emo_creador: 'EL CREADOR', emo_s1_vamos: '¡VAMOS!', emo_s1_lag: 'FUE EL LAG', emo_s1_otra: 'OTRA', emo_s1_tilt: 'MODO TILT', emo_s1_ez: 'FÁCIL',
  }[id] || it?.name || '';
  return h('div.emote.em-' + (it?.rarity || 'common'), txt);
}

// ------------------------------------------------------------------ utilidades
export function tabs(list, current, onPick, cls = '') {
  return h('div.tabs' + (cls ? '.' + cls : ''), list.map(([id, label, ic]) =>
    h('button.tab' + (id === current ? '.on' : ''), { nav: true, onclick: () => onPick(id) }, ic ? icon(ic) : null, label)));
}
export function empty(text, ic = 'star') {
  return h('div.empty', icon(ic), h('p', text));
}
export function loading(text = 'Cargando…') {
  return h('div.loading', h('span.spinner'), text);
}
export function errorBox(text, retry) {
  return h('div.empty.err', icon('close'), h('p', text), retry ? h('button.btn.small', { nav: true, onclick: retry }, 'Reintentar') : null);
}
export function timeAgo(ts) {
  if (!ts) return '—';
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'recién';
  if (d < 3600) return `hace ${Math.floor(d / 60)} min`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)} h`;
  if (d < 86400 * 30) return `hace ${Math.floor(d / 86400)} d`;
  return new Date(ts).toLocaleDateString('es-AR');
}
export function gameChip(id) {
  return h('span.gchip', { style: { '--gc': GAME_COLORS[id] || '#9B6CFF' } }, GAME_NAMES[id] || id);
}
export const MASTERY_NAMES = ['Principiante', 'Aficionado', 'Competente', 'Experto', 'Maestro'];
export const MASTERY_COLORS = ['#8C96B8', '#48D597', '#3985FF', '#9B6CFF', '#FFD16B'];
export { LEVEL_TITLES, TITLES };

// ------------------------------------------------------------------ frases contextuales (no repetidas)
const PHRASES = {
  close: ['Ganó por un pelo. Qué necesidad.', 'Ganó por 0,003 segundos. Qué necesidad.', 'Esto se definió en el último suspiro.', 'Cine absoluto.'],
  blowout: ['Una victoria completamente innecesaria.', 'Eso no fue un duelo, fue un trámite.', '¿Y ESTE TIPO?', 'Alguien llame a un adulto.'],
  draw: ['La mediocridad fue compartida.', 'Nadie quiso hacerse cargo.', 'Empate técnico, emocional y espiritual.'],
  comeback: ['Cine absoluto.', 'Remontada de película. Nadie lo vio venir.', 'No estaba en el contrato.'],
  zero: ['No estaba en el contrato.', 'El marcador dice cero. El corazón también.', 'Mirada al vacío activada.'],
};
const recent = [];
export function phrase(kind) {
  const list = PHRASES[kind];
  if (!list) return null;
  const options = list.filter((p) => !recent.includes(p));
  const p = (options.length ? options : list)[Math.floor(Math.random() * (options.length || list.length))];
  recent.push(p);
  if (recent.length > 6) recent.shift();
  return p;
}
export { drawPieIcon };

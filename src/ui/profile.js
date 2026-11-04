// Perfil competitivo: tarjeta, nivel, título, KEKE, SUSI, PIES (solo el propio), cosméticos,
// estadísticas, minijuegos favoritos, récords, historial de 50 partidas, dominio, logros, colección y rivales.
import { h, icon } from './dom.js';
import { profileCard, tabs, loading, errorBox, empty, timeAgo, gameChip, fmtN, pies, resist, tierName, MASTERY_NAMES, MASTERY_COLORS, rarityChip, keke } from './kit.js';
import { GAME_IDS, GAME_NAMES, GAME_COLORS, ITEM_BY_ID, ALL_ITEMS, RARITIES, CATEGORIES, MASTERY_RANKS, masteryPoints, levelInfo } from '../data/catalog.js';
import { ACHIEVEMENTS, ACH_BY_ID, TIERS } from '../data/achievements.js';
import { errorText } from '../net/api.js';
import { h2hModal } from './club.js';

/** Gráfico simple (SVG) de la evolución de la SUSI. */
export function ratingChart(history, w = 520, hh = 150) {
  const pts = (history || []).map((r) => r.rating);
  if (pts.length < 2) return h('div.chart-empty', 'El gráfico aparece después de jugar partidas entre cuentas.');
  const min = Math.min(...pts) - 10, max = Math.max(...pts) + 10;
  const x = (i) => 8 + (i / (pts.length - 1)) * (w - 16);
  const y = (v) => 8 + (1 - (v - min) / (max - min || 1)) * (hh - 26);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = d + ` L${x(pts.length - 1)},${hh - 18} L${x(0)},${hh - 18} Z`;
  const svg = `<svg viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" role="img" aria-label="Evolución del SUSI">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9B6CFF" stop-opacity=".45"/><stop offset="1" stop-color="#9B6CFF" stop-opacity="0"/></linearGradient></defs>
    ${[0, 0.5, 1].map((k) => `<line x1="8" x2="${w - 8}" y1="${8 + k * (hh - 26)}" y2="${8 + k * (hh - 26)}" stroke="rgba(255,255,255,.08)"/>`).join('')}
    <path d="${area}" fill="url(#rg)"/><path d="${d}" fill="none" stroke="#B49BFF" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="${x(pts.length - 1)}" cy="${y(pts[pts.length - 1])}" r="4" fill="#fff"/>
    <text x="10" y="${hh - 4}" fill="#8C96B8" font-size="10">${Math.round(min + 10)}</text>
    <text x="${w - 10}" y="${hh - 4}" fill="#8C96B8" font-size="10" text-anchor="end">máx. ${Math.round(Math.max(...pts))} · actual ${pts[pts.length - 1]}</text></svg>`;
  const el = h('div.chart');
  el.innerHTML = svg;
  return el;
}

function resChip(r) {
  return h('span.res-badge.' + (r === 'W' ? 'w' : r === 'L' ? 'l' : 'd'), r === 'W' ? 'V' : r === 'L' ? 'D' : 'E');
}
/** Fila de historial desde el punto de vista de la cuenta (slot 0/1 en la partida). */
export function matchRow(m, onUser) {
  const mine = m.slot ?? 0;
  const opp = mine === 0 ? { name: m.p2_name, user: m.p2_user, color: m.p2_color } : { name: m.p1_name, user: m.p1_user, color: m.p1_color };
  const r = m.winner === -1 ? 'D' : m.winner === mine ? 'W' : 'L';
  const delta = mine === 0 ? m.delta1 : m.delta2;
  const score = mine === 0 ? `${m.score1 ?? ''} – ${m.score2 ?? ''}` : `${m.score2 ?? ''} – ${m.score1 ?? ''}`;
  return h('div.mrow',
    resChip(r), gameChip(m.game_id),
    h('span.mrow-vs', 'vs ', opp.user ? h('button.linkbtn', { nav: true, style: { '--c': opp.color || '#9B6CFF' }, onclick: () => onUser?.(opp.user) }, opp.name) : h('b', { style: { color: opp.color || '#8C96B8' } }, `${opp.name} (invitado)`)),
    h('b.mrow-score', score),
    delta ? h('span.mrow-delta' + (delta > 0 ? '.up' : '.down'), `${delta > 0 ? '+' : ''}${delta}`) : h('span.mrow-delta', m.legacy ? 'v. anterior' : '—'),
    h('small', timeAgo(m.created_at)));
}

export function profileSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const viewer = ctx.viewer;
  const mine = svc.slotAccount(viewer);
  const user = ctx.params.user || mine?.username;
  if (!user) {
    return {
      el: h('div.need-acc', icon('user'), h('h2', 'PERFIL'), h('p', 'Creá una cuenta o iniciá sesión para tener tu perfil competitivo, con nivel, KEKE, SUSI, PIES, logros y colección.'),
        h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => ctx.login(viewer) }, 'INICIAR SESIÓN / REGISTRARSE'),
        h('button.btn', { nav: true, onclick: () => ctx.goto('ranking') }, 'VER EL RANKING MUNDIAL')),
    };
  }
  const own = mine && mine.username === user;
  let tab = ctx.params.tab || 'general';
  let data = null;
  const body = h('div.prof-body', loading());
  const tabBar = h('div');
  const side = h('div.prof-side', loading());
  const openUser = (u) => ctx.goto('profile', { user: u });

  function renderTabs() {
    tabBar.replaceChildren(tabs([['general', 'General'], ['history', 'Historial'], ['games', 'Minijuegos'], ['achievements', 'Logros'], ['collection', 'Colección'], ['rivals', 'Rivales']], tab,
      (v) => { tab = v; app.audio.play('click'); renderTabs(); renderBody(); }));
  }
  function renderSide() {
    const d = own ? { ...data, ...mine, achievements: data.achievements } : data;
    const actions = h('div.prof-actions');
    if (own) {
      actions.append(
        h('button.btn.small', { nav: true, onclick: () => ctx.goto('inventory') }, icon('card'), 'PERSONALIZAR'),
        h('button.btn.small', { nav: true, onclick: () => ctx.goto('stats') }, icon('arrow'), 'ESTADÍSTICAS'));
    } else if (mine) {
      actions.append(
        h('button.btn.small.primary', { nav: true, onclick: () => addFriend() }, icon('user'), 'AGREGAR AMIGO'),
        h('button.btn.small', { nav: true, onclick: () => ui.modal(h2hModal, { a: mine.username, b: user }) }, icon('duel'), 'CARA A CARA'));
    }
    side.replaceChildren(
      profileCard(ui, owner, d, { anim: 'idle' }),
      own ? h('div.prof-wallet', pies(mine.pies, 'big'), keke(mine.keke)) : null,
      h('div.prof-meta',
        h('span', `Miembro desde ${new Date(d.created_at).toLocaleDateString('es-AR')}`),
        h('span', d.online ? 'En línea ahora' : `Última actividad: ${timeAgo(d.last_seen)}`),
        d.claimed === false ? h('span.warnline', 'Cuenta de la versión anterior pendiente de recuperar') : null),
      actions);
  }
  async function addFriend() {
    try {
      const r = await svc.friendRequest(viewer, user);
      ui.toast({ kind: 'achievement', icon: 'user', title: r.status === 'accepted' ? '¡Ahora son amigos!' : 'Solicitud enviada', name: '@' + user });
    } catch (e) {
      ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) });
    }
  }
  function renderBody() {
    if (!data) return;
    const d = data;
    if (tab === 'general') {
      const fav = GAME_IDS.map((g) => [g, d.mastery?.[g]]).filter(([, m]) => m?.played).sort((a, b) => b[1].played - a[1].played).slice(0, 4);
      const L = levelInfo(d.keke);
      body.replaceChildren(
        h('div.prof-grid',
          h('div.card', h('h3', 'SUSI'), h('div.res-big', resist(d.rating), h('small', `Mejor histórica: ${fmtN(d.best_rating)} · ${tierName(d.best_rating)}`)), ratingChart(d.rating_history, 520, 140)),
          h('div.card', h('h3', 'Progreso'),
            h('div.kv', h('span', 'Nivel'), h('b', `${L.level} · ${L.title}`)), h('div.kv', h('span', 'KEKE total'), h('b', fmtN(d.keke))),
            h('div.kv', h('span', 'Para el próximo nivel'), h('b', `${fmtN(L.need - L.into)} KEKE`)),
            h('div.kv', h('span', 'Competiciones ganadas'), h('b', fmtN(d.comp_wins))), h('div.kv', h('span', 'Torneos'), h('b', fmtN(d.tournaments))),
            h('div.kv', h('span', 'Logros'), h('b', `${Object.keys(d.achievements || {}).length} / ${ACHIEVEMENTS.length}`))),
          h('div.card', h('h3', 'Minijuegos favoritos'), fav.length ? h('div.fav-list', fav.map(([g, m]) => h('div.fav', gameChip(g), h('span', `${m.played} partidas · ${m.wins} victorias`), h('b', { style: { color: MASTERY_COLORS[m.rank] } }, MASTERY_NAMES[m.rank])))) : h('p.muted', 'Todavía no jugó minijuegos con esta cuenta.')),
          h('div.card', h('h3', 'Récords mundiales'), d.records?.length ? h('div.fav-list', d.records.map((r) => h('div.fav', gameChip(r.game), h('b', r.display)))) : h('p.muted', 'Ningún récord mundial… por ahora.'))));
    } else if (tab === 'history') {
      body.replaceChildren(d.matches?.length ? h('div.mlist', d.matches.map((m) => matchRow(m, openUser))) : empty('Sin partidas registradas todavía.', 'records'));
    } else if (tab === 'games') {
      body.replaceChildren(h('div.mast-list', GAME_IDS.map((g) => {
        const m = d.mastery?.[g] || { played: 0, wins: 0, losses: 0, draws: 0, rank: 0, best_streak: 0 };
        const pts = masteryPoints(m);
        const next = MASTERY_RANKS[m.rank + 1];
        const prev = MASTERY_RANKS[m.rank];
        const pct = next ? Math.min(100, ((pts - prev.points) / (next.points - prev.points)) * 100) : 100;
        return h('div.mast', { style: { '--gc': GAME_COLORS[g], '--mc': MASTERY_COLORS[m.rank] } },
          h('b.mast-name', GAME_NAMES[g]),
          h('span.mast-rank', MASTERY_NAMES[m.rank]),
          h('div.kbar', h('div.kbar-fill', { style: { width: pct + '%' } }), h('span', next ? `${pts} / ${next.points} pts` : 'MAESTRO')),
          h('span.mast-stats', `${m.played} PJ · ${m.wins} V · ${m.losses} D · ${m.draws} E · ${m.played ? Math.round((m.wins / m.played) * 100) : 0}% · racha ${m.best_streak}`),
          h('span.mast-rec', m.best_record != null ? `Mejor: ${Math.round(m.best_record * 100) / 100}` : ''));
      })), h('p.muted.small', 'Puntos de dominio = partidas jugadas + 2 × victorias. Cada rango da KEKE y PIES; el rango Maestro da una skin y un título exclusivos.'));
    } else if (tab === 'achievements') {
      const got = ACHIEVEMENTS.filter((a) => d.achievements?.[a.id]);
      body.replaceChildren(got.length ? h('div.ach-mini', got.map((a) => h('div.ach-chip', { style: { '--tc': TIERS[a.tier].color }, title: a.desc }, icon(a.icon), h('span', a.name))))
        : empty('Todavía no desbloqueó logros.', 'trophy'),
      own ? h('button.btn.small', { nav: true, onclick: () => ctx.goto('achievements') }, 'VER TODOS LOS LOGROS') : null);
    } else if (tab === 'collection') {
      const owned = new Set(d.inventory || []);
      const items = ALL_ITEMS.filter((it) => owned.has(it.id));
      const byCat = {};
      for (const it of items) (byCat[it.category] ||= []).push(it);
      body.replaceChildren(items.length
        ? h('div.coll', Object.entries(byCat).map(([c, l]) => h('div.coll-cat', h('h4', `${CATEGORIES[c]?.name || c} · ${l.length}`),
          h('div.coll-items', l.sort((a, b) => RARITIES[b.rarity].order - RARITIES[a.rarity].order).map((it) => h('span.coll-item', { style: { '--rr': RARITIES[it.rarity].color } }, it.name))))))
        : empty('Solo tiene los objetos iniciales.', 'card'),
      h('p.muted.small', `${items.length} objetos desbloqueados (sin contar los iniciales).`));
    } else if (tab === 'rivals') {
      const map = new Map();
      for (const m of d.matches || []) {
        const ms = m.slot ?? 0;
        const u = ms === 0 ? m.p2_user : m.p1_user;
        if (!u) continue;
        const name = ms === 0 ? m.p2_name : m.p1_name;
        const r = map.get(u) || { u, name, w: 0, l: 0, d: 0 };
        if (m.winner === -1) r.d++; else if (m.winner === ms) r.w++; else r.l++;
        map.set(u, r);
      }
      const rows = [...map.values()].sort((a, b) => b.w + b.l + b.d - (a.w + a.l + a.d));
      body.replaceChildren(rows.length ? h('div.riv-list', rows.map((r) => h('div.riv',
        h('button.linkbtn', { nav: true, onclick: () => openUser(r.u) }, r.name),
        h('span', `${r.w} V · ${r.l} D · ${r.d} E`),
        h('button.btn.small', { nav: true, onclick: () => ui.modal(h2hModal, { a: user, b: r.u }) }, icon('duel'), 'CARA A CARA'))))
        : empty('Todavía no tiene rivales con cuenta (en las últimas 50 partidas).', 'duel'));
    }
  }
  async function load() {
    try {
      data = await svc.profile(user);
      if (owner.disposed) return;
      renderSide();
      renderTabs();
      renderBody();
    } catch (e) {
      if (!owner.disposed) side.replaceChildren(errorBox(errorText(e), load)), body.replaceChildren();
    }
  }
  load();
  return { el: h('div.profile', side, h('div.prof-main', h('div.sec-head', h('h2', own ? 'MI PERFIL' : 'PERFIL'), !own && mine ? h('button.btn.small.ghost', { nav: true, onclick: () => ctx.goto('profile') }, icon('back'), 'MI PERFIL') : null), tabBar, body)) };
}

// CLUB: perfiles de jugador con tarjeta (estilo, nivel, XP, ELO, insignias), amigos,
// buscador de cuentas, historial personal, rivales (cara a cara) y juegos favoritos.
import { h, icon } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { drawCharacter } from '../core/characters.js';
import { ACH_BY_ID, ACHIEVEMENTS } from '../core/achievementManager.js';
import { CARD_THEMES, levelInfo } from '../core/accountService.js';
import { GAMES, GAME_BY_ID } from '../games/index.js';
import { fmtDate, shade, TAU } from '../core/utils.js';
import { drawStar } from '../core/renderer.js';

const RES_LABEL = { W: 'Victoria', L: 'Derrota', D: 'Empate' };

/** Tarjeta de perfil de una cuenta. */
export function profileCard(ui, owner, a) {
  const svc = ui.app.accounts;
  const lv = levelInfo(a.xp);
  const theme = CARD_THEMES.find((t) => t.id === a.card) || CARD_THEMES[0];
  const ca = theme.a || a.color, cb = theme.b || shade(a.color, -0.55);
  const m = a.stats.minigames;
  const tot = m.wins + m.losses + m.draws;
  const rank = svc.rankOf(a.id);
  const fav = svc.favoriteGame(a);
  const badges = Object.entries(a.achievements).sort((x, y) => y[1].ts - x[1].ts).slice(0, 5).map(([id]) => ACH_BY_ID[id]).filter(Boolean);
  const art = ui.preview(owner, 300, 136, (g, w, hh, t) => {
    if (theme.stars) {
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`;
        g.fillRect((i * 97) % w, (i * 53) % hh, 2, 2);
      }
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(w / 2, hh - 12, 62, 10, 0, 0, TAU); g.stroke();
    drawCharacter(g, { id: a.char, x: w / 2, y: hh - 12, s: 1.1, color: a.color, anim: Math.floor(t / 3) % 3 === 2 ? 'celebrate' : 'idle', t, acc: a.acc });
    if (lv.level >= 10) {
      g.fillStyle = '#FFE08A';
      drawStar(g, w - 26, 24, 12, 5, 5, t); g.fill();
    }
  });
  return h('div.pcard' + (theme.stars ? '.galaxy' : ''), { style: { '--a': ca, '--b': cb, '--pc': a.color } },
    h('div.pcard-top',
      h('span.pcard-level', `NV ${lv.level}`),
      h('span.pcard-title', lv.title),
      h('span.pcard-rank', rank ? `#${rank} MUNDIAL` : '')),
    art,
    h('div.pcard-name', a.name),
    h('div.pcard-xp', h('div.pcard-bar', h('i', { style: { width: Math.round(lv.progress * 100) + '%' } })), h('small', `${lv.into} / ${lv.need} XP para el nivel ${lv.level + 1}`)),
    h('div.pcard-stats',
      stat(a.rating, 'ELO'), stat(a.stats.played, 'Partidas'), stat(tot ? Math.round((m.wins / tot) * 100) + '%' : '—', 'Victorias'), stat(a.stats.bestStreak, 'Mejor racha')),
    h('div.pcard-badges', ...(badges.length ? badges.map((b) => h('span.pcard-badge', { title: b.name }, icon(b.icon))) : [h('small', 'Sin insignias todavía')]),
      h('small.pcard-count', `${Object.keys(a.achievements).length}/${ACHIEVEMENTS.length}`)),
    h('div.pcard-foot', h('span', fav ? `Favorito: ${fav.name}` : 'Favorito: —'), h('span', `Desde ${fmtDate(a.createdAt).split(',')[0]}`)));
}
function stat(v, l) {
  return h('div', h('b', String(v)), h('small', l));
}

export function clubScreen(ui, params = {}) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  const slotIds = () => [0, 1].map((p) => svc.slotAccount(p)?.id || null);
  let selected = params.select || slotIds().find(Boolean) || svc.ranking()[0]?.id || null;
  let tab = 'history';

  const search = h('input.acc-input.club-search#club-search', { type: 'text', maxlength: 16, placeholder: 'Buscar jugador…', autocomplete: 'off', spellcheck: 'false', nav: true, 'aria-label': 'Buscar jugador' });
  const results = h('div.club-list');
  const sideRest = h('div.club-side-rest');
  const cardCol = h('div.club-card');
  const detail = h('div.club-detail');
  search.addEventListener('input', () => renderResults());

  const row = (a, extra = null) => h('button.club-row' + (a.id === selected ? '.sel' : ''), { nav: true, onclick: () => { selected = a.id; app.audio.play('click'); renderAll(); } },
    ui.preview(scr, 34, 34, (g, w, hh, t) => drawCharacter(g, { id: a.char, x: w / 2, y: hh - 2, s: 0.36, color: a.color, anim: 'idle', t, acc: a.acc, shadow: false })),
    h('span.club-row-main', h('b', { style: { color: a.color } }, a.name), h('small', `Nv ${levelInfo(a.xp).level} · ${a.rating} ELO`)),
    extra);

  function renderResults() {
    const q = search.value.trim();
    const list = q ? svc.search(q) : [];
    results.replaceChildren(...(q && !list.length ? [h('small.muted', 'No hay jugadores con ese nombre.')] : list.map((a) => row(a))));
  }

  function renderSide() {
    const ids = slotIds();
    const parts = [];
    const here = ids.map((id) => svc.get(id)).filter(Boolean);
    parts.push(h('h4', 'EN ESTA COMPU'));
    if (here.length) parts.push(...here.map((a) => row(a, h('span.chip', `J${ids.indexOf(a.id) + 1}`))));
    else parts.push(h('p.muted.club-hint', 'Nadie inició sesión. Entrá desde JUGADORES Y CUENTAS para tener perfil y amigos.'));
    for (const a of here) {
      parts.push(h('h4', `AMIGOS DE ${a.name.toUpperCase()}`));
      const fr = a.friends.map((id) => svc.get(id)).filter(Boolean);
      parts.push(...(fr.length ? fr.map((f) => row(f)) : [h('p.muted.club-hint', 'Todavía sin amigos. Buscá un jugador y agregalo.')]));
    }
    const top = svc.ranking().slice(0, 5);
    if (top.length) {
      parts.push(h('h4', 'TOP DEL RANKING'));
      parts.push(...top.map((a, i) => row(a, h('span.chip', `#${i + 1}`))));
    }
    sideRest.replaceChildren(...parts);
  }

  function renderCard() {
    const a = svc.get(selected);
    if (!a) {
      cardCol.replaceChildren(h('div.empty', svc.mode === 'connecting' ? 'Cargando perfiles…' : 'Todavía no hay cuentas. Creá una desde JUGADORES Y CUENTAS.'));
      return;
    }
    const ids = slotIds();
    const mine = ids.indexOf(a.id);
    const actions = h('div.club-actions');
    if (mine >= 0) {
      const lv = levelInfo(a.xp).level;
      actions.append(h('small', 'ESTILO DE TARJETA'), h('div.seg', ...CARD_THEMES.map((t) => {
        const locked = lv < t.level;
        return h('button.seg-btn' + (a.card === t.id ? '.active' : ''), {
          nav: true, title: locked ? `Se desbloquea en el nivel ${t.level}` : t.name,
          onclick: () => { if (locked) { app.audio.play('error'); ui.toast({ title: 'Estilo bloqueado', text: `“${t.name}” se desbloquea en el nivel ${t.level}.`, kind: 'warn', time: 2200 }); return; } svc.setCard(mine, t.id); app.audio.play('click'); renderAll(); },
        }, locked ? icon('lock') : h('i.swatch-dot', { style: { background: t.a ? `linear-gradient(135deg, ${t.a}, ${t.b})` : a.color } }), t.name);
      })));
    }
    for (const p of [0, 1]) {
      const me = svc.get(ids[p]);
      if (!me || me.id === a.id) continue;
      const isF = me.friends.includes(a.id);
      actions.append(h('button.btn.small' + (isF ? '.ghost' : '.green'), {
        nav: true, disabled: !svc.canWrite || null,
        onclick: () => {
          if (isF) svc.removeFriend(p, a.id); else svc.addFriend(p, a.id);
          app.audio.play(isF ? 'back' : 'confirm');
          if (!isF) ui.toast({ title: 'Amigos', name: `${a.name} ahora es amigo de ${me.name}`, time: 2200 });
          renderAll();
        },
      }, icon(isF ? 'close' : 'user'), isF ? `Quitar de amigos de ${me.name}` : `Agregar a amigos de ${me.name}`));
    }
    cardCol.replaceChildren(profileCard(ui, scr, a), actions);
  }

  function renderDetail() {
    const a = svc.get(selected);
    if (!a) { detail.replaceChildren(); return; }
    const tabs = h('div.tabs', ...[['history', 'HISTORIAL'], ['rivals', 'RIVALES'], ['games', 'JUEGOS'], ['ach', 'LOGROS']].map(([id, label]) =>
      h('button.tab' + (tab === id ? '.active' : ''), { nav: true, onclick: () => { tab = id; app.audio.play('click'); renderDetail(); } }, label)));
    let content;
    if (tab === 'history') {
      content = a.history.length ? h('div.club-hist', ...a.history.map((e) => h('div.club-hrow',
        h('span.res-badge.' + e.res, e.res === 'W' ? 'V' : e.res === 'L' ? 'D' : 'E'),
        h('span.club-hgame', e.game && GAME_BY_ID[e.game] ? gameIcon(ui, scr, GAME_BY_ID[e.game].meta, 30) : null, h('span', h('b', e.title), h('small', `${RES_LABEL[e.res]} vs `, h('span', { style: { color: e.opp.color } }, e.opp.name)))),
        h('span.club-hscore', e.score),
        h('span.club-helo' + (e.elo > 0 ? '.up' : e.elo < 0 ? '.down' : ''), e.elo ? `${e.elo > 0 ? '+' : ''}${e.elo} ELO` : '—'),
        h('small.muted', fmtDate(e.ts)))))
        : h('div.empty', 'Sin partidas todavía.');
    } else if (tab === 'rivals') {
      const list = Object.entries(a.h2h).map(([id, [w, d, l]]) => ({ id, w, d, l, n: w + d + l, acc: svc.get(id) })).sort((x, y) => y.n - x.n).slice(0, 12);
      content = list.length ? h('div.club-hist', ...list.map((r) => h('div.club-hrow',
        h('span.club-hgame', h('span', h('b', { style: { color: r.acc?.color || '#F6F7FB' } }, r.acc?.name || r.id), h('small', `${r.n} partidas`))),
        h('span.club-rec', `${r.w} V · ${r.d} E · ${r.l} D`),
        h('div.bar.wide', h('i', { style: { width: (r.w / r.n) * 100 + '%', background: '#48D597' } }), h('i', { style: { width: (r.d / r.n) * 100 + '%', background: '#8C96B8' } }), h('i', { style: { width: (r.l / r.n) * 100 + '%', background: '#FF654F' } })),
        r.acc ? h('button.btn.small.ghost', { nav: true, onclick: () => { selected = r.id; renderAll(); } }, 'Ver perfil') : null)))
        : h('div.empty', 'Todavía no jugó contra otras cuentas.');
    } else if (tab === 'games') {
      const max = Math.max(1, ...Object.values(a.stats.gamesWon));
      content = h('div.club-hist', ...GAMES.map((G) => {
        const m = G.meta;
        const wins = a.stats.gamesWon[m.id] || 0;
        const rec = a.records[m.id];
        return h('div.club-hrow',
          h('span.club-hgame', gameIcon(ui, scr, m, 30), h('span', h('b', m.name), h('small', rec != null ? `Récord: ${m.record.format ? m.record.format(rec) : rec}` : 'Sin récord'))),
          h('div.bar.wide', h('i', { style: { width: (wins / max) * 100 + '%', background: m.color } })),
          h('span.club-rec', `${wins} ${wins === 1 ? 'victoria' : 'victorias'}`));
      }));
    } else {
      content = h('div.club-ach', ...ACHIEVEMENTS.map((x) => h('span.pcard-badge' + (a.achievements[x.id] ? '.on' : ''), { title: `${x.name}: ${x.desc}` }, icon(a.achievements[x.id] ? x.icon : 'lock'))));
    }
    detail.replaceChildren(tabs, h('div.club-detail-body', content));
  }

  function renderAll() {
    renderSide();
    renderResults();
    renderCard();
    renderDetail();
  }

  scr.el = h('div.page',
    header(ui, 'CLUB', 'Perfiles, amigos, historial y rivales de cada jugador.', () => (params.back ? ui.show(params.back) : ui.goMenu()),
      h('div.acc-status' + (svc.mode === 'cloud' ? '.on' : ''), icon(svc.mode === 'cloud' ? 'records' : 'user'), h('span', svc.modeLabel))),
    h('div.club-body',
      h('div.club-side', search, results, sideRest),
      cardCol,
      detail));
  renderAll();
  const unsub = svc.on(() => { if (!scr.disposed) { renderSide(); renderCard(); renderDetail(); } });
  scr.destroy = () => unsub();
  scr.onBack = () => (params.back ? ui.show(params.back) : ui.goMenu());
  return scr;
}

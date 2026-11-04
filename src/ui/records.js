// RECORDS: ranking mundial de cuentas (ELO), estadísticas de los jugadores actuales,
// récords mundiales por minijuego, logros de cada jugador e historial del club.
import { h, icon } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { GAMES } from '../games/index.js';
import { ACHIEVEMENTS, rewardOf } from '../core/achievementManager.js';
import { drawCharacter } from '../core/characters.js';
import { fmtDuration, fmtDate } from '../core/utils.js';
import { clubScreen } from './club.js';
import { levelInfo } from '../core/accountService.js';

const MODE_NAMES = { duel: 'Duel Mode', tournament: 'Torneo', survival: 'Survival', quick: 'Quick Play' };

export function recordsScreen(ui, params = {}) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  const st = app.save.stats;
  let tab = params.tab || 'ranking';
  let achP = 0;
  const body = h('div.rec-body');
  const modeLine = h('span.acc-status' + (svc.mode === 'cloud' ? '.on' : ''), icon(svc.mode === 'cloud' ? 'records' : 'user'), h('span', svc.modeLabel));
  const tabs = h('div.tabs', ...[['ranking', 'RANKING'], ['summary', 'JUGADORES'], ['games', 'RÉCORDS'], ['ach', 'LOGROS'], ['history', 'HISTORIAL']].map(([id, label]) =>
    h('button.tab', { nav: true, dataset: { id }, 'data-autofocus': id === tab || null, onclick: () => { tab = id; app.audio.play('click'); render(); } }, label)));

  const avatar = (a, size = 34) => ui.preview(scr, size, size, (g, w, hh, t) =>
    drawCharacter(g, { id: a.char, x: w / 2, y: hh - 2, s: size / 95, color: a.color, anim: 'idle', t, acc: a.acc, shadow: false }));

  function ranking() {
    const list = svc.ranking().slice(0, 100);
    const here = [app.profiles[0].accountId, app.profiles[1].accountId];
    if (!list.length) {
      return h('div.empty',
        h('p', svc.mode === 'connecting' ? 'Cargando el ranking…' : 'Todavía no hay cuentas en el ranking.'),
        svc.canWrite ? h('p.muted', 'Creá la primera desde EDITAR JUGADORES → ENTRAR / CREAR CUENTA.') : null);
    }
    return h('div',
      svc.loadSlow ? h('p.muted', 'El ranking tarda en responder; puede que no esté actualizado.') : null,
      h('table.table.rank-table',
        h('thead', h('tr', ...['#', 'Jugador', 'ELO', 'Partidas', 'V · E · D', '% victorias', 'Mejor racha', 'Copas', 'Logros'].map((x) => h('th', x)))),
        h('tbody', ...list.map((a, i) => {
          const m = a.stats.minigames;
          const tot = m.wins + m.losses + m.draws;
          const slot = here.indexOf(a.id);
          return h('tr.clickable' + (slot >= 0 ? '.me' : ''), { nav: true, tabindex: 0, title: 'Ver perfil', onclick: () => { app.audio.play('click'); ui.show(clubScreen, { select: a.id, back: (u) => recordsScreen(u, { tab: 'ranking' }) }); } },
            h('td.rank-pos', i < 3 ? h('span.medal.m' + (i + 1), String(i + 1)) : String(i + 1)),
            h('td', h('div.gname', avatar(a), h('span', { style: { color: a.color } }, a.name), h('small.lvl', `Nv ${levelInfo(a.xp).level}`), slot >= 0 ? h('span.chip', `J${slot + 1}`) : null)),
            h('td', h('b.elo', String(a.rating))),
            h('td', String(a.stats.played)),
            h('td', `${m.wins} · ${m.draws} · ${m.losses}`),
            h('td', tot ? Math.round((m.wins / tot) * 100) + '%' : '—'),
            h('td', String(a.stats.bestStreak)),
            h('td', String(a.stats.competitions.wins)),
            h('td', `${Object.keys(a.achievements).length}/${ACHIEVEMENTS.length}`));
        }))),
      h('p.muted', { style: { fontSize: '12.5px', marginTop: '10px' } },
        'El ELO sube al ganarle a otra cuenta y baja al perder (más si el rival tenía menos puntos). Las partidas contra invitados no cambian el ELO.'));
  }

  function summary() {
    const card = (p) => {
      const prof = app.profiles[p];
      const acc = svc.slotAccount(p);
      const s = acc ? acc.stats : st.players[p];
      const total = s.minigames.wins + s.minigames.losses + s.minigames.draws;
      const pct = total ? Math.round((s.minigames.wins / total) * 100) : 0;
      return h('div.rec-player', { style: { '--c': prof.color } },
        ui.preview(scr, 120, 130, (g, W, H, t) => drawCharacter(g, { id: prof.char, x: W / 2, y: H - 8, s: 1.05, color: prof.color, anim: 'idle', t: t + p, acc: prof.acc, facing: p ? -1 : 1 })),
        h('div', h('h3', prof.name, h('span.chip', { style: { marginLeft: '10px', verticalAlign: 'middle', borderColor: prof.color, color: prof.color, background: 'transparent' } }, acc ? `J${p + 1} · ${acc.rating} ELO` : `J${p + 1} · INVITADO`)),
          h('div.kv',
            kv('Victorias', s.minigames.wins), kv('Derrotas', s.minigames.losses), kv('Empates', s.minigames.draws),
            kv('% victorias', pct + '%'), kv('Mejor racha', s.bestStreak), kv('Copas', s.competitions.wins),
            kv('Comp. perdidas', s.competitions.losses), kv('Torneos', s.tournaments), kv('Racha actual', s.streak))));
    };
    const mostPlayed = GAMES.map((G) => [G.meta, st.games[G.meta.id]?.played || 0]).sort((a, b) => b[1] - a[1]).filter((x) => x[1] > 0).slice(0, 3);
    return h('div',
      h('div.rec-summary', card(0), card(1)),
      h('p.muted', { style: { fontSize: '12.5px' } }, 'Los jugadores con cuenta muestran sus estadísticas de todas las computadoras; los invitados, las de este navegador.'),
      h('div.rec-global',
        h('div.champ-stat', h('small', 'Minijuegos en esta compu'), h('b', String(st.totalMinigames))),
        h('div.champ-stat', h('small', 'Tiempo jugado aquí'), h('b', fmtDuration(st.totalTime))),
        h('div.champ-stat', h('small', 'Mejor racha (esta compu)'), h('b', st.bestStreak.value ? `${st.bestStreak.value} · ${st.bestStreak.name}` : '—')),
        h('div.champ-stat', h('small', 'Survival: mejor etapa'), h('b', st.survivalBest.stage ? `${st.survivalBest.stage} · ${st.survivalBest.name}` : '—')),
        h('div.champ-stat', h('small', 'Competiciones Duel'), h('b', String(st.competitions.duel || 0))),
        h('div.champ-stat', h('small', 'Torneos jugados'), h('b', String(st.competitions.tournament || 0))),
        h('div.champ-stat', h('small', 'Partidas de Survival'), h('b', String(st.competitions.survival || 0))),
        h('div.champ-stat', h('small', 'Más jugados'), h('b', { style: { fontSize: '15px' } }, mostPlayed.length ? mostPlayed.map(([m, n]) => `${m.name} (${n})`).join(' · ') : '—'))));
  }

  function games() {
    const recs = svc.records || {};
    const rows = GAMES.map((G) => ({ m: G.meta, g: st.games[G.meta.id] || { played: 0, wins: [0, 0], draws: 0, best: null }, w: recs[G.meta.id] }));
    return h('table.table',
      h('thead', h('tr', h('th', 'Minijuego'), h('th', 'Récord mundial'), h('th', 'Récord en esta compu'), h('th', 'Jugado aquí'))),
      h('tbody', ...rows.map(({ m, g, w }) => h('tr',
        h('td', h('div.gname', gameIcon(ui, scr, m, 36), m.name)),
        h('td', w ? h('span', h('b', { style: { color: '#FFC93C' } }, w.display), ' · ', h('span', { style: { color: w.color } }, w.name), h('div.muted', { style: { fontSize: '11.5px' } }, `${m.record.label} · ${fmtDate(w.date)}`)) : h('span.muted', 'Sin récord todavía')),
        h('td', g.best ? h('span', h('b', g.best.display), ` · ${g.best.name}`) : h('span.muted', '—')),
        h('td', String(g.played))))),
    );
  }

  function achievements() {
    const prof = app.profiles[achP];
    const acc = svc.slotAccount(achP);
    const scope = app.achievements.scope(achP);
    const me = app.achievements.statsFor(achP);
    const got = Object.keys(scope).length;
    const pick = h('div.row', ...[0, 1].map((p) => h('button.seg-btn' + (p === achP ? '.active' : ''), { nav: true, onclick: () => { achP = p; app.audio.play('click'); render(); } },
      `J${p + 1} · ${app.profiles[p].name}`)));
    return h('div',
      h('div.row', { style: { marginBottom: '12px', flexWrap: 'wrap' } }, pick,
        h('span.muted', `${acc ? `Logros de la cuenta ${prof.name}` : 'Logros de los invitados en esta compu'}: ${got} de ${ACHIEVEMENTS.length}.`)),
      h('div.ach-grid', ...ACHIEVEMENTS.map((a) => {
        const u = scope[a.id];
        const r = rewardOf(a.id);
        const pr = a.progress ? a.progress(me) : null;
        return h('div.ach' + (u ? '.on' : ''), { nav: true, tabindex: 0 },
          h('div.ach-badge', icon(u ? a.icon : 'lock')),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('b', a.name),
            h('span', a.desc),
            r ? h('span.reward', `Recompensa: ${r.type === 'char' ? 'personaje' : 'accesorio'} ${r.name}`) : null,
            u ? h('span', { style: { color: '#FFC93C', fontSize: '11px' } }, fmtDate(u.ts)) : pr ? h('div.prog', h('i', { style: { width: Math.min(100, (pr[0] / pr[1]) * 100) + '%' } })) : null));
      })));
  }

  function histRows(list) {
    return list.map((e) => {
      const [a, b] = e.players;
      const win = e.winner >= 0 ? e.players[e.winner] : null;
      return h('div.hist-row', { nav: true, tabindex: 0 },
        h('span.muted', fmtDate(e.ts)),
        h('span', h('b', MODE_NAMES[e.mode] || e.mode), h('div.muted', { style: { fontSize: '12px' } }, e.mode === 'quick' ? e.title : e.detail)),
        h('span.who', h('span.dotc', { style: { background: a.color } }), a.name, h('b', `${e.score[0]} – ${e.score[1]}`), b.name, h('span.dotc', { style: { background: b.color } })),
        h('span', { style: { color: win ? win.color : '#8C96B8', fontFamily: 'var(--display)', textAlign: 'right' } }, win ? `Ganó ${win.name}` : 'Empate'));
    });
  }
  function history() {
    const club = svc.mode === 'local' ? [] : svc.feed || [];
    const local = app.save.history;
    if (!club.length && !local.length) return h('div.empty', 'Todavía no hay partidas registradas. ¡A jugar!');
    return h('div',
      club.length ? h('h3.hist-title', 'EN TODO EL CLUB') : null,
      ...histRows(club),
      local.length ? h('h3.hist-title', 'EN ESTA COMPU') : null,
      ...histRows(local));
  }

  function render() {
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.id === tab));
    const top = body.scrollTop;
    body.replaceChildren(tab === 'ranking' ? ranking() : tab === 'summary' ? summary() : tab === 'games' ? games() : tab === 'ach' ? achievements() : history());
    body.scrollTop = params.keepScroll ? top : 0;
    modeLine.lastChild.textContent = svc.modeLabel;
  }
  scr.el = h('div.page', header(ui, 'RECORDS', null, () => ui.goMenu(), tabs), h('div.rec-mode', modeLine), body);
  scr.el.querySelector('.page-header .grow').append(h('p', 'Ranking mundial, récords y logros.'));
  render();
  // el ranking se actualiza en vivo cuando otras computadoras guardan resultados
  const unsub = svc.on(() => {
    if (scr.disposed || (tab !== 'ranking' && tab !== 'games' && tab !== 'history')) return;
    params.keepScroll = true;
    render();
    params.keepScroll = false;
  });
  scr.destroy = () => unsub();
  scr.onBack = () => ui.goMenu();
  return scr;
}

function kv(k, v) {
  return h('div', h('small', k), h('b', String(v)));
}

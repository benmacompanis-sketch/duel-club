// RÉCORDS DE ESTA COMPU: estadísticas locales (incluye partidas de invitados), récords locales por
// minijuego e historial de esta computadora. El progreso de las cuentas está en el servidor.
import { h } from './dom.js';
import { header, gameIcon } from './widgets.js';
import { GAMES } from '../games/index.js';
import { drawCharacter } from '../core/characters.js';
import { fmtDuration, fmtDate } from '../core/utils.js';

const MODE_NAMES = { duel: 'Duel Mode', tournament: 'Torneo', survival: 'Survival', quick: 'Quick Play' };

export function recordsScreen(ui, params = {}) {
  const app = ui.app;
  const scr = {};
  const st = app.save.stats;
  let tab = params.tab || 'summary';
  const body = h('div.rec-body');
  const goBack = () => (params.back ? params.back() : ui.goMenu());
  const tabs = h('div.tabs', ...[['summary', 'RESUMEN'], ['games', 'RÉCORDS LOCALES'], ['history', 'HISTORIAL']].map(([id, label]) =>
    h('button.tab', { nav: true, dataset: { id }, 'data-autofocus': id === tab || null, onclick: () => { tab = id; app.audio.play('click'); render(); } }, label)));

  function summary() {
    const card = (p) => {
      const prof = app.profiles[p];
      const s = st.players[p];
      const total = s.minigames.wins + s.minigames.losses + s.minigames.draws;
      const pct = total ? Math.round((s.minigames.wins / total) * 100) : 0;
      return h('div.rec-player', { style: { '--c': prof.color } },
        ui.preview(scr, 120, 130, (g, W, H, t) => drawCharacter(g, { id: prof.char, x: W / 2, y: H - 8, s: 1.05, color: prof.color, anim: 'idle', t: t + p, acc: prof.acc, facing: p ? -1 : 1 })),
        h('div', h('h3', `Puesto J${p + 1}`),
          h('div.kv',
            kv('Victorias', s.minigames.wins), kv('Derrotas', s.minigames.losses), kv('Empates', s.minigames.draws),
            kv('% victorias', pct + '%'), kv('Mejor racha', s.bestStreak), kv('Copas', s.competitions.wins),
            kv('Comp. perdidas', s.competitions.losses), kv('Torneos', s.tournaments), kv('Racha actual', s.streak))));
    };
    const mostPlayed = GAMES.map((G) => [G.meta, st.games[G.meta.id]?.played || 0]).sort((a, b) => b[1] - a[1]).filter((x) => x[1] > 0).slice(0, 3);
    return h('div',
      h('p.muted', { style: { fontSize: '13px' } }, 'Estos números son de ESTA computadora (por puesto J1/J2, con o sin cuenta). El progreso de cada cuenta está en PERFIL y ESTADÍSTICAS.'),
      h('div.rec-summary', card(0), card(1)),
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
    return h('table.table',
      h('thead', h('tr', h('th', 'Minijuego'), h('th', 'Récord en esta compu'), h('th', 'Jugado aquí'))),
      h('tbody', ...GAMES.map((G) => {
        const m = G.meta;
        const g = st.games[m.id] || { played: 0, best: null };
        return h('tr',
          h('td', h('div.gname', gameIcon(ui, scr, m, 36), m.name)),
          h('td', g.best ? h('span', h('b', g.best.display), ` · ${g.best.name}`, h('div.muted', { style: { fontSize: '11.5px' } }, `${m.record?.label || ''} · ${fmtDate(g.best.date)}`)) : h('span.muted', '—')),
          h('td', String(g.played)));
      })));
  }
  function history() {
    const local = app.save.history;
    if (!local.length) return h('div.empty', 'Todavía no hay partidas registradas en esta compu. ¡A jugar!');
    return h('div', ...local.map((e) => {
      const [a, b] = e.players;
      const win = e.winner >= 0 ? e.players[e.winner] : null;
      return h('div.hist-row', { nav: true, tabindex: 0 },
        h('span.muted', fmtDate(e.ts)),
        h('span', h('b', MODE_NAMES[e.mode] || e.mode), h('div.muted', { style: { fontSize: '12px' } }, e.mode === 'quick' ? e.title : e.detail)),
        h('span.who', h('span.dotc', { style: { background: a.color } }), a.name, h('b', `${e.score[0]} – ${e.score[1]}`), b.name, h('span.dotc', { style: { background: b.color } })),
        h('span', { style: { color: win ? win.color : '#8C96B8', fontFamily: 'var(--display)', textAlign: 'right' } }, win ? `Ganó ${win.name}` : 'Empate'));
    }));
  }
  function render() {
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.id === tab));
    body.replaceChildren(tab === 'summary' ? summary() : tab === 'games' ? games() : history());
    body.scrollTop = 0;
  }
  scr.el = h('div.page', header(ui, 'ESTA COMPU', 'Estadísticas, récords e historial locales', goBack, tabs), body);
  render();
  scr.onBack = goBack;
  return scr;
}

function kv(k, v) {
  return h('div', h('small', k), h('b', String(v)));
}

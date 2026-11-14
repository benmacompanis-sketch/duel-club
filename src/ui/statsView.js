// Estadísticas generales de la cuenta (servidor) + historial de PIES + datos de esta computadora.
import { h, icon } from './dom.js';
import { tabs, loading, errorBox, empty, fmtN, pies, xp, resist, tierName, timeAgo, gameChip } from './kit.js';
import { ratingChart, matchRow } from './profile.js';
import { GAME_IDS, GAME_NAMES, ITEM_BY_ID, levelInfo } from '../data/catalog.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { errorText } from '../net/api.js';
import { recordsScreen } from './records.js';
import { hubScreen } from './hub.js';

const REASONS = {
  welcome: 'Bono de bienvenida', match: 'Partida', competition: 'Competición', achievement: 'Logro', level: 'Subida de nivel',
  level_bonus: 'Premio de nivel', mastery: 'Rango de dominio', record: 'Récord mundial', buy: 'Compra en PIE STORE', legacy: 'Conversión de la versión anterior',
};

export function statsSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  let tab = ctx.params.tab || 'general';
  const bar = h('div');
  const body = h('div.stats-body');
  const localBtn = h('button.btn.small.ghost', { nav: true, onclick: () => { app.audio.play('click'); ui.show(recordsScreen, { back: () => ui.show(hubScreen, { section: 'stats' }) }); } }, icon('records'), 'RÉCORDS DE ESTA COMPU');
  if (!me) {
    return {
      el: h('div.need-acc', icon('arrow'), h('h2', 'ESTADÍSTICAS'), h('p', 'Con una cuenta se guardan tus estadísticas completas, tu evolución de ELO y tu historial de PIES.'),
        h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => ctx.login(p) }, 'INICIAR SESIÓN / REGISTRARSE'), localBtn),
    };
  }
  function renderBar() {
    bar.replaceChildren(tabs([['general', 'General'], ['games', 'Por minijuego'], ['history', 'Historial'], ['pies', 'Historial de PIES']], tab, (v) => { tab = v; app.audio.play('click'); renderBar(); render(); }));
  }
  async function render() {
    body.replaceChildren(loading());
    try {
      if (tab === 'pies') {
        const tx = await svc.transactions(p);
        if (owner.disposed) return;
        const acc = svc.slotAccount(p);
        body.replaceChildren(
          h('div.stat-tiles', tile('Saldo actual', pies(acc.pies)), tile('PIES conseguidos', fmtN(acc.pies_earned)), tile('PIES gastados', fmtN(acc.pies_spent))),
          tx.length ? h('div.tx-list', tx.map((t) => h('div.tx' + (t.amount < 0 ? '.neg' : ''),
            h('b', `${t.amount > 0 ? '+' : ''}${fmtN(t.amount)}`),
            h('span', REASONS[t.reason] || t.reason, t.ref ? h('small', ' · ' + (ITEM_BY_ID[t.ref]?.name || GAME_NAMES[t.ref] || (t.reason === 'level' || t.reason === 'level_bonus' ? 'nivel ' + t.ref : t.ref))) : null),
            h('em', `saldo ${fmtN(t.balance)}`), h('small', timeAgo(t.at)))))
            : empty('Todavía no hay movimientos.', 'pie'),
          h('p.muted.small', 'Los PIES se ganan jugando (con límite diario decreciente para evitar el farmeo) y solo se usan en la PIE STORE.'));
        return;
      }
      const d = await svc.profile(me.username);
      if (owner.disposed) return;
      const acc = svc.slotAccount(p);
      const st = acc.stats || {};
      if (tab === 'general') {
        const games = GAME_IDS.map((g) => [g, d.mastery?.[g]]).filter(([, m]) => m?.played);
        const most = games.slice().sort((a, b) => b[1].played - a[1].played)[0];
        const fav = games.filter(([, m]) => m.played >= 3).sort((a, b) => b[1].wins / b[1].played - a[1].wins / a[1].played)[0];
        const L = levelInfo(acc.xp);
        const pct = st.played ? Math.round((st.wins / st.played) * 100) : 0;
        body.replaceChildren(
          h('div.stat-tiles',
            tile('Partidas', fmtN(st.played)), tile('Victorias', fmtN(st.wins)), tile('Derrotas', fmtN(st.losses)), tile('Empates', fmtN(st.draws)),
            tile('% de victorias', pct + '%'), tile('Mejor racha', fmtN(st.best_streak)), tile('Tiempo jugado', `${Math.round((st.time_played || 0) / 60)} min`),
            tile('Nivel', `${L.level} · ${L.title}`), tile('XP total', xp(acc.xp)), tile('ELO', resist(acc.rating)),
            tile('Mejor ELO', `${fmtN(st.best_rating)} · ${tierName(st.best_rating)}`), tile('PIES conseguidos', fmtN(acc.pies_earned)),
            tile('PIES gastados', fmtN(acc.pies_spent)), tile('Logros', `${Object.keys(acc.achievements || {}).length} / ${ACHIEVEMENTS.length}`),
            tile('Competiciones', `${fmtN(st.comp_wins)} V · ${fmtN(st.comp_losses)} D · ${fmtN(st.comp_draws)} E`), tile('Survival', `Etapa ${fmtN(st.survival_best)}`),
            tile('Más jugado', most ? GAME_NAMES[most[0]] : '—'), tile('Favorito (mejor %)', fav ? GAME_NAMES[fav[0]] : '—'), tile('Récords mundiales', fmtN(d.records?.length))),
          h('div.card', h('h3', 'Evolución del ELO'), ratingChart(d.rating_history, 900, 180)));
      } else if (tab === 'games') {
        body.replaceChildren(h('table.stats-table',
          h('thead', h('tr', ...['Minijuego', 'PJ', 'V', 'D', 'E', '%', 'Racha', 'Récord', 'Tiempo'].map((x) => h('th', x)))),
          h('tbody', GAME_IDS.map((g) => {
            const m = d.mastery?.[g] || {};
            return h('tr', h('td', gameChip(g)), h('td', fmtN(m.played)), h('td', fmtN(m.wins)), h('td', fmtN(m.losses)), h('td', fmtN(m.draws)),
              h('td', m.played ? Math.round((m.wins / m.played) * 100) + '%' : '—'), h('td', fmtN(m.best_streak)),
              h('td', m.best_record != null ? String(Math.round(m.best_record * 100) / 100) : '—'), h('td', m.time_played ? Math.round(m.time_played / 60) + ' min' : '—'));
          }))));
      } else if (tab === 'history') {
        body.replaceChildren(d.matches?.length ? h('div.mlist', d.matches.map((m) => matchRow(m, (u) => ctx.goto('profile', { user: u })))) : empty('Sin partidas todavía.', 'records'));
      }
    } catch (e) {
      body.replaceChildren(errorBox(errorText(e), render));
    }
  }
  function tile(label, v) {
    return h('div.stat-tile', h('small', label), typeof v === 'string' || typeof v === 'number' ? h('b', String(v)) : v);
  }
  renderBar();
  render();
  return { el: h('div.stats', h('div.sec-head', h('h2', 'ESTADÍSTICAS'), h('p', `${me.name} · datos guardados en el servidor`), localBtn), bar, body) };
}

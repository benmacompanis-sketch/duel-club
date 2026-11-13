// CLUB: amigos (online/offline, última actividad, invitar a jugar), buscador de jugadores,
// solicitudes (recibidas/enviadas: aceptar, rechazar, cancelar) y cara a cara con presentación VS.
import { h, icon } from './dom.js';
import { tabs, loading, errorBox, empty, avatar, lookOf, levelBadge, resist, timeAgo, gameChip, profileCard, fmtN, titleOf } from './kit.js';
import { GAME_NAMES } from '../data/catalog.js';
import { errorText } from '../net/api.js';
import { challengeFriend } from './online.js';
import { drawCharacter } from '../core/characters.js';
import { TAU, rgba } from '../core/utils.js';

function personRow(ui, owner, a, actions, extra = null) {
  return h('div.person',
    avatar(ui, owner, lookOf(a), 52),
    h('div.person-main',
      h('div.person-name', h('b', a.name), a.online ? h('span.dot-online', { title: 'En línea' }) : null, h('small', '@' + a.username)),
      h('div.person-line', levelBadge(a.level), resist(a.rating, { short: true }), h('span.muted.small', a.online ? 'En línea' : `Activo ${timeAgo(a.last_seen)}`)),
      extra),
    h('div.person-act', actions));
}

/** Cara a cara entre dos cuentas, con presentación VS. */
export function h2hModal(ui, { a, b }) {
  const app = ui.app;
  const m = {};
  const body = h('div.h2h-body', loading());
  async function load() {
    try {
      const d = await app.accounts.h2h(a, b);
      if (m.closed) return;
      const total = d.a_wins + d.b_wins + d.draws;
      const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
      const stage = ui.preview(m, 640, 200, (g, W, H, t) => {
        for (const [p, side] of [[d.a, -1], [d.b, 1]]) {
          const x = W / 2 + side * 190;
          const glow = g.createRadialGradient(x, H - 40, 5, x, H - 40, 140);
          glow.addColorStop(0, rgba(p.color, 0.45)); glow.addColorStop(1, rgba(p.color, 0));
          g.fillStyle = glow; g.fillRect(x - 160, 0, 320, H);
          g.strokeStyle = rgba(p.color, 0.8); g.lineWidth = 3; g.beginPath(); g.ellipse(x, H - 18, 60, 11, 0, 0, TAU); g.stroke();
          drawCharacter(g, { id: p.char, x, y: H - 18, s: 1.35, color: p.color, anim: 'idle', t: t + (side > 0 ? 1 : 0), facing: -side, acc: p.equipped });
        }
        g.font = '64px "Russo One"'; g.textAlign = 'center'; g.fillStyle = '#FFC93C';
        g.save(); g.translate(W / 2, H / 2 + 10); g.transform(1, 0, -0.18, 1, 0, 0); g.fillText('VS', 0, 0); g.restore();
      });
      const games = Object.entries(d.games || {}).sort((x, y) => y[1] - x[1]).slice(0, 5);
      const rivalry = total >= 25 ? 'Rivalidad histórica' : total >= 10 ? 'Rivalidad seria' : total >= 3 ? 'Se están conociendo' : 'Primeros cruces';
      body.replaceChildren(
        h('div.h2h-stage', stage,
          h('div.h2h-names', h('b', { style: { color: d.a.color } }, d.a.name), h('b', { style: { color: d.b.color } }, d.b.name))),
        h('div.h2h-score',
          h('div', h('b', String(d.a_wins)), h('small', `victorias · ${pct(d.a_wins)}%`)),
          h('div', h('b', String(d.draws)), h('small', `empates · ${total} partidas`)),
          h('div', h('b', String(d.b_wins)), h('small', `victorias · ${pct(d.b_wins)}%`))),
        h('div.h2h-bar', h('span', { style: { width: pct(d.a_wins) + '%', background: d.a.color } }), h('span', { style: { width: pct(d.draws) + '%', background: '#8C96B8' } }), h('span', { style: { width: pct(d.b_wins) + '%', background: d.b.color } })),
        h('p.h2h-rivalry', `${rivalry} · ${d.comps} competiciones juntos`),
        h('div.h2h-cols',
          h('div', h('h4', 'Minijuegos más jugados'), games.length ? games.map(([g, n]) => h('div.fav', gameChip(g), h('span', `${n} partidas`))) : h('p.muted', 'Todavía no se enfrentaron.')),
          h('div', h('h4', 'Últimos enfrentamientos'), d.matches.length ? d.matches.slice(0, 8).map((x) => {
            const aw = x.winner === -1 ? null : (x.winner === 0) === x.a_is_p1;
            return h('div.h2h-m', gameChip(x.game_id), h('b', x.a_is_p1 ? `${x.score1} – ${x.score2}` : `${x.score2} – ${x.score1}`),
              h('span', aw == null ? 'Empate' : aw ? `Ganó ${d.a.name}` : `Ganó ${d.b.name}`), h('small', timeAgo(x.created_at)));
          }) : h('p.muted', '—'))));
    } catch (e) {
      body.replaceChildren(errorBox(errorText(e), load));
    }
  }
  load();
  m.el = h('div.dialog.h2h-dialog',
    h('div.acc-head', h('h2', 'CARA A CARA'), h('button.icon-btn', { nav: true, title: 'Cerrar', onclick: () => m.close() }, icon('close'))), body);
  m.onBack = () => m.close();
  m.destroy = () => { m.closed = true; };
  return m;
}

export function clubSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  let tab = ctx.params.tab || 'friends';
  const body = h('div.club-body');
  const bar = h('div');
  if (!me) {
    return {
      el: h('div.need-acc', icon('heart'), h('h2', 'CLUB'), h('p', 'El CLUB es la parte social: amigos, solicitudes, perfiles y cara a cara. Iniciá sesión para usarlo.'),
        h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => ctx.login(p) }, 'INICIAR SESIÓN / REGISTRARSE')),
    };
  }
  const viewProfile = (u) => ctx.goto('profile', { user: u });
  const vs = (u) => ui.modal(h2hModal, { a: me.username, b: u });
  const act = async (fn, okText) => {
    try {
      await fn();
      if (okText) ui.toast({ kind: 'achievement', icon: 'heart', title: okText });
      app.audio.play('confirm');
      render();
    } catch (e) {
      app.audio.play('error');
      ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) });
    }
  };
  function renderBar(counts = {}) {
    bar.replaceChildren(tabs([
      ['friends', `Mis amigos${counts.friends != null ? ' · ' + counts.friends : ''}`, 'heart'],
      ['search', 'Buscar jugadores', 'user'],
      ['requests', `Solicitudes${counts.incoming ? ' · ' + counts.incoming : ''}`, 'bell'],
      ['h2h', 'Cara a cara', 'duel'],
    ], tab, (v) => { tab = v; app.audio.play('click'); render(); }));
  }
  async function render() {
    renderBar();
    body.replaceChildren(loading());
    if (tab === 'search') return renderSearch();
    try {
      const f = await svc.friends(p);
      if (owner.disposed) return;
      renderBar({ friends: f.friends.length, incoming: f.incoming.length });
      if (tab === 'friends') {
        const online = f.friends.filter((x) => x.online).length;
        body.replaceChildren(f.friends.length
          ? h('div.people', h('p.muted', `${online} en línea · ${f.friends.length} amigos`), ...f.friends.map((a) => personRow(ui, owner, a, [
            h('button.btn.small.primary', { nav: true, title: 'Desafiar a jugar online (cada uno en su compu)', onclick: () => challengeFriend(ui, svc.slotUser(p), a) }, icon('bolt'), 'ONLINE'),
            h('button.btn.small', { nav: true, title: 'Invitar a jugar en esta compu', onclick: () => invite(a) }, icon('play'), 'ACÁ'),
            h('button.btn.small', { nav: true, onclick: () => vs(a.username) }, icon('duel')),
            h('button.btn.small', { nav: true, onclick: () => viewProfile(a.username) }, icon('user')),
            h('button.btn.small.ghost', { nav: true, title: 'Quitar amigo', onclick: async () => { if (await ui.confirm({ title: `¿Quitar a ${a.name}?`, text: 'Se elimina de tu lista de amigos.', yes: 'Quitar', no: 'Cancelar' })) act(() => svc.friendRemove(p, a.username), 'Amigo quitado'); } }, icon('close'))])))
          : h('div', empty('Todavía no tenés amigos en el CLUB. Buscá jugadores y mandales solicitud.', 'heart'), h('button.btn', { nav: true, onclick: () => { tab = 'search'; render(); } }, 'BUSCAR JUGADORES')));
      } else if (tab === 'requests') {
        body.replaceChildren(
          h('h4', `RECIBIDAS · ${f.incoming.length}`),
          f.incoming.length ? h('div.people', f.incoming.map((a) => personRow(ui, owner, a, [
            h('button.btn.small.green', { nav: true, onclick: () => act(() => svc.friendRespond(p, a.username, true), `Ahora sos amigo de ${a.name}`) }, 'ACEPTAR'),
            h('button.btn.small.ghost', { nav: true, onclick: () => act(() => svc.friendRespond(p, a.username, false), 'Solicitud rechazada') }, 'RECHAZAR'),
          ], h('small.muted', `Enviada ${timeAgo(a.at)}`)))) : h('p.muted', 'No tenés solicitudes pendientes.'),
          h('h4', `ENVIADAS · ${f.outgoing.length}`),
          f.outgoing.length ? h('div.people', f.outgoing.map((a) => personRow(ui, owner, a, [
            h('button.btn.small.ghost', { nav: true, onclick: () => act(() => svc.friendRemove(p, a.username), 'Solicitud cancelada') }, 'CANCELAR'),
          ], h('small.muted', `Enviada ${timeAgo(a.at)}`)))) : h('p.muted', 'No enviaste solicitudes.'));
      } else if (tab === 'h2h') {
        const others = f.friends;
        body.replaceChildren(
          h('p.muted', 'Elegí un amigo para ver todas las partidas entre ustedes. También podés abrir el cara a cara desde cualquier perfil.'),
          others.length ? h('div.people', others.map((a) => personRow(ui, owner, a, [h('button.btn.small.primary', { nav: true, onclick: () => vs(a.username) }, icon('duel'), 'VER CARA A CARA')])))
            : empty('Agregá amigos para ver su cara a cara.', 'duel'));
      }
    } catch (e) {
      body.replaceChildren(errorBox(errorText(e), render));
    }
  }
  function invite(a) {
    const other = 1 - p;
    if (svc.savedAccounts().some((x) => x.username === a.username)) {
      try {
        svc.attach(other, a.username);
        ui.toast({ kind: 'achievement', icon: 'play', title: `${a.name} juega como J${other + 1}`, text: '¡A jugar!' });
        ctx.goto('play');
      } catch (e) {
        ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) });
      }
    } else {
      ui.toast({ kind: 'achievement', icon: 'user', title: `Invitá a ${a.name}`, text: `Que inicie sesión como J${other + 1} en esta compu para que la partida cuente para los dos.` });
      ctx.login(other);
    }
  }
  function renderSearch() {
    const input = h('input.acc-input.search-in', { type: 'text', nav: true, maxlength: 16, placeholder: 'Nombre o usuario…', 'aria-label': 'Buscar jugadores' });
    const results = h('div.people');
    let timer = null;
    const run = async () => {
      const q = input.value.trim();
      if (!q) { results.replaceChildren(h('p.muted', 'Escribí al menos una letra.')); return; }
      results.replaceChildren(loading());
      try {
        const [list, f] = await Promise.all([svc.search(q), svc.friends(p)]);
        if (owner.disposed) return;
        const friends = new Set(f.friends.map((x) => x.username));
        const out = new Set(f.outgoing.map((x) => x.username));
        const inc = new Set(f.incoming.map((x) => x.username));
        results.replaceChildren(...(list.length ? list.map((a) => personRow(ui, owner, a, a.username === me.username ? [h('span.chip', 'VOS')] : [
          friends.has(a.username) ? h('span.chip', 'AMIGO')
            : out.has(a.username) ? h('span.chip', 'PENDIENTE')
              : inc.has(a.username) ? h('button.btn.small.green', { nav: true, onclick: () => act(() => svc.friendRespond(p, a.username, true), `Ahora sos amigo de ${a.name}`) }, 'ACEPTAR')
                : h('button.btn.small.primary', { nav: true, onclick: () => act(() => svc.friendRequest(p, a.username), 'Solicitud enviada') }, icon('user'), 'AGREGAR'),
          h('button.btn.small', { nav: true, onclick: () => viewProfile(a.username) }, 'PERFIL'),
          h('button.btn.small', { nav: true, onclick: () => vs(a.username) }, icon('duel')),
        ])) : [empty('No se encontraron jugadores.', 'user')]));
      } catch (e) {
        results.replaceChildren(errorBox(errorText(e), run));
      }
    };
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); });
    body.replaceChildren(h('div.search-row', input, h('button.btn.small.primary', { nav: true, onclick: run }, 'BUSCAR')), results);
    results.replaceChildren(h('p.muted', 'Buscá por nombre visible o usuario. Los perfiles públicos muestran solo información de juego.'));
    setTimeout(() => input.focus(), 50);
  }
  render();
  return { el: h('div.club', h('div.sec-head', h('h2', 'CLUB'), h('p', `Conectado como ${me.name} (J${p + 1})`)), bar, body) };
}
export { profileCard };

// Resultados de un minijuego: ganador, puntuación interna, estadísticas comparadas,
// actualización animada del marcador global y anuncio del siguiente desafío.
import { h, icon } from './dom.js';
import { gameIcon } from './widgets.js';
import { drawCharacter } from '../core/characters.js';
import { GAME_BY_ID } from '../games/index.js';
import { EVENTS } from '../core/events.js';
import { TAU, rgba } from '../core/utils.js';
import { drawVictory } from '../core/cosmetics.js';
import { normLook } from '../core/characters.js';
import { emoteBubble, phrase, fmtN } from './kit.js';

export function resultsScreen(ui, { session, res, rec, info, done }) {
  const app = ui.app;
  const scr = {};
  const meta = GAME_BY_ID[res.gameId].meta;
  const players = res.players;
  const w = res.winner;
  const quick = !session;
  let accepted = false;
  const t0 = performance.now();
  const choose = (v) => {
    if (accepted || performance.now() - t0 < 700) return;
    accepted = true;
    done(v);
  };

  const rewardBox = [h('div.res-rewards'), h('div.res-rewards')];
  const col = (p) => {
    const prof = players[p];
    const look = normLook(prof.acc);
    const anim = w === -1 ? 'idle' : w === p ? 'win' : 'lose';
    const pts = info?.gained?.[p];
    // emote equipado: lo usa el ganador (o los dos si hay empate)
    const emote = look.emote && (w === p || w === -1) ? h('div.res-emote', emoteBubble(look.emote)) : null;
    return h('div.res-col' + (p === 1 ? '.right' : '') + (w === p ? '.win' : ''), { style: { '--c': prof.color } },
      ui.preview(scr, 150, 170, (g, W, H, t) => {
        const grd = g.createRadialGradient(W / 2, H - 20, 5, W / 2, H - 20, 90);
        grd.addColorStop(0, rgba(prof.color, 0.4));
        grd.addColorStop(1, rgba(prof.color, 0));
        g.fillStyle = grd;
        g.fillRect(0, 0, W, H);
        if (w === p && look.victory) {
          g.save(); g.translate(W / 2, H - 14); g.scale(0.42, 0.42); drawVictory(g, look.victory, 0, 0, t, prof.color); g.restore();
        }
        drawCharacter(g, { id: prof.char, x: W / 2, y: H - 14, s: 1.25, color: prof.color, anim, t: t + p, facing: p ? -1 : 1, acc: prof.acc });
      }),
      emote,
      h('div.res-meta',
        h('div.res-name', prof.name),
        h('div.res-score', res.display[p], h('small', res.scoreLabel)),
        h('div.res-tags',
        pts != null ? h('span.chip.res-tag', { style: { borderColor: prof.color, color: '#fff', background: rgba(prof.color, 0.3) } }, `+${pts} PTS`) : null,
        session?.mode === 'survival' && w >= 0 && w !== p ? h('span.chip.res-tag', { style: { borderColor: '#FF654F', color: '#FFB3A7', background: 'rgba(255,101,79,.15)' } }, '−1 VIDA') : null,
        ),
        rewardBox[p],
        rec?.newRecords?.[p] ? h('div.res-record', '★ ¡NUEVO RÉCORD EN ESTA COMPU!') : null));
  };

  const statRows = (res.stats || []).map((s) => {
    const [a, b] = s.values;
    let best = -1;
    if (s.better && s.raw && s.raw[0] !== s.raw[1]) best = (s.better === 'high') === (s.raw[0] > s.raw[1]) ? 0 : 1;
    return h('div.stat-row', h('span' + (best === 0 ? '.best' : ''), a), h('em', s.label), h('span' + (best === 1 ? '.best' : ''), b));
  });
  const event = res.event && EVENTS[res.event];

  // ---- marcador global
  let board = null;
  let boardPts = null;
  if (session) {
    if (session.mode === 'survival') {
      const hearts = (p) => {
        const lb = info.livesBefore[p], now = session.lives[p];
        return h('div.hearts', ...Array.from({ length: session.cfg.lives }, (_, i) => h('span.icon' + (i >= lb ? '.lost' : i >= now ? '.breaking' : ''), { html: icon('heart').innerHTML })));
      };
      board = h('div.board',
        h('div.board-side', players[0].name, hearts(0)),
        h('div.board-center', h('b', 'SURVIVAL'), h('div', { style: { fontFamily: 'var(--display)', fontSize: '26px' } }, `ETAPA ${session.stage}`),
          h('div.muted', { style: { fontSize: '12px' } }, `Rachas: ${session.survivalStreak[0]} – ${session.survivalStreak[1]}`)),
        h('div.board-side.right', players[1].name, hearts(1)));
    } else {
      const total = session.mode === 'tournament' ? session.rounds.reduce((n, r) => n + r.games.length, 0) : session.queue.length;
      const dots = h('div.dots', ...Array.from({ length: Math.max(total, session.results.length) }, (_, i) => {
        const r = session.results[i];
        const d = h('span.dot' + (i === session.results.length - 1 ? '.cur' : ''));
        if (r) d.style.background = r.winner >= 0 ? players[r.winner].color : '#8C96B8';
        return d;
      }));
      boardPts = [0, 1].map((p) => h('div.board-pts', String(info.before[p])));
      const lead = session.points[0] === session.points[1] ? 'EMPATADOS' : `LIDERA ${players[session.points[0] > session.points[1] ? 0 : 1].name.toUpperCase()}`;
      board = h('div.board',
        h('div.board-side', ui.preview(scr, 48, 48, (g, W, H, t) => portrait(g, players[0], W, H, t)), players[0].name, boardPts[0], info.gained[0] ? h('span.board-gain', `+${info.gained[0]}`) : null),
        h('div.board-center', h('b', 'MARCADOR GENERAL'), h('div', { style: { fontFamily: 'var(--display)', fontSize: '15px', marginTop: '4px' } }, lead), dots),
        h('div.board-side.right', ui.preview(scr, 48, 48, (g, W, H, t) => portrait(g, players[1], W, H, t)), players[1].name, boardPts[1], info.gained[1] ? h('span.board-gain', `+${info.gained[1]}`) : null));
    }
  }

  // ---- siguiente desafío y acciones
  let next = null;
  if (session && info.next && GAME_BY_ID[info.next] && session.mode !== 'survival') {
    const nm = GAME_BY_ID[info.next].meta;
    next = h('div.next-card', gameIcon(ui, scr, nm, 56), h('div', h('small', 'SIGUIENTE DESAFÍO'), h('b', nm.name)));
  } else if (session?.mode === 'survival' && session.lives[0] > 0 && session.lives[1] > 0) {
    next = h('div.next-card', h('div', { style: { padding: '6px 10px' } }, h('small', 'PRÓXIMA ETAPA'), h('b', `Etapa ${session.stage + 1} · más difícil`)));
  }
  const online = info?.online || null;
  const actions = online ? online.actions(choose)
    : info?.actions ? info.actions(choose)
    : quick
    ? h('div.res-actions',
      h('button.btn', { nav: true, onclick: () => choose('menu') }, 'MENÚ'),
      h('button.btn', { nav: true, onclick: () => choose('other') }, 'OTRO MINIJUEGO'),
      h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => choose('rematch') }, icon('play'), 'REVANCHA'))
    : h('div.res-actions',
      h('button.btn.ghost', { nav: true, onclick: async () => { if (await ui.confirm({ title: '¿Abandonar la competición?', text: 'Se perderá el progreso de esta competición.', yes: 'Abandonar', no: 'Seguir' })) choose('quit'); } }, 'SALIR'),
      h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => choose('continue') }, icon('play'), 'CONTINUAR'));

  const banner = players[1]?.hidden ? '¡DESAFÍO TERMINADO!' : w === -1 ? '¡EMPATE!' : `¡GANA ${players[w].name.toUpperCase()}!`;
  // frase contextual (no siempre: el humor es una sorpresa)
  let phraseKind = null;
  const sc = res.scores || [];
  if (w === -1) phraseKind = Math.random() < 0.6 ? 'draw' : null;
  else if (typeof sc[1 - w] === 'number' && sc[1 - w] === 0 && sc[w] > 0) phraseKind = Math.random() < 0.5 ? 'zero' : 'blowout';
  else if (res.margin === 1 || (res.gameId === 'reaction' && Math.random() < 0.3)) phraseKind = Math.random() < 0.55 ? 'close' : null;
  else if (session && info?.before && session.maxDeficit?.[w] >= 6) phraseKind = 'comeback';
  else if (Math.random() < 0.12) phraseKind = 'blowout';
  const phraseText = phraseKind ? phrase(phraseKind) : null;
  // recompensas reales del servidor (XP, PIES, ELO)
  const fillRewards = (out) => {
    for (const p of [0, 1]) {
      const box = rewardBox[p];
      const s = out?.slots?.[p];
      if (players[p].bot) { box.replaceChildren(h('span.res-reward.wait', players[p].bot === 'idle' ? 'Muñeco de práctica' : 'Bot · no suma ELO')); continue; }
      if (info?.practice) { box.replaceChildren(h('span.res-reward.wait', 'Práctica: sin recompensas')); continue; }
      if (!players[p].accountId) { box.replaceChildren(h('span.res-reward.wait', 'Invitado: sin progreso')); continue; }
      if (!s) { box.replaceChildren(h('span.res-reward.wait', out === undefined ? 'Guardando…' : out?.duplicate ? 'Ya guardada' : 'Pendiente de envío')); continue; }
      box.replaceChildren(...[
        h('span.res-reward.xp', `+${fmtN(s.xp)} XP`),
        s.pies ? h('span.res-reward.pies', `+${fmtN(s.pies)} PIES`) : null,
        s.delta ? h('span.res-reward' + (s.delta > 0 ? '.up' : '.down'), `${s.delta > 0 ? '+' : ''}${s.delta} ELO`) : null,
        s.record ? h('span.res-reward.pies', '★ RÉCORD MUNDIAL') : null,
        s.factor < 1 ? h('span.res-reward.wait', s.factor === 0 ? 'Límite diario alcanzado' : 'Recompensa reducida (muchas partidas hoy)') : null].filter(Boolean));
    }
  };
  if (online) online.rewards((p, nodes) => { if (!scr.disposed) rewardBox[p].replaceChildren(...nodes.filter(Boolean)); }, scr);
  else {
    fillRewards(undefined);
    rec?.server?.then((out) => { if (!scr.disposed) fillRewards(out); });
  }
  scr.el = h('div.results' + (players[1]?.hidden ? '.solo-res' : ''), { style: { '--c': w >= 0 ? players[w].color : '#9B6CFF' } },
    h('div.res-kicker', online ? `${online.kicker} · ${meta.name}` : `${info?.label || (quick ? 'QUICK PLAY' : '')} · ${meta.name}${event ? ' · ' + event.short.toUpperCase() : ''}`),
    h('div.res-banner', online?.banner || banner),
    phraseText ? h('div.res-phrase', phraseText) : null,
    h('div.res-cols', col(0), h('div.res-stats', h('h4', 'ESTADÍSTICAS'), ...statRows), col(1)),
    online ? online.board : board,
    h('div.res-footer', (online ? online.next : next) || h('div'), actions));
  scr.onBack = () => {};

  // efectos
  app.audio.playMusic('results');
  app.audio.play(w === -1 ? 'draw' : 'win');
  if (w >= 0) {
    const fx = app.renderer.overlayFx;
    setTimeout(() => !scr.disposed && fx.confetti(w === 0 ? 260 : 1020, 420, 70, 0.9), 200);
  }
  if (boardPts) {
    setTimeout(() => {
      if (scr.disposed) return;
      boardPts.forEach((el, p) => {
        el.textContent = String(session.points[p]);
        if (info.gained[p]) el.classList.add('bump');
      });
      app.audio.play('score');
    }, 900);
  }
  return scr;
}

function portrait(g, prof, W, H, t) {
  g.save();
  g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, TAU);
  g.fillStyle = rgba(prof.color, 0.25); g.fill();
  g.strokeStyle = prof.color; g.lineWidth = 2; g.stroke();
  g.clip();
  drawCharacter(g, { id: prof.char, x: W / 2, y: H + 10, s: 0.55, color: prof.color, anim: 'idle', t, acc: prof.acc, shadow: false });
  g.restore();
}
export { portrait };

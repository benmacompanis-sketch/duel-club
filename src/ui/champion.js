// Pantalla de campeón: celebración, marcador final, estadísticas destacadas y revancha.
import { h, icon } from './dom.js';
import { drawCharacter, normLook } from '../core/characters.js';
import { drawVictory } from '../core/cosmetics.js';
import { GAME_BY_ID } from '../games/index.js';
import { TAU, rgba, fmtDuration, roundRect } from '../core/utils.js';

export function championScreen(ui, { session, done }) {
  const app = ui.app;
  const scr = {};
  const P = session.players;
  const w = session.winner;
  const l = w >= 0 ? 1 - w : -1;
  const champ = w >= 0 ? P[w] : null;
  let picked = false;
  const t0 = performance.now();
  const pick = (v) => {
    if (picked || performance.now() - t0 < 900) return;
    picked = true;
    done(v);
  };

  const stage = ui.preview(scr, 560, 660, (g, W, H, t) => {
    // focos
    for (let i = 0; i < 2; i++) {
      const a = Math.sin(t * 0.8 + i * 2) * 0.35;
      g.save();
      g.translate(W * (0.25 + i * 0.5), -20);
      g.rotate(a);
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(255,240,200,0.28)');
      grad.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.lineTo(140, H); g.lineTo(-140, H); g.fill();
      g.restore();
    }
    const base = H - 70;
    const podium = (x, y, wdt, hgt, col, label) => {
      g.fillStyle = col;
      roundRect(g, x - wdt / 2, y, wdt, hgt, 10); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x - wdt / 2, y, wdt, 8);
      g.fillStyle = 'rgba(11,16,32,0.6)';
      g.font = '40px "Russo One"'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, x, y + hgt / 2 + 4);
    };
    if (w >= 0) {
      podium(W / 2, base - 110, 200, 180, '#2A3566', '1');
      podium(W / 2 + 190, base - 40, 150, 110, '#1F294F', '2');
      const glow = g.createRadialGradient(W / 2, base - 200, 10, W / 2, base - 200, 220);
      glow.addColorStop(0, rgba(champ.color, 0.45));
      glow.addColorStop(1, rgba(champ.color, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);
      drawCharacter(g, { id: P[l].char, x: W / 2 + 190, y: base - 40, s: 1.5, color: P[l].color, anim: 'lose', t, facing: -1, acc: P[l].acc });
      const vic = normLook(champ.acc).victory;
      if (vic) { g.save(); g.translate(W / 2, base - 110); g.scale(1.5, 1.5); drawVictory(g, vic, 0, 0, t, champ.color); g.restore(); }
      drawCharacter(g, { id: champ.char, x: W / 2, y: base - 110, s: 2.4, color: champ.color, anim: Math.floor(t / 2.5) % 2 ? 'celebrate' : 'win', t, acc: champ.acc });
      // trofeo
      const ty = 200 + Math.sin(t * 2) * 6;
      g.save();
      g.translate(W / 2 - 170, ty + 150);
      g.fillStyle = '#FFC93C';
      g.beginPath(); g.moveTo(-30, -60); g.lineTo(30, -60); g.quadraticCurveTo(30, -10, 0, 0); g.quadraticCurveTo(-30, -10, -30, -60); g.fill();
      g.strokeStyle = '#FFC93C'; g.lineWidth = 6;
      g.beginPath(); g.arc(-30, -42, 14, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
      g.beginPath(); g.arc(30, -42, 14, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
      g.fillRect(-6, 0, 12, 18);
      g.fillRect(-22, 18, 44, 10);
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillRect(-18, -54, 6, 30);
      g.restore();
    } else {
      podium(W / 2 - 120, base - 90, 180, 160, '#2A3566', '1');
      podium(W / 2 + 120, base - 90, 180, 160, '#2A3566', '1');
      drawCharacter(g, { id: P[0].char, x: W / 2 - 120, y: base - 90, s: 1.8, color: P[0].color, anim: 'celebrate', t, acc: P[0].acc });
      drawCharacter(g, { id: P[1].char, x: W / 2 + 120, y: base - 90, s: 1.8, color: P[1].color, anim: 'celebrate', t: t + 1, facing: -1, acc: P[1].acc });
    }
  });

  const isSurv = session.mode === 'survival';
  const scoreVal = (p) => (isSurv ? `${session.lives[p]}♥` : String(session.points[p]));
  const titleTxt = w >= 0 ? champ.name.toUpperCase() : '¡EMPATE!';
  const kicker = w >= 0 ? (session.mode === 'tournament' ? 'CAMPEÓN DEL TORNEO' : isSurv ? 'ÚLTIMO EN PIE' : 'CAMPEÓN DE DUEL CLUB') : 'NADIE CEDE';

  // estadísticas
  const games = session.results.length;
  const wv = w >= 0 ? session.wins[w] : session.wins[0];
  const lv = w >= 0 ? session.wins[l] : session.wins[1];
  const stats = [
    ['Minijuegos', games],
    [w >= 0 ? 'Victorias del campeón' : `Victorias ${P[0].name}`, wv],
    [w >= 0 ? 'Derrotas del campeón' : `Victorias ${P[1].name}`, lv],
    ['Empates', session.draws],
    ['Tiempo jugado', fmtDuration(session.playTime)],
    [isSurv ? 'Etapas superadas' : 'Duración total', isSurv ? session.stage : fmtDuration(session.duration)],
  ];

  // momentos destacados
  const hl = [];
  const numeric = session.results.filter((r) => Number.isFinite(r.scores?.[0]) && Number.isFinite(r.scores?.[1]) && r.winner >= 0);
  if (numeric.length) {
    const rel = (r) => Math.abs(r.scores[0] - r.scores[1]) / Math.max(1, Math.abs(r.scores[0]), Math.abs(r.scores[1]));
    const big = numeric.reduce((a, b) => (rel(b) > rel(a) ? b : a));
    const close = numeric.reduce((a, b) => (rel(b) < rel(a) ? b : a));
    hl.push(['star', `Paliza en ${GAME_BY_ID[big.gameId].meta.name}: ${P[big.winner].name} ganó ${big.display[big.winner]} a ${big.display[1 - big.winner]}.`]);
    if (close !== big) hl.push(['hair', `Final de infarto en ${GAME_BY_ID[close.gameId].meta.name}: ${close.display[0]} vs ${close.display[1]}.`]);
  }
  const react = session.results.filter((r) => r.gameId === 'reaction');
  if (react.length) {
    let best = null;
    react.forEach((r) => r.records?.forEach((v, p) => { if (v != null && (!best || v < best.v)) best = { v, p }; }));
    if (best) hl.push(['bolt', `Reflejo más rápido: ${P[best.p].name} con ${Math.round(best.v)} ms.`]);
  }
  for (const p of [0, 1]) if (session.maxDeficit[p] >= 3 && session.winner === p) hl.push(['arrow', `¡Remontada! ${P[p].name} llegó a estar ${session.maxDeficit[p]} puntos abajo.`]);
  for (const b of session.recordsBroken.slice(0, 3)) hl.push(['trophy', `Nuevo récord de ${GAME_BY_ID[b.gameId].meta.name} para ${P[b.p].name}.`]);
  if (session.tiebreak) hl.push(['flame', 'Se definió en MUERTE SÚBITA.']);
  if (session.mode === 'tournament' && session.roundBonus.some((x) => x)) hl.push(['medal', `Bonus de ronda: ${P[0].name} ${session.roundBonus[0]} · ${P[1].name} ${session.roundBonus[1]}.`]);
  if (isSurv) hl.push(['heart', `Mejores rachas: ${P[0].name} ${session.survivalStreakBest[0]} · ${P[1].name} ${session.survivalStreakBest[1]}.`]);
  const evCount = session.results.filter((r) => r.event).length;
  if (evCount) hl.push(['quick', `${evCount} ${evCount === 1 ? 'evento especial' : 'eventos especiales'} sacudieron la competición.`]);

  const timeline = h('div.timeline', ...session.results.map((r, i) => {
    const el = h('div.tl', { title: GAME_BY_ID[r.gameId].meta.name }, String(i + 1));
    el.style.background = r.winner >= 0 ? rgba(P[r.winner].color, 0.85) : 'rgba(140,150,184,0.4)';
    return el;
  }));

  scr.el = h('div.champion', { style: { '--c': w >= 0 ? champ.color : '#9B6CFF' } },
    h('div.champ-stage', stage, h('div.champ-title', h('small', kicker), h('h1', titleTxt))),
    h('div.champ-info',
      h('div.champ-score',
        h('div.pl', { style: { color: P[0].color } }, P[0].name, h('b', scoreVal(0))),
        h('div.sep', isSurv ? 'VIDAS' : 'PTS'),
        h('div.pl.right', { style: { color: P[1].color } }, P[1].name, h('b', scoreVal(1)))),
      h('div.champ-stats', ...stats.map(([k, v]) => h('div.champ-stat', h('small', k), h('b', String(v))))),
      h('div.card', { style: { padding: '12px 16px' } }, h('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, 'RESULTADOS'), timeline),
      h('div.highlights', ...hl.map(([ic, txt]) => h('div.highlight', icon(ic), h('span', txt)))),
      h('div.champ-actions',
        h('button.btn', { nav: true, onclick: () => pick('menu') }, 'MENÚ PRINCIPAL'),
        h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => pick('rematch') }, icon('play'), 'REVANCHA'))));
  scr.onBack = () => pick('menu');

  app.audio.play('fanfare');
  const fx = app.renderer.overlayFx;
  fx.confetti(300, 500, 120, 0.8);
  let n = 0;
  const iv = setInterval(() => {
    if (scr.disposed || n++ > 6) return clearInterval(iv);
    fx.rain(50);
  }, 1500);
  scr.destroy = () => clearInterval(iv);
  return scr;
}

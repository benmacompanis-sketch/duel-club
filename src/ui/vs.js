// Pantalla VS: presentación dramática de ambos jugadores antes de una competición.
import { h } from './dom.js';
import { drawCharacter, normLook } from '../core/characters.js';
import { drawEntrance } from '../core/cosmetics.js';

export function vsScreen(ui, { session, title, sub, done }) {
  const app = ui.app;
  const scr = {};
  const [a, b] = session.players;
  const h2h = app.stats.h2hText(session.players);
  let closed = false;
  const t0 = performance.now();
  const finish = () => {
    if (closed || performance.now() - t0 < 900) return;
    closed = true;
    app.audio.play('confirm');
    done();
  };
  const side = (p, cls) => {
    const prof = session.players[p];
    return h('div.vs-half.' + cls, { style: { '--c': prof.color } },
      ui.preview(scr, 640, 720, (g, w, hh, t) => {
        const x = cls === 'left' ? 300 : 340;
        const k = Math.min(1, t * 1.6);
        const ent = normLook(prof.acc).entrance;
        if (ent && t < 2.2) {
          g.save(); g.translate(x, 610); g.scale(2.4, 2.4);
          drawEntrance(g, ent, 0, 0, Math.min(1, t / 1.3), t, prof.color);
          g.restore();
        }
        drawCharacter(g, { id: prof.char, x, y: 610, s: 4.2 * (0.85 + 0.15 * k), color: prof.color, anim: t > 1.2 ? 'win' : 'idle', t, facing: cls === 'left' ? 1 : -1, acc: prof.acc, alpha: ent ? Math.min(1, t * 1.5) : 1 });
      }),
      h('div.vs-name', h('small', `JUGADOR ${p + 1}${prof.accountId ? ` · NIVEL ${prof.level || ''}` : ' · INVITADO'}`), prof.name));
  };
  scr.el = h('div.vs-screen', { onclick: finish },
    side(0, 'left'), side(1, 'right'),
    h('div.vs-mid', h('div.vs-text', 'VS')),
    h('div.vs-info', title, h('small', sub), h2h ? h('small', `Cara a cara: ${a.name} ${h2h.a} – ${h2h.b} ${b.name}${h2h.draws ? ` · ${h2h.draws} empates` : ''}`) : null),
    h('div.vs-skip', 'Pulsá una tecla para comenzar'));
  scr.nav = false;
  scr.onKey = (e) => {
    if (e.code === 'Escape') return true;
    finish();
    return true;
  };
  app.audio.play('whoosh');
  const tm1 = setTimeout(() => app.audio.play('vs'), 450);
  const tm2 = setTimeout(() => { if (!scr.disposed) { app.renderer.overlayFx.burst(640, 360, ['#FFC93C', '#fff', a.color, b.color], 50, { speed: 700, gravity: 0, life: 0.8, kind: 'spark', size: 6 }); } }, 500);
  const tm3 = setTimeout(() => { if (!scr.disposed && !closed) { closed = true; done(); } }, 4200);
  scr.destroy = () => { clearTimeout(tm1); clearTimeout(tm2); clearTimeout(tm3); };
  return scr;
}

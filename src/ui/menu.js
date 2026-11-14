// Pantalla de título ("pulsa cualquier tecla") y menú principal.
import { h, icon, toggleFullscreen } from './dom.js';
import { drawCharacter } from '../core/characters.js';
import { TAU, rgba } from '../core/utils.js';

export function logo(big = false) {
  return h('div.logo' + (big ? '.big' : ''),
    h('div.logo-row', h('span.logo-duel', 'DUEL'), h('span.logo-bolt', icon('bolt')), h('span.logo-club', 'CLUB')),
    h('div.logo-slogan', 'ONE CLUB. INFINITE DUELS.'));
}

/** Escenario con los dos personajes enfrentados. */
export function duoStage(ui, owner, w, hgt, opts = {}) {
  return ui.preview(owner, w, hgt, (g, W, H, t) => {
    const [a, b] = ui.app.profiles;
    const cy = H * 0.86;
    for (const [p, side] of [[a, -1], [b, 1]]) {
      const x = W / 2 + side * W * (opts.spread || 0.24);
      // pedestal de historieta: sombra de tinta + disco del color del jugador con borde grueso
      g.fillStyle = 'rgba(13,11,20,0.55)';
      g.beginPath(); g.ellipse(x + 8, cy + 10, 82, 20, 0, 0, TAU); g.fill();
      g.fillStyle = p.color;
      g.strokeStyle = '#0D0B14';
      g.lineWidth = 5;
      g.beginPath(); g.ellipse(x, cy + 2, 78, 18, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath(); g.ellipse(x - 18, cy - 3, 34, 6, 0, 0, TAU); g.fill();
      const anim = opts.anim ? opts.anim : Math.sin(t * 0.7 + (side > 0 ? 2 : 0)) > 0.85 ? 'celebrate' : 'idle';
      drawCharacter(g, { id: p.char, x, y: cy, s: opts.scale || 1.75, color: p.color, anim, t: t + (side > 0 ? 1.3 : 0), facing: -side, acc: p.acc });
    }
  });
}

export function titleScreen(ui) {
  const scr = {};
  const go = () => {
    if (scr.gone) return;
    scr.gone = true;
    ui.app.audio.unlock();
    ui.app.audio.play('ready');
    ui.goMenu();
  };
  scr.el = h('div.title-screen', { onclick: go },
    h('div.title-chars', duoStage(ui, scr, 1280, 720, { scale: 2.5, spread: 0.36 })),
    h('div.title-center', logo(true),
      h('div.press-start', 'PULSÁ CUALQUIER TECLA PARA EMPEZAR'),
      h('div.title-feats',
        ...[['16', 'minijuegos'], ['ONLINE', 'competitivo'], ['VS BOT', '4 dificultades'], ['PASE', 'temporada 1']].map(([a, b]) => h('div.tf', h('b', a), h('small', b))))),
    h('div.title-foot', h('span', 'v4.5'), h('span', '2 jugadores · 1 teclado · o cada uno en su compu')));
  scr.nav = false;
  scr.onKey = (e) => {
    if (e.code === 'F11' || e.code === 'F5' || e.code === 'F12') return false;
    go();
    return true;
  };
  return scr;
}

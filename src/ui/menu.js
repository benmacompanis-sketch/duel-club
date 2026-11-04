// Pantalla de título ("pulsa cualquier tecla") y menú principal.
import { h, icon, toggleFullscreen } from './dom.js';
import { drawCharacter } from '../core/characters.js';
import { TAU, rgba } from '../core/utils.js';
import { duelSetupScreen, tournamentSetupScreen, survivalSetupScreen } from './modeSetup.js';
import { quickPlayScreen } from './quickPlay.js';
import { recordsScreen } from './records.js';
import { settingsScreen } from './settings.js';
import { playerSelectScreen } from './playerSelect.js';
import { clubScreen } from './club.js';
import { GAMES } from '../games/index.js';

export function logo(big = false) {
  return h('div.logo' + (big ? '.big' : ''),
    h('div.logo-row', h('span.logo-duel', 'DUEL'), h('span.logo-bolt', icon('bolt')), h('span.logo-club', 'CLUB')),
    h('div.logo-slogan', 'TWO PLAYERS. ONE CHAMPION.'));
}

/** Escenario con los dos personajes enfrentados. */
function duoStage(ui, owner, w, hgt, opts = {}) {
  return ui.preview(owner, w, hgt, (g, W, H, t) => {
    const [a, b] = ui.app.profiles;
    const cy = H * 0.86;
    // plataforma
    const grd = g.createRadialGradient(W / 2, cy, 10, W / 2, cy, W * 0.5);
    grd.addColorStop(0, 'rgba(155,108,255,0.35)');
    grd.addColorStop(1, 'rgba(155,108,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(W / 2, cy, W * 0.48, 34, 0, 0, TAU); g.fill();
    for (const [p, side] of [[a, -1], [b, 1]]) {
      const x = W / 2 + side * W * (opts.spread || 0.24);
      const glow = g.createRadialGradient(x, cy - 90, 10, x, cy - 90, 170);
      glow.addColorStop(0, rgba(p.color, 0.35));
      glow.addColorStop(1, rgba(p.color, 0));
      g.fillStyle = glow;
      g.fillRect(x - 180, cy - 280, 360, 300);
      g.strokeStyle = rgba(p.color, 0.8);
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, cy, 70, 14, 0, 0, TAU); g.stroke();
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
      h('div.title-sub', 'Arcade competitivo local · 2 jugadores · 1 teclado · 12 minijuegos')));
  scr.nav = false;
  scr.onKey = (e) => {
    if (e.code === 'F11' || e.code === 'F5' || e.code === 'F12') return false;
    go();
    return true;
  };
  return scr;
}

const MENU = [
  { id: 'duel', title: 'DUEL MODE', sub: 'La competición principal: varios minijuegos, un campeón', color: '#3985FF', icon: 'duel' },
  { id: 'quick', title: 'QUICK PLAY', sub: 'Elegí un minijuego y jugá ya', color: '#48D597', icon: 'quick' },
  { id: 'tournament', title: 'TOURNAMENT', sub: 'Rondas, clasificación y una gran final', color: '#9B6CFF', icon: 'tournament' },
  { id: 'survival', title: 'SURVIVAL', sub: 'Desafíos sin fin con dificultad creciente', color: '#FF654F', icon: 'survival' },
  { id: 'records', title: 'RECORDS', sub: 'Ranking mundial, récords, logros e historial', color: '#FFC93C', icon: 'records' },
  { id: 'settings', title: 'SETTINGS', sub: 'Sonido, controles, video y datos', color: '#25CFE6', icon: 'settings' },
];

export function menuScreen(ui) {
  const app = ui.app;
  const scr = {};
  const open = (id) => {
    app.audio.play('click');
    const cont = (fn) => ui.show(fn);
    switch (id) {
      case 'duel': cont(duelSetupScreen); break;
      case 'quick': cont(quickPlayScreen); break;
      case 'tournament': cont(tournamentSetupScreen); break;
      case 'survival': cont(survivalSetupScreen); break;
      case 'records': cont(recordsScreen); break;
      case 'settings': cont(settingsScreen); break;
      case 'players':
        ui.show(playerSelectScreen, { title: 'JUGADORES', subtitle: 'Iniciá sesión con tu cuenta o jugá como invitado', onDone: () => ui.goMenu(), onBack: () => ui.goMenu() });
        break;
    }
  };
  const s = app.save.stats;
  const svc = app.accounts;
  const [p1, p2] = app.profiles;
  const stageName = (p) => {
    const prof = app.profiles[p];
    const acc = svc.slotAccount(p);
    return h('div.stage-name', { style: { '--c': prof.color } }, h('small', `JUGADOR ${p + 1}`), prof.name,
      h('em', acc ? `${acc.rating} ELO` : 'Invitado'));
  };
  const names = h('div.stage-names', stageName(0), h('div.stage-vs', 'VS'), stageName(1));
  const facts = h('div.menu-facts');
  const status = h('div.acc-status');
  const renderLive = () => {
    names.replaceChildren(stageName(0), h('div.stage-vs', 'VS'), stageName(1));
    const top = svc.ranking()[0];
    facts.replaceChildren(
      fact(svc.accounts.size, svc.mode === 'local' ? 'cuentas en esta compu' : 'cuentas en el ranking'),
      fact(top ? top.name : '—', 'número 1 del ranking'),
      fact(s.totalMinigames, 'minijuegos jugados aquí'));
    status.className = 'acc-status' + (svc.mode === 'cloud' ? ' on' : '');
    status.replaceChildren(icon(svc.mode === 'cloud' ? 'records' : 'user'), h('span', svc.modeLabel));
  };
  renderLive();
  const unsub = svc.on(() => { if (!scr.disposed) renderLive(); });
  scr.destroy = () => unsub();
  scr.el = h('div.menu-screen',
    h('div.menu-left',
      logo(),
      h('div.menu-list', MENU.map((m, i) =>
        h('button.menu-btn', { nav: true, 'data-autofocus': i === 0 || null, style: { '--accent': m.color, '--i': i }, onclick: () => open(m.id) },
          h('span.menu-icon', icon(m.icon)),
          h('span.menu-text', h('span.menu-title', m.title), h('span.menu-sub', m.sub)),
          h('span.menu-arrow', icon('play')))))),
    h('div.menu-right',
      h('div.menu-stage', duoStage(ui, scr, 640, 430), names),
      h('div.menu-duo',
        h('button.btn', { nav: true, onclick: () => open('players') }, icon('user'), 'JUGADORES Y CUENTAS'),
        h('button.btn', { nav: true, onclick: () => { app.audio.play('click'); ui.show(clubScreen); } }, icon('star'), 'CLUB · PERFILES')),
      facts),
    h('div.menu-footer',
      h('div.hints',
        h('span', h('span.keycap', 'W S'), h('span.keycap', '↑ ↓'), ' navegar'),
        h('span', h('span.keycap', 'F'), h('span.keycap', 'ENTER'), ' elegir'),
        h('span', h('span.keycap', 'ESC'), ' volver')),
      h('div.row', status, h('button.icon-btn', { nav: true, title: 'Pantalla completa', onclick: () => toggleFullscreen() }, icon('fullscreen')))));
  scr.onBack = () => {};
  return scr;
}
function fact(v, label) {
  return h('div.fact', h('b', String(v)), h('span', label));
}

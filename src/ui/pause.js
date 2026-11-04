// Menú de pausa: continuar, reiniciar, volumen rápido y salir (con confirmación).
import { h, icon, toggleFullscreen } from './dom.js';

export function pauseModal(ui, { meta, canRestart, onResume, onRestart, onQuit }) {
  const app = ui.app;
  const s = app.settings;
  const vol = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.master, nav: true, 'aria-label': 'Volumen general' });
  const paint = () => vol.style.setProperty('--v', vol.value * 100 + '%');
  vol.addEventListener('input', () => { s.master = Number(vol.value); app.applySettings(); paint(); });
  paint();
  const el = h('div.pause-menu',
    h('h2', 'PAUSA'),
    h('div.sub', meta.name),
    h('button.btn.primary.big', { nav: true, 'data-autofocus': true, onclick: () => onResume() }, icon('play'), 'CONTINUAR'),
    canRestart ? h('button.btn', { nav: true, onclick: () => { app.audio.play('click'); onRestart(); } }, 'REINICIAR MINIJUEGO') : null,
    h('button.btn', { nav: true, onclick: () => toggleFullscreen() }, icon('fullscreen'), 'PANTALLA COMPLETA'),
    h('div.pause-vol', icon('sound'), vol),
    h('button.btn.danger', { nav: true, onclick: () => onQuit() }, 'SALIR'));
  return {
    el,
    onBack: () => onResume(),
    onKey: (e) => {
      if (e.code === 'KeyP' && !e.repeat) { onResume(); return true; }
      return false;
    },
  };
}

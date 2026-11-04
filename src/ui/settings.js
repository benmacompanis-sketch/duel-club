// SETTINGS: audio, video, controles reasignables y gestión de datos.
import { h, icon, keycap, toggleFullscreen } from './dom.js';
import { header, segGroup, toggleRow, rangeRow } from './widgets.js';
import { ACTIONS, ACTION_LABELS, keyName } from '../core/inputManager.js';

export function settingsScreen(ui, params = {}) {
  const app = ui.app;
  const scr = {};
  const goBack = () => (params?.back ? params.back() : ui.goMenu());
  const s = app.settings;
  let waiting = null; // {p, action, btn}
  const apply = () => app.applySettings();

  const bindGrid = h('div.bind-grid');
  function renderBinds() {
    bindGrid.replaceChildren(h('span'), h('span.hd', { style: { color: app.profiles[0].color } }, 'JUGADOR 1'), h('span.hd', { style: { color: app.profiles[1].color } }, 'JUGADOR 2'));
    for (const a of ACTIONS) {
      bindGrid.append(h('span', ACTION_LABELS[a]));
      for (const p of [0, 1]) {
        const btn = h('button.bind-btn.p' + (p + 1), { nav: true, onclick: () => startWait(p, a, btn) }, keyName(app.input.bindings[p][a][0]));
        bindGrid.append(btn);
      }
    }
  }
  function startWait(p, action, btn) {
    if (waiting) waiting.btn.classList.remove('wait');
    waiting = { p, action, btn };
    btn.classList.add('wait');
    btn.textContent = 'Pulsá una tecla…';
    app.audio.play('click');
  }
  scr.onKey = (e) => {
    if (!waiting) return false;
    if (e.repeat) return true;
    if (e.code === 'Escape') {
      waiting.btn.classList.remove('wait');
      waiting = null;
      renderBinds();
      app.audio.play('back');
      return true;
    }
    if (!app.input.rebind(waiting.p, waiting.action, e.code)) {
      app.audio.play('error');
      ui.toast({ title: 'Tecla reservada', text: `${keyName(e.code)} no se puede asignar (se usa para pausar o el navegador).`, kind: 'warn', time: 2500 });
      return true;
    }
    s.bindings = structuredClone(app.input.bindings);
    app.persist();
    app.audio.play('confirm');
    const btn = waiting.btn;
    waiting = null;
    renderBinds();
    // mantener el foco cerca del botón editado
    const idx = [...bindGrid.querySelectorAll('.bind-btn')].findIndex((b) => b.textContent === btn.textContent);
    bindGrid.querySelectorAll('.bind-btn')[Math.max(0, idx)]?.focus();
    return true;
  };
  renderBinds();

  const fsToggle = h('button.toggle', { nav: true, 'aria-label': 'Pantalla completa', onclick: () => { toggleFullscreen(); app.audio.play('click'); } });
  const fsSync = () => fsToggle.classList.toggle('on', !!document.fullscreenElement);
  document.addEventListener('fullscreenchange', fsSync);
  fsSync();

  scr.el = h('div.page',
    header(ui, 'CONFIGURACIÓN', 'Los cambios se guardan automáticamente en este navegador.', () => goBack()),
    h('div.set-body',
      h('div.card', h('h3', 'SONIDO'),
        rangeRow('Volumen general', null, 0, 1, 0.05, () => s.master, (v) => { s.master = v; apply(); }),
        rangeRow('Música', null, 0, 1, 0.05, () => s.music, (v) => { s.music = v; apply(); }),
        rangeRow('Efectos de sonido', null, 0, 1, 0.05, () => s.sfx, (v) => { s.sfx = v; apply(); }),
        toggleRow('Música', 'Música del menú y de los minijuegos', () => !s.musicOff, (v) => { s.musicOff = !v; apply(); }, ui),
        toggleRow('Efectos', 'Sonidos de botones, golpes y premios', () => !s.sfxOff, (v) => { s.sfxOff = !v; apply(); }, ui),
        h('div.set-actions', { style: { marginTop: '10px' } },
          h('button.btn.small', { nav: true, onclick: () => app.audio.play('win') }, icon('sound'), 'Probar efectos'),
          h('button.btn.small', { nav: true, onclick: () => { s.master = 0; apply(); ui.show(settingsScreen); } }, 'Silenciar todo'))),
      h('div.card', h('h3', 'VIDEO'),
        h('div.opt', h('div.opt-label', h('b', 'Pantalla completa'), h('span', 'También con F11')), fsToggle),
        toggleRow('Animaciones', 'Fondos, sacudidas, confeti y transiciones', () => s.animations, (v) => { s.animations = v; apply(); }, ui),
        segGroup('Calidad visual', 'Brillo neón, partículas y resolución', [['high', 'Alta'], ['medium', 'Media'], ['low', 'Baja']], () => s.quality, (v) => { s.quality = v; apply(); }, ui),
        rangeRow('Desfase de ritmo', 'Calibra BEAT BATTLE si sentís las notas adelantadas o atrasadas', -150, 150, 5, () => s.beatOffset, (v) => { s.beatOffset = v; app.persist(); }, (v) => `${v > 0 ? '+' : ''}${v} ms`)),
      h('div.card', h('h3', 'CONTROLES'),
        h('p.muted', { style: { margin: '0 0 10px', fontSize: '13px' } }, 'Elegí una acción y pulsá la nueva tecla. Si ya estaba en uso, se intercambia. ESC y P quedan reservadas para pausar.'),
        bindGrid,
        h('div.set-actions', { style: { marginTop: '12px' } },
          h('button.btn.small', { nav: true, onclick: () => { app.input.resetBindings(); s.bindings = null; app.persist(); renderBinds(); app.audio.play('confirm'); } }, 'Restablecer controles'))),
      h('div.card', h('h3', 'DATOS Y CUENTAS'),
        h('p.muted', { style: { margin: '0 0 12px', fontSize: '13px', lineHeight: 1.5 } }, 'El progreso de las cuentas (KEKE, PIES, SUSI, logros, inventario, historial) se guarda en el servidor y funciona desde cualquier dispositivo. Este navegador guarda solo los ajustes, los controles, las sesiones iniciadas y los récords locales de esta compu.'),
        h('div.set-actions',
          h('button.btn.small.danger', { nav: true, onclick: async () => {
            if (await ui.confirm({ title: '¿Borrar los datos locales?', text: 'Se borran las estadísticas e historial de ESTA compu (partidas de invitados). Las cuentas no se tocan.', yes: 'Borrar', no: 'Cancelar' })) {
              app.storage.resetStats();
              ui.toast({ title: 'Listo', text: 'Estadísticas locales reiniciadas.', time: 2500 });
            }
          } }, 'Reiniciar estadísticas locales')),
        h('p.muted', { style: { margin: '14px 0 0', fontSize: '12px' } }, `Guardado local: ${app.storage.available ? 'disponible' : 'no disponible en este navegador'} · Servidor: ${app.accounts.modeLabel}`))));
  scr.onBack = () => {
    if (waiting) return;
    goBack();
  };
  scr.destroy = () => document.removeEventListener('fullscreenchange', fsSync);
  return scr;
}

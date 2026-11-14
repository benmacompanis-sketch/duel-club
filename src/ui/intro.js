// Pantalla de presentación de cada minijuego: explicación, controles de ambos jugadores,
// revelación del evento especial y confirmación "LISTO" de cada jugador.
import { h, icon, keycap } from './dom.js';
import { gameIcon } from './widgets.js';
import { EVENTS, eventIcon } from '../core/events.js';

export function introScreen(ui, { meta, opts, onStart, onBack }) {
  const app = ui.app;
  const scr = {};
  const ready = [false, false];
  let started = false;
  const chips = [];

  // modos contra bot: el lugar del bot ya está listo; en el modo solo directamente no hay rival
  const botSlot = opts.bot && !opts.online ? (opts.botSlot ?? 1) : -1;
  if (botSlot >= 0) ready[botSlot] = true;
  const ctrlBox = (p) => {
    const prof = opts.players[p];
    if (p === botSlot) {
      if (opts.solo) return null;
      chips[p] = h('div.ready-chip.on', '¡LISTO!');
      return h('div.ctrl-box.bot-box', { style: { '--c': prof.color } },
        h('div.ctrl-head', h('b', prof.name), h('small', 'BOT')),
        h('div.ctrl-row', h('span.muted', 'Juega la compu.')), chips[p]);
    }
    const b = app.input.bindings[p];
    const chip = h('div.ready-chip', 'Pulsá ', keycap(b.a[0]), ' cuando estés listo');
    chips[p] = chip;
    return h('div.ctrl-box', { style: { '--c': prof.color } },
      h('div.ctrl-head', h('b', prof.name), h('small', `JUGADOR ${p + 1}`)),
      ...meta.controls.map((c) => h('div.ctrl-row', h('span', c.label), h('span.keys', ...c.actions.map((a) => keycap(b[a][0]))))),
      chip);
  };

  let evBox = null;
  if (opts.event && EVENTS[opts.event]) {
    const ev = EVENTS[opts.event];
    const ic = h('div.ev-icon');
    const name = h('b', '???');
    const desc = h('span', 'Sorteando evento especial...');
    evBox = h('div.intro-event.rolling', { style: { '--ec': '#9B6CFF' } }, ic, h('div', name, desc));
    const ids = Object.keys(EVENTS);
    let n = 0;
    const roll = () => {
      if (scr.disposed) return;
      if (n < 14) {
        const e = EVENTS[ids[n % ids.length]];
        name.textContent = e.name;
        ic.innerHTML = eventIcon(e.id);
        evBox.style.setProperty('--ec', e.color);
        app.audio.play('tick');
        n++;
        setTimeout(roll, 60 + n * 9);
      } else {
        evBox.classList.remove('rolling');
        evBox.style.setProperty('--ec', ev.color);
        ic.innerHTML = eventIcon(ev.id);
        name.textContent = 'EVENTO: ' + ev.name;
        desc.textContent = ev.desc;
        app.audio.play('powerup');
      }
    };
    setTimeout(roll, 350);
  }

  const start = () => {
    if (started) return;
    started = true;
    app.audio.play('confirm');
    onStart();
  };
  const setReady = (p) => {
    if (ready[p] || started) return;
    ready[p] = true;
    chips[p].classList.add('on');
    chips[p].textContent = '¡LISTO!';
    app.audio.play('ready');
    if (ready[0] && ready[1]) setTimeout(start, 380);
  };
  const back = () => {
    if (opts.mode === 'quick') app.runner.abort();
    else onBack();
  };

  scr.el = h('div.intro', { style: { '--c': meta.color } },
    h('div.intro-card',
      h('div.intro-info',
        h('div.intro-top', gameIcon(ui, scr, meta, 130),
          h('div', h('div.intro-kicker', `${opts.label || 'MINIJUEGO'} · ${meta.category.toUpperCase()}`), h('h1.intro-title', meta.name), h('div.muted', meta.tagline))),
        h('p.intro-desc', meta.description),
        h('div.intro-goal', icon(opts.solo ? 'star' : 'trophy'), h('span', opts.goal || meta.goal)),
        evBox),
      h('div.intro-controls' + (opts.solo ? '.solo' : ''), ctrlBox(0), ctrlBox(1)),
      h('div.intro-actions',
        h('button.btn.ghost', { nav: true, onclick: back }, icon('back'), opts.mode === 'quick' ? 'VOLVER' : 'SALIR'),
        h('span.tip', 'Durante la partida: ', keycap('Escape'), ' o ', keycap('KeyP'), ' para pausar'),
        h('button.btn.primary', { nav: true, onclick: start }, icon('play'), 'EMPEZAR YA'))));
  scr.nav = false;
  scr.onKey = (e) => {
    if (e.repeat) return true;
    if (e.code === 'Escape') { back(); return true; }
    if (e.player >= 0 && e.player !== botSlot && e.action === 'a') { setReady(e.player); return true; }
    return e.player >= 0;
  };
  return scr;
}

// Partidas locales entre dos cuentas reales: CASUAL (sin ELO) o COMPETITIVA (ELO global, mismo ranking mundial
// que el online). La competitiva necesita que CADA jugador la confirme con su propia tecla; si cualquiera elige
// casual, se juega casual. El servidor registra la sesión antes de empezar y no se puede cambiar a mitad.
import { h, icon, keycap } from './dom.js';
import { errorText } from '../net/api.js';

/**
 * Pregunta la modalidad si J1 y J2 tienen cuenta. Devuelve { ranked: sessionId|null } o null si se canceló.
 * compId: identificador de la competición (o null para una partida rápida).
 */
export async function chooseModality(app, compId = null) {
  const svc = app.accounts;
  const A = [svc.slotAccount(0), svc.slotAccount(1)];
  if (!A[0] || !A[1] || svc.status !== 'online') return { ranked: null };
  const choice = await new Promise((resolve) => {
    const conf = [false, false];
    let done = false;
    const finish = (v) => { if (done) return; done = true; close(); resolve(v); };
    const b = app.input.bindings;
    const boxes = [0, 1].map((p) => {
      const st = h('div.rc-state', 'Esperando…');
      const el = h('div.rc-player' + (p ? '.p2' : '.p1'),
        h('small', `J${p + 1}`), h('b', A[p].name), h('span', `${A[p].rating} ELO`),
        st,
        h('div.rc-keys', h('span', keycap(b[p].a[0]), ' competitiva'), h('span', keycap(b[p].b[0]), ' casual')),
        h('button.btn.small' + (p ? '.p2' : ''), { nav: true, onclick: () => vote(p) }, 'CONFIRMO COMPETITIVA'));
      return { el, st };
    });
    const vote = (p) => {
      conf[p] = true;
      boxes[p].el.classList.add('ok');
      boxes[p].st.textContent = '¡CONFIRMADO!';
      app.audio.play('ready');
      if (conf[0] && conf[1]) setTimeout(() => finish('ranked'), 350);
    };
    const close = app.ui.modal(() => ({
      el: h('div.dialog.ranked-dialog',
        h('h2', '¿CASUAL O COMPETITIVA?'),
        h('p', 'Los dos tienen cuenta. Elijan cómo quieren jugar:'),
        h('div.rc-modes',
          h('div.rc-mode.casual', icon('heart'), h('b', 'CASUAL'), h('span', 'No cambia el ELO. Suma XP y PIES como siempre.')),
          h('div.rc-mode.ranked', icon('trophy'), h('b', 'COMPETITIVA'), h('span', 'Cambia el ELO global de los dos: el mismo del online y del ranking mundial. Tienen que confirmar los dos.'))),
        h('div.rc-players', boxes[0].el, boxes[1].el),
        h('div.dialog-actions',
          h('button.btn.ghost', { nav: true, onclick: () => finish(null) }, 'VOLVER'),
          h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => finish('casual') }, 'JUGAR CASUAL'))),
      onBack: () => finish(null),
      onKey: (e) => {
        if (e.repeat || e.player < 0) return false;
        if (e.action === 'a') { vote(e.player); return true; }
        if (e.action === 'b') { finish('casual'); return true; }
        return false;
      },
    }));
  });
  if (choice == null) return null;
  if (choice === 'casual') return { ranked: null };
  try {
    const out = await svc.rankedOpen(compId);
    if (!out.ranked) {
      app.ui.toast({ kind: 'warn', title: 'Se juega casual', text: 'Hoy ya jugaron muchas partidas competitivas entre ustedes. Pueden seguir en casual; el ELO se vuelve a habilitar más adelante.' });
      return { ranked: null };
    }
    app.ui.toast({ kind: 'ok', title: 'Partida competitiva', text: 'El resultado va a cambiar el ELO global de los dos.' });
    return { ranked: out.session };
  } catch (e) {
    app.ui.toast({ kind: 'warn', title: 'Se juega casual', text: errorText(e) });
    return { ranked: null };
  }
}

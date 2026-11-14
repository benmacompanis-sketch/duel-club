// Selección de jugadores estilo arcade: cada jugador maneja su panel con sus propias teclas
// (J1: WASD + F, J2: flechas + ENTER) al mismo tiempo. También funciona con mouse.
// Cada jugador puede iniciar sesión con su cuenta (nombre + PIN) o jugar como invitado.
import { h, icon, keycap } from './dom.js';
import { header } from './widgets.js';
import { CHARACTERS, PLAYER_COLORS, drawCharacter, normLook } from '../core/characters.js';
import { ITEM_BY_ID, ALL_ITEMS } from '../data/catalog.js';
import { errorText } from '../net/api.js';
import { accountModal } from './accountModal.js';
import { TAU, rgba } from '../core/utils.js';

export function playerSelectScreen(ui, params) {
  const app = ui.app;
  const svc = app.accounts;
  const scr = {};
  const profiles = app.profiles;
  const ach = app.achievements;
  const state = [0, 1].map((p) => ({ row: 0, cursor: 0, ready: false }));
  const panels = [];
  let finishing = false;

  // Valores válidos para cada jugador (lo bloqueado vuelve a lo básico) y sin colores repetidos.
  function normalize() {
    for (const p of [0, 1]) {
      const prof = profiles[p];
      if (!ach.isCharUnlocked(prof.char, p)) prof.char = p ? 'mochi' : 'volt';
      const hat = normLook(prof.acc).hat;
      if (hat && !ach.owns(hat, p)) prof.acc = svc.slotAccount(p) ? { ...(svc.slotAccount(p).equipped || {}) } : 'none';
      state[p].cursor = Math.max(0, CHARACTERS.findIndex((c) => c.id === prof.char));
    }
    if (profiles[1].color === profiles[0].color) {
      const free = PLAYER_COLORS.find((c) => c.hex !== profiles[0].color && (c.hex === '#FF654F' || c.hex === '#3985FF')) || PLAYER_COLORS[1];
      profiles[1].color = free.hex;
    }
  }
  normalize();

  const lockText = (charId) => {
    const it = ITEM_BY_ID['char_' + charId];
    if (!it) return '';
    if (!svc.slotAccount(0) && !svc.slotAccount(1)) return 'Bloqueado · Iniciá sesión para desbloquear personajes';
    return it.price != null ? `En la PIE STORE · ${it.price} PIES` : `Bloqueado · ${it.unlock || 'Se desbloquea jugando'}`;
  };
  // sombreros disponibles: los del inventario de la cuenta o los básicos para invitados
  const hatsFor = (p) => [null, ...ALL_ITEMS.filter((it) => it.category === 'hat' && ach.owns(it.id, p)).map((it) => it.id)];
  const saveLook = (p) => {
    if (!svc.slotAccount(p)) return;
    svc.setLook(p, { char: profiles[p].char, color: profiles[p].color }).catch((e) => ui.toast({ kind: 'warn', title: 'No se guardó el aspecto', text: errorText(e) }));
  };
  const setHat = (p, id) => {
    const prof = profiles[p];
    if (svc.slotAccount(p)) {
      prof.acc = { ...normLook(prof.acc), hat: id || undefined };
      svc.equip(p, 'hat', id).catch((e) => ui.toast({ kind: 'warn', title: 'No se pudo equipar', text: errorText(e) }));
    } else {
      prof.acc = id ? { hat: id } : 'none';
    }
    app.persist();
  };

  function openAccount(p) {
    if (state[p].ready) return;
    app.audio.play('click');
    ui.modal(accountModal, {
      p,
      onDone: () => {
        normalize();
        state[p].ready = false;
        rebuildLocks();
        refreshAll();
      },
    });
  }

  function buildPanel(p) {
    const prof = profiles[p];
    const st = state[p];
    const el = h('div.ps-panel');
    const account = h('div.ps-account');
    const charInfo = h('div.ps-charinfo');
    const lockInfo = h('div.ps-lockinfo');
    const big = ui.preview(scr, 210, 200, (g, w, hh, t) => {
      const ch = CHARACTERS[st.cursor];
      const locked = !ach.isCharUnlocked(ch.id, p);
      const grd = g.createRadialGradient(w / 2, hh * 0.6, 10, w / 2, hh * 0.6, w * 0.6);
      grd.addColorStop(0, rgba(prof.color, 0.35));
      grd.addColorStop(1, rgba(prof.color, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, w, hh);
      g.strokeStyle = rgba(prof.color, 0.7);
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(w / 2, hh * 0.9, 72, 14, 0, 0, TAU); g.stroke();
      if (locked) {
        g.save();
        g.filter = 'brightness(0)';
        drawCharacter(g, { id: ch.id, x: w / 2, y: hh * 0.9, s: 1.5, color: '#333', anim: 'idle', t, acc: 'none' });
        g.restore();
        g.font = '56px "Russo One"';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(246,247,251,0.75)';
        g.fillText('?', w / 2, hh * 0.55);
      } else {
        drawCharacter(g, { id: ch.id, x: w / 2, y: hh * 0.9, s: 1.5, color: prof.color, anim: st.ready ? 'celebrate' : 'idle', t, acc: prof.acc, facing: p === 0 ? 1 : -1 });
      }
    });
    const charGrid = h('div.ps-chars');
    const sw = h('div.ps-swatches');
    PLAYER_COLORS.forEach((c) => {
      sw.append(h('button.swatch', { nav: true, title: c.name, style: { background: c.hex, color: c.hex }, dataset: { hex: c.hex }, onclick: () => { st.row = 1; setColor(p, c.hex); } }));
    });
    const accs = h('div.ps-accs');
    const charCount = h('span');
    const rows = [
      h('div.ps-row', h('div.ps-row-label', h('span', 'PERSONAJE'), charCount), charGrid),
      h('div.ps-row', h('div.ps-row-label', h('span', 'COLOR')), sw),
      h('div.ps-row', h('div.ps-row-label', h('span', 'SOMBRERO')), accs),
    ];
    const badge = h('div.ps-ready-badge', 'ELIGIENDO');
    const readyBtn = h('button.btn.small', { nav: true, onclick: () => toggleReady(p) }, 'LISTO');
    const b = app.input.bindings[p];
    const keys = h('div.ps-keys', keycap(b.up[0]), keycap(b.down[0]), ' fila ', keycap(b.left[0]), keycap(b.right[0]), ' cambiar ', keycap(b.a[0]), ' listo ', keycap(b.b[0]), ' cuenta');
    el.append(
      h('div.ps-preview', h('div.ps-slot', `JUGADOR ${p + 1}`), account, big, charInfo, lockInfo),
      h('div.ps-rows', ...rows),
      h('div.ps-ready', keys, h('div.row', readyBtn, badge)));
    panels[p] = { el, rows, charGrid, sw, accs, badge, charInfo, lockInfo, readyBtn, account, charCount, nameIn: null };
    return el;
  }

  // Las listas de personajes/accesorios dependen de los logros de cada jugador.
  function rebuildLocks() {
    for (const p of [0, 1]) {
      const P = panels[p], st = state[p], prof = profiles[p];
      P.charGrid.replaceChildren(...CHARACTERS.map((ch, i) => {
        const locked = !ach.isCharUnlocked(ch.id, p);
        const btn = h('button.ps-char' + (locked ? '.locked' : ''), { nav: true, title: locked ? lockText(ch.id) : ch.name, onclick: () => { st.row = 0; st.cursor = i; applyCursor(p); refreshAll(); } },
          ui.preview(scr, 62, 54, (g, w, hh, t) => {
            if (locked) {
              g.save(); g.filter = 'brightness(0.25)';
              drawCharacter(g, { id: ch.id, x: w / 2, y: hh - 4, s: 0.5, color: '#556', anim: 'idle', t: 0, shadow: false });
              g.restore();
              return 'static';
            }
            drawCharacter(g, { id: ch.id, x: w / 2, y: hh - 4, s: 0.5, color: prof.color, anim: 'idle', t: t + i, shadow: false });
          }));
        if (locked) btn.append(h('span.lock', icon('lock')));
        return btn;
      }));
      P.charCount.textContent = `${CHARACTERS.filter((c) => ach.isCharUnlocked(c.id, p)).length}/${CHARACTERS.length}`;
      P.accs.replaceChildren(...hatsFor(p).map((id) => h('button.ps-acc', {
        nav: true, dataset: { id: id || 'none' }, title: id ? ITEM_BY_ID[id].name : 'Ninguno',
        onclick: () => { st.row = 2; setHat(p, id); app.audio.play('click'); refreshAll(); },
      }, id ? ITEM_BY_ID[id].name : 'Ninguno')));
    }
  }

  function renderAccount(p) {
    const P = panels[p], prof = profiles[p];
    const acc = svc.slotAccount(p);
    if (acc) {
      P.nameIn = null;
      P.account.className = 'ps-account on';
      P.account.replaceChildren(
        h('div.ps-acc-main', h('b', acc.name), h('span', `Nivel ${acc.level} · ${acc.rating} ELO · ${acc.played} partidas`)),
        h('button.btn.small.ghost', { nav: true, title: 'Dejar el puesto (la sesión queda guardada en esta compu)', onclick: () => { if (state[p].ready) return; svc.detach(p); app.audio.play('back'); normalize(); rebuildLocks(); refreshAll(); } }, 'SALIR'));
    } else {
      const nameIn = h('input.ps-name', { type: 'text', maxlength: 12, value: prof.name, nav: true, spellcheck: 'false', 'aria-label': `Nombre del jugador ${p + 1}` });
      nameIn.addEventListener('input', () => { prof.name = nameIn.value.slice(0, 12); app.persist(); });
      nameIn.addEventListener('blur', () => { if (!prof.name.trim()) { prof.name = `Jugador ${p + 1}`; nameIn.value = prof.name; app.persist(); } });
      P.nameIn = nameIn;
      P.account.className = 'ps-account';
      P.account.replaceChildren(
        nameIn,
        h('button.btn.small.acc-btn', { nav: true, onclick: () => openAccount(p) }, icon('user'), 'ENTRAR / CREAR CUENTA'));
    }
  }

  function applyCursor(p) {
    const ch = CHARACTERS[state[p].cursor];
    if (ach.isCharUnlocked(ch.id, p)) {
      profiles[p].char = ch.id;
      saveLook(p);
      app.persist();
      app.audio.play('click');
    } else app.audio.play('tap');
  }
  function setColor(p, hex) {
    if (profiles[1 - p].color === hex) { app.audio.play('error'); return; }
    profiles[p].color = hex;
    saveLook(p);
    app.persist();
    app.audio.play('click');
    refreshAll();
  }
  function cycle(p, dir) {
    const st = state[p], prof = profiles[p];
    if (st.ready) return;
    if (st.row === 0) {
      st.cursor = (st.cursor + dir + CHARACTERS.length) % CHARACTERS.length;
      applyCursor(p);
    } else if (st.row === 1) {
      let i = PLAYER_COLORS.findIndex((c) => c.hex === prof.color);
      for (let k = 0; k < PLAYER_COLORS.length; k++) {
        i = (i + dir + PLAYER_COLORS.length) % PLAYER_COLORS.length;
        if (PLAYER_COLORS[i].hex !== profiles[1 - p].color) break;
      }
      prof.color = PLAYER_COLORS[i].hex;
      saveLook(p);
      app.audio.play('click');
    } else {
      const hats = hatsFor(p);
      const cur = normLook(prof.acc).hat || null;
      const i = (hats.indexOf(cur) + dir + hats.length) % hats.length;
      setHat(p, hats[i]);
      app.audio.play('click');
    }
    app.persist();
    refreshAll();
  }
  function toggleReady(p) {
    const st = state[p];
    const ch = CHARACTERS[st.cursor];
    if (!st.ready && !ach.isCharUnlocked(ch.id, p)) {
      app.audio.play('error');
      panels[p].lockInfo.textContent = lockText(ch.id);
      return;
    }
    st.ready = !st.ready;
    app.audio.play(st.ready ? 'ready' : 'back');
    refreshAll();
    if (state[0].ready && state[1].ready) finish();
  }
  function finish() {
    if (finishing) return;
    finishing = true;
    for (const p of [0, 1]) profiles[p].name = (profiles[p].name || '').trim() || `Jugador ${p + 1}`;
    if (profiles[0].name.toLowerCase() === profiles[1].name.toLowerCase()) {
      // solo se renombra a un invitado; las cuentas tienen nombres únicos
      const g = profiles[1].accountId ? 0 : 1;
      if (!profiles[g].accountId) profiles[g].name = profiles[g].name.slice(0, 10) + ' 2';
    }
    app.persist();
    setTimeout(() => { if (!scr.disposed) params.onDone?.(); }, 650);
  }
  function refreshAll() {
    for (const p of [0, 1]) {
      const P = panels[p], st = state[p], prof = profiles[p];
      P.el.style.setProperty('--c', prof.color);
      P.el.classList.toggle('ready', st.ready);
      P.rows.forEach((r, i) => r.classList.toggle('sel', i === st.row));
      [...P.charGrid.children].forEach((b, i) => b.classList.toggle('active', i === st.cursor));
      [...P.sw.children].forEach((b) => {
        b.classList.toggle('active', b.dataset.hex === prof.color);
        b.disabled = b.dataset.hex === profiles[1 - p].color;
      });
      const curHat = normLook(prof.acc).hat || 'none';
      [...P.accs.children].forEach((b) => b.classList.toggle('active', b.dataset.id === curHat));
      const ch = CHARACTERS[st.cursor];
      const locked = !ach.isCharUnlocked(ch.id, p);
      P.charInfo.replaceChildren(h('b', locked ? '???' : ch.name), h('span', locked ? 'Personaje bloqueado' : ch.title));
      P.lockInfo.textContent = locked ? lockText(ch.id) : '';
      P.badge.textContent = st.ready ? '¡LISTO!' : 'ELIGIENDO';
      P.readyBtn.textContent = st.ready ? 'CAMBIAR' : 'LISTO';
      const accId = svc.slotAccount(p)?.username || null;
      if (P.renderedFor !== accId || (accId && P.renderedRating !== svc.slotAccount(p).rating)) {
        P.renderedFor = accId;
        P.renderedRating = svc.slotAccount(p)?.rating;
        renderAccount(p);
      }
      if (P.nameIn && document.activeElement !== P.nameIn && P.nameIn.value !== prof.name) P.nameIn.value = prof.name;
    }
  }

  scr.el = h('div.page',
    header(ui, params.title || 'JUGADORES', params.subtitle || '', () => params.onBack?.(),
      h('div.acc-status' + (svc.status === 'online' ? '.on' : ''), icon(svc.status === 'online' ? 'records' : 'user'), h('span', svc.modeLabel))),
    h('div.ps-body', buildPanel(0), buildPanel(1)));
  scr.nav = true;
  scr.onKey = (e) => {
    if (e.player < 0 || (e.repeat && e.action !== 'left' && e.action !== 'right')) return false;
    const p = e.player;
    const st = state[p];
    switch (e.action) {
      case 'up': if (!st.ready) { st.row = (st.row + 2) % 3; app.audio.play('hover'); refreshAll(); } return true;
      case 'down': if (!st.ready) { st.row = (st.row + 1) % 3; app.audio.play('hover'); refreshAll(); } return true;
      case 'left': cycle(p, -1); return true;
      case 'right': cycle(p, 1); return true;
      case 'a': toggleReady(p); return true;
      case 'b': if (st.ready) toggleReady(p); else openAccount(p); return true;
    }
    return false;
  };
  scr.onBack = () => params.onBack?.();
  rebuildLocks();
  refreshAll();
  // si la nube termina de cargar mientras se elige, actualizar cuentas y desbloqueos
  const unsub = svc.on(() => {
    if (scr.disposed) return;
    rebuildLocks();
    refreshAll();
    const st = scr.el.querySelector('.acc-status > span:last-child');
    if (st) st.textContent = svc.modeLabel;
  });
  scr.destroy = () => unsub();
  scr.el.querySelector('.icon-btn').setAttribute('data-autofocus', '');
  return scr;
}

// COFRES: sección con los 4 cofres, probabilidades a la vista, fragmentos, historial y apertura animada.
// El premio lo decide el servidor (dc_chest_open); la animación arranca al instante y se puede saltar.
import { h, icon } from './dom.js';
import { pies, piesIcon, itemPreview, rarityChip, errorBox, loading, empty, fmtN } from './kit.js';
import { CHESTS, CHEST_ORDER, CHEST_SOURCES, PASS_JACKPOT, PIES_DROP, RARITY_ORDER } from '../data/chests.js';
import { RARITIES, ITEM_BY_ID } from '../data/catalog.js';
import { errorText } from '../net/api.js';
import { TAU } from '../core/utils.js';

const RAR_NAME = (r) => RARITIES[r]?.name || r;

/** Cofre estilo historieta (canvas). open: 0 cerrado → 1 abierto. */
export function drawChest(g, w, hh, kind, t, open = 0, shake = 0) {
  const C = CHESTS[kind];
  const s = Math.min(w / 160, hh / 140);
  g.save();
  g.translate(w / 2 + (shake ? Math.sin(t * 60) * shake * 4 : 0), hh * 0.62);
  g.scale(s, s);
  g.rotate(shake ? Math.sin(t * 47) * shake * 0.05 : 0);
  // sombra
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(0, 46, 70, 10, 0, 0, TAU); g.fill();
  // brillo de fondo según rareza
  if (kind === 'gold' || kind === 'mythic' || open > 0) {
    const a = open > 0 ? open : 0.35 + Math.sin(t * 3) * 0.12;
    const rg = g.createRadialGradient(0, -10, 4, 0, -10, 90);
    rg.addColorStop(0, `rgba(255,255,255,${0.5 * a})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, -10, 90, 0, TAU); g.fill();
  }
  const ink = '#0D0B14';
  g.lineJoin = 'round';
  // cuerpo
  g.fillStyle = C.color2; g.strokeStyle = ink; g.lineWidth = 5;
  g.beginPath(); g.rect(-62, -8, 124, 54); g.fill(); g.stroke();
  g.fillStyle = C.color; g.fillRect(-58, -4, 116, 14);
  // bandas metálicas
  g.fillStyle = C.color;
  for (const x of [-44, 32]) { g.fillRect(x, -8, 12, 54); g.strokeRect(x, -8, 12, 54); }
  // tapa (se abre rotando)
  g.save();
  g.translate(-62, -8);
  g.rotate(-open * 1.15);
  g.fillStyle = C.color2;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.quadraticCurveTo(62, -58, 124, -26); g.lineTo(124, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = C.color;
  for (const x of [18, 94]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, -34 - (x === 18 ? 0 : 0)); g.lineTo(x + 12, -36); g.lineTo(x + 12, 0); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
  // cerradura con gema
  if (open < 0.5) {
    g.fillStyle = C.color; g.beginPath(); g.rect(-11, -14, 22, 24); g.fill(); g.stroke();
    g.fillStyle = kind === 'mythic' ? '#7AF7FF' : kind === 'gold' ? '#FF3B5C' : kind === 'silver' ? '#3985FF' : '#48D597';
    g.beginPath(); g.arc(0, -2, 5, 0, TAU); g.fill(); g.lineWidth = 2.5; g.stroke();
  }
  // destello duro
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(-56, 12, 8, 26);
  g.restore();
}

function chestCanvas(ui, owner, kind, size) {
  return ui.preview(owner, size, size * 0.85, (g, w, hh, t) => drawChest(g, w, hh, kind, t));
}

export function chestsSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const body = h('div.chests-body', loading());
  const el = h('div.chests-page', body);
  let data = null;

  async function load() {
    const me = svc.slotAccount(p);
    if (!me) {
      body.replaceChildren(h('div.chests-guest', h('h2', 'COFRES'), h('p', 'Los cofres se guardan en tu cuenta. Iniciá sesión para ver y abrir los tuyos.'),
        h('button.btn.primary', { nav: true, onclick: () => ctx.login(p) }, 'INICIAR SESIÓN')));
      return;
    }
    try { data = await svc.chests(p); } catch (e) { body.replaceChildren(errorBox(errorText(e), load)); return; }
    if (!owner.disposed) render();
  }
  async function act(fn, kind) {
    try {
      const out = await fn(p, kind);
      data = out.chests;
      render();
      return out;
    } catch (e) { ui.toast({ kind: 'warn', title: 'No se pudo', text: errorText(e) }); return null; }
  }
  function render() {
    const me = svc.slotAccount(p);
    const inv = data.inv || {};
    const total = CHEST_ORDER.reduce((n, k) => n + (inv[k] || 0), 0);
    body.replaceChildren(
      h('div.chests-head',
        h('div', h('h2', 'COFRES'), h('p', 'Se ganan jugando. El premio lo decide el servidor y las probabilidades están a la vista.')),
        h('div.chests-bal', h('div.cb-box', h('small', 'FRAGMENTOS'), h('b', fmtN(data.shards))), h('div.cb-box', h('small', 'TUS PIES'), pies(me.pies)), h('div.cb-box', h('small', 'ABIERTOS'), h('b', fmtN(data.opened))))),
      h('div.chests-row', CHEST_ORDER.map((k) => {
        const C = CHESTS[k], n = inv[k] || 0;
        return h('div.chest-card.' + k, { style: { '--c': C.color, '--c2': C.color2 } },
          h('div.cc-top', h('b', C.name.toUpperCase()), h('span.cc-n' + (n ? '.on' : ''), `x${n}`)),
          chestCanvas(ui, owner, k, 150),
          h('button.btn.primary.cc-open', { nav: true, disabled: !n, 'data-autofocus': k === CHEST_ORDER.find((x) => inv[x]) || undefined, onclick: () => openChest(k) }, icon('star'), n ? 'ABRIR' : 'SIN COFRES'),
          h('div.cc-get',
            C.craft ? h('button.btn.small', { nav: true, disabled: data.shards < C.craft, title: `Usa ${C.craft} fragmentos`, onclick: () => act(svc.chestCraft.bind(svc), k).then((o) => o && ui.toast({ kind: 'ok', title: C.name, text: `Armaste un cofre con ${C.craft} fragmentos.` })) }, `ARMAR · ${C.craft} frag.`) : null,
            C.price ? h('button.btn.small.ghost', { nav: true, onclick: () => buy(k) }, `${fmtN(C.price)}`, piesIcon()) : h('small.muted', 'No se vende')),
          h('details.cc-odds', h('summary', 'Probabilidades'),
            h('table', RARITY_ORDER.map((r, i) => (C.odds[i] ? h('tr', h('td', rarityChip(r)), h('td', `${C.odds[i]} %`)) : null))),
            h('p.small.muted', `Además: ${PIES_DROP} % de que en lugar de un objeto salga una bolsa de PIES de esa rareza.`),
            PASS_JACKPOT[k] ? h('p.small.cc-jack', `PASE PREMIUM: ${PASS_JACKPOT[k]} % aparte de la tabla (si ya lo tenés, recibís una compensación especial).`) : null));
      })),
      h('div.chests-info',
        h('div.ci-box', h('h3', 'CÓMO SE CONSIGUEN'), h('ul', CHEST_SOURCES.map(([a, b]) => h('li', h('span', a), h('b', b))))),
        h('div.ci-box', h('h3', 'REPETIDOS'), h('p', 'Si te sale algo que ya tenés no lo perdés: se convierte en PIES y fragmentos según su rareza (de 25 PIES + 1 fragmento a 2.000 PIES + 30 fragmentos). Algunos objetos son exclusivos de cofres y no se venden en la tienda.')),
        h('div.ci-box.hist', h('h3', 'ÚLTIMOS PREMIOS'), data.log.length ? h('div.ch-log', data.log.slice(0, 12).map(logRow)) : empty('Todavía no abriste ningún cofre.', 'star'))));
    if (!total && !data.log.length) ui.focusFirst?.();
  }
  function logRow(x) {
    const it = x.item && ITEM_BY_ID[x.item];
    const what = x.special === 'pass' ? '¡PASE PREMIUM!' : x.special === 'pass_comp' ? 'Compensación del Pase Premium' : it ? it.name : `Bolsa de ${fmtN(x.pies)} PIES`;
    return h('div.ch-row', { style: { '--c': CHESTS[x.kind]?.color } },
      h('i', CHESTS[x.kind]?.name.replace('Cofre ', '') || x.kind),
      x.rarity ? rarityChip(x.rarity) : null,
      h('b', what), x.dup ? h('small', `repetido → +${fmtN(x.pies)} PIES · +${x.shards} frag.`) : null);
  }
  async function buy(k) {
    const C = CHESTS[k], me = svc.slotAccount(p);
    if ((me?.pies ?? 0) < C.price) { ui.toast({ kind: 'warn', title: 'No te alcanzan los PIES', text: `Cuesta ${fmtN(C.price)} PIES y tenés ${fmtN(me?.pies ?? 0)}.` }); return; }
    const ok = await ui.confirm({ title: `¿Comprar un ${C.name.toLowerCase()}?`, text: `Cuesta ${fmtN(C.price)} PIES. También se consiguen jugando, sin gastar nada.`, yes: 'Comprar', no: 'Cancelar', danger: false });
    if (ok) await act(svc.chestBuy.bind(svc), k);
  }
  function openChest(k) {
    app.audio.play('confirm');
    ui.modal(chestOpenModal, {
      kind: k, request: () => svc.chestOpen(p, k),
      onResult: (out) => { data = out.chests; if (!owner.disposed) render(); },
      again: () => (data?.inv?.[k] || 0) > 0,
      onAgain: () => openChest(k),
    });
  }
  load();
  return { el };
}

/** Apertura: el cofre tiembla mientras llega la respuesta, se abre con un estallido del color de la rareza y muestra el premio. */
function chestOpenModal(ui, { kind, request, onResult, again, onAgain }) {
  const app = ui.app;
  const m = {};
  let res = null, err = null, phase = 'wait', t0 = 0, skip = false;
  const stage = h('div.co-stage');
  const card = h('div.co-card');
  const btns = h('div.co-btns');
  const cv = ui.preview(m, 300, 260, (g, w, hh, t) => {
    if (!t0) t0 = t;
    const e = t - t0;
    let open = 0, shake = 0;
    if (phase === 'wait') shake = 0.6;
    else if (phase === 'anim') {
      const k = skip ? 1 : Math.min(1, e / 0.9);
      shake = k < 0.45 ? 1 : 0;
      open = k < 0.45 ? 0 : Math.min(1, (k - 0.45) / 0.3);
      if (k >= 1) reveal();
    } else open = 1;
    drawChest(g, w, hh, kind, t, open, shake);
    if (open > 0 && res) {
      const col = res.special ? '#FFD16B' : RARITIES[res.rarity]?.color || '#fff';
      g.save(); g.translate(w / 2, hh * 0.45);
      g.strokeStyle = col; g.lineWidth = 6;
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + t * 0.6; const r0 = 30 + open * 30, r1 = r0 + 20 + open * 50; g.globalAlpha = open * 0.8; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke(); }
      g.restore();
    }
  });
  stage.append(cv);
  function reveal() {
    if (phase === 'done') return;
    phase = 'done';
    const it = res.item && ITEM_BY_ID[res.item];
    const rcol = res.special ? '#FFD16B' : RARITIES[res.rarity]?.color || '#fff';
    app.audio.play(res.special || res.rarity === 'legendary' || res.rarity === 'mythic' ? 'win' : 'coin');
    card.style.setProperty('--r', rcol);
    card.classList.add('on');
    card.replaceChildren(
      res.special === 'pass' ? h('div.co-big', icon('crown'), h('b', '¡PASE PREMIUM!'), h('p', 'El premio más raro del club. Ya podés reclamar las recompensas Premium del CLUB PASS.'))
        : res.special === 'pass_comp' ? h('div.co-big', icon('crown'), h('b', '¡PASE PREMIUM!'), h('p', `Ya lo tenías, así que recibís una compensación especial: +${fmtN(res.pies)} PIES y +${res.shards} fragmentos.`))
          : it ? h('div.co-item', itemPreview(ui, m, it, 120, '#3985FF', null, false), h('div', rarityChip(res.rarity), h('b', it.name), h('small', it.chest ? 'EXCLUSIVO DE COFRES' : (it.desc || '')),
            res.dup ? h('p.co-dup', `Ya lo tenías: se convirtió en +${fmtN(res.pies)} PIES y +${res.shards} fragmentos.`) : h('p.co-new', '¡NUEVO! Ya está en tu inventario.')))
            : h('div.co-big', piesIcon(), h('b', `+${fmtN(res.pies)} PIES`), rarityChip(res.rarity)));
    btns.replaceChildren(...[
      h('button.btn', { nav: true, onclick: () => m.close() }, 'CONTINUAR'),
      again() ? h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => { m.close(); onAgain(); } }, icon('star'), 'ABRIR OTRO') : null].filter(Boolean));
    ui.focusFirst(m);
  }
  m.el = h('div.chest-open', { style: { '--c': CHESTS[kind].color }, onclick: () => { if (phase === 'anim') skip = true; } },
    h('h2', CHESTS[kind].name.toUpperCase()), stage, card, h('p.co-skip.muted', 'Tocá para saltar la animación'), btns);
  m.onBack = () => { if (phase === 'done' || err) m.close(); };
  m.onKey = (e) => { if (phase === 'anim' && (e.code === 'Space' || e.code === 'Enter')) { skip = true; return true; } };
  request().then((out) => { res = out; onResult(out); phase = 'anim'; t0 = 0; }).catch((e) => {
    err = e; phase = 'done';
    card.classList.add('on');
    card.replaceChildren(h('p', errorText(e)));
    btns.replaceChildren(h('button.btn', { nav: true, onclick: () => m.close() }, 'CERRAR'));
  });
  return m;
}

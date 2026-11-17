// PASE DE BATALLA y DESAFÍOS.
// Un solo nivel de pase por temporada (sube con toda la XP que ganás) y dos filas de recompensas:
// LIBRE (para todos) y PREMIUM (se compra una vez por temporada con PIES; nunca con dinero real).
// Al comprar el Premium, las recompensas Premium de los niveles que ya alcanzaste quedan para reclamar.
// Todo lo valida el servidor: lo reclamado no se puede reclamar dos veces.
import { h, icon } from './dom.js';
import { ITEM_BY_ID, RARITIES } from '../data/catalog.js';
import { tabs, loading, errorBox, empty, itemPreview, piesIcon, fmtN, rarityChip } from './kit.js';
import { errorText } from '../net/api.js';
import { prestigeReward } from '../data/clubPass.js';

const fmtDate = (s) => new Date(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
function timeLeft(s) {
  const ms = new Date(s) - Date.now();
  if (ms <= 0) return 'terminada';
  const d = Math.floor(ms / 86400000), hh = Math.floor((ms % 86400000) / 3600000), mm = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d} d ${hh} h` : hh > 0 ? `${hh} h ${mm} min` : `${mm} min`;
}

export function passSection(ui, owner, ctx) {
  const app = ui.app;
  const svc = app.accounts;
  const p = ctx.viewer;
  const me = svc.slotAccount(p);
  if (!me) {
    return {
      el: h('div.need-acc', icon('trophy'), h('h2', 'PASE Y DESAFÍOS'),
        h('p', 'Entrá con tu cuenta para subir el pase y hacer desafíos.'),
        h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => ctx.login(p) }, 'INICIAR SESIÓN / REGISTRARSE')),
    };
  }
  let tab = ctx.params?.tab || 'pass';
  const body = h('div.pass-body');
  const head = h('div.sec-head', h('h2', 'PASE Y DESAFÍOS'), h('p', `Viendo el progreso de ${me.name}. Toda la XP que ganás sube el CLUB PASS, para siempre.`));
  const tabBar = h('div');
  const el = h('div.pass-page', head, tabBar, body);
  function renderTabs() {
    tabBar.replaceChildren(tabs([['pass', 'CLUB PASS'], ['challenges', 'Desafíos'], ['archive', 'Archivo']], tab, (t) => { tab = t; renderTabs(); show(); }));
  }
  function show() {
    body.replaceChildren(loading());
    if (tab === 'pass') passView(null);
    else if (tab === 'challenges') challengesView();
    else archiveView();
  }

  // ---------------------------------------------------------------- pase
  let seg = null; // tramo visible (0..9 = niveles de a 25, 10 = prestigio)
  async function passView(seasonId) {
    let d;
    try { d = await svc.pass(p, seasonId); } catch (e) { if (!owner.disposed) body.replaceChildren(errorBox(errorText(e), () => passView(seasonId))); return; }
    if (owner.disposed) return;
    if (!d.season) { body.replaceChildren(empty('No hay ninguna temporada activa en este momento.', 'trophy')); return; }
    const S = d.season;
    const live = S.current;
    const perm = !!S.permanent;
    const lvShown = Math.min(d.level, S.levels);
    const prest = perm ? Math.max(0, d.level - S.levels) : 0;
    const into = d.xp - (d.xp_level ?? 0), need = Math.max(1, (d.xp_next ?? 1) - (d.xp_level ?? 0));
    const claimed = { free: new Set(d.claimed_free), premium: new Set(d.claimed_premium) };
    const byLevel = {};
    for (const r of d.rewards) (byLevel[r.level] ||= {})[r.track] = r;
    const ready = d.ready ?? 0;
    const SEG = 25, NSEG = Math.ceil(S.levels / SEG);
    if (seg == null || seasonId) seg = perm && prest > 0 ? NSEG : Math.min(NSEG - 1, Math.floor((lvShown - 1) / SEG));

    const header = h('div.pass-head' + (d.premium ? '.prem' : ''),
      h('div.ph-left',
        h('small', perm ? 'PASE PERMANENTE · SIN TEMPORADAS NI REINICIOS' : `TEMPORADA ARCHIVADA · ${fmtDate(S.starts_at)} – ${fmtDate(S.ends_at)}`),
        h('h3', S.name),
        h('div.ph-level', h('b', prest ? `PRESTIGIO ${prest}` : `NIVEL ${d.level}`), h('span', prest ? `nivel ${d.level}` : `de ${S.levels}`)),
        h('div.ph-bar', h('i', { style: { width: `${Math.min(100, (into / need) * 100)}%` } })),
        h('small.muted', `${fmtN(into)} / ${fmtN(need)} XP para el nivel ${d.level + 1}`),
        perm && d.bonus_left > 0 ? h('div.ph-bonus', icon('flame'), h('span', `Bono de regreso: tus próximos ${fmtN(d.bonus_left)} XP de pase cuentan doble.`)) : null),
      h('div.ph-right',
        d.premium
          ? h('div.ph-prem-on', icon('crown'), h('b', 'PREMIUM ACTIVO'))
          : live ? h('button.btn.gold', { nav: true, onclick: () => buy(S, d) }, icon('crown'), `PASE PREMIUM · ${fmtN(S.premium_price)}`, piesIcon()) : null,
        live && ready ? h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => claim(null, null) }, `RECLAMAR TODO (${ready})`) : null,
        !d.premium && live ? h('p.muted.small', 'Si lo comprás más tarde, recibís todo lo de los niveles que ya alcanzaste.') : null,
        !d.premium && live ? h('p.ph-jack', icon('star'), 'También puede salir en un cofre de oro (0,5 %) o mítico (2 %).') : null));

    // próximas recompensas con objeto (una por fila)
    const nextOf = (track) => d.rewards.find((r) => r.track === track && r.level > d.level && r.item);
    const nextBox = h('div.pass-next',
      h('small', 'PRÓXIMAS RECOMPENSAS'),
      ...['free', 'premium'].map((track) => {
        const r = nextOf(track);
        if (!r) return null;
        const it = ITEM_BY_ID[r.item];
        return it ? h('button.pn-item.' + track, { nav: true, onclick: () => ui.modal(itemInfo, { it }) },
          itemPreview(ui, owner, it, 44, svc.slotAccount(p)?.color || '#3985FF', null, true),
          h('div', h('b', it.name), h('span', `Nivel ${r.level} · ${track === 'free' ? 'Libre' : 'Premium'}`))) : null;
      }));

    // tramos
    const segBar = h('div.pass-segs', Array.from({ length: NSEG + (perm ? 1 : 0) }, (_, i) => {
      const isP = i === NSEG;
      const a = i * SEG + 1, b = Math.min(S.levels, (i + 1) * SEG);
      const done = !isP && d.level >= b;
      const cur = isP ? prest > 0 : d.level >= a && d.level <= b;
      return h('button.pass-seg' + (i === seg ? '.on' : '') + (done ? '.done' : '') + (cur ? '.cur' : '') + (isP ? '.prest' : ''),
        { nav: true, onclick: () => { seg = i; renderLane(); segBar.querySelectorAll('.pass-seg').forEach((x, j) => x.classList.toggle('on', j === i)); } },
        isP ? '★ PRESTIGIO' : `${a}–${b}`);
    }));
    const laneBox = h('div.pass-scroll');
    function renderLane() {
      if (perm && seg === NSEG) { laneBox.replaceChildren(prestigeView()); return; }
      const lane = h('div.pass-lane');
      const a = seg * SEG + 1, b = Math.min(S.levels, (seg + 1) * SEG);
      for (let L = a; L <= b; L++) {
        const row = byLevel[L] || {};
        const reached = L <= d.level;
        lane.append(h('div.pass-col' + (reached ? '.reached' : '') + (L === d.level ? '.current' : '') + (L % 50 === 0 ? '.milestone' : ''),
          h('div.pc-lv', L),
          cell(row.free, 'free', reached), cell(row.premium, 'premium', reached)));
      }
      laneBox.replaceChildren(h('div.pass-legend', h('span.lg.free', 'LIBRE'), h('span.lg.premium', 'PREMIUM')), lane);
      requestAnimationFrame(() => lane.querySelector('.current')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
    }
    function prestigeView() {
      const first = S.levels + 10;
      const top = Math.max(first + 40, Math.ceil((d.level + 30) / 10) * 10);
      const lane = h('div.pass-lane.prest');
      for (let L = first; L <= top; L += 10) {
        const reached = L <= d.level;
        const pr = (track) => { const x = prestigeReward(L, track); return x ? { level: L, track, item: x.item, pies: x.pies } : null; };
        lane.append(h('div.pass-col' + (reached ? '.reached' : '') + (L % 50 === 0 ? '.milestone' : ''),
          h('div.pc-lv', L), cell(pr('free'), 'free', reached), cell(pr('premium'), 'premium', reached)));
      }
      return h('div.prest-box',
        h('div.prest-info', h('b', prest ? `PRESTIGIO ${prest}` : 'PRESTIGIO'),
          h('p', `Después del nivel ${S.levels} el pase sigue para siempre: cada nivel pide ${fmtN(S.prestige_xp || 900)} XP y cada 10 niveles hay premio. Los niveles 300, 400, 500, 750 y 1000 dan títulos de prestigio.`)),
        h('div.prest-row', h('div.pass-legend', h('span.lg.free', 'LIBRE'), h('span.lg.premium', 'PREMIUM')), lane));
    }
    function cell(r, track, reached) {
      if (!r || (!r.item && !r.pies)) return h('div.pass-cell.none');
      const it = r.item ? ITEM_BY_ID[r.item] : null;
      const got = claimed[track].has(r.level);
      const locked = track === 'premium' && !d.premium;
      const can = live && reached && !got && !locked;
      const R = it ? RARITIES[it.rarity] : null;
      return h('button.pass-cell.' + track + (got ? '.got' : '') + (can ? '.can' : '') + (locked ? '.locked' : ''),
        { nav: true, style: R ? { '--rc': R.color } : null, title: it ? `${it.name} · ${R.name}` : `${r.pies} PIES`,
          onclick: () => (can ? claim(r.level, track) : it ? ui.modal(itemInfo, { it }) : null) },
        it ? h('div.pcell-prev', itemPreview(ui, owner, it, 64, svc.slotAccount(p)?.color || '#3985FF', null, true)) : h('div.pcell-pies', piesIcon(), h('b', fmtN(r.pies))),
        h('small', it ? it.name : 'PIES'),
        got ? h('span.pcell-tag.ok', icon('check')) : locked ? h('span.pcell-tag', icon('lock')) : can ? h('span.pcell-tag.go', 'RECLAMAR') : null);
    }
    renderLane();
    body.replaceChildren(header, nextBox, segBar, laneBox);
  }

  async function buy(S, d) {
    const acc = svc.slotAccount(p);
    if ((acc?.pies ?? 0) < S.premium_price) {
      ui.toast({ kind: 'warn', title: 'No te alcanzan los PIES', text: `Cuesta ${fmtN(S.premium_price)} PIES y tenés ${fmtN(acc?.pies ?? 0)}.` });
      return;
    }
    const ok = await ui.confirm({ title: '¿Comprar el Pase Premium?', text: `Cuesta ${fmtN(S.premium_price)} PIES (te quedarían ${fmtN(acc.pies - S.premium_price)}). Es para siempre: se compra una sola vez y no vence. Las recompensas Premium de los ${d.level} niveles que ya alcanzaste quedan para reclamar.`, yes: 'Comprar', no: 'Cancelar', danger: false });
    if (!ok) return;
    try {
      await svc.passBuy(p);
      app.audio.play('victory');
      ui.toast({ kind: 'ok', title: '¡Pase Premium activado!', text: 'Ya podés reclamar las recompensas Premium.' });
    } catch (e) {
      app.audio.play('error');
      ui.toast({ kind: 'warn', title: 'No se pudo comprar', text: errorText(e) });
    }
    if (!owner.disposed) passView(null);
  }
  async function claim(level, track) {
    try {
      const out = await svc.passClaim(p, level, track);
      const got = out.claimed || [];
      if (got.length) {
        app.audio.play('confirm');
        const items = got.filter((g) => g.item && !g.dup).map((g) => ITEM_BY_ID[g.item]?.name).filter(Boolean);
        const piesTot = got.reduce((a, g) => a + (g.pies || 0), 0);
        ui.toast({ kind: 'ok', title: got.length === 1 ? 'Recompensa reclamada' : `${got.length} recompensas reclamadas`, text: [items.join(', '), piesTot ? `+${fmtN(piesTot)} PIES` : ''].filter(Boolean).join(' · ') });
      }
    } catch (e) {
      app.audio.play('error');
      ui.toast({ kind: 'warn', title: 'No se pudo reclamar', text: errorText(e) });
    }
    if (!owner.disposed) passView(null);
  }

  // ---------------------------------------------------------------- desafíos
  async function challengesView() {
    let d;
    try { d = await svc.challenges(p); } catch (e) { if (!owner.disposed) body.replaceChildren(errorBox(errorText(e), challengesView)); return; }
    if (owner.disposed) return;
    const group = (period, title, reset) => h('div.ch-group',
      h('div.ch-head', h('h3', title), h('small.muted', `Se renuevan en ${timeLeft(reset)}`)),
      ...d.list.filter((c) => c.period === period).map((c) => {
        const done = c.progress >= c.target;
        return h('div.ch-row' + (c.claimed ? '.claimed' : done ? '.done' : ''),
          h('div.ch-main', h('b', c.label), h('div.ch-bar', h('i', { style: { width: `${(Math.min(c.progress, c.target) / c.target) * 100}%` } })), h('small', `${c.progress} / ${c.target}`)),
          h('div.ch-rew', h('span', `+${c.xp} XP`), h('span', piesIcon(), `+${c.pies}`)),
          c.claimed ? h('span.ch-ok', icon('check'), 'LISTO')
            : h('button.btn' + (done ? '.primary' : '.ghost'), { nav: true, disabled: done ? null : true, onclick: () => claimCh(c) }, done ? 'RECLAMAR' : 'EN CURSO'));
      }));
    body.replaceChildren(
      h('p.muted', 'Se renuevan cada día y cada semana.'),
      group('daily', 'DIARIOS', d.daily_reset), group('weekly', 'SEMANALES', d.weekly_reset));
  }
  async function claimCh(c) {
    try {
      await svc.challengeClaim(p, c.id);
      app.audio.play('confirm');
      ui.toast({ kind: 'ok', title: '¡Desafío completado!', text: `+${c.xp} XP · +${c.pies} PIES` });
    } catch (e) {
      app.audio.play('error');
      ui.toast({ kind: 'warn', title: 'No se pudo reclamar', text: errorText(e) });
    }
    if (!owner.disposed) challengesView();
  }

  // ---------------------------------------------------------------- temporadas
  async function archiveView() {
    let d;
    try { d = await svc.pass(p, null); } catch (e) { if (!owner.disposed) body.replaceChildren(errorBox(errorText(e), archiveView)); return; }
    if (owner.disposed) return;
    const list = d.archive || [];
    body.replaceChildren(list.length
      ? h('div.season-list', list.map((s) => h('button.season-row', { nav: true, onclick: () => { tab = 'pass'; renderTabs(); body.replaceChildren(loading()); passView(s.id); } },
          h('b', s.name), h('span', `${fmtDate(s.starts_at)} – ${fmtDate(s.ends_at)}`),
          h('small', 'ARCHIVADA'))))
      : empty('No hay pases archivados.', 'trophy'));
  }

  renderTabs();
  show();
  return { el };
}

function itemInfo(ui, { it }) {
  const m = {};
  const R = RARITIES[it.rarity];
  m.el = h('div.dialog.item-dialog', { style: { '--rc': R.color } },
    h('div.id-prev', itemPreview(ui, m, it, 150, ui.app.accounts.slotAccount(0)?.color || '#3985FF')),
    h('h3', it.name), rarityChip(it.rarity), h('p', it.desc), h('p.muted.small', it.unlock || ''),
    h('div.dialog-actions', h('button.btn.primary', { nav: true, 'data-autofocus': true, onclick: () => m.close() }, 'CERRAR')));
  return m;
}

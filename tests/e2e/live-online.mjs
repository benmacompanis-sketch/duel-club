// Prueba del MODO ONLINE contra el sitio PUBLICADO y la base de datos REAL.
// Dos navegadores separados (dos "compus") en GitHub Actions: cada uno con su cuenta, sala con código,
// conexión directa WebRTC, una partida real, respaldo por el servidor (Realtime), búsqueda de rival y
// abandono. Al final borra sus cuentas de prueba "e2eo…".
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

// sitio a probar: el nuevo (si deploy/redirect-to.txt tiene la mudanza configurada) o GitHub Pages
const OLD_URL = 'https://benmacompanis-sketch.github.io/duel-club/';
const readUrl = (f) => { try { const u = readFileSync(new URL('../../deploy/' + f, import.meta.url), 'utf8').trim(); return u && !u.endsWith('/') ? u + '/' : u; } catch { return ''; } };
const MOVED = readUrl('redirect-to.txt'); // el link viejo ya redirige al nuevo
const NEW_SITE = MOVED || readUrl('new-site.txt'); // sitio nuevo (Vercel)
const BASE = process.env.SITE_URL || NEW_SITE || OLD_URL;
/** Espera a que el sitio publicado tenga este commit (Vercel publica por su cuenta). */
async function waitForBuild(browser) {
  const sha = process.env.GITHUB_SHA;
  if (!sha || !NEW_SITE) return;
  const page = await browser.newPage();
  for (let i = 0; i < 40; i++) {
    const b = await page.goto(BASE, { waitUntil: 'domcontentloaded' }).then(() => page.evaluate(() => document.documentElement.dataset.build)).catch(() => null);
    if (b === sha) break;
    await page.waitForTimeout(10000);
  }
  await page.close();
}

const tag = Math.random().toString(36).slice(2, 7);
const A = { user: `e2eoa${tag}`, name: `Online A ${tag}`, pass: 'clave-e2e-1' };
const B = { user: `e2eob${tag}`, name: `Online B ${tag}`, pass: 'clave-e2e-2' };
let failures = 0;
let step = 'inicio';
const passed = [];
const ok = (msg) => { passed.push(msg); console.log('OK  ' + msg); };
const bad = (msg) => { failures++; console.log(`::error title=FALLA::${msg}`); };
const check = (cond, msg, extra = '') => (cond ? ok(msg) : bad(`${msg} ${extra}`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
await waitForBuild(browser);

async function computer(acc, query = '?test') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + query, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.DC?.accounts?.ready, null, { timeout: 30000 });
  await page.evaluate(() => window.DC.ui.goMenu());
  await page.waitForSelector('.hub', { timeout: 15000 });
  // cartel de novedades de un visitante nuevo
  const news = await page.waitForSelector('.news-dialog', { timeout: 6000 }).catch(() => null);
  if (news) await page.click('.news-dialog .btn.primary');
  await page.waitForTimeout(500);
  // registro desde la interfaz
  await page.click('.tb-slot >> nth=0');
  await page.waitForSelector('.acc-dialog');
  await page.click('.acc-tabs .tab >> nth=1');
  await page.fill('#acc-name', acc.name);
  await page.fill('#acc-user', acc.user);
  await page.fill('#acc-pass', acc.pass);
  await page.fill('#acc-pass2', acc.pass);
  await page.click('.acc-dialog .btn.primary');
  await page.waitForFunction((u) => window.DC.accounts.slotAccount(0)?.username === u, acc.user, { timeout: 20000 });
  // "jugador" automático: aprieta teclas al azar solo mientras corre una ronda online
  await page.evaluate(() => {
    const K = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'];
    window.__bot = setInterval(() => {
      if (!window.DC?.net?.running) return;
      const k = K[Math.floor(Math.random() * K.length)];
      window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })), 40 + Math.random() * 120);
    }, 70);
  });
  return { ctx, page, errors };
}
async function toOnline(p) {
  await p.evaluate(() => window.DC.ui.goMenu());
  // el cartel de novedades puede aparecer al entrar al menú: se cierra si está
  await p.waitForTimeout(1300);
  await p.evaluate(() => document.querySelector('.news-dialog .btn.primary, .news-dialog .btn')?.click());
  await p.click('.sn-btn[data-id="play"]');
  await p.click('.online-card');
  await p.waitForSelector('.online-page');
}
async function playUntilFinal(pages, timeout = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const done = await Promise.all(pages.map((p) => p.$('.ol-final')));
    if (done.every(Boolean)) return true;
    for (const p of pages) {
      const b = await p.$('.ol-intro .intro-actions .btn.primary');
      if (b) await b.click().catch(() => {});
    }
    await sleep(500);
  }
  return false;
}
async function roomMatch(pa, pb, label) {
  await pa.evaluate(() => { window.DC.save.onlineCfg = { best_of: 1, game: 'reaction', caos: false }; });
  await toOnline(pa);
  await pa.click('text=CREAR SALA');
  await pa.waitForSelector('.ol-bigcode', { timeout: 15000 });
  const code = (await pa.textContent('.ol-bigcode')).trim();
  await toOnline(pb);
  await pb.fill('.ol-code', code);
  await pb.click('.ol-join .btn');
  await Promise.all([pa.waitForSelector('.ol-lobby', { timeout: 20000 }), pb.waitForSelector('.ol-lobby', { timeout: 20000 })]);
  const want = label === 'directa' ? ['p2p'] : ['relay'];
  const mode = await pa.waitForFunction((w) => w.includes(window.DC.online?.link?.mode), want, { timeout: 30000 })
    .then(() => pa.evaluate(() => window.DC.online.link.mode)).catch(() => pa.evaluate(() => window.DC.online?.link?.mode || 'sin partida'));
  const fin = await playUntilFinal([pa, pb]);
  await sleep(3000);
  const view = await pa.evaluate(() => window.DC.online?.view && { status: window.DC.online.view.status, winner: window.DC.online.view.winner, rounds: window.DC.online.view.rounds, played: window.DC.online.view.played });
  const banners = await Promise.all([pa, pb].map((p) => p.textContent('.ol-final .res-banner').catch(() => '')));
  for (const p of [pa, pb]) await p.click('.ol-final .res-actions .btn.ghost').catch(() => {});
  return { code, mode, fin, view, banners, label };
}

let ca = null;
let cb = null;
try {
  step = 'abrir dos compus y registrar cuentas';
  ca = await computer(A);
  cb = await computer(B);
  ok(`Dos navegadores separados, cada uno con su cuenta (${A.user} / ${B.user})`);

  // 1) sala con código + conexión directa
  step = 'sala con código';
  const r1 = await roomMatch(ca.page, cb.page, 'directa');
  check(/^[A-Z0-9]{5}$/.test(r1.code), `Sala creada y unida con el código ${r1.code}`);
  check(r1.mode === 'p2p', 'Conexión directa WebRTC entre las dos compus', r1.mode);
  check(r1.fin, 'Partida online jugada hasta el final en las dos compus');
  const valid = r1.view?.rounds?.filter((x) => !x.void) || [];
  check(r1.view?.status === 'finished' && valid.length >= 1 && valid.every((x) => !x.single), 'El servidor confirmó el resultado con los reportes de las dos compus', JSON.stringify(r1.view));
  const coherent = (/GANASTE/.test(r1.banners[0]) && /PERDISTE/.test(r1.banners[1])) || (/PERDISTE/.test(r1.banners[0]) && /GANASTE/.test(r1.banners[1])) || (/EMPAT/.test(r1.banners[0]) && /EMPAT/.test(r1.banners[1]));
  check(coherent, 'Las dos compus muestran el mismo resultado', r1.banners.join(' / '));
  const st = await Promise.all([ca.page, cb.page].map((p) => p.evaluate(async () => { await window.DC.accounts.refreshAll(); const m = window.DC.accounts.slotAccount(0); return { r: m.rating, op: m.stats.online_played, ach: !!m.achievements.online_1 }; })));
  check(st.every((x) => x.op >= 1 && x.ach), 'Cuentas actualizadas: minijuego online contado y logro "Conexión establecida"', JSON.stringify(st));
  const d = valid[0]?.d || [0, 0];
  check(valid.every((x) => !x.d || (x.d[0] === 0 && x.d[1] === 0)) && st.every((x) => x.r === 1000), 'Sala amistosa: el ELO no cambia (solo cambia en Buscar rival)', JSON.stringify({ d, r: st.map((x) => x.r) }));

  // 2) respaldo por el servidor (Supabase Realtime), forzado
  step = 'respaldo por el servidor';
  for (const c of [ca, cb]) {
    await c.page.goto(BASE + '?test&relay', { waitUntil: 'networkidle' });
    await c.page.waitForFunction(() => window.DC?.accounts?.ready && window.DC.accounts.slotAccount(0), null, { timeout: 30000 });
    await c.page.evaluate(() => {
      const K = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'];
      window.__bot = setInterval(() => {
        if (!window.DC?.net?.running) return;
        const k = K[Math.floor(Math.random() * K.length)];
        window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })), 40 + Math.random() * 120);
      }, 70);
    });
  }
  const r2 = await roomMatch(ca.page, cb.page, 'servidor');
  check(r2.mode === 'relay', 'Sin conexión directa, las compus se conectan por el servidor (respaldo)', r2.mode);
  check(r2.fin && r2.view?.status === 'finished', 'Partida completa por el servidor de respaldo', JSON.stringify(r2.view));

  // 3) buscar rival + abandono en la sala de espera
  step = 'buscar rival';
  for (const c of [ca, cb]) {
    await c.page.goto(BASE + '?test', { waitUntil: 'networkidle' });
    await c.page.waitForFunction(() => window.DC?.accounts?.ready && window.DC.accounts.slotAccount(0), null, { timeout: 30000 });
    await toOnline(c.page);
  }
  await ca.page.click('text=BUSCAR PARTIDA');
  await sleep(1500);
  await cb.page.click('text=BUSCAR PARTIDA');
  const paired = await Promise.all([ca.page, cb.page].map((p) => p.waitForSelector('.ol-lobby', { timeout: 30000 }).then(() => true).catch(() => false)));
  check(paired.every(Boolean), 'Buscar rival: el servidor empareja a las dos cuentas');
  if (paired.every(Boolean)) {
    const kind = await ca.page.evaluate(() => `${window.DC.online.view.kind}|${window.DC.online.view.best_of}`);
    check(kind === 'ranked|3', 'Partida por ELO al mejor de 3', kind);
    step = 'abandono';
    await ca.page.click('.ol-lobby .btn.ghost');
    await ca.page.click('.modal .btn.danger');
    const fins = await Promise.all([ca.page, cb.page].map((p) => p.waitForSelector('.ol-final', { timeout: 30000 }).then(() => p.textContent('.ol-final .res-banner')).catch(() => '')));
    check(/ABANDONASTE/.test(fins[0]) && /ABANDONÓ/.test(fins[1]), 'Abandono: pierde quien se va y el rival gana la serie', fins.join(' / '));
    const rr = await Promise.all([ca.page, cb.page].map((p) => p.evaluate(async () => { await window.DC.accounts.refreshAll(); return window.DC.accounts.slotAccount(0).rating; })));
    check(rr[0] < 1000 && rr[1] > 1000 && rr[0] - 1000 === -(rr[1] - 1000), 'Competitivo: el ELO cambió de forma simétrica (baja quien abandona)', JSON.stringify(rr));
  }
  check(ca.errors.length === 0 && cb.errors.length === 0, 'Sin errores de JavaScript en las dos compus', [...ca.errors, ...cb.errors].join(' | '));

} catch (e) {
  bad(`Excepción en el paso "${step}": ` + (e.message || '').split('\n')[0]);
} finally {
  // limpieza: las cuentas de prueba se borran siempre (aunque algo haya fallado)
  const del = [];
  for (const [c, acc] of [[ca, A], [cb, B]]) {
    if (!c) continue;
    del.push(await c.page.evaluate(async (a) => {
      try {
        if (!window.DC.accounts.slotAccount(0)) await window.DC.accounts.login(0, a.user, a.pass);
        await window.DC.accounts.deleteAccount(0, a.pass);
        return 'ok';
      } catch (e) { return e.code || String(e); }
    }, acc).catch((e) => String(e).slice(0, 80)));
  }
  if (del.length) check(del.every((x) => x === 'ok'), 'Cuentas de prueba eliminadas', JSON.stringify(del));
  await browser.close();
}
console.log(`::notice title=RESUMEN::ONLINE ${passed.length} pruebas OK, ${failures} fallas · cuentas ${A.user} y ${B.user} ✔ ${passed.join(' ✔ ')}`);
process.exit(failures ? 1 : 0);

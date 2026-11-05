// Prueba de punta a punta contra el sitio PUBLICADO y la base de datos REAL.
// Corre en GitHub Actions (otra máquina, navegador limpio, sin Claude). Crea cuentas de prueba "e2e…".
import { chromium } from 'playwright';

const BASE = process.env.SITE_URL || 'https://benmacompanis-sketch.github.io/duel-club/';
const tag = Math.random().toString(36).slice(2, 7);
const A = { user: `e2ea${tag}`, name: `E2E A ${tag}`, pass: 'clave-e2e-1' };
const B = { user: `e2eb${tag}`, name: `E2E B ${tag}`, pass: 'clave-e2e-2' };
let failures = 0;
let step = 'inicio';
let lastPage = null;
const ok = (msg) => console.log(`::notice title=OK::${msg}`);
const bad = (msg) => { failures++; console.log(`::error title=FALLA::${msg}`); };
const check = (cond, msg, extra = '') => (cond ? ok(msg) : bad(`${msg} ${extra}`));

async function openSite(browser, test = true) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + (test ? '?test' : ''), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.hub', { timeout: 15000 });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
async function register(page, slot, acc) {
  await page.click(`.tb-slot >> nth=${slot}`);
  await page.waitForSelector('.acc-dialog');
  await page.click('.acc-tabs .tab >> nth=1');
  await page.fill('#acc-name', acc.name);
  await page.fill('#acc-user', acc.user);
  await page.fill('#acc-pass', acc.pass);
  await page.fill('#acc-pass2', acc.pass);
  await page.click('.acc-dialog .btn.primary');
  await page.waitForFunction((u) => window.DC.accounts.slotAccount(0)?.username === u || window.DC.accounts.slotAccount(1)?.username === u, acc.user, { timeout: 20000 });
}
async function login(page, slot, acc) {
  await page.click(`.tb-slot >> nth=${slot}`);
  await page.waitForSelector('.acc-dialog');
  await page.fill('#acc-user', acc.user);
  await page.fill('#acc-pass', acc.pass);
  await page.click('.acc-dialog .btn.primary');
  await page.waitForFunction((u) => window.DC.accounts.slotAccount(0)?.username === u || window.DC.accounts.slotAccount(1)?.username === u, acc.user, { timeout: 20000 });
}

const browser = await chromium.launch();
try {
  // 1) un visitante sin nada abre el link y ve el juego
  {
    const { ctx, page, errors } = await openSite(browser, false);
    check(await page.title() === 'DUEL CLUB · One club. Infinite duels.', 'El sitio publicado carga (título correcto)');
    check(await page.locator('.sn-btn').count() === 11, 'Menú con 11 secciones visible para un invitado');
    const online = await page.locator('.tb-status.online').count();
    check(online === 1, 'El sitio publicado se conecta al servidor (estado EN LÍNEA)');
    check(errors.length === 0, 'Sin errores de JavaScript en la carga', errors.join(' | '));
    await ctx.close();
  }
  // 2) compu 1: registro de dos cuentas (J1 y J2)
  const c1 = await openSite(browser);
  const p1 = c1.page;
  await register(p1, 0, A);
  ok(`Registro de J1 (${A.user}) desde la interfaz`);
  await register(p1, 1, B);
  ok(`Registro de J2 (${B.user}) desde la interfaz`);
  const meA0 = await p1.evaluate(() => window.DC.accounts.slotAccount(0));
  check(meA0.pies === 300 && meA0.rating === 1000 && meA0.level === 1, 'Cuenta nueva: 300 PIES, SUSI 1000, nivel 1', JSON.stringify({ p: meA0.pies, r: meA0.rating, l: meA0.level }));

  // 3) se juega un minijuego real (Tower Climb, 60 s acelerados) y se envía al servidor
  await p1.evaluate(() => {
    const DC = window.DC;
    window.__res = null;
    DC.runner.play('tower', { players: DC.profiles.map((p) => ({ ...p })), difficulty: 0.5, options: { time: 60 }, mode: 'quick' }).then((r) => (window.__res = r));
  });
  await p1.waitForTimeout(1500);
  await p1.keyboard.press('KeyF');
  await p1.keyboard.press('Enter');
  await p1.waitForTimeout(3000);
  await p1.evaluate(() => { window.DC.debugScale = 10; });
  const keys = ['KeyA', 'KeyD', 'KeyF', 'ArrowLeft', 'ArrowRight', 'Enter', 'KeyW', 'ArrowUp'];
  for (let i = 0; i < 400; i++) {
    if (await p1.evaluate(() => !!window.__res)) break;
    const k = keys[i % keys.length];
    await p1.keyboard.down(k); await p1.waitForTimeout(40); await p1.keyboard.up(k);
  }
  const sub = await p1.evaluate(async () => {
    const DC = window.DC;
    DC.debugScale = 1;
    const res = window.__res;
    if (!res) return { err: 'el minijuego no terminó' };
    DC.runner.close();
    DC.ui.goMenu();
    const out = await DC.accounts.submitMatch(res, { mode: 'quick', difficulty: 0.5 });
    return { winner: res.winner, dur: res.playSeconds, slots: out?.slots?.map((s) => s && { keke: s.keke, pies: s.pies, delta: s.delta, res: s.res, ach: s.achievements.length }) };
  });
  check(sub.slots && sub.slots[0] && sub.slots[1], 'Partida real enviada y aceptada por el servidor para las dos cuentas', JSON.stringify(sub));
  if (sub.slots?.[0]) {
    check(sub.slots[0].keke > 0 && sub.slots[1].keke > 0, 'Ambas cuentas ganaron KEKE', JSON.stringify(sub.slots));
    check(sub.winner === -1 ? sub.slots[0].delta === 0 : sub.slots[0].delta === -sub.slots[1].delta && sub.slots[0].delta !== 0, 'SUSI cambió de forma simétrica entre las dos cuentas', JSON.stringify(sub));
  }
  // 4) PIE STORE: compra real desde la interfaz
  lastPage = p1;
  await p1.waitForSelector('.hub', { timeout: 15000 });
  await p1.waitForTimeout(800);
  const before = await p1.evaluate(() => window.DC.accounts.slotAccount(0).pies);
  await p1.evaluate(() => { window.DC.save.viewer = 0; });
  step = 'tienda: abrir sección';
  await p1.click('.sn-btn[data-id="store"]');
  await p1.waitForSelector('.item-card');
  step = 'tienda: abrir objeto';
  await p1.click('.item-card:not(.owned) >> nth=0');
  await p1.waitForSelector('.item-dialog .btn.green');
  step = 'tienda: botón comprar';
  await p1.click('.item-dialog .btn.green');
  await p1.waitForSelector('.dialog-actions .btn.primary >> text=Comprar');
  step = 'tienda: confirmar';
  await p1.click('.dialog-actions .btn.primary >> text=Comprar');
  await p1.waitForFunction((b) => window.DC.accounts.slotAccount(0).pies !== b, before, { timeout: 15000 }).catch(() => {});
  const afterBuy = await p1.evaluate(() => ({ pies: window.DC.accounts.slotAccount(0).pies, inv: window.DC.accounts.slotAccount(0).inventory }));
  check(afterBuy.pies < before && afterBuy.inv.length > 0, `Compra en la PIE STORE descuenta PIES (${before} → ${afterBuy.pies}) y agrega el objeto`, JSON.stringify(afterBuy));
  // 5) intento de trampa desde la consola: escribir directo en las tablas debe fallar
  const hack = await p1.evaluate(async () => {
    const url = 'https://fhfafgsmizuvjvqlcjor.supabase.co/rest/v1/accounts';
    const key = 'sb_publishable_IVUm-v872fJpZotySj_m5A_Dyw65gc9';
    const r1 = await fetch(url + '?select=username,pies', { headers: { apikey: key } });
    const r2 = await fetch(url, { method: 'PATCH', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ pies: 999999 }) });
    return [r1.status, r2.status];
  });
  check(hack[0] >= 400 && hack[1] >= 400, 'Leer o modificar PIES directo desde la consola está bloqueado', JSON.stringify(hack));
  // 6) amigos: A pide amistad a B y B acepta
  const fr = await p1.evaluate(async (bu) => {
    const s = window.DC.accounts;
    const r1 = await s.friendRequest(0, bu);
    const f = await s.friendRespond(1, s.slotAccount(0).username, true);
    return { r1: r1.status, friends: f.friends.length };
  }, B.user);
  check(fr.r1 === 'pending' && fr.friends === 1, 'Solicitud de amistad enviada y aceptada', JSON.stringify(fr));
  // 7) ranking mundial con datos reales
  step = 'ranking';
  await p1.click('.sn-btn[data-id="ranking"]');
  await p1.waitForSelector('.rank-row', { timeout: 15000 });
  const names = await p1.locator('.rank-row .rank-name b').allTextContents();
  check(names.some((n) => n.includes(A.name)) && names.some((n) => n.includes(B.name)), 'Las dos cuentas aparecen en el ranking mundial', names.join(', '));
  const profileA = await p1.evaluate(async (u) => (await window.DC.accounts.profile(u)), A.user);
  check(profileA.matches.length === 1 && profileA.rating_history.length === 1, 'Perfil público con historial y evolución de SUSI', JSON.stringify({ m: profileA.matches.length, rh: profileA.rating_history.length }));
  const savedA = await p1.evaluate(() => window.DC.accounts.slotAccount(0));
  check(c1.errors.length === 0, 'Sin errores de JavaScript durante la sesión', c1.errors.join(' | '));
  await c1.ctx.close();

  // 8) "otra computadora": navegador limpio, inicio de sesión y progreso recuperado
  const c2 = await openSite(browser);
  const p2 = c2.page;
  check(await p2.evaluate(() => !window.DC.accounts.slotAccount(0)), 'El navegador nuevo empieza sin sesión');
  await login(p2, 0, A);
  const meA2 = await p2.evaluate(() => window.DC.accounts.slotAccount(0));
  check(meA2.keke === savedA.keke && meA2.pies === savedA.pies && meA2.rating === savedA.rating && meA2.inventory.length === savedA.inventory.length,
    'Desde otro navegador se recupera el mismo progreso (KEKE, PIES, SUSI, inventario)', JSON.stringify({ k: [savedA.keke, meA2.keke], p: [savedA.pies, meA2.pies], r: [savedA.rating, meA2.rating] }));
  const badLogin = await p2.evaluate(async (u) => { try { await window.DC.accounts.login(1, u, 'incorrecta'); return 'entró'; } catch (e) { return e.code; } }, B.user);
  check(badLogin === 'bad_credentials', 'Contraseña incorrecta rechazada', badLogin);
  await p2.evaluate(async (u) => window.DC.accounts.logout(u), A.user);
  const afterLogout = await p2.evaluate(() => ({ slot: !!window.DC.accounts.slotAccount(0), sessions: Object.keys(window.DC.accounts.sessions).length }));
  check(!afterLogout.slot && afterLogout.sessions === 0, 'Cierre de sesión', JSON.stringify(afterLogout));
  await c2.ctx.close();
} catch (e) {
  bad(`Excepción en el paso "${step}": ` + (e.message || '').split('\n')[0]);
  if (lastPage) {
    const info = await lastPage.evaluate(() => ({
      modal: document.querySelector('#modal')?.innerText.slice(0, 300),
      section: document.querySelector('.sn-btn.on')?.dataset.id,
      pies: window.DC?.accounts.slotAccount(0)?.pies,
      cards: document.querySelectorAll('.item-card').length,
      firstCard: document.querySelector('.item-card:not(.owned)')?.className,
      btn: document.querySelector('.item-dialog .btn.green')?.outerHTML.slice(0, 200),
    })).catch((err) => ({ err: String(err) }));
    console.log(`::notice title=DIAGNÓSTICO::${JSON.stringify(info)}`);
  }
} finally {
  await browser.close();
}
console.log(`::notice title=RESUMEN::cuentas de prueba ${A.user} y ${B.user} · fallas: ${failures}`);
process.exit(failures ? 1 : 0);

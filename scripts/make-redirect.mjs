// Si deploy/redirect-to.txt tiene una URL, el sitio viejo (GitHub Pages) deja de publicar el juego y publica una
// página que manda a todos al sitio nuevo: conserva los links de sala (?sala=CODIGO) y lleva la sesión, los ajustes
// y las estadísticas de este navegador en el #fragmento (que no llega a ningún servidor).
// Uso (en el workflow de GitHub Pages, después de `npm run build`): node scripts/make-redirect.mjs
import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const file = new URL('../deploy/redirect-to.txt', import.meta.url);
const target = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
if (!target) {
  console.log('Sin redirección: se publica el juego normalmente.');
  process.exit(0);
}
if (!/^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i.test(target)) {
  console.error('deploy/redirect-to.txt no tiene una URL https válida:', target);
  process.exit(1);
}
const NEW = target.endsWith('/') ? target : target + '/';
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DUEL CLUB se mudó</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${NEW}">
<style>
  html, body { margin: 0; height: 100%; background: #0b1020; color: #f6f7fb; font-family: system-ui, sans-serif; }
  main { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; text-align: center; }
  h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
  a { color: #25cfe6; font-weight: 700; font-size: 18px; }
  p { margin: 0; color: #8c96b8; }
</style>
<script>
(function () {
  var NEW = ${JSON.stringify(NEW)};
  var data = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('duelclub.') === 0 && k.slice(-7) !== '.backup') data[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  var frag = location.hash;
  try {
    var json = JSON.stringify(data);
    if (json.length > 2) {
      var enc = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
      // si es muy largo (mucho historial), se manda sin el guardado local: la cuenta y la sesión igual viajan
      if (enc.length > 120000 && data['duelclub.save.v1']) {
        delete data['duelclub.save.v1'];
        enc = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
      }
      if (enc.length <= 120000) frag = '#dcimport=' + enc;
    }
  } catch (e) {}
  location.replace(NEW + location.search + frag);
})();
</script>
</head>
<body>
<main>
  <h1>DUEL CLUB SE MUDÓ</h1>
  <p>Te estamos llevando al link nuevo…</p>
  <a href="${NEW}">${NEW.replace(/^https:\/\//, '').replace(/\/$/, '')}</a>
  <p>Guardá este link nuevo: tu cuenta y tu progreso siguen igual.</p>
</main>
</body>
</html>
`;
rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
mkdirSync(new URL('../dist', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/index.html', import.meta.url), html);
writeFileSync(new URL('../dist/404.html', import.meta.url), html);
console.log('Sitio viejo → redirección a', NEW);

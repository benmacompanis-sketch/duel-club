// Punto de entrada de DUEL CLUB.
import '@fontsource/bangers/400.css';
import '@fontsource/lilita-one/400.css';
import '@fontsource-variable/nunito';
import './style.css';
import { installI18n } from './i18n.js';
installI18n();
import { App } from './core/gameManager.js';

// Mudanza desde el link viejo (GitHub Pages): la página vieja manda la sesión, los ajustes y las estadísticas
// de este navegador en el #fragmento (nunca llega a ningún servidor). Solo se acepta si viene del sitio viejo,
// nunca pisa datos que ya existan acá y el fragmento se borra de la barra de direcciones enseguida.
const OLD_SITE = 'https://benmacompanis-sketch.github.io/';
function importFromOldSite() {
  const m = location.hash.match(/^#dcimport=([^&]+)/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (!document.referrer.startsWith(OLD_SITE)) return;
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    const data = JSON.parse(json);
    for (const [k, v] of Object.entries(data)) {
      if (!/^duelclub\.[a-z0-9.]+$/i.test(k) || typeof v !== 'string' || v.length > 2e6) continue;
      if (k === 'duelclub.sessions.v2') {
        const mine = JSON.parse(localStorage.getItem(k) || '{}');
        localStorage.setItem(k, JSON.stringify({ ...JSON.parse(v), ...mine }));
      } else if (localStorage.getItem(k) == null) {
        localStorage.setItem(k, v);
      }
    }
  } catch (e) {
    console.warn('DUEL CLUB: no se pudieron traer los datos del link viejo', e);
  }
}
importFromOldSite();
document.documentElement.dataset.build = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'local';

async function boot() {
  // Esperar a las fuentes para que los textos del canvas usen la tipografía correcta.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 32px "Bangers"'),
        document.fonts.load('400 32px "Lilita One"'),
        document.fonts.load('600 16px "Nunito Variable"'),
        document.fonts.load('800 16px "Nunito Variable"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
  const app = new App();
  app.start();
}

window.addEventListener('error', (e) => console.error('DUEL CLUB error:', e.message));
boot();

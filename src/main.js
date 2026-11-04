// Punto de entrada de DUEL CLUB.
import '@fontsource/russo-one/400.css';
import '@fontsource-variable/rubik';
import './style.css';
import { App } from './core/gameManager.js';

async function boot() {
  // Esperar a las fuentes para que los textos del canvas usen la tipografía correcta.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 32px "Russo One"'),
        document.fonts.load('600 16px "Rubik Variable"'),
        document.fonts.load('800 16px "Rubik Variable"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
  const app = new App();
  app.start();
}

window.addEventListener('error', (e) => console.error('DUEL CLUB error:', e.message));
boot();

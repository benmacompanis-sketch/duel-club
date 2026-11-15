// Imágenes opcionales (generadas con Gemini, ver docs/IMAGENES-GEMINI.md).
// Solo se usan las que figuran en public/assets/manifest.json; si una no existe o no carga, el juego
// sigue dibujando la versión por código. Nunca bloquea el arranque.
export const ASSETS = { covers: new Map(), chars: new Map(), acc: new Map(), ready: false };

export async function loadAssets() {
  try {
    const res = await fetch('/assets/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const man = await res.json();
    for (const kind of ['covers', 'chars', 'acc']) {
      for (const id of man[kind] || []) {
        if (!/^[a-z0-9_]+$/.test(id)) continue;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => ASSETS[kind].set(id, img);
        img.src = `/assets/${kind}/${id}.png`;
      }
    }
  } catch { /* sin manifiesto: todo dibujado por código */ }
  ASSETS.ready = true;
}

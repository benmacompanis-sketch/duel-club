// Estilos de los objetos generados del CLUB PASS (tarjetas y marcos): se arman una vez al iniciar
// a partir de las paletas y patrones de src/data/clubPass.js.
import { PALETTE_BY_ID } from '../data/clubPass.js';
import { ALL_ITEMS } from '../data/catalog.js';

const DECO = {
  tramado: (c) => `radial-gradient(${c} 22%, transparent 24%) 0 0 / 9px 9px`,
  rayas: (c) => `repeating-linear-gradient(135deg, ${c} 0 6px, transparent 6px 16px)`,
  cuadricula: (c) => `linear-gradient(${c} 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 16px 16px`,
  estallido: (c) => `repeating-conic-gradient(from 0deg at 80% 20%, ${c} 0 8deg, transparent 8deg 20deg)`,
  ondas: (c) => `radial-gradient(circle at 50% 120%, transparent 30%, ${c} 31% 34%, transparent 35% 44%, ${c} 45% 48%, transparent 49% 58%, ${c} 59% 62%, transparent 63%)`,
  estrellas: (c) => `radial-gradient(circle at 20% 30%, ${c} 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, ${c} 0 2px, transparent 3px), radial-gradient(circle at 45% 80%, ${c} 0 1.5px, transparent 2.5px), radial-gradient(circle at 85% 15%, ${c} 0 1.5px, transparent 2.5px)`,
  damero: (c) => `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0) 0 0 / 22px 22px`,
  vinetas: (c) => `linear-gradient(100deg, transparent 38%, ${c} 38% 40%, transparent 40%), linear-gradient(80deg, transparent 68%, ${c} 68% 70%, transparent 70%), linear-gradient(170deg, transparent 55%, ${c} 55% 57%, transparent 57%)`,
};
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export function installClubStyles() {
  const css = [];
  for (const it of ALL_ITEMS) {
    const p = it.palette && PALETTE_BY_ID[it.palette];
    if (!p) continue;
    const [, , , c1, c2, edge] = p;
    const shine = it.rarity === 'legendary' || it.rarity === 'mythic';
    if (it.category === 'card') {
      css.push(`.pc-${it.id}{--bg1:${c1};--bg2:${c2};--edge:${edge}}`);
      css.push(`.pc-${it.id} .pc-deco{background:${(DECO[it.pattern] || DECO.tramado)(hexA(edge, 0.28))}${shine ? ';animation:flick 1.6s infinite alternate' : ''}}`);
    } else if (it.category === 'frame') {
      const b = {
        tinta: `border:4px solid ${c1};box-shadow:0 0 0 3px #0D0B14,3px 3px 0 3px #0D0B14`,
        doble: `border:5px double ${edge};box-shadow:0 0 0 2px #0D0B14`,
        punteado: `border:4px dotted ${c1};box-shadow:0 0 0 2px ${c2}`,
        brillo: `border:3px solid ${edge};box-shadow:0 0 12px ${c1},inset 0 0 8px ${c1};animation:flick 1.1s infinite alternate`,
      }[it.style] || `border:3px solid ${c1}`;
      css.push(`.fr-${it.id}::after{${b}}`);
    }
  }
  const el = document.createElement('style');
  el.id = 'club-styles';
  el.textContent = css.join('\n');
  document.head.append(el);
}

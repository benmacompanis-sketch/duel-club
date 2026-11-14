// Eventos especiales: modifican un minijuego afectando a ambos jugadores por igual.
export const EVENTS = {
  speed: { id: 'speed', name: 'VELOCIDAD AUMENTADA', short: 'Velocidad x1.35', desc: 'Todo se mueve un 35% más rápido.', color: '#FF8E3C' },
  short: { id: 'short', name: 'TIEMPO REDUCIDO', short: 'Menos tiempo', desc: 'La partida dura un 35% menos. ¡Cada segundo cuenta!', color: '#FFC93C' },
  lowgrav: { id: 'lowgrav', name: 'GRAVEDAD BAJA', short: 'Gravedad baja', desc: 'Saltos lunares y caídas lentas.', color: '#25CFE6' },
  invert: { id: 'invert', name: 'CONTROLES INVERTIDOS', short: 'Controles invertidos', desc: 'Cada tanto, los controles se invierten durante unos segundos. Se avisa antes.', color: '#FF5FA2' },
  double: { id: 'double', name: 'PUNTUACIÓN DOBLE', short: 'Puntos dobles', desc: 'En el último tercio de la partida, todos los puntos valen el doble.', color: '#48D597' },
  obstacles: { id: 'obstacles', name: 'OBSTÁCULOS EXTRA', short: 'Más obstáculos', desc: 'Aparecen más obstáculos y peligros en la arena.', color: '#9B6CFF' },
  mirror: { id: 'mirror', name: 'MODO ESPEJO', short: 'Espejo', desc: 'La arena se da vuelta: cada uno juega desde el lado contrario. Las teclas siguen lo que ves en pantalla.', color: '#3985FF' },
};

export function pickEvent(meta, chance = 0.55) {
  const list = meta.events || [];
  if (!list.length || Math.random() > chance) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// Ícono SVG simple por evento (para la UI).
export function eventIcon(id) {
  const p = {
    speed: '<path d="M4 14h7l-2 7 11-12h-7l2-6z" />',
    short: '<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 13V8M9 2h6" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    lowgrav: '<circle cx="12" cy="9" r="5"/><path d="M5 20c2-2 4-3 7-3s5 1 7 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    invert: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    double: '<path d="M6 4h12v4H6zM6 10h12v4H6zM6 16h12v4H6z" opacity=".35"/><text x="12" y="17" font-size="12" text-anchor="middle" font-weight="900">x2</text>',
    obstacles: '<path d="M12 3l9 17H3z"/><path d="M12 9v5M12 16.5v.5" stroke="#0B1020" stroke-width="2.4" stroke-linecap="round"/>',
    mirror: '<path d="M12 2v20" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/><path d="M10 6L3 12l7 6zM14 6l7 6-7 6z"/>',
  }[id] || '';
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`;
}

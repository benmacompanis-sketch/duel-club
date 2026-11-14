// NOVEDADES del juego (la más nueva primero). Para anunciar una actualización, agregá una entrada arriba de todo
// con un id nuevo: el cartel aparece una vez a cada jugador y queda en la sección Novedades.
// kind de cada bloque: 'nuevo' (cosas nuevas), 'mejora' (cambios) o 'arreglo' (errores corregidos).
// Si un arreglo viene de un reporte de los jugadores, se puede citar su número: "(reporte #12)".
export const NEWS = [
  {
    id: '2026-11-13-link-nuevo',
    date: '2026-11-13',
    version: '3.1.1',
    title: 'Nuevo link: duelclub.vercel.app',
    tag: 'NUEVO LINK',
    color: '#FFC93C',
    intro: 'DUEL CLUB ahora vive en duelclub.vercel.app. Guardalo y compartilo con ese link.',
    blocks: [
      { kind: 'mejora', items: [
        'El link viejo te trae solo al nuevo, con tu sesión iniciada, tus ajustes y tus estadísticas: no tenés que hacer nada.',
        'Los links de sala para jugar online también funcionan desde el link viejo.',
      ] },
      { kind: 'nuevo', items: [
        'Modo online: buscá rival, creá una sala con código o desafiá a un amigo del CLUB (está en Jugar).',
      ] },
    ],
    action: { label: 'JUGAR ONLINE', go: 'online' },
  },
  {
    id: '2026-11-13-online',
    date: '2026-11-13',
    version: '3.1',
    title: '¡Modo online disponible!',
    tag: 'NUEVO',
    color: '#25CFE6',
    intro: 'Ahora cada uno puede jugar desde su compu: vos en tu casa y tu amigo en la suya.',
    blocks: [
      { kind: 'nuevo', items: [
        'JUGAR ONLINE (en Jugar): buscá rival por ELO, creá una sala con código o link, o desafiá a un amigo del CLUB.',
        'Las partidas online cuentan para ELO, XP, PIES, dominio y logros. Revancha con un botón.',
        '4 logros nuevos para el modo online.',
        'Esta sección de Novedades y el formulario para reportar errores: lo que reportes lo vemos y lo arreglamos.',
      ] },
      { kind: 'arreglo', items: [
        'Online: si la conexión por el servidor llegaba antes que la directa, la partida arrancaba con más demora. Ahora la sala espera unos segundos la conexión directa.',
      ] },
    ],
    action: { label: 'JUGAR ONLINE', go: 'online' },
  },
  {
    id: '2026-11-09-servidor',
    date: '2026-11-09',
    version: '3.0.2',
    title: 'El servidor ya no se duerme',
    tag: 'ARREGLO',
    color: '#48D597',
    blocks: [
      { kind: 'arreglo', items: [
        'Después de varios días sin partidas, el servidor se apagaba solo y el juego quedaba "SIN CONEXIÓN". Se reactivó sin perder ningún dato y ahora se mantiene despierto todos los días.',
      ] },
    ],
  },
  {
    id: '2026-11-05-amigos',
    date: '2026-11-05',
    version: '3.0.1',
    title: 'Amigos y privacidad',
    tag: 'ARREGLO',
    color: '#FF5FA2',
    blocks: [
      { kind: 'arreglo', items: [
        'Al aceptar una amistad entre J1 y J2 en la misma compu, el logro "Ya no jugás solo" tardaba en aparecer en una de las cuentas. Ahora aparece al instante en las dos.',
      ] },
      { kind: 'nuevo', items: [
        'Eliminar cuenta: en la ventana de tu cuenta podés borrarla para siempre (con tu contraseña).',
      ] },
    ],
  },
  {
    id: '2026-11-04-v3',
    date: '2026-11-04',
    version: '3.0',
    title: 'DUEL CLUB Ultimate',
    tag: 'NUEVO',
    color: '#9B6CFF',
    blocks: [
      { kind: 'nuevo', items: [
        'Cuentas con usuario y contraseña que funcionan en cualquier compu o celular.',
        'XP y niveles, ELO (el rating competitivo), PIES y la PIE STORE con 80 objetos.',
        '4 minijuegos nuevos: Shadow Sneak, Turbo Tennis, Tower Climb y Blast Zone. Dificultad CAOS en todos los modos.',
        'CLUB de amigos, cara a cara, ranking mundial, logros y dominio por minijuego.',
      ] },
      { kind: 'mejora', items: [
        'Las cuentas de la versión anterior se recuperan con su PIN en Cuenta → CUENTA ANTERIOR, con todo su progreso.',
      ] },
    ],
  },
];

export const NEWS_KINDS = {
  nuevo: { label: 'NUEVO', color: '#25CFE6', icon: 'star' },
  mejora: { label: 'MEJORAS', color: '#9B6CFF', icon: 'arrow' },
  arreglo: { label: 'ERRORES CORREGIDOS', color: '#48D597', icon: 'check' },
};

export const BUG_KINDS = [
  ['bug', 'Error o falla', 'Algo no funciona, se traba o se cierra'],
  ['visual', 'Se ve mal', 'Textos cortados, cosas encimadas, colores raros'],
  ['online', 'Modo online', 'Conexión, salas, desafíos o resultados online'],
  ['account', 'Cuenta o progreso', 'XP, PIES, ELO, logros, tienda o inicio de sesión'],
  ['idea', 'Sugerencia', 'Algo que te gustaría que agreguemos o cambiemos'],
];

export const BUG_STATUS = {
  nuevo: { label: 'Recibido', color: '#8C96B8' },
  visto: { label: 'Visto', color: '#3985FF' },
  arreglando: { label: 'Arreglándolo', color: '#FFC93C' },
  arreglado: { label: 'Arreglado', color: '#48D597' },
  descartado: { label: 'Revisado', color: '#9B6CFF' },
};

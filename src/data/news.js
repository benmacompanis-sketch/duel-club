// NOVEDADES del juego (la más nueva primero). Para anunciar una actualización, agregá una entrada arriba de todo
// con un id nuevo: el cartel aparece una vez a cada jugador y queda en la sección Novedades.
// kind de cada bloque: 'nuevo' (cosas nuevas), 'mejora' (cambios) o 'arreglo' (errores corregidos).
// Si un arreglo viene de un reporte de los jugadores, se puede citar su número: "(reporte #12)".
export const NEWS = [
  {
    id: '2026-11-15-online-sin-lag',
    date: '2026-11-15',
    version: '4.2',
    title: 'Online sin lag y Desafíos Solo',
    tag: 'v4.2',
    color: '#25CFE6',
    intro: 'Tu personaje responde al instante en el online, y hay desafíos para jugar sin rival.',
    blocks: [
      { kind: 'mejora', items: [
        'Online: tus teclas se aplican al instante y la partida corrige sola si el rival hizo otra cosa. Casi sin trabones, incluso con mala conexión.',
        'Personajes con más volumen y luz.',
      ] },
      { kind: 'nuevo', items: [
        'DESAFÍOS SOLO: metas de tres estrellas en 11 minijuegos y un desafío nuevo cada día.',
        'Nuevos cosméticos: entradas, victorias y fondos de perfil.',
      ] },
      { kind: 'arreglo', items: [
        'La nariz de payaso y el bigote ahora quedan en su lugar en todos los personajes.',
      ] },
    ],
    action: { label: 'DESAFÍOS SOLO', go: 'solo', tab: 'solo' },
  },
  {
    id: '2026-11-14-gran-actualizacion',
    date: '2026-11-14',
    version: '4.0',
    title: 'La gran actualización: bots, Pase de Batalla y más',
    tag: 'v4.0',
    color: '#9B6CFF',
    intro: 'Bots para jugar solo, Pase de Batalla con PIES, desafíos diarios, XP y ELO, y un montón de arreglos.',
    blocks: [
      { kind: 'nuevo', items: [
        'UN JUGADOR (en Jugar): VS BOT con 4 dificultades en los 16 minijuegos, la ESCALERA (los 16 seguidos con 3 vidas) y PRÁCTICA.',
        'PASE DE BATALLA · Temporada 1: 40 niveles, fila libre y fila Premium (se compra con PIES, nunca con dinero). Si comprás el Premium después, recibís todo lo de los niveles que ya tenías.',
        'Desafíos diarios y semanales con XP y PIES.',
        'Contador real de jugadores en línea, cambio de nombre visible y filtro de nombres ofensivos.',
        'Destacados del día en la PIE STORE y 21 objetos exclusivos del pase.',
      ] },
      { kind: 'mejora', items: [
        'KEKE ahora se llama XP y SUSI/RESISTENCIA ahora se llama ELO (no perdiste nada: se renombró).',
        'El ELO solo se gana o se pierde online en Buscar rival (competitivo). Las salas, los desafíos a amigos, el modo local y los bots dan XP y PIES.',
        'Controles de cada jugador visibles al empezar cada minijuego. Tower Climb con láseres más lentos y avisados, Memory War con menos cartas según la dificultad, Target Panic con cargador y recarga.',
        'Memes con nombres reconocibles (Tung Tung Tung Sahur, Lentes Deal With It) y accesorios mejor ubicados en cada personaje.',
      ] },
      { kind: 'arreglo', items: [
        'Turbo Tennis: el saque ya no puede quedar picando para siempre (se saca solo a los 5 s).',
        'Ya no se corta la partida local al llegar al segundo minijuego.',
        'Online: si recargás la página volvés a la partida; no se repiten ni se saltean rondas; el cartel final ya no aparece varias veces.',
        'Color Control: un choque entre jugadores ya no puede dejar a alguien encerrado adentro de un muro.',
        'Quick Play: pasar el mouse ya no elige el minijuego; la portada ya no muestra dos líneas negras.',
      ] },
    ],
    action: { label: 'PROBAR VS BOT', go: 'solo', tab: 'vs' },
  },
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

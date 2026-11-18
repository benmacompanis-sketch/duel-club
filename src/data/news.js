// NOVEDADES del juego (la más nueva primero). Para anunciar una actualización, agregá una entrada arriba de todo
// con un id nuevo: el cartel aparece una vez a cada jugador y queda en la sección Novedades.
// kind de cada bloque: 'nuevo' (cosas nuevas), 'mejora' (cambios) o 'arreglo' (errores corregidos).
// Si un arreglo viene de un reporte de los jugadores, se puede citar su número: "(reporte #12)".
export const NEWS = [
  {
    id: '2026-11-18-v6-3',
    date: '2026-11-18',
    version: '6.3',
    title: 'Todo el club en historieta',
    tag: 'v6.3',
    color: '#3DDC97',
    intro: 'Revisamos pantalla por pantalla: todo el juego habla el mismo idioma de historieta.',
    blocks: [
      { kind: 'mejora', items: [
        'Selectores, interruptores, deslizadores y desplegables nuevos, con tinta y fáciles de tocar en el celular.',
        'Paneles, ventanas y avisos con borde de tinta y sombra dura; títulos de cada panel en carteles amarillos.',
        'Inicio: escenario de portada, azul contra rojo con "VS".',
        'Novedades: cada versión es una viñeta con su cartel y lista fácil de leer.',
        'Textos secundarios más grandes y con más contraste.',
        'Botones de la cuenta (cambiar nombre, vincular Google o email) en vez de enlaces de página web.',
      ] },
      { kind: 'arreglo', items: [
        'El emote ya no tapa tu nombre en la pantalla de resultados.',
        'En la presentación de cada minijuego, el botón VOLVER se ve bien.',
        'Pong Chaos: el cartel de ¡GOL! y el del caos ya no se enciman.',
        'Reaction Rush: el "¡YA!" de la pantalla verde se lee bien (antes era una mancha negra).',
        'El chat de la sala 2v2 ya no queda flotando en otras pantallas.',
      ] },
    ],
  },
  {
    id: '2026-11-18-v6-2',
    date: '2026-11-18',
    version: '6.2',
    title: 'Minijuegos renovados',
    tag: 'v6.2',
    color: '#FF3B5C',
    intro: 'Los 16 minijuegos se ven mucho mejor y varios se juegan distinto.',
    blocks: [
      { kind: 'nuevo', items: [
        'Blast Zone: escudos para agarrar (si estás lleno, te dan una estrella invencible), empujones más fuertes y un arranque más tranquilo.',
        'Last Platform: 2 vidas por ronda; si te caés, volvés en una nube.',
        'Duel Arena: contador de combos y cámara que sigue la pelea.',
        'Pausa de impacto en los golpes fuertes: cada golpe se siente.',
      ] },
      { kind: 'mejora', items: [
        'Carteles de historieta para los anuncios (ganó la ronda, ¡GOL!, ¡FALTA!, cambios de fase).',
        'Duel Arena: personajes más grandes, escenarios de historieta y marcador nuevo.',
        'Turbo Tennis: estadio con público, cancha y cámara más cerca.',
        'Pong Chaos: mesa de juego nueva, paletas gruesas con la cara de cada jugador y pelota en llamas al hacer smash.',
        'Target Panic: galería de tiro de feria con toldo, cortinas y blancos de madera.',
        'Shadow Sneak: el laberinto se adivina en la oscuridad, más luz y personajes más grandes.',
        'Micro Race: pista con pianos, pasto, árboles y autos con contorno.',
        'Color Control, Beat Battle, Tower Climb, Reaction Rush y Memory War con detalles de historieta.',
      ] },
    ],
  },
  {
    id: '2026-11-18-v6-1',
    date: '2026-11-18',
    version: '6.1',
    title: 'Todo más prolijo',
    tag: 'v6.1',
    color: '#FFC93C',
    intro: 'Una pasada de prolijidad por todo el juego y bots más fáciles.',
    blocks: [
      { kind: 'mejora', items: [
        'El fondo de historieta tiene calles blancas parejas entre todas las viñetas.',
        'Minijuegos favoritos del perfil: nombre del juego entero, números grandes y "1 victoria" bien escrito.',
        'La tarjeta del pase del perfil, los logros, el ranking, los filtros y los buscadores ya no son transparentes.',
        'Los nombres de los minijuegos son carteles del color de cada juego, también en VS BOT.',
        'Bots más fáciles: Fácil y Normal se distraen de a ratos y reaccionan más lento.',
      ] },
      { kind: 'arreglo', items: [
        'El numerito de COFRES se actualiza apenas abrís uno y ya no se encima con la flecha del menú.',
        'La barra de progreso de cada logro ya no corta el "0 / 1".',
        'La vista previa de los títulos en PRÓXIMAS RECOMPENSAS del pase ya no se sale de su lugar.',
        'Duel Arena: el bot Fácil le ganaba al Normal (por eso costaba tanto). Ahora cada nivel es más fácil que el siguiente.',
      ] },
    ],
  },
  {
    id: '2026-11-17-v6',
    date: '2026-11-17',
    version: '6.0',
    title: '2v2 online, cofres y chat',
    tag: 'v6.0',
    color: '#FF3B5C',
    intro: 'La actualización más grande: 2v2 entre varias compus (o mezclado con la misma compu y bots), cofres, chat y todo más rápido.',
    blocks: [
      { kind: 'nuevo', items: [
        '2v2 FLEXIBLE: cada lugar puede ser un jugador de esta compu, de otra compu o un bot. Salas con código, cuentas propias para cada jugador (hasta 4 en una compu) y búsqueda de partida.',
        'AMISTOSO (no cambia el ELO) y COMPETITIVO (4 cuentas, sin bots): ELO 2v2 y ranking 2v2 separados del 1v1.',
        'COFRES de bronce, plata, oro y mítico: se ganan con desafíos, niveles, logros, Daily Chaos y la Historia. Objetos exclusivos, probabilidades a la vista y el Pase Premium como premio rarísimo.',
        'CHAT privado con tus amigos y chat durante las partidas (1v1 y 2v2), con silenciar, bloquear y reportar.',
        'TOP 10 de los minijuegos más jugados (en Ranking).',
        '2v2 en 6 minijuegos: Pong, Color Control, Target Panic, Turbo Tennis (dobles), Blast Zone y Micro Race.',
        'INSIGNIAS: un escudito al lado de tu nombre (8 en la tienda y 8 exclusivas de cofres).',
      ] },
      { kind: 'mejora', items: [
        'MINIJUEGOS ahora es una página de historieta: cada juego en su propia viñeta.',
        'Todo más rápido: las secciones abren casi el doble de rápido y los menús y varios minijuegos van mucho más fluidos en celulares.',
        'Los personajes tienen una sombra de historieta que sigue su forma (antes parecían partidos al medio).',
        'Precios nuevos en la tienda según la rareza: lo especial ahora cuesta jugar y ahorrar.',
        'Fish Frenzy y Block Battle se dibujan más livianos.',
      ] },
    ],
  },
  {
    id: '2026-11-16-historia-53',
    date: '2026-11-16',
    version: '5.3',
    title: 'Historia, Puzzle Club y online más fluido',
    tag: 'v5.3',
    color: '#FFC93C',
    intro: 'Llegó la Historia del Club con 5 capítulos, 17 puzzles nuevos y un online que se traba mucho menos.',
    blocks: [
      { kind: 'nuevo', items: [
        'HISTORIA DEL CLUB: 5 capítulos, uno por personaje (Volt, Mochi, Pico, Brik y Nimbus), con diálogos, reglas especiales y un jefe final en cada uno.',
        'PUZZLE CLUB: 17 desafíos armados a mano (memoria, puntería, ritmo, plataformas y contrarreloj). Todos tienen solución.',
        'Recompensas de una sola vez: XP y PIES por cada etapa, capítulo y puzzle resuelto.',
      ] },
      { kind: 'mejora', items: [
        'Online: con conexiones lentas el juego se traba muchísimo menos (se adapta a tu ping).',
      ] },
      { kind: 'arreglo', items: [
        'En inglés, el juego a veces no cargaba. Ya está solucionado.',
      ] },
    ],
  },
  {
    id: '2026-11-16-bots-52',
    date: '2026-11-16',
    version: '5.2',
    title: 'Bots más accesibles',
    tag: 'v5.2',
    color: '#48D597',
    intro: 'El bot Fácil ahora es fácil de verdad, y cada nivel bajó un escalón.',
    blocks: [
      { kind: 'mejora', items: [
        'Bot Fácil: reacciona más lento, se equivoca más y emboca menos. Ideal para empezar.',
        'Normal y Difícil bajaron un escalón; Experto sigue siendo un desafío.',
        'La Escalera arranca más tranquila porque sus primeras etapas usan el bot Fácil.',
      ] },
    ],
  },
  {
    id: '2026-11-16-fluidez-51',
    date: '2026-11-16',
    version: '5.1',
    title: 'Todo más fluido',
    tag: 'v5.1',
    color: '#3DDC97',
    intro: 'El juego va mucho más fluido, la tienda ya no se traba y el menú se ve mejor.',
    blocks: [
      { kind: 'mejora', items: [
        'Los personajes se dibujan mucho más rápido: los minijuegos van más fluidos (Pong pasó de 19 a 55 cuadros por segundo en nuestras pruebas).',
        'La tienda ya no se traba: los objetos se animan cuando pasás el mouse o los seleccionás.',
        'El menú de la izquierda usa todo el espacio: viñetas más grandes.',
        'Textos y nombres revisados para que sean para todas las edades.',
      ] },
      { kind: 'arreglo', items: [
        'En pantallas chicas, el fondo de las ventanas se veía duplicado y espejado: arreglado.',
      ] },
    ],
  },
  {
    id: '2026-11-15-logo-50',
    date: '2026-11-15',
    version: '5.0',
    title: 'DUEL CLUB 5.0: logo nuevo',
    tag: 'v5.0',
    color: '#FFD23F',
    intro: 'Cerramos la gran actualización con un logo de historieta nuevo.',
    blocks: [
      { kind: 'nuevo', items: [
        'Logo nuevo de historieta en la portada y en la pestaña del navegador.',
        'La portada ahora muestra el CLUB PASS y el Singleplayer.',
      ] },
    ],
  },
  {
    id: '2026-11-14-comic-ingame-413',
    date: '2026-11-14',
    version: '4.13',
    title: 'La historieta llegó adentro de los minijuegos',
    tag: 'v4.13',
    color: '#FF8E3C',
    intro: 'Marcadores, cuenta regresiva, carteles, presentación, pausa y resultados con el estilo cómic.',
    blocks: [
      { kind: 'mejora', items: [
        'Marcadores en paneles de historieta con tinta gruesa y sombra dura; el reloj es un estallido.',
        'Cuenta regresiva y carteles (¡GOL!, ¡TIEMPO!…) con globos de impacto.',
        'Cada minijuego tiñe su fondo con su color, con tramado de puntos y líneas de acción.',
        'Presentación, pausa y resultados rediseñados. Sin brillos neón: todo tinta y color.',
        'El menú de la izquierda encastra como una tira de historieta, con ángulos más marcados.',
      ] },
      { kind: 'arreglo', items: [
        'La tarjeta VS BOT (y las demás) ya no dejan asomar color por fuera del borde.',
        'El logo ya no se encima con la tarjeta del jugador.',
      ] },
    ],
  },
  {
    id: '2026-11-14-2v2-412',
    date: '2026-11-14',
    version: '4.12',
    title: 'Llegó el 2v2 por equipos',
    tag: 'v4.12',
    color: '#25CFE6',
    intro: 'Equipo azul contra equipo rojo en la misma compu: hasta 4 personas, joysticks y bots compañeros.',
    blocks: [
      { kind: 'nuevo', items: [
        '2v2 · EQUIPOS (en Jugar): cada lugar puede ser una persona o un bot, con su dificultad.',
        'Cuatro jugadores en un teclado (J3 con IJKL + U/O, J4 con el teclado numérico) o con joysticks: pulsá A para sumarlo.',
        'Pong Chaos en dobles (uno en el arco y otro adelante) y Color Control por equipos. Vamos a sumar más minijuegos.',
        'Los bots juegan en equipo: se reparten la cancha y cubren a su compañero.',
      ] },
    ],
  },
  {
    id: '2026-11-14-singleplayer-411',
    date: '2026-11-14',
    version: '4.11',
    title: 'Singleplayer: Daily Chaos, Semanal, Endless y Ghost Run',
    tag: 'v4.11',
    color: '#3DDC97',
    intro: 'Cuatro modos nuevos para jugar solo, con rankings mundiales y recompensas.',
    blocks: [
      { kind: 'nuevo', items: [
        'DAILY CHAOS: cada día un minijuego con un modificador CAOS y metas de 3 estrellas. Igual para todos.',
        'WEEKLY CHALLENGE: un desafío por semana con ranking mundial; al terminar la semana, premio en PIES según tu puesto.',
        'ENDLESS CLUB: maratón infinita de minijuegos con metas que suben, vidas y multiplicador.',
        'GHOST RUN: competí contra tu propio fantasma (en Tower Climb y Micro Race lo ves moverse; en los de puntos, la diferencia en vivo).',
      ] },
      { kind: 'mejora', items: [
        'Los desafíos cambian solos todos los días y todas las semanas: siempre hay algo nuevo para jugar.',
        'Dan XP y PIES (y suben el CLUB PASS). Nunca dan ELO.',
      ] },
    ],
  },
  {
    id: '2026-11-14-local-ranked-410',
    date: '2026-11-14',
    version: '4.10',
    title: 'Competitivo en la misma compu',
    tag: 'v4.10',
    color: '#FF4B3E',
    intro: 'Si los dos tienen cuenta, ahora pueden jugar local por ELO: el mismo ELO y el mismo ranking que el online.',
    blocks: [
      { kind: 'nuevo', items: [
        'Partidas locales CASUAL o COMPETITIVA cuando J1 y J2 tienen cuenta (Duel Mode, Tournament y Quick Play).',
        'La competitiva la tienen que confirmar los dos, cada uno con su tecla. No se puede cambiar a mitad de la partida.',
        'Un solo ELO y un solo ranking mundial: el local competitivo y el online usan exactamente el mismo cálculo.',
      ] },
      { kind: 'mejora', items: [
        'Protección contra cuentas falsas que se dejan ganar: si algo se ve raro, el ELO queda en revisión (podés seguir jugando casual) y se acredita cuando se confirma.',
        'Compartir compu o conexión no es motivo de sanción: el sistema mira muchas señales y nunca bloquea a nadie solo por eso.',
      ] },
    ],
  },
  {
    id: '2026-11-14-club-pass-49',
    date: '2026-11-14',
    version: '4.9',
    title: 'Llegó el CLUB PASS: 250 niveles para siempre',
    tag: 'v4.9',
    color: '#FFD23F',
    intro: 'El pase ya no tiene temporadas: 250 niveles permanentes y prestigio infinito después.',
    blocks: [
      { kind: 'nuevo', items: [
        'CLUB PASS: 250 niveles con fila libre y Premium. No vence, no se reinicia y nada desaparece.',
        'Arrancás con toda la XP que ya ganaste: tu nivel del pase se calculó con tu progreso.',
        'Más de 160 cosméticos nuevos del pase: tarjetas, skins, marcos, títulos y emotes.',
        'Prestigio: después del 250 el pase sigue para siempre, con premios cada 10 niveles y títulos en 300, 400, 500, 750 y 1000.',
        'Bono de regreso: si volvés después de 2 días, tus próximos 300 XP de pase cuentan doble.',
      ] },
      { kind: 'mejora', items: [
        'El Premium se compra una sola vez con PIES y entrega todo lo de los niveles que ya alcanzaste. Si tenías el Premium de la Temporada 1, lo conservás.',
        'Todas las recompensas de la Temporada 1 siguen disponibles dentro del CLUB PASS.',
      ] },
    ],
  },
  {
    id: '2026-11-15-idiomas-48',
    date: '2026-11-15',
    version: '4.8',
    title: 'DUEL CLUB en inglés y Singleplayer sin rival',
    tag: 'v4.8',
    color: '#25CFE6',
    intro: 'Ahora podés jugar en español o en inglés, y el modo solo ya no te pone ningún rival.',
    blocks: [
      { kind: 'nuevo', items: [
        'Idioma: español o inglés (en Configuración). Se elige solo según tu navegador la primera vez.',
      ] },
      { kind: 'mejora', items: [
        'Desafíos solo: no aparece ningún rival en la partida, la intro ni los resultados; se muestra tu meta.',
        'VS BOT y Escalera: el bot ya está listo, solo apretás tu tecla para empezar.',
        'Más menús con viñetas de historieta de colores.',
      ] },
      { kind: 'arreglo', items: [
        'Se corrigió la viñeta violeta del fondo que se veía como un cuadrado raro.',
      ] },
    ],
  },
  {
    id: '2026-11-15-identidad-comic-47',
    date: '2026-11-15',
    version: '4.7',
    title: 'DUEL CLUB tiene nueva cara',
    tag: 'v4.7',
    color: '#FFD23F',
    intro: 'Nuevo logo, nuevos colores y una pantalla dividida azul contra rojo.',
    blocks: [
      { kind: 'mejora', items: [
        'Nueva identidad visual estilo cómic: tinta gruesa, sombras duras y colores fuertes.',
        'Personajes redibujados en estilo historieta, con contorno y tramado de puntos.',
        'Nuevas tipografías, fondo de duelo y portada nueva.',
        'Menú ordenado por grupos y minijuegos con textura de historieta.',
        'El fondo ahora es una página de cómic, con viñetas inclinadas de colores.',
        'Menú y elección de minijuegos en viñetas de color, y nueva letra de historieta.',
      ] },
    ],
  },
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

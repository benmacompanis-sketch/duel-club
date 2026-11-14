# DUEL CLUB: puesta al día completa + próximo pedido

> Pegale este texto entero a ChatGPT. La parte 1 lo pone al día con todo lo que se hizo con Claude; la parte 2 es lo que hay que pedir ahora (para que lo arme como prompt detallado para Claude).

---

## PARTE 1: QUÉ ES EL JUEGO Y QUÉ YA ESTÁ HECHO

### El proyecto
- **DUEL CLUB**: juego web arcade de duelos 1v1 con 16 minijuegos, en español rioplatense (voseo). Ahora también en inglés.
- Publicado en **https://duelclub.vercel.app** (Vercel publica solo cada cambio de la rama `main` del repo de GitHub).
- Hecho con **Vite + JavaScript puro**: el escenario de los minijuegos se dibuja en un canvas de 1280×720 y los menús son HTML/CSS.
- Backend en **Supabase**: cuentas, progreso, ranking, amigos, tienda, pase y online. Toda la lógica sensible está en funciones del servidor; el navegador nunca puede tocar monedas, XP ni ELO directamente.
- Versión actual: **4.8**.

### Los 16 minijuegos
Reaction Rush, Micro Race, Pong Chaos, Last Platform, Hoop Master, Memory War, Color Control, Duel Arena, Target Panic, Beat Battle, Fish Frenzy, Block Battle, Shadow Sneak, Turbo Tennis, Tower Climb y Blast Zone.
Cada uno tiene sus controles, su récord mundial, rangos de dominio (Principiante → Maestro) y logros.

### Modos de juego que ya existen
- **Local (2 jugadores, un teclado):** DUEL MODE (competición de 3 a 12 minijuegos por puntos), QUICK PLAY (un minijuego directo), TOURNAMENT (copa por rondas con gran final que vale doble) y SURVIVAL (etapas cada vez más difíciles).
- **Online (cada uno en su compu):** "Buscar rival" competitivo por ELO (mejor de 3), salas privadas con código o link, y desafíos a amigos.
  - Usa conexión directa P2P con respaldo por servidor y **rollback**: tus teclas se aplican al instante y la partida se corrige sola si el rival hizo otra cosa. Se probó con mala conexión.
  - Si recargás la página volvés a la partida.
- **SINGLEPLAYER (Un jugador):**
  - **Desafíos solo:** 11 minijuegos con metas de 1, 2 y 3 estrellas según tu récord, más un desafío del día. No aparece ningún rival: ni en la partida, ni en la intro, ni en los resultados.
  - **VS BOT:** cualquier minijuego contra un bot de 4 dificultades (Fácil, Normal, Difícil, Experto). Hay un "cerebro" de bot para cada uno de los 16 juegos.
  - **ESCALERA (Ladder):** los 16 minijuegos seguidos, con bots cada vez más duros y 3 vidas.
  - **PRÁCTICA:** contra un muñeco quieto o un bot; no cuenta para nada.
- **Dificultad CAOS y eventos especiales:** turbo, cámara lenta, controles invertidos, apagón, terremoto, modo espejo, puntos dobles, gravedad baja, etc. Siempre iguales para los dos jugadores.

### Progresión y economía
- **XP** (antes "KEKE") para niveles y **ELO** (antes "SUSI/RESISTENCIA") como rating competitivo.
  - **El ELO solo se gana o pierde en online competitivo ("Buscar rival").** Salas, desafíos a amigos, local y bots dan XP y PIES, pero nunca ELO.
- **PIES:** moneda que se gana jugando (nunca con dinero real). Con eso se compra en la **PIE STORE** (88 cosméticos: personajes, skins, sombreros, máscaras, accesorios de cuerpo, marcos, tarjetas de perfil, efectos de entrada y de victoria, títulos, emotes, memes). Hay destacados del día.
- **Pase de Batalla, Temporada 1 "Club Caótico":** 40 niveles, fila libre y fila Premium. El Premium se compra con 1500 PIES; si lo comprás tarde, recibís todo lo anterior. Tiene 21 objetos exclusivos.
- **Desafíos diarios y semanales** con XP y PIES.
- **152 logros**, algunos secretos, y dominio por minijuego con skin y título exclusivos al llegar a Maestro.
- Los cosméticos solo cambian el aspecto: **no dan ventaja**.

### Cuentas y parte social
- Cuentas con usuario y contraseña, que funcionan en cualquier compu o celular. Las cuentas de la versión vieja se recuperan con PIN.
- Login con **Google y con email** (link mágico): el código está listo, pero **falta activarlo en Supabase** (configurar URLs de redirección y el proveedor de Google).
- Nombre visible con **filtro de nombres ofensivos**; se puede cambiar 1 vez cada 7 días y no se puede repetir.
- **Amigos (CLUB)**: solicitudes, cara a cara, desafíos online, ver quién está conectado.
- **Contador real de jugadores en línea.**
- Ranking mundial (ELO, nivel, récords) con datos reales: **no hay cuentas ni estadísticas inventadas**.
- Notificaciones, novedades dentro del juego y formulario para reportar errores (con panel de admin).
- **Set del creador** para la cuenta `benuchinb2`: personaje "El Creador", corona, máscara, capa, entrada y victoria propias, título, tarjeta, marco y Pase Premium regalado.

### Identidad visual actual (estilo historieta/cómic)
- Contorno de tinta grueso, sombras duras, tramado de puntos (halftone), colores fuertes.
- Letra **Bangers** para títulos y **Nunito** para textos.
- Fondo: una **página de cómic** con viñetas inclinadas de colores.
- Menú lateral en **viñetas de colores**, una por sección, agrupadas en JUGAR, VOS, TIENDA y CLUB.
- Tarjetas de modos y minijuegos con textura de historieta.
- Personajes dibujados por código (no imágenes) con sombreado tipo cómic y tramado.

### Idiomas
- **Español e inglés.** Hay selector en Configuración y la primera vez se elige según el navegador.
- En inglés, el modo solo se llama "SINGLEPLAYER", la escalera "LADDER", el pase "Battle Pass", etc.
- Están traducidos los menús, el texto dentro de los minijuegos, los logros, la tienda, el pase, los desafíos y las novedades.

### Calidad y pruebas
- Pruebas automáticas en vivo contra el sitio publicado (GitHub Actions): 27 chequeos generales y 16 del modo online con dos navegadores y dos cuentas.
- Pruebas locales: determinismo y rollback de los 16 juegos con red mala, flujo online, reconexión, bots, solo y los 16 minijuegos seguidos.

### Reglas que Claude tiene que seguir siempre
- No poner claves secretas ni credenciales de admin en el frontend.
- No inventar URLs, credenciales, cuentas, estadísticas ni partidas.
- No borrar ni pisar datos originales sin comprobar la migración.
- No decir que algo está terminado sin probarlo.
- Monedas, XP y ELO no se pueden modificar desde el navegador.
- Trabajar en tandas grandes (cuidar los tokens) y publicar con pruebas.

### Pendientes conocidos (ya anotados)
- **Rediseñar desde cero los personajes y accesorios:** más detallados, con más onda y profesionales, en la nueva identidad de historieta. Lo mismo con las **portadas (íconos) de los 16 minijuegos**.
- El dueño del juego quizás genere imágenes con Gemini (cuenta educativa) cuando termine los exámenes. Hay una guía en `docs/IMAGENES-GEMINI.md` que hay que actualizar al estilo cómic.
- Activar Google y email en Supabase (lo tiene que hacer el dueño desde el panel).
- Probar el online de verdad en dos dispositivos distintos.
- Limpiar dos funciones viejas sin uso en la base de datos (`dc.add_keke`, `dc.tier_keke`).

---

## PARTE 2: LO QUE QUIERO PEDIRLE AHORA A CLAUDE

Armá un prompt detallado y ordenado para Claude con estos puntos.

### A. Singleplayer con juegos distintos (exclusivos del modo solo)
Hoy el Singleplayer usa los mismos 16 minijuegos del 1v1, con metas o con bots. Quiero **modos o minijuegos que solo existan en Singleplayer**, para que la gente se enganche a jugar sola aunque no tenga con quién.
Pensá ideas y elegí las mejores. Ideas que ya salieron:
- Contrarreloj contra tu "fantasma".
- Maratón infinita de minijuegos con metas que suben.
- Desafío semanal con ranking mundial (mismas condiciones para todos).
- Modo historia por capítulos para cada personaje, con reglas raras y cosméticos de premio.
- Puzzles armados a mano dentro de los minijuegos.
- Minijuego del día con un modificador CAOS fijo y 3 estrellas.

Tiene que tener sus propias recompensas (XP, PIES, desafíos, logros) **sin dar ELO**.

### B. Modos 2v2
Agregar partidas de **2 contra 2**, con todas las combinaciones:
- 2 reales contra 2 reales (local y online).
- 2 reales contra 2 bots (cooperativo contra la compu).
- **Rellenar equipos con bots:** por ejemplo 2 reales contra 1 real + 1 bot, o 1 real + 1 bot contra 2 bots.
- Sin IA (solo personas) o con IA, a elección.

Hay que definir:
- Qué minijuegos se adaptan bien a 2v2 y cómo (pantalla, controles para 4 personas en un teclado o mezclando teclado y joysticks, cámara).
- Cómo se ve cada equipo (colores, marcador).
- Cómo cuenta para XP, PIES y logros.
- El ELO solo en 2v2 online competitivo, si se hace un ranking aparte.

### C. Corregir desprolijidades de diseño
- **Página de inicio / sección Jugar:** en la tarjeta **"VS BOT"** se sale una parte naranjita por fuera de la forma y queda feo. Revisar que **ninguna tarjeta de color se salga de su recorte**.
- **El logo "DUEL CLUB" se superpone con la tarjeta del jugador** de arriba a la izquierda. Acomodar para que no se pise con nada.
- **Menú de la izquierda (viñetas):** la idea es que las viñetas **encastren una con otra**, como piezas que se calzan (los bordes de una siguen la forma de la de al lado, sin huecos raros). Las figuras tienen que ser **un poquito más exageradas** (más inclinación y ángulos más marcados), pero que se sigan leyendo bien.
- Hacer una **revisión visual completa** de todas las pantallas y minijuegos buscando cosas encimadas, textos cortados, sombras raras o formas mal dibujadas, y corregirlas.

### D. Nombre y logo
- Pensar **más nombres para el juego** que vayan con la identidad de historieta/cómic. Dar varias opciones con una explicación corta de cada una; se puede seguir con "DUEL CLUB" si es la mejor.
- Hacer un **logo bueno y piola**: estilo cómic, con contorno de tinta, bien legible en chico (ícono de pestaña) y en grande (portada). Que tenga versión para fondo oscuro y claro.

### E. Seguir con lo pendiente
- Rediseño de personajes, accesorios y portadas de minijuegos (ver "Pendientes conocidos").
- Todo traducido también al inglés.
- Probar todo y publicar con las pruebas automáticas en verde.

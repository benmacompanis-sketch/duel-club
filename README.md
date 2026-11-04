# DUEL CLUB

**TWO PLAYERS. ONE CHAMPION.**

Videojuego arcade de competición local para **dos jugadores en el mismo teclado**. Doce minijuegos 1v1 originales, modos de competición, torneos, supervivencia, personajes desbloqueables, logros, récords y una banda sonora generada en tiempo real. Funciona en el navegador, sin cuentas, sin servidores y sin conexión una vez cargado.

---

## Cómo jugar

### Requisitos
- [Node.js](https://nodejs.org) 18 o superior (solo para desarrollar o compilar).
- Chrome, Edge o Firefox actualizados.

### Modo desarrollo

```bash
npm install
```

```bash
npm run dev
```

Abrí la URL que muestra la terminal (por defecto `http://localhost:5173`).

### Versión final (para publicar)

```bash
npm run build
```

Genera la carpeta `dist/`, lista para subir a cualquier hosting estático (GitHub Pages, Netlify, Vercel, itch.io, un servidor propio…). Usa rutas relativas, así que funciona también dentro de una subcarpeta. Para probar el build localmente:

```bash
npm run preview
```

> Abrir `dist/index.html` con doble clic (`file://`) no funciona en todos los navegadores porque los módulos JavaScript requieren un servidor. Usá `npm run preview` o cualquier servidor estático.

---

## Controles por defecto

| Acción | Jugador 1 | Jugador 2 |
|---|---|---|
| Movimiento | `W` `A` `S` `D` | Flechas |
| Acción 1 | `F` | `ENTER` |
| Acción 2 | `G` | `SHIFT` derecho |
| Pausa | `ESC` o `P` | `ESC` o `P` |

Todos los controles se pueden reasignar en **SETTINGS → Controles**. El sistema de entrada registra todas las teclas pulsadas a la vez, así que el movimiento de un jugador nunca bloquea al otro.

> Nota: algunos teclados de membrana no pueden registrar ciertas combinaciones de muchas teclas simultáneas (*ghosting*). Es una limitación del hardware; si pasa, reasigná las teclas en SETTINGS.

En los menús: `W/S` o flechas para navegar, `F` o `ENTER` para elegir, `ESC` o `G` para volver. También funciona con mouse.

---

## Modos

- **DUEL MODE** — la competición principal. 3, 5, 7, 10 o 12 minijuegos, selección aleatoria o manual, repeticiones opcionales, eventos especiales y dificultad. Pantalla VS, marcador general entre juegos y muerte súbita si hay empate.
- **QUICK PLAY** — elegí un minijuego, sus opciones (pista, rondas, tablero, canción…), la dificultad y un evento.
- **TOURNAMENT** — copa por rondas (2 minijuegos cada una) con clasificación, +1 punto al ganador de cada ronda y una GRAN FINAL que vale doble. Pantalla de campeón y revancha.
- **SURVIVAL** — desafíos consecutivos con vidas; cada etapa es más difícil y los eventos aparecen más seguido. Registra la mejor etapa y la mejor racha.
- **RECORDS** — victorias, derrotas y empates por jugador, minijuegos más jugados, récord individual de cada juego, mejor racha, logros e historial.
- **SETTINGS** — volumen general / música / efectos, pantalla completa, animaciones, calidad visual, calibración de ritmo, controles y reinicio de datos.

Puntuación global: **victoria 3 puntos, empate 1 punto para cada uno, derrota 0**.

## Los 12 minijuegos

| # | Juego | Categoría | Idea |
|---|---|---|---|
| 01 | REACTION RUSH | Reflejos | Esperá la señal verde (panel, semáforo, palabras o campana) y reaccioná primero. Anticiparse o caer en señales falsas regala la ronda. Mide los milisegundos reales. |
| 02 | MICRO RACE | Carreras | Autos vistos desde arriba en 3 pistas: aceleración automática, giro, freno/derrape, turbos, barro, conos y barriles. |
| 03 | PONG CHAOS | Precisión | Paletas con efecto y SMASH; bumpers, muro móvil, multibola, paletas mini y turbo. |
| 04 | LAST PLATFORM | Habilidad | Plataformas que se desmoronan, plataformas móviles, láseres, dash para empujar. Al mejor de 3. |
| 05 | HOOP MASTER | Puntería | Ángulo + potencia oscilante, trayectoria, rebotes en aro y tablero doble, distancias de 2 y 3 puntos, aro dorado y aro móvil. |
| 06 | MEMORY WAR | Memoria | Por turnos, con cursor propio, rachas con bonus, errores de memoria penalizados y 3 tamaños de tablero. |
| 07 | COLOR CONTROL | Estrategia | Pintá el tablero, robá casillas, casillas doradas dobles y potenciadores (bomba, turbo, escudo, congelar). |
| 08 | DUEL ARENA | Combate | Combos de 3 golpes, patada aérea, bloqueo con parry, energía, especial con enfriamiento y 3 escenarios. Caricaturesco. |
| 09 | TARGET PANIC | Precisión | Blancos de tu color, dorados en disputa, minas que restan, robos de blancos rivales, combos y multiplicador. |
| 10 | BEAT BATTLE | Ritmo | 3 canciones originales; notas generadas desde la propia música, juicio PERFECT/GREAT/GOOD/MISS con reloj de alta precisión. |
| 11 | FISH FRENZY | Coordinación | Zonas independientes con la misma secuencia de peces, enganche, recogida con tensión, basura, medusas y un pez dorado legendario. |
| 12 | BLOCK BATTLE | Lógica | Puzzle de piezas que caen con identidad propia: misma secuencia para ambos, combos, filas de ataque y cancelación. |

Eventos especiales (opcionales y justos para ambos): velocidad aumentada, tiempo reducido, gravedad baja, controles invertidos temporales, puntuación doble en el tramo final, obstáculos extra y modo espejo.

## Cuentas, ranking mundial y amigos

- **Cuentas con PIN**: cada jugador crea una cuenta (nombre único + PIN de 4 números) desde *JUGADORES Y CUENTAS*. J1 y J2 pueden tener cada uno su cuenta en la misma computadora; también se puede jugar como invitado.
- **Desde cualquier computadora**: en la versión publicada, las cuentas se guardan en la base de datos compartida de la página, así que la misma cuenta funciona en otra compu que abra el link. En `npm run dev` (sin nube) todo funciona igual pero guardado en ese navegador.
- **Ranking mundial (ELO)**: arranca en 1000 y cambia en cada minijuego entre dos cuentas (las partidas contra invitados no cuentan). También hay récords mundiales por minijuego e historial del club.
- **Perfil y niveles**: cada cuenta gana XP (jugar, ganar, competiciones y logros), sube de nivel con títulos (Novato → Leyenda del club) y desbloquea estilos de tarjeta de perfil.
- **CLUB**: tarjeta de perfil, amigos, buscador de jugadores, historial personal, rivales (cara a cara) y juegos favoritos.
- El PIN es un candado casual entre amigos, no seguridad real: no uses un PIN que uses en otro lado.

## Personajes, logros y desbloqueables

8 personajes originales dibujados con Canvas (Volt, Mochi, Pico, Brik, Nimbus, Fang, Ozzy y Rex), cada uno con animaciones de reposo, movimiento, salto, victoria, derrota, celebración, ataque, bloqueo y daño. 4 se desbloquean con logros, igual que 7 accesorios. Hay 24 logros, todos verificados con condiciones reales de juego.

## Arquitectura

```
src/
  main.js                 punto de entrada (fuentes + arranque)
  style.css               identidad visual de la interfaz
  core/
    gameManager.js        App (bucle rAF con delta time) + MinigameRunner (máquina de estados común)
    inputManager.js       teclas simultáneas, flancos, marcas de tiempo, reasignación
    audioManager.js       sintetizador de efectos + secuenciador musical (Web Audio API)
    storageManager.js     LocalStorage seguro con validación y valores por defecto
    statsManager.js       estadísticas, récords, historial y cara a cara
    tournamentManager.js  sesiones y flujos de Duel / Torneo / Survival / Quick Play
    accountService.js     cuentas, PIN, ELO, XP/niveles, amigos, récords mundiales (nube o local)
    achievementManager.js logros y recompensas
    characters.js         8 personajes y accesorios dibujados por código
    renderer.js           escalado del escenario, fondo animado, partículas y efectos
    events.js             eventos especiales
    utils.js              matemáticas, color y dibujo
  games/                  un archivo independiente por minijuego (todos extienden BaseGame)
  ui/                     pantallas DOM: menú, selección de jugadores, configuración, intro,
                          pausa, resultados, VS, campeón, torneo, récords, ajustes, cuenta y CLUB
```

Todo el arte (personajes, objetos, escenarios, íconos) está hecho con Canvas 2D, CSS y SVG en línea; toda la música y los efectos se generan con Web Audio API. Las tipografías se empaquetan con el build, así que no hay dependencias externas en tiempo de ejecución.

### Modo de prueba

Agregando `?test` a la URL se expone `window.DC` (la instancia del juego) para pruebas automatizadas.

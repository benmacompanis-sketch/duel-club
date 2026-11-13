# DUEL CLUB

**ONE CLUB. INFINITE DUELS. QUESTIONABLE AURA.**

Arcade competitivo 1v1 en el navegador: **dos jugadores en el mismo teclado** o **cada uno en su compu (online)**.
16 minijuegos, cuentas online, nivel con **KEKE**, rating competitivo **SUSI**, moneda **PIES** y la **PIE STORE**,
152 logros, dominio por minijuego, amigos, cara a cara, rankings mundiales y una banda sonora generada en tiempo real.

---

## Jugar

- **Jugar ahora: https://benmacompanis-sketch.github.io/duel-club/** (no hace falta cuenta de nada para entrar).
- Se puede jugar como **invitado** sin registrarse. Para guardar progreso permanente (KEKE, PIES, SUSI,
  logros, inventario, historial) cada jugador crea una cuenta con **usuario + contraseña** (sin email).
- J1 y J2 pueden tener cada uno su cuenta en la misma computadora. La misma cuenta no puede ser J1 y J2.
- Cuentas de la versión anterior (nombre + PIN): en *Cuenta → CUENTA ANTERIOR* se recuperan con el PIN y
  se elige una contraseña nueva. Su progreso ya está migrado.

### Controles por defecto

| Acción | Jugador 1 | Jugador 2 |
|---|---|---|
| Movimiento | `W` `A` `S` `D` | Flechas |
| Acción 1 | `F` | `ENTER` |
| Acción 2 | `G` | `SHIFT` derecho |
| Pausa | `ESC` o `P` | `ESC` o `P` |

Se pueden reasignar en **Configuración → Controles**. Menús: flechas/WASD, `F`/`ENTER` elige, `ESC` vuelve.

## Jugar online (cada uno en su compu)

- **Jugar → JUGAR ONLINE** (hace falta cuenta). Tres formas:
  - **Buscar rival**: el servidor te empareja con alguien de SUSI parecido (el rango se abre si tarda). Mejor de 3.
  - **Sala con código**: creás la sala (única, mejor de 3 o de 5; minijuegos al azar o uno elegido; CAOS opcional)
    y le pasás a tu amigo el código o el link `…/duel-club/?sala=CODIGO`.
  - **Desafiar a un amigo** del CLUB: le aparece el aviso al instante si tiene el juego abierto.
- Cada uno juega con sus teclas de siempre (WASD + F/G o flechas + ENTER/SHIFT). No hay pausa: ESC = abandonar.
- La partida cuenta para SUSI, KEKE, PIES, dominio y logros igual que en una compu. Revancha con un botón.
- Si alguien abandona o deja de responder 25 s, pierde la ronda en curso y la serie.

**Cómo funciona.** Las dos compus se conectan directo (WebRTC); si alguna red no lo permite, los mensajes pasan
por el servidor (Supabase Realtime). Solo viajan las teclas: las dos compus simulan exactamente la misma partida
en pasos fijos de 1/60 s con la misma semilla de azar ("lockstep" con unos frames de retardo de entrada iguales
para los dos). Cada segundo comparan una huella del estado; si no coincide, la ronda se anula. Al terminar, cada
compu informa el resultado y **el servidor solo lo cuenta si las dos coinciden**.

## Novedades y reportes de errores

- **Novedades** (menú lateral): cada actualización con lo nuevo, las mejoras y los errores corregidos. La última
  aparece como cartel una sola vez a cada jugador y queda fija arriba de Inicio.
- **Reportar un error** (Novedades → REPORTAR UN ERROR, o el botón "¿Un error?" de Inicio): tipo de problema, dónde
  pasó y qué pasó. Se pueden adjuntar datos técnicos (versión, navegador, pantalla y últimos errores; nada personal).
  Funciona con cuenta o como invitado. En **MIS REPORTES** cada uno ve el estado (recibido, visto, arreglándolo,
  arreglado) y la respuesta; con cuenta llega una notificación cuando se responde.
- **Administrar reportes**: las cuentas con `is_admin = true` ven la pestaña **ADMIN** (todos los reportes, datos
  técnicos, cambiar estado y responder). Para dar acceso: `update accounts set is_admin = true where username = '…';`
- **Anunciar una actualización**: agregar una entrada arriba de todo en `src/data/news.js` (id nuevo, fecha,
  versión, bloques `nuevo` / `mejora` / `arreglo`). Al publicar, el cartel aparece solo.

## Contenido

- **Modos**: Duel, Quick Play, Tournament, Survival. Dificultades Fácil/Normal/Difícil y **CAOS**
  (turbo, cámara lenta, controles invertidos, espejo, apagón, terremoto: siempre anunciados e iguales para los dos).
- **16 minijuegos**: Reaction Rush, Micro Race, Pong Chaos, Last Platform, Hoop Master, Memory War,
  Color Control, Duel Arena, Target Panic, Beat Battle, Fish Frenzy, Block Battle y los nuevos
  **Shadow Sneak** (laberinto a oscuras), **Turbo Tennis**, **Tower Climb** (pantalla dividida) y **Blast Zone** (supervivencia).
- **KEKE y niveles**: hace falta `25 × (L − 1) × (L + 2)` KEKE para el nivel L. Títulos 1/5/10/15/20/30/50/75/100
  y niveles especiales 6, 21, 42, **67 (EL ELEGIDO)**, 69, 100 y 150 con recompensas propias.
- **SUSI**: rating tipo ELO (empieza en 1000, K 36→24→16 según experiencia), solo entre dos cuentas,
  con anti-abuso (entre la misma pareja, rinde la mitad desde la 6.ª partida en 24 h y nada desde la 12.ª).
- **PIES y PIE STORE**: 80 objetos a la venta (20 comunes, 18 poco comunes, 16 raros, 12 épicos, 9 legendarios,
  5 míticos; 100/250/500/1000/2200/5000 PIES) + exclusivos por logros, niveles, dominio y secretos.
  Solo cosméticos: no dan ventajas. Sin dinero real, sin cajas aleatorias.
- **MEME COLLECTION**: personajes originales (Gerardo NPC, Sr. Formalidad, Frigo-Bot, Tostadín, La Silla,
  Tun-Tun Tronco), sombreros, emotes, títulos absurdos y frases contextuales que no se repiten.
- **Logros**: 152 (16 minijuegos × 5 desafíos + generales, competitivos, sociales, online, colección, meme y secretos).
- **CLUB**: amigos (en línea/última actividad), búsqueda, solicitudes (aceptar/rechazar/cancelar), cara a cara con VS.
- **Ranking mundial**: SUSI, nivel, KEKE, victorias, por minijuego y récords; General/Amigos, Top 10/100 y mi posición.

## Arquitectura

```
src/
  config.js            URL y clave publicable de Supabase (segura para el navegador)
  net/api.js           cliente RPC (fetch) + mensajes de error
  net/netplay.js       online: conexión (WebRTC + respaldo Realtime) y simulación sincronizada (lockstep)
  net/onlineMatch.js   online: una serie contra el rival (estado del servidor, rondas, resultados)
  data/catalog.js      FUENTE ÚNICA: objetos, rarezas, títulos, tarjetas, niveles, rangos SUSI, dominio
  data/achievements.js FUENTE ÚNICA: 152 logros con condiciones evaluadas por el servidor
  data/news.js         novedades del juego (cartel y sección Novedades)
  core/                motor: bucle, input, audio, renderer, personajes, cosméticos, cuentas (accountService)
  games/               un archivo por minijuego (todos extienden BaseGame) + index.js (registro)
  ui/                  hub (menú y barra superior), store, inventory, achievementsView, profile, club,
                       ranking, statsView, gamesView, notifications, accountModal, online, kit (componentes)
supabase/migrations/   esquema y lógica del servidor (001_core … 005_online, 006_feedback)
supabase/seed/         catalog.sql generado desde src/data con scripts/gen-seed.mjs
scripts/               gen-seed.mjs (catálogo → SQL), gen-legacy-migration.py (migración de la versión anterior)
```

### Backend y guardado

- **Supabase (PostgreSQL)**. El navegador solo puede llamar funciones `public.dc_*`. Todas las tablas tienen
  RLS activado sin políticas y sin permisos para `anon`/`authenticated`: no se pueden leer ni escribir directo.
- Autenticación propia: contraseñas con bcrypt, sesiones con token aleatorio (se guarda solo su hash),
  límite de intentos fallidos y de registros.
- El servidor calcula **todo** lo que importa: KEKE, niveles, PIES, SUSI, logros, dominio, récords e inventario.
  El navegador envía el resultado de la partida; el servidor valida sesiones de ambos jugadores, duración mínima,
  ritmo, valores plausibles, idempotencia (`client_id` único: una partida nunca paga dos veces) y aplica
  recompensas decrecientes por día contra el farmeo. Las competiciones solo cuentan si tienen minijuegos registrados.
- Sin conexión, los resultados quedan en una cola local y se envían al volver la conexión.
- Este navegador guarda solo: ajustes, controles, sesiones iniciadas y estadísticas locales de la compu.
- Limitación honesta: los minijuegos corren en el navegador, así que el servidor no puede verificar la física
  de cada jugada. Por eso se limitan valores, ritmo y recompensas diarias, y el SUSI exige dos cuentas con sesión.
  Online, además, las dos compus tienen que informar lo mismo para que la ronda cuente. La conexión directa
  WebRTC hace que cada compu vea la IP pública de la otra (como en cualquier juego P2P).

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

### Agregar contenido sin rehacer nada

- **Objeto/skin/título/tarjeta**: agregarlo en `src/data/catalog.js` (y su dibujo en `src/core/cosmetics.js`
  o su estilo `.pc-<id>` en `style.css`), correr `node scripts/gen-seed.mjs` y aplicar `supabase/seed/catalog.sql`.
- **Logro**: agregarlo en `src/data/achievements.js` (condición `cond`), regenerar y aplicar el seed.
- **Minijuego**: crear la clase en `src/games/`, registrarla en `src/games/index.js`, agregar el id en
  `GAME_IDS`/`GAME_NAMES`/`GAME_RECORDS` de `catalog.js` y regenerar el seed (crea sus 5 desafíos y su dominio).
- **Cambios del servidor**: nueva migración en `supabase/migrations/` aplicada al proyecto de Supabase.

### Publicación y pruebas automáticas

- Cada push a `main` compila y publica en GitHub Pages (`.github/workflows/deploy.yml`). La URL no cambia.
- Después de cada publicación corre `tests/e2e/live.mjs` en GitHub Actions (`e2e-live.yml`): abre el sitio publicado
  en un navegador limpio, crea dos cuentas, juega un minijuego real, compra en la PIE STORE, prueba amistad, ranking,
  inicio de sesión desde otro navegador, bloqueo de trampas desde la consola y elimina sus cuentas de prueba.
- `tests/e2e/live-online.mjs` prueba el modo online con dos navegadores separados: sala con código, conexión
  directa, partida real confirmada por el servidor, respaldo por Realtime, buscar rival y abandono.
- `keepalive.yml` hace una lectura diaria para que el plan gratuito de Supabase no pause la base de datos.

### Modo de prueba

Con `?test` en la URL se expone `window.DC` para pruebas automatizadas.

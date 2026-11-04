# DUEL CLUB

**ONE CLUB. INFINITE DUELS. QUESTIONABLE AURA.**

Arcade competitivo 1v1 para **dos jugadores en el mismo teclado**, en el navegador. 16 minijuegos, cuentas
online, nivel con **KEKE**, rating competitivo **SUSI**, moneda **PIES** y la **PIE STORE**, 148 logros,
dominio por minijuego, amigos, cara a cara, rankings mundiales y una banda sonora generada en tiempo real.

---

## Jugar

- Versión publicada: ver la URL del proyecto en Vercel (no hace falta cuenta de nada para entrar).
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
- **Logros**: 148 (16 minijuegos × 5 desafíos + generales, competitivos, sociales, colección, meme y secretos).
- **CLUB**: amigos (en línea/última actividad), búsqueda, solicitudes (aceptar/rechazar/cancelar), cara a cara con VS.
- **Ranking mundial**: SUSI, nivel, KEKE, victorias, por minijuego y récords; General/Amigos, Top 10/100 y mi posición.

## Arquitectura

```
src/
  config.js            URL y clave publicable de Supabase (segura para el navegador)
  net/api.js           cliente RPC (fetch) + mensajes de error
  data/catalog.js      FUENTE ÚNICA: objetos, rarezas, títulos, tarjetas, niveles, rangos SUSI, dominio
  data/achievements.js FUENTE ÚNICA: 148 logros con condiciones evaluadas por el servidor
  core/                motor: bucle, input, audio, renderer, personajes, cosméticos, cuentas (accountService)
  games/               un archivo por minijuego (todos extienden BaseGame) + index.js (registro)
  ui/                  hub (menú y barra superior), store, inventory, achievementsView, profile, club,
                       ranking, statsView, gamesView, notifications, accountModal, kit (componentes)
supabase/migrations/   esquema y lógica del servidor (001_core.sql, 002_rpc.sql)
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

### Modo de prueba

Con `?test` en la URL se expone `window.DC` para pruebas automatizadas.

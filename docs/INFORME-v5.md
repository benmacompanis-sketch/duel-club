# DUEL CLUB 5.0: informe de la gran actualización

Publicado en https://duelclub.vercel.app en etapas (4.9 → 5.0). En cada etapa: pruebas locales, migraciones verificadas en Supabase, build, publicación y pruebas automáticas en vivo (27 generales + 16 online, todas en verde).

---

## IMPLEMENTADO Y PROBADO

### CLUB PASS (pase permanente) · v4.9
- **250 niveles** con fila **libre** y **Premium**, que avanzan juntas con la XP. Sin temporadas, sin reinicios y sin vencimiento.
- **Curva:** el nivel 1→2 pide 150 XP y cada nivel pide 3 XP más que el anterior (≈130.000 XP en total).
- **Prestigio infinito:** después del 250, cada nivel pide 900 XP. Cada 10 niveles hay premio: 150 PIES (libre) y 250 PIES (Premium). Los niveles 300, 400, 500, 750 y 1000 dan títulos de prestigio. No hay que cargar contenido nuevo: es una regla del servidor.
- **Premium:** se compra una sola vez por **3000 PIES**. Si se compra tarde, entrega todo lo de los niveles ya alcanzados. Probado: nivel 100 sin Premium → compra → 100 premios Premium entregados, y reclamar de nuevo no duplica nada. El precio se puede cambiar en `seasons.premium_price`.
- **Contenido:**
  - 167 cosméticos nuevos (tarjetas, skins, marcos, títulos, emotes), generados con paletas y patrones que el juego ya dibuja.
  - Los 21 objetos de la Temporada 1.
  - Hitos especiales en los niveles 50, 100, 150, 200 y 250.
  - En total: 50 objetos + 8.500 PIES en la fila libre, y 133 objetos + 13.030 PIES en la Premium.
- **Bono de regreso:** si pasan 48 h sin jugar, los próximos 300 XP de pase cuentan doble. Premia volver y nunca castiga descansar.
- **Arranque:** cada cuenta arrancó con toda su XP histórica. El Premium de la Temporada 1 se conserva. La Temporada 1 quedó archivada, sin borrar nada.
- **Interfaz:** tramos de 25 niveles, próximas recompensas, hitos marcados y vista de prestigio.
- **Balance** (`node scripts/sim-pass.mjs`):

| Perfil | Ritmo | Nivel 50 | Nivel 100 | Nivel 250 |
|---|---|---|---|---|
| Casual | 3 días/sem, 10 minijuegos/día | ~8 semanas | ~21 semanas | ~93 semanas |
| Frecuente | 5 días/sem, 20 minijuegos/día | ~4 semanas | ~10 semanas | ~44 semanas |
| Muy activo | 7 días/sem, 40 minijuegos/día | ~2 semanas | ~4 semanas | ~17 semanas |

### Competitivo local con ELO global + antifraude · v4.10
- **Casual o competitiva** cuando J1 y J2 tienen cuenta (Duel Mode, Tournament, Quick Play).
- **Confirmación de los dos:** la competitiva la tienen que confirmar los dos, cada uno con su tecla (o su botón). Si cualquiera elige casual, se juega casual. El servidor registra la sesión **antes** de jugar. No se puede pasar a competitiva una competición ya empezada (`ranked_too_late`).
- **Un solo ELO:** un solo cálculo (`dc.elo_calc`), que ahora usa también el online, y un solo `accounts.rating` para el ranking mundial. No existe ELO local ni rankings paralelos. Probado: misma variación que el online (+12/−12) y queda en el historial de rating.
- **Antifraude:**
  - **Señales** (cada una suma puntos de riesgo):
    - mucho volumen entre la misma pareja;
    - perdedor con cuenta nueva o recién creada;
    - derrota sin sumar ni un punto (en esa partida y en varias seguidas);
    - flujo de ELO de un solo lado;
    - perdedor que juega casi solo contra esa cuenta;
    - varias cuentas nuevas que le dan ELO a la misma.
  - **Lo que nunca se usa:** la IP, ni compartir compu como prueba.
  - **Decisión:** según el puntaje, el ELO se acredita, se **retiene para revisión** (los jugadores pueden seguir jugando casual) o queda **limitado por volumen**, que no es un castigo.
  - **Liberación:** las retenciones de riesgo medio se liberan solas a las 72 h si no hubo más señales. Las de riesgo alto las decide un admin.
  - **Ajustes y registro:** todos los parámetros están en `fraud_config` y se cambian desde el backend. Todo queda registrado en `fraud_signals` y `elo_holds`.
  - **Probado:**
    - una pareja legítima (cuentas viejas, misma compu, resultados parejos) tuvo 0 retenciones;
    - una cuenta recién creada que se deja ganar tuvo 8 de 8 partidas retenidas;
    - la liberación automática funciona;
    - el tope por volumen se ajusta desde el backend;
    - las funciones de admin están protegidas.

### Singleplayer · v4.11
- **DAILY CHAOS:** un minijuego, un modificador CAOS fijo y metas de 3 estrellas por día. Igual para todos, con la misma semilla del minijuego.
- **WEEKLY CHALLENGE:** minijuego, dificultad, modificador y semilla por semana, con ranking mundial. Al terminar la semana, premio en PIES según el puesto (top 1, 3, 10 y 25 %), que se entrega solo la próxima vez que el jugador entra.
- **ENDLESS CLUB:** maratón infinita con metas crecientes (con tope para que siga siendo posible), CAOS desde la etapa 5, 3 vidas, multiplicador y ranking.
- **GHOST RUN:** grabación compacta y versionada (pose y puntaje cada 0,1 s, ~18 KB por intento), guardada en el servidor (mejor, último y mejor anterior).
  - En Tower Climb y Micro Race el fantasma se ve moverse.
  - En Hoop, Target, Beat, Fish y Blocks se compara el puntaje en vivo.
  - Reaction Rush, Color Control, Shadow Sneak y Blast Zone quedan fuera por ahora: ahí el fantasma no se puede reproducir con fidelidad.
- **Selección automática:** los desafíos los elige el servidor con la fecha y una semilla propia. No hacen falta procesos programados ni tareas manuales.
- **Validación:** período y minijuego correctos, rango posible del minijuego, duración mínima, frecuencia, y revisión automática si un resultado supera con holgura el récord mundial.
- **Recompensas:** XP y PIES con topes diarios. **Nunca ELO.**
- Los modos anteriores (Desafíos solo, VS BOT, Escalera, Práctica) siguen igual.

### 2v2 local · v4.12
- **Equipos:** azul (J1 + J3) contra rojo (J2 + J4). Cada lugar puede ser una persona o un bot, con su dificultad.
- **Controles:** cuatro jugadores en un teclado (J3 con IJKL + U/O, J4 con el teclado numérico) y **joysticks** con la Gamepad API (pulsar A para sumarse).
- **Minijuegos compatibles:**
  - **Pong Chaos** en dobles: uno en el arco y otro adelante; el bot de adelante deja la pelota a su compañero.
  - **Color Control** por equipos: se pinta para el equipo, el escudo protege a los dos, congelar frena a los dos rivales y los bots se reparten el tablero.
- **Identificación:** nombres, J1–J4 sobre cada jugador y colores de equipo.
- **Recompensas:** casual; XP y PIES para las cuentas humanas de J1/J2. Nunca ELO.
- **Probado:** 4 lugares, inicio cuando las personas están listas, J3 controla con su teclado, resultados por equipo. El online (determinismo con red mala) sigue OK en los juegos tocados.

### Rediseño cómic · v4.13
- **Dentro de los minijuegos:**
  - marcadores en paneles de historieta y el reloj como estallido;
  - cuenta regresiva y carteles (¡GOL!, etc.) con globos de impacto;
  - fondos teñidos con el color de cada minijuego, con tramado y líneas de acción;
  - el panel común de todos los marcadores pasó a estilo cómic;
  - sin brillos neón.
- **Pantallas:** presentación, pausa y resultados rediseñadas.
- **Arreglos:** VS BOT (y las demás tarjetas) ya no dejan asomar color fuera del borde; el logo ya no se encima con la tarjeta del jugador; el menú lateral encastra (cada borde compartido tiene la misma inclinación) con ángulos más marcados.

### Logo e imágenes · v5.0
- **Logo nuevo** (estallido + letras con tinta + rayo), en `public/brand/`:
  - versiones SVG y PNG para fondo oscuro y claro, y una transparente;
  - favicon (SVG y 32 px) e íconos de 192 y 512 px.
- Ya se usa en la portada y en la pestaña.
- **Guía de Gemini** actualizada al estilo cómic (`docs/IMAGENES-GEMINI.md`): tamaños, formatos, nombres, carpetas, prompts para personajes, accesorios y portadas de los 16 juegos.
- **Imágenes listas para cargar:** hay un manifiesto (`public/assets/manifest.json`). Las portadas que agregues se usan solas y, si una falta, sigue el dibujo por código.

### Idiomas
- Todo lo nuevo está en español e inglés. Los objetos generados traen su nombre en inglés.

---

## IMPLEMENTADO PERO NO PROBADO EN PRODUCCIÓN CON PERSONAS REALES
- **Joysticks físicos:** la lógica de la Gamepad API se probó en código, pero no con controles reales.
- **Antifraude con datos reales:** los parámetros pueden necesitar ajustes cuando haya más jugadores (se ajustan en `fraud_config`, sin tocar el juego).

## PENDIENTE (con el porqué)
1. **2v2 online:** el netcode actual (rollback) es de 2 computadoras; para 4 hay que rehacer la sincronización y las salas. También queda pendiente el ELO 2v2 independiente: no se implementa hasta poder validarlo, como pide el prompt.
2. **Más minijuegos 2v2** (Micro Race, Target Panic, Blast Zone, Turbo Tennis): cada uno necesita su adaptación.
3. **Story Mode y Puzzle Club:** necesitan contenido escrito por capítulo y estados armados a mano dentro de cada minijuego. Se pospusieron para hacerlos bien y no meter modos mediocres.
4. **Rediseño de personajes, accesorios y portadas:** la arquitectura y la guía están listas. Lo ideal es hacerlo con las imágenes de Gemini, porque rehacer 15 personajes a mano en código es mucho trabajo y queda por debajo de una ilustración.
5. **Escenarios propios por minijuego:** hoy tienen color, tramado y líneas de acción, pero los objetos de cada juego (paletas, autos, plataformas) mantienen su dibujo. Falta redibujarlos uno por uno.
6. **CAOS:** falta un ícono y una animación de entrada propios para cada evento; hoy tiene cartel e indicador de duración.
7. **Niveles 221–249 del Premium:** dan PIES. Quedan reservados para personajes nuevos cuando estén.

## REQUIERE TU INTERVENCIÓN
- **Login con Google y email:** en Supabase → Authentication → URL Configuration, poné `https://duelclub.vercel.app` como Site URL y en Redirect URLs. Después, en Providers → Google, pegá el Client ID y el Client Secret de Google Cloud (OAuth, con `https://<tu-proyecto>.supabase.co/auth/v1/callback` como redirect autorizado).
- **Imágenes de Gemini:** seguí `docs/IMAGENES-GEMINI.md` y agregalas al manifiesto.
- **Nombre del juego:** decidir si se cambia (ver abajo). No se cambió nada.

## COSTOS Y DEPENDENCIAS
- Sin servicios externos nuevos ni costos nuevos: todo corre en Supabase y Vercel, como antes.
- No hay procesos programados: los desafíos y los premios semanales se calculan cuando alguien los pide.

## MIGRACIONES DE SUPABASE (aplicadas en producción, ninguna borra datos)
- `016_club_pass` + `017_club_pass_data`
- `018_local_ranked_antifraud`
- `019_singleplayer` (generada por `scripts/gen-sp.mjs`)

## PRUEBAS
- **Pruebas en vivo (GitHub Actions):** 27/27 y 16/16 en cada versión (4.9, 4.10, 4.11, 4.12, 4.13).
- **Pruebas locales:**
  - CLUB PASS 12/12;
  - competitivo y antifraude 17/17;
  - singleplayer 19/19;
  - 2v2 8/8 (Pong y Color);
  - flujo online 17/17;
  - determinismo online en los juegos tocados;
  - los 16 minijuegos seguidos sin errores;
  - VS BOT y Práctica OK.

---

## NOMBRES ALTERNATIVOS (no se cambió nada)

| Nombre | Qué transmite | Por qué funciona | Internacional |
|---|---|---|---|
| **DUEL CLUB** (actual) | Competencia entre amigos, pertenencia | Corto, claro, ya tiene comunidad y link | Sí |
| **KAPOW CLUB** | Impacto de historieta, golpe | Encaja perfecto con el estilo cómic; onomatopeya memorable | Sí |
| **PANEL BRAWL** | Pelea dentro de viñetas | Une el cómic (panel) con el duelo | Sí (en inglés) |
| **¡ZAS! ARCADE** | Velocidad, golpe rápido | Muy rioplatense, divertido | Medio (el "¡ZAS!" se entiende por el contexto) |
| **INK & DUEL** | Tinta + duelo | Elegante, describe la identidad visual | Sí |
| **CHAOS COMICS** | Caos + historieta | Refleja los eventos CAOS | Sí |

**Recomendación:** mantener **DUEL CLUB**. Ya tiene usuarios y link, y funciona en los dos idiomas. Con el logo nuevo de estallido, el nombre y la identidad cómic quedan unidos. Si se quisiera un cambio, **KAPOW CLUB** es el que mejor encaja con la estética.

# DUEL CLUB 4.0 · Informe de la gran actualización

Rama: `gran-actualizacion`. La parte 1 ya está publicada en https://duelclub.vercel.app; la parte 2 espera que se aplique la base (ver "Cómo publicar").

## 1. Bugs encontrados
- Local: la partida se cortaba al 2.º minijuego (Turbo Tennis dibujaba una sombra con radio negativo y rompía el dibujo).
- Turbo Tennis: el saque podía quedar picando para siempre.
- Online: cartel final de derrota repetido en cada consulta; rondas repetidas/salteadas al reconectar; falsos "desconectado"; lag con mala conexión; diferencias de matemática entre navegadores que desincronizaban.
- Color Control: el choque entre jugadores podía meter a uno adentro de un muro (encerrado para siempre). Lo encontraron los bots.
- Quick Play: pasar el mouse elegía el minijuego; tarjetas tapadas en 1280×720.
- Portada: dos líneas negras (borde de foco de la pantalla).
- Resultados: aparecía el texto "nullnullnull" debajo de las recompensas.
- Accesorios: sombrero flotando en Volt; bufanda tapando la boca de Ozzy, Fang, Tostadín y Tun-Tun.
- ELO: las partidas locales entre dos cuentas (que pueden ser de la misma persona) movían el ELO.

## 2. Bugs arreglados
Todos los de arriba, cada uno con prueba automática o captura (ver punto 9).

## 3. Funciones nuevas
- UN JUGADOR: VS BOT (Fácil/Normal/Difícil/Experto, los 16 minijuegos), ESCALERA (singleplayer: 16 etapas, 3 vidas, récord e historial) y PRÁCTICA (sin recompensas).
- Bots para los 16 minijuegos: usan las mismas teclas y reglas que una persona; la dificultad cambia reacción, puntería y errores.
- Pase de Batalla (Temporada 1, 40 niveles, libre + Premium con PIES), desafíos diarios y semanales, archivo de temporadas.
- Contador real de jugadores en línea, cambio de nombre visible (1 vez cada 7 días), filtro de nombres ofensivos, nombres únicos.
- PIE STORE: destacados del día; 21 objetos del pase; set exclusivo del creador (benuchinb2).
- Controles de cada jugador en pantalla al empezar; Tower Climb, Memory War y Target Panic rebalanceados.
- Novedades 4.0 en el cartel.

## 4. Cambios en la base de datos
- `accounts.keke` → `accounts.xp` (renombrada, sin duplicar) y 11 funciones reescritas; el ranking acepta `keke` y `xp`.
- Tablas nuevas: `seasons`, `pass_rewards`, `pass_progress`, `challenge_defs`, `challenge_progress`, `presence`. Columnas: `accounts.bot_stats`, `accounts.name_changed_at`.
- Funciones nuevas: `dc_pass`, `dc_pass_buy`, `dc_pass_claim`, `dc_challenges`, `dc_challenge_claim`, `dc_presence`, `dc_rename`.
- ELO solo en `online_matches.kind = 'ranked'`. Partidas `mode = 'bot'`: XP/PIES reducidos, sin ELO, sin récords ni estadísticas competitivas.
- Todo con RLS y funciones `SECURITY DEFINER`; el navegador no puede tocar monedas ni rating.

## 5. Migración
`supabase/APLICAR_EN_SUPABASE.sql` (008 + 009 + 010 + 011 + datos del pase). Se puede correr más de una vez. Probada dos veces seguidas sobre una copia local sin errores. No borra datos.

## 6. Pase de Batalla
40 niveles, 500 XP de pase por nivel (toda la XP de la temporada cuenta). Fila libre: PIES y 8 objetos. Fila Premium: 1.500 PIES una vez por temporada; 13 objetos y PIES. Comprar el Premium tarde da todas las recompensas Premium ya alcanzadas. Cada recompensa se reclama una sola vez (si ya tenías el objeto, recibís 100 PIES).

## 7. Economía
Minijuego con cuenta: 10–25 XP y 5–15 PIES (mitad desde la partida 41 del día, nada desde la 81). Contra bots: 40 % (Fácil) a 100 % (Experto) de eso, con PIES más bajos. Desafíos: 60–120 XP diarios y 300–450 XP semanales.

## 8. Evaluación 2D / 3D
Se queda en 2D: el lockstep online depende de una simulación determinista, que en 3D sería mucho más frágil; los 16 minijuegos están pensados en 2D; y en 2D carga rápido y anda en compus modestas.

## 9. Pruebas hechas
- Bot contra bot en los 16 minijuegos (Experto vs Fácil y Difícil vs Normal): todos terminan, sin errores de JavaScript; el más difícil gana casi siempre.
- VS BOT y Práctica de punta a punta con cuenta: 5/5.
- Pase: reclamar, Premium, retroactivo y doble reclamo: OK (SQL + interfaz).
- Nombres y presencia: 6/7 (el contador tarda hasta 30 s en actualizarse, es lo esperado).
- Online local: flujo 17/17, reconexión 11/11. Duelo local de 16 minijuegos: OK.
- Prueba completa del sitio contra el servidor local: 13 de 15. Las 2 que fallan solo pueden correr contra producción (link viejo y escritura directa a la base).

## 10. Pruebas que pasaron en producción
Parte 1 publicada: 27/27 del sitio y 15/15 del online.

## 11. Pendiente
- Aplicar `APLICAR_EN_SUPABASE.sql` en Supabase y después publicar la rama.
- Login con Google y con email: necesita configuración externa (abajo). Recuperación con PIN: se mantiene.
- Probar online entre dos compus reales con navegadores distintos (solo se probó simulado).

## 12. Dependencias externas
- Supabase (base y Realtime) y Vercel (publicación automática desde `main`).
- Google: crear credenciales OAuth en Google Cloud y activar el proveedor en Supabase Auth.
- Email: configurar SMTP en Supabase para los mails de acceso.

## 13. Cómo correrlo en local
`npm install` y `npm run dev`. Pruebas: `tests/e2e/*.mjs` con `SITE_URL`.

## 14. Cómo publicar
1. Supabase → SQL Editor → pegar `supabase/APLICAR_EN_SUPABASE.sql` → Run.
2. Unir `gran-actualizacion` a `main`. Vercel publica solo, y las pruebas en vivo corren en GitHub Actions.

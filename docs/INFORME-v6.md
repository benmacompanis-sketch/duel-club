# DUEL CLUB 6.0: informe de la actualización general

Todo se probó en un servidor local idéntico al real (mismas migraciones) con navegadores automatizados. Las cifras
son mediciones reales de esas pruebas; ninguna está inventada.

---

## 1. TERMINADO Y PROBADO

### Rendimiento (prioridad de la actualización)
**Problemas encontrados** (perfilador de CPU, procesador 4 veces más lento, como un celular común):
- El fondo de página de historieta de los menús se volvía a pintar a pantalla completa 60 veces por segundo aunque nunca cambia.
- La capa de efectos se borraba en cada cuadro aunque estuviera vacía.
- Cada personaje animado de los menús se redibujaba con 6 pasadas de contorno 60 veces por segundo.
- Al abrir la tienda se dibujaban todas las vistas previas en el mismo cuadro (1 segundo trabado).
- Las transiciones de pantalla duraban 0,26 s y aplicaban un desenfoque a pantalla completa.
- Dentro de los minijuegos, el fondo del escenario y la textura de puntos se recalculaban píxel por píxel en cada cuadro.

**Arreglos aplicados:**
- El fondo y la capa de efectos se repintan solo cuando cambian.
- Los personajes de los menús se animan a 20 cuadros por segundo.
- **Modo liviano automático:** si el aparato no llega a ~33 fps, se animan a 10 fps y solo los primeros 4 visibles.
- Las vistas previas se dibujan de a 3 por cuadro, así la pantalla aparece al instante.
- Las transiciones bajaron a 0,14 s y ya no tienen desenfoque. Los modales bajaron a 0,12 s.
- Las capas quietas de los minijuegos (fondo del escenario, textura de puntos, gimnasio de Hoop Master) se arman una vez a la resolución real de la pantalla y después solo se copian.

**Mediciones** (procesador 4× más lento, compilación de producción):

Navegación:

| Medida | Antes | Después |
|---|---|---|
| Promedio para abrir una sección | 190 ms | 94 ms |
| Abrir la PIE STORE | 1037 ms | 184–222 ms |

Menús quietos:

| Sección | Antes | Después |
|---|---|---|
| Inicio | 17 fps | 37–45 fps |
| Ranking | 17 fps | 45 fps |
| Pase | 22 fps | 50 fps |
| Inventario | 27 fps | 59 fps |

Dentro de los minijuegos:

| Minijuego | Antes | Después |
|---|---|---|
| Pong | 18 fps | 30–32 fps |
| Duel Arena | 20,5 fps | 27,7 fps |
| Color Control | 15,8 fps | 23,6 fps |
| Tower | 21 fps | 25 fps |
| Hoop | 18,9 fps | 20,8 fps |

Fish y Block Battle quedan cerca de 18–22 fps en esa simulación. Sus fondos son propios y el próximo paso es armarlos igual.

Estas pruebas usan un navegador sin placa de video (todo por software). En un celular real el dibujo lo hace la placa de video y debería ir mejor, pero **no lo medí en un celular real**.

### Economía (PIES)
- **Precios nuevos por rareza:**

  | Rareza | Antes | Ahora |
  |---|---|---|
  | Común | 100 | 200 |
  | Poco común | 250 | 500 |
  | Raro | 500 | 1.200 |
  | Épico | 1.000 | 3.000 |
  | Legendario | 2.200 | 7.000 |
  | Mítico | 5.000 | 15.000 |

  Pase Premium: de 3.000 a 6.000.
- Base de la decisión: lo que ganan los jugadores reales. Un jugador activo gana una mediana de **739 PIES por día**, medido en el servidor de los últimos 30 días, y gran parte viene de premios de una sola vez.
- Nadie pierde nada de lo que ya tiene: solo cambia el precio de lo que se vende.

### Cofres
- **Tipos y probabilidades:** bronce, plata, oro y mítico, con la tabla pedida (cada columna suma 100). Las probabilidades se ven en la pantalla.
- **Quién decide el premio:** el SERVIDOR elige el premio. Se comprobó abriendo 16.000 cofres: bronce dio 64,4 / 25,9 / 7,9 / 1,9 % contra 65 / 25 / 8 / 2.
- **Cómo se consiguen (todo jugando):**
  - Cada desafío diario reclamado: +1 fragmento.
  - Cada desafío semanal reclamado: cofre de plata.
  - Los 3 semanales de una semana: cofre de oro extra.
  - Cada 5 niveles: cofre de plata.
  - Cada 25 niveles: cofre de oro.
  - Niveles 50, 100, 150…: cofre mítico.
  - Cada 10 logros: cofre de plata.
  - Daily Chaos con 3 estrellas: +2 fragmentos.
  - Terminar toda la Historia: cofre mítico.
  - Fragmentos: bronce 6, plata 15, oro 40.
  - Bronce, plata y oro también se pueden comprar con PIES. El mítico, no.
- **Reglas de entrega:** cada fuente da su premio una sola vez. Lo logrado antes de esta versión no cuenta, así nadie recibe decenas de cofres de golpe; todos reciben 1 cofre de plata de bienvenida.
- **Premios:**
  - 48 objetos **exclusivos de cofres**, que no se venden: tarjetas y marcos holográficos, skins, títulos y emotes.
  - También los objetos de la tienda de esa rareza.
  - Un 15 % de las veces sale una bolsa de PIES.
- **Repetidos:** no se pierden. Se convierten en PIES y fragmentos según la rareza: de 25 PIES + 1 fragmento a 2.000 PIES + 30 fragmentos.
- **Apertura:** el cofre tiembla y se abre con un estallido del color de la rareza. Se salta tocando la pantalla: el premio aparece en ~0,3 s. Tiene botón ABRIR OTRO y un historial de premios.
- **Pase Premium como premio:** 0,5 % en cofres de oro y 2 % en míticos, aparte de la tabla. Si ya lo tenés, recibís 2.500 PIES + 25 fragmentos. Lo dice la pantalla de cofres y la del pase.
- **Pruebas:** 11/11 en pantalla (bienvenida, abrir, saltar, comprar, armar con fragmentos, el mítico no se vende, abrir sin tener → error) y fuentes automáticas comprobadas en el servidor sin duplicados.

### Top 10 de minijuegos
Está en Ranking → «Más jugados». Usa partidas reales de la tabla de partidas y, si no hay ninguna, muestra un estado vacío. En MINIJUEGOS, los 3 más jugados llevan la etiqueta «#N MÁS JUGADO».

### Chat privado entre amigos
- **Reglas:** solo entre dos amigos aceptados, sin grupos. Mensajes de 1 a 300 caracteres.
- **Filtro:** los insultos se tapan con asteriscos en el servidor.
- **Contra spam:** como máximo 5 mensajes cada 10 s y 60 por hora.
- **Interfaz:**
  - Se abre desde CHAT en la lista de amigos.
  - Hay contador de no leídos en el botón y en «Amigos» del menú.
  - La conversación se actualiza cada 3 s y muestra «visto».
- **Moderación:**
  - Bloquear: no te escribe y no ves sus mensajes de partida.
  - Silenciar: no ves sus mensajes de partida.
  - Reportar: el servidor guarda el texto REAL del mensaje, no el que mande el navegador.
- **Pruebas:** 13/13 con dos cuentas en dos navegadores, incluido que un mensaje con código HTML se muestra como texto.

### Chat durante las partidas (1v1 online y 2v2)
- Es una ventanita flotante que se minimiza; se abre con el botón o con la tecla T.
- Cada mensaje dice qué jugador lo escribió. Si en una compu hay varios jugadores, se elige quién escribe.
- **Filtro de palabras:** se aplica al mandar y al recibir.
- **Límite:** 5 mensajes cada 10 s, controlado también del lado que recibe.
- **Moderación:** silenciar y reportar. El reporte se guarda con el código de la sala.
- **Pruebas:** llegó de una compu a otra con el insulto tapado. Las pruebas del 1v1 online siguen bien (17/17 y 11/11).

### 2v2 flexible (online, local e híbrido)
- **Cómo se entra:** 2v2 → AMISTOSO o COMPETITIVO → En esta compu / Sala privada online / Entrar con código / Buscar partida.
- **La sala:**
  - 4 lugares, en equipo azul (1 y 3) y rojo (2 y 4).
  - Cada lugar muestra su cuenta, su ELO 2v2 y desde qué compu juega. Para cada compu se ve el ping y si la conexión es directa o por el servidor.
- **Dispositivo ≠ jugador:** una compu puede tener de 0 a 4 jugadores. Cada jugador entra con SU cuenta y su propia sesión (hasta 4 sesiones en una compu). Cerrar una sesión no toca las demás, y una cuenta no puede ocupar dos lugares.
- **Bots:** fácil, normal, difícil o experto, en cualquier lugar, solo en amistoso. Los maneja la compu anfitriona y manda sus teclas a las demás; así todas ven exactamente lo mismo.
- **Red:**
  - Cada par de compus tiene su propia conexión: WebRTC directo, o el servidor como respaldo.
  - Se usa el mismo rollback del 1v1, generalizado a 2, 3 o 4 compus.
  - Cada segundo se comparan las huellas del estado.
- **Determinismo comprobado en 5 repartos**, cada uno en Pong y Color Control:
  - 4 compus.
  - 2 compus con 2 jugadores cada una.
  - 3 compus + 1 bot.
  - 1 contra 1 + 2 bots.
  - Híbrido de 3 locales + 1 bot.

  Las huellas fueron idénticas, también con red mala simulada (80 ms, altibajos, 3 % de pérdida). A velocidad real, con esa red mala, la partida se trabó en total 83–167 ms en 15 s.
- **AMISTOSO:** nunca cambia el ELO y permite bots e invitados.
- **COMPETITIVO:**
  - Exige 4 cuentas humanas distintas. Con un bot o un invitado, el botón EMPEZAR queda deshabilitado y explica por qué.
  - Antes de empezar se confirma: «Esta partida modificará tu ELO 2v2» / «Esta partida no modifica tu ELO».
- **ELO 2v2:**
  - Va en una tabla aparte, `rating2`, con su propio ranking (Ranking → ELO 2v2) y su propio historial. El 1v1 no se toca.
  - Cálculo: equipo = promedio de sus dos jugadores. Cada humano cambia según su propio K: 40 en sus primeras 10 partidas, después 28.
  - Comprobado: +20/−20 y la suma da 0.
  - Antifraude:
    - Las cuentas creadas hace menos de 24 h no mueven ELO.
    - El mismo grupo de 4 tiene como máximo 5 partidas con ELO por día.
    - Si las compus informan resultados distintos, no cuenta.
- **Resultado:** lo informa cada compu y se resuelve cuando coinciden todas (o la mayoría, pasados 40 s).
- **Desconexiones:**
  - Una compu que deja de responder 25 s, o que sale, corta la ronda.
  - En COMPETITIVO, si sus jugadores eran todos de un equipo, ese equipo pierde. Si tenía jugadores de los dos equipos, la ronda no cuenta.
  - Una desincronización anula la ronda, sin cambios de ELO.
  - La compu que se fue sale de la sala. Si se va la anfitriona, la sala se cierra.
- **Búsqueda de partida:**
  - Arma dúo contra dúo, dúo contra dos solos, o cuatro solos.
  - El rango de ELO arranca en ±150 y se abre 10 por segundo, hasta ±800.
  - Cada compu confirma en 25 s; si alguien no confirma, se cancela y cada uno vuelve a su sala.
  - No hay jugadores inventados: sin rivales reales, no hay partida.
- **Pruebas:**
  - 18/18 con 3 navegadores separados (cuentas de las dos compus en los dos equipos, bot, chat, amistoso, competitivo y desconexión).
  - 7/7 con 4 cuentas en una sola compu: partida local, cada una con su ELO, y cerrar una sesión no cierra las otras.
  - Búsqueda: dos dúos se encuentran, confirman, juegan y se actualiza el ELO 2v2.
- **Minijuegos con 2v2 (6):**
  - Pong: dobles, uno defiende y el otro juega adelante.
  - Color Control.
  - Target Panic: cada uno con su mira, puntos sumados por equipo.
  - Turbo Tennis: dobles, cada uno cubre su mitad de la cancha.
  - Blast Zone: el equipo pierde cuando caen sus dos jugadores.
  - Micro Race: 4 autos; los puestos dan 4-3-2-1 puntos y gana el equipo que suma más.

  Determinismo comprobado en los 6 juegos con los 5 repartos, también con red mala. Las versiones 1v1 de esos juegos siguen dando huellas idénticas.
- **Insignias:** categoría nueva con 16 insignias (8 en la PIE STORE y 8 exclusivas de cofres). Se equipan y se ven al lado del nombre en el ranking, el perfil y la tarjeta. Pruebas: 9/9.
- **Panel del creador → REPORTES DE CHAT:** muestra cada reporte (mensaje, quién lo mandó, quién reportó y dónde) y permite marcarlo revisado o descartado. Solo lo ve la cuenta admin.
- **Fish Frenzy y Block Battle:** el fondo y la grilla se arman una sola vez. Fish subió de ~13 a ~17 cuadros por segundo en la misma máquina. En Block Battle no hubo diferencia medible, porque lo que más cuesta son los personajes.

### Visual
- **MINIJUEGOS como página de historieta:**
  - Cada juego es una viñeta con borde de tinta, ángulo propio, su color, su dibujo y un fondo distinto (puntos, líneas de acción, rayas o cuadrícula).
  - El nombre va en un cartel amarillo y la categoría y el dominio en etiquetas.
  - «NUEVO» va en una estrella y los más jugados llevan etiqueta.
  - Las calles blancas sobre papel arman la página.
- **Personajes:** tenían una sombra de puntos que los cortaba en línea recta por la mitad, como si cada uno tuviera dos estilos. Ahora la sombra sigue la forma de cada personaje por la derecha y abajo, como en las historietas. Se revisaron los 15 juntos y medí que no cuesta rendimiento.
- **Legibilidad:**
  - «PRÓXIMAS RECOMPENSAS» del pase va en un cartel sólido y no se tapa.
  - Los subtítulos de secciones nuevas van sobre fondo oscuro.
  - El texto junto a JUGAR en MINIJUEGOS va en un recuadro claro.
- **Pantallas nuevas en estilo historieta:** cofres, apertura, chat privado, chat de partida, 2v2, sala y Top 10.

### Idiomas
Todo lo nuevo está en español y en inglés. La versión en inglés carga sin errores.

---

## 2. IMPLEMENTADO PERO NO PROBADO COMPLETAMENTE
- **2v2 entre computadoras de casas distintas por internet real.** Las pruebas usaron navegadores separados en la misma máquina, con conexión directa WebRTC, y una red mala simulada. Entre casas distintas puede hacer falta el respaldo por el servidor (Supabase Realtime), que funciona en el 1v1 pero no se probó en el 2v2.
- **Joysticks reales para 3 o 4 jugadores locales:** el código existe; no se probó con mandos físicos.
- **Fluidez en un celular real:** medida solo en simulación.

## 3. PENDIENTE
- **Parte B de la migración 023 (salas 2v2 online) en el servidor real.**
  - La parte A ya está instalada: tablas, ranking e historial 2v2, informe y confirmación de resultados.
  - La parte B (crear, unirse, lugares, empezar, salir, buscar partida) necesita una aprobación de Supabase que no llega al celular.
  - Mientras tanto, el 2v2 online muestra «2v2 online: casi listo» y abre el 2v2 en una compu, que funciona completo. No se rompe nada.
- **Snake:** no se hizo, a pedido.

## 4. REQUIERE INFRAESTRUCTURA O TU INTERVENCIÓN
- **Instalar la parte B**, de una de estas dos formas:
  - Abrir `supabase/manual/023b_salas_2v2.sql` en GitHub, copiarlo entero y pegarlo en Supabase → SQL Editor → Run. Se puede correr más de una vez sin problema.
  - O pedírmelo desde claude.ai en una computadora, donde la aprobación sí aparece.
- **Publicación:** el juego ya es público en https://duelclub.vercel.app (Vercel + Supabase). No depende de Claude.
  - Las partidas y el chat usan conexión directa entre navegadores. Si una red la bloquea, se usa Supabase Realtime.
  - Con mucha gente a la vez, conviene revisar el plan de Supabase: la consulta de estado de sala es ~1 por segundo por compu en partida.

## 5. DATOS
- **Ninguna migración borra datos.** Solo agregan tablas y funciones; los `delete` de los archivos están dentro de funciones (por ejemplo, desbloquear a alguien), no se ejecutan al instalar.
- La 021 actualiza el precio de los objetos a la venta y del Pase Premium.
- Las contraseñas siguen guardadas con hash y las sesiones con hash SHA-256 del token.

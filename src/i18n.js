// Idiomas: español (original) e inglés.
// El juego está escrito en español; en inglés se traduce en vivo:
//  · los textos de la interfaz (DOM) con un MutationObserver,
//  · los textos dibujados en el canvas (fillText / strokeText / measureText),
//  · con un diccionario exacto + reglas para textos armados con variables.
// Lo que no está en el diccionario queda en español (nunca rompe nada).

import { DATA_EN, DATA_RULES } from './i18n-data.js';
import { ALL_ITEMS } from './data/catalog.js';
import { STORY_EN } from './data/story.js';
import { PUZZLE_EN } from './data/puzzles.js';
import { CHEST_EN } from './data/chests.js';
// textos de 2v2, SALAS, CHATS y TOP 10
const V2_UI_EN = {
  'partida': 'match', 'partidas': 'matches', 'victoria': 'win', 'victorias': 'wins',
  Insignias: 'Badges', 'Se muestra al lado de tu nombre.': 'Shown next to your name.', 'REPORTES DE CHAT': 'CHAT REPORTS', 'CHAT PRIVADO': 'PRIVATE CHAT', 'CHAT DE PARTIDA': 'MATCH CHAT',
  'Sin revisar': 'Unreviewed', Revisados: 'Reviewed', Descartados: 'Dismissed', Todos: 'All', REVISADO: 'REVIEWED', DESCARTAR: 'DISMISS', 'VER PERFIL': 'VIEW PROFILE',
  'No hay reportes de chat en esta lista.': 'There are no chat reports in this list.', 'Cargando reportes del chat…': 'Loading chat reports…',
  '2v2 online: casi listo': 'Online 2v2: almost ready', 'Las salas online se están activando en el servidor. Mientras tanto podés jugar 2v2 en esta compu.': 'Online rooms are being enabled on the server. Meanwhile you can play 2v2 on this computer.',
  AZUL: 'BLUE', ROJO: 'RED', 'Puntos por puesto (4-3-2-1)': 'Points by position (4-3-2-1)', Llegadas: 'Finishes',
  'Cada uno con su mira y su cargador; los blancos y los puntos son del equipo. Ojo: no le disparen al mismo blanco que su compañero.': 'Each player has their own crosshair and ammo; targets and points belong to the team. Careful: don’t shoot the same target as your teammate.',
  'Dobles: uno arranca en el fondo y el otro en la red. No importa quién de los dos le pegue, pero el equipo no puede pegarle dos veces seguidas.': 'Doubles: one starts at the back and the other at the net. Either can hit, but the team can’t hit twice in a row.',
  'Sobreviven juntos: el equipo pierde cuando los dos se quedan sin escudos. El empujón va al rival más cercano.': 'Survive together: the team loses when both run out of shields. The shove hits the nearest rival.',
  'Carrera de 4 autos: 1º suma 4 puntos, 2º 3, 3º 2 y 4º 1. Gana el equipo que sume más (si empatan, el del ganador).': '4-car race: 1st gets 4 points, 2nd 3, 3rd 2 and 4th 1. The team with more points wins (on a tie, the winner’s team).',
  '2v2': '2v2', 'Amistoso o competitivo · en una compu, en varias o mezclado': 'Friendly or competitive · on one computer, several, or mixed',
  '1 · MODALIDAD': '1 · MODE', '2 · DÓNDE JUEGAN': '2 · WHERE YOU PLAY', AMISTOSO: 'FRIENDLY', COMPETITIVO: 'COMPETITIVE',
  'Esta partida no modifica tu ELO.': 'This match does not change your ELO.', 'Esta partida modificará tu ELO 2v2.': 'This match will change your 2v2 ELO.',
  'Para jugar con amigos y probar minijuegos. Se puede con bots e invitados.': 'To play with friends and try minigames. Bots and guests allowed.',
  'Cuatro personas con su cuenta, sin bots. Cambia el ELO 2v2 (separado del 1v1) y suma al ranking 2v2.': 'Four people with their own accounts, no bots. Changes your 2v2 ELO (separate from 1v1) and counts for the 2v2 ranking.',
  'EN ESTA COMPU': 'ON THIS COMPUTER', 'Hasta 4 jugadores en el mismo teclado (o con joysticks), cada uno con su cuenta.': 'Up to 4 players on the same keyboard (or with gamepads), each with their own account.',
  'SALA PRIVADA ONLINE': 'PRIVATE ONLINE ROOM', 'Creá una sala y pasá el código. Se puede mezclar: jugadores en esta compu, en otras compus y bots.': 'Create a room and share the code. Mix freely: players on this computer, on other computers and bots.',
  'ENTRAR CON CÓDIGO': 'JOIN WITH CODE', ENTRAR: 'JOIN', 'CÓDIGO': 'CODE', 'BUSCAR PARTIDA': 'FIND A MATCH',
  'Te emparejamos con rivales de ELO 2v2 parecido. Podés buscar solo o con un compañero en esta compu.': 'We match you with rivals of similar 2v2 ELO. Search alone or with a teammate on this computer.',
  'Necesitás iniciar sesión con una cuenta (J1) para usar salas.': 'You need to log in with an account (P1) to use rooms.', 'Sin cuenta podés jugar igual en esta compu: ': 'Without an account you can still play on this computer: ',
  'abrir el 2v2 rápido sin cuentas': 'open quick 2v2 without accounts', 'Creando la sala…': 'Creating the room…',
  'SALA 2v2': '2v2 ROOM', 'Configurá los 4 lugares': 'Set up the 4 slots', 'Búsqueda de partida competitiva': 'Competitive matchmaking',
  'CÓDIGO DE LA SALA': 'ROOM CODE', COPIAR: 'COPY', 'Código copiado': 'Code copied', 'EQUIPO AZUL': 'BLUE TEAM', 'EQUIPO ROJO': 'RED TEAM', LIBRE: 'EMPTY',
  'JUGADOR DE ESTA COMPU': 'PLAYER ON THIS COMPUTER', 'El anfitrión puede poner un bot.': 'The host can add a bot.', 'Lo maneja la compu del anfitrión': 'Controlled by the host computer',
  'Quitar del lugar': 'Remove from slot', 'OTRA CUENTA': 'ANOTHER ACCOUNT', 'INICIAR SESIÓN Y ENTRAR': 'LOG IN AND JOIN', 'JUGAR COMO INVITADO (sin cuenta)': 'PLAY AS GUEST (no account)',
  'En COMPETITIVO no se permiten invitados.': 'Guests are not allowed in COMPETITIVE.',
  'Cada jugador entra con SU cuenta: así suma sus propias estadísticas, PIES y ELO. Las sesiones de las demás cuentas de esta compu no se tocan.': 'Each player joins with THEIR account: that way they earn their own stats, PIES and ELO. Other accounts logged in on this computer are not affected.',
  MINIJUEGO: 'MINIGAME', 'Lo elige el anfitrión.': 'The host picks it.', EMPEZAR: 'START', 'Esperando que el anfitrión empiece.': 'Waiting for the host to start.',
  'BUSCAR RIVALES': 'FIND RIVALS', 'CANCELAR BÚSQUEDA': 'CANCEL SEARCH', 'SALIR DE LA SALA': 'LEAVE ROOM', '¿Salir de la sala?': 'Leave the room?',
  'Sos el anfitrión: la sala se cierra para todos.': 'You are the host: the room closes for everyone.', 'Tus jugadores dejan sus lugares.': 'Your players leave their slots.',
  Salir: 'Leave', Quedarme: 'Stay', 'Esta compu': 'This computer', anfitrión: 'host', 'conexión directa': 'direct connection', 'por el servidor': 'via server', 'conectando…': 'connecting…',
  ECHAR: 'KICK', Echar: 'Kick', 'Salen todos sus jugadores.': 'All its players leave.', '¡PARTIDA ENCONTRADA!': 'MATCH FOUND!', CONFIRMAR: 'CONFIRM', 'NO, SALIR': 'NO, LEAVE',
  'Confirmado. Esperando a los demás…': 'Confirmed. Waiting for the others…', 'RONDA ANULADA': 'ROUND VOIDED', EMPATE: 'DRAW', RESULTADO: 'RESULT',
  'Amistoso: el ELO no cambió.': 'Friendly: ELO did not change.', '¿Empezar partida COMPETITIVA?': 'Start a COMPETITIVE match?', '¿Empezar partida AMISTOSA?': 'Start a FRIENDLY match?',
  Empezar: 'Start', 'Todavía no': 'Not yet', '¿Salir de la partida?': 'Leave the match?', 'Seguir jugando': 'Keep playing',
  'En COMPETITIVO, salir cuenta como abandono: tu equipo pierde.': 'In COMPETITIVE, leaving counts as abandoning: your team loses.', 'La ronda se corta para todos.': 'The round ends for everyone.',
  'Saliste de la sala': 'You left the room', 'Sala cerrada': 'Room closed', 'El anfitrión cerró la sala.': 'The host closed the room.',
  'Esta compu ya no está en la sala (te echaron o la sala cerró).': 'This computer is no longer in the room (you were kicked or the room closed).', 'Se cerró tu sesión.': 'Your session ended.',
  'No cambió el ELO: hay cuentas creadas hace menos de 24 horas.': 'ELO unchanged: some accounts were created less than 24 hours ago.',
  'No cambió el ELO: este mismo grupo ya jugó 5 partidas competitivas hoy.': 'ELO unchanged: this same group already played 5 competitive matches today.',
  'No cambió el ELO: las compus informaron resultados distintos.': 'ELO unchanged: the computers reported different results.',
  'La ronda no contó (corte o desincronización). No cambió el ELO de nadie.': 'The round did not count (disconnect or desync). Nobody’s ELO changed.',
  'Faltan jugadores: tienen que estar los 4 lugares ocupados.': 'Missing players: all 4 slots must be filled.', 'Elegí un minijuego 2v2.': 'Pick a 2v2 minigame.',
  'En COMPETITIVO no puede haber bots: cambiá a AMISTOSO o quitá el bot.': 'No bots in COMPETITIVE: switch to FRIENDLY or remove the bot.',
  'En COMPETITIVO todos tienen que jugar con su cuenta (no se permiten invitados).': 'In COMPETITIVE everyone must play with their account (no guests).',
  'En COMPETITIVO tienen que ser 4 cuentas distintas.': 'COMPETITIVE needs 4 different accounts.', 'Hay una compu desconectada.': 'A computer is disconnected.',
  'Alguien no confirmó a tiempo. Podés volver a buscar.': 'Someone did not confirm in time. You can search again.', 'Una compu se desconectó durante la partida.': 'A computer disconnected during the match.',
  'Una compu salió de la partida.': 'A computer left the match.',
  'CHAT DE LA PARTIDA': 'MATCH CHAT', 'Escribí y apretá Enter…': 'Type and press Enter…', 'Muy rápido: esperá unos segundos.': 'Too fast: wait a few seconds.',
  'Silenciar o reportar': 'Mute or report', 'Silenciar y reportar': 'Mute and report', 'Silenciado y reportado': 'Muted and reported', 'Necesitás una cuenta': 'You need an account',
  'Iniciá sesión para silenciar o reportar.': 'Log in to mute or report.', 'Chat de la partida': 'Match chat', Minimizar: 'Minimize',
  CHAT: 'CHAT', 'Chat privado': 'Private chat', 'Escribí un mensaje…': 'Write a message…', ENVIAR: 'SEND', BLOQUEAR: 'BLOCK', DESBLOQUEAR: 'UNBLOCK', SILENCIAR: 'MUTE', 'QUITAR SILENCIO': 'UNMUTE',
  'No ver sus mensajes durante las partidas': 'Hide their messages during matches', 'Reportar este mensaje': 'Report this message', 'Reportar mensaje': 'Report message', Reportar: 'Report',
  'Reporte enviado': 'Report sent', 'Gracias por avisar.': 'Thanks for letting us know.', 'No se envió': 'Not sent', Bloqueado: 'Blocked', Desbloqueado: 'Unblocked', Silenciado: 'Muted',
  'Ya no está silenciado': 'No longer muted', visto: 'seen', 'Ya no son amigos: no se pueden mandar mensajes.': 'You are no longer friends: messages cannot be sent.',
  'Hay un bloqueo entre ustedes: no se pueden mandar mensajes.': 'There is a block between you: messages cannot be sent.',
  'No te va a poder escribir y no vas a ver sus mensajes en las partidas. Lo podés deshacer cuando quieras.': 'They won’t be able to message you and you won’t see their match messages. You can undo it anytime.',
  'Solo podés chatear con tus amigos del CLUB.': 'You can only chat with your CLUB friends.', 'Estás mandando mensajes muy rápido. Esperá unos segundos.': 'You are sending messages too fast. Wait a few seconds.',
  'No se puede: hay un bloqueo entre ustedes.': 'Not possible: there is a block between you.', 'Pedido inválido.': 'Invalid request.', 'No existe ese usuario.': 'That user does not exist.',
  'Todavía no se puede empezar.': 'Cannot start yet.', 'La sala está en medio de una partida.': 'The room is in the middle of a match.', 'Esta compu no está en esa sala.': 'This computer is not in that room.',
  'Ese lugar ya está ocupado.': 'That slot is already taken.', 'Esa cuenta ya está jugando en esta sala.': 'That account is already playing in this room.',
  'Solo el anfitrión (la compu que creó la sala) puede hacer eso.': 'Only the host (the computer that created the room) can do that.',
  'En COMPETITIVO no se permiten bots ni invitados: todos juegan con su cuenta.': 'No bots or guests in COMPETITIVE: everyone plays with their account.',
  'Creaste demasiadas salas en poco tiempo. Esperá un rato.': 'You created too many rooms in a short time. Wait a while.',
  'ELO 2v2': '2v2 ELO', 'Más jugados': 'Most played', 'Todavía no hay partidas registradas para armar el ranking.': 'There are no recorded matches yet to build the ranking.',
  'Se abre QUICK PLAY con este minijuego para elegir opciones y dificultad.': 'Opens QUICK PLAY with this minigame to choose options and difficulty.',
  'Amistoso o competitivo: en una compu, en varias o mezclado, con cuentas propias y bots.': 'Friendly or competitive: on one computer, several, or mixed, with your own accounts and bots.',
};
// textos de la interfaz de COFRES
const CHEST_UI_EN = {
  'Se ganan jugando. El premio lo decide el servidor y las probabilidades están a la vista.': 'Earned by playing. The server picks the prize and the odds are always visible.',
  FRAGMENTOS: 'SHARDS', 'TUS PIES': 'YOUR PIES', ABIERTOS: 'OPENED', ABRIR: 'OPEN', 'SIN COFRES': 'NO CHESTS', 'No se vende': 'Not for sale', Probabilidades: 'Odds',
  'CÓMO SE CONSIGUEN': 'HOW TO GET THEM', REPETIDOS: 'DUPLICATES', 'ÚLTIMOS PREMIOS': 'LATEST PRIZES', 'Todavía no abriste ningún cofre.': 'You haven’t opened any chest yet.',
  'Si te sale algo que ya tenés no lo perdés: se convierte en PIES y fragmentos según su rareza (de 25 PIES + 1 fragmento a 2.000 PIES + 30 fragmentos). Algunos objetos son exclusivos de cofres y no se venden en la tienda.': 'If you get something you already own, you don’t lose it: it turns into PIES and shards based on its rarity (from 25 PIES + 1 shard up to 2,000 PIES + 30 shards). Some items are chest exclusives and are not sold in the store.',
  'Los cofres se guardan en tu cuenta. Iniciá sesión para ver y abrir los tuyos.': 'Chests are saved to your account. Log in to see and open yours.',
  '¡PASE PREMIUM!': 'PREMIUM PASS!', 'Compensación del Pase Premium': 'Premium Pass compensation', 'El premio más raro del club. Ya podés reclamar las recompensas Premium del CLUB PASS.': 'The rarest prize in the club. You can now claim the CLUB PASS Premium rewards.',
  'EXCLUSIVO DE COFRES': 'CHEST EXCLUSIVE', '¡NUEVO! Ya está en tu inventario.': 'NEW! It’s already in your inventory.', 'Tocá para saltar la animación': 'Tap to skip the animation',
  'ABRIR OTRO': 'OPEN ANOTHER', CERRAR: 'CLOSE', 'No te alcanzan los fragmentos.': 'You don’t have enough shards.', 'No tenés cofres de ese tipo.': 'You don’t have chests of that type.',
  'También se consiguen jugando, sin gastar nada.': 'You can also get them by playing, for free.', Cofres: 'Chests',
  'También puede salir en un cofre de oro (0,5 %) o mítico (2 %).': 'It can also drop from a gold (0.5%) or mythic (2%) chest.',
};
// textos de la interfaz de HISTORIA y PUZZLE CLUB
const STORY_UI_EN = {
  'SIGUIENTE': 'NEXT', 'EMPEZAR': 'START', 'CONTINUAR': 'CONTINUE', 'REPETIR': 'REPLAY', 'SEGUIR': 'CONTINUE', 'BLOQUEADO': 'LOCKED', 'FINAL': 'FINAL',
  'REINTENTAR': 'RETRY', '¡LOGRADO!': 'DONE!', 'CASI…': 'SO CLOSE…', '¡UFA!': 'OH NO!', '¡CAPÍTULO COMPLETO!': 'CHAPTER COMPLETE!', 'ETAPA SUPERADA': 'STAGE CLEARED',
  'PUZZLE RESUELTO': 'PUZZLE SOLVED', '✔ RESUELTO': '✔ SOLVED', 'Desafío en solitario': 'Solo challenge', 'MODO CAOS': 'CHAOS MODE', 'RECOMPENSA DEL CAPÍTULO': 'CHAPTER REWARD',
  'Desafíos armados a mano: siempre la misma partida, con límites. Todos tienen solución.': 'Hand-made challenges: always the same match, with limits. Every one has a solution.',
  'Como invitado se guarda tu avance, pero no hay recompensas.': 'As a guest your progress is saved, but there are no rewards.',
  '¡Meta cumplida!': 'Goal reached!', 'Se terminó el tiempo.': 'Time is up.', '¡Lo lograste!': 'You did it!', '¡Ganaste!': 'You won!', 'El rival ganó la partida.': 'The rival won the match.',
  'Empate: hay que ganar.': 'Draw: you need to win.', '¡Tocaste una mina!': 'You touched a mine!', 'Pelotas': 'Balls', 'Disparos': 'Shots', 'Canastas': 'Baskets', 'Metros': 'Meters',
  'Saltos': 'Jumps', 'Errores': 'Slips', 'Fallos': 'Misses', 'Salidas en falso': 'False starts', 'Combo máximo': 'Max combo', 'Cristales': 'Crystals', 'Pintado %': 'Painted %', 'Minas': 'Mines',
};

const KEY = 'duelclub.lang';
export const LANGS = [['es', 'Español'], ['en', 'English']];

function detect() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'es' || v === 'en') return v;
  } catch {}
  const n = (navigator.languages?.[0] || navigator.language || 'es').toLowerCase();
  return n.startsWith('es') ? 'es' : 'en';
}
export let LANG = detect();
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch {}
  if (l !== LANG) location.reload();
}

// ------------------------------------------------------------------ diccionario exacto
const D = {
  // --- menú / secciones
  'Inicio': 'Home', 'Jugar': 'Play', 'JUGAR': 'PLAY', 'Minijuegos': 'Minigames', 'MINIJUEGOS': 'MINIGAMES', 'Perfil': 'Profile', 'PERFIL': 'PROFILE',
  'Amigos': 'Friends', 'Ranking': 'Ranking', 'Logros': 'Achievements', 'LOGROS': 'ACHIEVEMENTS', 'Estadísticas': 'Stats', 'ESTADÍSTICAS': 'STATS',
  'Pase': 'Pass', 'PASE': 'PASS', 'Inventario': 'Inventory', 'INVENTARIO': 'INVENTORY', 'Novedades': 'News', 'NOVEDADES': 'NEWS',
  'Configuración': 'Settings', 'CONFIGURACIÓN': 'SETTINGS', 'VOS': 'YOU', 'TIENDA': 'SHOP', 'CLUB': 'CLUB', 'MENÚ': 'MENU', 'MENÚ PRINCIPAL': 'MAIN MENU',
  'MI PERFIL': 'MY PROFILE', 'MI POSICIÓN': 'MY POSITION', 'MÁS MODOS': 'MORE MODES', 'NOVEDADES DEL CLUB': 'CLUB NEWS', 'NOTIFICACIONES': 'NOTIFICATIONS', 'Notificaciones': 'Notifications',
  'EN LÍNEA': 'ONLINE', 'En línea': 'Online', 'En línea ahora': 'Online now', 'SIN CONEXIÓN': 'OFFLINE',
  'El ELO se juega online, en Buscar rival.': 'ELO is only at stake online, in Find opponent.',
  'PULSÁ CUALQUIER TECLA PARA EMPEZAR': 'PRESS ANY KEY TO START', 'Pulsá una tecla para comenzar': 'Press a key to start', 'Pulsá una tecla…': 'Press a key…',
  'ONE CLUB. INFINITE DUELS.': 'ONE CLUB. INFINITE DUELS.',
  // --- modos
  'UN JUGADOR': 'SINGLEPLAYER', 'UN JUGADOR · CONTRA BOTS': 'SINGLEPLAYER · VS BOTS', 'SOLO': 'SINGLEPLAYER', 'DESAFÍOS SOLO': 'SINGLEPLAYER CHALLENGES',
  'DESAFÍO SOLO': 'SINGLEPLAYER', 'ESCALERA': 'LADDER', 'PRÁCTICA': 'PRACTICE', 'Práctica': 'Practice', 'PRACTICAR': 'PRACTICE', 'PRÁCTICA · NO CUENTA': 'PRACTICE · DOESN’T COUNT',
  'Desafíos, bots y práctica': 'Challenges, bots and practice', 'DIFICULTAD DEL BOT': 'BOT DIFFICULTY', 'MINIJUEGO': 'MINIGAME', 'Minijuego': 'Minigame',
  'Experto casi no falla.': 'Expert almost never misses.', 'RIVAL DE PRÁCTICA': 'PRACTICE OPPONENT', 'Muñeco quieto': 'Still dummy', 'Muñeco de práctica': 'Practice dummy', 'MUÑECO': 'DUMMY',
  'Sin presión. No cuenta para nada.': 'No pressure. Nothing counts.', 'LA ESCALERA DEL CLUB': 'THE CLUB LADDER',
  'Los 16 minijuegos seguidos, cada vez más difícil. Tenés 3 vidas.': 'All 16 minigames in a row, harder each time. You have 3 lives.',
  'Cada etapa da XP y PIES (como VS BOT) y suma a los desafíos.': 'Each stage gives XP and PIES (like VS BOT) and counts for challenges.',
  'Como invitado no se guardan recompensas.': 'Rewards aren’t saved as a guest.',
  'Como invitado no se guardan recompensas. Iniciá sesión con J1 para ganar XP y PIES.': 'Rewards aren’t saved as a guest. Log in as P1 to earn XP and PIES.',
  'EMPEZAR ESCALERA': 'START LADDER', 'Mejor marca': 'Best run', 'Mejor tiempo': 'Best time', 'Intentos': 'Attempts', 'Escaleras completas': 'Ladders completed',
  'ÚLTIMOS INTENTOS': 'LATEST ATTEMPTS', 'Todavía no intentaste la escalera.': 'You haven’t tried the ladder yet.', 'COMPLETA': 'COMPLETE', 'RÉCORD': 'RECORD',
  'Sin rival. Conseguí las tres estrellas en cada minijuego.': 'No opponent. Get all three stars in every minigame.', 'ESTRELLAS': 'STARS',
  'DESAFÍO DEL DÍA': 'DAILY CHALLENGE', 'COMPLETADO HOY': 'DONE TODAY', 'Sin jugar': 'Not played', '¡DESAFÍO TERMINADO!': 'CHALLENGE OVER!',
  'Sin rival: metas de tres estrellas en 11 minijuegos y un desafío por día.': 'No opponent: three-star goals in 11 minigames and a daily challenge.',
  'Singleplayer: los 16 minijuegos seguidos, bots cada vez más duros y 3 vidas.': 'All 16 minigames in a row, tougher bots each time and 3 lives.',
  'Un minijuego contra un bot: Fácil, Normal, Difícil o Experto.': 'One minigame against a bot: Easy, Normal, Hard or Expert.',
  'Entrená cualquier minijuego sin presión. No da recompensas.': 'Train any minigame with no pressure. No rewards.',
  'Vidas, etapas y dificultad que no para de subir.': 'Lives, stages and ever-rising difficulty.',
  'Reaccioná lo más rápido posible (mejor tiempo)': 'React as fast as you can (best time)', 'Contrarreloj: tu mejor vuelta': 'Time trial: your best lap',
  'Encestá todo lo que puedas': 'Score as many baskets as you can', 'Puntería: sumá puntos sin tocar bombas': 'Aim: score points without hitting bombs',
  'Seguí el ritmo de toda la canción': 'Keep the beat for the whole song', 'Pescá lo más valioso antes de que termine el tiempo': 'Catch the most valuable fish before time runs out',
  'Maratón de bloques: hacé la mayor cantidad de puntos': 'Block marathon: score as many points as you can', 'Subí lo más alto posible (la cima son 150 m)': 'Climb as high as you can (the top is 150 m)',
  'Pintá la mayor parte del tablero': 'Paint as much of the board as you can', 'Juntá cristales en el laberinto': 'Collect crystals in the maze', 'Sobreviví a la zona de explosiones': 'Survive the blast zone',
  '¡ESCALERA COMPLETA!': 'LADDER COMPLETE!', '¡COMPLETASTE LA ESCALERA!': 'YOU COMPLETED THE LADDER!', 'Sin vidas: fin de la escalera.': 'No lives left: the ladder is over.',
  'Empate: se repite la etapa sin perder vida.': 'Draw: the stage repeats, no life lost.', 'PRÓXIMA ETAPA': 'NEXT STAGE',
  'Práctica: no da recompensas ni cuenta en estadísticas.': 'Practice: no rewards and it doesn’t count in stats.', 'Práctica: sin recompensas': 'Practice: no rewards',
  'Fácil': 'Easy', 'FÁCIL': 'EASY', 'Normal': 'Normal', 'Difícil': 'Hard', 'Experto': 'Expert', '4 dificultades': '4 difficulties', 'Bot · no suma ELO': 'Bot · no ELO',
  'DUEL MODE': 'DUEL MODE', 'Duel Mode': 'Duel Mode', 'QUICK PLAY': 'QUICK PLAY', 'SURVIVAL': 'SURVIVAL', 'Survival': 'Survival', 'Supervivencia': 'Survival',
  'Torneo': 'Tournament', 'Torneos': 'Tournaments', 'Competición': 'Competition', 'Competiciones': 'Competitions', 'Competencia': 'Competition',
  'Competiciones Duel': 'Duel competitions', 'Competiciones ganadas': 'Competitions won', 'Comp. perdidas': 'Comp. lost',
  'La competición principal: de 3 a 12 minijuegos, un campeón.': 'The main competition: 3 to 12 minigames, one champion.',
  'Elegí un minijuego y jugá una partida directa.': 'Pick a minigame and play a single match.', 'Elegí un minijuego y jugá ya. Revancha con un botón.': 'Pick a minigame and play now. Rematch with one button.',
  'Desafíos consecutivos. Cada derrota cuesta una vida. La dificultad no deja de subir.': 'Back-to-back challenges. Every loss costs a life. Difficulty keeps rising.',
  'Una copa por rondas con clasificación, bonus y una gran final que vale doble.': 'A round-based cup with standings, bonuses and a grand final worth double.',
  'Rondas, clasificación y una gran final que vale doble.': 'Rounds, standings and a grand final worth double.',
  '2 jugadores · 1 teclado · o cada uno en su compu': '2 players · 1 keyboard · or each on their own computer', 'EN ESTA COMPU · DOS JUGADORES, UN TECLADO': 'ON THIS COMPUTER · TWO PLAYERS, ONE KEYBOARD',
  '3 minijuegos al azar, iguales para los dos': '3 random minigames, the same for both', 'Minijuegos al azar': 'Random minigames', 'minijuegos al azar': 'random minigames',
  '16 minijuegos 1v1. Cada uno tiene su propio dominio, desafíos y récord mundial.': '16 1v1 minigames. Each one has its own mastery, challenges and world record.',
  // --- online
  'JUGAR ONLINE': 'PLAY ONLINE', 'Jugar online': 'Play online', 'ONLINE': 'ONLINE', 'Partida online': 'Online match', 'BUSCAR RIVAL': 'FIND OPPONENT', 'BUSCANDO RIVAL': 'FINDING OPPONENT',
  'BUSCAR PARTIDA': 'FIND MATCH', 'CREAR SALA': 'CREATE ROOM', 'SALA PRIVADA': 'PRIVATE ROOM', 'SALA AMISTOSA': 'FRIENDLY ROOM', 'Código de sala': 'Room code', 'CÓDIGO': 'CODE',
  'COPIAR CÓDIGO': 'COPY CODE', 'COPIAR LINK': 'COPY LINK', '¡COPIADO!': 'COPIED!', 'Copialo a mano': 'Copy it by hand', 'IR A LA SALA': 'GO TO ROOM', 'ENTRAR': 'JOIN',
  'COMPETITIVA · POR ELO': 'COMPETITIVE · ELO', 'Competitivo, por ELO. Mejor de 3.': 'Competitive, for ELO. Best of 3.', 'DESAFÍO AMISTOSO': 'FRIENDLY CHALLENGE',
  'DESAFIAR A UN AMIGO': 'CHALLENGE A FRIEND', 'JUGAR CON UN AMIGO': 'PLAY WITH A FRIEND', 'o entrá a la sala de tu amigo': 'or join your friend’s room',
  'Buscando jugadores con ELO parecido…': 'Looking for players with similar ELO…', 'Rival de tu nivel (el rango se abre si tarda)': 'Opponent at your level (range widens if it takes long)',
  'Por ahora no hay nadie más buscando. Seguimos esperando…': 'Nobody else is searching right now. Still waiting…',
  'Cada uno desde su compu · el ELO solo se juega en Buscar rival': 'Each on their own computer · ELO only in Find opponent',
  'Para jugar online, cada uno entra con su cuenta desde su compu.': 'To play online, each player logs in from their own computer.',
  'Vos en tu compu, tu amigo en la suya. Buscá rival por ELO, creá una sala con código o desafiá a un amigo del CLUB.': 'You on your computer, your friend on theirs. Find an opponent by ELO, create a room with a code or challenge a CLUB friend.',
  'Creá una sala y pasale el código (o el link) a tu amigo. Él lo pone acá y listo.': 'Create a room and send the code (or link) to your friend. They enter it here and that’s it.',
  'El código tiene 5 letras o números (te lo pasa tu amigo).': 'The code has 5 letters or numbers (your friend gives it to you).',
  'No hay ninguna sala abierta con ese código.': 'There’s no open room with that code.', 'Esa sala ya está completa.': 'That room is already full.', 'La sala se cerró.': 'The room was closed.',
  'No se pudo crear la sala': 'Couldn’t create the room', 'Esperando que entre tu amigo…': 'Waiting for your friend to join…', 'ESPERANDO AL RIVAL…': 'WAITING FOR OPPONENT…',
  'CONECTANDO…': 'CONNECTING…', 'Conectando…': 'Connecting…', 'CONECTANDO': 'CONNECTING', 'CONECTANDO CON': 'CONNECTING TO', 'CONEXIÓN DIRECTA': 'DIRECT CONNECTION',
  'CONECTADOS POR EL SERVIDOR': 'CONNECTED VIA SERVER', '· buscando conexión directa…': '· looking for a direct connection…', '· está tardando más de lo normal': '· it’s taking longer than usual',
  'El resultado lo confirman las dos compus': 'Both computers confirm the result', 'Resultado confirmado por las dos compus.': 'Result confirmed by both computers.',
  'Resultado confirmado (tu rival no respondió a tiempo).': 'Result confirmed (your opponent didn’t respond in time).', 'Confirmando el resultado con el servidor…': 'Confirming the result with the server…',
  'Recuperando la conexión… la partida sigue en cuanto lleguen sus teclas': 'Reconnecting… the match continues as soon as their inputs arrive',
  'Se perdió la comunicación con tu rival por más de 20 segundos.': 'Lost contact with your opponent for more than 20 seconds.',
  'TU RIVAL SE RECONECTÓ': 'YOUR OPPONENT RECONNECTED', 'VOLVISTE A LA PARTIDA': 'YOU’RE BACK IN THE MATCH', '¡TU RIVAL ABANDONÓ!': 'YOUR OPPONENT LEFT!',
  'Tenés una partida online en curso': 'You have an online match in progress', 'Volver a la partida': 'Back to the match', 'Algo falló en la partida online. Volvés al menú.': 'Something went wrong in the online match. Back to the menu.',
  'Las dos compus dejaron de ver exactamente lo mismo.': 'The two computers stopped seeing exactly the same thing.', 'VERSIONES DISTINTAS': 'DIFFERENT VERSIONS',
  '· uno de los dos tiene una versión vieja abierta: recarguen la página (F5) los dos y vuelvan a entrar': '· one of you has an old version open: both reload the page (F5) and join again',
  'Recargó la página en medio de la ronda: la ronda es tuya.': 'They reloaded mid-round: the round is yours.', 'La ronda que estaba en juego se la lleva tu rival.': 'The round in play goes to your opponent.',
  'Ronda anulada: duró demasiado poco para contar. Se juega otra.': 'Round voided: too short to count. Another one is played.',
  'Ronda anulada: las dos compus no vieron el mismo resultado. Se juega otra.': 'Round voided: both computers didn’t see the same result. Another one is played.',
  'La serie sigue: preparate para la próxima ronda.': 'The series continues: get ready for the next round.', 'La serie terminó.': 'The series is over.', 'CERRANDO LA SERIE…': 'CLOSING THE SERIES…',
  'Si alguien abandona, pierde la serie.': 'If someone quits, they lose the series.', 'Si ya empezó la serie, cuenta como abandono.': 'If the series already started, it counts as quitting.',
  'Perdés la ronda en curso y la serie (cuenta para ELO).': 'You lose the current round and the series (counts for ELO).', 'Perdés la serie (cuenta para ELO).': 'You lose the series (counts for ELO).',
  'Perdés la ronda en curso y la serie.': 'You lose the current round and the series.', 'Perdés la serie.': 'You lose the series.',
  'Sin pausa en online · arranca solo en': 'No pause online · starts by itself in', 'Juega desde su compu.': 'Plays from their computer.', 'SU TURNO': 'THEIR TURN',
  'Desafíos online': 'Online challenges', 'Amigos que te desafían a jugar online': 'Friends challenging you online', 'Desafiar a jugar online (cada uno en su compu)': 'Challenge online (each on their own computer)',
  'Le llega el desafío al instante si tiene DUEL CLUB abierto. Usa las opciones de la sala.': 'They get the challenge instantly if DUEL CLUB is open. Uses the room options.',
  'Solo podés desafiar a tus amigos del CLUB (o pasale el código de una sala).': 'You can only challenge your CLUB friends (or send them a room code).',
  'Cuando acepte, desafialo online desde acá.': 'Once they accept, challenge them online from here.', 'No se pudo desafiar': 'Couldn’t challenge', 'FUE EL LAG': 'IT WAS THE LAG', 'Jugar online como': 'Play online as',
  'ELO sin cambios': 'ELO unchanged', 'Sin cambio de ELO': 'No ELO change', '(avisó el rival)': '(reported by opponent)', 'RED': 'NETWORK', 'SERVIDOR': 'SERVER',
  // --- cuentas
  'INICIAR SESIÓN': 'LOG IN', 'INICIAR SESIÓN / REGISTRARSE': 'LOG IN / SIGN UP', 'INICIAR SESIÓN O CREAR CUENTA': 'LOG IN OR CREATE ACCOUNT', 'Iniciar sesión / Registrarse': 'Log in / Sign up',
  'Iniciar sesión o registrarse': 'Log in or sign up', 'ENTRAR / CREAR CUENTA': 'LOG IN / CREATE ACCOUNT', 'CREAR CUENTA': 'CREATE ACCOUNT', 'JUGAR COMO INVITADO': 'PLAY AS GUEST',
  'SEGUIR COMO INVITADO': 'CONTINUE AS GUEST', 'INVITADO': 'GUEST', 'Invitado': 'Guest', 'invitado': 'guest', 'Invitado: sin progreso': 'Guest: no progress', '· INVITADO': '· GUEST', 'SIN CUENTA': 'NO ACCOUNT', 'NECESITÁS UNA CUENTA': 'YOU NEED AN ACCOUNT',
  'TERMINÁ TU CUENTA': 'FINISH YOUR ACCOUNT', 'Usuario': 'Username', 'Contraseña': 'Password', 'contraseña': 'password', 'Contraseña (mín. 6)': 'Password (min. 6)', 'Repetir contraseña': 'Repeat password',
  'repetir contraseña': 'repeat password', 'Nueva contraseña': 'New password', 'Nombre visible': 'Display name', 'Nombre visible (ej.: Ana)': 'Display name (e.g. Ana)', 'Usuario único': 'Unique username',
  'Tu nombre': 'Your name', 'Tu nombre (opcional)': 'Your name (optional)', 'Cerrar sesión': 'Log out', 'Cerrar sesión en esta compu': 'Log out on this computer', 'Sesión cerrada': 'Logged out',
  'Sesión iniciada': 'Logged in', 'Cuenta creada': 'Account created', 'Cuenta vinculada': 'Account linked', 'Cuenta eliminada': 'Account deleted', 'Cuenta recuperada': 'Account recovered',
  'Nombre cambiado': 'Name changed', 'Vincular Google': 'Link Google', 'Vincular email': 'Link email', 'Vincular para entrar más fácil': 'Link to log in more easily', 'o entrá con': 'or log in with',
  'Revisá tu email': 'Check your email', 'Tu email: te mandamos un link para entrar (sin contraseña).': 'Your email: we’ll send you a login link (no password).',
  'La próxima vez podés entrar con Google o con tu email.': 'Next time you can log in with Google or your email.',
  'Tu cuenta funciona en cualquier computadora o celular que abra DUEL CLUB.': 'Your account works on any computer or phone that opens DUEL CLUB.',
  'Tu cuenta quedó creada con 300 PIES de regalo.': 'Your account was created with 300 free PIES.', 'Arrancás con 300 PIES de regalo.': 'You start with 300 free PIES.', 'Bono de bienvenida': 'Welcome bonus',
  'Tu progreso se guarda en tu cuenta. Este navegador solo guarda ajustes y controles.': 'Your progress is saved to your account. This browser only stores settings and controls.',
  'CUENTAS INICIADAS EN ESTA COMPU': 'ACCOUNTS LOGGED IN ON THIS COMPUTER', 'Dejar el puesto (la sesión queda guardada en esta compu)': 'Leave the seat (the session stays saved on this computer)',
  'Usuario o contraseña incorrectos.': 'Wrong username or password.', 'Ese nombre de usuario ya existe.': 'That username already exists.', 'Ese nombre ya lo usa otra cuenta.': 'Another account already uses that name.',
  'Ese nombre no está permitido. Elegí otro sin insultos ni palabras ofensivas.': 'That name isn’t allowed. Pick one without insults or offensive words.',
  'La contraseña debe tener al menos 6 caracteres.': 'The password must have at least 6 characters.', 'La contraseña tiene que tener al menos 6 caracteres.': 'The password must have at least 6 characters.',
  'Las contraseñas no coinciden.': 'Passwords don’t match.', 'El nombre visible debe tener entre 3 y 16 caracteres.': 'The display name must be 3 to 16 characters.',
  'El nombre visible tiene que tener al menos 3 caracteres.': 'The display name must have at least 3 characters.',
  'El usuario debe tener de 3 a 16 caracteres: letras minúsculas, números, - o _.': 'The username must be 3 to 16 characters: lowercase letters, numbers, - or _.',
  'El usuario tiene que tener de 3 a 16 caracteres: letras, números, - o _.': 'The username must be 3 to 16 characters: letters, numbers, - or _.',
  'Nuevo nombre visible (3 a 16 caracteres). Se puede cambiar una vez cada 7 días.': 'New display name (3 to 16 characters). It can be changed once every 7 days.',
  'Ya cambiaste el nombre hace poco: se puede cambiar una vez cada 7 días.': 'You changed your name recently: it can be changed once every 7 days.',
  'Demasiadas cuentas creadas desde esta conexión. Probá más tarde.': 'Too many accounts created from this connection. Try again later.',
  'Demasiados intentos fallidos. Esperá 15 minutos.': 'Too many failed attempts. Wait 15 minutes.', 'La sesión expiró. Volvé a iniciar sesión.': 'Your session expired. Log in again.',
  'La misma cuenta no puede ser J1 y J2.': 'The same account can’t be P1 and P2.', 'Ese email no parece válido.': 'That email doesn’t look valid.',
  'Ese Google o email ya está vinculado a otra cuenta de DUEL CLUB.': 'That Google account or email is already linked to another DUEL CLUB account.',
  'Esta forma de entrar todavía no está activada en el servidor. Usá usuario y contraseña.': 'This login method isn’t enabled on the server yet. Use username and password.',
  'No se pudo verificar la cuenta de Google o el email. Probá de nuevo.': 'Couldn’t verify the Google account or email. Try again.',
  'Ya mandamos un link hace poco. Esperá un minuto y probá de nuevo.': 'We sent a link recently. Wait a minute and try again.',
  'Elegí personaje y color': 'Pick character and color', 'Elegí personaje y color · iniciá sesión o jugá como invitado': 'Pick character and color · log in or play as guest',
  'Iniciá sesión para sumar al ranking mundial o jugá como invitado. Ambos deben estar LISTOS.': 'Log in to climb the world ranking or play as guest. Both must be READY.',
  'Iniciá sesión para guardar tu progreso': 'Log in to save your progress', 'Iniciá sesión para guardar tus estadísticas.': 'Log in to save your stats.',
  'Iniciá sesión para sumar amigos.': 'Log in to add friends.', 'Iniciá sesión para tener tu perfil.': 'Log in to have a profile.', 'Iniciá sesión para ver y equipar tus objetos.': 'Log in to see and equip your items.',
  'Iniciá sesión para desbloquear logros: se guardan en tu cuenta.': 'Log in to unlock achievements: they’re saved to your account.', 'Iniciá sesión para sumar dominio en este minijuego.': 'Log in to earn mastery in this minigame.',
  'Entrá con tu cuenta para subir el pase y hacer desafíos.': 'Log in to level up the pass and do challenges.',
  'Con una cuenta subís el Pase de Batalla y completás desafíos diarios y semanales.': 'With an account you level up the Battle Pass and complete daily and weekly challenges.', 'Con una cuenta subís el CLUB PASS y completás desafíos diarios y semanales.': 'With an account you level up the CLUB PASS and complete daily and weekly challenges.',
  'Bloqueado · Iniciá sesión para desbloquear personajes': 'Locked · Log in to unlock characters', 'Personaje bloqueado': 'Locked character', 'ELEGIR PERSONAJES': 'CHOOSE CHARACTERS',
  'JUGADOR 1': 'PLAYER 1', 'JUGADOR 2': 'PLAYER 2', 'Jugador 1': 'Player 1', 'Jugador 2': 'Player 2', 'JUGADOR': 'PLAYER', 'JUGADORES': 'PLAYERS', 'Jugadores': 'Players',
  'JUGÁS COMO': 'PLAYING AS', 'VOS · J1': 'YOU · P1', 'VOS · J2': 'YOU · P2', 'VOS · J2 ▶': 'YOU · P2 ▶', '◀ VOS · J1': '◀ YOU · P1', 'VOS ·': 'YOU ·', 'RIVAL · J1': 'OPPONENT · P1', 'RIVAL · J2': 'OPPONENT · P2',
  'RIVAL': 'OPPONENT', 'EL RIVAL': 'THE OPPONENT', 'Rivales': 'Opponents', 'un rival': 'an opponent', 'Tu amigo': 'Your friend', 'AMIGO': 'FRIEND', 'tu cuenta': 'your account', 'Cuenta / perfil': 'Account / profile',
  'Invitar a jugar en esta compu': 'Invite to play on this computer', 'ESTA COMPU': 'THIS COMPUTER',
  'Conversión de la versión anterior': 'Conversion from the previous version', 'CUENTA ANTERIOR': 'OLD ACCOUNT', 'RECUPERAR CUENTA': 'RECOVER ACCOUNT', 'Usuario anterior': 'Old username',
  'PIN anterior': 'Old PIN', 'PIN anterior (4 números)': 'Old PIN (4 digits)', 'PIN de la versión anterior': 'PIN from the previous version', 'El PIN anterior tiene 4 números.': 'The old PIN has 4 digits.',
  'Esa cuenta no tiene nada para recuperar con PIN.': 'That account has nothing to recover with a PIN.', 'Esta cuenta viene de la versión anterior: recuperala con tu PIN.': 'This account comes from the previous version: recover it with your PIN.',
  'Cuenta de la versión anterior pendiente de recuperar': 'Old-version account pending recovery',
  '¿Tenías cuenta en la versión anterior (nombre + PIN)? Tu progreso se migró: confirmá tu PIN y elegí una contraseña nueva.': 'Did you have an account in the previous version (name + PIN)? Your progress was migrated: confirm your PIN and pick a new password.',
  '¿Eliminar la cuenta para siempre?': 'Delete the account forever?', 'Eliminar': 'Delete', 'BORRAR': 'DELETE', 'Borrar': 'Delete',
  // --- amigos / club
  'AGREGAR AMIGO': 'ADD FRIEND', 'AGREGAR': 'ADD', 'Quitar amigo': 'Remove friend', 'Amigo quitado': 'Friend removed', 'Amistad aceptada': 'Friendship accepted', 'Amistad': 'Friendship',
  '¡Ahora son amigos!': 'You’re friends now!', 'Solicitud enviada': 'Request sent', 'Solicitud cancelada': 'Request cancelled', 'Solicitud rechazada': 'Request declined',
  'No enviaste solicitudes.': 'You haven’t sent any requests.', 'No tenés solicitudes pendientes.': 'You have no pending requests.', 'Tenés demasiadas solicitudes pendientes.': 'You have too many pending requests.',
  'Llegaste al máximo de amigos.': 'You reached the friend limit.', 'Se elimina de tu lista de amigos.': 'They’ll be removed from your friend list.', 'Solicitudes y cara a cara': 'Requests and head-to-head',
  'Solicitudes y solicitudes aceptadas': 'Requests and accepted requests', 'Cargando amigos…': 'Loading friends…', 'Tu CLUB todavía está vacío': 'Your CLUB is still empty',
  'Todavía no tenés amigos. Agregalos desde el CLUB.': 'You have no friends yet. Add them from the CLUB.', 'Sumá amigos para desafiarlos online y ver quién está conectado.': 'Add friends to challenge them online and see who’s connected.',
  'Buscá a tu amigo por su usuario o nombre.': 'Search for your friend by username or name.', 'Mandale una solicitud: le llega como notificación.': 'Send a request: they get it as a notification.',
  'BUSCAR JUGADORES': 'SEARCH PLAYERS', 'Buscar jugadores': 'Search players', 'Buscar jugador…': 'Search player…', 'Buscá por nombre o usuario.': 'Search by name or username.', 'Nombre o usuario…': 'Name or username…',
  'Ningún jugador coincide con la búsqueda.': 'No player matches the search.', 'No se encontraron jugadores.': 'No players found.', 'No se encontró ese jugador.': 'That player wasn’t found.', 'BUSCAR': 'SEARCH',
  'CARA A CARA': 'HEAD TO HEAD', 'Cara a cara': 'Head to head', 'VER CARA A CARA': 'SEE HEAD TO HEAD', 'Elegí un amigo para ver el historial entre ustedes.': 'Pick a friend to see your history together.',
  'Agregá amigos para ver su cara a cara.': 'Add friends to see your head-to-head.', 'Todavía no se enfrentaron.': 'You haven’t faced each other yet.', 'Rivalidad histórica': 'Historic rivalry',
  'Rivalidad seria': 'Serious rivalry', 'Se están conociendo': 'Getting to know each other', 'Primeros cruces': 'First encounters', 'Últimos enfrentamientos': 'Latest matches',
  'Tus amigos todavía no tienen partidas en este ranking.': 'Your friends have no matches in this ranking yet.', 'Ver como': 'View as',
  // --- ranking / stats
  'RANKING MUNDIAL': 'WORLD RANKING', 'Ranking mundial': 'World ranking', 'VER EL RANKING MUNDIAL': 'SEE THE WORLD RANKING', 'Buscar en el ranking': 'Search the ranking', 'Ranking / CLUB': 'Ranking / CLUB',
  'Datos reales de todos los jugadores registrados. Sin cuentas ficticias.': 'Real data from every registered player. No fake accounts.',
  'Todavía no figurás en este ranking: jugá una partida con tu cuenta.': 'You’re not in this ranking yet: play a match with your account.',
  'Todavía no hay jugadores en este ranking. ¡Jugá una partida con cuenta para aparecer!': 'No players in this ranking yet. Play a match with an account to appear!',
  'Récords mundiales': 'World records', 'Récord mundial': 'World record', '★ RÉCORD MUNDIAL': '★ WORLD RECORD', 'Récords mundiales y récords perdidos': 'World records and lost records',
  'Ningún récord mundial… por ahora.': 'No world records… yet.', 'Ya figura en el ranking de récords.': 'Already in the records ranking.', 'Récord': 'Record', 'Récords': 'Records', 'Récord actual': 'Current record',
  'Récord en esta compu': 'Record on this computer', 'RÉCORDS DE ESTA COMPU': 'RECORDS ON THIS COMPUTER', 'RÉCORDS LOCALES': 'LOCAL RECORDS', 'Sin récord todavía': 'No record yet',
  '★ ¡NUEVO RÉCORD EN ESTA COMPU!': '★ NEW RECORD ON THIS COMPUTER!', '· ¡NUEVO RÉCORD!': '· NEW RECORD!', '· ¡NUEVO RÉCORD PERSONAL!': '· NEW PERSONAL BEST!', '· Récord': '· Record',
  'Evolución del ELO': 'ELO history', 'Mejor ELO': 'Best ELO', 'ELO, nivel y récords': 'ELO, level and records', 'El gráfico aparece después de jugar partidas competitivas online.': 'The chart appears after playing competitive online matches.',
  'Solo cuentan partidas con cuenta.': 'Only matches with an account count.', 'Top 10': 'Top 10', 'Top 100': 'Top 100', 'Todas': 'All', 'Todos': 'All', 'Todo': 'All', 'Míos': 'Mine',
  'Victorias': 'Wins', 'Victoria': 'Win', 'Derrotas': 'Losses', 'Empates': 'Draws', 'Empate': 'Draw', 'EMPATE': 'DRAW', 'Partidas': 'Matches', 'Partida': 'Match', 'Racha': 'Streak',
  'Racha actual': 'Current streak', 'Racha máxima': 'Max streak', 'Mejor racha': 'Best streak', 'Mejor racha (esta compu)': 'Best streak (this computer)', 'Tiempo jugado': 'Time played',
  'Tiempo jugado aquí': 'Time played here', 'Jugado aquí': 'Played here', 'Total de minijuegos': 'Total minigames', 'Minijuegos favoritos': 'Favorite minigames', 'Minijuegos más jugados': 'Most played minigames',
  'Más jugado': 'Most played', 'Más jugados': 'Most played', 'Minijuegos en esta compu': 'Minigames on this computer', 'Por minijuego': 'By minigame', 'Favorito (mejor %)': 'Favorite (best %)',
  '% de victorias': '% wins', '% victorias': '% wins', '% de acierto': '% accuracy', '% del tablero': '% of the board', 'Rondas ganadas': 'Rounds won', 'Torneos jugados': 'Tournaments played',
  'Partidas de Survival': 'Survival runs', 'Survival: mejor etapa': 'Survival: best stage', 'Mejor etapa': 'Best stage', 'Etapas superadas': 'Stages cleared', 'Duración total': 'Total duration',
  'Estadísticas locales reiniciadas.': 'Local stats reset.', 'Reiniciar estadísticas locales': 'Reset local stats', 'Estadísticas, récords e historial locales': 'Local stats, records and history',
  'Sin partidas registradas todavía.': 'No matches recorded yet.', 'Sin partidas todavía.': 'No matches yet.', 'Todavía no hay partidas registradas en esta compu. ¡A jugar!': 'No matches recorded on this computer yet. Let’s play!',
  'Todavía no jugó minijuegos con esta cuenta.': 'No minigames played with this account yet.', 'Todavía no tiene rivales con cuenta (en las últimas 50 partidas).': 'No opponents with an account yet (in the last 50 matches).',
  'Estos números son de ESTA computadora (por puesto J1/J2, con o sin cuenta). El progreso de cada cuenta está en PERFIL y ESTADÍSTICAS.': 'These numbers are from THIS computer (per seat P1/P2, with or without an account). Each account’s progress is in PROFILE and STATS.',
  'Se borran las estadísticas e historial de ESTA compu (partidas de invitados). Las cuentas no se tocan.': 'Stats and history on THIS computer are deleted (guest matches). Accounts aren’t touched.',
  '¿Borrar los datos locales?': 'Delete local data?', 'DATOS Y CUENTAS': 'DATA AND ACCOUNTS', 'Dominio': 'Mastery', 'Rango de dominio': 'Mastery rank', 'Rango máximo': 'Max rank',
  'Principiante': 'Beginner', 'Aficionado': 'Amateur', 'Competente': 'Skilled', 'Maestro': 'Master', 'MAESTRO': 'MASTER', 'Nuevos rangos en minijuegos': 'New minigame ranks',
  'Llegá a Maestro para ganar una skin y un título.': 'Reach Master to earn a skin and a title.', 'Skin y título de Maestro desbloqueados.': 'Master skin and title unlocked.', 'Skin y título exclusivos desbloqueados.': 'Exclusive skin and title unlocked.',
  ', skin y título exclusivos': ', exclusive skin and title', 'Nuevo rango y recompensas.': 'New rank and rewards.', 'XP total': 'Total XP', 'Nivel': 'Level', 'Niveles': 'Levels', 'Progreso': 'Progress',
  'HISTORIAL': 'HISTORY', 'Historial': 'History', 'HISTORIAL DE PIES': 'PIES HISTORY', 'Historial de PIES': 'PIES history', 'PIES conseguidos': 'PIES earned', 'PIES gastados': 'PIES spent', 'Saldo actual': 'Current balance',
  'Todavía no hay movimientos.': 'No transactions yet.', 'Logros desbloqueados': 'Achievements unlocked', 'Todavía no desbloqueó logros.': 'No achievements unlocked yet.', 'No hay logros con ese filtro.': 'No achievements match that filter.',
  'VER TODOS LOS LOGROS': 'SEE ALL ACHIEVEMENTS', '152 logros, algunos secretos': '152 achievements, some secret', 'Logro': 'Achievement', 'Logro secreto. Seguí jugando para descubrirlo.': 'Secret achievement. Keep playing to discover it.',
  '¡Logro desbloqueado!': 'Achievement unlocked!', '¡Logro secreto descubierto!': 'Secret achievement discovered!', 'SECRETO': 'SECRET', 'Desbloqueados': 'Unlocked', 'Bloqueados': 'Locked',
  'Cargando…': 'Loading…', 'Guardando…': 'Saving…', 'Esperando…': 'Waiting…', 'Esperando al servidor…': 'Waiting for the server…', 'ENVIANDO…': 'SENDING…', 'recién': 'just now',
  // --- pase / desafíos / tienda
  'PASE DE BATALLA': 'BATTLE PASS', 'Pase de Batalla': 'Battle Pass', 'PASE PREMIUM': 'PREMIUM PASS', 'PASE Y DESAFÍOS': 'PASS & CHALLENGES', 'Pase y desafíos': 'Pass & challenges',
  'VER PASE Y DESAFÍOS': 'SEE PASS & CHALLENGES', 'PREMIUM ACTIVO': 'PREMIUM ACTIVE', '· PREMIUM': '· PREMIUM', '¿Comprar el Pase Premium?': 'Buy the Premium Pass?', '¡Pase Premium activado!': 'Premium Pass activated!',
  '¡Pase completo!': 'Pass complete!', 'Esa recompensa es del Pase Premium.': 'That reward belongs to the Premium Pass.', 'Ya podés reclamar las recompensas Premium.': 'You can now claim the Premium rewards.',
  'Incluye todo lo de los niveles que ya tenés.': 'Includes everything from the levels you already have.', 'Para el próximo nivel': 'To the next level', 'Premio de nivel': 'Level reward', 'Subida de nivel': 'Level up',
  'Subidas de nivel y recompensas': 'Level-ups and rewards', 'SUBISTE DE NIVEL': 'LEVEL UP', 'RECLAMAR': 'CLAIM', 'Recompensa reclamada': 'Reward claimed', 'Ya reclamaste esa recompensa.': 'You already claimed that reward.',
  'No se pudo reclamar': 'Couldn’t claim', 'Recompensa': 'Reward', 'Recompensa reducida (muchas partidas hoy)': 'Reduced reward (lots of matches today)', 'Límite diario alcanzado': 'Daily limit reached',
  'No hay ninguna temporada activa ahora. ¡Volvé pronto!': 'No active season right now. Come back soon!', 'No hay ninguna temporada activa en este momento.': 'No active season at the moment.',
  'No hay una temporada activa en este momento.': 'No active season at the moment.', 'Todavía no hay temporadas anteriores.': 'No previous seasons yet.', 'Temporadas': 'Seasons', 'temporada 1': 'season 1',
  'Desafíos': 'Challenges', 'DIARIOS': 'DAILY', 'SEMANALES': 'WEEKLY', 'Se renuevan cada día y cada semana.': 'They reset every day and every week.', '¡Desafío completado!': 'Challenge completed!',
  'Todavía no completaste ese desafío.': 'You haven’t completed that challenge yet.', 'Ese desafío es para otra cuenta.': 'That challenge is for another account.', 'Cantidad de desafíos': 'Number of challenges',
  'PIE STORE / inventario': 'PIE STORE / inventory', 'Compra en PIE STORE': 'Purchase in PIE STORE', 'Cosméticos con PIES': 'Cosmetics with PIES', 'Los PIES se ganan jugando.': 'PIES are earned by playing.',
  'INICIÁ SESIÓN PARA COMPRAR': 'LOG IN TO BUY', 'Comprar': 'Buy', '¡Compra realizada!': 'Purchase complete!', 'No se pudo comprar': 'Couldn’t buy', 'No te alcanzan los PIES': 'Not enough PIES', 'No te alcanzan los PIES.': 'Not enough PIES.',
  'Ya tenés ese objeto.': 'You already have that item.', 'Todavía no tenés ese objeto.': 'You don’t have that item yet.', 'Ese objeto no se vende: se desbloquea jugando.': 'That item isn’t for sale: it’s unlocked by playing.',
  'Necesitás más nivel para ese objeto.': 'You need a higher level for that item.', 'Se desbloquea jugando': 'Unlocked by playing', 'En tu inventario': 'In your inventory', 'EN USO': 'IN USE', 'EQUIPADO': 'EQUIPPED',
  'EQUIPAR': 'EQUIP', 'DESEQUIPAR': 'UNEQUIP', 'No se pudo equipar': 'Couldn’t equip', 'No se guardó el aspecto': 'The look wasn’t saved', 'No le queda a este personaje': 'Doesn’t fit this character', 'este personaje': 'this character',
  'DESTACADOS DE HOY': 'TODAY’S FEATURED', 'EXCLUSIVO': 'EXCLUSIVE', 'NUEVO': 'NEW', 'NOVEDAD': 'NEW', 'Nuevos': 'New', 'Ocultar lo que tengo': 'Hide owned', '✓ Ocultar lo que tengo': '✓ Hide owned',
  'No hay objetos con ese filtro.': 'No items match that filter.', 'Solo tiene los objetos iniciales.': 'Only has the starter items.', 'PERSONALIZAR': 'CUSTOMIZE', 'PERSONAJE': 'CHARACTER', 'Personajes': 'Characters',
  'Todavía no tenés objetos de este tipo. ¡Pasá por la PIE STORE o desbloqueá logros!': 'You don’t have items of this type yet. Visit the PIE STORE or unlock achievements!',
  'Equipá lo que quieras: el aspecto se ve en los minijuegos, en tu perfil y en el ranking.': 'Equip whatever you want: your look shows in minigames, your profile and the ranking.',
  'Los cosméticos solo cambian el aspecto: no dan ninguna ventaja en los minijuegos.': 'Cosmetics only change your look: they give no advantage in minigames.',
  'Colección': 'Collection', 'Accesorio': 'Accessory', 'Accesorios': 'Accessories', 'Sombrero': 'Hat', 'Sombreros': 'Hats', 'SOMBRERO': 'HAT', 'Máscara': 'Mask', 'Máscaras': 'Masks', 'Skin': 'Skin', 'Skins': 'Skins',
  'Título': 'Title', 'Títulos': 'Titles', 'Marco': 'Frame', 'Marcos': 'Frames', 'Tarjeta': 'Card', 'Fondos de perfil': 'Profile backgrounds', 'Emote': 'Emote', 'Emotes': 'Emotes', 'Entrada': 'Entrance', 'Entradas': 'Entrances',
  'Efectos': 'Effects', 'Probar efectos': 'Test effects', 'ÍCONO': 'ICON', 'Ninguno': 'None', 'MEME COLLECTION': 'MEME COLLECTION',
  'Casco de piloto': 'Racing helmet', 'Casco vikingo': 'Viking helmet', 'Gafas de sol': 'Sunglasses', 'Gorro de fiesta': 'Party hat', 'Moño': 'Bow tie', 'Corona': 'Crown', 'Aureola': 'Halo', 'Auriculares': 'Headphones',
  'Galera': 'Top hat', 'Gorra': 'Cap', 'Payaso': 'Clown', 'Espada': 'Sword', 'Serpentina': 'Streamer', 'Globo': 'Balloon', 'Campana': 'Bell',
  'Amarillo': 'Yellow', 'Azul': 'Blue', 'Rojo': 'Red', 'Verde': 'Green', 'Rosa': 'Pink', 'Naranja': 'Orange', 'Violeta': 'Purple', 'Turquesa': 'Turquoise',
  // --- personajes (apodos y biografías)
  'EL CREADOR': 'THE CREATOR', 'El Creador': 'The Creator', 'El que hizo el club': 'The one who made the club', 'El ave veloz': 'The speedy bird', 'El ciudadano promedio': 'The average citizen', 'El electrodoméstico': 'The appliance',
  'El espíritu de tormenta': 'The storm spirit', 'El gólem de bloques': 'The block golem', 'El mini dino campeón': 'The champion mini dino', 'El oficinista serio': 'The serious office worker', 'El ritmo del bosque': 'The rhythm of the forest',
  'El robot optimista': 'The optimistic robot', 'El visitante de un ojo': 'The one-eyed visitor', 'La gelatina imparable': 'The unstoppable jelly', 'La tostadora valiente': 'The brave toaster', 'La zorrita astuta': 'The clever little fox',
  'Gerardo NPC': 'Gerardo NPC', 'Sr. Formalidad': 'Mr. Formality', 'Tostadín': 'Toasty', 'La Silla': 'The Chair', 'Frigo-Bot': 'Fridge-Bot', 'Leyenda de plástico': 'Plastic legend',
  'Blandita por fuera, competitiva por dentro. Rebota de cualquier derrota.': 'Soft on the outside, competitive on the inside. Bounces back from any loss.',
  'Bracitos cortos, ambición enorme. Solo aparece ante verdaderos campeones.': 'Tiny arms, huge ambition. Only shows up for true champions.',
  'Camisa a cuadros, mirada perdida y una rutina impecable. Nadie sabe de dónde salió.': 'Checkered shirt, blank stare and a flawless routine. Nobody knows where he came from.',
  'Construido ladrillo a ladrillo. Lento para hablar, rapidísimo para ganar.': 'Built brick by brick. Slow to talk, lightning fast to win.',
  'Cuando algo le sale bien, salta una tostada. Cuando sale mal, también.': 'When something goes right, a toast pops out. When it goes wrong, too.',
  'Diseñó cada minijuego, cada PIE y cada trampa. Nadie sabe qué hay debajo de la capucha.': 'Designed every minigame, every PIE and every trap. Nobody knows what’s under the hood.',
  'Funciona a pura energía positiva. Su antena se ilumina cuando huele una victoria.': 'Runs on pure positive energy. Its antenna lights up when it smells a win.',
  'Lee a sus rivales como un libro abierto. Y se ríe del final.': 'Reads opponents like an open book. And laughs at the ending.',
  'Llega a los duelos con planilla de Excel y corbata. No se ríe. Nunca.': 'Shows up to duels with a spreadsheet and a tie. Never laughs. Ever.',
  'Nunca aprendió a volar, así que aprendió a correr más rápido que nadie.': 'Never learned to fly, so it learned to run faster than anyone.',
  'Siempre parece dormido... hasta que cae el primer rayo.': 'Always looks asleep... until the first lightning strikes.',
  'Sobrevivió a mil asados. Símbolo universal de la neutralidad. Personaje secreto.': 'Survived a thousand barbecues. Universal symbol of neutrality. Secret character.',
  'Un tronco con palillo de tambor que marca el ritmo del duelo. Tun. Tun. Tun.': 'A log with a drumstick that keeps the beat of the duel. Tung. Tung. Tung.',
  'Una heladera con sueños competitivos. Mantiene la calma a 4 °C.': 'A fridge with competitive dreams. Stays cool at 4 °C.',
  'Vino de otra galaxia a estudiar los juegos terrestres. Ya es adicto.': 'Came from another galaxy to study Earth games. Now it’s hooked.',
  // --- escenarios
  'Bahía': 'Bay', 'Bahía Horquilla': 'Hairpin Bay', 'Dojo Neón': 'Neon Dojo', 'Neón Nocturno': 'Night Neon', 'Neón de Bienvenida': 'Welcome Neon', 'Óvalo': 'Oval', 'Óvalo Neón': 'Neon Oval', 'Volcán': 'Volcano',
  'Azotea': 'Rooftop', 'Islas': 'Islands', 'Puentes': 'Bridges', 'Pista': 'Track', 'Escenario': 'Stage', 'Panel de neón': 'Neon panel', 'Pulso Arcade': 'Arcade Pulse', 'Turbo Club': 'Turbo Club', 'Último Asalto': 'Last Round',
  'Clásico': 'Classic', 'Canción': 'Song',
  // --- configuración
  'VIDEO': 'VIDEO', 'SONIDO': 'SOUND', 'CONTROLES': 'CONTROLS', 'PREFERENCIAS': 'PREFERENCES', 'Pantalla completa': 'Fullscreen', 'PANTALLA COMPLETA': 'FULLSCREEN', 'También con F11': 'Also with F11',
  'Animaciones': 'Animations', 'Fondos, sacudidas, confeti y transiciones': 'Backgrounds, shakes, confetti and transitions', 'Calidad visual': 'Visual quality', 'Brillo neón, partículas y resolución': 'Glow, particles and resolution',
  'Alta': 'High', 'Media': 'Medium', 'Baja': 'Low', 'Desfase de ritmo': 'Rhythm offset', 'Calibra BEAT BATTLE si sentís las notas adelantadas o atrasadas': 'Calibrate BEAT BATTLE if notes feel early or late',
  'Elegí una acción y pulsá la nueva tecla. Si ya estaba en uso, se intercambia. ESC y P quedan reservadas para pausar.': 'Pick an action and press the new key. If it was already in use, they swap. ESC and P are reserved for pause.',
  'Restablecer controles': 'Reset controls', 'Tecla reservada': 'Reserved key', 'Volumen general': 'Master volume', 'Música': 'Music', 'Efectos de sonido': 'Sound effects', 'Silenciar todo': 'Mute all',
  'Música del menú y de los minijuegos': 'Menu and minigame music', 'Sonidos de botones, golpes y premios': 'Button, hit and reward sounds', 'Audio no disponible': 'Audio unavailable',
  'Los cambios se guardan automáticamente en este navegador.': 'Changes are saved automatically in this browser.', 'Elegí qué avisos ves en el juego. Las notificaciones se guardan igual en tu cuenta.': 'Choose which alerts you see in the game. Notifications are still saved to your account.',
  'Activados': 'On', 'Desactivados': 'Off', 'Atajos': 'Shortcuts', 'Durante la partida:': 'During the match:', 'Juega la compu.': 'The computer plays.', 'para pausar': 'to pause', 'o': 'or', 'Menú / pantallas': 'Menu / screens', 'Modo sin guardado': 'No-save mode',
  'El navegador bloqueó el almacenamiento local.': 'The browser blocked local storage.', 'El navegador no permite LocalStorage: las estadísticas no se conservarán.': 'The browser doesn’t allow LocalStorage: stats won’t be kept.',
  'no disponible en este navegador': 'not available in this browser', 'Idioma': 'Language', 'IDIOMA': 'LANGUAGE',
  'Abajo': 'Down', 'Arriba': 'Up', 'Izquierda': 'Left', 'Derecha': 'Right', 'IZQUIERDA': 'LEFT', 'DERECHA': 'RIGHT', 'Acción 1': 'Action 1', 'Acción 2': 'Action 2', 'ESPACIO': 'SPACE', 'BLOQ MAYÚS': 'CAPS LOCK',
  'CTRL DER.': 'R CTRL', 'CTRL IZQ.': 'L CTRL', 'SHIFT DER.': 'R SHIFT', 'SHIFT IZQ.': 'L SHIFT', 'Pulsá': 'Press', 'cuando estés listo': 'when you’re ready',
  // --- reportes
  'REPORTAR ERROR': 'REPORT BUG', 'REPORTAR UN ERROR': 'REPORT A BUG', 'Reportar un error': 'Report a bug', 'REPORTAR OTRO': 'REPORT ANOTHER', 'ENVIAR REPORTE': 'SEND REPORT', 'MIS REPORTES': 'MY REPORTS',
  'VER MIS REPORTES': 'SEE MY REPORTS', 'Reportes de errores': 'Bug reports', '¿QUÉ TIPO DE PROBLEMA?': 'WHAT KIND OF PROBLEM?', '¿QUÉ PASÓ?': 'WHAT HAPPENED?', '¿DÓNDE PASÓ?': 'WHERE DID IT HAPPEN?',
  'Qué pasó': 'What happened', 'Dónde pasó': 'Where it happened', 'Incluir datos técnicos': 'Include technical data', 'datos técnicos': 'technical data', 'Ver qué se envía': 'See what’s sent',
  'Versión del juego, navegador, tamaño de pantalla y los últimos errores. Nada personal.': 'Game version, browser, screen size and recent errors. Nothing personal.',
  '¿Qué pasó? ¿Qué estabas haciendo? ¿Pasa siempre o una sola vez? Cuanto más detalle, más fácil de arreglar.': 'What happened? What were you doing? Does it always happen or just once? The more detail, the easier to fix.',
  'Contanos qué pasó con al menos 10 letras (máximo 2000).': 'Tell us what happened in at least 10 letters (max 2000).', 'Contanos un poco más (al menos 10 letras).': 'Tell us a bit more (at least 10 letters).',
  'Lo vamos a revisar.': 'We’ll look into it.', 'Cuando lo respondamos o lo arreglemos te llega una notificación.': 'You’ll get a notification when we reply or fix it.',
  'Podés ver cómo va en MIS REPORTES (desde esta compu).': 'You can track it in MY REPORTS (from this computer).', 'Reportás como': 'Reporting as',
  'Reportás como invitado. Si iniciás sesión, te avisamos cuando lo arreglemos.': 'You’re reporting as a guest. If you log in, we’ll let you know when it’s fixed.',
  'Cuando respondemos o arreglamos un error que reportaste': 'When we reply to or fix a bug you reported', 'Buscando tus reportes…': 'Looking for your reports…', 'Cargando reportes…': 'Loading reports…',
  'No hay reportes en esta lista.': 'No reports in this list.', 'Todavía no enviaste reportes desde esta compu': 'You haven’t sent reports from this computer yet',
  'Llegaste al máximo de reportes por hoy. ¡Gracias por ayudar! Probá mañana.': 'You reached today’s report limit. Thanks for helping! Try tomorrow.', 'Reportalo': 'Report it',
  'Lo nuevo del juego. ¿Encontraste un error? Avisanos.': 'What’s new in the game. Found a bug? Let us know.', 'Solo los administradores pueden ver esto.': 'Only admins can see this.',
  'Respuesta para el jugador (opcional)': 'Reply to the player (optional)', 'Respuesta:': 'Reply:', 'Pendientes': 'Pending', 'PENDIENTE': 'PENDING', 'Revisados': 'Reviewed', 'Arreglando': 'Fixing',
  'Arreglados': 'Fixed', 'Vistos': 'Seen', '· se le avisó al jugador': '· the player was notified', 'Pendiente de envío': 'Pending upload', '¿Un error?': 'A bug?',
  'Ups, algo falló': 'Oops, something went wrong', 'Error inesperado.': 'Unexpected error.', 'El minijuego tuvo un error.': 'The minigame had an error.', 'El minijuego se cerró por un error inesperado.': 'The minigame closed due to an unexpected error.',
  'No se pudo abrir esta sección.': 'Couldn’t open this section.', 'No se pudo': 'Couldn’t do it', 'No se pudo aceptar': 'Couldn’t accept', 'No se pudo entrar': 'Couldn’t log in', 'No se pudo guardar': 'Couldn’t save',
  'Resultado no guardado': 'Result not saved', 'Operación no válida.': 'Invalid operation.', 'Sin conexión con el servidor.': 'No connection to the server.', 'Sin conexión · se juega como invitado': 'Offline · playing as guest',
  'En línea · progreso guardado en el servidor': 'Online · progress saved on the server', 'Partida enviada demasiado rápido.': 'Match submitted too fast.', 'La partida no pasó la validación del servidor.': 'The match didn’t pass server validation.',
  'La competición no pasó la validación del servidor.': 'The competition didn’t pass server validation.', 'No se pudo enviar el resultado (reintentando con el estado del servidor).': 'Couldn’t send the result (retrying with the server state).',
  'Minijuego desconocido:': 'Unknown minigame:', 'Ya guardada': 'Already saved', 'GUARDADA': 'SAVED', 'Nada por acá.': 'Nothing here.', 'No hay notificaciones nuevas.': 'No new notifications.', 'VER AVISOS': 'SEE ALERTS',
  'VER TODAS': 'SEE ALL',
  // --- botones generales
  'ACEPTAR': 'OK', 'CANCELAR': 'CANCEL', 'Cancelar': 'Cancel', 'CERRAR': 'CLOSE', 'Cerrar': 'Close', 'VOLVER': 'BACK', 'Volver': 'Back', 'SALIR': 'EXIT', 'Salir': 'Exit', 'SEGUIR': 'CONTINUE', 'Seguir': 'Continue',
  'CONTINUAR': 'CONTINUE', 'Seguir jugando': 'Keep playing', 'Quedarme': 'Stay', 'Sí': 'Yes', 'No': 'No', 'RECHAZAR': 'DECLINE', 'CAMBIAR': 'CHANGE', 'Quitar': 'Remove', 'Vaciar': 'Clear', 'Reintentar': 'Retry',
  'Repetir': 'Repeat', 'SIGUIENTE': 'NEXT', 'SIGUIENTE DESAFÍO': 'NEXT CHALLENGE', 'OTRA VEZ': 'AGAIN', 'OTRA': 'ANOTHER', 'OTRO MINIJUEGO': 'ANOTHER MINIGAME', 'REVANCHA': 'REMATCH', 'Revancha': 'Rematch',
  'TERMINAR': 'FINISH', 'VER RESULTADO': 'SEE RESULT', 'ABANDONAR': 'QUIT', 'Abandonar': 'Quit', 'ABANDONASTE': 'YOU QUIT', 'PAUSA': 'PAUSE', 'REINICIAR MINIJUEGO': 'RESTART MINIGAME', 'EMPEZAR YA': 'START NOW',
  'COMENZAR TORNEO': 'START TOURNAMENT', 'JUGAR RONDA': 'PLAY ROUND', 'VER CAMPEÓN': 'SEE CHAMPION', 'DESAFIAR': 'CHALLENGE', 'LISTO': 'READY', 'Listo': 'Ready', 'LISTA': 'READY', 'TODAVÍA NO': 'NOT YET',
  'NO TODAVÍA': 'NOT YET', 'Completar al azar': 'Fill randomly', '¿Salir de la partida?': 'Leave the match?', '¿Salir del minijuego?': 'Leave the minigame?', '¿Abandonar el torneo?': 'Quit the tournament?',
  '¿Abandonar la competición?': 'Quit the competition?', '¿Abandonar la partida online?': 'Quit the online match?', '¿Abandonar la serie?': 'Quit the series?',
  'Se perderá el progreso de esta competición.': 'This competition’s progress will be lost.', 'Se perderá el progreso de esta partida.': 'This match’s progress will be lost.',
  'Se perderá el progreso de toda la competición en curso.': 'All progress in the current competition will be lost.', 'Se perderá el progreso del torneo.': 'The tournament’s progress will be lost.',
  // --- configuración de competición
  'Configurá la competición. Gana quien sume más puntos al final.': 'Set up the competition. Whoever scores the most points at the end wins.', 'Duración': 'Duration', 'Selección': 'Selection',
  'Selección manual': 'Manual selection', 'Manual': 'Manual', 'Aleatoria': 'Random', 'Aleatorio': 'Random', 'Azar': 'Random', 'Repetir minijuegos': 'Repeat minigames', 'Un mismo juego puede salir más de una vez': 'The same game can come up more than once',
  'Elegí los minijuegos en orden. Hacé clic en un chip de la cola para quitarlo.': 'Pick the minigames in order. Click a chip in the queue to remove it.', 'Dificultad': 'Difficulty', 'Dificultad inicial': 'Starting difficulty',
  'Dificultad CAOS': 'CHAOS difficulty', 'DIFICULTAD CAOS': 'CHAOS DIFFICULTY', 'CAOS': 'CHAOS', '· CAOS': '· CHAOS', 'Según dificultad': 'Depends on difficulty', 'Velocidad y exigencia de los juegos': 'Game speed and challenge',
  'Eventos especiales': 'Special events', 'eventos especiales': 'special events', 'evento especial': 'special event', '· Eventos especiales': '· Special events', 'Evento': 'Event', 'EVENTO ·': 'EVENT ·', 'EVENTO:': 'EVENT:',
  'Modificadores sorpresa': 'Surprise modifiers', 'Modificadores sorpresa justos para ambos': 'Surprise modifiers, fair for both', 'Modificadores sorpresa, iguales para los dos': 'Surprise modifiers, the same for both',
  'Turbo, cámara lenta, controles al revés, apagón y terremoto. Iguales para los dos.': 'Turbo, slow motion, reversed controls, blackout and earthquake. The same for both.',
  'Cada vez más frecuentes': 'More and more frequent', 'Sube +10% por etapa': '+10% per stage', 'Para cada jugador': 'For each player', 'Cada ronda tiene 2 minijuegos': 'Each round has 2 minigames',
  'Cada minijuego da ELO, XP y PIES': 'Each minigame gives ELO, XP and PIES', 'Victoria 3 · Empate 1': 'Win 3 · Draw 1', 'Victoria / Empate': 'Win / Draw', 'Ganador de cada ronda': 'Winner of each round',
  'Mejor de 3': 'Best of 3', 'Mejor de 5': 'Best of 5', 'Mejor de': 'Best of', 'MEJOR DE': 'BEST OF', '· MEJOR DE': '· BEST OF', 'Partida única': 'Single match', 'PARTIDA ÚNICA': 'SINGLE MATCH', 'Única': 'Single',
  'Rápida': 'Quick', 'SIMPLE': 'SINGLE', 'DOBLE': 'DOUBLE', 'TRIPLE': 'TRIPLE', 'Reglamento': 'Rules', 'Reglas': 'Rules', 'Cómo funciona': 'How it works', 'Cómo se eligen': 'How they’re picked',
  'Los minijuegos de cada ronda se sortean sin repetirse. Al terminar una ronda, quien haya sumado más puntos en ella recibe 1 punto extra.': 'Each round’s minigames are drawn without repeats. At the end of a round, whoever scored the most points in it gets 1 extra point.',
  'La última ronda es la GRAN FINAL: cada victoria vale 6 puntos. Nada está decidido hasta el final.': 'The last round is the GRAND FINAL: each win is worth 6 points. Nothing is decided until the end.',
  'Perder un minijuego no es perder la competición: cada desafío reparte puntos. Si al final hay empate, se juega una': 'Losing a minigame isn’t losing the competition: every challenge awards points. If it’s tied at the end, there’s a',
  'Cada etapa es más rápida y exigente, y los eventos aparecen más seguido. Se registra la mejor etapa alcanzada y la mejor racha.': 'Each stage is faster and harder, and events show up more often. The best stage reached and best streak are recorded.',
  'INSCRIPCIÓN AL TORNEO': 'TOURNAMENT SIGN-UP', 'PRESENTACIÓN DEL TORNEO': 'TOURNAMENT INTRO', '¿QUIÉNES SE ENFRENTAN?': 'WHO’S FACING OFF?', 'CLASIFICACIÓN': 'STANDINGS', 'CLASIFICACIÓN FINAL': 'FINAL STANDINGS',
  'Gran final': 'Grand final', 'GRAN FINAL': 'GRAND FINAL', '¡GRAN FINAL!': 'GRAND FINAL!', 'TORNEO TERMINADO': 'TOURNAMENT OVER', 'CAMPEÓN DEL TORNEO': 'TOURNAMENT CHAMPION', 'CAMPEÓN DE DUEL CLUB': 'DUEL CLUB CHAMPION',
  'COPA DUEL CLUB': 'DUEL CLUB CUP', 'Campeón': 'Champion', 'Victorias del campeón': 'Champion’s wins', 'Derrotas del campeón': 'Champion’s losses', 'MARCADOR GENERAL': 'OVERALL SCORE', 'Marcador': 'Score',
  'RESULTADOS': 'RESULTS', 'RESUMEN': 'SUMMARY', 'Resumen': 'Summary', 'General': 'Overall', 'Serie': 'Series', 'Rondas': 'Rounds', 'Ganador': 'Winner', 'Ganaste': 'You won', 'GANASTE': 'YOU WON',
  'PERDISTE': 'YOU LOST', '¡GANASTE!': 'YOU WIN!', '¡GANASTE LA SERIE!': 'YOU WON THE SERIES!', 'PERDISTE LA SERIE': 'YOU LOST THE SERIES', 'SERIE EMPATADA': 'SERIES TIED', 'EMPATADOS': 'TIED',
  'RONDA ANULADA': 'ROUND VOIDED', 'Ronda anulada': 'Round voided', 'Anulada': 'Voided', 'RONDA EMPATADA': 'ROUND TIED', 'SE REPITE': 'REPLAY', 'La ronda no se pudo completar.': 'The round couldn’t be completed.',
  'No cuenta para nadie: se juega otra ronda.': 'It doesn’t count for anyone: another round is played.', 'PARTIDA CANCELADA': 'MATCH CANCELLED', 'TERMINADA': 'FINISHED', 'diario y semanal': 'daily & weekly', '250 niveles': '250 levels', '2v2 · EQUIPOS': '2v2 · TEAMS', 'Azul contra rojo: hasta 4 personas (teclado o joysticks) o bots compañeros.': 'Blue vs red: up to 4 people (keyboard or controllers) or bot teammates.', 'Azul contra rojo en la misma compu, con personas o bots': 'Blue vs red on the same computer, with people or bots', 'EQUIPO AZUL': 'BLUE TEAM', 'EQUIPO ROJO': 'RED TEAM', 'PERSONA': 'PERSON', 'BOT': 'BOT', 'QUITAR JOYSTICK': 'REMOVE CONTROLLER', 'JUGAR 2v2': 'PLAY 2v2',
  'Dobles: en cada equipo uno defiende el arco y el otro juega adelante.': 'Doubles: on each team one defends the goal and the other plays up front.', 'Los dos pintan para su equipo: repártanse el tablero, el escudo protege a los dos y el congelar frena a los dos rivales.': 'Both paint for their team: split the board; the shield protects both and freeze stops both opponents.',
  'Por ahora el 2v2 está en los minijuegos que se juegan bien en equipo. Vamos a sumar más a medida que estén listos.': 'For now 2v2 is available in the minigames that play well as teams. More will be added as they’re ready.', 'Pulsá A en un joystick para sumarlo. El 2v2 local da XP y PIES a las cuentas de J1 y J2; nunca ELO.': 'Press A on a controller to add it. Local 2v2 gives XP and PIES to P1 and P2 accounts; never ELO.', 'DAILY CHAOS': 'DAILY CHAOS', 'SEMANAL': 'WEEKLY', 'WEEKLY CHALLENGE': 'WEEKLY CHALLENGE', 'ENDLESS CLUB': 'ENDLESS CLUB', 'GHOST RUN': 'GHOST RUN', 'RANKING': 'RANKING',
  'Sin modificador': 'No modifier', 'TU MEJOR PUNTAJE': 'YOUR BEST SCORE', 'EMPEZAR MARATÓN': 'START MARATHON', 'TU MEJOR': 'YOUR BEST', 'ÚLTIMO INTENTO': 'LAST ATTEMPT', 'MEJOR ANTERIOR': 'PREVIOUS BEST',
  'JUGAR CONTRA ESTE': 'PLAY AGAINST THIS ONE', 'CONTRA MI MEJOR': 'AGAINST MY BEST', 'GRABAR MI FANTASMA': 'RECORD MY GHOST', 'CONTRA EL MEJOR': 'AGAINST THE BEST', 'FANTASMA': 'GHOST',
  '¡LE GANASTE A TU FANTASMA!': 'YOU BEAT YOUR GHOST!', 'EL FANTASMA GANÓ ESTA VEZ': 'THE GHOST WON THIS TIME', '¡FANTASMA GRABADO!': 'GHOST RECORDED!', 'Primera vuelta: grabá tu fantasma.': 'First run: record your ghost.',
  'Todavía no tenés fantasmas en este minijuego.': 'You don’t have ghosts in this minigame yet.', 'Todavía nadie jugó este desafío. ¡Sé el primero!': 'Nobody has played this challenge yet. Be the first!', 'Todavía nadie jugó la maratón. ¡Sé el primero!': 'Nobody has played the marathon yet. Be the first!',
  'Corré contra tu propio fantasma: ves tu intento anterior moviéndose a tu lado.': 'Race against your own ghost: you see your previous attempt moving next to you.',
  'Competí contra tu fantasma: abajo ves en vivo si vas ganando o perdiendo contra tu intento anterior.': 'Compete against your ghost: at the bottom you see live whether you’re ahead of or behind your previous attempt.',
  'Maratón infinita: minijuegos al azar con metas que suben, modificadores CAOS desde la etapa 5 y 3 vidas. Cada etapa superada suma puntos y sube el multiplicador.': 'Endless marathon: random minigames with rising goals, CHAOS modifiers from stage 5 and 3 lives. Each cleared stage adds points and raises the multiplier.',
  'Cada maratón da XP y PIES según las etapas (hasta 3 por día).': 'Each marathon gives XP and PIES based on stages (up to 3 per day).', 'Como invitado no entrás al ranking ni ganás recompensas.': 'As a guest you don’t enter the ranking or earn rewards.',
  'Cada estrella nueva da XP y PIES.': 'Each new star gives XP and PIES.', 'Participar da XP y PIES. Al terminar la semana, premio en PIES según tu puesto (top 1, 3, 10 y 25 %).': 'Taking part gives XP and PIES. When the week ends, you get PIES based on your position (top 1, 3, 10 and 25%).',
  'Como invitado podés jugar, pero no entrás al ranking.': 'As a guest you can play, but you don’t enter the ranking.', 'Como invitado no entrás al ranking.': 'As a guest you don’t enter the ranking.', 'No se pudo guardar el resultado.': 'Couldn’t save the result.',
  'Desafío semanal': 'Weekly challenge', 'Resultado del desafío semanal': 'Weekly challenge result', 'en revisión': 'under review', 'Sin vidas: fin de la maratón.': 'No lives left: the marathon is over.', '¿CASUAL O COMPETITIVA?': 'CASUAL OR COMPETITIVE?', 'Los dos tienen cuenta. Elijan cómo quieren jugar:': 'You both have accounts. Choose how you want to play:', 'CASUAL': 'CASUAL', 'COMPETITIVA': 'COMPETITIVE', 'No cambia el ELO. Suma XP y PIES como siempre.': 'ELO doesn’t change. You earn XP and PIES as usual.', 'Cambia el ELO global de los dos: el mismo del online y del ranking mundial. Tienen que confirmar los dos.': 'Changes both players’ global ELO: the same one used online and in the world ranking. Both must confirm.', 'CONFIRMO COMPETITIVA': 'I CONFIRM COMPETITIVE', '¡CONFIRMADO!': 'CONFIRMED!', ' competitiva': ' competitive', ' casual': ' casual', 'competitiva': 'competitive', 'casual': 'casual', 'JUGAR CASUAL': 'PLAY CASUAL', 'Se juega casual': 'Playing casual', 'Partida competitiva': 'Competitive match', 'El resultado va a cambiar el ELO global de los dos.': 'The result will change both players’ global ELO.', 'Hoy ya jugaron muchas partidas competitivas entre ustedes. Pueden seguir en casual; el ELO se vuelve a habilitar más adelante.': 'You two already played many competitive matches today. You can keep playing casual; ELO will be enabled again later.', 'ELO GLOBAL ACTUALIZADO': 'GLOBAL ELO UPDATED', 'SIN ELO: LÍMITE DIARIO ENTRE USTEDES': 'NO ELO: DAILY LIMIT BETWEEN YOU', 'ELO en revisión': 'ELO under review', 'Una partida competitiva local quedó en revisión antes de sumar ELO. Podés seguir jugando.': 'A local competitive match is under review before its ELO counts. You can keep playing.', 'ELO acreditado': 'ELO credited', 'Una partida competitiva local que estaba en revisión ya sumó al ranking.': 'A local competitive match that was under review now counts in the ranking.', 'PASE PERMANENTE · SIN TEMPORADAS NI REINICIOS': 'PERMANENT PASS · NO SEASONS, NO RESETS', 'PRÓXIMAS RECOMPENSAS': 'UPCOMING REWARDS', '★ PRESTIGIO': '★ PRESTIGE', 'PRESTIGIO': 'PRESTIGE', 'Archivo': 'Archive', 'ARCHIVADA': 'ARCHIVED', 'No hay pases archivados.': 'No archived passes.', 'LIBRE': 'FREE', 'Libre': 'Free', 'Si lo comprás más tarde, recibís todo lo de los niveles que ya alcanzaste.': 'If you buy it later, you get everything from the levels you already reached.', 'Tarjeta de perfil del CLUB PASS.': 'CLUB PASS profile card.', 'Skin del CLUB PASS.': 'CLUB PASS skin.', 'Marco de perfil del CLUB PASS.': 'CLUB PASS profile frame.', 'Emote del CLUB PASS.': 'CLUB PASS emote.', 'Título del CLUB PASS.': 'CLUB PASS title.', 'CLUB PASS · Prestigio': 'CLUB PASS · Prestige', 'EN CURSO': 'IN PROGRESS',
  'Ronda para tu rival. Seguimos…': 'Round to your opponent. Moving on…', 'Ronda para vos. Seguimos…': 'Round to you. Moving on…', 'Seguimos…': 'Moving on…', 'Se definió en MUERTE SÚBITA.': 'Decided in SUDDEN DEATH.',
  'DESEMPATE · MUERTE SÚBITA': 'TIEBREAK · SUDDEN DEATH', 'MUERTE SÚBITA': 'SUDDEN DEATH', '¡MUERTE SÚBITA!': 'SUDDEN DEATH!', 'Sorteando evento especial...': 'Drawing special event...',
  'Remontada de película. Nadie lo vio venir.': 'A movie-worthy comeback. Nobody saw it coming.', 'Esto se definió en el último suspiro.': 'This was decided at the very last breath.',
  'Ganó por 0,003 segundos. Qué necesidad.': 'Won by 0.003 seconds. Was that necessary?', 'Ganó por un pelo. Qué necesidad.': 'Won by a hair. Was that necessary?',
  'Eso no fue un duelo, fue un trámite.': 'That wasn’t a duel, it was paperwork.', 'Una victoria completamente innecesaria.': 'A completely unnecessary win.', 'Empate técnico, emocional y espiritual.': 'A technical, emotional and spiritual draw.',
  'La mediocridad fue compartida.': 'The mediocrity was shared.', 'Nadie quiso hacerse cargo.': 'Nobody wanted to take charge.', 'NADIE QUISO HACERSE CARGO': 'NOBODY WANTED TO TAKE CHARGE',
  'El marcador dice cero. El corazón también.': 'The scoreboard says zero. So does the heart.', 'Alguien llame a un adulto.': 'Someone call an adult.', 'Cine absoluto.': 'Absolute cinema.', 'CINE ABSOLUTO': 'ABSOLUTE CINEMA',
  'Mirada al vacío activada.': 'Thousand-yard stare activated.', 'No estaba en el contrato.': 'That wasn’t in the contract.', 'ESTO NO ESTABA EN EL CONTRATO': 'THIS WASN’T IN THE CONTRACT', 'EL NÚMERO SAGRADO': 'THE SACRED NUMBER',
  'QUÉ NECESIDAD': 'WAS THAT NECESSARY', '¿Y ESTE TIPO?': 'WHO IS THIS GUY?', 'CASI...': 'ALMOST...', '+1000 AURA': '+1000 AURA', 'Main Character': 'Main Character',
  // --- eventos / caos
  'Controles invertidos': 'Reversed controls', 'CONTROLES INVERTIDOS': 'REVERSED CONTROLS', '¡ATENCIÓN! CONTROLES INVERTIDOS': 'WARNING! REVERSED CONTROLS', 'Gravedad baja': 'Low gravity', 'GRAVEDAD BAJA': 'LOW GRAVITY',
  'Puntos dobles': 'Double points', 'PUNTUACIÓN DOBLE': 'DOUBLE SCORE', 'puntuación doble': 'double score', 'PUNTOS x2': 'POINTS x2', 'Puntos x2': 'Points x2', 'x2 PUNTOS': 'x2 POINTS', '· PUNTOS x2': '· POINTS x2',
  'Más obstáculos': 'More obstacles', 'OBSTÁCULOS EXTRA': 'EXTRA OBSTACLES', 'TIEMPO REDUCIDO': 'LESS TIME', 'VELOCIDAD AUMENTADA': 'SPEED UP', 'Velocidad x1.35': 'Speed x1.35', 'MODO ESPEJO': 'MIRROR MODE', 'ESPEJO': 'MIRROR',
  'Espejo': 'Mirror', 'MODO TILT': 'TILT MODE', 'APAGÓN': 'BLACKOUT', 'TERREMOTO': 'EARTHQUAKE', 'CÁMARA LENTA': 'SLOW MOTION', 'ZONAS DE ENERGÍA': 'ENERGY ZONES', 'SAQUE AUTOMÁTICO': 'AUTO SERVE',
  'Aparecen más obstáculos y peligros en la arena.': 'More obstacles and hazards appear in the arena.', 'Cada tanto, los controles se invierten durante unos segundos. Se avisa antes.': 'Every so often, controls reverse for a few seconds. You get a warning first.',
  'En el último tercio de la partida, todos los puntos valen el doble.': 'In the last third of the match, all points are worth double.', 'Izquierda es derecha. Arriba es abajo. Para los dos.': 'Left is right. Up is down. For both.',
  'La arena se da vuelta: cada uno juega desde el lado contrario. Las teclas siguen lo que ves en pantalla.': 'The arena flips: each player plays from the opposite side. Keys follow what you see on screen.',
  'La pantalla se da vuelta: jugás del otro lado. Tus teclas siguen lo que ves.': 'The screen flips: you play from the other side. Your keys follow what you see.',
  'La pantalla tiembla. Nadie sabe por qué.': 'The screen shakes. Nobody knows why.', 'La partida dura un 35% menos. ¡Cada segundo cuenta!': 'The match is 35% shorter. Every second counts!',
  'Saltos lunares y caídas lentas.': 'Moon jumps and slow falls.', 'Se cortó la luz del club. Se ve solo el centro.': 'The club’s power went out. Only the center is visible.',
  'Todo se mueve un 35% más rápido.': 'Everything moves 35% faster.', 'Todo va un 40% más rápido durante unos segundos.': 'Everything goes 40% faster for a few seconds.', 'El tiempo se arrastra. Aprovechá para pensar.': 'Time crawls. Use it to think.',
  // --- minijuegos: descripciones y HUD
  'Apuntá rápido. Apuntá bien. Apuntá a lo tuyo.': 'Aim fast. Aim well. Aim at your own.', 'Completá las vueltas antes que tu rival.': 'Finish the laps before your opponent.', 'Dos tiradores, un aro y cero excusas.': 'Two shooters, one hoop and zero excuses.',
  'El clásico de paletas, pero nada se queda quieto.': 'The paddle classic, but nothing stays still.', 'El más rápido del club se lleva todo.': 'The fastest in the club takes it all.', 'El suelo se acaba. Tu equilibrio, no.': 'The floor runs out. Your balance doesn’t.',
  'El tablero es de quien lo pinta.': 'The board belongs to whoever paints it.', 'Encajá, completá y mandale el problema al otro.': 'Fit, clear and send the problem to the other player.', 'Esquivá todo lo que se mueve. Y lo que está por estallar, también.': 'Dodge everything that moves. And whatever’s about to blow, too.',
  'Golpes de dibujito animado, rivalidad de verdad.': 'Cartoon punches, real rivalry.', 'La misma torre, dos escaladores, una sola cima.': 'Same tower, two climbers, one summit.', 'Lo que ves, lo usás. Lo que olvidás, lo regalás.': 'What you see, you use. What you forget, you give away.',
  'Misma canción, mismo ritmo, un solo ganador.': 'Same song, same beat, one winner.', 'Paciencia de pescador, reflejos de gato.': 'A fisherman’s patience, a cat’s reflexes.', 'Pequeños autos, grandes rivalidades.': 'Small cars, big rivalries.',
  'Tenis arcade a toda velocidad: cada rally es más rápido.': 'Full-speed arcade tennis: every rally gets faster.', 'Un laberinto a oscuras, cristales y una linterna que lo cambia todo.': 'A dark maze, crystals and a flashlight that changes everything.',
  'Hacé más puntos que tu rival en la misma canción.': 'Score more than your opponent on the same song.', 'Llegá primero a la puntuación objetivo.': 'Reach the target score first.', 'Llegá primero a la cantidad de puntos (con 2 de diferencia).': 'Reach the point total first (win by 2).',
  'Ganá 2 rondas': 'Win 2 rounds', 'Ganá 2 rondas dejando a tu rival sin vida.': 'Win 2 rounds by knocking out your opponent.', 'Ganá la mayoría de las rondas.': 'Win most of the rounds.', 'No caigas. Ganá 2 rondas.': 'Don’t fall. Win 2 rounds.',
  'Sumá más puntos antes de que termine el tiempo.': 'Score more points before time runs out.', 'Sumá más puntos pescando antes de que termine el tiempo.': 'Score more fishing points before time runs out.', 'Sumá más puntos que tu rival antes del final.': 'Score more than your opponent before the end.',
  'Sobreviví más que tu rival o tené más puntos al final.': 'Outlast your opponent or have more points at the end.', 'Ser el último con escudos, o tener más escudos al terminar.': 'Be the last one with shields, or have more shields at the end.',
  'Tener más cristales cuando se acaba el tiempo.': 'Have more crystals when time runs out.', 'Terminá con el mayor porcentaje del tablero.': 'Finish with the largest share of the board.',
  'Encontrá más parejas que tu rival (desempata el puntaje).': 'Find more pairs than your opponent (score breaks ties).', 'Llegar primero a los 150 m (o estar más alto cuando se termina el tiempo).': 'Reach 150 m first (or be higher when time runs out).',
  'Objetivo:': 'Goal:', 'Esperá la señal verde': 'Wait for the green signal', 'Reaccionar': 'React', 'Mover paleta': 'Move paddle', 'Mover pieza': 'Move piece', 'Mover cursor': 'Move cursor', 'Mover mira': 'Move crosshair',
  'Mover bote': 'Move boat', 'Moverse': 'Move', 'Moverse y pintar': 'Move and paint', 'Saltar': 'Jump', 'Saltar (también ARRIBA)': 'Jump (also UP)', 'Disparar': 'Shoot', 'Girar': 'Steer', 'Rotar': 'Rotate',
  'Caída rápida': 'Soft drop', 'Caída instantánea': 'Hard drop', 'Guardar pieza': 'Hold piece', 'Basura: ACCIÓN 2 para soltar': 'Junk: ACTION 2 to release', 'Soltar la línea': 'Release the line', 'Subir / bajar anzuelo': 'Raise / lower hook',
  'Enganchar · mantener para recoger': 'Hook · hold to reel in', 'Dar vuelta carta': 'Flip card', 'Ajustar ángulo': 'Adjust angle', 'Mantener: potencia · Soltar: lanzar': 'Hold: power · Release: shoot', 'Mantener: mira de precisión': 'Hold: precision aim',
  'Frenar / derrapar': 'Brake / drift', 'Carriles ← ↓ ↑ →': 'Lanes ← ↓ ↑ →', 'Atacar (combo / aéreo)': 'Attack (combo / air)', 'Defender · parry': 'Block · parry', 'Especial (50% energía)': 'Special (50% energy)',
  'Dash / empujón': 'Dash / push', 'Smash (justo antes del golpe)': 'Smash (right before the hit)', 'Globo / remate': 'Lob / smash', 'Super salto (con estrella)': 'Super jump (with star)', 'Sprint': 'Sprint', 'Trampa de sombra': 'Shadow trap',
  'Esquive': 'Dodge', 'Empujón': 'Push', 'Jugás con tus teclas de siempre (': 'You play with your usual keys (', '). No hay pausa:': '). There’s no pause:',
  'Velocidad': 'Speed', 'Tiempo': 'Time', 'Puntos': 'Points', 'PTS': 'PTS', '2 PTS': '2 PTS', '3 PTS': '3 PTS', 'Vidas': 'Lives', 'VIDAS': 'LIVES', '−1 VIDA': '−1 LIFE', 'ENERGÍA': 'ENERGY', 'TENSIÓN': 'TENSION', 'LÍNEAS': 'LINES', 'Líneas': 'Lines',
  'PAREJAS': 'PAIRS', 'Parejas': 'Pairs', 'Vueltas': 'Laps', 'Tiempo / vueltas': 'Time / laps', 'Mejor vuelta': 'Best lap', 'Menos tiempo': 'Least time', 'Mejor reacción': 'Best reaction', 'Reacción media': 'Average reaction',
  'Salidas en falso': 'False starts', 'Combo máximo': 'Max combo', 'Sin combo': 'No combo', 'Precisión': 'Accuracy', 'Puntos en una canción': 'Points in a song', 'Puntos en una partida': 'Points in a match', 'Aciertos': 'Hits', 'Fallos': 'Misses',
  'Errores': 'Errors', 'Errores de memoria': 'Memory errors', 'Canastas': 'Baskets', 'Aros dorados': 'Golden hoops', 'Tiros limpios': 'Clean shots', 'Tiros ganadores': 'Winners', 'Aces': 'Aces', 'Rally más largo': 'Longest rally',
  'Goles': 'Goals', 'Smashes': 'Smashes', 'Golpe': 'Hit', 'Golpes': 'Hits', 'Golpes conectados': 'Hits landed', 'Golpes recibidos': 'Hits taken', 'Golpes en una partida': 'Hits in a match', 'Daño causado': 'Damage dealt',
  'Daño causado en una partida': 'Damage dealt in a match', 'Parrys': 'Parries', 'Bloqueos': 'Blocks', 'Especiales': 'Specials', 'Esquives': 'Dodges', 'Empujones': 'Pushes', 'Empujones conectados': 'Pushes landed', 'Caídas': 'Falls',
  'Tiempo en pie': 'Time standing', 'Tiempo en pie (partida)': 'Time standing (match)', 'Altura máxima': 'Max height', 'Saltos': 'Jumps', 'Super saltos': 'Super jumps', 'Peces': 'Fish', 'Capturas': 'Catches', 'Dorado legendario': 'Legendary golden fish',
  'Medusa': 'Jellyfish', 'Bota': 'Boot', 'Lata': 'Can', 'Sardina': 'Sardine', 'Piezas': 'Pieces', 'Mejor pieza': 'Best piece', 'Filas enviadas': 'Lines sent', 'Líneas cortadas': 'Lines cut', 'Cuádruples': 'Quads',
  'Casillas pintadas': 'Tiles painted', 'Casillas robadas': 'Tiles stolen', 'Mayor % del tablero': 'Largest % of board', 'Robos': 'Steals', 'Potenciadores': 'Power-ups', 'Cristales': 'Crystals', 'Cristales juntados': 'Crystals collected',
  'Cristales en una partida': 'Crystals in a match', 'Veces atrapado': 'Times caught', 'Sprints': 'Sprints', 'Escudo activo': 'Shield active', 'Escudos restantes': 'Shields left', 'Segundos con escudos': 'Seconds with shields',
  'Tiempo con escudos': 'Time with shields', 'Minas tocadas': 'Mines hit', 'Vel. máxima': 'Top speed', 'Choques': 'Crashes', 'Carreras': 'Races', 'Repeticiones': 'Rematches', 'Copas': 'Cups', 'Palabras': 'Words',
  'Puntos (sobrevivió el ganador)': 'Points (the winner survived)', 'La jugada se hizo eterna: nuevo saque': 'The point took forever: new serve', 'Semáforo': 'Traffic light', 'Chico': 'Small', 'Mediano': 'Medium', 'Grande': 'Large',
  'LENTO': 'SLOW', 'QUIETO': 'STILL', 'TRANQUI': 'CHILL', 'AFUERA': 'OUT', 'SACA': 'SERVES', 'SAQUE': 'SERVE', 'MAL PIQUE': 'BAD BOUNCE', 'ESPECIAL LISTO': 'SPECIAL READY', 'SUPER SALTO': 'SUPER JUMP',
  'AGUANTÁ': 'HOLD ON', 'ESPERÁ': 'WAIT', 'PREPARATE': 'GET READY', 'PREPARADOS...': 'GET READY...', 'ACÁ': 'HERE', 'TUYO': 'YOURS', 'NADIE CEDE': 'NOBODY GIVES IN', 'NADIE REACCIONÓ': 'NOBODY REACTED', 'ÚLTIMO EN PIE': 'LAST ONE STANDING',
  'LIBRE': 'FREE', 'ELIGIENDO': 'CHOOSING', 'ESPERANDO': 'WAITING', 'K.O.': 'K.O.', '★ CIMA ★': '★ SUMMIT ★', '¡CIMA!': 'SUMMIT!', '¿YA?': 'NOW?', '¡YA!': 'GO!', '¡YO!': 'ME!',
  '¡A LA BANDERA!': 'TO THE FLAG!', '¡A jugar!': 'Let’s play!', '¡AMBOS SE ADELANTARON!': 'BOTH JUMPED THE GUN!', '¡ATRAPADO!': 'CAUGHT!', '¡BOMBA DE PINTURA!': 'PAINT BOMB!', '¡BRAVO!': 'BRAVO!', '¡CAYERON LOS DOS!': 'BOTH FELL!',
  '¡COMBATE TERMINADO!': 'FIGHT OVER!', '¡CONGELAR!': 'FREEZE!', '¡Congelado!': 'Frozen!', '¡EL ANILLO SE CIERRA!': 'THE RING IS CLOSING!', '¡EL ARO SE MUEVE!': 'THE HOOP IS MOVING!', '¡EMPATE EXACTO!': 'EXACT TIE!', '¡EMPATE!': 'DRAW!',
  '¡ERROR DE MEMORIA! −50': 'MEMORY ERROR! −50', '¡ESCUDO!': 'SHIELD!', '¡FALTA!': 'FOUL!', '¡FIN!': 'END!', '¡FRENESÍ!': 'FRENZY!', '¡FUERA DE COMBATE!': 'KNOCKED OUT!', '¡GENIAL!': 'GREAT!', '¡GOL!': 'GOAL!', '¡LINTERNA!': 'FLASHLIGHT!',
  '¡LISTO!': 'READY!', '¡LÁSERES!': 'LASERS!', '¡META!': 'FINISH!', '¡MULTIBOLA!': 'MULTIBALL!', '¡MURO MÓVIL!': 'MOVING WALL!', '¡NO!': 'NO!', '¡ORBES REBOTANDO!': 'BOUNCING ORBS!', '¡PALETAS MINI!': 'MINI PADDLES!', '¡PERFECTO!': 'PERFECT!',
  '¡PICADURA!': 'STING!', '¡PUNTO!': 'POINT!', '¡ROBADO!': 'STOLEN!', '¡SE ACABÓ EL TIEMPO!': 'TIME’S UP!', '¡SE CORTÓ!': 'IT SNAPPED!', '¡SIN ESCUDOS!': 'NO SHIELDS!', '¡SOBREVIVIERON!': 'THEY SURVIVED!', '¡Seguí así!': 'Keep it up!',
  '¡TIEMPO!': 'TIME!', '¡TIRA!': 'PULL!', '¡TOPE!': 'MAX!', '¡ÚLTIMA VUELTA!': 'FINAL LAP!', '¡ÚLTIMOS 10 SEGUNDOS!': 'LAST 10 SECONDS!', '¡CENTRO!': 'BULLSEYE!', '¡CUÁDRUPLE!': 'QUAD!', '¡LIMPIO!': 'SWISH!', '· ¡DORADO!': '· GOLDEN!',
  '¡UY!': 'OOPS!', '¡VAMOS!': 'LET’S GO!', '· TURBO x': '· TURBO x', 'Turbo': 'Turbo', 'TURBO': 'TURBO',
  'Defendé tu arco con la paleta. Donde la pelota toque la paleta define el ángulo, y moverte al golpear le da efecto. Pulsá ACCIÓN justo antes del contacto para un SMASH. Cada tanto, el caos cambia las reglas.': 'Defend your goal with the paddle. Where the ball hits the paddle sets the angle, and moving as you hit adds spin. Press ACTION right before contact for a SMASH. Every so often, chaos changes the rules.',
  'Mirá el panel y esperá la señal verde. En cuanto aparezca, pulsá tu botón más rápido que tu rival. Si te anticipás —o caés en una señal falsa— le regalás la ronda.': 'Watch the panel and wait for the green signal. As soon as it appears, press your button faster than your opponent. If you jump early —or fall for a fake signal— you hand them the round.',
  'Ajustá el ángulo, mantené ACCIÓN para cargar la potencia (sube y baja) y soltá para lanzar. Cada canasta te aleja del aro: desde la línea lejana vale 3. Los tiros limpios suman +1, el aro dorado da bonus y en la segunda mitad el aro se mueve.': 'Adjust the angle, hold ACTION to charge power (it goes up and down) and release to shoot. Each basket moves you further from the hoop: from the far line it’s worth 3. Clean shots add +1, the golden hoop gives a bonus and in the second half the hoop moves.',
  'Las baldosas se desmoronan si te quedás quieto encima y la arena se achica sin parar. Saltá entre plataformas, subite a las móviles, esquivá los láseres y empujá a tu rival con el dash.': 'Tiles crumble if you stand still on them and the arena keeps shrinking. Jump between platforms, ride the moving ones, dodge the lasers and push your opponent with the dash.',
  'Los autos aceleran solos: vos girás. Frená antes de las curvas cerradas para derrapar, pisá las flechas para turbo y esquivá conos, barro y a tu rival. Salirte de la pista te frena.': 'Cars accelerate by themselves: you steer. Brake before tight corners to drift, hit the arrows for turbo and dodge cones, mud and your opponent. Going off track slows you down.',
  'Cada casilla que pisás queda de tu color, incluso las de tu rival. Las casillas doradas valen doble. Agarrá potenciadores: bomba de pintura, turbo, escudo (tus casillas no se pueden robar) y congelar al rival.': 'Every tile you step on turns your color, even your opponent’s. Golden tiles are worth double. Grab power-ups: paint bomb, turbo, shield (your tiles can’t be stolen) and freeze your opponent.',
  'Combate 2D por rondas. Encadená hasta 3 golpes, atacá en el aire con una patada, bloqueá (y pulsá bloquear justo antes del impacto para un PARRY). Los golpes cargan tu energía: con ABAJO + ATAQUE lanzás un orbe especial que luego necesita enfriarse.': 'Round-based 2D fighting. Chain up to 3 hits, attack in the air with a kick, block (and press block right before impact for a PARRY). Hits charge your energy: DOWN + ATTACK fires a special orb that then needs to cool down.',
  'Movete con IZQUIERDA/DERECHA y saltá con ARRIBA. Pulsá ACCIÓN 1 cuando la pelota esté cerca para pegarle: mantené ADELANTE para un tiro profundo o ATRÁS para uno corto. ACCIÓN 2 es un globo alto (o un remate si la pelota viene alta). La pelota puede picar una sola vez en tu lado.': 'Move with LEFT/RIGHT and jump with UP. Press ACTION 1 when the ball is close to hit it: hold FORWARD for a deep shot or BACK for a short one. ACTION 2 is a high lob (or a smash if the ball comes high). The ball can bounce only once on your side.',
  'Mové el bote y la profundidad del anzuelo. Cuando un pez pase por el anzuelo, pulsá ACCIÓN para engancharlo y después MANTENÉ ACCIÓN para recoger: si la tensión llega al rojo, la línea se corta. Botas y latas restan puntos (ACCIÓN 2 suelta la línea) y las medusas te paralizan. ¿Te animás con el dorado legendario?': 'Move the boat and the hook depth. When a fish passes the hook, press ACTION to hook it and then HOLD ACTION to reel in: if the tension hits red, the line snaps. Boots and cans subtract points (ACTION 2 releases the line) and jellyfish stun you. Dare to go for the legendary golden fish?',
  'Por turnos, mové tu cursor y dá vuelta dos cartas. Si forman pareja, te la quedás y seguís jugando (las rachas suman bonus). Si fallás, pasa el turno. Equivocarte con una carta que ya se había visto es un error de memoria y resta puntos. Cada turno tiene tiempo límite.': 'Take turns moving your cursor and flipping two cards. If they match, you keep the pair and play again (streaks add a bonus). If you miss, the turn passes. Missing a card that was already seen is a memory error and costs points. Each turn has a time limit.',
  'Subí la torre saltando de plataforma en plataforma. Las grises se mueven, las agrietadas se rompen, los resortes te lanzan alto. Esquivá los láseres cuando están encendidos. Las estrellas cargan un SUPER SALTO (ACCIÓN 2). Si te caés, volvés a la última bandera.': 'Climb the tower jumping from platform to platform. Gray ones move, cracked ones break, springs launch you high. Dodge the lasers when they’re on. Stars charge a SUPER JUMP (ACTION 2). If you fall, you go back to the last flag.',
  // --- categorías de minijuegos
  'Reflejos': 'Reflexes', 'Puntería': 'Aim', 'Ritmo': 'Rhythm', 'Memoria': 'Memory', 'Lógica': 'Logic', 'Estrategia': 'Strategy', 'Habilidad': 'Skill', 'Coordinación': 'Coordination', 'Deportes': 'Sports', 'Combate': 'Fighting',
  'Plataformas': 'Platformer', 'Sigilo': 'Stealth', 'Por jugar': 'To play', 'Todavía no jugado': 'Not played yet', 'Permitidas': 'Allowed', 'Dorados': 'Golden', 'Basura': 'Junk', 'Especial': 'Special',
  'Se abre QUICK PLAY con este minijuego para elegir opciones y dificultad.': 'Opens QUICK PLAY with this minigame to choose options and difficulty.',
  'Victorias / Empates': 'Wins / Draws',
};

// ------------------------------------------------------------------ reglas para textos con variables
const N = '([\\d.,]+)';
const RULES = [
  // 2v2 y chats
  [/^Reportado: (.+) \(@(.+)\) · (\d+) reporte\(s\) en total · lo reportó @(.+)$/, (m) => `Reported: ${m[1]} (@${m[2]}) · ${m[3]} report(s) in total · reported by @${m[4]}`],
  [/^J(\d) (\d)º · J(\d) (\d)º$/, (m) => `P${m[1]} ${m[2]}${['st', 'nd', 'rd', 'th'][+m[2] - 1] || 'th'} · P${m[3]} ${m[4]}${['st', 'nd', 'rd', 'th'][+m[4] - 1] || 'th'}`],
  [/^J(\d): (\d) escudos · J(\d): (.+)$/, (m) => `P${m[1]}: ${m[2]} shields · P${m[3]}: ${m[4].replace('escudos', 'shields').replace('fuera', 'out')}`],
  [/^Insignia (.+)$/, (m) => null],
  [/^LUGAR (\d+)(?: · (.+))?$/, (m) => `SLOT ${m[1]}${m[2] ? ' · ' + (m[2] === 'INVITADO' ? 'GUEST' : m[2] === 'EQUIPO AZUL' ? 'BLUE TEAM' : m[2] === 'EQUIPO ROJO' ? 'RED TEAM' : m[2]) : ''}`],
  [/^Compu de (.+)$/, (m) => `${m[1]}’s computer`], [/^COMPUS EN LA SALA \((\d)\/4\)$/, (m) => `COMPUTERS IN THE ROOM (${m[1]}/4)`],
  [/^(\d) jugador\(es\)(.*)$/, (m) => `${m[1]} player(s)${m[2].replace(' · anfitrión', ' · host').replace(' · conexión directa', ' · direct connection').replace(' · por el servidor', ' · via server').replace(' · conectando…', ' · connecting…')}`],
  [/^Esta compu · teclas (.+)$/, (m) => `This computer · keys ${m[1]}`], [/^ELO 2v2: (.+)$/, (m) => `2v2 ELO: ${m[1]}`], [/^BOT (FÁCIL|NORMAL|DIFÍCIL|EXPERTO)$/, (m) => `BOT ${({ 'FÁCIL': 'EASY', NORMAL: 'NORMAL', 'DIFÍCIL': 'HARD', EXPERTO: 'EXPERT' })[m[1]]}`],
  [/^¡GANÓ EL EQUIPO (AZUL|ROJO)!$/, (m) => `${m[1] === 'AZUL' ? 'BLUE' : 'RED'} TEAM WINS!`], [/^¿Echar la compu de (.+)\?$/, (m) => `Kick ${m[1]}’s computer?`],
  [/^Buscando rivales… \((\d+) s · el rango de ELO se abre con el tiempo\)$/, (m) => `Searching for rivals… (${m[1]} s · the ELO range widens over time)`],
  [/^COMPETITIVO · (.+) · confirmá en (\d+) s$/, (m) => `COMPETITIVE · ${m[1]} · confirm within ${m[2]} s`], [/^2v2 (COMPETITIVO|AMISTOSO) · RONDA (\d+)$/, (m) => `2v2 ${m[1] === 'COMPETITIVO' ? 'COMPETITIVE' : 'FRIENDLY'} · ROUND ${m[2]}`],
  [/^Esperando a: (.+)$/, (m) => `Waiting for: ${m[1]}`], [/^@(.+) · chat privado$/, (m) => `@${m[1]} · private chat`], [/^Todavía no hablaste con (.+)\. ¡Saludá!$/, (m) => `You haven’t talked to ${m[1]} yet. Say hi!`],
  [/^¿Bloquear a (.+)\?$/, (m) => `Block ${m[1]}?`], [/^#(\d+) MÁS JUGADO$/, (m) => `#${m[1]} MOST PLAYED`], [/^(.+) partidas$/, (m) => (/^[\d.,]+$/.test(m[1]) ? `${m[1]} matches` : null)],
  [/^Sobre (.+) partidas registradas por todos los jugadores \(se actualiza con cada partida\)\.$/, (m) => `Out of ${m[1]} matches recorded by all players (updates with every match).`],
  [/^(.+) de (.+) ganadas · mejor (.+)$/, (m) => `${m[1]} of ${m[2]} won · best ${m[3]}`],
  // COFRES
  [/^ARMAR · (\d+) frag\.$/, (m) => `CRAFT · ${m[1]} shards`], [/^Usa (\d+) fragmentos$/, (m) => `Uses ${m[1]} shards`],
  [/^Además: (\d+) % de que en lugar de un objeto salga una bolsa de PIES de esa rareza\.$/, (m) => `Also: ${m[1]}% chance of a bag of PIES of that rarity instead of an item.`],
  [/^PASE PREMIUM: ([\d.]+) % aparte de la tabla \(si ya lo tenés, recibís una compensación especial\)\.$/, (m) => `PREMIUM PASS: ${m[1]}% on top of the table (if you already own it, you get a special compensation).`],
  [/^repetido → \+(.+) PIES · \+(\d+) frag\.$/, (m) => `duplicate → +${m[1]} PIES · +${m[2]} shards`], [/^Bolsa de (.+) PIES$/, (m) => `Bag of ${m[1]} PIES`],
  [/^Ya lo tenías: se convirtió en \+(.+) PIES y \+(\d+) fragmentos\.$/, (m) => `You already had it: it became +${m[1]} PIES and +${m[2]} shards.`],
  [/^Ya lo tenías, así que recibís una compensación especial: \+(.+) PIES y \+(\d+) fragmentos\.$/, (m) => `You already had it, so you get a special compensation: +${m[1]} PIES and +${m[2]} shards.`],
  [/^¿Comprar un (cofre de bronce|cofre de plata|cofre de oro)\?$/, (m) => `Buy a ${({ 'cofre de bronce': 'bronze', 'cofre de plata': 'silver', 'cofre de oro': 'gold' })[m[1]]} chest?`],
  [/^Cuesta (.+) PIES\. También se consiguen jugando, sin gastar nada\.$/, (m) => `Costs ${m[1]} PIES. You can also get them by playing, for free.`],
  [/^Armaste un cofre con (\d+) fragmentos\.$/, (m) => `You crafted a chest with ${m[1]} shards.`],
  // HISTORIA y PUZZLE CLUB
  [/^CAPÍTULO (\d+)(?: · (.+))?$/, (m) => `CHAPTER ${m[1]}${m[2] ? ' · ' + m[2] : ''}`], [/^Etapa (\d+) de (\d+) · (.+)$/, (m) => `Stage ${m[1]} of ${m[2]} · ${tr(m[3])}`],
  [/^(\d+) \/ (\d+) etapas$/, (m) => `${m[1]} / ${m[2]} stages`], [/^(\d+) \/ (\d+) resueltos$/, (m) => `${m[1]} / ${m[2]} solved`], [/^(\d+) intentos$/, (m) => `${m[1]} attempts`],
  [/^Rival: (.+)$/, (m) => `Rival: ${m[1]}`], [/^Cada capítulo completo: \+(\d+) XP y \+(\d+) PIES\.$/, (m) => `Each completed chapter: +${m[1]} XP and +${m[2]} PIES.`],
  [/^\+(\d+) XP · \+(\d+) PIES \(con tu cuenta, una sola vez\)$/, (m) => `+${m[1]} XP · +${m[2]} PIES (with your account, only once)`],
  [/^([A-Za-zÁÉÍÓÚáéíóúñ %]+) (\d+) ?\/ ?(\d+)(?: · ([A-Za-zÁÉÍÓÚáéíóúñ ]+) (\d+)\/(\d+))?$/, (m) => (STORY_UI_EN[m[1]] ? `${STORY_UI_EN[m[1]]} ${m[2]}/${m[3]}${m[4] ? ` · ${STORY_UI_EN[m[4]] || m[4]} ${m[5]}/${m[6]}` : ''}` : null)],
  [/^¡Lo lograste con (\d+) (.+)!$/, (m) => `You did it with ${m[1]} ${(STORY_UI_EN[m[2][0].toUpperCase() + m[2].slice(1)] || m[2]).toLowerCase()}!`],
  [/^Te pasaste de (\d+) (.+)\.$/, (m) => `You went over ${m[1]} ${(STORY_UI_EN[m[2][0].toUpperCase() + m[2].slice(1)] || m[2]).toLowerCase()}.`],
  [/^Se terminaron los (.+)\.$/, (m) => `You ran out of ${(STORY_UI_EN[m[1][0].toUpperCase() + m[1].slice(1)] || m[1]).toLowerCase()}.`],
  [/^Demasiados (.+) \(máximo (\d+)\)\.$/, (m) => `Too many ${(STORY_UI_EN[m[1][0].toUpperCase() + m[1].slice(1)] || m[1]).toLowerCase()} (max ${m[2]}).`],
  [/^(.+) no se puede asignar \(se usa para pausar o el navegador\)\.$/, (m) => `${m[1]} can’t be assigned (used for pause or by the browser).`],
  [/^CLUB PASS · Nivel (\d+)( · Premium)?$/, (m) => `CLUB PASS · Level ${m[1]}${m[2] || ''}`], [/^PRESTIGIO (\d+)$/, (m) => `PRESTIGE ${m[1]}`], [/^Prestigio (\d+) · nivel (\d+)(.*)$/, (m) => `Prestige ${m[1]} · level ${m[2]}${m[3]}`], [/^nivel (\d+)$/, (m) => `level ${m[1]}`],
  [/^Bono de regreso: tus próximos (.+) XP de pase cuentan doble\.$/, (m) => `Comeback bonus: your next ${m[1]} pass XP count double.`],
  [/^Viendo el progreso de (.+)\. Toda la XP que ganás sube el CLUB PASS, para siempre\.$/, (m) => `Viewing ${m[1]}’s progress. All the XP you earn levels up the CLUB PASS, forever.`],
  [/^Nivel (\d+) · (Libre|Premium)$/, (m) => `Level ${m[1]} · ${m[2] === 'Libre' ? 'Free' : 'Premium'}`], [/^(\d+)–(\d+)$/, (m) => m[0]],
  [/^PASE PREMIUM · (.+)$/, (m) => `PREMIUM PASS · ${m[1]}`], [/^RECLAMAR TODO \((\d+)\)$/, (m) => `CLAIM ALL (${m[1]})`],
  [/^Después del nivel (\d+) el pase sigue para siempre: cada nivel pide (.+) XP y cada 10 niveles hay premio\. Los niveles 300, 400, 500, 750 y 1000 dan títulos de prestigio\.$/, (m) => `After level ${m[1]} the pass keeps going forever: each level needs ${m[2]} XP and every 10 levels there’s a reward. Levels 300, 400, 500, 750 and 1000 give prestige titles.`],
  [/^Cuesta (.+) PIES \(te quedarían (.+)\)\. Es para siempre: se compra una sola vez y no vence\. Las recompensas Premium de los (\d+) niveles que ya alcanzaste quedan para reclamar\.$/, (m) => `Costs ${m[1]} PIES (you’d have ${m[2]} left). It’s forever: bought once, never expires. The Premium rewards of the ${m[3]} levels you already reached become claimable.`],
  [/^(\d+) recompensas reclamadas$/, (m) => `${m[1]} rewards claimed`],
  [/^ELO EN REVISIÓN \((.+)\)$/, (m) => `ELO UNDER REVIEW (${m[1]})`],
  [/^Meta: ★ (.+) · ★★ (.+) · ★★★ (.+)$/, (m) => `Goal: ★ ${m[1]} · ★★ ${m[2]} · ★★★ ${m[3]}`], [/^Meta de la etapa: (menos de|al menos) (.+)$/, (m) => `Stage goal: ${m[1] === 'menos de' ? 'under' : 'at least'} ${m[2]}`],
  [/^Superá a tu fantasma: (.+)$/, (m) => `Beat your ghost: ${m[1]}`], [/^ENDLESS CLUB · ETAPA (\d+)(.*)$/, (m) => `ENDLESS CLUB · STAGE ${m[1]}${m[2]}`],
  [/^¡ETAPA (\d+) SUPERADA! \+(\d+) puntos · multiplicador x(.+)$/, (m) => `STAGE ${m[1]} CLEARED! +${m[2]} points · multiplier x${m[3]}`], [/^No llegaste a la meta: perdés una vida \(quedan (\d+)\)\.$/, (m) => `You missed the goal: you lose a life (${m[1]} left).`],
  [/^Puntos: (\d+) · Etapas superadas: (\d+)$/, (m) => `Points: ${m[1]} · Stages cleared: ${m[2]}`], [/^(.+) puntos · (\d+) etapas$/, (m) => `${m[1]} points · ${m[2]} stages`],
  [/^Puesto (\d+)(.*)$/, (m) => `Rank ${m[1]}${tr(m[2])}`], [/^Vos: (.+?)( · Fantasma: (.+))?$/, (m) => `You: ${m[1]}${m[3] ? ' · Ghost: ' + m[3] : ''}`], [/^FANTASMA (.+)$/, (m) => `GHOST ${m[1]}`],
  [/^El mismo desafío para todos, hoy\. Cambia en (.+)\.$/, (m) => `The same challenge for everyone, today. Changes in ${m[1]}.`],
  [/^El mismo desafío para todos durante la semana\. Intentos ilimitados: cuenta tu mejor resultado\. Termina en (.+)\.$/, (m) => `The same challenge for everyone all week. Unlimited attempts: your best result counts. Ends in ${m[1]}.`],
  [/^Dificultad: (.+)$/, (m) => `Difficulty: ${tr(m[1])}`], [/^TU MEJOR · (\d+) intentos$/, (m) => `YOUR BEST · ${m[1]} attempts`], [/^TU MEJOR · (.+)$/, (m) => `YOUR BEST · ${m[1] === 'sin estrellas' ? 'no stars' : m[1]}`],
  [/^Terminaste en el puesto (\d+) de (\d+)(: \+(\d+) PIES\.|\. Premio: (\d+) PIES\.)$/, (m) => `You finished in position ${m[1]} of ${m[2]}: +${m[4] || m[5]} PIES.`],
  [/^J(\d) · EQUIPO (AZUL|ROJO)$/, (m) => `P${m[1]} · ${m[2] === 'AZUL' ? 'BLUE' : 'RED'} TEAM`], [/^Joystick (\d+)(: pulsá A cuando estés listo)?$/, (m) => `Controller ${m[1]}${m[2] ? ': press A when ready' : ''}`],
  [/^Ahora controla a J(\d)\.$/, (m) => `It now controls P${m[1]}.`], [/^2v2 · GANA EL EQUIPO (AZUL|ROJO)$/, (m) => `2v2 · ${m[1] === 'AZUL' ? 'BLUE' : 'RED'} TEAM WINS`], [/^2v2 · EMPATE$/, () => '2v2 · DRAW'],
  [/^Etapa (\d+)$/, (m) => `Stage ${m[1]}`], [/^Etapa (\d+) · más difícil$/, (m) => `Stage ${m[1]} · harder`], [/^Llegaste a la etapa (\d+)$/, (m) => `You reached stage ${m[1]}`],
  [/^(\d+) superadas · (.+)$/, (m) => `${m[1]} cleared · ${tr(m[2])}`], [/^(\d+) etapas superadas · (.+)$/, (m) => `${m[1]} stages cleared · ${tr(m[2])}`], [/^(\d+) \/ 16 etapas$/, (m) => `${m[1]} / 16 stages`],
  [/^ESCALERA · ETAPA (.+)$/, (m) => `LADDER · STAGE ${m[1]}`], [/^Perdiste una vida · quedan (\d+)\. Se repite la etapa\.$/, (m) => `You lost a life · ${m[1]} left. The stage repeats.`],
  [/^¡ETAPA SUPERADA! Sigue: (.+)$/, (m) => `STAGE CLEARED! Next: ${m[1]}`], [/^Meta: (.+) \(3 estrellas\)$/, (m) => `Goal: ${m[1]} (3 stars)`], [/^Meta: (.+)$/, (m) => `Goal: ${tr(m[1])}`], [/^Récord: (.+)$/, (m) => `Best: ${m[1]}`],
  [/^(\d+) min (\d+) s$/, (m) => `${m[1]} min ${m[2]} s`], [/^(.+) · récord: (.+)$/, (m) => `${m[1]} · best: ${m[2]}`],
  [/^Contra este bot en (.+): (\d+) ganadas · (\d+) perdidas · (\d+) empates$/, (m) => `Against this bot in ${m[1]}: ${m[2]} won · ${m[3]} lost · ${m[4]} draws`],
  [/^Todavía no jugaste (.+) contra el bot (.+)\.$/, (m) => `You haven’t played ${m[1]} against the ${tr(m[2])} bot yet.`],
  [/^Con la cuenta de J1 \((.+)\) ganás XP y PIES reducidos y sumás desafíos\. Nunca da ELO\.$/, (m) => `With P1’s account (${m[1]}) you earn reduced XP and PIES and progress challenges. Never gives ELO.`],
  [/^BOT (.+)$/, (m) => `BOT ${tr(m[1])}`], [/^Bot (.+)$/, (m) => `${tr(m[1])} bot`], [/^VS BOT · (.+)$/, (m) => `VS BOT · ${tr(m[1])}`], [/^VS BOT (.+)$/, (m) => `VS BOT ${tr(m[1])}`],
  [/^Nivel (\d+)$/, (m) => `Level ${m[1]}`], [/^Nivel (\d+) del CLUB PASS \(prestigio\)\.$/, (m) => `CLUB PASS level ${m[1]} (prestige).`], [/^Nivel (\d+) \/ (\d+)(.*)$/, (m) => `Level ${m[1]} / ${m[2]}${tr(m[3])}`], [/^Nivel (\d+) · (.+) ELO · (.+) partidas$/, (m) => `Level ${m[1]} · ${m[2]} ELO · ${m[3]} matches`],
  [/^Nivel (\d+) · (.+) partidas hoy$/, (m) => `Level ${m[1]} · ${m[2]} matches today`], [/^NV (\d+)$/, (m) => `LV ${m[1]}`], [/^NV$/, () => 'LV'],
  [/^Jugador (\d)$/, (m) => `Player ${m[1]}`], [/^J(\d)$/, (m) => `P${m[1]}`], [/^Puesto J(\d)$/, (m) => `Seat P${m[1]}`], [/^J(\d) · (.+)$/, (m) => `P${m[1]} · ${tr(m[2])}`], [/^Nombre del jugador (\d)$/, (m) => `Player ${m[1]} name`],
  [/^Entraste como J(\d)\.$/, (m) => `You joined as P${m[1]}.`], [/^Jugando como J(\d)\.$/, (m) => `Playing as P${m[1]}.`], [/^Conectado como (.+) \(J(\d)\)$/, (m) => `Connected as ${m[1]} (P${m[2]})`],
  [/^Esa cuenta ya está jugando como J(\d)\.$/, (m) => `That account is already playing as P${m[1]}.`],
  [/^Que inicie sesión como J(\d) en esta compu para que la partida cuente para los dos\.$/, (m) => `Have them log in as P${m[1]} on this computer so the match counts for both.`],
  [/^RONDA (\d+)$/, (m) => `ROUND ${m[1]}`], [/^ONLINE · RONDA (.+)$/, (m) => `ONLINE · ROUND ${m[1].replace('MEJOR DE', 'BEST OF')}`], [/^VUELTA (\d+)$/, (m) => `LAP ${m[1]}`], [/^Vuelta (.+)$/, (m) => `Lap ${m[1]}`],
  [/^TURNO J(\d) · (\d+) parejas restantes$/, (m) => `P${m[1]}'S TURN · ${m[2]} pairs left`], [/^Combo (.+)$/, (m) => `Combo ${m[1]}`], [/^Rally (.+)$/, (m) => `Rally ${m[1]}`],
  [/^Meta: (\d+) m · caídas (\d+)$/, (m) => `Goal: ${m[1]} m · falls ${m[2]}`], [/^Límite en (\d+) s$/, (m) => `Limit in ${m[1]} s`], [/^en (\d+) s$/, (m) => `in ${m[1]} s`], [/^Fuera · (.+)$/, (m) => `Out · ${m[1]}`],
  [/^Esquive (.+) · Empujón (.+)$/, (m) => `Dodge ${tr(m[1])} · Push ${tr(m[2])}`], [/^Sprint (.+) · Trampa (.+)$/, (m) => `Sprint ${tr(m[1])} · Trap ${tr(m[2])}`],
  [/^CAOS · (.+)$/, (m) => `CHAOS · ${tr(m[1])}`], [/^Gana con (.+)$/, (m) => `First to ${m[1]}`], [/^Punto para (.+)$/, (m) => `Point for ${m[1]}`], [/^Saca (.+?): ACCIÓN cuando baje la pelota(.*)$/, (m) => `${m[1]} serves: ACTION when the ball drops${m[2]}`],
  [/^¡(\d+) filas entrantes!$/, (m) => `${m[1]} incoming lines!`], [/^\+(\d+) ¡CENTRO!$/, (m) => `+${m[1]} BULLSEYE!`], [/^\+(\d+) ¡LIMPIO!$/, (m) => `+${m[1]} SWISH!`],
  [/^Ganó (.+)$/, (m) => `${m[1]} won`], [/^Gana (.+)$/, (m) => `${m[1]} wins`], [/^Victorias (.+)$/, (m) => `${m[1]} wins`], [/^¡(.+) está listo!$/, (m) => `${m[1]} is ready!`], [/^Esperando a (.+)…$/, (m) => `Waiting for ${m[1]}…`],
  [/^hace (\d+) (min|h|d)$/, (m) => `${m[1]} ${m[2]} ago`], [/^Activo (.+)$/, (m) => `Active ${tr(m[1])}`], [/^Enviada (.+)$/, (m) => `Sent ${tr(m[1])}`], [/^Desbloqueado (.+)$/, (m) => `Unlocked ${tr(m[1])}`],
  [/^Última actividad: (.+)$/, (m) => `Last active: ${tr(m[1])}`], [/^Miembro desde (.+)$/, (m) => `Member since ${m[1]}`], [/^Cambian en (\d+) h$/, (m) => `Reset in ${m[1]} h`], [/^Se renuevan en (.+)$/, (m) => `Reset in ${m[1]}`],
  [/^Ahora sos amigo de (.+)$/, (m) => `You’re now friends with ${m[1]}`], [/^Ahora te llamás (.+)\.$/, (m) => `Your name is now ${m[1]}.`], [/^¿Quitar a (.+)\?$/, (m) => `Remove ${m[1]}?`], [/^Invitá a (.+)$/, (m) => `Invite ${m[1]}`],
  [/^Le avisamos a (.+)\. Esperando que acepte…$/, (m) => `We notified ${m[1]}. Waiting for them to accept…`], [/^Ver como (.+)$/, (m) => `View as ${m[1]}`],
  [/^Mis amigos(.*)$/, (m) => `My friends${m[1]}`], [/^Solicitudes(.*)$/, (m) => `Requests${m[1]}`], [/^De invitado(.*)$/, (m) => `As guest${m[1]}`],
  [/^Cambiar nombre visible \((.+)\)$/, (m) => `Change display name (${m[1]})`], [/^Eliminar la cuenta @(.+)$/, (m) => `Delete account @${m[1]}`],
  [/^Se cierra la sesión de @(.+) en esta compu\. El progreso queda guardado en el servidor\.$/, (m) => `@${m[1]} is logged out on this computer. Progress stays saved on the server.`],
  [/^Se borran XP, PIES, ELO, logros, inventario, amigos e historial de @(.+)\.$/, (m) => `XP, PIES, ELO, achievements, inventory, friends and history of @${m[1]} are deleted.`],
  [/^Para ELIMINAR la cuenta @(.+) escribí tu contraseña\. Se borra todo su progreso y no se puede deshacer\.$/, (m) => `To DELETE account @${m[1]} enter your password. All its progress is erased and it can’t be undone.`],
  [/^La sesión de (.+) expiró\. Volvé a iniciar sesión\.$/, (m) => `${m[1]}’s session expired. Log in again.`], [/^Entraste con (.+)\. Elegí cómo te van a ver en el CLUB\.$/, (m) => `You logged in with ${tr(m[1])}. Choose how others will see you in the CLUB.`],
  [/^Te mandamos un link a (.+)\. Abrilo en este mismo navegador\.$/, (m) => `We sent a link to ${m[1]}. Open it in this same browser.`],
  [/^Cuesta (.+) PIES\. Te quedarían (.+) PIES\.$/, (m) => `Costs ${m[1]} PIES. You’d have ${m[2]} PIES left.`], [/^Cuesta (.+) PIES y tenés (.+)\.$/, (m) => `Costs ${m[1]} PIES and you have ${m[2]}.`],
  [/^Cuesta (.+) PIES \(te quedarían (.+)\)\. Es para (.+) y se compra una sola vez\.(.*)$/, (m) => `Costs ${m[1]} PIES (you’d have ${m[2]} left). It’s for ${m[3]} and is bought only once.${m[4].replace(/Las recompensas Premium de los (\d+) niveles/, 'The Premium rewards of the $1 levels')}`],
  [/^¿Comprar (.+)\?$/, (m) => `Buy ${tr(m[1])}?`], [/^TE FALTAN (.+) PIES$/, (m) => `YOU NEED ${m[1]} MORE PIES`], [/^TENÉS (\d+) RECOMPENSAS? PARA RECLAMAR$/, (m) => `YOU HAVE ${m[1]} REWARD${m[1] === '1' ? '' : 'S'} TO CLAIM`],
  [/^NO LE QUEDA A (.+)$/, (m) => `DOESN’T FIT ${m[1]}`], [/^Bloqueado · (.+)$/, (m) => `Locked · ${tr(m[1])}`], [/^saldo (.+)$/, (m) => `balance ${m[1]}`],
  [/^\+(.+) PIES por la serie$/, (m) => `+${m[1]} PIES for the series`], [/^\+(.+) XP por la serie$/, (m) => `+${m[1]} XP for the series`],
  [/^Pase de Batalla · (.+)$/, (m) => `Battle Pass · ${tr(m[1])}`], [/^Temporada (\d+) · Club Caótico$/, (m) => `Season ${m[1]} · Chaos Club`], [/^Temporada (\d+)$/, (m) => `Season ${m[1]}`],
  [/^Viendo el progreso de (.+)\. Toda la XP que ganás en la temporada sube el pase\.$/, (m) => `Viewing ${m[1]}’s progress. All XP you earn this season levels up the pass.`],
  [/^Desafíos · (.+)$/, (m) => `Challenges · ${m[1]}`], [/^Próximo rango: \+(.+) XP y \+(.+) PIES(.*)\.$/, (m) => `Next rank: +${m[1]} XP and +${m[2]} PIES${tr(m[3])}.`],
  [/^Mejor histórica: (.+) · (.+)$/, (m) => `All-time best: ${m[1]} · ${tr(m[2])}`], [/^Mejor: (.+)$/, (m) => `Best: ${m[1]}`], [/^Jugado (\d+) (vez|veces)$/, (m) => `Played ${m[1]} time${m[1] === '1' ? '' : 's'}`],
  [/^Dominio de (.+)$/, (m) => `${m[1]}’s mastery`], [/^Maestro (de|en) (.+)$/, (m) => `${m[2]} Master`], [/^Rango Maestro en (.+)\.$/, (m) => `Master rank in ${m[1]}.`], [/^Llegá al rango Maestro en (.+)\.$/, (m) => `Reach Master rank in ${m[1]}.`],
  [/^Skin exclusiva del rango Maestro en (.+)\.$/, (m) => `Exclusive skin for Master rank in ${m[1]}.`], [/^Especialista en (.+)$/, (m) => `${m[1]} specialist`], [/^Dominando (.+)$/, (m) => `Mastering ${m[1]}`], [/^Debut en (.+)$/, (m) => `Debut in ${m[1]}`],
  [/^Ganá tu primera partida de (.+)\.$/, (m) => `Win your first ${m[1]} match.`], [/^Ganá (\d+) partidas seguidas de (.+)\.$/, (m) => `Win ${m[1]} ${m[2]} matches in a row.`], [/^Ganá (\d+) partidas de (.+)\.$/, (m) => `Win ${m[1]} ${m[2]} matches.`],
  [/^¡Logro de (.+)!$/, (m) => `${m[1]}’s achievement!`], [/^¡Récord mundial de (.+)!$/, (m) => `${m[1]}’s world record!`], [/^Nuevo récord de (.+) para (.+)\.$/, (m) => `New ${m[1]} record for ${m[2]}.`],
  [/^Reflejo más rápido: (.+) con (\d+) ms\.$/, (m) => `Fastest reflex: ${m[1]} with ${m[2]} ms.`], [/^Final de infarto en (.+): (.+) vs (.+)\.$/, (m) => `Nail-biting finish in ${m[1]}: ${m[2]} vs ${m[3]}.`],
  [/^Paliza en (.+): (.+) ganó (.+) a (.+)\.$/, (m) => `Blowout in ${m[1]}: ${m[2]} won ${m[3]} to ${m[4]}.`], [/^¡Remontada! (.+) llegó a estar (\d+) puntos abajo\.$/, (m) => `Comeback! ${m[1]} was down by ${m[2]} points.`],
  [/^Bonus de ronda: (.+)\.$/, (m) => `Round bonus: ${m[1]}.`], [/^Mejores rachas: (.+)\.$/, (m) => `Best streaks: ${m[1]}.`], [/^La ronda (\d+) terminó empatada: no hay bonus\.$/, (m) => `Round ${m[1]} ended tied: no bonus.`],
  [/^Cara a cara: (.+)$/, (m) => `Head to head: ${m[1].replace(/empates?/g, 'draws')}`], [/^empates · (.+) partidas$/, (m) => `draws · ${m[1]} matches`], [/^victorias · (.+) pts de dominio$/, (m) => `wins · ${m[1]} mastery pts`],
  [/^victorias · (.+)$/, (m) => `wins · ${m[1]}`], [/^Reporte #(\d+)$/, (m) => `Report #${m[1]}`], [/^Marcado como (.+?)(\.| · se le avisó al jugador\.)$/, (m) => `Marked as ${tr(m[1])}${m[2] === '.' ? '.' : ' · the player was notified.'}`],
  [/^ \(@(.+)\)\. Te avisamos cuando lo arreglemos\.$/, (m) => ` (@${m[1]}). We’ll let you know when it’s fixed.`],
  [/^Sin señal hace (\d+) s\. Si vuelve, la partida sigue sola; si no, ganás por abandono\.$/, (m) => `No signal for ${m[1]} s. If it comes back, the match continues; if not, you win by forfeit.`],
  [/^En línea · enviando (\d+)$/, (m) => `Online · sending ${m[1]}`], [/^Sin conexión · (\d+) partidas en espera$/, (m) => `Offline · ${m[1]} matches pending`],
  [/^Guardado local: (.+) · Servidor: (.+)$/, (m) => `Local save: ${m[1] === 'disponible' ? 'available' : tr(m[1])} · Server: ${tr(m[2])}`],
  [/^VOS · (.+)$/, (m) => `YOU · ${m[1].replace('SERVIDOR', 'SERVER')}`], [/^Victoria (\d) · Empate (\d)$/, (m) => `Win ${m[1]} · Draw ${m[2]}`], [/^(\d+) N EN LÍNEA$/, (m) => `${m[1]} ONLINE`], [/^(.+) EN LÍNEA$/, (m) => `${m[1]} ONLINE`],
  [/^\+(.+) XP · \+(.+) PIES(.*)$/, (m) => `+${m[1]} XP · +${m[2]} PIES${m[3]}`], [/^(\d+) ganadas?$/, (m) => `${m[1]} won`], [/^(\d+) partidas?$/, (m) => `${m[1]} match${m[1] === '1' ? '' : 'es'}`],
  [/^¡(.+) GANA LA RONDA!$/, (m) => `${m[1]} WINS THE ROUND!`], [/^(\d+) GOLPES$/, (m) => `${m[1]} HITS`], [/^RONDA (\d+) · (.+)$/, (m) => `ROUND ${m[1]} · ${m[2]}`],
  [/^(\d) (vidas?) · ganá 2 rondas$/, (m) => `${m[1]} li${m[1] === '1' ? 'fe' : 'ves'} · win 2 rounds`], [/^¡(.+) ES EL CAZADOR!$/, (m) => `${m[1]} IS THE HUNTER!`],
  [/^SACA (.+): ACCIÓN cuando baje la pelota(?: · automático en (\d+))?$/, (m) => `${m[1]} SERVES: ACTION when the ball drops${m[2] ? ` · auto in ${m[2]}` : ''}`], [/^ESPECIAL ([\d.]+) s$/, (m) => `SPECIAL ${m[1]} s`],
  [/^(\d+) minijuegos?$/, (m) => `${m[1]} minigame${m[1] === '1' ? '' : 's'}`], [/^(\d+) rondas?$/, (m) => `${m[1]} round${m[1] === '1' ? '' : 's'}`], [/^(\d+) vidas?$/, (m) => `${m[1]} li${m[1] === '1' ? 'fe' : 'ves'}`],
];
for (const [k, v] of Object.entries(DATA_EN)) if (!(k in D)) D[k] = v;
for (const [k, v] of Object.entries({ ...STORY_EN, ...PUZZLE_EN, ...STORY_UI_EN, ...CHEST_EN, ...CHEST_UI_EN, ...V2_UI_EN })) if (!(k in D)) D[k] = v;
// objetos generados (CLUB PASS): traen su nombre en inglés
for (const it of ALL_ITEMS) {
  if (it.en && !(it.name in D)) D[it.name] = it.en;
  if (it.text && it.textEn && !(it.text in D)) D[it.text] = it.textEn;
}
RULES.push(...DATA_RULES,
  [/^Logro: (.+)$/, (m) => `Achievement: ${tr(m[1])}`], [/^Maestría: (.+)$/, (m) => `Mastery: ${m[1]}`], [/^"(.+?)"(\.?)$/, (m) => `"${tr(m[1])}"${m[2]}`]);
// palabras cortas que aparecen pegadas a números ("3 vueltas", "Nivel 4"...)
const SUFFIX_OK = /^[\d.,:+\-−×x%/★♥\s]+$/;

// versión en MAYÚSCULAS de todo el diccionario ("PUNTERÍA" → "AIM")
const UP = new Map();
const cache = new Map();
function core(b) {
  let t = D[b];
  if (t != null) return t;
  if (b.length > 2 && b === b.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(b)) {
    if (!UP.size) for (const [k, v] of Object.entries(D)) { const K = k.toUpperCase(); if (!(K in D) && !UP.has(K)) UP.set(K, v.toUpperCase()); }
    t = UP.get(b);
    if (t != null) return t;
  }
  for (const r of RULES) {
    if (!Array.isArray(r)) continue; // protección: una regla mal escrita no puede romper el juego
    const [re, fn] = r;
    const m = re.exec(b);
    if (m) { const o = fn(m); if (o != null) return o; }
  }
  // símbolos o separadores al principio ("· CAOS", "★ ...")
  let m = /^([·★✓◀▶•\s]+)(.+)$/.exec(b);
  if (m) { const r = core(m[2]); if (r !== m[2]) return m[1] + r; }
  m = /^(.+?)([\s·▶◀★]+)$/.exec(b);
  if (m) { const r = core(m[1]); if (r !== m[1]) return r + m[2]; }
  // partes separadas por " · "
  if (b.includes(' · ')) {
    const parts = b.split(' · ');
    let changed = false;
    const out = parts.map((p) => { const r = core(p); if (r !== p) changed = true; return r; });
    if (changed) return out.join(' · ');
  }
  // número + frase conocida, o frase conocida + número
  m = /^([\d.,:+\-−×x%/\s]+)(\D.*)$/.exec(b);
  if (m && D[m[2].trim()] != null) return m[1] + D[m[2].trim()];
  m = /^(.*\D)(\s*[\d.,:+\-−×x%/]+)$/.exec(b);
  if (m && D[m[1].trim()] != null && SUFFIX_OK.test(m[2])) return D[m[1].trim()] + (m[1].endsWith(' ') ? ' ' : '') + m[2].trim();
  return b;
}
/** Traduce un texto al idioma actual (en español devuelve lo mismo). */
export function tr(s) {
  if (LANG === 'es' || typeof s !== 'string' || !s) return s;
  if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ¡¿]/.test(s)) return s;
  let c = cache.get(s);
  if (c !== undefined) return c;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
  c = m[2] ? m[1] + core(m[2]) + m[3] : s;
  if (cache.size > 6000) cache.clear();
  cache.set(s, c);
  return c;
}

// ------------------------------------------------------------------ traducción en vivo de la interfaz
const ATTRS = ['title', 'placeholder', 'aria-label', 'data-label'];
function skip(node) {
  const p = node.parentElement;
  return !p || p.closest('[data-noi18n],script,style,textarea,code');
}
function trNode(n) {
  if (n.nodeType === 3) {
    if (skip(n)) return;
    const v = n.nodeValue, t = tr(v);
    if (t !== v) n.nodeValue = t;
  } else if (n.nodeType === 1) {
    if (n.closest('[data-noi18n],script,style')) return;
    for (const a of ATTRS) {
      const v = n.getAttribute(a);
      if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); }
    }
    if (n.tagName === 'INPUT' && (n.type === 'button' || n.type === 'submit') && n.value) n.value = tr(n.value);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let x;
    while ((x = w.nextNode())) {
      if (x.nodeType === 3) trNode(x);
      else for (const a of ATTRS) { const v = x.getAttribute(a); if (v) { const t = tr(v); if (t !== v) x.setAttribute(a, t); } }
    }
  }
}

export function installI18n() {
  document.documentElement.lang = LANG;
  if (LANG === 'es') return;
  // canvas: todo lo que se escribe pasa por el diccionario
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText', 'measureText']) {
    const orig = P[fn];
    P[fn] = function (s, ...rest) { return orig.call(this, typeof s === 'string' ? tr(s) : s, ...rest); };
  }
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    const O = OffscreenCanvasRenderingContext2D.prototype;
    for (const fn of ['fillText', 'strokeText', 'measureText']) {
      const orig = O[fn];
      O[fn] = function (s, ...rest) { return orig.call(this, typeof s === 'string' ? tr(s) : s, ...rest); };
    }
  }
  const start = () => {
    trNode(document.body);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') trNode(m.target);
        else if (m.type === 'attributes') trNode(m.target.nodeType === 1 ? m.target : m.target.parentNode);
        else m.addedNodes.forEach(trNode);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
  // diálogos nativos
  const conf = window.confirm, al = window.alert;
  window.confirm = (s) => conf(tr(s));
  window.alert = (s) => al(tr(s));
}

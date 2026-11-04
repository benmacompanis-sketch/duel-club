// Registro de minijuegos. Cada uno es una clase independiente que extiende BaseGame
// y declara su propia metadata (nombre, controles, eventos compatibles, opciones, récord).
import ReactionRush from './reactionRush.js';
import MicroRace from './microRace.js';
import PongChaos from './pongChaos.js';
import LastPlatform from './lastPlatform.js';
import HoopMaster from './hoopMaster.js';
import MemoryWar from './memoryWar.js';
import ColorControl from './colorControl.js';
import DuelArena from './duelArena.js';
import TargetPanic from './targetPanic.js';
import BeatBattle from './beatBattle.js';
import FishFrenzy from './fishFrenzy.js';
import BlockBattle from './blockBattle.js';

export const GAMES = [
  ReactionRush, MicroRace, PongChaos, LastPlatform, HoopMaster, MemoryWar,
  ColorControl, DuelArena, TargetPanic, BeatBattle, FishFrenzy, BlockBattle,
];
export const GAME_BY_ID = Object.fromEntries(GAMES.map((G) => [G.meta.id, G]));

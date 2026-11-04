// Registro de minijuegos (16). Para agregar uno nuevo: crear la clase, sumarla acá y en src/data/catalog.js (GAME_IDS).
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
import ShadowSneak from './shadowSneak.js';
import TurboTennis from './turboTennis.js';
import TowerClimb from './towerClimb.js';
import BlastZone from './blastZone.js';

export const GAMES = [
  ReactionRush, MicroRace, PongChaos, LastPlatform, HoopMaster, MemoryWar,
  ColorControl, DuelArena, TargetPanic, BeatBattle, FishFrenzy, BlockBattle,
  ShadowSneak, TurboTennis, TowerClimb, BlastZone,
];
export const GAME_BY_ID = Object.fromEntries(GAMES.map((G) => [G.meta.id, G]));

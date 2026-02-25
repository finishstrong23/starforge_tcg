/**
 * STARFORGE TCG - Utility Functions
 *
 * Common utility functions used throughout the game engine.
 */

export { shuffle, shuffleWithSeed } from './shuffle';
export {
  createSeededRandom,
  randomInt,
  randomChoice,
  randomChoices,
  randomFloat
} from './random';
export type { SeededRandom } from './random';
export { generateId, generateGameId, generateCardInstanceId } from './ids';
export { deepClone, deepFreeze } from './object';

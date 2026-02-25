/**
 * STARFORGE TCG - Shuffle Utilities
 *
 * Fisher-Yates shuffle implementation with optional seeding
 * for reproducible randomness.
 */

import { createSeededRandom } from './random';
import type { SeededRandom } from './random';

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param array The array to shuffle
 * @returns The shuffled array (same reference)
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Shuffle an array using a seeded random number generator
 * for reproducible results
 * @param array The array to shuffle
 * @param seed The random seed
 * @returns A new shuffled array
 */
export function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const rng = createSeededRandom(seed);
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Shuffle and return a new array (immutable)
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleCopy<T>(array: T[]): T[] {
  return shuffle([...array]);
}

/**
 * Pick random elements from an array without replacement
 * @param array Source array
 * @param count Number of elements to pick
 * @returns Array of picked elements
 */
export function pickRandom<T>(array: T[], count: number): T[] {
  if (count >= array.length) {
    return shuffle([...array]);
  }

  const shuffled = shuffle([...array]);
  return shuffled.slice(0, count);
}

/**
 * Pick random elements using seeded random
 * @param array Source array
 * @param count Number of elements to pick
 * @param seed Random seed
 * @returns Array of picked elements
 */
export function pickRandomSeeded<T>(array: T[], count: number, seed: number): T[] {
  if (count >= array.length) {
    return shuffleWithSeed(array, seed);
  }

  const shuffled = shuffleWithSeed(array, seed);
  return shuffled.slice(0, count);
}

/**
 * STARFORGE TCG - Random Number Utilities
 *
 * Seeded random number generator for reproducible game states.
 * Uses mulberry32 algorithm for fast, quality pseudorandom numbers.
 */

/**
 * Seeded random number generator interface
 */
export interface SeededRandom {
  /** Get next random float between 0 and 1 */
  next(): number;
  /** Get the current seed state */
  getSeed(): number;
}

/**
 * Create a seeded random number generator using mulberry32 algorithm
 * @param seed Initial seed value
 * @returns SeededRandom instance
 */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed;

  return {
    next(): number {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    getSeed(): number {
      return state;
    },
  };
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param min Minimum value
 * @param max Maximum value
 * @param rng Optional seeded random generator
 * @returns Random integer
 */
export function randomInt(min: number, max: number, rng?: SeededRandom): number {
  const rand = rng ? rng.next() : Math.random();
  return Math.floor(rand * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 * @param min Minimum value
 * @param max Maximum value
 * @param rng Optional seeded random generator
 * @returns Random float
 */
export function randomFloat(min: number, max: number, rng?: SeededRandom): number {
  const rand = rng ? rng.next() : Math.random();
  return rand * (max - min) + min;
}

/**
 * Pick a random element from an array
 * @param array Source array
 * @param rng Optional seeded random generator
 * @returns Random element or undefined if array is empty
 */
export function randomChoice<T>(array: T[], rng?: SeededRandom): T | undefined {
  if (array.length === 0) return undefined;
  const index = randomInt(0, array.length - 1, rng);
  return array[index];
}

/**
 * Pick multiple random elements from an array (with replacement)
 * @param array Source array
 * @param count Number of elements to pick
 * @param rng Optional seeded random generator
 * @returns Array of random elements
 */
export function randomChoices<T>(array: T[], count: number, rng?: SeededRandom): T[] {
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const choice = randomChoice(array, rng);
    if (choice !== undefined) {
      result.push(choice);
    }
  }
  return result;
}

/**
 * Pick multiple unique random elements from an array (without replacement)
 * @param array Source array
 * @param count Number of elements to pick
 * @param rng Optional seeded random generator
 * @returns Array of unique random elements
 */
export function randomUniqueChoices<T>(array: T[], count: number, rng?: SeededRandom): T[] {
  if (count >= array.length) {
    return [...array];
  }

  const available = [...array];
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const index = randomInt(0, available.length - 1, rng);
    result.push(available[index]);
    available.splice(index, 1);
  }

  return result;
}

/**
 * Roll a dice (1 to sides, inclusive)
 * @param sides Number of sides on the dice
 * @param rng Optional seeded random generator
 * @returns Roll result
 */
export function rollDice(sides: number, rng?: SeededRandom): number {
  return randomInt(1, sides, rng);
}

/**
 * Check if a random event occurs based on probability
 * @param probability Probability between 0 and 1
 * @param rng Optional seeded random generator
 * @returns True if event occurs
 */
export function randomChance(probability: number, rng?: SeededRandom): boolean {
  const rand = rng ? rng.next() : Math.random();
  return rand < probability;
}

/**
 * Generate a weighted random choice
 * @param options Array of [item, weight] tuples
 * @param rng Optional seeded random generator
 * @returns Randomly chosen item based on weights
 */
export function weightedRandomChoice<T>(
  options: Array<[T, number]>,
  rng?: SeededRandom
): T | undefined {
  if (options.length === 0) return undefined;

  const totalWeight = options.reduce((sum, [, weight]) => sum + weight, 0);
  let random = (rng ? rng.next() : Math.random()) * totalWeight;

  for (const [item, weight] of options) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback to last item (shouldn't happen with proper weights)
  return options[options.length - 1][0];
}

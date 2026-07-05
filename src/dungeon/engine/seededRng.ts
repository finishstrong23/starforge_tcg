/**
 * Shared deterministic RNG primitives.
 *
 * Every roll that affects run state (rewards, shop stock, blessings, combat
 * randomness) must be reproducible from persisted state, so a page refresh
 * can never reroll an outcome. Two building blocks:
 *
 *   - createSeededRng(...parts) — a stateless-seeded stream for one-shot
 *     rolls keyed off stable identifiers (run seed + act + node id).
 *   - makeStatefulRng(state)    — a resumable stream for combat: the internal
 *     32-bit state is stored on CombatState.rngState and advances as rolls
 *     are consumed, so replaying from a snapshot consumes the same stream.
 */

/** FNV-1a 32-bit string hash. Same algorithm mapgen/eventSelection used. */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MULBERRY_STEP = 0x6d2b79f5;

function mixMulberry(t: number): number {
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** mulberry32 PRNG. Deterministic stream for a given numeric seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + MULBERRY_STEP) >>> 0;
    return mixMulberry(a);
  };
}

/**
 * One-shot seeded stream keyed off stable string/number parts, e.g.
 * `createSeededRng(runSeed, 'reward', act, nodeId)`.
 */
export function createSeededRng(...parts: Array<string | number>): () => number {
  return mulberry32(hashSeed(parts.join(':')));
}

export interface StatefulRng {
  next: () => number;
  /** Current internal state; persist it to resume the stream later. */
  state: () => number;
}

/**
 * Resumable PRNG: same mulberry32 stream, but the internal state is
 * observable so it can be persisted (CombatState.rngState) and resumed.
 */
export function makeStatefulRng(state: number): StatefulRng {
  let a = state >>> 0;
  return {
    next: () => {
      a = (a + MULBERRY_STEP) >>> 0;
      return mixMulberry(a);
    },
    state: () => a,
  };
}

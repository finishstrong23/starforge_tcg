// SplitMix64 seeded PRNG. Non-negotiable constraint #2 from the master
// build prompt: all randomness in the roguelite is deterministic from a
// seed. Never Math.random(). Every roll is derived from (runId, purpose,
// scope) so the same run + same action produces the same outcome on
// replay.

// SplitMix64 reference: https://prng.di.unimi.it/splitmix64.c
// We operate on BigInt to avoid JS's 53-bit precision limit. State and
// outputs are uint64. `serialize` / `deserialize` round-trip the state
// via a 16-char hex string so it can be persisted in IndexedDB.

const MASK64 = (1n << 64n) - 1n;
const MASK32 = (1n << 32n) - 1n;

export class SplitMix64 {
  private state: bigint;

  private constructor(state: bigint) {
    this.state = state & MASK64;
  }

  /** Create a new PRNG from a string seed. */
  static fromString(seed: string): SplitMix64 {
    return new SplitMix64(fnv1a64(seed));
  }

  /** Create from an already-derived 64-bit state (hex or bigint). */
  static fromState(state: bigint | string): SplitMix64 {
    const s = typeof state === 'string' ? BigInt('0x' + state) : state;
    return new SplitMix64(s);
  }

  /** Deterministically derive a sub-PRNG from this one by salting the
   *  state with a scope string. Use this to give each subsystem (map,
   *  traits, combat, drops) its own stable stream that won't interfere. */
  derive(scope: string): SplitMix64 {
    const salted = this.state ^ fnv1a64(scope);
    return new SplitMix64(mix64(salted));
  }

  /** Next uint64 and advance state. */
  nextU64(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK64;
    return mix64(this.state);
  }

  /** Next uint32 in [0, 2^32). */
  nextU32(): number {
    return Number(this.nextU64() & MASK32);
  }

  /** Next float in [0, 1). Uses top 53 bits (JS Number precision). */
  nextFloat(): number {
    // Use top 53 bits — standard technique from SplitMix64 → Float.
    const u = this.nextU64() >> 11n;
    return Number(u) / Number(1n << 53n);
  }

  /** Integer in [minInclusive, maxExclusive). */
  nextInt(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) {
      throw new Error(`SplitMix64.nextInt: max (${maxExclusive}) <= min (${minInclusive})`);
    }
    const range = maxExclusive - minInclusive;
    // Unbiased bounded sampling
    const limit = Math.floor(0x100000000 / range) * range;
    let x: number;
    do {
      x = this.nextU32();
    } while (x >= limit);
    return minInclusive + (x % range);
  }

  /** Pick one element uniformly at random. Throws if empty. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('SplitMix64.pick: empty array');
    return items[this.nextInt(0, items.length)];
  }

  /** Fisher-Yates shuffle, in-place. Returns the same array. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.nextFloat() < p;
  }

  /** Serialize current state to a 16-char lowercase hex string for
   *  IndexedDB persistence. `fromState(serialize())` round-trips exactly. */
  serialize(): string {
    return this.state.toString(16).padStart(16, '0');
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

function mix64(z: bigint): bigint {
  let x = z & MASK64;
  x = ((x ^ (x >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  x = ((x ^ (x >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  x = (x ^ (x >> 31n)) & MASK64;
  return x;
}

// FNV-1a 64-bit hash for seeding from strings. Not cryptographic — just
// a fast, well-distributed seed mixer.
function fnv1a64(s: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < s.length; i++) {
    hash = (hash ^ BigInt(s.charCodeAt(i))) & MASK64;
    hash = (hash * prime) & MASK64;
  }
  // Ensure non-zero state; SplitMix64 handles 0 fine but we still mix.
  return mix64(hash === 0n ? 0x1n : hash);
}

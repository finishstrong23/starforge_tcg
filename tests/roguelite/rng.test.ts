import { SplitMix64 } from '../../src/roguelite/engine/rng';

describe('SplitMix64', () => {
  it('is deterministic from a string seed', () => {
    const a = SplitMix64.fromString('hello-world');
    const b = SplitMix64.fromString('hello-world');
    const seqA = Array.from({ length: 100 }, () => a.nextU32());
    const seqB = Array.from({ length: 100 }, () => b.nextU32());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = SplitMix64.fromString('seed-one');
    const b = SplitMix64.fromString('seed-two');
    const seqA = Array.from({ length: 20 }, () => a.nextU32());
    const seqB = Array.from({ length: 20 }, () => b.nextU32());
    expect(seqA).not.toEqual(seqB);
  });

  it('derived streams are independent and reproducible', () => {
    const root1 = SplitMix64.fromString('run-abc');
    const root2 = SplitMix64.fromString('run-abc');
    const map1 = root1.derive('map');
    const traits1 = root1.derive('traits');
    const map2 = root2.derive('map');
    expect(map1.nextU32()).toEqual(map2.nextU32());
    expect(map1.nextU32()).not.toEqual(traits1.nextU32());
  });

  it('serializes and deserializes state exactly', () => {
    const rng = SplitMix64.fromString('persist-me');
    // Advance some
    for (let i = 0; i < 7; i++) rng.nextU64();
    const saved = rng.serialize();
    const next = rng.nextU32();
    const restored = SplitMix64.fromState(saved);
    expect(restored.nextU32()).toEqual(next);
    expect(saved).toMatch(/^[0-9a-f]{16}$/);
  });

  it('nextInt is unbiased within range', () => {
    const rng = SplitMix64.fromString('bias-test');
    const buckets = new Array(5).fill(0);
    const samples = 50_000;
    for (let i = 0; i < samples; i++) buckets[rng.nextInt(0, 5)]++;
    // Expected ~10_000 per bucket; allow 5% tolerance
    for (const b of buckets) {
      expect(b).toBeGreaterThan(samples / 5 - samples / 20);
      expect(b).toBeLessThan(samples / 5 + samples / 20);
    }
  });

  it('nextInt rejects invalid ranges', () => {
    const rng = SplitMix64.fromString('range-test');
    expect(() => rng.nextInt(5, 5)).toThrow();
    expect(() => rng.nextInt(5, 4)).toThrow();
  });

  it('pick chooses from the provided array', () => {
    const rng = SplitMix64.fromString('pick-test');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(rng.pick(items));
    }
    expect(() => rng.pick([])).toThrow();
  });

  it('shuffle is deterministic and preserves contents', () => {
    const a = SplitMix64.fromString('shuffle');
    const b = SplitMix64.fromString('shuffle');
    const arrA = [1, 2, 3, 4, 5, 6, 7, 8];
    const arrB = [1, 2, 3, 4, 5, 6, 7, 8];
    a.shuffle(arrA);
    b.shuffle(arrB);
    expect(arrA).toEqual(arrB);
    expect(arrA.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('chance returns a boolean with expected frequency', () => {
    const rng = SplitMix64.fromString('chance');
    let trues = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) if (rng.chance(0.25)) trues++;
    expect(trues).toBeGreaterThan(n * 0.25 - n * 0.03);
    expect(trues).toBeLessThan(n * 0.25 + n * 0.03);
  });
});

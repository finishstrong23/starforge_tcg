import {
  generateDraftOptions,
  generateRewardOptions,
  getRewardWeights,
  getStarterCards,
  type RewardWeights,
} from '../../src/dungeon/engine/draft';
import type { CardInstance, ComplexityTier, Faction } from '../../src/dungeon/types';

// ─── getRewardWeights — direct unit tests ────────────────────────────────────

describe('getRewardWeights', () => {
  it('returns { 80, 20, 0 } for early rooms (1-3)', () => {
    expect(getRewardWeights(1)).toEqual({ tier1: 80, tier2: 20, tier3: 0 });
    expect(getRewardWeights(3)).toEqual({ tier1: 80, tier2: 20, tier3: 0 });
  });

  it('returns { 50, 40, 10 } for mid rooms (4-7)', () => {
    expect(getRewardWeights(4)).toEqual({ tier1: 50, tier2: 40, tier3: 10 });
    expect(getRewardWeights(7)).toEqual({ tier1: 50, tier2: 40, tier3: 10 });
  });

  it('returns { 25, 45, 30 } for late rooms (8+)', () => {
    expect(getRewardWeights(8)).toEqual({ tier1: 25, tier2: 45, tier3: 30 });
    expect(getRewardWeights(13)).toEqual({ tier1: 25, tier2: 45, tier3: 30 });
    expect(getRewardWeights(99)).toEqual({ tier1: 25, tier2: 45, tier3: 30 });
  });

  it('weight totals are always 100', () => {
    for (let r = 1; r <= 20; r++) {
      const w: RewardWeights = getRewardWeights(r);
      expect(w.tier1 + w.tier2 + w.tier3).toBe(100);
    }
  });
});

// ─── generateRewardOptions — basic guarantees ────────────────────────────────

describe('generateRewardOptions', () => {
  it('returns exactly 3 unique cards', () => {
    for (let i = 0; i < 50; i++) {
      const opts = generateRewardOptions(5, 1, 'Pyroclast');
      expect(opts).toHaveLength(3);
      const ids = new Set(opts.map((c) => c.id));
      expect(ids.size).toBe(3);
    }
  });

  it('every offered card has a complexityTier', () => {
    for (let i = 0; i < 50; i++) {
      const opts = generateRewardOptions(10, 3, 'Luminar');
      for (const c of opts) {
        expect([1, 2, 3]).toContain(c.complexityTier);
      }
    }
  });

  it('faction-locks rewards to the player faction', () => {
    let factionCount = 0;
    let total = 0;
    for (let i = 0; i < 500; i++) {
      const opts = generateRewardOptions(5, 2, 'Cogsmiths');
      for (const c of opts) {
        total++;
        if (c.faction === 'Cogsmiths') factionCount++;
      }
    }
    // No cross-faction picks — every card must be from the player's faction.
    expect(factionCount).toBe(total);
  });
});

describe('generateDraftOptions', () => {
  it('gives Pyroclast a first-pick lesson: build, vent, defend, burn', () => {
    const opts = generateDraftOptions(1, getStarterCards('Pyroclast'), 'Pyroclast');

    expect(opts.map((card) => card.id)).toEqual(['P-003', 'P-010', 'P-016', 'P-007']);
  });
});

// ─── 1000-run simulation: mechanic-engagement curve by room depth ────────────
//
// Per spec: across 1000 simulated runs, the average mechanic-engagement card
// count (cards with complexityTier 2 or 3) in the deck should be:
//   • room 3:  < 2
//   • room 7:  3-5
//   • room 13: 6-9
//
// The strict mid-room expected value math is closer to ~2.6 (3·0.20 + 4·0.50)
// based on the spec's own weights. We use a relaxed lower bound at room 7 to
// match the math while still asserting the upward curve. Room 3 and room 13
// match the spec's bounds directly.

const FACTIONS: Faction[] = ['Cogsmiths', 'Pyroclast', 'Luminar', 'WarpRiders'];

function mechanicCount(deck: CardInstance[]): number {
  return deck.filter((c) => (c.complexityTier ?? 1) >= 2).length;
}

function simulateRun(faction: Faction, totalRooms: number): {
  atRoom3: number;
  atRoom7: number;
  atRoom13: number;
} {
  const deck: CardInstance[] = [...getStarterCards(faction)];
  const starterMechanicCount = mechanicCount(deck);
  let atRoom3 = 0;
  let atRoom7 = 0;
  let atRoom13 = 0;

  for (let room = 1; room <= totalRooms; room++) {
    const opts = generateRewardOptions(room, 1, faction);
    if (opts.length === 0) continue;
    // Neutral strategy: pick uniformly at random from the 3 offers.
    const pick = opts[Math.floor(Math.random() * opts.length)];
    // Convert to a minimal CardInstance shape (we only need complexityTier).
    deck.push({
      ...pick,
      instanceId: `sim-${room}`,
      upgraded: false,
      statusEffects: [],
    });

    if (room === 3) atRoom3 = mechanicCount(deck) - starterMechanicCount;
    if (room === 7) atRoom7 = mechanicCount(deck) - starterMechanicCount;
    if (room === 13) atRoom13 = mechanicCount(deck) - starterMechanicCount;
  }
  return { atRoom3, atRoom7, atRoom13 };
}

describe('reward roller 1000-run simulation', () => {
  for (const faction of FACTIONS) {
    describe(`faction: ${faction}`, () => {
      const RUNS = 1000;
      const totals = { atRoom3: 0, atRoom7: 0, atRoom13: 0 };

      beforeAll(() => {
        for (let i = 0; i < RUNS; i++) {
          const r = simulateRun(faction, 13);
          totals.atRoom3 += r.atRoom3;
          totals.atRoom7 += r.atRoom7;
          totals.atRoom13 += r.atRoom13;
        }
      });

      it(`average mechanic-card count at room 3 is < 2`, () => {
        const avg = totals.atRoom3 / RUNS;
        expect(avg).toBeLessThan(2);
      });

      it(`average mechanic-card count at room 7 is in [2, 5]`, () => {
        // Spec calls for 3-5; analytic expectation with the spec's weights is
        // ~2.6. Loosened lower bound to 2 to match the math while preserving
        // the asserted upward curve. Documented in phase-1-5-summary.md.
        const avg = totals.atRoom7 / RUNS;
        expect(avg).toBeGreaterThanOrEqual(2);
        expect(avg).toBeLessThanOrEqual(5);
      });

      it(`average mechanic-card count at room 13 is in [6, 9]`, () => {
        const avg = totals.atRoom13 / RUNS;
        expect(avg).toBeGreaterThanOrEqual(6);
        expect(avg).toBeLessThanOrEqual(9);
      });

      it(`mechanic count strictly increases on average (room3 < room7 < room13)`, () => {
        const a3 = totals.atRoom3 / RUNS;
        const a7 = totals.atRoom7 / RUNS;
        const a13 = totals.atRoom13 / RUNS;
        expect(a7).toBeGreaterThan(a3);
        expect(a13).toBeGreaterThan(a7);
      });
    });
  }
});

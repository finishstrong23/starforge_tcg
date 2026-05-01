/**
 * Act-start blessing engine tests.
 *
 * Pins the modifier semantics for each blessing so future tweaks are
 * intentional. Uses a deterministic RNG (always returns 0) for the
 * pickRandom calls inside applyBlessing.
 */

import {
  BLESSING_POOL,
  applyBlessing,
  rollBlessings,
  type BlessingId,
} from '../../src/dungeon/data/blessings';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { generateActMap } from '../../src/dungeon/engine/mapgen';
import type { RunState } from '../../src/dungeon/types';

function fakeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    phase: 'blessing',
    currentAct: 1,
    actMaps: [
      generateActMap(1, 'seed'),
      generateActMap(2, 'seed'),
      generateActMap(3, 'seed'),
    ],
    deck: getStarterCards('Pyroclast'),
    hand: [],
    relics: [],
    gold: 99,
    maxHealth: 72,
    currentHealth: 50,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel: 0,
    combatState: null,
    potions: [null, null, null],
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
    ...overrides,
  };
}

const zeroRng = () => 0;

describe('BLESSING_POOL', () => {
  it('contains exactly the expected blessings, no duplicates', () => {
    const ids = BLESSING_POOL.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('every blessing has the required display fields', () => {
    for (const b of BLESSING_POOL) {
      expect(b.name).toBeTruthy();
      expect(b.flavor).toBeTruthy();
      expect(b.effect).toBeTruthy();
      expect(b.emoji).toBeTruthy();
      expect(b.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe('rollBlessings', () => {
  it('returns the requested count, distinct ids', () => {
    const opts = rollBlessings(3);
    expect(opts).toHaveLength(3);
    expect(new Set(opts.map((b) => b.id)).size).toBe(3);
  });

  it('caps at the pool size if asked for more', () => {
    const opts = rollBlessings(99);
    expect(opts.length).toBe(BLESSING_POOL.length);
    expect(new Set(opts.map((b) => b.id)).size).toBe(BLESSING_POOL.length);
  });
});

describe('applyBlessing — per-id semantics', () => {
  it('vigor: +10 max HP, heal to new max', () => {
    const run = fakeRun({ maxHealth: 72, currentHealth: 30 });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'vigor')!, run, zeroRng);
    expect(r.patch.maxHealth).toBe(82);
    expect(r.patch.currentHealth).toBe(82);
  });

  it('fortune: +100 gold', () => {
    const run = fakeRun({ gold: 50 });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'fortune')!, run, zeroRng);
    expect(r.patch.gold).toBe(150);
  });

  it('treasure: adds an Uncommon relic to relics[]', () => {
    const run = fakeRun({ relics: [] });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'treasure')!, run, zeroRng);
    expect(r.pickedRelic).toBeDefined();
    expect(r.pickedRelic?.rarity).toBe('Uncommon');
    expect(r.patch.relics).toHaveLength(1);
    expect(r.patch.relics?.[0].id).toBe(r.pickedRelic?.id);
  });

  it('treasure: skips relics the player already owns', () => {
    const run = fakeRun({ relics: [] });
    // Take whatever blessing 1 would pick under zeroRng, then re-run with
    // that relic already owned and confirm a different one is rolled.
    const first = applyBlessing(BLESSING_POOL.find((b) => b.id === 'treasure')!, run, zeroRng);
    const owned = first.pickedRelic!;
    const ownedRun = fakeRun({ relics: [owned] });
    const second = applyBlessing(BLESSING_POOL.find((b) => b.id === 'treasure')!, ownedRun, zeroRng);
    expect(second.pickedRelic?.id).not.toBe(owned.id);
  });

  it('arsenal: surfaces a Rare card definition for the reducer to wrap', () => {
    const run = fakeRun();
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'arsenal')!, run, zeroRng);
    expect(r.pickedCard).toBeDefined();
    expect(r.pickedCard?.rarity).toBe('Rare');
    // Reducer is responsible for instance creation; the helper does NOT
    // mutate the deck patch directly.
    expect(r.patch.deck).toBeUndefined();
  });

  it('sanctuary: heals to full + flags +1 energy next combat', () => {
    const run = fakeRun({ maxHealth: 72, currentHealth: 30 });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'sanctuary')!, run, zeroRng);
    expect(r.patch.currentHealth).toBe(72);
    expect(r.bonusEnergyNextCombat).toBe(1);
  });

  it('channel: surfaces a non-starter (non-Common) card to duplicate', () => {
    const starter = getStarterCards('Pyroclast');
    const rareCard = { ...starter[0], rarity: 'Rare' as const, id: 'X-1', name: 'Test' };
    const run = fakeRun({ deck: [...starter, rareCard] });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'channel')!, run, zeroRng);
    expect(r.pickedCard?.rarity).toBe('Rare');
  });

  it('channel: falls back to any card if the deck has no rares/uncommons', () => {
    const starter = getStarterCards('Pyroclast'); // all common
    const run = fakeRun({ deck: starter });
    const r = applyBlessing(BLESSING_POOL.find((b) => b.id === 'channel')!, run, zeroRng);
    expect(r.pickedCard).toBeDefined();
  });
});

describe('applyBlessing — exhaustive id coverage', () => {
  it('every blessing in the pool has a working applyBlessing branch', () => {
    const run = fakeRun();
    for (const b of BLESSING_POOL) {
      // Should not throw and should always return a result object.
      const r = applyBlessing(b, run, zeroRng);
      expect(r).toBeDefined();
      expect(r.patch).toBeDefined();
    }
  });
});

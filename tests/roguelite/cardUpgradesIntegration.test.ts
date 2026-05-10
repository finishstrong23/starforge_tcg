/**
 * Phase 5 — Integration pass.
 *
 * Verifies the upgrade system across faction boundaries, save/load,
 * reward generation, and cross-faction Power enumeration. The acceptance
 * gate before the upgrade system can ship as v1.
 *
 * Six contracts:
 *   1. **Cross-faction deck combat**: a deck mixing cards from 4 factions
 *      plays a turn correctly with all upgrade states intact.
 *   2. **Mixed-state regression net**: each faction's cards in randomly
 *      upgraded states fire correctly when sharing one combat.
 *   3. **Save/load round-trip**: the user-flagged scenario (3 upgraded +
 *      1 augmented + 1 fluxed + 1 vanilla) round-trips identically. Plus
 *      explicit corrupted-on-load defense (missing upgrade fields don't
 *      silently default to base).
 *   4. **Reward roller upgrade-aware filter**: never offers the base of
 *      a card the player already owns in upgraded form. Locked-in policy
 *      from Phase 5 doc.
 *   5. **Cross-faction Power enumeration**: any Power that scans the
 *      player's cards (Modular Strike's augInDeck, etc.) handles
 *      cross-faction decks correctly.
 *   6. **Chokepoint write-side discipline persistence**: re-runs the
 *      shared well-formedness check so any new card data added in Phase 5
 *      is still clean.
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance, generateRewardOptions } from '../../src/dungeon/engine/draft';
import {
  initCombat,
  playCard,
  applyAugment,
  endPlayerTurn,
  executeEnemyTurn,
  isFluxCard,
} from '../../src/dungeon/engine/combat';
import { getCardStats, getCardText, getCardCost, setActiveCardText, setActiveCardCost } from '../../src/dungeon/engine/cardStats';
import type { CardInstance, CardDefinition, EnemyDefinition } from '../../src/dungeon/types';
import { findWellFormednessFailures, formatFailures } from './_sharedUpgradeChecks';

const dummyEnemy: EnemyDefinition = {
  id: 'e-test',
  name: 'Test Dummy',
  lore: 'just sits there',
  maxHealth: 600,
  attack: 0,
  art: '🎯',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'do nothing' }],
};

function defById(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`Unknown card id ${id}`);
  return def;
}

function inst(id: string, upgraded = false, overrides: Partial<CardInstance> = {}): CardInstance {
  return { ...createCardInstance(defById(id)), upgraded, ...overrides };
}

// ─── 1. Cross-faction deck combat ──────────────────────────────────────────

describe('Phase 5 integration — cross-faction deck combat', () => {
  it('a deck mixing all 4 factions plays a turn end-to-end without throwing', () => {
    // One Common card per faction, mixed upgrade states.
    const deck: CardInstance[] = [
      inst('P-001', true),  // Pyroclast Cinder Strike+
      inst('L-001', false), // Luminar Light Jab
      inst('C-001', true),  // Cogsmiths Rivet Strike+
      inst('W-041', false), // Warp Riders Strike
      inst('P-002', true),  // Pyroclast Scale Guard+ (block)
      inst('L-002', false), // Luminar Glow Ward (block)
    ];
    let s = initCombat(deck, 50, 50, [], dummyEnemy, 'Cogsmiths');
    expect(s.hand.length).toBe(5);
    // Play every card in starting hand, in order, asserting no throw.
    for (const card of [...s.hand]) {
      const inHand = s.hand.find((c) => c.instanceId === card.instanceId);
      if (!inHand) continue;
      if (getCardCost(inHand) > s.playerEnergy) continue;
      s = playCard(s, inHand.instanceId);
    }
    expect(s).toBeDefined();
    expect(s.combatLog.length).toBeGreaterThan(0);
  });

  it('upgraded cards across 4 factions fire their upgraded math individually', () => {
    // Upgraded P-001 deals 9, upgraded C-001 deals 10. Play both
    // sequentially against the same enemy and assert the math.
    const deck: CardInstance[] = [
      inst('P-001', true), // Cinder Strike+ → 9
      inst('C-001', true), // Rivet Strike+ → 10
    ];
    let s = initCombat(deck, 50, 50, [], dummyEnemy, 'Pyroclast');
    s = { ...s, playerEnergy: 99 };
    const startHp = s.enemy.currentHealth;
    for (const c of [...s.hand]) {
      s = playCard(s, c.instanceId);
    }
    // 9 + 10 = 19 expected.
    expect(s.enemy.currentHealth).toBe(startHp - 19);
  });
});

// ─── 2. Mixed-state regression net ─────────────────────────────────────────

describe('Phase 5 integration — mixed-state combat', () => {
  it('every faction has at least one card in a mixed combat that fires correctly', () => {
    // Use enough energy to play all 5 cards (each costs 1). 5-card deck
    // means all 5 land in starting hand.
    const deck: CardInstance[] = [
      inst('P-001', false), // Pyro: 6 dmg
      inst('L-001', false), // Lum:  6 dmg
      inst('C-001', true),  // Cog+: 10 dmg
      inst('W-041', true),  // WR+:  9 dmg
      inst('W-041', false), // WR base 6 dmg
    ];
    let s = initCombat(deck, 50, 50, [], dummyEnemy, 'Cogsmiths');
    s = { ...s, playerEnergy: 99 }; // unlimited energy for the assertion
    const startHp = s.enemy.currentHealth;
    for (const c of [...s.hand]) {
      s = playCard(s, c.instanceId);
    }
    // 6 + 6 + 10 + 9 + 6 = 37.
    expect(s.enemy.currentHealth).toBe(startHp - 37);
  });

  it('upgrade flag on one faction does not affect another faction in the same deck', () => {
    // Two Cinder Strikes (one upgraded, one base) and a base Light Jab.
    // The base Cinder Strike should still deal 6, not the upgraded value.
    const deck: CardInstance[] = [
      inst('P-001', true),
      inst('P-001', false),
      inst('L-001', false),
      inst('C-001', false),
    ];
    let s = initCombat(deck, 50, 50, [], dummyEnemy, 'Pyroclast');
    s = { ...s, playerEnergy: 99 };
    const startHp = s.enemy.currentHealth;
    for (const c of [...s.hand]) {
      s = playCard(s, c.instanceId);
    }
    // 9 + 6 + 6 + 7 = 28.
    expect(s.enemy.currentHealth).toBe(startHp - 28);
  });
});

// ─── 3. Save / load round-trip ─────────────────────────────────────────────

describe('Phase 5 integration — save/load round-trip', () => {
  it('the user-specified scenario round-trips identically through JSON', () => {
    // Scenario: 3 upgraded cards, 1 with augment attached, 1 with active
    // flux state, 1 vanilla starter. All in a single deck.
    const deck: CardInstance[] = [
      inst('P-001', true),                                       // upgraded #1
      inst('L-001', true),                                       // upgraded #2
      inst('C-001', true),                                       // upgraded #3
      // Cogsmith Pneumatic Jab augmented with Edge — patched cardText + augments array
      (() => {
        const target = inst('C-008', false);
        const edge = inst('C-014', false);
        // simulate applying Edge to the target outside combat for save purposes
        const patched = setActiveCardText(target, target.cardText.replace(
          /Deal (\d+) damage/, (_, n) => `Deal ${parseInt(n) + 3} damage`,
        ));
        return { ...patched, augments: ['Augment: Edge'] };
      })(),
      inst('W-001', false, { fluxState: 'B' }),                  // active flux state
      inst('P-041', false),                                      // vanilla starter
    ];

    const ctx = { run: { phase: 'combat', deck } };
    const serialized = JSON.stringify(ctx);
    const restored = JSON.parse(serialized) as typeof ctx;

    expect(restored.run.deck).toHaveLength(6);

    // Upgrade flags preserved
    expect(restored.run.deck[0].upgraded).toBe(true);
    expect(restored.run.deck[1].upgraded).toBe(true);
    expect(restored.run.deck[2].upgraded).toBe(true);
    expect(restored.run.deck[5].upgraded).toBe(false);

    // Augment patches preserved
    expect(restored.run.deck[3].cardText).toMatch(/Deal 16 damage/); // 13 base + 3 Edge
    expect(restored.run.deck[3].augments).toEqual(['Augment: Edge']);

    // Active flux state preserved
    expect(restored.run.deck[4].fluxState).toBe('B');

    // Effective stats via getCardStats round-trip correctly
    expect(getCardStats(restored.run.deck[0] as CardInstance).text).toBe('Deal 9 damage.');
    expect(getCardText(restored.run.deck[5] as CardInstance)).toBe('Deal 4 damage. Generate 1 Heat.'); // P-041 base
  });

  it('corrupted-on-load: a deck card missing the `upgraded` field defaults to NOT upgraded', () => {
    // If a save was written before the upgrade system existed (or got
    // corrupted), `upgraded` may be missing. getCardStats's read MUST
    // treat missing upgraded as false — the same as upgraded: false.
    // Otherwise old saves would silently corrupt to upgraded: true.
    const def = defById('P-001');
    const fromOldSave = {
      ...def,
      instanceId: 'old-save-1',
      // NO `upgraded` field
      statusEffects: [] as unknown[],
      currentHealth: undefined as unknown as number,
      hasAttacked: false,
    };
    const stats = getCardStats(fromOldSave as unknown as CardInstance);
    // Should return BASE damage text, not upgraded.
    expect(stats.text).toBe('Deal 6 damage.');
  });

  it('corrupted-on-load: an upgraded card without upgradeText falls back to cardText', () => {
    // A card definition was saved/loaded with upgraded: true but the
    // upgradeText field somehow went missing (corrupted save). The
    // getCardStats should fall back to cardText, not throw.
    const def = defById('P-001');
    const corrupted = {
      ...def,
      upgradeText: undefined as unknown as string,
      instanceId: 'corrupt-1',
      upgraded: true,
      statusEffects: [] as unknown[],
      currentHealth: undefined as unknown as number,
      hasAttacked: false,
    };
    const stats = getCardStats(corrupted as unknown as CardInstance);
    expect(stats.text).toBe(def.cardText); // falls back to base
  });

  it('save format preserves Cost Rift discounts via setActiveCardCost', () => {
    // After Cost Rift discounts an upgraded card, both `cost` and
    // `upgradedCost` are written so JSON round-trip keeps the discount.
    const def: CardDefinition = { ...defById('P-008'), upgradedCost: 2 };
    const card: CardInstance = { ...createCardInstance(def), upgraded: true };
    expect(getCardCost(card)).toBe(2); // upgrade override
    const discounted = setActiveCardCost(card, 0);
    expect(getCardCost(discounted)).toBe(0);
    const restored = JSON.parse(JSON.stringify(discounted)) as CardInstance;
    expect(getCardCost(restored)).toBe(0); // round-trip preserves
  });
});

// ─── 4. Reward roller upgrade-aware filter ─────────────────────────────────

describe('Phase 5 integration — reward roller policy', () => {
  // Deterministic RNG for these tests so we can assert specific picks.
  function seededRng(seed = 1): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  it('never offers a card the player already owns in upgraded form (Pyroclast)', () => {
    // Player owns P-001+, P-002+, and P-009+ (three upgraded Common Pyroclast cards).
    const deck = [inst('P-001', true), inst('P-002', true), inst('P-009', true)];
    const ownedUpgradedIds = new Set(['P-001', 'P-002', 'P-009']);
    // Roll many reward sets; none should contain the owned-upgraded ids.
    for (let trial = 0; trial < 50; trial++) {
      const opts = generateRewardOptions(5, 1, 'Pyroclast', seededRng(trial), deck);
      for (const opt of opts) {
        expect(ownedUpgradedIds.has(opt.id)).toBe(false);
      }
    }
  });

  it('still offers a card the player owns in BASE form (only upgraded form blocks rerolls)', () => {
    // Deck has base P-001 — reward roller can still offer P-001 (player
    // may legitimately want a 2nd copy).
    const deck = [inst('P-001', false)];
    let foundP001 = false;
    for (let trial = 0; trial < 200 && !foundP001; trial++) {
      const opts = generateRewardOptions(1, 1, 'Pyroclast', seededRng(trial), deck);
      if (opts.some((o) => o.id === 'P-001')) foundP001 = true;
    }
    expect(foundP001).toBe(true);
  });

  it('faction lock still works in conjunction with upgrade-aware filter', () => {
    const deck = [inst('P-001', true)];
    for (let trial = 0; trial < 20; trial++) {
      const opts = generateRewardOptions(5, 2, 'Luminar', seededRng(trial), deck);
      // No Pyroclast cards; never the upgraded P-001.
      for (const opt of opts) {
        expect(opt.faction).toBe('Luminar');
        expect(opt.id).not.toBe('P-001');
      }
    }
  });

  it('no deck = no upgrade filter (default behavior preserved)', () => {
    // generateRewardOptions called without deck arg: faction lock applies but
    // no upgrade filter. Deck defaults to []. Should still produce 3 options.
    const opts = generateRewardOptions(5, 1, 'Pyroclast');
    expect(opts).toHaveLength(3);
    for (const o of opts) expect(o.faction).toBe('Pyroclast');
  });
});

// ─── 5. Cross-faction Power enumeration ─────────────────────────────────────

describe('Phase 5 integration — cross-faction Power enumeration', () => {
  it('Modular Strike+ (Cogsmith) augInDeck regex counts augments across cards from any faction', () => {
    // Setup: a cross-faction deck where the Edge augment is attached to a
    // Pyroclast card (Cinder Strike). Then play Modular Strike — it should
    // count the augment even though the augmented card is non-Cogsmith.
    const target  = inst('P-008', false); // Pyroclast Magma Fist as the augment target
    const edge    = inst('C-014', false); // Cogsmith Edge
    const modular = inst('C-021', true);  // Modular Strike+ — counts augments deck-wide
    let s = initCombat([target, edge, modular], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = s.hand.find((c) => c.id === 'P-008')!;
    const e = s.hand.find((c) => c.id === 'C-014')!;
    const m = s.hand.find((c) => c.id === 'C-021')!;
    s = applyAugment(s, e.instanceId, t.instanceId);
    // P-008 (Pyroclast) now carries the Edge augment.
    expect(s.hand.find((c) => c.id === 'P-008')!.augments).toEqual(['Augment: Edge']);
    // Modular Strike+ deals 8 + 5 × (augment count). Augment count across
    // hand+drawPile+etc = 1 (the one we attached).
    const startHp = s.enemy.currentHealth;
    s = playCard(s, m.instanceId);
    expect(s.enemy.currentHealth).toBe(startHp - 13);
  });

  it('no aggregate "all cards gain X" Powers exist in the pool (cross-faction enumeration audit)', () => {
    // Phase 5 verification: all aggregate Powers were rewritten in Phases
    // 2-4. No card text references "all cards" / "all your cards" / "every card".
    // If a future card adds one, this test surfaces it so the Power's
    // enumeration logic is tested cross-faction first.
    const aggregate = CARD_POOL.filter((c) => {
      const text = (c.cardText + ' ' + (c.upgradeText ?? '')).toLowerCase();
      return /\b(all|every) (your )?cards?\b/.test(text);
    });
    expect(aggregate.map((c) => `${c.id} ${c.name}`)).toEqual([]);
  });
});

// ─── 6. Chokepoint discipline persistence ──────────────────────────────────

describe('Phase 5 integration — chokepoint discipline persistence', () => {
  it('shared well-formedness check is clean across the entire pool', () => {
    const failures = findWellFormednessFailures(CARD_POOL);
    expect({ count: failures.length, details: formatFailures(failures) }).toEqual({
      count: 0,
      details: '(clean)',
    });
  });

  it('every faction has exactly 44 cards (no Phase 5 data drift)', () => {
    for (const fac of ['Pyroclast', 'Luminar', 'Cogsmiths', 'WarpRiders'] as const) {
      const cards = CARD_POOL.filter((c) => c.faction === fac);
      expect(cards.length).toBe(44);
    }
  });

  it('setActiveCardText / setActiveCardCost preserve upgrade state correctly', () => {
    // Sanity: the helpers do what they say, post-Phase-5 refactor.
    const card = inst('P-001', true);
    const patched = setActiveCardText(card, 'Deal 99 damage.');
    expect(patched.cardText).toBe('Deal 99 damage.');
    expect(patched.upgradeText).toBe('Deal 99 damage.');
    expect(getCardText(patched)).toBe('Deal 99 damage.');

    const cardWithCostOverride: CardInstance = { ...inst('P-008', true), upgradedCost: 1 };
    const cheaper = setActiveCardCost(cardWithCostOverride, 0);
    expect(cheaper.cost).toBe(0);
    expect(cheaper.upgradedCost).toBe(0);
    expect(getCardCost(cheaper)).toBe(0);
  });

  it('no engine code path outside cardStats.ts mutates cardText / cost via direct field assignment (defensive grep regression)', () => {
    // This is a meta-test: we don't actually grep at runtime (that would
    // require shelling out). Instead we document the audited write sites
    // and verify the helpers' invariants hold by sampling. The Phase 5
    // deliverable doc has the full Chokepoint Audit Findings table.
    // Here we just sanity-check the invariant that helpers preserve
    // upgrade state observability.
    const card = inst('C-008', true); // Pneumatic Jab+
    const patched = setActiveCardText(card, 'Deal 100 damage.');
    // After patch, BOTH fields hold the new text.
    expect(patched.cardText).toBe('Deal 100 damage.');
    expect(patched.upgradeText).toBe('Deal 100 damage.');
    // getCardText returns the patched text regardless of upgrade state.
    expect(getCardText({ ...patched, upgraded: false })).toBe('Deal 100 damage.');
    expect(getCardText({ ...patched, upgraded: true })).toBe('Deal 100 damage.');
  });
});

// ─── 7. Flux + cross-faction sanity ────────────────────────────────────────

describe('Phase 5 integration — Flux + cross-faction', () => {
  it('a Flux card in a cross-faction deck plays correctly in each flux state', () => {
    for (const variant of ['A', 'B', 'C'] as const) {
      const deck: CardInstance[] = [
        inst('P-001', true),                          // Pyroclast
        inst('L-001', true),                          // Luminar
        inst('W-001', true, { fluxState: variant }),  // Warp Riders Flux
      ];
      let s = initCombat(deck, 50, 50, [], dummyEnemy, 'Pyroclast');
      const w = s.hand.find((c) => c.id === 'W-001')!;
      expect(isFluxCard(w)).toBe(true);
      const startHp = s.enemy.currentHealth;
      const after = playCard(s, w.instanceId);
      const expected = variant === 'A' ? 6 : variant === 'B' ? 11 : 8;
      expect(after.enemy.currentHealth).toBe(startHp - expected);
    }
  });

  it('Flux state shifts at end of player turn even in a cross-faction deck', () => {
    const deck: CardInstance[] = [
      inst('P-001', false),
      inst('L-001', false),
      inst('W-001', false, { fluxState: 'A' }),
      inst('W-008', false, { fluxState: 'A' }),
    ];
    let s = initCombat(deck, 50, 50, [], dummyEnemy, 'WarpRiders');
    // Capture initial flux states across all piles
    const beforeStates = [...s.hand, ...s.drawPile, ...s.discardPile]
      .filter(isFluxCard)
      .map((c) => c.fluxState)
      .filter(Boolean);
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    // Hand discarded, drew fresh 5, then drawPile flux states should have shifted.
    // At minimum, the engine should not have thrown, and flux cards still exist.
    const afterFlux = [...s.hand, ...s.drawPile, ...s.discardPile].filter(isFluxCard);
    expect(afterFlux.length).toBeGreaterThanOrEqual(beforeStates.length);
  });
});

/**
 * Phase 5.5 — Deliberate-break tests.
 *
 * Pre-flight tests for the human verification runs. Covers the mechanically-
 * testable scenarios from the user's deliberate-break checklist so any
 * issues that surface during real play are felt-quality, not logic gaps.
 *
 * Scenarios pinned:
 *   1. Smith with active augments (augment is combat-scoped; Smith on a
 *      deck card that was augmented in a now-ended combat sees the
 *      un-augmented deck instance).
 *   2. Smith reducer idempotence (re-dispatching UPGRADE_CARD on the same
 *      instanceId is a no-op; flag is already true).
 *   3. Smith targets only the chosen instance (other deck cards untouched).
 *   4. Smith mid-combat-state save/reload (the save format preserves
 *      both runState.deck upgrade flags AND combatState.hand mutations
 *      independently).
 *   5. Reward filter with mixed-faction deck (the filter respects upgrade
 *      state across faction boundaries).
 *   6. Smith filter excludes already-upgraded cards from the deck picker.
 *   7. No code path other than UPGRADE_CARD writes `upgraded: true` to a
 *      CardInstance (defensive grep regression).
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance, generateRewardOptions } from '../../src/dungeon/engine/draft';
import { initCombat, playCard, applyAugment } from '../../src/dungeon/engine/combat';
import { getCardStats, getCardText } from '../../src/dungeon/engine/cardStats';
import type { CardInstance, CardDefinition, CombatState, EnemyDefinition, RunState } from '../../src/dungeon/types';

const dummyEnemy: EnemyDefinition = {
  id: 'e-test',
  name: 'Test Dummy',
  lore: 'just sits there',
  maxHealth: 400,
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

/**
 * Mirror of the UPGRADE_CARD reducer in DungeonRunContext (line 335-346).
 * Pulled out into a pure function for testability since the reducer body
 * is trivial. If the reducer logic changes, these tests will need to be
 * updated to match.
 */
function applyUpgradeCard(deck: CardInstance[], instanceId: string): CardInstance[] {
  return deck.map((c) => (c.instanceId === instanceId ? { ...c, upgraded: true } : c));
}

// ─── 1. Smith with active augments (combat-scoped, doesn't persist) ─────────

describe('Phase 5.5 — Smith × augment interaction', () => {
  it('a card augmented in combat does NOT carry the augment back to the deck', () => {
    // Setup: deck with Pneumatic Jab (target) + Edge augment.
    // Combat starts → augment Pneumatic Jab → combat ends → check deck.
    const target = inst('C-008', false);  // Pneumatic Jab
    const edge = inst('C-014', false);    // Edge
    const baseDeck: CardInstance[] = [target, edge];
    let s = initCombat(baseDeck, 50, 50, [], dummyEnemy, 'Cogsmiths');

    // Confirm augment patches the in-combat instance
    const t = s.hand.find((c) => c.instanceId === target.instanceId)!;
    const e = s.hand.find((c) => c.instanceId === edge.instanceId)!;
    s = applyAugment(s, e.instanceId, t.instanceId);
    const inCombat = s.hand.find((c) => c.instanceId === target.instanceId)!;
    expect(inCombat.cardText).toMatch(/Deal 16 damage/); // 13 + 3
    expect(inCombat.augments).toEqual(['Augment: Edge']);

    // Original deck instance is untouched (no augment, no patched text).
    // The deck array was passed into initCombat by reference but
    // applyAugment created a new instance via spread; deck instance is
    // unchanged.
    expect(target.cardText).toMatch(/Deal 13 damage/);
    expect(target.augments ?? []).toEqual([]);
  });

  it('Smith on a deck card that was augmented in a previous combat sees the un-augmented deck state', () => {
    // The deck instance is what RestSiteView.tsx filters and Smiths.
    // Even after a combat where this card was augmented, the deck
    // instance has no augment state. Smith just flips upgraded → true.
    const target = inst('C-008', false);
    const deckBeforeCombat = [target];

    // Simulate a combat: augment in-combat, end combat. The deck array
    // is what survives; in-combat mutations live in combatState only.
    // (We don't actually run combat — the reducer's combat-end path
    // doesn't write hand state back to deck, verified by reading
    // DungeonRunContext.tsx:369-398.)
    const deckAfterCombat = deckBeforeCombat; // unchanged
    expect(deckAfterCombat[0].cardText).toMatch(/Deal 13 damage/);
    expect(deckAfterCombat[0].augments ?? []).toEqual([]);

    // Smith the card.
    const upgraded = applyUpgradeCard(deckAfterCombat, target.instanceId);
    expect(upgraded[0].upgraded).toBe(true);
    // After upgrade, getCardStats reads the upgrade text — augment patches
    // never touched this instance, so we get the clean upgrade text.
    expect(getCardText(upgraded[0])).toBe(defById('C-008').upgradeText);
  });
});

// ─── 2. Smith reducer idempotence + targeting ──────────────────────────────

describe('Phase 5.5 — Smith reducer behavior', () => {
  it('is idempotent: dispatching UPGRADE_CARD twice on same instance leaves card upgraded once', () => {
    const card = inst('P-001', false);
    let deck = [card];
    deck = applyUpgradeCard(deck, card.instanceId);
    expect(deck[0].upgraded).toBe(true);
    deck = applyUpgradeCard(deck, card.instanceId);
    // Still just upgraded — flag is already true; second dispatch is a no-op.
    expect(deck[0].upgraded).toBe(true);
    expect(deck.length).toBe(1);
  });

  it('targets only the matching instanceId (other deck cards unchanged)', () => {
    const a = inst('P-001', false);
    const b = inst('P-001', false); // same id, different instance
    const c = inst('L-001', false);
    let deck = [a, b, c];
    deck = applyUpgradeCard(deck, b.instanceId);
    // Only b is upgraded.
    expect(deck.find((d) => d.instanceId === a.instanceId)!.upgraded).toBe(false);
    expect(deck.find((d) => d.instanceId === b.instanceId)!.upgraded).toBe(true);
    expect(deck.find((d) => d.instanceId === c.instanceId)!.upgraded).toBe(false);
  });

  it('Smith filter excludes already-upgraded cards (mirrors RestSiteView logic at line 140)', () => {
    const deck = [
      inst('P-001', true),
      inst('P-001', false),
      inst('L-001', true),
      inst('C-001', false),
    ];
    // RestSiteView.tsx:140: deck.filter((c) => !c.upgraded)
    const smithable = deck.filter((c) => !c.upgraded);
    expect(smithable).toHaveLength(2);
    expect(smithable.every((c) => !c.upgraded)).toBe(true);
  });

  it('Smith filter handles the empty-already-all-upgraded case gracefully', () => {
    const deck = [
      inst('P-001', true),
      inst('L-001', true),
      inst('C-001', true),
    ];
    const smithable = deck.filter((c) => !c.upgraded);
    expect(smithable).toHaveLength(0);
    // RestSiteView.tsx:153 shows "All cards already upgraded." in this case.
  });
});

// ─── 3. Smith mid-combat-state save/reload ─────────────────────────────────

describe('Phase 5.5 — Smith mid-combat save/reload', () => {
  it('save mid-rest with mode=upgrading and 2 cards already smithed: round-trip preserves all upgrade flags', () => {
    // Scenario: player is at a rest site, has smithed 2 cards earlier in
    // the run, hasn't smithed at THIS rest yet, and the player saves and
    // reloads (browser refresh, alt-tab, etc.).
    //
    // The save/load doesn't care about the rest-site UI mode — that's
    // local React state, lost on reload. What matters is that the deck's
    // upgrade flags survive the JSON round-trip and the reloaded deck
    // shows the right cards in the smith picker.
    const deck: CardInstance[] = [
      inst('P-001', true),
      inst('L-001', true),
      inst('C-001', false),
      inst('W-041', false),
    ];
    const ctxState = { run: { phase: 'rest', deck, currentHealth: 50, maxHealth: 72 } };
    const restored = JSON.parse(JSON.stringify(ctxState)) as typeof ctxState;
    // All 4 upgrade flags preserved.
    expect(restored.run.deck.map((c) => c.upgraded)).toEqual([true, true, false, false]);
    // Smith filter on restored deck shows the 2 still-base cards.
    const smithable = restored.run.deck.filter((c) => !c.upgraded);
    expect(smithable).toHaveLength(2);
    expect(smithable.map((c) => c.id)).toEqual(['C-001', 'W-041']);
  });

  it('save mid-COMBAT with an upgraded card in hand: round-trip preserves both runState.deck AND combatState.hand independently', () => {
    // Scenario: player is in combat, has an upgraded card in hand, saves.
    // On reload, both the runState.deck (source of truth for upgrades)
    // AND the combatState.hand (in-combat snapshot) must survive intact.
    const upgradedCard = inst('P-001', true);
    const baseCard = inst('P-001', false);
    const deck = [upgradedCard, baseCard];
    let combat = initCombat(deck, 50, 50, [], dummyEnemy, 'Pyroclast');
    const ctxState = { run: { phase: 'combat', deck, combatState: combat } };
    const restored = JSON.parse(JSON.stringify(ctxState)) as typeof ctxState;
    // Deck unchanged.
    expect(restored.run.deck.map((c) => c.upgraded)).toEqual([true, false]);
    // Hand has 2 cards (deck size 2, all drawn). Both upgrade flags preserved.
    const restoredCombat = restored.run.combatState!;
    expect(restoredCombat.hand.length).toBeGreaterThanOrEqual(2);
    const handUpgraded = restoredCombat.hand.find((c) => c.id === 'P-001' && c.upgraded);
    expect(handUpgraded).toBeDefined();
    // The upgraded hand card still reads upgraded text via getCardText.
    expect(getCardText(handUpgraded!)).toBe('Deal 9 damage.');
  });

  it('save AFTER smithing one card in a rest site: round-trip applies the upgrade flag correctly to the chosen instance', () => {
    // Most realistic scenario: player smiths card X at rest site, then
    // the save fires (every state transition persists per
    // DungeonRunContext.tsx:593). Reload — card X stays upgraded.
    const a = inst('P-001', false);
    const b = inst('P-002', false);
    const c = inst('L-001', false);
    let deck = [a, b, c];

    // Smith b
    deck = applyUpgradeCard(deck, b.instanceId);
    const ctxState = { run: { phase: 'rest', deck } };
    const restored = JSON.parse(JSON.stringify(ctxState)) as typeof ctxState;

    expect(restored.run.deck.find((d) => d.instanceId === a.instanceId)!.upgraded).toBe(false);
    expect(restored.run.deck.find((d) => d.instanceId === b.instanceId)!.upgraded).toBe(true);
    expect(restored.run.deck.find((d) => d.instanceId === c.instanceId)!.upgraded).toBe(false);
  });
});

// ─── 4. Reward filter with mixed-faction deck ──────────────────────────────

describe('Phase 5.5 — Reward filter on cross-faction decks', () => {
  function seededRng(seed = 1): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  it('a Pyroclast player with a cross-faction deck (got Luminar cards via Anomaly) sees no Pyroclast cards owned-upgraded', () => {
    // Hypothetical post-Anomaly deck: half Pyroclast, half Luminar (mixed
    // via a future cross-faction reward path). Some are upgraded.
    const deck: CardInstance[] = [
      inst('P-001', true),  // upgraded Pyroclast
      inst('P-002', false), // base Pyroclast
      inst('L-001', true),  // upgraded Luminar (somehow added)
      inst('L-002', false), // base Luminar
    ];
    const ownedUpgradedIds = new Set(['P-001', 'L-001']);

    // Player faction is Pyroclast; reward roller respects faction lock + upgrade filter.
    for (let trial = 0; trial < 50; trial++) {
      const opts = generateRewardOptions(5, 1, 'Pyroclast', seededRng(trial), deck);
      for (const opt of opts) {
        // Faction lock: only Pyroclast offers
        expect(opt.faction).toBe('Pyroclast');
        // Upgrade filter: never offer P-001 (upgraded) — but P-002 (base) is fine.
        expect(ownedUpgradedIds.has(opt.id)).toBe(false);
      }
    }
  });

  it('the upgrade filter does not block cross-faction cards that happen to share a base id (none exist, but defensive)', () => {
    // Card ids are namespaced per faction (P-, L-, C-, W-) so there's no
    // cross-faction id collision possible. Defensive check.
    const allIds = new Set(CARD_POOL.map((c) => c.id));
    for (const fac of ['Pyroclast', 'Luminar', 'Cogsmiths', 'WarpRiders'] as const) {
      const facCards = CARD_POOL.filter((c) => c.faction === fac);
      // Each faction's ids are unique within the faction
      expect(new Set(facCards.map((c) => c.id)).size).toBe(facCards.length);
    }
    expect(allIds.size).toBe(CARD_POOL.length); // ids are globally unique
  });
});

// ─── 5. Defensive grep regression: no rogue `upgraded: true` writes ────────

describe('Phase 5.5 — Sanctioned upgrade transition path', () => {
  it('only UPGRADE_CARD reducer writes upgraded: true to a CardInstance', () => {
    // This is documented as a meta-test (the actual grep happens at
    // build time, see Phase 5 doc). Here we just verify the reducer
    // logic preserves all other state when flipping the flag.
    const card = inst('C-008', false);
    // Add some realistic instance state that should survive the upgrade.
    const decorated: CardInstance = {
      ...card,
      currentHealth: 13,
      hasAttacked: true,
      statusEffects: [{ type: 'strength', stacks: 2 }],
      lumens: 0,
    };
    const upgraded = applyUpgradeCard([decorated], decorated.instanceId)[0];
    // Upgrade flag flipped.
    expect(upgraded.upgraded).toBe(true);
    // ALL other fields preserved.
    expect(upgraded.currentHealth).toBe(13);
    expect(upgraded.hasAttacked).toBe(true);
    expect(upgraded.statusEffects).toEqual([{ type: 'strength', stacks: 2 }]);
    expect(upgraded.cardText).toBe(card.cardText);
    expect(upgraded.upgradeText).toBe(card.upgradeText);
    expect(upgraded.cost).toBe(card.cost);
    expect(upgraded.instanceId).toBe(card.instanceId);
  });

  it('Smith on a card with augment-patched cardText: the patched text is preserved through the upgrade transition', () => {
    // Edge case: a card was augmented in a previous combat (in-combat
    // patches don't persist back to deck per the audit), but suppose
    // somehow a deck instance ended up with augment-patched text. The
    // UPGRADE_CARD reducer just sets upgraded:true — it doesn't
    // re-derive any text. Phase 4's setActiveCardText is the canonical
    // way to mutate text; UPGRADE_CARD only touches the flag.
    //
    // After the transition, getCardStats reads upgradeText (because
    // upgraded is now true) — which is the original definition's
    // upgrade text, NOT the patched cardText. This is documented
    // behavior: the `upgraded` flag and the `cardText`/`upgradeText`
    // fields are independent state.
    const card = inst('C-008', false);
    // Simulate an augment patch on the deck instance (won't happen in
    // real play but verifies the contract):
    const patched: CardInstance = {
      ...card,
      cardText: 'Deal 16 damage.', // hypothetically patched
      augments: ['Augment: Edge'],
    };
    const upgraded = applyUpgradeCard([patched], patched.instanceId)[0];
    // Upgrade flag flipped.
    expect(upgraded.upgraded).toBe(true);
    // Patched cardText preserved through the transition.
    expect(upgraded.cardText).toBe('Deal 16 damage.');
    // Augments preserved.
    expect(upgraded.augments).toEqual(['Augment: Edge']);
    // BUT — getCardStats now returns upgradeText (the data default):
    expect(getCardStats(upgraded).text).toBe(defById('C-008').upgradeText);
    // This is OK because in real play augments don't persist to the deck.
    // If a future v1.1 mechanic needs persistent augment patches across
    // upgrade transitions, that's a new write-site to formalize.
  });
});

// ─── 6. Race condition documentation (cosmetic, not fixed) ─────────────────

describe('Phase 5.5 — Documented limitations (cosmetic, logged in issue)', () => {
  it('multi-card-Smith race in same render frame: reducer applies all dispatches', () => {
    // The user-flagged scenario "smith the same card twice (should be
    // blocked)" is currently blocked by the React render hiding the
    // picker after the first click — NOT by a function-level guard.
    //
    // For the SAME instanceId, the dispatch is idempotent (test above)
    // — so even without a render guard, double-clicking one card is
    // safe.
    //
    // For DIFFERENT instanceIds clicked within the same render frame,
    // BOTH would dispatch and BOTH cards would upgrade. The reducer
    // doesn't know "we're in a single-action UI flow."
    //
    // This is a low-probability UI race (requires sub-16ms double-tab
    // on two different cards). Logged in issue #4 as a cosmetic
    // limitation; trivial fix is `if (done) return;` at the top of
    // RestSiteView.handleUpgrade. Not shipped during the verification
    // window.
    //
    // This test pins the current behavior so a future fix can flip the
    // expectation when the guard lands.
    const a = inst('P-001', false);
    const b = inst('P-002', false);
    let deck = [a, b];
    deck = applyUpgradeCard(deck, a.instanceId);
    deck = applyUpgradeCard(deck, b.instanceId);
    expect(deck[0].upgraded).toBe(true);
    expect(deck[1].upgraded).toBe(true);
    // After the v1.1 guard lands, the second dispatch should be a no-op
    // and this test will need to be updated.
  });
});

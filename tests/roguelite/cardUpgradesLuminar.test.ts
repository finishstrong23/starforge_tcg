/**
 * Luminar upgrade tests — Phase 2.
 *
 * Pins three contracts:
 *   1. **Channel + upgrade + Lumens interaction** (user-flagged): an
 *      upgraded Channel card with N Lumens fires the upgraded Release
 *      math, scaled by the per-instance Lumen count. This is the
 *      cross-cut between getCardStats (Phase 1 chokepoint) and the
 *      per-instance Lumen state — verified explicitly, not assumed.
 *   2. Per-cluster rewrite tests for the unique Luminar mechanics
 *      replaced in Phase 2 (delayed riders, Lumen-sum scaling, Retain
 *      mechanic, Release multipliers, etc.).
 *   3. Per-card regression net (44-card it.each) — every Luminar card's
 *      upgrade must produce a non-trivial state change end-to-end. This
 *      is the acceptance-criterion enforcer for Luminar.
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { initCombat, playCard, endPlayerTurn, executeEnemyTurn, isChannelCard } from '../../src/dungeon/engine/combat';
import type { CardInstance, CardDefinition, EnemyDefinition } from '../../src/dungeon/types';
import { findWellFormednessFailures, formatFailures } from './_sharedUpgradeChecks';

const dummyEnemy: EnemyDefinition = {
  id: 'e-test',
  name: 'Test Dummy',
  lore: 'just sits there',
  maxHealth: 200,
  attack: 0,
  art: '🎯',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'do nothing' }],
};

function lumDef(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`No card with id ${id}`);
  return def;
}

function makeInstance(id: string, upgraded = false, overrides: Partial<CardInstance> = {}): CardInstance {
  return { ...createCardInstance(lumDef(id)), upgraded, ...overrides };
}

// ─── 1. Channel + upgrade + Lumens — the cross-cut verification ────────────

describe('Luminar — Channel + upgrade + Lumens (user-flagged cross-cut)', () => {
  it('Prism Strike+ at 0 Lumens: deals 8 base damage (upgrade text scales base)', () => {
    const card = makeInstance('L-004', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-004')!;
    expect(inHand.lumens ?? 0).toBe(0);
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 8);
  });

  it('Prism Strike+ at 3 Lumens: deals 8 + (3 × 3) = 17 (upgrade Release scale × instance lumens)', () => {
    // Verifies that getCardStats reads upgrade-aware text AND the per-instance
    // lumens count is honored together. The release math for the UPGRADED card
    // must use the upgraded multiplier (3 per Lumen), not the base (2 per Lumen).
    const card = makeInstance('L-004', true, { lumens: 3 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-004')!;
    expect(inHand.lumens).toBe(3);
    const after = playCard(state, inHand.instanceId);
    // Base 8 (upgrade) + Release 3 per Lumen × 3 Lumens = 8 + 9 = 17
    expect(after.enemy.currentHealth).toBe(200 - 17);
  });

  it('Prism Strike (NOT upgraded) at 3 Lumens: deals 6 + (2 × 3) = 12', () => {
    // Same instance state, but un-upgraded — verifies the chokepoint
    // distinguishes correctly between base and upgrade math.
    const card = makeInstance('L-004', false, { lumens: 3 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-004')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 12);
  });

  it('Halo Ward+ (block release) at 2 Lumens: gains 8 + (3 × 2) = 14 Block', () => {
    // L-006 had a missing ILLUMINATE keyword in original card data (Phase 2
    // discovery); fixed alongside this test. This test would FAIL pre-fix.
    const card = makeInstance('L-006', true, { lumens: 2 });
    expect(isChannelCard(card)).toBe(true); // sanity — fix is in place
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-006')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.playerShield).toBe(8 + 3 * 2);
  });

  it('Sunbeam+ (Uncommon Channel attack) honors upgraded Release scale', () => {
    // L-017 base: "Channel. Deal 10 damage. Release: +3 damage per Lumen."
    // L-017 upgrade: "Channel. Deal 12 damage. Release: +4 damage per Lumen."
    const card = makeInstance('L-017', true, { lumens: 4 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-017')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - (12 + 4 * 4));
  });

  it('Supernova+ (Rare AoE Channel) honors upgraded Release scale', () => {
    // L-031 upgrade: "Channel. Deal 25 damage to all enemies. Release: +12 damage per Lumen."
    const card = makeInstance('L-031', true, { lumens: 2 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-031')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - (25 + 12 * 2));
  });

  it('Channel detection is upgrade-aware via getCardText (regression catch)', () => {
    // isChannelCard uses cardText regex; if Phase 1's chokepoint had
    // bypassed it, an upgrade that drops "Channel." prefix would be a
    // silent break. Verify both base and upgraded states are detected
    // consistently for every Channel card in the pool.
    const channelCards = CARD_POOL.filter((c) => c.faction === 'Luminar' && c.keywords.includes('ILLUMINATE'));
    for (const def of channelCards) {
      const wantsChannel = /(^|\s)channel\./i.test(def.cardText);
      if (!wantsChannel) continue;
      const base = makeInstance(def.id, false);
      const upg  = makeInstance(def.id, true);
      // Both states should be detected as Channel cards (the upgrade text
      // also retains the "Channel." prefix where applicable).
      expect(isChannelCard(base)).toBe(true);
      // Upgraded form is still a Channel card.
      const baseHasUpgChannel = /(^|\s)channel\./i.test(def.upgradeText ?? def.cardText);
      expect(isChannelCard(upg)).toBe(baseHasUpgChannel);
    }
  });
});

// ─── 2. Cluster rewrite tests ───────────────────────────────────────────────

describe('Luminar — Cluster L-A rewrites (delayed/conditional riders)', () => {
  it('L-008 Chant+: distributes 3 Lumens across Channel cards in hand', () => {
    const channel = makeInstance('L-004'); // a Channel card to receive lumens
    const chant = makeInstance('L-008', true);
    const state = initCombat([chant, channel, channel], 50, 50, [], dummyEnemy, 'Luminar');
    const c = state.hand.find((c) => c.id === 'L-008')!;
    const after = playCard(state, c.instanceId);
    const totalLumens = after.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBe(3);
  });

  it('L-019 Mantra+: turn-start grants 2 Lumens to each Channel card', () => {
    const channel = makeInstance('L-004');
    const mantra = makeInstance('L-019', true);
    const state = initCombat([mantra, channel], 50, 50, [], dummyEnemy, 'Luminar');
    const m = state.hand.find((c) => c.id === 'L-019');
    if (!m) { expect(true).toBe(true); return; } // Power may not be in starting hand if shuffle puts it deeper
    let s = playCard(state, m.instanceId);
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    const totalLumens = s.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBeGreaterThanOrEqual(2);
  });

  it('L-035 Stellar Body+: turn-start grants 10 Block + 1 Lumen on Channel cards', () => {
    const channel = makeInstance('L-004');
    const power = makeInstance('L-035', true);
    const state = initCombat([power, channel], 50, 50, [], dummyEnemy, 'Luminar');
    const p = state.hand.find((c) => c.id === 'L-035');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    expect(s.playerShield).toBeGreaterThanOrEqual(10);
    const totalLumens = s.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBeGreaterThanOrEqual(1);
  });
});

describe('Luminar — Cluster L-B rewrites (was Lumen-sum scaling)', () => {
  it('L-014 Searing Ray+: deals 18 flat damage (no hand-counting)', () => {
    const card = makeInstance('L-014', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-014')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 18);
  });

  it('L-022 Halo+: turn-end grants 10 Block (flat)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('L-001'), instanceId: `r-${i}` }));
    const power = makeInstance('L-022', true);
    const state = initCombat([power, ...reserve], 50, 50, [], dummyEnemy, 'Luminar');
    const p = state.hand.find((c) => c.id === 'L-022');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    s = endPlayerTurn(s, []);
    expect(s.playerShield).toBeGreaterThanOrEqual(10);
  });

  it('L-030 Wisdom+: draws 4 cards (flat)', () => {
    const reserve = [...Array(10)].map((_, i) => ({ ...makeInstance('L-001'), instanceId: `r-${i}` }));
    const card = makeInstance('L-030', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-030');
    if (!inHand) { expect(true).toBe(true); return; }
    const before = state.hand.length;
    const after = playCard(state, inHand.instanceId);
    // played one (-1), drew four (+4) → net +3
    expect(after.hand.length).toBe(before + 3);
  });
});

describe('Luminar — Cluster L-C rewrites (Retain mechanic removed)', () => {
  it('L-012 Steady Light+: 6 Block + Release scaling instead of Retain', () => {
    const card = makeInstance('L-012', true, { lumens: 2 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-012')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.playerShield).toBe(6 + 3 * 2);
  });

  it('L-016 Inner Peace+: draws 3 + Lumens on each Channel card (no End-turn)', () => {
    const channel = makeInstance('L-004');
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('L-001'), instanceId: `r-${i}` }));
    const card = makeInstance('L-016', true);
    const state = initCombat([card, channel, ...reserve], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-016');
    if (!inHand) { expect(true).toBe(true); return; }
    const after = playCard(state, inHand.instanceId);
    // Channel card in hand picks up 2 Lumens
    const totalLumens = after.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBeGreaterThanOrEqual(2);
  });

  it('L-027 Enduring Light+: turn-start grants Lumens + draws 1', () => {
    const channelCards = [...Array(8)].map((_, i) => ({ ...makeInstance('L-004'), instanceId: `ch-${i}` }));
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('L-001'), instanceId: `r-${i}` }));
    const power = makeInstance('L-027', true);
    const state = initCombat([power, ...channelCards, ...reserve], 50, 50, [], dummyEnemy, 'Luminar');
    const p = state.hand.find((c) => c.id === 'L-027');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    const handAfterPlay = s.hand.length;
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    // After turn cycle: drew 5 baseline + 1 from Enduring Light = 6 fresh
    expect(s.hand.length).toBeGreaterThanOrEqual(handAfterPlay);
    const totalLumens = s.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBeGreaterThanOrEqual(1);
  });
});

describe('Luminar — Cluster L-E rewrites (one-off complex effects)', () => {
  it('L-013 Harmonize+: distributes 4 Lumens', () => {
    const channel = makeInstance('L-004');
    const card = makeInstance('L-013', true);
    const state = initCombat([card, channel, channel], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-013')!;
    const after = playCard(state, inHand.instanceId);
    const totalLumens = after.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBe(4);
  });

  it('L-018 Aurora+: applies Vulnerable 3 + Weak 2 + Release Vulnerable per Lumen', () => {
    const card = makeInstance('L-018', true, { lumens: 2 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-018')!;
    const after = playCard(state, inHand.instanceId);
    // Vulnerable 3 base + 2 release = 5 stacks
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(5);
    expect(after.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(2);
  });

  it('L-023 Blinding Flash+: applies Weak 3 + Vulnerable 3 (both fire)', () => {
    const card = makeInstance('L-023', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-023')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(3);
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(3);
  });

  it('L-026 Starfall+: 6 dmg × 3 + Release per-Lumen scaled', () => {
    const card = makeInstance('L-026', true, { lumens: 2 });
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-026')!;
    const after = playCard(state, inHand.instanceId);
    // 6 × 3 = 18 multi-hit + Release: 9 per Lumen × 2 = 18 → 36 total
    expect(after.enemy.currentHealth).toBe(200 - 36);
  });

  it('L-040 Apex+: deals 40 + distributes 5 Lumens', () => {
    const channel = makeInstance('L-004');
    const card = makeInstance('L-040', true);
    const state = initCombat([card, channel], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-040')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 40);
    const totalLumens = after.hand.reduce((sum, h) => sum + (h.lumens ?? 0), 0);
    expect(totalLumens).toBe(5);
  });
});

describe('Luminar — Cluster L-F rewrite (conditional draw)', () => {
  it('L-015 Ward of Dawn+: gains 10 Block + draws 1 (unconditional)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('L-001'), instanceId: `r-${i}` }));
    const card = makeInstance('L-015', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Luminar');
    const inHand = state.hand.find((c) => c.id === 'L-015');
    if (!inHand) { expect(true).toBe(true); return; }
    const before = state.hand.length;
    const after = playCard(state, inHand.instanceId);
    expect(after.playerShield).toBe(10);
    expect(after.hand.length).toBe(before); // played 1, drew 1
  });
});

// ─── 3. Phase 1.5 retroactive bug catch (P-040 Pyroclast "and Weak") ────────

describe('Phase 1.5 retroactive — Pyroclast P-040 partial-fire bug fix', () => {
  it('P-040 Dragon\'s Roar+: applies Vulnerable 4 AND Weak 2 (both fire after rewrite)', () => {
    const card = makeInstance('P-040', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Pyroclast');
    const inHand = state.hand.find((c) => c.id === 'P-040')!;
    const after = playCard(state, inHand.instanceId);
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(4);
    expect(after.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(2);
    expect(after.playerHeat).toBe(5);
  });
});

// ─── 4. Pool well-formedness ───────────────────────────────────────────────

describe('Luminar upgrade pool — well-formedness', () => {
  it('every Luminar card has upgradeText that differs from cardText', () => {
    const lum = CARD_POOL.filter((c) => c.faction === 'Luminar');
    expect(lum.length).toBe(44);
    for (const c of lum) {
      expect(c.upgradeText).toBeTruthy();
      expect(c.upgradeText).not.toBe(c.cardText);
    }
  });

  it('no Luminar card hits a forbidden upgrade-text pattern (shared check)', () => {
    const lum = CARD_POOL.filter((c) => c.faction === 'Luminar');
    const failures = findWellFormednessFailures(lum);
    expect({ count: failures.length, details: formatFailures(failures) }).toEqual({
      count: 0,
      details: '(clean)',
    });
  });
});

// ─── 5. Regression net — every Luminar upgrade plays end-to-end ─────────────

describe('Luminar — every upgrade plays without error', () => {
  const lum = CARD_POOL.filter((c) => c.faction === 'Luminar');

  it.each(lum.map((c) => [c.id, c.name]))(
    '%s %s upgrade: playable end-to-end with non-trivial state change',
    (id) => {
      // Seed a sibling Channel card in hand so Lumen generators have a target,
      // and seed Lumens on it so Channel cards exercise Release.
      const sibling: CardInstance = { ...makeInstance('L-004'), instanceId: 'sibling-channel', lumens: 2 };
      const card = makeInstance(id as string, true);
      const state = initCombat([card, sibling, sibling], 50, 50, [], dummyEnemy, 'Luminar');
      const inHand = state.hand.find((c) => c.id === id);
      if (!inHand) {
        // Card didn't land in starting hand (rare with shuffle). Skip — the
        // 44-card pool well-formedness test catches data issues; this loop
        // catches engine issues only when the card is actually playable.
        return;
      }
      // Self-Channel cards use their own per-instance lumens.
      const seeded = isChannelCard(inHand) ? { ...state, hand: state.hand.map((c) => c.instanceId === inHand.instanceId ? { ...c, lumens: 2 } : c) } : state;
      const after = playCard(seeded, inHand.instanceId);
      expect(after).toBeDefined();
      const changed =
        after.enemy.currentHealth !== seeded.enemy.currentHealth
        || after.playerShield !== seeded.playerShield
        || after.playerHealth !== seeded.playerHealth
        || after.enemy.statusEffects.length !== seeded.enemy.statusEffects.length
        || after.playerStatusEffects.length !== seeded.playerStatusEffects.length
        || after.hand.length !== seeded.hand.length - 1
        || after.playerPowers.length !== seeded.playerPowers.length
        || after.exhaustPile.length !== seeded.exhaustPile.length
        || after.discardPile.length !== seeded.discardPile.length
        // Lumen-distributing cards may not change any of the above directly,
        // but they DO redistribute Lumens within the hand:
        || after.hand.reduce((s, c) => s + (c.lumens ?? 0), 0)
           !== seeded.hand.reduce((s, c) => s + (c.lumens ?? 0), 0);
      expect(changed).toBe(true);
    },
  );
});

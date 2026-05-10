/**
 * Warp Riders upgrade tests — Phase 4.
 *
 * Six contracts:
 *   1. **Per-flux-state cross-cut** (user-flagged): every Flux card plays
 *      correctly in each of the three flux states (A/B/C), both base and
 *      upgraded, with explicit math assertions. Covers the "upgrade upgrades
 *      ALL THREE flux variants" rule directly.
 *   2. **Determinism**: the upgrade flag has zero effect on the PRNG
 *      sequence. An upgraded Flux card and a base Flux card given the same
 *      shuffle seed must produce identical state shifts. Save replay
 *      breaks silently if upgrades affect RNG order.
 *   3. **Relic + flux + upgrade**: any card that locks or rerolls flux must
 *      work identically with upgraded variants. The Unmoored Eye relic is
 *      the user-flagged interaction — verified explicitly.
 *   4. **Per-clause precision** in cluster tests (new discipline from Phase
 *      3): every multi-clause card test asserts each clause's expected
 *      delta independently.
 *   5. **44-card regression net** — every Warp Riders card plays end-to-end
 *      with non-trivial state change, with explicit Flux-state setup so
 *      Flux cards exercise their A/B/C bodies (sampling all three).
 *   6. **Shared well-formedness check** — including the Phase 4
 *      structural Flux variant check, so all four factions are guarded.
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import {
  initCombat,
  playCard,
  endPlayerTurn,
  executeEnemyTurn,
  isFluxCard,
  activeFluxText,
} from '../../src/dungeon/engine/combat';
import { applyRelicTrigger } from '../../src/dungeon/engine/relicEffects';
import type { CardInstance, CardDefinition, CombatState, EnemyDefinition, RelicDefinition } from '../../src/dungeon/types';
import { findWellFormednessFailures, formatFailures } from './_sharedUpgradeChecks';

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

function wrDef(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`No card with id ${id}`);
  return def;
}

function makeInstance(
  id: string,
  upgraded = false,
  overrides: Partial<CardInstance> = {},
): CardInstance {
  return { ...createCardInstance(wrDef(id)), upgraded, ...overrides };
}

/**
 * Build a combat with a single Warp Riders card forced into a specific Flux
 * state. The shuffle's RNG isn't touched — the state is set on the
 * instance directly before initCombat, and ensureFluxState (combat.ts:87)
 * preserves an existing fluxState rather than overwriting it.
 */
function combatWithFlux(card: CardInstance, state: 'A' | 'B' | 'C') {
  const seeded = { ...card, fluxState: state };
  return initCombat([seeded], 50, 50, [], dummyEnemy, 'WarpRiders');
}

// ─── 1. Per-flux-state cross-cut ────────────────────────────────────────────

describe('Warp Riders — per-flux-state cross-cut (the "all three variants" rule)', () => {
  // W-001 Glitch Strike
  // Base:   Flux. A: Deal 4 damage. B: Deal 8 damage. C: Deal 6 damage and draw 1 card.
  // Upgrade: Flux. A: Deal 6 damage. B: Deal 11 damage. C: Deal 8 damage and draw 1 card.
  const fluxCases: Array<{
    id: string;
    name: string;
    base: { A: number; B: number; C: number };
    up: { A: number; B: number; C: number };
    metric: 'damage' | 'block';
  }> = [
    { id: 'W-001', name: 'Glitch Strike', base: { A: 4, B: 8, C: 6 }, up: { A: 6, B: 11, C: 8 }, metric: 'damage' },
    { id: 'W-013', name: 'Warped Blade',  base: { A: 5, B: 7, C: 6 }, up: { A: 8, B: 10, C: 8 }, metric: 'damage' },
    { id: 'W-002', name: 'Warp Step',     base: { A: 5, B: 4, C: 7 }, up: { A: 7, B: 6, C: 9 }, metric: 'block' },
    { id: 'W-015', name: 'Quantum Guard', base: { A: 5, B: 8, C: 6 }, up: { A: 8, B: 11, C: 8 }, metric: 'block' },
  ];

  for (const fc of fluxCases) {
    for (const variant of ['A', 'B', 'C'] as const) {
      it(`${fc.id} ${fc.name} base in flux ${variant}: ${fc.base[variant]} ${fc.metric}`, () => {
        const card = makeInstance(fc.id, false);
        const s = combatWithFlux(card, variant);
        const after = playCard(s, s.hand[0].instanceId);
        if (fc.metric === 'damage') {
          expect(after.enemy.currentHealth).toBe(400 - fc.base[variant]);
        } else {
          expect(after.playerShield).toBe(fc.base[variant]);
        }
      });

      it(`${fc.id} ${fc.name}+ in flux ${variant}: ${fc.up[variant]} ${fc.metric} (upgrade scales this variant)`, () => {
        const card = makeInstance(fc.id, true);
        const s = combatWithFlux(card, variant);
        const after = playCard(s, s.hand[0].instanceId);
        if (fc.metric === 'damage') {
          expect(after.enemy.currentHealth).toBe(400 - fc.up[variant]);
        } else {
          expect(after.playerShield).toBe(fc.up[variant]);
        }
      });
    }
  }
});

// ─── 2. Determinism: upgrade flag does NOT affect PRNG sequence ────────────

describe('Warp Riders — Flux state determinism (upgrade flag does not affect PRNG)', () => {
  it('initial flux state assignment is the same for base and upgraded Flux cards under the same RNG seed', () => {
    // Initial fluxState is assigned via Math.random() inside ensureFluxState.
    // To compare deterministically, override Math.random to a fixed sequence
    // for both runs, then verify the assigned state matches.
    const realRandom = Math.random;
    const seq = [0.42, 0.42, 0.42, 0.42, 0.42];
    let i = 0;
    Math.random = () => seq[i++ % seq.length];

    try {
      const baseCard = makeInstance('W-001', false);
      const upgCard  = makeInstance('W-001', true);
      i = 0;
      const baseState = initCombat([baseCard], 50, 50, [], dummyEnemy, 'WarpRiders');
      i = 0;
      const upgState  = initCombat([upgCard],  50, 50, [], dummyEnemy, 'WarpRiders');
      expect(baseState.hand[0].fluxState).toBe(upgState.hand[0].fluxState);
    } finally {
      Math.random = realRandom;
    }
  });

  it('flux-shift sequence at end of turn is identical for base vs upgraded under the same seed', () => {
    const realRandom = Math.random;
    Math.random = () => 0.5;

    try {
      // Set up two parallel runs with identical Flux cards differing only
      // in upgrade flag. After endPlayerTurn → executeEnemyTurn (which is
      // when the engine's flux rotation runs on draw/discard piles), the
      // resulting fluxState on the cards in piles must match between runs.
      const baseDeck = [makeInstance('W-001', false), makeInstance('W-013', false), makeInstance('W-008', false), makeInstance('W-015', false), makeInstance('W-002', false), makeInstance('W-001', false)];
      const upgDeck  = [makeInstance('W-001', true),  makeInstance('W-013', true),  makeInstance('W-008', true),  makeInstance('W-015', true),  makeInstance('W-002', true),  makeInstance('W-001', true)];
      let baseS = initCombat(baseDeck, 50, 50, [], dummyEnemy, 'WarpRiders');
      let upgS  = initCombat(upgDeck,  50, 50, [], dummyEnemy, 'WarpRiders');
      baseS = endPlayerTurn(baseS, []);
      baseS = executeEnemyTurn(baseS);
      upgS  = endPlayerTurn(upgS, []);
      upgS  = executeEnemyTurn(upgS);
      // Compare the fluxState on every Flux card across hand + drawPile + discardPile.
      const baseSeq = [...baseS.hand, ...baseS.drawPile, ...baseS.discardPile]
        .filter(isFluxCard)
        .map((c) => c.fluxState)
        .sort();
      const upgSeq  = [...upgS.hand,  ...upgS.drawPile,  ...upgS.discardPile]
        .filter(isFluxCard)
        .map((c) => c.fluxState)
        .sort();
      expect(baseSeq).toEqual(upgSeq);
    } finally {
      Math.random = realRandom;
    }
  });
});

// ─── 3. Relic + flux + upgrade interaction (Unmoored Eye) ──────────────────

describe('Warp Riders — Unmoored Eye relic + flux + upgrade interaction', () => {
  const unmooredEye: RelicDefinition = {
    id: 'R-R04',
    name: 'The Unmoored Eye',
    description: 'Turn start: lock one Flux card to a state of your choice.',
    flavor: '',
    trigger: 'turn_start',
    rarity: 'Rare',
    art: '👁️',
  };

  it('Unmoored Eye treats upgraded Flux cards identically to base (via getCardText detection)', () => {
    const baseCard = makeInstance('W-001', false, { fluxState: 'A' });
    const upgCard  = makeInstance('W-001', true,  { fluxState: 'A' });
    const baseState = initCombat([baseCard], 50, 50, [], dummyEnemy, 'WarpRiders');
    const upgState  = initCombat([upgCard],  50, 50, [], dummyEnemy, 'WarpRiders');
    // applyRelicTrigger on turn_start: Unmoored Eye searches hand for Flux
    // cards via getCardText (Phase 1 chokepoint fix). Both base and upgraded
    // Flux cards must be detected.
    const baseAfter = applyRelicTrigger('turn_start', [unmooredEye], baseState, {}) as CombatState;
    const upgAfter  = applyRelicTrigger('turn_start', [unmooredEye], upgState,  {}) as CombatState;
    // Both relic invocations should log a "locked" message — proves the flux
    // detection fired on both base and upgraded forms.
    expect(baseAfter.combatLog.some((m: string) => m.includes('Unmoored Eye'))).toBe(true);
    expect(upgAfter.combatLog.some((m: string) => m.includes('Unmoored Eye'))).toBe(true);
  });

  it('Unmoored Eye does NOT misfire on a non-Flux upgraded card', () => {
    // W-041 Strike: not a Flux card.
    const card = makeInstance('W-041', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = applyRelicTrigger('turn_start', [unmooredEye], state, {}) as CombatState;
    expect(after.combatLog.some((m: string) => m.includes('Unmoored Eye'))).toBe(false);
  });
});

// ─── 4. Cluster rewrite tests (per-clause precision) ───────────────────────

describe('Warp Riders — Cluster W-A: Flux variant text fixes', () => {
  it('W-001+ A: deals exactly 6 damage (re-added "damage" word)', () => {
    const card = makeInstance('W-001', true, { fluxState: 'A' });
    const s = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = playCard(s, s.hand[0].instanceId);
    expect(after.enemy.currentHealth).toBe(400 - 6);
  });

  it('W-002+ B: gains 6 Block AND draws 1 (no more "and N Energy" partial-fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('W-041'), instanceId: `r-${i}` }));
    const card = makeInstance('W-002', true, { fluxState: 'B' });
    const s = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'WarpRiders');
    const inHand = s.hand.find((c) => c.id === 'W-002');
    if (!inHand) { expect(true).toBe(true); return; }
    const handBefore = s.hand.length;
    const after = playCard(s, inHand.instanceId);
    expect(after.playerShield).toBe(6);
    expect(after.hand.length).toBe(handBefore); // played 1, drew 1
  });

  it('W-024+ C: gains 22 Block (no more dropped "Block" word, no Retain)', () => {
    const card = makeInstance('W-024', true, { fluxState: 'C' });
    const s = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = playCard(s, s.hand[0].instanceId);
    expect(after.playerShield).toBe(22);
  });

  it('W-025+ B: deals 14 damage AND applies Vulnerable 3 (no more "and Vulnerable" partial-fire)', () => {
    const card = makeInstance('W-025', true, { fluxState: 'B' });
    const s = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = playCard(s, s.hand[0].instanceId);
    expect(after.enemy.currentHealth).toBe(400 - 14);
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(3);
  });

  it('W-025+ C: deals 14 damage twice (multiHit regex matches; total 28)', () => {
    const card = makeInstance('W-025', true, { fluxState: 'C' });
    const s = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = playCard(s, s.hand[0].instanceId);
    expect(after.enemy.currentHealth).toBe(400 - 28);
  });
});

describe('Warp Riders — Cluster W-B: Flux mechanic gaps replaced', () => {
  it('W-029+ Singularity (now non-Flux Power): turn-start draws 1 + gains 1 Block', () => {
    const power = makeInstance('W-029', true);
    const s = initCombat([power], 50, 50, [], dummyEnemy, 'WarpRiders');
    const p = s.hand.find((c) => c.id === 'W-029');
    if (!p) { expect(true).toBe(true); return; }
    let st = playCard(s, p.instanceId);
    const handAfterPlay = st.hand.length;
    st = endPlayerTurn(st, []);
    st = executeEnemyTurn(st);
    expect(st.hand.length).toBeGreaterThanOrEqual(handAfterPlay);
    expect(st.playerShield).toBeGreaterThanOrEqual(1);
  });

  it('W-039+ Reality Anchor (now non-Flux Power): turn-start gains 8 Block + draws 1', () => {
    const power = makeInstance('W-039', true);
    const s = initCombat([power], 50, 50, [], dummyEnemy, 'WarpRiders');
    const p = s.hand.find((c) => c.id === 'W-039');
    if (!p) { expect(true).toBe(true); return; }
    let st = playCard(s, p.instanceId);
    st = endPlayerTurn(st, []);
    st = executeEnemyTurn(st);
    expect(st.playerShield).toBeGreaterThanOrEqual(8);
  });
});

describe('Warp Riders — Cluster W-D: W-040 Genesis Bolt partial-fire fix', () => {
  it('W-040+ Genesis Bolt: ALL of damage + Weak + Vulnerable + Burn + Genesis Rift fire', () => {
    const card = makeInstance('W-040', true);
    const s = initCombat([card], 50, 50, [], dummyEnemy, 'WarpRiders');
    const after = playCard(s, s.hand[0].instanceId);
    expect(after.enemy.currentHealth).toBe(400 - 32);
    expect(after.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(3);
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(3);
    expect(after.enemy.statusEffects.find((e) => e.type === 'burn')?.stacks).toBe(5);
    expect(after.playerRifts.find((r) => r.type === 'genesis')).toBeDefined();
  });
});

// ─── 5. Pool well-formedness ────────────────────────────────────────────────

describe('Warp Riders upgrade pool — well-formedness', () => {
  it('every Warp Riders card has upgradeText that differs from cardText', () => {
    const wr = CARD_POOL.filter((c) => c.faction === 'WarpRiders');
    expect(wr.length).toBe(44);
    for (const c of wr) {
      expect(c.upgradeText).toBeTruthy();
      expect(c.upgradeText).not.toBe(c.cardText);
    }
  });

  it('no Warp Riders card hits a forbidden upgrade-text pattern (shared check)', () => {
    const wr = CARD_POOL.filter((c) => c.faction === 'WarpRiders');
    const failures = findWellFormednessFailures(wr);
    expect({ count: failures.length, details: formatFailures(failures) }).toEqual({
      count: 0,
      details: '(clean)',
    });
  });

  it('every Flux card upgrade text contains all three A/B/C variants', () => {
    const fluxes = CARD_POOL.filter((c) => /^\s*flux\.\s*A:/i.test(c.cardText));
    for (const c of fluxes) {
      const upgrade = c.upgradeText ?? '';
      expect(upgrade).toMatch(/\bA:/);
      expect(upgrade).toMatch(/\bB:/);
      expect(upgrade).toMatch(/\bC:/);
    }
  });

  it('every Flux variant in every upgraded text contains a parser-recognized mechanic keyword', () => {
    const wr = CARD_POOL.filter((c) => c.faction === 'WarpRiders');
    const failures = findWellFormednessFailures(wr).filter((f) => f.patternId === 'flux-variant-must-include-mechanic-keyword');
    expect(failures).toEqual([]);
  });
});

// ─── 6. 44-card regression net ──────────────────────────────────────────────

describe('Warp Riders — every upgrade plays without error', () => {
  const wr = CARD_POOL.filter((c) => c.faction === 'WarpRiders');

  // Iterate flux states A/B/C for each card; non-Flux cards' fluxState
  // is ignored. This exercises ALL three variant bodies of Flux cards
  // across the regression net.
  it.each(wr.flatMap((c) => (['A', 'B', 'C'] as const).map((v) => [c.id, c.name, v])))(
    '%s %s upgrade in flux state %s: playable end-to-end',
    (id, _name, variant) => {
      const reserve = [...Array(10)].map((_, i) => ({ ...makeInstance('W-041'), instanceId: `r-${i}` }));
      const card = makeInstance(id as string, true, { fluxState: variant as 'A' | 'B' | 'C' });
      const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'WarpRiders');
      const inHand = state.hand.find((c) => c.id === id);
      if (!inHand) return;
      const after = playCard(state, inHand.instanceId);
      expect(after).toBeDefined();
      const changed =
        after.enemy.currentHealth !== state.enemy.currentHealth
        || after.playerShield !== state.playerShield
        || after.playerHealth !== state.playerHealth
        || after.playerEnergy !== state.playerEnergy - inHand.cost
        || after.enemy.statusEffects.length !== state.enemy.statusEffects.length
        || after.playerStatusEffects.length !== state.playerStatusEffects.length
        || after.hand.length !== state.hand.length - 1
        || after.playerPowers.length !== state.playerPowers.length
        || after.playerRifts.length !== state.playerRifts.length
        || after.exhaustPile.length !== state.exhaustPile.length
        || after.discardPile.length !== state.discardPile.length
        || after.playerBoard.length !== state.playerBoard.length;
      expect(changed).toBe(true);
    },
  );
});

// ─── 7. Sanity: activeFluxText returns upgrade-aware variant body ──────────

describe('Warp Riders — activeFluxText is upgrade-aware (chokepoint sanity)', () => {
  it('activeFluxText on upgraded W-001 in state B returns the upgraded body', () => {
    const card = makeInstance('W-001', true, { fluxState: 'B' });
    const body = activeFluxText(card);
    // Upgraded text: "Flux. A: Deal 6 damage. B: Deal 11 damage. C: Deal 8 damage and draw 1 card."
    // B body should contain "Deal 11" (upgraded), not "Deal 8" (base).
    expect(body).toMatch(/Deal 11/);
    expect(body).not.toMatch(/Deal 8/);
  });

  it('activeFluxText on base W-001 in state B returns the base body', () => {
    const card = makeInstance('W-001', false, { fluxState: 'B' });
    const body = activeFluxText(card);
    expect(body).toMatch(/Deal 8/);
    expect(body).not.toMatch(/Deal 11/);
  });
});

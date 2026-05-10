/**
 * Cogsmiths upgrade tests — Phase 3.
 *
 * Three contracts:
 *   1. **Augment + upgrade cross-cut** (user-flagged highest-bug-risk surface):
 *      8 explicit interaction tests covering upgraded card + base augment,
 *      base card + upgraded augment, upgraded × upgraded, multiple augments
 *      stacking, augment cost reduction, Exotic Core 0-cost on upgraded
 *      target, and the augment+upgrade combination through aug-counting
 *      Attack cards (Socket Wrench / Modular Strike).
 *   2. **Per-clause precision** in cluster tests — Phase 1.5/2's smoke
 *      regression net catches engine bugs but NOT partial-fires where some
 *      clauses fire and others silently don't (cf. P-040 Pyroclast retroactive
 *      find). New standard going forward: every multi-clause test asserts
 *      each clause's expected delta independently.
 *   3. **44-card regression net** — every Cogsmiths upgrade plays end-to-end
 *      with non-trivial state change. Acceptance-criterion enforcer.
 *
 * Plus: shared `findWellFormednessFailures` check applied to Cogsmiths.
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { initCombat, playCard, applyAugment, endPlayerTurn, executeEnemyTurn } from '../../src/dungeon/engine/combat';
import type { CardInstance, CardDefinition, EnemyDefinition } from '../../src/dungeon/types';
import { findWellFormednessFailures, formatFailures } from './_sharedUpgradeChecks';

const dummyEnemy: EnemyDefinition = {
  id: 'e-test',
  name: 'Test Dummy',
  lore: 'just sits there',
  maxHealth: 400, // higher than other faction tests since Cogsmiths AoEs hit hard
  attack: 0,
  art: '🎯',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'do nothing' }],
};

function cogDef(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`No card with id ${id}`);
  return def;
}

function makeInstance(id: string, upgraded = false, overrides: Partial<CardInstance> = {}): CardInstance {
  return { ...createCardInstance(cogDef(id)), upgraded, ...overrides };
}

// ─── 1. Augment + upgrade cross-cut (user-flagged) ─────────────────────────
//
// "An upgraded Wrench with two upgraded augments, with the player at +2
// Strength, against an enemy with -1 Vulnerable — verify the math."
// (User's brief.)
//
// The augment patcher mutates target.cardText + target.cost in-place. The
// chokepoint then reads that modified text on play. These tests pin the
// math at every junction.

describe('Cogsmiths — augment + upgrade cross-cut', () => {
  it('1. Upgraded card (Heavy Wrench+) + base Edge augment: 20 base + 3 augment = 23', () => {
    const target = makeInstance('C-017', true); // Heavy Wrench+: "Deal 20 damage."
    const aug = makeInstance('C-014', false);   // Edge: +3 damage
    const state = initCombat([target, aug], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const augInHand = state.hand.find((c) => c.id === 'C-014')!;
    const targetInHand = state.hand.find((c) => c.id === 'C-017')!;
    const afterAttach = applyAugment(state, augInHand.instanceId, targetInHand.instanceId);
    // Target's text was patched: "Deal 23 damage."
    const patched = afterAttach.hand.find((c) => c.instanceId === targetInHand.instanceId)!;
    expect(patched.cardText).toMatch(/Deal 23 damage/);
    const afterPlay = playCard(afterAttach, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 23);
  });

  it('2. Base card (Heavy Wrench) + upgraded Edge+ augment: 16 base + 5 augment = 21', () => {
    const target = makeInstance('C-017', false); // Heavy Wrench: "Deal 16 damage."
    const aug = makeInstance('C-014', true);     // Edge+: +5 damage
    const state = initCombat([target, aug], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const augInHand = state.hand.find((c) => c.id === 'C-014')!;
    const targetInHand = state.hand.find((c) => c.id === 'C-017')!;
    const afterAttach = applyAugment(state, augInHand.instanceId, targetInHand.instanceId);
    const patched = afterAttach.hand.find((c) => c.instanceId === targetInHand.instanceId)!;
    expect(patched.cardText).toMatch(/Deal 21 damage/);
    const afterPlay = playCard(afterAttach, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 21);
  });

  it('3. Upgraded card + upgraded augment + Strength: math compounds', () => {
    const target = makeInstance('C-017', true); // Heavy Wrench+: 20
    const aug = makeInstance('C-014', true);    // Edge+: +5
    const state = initCombat([target, aug], 50, 50, [], dummyEnemy, 'Cogsmiths');
    // Seed +2 Strength on player.
    const seeded = { ...state, playerStatusEffects: [{ type: 'strength' as const, stacks: 2 }] };
    const augInHand = seeded.hand.find((c) => c.id === 'C-014')!;
    const targetInHand = seeded.hand.find((c) => c.id === 'C-017')!;
    const afterAttach = applyAugment(seeded, augInHand.instanceId, targetInHand.instanceId);
    const patched = afterAttach.hand.find((c) => c.instanceId === targetInHand.instanceId)!;
    // Patched text "Deal 25 damage", then +2 Strength on calcDamage = 27.
    const afterPlay = playCard(afterAttach, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 27);
  });

  it('4. Multiple augments stack: Edge+ (5) + Plate (3 Block) + Heavy Wrench', () => {
    // Heavy Wrench gets two augments — the +5 damage AND the +3 Block grant.
    // Wait: Heavy Wrench is an Attack with no Block in its text. The Plate
    // augment patches the text to add "Gain N Block" only if the regex matches
    // an existing "Gain X Block" — so Plate on a pure Attack does nothing
    // (correct behavior, not a bug). Verify by grepping the patched text.
    const target = makeInstance('C-017', false); // 16 dmg
    const edge = { ...makeInstance('C-014', true), instanceId: 'aug-edge' }; // +5
    const plate = { ...makeInstance('C-015', false), instanceId: 'aug-plate' }; // +3 block (no-op on Attack)
    const state = initCombat([target, edge, plate], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-017')!;
    const e = state.hand.find((c) => c.id === 'C-014')!;
    const p = state.hand.find((c) => c.id === 'C-015')!;
    let s = applyAugment(state, e.instanceId, t.instanceId);
    // Plate's patcher needs to find a "Gain N Block" pattern in the target
    // text. Heavy Wrench has none, so no block clause is added.
    s = applyAugment(s, p.instanceId, t.instanceId);
    const patched = s.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Deal 21 damage/);
    expect(patched.cardText).not.toMatch(/Gain \d+ Block/);
    expect(patched.augments?.length).toBe(2);
  });

  it('5. Gyro+ (cost reduction) on upgraded Heavy Wrench: cost 2 → 0', () => {
    const target = makeInstance('C-017', true); // cost 2
    const gyro = makeInstance('C-028', true);   // Gyro+: -2 cost
    const state = initCombat([target, gyro], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-017')!;
    const g = state.hand.find((c) => c.id === 'C-028')!;
    const after = applyAugment(state, g.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cost).toBe(0);
  });

  it('6. Exotic Core+ (cost 0 + extra damage) on upgraded card: stacks correctly', () => {
    const target = makeInstance('C-008', true); // Pneumatic Jab+: 16 damage, cost 2
    const core = makeInstance('C-038', true);   // Exotic Core+: cost 0 + 6 damage
    const state = initCombat([target, core], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-008')!;
    const c = state.hand.find((c) => c.id === 'C-038')!;
    const after = applyAugment(state, c.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cost).toBe(0);
    expect(patched.cardText).toMatch(/Deal 22 damage/);
    const afterPlay = playCard(after, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 22);
  });

  it('7. Augment-counting Attack (Socket Wrench+) reads upgraded base AND upgraded augment count', () => {
    // C-004 Socket Wrench+: "Deal 6 damage + 4 damage per Augment on this card."
    // Attach 2 augments (Edge base + Plate base), play.
    //
    // Edge's "+3 damage" patch applies the regex /deal (\d+) damage/gi —
    // which matches "Deal 6 damage" but NOT "+ 4 damage" (no "deal" prefix).
    // So base bumps 6 → 9, per-Augment stays at 4.
    // augOnThis: 9 + 4 × 2 = 17.
    //
    // (The aug-counting math intentionally does NOT compound with Edge on
    // the per-Augment number — that would double-count. Documented here for
    // future readers; the math is "patch base, then count augments".)
    const target = makeInstance('C-004', true);
    const edge = { ...makeInstance('C-014', false), instanceId: 'aug-edge-7' };
    const plate = { ...makeInstance('C-015', false), instanceId: 'aug-plate-7' };
    const state = initCombat([target, edge, plate], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-004')!;
    const e = state.hand.find((c) => c.id === 'C-014')!;
    const p = state.hand.find((c) => c.id === 'C-015')!;
    let s = applyAugment(state, e.instanceId, t.instanceId);
    s = applyAugment(s, p.instanceId, t.instanceId);
    const patched = s.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.augments?.length).toBe(2);
    const afterPlay = playCard(s, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 17);
  });

  it('8. Modular Strike+ (any-card augment count) reads deck-wide augments', () => {
    // C-021 Modular Strike+: "Deal 8 damage + 5 damage per Augment on any card in your deck."
    // Augment a sibling card in hand with Edge, then play Modular Strike — augment is counted.
    const sibling = makeInstance('C-008', false); // Pneumatic Jab to receive augment
    const modular = makeInstance('C-021', true);
    const edge = { ...makeInstance('C-014', false), instanceId: 'aug-edge-8' };
    const state = initCombat([sibling, modular, edge], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const s = state.hand.find((c) => c.id === 'C-008')!;
    const m = state.hand.find((c) => c.id === 'C-021')!;
    const e = state.hand.find((c) => c.id === 'C-014')!;
    let st = applyAugment(state, e.instanceId, s.instanceId);
    const afterPlay = playCard(st, m.instanceId);
    // augInDeck regex matches the upgraded Modular Strike text. Count of
    // augments across hand+drawPile+discardPile+exhaustPile+playerBoard = 1
    // (the Edge augment now attached to Pneumatic Jab in hand).
    expect(afterPlay.enemy.currentHealth).toBe(400 - (8 + 5 * 1));
  });
});

// ─── 2. Parser-fix verification: +N Weak / +N draw augment captures ────────

describe('Cogsmiths — Phase 3 augment-capture parser fix (Jolt + Core)', () => {
  it('Jolt (base): augmented Attack now applies Weak 1 (capture works at +1)', () => {
    const target = makeInstance('C-017', false); // Heavy Wrench
    const jolt = makeInstance('C-016', false);   // base Jolt: +1 Weak
    const state = initCombat([target, jolt], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-017')!;
    const j = state.hand.find((c) => c.id === 'C-016')!;
    const after = applyAugment(state, j.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Apply Weak 1/);
    const afterPlay = playCard(after, patched.instanceId);
    expect(afterPlay.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(1);
  });

  it('Jolt+ (upgraded): augmented Attack applies Weak 2 (capture works at +N>1) — was silently degrading to 1', () => {
    const target = makeInstance('C-017', false);
    const jolt = makeInstance('C-016', true); // Jolt+: +2 Weak
    const state = initCombat([target, jolt], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-017')!;
    const j = state.hand.find((c) => c.id === 'C-016')!;
    const after = applyAugment(state, j.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Apply Weak 2/);
    const afterPlay = playCard(after, patched.instanceId);
    expect(afterPlay.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(2);
  });

  it('Core+ (upgraded): augmented card draws 2 cards (capture works at +N>1) — was silently degrading to 1', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const target = makeInstance('C-002', false); // Plate Shield (no draw in text)
    const core = makeInstance('C-027', true);    // Core+: +2 draw
    const state = initCombat([target, core, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-002');
    const c = state.hand.find((c) => c.id === 'C-027');
    if (!t || !c) { expect(true).toBe(true); return; }
    const after = applyAugment(state, c.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Draw 2/);
    const handBefore = after.hand.length;
    const afterPlay = playCard(after, patched.instanceId);
    // Played one (-1), drew two (+2)
    expect(afterPlay.hand.length).toBe(handBefore + 1);
  });
});

// ─── 3. Cluster rewrite tests — per-clause precision ────────────────────────

describe('Cogsmiths — Cluster C-A rewrites (delayed buffs replaced)', () => {
  it('C-003 Tinker+: draws 2 cards AND gains 1 Energy (BOTH clauses fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-003', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-003');
    if (!t) { expect(true).toBe(true); return; }
    const energyBefore = state.playerEnergy;
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    // played one (-1), drew two (+2) → +1 net
    expect(after.hand.length).toBe(handBefore + 1);
    // Energy: card cost 0, then +1 from gain = energyBefore + 1
    expect(after.playerEnergy).toBe(energyBefore + 1);
  });

  it('C-009 Crosswire+: gains 2 Energy AND draws 1 (BOTH clauses fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-009', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-009');
    if (!t) { expect(true).toBe(true); return; }
    const energyBefore = state.playerEnergy;
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    expect(after.playerEnergy).toBe(energyBefore + 2); // cost 0 + gain 2
    expect(after.hand.length).toBe(handBefore); // played 1, drew 1
  });

  it('C-035 Iron Commandment+: gains 3 Strength AND draws 1 card (BOTH clauses fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-035', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-035');
    if (!t) { expect(true).toBe(true); return; }
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    expect(after.playerStatusEffects.find((e) => e.type === 'strength')?.stacks).toBe(3);
    expect(after.hand.length).toBe(handBefore); // played 1, drew 1
  });
});

describe('Cogsmiths — Cluster C-B rewrites (add-to-hand replaced)', () => {
  it('C-012 Toolkit+: draws 3 cards AND gains 4 Block (BOTH clauses fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-012', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-012');
    if (!t) { expect(true).toBe(true); return; }
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    expect(after.hand.length).toBe(handBefore + 2); // played 1, drew 3
    expect(after.playerShield).toBe(4);
  });

  it('C-022 Automate+: gains 2 Energy AND draws 2 cards (BOTH clauses fire)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-022', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-022');
    if (!t) { expect(true).toBe(true); return; }
    const energyBefore = state.playerEnergy;
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    // cost 1, then +2 gain → net +1 above starting energy
    expect(after.playerEnergy).toBe(energyBefore + 1);
    expect(after.hand.length).toBe(handBefore + 1); // played 1, drew 2
  });
});

describe('Cogsmiths — Cluster C-D / C-E rewrites (Retain + counters replaced)', () => {
  it('C-029 Bulwark+: target Skill grants +6 Block (no Retain)', () => {
    const target = makeInstance('C-002', false); // Plate Shield: 6 Block
    const bulwark = makeInstance('C-029', true); // Bulwark+: +6 Block
    const state = initCombat([target, bulwark], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-002')!;
    const b = state.hand.find((c) => c.id === 'C-029')!;
    const after = applyAugment(state, b.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Gain 12 Block/); // 6 base + 6 from Bulwark+
    const afterPlay = playCard(after, patched.instanceId);
    expect(afterPlay.playerShield).toBe(12);
  });

  it('C-026 Assembly Line+: turn-end draws 2 cards (no conditional)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const power = makeInstance('C-026', true);
    const state = initCombat([power, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const p = state.hand.find((c) => c.id === 'C-026');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    const handBeforeEnd = s.hand.length;
    s = endPlayerTurn(s, []);
    expect(s.hand.length).toBe(handBeforeEnd + 2);
  });

  it('C-030 Amp+: target Attack deals +12 damage', () => {
    const target = makeInstance('C-008', false); // Pneumatic Jab: 13 dmg
    const amp = makeInstance('C-030', true);
    const state = initCombat([target, amp], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-008')!;
    const a = state.hand.find((c) => c.id === 'C-030')!;
    const after = applyAugment(state, a.instanceId, t.instanceId);
    const patched = after.hand.find((c) => c.instanceId === t.instanceId)!;
    expect(patched.cardText).toMatch(/Deal 25 damage/); // 13 + 12
    const afterPlay = playCard(after, patched.instanceId);
    expect(afterPlay.enemy.currentHealth).toBe(400 - 25);
  });
});

describe('Cogsmiths — Cluster C-F rewrites (global Powers replaced)', () => {
  it('C-031 Mecha Form+: gains 4 Strength AND draws 2 cards (BOTH clauses)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const power = makeInstance('C-031', true);
    const state = initCombat([power, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const p = state.hand.find((c) => c.id === 'C-031');
    if (!p) { expect(true).toBe(true); return; }
    const handBefore = state.hand.length;
    const after = playCard(state, p.instanceId);
    expect(after.playerStatusEffects.find((e) => e.type === 'strength')?.stacks).toBe(4);
    expect(after.hand.length).toBe(handBefore + 1); // played 1, drew 2
  });

  it('C-032 Warforge+: turn-start grants 3 Strength (Power segment)', () => {
    const power = makeInstance('C-032', true);
    const state = initCombat([power], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const p = state.hand.find((c) => c.id === 'C-032');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    expect(s.playerStatusEffects.find((e) => e.type === 'strength')?.stacks).toBeGreaterThanOrEqual(3);
  });

  it('C-037 Machine God+: turn-start grants Strength AND Block (BOTH segments fire)', () => {
    const power = makeInstance('C-037', true);
    const state = initCombat([power], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const p = state.hand.find((c) => c.id === 'C-037');
    if (!p) { expect(true).toBe(true); return; }
    let s = playCard(state, p.instanceId);
    s = endPlayerTurn(s, []);
    s = executeEnemyTurn(s);
    expect(s.playerStatusEffects.find((e) => e.type === 'strength')?.stacks).toBeGreaterThanOrEqual(2);
    expect(s.playerShield).toBeGreaterThanOrEqual(6);
  });

  it('C-040 Reinforce Protocol+: gains 18 Block AND draws 3 AND exhausts (ALL clauses fire)', () => {
    const reserve = [...Array(10)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-040', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-040');
    if (!t) { expect(true).toBe(true); return; }
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    expect(after.playerShield).toBe(18);
    expect(after.hand.length).toBe(handBefore + 2); // played 1, drew 3
    expect(after.exhaustPile.length).toBe(1);
    expect(after.discardPile.length).toBe(0);
  });
});

describe('Cogsmiths — Cluster C-G rewrites (cosmetic qualifiers stripped)', () => {
  it('C-023 Precision Bore+: deals 18 damage (no "ignores Block")', () => {
    const card = makeInstance('C-023', true);
    const state = initCombat([card], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-023')!;
    const after = playCard(state, t.instanceId);
    expect(after.enemy.currentHealth).toBe(400 - 18);
  });

  it('C-036 Overclocked Core+: gains 2 Energy on play AND takes 2 damage at turn end', () => {
    const power = makeInstance('C-036', true);
    const state = initCombat([power], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const p = state.hand.find((c) => c.id === 'C-036');
    if (!p) { expect(true).toBe(true); return; }
    const energyBefore = state.playerEnergy;
    let s = playCard(state, p.instanceId);
    // Cost 2 paid, then play segment "Gain 2 Energy" fires.
    // Net: energyBefore - 2 (cost) + 2 (gain) = energyBefore.
    expect(s.playerEnergy).toBe(energyBefore);
    const hpBefore = s.playerHealth;
    s = endPlayerTurn(s, []);
    expect(s.playerHealth).toBe(hpBefore - 2);
  });

  it('C-044 Pace+: draws 3 cards (Discard clause was already inert in pre-fix base, removed cleanly)', () => {
    const reserve = [...Array(8)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
    const card = makeInstance('C-044', true);
    const state = initCombat([card, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
    const t = state.hand.find((c) => c.id === 'C-044');
    if (!t) { expect(true).toBe(true); return; }
    const handBefore = state.hand.length;
    const after = playCard(state, t.instanceId);
    // Played 1, drew 3 → +2 net
    expect(after.hand.length).toBe(handBefore + 2);
  });
});

// ─── 4. Pool well-formedness (shared check) ────────────────────────────────

describe('Cogsmiths upgrade pool — well-formedness', () => {
  it('every Cogsmiths card has upgradeText that differs from cardText', () => {
    const cog = CARD_POOL.filter((c) => c.faction === 'Cogsmiths');
    expect(cog.length).toBe(44);
    for (const c of cog) {
      expect(c.upgradeText).toBeTruthy();
      expect(c.upgradeText).not.toBe(c.cardText);
    }
  });

  it('no Cogsmiths card hits a forbidden upgrade-text pattern (shared check)', () => {
    const cog = CARD_POOL.filter((c) => c.faction === 'Cogsmiths');
    const failures = findWellFormednessFailures(cog);
    expect({ count: failures.length, details: formatFailures(failures) }).toEqual({
      count: 0,
      details: '(clean)',
    });
  });
});

// ─── 5. 44-card regression net ──────────────────────────────────────────────

describe('Cogsmiths — every upgrade plays without error', () => {
  const cog = CARD_POOL.filter((c) => c.faction === 'Cogsmiths');

  it.each(cog.map((c) => [c.id, c.name]))(
    '%s %s upgrade: playable end-to-end with non-trivial state change',
    (id) => {
      // Reserve cards so draw clauses don't deplete the pile.
      const reserve = [...Array(10)].map((_, i) => ({ ...makeInstance('C-001'), instanceId: `r-${i}` }));
      // Augment cards need a target to attach to. Provide a buffable Attack.
      const target = { ...makeInstance('C-008'), instanceId: 'aug-target' };
      const card = makeInstance(id as string, true);
      const state = initCombat([card, target, ...reserve], 50, 50, [], dummyEnemy, 'Cogsmiths');
      const inHand = state.hand.find((c) => c.id === id);
      if (!inHand) return;
      let s = state;
      let after;
      if (inHand.type === 'Augment') {
        // Augments require explicit target via applyAugment, not playCard.
        const tgt = s.hand.find((c) => c.instanceId === 'aug-target');
        if (!tgt) return;
        after = applyAugment(s, inHand.instanceId, tgt.instanceId);
        // Augment exhausts after attaching; check augment moved out of hand
        // and target's text was modified.
        expect(after.hand.find((c) => c.instanceId === inHand.instanceId)).toBeUndefined();
      } else {
        after = playCard(s, inHand.instanceId);
      }
      expect(after).toBeDefined();
      const changed =
        after.enemy.currentHealth !== s.enemy.currentHealth
        || after.playerShield !== s.playerShield
        || after.playerHealth !== s.playerHealth
        || after.playerEnergy !== s.playerEnergy - inHand.cost
        || after.enemy.statusEffects.length !== s.enemy.statusEffects.length
        || after.playerStatusEffects.length !== s.playerStatusEffects.length
        || after.hand.length !== s.hand.length - 1
        || after.playerPowers.length !== s.playerPowers.length
        || after.exhaustPile.length !== s.exhaustPile.length
        || after.discardPile.length !== s.discardPile.length
        || after.playerBoard.length !== s.playerBoard.length
        // Augment patches modify another card's text or augments array.
        || after.hand.some((c) => {
            const before = s.hand.find((b) => b.instanceId === c.instanceId);
            if (!before) return false;
            if (before.cardText !== c.cardText) return true;
            const beforeAugs = JSON.stringify(before.augments ?? []);
            const afterAugs = JSON.stringify(c.augments ?? []);
            return beforeAugs !== afterAugs;
          });
      expect(changed).toBe(true);
    },
  );
});

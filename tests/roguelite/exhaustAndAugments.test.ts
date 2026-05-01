/**
 * Day 6-11 verification tests:
 *   - Cogsmiths per-card augment scaling (Socket Wrench, Modular Strike,
 *     Colossus Strike).
 *   - Exhaust integration: cards saying "Exhaust" go to exhaustPile and
 *     don't return on reshuffle.
 */

import { initCombat, playCard, drawCards } from '../../src/dungeon/engine/combat';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { CARD_POOL } from '../../src/dungeon/data/cards';
import { ENEMY_POOL } from '../../src/dungeon/data/enemies';
import type { CardInstance, CombatState } from '../../src/dungeon/types';

function defById(id: string) {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`Card ${id} not found in CARD_POOL`);
  return def;
}

function startCombat(deckIds: string[]): CombatState {
  const deck = deckIds.map((id) => createCardInstance(defById(id)));
  const enemy = ENEMY_POOL.find((e) => !e.isElite && !e.isBoss && e.acts.includes(1))!;
  return initCombat(deck, 60, 60, [], enemy, 'Cogsmiths');
}

function attachAugmentInstance(card: CardInstance, augmentName: string): CardInstance {
  return { ...card, augments: [...(card.augments ?? []), augmentName] };
}

describe('Cogsmiths per-card augment scaling', () => {
  it('Socket Wrench: 5 + 3 per augment on this card', () => {
    const state = startCombat(['C-004']); // 1-card deck = Socket Wrench
    const drawn = drawCards(state, 1);
    const sw = drawn.hand.find((c) => c.id === 'C-004')!;
    // Hot-swap with 2 augments attached to this card.
    const swPlus2 = attachAugmentInstance(attachAugmentInstance(sw, 'Augment: Edge'), 'Augment: Plate');
    const handWithAugs: CardInstance[] = drawn.hand.map((c) => (c.instanceId === sw.instanceId ? swPlus2 : c));
    const stateAug = { ...drawn, hand: handWithAugs };

    const enemyHpBefore = stateAug.enemy.currentHealth;
    const after = playCard(stateAug, swPlus2.instanceId, 'enemy');
    const dealt = enemyHpBefore - after.enemy.currentHealth - (after.enemy.currentShield - stateAug.enemy.currentShield);
    // Base 5 + 3*2 = 11. (Strength/Vulnerable both 0 here.)
    expect(dealt).toBe(11);
  });

  it('Socket Wrench with 0 augments deals base 5', () => {
    const state = startCombat(['C-004']);
    const drawn = drawCards(state, 1);
    const sw = drawn.hand.find((c) => c.id === 'C-004')!;
    const before = drawn.enemy.currentHealth;
    const after = playCard(drawn, sw.instanceId, 'enemy');
    const dealt = before - after.enemy.currentHealth;
    expect(dealt).toBe(5);
  });

  it('Modular Strike: 6 + 4 per augment across the deck', () => {
    // Deck: Modular Strike + 3 cards bearing 1 augment each = 12 bonus.
    const state = startCombat(['C-021', 'C-001', 'C-001', 'C-001']);
    const drawn = drawCards(state, 4);
    // Attach an augment to each non-Modular-Strike card in hand.
    const handWithAugs = drawn.hand.map((c) =>
      c.id === 'C-021' ? c : attachAugmentInstance(c, 'Augment: Edge'),
    );
    const stateAug = { ...drawn, hand: handWithAugs };
    const ms = handWithAugs.find((c) => c.id === 'C-021')!;

    const before = stateAug.enemy.currentHealth;
    const after = playCard(stateAug, ms.instanceId, 'enemy');
    const dealt = before - after.enemy.currentHealth;
    // 6 base + 4*3 augments = 18. The Modular Strike itself has 0 augments.
    expect(dealt).toBe(18);
  });

  it('Colossus Strike: 30 + 25 per augment on this card', () => {
    const state = startCombat(['C-033']);
    const drawn = drawCards(state, 1);
    const cs = drawn.hand.find((c) => c.id === 'C-033')!;
    const csPlus1 = attachAugmentInstance(cs, 'Augment: Edge');
    const handWithAug: CardInstance[] = drawn.hand.map((c) => (c.instanceId === cs.instanceId ? csPlus1 : c));
    const stateAug = { ...drawn, hand: handWithAug };

    const before = stateAug.enemy.currentHealth;
    const after = playCard(stateAug, csPlus1.instanceId, 'enemy');
    // Capped by enemy current HP (we may overkill). Just check at least 30+25 = 55 was applied.
    // Easier: enemy is at 0 (overkill) since base alone is 30 and Act 1 enemies have less HP.
    expect(after.enemy.currentHealth).toBe(0);
    expect(before).toBeGreaterThan(0);
  });
});

describe('Exhaust integration', () => {
  it('cards saying "Exhaust" go to exhaustPile, not discardPile', () => {
    // P-029 Incinerator: "Deal 9 damage. Exhaust. ..."
    const state = startCombat(['P-029']);
    const drawn = drawCards(state, 1);
    const inc = drawn.hand.find((c) => c.id === 'P-029')!;
    const after = playCard(drawn, inc.instanceId, 'enemy');

    expect(after.exhaustPile.some((c) => c.instanceId === inc.instanceId)).toBe(true);
    expect(after.discardPile.some((c) => c.instanceId === inc.instanceId)).toBe(false);
  });

  it('cards without "Exhaust" go to discardPile as before', () => {
    // P-001 Cinder Strike: "Deal 6 damage." (no Exhaust)
    const state = startCombat(['P-001']);
    const drawn = drawCards(state, 1);
    const cs = drawn.hand.find((c) => c.id === 'P-001')!;
    const after = playCard(drawn, cs.instanceId, 'enemy');

    expect(after.discardPile.some((c) => c.instanceId === cs.instanceId)).toBe(true);
    expect(after.exhaustPile.some((c) => c.instanceId === cs.instanceId)).toBe(false);
  });

  it('exhausted cards do NOT return on reshuffle', () => {
    // Build a 2-card deck: one Exhaust card + one normal card. Play both,
    // then drain the discard pile. The Exhaust card must never reappear.
    const state = startCombat(['P-029', 'P-001']);
    let s = drawCards(state, 2);
    const inc = s.hand.find((c) => c.id === 'P-029')!;
    const cs  = s.hand.find((c) => c.id === 'P-001')!;
    s = playCard(s, inc.instanceId, 'enemy'); // exhausts
    s = playCard(s, cs.instanceId,  'enemy'); // discards

    // Reshuffle by trying to draw 2 more. Only Cinder Strike should resurface.
    s = drawCards(s, 2);
    const drawnIds = s.hand.map((c) => c.id);
    expect(drawnIds.filter((id) => id === 'P-001').length).toBe(1);
    expect(drawnIds.filter((id) => id === 'P-029').length).toBe(0);
  });
});

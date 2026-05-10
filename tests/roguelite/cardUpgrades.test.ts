/**
 * Card upgrade chokepoint tests.
 *
 * Pin two contracts:
 *   1. `getCardStats` returns base stats for an un-upgraded instance and
 *      upgraded stats (text + numeric overrides) for an upgraded instance.
 *   2. The combat engine reads upgraded values end-to-end — i.e. playing
 *      an upgraded Pyroclast card produces the upgraded effect, not the
 *      base effect.
 */

import { getCardStats, getCardText, getCardCost } from '../../src/dungeon/engine/cardStats';
import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { initCombat, playCard } from '../../src/dungeon/engine/combat';
import type { CardInstance, CardDefinition, EnemyDefinition } from '../../src/dungeon/types';

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

function pyroClast(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`No card with id ${id}`);
  return def;
}

function makeInstance(id: string, upgraded = false): CardInstance {
  return { ...createCardInstance(pyroClast(id)), upgraded };
}

describe('getCardStats — chokepoint contract', () => {
  it('returns base stats when not upgraded', () => {
    const card = makeInstance('P-001'); // Cinder Strike: "Deal 6 damage." cost 1
    const s = getCardStats(card);
    expect(s.cost).toBe(1);
    expect(s.text).toBe('Deal 6 damage.');
  });

  it('returns upgrade text when upgraded and upgradeText is present', () => {
    const card = makeInstance('P-001', true); // upgrade: "Deal 9 damage."
    const s = getCardStats(card);
    expect(s.text).toBe('Deal 9 damage.');
    // No upgradedCost on this card → cost stays the same
    expect(s.cost).toBe(1);
  });

  it('honors upgradedCost numeric override', () => {
    const fake: CardDefinition = {
      ...pyroClast('P-001'),
      upgradedCost: 0,
    };
    const inst: CardInstance = { ...createCardInstance(fake), upgraded: true };
    expect(getCardCost(inst)).toBe(0);
  });

  it('honors upgradedAttack and upgradedHealth numeric overrides', () => {
    const fake: CardDefinition = {
      ...pyroClast('P-001'),
      attack: 5,
      health: 6,
      upgradedAttack: 8,
      upgradedHealth: 9,
    };
    const upgraded: CardInstance = { ...createCardInstance(fake), upgraded: true };
    const base: CardInstance = { ...createCardInstance(fake), upgraded: false };
    expect(getCardStats(base).attack).toBe(5);
    expect(getCardStats(base).health).toBe(6);
    expect(getCardStats(upgraded).attack).toBe(8);
    expect(getCardStats(upgraded).health).toBe(9);
  });

  it('falls back to base text if upgraded but upgradeText is undefined', () => {
    const fake: CardDefinition = { ...pyroClast('P-001'), upgradeText: undefined };
    const inst: CardInstance = { ...createCardInstance(fake), upgraded: true };
    expect(getCardText(inst)).toBe(fake.cardText);
  });
});

describe('Pyroclast upgrades — engine wiring', () => {
  it('Cinder Strike+ deals 9 damage, base deals 6', () => {
    const baseDeck  = [makeInstance('P-001', false)];
    const upgDeck   = [makeInstance('P-001', true)];
    const baseState = initCombat(baseDeck, 50, 50, [], dummyEnemy, 'Pyroclast');
    const upgState  = initCombat(upgDeck, 50, 50, [], dummyEnemy, 'Pyroclast');

    const baseCard = baseState.hand[0]!;
    const upgCard  = upgState.hand[0]!;

    const afterBase = playCard(baseState, baseCard.instanceId);
    const afterUpg  = playCard(upgState,  upgCard.instanceId);

    // 200 - dmg = remaining HP
    expect(afterBase.enemy.currentHealth).toBe(200 - 6);
    expect(afterUpg.enemy.currentHealth).toBe(200 - 9);
  });

  it('Scale Guard+ grants 7 Block + 1 Heat (effect-shape change)', () => {
    // Base: "Gain 5 Block."  Upgrade: "Gain 7 Block and 1 Heat."
    const deck = [makeInstance('P-002', true)];
    const state = initCombat(deck, 50, 50, [], dummyEnemy, "Pyroclast");
    const card = state.hand[0]!;
    const after = playCard(state, card.instanceId);
    expect(after.playerShield).toBe(7);
    expect(after.playerHeat).toBe(1);
  });

  it('Magma Fist+ deals 16 + applies Ignite 2 (added status rider)', () => {
    // Base: "Deal 13 damage." Upgrade: "Deal 16 damage. Apply Ignite 2."
    const deck = [makeInstance('P-008', true)];
    const state = initCombat(deck, 50, 50, [], dummyEnemy, "Pyroclast");
    const card = state.hand[0]!;
    const after = playCard(state, card.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 16);
    const burn = after.enemy.statusEffects.find((e) => e.type === 'burn');
    expect(burn?.stacks).toBe(2);
  });

  it('Ash Cloud+ adds a Block clause to a Weak-only card', () => {
    // Base: "Apply 2 Weak to all enemies."
    // Upgrade: "Apply 2 Weak to all enemies. Gain 5 Block."
    const deck = [makeInstance('P-006', true)];
    const state = initCombat(deck, 50, 50, [], dummyEnemy, "Pyroclast");
    const card = state.hand[0]!;
    const after = playCard(state, card.instanceId);
    expect(after.playerShield).toBe(5);
    expect(after.enemy.statusEffects.find((e) => e.type === 'weak')?.stacks).toBe(2);
  });

  it('Dragonbreath+ AoE adds Ignite 1 rider', () => {
    // Base: "Deal 7 damage to all enemies."
    // Upgrade: "Deal 9 damage to all enemies. Apply Ignite 1 to all."
    const deck = [makeInstance('P-017', true)];
    const state = initCombat(deck, 50, 50, [], dummyEnemy, "Pyroclast");
    const card = state.hand[0]!;
    const after = playCard(state, card.instanceId);
    expect(after.enemy.currentHealth).toBe(200 - 9);
    expect(after.enemy.statusEffects.find((e) => e.type === 'burn')?.stacks).toBe(1);
  });

  it('Soot Burst+ scales the Vulnerable stack count', () => {
    // Base: "Apply Vulnerable 1 to all enemies." Upgrade: "Apply Vulnerable 2 to all enemies."
    const deck = [makeInstance('P-022', true)];
    const state = initCombat(deck, 50, 50, [], dummyEnemy, "Pyroclast");
    const card = state.hand[0]!;
    const after = playCard(state, card.instanceId);
    expect(after.enemy.statusEffects.find((e) => e.type === 'vulnerable')?.stacks).toBe(2);
  });
});

describe('Pyroclast upgrade pool — well-formedness', () => {
  it('every Pyroclast card has upgradeText', () => {
    const pyro = CARD_POOL.filter((c) => c.faction === 'Pyroclast');
    expect(pyro.length).toBe(44);
    for (const c of pyro) {
      expect(c.upgradeText).toBeTruthy();
    }
  });

  it('upgradeText differs from base cardText', () => {
    const pyro = CARD_POOL.filter((c) => c.faction === 'Pyroclast');
    for (const c of pyro) {
      expect(c.upgradeText).not.toBe(c.cardText);
    }
  });
});

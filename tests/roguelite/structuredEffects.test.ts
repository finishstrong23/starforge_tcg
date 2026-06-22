import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance, getStarterCards } from '../../src/dungeon/engine/draft';
import { validateCardEffects } from '../../src/dungeon/engine/effectValidation';
import { hasStructuredEffects } from '../../src/dungeon/engine/structuredEffects';
import { initCombat, playCard } from '../../src/dungeon/engine/combat';
import type { CardDefinition, CardInstance, EnemyDefinition, Faction } from '../../src/dungeon/types';

const STARTER_IDS = new Set([
  'C-001', 'C-002', 'C-041',
  'P-001', 'P-002', 'P-003', 'P-010', 'P-041',
  'L-001', 'L-002', 'L-041',
  'W-041', 'W-042', 'W-043',
]);

const dummyEnemy: EnemyDefinition = {
  id: 'dummy',
  name: 'Training Dummy',
  lore: 'It waits patiently for parser retirement.',
  maxHealth: 100,
  attack: 0,
  art: 'D',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'Do nothing' }],
};

function defById(id: string): CardDefinition {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`Missing card ${id}`);
  return def;
}

function handState(cards: CardInstance[], faction: Faction = cards[0]?.faction ?? 'Pyroclast') {
  return {
    ...initCombat([], 50, 50, [], dummyEnemy, faction),
    hand: cards,
    drawPile: [],
    discardPile: [],
    playerEnergy: 3,
    phase: 'player_turn' as const,
  };
}

describe('Phase 1 structured effects - schema validation', () => {
  it('all migrated card effects validate cleanly', () => {
    expect(validateCardEffects(CARD_POOL)).toEqual([]);
  });

  it('validation rejects unknown effect opcodes', () => {
    const invalid: CardDefinition = {
      ...defById('P-001'),
      effects: [{ type: 'unknown_opcode', amount: 1 } as never],
    };

    expect(validateCardEffects([invalid])).toEqual([
      {
        cardId: 'P-001',
        path: 'effects[0]',
        message: 'unknown effect type: unknown_opcode',
      },
    ]);
  });

  it('every starter-deck definition has base and upgraded structured effects', () => {
    for (const faction of ['Cogsmiths', 'Pyroclast', 'Luminar', 'WarpRiders'] as const) {
      const deck = getStarterCards(faction);
      for (const card of deck) {
        expect(STARTER_IDS.has(card.id)).toBe(true);
        expect(card.effects?.length).toBeGreaterThan(0);
        expect(card.upgradeEffects?.length).toBeGreaterThan(0);
        expect(hasStructuredEffects(card)).toBe(true);
      }
    }
  });
});

describe('Phase 1 structured effects - starter behavior', () => {
  it('structured effects execute even if parser text is inert', () => {
    const card: CardInstance = {
      ...createCardInstance(defById('P-041')),
      cardText: 'No parser-readable effect.',
      upgradeText: 'Still no parser-readable effect.',
    };
    const state = handState([card], 'Pyroclast');

    const after = playCard(state, card.instanceId);

    expect(after.enemy.currentHealth).toBe(96);
    expect(after.playerHeat).toBe(1);
  });

  it('upgraded structured effects use upgradeEffects', () => {
    const card: CardInstance = {
      ...createCardInstance(defById('P-041')),
      upgraded: true,
      cardText: 'No parser-readable effect.',
      upgradeText: 'Still no parser-readable effect.',
    };
    const state = handState([card], 'Pyroclast');

    const after = playCard(state, card.instanceId);

    expect(after.enemy.currentHealth).toBe(94);
    expect(after.playerHeat).toBe(2);
  });

  it('Pyroclast starter Kindle builds capped Heat through structured effects', () => {
    const kindle = createCardInstance(defById('P-003'));
    const state = { ...handState([kindle], 'Pyroclast'), playerHeat: 9 };

    const after = playCard(state, kindle.instanceId);

    expect(after.playerHeat).toBe(10);
    expect(after.combatLog.join('\n')).toContain('wasted at cap');
  });

  it('Pyroclast starter Blazing Charge vents Heat for damage', () => {
    const charge = createCardInstance(defById('P-010'));
    const state = { ...handState([charge], 'Pyroclast'), playerHeat: 4 };

    const after = playCard(state, charge.instanceId, 'enemy');

    expect(after.enemy.currentHealth).toBe(80);
    expect(after.playerHeat).toBe(0);
  });

  it('Luminar upgraded starter block can grant a Lumen to a Channel card in hand', () => {
    const ward: CardInstance = { ...createCardInstance(defById('L-002')), upgraded: true };
    const glimmer = createCardInstance(defById('L-041'));
    const state = handState([ward, glimmer], 'Luminar');

    const after = playCard(state, ward.instanceId);
    const charged = after.hand.find((c) => c.instanceId === glimmer.instanceId);

    expect(after.playerShield).toBe(7);
    expect(charged?.lumens).toBe(1);
  });

  it('Warp Riders starter choice resolves the selected structured branch', () => {
    const shimmer = createCardInstance(defById('W-043'));
    const damageState = handState([shimmer], 'WarpRiders');
    const afterDamage = playCard(damageState, shimmer.instanceId, 'enemy', 'deal 4 damage');

    expect(afterDamage.enemy.currentHealth).toBe(96);
    expect(afterDamage.playerShield).toBe(0);

    const shimmerBlock = createCardInstance(defById('W-043'));
    const blockState = handState([shimmerBlock], 'WarpRiders');
    const afterBlock = playCard(blockState, shimmerBlock.instanceId, 'enemy', 'gain 4 Block');

    expect(afterBlock.enemy.currentHealth).toBe(100);
    expect(afterBlock.playerShield).toBe(4);
  });
});

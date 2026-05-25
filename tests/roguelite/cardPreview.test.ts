import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { getCardPlayPreview } from '../../src/dungeon/engine/cardPreview';
import { initCombat } from '../../src/dungeon/engine/combat';
import type { CardInstance, EnemyDefinition } from '../../src/dungeon/types';

const dummyEnemy: EnemyDefinition = {
  id: 'dummy',
  name: 'Training Dummy',
  lore: 'Preview target.',
  maxHealth: 100,
  attack: 0,
  art: 'D',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'Do nothing' }],
};

function defById(id: string) {
  const def = CARD_POOL.find((c) => c.id === id);
  if (!def) throw new Error(`Missing card ${id}`);
  return def;
}

function stateWithHand(hand: CardInstance[]) {
  return {
    ...initCombat([], 50, 50, [], dummyEnemy, hand[0]?.faction ?? 'Pyroclast'),
    hand,
    drawPile: [],
    discardPile: [],
    playerEnergy: 3,
    phase: 'player_turn' as const,
  };
}

describe('Phase 2 card previews', () => {
  it('previews exact structured damage with Strength and Vulnerable applied', () => {
    const card = createCardInstance(defById('P-001'));
    const state = {
      ...stateWithHand([card]),
      playerStatusEffects: [{ type: 'strength' as const, stacks: 2 }],
      enemy: {
        ...stateWithHand([card]).enemy,
        statusEffects: [{ type: 'vulnerable' as const, stacks: 1 }],
      },
    };

    expect(getCardPlayPreview(state, card)?.lines).toEqual(['Deal 10']);
  });

  it('previews exact block with Dexterity applied', () => {
    const card = createCardInstance(defById('C-002'));
    const state = {
      ...stateWithHand([card]),
      playerStatusEffects: [{ type: 'dexterity' as const, stacks: 2 }],
    };

    expect(getCardPlayPreview(state, card)?.lines).toEqual(['Block +8']);
  });

  it('previews upgraded multi-effect starter cards', () => {
    const card: CardInstance = { ...createCardInstance(defById('P-041')), upgraded: true };
    const state = stateWithHand([card]);

    expect(getCardPlayPreview(state, card)?.lines).toEqual(['Deal 6', 'Heat +2']);
  });

  it('previews structured choice branches', () => {
    const card = createCardInstance(defById('W-043'));
    const state = stateWithHand([card]);

    expect(getCardPlayPreview(state, card)?.lines).toEqual(['Choose: Deal 4 or Block +4']);
  });

  it('does not claim exact preview for legacy parser cards yet', () => {
    const card = createCardInstance(defById('P-003'));
    const state = stateWithHand([card]);

    expect(getCardPlayPreview(state, card)).toBeNull();
  });
});


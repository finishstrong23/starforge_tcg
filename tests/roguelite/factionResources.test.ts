import { CARD_POOL } from '../../src/dungeon/data/cards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { getFactionResourceSummary } from '../../src/dungeon/engine/factionResources';
import { initCombat } from '../../src/dungeon/engine/combat';
import type { CardInstance, EnemyDefinition, Faction, Rift } from '../../src/dungeon/types';

const dummyEnemy: EnemyDefinition = {
  id: 'dummy',
  name: 'Training Dummy',
  lore: 'Resource panel target.',
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

function card(id: string): CardInstance {
  return createCardInstance(defById(id));
}

function state(faction: Faction, hand: CardInstance[]) {
  return {
    ...initCombat([], 50, 50, [], dummyEnemy, faction),
    hand,
    drawPile: [],
    discardPile: [],
    playerEnergy: 3,
    phase: 'player_turn' as const,
  };
}

describe('Phase 3 faction resource summaries', () => {
  it('summarizes Pyroclast Heat thresholds and payoffs', () => {
    const s = {
      ...state('Pyroclast', [card('P-001'), card('P-014')]),
      playerHeat: 6,
    };

    const summary = getFactionResourceSummary(s);

    expect(summary.title).toBe('Heat Engine');
    expect(summary.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Stored', value: '6', detail: 'Primed' }),
      expect.objectContaining({ label: 'Burst line', value: 'Online' }),
    ]));
  });

  it('summarizes Luminar stored Lumens on channel cards in hand', () => {
    const prism = { ...card('L-004'), lumens: 3 };
    const halo = { ...card('L-006'), lumens: 1 };
    const s = state('Luminar', [prism, halo, card('L-002')]);

    const summary = getFactionResourceSummary(s);

    expect(summary.title).toBe('Lumen Choir');
    expect(summary.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Stored', value: '4' }),
      expect.objectContaining({ label: 'Channels', value: '2' }),
      expect.objectContaining({ label: 'Brightest', value: 'Prism Strike 3' }),
    ]));
  });

  it('summarizes Cogsmith installed augments and active constructs', () => {
    const augmented = { ...card('C-001'), augments: ['Augment: Edge', 'Augment: Plate'] };
    const construct = { ...card('C-011'), summonAutoDamage: 3, summonTurnsLeft: 2 };
    const s = {
      ...state('Cogsmiths', [augmented, card('C-014')]),
      playerBoard: [construct],
    };

    const summary = getFactionResourceSummary(s);

    expect(summary.title).toBe('Forge Network');
    expect(summary.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Attached', value: '2' }),
      expect.objectContaining({ label: 'Constructs', value: '1' }),
      expect.objectContaining({ label: 'Augment hand', value: '1' }),
    ]));
  });

  it('summarizes Warp Riders rifts and flux states in hand', () => {
    const a = { ...card('W-001'), fluxState: 'A' as const };
    const c = { ...card('W-002'), fluxState: 'C' as const };
    const rifts: Rift[] = [
      { type: 'energy', turnsRemaining: 2 },
      { type: 'cost', turnsRemaining: 1 },
    ];
    const s = {
      ...state('WarpRiders', [a, c, card('W-041')]),
      playerRifts: rifts,
    };

    const summary = getFactionResourceSummary(s);

    expect(summary.title).toBe('Rift Drift');
    expect(summary.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Rifts', value: '2', detail: 'energy:2, cost:1' }),
      expect.objectContaining({ label: 'Flux hand', value: 'A1 B0 C1' }),
      expect.objectContaining({ label: 'Next shift', value: 'A>B>C' }),
    ]));
  });
});

import { CARD_POOL } from '../../src/dungeon/data/cards';
import { RELIC_POOL } from '../../src/dungeon/data/relics';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { initCombat, playCard } from '../../src/dungeon/engine/combat';
import { applyRelicsToCombat } from '../../src/dungeon/engine/relicEffects';
import type { CardDefinition, EnemyDefinition } from '../../src/dungeon/types';

const dummyEnemy: EnemyDefinition = {
  id: 'dummy',
  name: 'Training Dummy',
  lore: 'It checks relic math.',
  maxHealth: 100,
  attack: 0,
  art: 'D',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 0, description: 'Do nothing' }],
};

function defById(id: string): CardDefinition {
  const def = CARD_POOL.find((card) => card.id === id);
  if (!def) throw new Error(`Missing card ${id}`);
  return def;
}

const sigil = RELIC_POOL.find((relic) => relic.id === 'R-U01')!;

function stateWithHand(ids: string[]) {
  const hand = ids.map((id) => createCardInstance(defById(id)));
  return {
    ...initCombat([], 50, 50, [], dummyEnemy, hand[0]?.faction ?? 'Cogsmiths'),
    hand,
    drawPile: [],
    discardPile: [],
    playerEnergy: 3,
    phase: 'player_turn' as const,
  };
}

describe("Forgemaster's Sigil", () => {
  it('arms a temporary first-card modifier at combat start', () => {
    const state = applyRelicsToCombat('combat_start', [sigil], stateWithHand(['C-001']));

    expect(state.forgemasterSigilPending).toBe(true);
    expect(state.combatLog).toContain("Forgemaster's Sigil: first card played gains +2");
  });

  it('adds +2 damage to the first attack card played, then consumes itself', () => {
    const armed = applyRelicsToCombat('combat_start', [sigil], stateWithHand(['C-001', 'C-001']));
    const first = playCard(armed, armed.hand[0].instanceId, 'enemy');

    expect(first.enemy.currentHealth).toBe(91);
    expect(first.forgemasterSigilPending).toBe(false);
    expect(first.combatLog).toContain("Forgemaster's Sigil empowers Rivet Strike");

    const second = playCard(first, first.hand[0].instanceId, 'enemy');
    expect(second.enemy.currentHealth).toBe(84);
  });

  it('adds +2 Block to the first block card played, then consumes itself', () => {
    const armed = applyRelicsToCombat('combat_start', [sigil], stateWithHand(['C-002', 'C-002']));
    const first = playCard(armed, armed.hand[0].instanceId, 'enemy');

    expect(first.playerShield).toBe(8);
    expect(first.forgemasterSigilPending).toBe(false);

    const second = playCard(first, first.hand[0].instanceId, 'enemy');
    expect(second.playerShield).toBe(14);
  });
});

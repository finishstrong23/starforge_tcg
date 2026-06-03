import { executeEnemyTurn, initCombat } from '../../src/dungeon/engine/combat';
import type { EnemyDefinition } from '../../src/dungeon/types';

function enemyWithIntent(description: string, value: number): EnemyDefinition {
  return {
    id: 'test-multihit-enemy',
    name: 'Test Multihit Enemy',
    lore: 'Regression enemy',
    maxHealth: 40,
    attack: value,
    art: '!',
    acts: [1],
    isElite: false,
    isBoss: false,
    intents: [{ type: 'attack', value, description }],
  };
}

describe('enemy attack intents', () => {
  it('resolves worded repeated attacks instead of one flat hit', () => {
    const state = initCombat([], 60, 60, [], enemyWithIntent('Ember rain - deal 5 three times', 5), 'Pyroclast');

    const next = executeEnemyTurn(state);

    expect(next.playerHealth).toBe(45);
    expect(next.combatLog.at(-1)).toContain('hits 3');
  });

  it('resolves numeric repeated attacks and consumes block per hit', () => {
    const state = {
      ...initCombat([], 60, 60, [], enemyWithIntent('Meteor chain - deal 5 damage 5 times', 5), 'Pyroclast'),
      playerShield: 8,
    };

    const next = executeEnemyTurn(state);

    expect(next.playerShield).toBe(0);
    expect(next.playerHealth).toBe(43);
    expect(next.combatLog.at(-1)).toContain('hits 5');
  });

  it('uses scaled intent damage for repeated attacks', () => {
    const state = initCombat(
      [],
      60,
      60,
      [],
      enemyWithIntent('Ember rain - deal 5 three times', 5),
      'Pyroclast',
      { enemyDamageMul: 2 },
    );

    const next = executeEnemyTurn(state);

    expect(next.playerHealth).toBe(30);
  });
});

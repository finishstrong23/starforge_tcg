import { getStarterCards } from '../../src/dungeon/engine/draft';
import { initCombat } from '../../src/dungeon/engine/combat';
import { applyRunModifiersToCombat, consumeNextCombatModifiers } from '../../src/dungeon/engine/runModifiers';
import { getRunModifierDef } from '../../src/dungeon/data/runModifiers';
import type { EnemyDefinition, RunState } from '../../src/dungeon/types';

const enemy: EnemyDefinition = {
  id: 'T-001',
  name: 'Training Husk',
  lore: 'A test target.',
  maxHealth: 40,
  attack: 6,
  art: 'T',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 6, description: 'Attack 6' }],
};

function modifier(id: string) {
  const def = getRunModifierDef(id);
  if (!def) throw new Error(`Missing run modifier ${id}`);
  return def;
}

describe('Phase 5 event run modifiers', () => {
  it('applies next-combat class resource modifiers to combat state', () => {
    const base = initCombat(getStarterCards('Pyroclast'), 72, 72, [], enemy, 'Pyroclast');
    const withModifiers = applyRunModifiersToCombat(base, [
      modifier('smoldering-heart'),
      modifier('calibrated-rigs'),
      modifier('unstable-rift'),
    ]);

    expect(withModifiers.playerHeat).toBe(4);
    expect(withModifiers.playerStatusEffects).toEqual([
      { type: 'strength', stacks: 2, duration: undefined },
    ]);
    expect(withModifiers.playerRifts).toEqual([{ type: 'energy', turnsRemaining: 2 }]);
  });

  it('applies map-style combat consequences to player and enemy state', () => {
    const base = initCombat(getStarterCards('Luminar'), 72, 72, [], enemy, 'Luminar');
    const withModifiers = applyRunModifiersToCombat(base, [
      modifier('sunless-aegis'),
      modifier('marked-path'),
    ]);

    expect(withModifiers.playerShield).toBe(10);
    expect(withModifiers.enemy.statusEffects).toEqual([
      { type: 'vulnerable', stacks: 2, duration: 2 },
    ]);
  });

  it('consumes next-combat modifiers after combat starts', () => {
    const run = {
      phase: 'map',
      currentAct: 1,
      actMaps: [],
      deck: getStarterCards('Cogsmiths'),
      hand: [],
      relics: [],
      gold: 0,
      maxHealth: 72,
      currentHealth: 72,
      energy: 3,
      maxEnergy: 3,
      ascensionLevel: 0,
      combatState: null,
      potions: [null, null, null],
      runModifiers: [modifier('sunless-aegis'), { ...modifier('marked-path'), duration: 'act' }],
      runStats: {
        totalCombats: 0,
        elitesDefeated: 0,
        bossesDefeated: 0,
        cardsPlayed: 0,
        totalDamageDealt: 0,
      },
    } satisfies RunState;

    expect(consumeNextCombatModifiers(run).runModifiers?.map((mod) => mod.id)).toEqual(['marked-path']);
  });
});

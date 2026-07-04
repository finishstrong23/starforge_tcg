import { CARD_POOL } from '../../src/dungeon/data/cards';
import { POTION_POOL, applyPotion, rollPotionDrop } from '../../src/dungeon/data/potions';
import { RELIC_POOL } from '../../src/dungeon/data/relics';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { endPlayerTurn, executeEnemyTurn, getStatusStack, initCombat, playCard } from '../../src/dungeon/engine/combat';
import { addHeat, HEAT_CAP } from '../../src/dungeon/engine/heat';
import { applyRelicsToCombat, applyRelicsToRun } from '../../src/dungeon/engine/relicEffects';
import type { CardDefinition, CardInstance, EnemyDefinition, RelicDefinition, RunState } from '../../src/dungeon/types';

const trainingEnemy: EnemyDefinition = {
  id: 'training-forge',
  name: 'Training Forge',
  lore: 'Built to expose boring bugs before players do.',
  maxHealth: 100,
  attack: 6,
  art: 'T',
  acts: [1],
  isElite: false,
  isBoss: false,
  intents: [{ type: 'attack', value: 6, description: 'Strike - deal 6 damage' }],
};

function defById(id: string): CardDefinition {
  const def = CARD_POOL.find((card) => card.id === id);
  if (!def) throw new Error(`Missing card ${id}`);
  return def;
}

function relicById(id: string): RelicDefinition {
  const relic = RELIC_POOL.find((r) => r.id === id);
  if (!relic) throw new Error(`Missing relic ${id}`);
  return relic;
}

function combatWithHand(cards: CardInstance[] = []) {
  return {
    ...initCombat([], 50, 50, [], trainingEnemy, 'Pyroclast'),
    hand: cards,
    drawPile: [],
    discardPile: [],
    playerEnergy: 3,
    phase: 'player_turn' as const,
  };
}

function card(id: string, overrides: Partial<CardInstance> = {}): CardInstance {
  return { ...createCardInstance(defById(id)), ...overrides };
}

function enemyMinion(overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    ...card('P-001'),
    instanceId: overrides.instanceId ?? 'enemy-minion-1',
    currentHealth: overrides.currentHealth ?? 12,
    health: overrides.health ?? 12,
    statusEffects: overrides.statusEffects ?? [],
    ...overrides,
  };
}

function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    phase: 'map',
    currentAct: 1,
    actMaps: [],
    deck: [],
    hand: [],
    relics: [],
    gold: 20,
    maxHealth: 72,
    currentHealth: 40,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel: 0,
    combatState: null,
    potions: [null, null, null],
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
    ...overrides,
  };
}

describe('Pyroclast MVP mechanics baseline', () => {
  it('Heat caps as a bonus resource without damaging the player', () => {
    expect(addHeat(9, 4)).toEqual({ next: HEAT_CAP, gained: 1, wasted: 3 });

    const kindle = card('P-003');
    const state = { ...combatWithHand([kindle]), playerHeat: 9, playerHealth: 37 };
    const after = playCard(state, kindle.instanceId);

    expect(after.playerHeat).toBe(10);
    expect(after.playerHealth).toBe(37);
    expect(after.combatLog.join('\n')).toContain('wasted at cap');
  });

  it('Vent spenders convert Heat into immediate damage and consume only the spent Heat', () => {
    const charge = card('P-010');
    const state = { ...combatWithHand([charge]), playerHeat: 7 };

    const after = playCard(state, charge.instanceId, 'enemy');

    expect(after.enemy.currentHealth).toBe(76);
    expect(after.playerHeat).toBe(2);
    expect(after.lastAction).toContain('Vented 5 Heat');
  });

  it('Heat-scaling defensive cards reward stored Heat without spending it', () => {
    const resolve = card('P-016');
    const state = { ...combatWithHand([resolve]), playerHeat: 6 };

    const after = playCard(state, resolve.instanceId);

    expect(after.playerShield).toBe(12);
    expect(after.playerHeat).toBe(6);
  });

  it('player multi-hit cards resolve every hit instead of collapsing into one hit', () => {
    const emberVolley = card('P-005');
    const state = combatWithHand([emberVolley]);

    const after = playCard(state, emberVolley.instanceId, 'enemy');

    expect(after.enemy.currentHealth).toBe(91);
    expect(after.combatLog.join('\n')).toContain('Ember Volley hits 3x for 9 total');
  });

  it('Ignite on the enemy ticks during the enemy turn and decays by one', () => {
    const state = {
      ...combatWithHand(),
      phase: 'enemy_turn' as const,
      enemy: {
        ...combatWithHand().enemy,
        statusEffects: [{ type: 'burn' as const, stacks: 3 }],
        intents: [{ type: 'attack' as const, value: 0, description: 'Wait' }],
      },
    };

    const after = executeEnemyTurn(state);

    expect(after.enemy.currentHealth).toBe(97);
    expect(getStatusStack(after.enemy.statusEffects, 'burn')).toBe(2);
    expect(after.phase).toBe('player_turn');
  });

  it('Ignite on the player ticks when the player ends turn and decays by one', () => {
    const state = {
      ...combatWithHand(),
      playerStatusEffects: [{ type: 'burn' as const, stacks: 2 }],
    };

    const after = endPlayerTurn(state, []);

    expect(after.playerHealth).toBe(48);
    expect(getStatusStack(after.playerStatusEffects, 'burn')).toBe(1);
    expect(after.phase).toBe('enemy_turn');
  });
});

describe('Pyroclast MVP potions baseline', () => {
  it('keeps the authored potion pool complete and uniquely addressable', () => {
    const ids = POTION_POOL.map((potion) => potion.id);

    expect(POTION_POOL).toHaveLength(14);
    expect(new Set(ids).size).toBe(ids.length);
    expect(POTION_POOL.every((potion) => potion.name && potion.effect && potion.targeting)).toBe(true);
  });

  it('Forgefire Flask deals target damage, grants Heat, and logs the drink', () => {
    const state = { ...combatWithHand(), playerHeat: 8 };

    const result = applyPotion(state, 'forgefire_flask', { targetId: 'enemy' });

    expect(result.ok).toBe(true);
    expect(result.state.enemy.currentHealth).toBe(80);
    expect(result.state.playerHeat).toBe(10);
    expect(result.state.lastAction).toBe('Drank Forgefire Flask');
  });

  it('Wyrmfire Breath damages the main enemy and minions, then applies Ignite to all enemies', () => {
    const minion = enemyMinion();
    const state = { ...combatWithHand(), enemyBoard: [minion] };

    const result = applyPotion(state, 'wyrmfire_breath');

    expect(result.ok).toBe(true);
    expect(result.state.enemy.currentHealth).toBe(90);
    expect(getStatusStack(result.state.enemy.statusEffects, 'burn')).toBe(2);
    expect(result.state.enemyBoard).toHaveLength(1);
    expect(result.state.enemyBoard[0].currentHealth).toBe(2);
    expect(getStatusStack(result.state.enemyBoard[0].statusEffects, 'burn')).toBe(2);
  });

  it('Aegis Mixture blocks now and again at the next player turn start', () => {
    const state = combatWithHand();
    const drank = applyPotion(state, 'aegis_mixture').state;

    expect(drank.playerShield).toBe(20);
    expect(drank.pendingTurnStartBlock).toBe(20);

    const enemyTurn = endPlayerTurn(drank, []);
    const nextPlayerTurn = executeEnemyTurn(enemyTurn);

    expect(nextPlayerTurn.phase).toBe('player_turn');
    expect(nextPlayerTurn.playerHealth).toBe(50);
    expect(nextPlayerTurn.playerShield).toBe(20);
    expect(nextPlayerTurn.pendingTurnStartBlock).toBe(0);
  });

  it('Chronoshift Philter replaces the hand and skips the next enemy action', () => {
    const oldHand = [card('P-001'), card('P-002')];
    const drawPile = [card('P-003'), card('P-005'), card('P-007'), card('P-010'), card('P-016')];
    const state = { ...combatWithHand(oldHand), drawPile, playerEnergy: 1 };

    const drank = applyPotion(state, 'chronoshift_philter').state;

    expect(drank.hand.map((c) => c.id)).toEqual(['P-003', 'P-005', 'P-007', 'P-010', 'P-016']);
    expect(drank.discardPile.map((c) => c.id)).toEqual(['P-001', 'P-002']);
    expect(drank.playerEnergy).toBe(2);
    expect(drank.skipNextEnemyTurn).toBe(true);

    const skipped = executeEnemyTurn(endPlayerTurn(drank, []));

    expect(skipped.playerHealth).toBe(50);
    expect(skipped.phase).toBe('player_turn');
    expect(skipped.skipNextEnemyTurn).toBe(false);
  });

  it('unknown potions fail closed without mutating combat state', () => {
    const state = combatWithHand();

    const result = applyPotion(state, 'missing-potion');

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });

  it('combat potion drops are guaranteed for elites and bosses and chance-based for regular fights', () => {
    expect(rollPotionDrop({ isElite: true, isBoss: false, rng: () => 0.99 })).not.toBeNull();
    expect(rollPotionDrop({ isElite: false, isBoss: true, rng: () => 0.99 })).not.toBeNull();
    expect(rollPotionDrop({ isElite: false, isBoss: false, rng: () => 0.39 })).not.toBeNull();
    expect(rollPotionDrop({ isElite: false, isBoss: false, rng: () => 0.4 })).toBeNull();
  });
});

describe('Pyroclast MVP relic baseline', () => {
  it('combat-start relics apply immediate Heat and Energy rewards', () => {
    const state = combatWithHand();

    const after = applyRelicsToCombat('combat_start', [
      relicById('R-S01'),
      relicById('R-C02'),
    ], state);

    expect(after.playerHeat).toBe(2);
    expect(after.playerEnergy).toBe(4);
    expect(after.combatLog.join('\n')).toContain('Forgeheart Ember: +2 Heat');
    expect(after.combatLog.join('\n')).toContain('Fueled Boots: +1 Energy');
  });

  it('combat-end relics update run health and gold without exceeding max HP', () => {
    const run = runState({ currentHealth: 71, maxHealth: 72, gold: 20 });

    const after = applyRelicsToRun('combat_end', [
      relicById('R-C04'),
      relicById('R-C07'),
    ], run);

    expect(after.currentHealth).toBe(72);
    expect(after.gold).toBe(21);
  });
});

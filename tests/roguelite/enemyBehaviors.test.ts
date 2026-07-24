/**
 * Enemy-side combat behaviors.
 *
 * Before this suite, several enemy mechanics were flavor text: summon
 * intents were log-only no-ops (including two of the three act bosses),
 * debuff intents always applied Weak regardless of description, special
 * side effects (steal/skip draw/shuffle hand/skip turn/self-stun) did
 * nothing, elite onDeath strings were never read, and player debuffs
 * never expired. These tests pin the real implementations.
 */

import {
  applyDamage,
  attackWithMinion,
  endPlayerTurn,
  executeEnemyTurn,
  getStack,
  initCombat,
} from '../../src/dungeon/engine/combat';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { ENEMY_POOL } from '../../src/dungeon/data/enemies';
import { INITIAL, reducer } from '../../src/dungeon/engine/runReducer';
import type { CardInstance, CombatState, EnemyDefinition } from '../../src/dungeon/types';

function enemyById(id: string): EnemyDefinition {
  const def = ENEMY_POOL.find((e) => e.id === id);
  if (!def) throw new Error(`unknown enemy ${id}`);
  return def;
}

function makeCombat(enemyId: string, intentIndex = 0, rngSeed = 77): CombatState {
  const deck = getStarterCards('Pyroclast');
  const state = initCombat(deck, 72, 72, [], enemyById(enemyId), 'Pyroclast', { rngSeed });
  return { ...state, enemy: { ...state.enemy, intentIndex } };
}

function makeGuardian(hp = 12): CardInstance {
  return {
    id: 'test-guardian',
    instanceId: 'test-guardian-1',
    name: 'Test Guardian',
    faction: 'Cogsmiths',
    type: 'Minion',
    cost: 1,
    attack: 2,
    health: hp,
    currentHealth: hp,
    keywords: ['GUARDIAN'],
    cardText: 'Guardian.',
    rarity: 'Common',
    complexityTier: 1,
    upgraded: false,
    statusEffects: [],
    hasAttacked: false,
  };
}

describe('debuff intents', () => {
  it('applies Vulnerable when the description says Vulnerable (Wire-Tangle)', () => {
    const s = executeEnemyTurn(makeCombat('E1-05', 1)); // 'Arc shock - apply 2 Vulnerable'
    expect(getStack(s.playerStatusEffects, 'vulnerable')).toBe(2);
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(0);
  });

  it('applies compound debuffs (Circuit Priest: 2 Weak, 2 Vulnerable)', () => {
    const s = executeEnemyTurn(makeCombat('E2-06', 2)); // 'Curse - apply 2 Weak, 2 Vulnerable'
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(2);
    expect(getStack(s.playerStatusEffects, 'vulnerable')).toBe(2);
  });

  it('applies boss compound debuffs without the word "apply" (The Starforged)', () => {
    const s = executeEnemyTurn(makeCombat('BOSS-03', 3)); // 'Unmake reality - 5 Vulnerable, 5 Weak'
    expect(getStack(s.playerStatusEffects, 'vulnerable')).toBe(5);
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(5);
  });

  it('player debuffs expire after their duration in rounds', () => {
    let s = executeEnemyTurn(makeCombat('E1-02', 1)); // 'Soot breath - apply 2 Weak'
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(2);
    s = endPlayerTurn(s, []);   // round 1 ends
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(2);
    s = executeEnemyTurn({ ...s, enemy: { ...s.enemy, intentIndex: 0 } });
    s = endPlayerTurn(s, []);   // round 2 ends → expired
    expect(getStack(s.playerStatusEffects, 'weak')).toBe(0);
  });
});

describe('summon intents', () => {
  it('Null Shepherd summons 2 Rift Nibblers onto the enemy board', () => {
    const s = executeEnemyTurn(makeCombat('BOSS-02', 1)); // 'Shepherd summons 2 Rift Nibblers'
    expect(s.enemyBoard).toHaveLength(2);
    expect(s.enemyBoard[0].name).toBe('Rift Nibbler');
    expect(s.enemyBoard[0].summonTurnsLeft).toBeGreaterThan(0);
  });

  it('enemy summons attack the player on subsequent enemy turns', () => {
    let s = executeEnemyTurn(makeCombat('BOSS-02', 1)); // summon turn: no minion attacks yet
    const hpAfterSummonTurn = s.playerHealth;
    // Next enemy turn: defend intent (no direct damage) + 2 nibbler attacks.
    s = executeEnemyTurn({ ...s, enemy: { ...s.enemy, intentIndex: 4 }, playerShield: 0 });
    const nibblerDamage = 2 * (s.enemyBoard[0]?.attack ?? 3);
    expect(s.playerHealth).toBe(hpAfterSummonTurn - nibblerDamage);
  });

  it('enemy summons expire after their lifetime', () => {
    let s = executeEnemyTurn(makeCombat('BOSS-02', 1));
    expect(s.enemyBoard).toHaveLength(2);
    // Ride out the lifetime on non-summon intents (defend at index 4).
    for (let i = 0; i < 3; i++) {
      s = executeEnemyTurn({ ...s, enemy: { ...s.enemy, intentIndex: 4 } });
    }
    expect(s.enemyBoard).toHaveLength(0);
  });

  it('The Starforged summons GUARDIAN Sentries that player minions must attack first', () => {
    let s = executeEnemyTurn(makeCombat('BOSS-03', 5)); // 'Forge anvils - summon 2 Sentries'
    expect(s.enemyBoard).toHaveLength(2);
    expect(s.enemyBoard[0].keywords).toContain('GUARDIAN');

    const attacker: CardInstance = { ...makeGuardian(8), keywords: [], name: 'Test Attacker', hasAttacked: false };
    s = { ...s, playerBoard: [attacker], phase: 'player_turn' };
    const blocked = attackWithMinion(s, attacker.instanceId, 'enemy');
    expect(blocked.enemy.currentHealth).toBe(s.enemy.currentHealth); // hit was refused
    expect(blocked.lastAction).toMatch(/GUARDIAN/);

    const throughGuardian = attackWithMinion(s, attacker.instanceId, s.enemyBoard[0].instanceId);
    const sentry = throughGuardian.enemyBoard.find((m) => m.instanceId === s.enemyBoard[0].instanceId);
    expect((sentry?.currentHealth ?? 0)).toBeLessThan(9);
  });

  it('caps the enemy board at 4 summons', () => {
    let s = makeCombat('BOSS-02', 1);
    s = executeEnemyTurn(s); // 2 nibblers
    s = executeEnemyTurn({ ...s, enemy: { ...s.enemy, intentIndex: 1 } }); // 4 nibblers
    s = executeEnemyTurn({ ...s, enemy: { ...s.enemy, intentIndex: 1 } }); // capped
    expect(s.enemyBoard.length).toBeLessThanOrEqual(4);
  });
});

describe('special intents', () => {
  it('Paradox Maw steals a card from hand for the rest of combat', () => {
    const start = makeCombat('E3-04', 1); // 'Swallow - deal 7, steal a card'
    const handBefore = start.hand.length;
    const s = executeEnemyTurn(start);
    expect(s.stolenCards).toHaveLength(1);
    // Hand was redrawn for the new turn; total card count is down by one.
    const total = s.hand.length + s.drawPile.length + s.discardPile.length + s.exhaustPile.length;
    const totalBefore = handBefore + start.drawPile.length + start.discardPile.length + start.exhaustPile.length;
    expect(total).toBe(totalBefore - 1);
  });

  it('Rift Warden skip-your-draw leaves the next hand empty', () => {
    // 'Chrono-lock - deal 6, skip your draw'. Enter the enemy turn the way
    // the real flow does (endPlayerTurn → executeEnemyTurn) so the new-turn
    // block runs and consumes the flag.
    const s = executeEnemyTurn({ ...makeCombat('EL-04', 2), phase: 'enemy_turn' });
    expect(s.hand).toHaveLength(0);
    expect(s.skipNextDraw).toBe(false); // consumed
    expect(s.phase).toBe('player_turn');
  });

  it('The Starforged chrono-halt drains all energy on the next turn', () => {
    // 'Chrono-halt - deal 13, skip your turn'
    const s = executeEnemyTurn({ ...makeCombat('BOSS-03', 6), phase: 'enemy_turn' });
    expect(s.playerEnergy).toBe(0);
    expect(s.haltPlayerNextTurn).toBe(false); // consumed
  });

  it('special damage respects Strength and Vulnerable (calcDamage)', () => {
    let s = makeCombat('E3-04', 1); // Swallow - deal 9
    s = {
      ...s,
      playerShield: 0,
      enemy: { ...s.enemy, statusEffects: [{ type: 'strength', stacks: 3 }] },
      playerStatusEffects: [{ type: 'vulnerable', stacks: 2, duration: 2 }],
    };
    const after = executeEnemyTurn(s);
    // (9 + 3 strength) * 1.25 vulnerable = 15 (floor)
    expect(after.playerHealth).toBe(s.playerHealth - Math.floor((9 + 3) * 1.25));
  });

  it('Blast Furnace self-stun skips its next action without advancing the intent', () => {
    let s = executeEnemyTurn(makeCombat('E2-05', 2)); // 'Pressure vent - deal 15, self-stun'
    expect(s.enemy.stunnedTurns).toBe(1);
    const intentAfterVent = s.enemy.intentIndex;
    const hp = s.playerHealth;
    s = executeEnemyTurn({ ...s, playerShield: 0 });
    expect(s.playerHealth).toBe(hp);                       // stunned: no damage
    expect(s.enemy.stunnedTurns).toBe(0);
    expect(s.enemy.intentIndex).toBe(intentAfterVent);     // telegraph unchanged
  });
});

describe('AoE and guardian routing', () => {
  it('"deal N to all" hits the player and every player minion', () => {
    let s = makeCombat('E3-01', 2); // 'Quake - deal 10 to all'
    const guardian = makeGuardian(12);
    s = { ...s, playerBoard: [guardian], playerShield: 0 };
    const after = executeEnemyTurn(s);
    expect(after.playerHealth).toBe(s.playerHealth - 10);
    const minion = after.playerBoard.find((m) => m.instanceId === guardian.instanceId);
    expect(minion?.currentHealth).toBe(12 - 10);
  });

  it('single-target enemy attacks are intercepted by a player GUARDIAN', () => {
    let s = makeCombat('E1-01', 0); // 'Rivet burst - deal 8'
    const guardian = makeGuardian(12);
    s = { ...s, playerBoard: [guardian], playerShield: 0 };
    const after = executeEnemyTurn(s);
    expect(after.playerHealth).toBe(s.playerHealth); // player untouched
    const minion = after.playerBoard.find((m) => m.instanceId === guardian.instanceId);
    expect(minion?.currentHealth).toBe(12 - 8);
  });
});

describe('elite onDeath effects', () => {
  it('Gearforged Juggernaut explodes for 6 on death', () => {
    let s = makeCombat('EL-01');
    s = { ...s, playerShield: 0, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    const hp = s.playerHealth;
    const after = applyDamage(s, 'enemy', 5, 'test');
    expect(after.phase).toBe('combat_end_win');
    expect(after.playerHealth).toBe(hp - 6);
  });

  it('a death-burst that drops the player to 0 is a LOSS, not a win', () => {
    let s = makeCombat('EL-01');
    s = { ...s, playerHealth: 4, playerShield: 0, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    const after = applyDamage(s, 'enemy', 5, 'test');
    expect(after.phase).toBe('combat_end_loss');
  });

  it('Sunfire Herald heals the player 10 on death', () => {
    let s = makeCombat('EL-02');
    s = { ...s, playerHealth: 40, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    const after = applyDamage(s, 'enemy', 5, 'test');
    expect(after.phase).toBe('combat_end_win');
    expect(after.playerHealth).toBe(50);
  });

  it("Rift Warden's stored rift becomes a next-combat -1 Energy modifier on the run", () => {
    let s = makeCombat('EL-04');
    s = { ...s, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    const won = applyDamage(s, 'enemy', 5, 'test');
    expect(won.phase).toBe('combat_end_win');
    expect(won.pendingRunModifiers).toHaveLength(1);
    expect(won.pendingRunModifiers![0].effects[0]).toEqual({ type: 'energy', amount: -1 });

    // The reducer attaches it to the run on the win transition.
    let ctx = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed: 'ondeath-test' });
    const eliteNode = ctx.run!.actMaps[0].nodes.find((n) => n.type === 'elite');
    if (eliteNode) {
      ctx = reducer(ctx, { type: 'TRAVEL_TO_NODE', nodeId: eliteNode.id });
      ctx = reducer(ctx, { type: 'SET_COMBAT', state: { ...won, phase: 'combat_end_win' } });
      expect(ctx.run!.runModifiers?.some((m) => m.id === 'rift-warden-stored-rift')).toBe(true);
    }
  });

  it('onDeath fires exactly once even if checkCombatEnd runs repeatedly', () => {
    let s = makeCombat('EL-02');
    s = { ...s, playerHealth: 40, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    let after = applyDamage(s, 'enemy', 5, 'test');
    after = applyDamage(after, 'enemy', 5, 'test'); // repeat on terminal state
    expect(after.playerHealth).toBe(50); // not 60
  });
});

describe('pile & status hygiene', () => {
  it('hand is capped at 10 cards', () => {
    let s = makeCombat('E1-01');
    // Stuff the hand up to the cap via skipped turns drawing from a big pile.
    const bigPile = [...s.drawPile, ...s.discardPile, ...s.hand].flatMap((c) => [c, { ...c, instanceId: `${c.instanceId}-x` }]);
    s = { ...s, hand: [], drawPile: bigPile, discardPile: [] };
    const { drawCards } = jest.requireActual('../../src/dungeon/engine/combat');
    const drawn = drawCards(s, 15);
    expect(drawn.hand.length).toBe(10);
  });

  it('enemy poison decays by 1 per turn instead of persisting forever', () => {
    let s = makeCombat('E1-01', 1); // defend intent — no incoming damage noise
    s = { ...s, enemy: { ...s.enemy, statusEffects: [{ type: 'poison', stacks: 3 }] } };
    const hp = s.enemy.currentHealth;
    s = executeEnemyTurn(s);
    expect(s.enemy.currentHealth).toBe(hp - 3);
    expect(getStack(s.enemy.statusEffects, 'poison')).toBe(2);
  });

  it('player poison decays by 1 per turn instead of escalating', () => {
    let s = makeCombat('E1-01');
    s = { ...s, playerStatusEffects: [{ type: 'poison', stacks: 3 }] };
    const hp = s.playerHealth;
    s = endPlayerTurn(s, []);
    expect(s.playerHealth).toBe(hp - 3);
    expect(getStack(s.playerStatusEffects, 'poison')).toBe(2);
  });
});

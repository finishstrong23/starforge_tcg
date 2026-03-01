/**
 * STARFORGE TCG - Combat Resolver Tests
 *
 * Tests the CombatResolver class: attack resolution, damage calculation,
 * keyword interactions (GUARDIAN, BARRIER, LETHAL, DRAIN, DOUBLE_STRIKE,
 * SWIFT, BLITZ, CLOAK), and combat validation rules.
 */

import {
  GameEngine,
  initializeSampleDatabase,
  globalCardDatabase,
  globalCardFactory,
  Race,
  GamePhase,
  GameStatus,
  ActionType,
  CardZone,
  CardType,
  CardRarity,
  TriggerKeyword,
  CombatKeyword,
  EffectType,
  EffectTrigger,
  TargetType,
} from '../../src';
import type {
  CardDefinition,
  CardInstance,
} from '../../src';
import { GameStateManager, PlayerSetup } from '../../src/game/GameState';

// ─── Test Card Definitions ──────────────────────────────────────────────

const TEST_CARDS: CardDefinition[] = [
  // Vanilla 2/2
  {
    id: 'test_vanilla_2_2',
    name: 'Test Vanilla',
    cost: 1,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // Vanilla 1/1
  {
    id: 'test_vanilla_1_1',
    name: 'Test Wisp',
    cost: 0,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 1,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // Big 5/5
  {
    id: 'test_vanilla_5_5',
    name: 'Test Big',
    cost: 5,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 5,
    health: 5,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // GUARDIAN 1/4
  {
    id: 'test_guardian',
    name: 'Test Guardian',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 4,
    keywords: [{ keyword: CombatKeyword.GUARDIAN }],
    effects: [],
    cardText: 'Guardian',
    collectible: true,
    set: 'TEST',
  },
  // BARRIER 3/3
  {
    id: 'test_barrier',
    name: 'Test Barrier',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 3,
    health: 3,
    keywords: [{ keyword: CombatKeyword.BARRIER }],
    effects: [],
    cardText: 'Barrier',
    collectible: true,
    set: 'TEST',
  },
  // LETHAL 1/1
  {
    id: 'test_lethal',
    name: 'Test Lethal',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 1,
    keywords: [{ keyword: CombatKeyword.LETHAL }],
    effects: [],
    cardText: 'Lethal',
    collectible: true,
    set: 'TEST',
  },
  // DRAIN 3/3
  {
    id: 'test_drain',
    name: 'Test Drain',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 3,
    health: 3,
    keywords: [{ keyword: CombatKeyword.DRAIN }],
    effects: [],
    cardText: 'Drain',
    collectible: true,
    set: 'TEST',
  },
  // DOUBLE_STRIKE 2/3
  {
    id: 'test_double_strike',
    name: 'Test Double Strike',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 2,
    health: 3,
    keywords: [{ keyword: CombatKeyword.DOUBLE_STRIKE }],
    effects: [],
    cardText: 'Double Strike',
    collectible: true,
    set: 'TEST',
  },
  // SWIFT 3/2
  {
    id: 'test_swift',
    name: 'Test Swift',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 3,
    health: 2,
    keywords: [{ keyword: CombatKeyword.SWIFT }],
    effects: [],
    cardText: 'Swift',
    collectible: true,
    set: 'TEST',
  },
  // BLITZ 4/2
  {
    id: 'test_blitz',
    name: 'Test Blitz',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 4,
    health: 2,
    keywords: [{ keyword: CombatKeyword.BLITZ }],
    effects: [],
    cardText: 'Blitz',
    collectible: true,
    set: 'TEST',
  },
  // CLOAK 3/2
  {
    id: 'test_cloak',
    name: 'Test Cloak',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 3,
    health: 2,
    keywords: [{ keyword: CombatKeyword.CLOAK }],
    effects: [],
    cardText: 'Cloak',
    collectible: true,
    set: 'TEST',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Set up a minimal game engine with test cards registered.
 * Returns a started game with both players in MAIN phase.
 */
function setupTestGame(): GameEngine {
  globalCardDatabase.clear();
  initializeSampleDatabase();
  globalCardDatabase.registerCards(TEST_CARDS);

  const engine = new GameEngine();

  // Build minimal 30-card decks from vanilla test cards
  const buildDeck = (playerId: string): CardInstance[] => {
    const cards: CardInstance[] = [];
    for (let i = 0; i < 30; i++) {
      cards.push(globalCardFactory.createInstance('test_vanilla_2_2', { ownerId: playerId }));
    }
    return cards;
  };

  const p1Setup: PlayerSetup = {
    id: 'player1',
    name: 'Player 1',
    race: Race.COGSMITHS,
    heroId: '',
    deck: buildDeck('player1'),
  };

  const p2Setup: PlayerSetup = {
    id: 'player2',
    name: 'Player 2',
    race: Race.LUMINAR,
    heroId: '',
    deck: buildDeck('player2'),
  };

  engine.initializeGame(p1Setup, p2Setup);
  engine.startGame();

  return engine;
}

/**
 * Place a card on a player's board directly (bypassing hand/play flow).
 */
function placeOnBoard(engine: GameEngine, definitionId: string, ownerId: string): CardInstance {
  const card = globalCardFactory.createInstance(definitionId, { ownerId });
  const board = engine.getStateManager().getBoard();
  const state = engine.getStateManager().getState();

  board.registerCard(card);
  (state.cards as Map<string, CardInstance>).set(card.instanceId, card);
  board.moveCardDirectToBoard(ownerId, card.instanceId);
  card.summonedThisTurn = false;

  return card;
}

/**
 * Kill a minion by setting its health to 0.
 */
function killMinion(card: CardInstance): void {
  card.currentHealth = 0;
}

/**
 * Ensure the given player is the active player. If not, end the current turn.
 */
function ensureActivePlayer(engine: GameEngine, playerId: string): void {
  const activeId = engine.getStateManager().getActivePlayerId();
  if (activeId !== playerId) {
    engine.processAction({
      type: ActionType.END_TURN,
      playerId: activeId,
      timestamp: Date.now(),
      data: {},
    });
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('CombatResolver', () => {
  // ─── GUARDIAN Tests ──────────────────────────────────────────────────

  describe('GUARDIAN', () => {
    it('must attack GUARDIAN before other minions', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a GUARDIAN and a vanilla minion on player1's board
      const guardian = placeOnBoard(engine, 'test_guardian', 'player1');
      const vanilla = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attempting to attack the non-guardian minion should fail
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: vanilla.instanceId },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GUARDIAN');
    });

    it('can attack other minions after GUARDIAN dies', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();
      const board = stateManager.getBoard();

      // Place a GUARDIAN and a vanilla minion on player1's board
      const guardian = placeOnBoard(engine, 'test_guardian', 'player1');
      const vanilla = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Kill the guardian first
      killMinion(guardian);
      engine.getDeathProcessor().processDeaths();

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Now attacking the vanilla minion should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: vanilla.instanceId },
      });

      expect(result.success).toBe(true);
    });

    it('must attack GUARDIAN before hero', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a GUARDIAN on player1's board
      const guardian = placeOnBoard(engine, 'test_guardian', 'player1');

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attempting to attack the hero should fail
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: 'hero_player1' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GUARDIAN');
    });

    it('multiple GUARDIANs - can pick which one to attack', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place two GUARDIAN minions on player1's board
      const guardian1 = placeOnBoard(engine, 'test_guardian', 'player1');
      const guardian2 = placeOnBoard(engine, 'test_guardian', 'player1');

      // Place attacker on player2's board
      const attacker1 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const attacker2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker1.summonedThisTurn = false;
      attacker2.summonedThisTurn = false;

      // Attack the first guardian - should succeed
      const result1 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker1.instanceId, defenderId: guardian1.instanceId },
      });
      expect(result1.success).toBe(true);

      // Attack the second guardian - should also succeed
      const result2 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker2.instanceId, defenderId: guardian2.instanceId },
      });
      expect(result2.success).toBe(true);
    });
  });

  // ─── BARRIER Tests ──────────────────────────────────────────────────

  describe('BARRIER', () => {
    it('first hit absorbs all damage (no health lost)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a BARRIER minion on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      const healthBefore = barrierMinion.currentHealth!;

      // Attack the barrier minion
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: barrierMinion.instanceId },
      });

      // Health should be unchanged (barrier absorbed all damage)
      expect(barrierMinion.currentHealth).toBe(healthBefore);
      // Barrier should now be broken
      expect(barrierMinion.hasBarrier).toBe(false);
    });

    it('second hit deals normal damage after barrier broken', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a BARRIER minion on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place two attackers on player2's board
      const attacker1 = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');
      const attacker2 = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker1.summonedThisTurn = false;
      attacker2.summonedThisTurn = false;

      const healthBefore = barrierMinion.currentHealth!;

      // First attack - barrier absorbs
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker1.instanceId, defenderId: barrierMinion.instanceId },
      });

      expect(barrierMinion.currentHealth).toBe(healthBefore);
      expect(barrierMinion.hasBarrier).toBe(false);

      // Second attack - deals normal damage
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker2.instanceId, defenderId: barrierMinion.instanceId },
      });

      expect(barrierMinion.currentHealth).toBe(healthBefore - 2);
    });

    it('BARRIER blocks lethal damage too', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a BARRIER minion (3/3) on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place a LETHAL minion on player2's board
      const lethalMinion = placeOnBoard(engine, 'test_lethal', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      lethalMinion.summonedThisTurn = false;

      // Attack barrier minion with lethal
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: lethalMinion.instanceId, defenderId: barrierMinion.instanceId },
      });

      // Barrier should absorb the hit, minion survives
      expect(barrierMinion.currentHealth).toBe(3);
      expect(barrierMinion.hasBarrier).toBe(false);
      expect(barrierMinion.zone).toBe(CardZone.BOARD);
    });

    it('combat returns barrierBroken: true when barrier absorbs', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a BARRIER minion on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Use resolveAttack directly to check the CombatResult
      const combatResolver = (engine as any).combatResolver;
      const result = combatResolver.resolveAttack(
        attacker.instanceId,
        barrierMinion.instanceId,
        'player2'
      );

      expect(result.success).toBe(true);
      expect(result.barrierBroken).toBe(true);
      expect(result.defenderDied).toBe(false);
    });
  });

  // ─── LETHAL Tests ──────────────────────────────────────────────────

  describe('LETHAL', () => {
    it('any damage from LETHAL minion kills target (even 1 damage to 5 health)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a big minion (5/5) on player1's board
      const bigMinion = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Place a LETHAL minion (1/1) on player2's board
      const lethalMinion = placeOnBoard(engine, 'test_lethal', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      lethalMinion.summonedThisTurn = false;

      // Attack the 5/5 with LETHAL 1/1
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: lethalMinion.instanceId, defenderId: bigMinion.instanceId },
      });

      // Big minion should be dead (LETHAL kills it despite only 1 damage)
      expect(bigMinion.currentHealth).toBe(0);
      expect(bigMinion.zone).toBe(CardZone.GRAVEYARD);
    });

    it('LETHAL works on counter-attack (target has LETHAL, attacker dies)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a LETHAL minion (1/1) on player1's board (defender)
      const lethalDefender = placeOnBoard(engine, 'test_lethal', 'player1');

      // Place a big minion (5/5) on player2's board (attacker)
      const bigAttacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      bigAttacker.summonedThisTurn = false;

      // Attack the LETHAL 1/1 with the 5/5
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: bigAttacker.instanceId, defenderId: lethalDefender.instanceId },
      });

      // Attacker (5/5) should die from LETHAL counter-attack
      expect(bigAttacker.currentHealth).toBe(0);
      expect(bigAttacker.zone).toBe(CardZone.GRAVEYARD);
    });

    it('LETHAL does not affect BARRIER (absorbed)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a BARRIER minion (3/3) on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place a LETHAL minion (1/1) on player2's board
      const lethalMinion = placeOnBoard(engine, 'test_lethal', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      lethalMinion.summonedThisTurn = false;

      // Attack the BARRIER minion with LETHAL
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: lethalMinion.instanceId, defenderId: barrierMinion.instanceId },
      });

      // BARRIER absorbs the hit, minion survives, LETHAL does not kill
      expect(barrierMinion.currentHealth).toBe(3);
      expect(barrierMinion.zone).toBe(CardZone.BOARD);
      expect(barrierMinion.hasBarrier).toBe(false);
    });

    it('both LETHAL minions kill each other', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a LETHAL minion (1/1) on player1's board
      const lethalDefender = placeOnBoard(engine, 'test_lethal', 'player1');

      // Place another LETHAL minion (1/1) on player2's board
      const lethalAttacker = placeOnBoard(engine, 'test_lethal', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      lethalAttacker.summonedThisTurn = false;

      // Attack LETHAL vs LETHAL
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: lethalAttacker.instanceId, defenderId: lethalDefender.instanceId },
      });

      // Both should be dead
      expect(lethalAttacker.zone).toBe(CardZone.GRAVEYARD);
      expect(lethalDefender.zone).toBe(CardZone.GRAVEYARD);
    });
  });

  // ─── DRAIN Tests ──────────────────────────────────────────────────

  describe('DRAIN', () => {
    it('attacking minion heals hero for damage dealt', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage the attacking player's hero first so healing has effect
      stateManager.damageHero('player2', 10);
      const heroBefore = stateManager.getPlayer('player2').hero.currentHealth;

      // Place a vanilla minion (2/2) on player1's board (defender)
      const defender = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place a DRAIN minion (3/3) on player2's board (attacker)
      const drainMinion = placeOnBoard(engine, 'test_drain', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      drainMinion.summonedThisTurn = false;

      // Attack the 2/2 with the DRAIN 3/3
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: drainMinion.instanceId, defenderId: defender.instanceId },
      });

      // Hero should have healed by the damage dealt (3)
      const heroAfter = stateManager.getPlayer('player2').hero.currentHealth;
      expect(heroAfter).toBe(heroBefore + 3);
    });

    it('attacking hero heals for damage dealt', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage the attacking player's hero first so healing has effect
      stateManager.damageHero('player2', 10);
      const heroBefore = stateManager.getPlayer('player2').hero.currentHealth;

      // Place a DRAIN minion (3/3) on player2's board
      const drainMinion = placeOnBoard(engine, 'test_drain', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      drainMinion.summonedThisTurn = false;

      // Attack the enemy hero directly
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: drainMinion.instanceId, defenderId: 'hero_player1' },
      });

      // Hero should have healed by the damage dealt (3)
      const heroAfter = stateManager.getPlayer('player2').hero.currentHealth;
      expect(heroAfter).toBe(heroBefore + 3);
    });

    it('DRAIN does not heal if BARRIER absorbs', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage the attacking player's hero first so healing could have effect
      stateManager.damageHero('player2', 10);
      const heroBefore = stateManager.getPlayer('player2').hero.currentHealth;

      // Place a BARRIER minion (3/3) on player1's board
      const barrierMinion = placeOnBoard(engine, 'test_barrier', 'player1');
      barrierMinion.hasBarrier = true;

      // Place a DRAIN minion (3/3) on player2's board
      const drainMinion = placeOnBoard(engine, 'test_drain', 'player2');

      // Use resolveAttack directly to check the CombatResult
      const combatResolver = (engine as any).combatResolver;
      const result = combatResolver.resolveAttack(
        drainMinion.instanceId,
        barrierMinion.instanceId,
        'player2'
      );

      // BARRIER absorbed the hit — DRAIN should NOT heal
      const heroAfter = stateManager.getPlayer('player2').hero.currentHealth;
      expect(result.barrierBroken).toBe(true);
      expect(result.drainHealing).toBe(0);
      expect(heroAfter).toBe(heroBefore);
    });

    it('DRAIN heals up to max health (does not overheal)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage the attacking player's hero by only 1 (so healing 3 would overheal)
      stateManager.damageHero('player2', 1);
      const heroMaxHealth = stateManager.getPlayer('player2').hero.maxHealth;
      const heroBefore = stateManager.getPlayer('player2').hero.currentHealth;
      expect(heroBefore).toBe(heroMaxHealth - 1);

      // Place a vanilla minion (2/2) on player1's board (defender)
      const defender = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place a DRAIN minion (3/3) on player2's board (attacker)
      const drainMinion = placeOnBoard(engine, 'test_drain', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      drainMinion.summonedThisTurn = false;

      // Attack the 2/2 with the DRAIN 3/3
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: drainMinion.instanceId, defenderId: defender.instanceId },
      });

      // Hero should only heal to max, not above
      const heroAfter = stateManager.getPlayer('player2').hero.currentHealth;
      expect(heroAfter).toBe(heroMaxHealth);
    });
  });

  // ─── DOUBLE_STRIKE Tests ──────────────────────────────────────────

  describe('DOUBLE_STRIKE', () => {
    it('can attack twice per turn', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place two vanilla minions (2/2) on player1's board
      const target1 = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      const target2 = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place a DOUBLE_STRIKE minion (2/3) on player2's board
      const doubleStriker = placeOnBoard(engine, 'test_double_strike', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      doubleStriker.summonedThisTurn = false;

      // First attack
      const result1 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: target1.instanceId },
      });
      expect(result1.success).toBe(true);

      // Second attack
      const result2 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: target2.instanceId },
      });
      expect(result2.success).toBe(true);
    });

    it('cannot attack three times', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place three vanilla minions on player1's board
      const target1 = placeOnBoard(engine, 'test_vanilla_1_1', 'player1');
      const target2 = placeOnBoard(engine, 'test_vanilla_1_1', 'player1');
      const target3 = placeOnBoard(engine, 'test_vanilla_1_1', 'player1');

      // Place a DOUBLE_STRIKE minion (2/3) on player2's board
      const doubleStriker = placeOnBoard(engine, 'test_double_strike', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      doubleStriker.summonedThisTurn = false;

      // First attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: target1.instanceId },
      });

      // Second attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: target2.instanceId },
      });

      // Third attack should fail
      const result3 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: target3.instanceId },
      });
      expect(result3.success).toBe(false);
      expect(result3.error).toContain('already attacked');
    });

    it('second attack can target different minion', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place two different minions on player1's board
      const minion1 = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
      const minion2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Place a DOUBLE_STRIKE minion (2/3) on player2's board
      const doubleStriker = placeOnBoard(engine, 'test_double_strike', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      doubleStriker.summonedThisTurn = false;

      // First attack targets minion1
      const result1 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: minion1.instanceId },
      });
      expect(result1.success).toBe(true);
      expect(minion1.currentHealth).toBe(3); // 5 - 2

      // Second attack targets minion2
      const result2 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: doubleStriker.instanceId, defenderId: minion2.instanceId },
      });
      expect(result2.success).toBe(true);
      expect(minion2.currentHealth).toBe(3); // 5 - 2
    });
  });

  // ─── SWIFT Tests ──────────────────────────────────────────────────

  describe('SWIFT', () => {
    it('can attack minions immediately when summoned', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a vanilla minion on player1's board
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a SWIFT minion on player2's board (freshly summoned)
      const swiftMinion = placeOnBoard(engine, 'test_swift', 'player2');
      swiftMinion.summonedThisTurn = true; // Just summoned

      // Attack a minion immediately - should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: swiftMinion.instanceId, defenderId: defender.instanceId },
      });

      expect(result.success).toBe(true);
    });

    it('cannot attack hero the turn it is summoned', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a SWIFT minion on player2's board (freshly summoned)
      const swiftMinion = placeOnBoard(engine, 'test_swift', 'player2');
      swiftMinion.summonedThisTurn = true; // Just summoned

      // Attack the hero - should fail
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: swiftMinion.instanceId, defenderId: 'hero_player1' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SWIFT');
    });

    it('can attack hero on subsequent turns', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a SWIFT minion on player2's board (NOT freshly summoned)
      const swiftMinion = placeOnBoard(engine, 'test_swift', 'player2');
      swiftMinion.summonedThisTurn = false; // Not summoned this turn

      // Attack the hero - should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: swiftMinion.instanceId, defenderId: 'hero_player1' },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── BLITZ Tests ──────────────────────────────────────────────────

  describe('BLITZ', () => {
    it('can attack hero immediately when summoned', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a BLITZ minion on player2's board (freshly summoned)
      const blitzMinion = placeOnBoard(engine, 'test_blitz', 'player2');
      blitzMinion.summonedThisTurn = true; // Just summoned

      // Attack the hero immediately - should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: blitzMinion.instanceId, defenderId: 'hero_player1' },
      });

      expect(result.success).toBe(true);
    });

    it('can attack minions immediately when summoned', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a vanilla minion on player1's board
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a BLITZ minion on player2's board (freshly summoned)
      const blitzMinion = placeOnBoard(engine, 'test_blitz', 'player2');
      blitzMinion.summonedThisTurn = true; // Just summoned

      // Attack a minion immediately - should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: blitzMinion.instanceId, defenderId: defender.instanceId },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── CLOAK Tests ──────────────────────────────────────────────────

  describe('CLOAK', () => {
    it('cannot be targeted/attacked while cloaked', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a CLOAK minion on player1's board
      const cloakMinion = placeOnBoard(engine, 'test_cloak', 'player1');
      cloakMinion.isCloaked = true;

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attempt to attack the cloaked minion - should fail
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: cloakMinion.instanceId },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('CLOAK');
    });

    it('cloak breaks when the cloaked minion attacks', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a vanilla minion on player2's board (will be the defender)
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Place a CLOAK minion on player1's board (will be the attacker)
      const cloakMinion = placeOnBoard(engine, 'test_cloak', 'player1');
      cloakMinion.isCloaked = true;

      // Ensure player1 is the active player
      ensureActivePlayer(engine, 'player1');
      cloakMinion.summonedThisTurn = false;

      expect(cloakMinion.isCloaked).toBe(true);

      // Attack with the cloaked minion
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player1',
        timestamp: Date.now(),
        data: { attackerId: cloakMinion.instanceId, defenderId: defender.instanceId },
      });

      // Cloak should be broken after attacking
      expect(cloakMinion.isCloaked).toBe(false);
    });

    it('after cloak breaks, can be attacked normally', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a CLOAK minion on player1's board
      const cloakMinion = placeOnBoard(engine, 'test_cloak', 'player1');
      cloakMinion.isCloaked = true;

      // Place a vanilla minion on player2's board for cloak to attack
      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player1 is the active player
      ensureActivePlayer(engine, 'player1');
      cloakMinion.summonedThisTurn = false;

      // Cloaked minion attacks (breaks cloak)
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player1',
        timestamp: Date.now(),
        data: { attackerId: cloakMinion.instanceId, defenderId: target.instanceId },
      });

      expect(cloakMinion.isCloaked).toBe(false);

      // Now switch to player2's turn
      engine.processAction({
        type: ActionType.END_TURN,
        playerId: 'player1',
        timestamp: Date.now(),
        data: {},
      });

      // Place an attacker on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      attacker.summonedThisTurn = false;

      // Attack the now-uncloaked minion - should succeed
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: cloakMinion.instanceId },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── Minion-to-Minion Combat Tests ────────────────────────────────

  describe('Minion-to-Minion Combat', () => {
    it('both minions take damage', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a 5/5 minion on player1's board
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Place a 2/2 minion on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: defender.instanceId },
      });

      // Both should have taken damage
      expect(defender.currentHealth).toBe(3); // 5 - 2
      expect(attacker.currentHealth).toBe(-3); // 2 - 5 (dead)
    });

    it('mutual kill (both die)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a 2/2 on player1's board
      const defender = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place a 2/2 on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: defender.instanceId },
      });

      // Both should be dead
      expect(attacker.zone).toBe(CardZone.GRAVEYARD);
      expect(defender.zone).toBe(CardZone.GRAVEYARD);
    });

    it('only defender dies', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a 1/1 on player1's board (defender, will die)
      const defender = placeOnBoard(engine, 'test_vanilla_1_1', 'player1');

      // Place a 5/5 on player2's board (attacker, survives)
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: defender.instanceId },
      });

      // Only defender should die
      expect(defender.zone).toBe(CardZone.GRAVEYARD);
      expect(attacker.zone).toBe(CardZone.BOARD);
      expect(attacker.currentHealth).toBe(4); // 5 - 1
    });

    it('only attacker dies', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a 5/5 on player1's board (defender, survives)
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Place a 1/1 on player2's board (attacker, will die)
      const attacker = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // Attack
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: defender.instanceId },
      });

      // Only attacker should die
      expect(attacker.zone).toBe(CardZone.GRAVEYARD);
      expect(defender.zone).toBe(CardZone.BOARD);
      expect(defender.currentHealth).toBe(4); // 5 - 1
    });
  });

  // ─── Attack Validation Tests ──────────────────────────────────────

  describe('Attack Validation', () => {
    it('cannot attack with opponent\'s minion', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a minion on player1's board
      const player1Minion = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place a minion on player2's board (to be the target)
      const player2Minion = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      player1Minion.summonedThisTurn = false;

      // Player2 tries to attack using player1's minion - should fail
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: player1Minion.instanceId, defenderId: player2Minion.instanceId },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('control');
    });

    it('cannot attack if already attacked (non-DOUBLE_STRIKE)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place two vanilla minions on player1's board
      const target1 = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
      const target2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Place a regular minion (non-DOUBLE_STRIKE) on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');
      attacker.summonedThisTurn = false;

      // First attack - should succeed
      const result1 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: target1.instanceId },
      });
      expect(result1.success).toBe(true);

      // Second attack - should fail
      const result2 = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: target2.instanceId },
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already attacked');
    });

    it('summoning sickness prevents attack (no SWIFT/BLITZ)', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Place a target on player1's board
      const defender = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      // Ensure player2 is the active player
      ensureActivePlayer(engine, 'player2');

      // Place a regular minion on player2's board (freshly summoned)
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');
      attacker.summonedThisTurn = true; // Just summoned

      // Attempt to attack - should fail due to summoning sickness
      const result = engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: { attackerId: attacker.instanceId, defenderId: defender.instanceId },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot attack the turn');
    });
  });
});

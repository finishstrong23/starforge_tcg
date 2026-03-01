/**
 * STARFORGE TCG - Death Processor & LAST_WORDS Keyword Tests
 *
 * Tests the LAST_WORDS trigger keyword and the death processing system.
 * LAST_WORDS effects fire when a minion is destroyed (health <= 0),
 * but NOT when banished or silenced.
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
  DamageEffectData,
  DrawEffectData,
  SummonEffectData,
  BuffEffectData,
  HealEffectData,
  GenericEffectData,
} from '../../src';
import { GameStateManager, PlayerSetup } from '../../src/game/GameState';

// ─── Test Card Definitions ──────────────────────────────────────────────

const TEST_CARDS: CardDefinition[] = [
  // Vanilla minion (no keywords)
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
  // Vanilla with 1 health (easy to kill)
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
  // Big vanilla (won't die easily)
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
  // LAST_WORDS: Draw a card
  {
    id: 'test_lw_draw',
    name: 'Dying Scholar',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 2,
    health: 1,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_draw',
      type: EffectType.DRAW,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.NONE,
      data: { count: 1 } as DrawEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Draw a card.',
    collectible: true,
    set: 'TEST',
  },
  // LAST_WORDS: Deal 2 damage to all enemy minions
  {
    id: 'test_lw_aoe',
    name: 'Volatile Firebug',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 1,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_aoe',
      type: EffectType.DAMAGE,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.ALL_ENEMY_MINIONS,
      data: { amount: 2 } as DamageEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Deal 2 damage to all enemy minions.',
    collectible: true,
    set: 'TEST',
  },
  // LAST_WORDS: Buff all friendly minions +1/+1
  {
    id: 'test_lw_buff',
    name: 'Inspiring Martyr',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 1,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_buff',
      type: EffectType.BUFF,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.ALL_FRIENDLY_MINIONS,
      data: { attack: 1, health: 1 } as BuffEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Give all friendly minions +1/+1.',
    collectible: true,
    set: 'TEST',
  },
  // LAST_WORDS: Summon two 1/1 tokens
  {
    id: 'test_lw_summon',
    name: 'Egg Sac',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 0,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_summon',
      type: EffectType.SUMMON,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.NONE,
      data: { cardId: 'test_vanilla_1_1', count: 2 } as SummonEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Summon two 1/1 minions.',
    collectible: true,
    set: 'TEST',
  },
  // LAST_WORDS: Heal hero for 3
  {
    id: 'test_lw_heal',
    name: 'Healing Spirit',
    cost: 2,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 1,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_heal',
      type: EffectType.HEAL,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.FRIENDLY_HERO,
      data: { amount: 3 } as HealEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Restore 3 Health to your Hero.',
    collectible: true,
    set: 'TEST',
  },
  // LAST_WORDS: Deal 3 damage to all enemy minions (for cascade testing)
  {
    id: 'test_lw_big_aoe',
    name: 'Unstable Colossus',
    cost: 5,
    type: CardType.MINION,
    rarity: CardRarity.EPIC,
    attack: 3,
    health: 1,
    keywords: [{ keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{
      id: 'lw_big_aoe',
      type: EffectType.DAMAGE,
      trigger: EffectTrigger.ON_DEATH,
      targetType: TargetType.ALL_ENEMY_MINIONS,
      data: { amount: 3 } as DamageEffectData,
      isMandatory: true,
    }],
    cardText: 'Last Words: Deal 3 damage to all enemy minions.',
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

// ─── Tests ──────────────────────────────────────────────────────────────

describe('LAST_WORDS Keyword', () => {
  describe('Basic Trigger', () => {
    it('should trigger LAST_WORDS draw effect when minion dies', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place a LAST_WORDS draw card on player1's board
      const lwCard = placeOnBoard(engine, 'test_lw_draw', 'player1');

      // Record hand count before death
      const handBefore = board.getHandCount('player1');

      // Kill the card and process deaths
      killMinion(lwCard);
      const deathProcessor = engine.getDeathProcessor();
      const result = deathProcessor.processDeaths();

      // Card should have died
      expect(result.deaths.length).toBeGreaterThanOrEqual(1);
      const death = result.deaths.find(d => d.cardInstanceId === lwCard.instanceId);
      expect(death).toBeDefined();

      // Card should be in graveyard
      expect(lwCard.zone).toBe(CardZone.GRAVEYARD);

      // LAST_WORDS should have triggered draw
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore + 1);
    });

    it('should trigger LAST_WORDS damage effect when minion dies', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS AoE card on player1's board
      const lwCard = placeOnBoard(engine, 'test_lw_aoe', 'player1');

      // Place enemy minion on player2's board
      const enemyMinion = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const enemyHealthBefore = enemyMinion.currentHealth!;

      // Kill the LAST_WORDS card
      killMinion(lwCard);
      const result = engine.getDeathProcessor().processDeaths();

      // LAST_WORDS should have dealt 2 damage to enemy minion
      expect(enemyMinion.currentHealth).toBe(enemyHealthBefore - 2);
    });

    it('should trigger LAST_WORDS buff effect when minion dies', () => {
      const engine = setupTestGame();

      // Place LAST_WORDS buff card and a friendly minion
      const lwCard = placeOnBoard(engine, 'test_lw_buff', 'player1');
      const friendlyMinion = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      const atkBefore = friendlyMinion.currentAttack!;
      const hpBefore = friendlyMinion.currentHealth!;

      // Kill the LAST_WORDS card
      killMinion(lwCard);
      engine.getDeathProcessor().processDeaths();

      // Friendly minion should have gotten +1/+1
      expect(friendlyMinion.currentAttack).toBe(atkBefore + 1);
      expect(friendlyMinion.currentHealth).toBe(hpBefore + 1);
    });

    it('should trigger LAST_WORDS summon effect when minion dies', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS summon card
      const lwCard = placeOnBoard(engine, 'test_lw_summon', 'player1');
      const boardCountBefore = board.getBoardCount('player1');

      // Kill the LAST_WORDS card
      killMinion(lwCard);
      engine.getDeathProcessor().processDeaths();

      // Should have summoned 2 tokens (original card is gone, +2 new = net +1)
      const boardCountAfter = board.getBoardCount('player1');
      expect(boardCountAfter).toBe(boardCountBefore - 1 + 2);
    });

    it('should trigger LAST_WORDS heal effect when minion dies', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage hero first so healing has effect
      stateManager.damageHero('player1', 10);
      const healthBefore = stateManager.getPlayer('player1').hero.currentHealth;

      // Place LAST_WORDS heal card
      const lwCard = placeOnBoard(engine, 'test_lw_heal', 'player1');

      // Kill the LAST_WORDS card
      killMinion(lwCard);
      engine.getDeathProcessor().processDeaths();

      // Hero should have healed 3
      const healthAfter = stateManager.getPlayer('player1').hero.currentHealth;
      expect(healthAfter).toBe(healthBefore + 3);
    });
  });

  describe('Silence Interaction', () => {
    it('should NOT trigger LAST_WORDS when minion is silenced', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS draw card
      const lwCard = placeOnBoard(engine, 'test_lw_draw', 'player1');

      // Silence the minion
      lwCard.keywords = [];
      lwCard.isSilenced = true;

      const handBefore = board.getHandCount('player1');

      // Kill the silenced card
      killMinion(lwCard);
      engine.getDeathProcessor().processDeaths();

      // Should NOT have drawn a card
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore);
    });

    it('should NOT trigger LAST_WORDS damage when silenced', () => {
      const engine = setupTestGame();

      // Place LAST_WORDS AoE card and silence it
      const lwCard = placeOnBoard(engine, 'test_lw_aoe', 'player1');
      lwCard.keywords = [];
      lwCard.isSilenced = true;

      // Place enemy minion
      const enemyMinion = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const enemyHealthBefore = enemyMinion.currentHealth!;

      // Kill silenced card
      killMinion(lwCard);
      engine.getDeathProcessor().processDeaths();

      // Enemy minion should NOT have taken damage
      expect(enemyMinion.currentHealth).toBe(enemyHealthBefore);
    });
  });

  describe('Banish Interaction', () => {
    it('should NOT trigger LAST_WORDS when minion is banished', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS draw card
      const lwCard = placeOnBoard(engine, 'test_lw_draw', 'player1');
      const handBefore = board.getHandCount('player1');

      // Banish instead of killing
      engine.getDeathProcessor().banishMinion(lwCard.instanceId);

      // Card should be banished, not in graveyard
      expect(lwCard.zone).toBe(CardZone.BANISHED);

      // Should NOT have drawn a card
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore);
    });
  });

  describe('Combat Death', () => {
    it('should trigger LAST_WORDS when minion dies from combat', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();
      const stateManager = engine.getStateManager();

      // Place LAST_WORDS draw card (2/1) on player1's board
      const lwCard = placeOnBoard(engine, 'test_lw_draw', 'player1');

      // Place attacker (2/2) on player2's board
      const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');

      const handBefore = board.getHandCount('player1');

      // Ensure it's player2's turn so they can attack
      const activeId = stateManager.getActivePlayerId();
      if (activeId !== 'player2') {
        // End player1's turn to switch to player2
        engine.processAction({
          type: ActionType.END_TURN,
          playerId: activeId,
          timestamp: Date.now(),
          data: {},
        });
      }

      // Ensure attacker can attack
      attacker.summonedThisTurn = false;

      // Attack the LAST_WORDS card
      engine.processAction({
        type: ActionType.ATTACK,
        playerId: 'player2',
        timestamp: Date.now(),
        data: {
          attackerId: attacker.instanceId,
          defenderId: lwCard.instanceId,
        },
      });

      // LAST_WORDS should have triggered (card had 1 HP, took 2 damage)
      expect(lwCard.zone).toBe(CardZone.GRAVEYARD);

      // Should have drawn a card
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore + 1);
    });
  });

  describe('Multiple Deaths', () => {
    it('should trigger LAST_WORDS for multiple dying minions', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place two LAST_WORDS draw cards
      const lw1 = placeOnBoard(engine, 'test_lw_draw', 'player1');
      const lw2 = placeOnBoard(engine, 'test_lw_draw', 'player1');

      const handBefore = board.getHandCount('player1');

      // Kill both
      killMinion(lw1);
      killMinion(lw2);
      engine.getDeathProcessor().processDeaths();

      // Should have drawn 2 cards (one from each LAST_WORDS)
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore + 2);
    });

    it('should process deaths from both players simultaneously', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS on both sides
      const p1Card = placeOnBoard(engine, 'test_lw_draw', 'player1');
      const p2Card = placeOnBoard(engine, 'test_lw_draw', 'player2');

      const p1HandBefore = board.getHandCount('player1');
      const p2HandBefore = board.getHandCount('player2');

      // Kill both
      killMinion(p1Card);
      killMinion(p2Card);
      const result = engine.getDeathProcessor().processDeaths();

      // Both should have triggered
      expect(result.deaths.length).toBeGreaterThanOrEqual(2);

      const p1HandAfter = board.getHandCount('player1');
      const p2HandAfter = board.getHandCount('player2');
      expect(p1HandAfter).toBe(p1HandBefore + 1);
      expect(p2HandAfter).toBe(p2HandBefore + 1);
    });
  });

  describe('Cascading Deaths', () => {
    it('should handle LAST_WORDS causing additional deaths', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place LAST_WORDS AoE (deals 2 to all enemy minions) on player1
      const lwAoe = placeOnBoard(engine, 'test_lw_aoe', 'player1');

      // Place 1-health enemy minions on player2's board
      const weakEnemy1 = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');
      const weakEnemy2 = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');

      // Kill the LAST_WORDS AoE card
      killMinion(lwAoe);
      engine.getDeathProcessor().processDeaths();

      // LAST_WORDS dealt 2 damage to all enemy minions (each has 1 HP)
      // So both enemy minions should also be dead
      expect(weakEnemy1.zone).toBe(CardZone.GRAVEYARD);
      expect(weakEnemy2.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should cascade: LAST_WORDS kills enemy which has its own LAST_WORDS', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Player1: LAST_WORDS AoE (deals 2 to all enemy minions on death)
      const lwAoe = placeOnBoard(engine, 'test_lw_aoe', 'player1');

      // Player2: LAST_WORDS draw (1 HP, will die from AoE)
      const lwDraw = placeOnBoard(engine, 'test_lw_draw', 'player2');

      const p2HandBefore = board.getHandCount('player2');

      // Kill the AoE card
      killMinion(lwAoe);
      engine.getDeathProcessor().processDeaths();

      // The AoE LAST_WORDS dealt 2 damage to player2's 1HP minion, killing it
      expect(lwDraw.zone).toBe(CardZone.GRAVEYARD);

      // The killed minion's LAST_WORDS should also have triggered (draw 1)
      const p2HandAfter = board.getHandCount('player2');
      expect(p2HandAfter).toBe(p2HandBefore + 1);
    });
  });

  describe('Non-LAST_WORDS minions', () => {
    it('should NOT trigger any effects when a vanilla minion dies', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place vanilla minion
      const vanilla = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Place enemy (should not be affected)
      const enemy = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const enemyHealthBefore = enemy.currentHealth!;
      const handBefore = board.getHandCount('player1');

      // Kill vanilla
      killMinion(vanilla);
      engine.getDeathProcessor().processDeaths();

      // Should be in graveyard
      expect(vanilla.zone).toBe(CardZone.GRAVEYARD);

      // No side effects
      expect(enemy.currentHealth).toBe(enemyHealthBefore);
      expect(board.getHandCount('player1')).toBe(handBefore);
    });
  });

  describe('Edge Cases', () => {
    it('should handle LAST_WORDS when no valid targets exist', () => {
      const engine = setupTestGame();

      // Place LAST_WORDS AoE on player1 with no enemy minions on board
      const lwAoe = placeOnBoard(engine, 'test_lw_aoe', 'player1');

      // Kill it — AoE targets ALL_ENEMY_MINIONS but there are none
      killMinion(lwAoe);

      // Should not throw
      expect(() => {
        engine.getDeathProcessor().processDeaths();
      }).not.toThrow();

      expect(lwAoe.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should handle LAST_WORDS buff with no other friendly minions', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place only the LAST_WORDS buff card (no other friendlies to buff)
      const lwBuff = placeOnBoard(engine, 'test_lw_buff', 'player1');

      // Kill it — buff targets ALL_FRIENDLY_MINIONS but there are none after it dies
      killMinion(lwBuff);

      expect(() => {
        engine.getDeathProcessor().processDeaths();
      }).not.toThrow();

      expect(lwBuff.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should process deaths with no dead minions gracefully', () => {
      const engine = setupTestGame();

      // Place healthy minion — should not die
      const healthy = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      const result = engine.getDeathProcessor().processDeaths();

      // No deaths
      expect(result.deaths.length).toBe(0);
      expect(healthy.zone).toBe(CardZone.BOARD);
    });

    it('should move dead minions to GRAVEYARD zone', () => {
      const engine = setupTestGame();

      const minion = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      expect(minion.zone).toBe(CardZone.BOARD);

      killMinion(minion);
      engine.getDeathProcessor().processDeaths();

      expect(minion.zone).toBe(CardZone.GRAVEYARD);
    });
  });

  describe('DeathProcessor.destroyMinion', () => {
    it('should mark a minion for death', () => {
      const engine = setupTestGame();

      const minion = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
      expect(minion.currentHealth).toBe(5);

      const deathEvent = engine.getDeathProcessor().destroyMinion(minion.instanceId);

      expect(deathEvent).not.toBeNull();
      expect(deathEvent!.cardInstanceId).toBe(minion.instanceId);
      expect(minion.currentHealth).toBe(0);
    });

    it('should return null for cards not on the board', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      const minion = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Move to graveyard
      board.moveCard(minion.instanceId, 'player1', 'player1', CardZone.GRAVEYARD);

      const deathEvent = engine.getDeathProcessor().destroyMinion(minion.instanceId);
      expect(deathEvent).toBeNull();
    });
  });

  describe('DeathProcessor.banishMinion', () => {
    it('should banish a minion without triggering LAST_WORDS', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      const lwCard = placeOnBoard(engine, 'test_lw_draw', 'player1');
      const handBefore = board.getHandCount('player1');

      const success = engine.getDeathProcessor().banishMinion(lwCard.instanceId);

      expect(success).toBe(true);
      expect(lwCard.zone).toBe(CardZone.BANISHED);

      // No draw should have happened
      expect(board.getHandCount('player1')).toBe(handBefore);
    });

    it('should return false for cards not on board', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      const minion = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      board.moveCard(minion.instanceId, 'player1', 'player1', CardZone.GRAVEYARD);

      const success = engine.getDeathProcessor().banishMinion(minion.instanceId);
      expect(success).toBe(false);
    });
  });

  describe('SALVAGE and IMMOLATE keywords (death-related)', () => {
    it('should process SALVAGE (draw a card) on death', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Manually create a card with SALVAGE keyword
      const card = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      card.keywords.push({ keyword: 'SALVAGE' as any });

      const handBefore = board.getHandCount('player1');

      killMinion(card);
      const result = engine.getDeathProcessor().processDeaths();

      // SALVAGE should have drawn a card
      expect(result.cardsDrawn.length).toBe(1);
      expect(board.getHandCount('player1')).toBe(handBefore + 1);
    });

    it('should process IMMOLATE (deal damage) on death', () => {
      const engine = setupTestGame();

      // Create card with IMMOLATE(2) keyword
      const card = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      card.keywords.push({ keyword: 'IMMOLATE' as any, value: 2 });

      // Place enemy minion
      const enemy = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const healthBefore = enemy.currentHealth!;

      killMinion(card);
      const result = engine.getDeathProcessor().processDeaths();

      // IMMOLATE should have dealt 2 damage to enemy
      expect(enemy.currentHealth).toBe(healthBefore - 2);
      expect(result.immolateDamage.size).toBeGreaterThan(0);
    });
  });
});

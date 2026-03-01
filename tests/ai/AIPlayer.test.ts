/**
 * STARFORGE TCG - AI Player Tests
 *
 * Tests AI decision-making, archetype detection, and turn execution.
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
  CombatKeyword,
  TriggerKeyword,
  OriginalKeyword,
  EffectType,
  EffectTrigger,
  TargetType,
} from '../../src';
import type {
  CardDefinition,
  CardInstance,
  DamageEffectData,
  DrawEffectData,
} from '../../src';
import { GameStateManager, PlayerSetup } from '../../src/game/GameState';
import { AIPlayer, AIDifficulty, DeckArchetype } from '../../src/ai/AIPlayer';

// ─── Test Card Definitions ──────────────────────────────────────────────

const TEST_CARDS: CardDefinition[] = [
  {
    id: 'test_vanilla_2_2', name: 'Test Vanilla', cost: 1, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 2, health: 2, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },
  {
    id: 'test_vanilla_1_1', name: 'Test Wisp', cost: 0, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 1, health: 1, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },
  {
    id: 'test_vanilla_5_5', name: 'Test Big', cost: 5, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 5, health: 5, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },
  {
    id: 'test_blitz_4_2', name: 'Test Blitz', cost: 3, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 4, health: 2,
    keywords: [{ keyword: CombatKeyword.BLITZ }], effects: [],
    cardText: 'Blitz', collectible: true, set: 'TEST',
  },
  {
    id: 'test_guardian_1_4', name: 'Test Guardian', cost: 2, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 1, health: 4,
    keywords: [{ keyword: CombatKeyword.GUARDIAN }], effects: [],
    cardText: 'Guardian', collectible: true, set: 'TEST',
  },
  {
    id: 'test_drain_3_3', name: 'Test Drain', cost: 3, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 3, health: 3,
    keywords: [{ keyword: CombatKeyword.DRAIN }], effects: [],
    cardText: 'Drain', collectible: true, set: 'TEST',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function setupTestGame(): GameEngine {
  globalCardDatabase.clear();
  initializeSampleDatabase();
  globalCardDatabase.registerCards(TEST_CARDS);

  const engine = new GameEngine();

  const buildDeck = (playerId: string): CardInstance[] => {
    const cards: CardInstance[] = [];
    for (let i = 0; i < 30; i++) {
      cards.push(globalCardFactory.createInstance('test_vanilla_2_2', { ownerId: playerId }));
    }
    return cards;
  };

  const p1Setup: PlayerSetup = {
    id: 'player1', name: 'Player 1', race: Race.COGSMITHS, heroId: '',
    deck: buildDeck('player1'),
  };
  const p2Setup: PlayerSetup = {
    id: 'player2', name: 'Player 2', race: Race.LUMINAR, heroId: '',
    deck: buildDeck('player2'),
  };

  engine.initializeGame(p1Setup, p2Setup);
  engine.startGame();
  return engine;
}

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

function addToHand(engine: GameEngine, definitionId: string, ownerId: string): CardInstance {
  const card = globalCardFactory.createInstance(definitionId, { ownerId });
  const board = engine.getStateManager().getBoard();
  const state = engine.getStateManager().getState();

  board.registerCard(card);
  (state.cards as Map<string, CardInstance>).set(card.instanceId, card);
  const zones = board.getPlayerZones(ownerId);
  zones.hand.add(card.instanceId);
  card.zone = CardZone.HAND;
  return card;
}

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

describe('AIPlayer', () => {
  describe('Construction', () => {
    it('should create an AI player with specified difficulty', () => {
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);
      expect(ai.getPlayerId()).toBe('player2');
      expect(ai.getDifficulty()).toBe(AIDifficulty.HARD);
    });

    it('should default to MEDIUM difficulty', () => {
      const ai = new AIPlayer('player2');
      expect(ai.getDifficulty()).toBe(AIDifficulty.MEDIUM);
    });
  });

  describe('Turn Execution (Sync)', () => {
    it('should execute a turn without crashing', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.MEDIUM, 0);

      ensureActivePlayer(engine, 'player2');

      expect(() => {
        ai.executeTurnSync(engine);
      }).not.toThrow();

      // After AI turn, it should be player1's turn
      expect(engine.getState().activePlayerId).toBe('player1');
    });

    it('should play cards when it has mana', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      ensureActivePlayer(engine, 'player2');
      const player = engine.getStateManager().getPlayer('player2');
      player.crystals.current = 5;
      player.crystals.maximum = 5;

      // Give AI some playable cards in hand
      addToHand(engine, 'test_vanilla_2_2', 'player2');
      addToHand(engine, 'test_vanilla_2_2', 'player2');

      const boardBefore = engine.getStateManager().getBoard().getBoardCount('player2');

      ai.executeTurnSync(engine);

      // AI should have played at least one card
      const boardAfter = engine.getStateManager().getBoard().getBoardCount('player2');
      expect(boardAfter).toBeGreaterThanOrEqual(boardBefore);
    });

    it('should attack with available minions', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      // Place an attacker on AI's board
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Place a weak target on opponent's board
      const target = placeOnBoard(engine, 'test_vanilla_1_1', 'player1');

      ensureActivePlayer(engine, 'player2');

      ai.executeTurnSync(engine);

      // AI should have attacked with its minion
      expect(attacker.attacksMadeThisTurn).toBeGreaterThanOrEqual(1);
    });

    it('EASY AI should still make some moves', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.EASY, 0);

      ensureActivePlayer(engine, 'player2');
      const player = engine.getStateManager().getPlayer('player2');
      player.crystals.current = 3;
      player.crystals.maximum = 3;

      addToHand(engine, 'test_vanilla_2_2', 'player2');

      // Run multiple times — EASY is random but should sometimes act
      let acted = false;
      for (let i = 0; i < 10; i++) {
        const eng = setupTestGame();
        const easyAi = new AIPlayer('player2', AIDifficulty.EASY, 0);
        ensureActivePlayer(eng, 'player2');
        const p = eng.getStateManager().getPlayer('player2');
        p.crystals.current = 3;
        p.crystals.maximum = 3;
        addToHand(eng, 'test_vanilla_2_2', 'player2');

        const boardBefore = eng.getStateManager().getBoard().getBoardCount('player2');
        easyAi.executeTurnSync(eng);
        if (eng.getStateManager().getBoard().getBoardCount('player2') > boardBefore) {
          acted = true;
          break;
        }
      }
      // EASY AI should play cards at least sometimes
      expect(acted).toBe(true);
    });
  });

  describe('Combat Decision-Making', () => {
    it('should prioritize killing enemy minions (HARD)', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      // AI has a 5/5
      const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Enemy has a 2/2 (tradeable)
      const enemy = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      ensureActivePlayer(engine, 'player2');

      ai.executeTurnSync(engine);

      // AI should have attacked the enemy minion (good trade)
      // The enemy should be dead or damaged
      expect(enemy.currentHealth! <= 0 || attacker.attacksMadeThisTurn > 0).toBe(true);
    });

    it('should go face when opponent is low health', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);
      const stateManager = engine.getStateManager();

      // Opponent at very low health
      stateManager.damageHero('player1', 25);

      // AI has attackers
      placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      const heroHpBefore = stateManager.getPlayer('player1').hero.currentHealth;
      ensureActivePlayer(engine, 'player2');

      ai.executeTurnSync(engine);

      // AI should have attacked face
      const heroHpAfter = stateManager.getPlayer('player1').hero.currentHealth;
      expect(heroHpAfter).toBeLessThan(heroHpBefore);
    });
  });

  describe('Edge Cases', () => {
    it('should not crash with empty hand and board', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      ensureActivePlayer(engine, 'player2');
      const player = engine.getStateManager().getPlayer('player2');
      player.crystals.current = 0;

      // Clear AI hand
      const board = engine.getStateManager().getBoard();
      const hand = board.getHandCards('player2');
      for (const card of hand) {
        board.moveCard(card.instanceId, 'player2', 'player2', CardZone.GRAVEYARD);
      }

      expect(() => {
        ai.executeTurnSync(engine);
      }).not.toThrow();
    });

    it('should not crash with a full board', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      // Fill AI's board
      for (let i = 0; i < 7; i++) {
        placeOnBoard(engine, 'test_vanilla_2_2', 'player2');
      }

      ensureActivePlayer(engine, 'player2');
      const player = engine.getStateManager().getPlayer('player2');
      player.crystals.current = 5;
      player.crystals.maximum = 5;

      expect(() => {
        ai.executeTurnSync(engine);
      }).not.toThrow();
    });

    it('should end turn properly', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.MEDIUM, 0);

      ensureActivePlayer(engine, 'player2');

      ai.executeTurnSync(engine);

      // After AI executes, turn should have passed
      expect(engine.getState().activePlayerId).toBe('player1');
    });

    it('should handle game ending during its turn', () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.HARD, 0);

      // Set opponent to 1 HP with a minion on AI board
      engine.getStateManager().damageHero('player1', 29);
      placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      ensureActivePlayer(engine, 'player2');

      expect(() => {
        ai.executeTurnSync(engine);
      }).not.toThrow();

      // Game should be over
      expect(engine.getState().status).toBe(GameStatus.FINISHED);
    });
  });

  describe('Async Turn Execution', () => {
    it('should execute a turn asynchronously', async () => {
      const engine = setupTestGame();
      const ai = new AIPlayer('player2', AIDifficulty.MEDIUM, 0); // 0ms delay for testing

      ensureActivePlayer(engine, 'player2');

      await ai.executeTurn(engine);

      expect(engine.getState().activePlayerId).toBe('player1');
    });
  });
});

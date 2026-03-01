/**
 * STARFORGE TCG - Game Engine Tests
 *
 * Tests for the core game engine functionality.
 */

import {
  GameEngine,
  quickStartGame,
  initializeSampleDatabase,
  createSampleDeck,
  globalCardDatabase,
  globalCardFactory,
  Race,
  GamePhase,
  GameStatus,
  ActionType,
  CardZone,
} from '../../src';

describe('GameEngine', () => {
  beforeEach(() => {
    // Clear database before each test
    globalCardDatabase.clear();
  });

  describe('Game Initialization', () => {
    it('should initialize a new game with two players', () => {
      const engine = quickStartGame(Race.COGSMITHS, Race.LUMINAR);
      const state = engine.getState();

      expect(state.status).toBe(GameStatus.ACTIVE);
      expect(state.players.size).toBe(2);
      expect(state.turn).toBe(0);
    });

    it('should have both players with correct races', () => {
      const engine = quickStartGame(Race.PYROCLAST, Race.BIOTITANS);
      const state = engine.getState();

      const player1 = state.players.get('player1');
      const player2 = state.players.get('player2');

      expect(player1?.race).toBe(Race.PYROCLAST);
      expect(player2?.race).toBe(Race.BIOTITANS);
    });

    it('should have shuffled decks with 30 cards', () => {
      const engine = quickStartGame();
      const board = engine.getStateManager().getBoard();

      expect(board.getDeckCount('player1')).toBe(30);
      expect(board.getDeckCount('player2')).toBe(30);
    });
  });

  describe('Card Database', () => {
    it('should register sample cards', () => {
      initializeSampleDatabase();

      expect(globalCardDatabase.size).toBeGreaterThan(0);
      expect(globalCardDatabase.hasCard('neutral_stellar_scout')).toBe(true);
      expect(globalCardDatabase.hasCard('cog_cog_worker')).toBe(true);
    });

    it('should query cards by race', () => {
      initializeSampleDatabase();

      const cogsmithCards = globalCardDatabase.query({ race: Race.COGSMITHS });
      expect(cogsmithCards.length).toBeGreaterThan(0);
      expect(cogsmithCards.every(c => c.race === Race.COGSMITHS)).toBe(true);
    });

    it('should query cards by cost', () => {
      initializeSampleDatabase();

      const oneCostCards = globalCardDatabase.query({ cost: 1 });
      expect(oneCostCards.every(c => c.cost === 1)).toBe(true);
    });
  });

  describe('Game Flow', () => {
    it('should start game and draw initial hands', () => {
      const engine = quickStartGame();
      engine.startGame();

      const state = engine.getState();
      const board = engine.getStateManager().getBoard();

      // Check phase is MAIN after starting
      expect(state.phase).toBe(GamePhase.MAIN);

      // Check hands have cards
      const p1HandCount = board.getHandCount('player1');
      const p2HandCount = board.getHandCount('player2');

      // First player draws 3 + 1 (turn start), second draws 4
      expect(p1HandCount + p2HandCount).toBe(8);
    });

    it('should track turn number', () => {
      const engine = quickStartGame();
      engine.startGame();

      expect(engine.getState().turn).toBe(1);
    });

    it('should have active player set', () => {
      const engine = quickStartGame();
      engine.startGame();

      const activePlayerId = engine.getState().activePlayerId;
      expect(['player1', 'player2']).toContain(activePlayerId);
    });
  });

  describe('Crystal System', () => {
    it('should give player 1 crystal on turn 1', () => {
      const engine = quickStartGame();
      engine.startGame();

      const activePlayerId = engine.getState().activePlayerId;
      const player = engine.getStateManager().getPlayer(activePlayerId);

      expect(player.crystals.current).toBe(1);
      expect(player.crystals.maximum).toBe(1);
    });
  });

  describe('Event System', () => {
    it('should emit events during game', () => {
      const engine = quickStartGame();
      const events = engine.getEvents();
      const receivedEvents: string[] = [];

      events.subscribe((event) => {
        receivedEvents.push(event.type);
      });

      engine.startGame();

      // Should have received game started and turn started events
      expect(receivedEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Action Processing', () => {
    it('should validate end turn action', () => {
      const engine = quickStartGame();
      engine.startGame();

      const activePlayerId = engine.getState().activePlayerId;

      const result = engine.processAction({
        type: ActionType.END_TURN,
        playerId: activePlayerId,
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(true);

      // Turn should have changed
      expect(engine.getState().activePlayerId).not.toBe(activePlayerId);
    });

    it('should reject actions from non-active player', () => {
      const engine = quickStartGame();
      engine.startGame();

      const activePlayerId = engine.getState().activePlayerId;
      const otherPlayerId = activePlayerId === 'player1' ? 'player2' : 'player1';

      const result = engine.processAction({
        type: ActionType.END_TURN,
        playerId: otherPlayerId,
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });
  });

  describe('Concede', () => {
    it('should allow player to concede', () => {
      const engine = quickStartGame();
      engine.startGame();

      const result = engine.processAction({
        type: ActionType.CONCEDE,
        playerId: 'player1',
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(true);
      expect(engine.getState().status).toBe(GameStatus.FINISHED);
      expect(engine.getState().winnerId).toBe('player2');
    });
  });
});

describe('Card Factory', () => {
  beforeEach(() => {
    globalCardDatabase.clear();
    initializeSampleDatabase();
  });

  it('should create card instances from definitions', () => {
    const instance = globalCardFactory.createInstance('neutral_stellar_scout', {
      ownerId: 'player1',
    });

    expect(instance.definitionId).toBe('neutral_stellar_scout');
    expect(instance.ownerId).toBe('player1');
    expect(instance.currentCost).toBe(1);
    expect(instance.currentAttack).toBe(1);
    expect(instance.currentHealth).toBe(3);
  });

  it('should create deck with correct number of cards', () => {
    const { cards } = createSampleDeck(Race.COGSMITHS, 'player1');

    expect(cards.length).toBe(30);
    expect(cards.every(c => c.ownerId === 'player1')).toBe(true);
  });

  it('should create tokens', () => {
    const token = globalCardFactory.createToken(
      'Test Token',
      2,
      2,
      'player1'
    );

    expect(token.currentAttack).toBe(2);
    expect(token.currentHealth).toBe(2);
    expect(token.ownerId).toBe('player1');
    expect(token.summonedThisTurn).toBe(true);
  });
});

describe('Keywords', () => {
  beforeEach(() => {
    globalCardDatabase.clear();
    initializeSampleDatabase();
  });

  it('should track BARRIER state', () => {
    const card = globalCardFactory.createInstance('cog_cog_worker', {
      ownerId: 'player1',
    });

    expect(card.hasBarrier).toBe(true);
  });

  it('should track CLOAK state', () => {
    const card = globalCardFactory.createInstance('void_rift_walker', {
      ownerId: 'player1',
    });

    expect(card.isCloaked).toBe(true);
  });
});

/**
 * STARFORGE TCG - Game State Manager
 *
 * Central state management for the game, integrating
 * player states, board state, and game flow.
 */

import {
  GamePhase,
  GameStatus,
  DefaultGameConfig,
  getOpponentId,
} from '../types/Game';
import type {
  GameState,
  GameConfig,
  GameAction,
  PendingChoice,
} from '../types/Game';
import {
  createInitialPlayerState,
  StartingHealth,
  isPlayerDead,
} from '../types/Player';
import type { PlayerState } from '../types/Player';
import { CardZone } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { Race } from '../types/Race';
import { GameBoard } from './Board';
import { EventEmitter } from '../events/EventEmitter';
import { GameEventType, createEvent } from '../events/GameEvent';
import type { GameStartedData, GameEndedData, TurnEventData } from '../events/GameEvent';
import { generateGameId } from '../utils/ids';
import { deepClone } from '../utils/object';

/**
 * Player initialization data
 */
export interface PlayerSetup {
  id: string;
  name: string;
  race: Race;
  heroId: string;
  deck: CardInstance[];
}

/**
 * Complete game state manager
 */
export class GameStateManager {
  private state: GameState;
  private board: GameBoard;
  private events: EventEmitter;
  private config: GameConfig;
  private stateHistory: GameState[] = [];
  private maxHistorySize = 100;

  constructor(config: GameConfig = DefaultGameConfig) {
    this.config = config;
    this.board = new GameBoard();
    this.events = new EventEmitter();
    this.state = this.createEmptyState();
  }

  /**
   * Create empty initial state
   */
  private createEmptyState(): GameState {
    return {
      id: generateGameId(),
      status: GameStatus.WAITING,
      turn: 0,
      phase: GamePhase.SETUP,
      activePlayerId: '',
      players: new Map(),
      cards: new Map(),
      effectQueue: [],
      history: [],
      turnTimer: this.config.turnTimeLimit,
      turnTimeLimit: this.config.turnTimeLimit,
      allowReconnect: true,
      randomSeed: this.config.seed || Date.now(),
      revealedCards: [],
    };
  }

  /**
   * Initialize a new game with two players
   */
  initializeGame(player1: PlayerSetup, player2: PlayerSetup): void {
    // Create player states
    const p1State = createInitialPlayerState(
      player1.id,
      player1.name,
      player1.race,
      player1.heroId,
      player1.deck.map((c) => c.instanceId)
    );

    const p2State = createInitialPlayerState(
      player2.id,
      player2.name,
      player2.race,
      player2.heroId,
      player2.deck.map((c) => c.instanceId)
    );

    // Initialize board
    this.board.initializePlayer(player1.id);
    this.board.initializePlayer(player2.id);

    // Register all cards
    for (const card of player1.deck) {
      card.zone = CardZone.DECK;
      this.board.registerCard(card);
      this.state.cards.set(card.instanceId, card);
    }
    for (const card of player2.deck) {
      card.zone = CardZone.DECK;
      this.board.registerCard(card);
      this.state.cards.set(card.instanceId, card);
    }

    // Set up deck zones
    const p1Zones = this.board.getPlayerZones(player1.id);
    const p2Zones = this.board.getPlayerZones(player2.id);

    for (const card of player1.deck) {
      p1Zones.deck.add(card.instanceId);
    }
    for (const card of player2.deck) {
      p2Zones.deck.add(card.instanceId);
    }

    // Shuffle decks
    this.board.shuffleDeck(player1.id, this.state.randomSeed);
    this.board.shuffleDeck(player2.id, this.state.randomSeed + 1);

    // Update state
    this.state.players.set(player1.id, p1State);
    this.state.players.set(player2.id, p2State);

    // Randomly determine who goes first
    const firstPlayerId =
      Math.random() < 0.5 ? player1.id : player2.id;
    this.state.activePlayerId = firstPlayerId;

    this.state.status = GameStatus.ACTIVE;
    this.state.phase = GamePhase.MULLIGAN;

    // Emit game started event
    this.emitEvent(GameEventType.GAME_STARTED, undefined, {
      player1Id: player1.id,
      player2Id: player2.id,
      firstPlayerId,
    } as GameStartedData);

    this.saveSnapshot();
  }

  /**
   * Get current game state (read-only copy)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Get the game board
   */
  getBoard(): GameBoard {
    return this.board;
  }

  /**
   * Get event emitter for subscribing to events
   */
  getEvents(): EventEmitter {
    return this.events;
  }

  /**
   * Get player state
   */
  getPlayer(playerId: string): PlayerState {
    const player = this.state.players.get(playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    return player;
  }

  /**
   * Get opponent's player ID
   */
  getOpponentId(playerId: string): string {
    return getOpponentId(this.state, playerId);
  }

  /**
   * Get card instance
   */
  getCard(instanceId: string): CardInstance {
    const card = this.state.cards.get(instanceId);
    if (!card) {
      throw new Error(`Card ${instanceId} not found`);
    }
    return card;
  }

  /**
   * Check if it's a player's turn
   */
  isPlayerTurn(playerId: string): boolean {
    return (
      this.state.activePlayerId === playerId &&
      this.state.phase === GamePhase.MAIN
    );
  }

  /**
   * Get current turn number
   */
  getCurrentTurn(): number {
    return this.state.turn;
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): GamePhase {
    return this.state.phase;
  }

  /**
   * Get active player ID
   */
  getActivePlayerId(): string {
    return this.state.activePlayerId;
  }

  /**
   * Update player state
   */
  updatePlayer(playerId: string, updates: Partial<PlayerState>): void {
    const player = this.getPlayer(playerId);
    Object.assign(player, updates);
  }

  /**
   * Update card instance
   */
  updateCard(instanceId: string, updates: Partial<CardInstance>): void {
    const card = this.getCard(instanceId);
    Object.assign(card, updates);
  }

  /**
   * Set game phase
   */
  setPhase(phase: GamePhase): void {
    const previousPhase = this.state.phase;
    this.state.phase = phase;

    this.emitEvent(GameEventType.PHASE_CHANGED, this.state.activePlayerId, {
      previousPhase,
      newPhase: phase,
    });
  }

  /**
   * Start a new turn
   */
  startTurn(playerId: string): void {
    console.log('[GameState] startTurn called for:', playerId);

    this.state.turn++;
    this.state.activePlayerId = playerId;
    this.state.phase = GamePhase.TURN_START;

    const player = this.getPlayer(playerId);

    // Reset turn-based state
    player.cardsPlayedThisTurn = 0;
    player.spellsCastThisTurn = 0;
    player.cardsDrawnThisTurn = 0;
    player.hero.heroPowerUsedThisTurn = false;
    player.hero.hasAttackedThisTurn = false;

    // Gain crystal (max 10)
    if (player.crystals.maximum < 10) {
      player.crystals.maximum++;
    }

    // Refill crystals
    player.crystals.current = player.crystals.maximum;
    player.crystals.temporary = 0;

    // Apply STARFORGE overload — locks crystals from previous turn's Starforge
    if (player.crystals.overloaded > 0) {
      const locked = Math.min(player.crystals.overloaded, player.crystals.current);
      player.crystals.current -= locked;
      player.crystals.overloaded = 0;

      this.emitEvent(GameEventType.DAMAGE_DEALT, playerId, {
        targetId: `hero_${playerId}`,
        targetType: 'overload',
        amount: locked,
        source: 'STARFORGE_OVERLOAD',
      });
    }

    // Reset minion attack states
    const boardCards = this.board.getBoardCards(playerId);
    for (const card of boardCards) {
      card.hasAttackedThisTurn = false;
      card.attacksMadeThisTurn = 0;
      card.summonedThisTurn = false;
    }

    // Draw a card at start of every turn (including turn 1 for more card flow)
    this.board.drawCards(playerId, 1);

    this.emitEvent(GameEventType.TURN_STARTED, playerId, {
      playerId,
      turnNumber: this.state.turn,
    } as TurnEventData);

    // Transition to MAIN phase - this is where players can take actions
    this.state.phase = GamePhase.MAIN;
    console.log('[GameState] Phase set to MAIN, activePlayer:', this.state.activePlayerId);

    this.saveSnapshot();
  }

  /**
   * End current turn
   */
  endTurn(): void {
    const playerId = this.state.activePlayerId;
    console.log('[GameState] endTurn called for:', playerId);

    this.state.phase = GamePhase.TURN_END;

    // Clear temporary buffs on board minions
    const boardCards = this.board.getBoardCards(playerId);
    for (const card of boardCards) {
      if (card.temporaryBuffs.length > 0) {
        // Clear temporary buffs (handled by CardFactory)
        card.temporaryBuffs = [];
      }
    }

    // Remove ECHO copies
    const echoCopies = boardCards.filter((c) => c.isEchoInstance);
    for (const card of echoCopies) {
      this.board.moveCard(
        card.instanceId,
        playerId,
        playerId,
        CardZone.BANISHED
      );
    }

    this.emitEvent(GameEventType.TURN_ENDED, playerId, {
      playerId,
      turnNumber: this.state.turn,
    } as TurnEventData);

    // Switch to opponent's turn
    const opponentId = this.getOpponentId(playerId);
    console.log('[GameState] Switching to opponent:', opponentId);
    this.startTurn(opponentId);
  }

  /**
   * Record an action in history
   */
  recordAction(action: GameAction): void {
    this.state.history.push(action);
  }

  /**
   * Set pending choice for player
   */
  setPendingChoice(choice: PendingChoice | undefined): void {
    this.state.pendingChoice = choice;
  }

  /**
   * Get pending choice
   */
  getPendingChoice(): PendingChoice | undefined {
    return this.state.pendingChoice;
  }

  /**
   * Check for game end conditions
   */
  checkGameEnd(): { isOver: boolean; winnerId?: string; reason?: string } {
    const players = Array.from(this.state.players.values());

    const deadPlayers = players.filter((p) => isPlayerDead(p));

    if (deadPlayers.length === 2) {
      // Both players dead - draw
      return { isOver: true, reason: 'draw' };
    }

    if (deadPlayers.length === 1) {
      // One player dead - other wins
      const winner = players.find((p) => !isPlayerDead(p));
      return { isOver: true, winnerId: winner?.id, reason: 'victory' };
    }

    // Check turn limit
    if (this.state.turn >= this.config.maxTurns) {
      return { isOver: true, reason: 'draw' };
    }

    return { isOver: false };
  }

  /**
   * End the game
   */
  endGame(winnerId?: string, reason: string = 'victory'): void {
    this.state.status = winnerId ? GameStatus.FINISHED : GameStatus.DRAW;
    this.state.phase = GamePhase.GAME_OVER;
    this.state.winnerId = winnerId;

    this.emitEvent(GameEventType.GAME_ENDED, undefined, {
      winnerId,
      reason: reason as 'victory' | 'concede' | 'disconnect' | 'draw' | 'timeout',
    } as GameEndedData);
  }

  /**
   * Player concedes
   */
  concede(playerId: string): void {
    const player = this.getPlayer(playerId);
    player.hasConceded = true;

    const winnerId = this.getOpponentId(playerId);
    this.endGame(winnerId, 'concede');
  }

  /**
   * Deal damage to a player's hero
   */
  damageHero(playerId: string, amount: number): number {
    const player = this.getPlayer(playerId);
    let remainingDamage = amount;

    // Armor absorbs damage first
    if (player.hero.armor > 0) {
      const armorAbsorbed = Math.min(player.hero.armor, remainingDamage);
      player.hero.armor -= armorAbsorbed;
      remainingDamage -= armorAbsorbed;
    }

    // Apply remaining damage to health
    if (remainingDamage > 0 && !player.hero.isImmune) {
      player.hero.currentHealth -= remainingDamage;
      player.totalDamageDealt += remainingDamage;
    }

    return remainingDamage;
  }

  /**
   * Heal a player's hero
   */
  healHero(playerId: string, amount: number): number {
    const player = this.getPlayer(playerId);
    const maxHeal = player.hero.maxHealth - player.hero.currentHealth;
    const actualHeal = Math.min(amount, maxHeal);

    player.hero.currentHealth += actualHeal;
    player.totalHealingDone += actualHeal;

    return actualHeal;
  }

  /**
   * Save state snapshot for undo/replay
   */
  private saveSnapshot(): void {
    const snapshot = deepClone(this.state);
    this.stateHistory.push(snapshot);

    // Trim history
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get state history
   */
  getStateHistory(): GameState[] {
    return [...this.stateHistory];
  }

  /**
   * Emit a game event
   */
  private emitEvent(
    type: GameEventType,
    playerId: string | undefined,
    data: object
  ): void {
    const event = createEvent(
      type,
      this.state.id,
      this.state.turn,
      playerId,
      data as Record<string, unknown>
    );
    this.events.emit(event);
  }

  /**
   * Get game config
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return (
      this.state.status === GameStatus.FINISHED ||
      this.state.status === GameStatus.DRAW ||
      this.state.status === GameStatus.ABANDONED
    );
  }

  /**
   * Get winner ID (if game is over)
   */
  getWinnerId(): string | undefined {
    return this.state.winnerId;
  }
}

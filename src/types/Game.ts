/**
 * STARFORGE TCG - Game Types
 *
 * Core game state, actions, and game flow types.
 */

import { PlayerState } from './Player';
import { CardInstance } from './Card';
import { Effect, ResolvedEffect } from './Effects';

/**
 * Game phases within a turn
 */
export enum GamePhase {
  /** Game is being set up */
  SETUP = 'SETUP',
  /** Mulligan phase */
  MULLIGAN = 'MULLIGAN',
  /** Start of turn (draw, gain crystal, triggers) */
  TURN_START = 'TURN_START',
  /** Main phase (play cards, attack, hero power) */
  MAIN = 'MAIN',
  /** Combat resolution */
  COMBAT = 'COMBAT',
  /** End of turn (triggers, cleanup) */
  TURN_END = 'TURN_END',
  /** Game has ended */
  GAME_OVER = 'GAME_OVER',
}

/**
 * Game status
 */
export enum GameStatus {
  /** Waiting for players */
  WAITING = 'WAITING',
  /** Game is active */
  ACTIVE = 'ACTIVE',
  /** Game ended with a winner */
  FINISHED = 'FINISHED',
  /** Game ended in a draw */
  DRAW = 'DRAW',
  /** Game was abandoned */
  ABANDONED = 'ABANDONED',
}

/**
 * Types of actions a player can take
 */
export enum ActionType {
  /** Play a card from hand */
  PLAY_CARD = 'PLAY_CARD',
  /** Attack with a minion */
  ATTACK = 'ATTACK',
  /** Use hero power */
  HERO_POWER = 'HERO_POWER',
  /** End turn */
  END_TURN = 'END_TURN',
  /** Mulligan cards */
  MULLIGAN = 'MULLIGAN',
  /** Choose option (for Discover, Adapt, etc.) */
  CHOOSE_OPTION = 'CHOOSE_OPTION',
  /** Choose target */
  CHOOSE_TARGET = 'CHOOSE_TARGET',
  /** Concede the game */
  CONCEDE = 'CONCEDE',
  /** Activate STARFORGE */
  ACTIVATE_STARFORGE = 'ACTIVATE_STARFORGE',
  /** Use UPGRADE on a card */
  USE_UPGRADE = 'USE_UPGRADE',
}

/**
 * Base action interface
 */
export interface GameAction {
  /** Type of action */
  type: ActionType;
  /** Player taking the action */
  playerId: string;
  /** Timestamp */
  timestamp: number;
  /** Action-specific data */
  data: ActionData;
}

/**
 * Union type for action-specific data
 */
export type ActionData =
  | PlayCardData
  | AttackData
  | HeroPowerData
  | MulliganData
  | ChooseOptionData
  | ChooseTargetData
  | ActivateStarforgeData
  | UseUpgradeData
  | EmptyData;

export interface PlayCardData {
  /** Card instance ID */
  cardInstanceId: string;
  /** Board position (for minions) */
  position?: number;
  /** Target instance ID (for targeted effects) */
  targetId?: string;
}

export interface AttackData {
  /** Attacking minion/hero instance ID */
  attackerId: string;
  /** Target minion/hero instance ID */
  defenderId: string;
}

export interface HeroPowerData {
  /** Target instance ID (if hero power requires target) */
  targetId?: string;
}

export interface MulliganData {
  /** Card instance IDs to mulligan */
  cardIds: string[];
}

export interface ChooseOptionData {
  /** Index of chosen option */
  optionIndex: number;
  /** Context of the choice */
  choiceContext: string;
}

export interface ChooseTargetData {
  /** Target instance ID */
  targetId: string;
  /** Effect this target is for */
  effectId: string;
}

export interface ActivateStarforgeData {
  /** Card instance ID to STARFORGE */
  cardInstanceId: string;
}

export interface UseUpgradeData {
  /** Card instance ID */
  cardInstanceId: string;
  /** UPGRADE cost paid */
  upgradeCost: number;
}

export interface EmptyData {
  // For actions with no additional data (END_TURN, CONCEDE)
}

/**
 * Complete game state
 */
export interface GameState {
  /** Unique game ID */
  id: string;

  /** Game status */
  status: GameStatus;

  /** Current turn number (starts at 1) */
  turn: number;

  /** Current phase */
  phase: GamePhase;

  /** ID of the player whose turn it is */
  activePlayerId: string;

  /** Player states (keyed by player ID) */
  players: Map<string, PlayerState>;

  /** All card instances in the game */
  cards: Map<string, CardInstance>;

  /** Effect queue (effects waiting to resolve) */
  effectQueue: ResolvedEffect[];

  /** Action history for this game */
  history: GameAction[];

  /** Winner player ID (if game over) */
  winnerId?: string;

  /** Turn timer (seconds remaining) */
  turnTimer: number;

  /** Maximum turn time */
  turnTimeLimit: number;

  /** Whether the game allows reconnection */
  allowReconnect: boolean;

  /** Random seed for reproducibility */
  randomSeed: number;

  /** Pending choices (for Discover, Adapt, etc.) */
  pendingChoice?: PendingChoice;

  /** Cards revealed but not yet acted upon */
  revealedCards: string[];
}

/**
 * Pending choice for player
 */
export interface PendingChoice {
  /** Player who must choose */
  playerId: string;
  /** Type of choice */
  type: ChoiceType;
  /** Options to choose from */
  options: ChoiceOption[];
  /** Minimum selections required */
  minSelections: number;
  /** Maximum selections allowed */
  maxSelections: number;
  /** Source of the choice (card/effect ID) */
  sourceId: string;
  /** Time limit for choice */
  timeLimit?: number;
}

export enum ChoiceType {
  DISCOVER = 'DISCOVER',
  ADAPT = 'ADAPT',
  CHOOSE_TARGET = 'CHOOSE_TARGET',
  MULLIGAN = 'MULLIGAN',
  CHOOSE_ONE = 'CHOOSE_ONE',
  SCRY = 'SCRY',
}

export interface ChoiceOption {
  id: string;
  displayText: string;
  cardId?: string; // For card choices
  effectDescription?: string;
}

/**
 * Game configuration
 */
export interface GameConfig {
  /** Turn time limit in seconds */
  turnTimeLimit: number;
  /** Maximum turns before draw */
  maxTurns: number;
  /** Allow spectators */
  allowSpectators: boolean;
  /** Game mode */
  mode: GameMode;
  /** Random seed (for reproducibility) */
  seed?: number;
}

export enum GameMode {
  CASUAL = 'CASUAL',
  RANKED = 'RANKED',
  FRIENDLY = 'FRIENDLY',
  AI_BATTLE = 'AI_BATTLE',
  TUTORIAL = 'TUTORIAL',
  TOURNAMENT = 'TOURNAMENT',
}

/**
 * Default game configuration
 */
export const DefaultGameConfig: GameConfig = {
  turnTimeLimit: 90,
  maxTurns: 50,
  allowSpectators: false,
  mode: GameMode.CASUAL,
};

/**
 * Create initial game state
 */
export function createInitialGameState(
  gameId: string,
  player1: PlayerState,
  player2: PlayerState,
  config: GameConfig = DefaultGameConfig
): GameState {
  const players = new Map<string, PlayerState>();
  players.set(player1.id, player1);
  players.set(player2.id, player2);

  return {
    id: gameId,
    status: GameStatus.WAITING,
    turn: 0,
    phase: GamePhase.SETUP,
    activePlayerId: player1.id, // Will be randomized
    players,
    cards: new Map(),
    effectQueue: [],
    history: [],
    turnTimer: config.turnTimeLimit,
    turnTimeLimit: config.turnTimeLimit,
    allowReconnect: true,
    randomSeed: config.seed || Date.now(),
    revealedCards: [],
  };
}

/**
 * Get the opponent player ID
 */
export function getOpponentId(state: GameState, playerId: string): string {
  for (const id of state.players.keys()) {
    if (id !== playerId) return id;
  }
  throw new Error(`No opponent found for player ${playerId}`);
}

/**
 * Get player state by ID
 */
export function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.get(playerId);
  if (!player) {
    throw new Error(`Player ${playerId} not found`);
  }
  return player;
}

/**
 * Get card instance by ID
 */
export function getCard(state: GameState, cardInstanceId: string): CardInstance {
  const card = state.cards.get(cardInstanceId);
  if (!card) {
    throw new Error(`Card ${cardInstanceId} not found`);
  }
  return card;
}

/**
 * Check if it's a player's turn
 */
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return state.activePlayerId === playerId && state.phase === GamePhase.MAIN;
}

/**
 * Check if game is over
 */
export function isGameOver(state: GameState): boolean {
  return (
    state.status === GameStatus.FINISHED ||
    state.status === GameStatus.DRAW ||
    state.status === GameStatus.ABANDONED
  );
}

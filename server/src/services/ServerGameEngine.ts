/**
 * STARFORGE TCG - Server-Side Game Engine
 *
 * Authoritative game engine that runs on the server. All game logic
 * (action validation, state mutation, combat resolution, RNG) executes
 * here. Clients send actions, server resolves them and broadcasts
 * authoritative state updates.
 */

import { GameEngine } from '../../../src/engine/GameEngine';
import { GameStateManager, PlayerSetup } from '../../../src/game/GameState';
import { CardDatabase, globalCardDatabase } from '../../../src/cards/CardDatabase';
import { CardFactory, globalCardFactory } from '../../../src/cards/CardFactory';
import { Race } from '../../../src/types/Race';
import { ActionType, GameStatus, GamePhase } from '../../../src/types/Game';
import type { GameState, GameAction, GameConfig } from '../../../src/types/Game';
import type { CardInstance } from '../../../src/types/Card';
import { CardZone } from '../../../src/types/Card';
import type { PlayerState } from '../../../src/types/Player';
import { getHeroByRace } from '../../../src/heroes';
import {
  ALL_SAMPLE_CARDS,
  ALL_EXPANSION_CARDS,
  getSampleCardsByRace,
  getBalancedStarterDeck,
} from '../../../src/data';
import { createSeededRandom } from '../../../src/utils/random';
import type { ActionResult } from '../../../src/engine/GameEngine';

// ─── Types ───────────────────────────────────────────────────────────

/** Serialized game state safe for JSON transmission */
export interface SerializedGameState {
  id: string;
  status: string;
  turn: number;
  phase: string;
  activePlayerId: string;
  players: Record<string, SerializedPlayerState>;
  turnTimer: number;
  turnTimeLimit: number;
  winnerId?: string;
}

/** Per-player serialized state (filtered to hide opponent secrets) */
export interface SerializedPlayerState {
  id: string;
  name: string;
  race: string;
  hero: {
    definitionId: string;
    currentHealth: number;
    maxHealth: number;
    armor: number;
    heroPowerUsedThisTurn: boolean;
    attack: number;
  };
  crystals: {
    current: number;
    maximum: number;
    overloaded: number;
    temporary: number;
  };
  handSize: number;
  deckSize: number;
  board: SerializedCard[];
  graveyardSize: number;
  fatigueDamage: number;
}

export interface SerializedCard {
  instanceId: string;
  definitionId: string;
  currentCost: number;
  currentAttack?: number;
  currentHealth?: number;
  maxHealth?: number;
  keywords: Array<{ keyword: string; value?: number }>;
  hasBarrier: boolean;
  isCloaked: boolean;
  isSilenced: boolean;
  isForged: boolean;
  summonedThisTurn: boolean;
  hasAttackedThisTurn: boolean;
  attacksMadeThisTurn: number;
  controllerId: string;
}

/** Client action as received from WebSocket */
export interface ClientAction {
  type: 'PLAY_CARD' | 'ATTACK' | 'END_TURN' | 'CONCEDE' | 'HERO_POWER' | 'MULLIGAN' | 'ACTIVATE_STARFORGE';
  cardId?: string;
  attackerId?: string;
  targetId?: string;
  defenderId?: string;
  position?: number;
  cardIds?: string[];
}

export interface ServerActionResult {
  success: boolean;
  error?: string;
  gameState: SerializedGameState;
  /** Per-player hand data (only sent to each player) */
  playerHands: Record<string, SerializedCard[]>;
  gameOver: boolean;
  winnerId?: string;
}

// ─── Server Game Instance ────────────────────────────────────────────

interface ServerGame {
  engine: GameEngine;
  player1Id: string;
  player2Id: string;
  player1Race: string;
  player2Race: string;
  createdAt: number;
  seed: number;
}

// ─── Database Initialization ─────────────────────────────────────────

let databaseInitialized = false;

function ensureDatabase(): void {
  if (databaseInitialized) return;

  globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);
  globalCardDatabase.registerCards(ALL_EXPANSION_CARDS);

  const allRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN, Race.BIOTITANS,
    Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS, Race.HIVEMIND, Race.ASTROMANCERS,
    Race.CHRONOBOUND,
  ];
  for (const race of allRaces) {
    globalCardDatabase.registerCards(getBalancedStarterDeck(race));
  }

  databaseInitialized = true;
  console.log(`[ServerGameEngine] Card database initialized with ${globalCardDatabase.size} cards`);
}

// ─── Active Games Map ────────────────────────────────────────────────

const serverGames = new Map<string, ServerGame>();

// ─── Race Mapping ────────────────────────────────────────────────────

const RACE_MAP: Record<string, Race> = {
  pyroclast: Race.PYROCLAST,
  cogsmiths: Race.COGSMITHS,
  luminar: Race.LUMINAR,
  voidborn: Race.VOIDBORN,
  biotitans: Race.BIOTITANS,
  crystalline: Race.CRYSTALLINE,
  'phantom_corsairs': Race.PHANTOM_CORSAIRS,
  hivemind: Race.HIVEMIND,
  astromancers: Race.ASTROMANCERS,
  chronobound: Race.CHRONOBOUND,
  celestari: Race.LUMINAR,
  mechara: Race.COGSMITHS,
  verdani: Race.BIOTITANS,
  nethari: Race.PHANTOM_CORSAIRS,
  draconid: Race.PYROCLAST,
  crystari: Race.CRYSTALLINE,
  aetherian: Race.ASTROMANCERS,
};

function resolveRace(raceStr: string): Race {
  return RACE_MAP[raceStr.toLowerCase()] || Race.COGSMITHS;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Initialize the server game engine. Call once on server startup.
 */
export function initialize(): void {
  ensureDatabase();
}

/**
 * Create a new server-authoritative game instance.
 * Called when matchmaking pairs two players.
 */
export function createServerGame(
  gameId: string,
  player1Id: string,
  player2Id: string,
  race1: string,
  race2: string,
  mode: string
): SerializedGameState {
  ensureDatabase();

  const seed = Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF);
  const rng = createSeededRandom(seed);

  const p1Race = resolveRace(race1);
  const p2Race = resolveRace(race2);

  // Create decks from the card database
  const p1Deck = createDeckForPlayer(p1Race, player1Id);
  const p2Deck = createDeckForPlayer(p2Race, player2Id);

  // Shuffle decks with server-side seed
  shuffleArray(p1Deck.cards, rng);
  shuffleArray(p2Deck.cards, rng);

  const player1Setup: PlayerSetup = {
    id: player1Id,
    name: `Player_${player1Id.slice(0, 6)}`,
    race: p1Race,
    heroId: p1Deck.heroId,
    deck: p1Deck.cards,
  };

  const player2Setup: PlayerSetup = {
    id: player2Id,
    name: `Player_${player2Id.slice(0, 6)}`,
    race: p2Race,
    heroId: p2Deck.heroId,
    deck: p2Deck.cards,
  };

  // Determine who goes first (server-controlled RNG)
  const firstPlayer = rng.next() < 0.5 ? player1Setup : player2Setup;
  const secondPlayer = firstPlayer === player1Setup ? player2Setup : player1Setup;

  // Create game engine
  const config: GameConfig = {
    turnTimeLimit: 75,
    maxTurns: 50,
    allowSpectators: true,
    mode: mode === 'ranked' ? 'RANKED' as any : 'CASUAL' as any,
    seed,
  };

  const engine = new GameEngine(config, globalCardDatabase, globalCardFactory);
  engine.initializeGame(firstPlayer, secondPlayer);
  engine.startGame();

  // Store server-side game instance
  serverGames.set(gameId, {
    engine,
    player1Id,
    player2Id,
    player1Race: race1,
    player2Race: race2,
    createdAt: Date.now(),
    seed,
  });

  const state = engine.getState();
  return serializeGameState(state);
}

/**
 * Process a player action server-side.
 * Validates, resolves, and returns authoritative state.
 */
export function processAction(
  gameId: string,
  playerId: string,
  action: ClientAction
): ServerActionResult {
  const serverGame = serverGames.get(gameId);
  if (!serverGame) {
    return {
      success: false,
      error: 'Game not found',
      gameState: {} as SerializedGameState,
      playerHands: {},
      gameOver: false,
    };
  }

  const { engine } = serverGame;

  // Map client action to engine GameAction
  const gameAction = mapClientAction(playerId, action);
  if (!gameAction) {
    return {
      success: false,
      error: 'Invalid action format',
      gameState: serializeGameState(engine.getState()),
      playerHands: getPlayerHands(engine, serverGame),
      gameOver: false,
    };
  }

  // Process through engine (validates + executes)
  const result: ActionResult = engine.processAction(gameAction);

  const state = engine.getState();
  const gameOver = state.status !== GameStatus.ACTIVE && state.status !== GameStatus.WAITING;
  const winnerId = state.winnerId;

  return {
    success: result.success,
    error: result.error,
    gameState: serializeGameState(state),
    playerHands: getPlayerHands(engine, serverGame),
    gameOver,
    winnerId,
  };
}

/**
 * Get current game state for a game (for reconnection / spectating).
 */
export function getGameState(gameId: string): SerializedGameState | null {
  const serverGame = serverGames.get(gameId);
  if (!serverGame) return null;

  return serializeGameState(serverGame.engine.getState());
}

/**
 * Get the hand cards for a specific player (hidden from opponent).
 */
export function getPlayerHand(gameId: string, playerId: string): SerializedCard[] {
  const serverGame = serverGames.get(gameId);
  if (!serverGame) return [];

  const state = serverGame.engine.getState();
  const board = serverGame.engine.getStateManager().getBoard();
  const handCards = board.getHandCards(playerId);
  return handCards.map(serializeCard);
}

/**
 * Check whose turn it is in a game.
 */
export function getActivePlayer(gameId: string): string | null {
  const serverGame = serverGames.get(gameId);
  if (!serverGame) return null;

  return serverGame.engine.getState().activePlayerId;
}

/**
 * Check if a game exists and is active.
 */
export function isGameActive(gameId: string): boolean {
  const serverGame = serverGames.get(gameId);
  if (!serverGame) return false;

  return serverGame.engine.getState().status === GameStatus.ACTIVE;
}

/**
 * Remove a completed game from memory.
 */
export function removeGame(gameId: string): void {
  serverGames.delete(gameId);
}

/**
 * Get active game count.
 */
export function getActiveGameCount(): number {
  return serverGames.size;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function createDeckForPlayer(
  race: Race,
  playerId: string
): { cards: CardInstance[]; heroId: string } {
  const starterCards = getBalancedStarterDeck(race);

  if (starterCards.length >= 30) {
    const deckCardIds = starterCards.slice(0, 30).map(c => c.id);
    const cards = deckCardIds.map(id =>
      globalCardFactory.createInstance(id, { ownerId: playerId, zone: CardZone.DECK })
    );
    const hero = getHeroByRace(race);
    return { cards, heroId: hero?.id || '' };
  }

  // Fallback: build from race + neutral cards
  const raceCards = getSampleCardsByRace(race);
  const neutralCards = getSampleCardsByRace(Race.NEUTRAL);
  const deckCardIds: string[] = [];

  for (const card of raceCards.slice(0, 15)) {
    if (card.collectible) {
      deckCardIds.push(card.id, card.id);
    }
  }
  for (const card of neutralCards) {
    if (card.collectible && deckCardIds.length < 30) {
      deckCardIds.push(card.id);
      if (deckCardIds.length < 30) deckCardIds.push(card.id);
    }
  }

  const finalIds = deckCardIds.slice(0, 30);
  const cards = finalIds.map(id =>
    globalCardFactory.createInstance(id, { ownerId: playerId, zone: CardZone.DECK })
  );
  const hero = getHeroByRace(race);
  return { cards, heroId: hero?.id || '' };
}

function shuffleArray<T>(arr: T[], rng: { next(): number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function mapClientAction(playerId: string, action: ClientAction): GameAction | null {
  const timestamp = Date.now();

  switch (action.type) {
    case 'PLAY_CARD':
      if (!action.cardId) return null;
      return {
        type: ActionType.PLAY_CARD,
        playerId,
        timestamp,
        data: {
          cardInstanceId: action.cardId,
          position: action.position,
          targetId: action.targetId,
        },
      };

    case 'ATTACK':
      if (!action.attackerId || !action.defenderId) return null;
      return {
        type: ActionType.ATTACK,
        playerId,
        timestamp,
        data: {
          attackerId: action.attackerId,
          defenderId: action.defenderId,
        },
      };

    case 'HERO_POWER':
      return {
        type: ActionType.HERO_POWER,
        playerId,
        timestamp,
        data: {
          targetId: action.targetId,
        },
      };

    case 'END_TURN':
      return {
        type: ActionType.END_TURN,
        playerId,
        timestamp,
        data: {},
      };

    case 'MULLIGAN':
      return {
        type: ActionType.MULLIGAN,
        playerId,
        timestamp,
        data: {
          cardIds: action.cardIds || [],
        },
      };

    case 'CONCEDE':
      return {
        type: ActionType.CONCEDE,
        playerId,
        timestamp,
        data: {},
      };

    case 'ACTIVATE_STARFORGE':
      if (!action.cardId) return null;
      return {
        type: ActionType.ACTIVATE_STARFORGE,
        playerId,
        timestamp,
        data: {
          cardInstanceId: action.cardId,
        },
      };

    default:
      return null;
  }
}

function getPlayerHands(
  engine: GameEngine,
  serverGame: ServerGame
): Record<string, SerializedCard[]> {
  const board = engine.getStateManager().getBoard();
  const result: Record<string, SerializedCard[]> = {};

  result[serverGame.player1Id] = board.getHandCards(serverGame.player1Id).map(serializeCard);
  result[serverGame.player2Id] = board.getHandCards(serverGame.player2Id).map(serializeCard);

  return result;
}

// ─── Serialization ───────────────────────────────────────────────────

function serializeGameState(state: GameState): SerializedGameState {
  const players: Record<string, SerializedPlayerState> = {};

  for (const [id, player] of state.players) {
    players[id] = serializePlayer(player, state);
  }

  return {
    id: state.id,
    status: state.status,
    turn: state.turn,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    players,
    turnTimer: state.turnTimer,
    turnTimeLimit: state.turnTimeLimit,
    winnerId: state.winnerId,
  };
}

function serializePlayer(player: PlayerState, state: GameState): SerializedPlayerState {
  const boardCards: SerializedCard[] = [];
  for (const slotId of player.board) {
    if (slotId) {
      const card = state.cards.get(slotId);
      if (card) boardCards.push(serializeCard(card));
    }
  }

  return {
    id: player.id,
    name: player.name,
    race: player.race as string,
    hero: {
      definitionId: player.hero.definitionId,
      currentHealth: player.hero.currentHealth,
      maxHealth: player.hero.maxHealth,
      armor: player.hero.armor,
      heroPowerUsedThisTurn: player.hero.heroPowerUsedThisTurn,
      attack: player.hero.attack,
    },
    crystals: {
      current: player.crystals.current,
      maximum: player.crystals.maximum,
      overloaded: player.crystals.overloaded,
      temporary: player.crystals.temporary,
    },
    handSize: player.hand.length,
    deckSize: player.deck.length,
    board: boardCards,
    graveyardSize: player.graveyard.length,
    fatigueDamage: player.fatigueDamage,
  };
}

function serializeCard(card: CardInstance): SerializedCard {
  return {
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    currentCost: card.currentCost,
    currentAttack: card.currentAttack,
    currentHealth: card.currentHealth,
    maxHealth: card.maxHealth,
    keywords: card.keywords.map(k => ({ keyword: k.keyword, value: k.value })),
    hasBarrier: card.hasBarrier,
    isCloaked: card.isCloaked,
    isSilenced: card.isSilenced,
    isForged: card.isForged,
    summonedThisTurn: card.summonedThisTurn,
    hasAttackedThisTurn: card.hasAttackedThisTurn,
    attacksMadeThisTurn: card.attacksMadeThisTurn,
    controllerId: card.controllerId,
  };
}

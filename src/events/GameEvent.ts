/**
 * STARFORGE TCG - Game Events
 *
 * Event types for all game state changes.
 * These events enable UI updates, replay systems, and effect triggers.
 */

import { CardZone } from '../types/Card';
import { ChoiceType } from '../types/Game';
import type { Keyword } from '../types/Keywords';

/**
 * All possible event types
 */
export enum GameEventType {
  // Game Flow Events
  GAME_STARTED = 'GAME_STARTED',
  GAME_ENDED = 'GAME_ENDED',
  TURN_STARTED = 'TURN_STARTED',
  TURN_ENDED = 'TURN_ENDED',
  PHASE_CHANGED = 'PHASE_CHANGED',

  // Card Events
  CARD_DRAWN = 'CARD_DRAWN',
  CARD_PLAYED = 'CARD_PLAYED',
  CARD_SUMMONED = 'CARD_SUMMONED',
  CARD_DESTROYED = 'CARD_DESTROYED',
  CARD_DISCARDED = 'CARD_DISCARDED',
  CARD_BANISHED = 'CARD_BANISHED',
  CARD_RETURNED_TO_HAND = 'CARD_RETURNED_TO_HAND',
  CARD_SHUFFLED_INTO_DECK = 'CARD_SHUFFLED_INTO_DECK',
  CARD_TRANSFORMED = 'CARD_TRANSFORMED',
  CARD_COPIED = 'CARD_COPIED',
  CARD_STOLEN = 'CARD_STOLEN',

  // Combat Events
  ATTACK_DECLARED = 'ATTACK_DECLARED',
  ATTACK_RESOLVED = 'ATTACK_RESOLVED',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  HEALING_DONE = 'HEALING_DONE',

  // Stat Events
  STATS_CHANGED = 'STATS_CHANGED',
  KEYWORD_GAINED = 'KEYWORD_GAINED',
  KEYWORD_LOST = 'KEYWORD_LOST',
  CARD_SILENCED = 'CARD_SILENCED',
  BARRIER_BROKEN = 'BARRIER_BROKEN',
  CLOAK_BROKEN = 'CLOAK_BROKEN',

  // Resource Events
  CRYSTALS_CHANGED = 'CRYSTALS_CHANGED',
  HERO_POWER_USED = 'HERO_POWER_USED',

  // Effect Events
  EFFECT_TRIGGERED = 'EFFECT_TRIGGERED',
  EFFECT_RESOLVED = 'EFFECT_RESOLVED',

  // Player Events
  HERO_DAMAGED = 'HERO_DAMAGED',
  HERO_HEALED = 'HERO_HEALED',
  ARMOR_GAINED = 'ARMOR_GAINED',
  PLAYER_CONCEDED = 'PLAYER_CONCEDED',
  FATIGUE_DAMAGE = 'FATIGUE_DAMAGE',

  // Choice Events
  CHOICE_PRESENTED = 'CHOICE_PRESENTED',
  CHOICE_MADE = 'CHOICE_MADE',

  // STARFORGE Events
  STARFORGE_PROGRESS = 'STARFORGE_PROGRESS',
  STARFORGE_READY = 'STARFORGE_READY',
  STARFORGE_ACTIVATED = 'STARFORGE_ACTIVATED',
  STARFORGE_TRANSFORMED = 'STARFORGE_TRANSFORMED',

  // Zone Events
  CARD_ZONE_CHANGED = 'CARD_ZONE_CHANGED',

  // Special Events
  SECRET_TRIGGERED = 'SECRET_TRIGGERED',
  ADAPT_CHOSEN = 'ADAPT_CHOSEN',
  DISCOVER_COMPLETED = 'DISCOVER_COMPLETED',
  ECHO_COPY_CREATED = 'ECHO_COPY_CREATED',
  SCRY_COMPLETED = 'SCRY_COMPLETED',

  // Death Trigger Events
  LAST_WORDS_TRIGGERED = 'LAST_WORDS_TRIGGERED',
}

/**
 * Base game event interface
 */
export interface GameEvent {
  /** Event type */
  type: GameEventType;
  /** Game ID */
  gameId: string;
  /** Turn number when event occurred */
  turn: number;
  /** Timestamp */
  timestamp: number;
  /** Player who triggered this event (if applicable) */
  playerId?: string;
  /** Event-specific data */
  data: EventData;
}

/**
 * Union type for event-specific data
 */
export type EventData =
  | GameStartedData
  | GameEndedData
  | TurnEventData
  | CardEventData
  | CombatEventData
  | DamageEventData
  | HealEventData
  | StatsChangedData
  | KeywordEventData
  | CrystalsChangedData
  | EffectEventData
  | ChoiceEventData
  | StarforgeEventData
  | ZoneChangedData
  | LastWordsEventData
  | GenericEventData;

// Event Data Types

export interface GameStartedData {
  player1Id: string;
  player2Id: string;
  firstPlayerId: string;
}

export interface GameEndedData {
  winnerId?: string;
  reason: 'victory' | 'concede' | 'disconnect' | 'draw' | 'timeout';
}

export interface TurnEventData {
  playerId: string;
  turnNumber: number;
}

export interface CardEventData {
  cardInstanceId: string;
  cardDefinitionId: string;
  playerId: string;
  targetId?: string;
  position?: number;
  fromZone?: CardZone;
  toZone?: CardZone;
}

export interface CombatEventData {
  attackerId: string;
  attackerOwnerId: string;
  defenderId: string;
  defenderOwnerId: string;
  attackerDamage?: number;
  defenderDamage?: number;
}

export interface DamageEventData {
  targetId: string;
  targetType: 'minion' | 'hero';
  amount: number;
  sourceId?: string;
  sourceType?: 'minion' | 'spell' | 'hero_power' | 'effect';
  isPiercing?: boolean;
  isFatigue?: boolean;
}

export interface HealEventData {
  targetId: string;
  targetType: 'minion' | 'hero';
  amount: number;
  actualHealing: number; // May be less if already at max
  sourceId?: string;
}

export interface StatsChangedData {
  cardInstanceId: string;
  attackChange: number;
  healthChange: number;
  newAttack: number;
  newHealth: number;
  source: string;
  isTemporary: boolean;
}

export interface KeywordEventData {
  cardInstanceId: string;
  keyword: Keyword;
  source?: string;
}

export interface CrystalsChangedData {
  playerId: string;
  previousCurrent: number;
  previousMax: number;
  newCurrent: number;
  newMax: number;
  reason: 'turn_start' | 'spend' | 'gain' | 'destroy' | 'refresh';
}

export interface EffectEventData {
  effectId: string;
  effectType: string;
  sourceId: string;
  targetIds: string[];
}

export interface ChoiceEventData {
  playerId: string;
  choiceType: ChoiceType;
  options?: string[];
  selectedOption?: number | number[];
  sourceId: string;
}

export interface StarforgeEventData {
  cardInstanceId: string;
  previousProgress?: number;
  newProgress?: number;
  targetProgress?: number;
  transformedInto?: string;
}

export interface ZoneChangedData {
  cardInstanceId: string;
  playerId: string;
  fromZone: CardZone;
  toZone: CardZone;
}

export interface LastWordsEventData {
  cardInstanceId: string;
  cardDefinitionId: string;
  playerId: string;
  effectDescription: string;
}

export interface GenericEventData {
  message?: string;
  value?: number | string;
  [key: string]: unknown; // Index signature for flexibility
}

/**
 * Create a game event
 */
export function createEvent(
  type: GameEventType,
  gameId: string,
  turn: number,
  playerId: string | undefined,
  data: EventData | Record<string, unknown>
): GameEvent {
  return {
    type,
    gameId,
    turn,
    timestamp: Date.now(),
    playerId,
    data: data as EventData,
  };
}

/**
 * Create a card drawn event
 */
export function createCardDrawnEvent(
  gameId: string,
  turn: number,
  playerId: string,
  cardInstanceId: string,
  cardDefinitionId: string
): GameEvent {
  return createEvent(GameEventType.CARD_DRAWN, gameId, turn, playerId, {
    cardInstanceId,
    cardDefinitionId,
    playerId,
    fromZone: CardZone.DECK,
    toZone: CardZone.HAND,
  } as CardEventData);
}

/**
 * Create a card played event
 */
export function createCardPlayedEvent(
  gameId: string,
  turn: number,
  playerId: string,
  cardInstanceId: string,
  cardDefinitionId: string,
  position?: number,
  targetId?: string
): GameEvent {
  return createEvent(GameEventType.CARD_PLAYED, gameId, turn, playerId, {
    cardInstanceId,
    cardDefinitionId,
    playerId,
    position,
    targetId,
    fromZone: CardZone.HAND,
  } as CardEventData);
}

/**
 * Create a damage event
 */
export function createDamageEvent(
  gameId: string,
  turn: number,
  targetId: string,
  targetType: 'minion' | 'hero',
  amount: number,
  sourceId?: string,
  sourceType?: 'minion' | 'spell' | 'hero_power' | 'effect'
): GameEvent {
  return createEvent(GameEventType.DAMAGE_DEALT, gameId, turn, undefined, {
    targetId,
    targetType,
    amount,
    sourceId,
    sourceType,
  } as DamageEventData);
}

/**
 * Create a healing event
 */
export function createHealEvent(
  gameId: string,
  turn: number,
  targetId: string,
  targetType: 'minion' | 'hero',
  amount: number,
  actualHealing: number,
  sourceId?: string
): GameEvent {
  return createEvent(GameEventType.HEALING_DONE, gameId, turn, undefined, {
    targetId,
    targetType,
    amount,
    actualHealing,
    sourceId,
  } as HealEventData);
}

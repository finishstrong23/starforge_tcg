/**
 * STARFORGE TCG - Effect Types
 *
 * Defines all effect types and their data structures.
 * Effects are the building blocks of card abilities.
 */

import { AdaptOption } from './Keywords';
import type { Keyword, KeywordInstance } from './Keywords';
import { MinionTribe } from './Card';

/**
 * When an effect triggers
 */
export enum EffectTrigger {
  /** When the card is played from hand */
  ON_PLAY = 'ON_PLAY',
  /** When the card enters the battlefield (includes summon) */
  ON_ENTER = 'ON_ENTER',
  /** When the card is destroyed */
  ON_DEATH = 'ON_DEATH',
  /** When the card attacks */
  ON_ATTACK = 'ON_ATTACK',
  /** When the card takes damage */
  ON_DAMAGE_TAKEN = 'ON_DAMAGE_TAKEN',
  /** When the card deals damage */
  ON_DAMAGE_DEALT = 'ON_DAMAGE_DEALT',
  /** At the start of your turn */
  ON_TURN_START = 'ON_TURN_START',
  /** At the end of your turn */
  ON_TURN_END = 'ON_TURN_END',
  /** When a spell is cast (RESONATE) */
  ON_SPELL_CAST = 'ON_SPELL_CAST',
  /** When healing occurs (ILLUMINATE) */
  ON_HEAL = 'ON_HEAL',
  /** When a friendly minion dies */
  ON_FRIENDLY_DEATH = 'ON_FRIENDLY_DEATH',
  /** When an enemy minion dies */
  ON_ENEMY_DEATH = 'ON_ENEMY_DEATH',
  /** When a card is drawn */
  ON_DRAW = 'ON_DRAW',
  /** When a minion is summoned */
  ON_SUMMON = 'ON_SUMMON',
  /** Continuous aura effect */
  AURA = 'AURA',
  /** Passive always-on effect */
  PASSIVE = 'PASSIVE',
  /** Manual activation (UPGRADE, STARFORGE) */
  ACTIVATED = 'ACTIVATED',
}

/**
 * Types of effects that can occur
 */
export enum EffectType {
  // Damage & Healing
  DAMAGE = 'DAMAGE',
  HEAL = 'HEAL',

  // Stat Modification
  BUFF = 'BUFF',
  DEBUFF = 'DEBUFF',
  SET_STATS = 'SET_STATS',

  // Card Movement
  DRAW = 'DRAW',
  DISCARD = 'DISCARD',
  SUMMON = 'SUMMON',
  DESTROY = 'DESTROY',
  RETURN_TO_HAND = 'RETURN_TO_HAND',
  SHUFFLE_INTO_DECK = 'SHUFFLE_INTO_DECK',
  BANISH = 'BANISH',
  COPY = 'COPY',
  STEAL = 'STEAL',

  // Keyword Manipulation
  GRANT_KEYWORD = 'GRANT_KEYWORD',
  REMOVE_KEYWORD = 'REMOVE_KEYWORD',
  SILENCE = 'SILENCE',

  // Resource Manipulation
  GAIN_CRYSTALS = 'GAIN_CRYSTALS',
  DESTROY_CRYSTALS = 'DESTROY_CRYSTALS',
  REFRESH_CRYSTALS = 'REFRESH_CRYSTALS',
  MODIFY_COST = 'MODIFY_COST',

  // Card Generation
  ADD_TO_HAND = 'ADD_TO_HAND',
  DISCOVER = 'DISCOVER',
  CREATE_TOKEN = 'CREATE_TOKEN',

  // Special
  TRANSFORM = 'TRANSFORM',
  ADAPT = 'ADAPT',
  SCRY = 'SCRY',
  STARFORGE = 'STARFORGE',
  RANDOM_TARGET = 'RANDOM_TARGET',
  CONDITIONAL = 'CONDITIONAL',
  REPEAT = 'REPEAT',
  CHOOSE_ONE = 'CHOOSE_ONE',
}

/**
 * Who or what can be targeted
 */
export enum TargetType {
  SELF = 'SELF',
  HERO = 'HERO',
  FRIENDLY_HERO = 'FRIENDLY_HERO',
  ENEMY_HERO = 'ENEMY_HERO',
  MINION = 'MINION',
  FRIENDLY_MINION = 'FRIENDLY_MINION',
  ENEMY_MINION = 'ENEMY_MINION',
  ALL_MINIONS = 'ALL_MINIONS',
  ALL_FRIENDLY_MINIONS = 'ALL_FRIENDLY_MINIONS',
  ALL_ENEMY_MINIONS = 'ALL_ENEMY_MINIONS',
  ALL_CHARACTERS = 'ALL_CHARACTERS',
  ALL_OTHER_CHARACTERS = 'ALL_OTHER_CHARACTERS', // All except self
  ALL_ENEMIES = 'ALL_ENEMIES', // Enemy hero + all enemy minions
  ALL_FRIENDLIES = 'ALL_FRIENDLIES', // Friendly hero + all friendly minions
  RANDOM_ENEMY = 'RANDOM_ENEMY',
  RANDOM_ENEMY_MINION = 'RANDOM_ENEMY_MINION',
  RANDOM_FRIENDLY = 'RANDOM_FRIENDLY', // Random friendly character
  RANDOM_FRIENDLY_MINION = 'RANDOM_FRIENDLY_MINION',
  CHOSEN = 'CHOSEN', // Player chooses target
  ADJACENT = 'ADJACENT', // Minions adjacent to this one
  ALL = 'ALL',
  NONE = 'NONE',
}

/**
 * Base effect interface
 */
export interface Effect {
  /** Unique effect ID */
  id: string;
  /** Type of effect */
  type: EffectType;
  /** When this effect triggers */
  trigger: EffectTrigger;
  /** Who/what this affects */
  targetType: TargetType;
  /** Optional filter for targets */
  targetFilter?: TargetFilter;
  /** Effect-specific data */
  data: EffectData;
  /** Condition that must be met */
  condition?: EffectCondition;
  /** Priority for effect ordering */
  priority?: number;
  /** Whether effect is mandatory or optional */
  isMandatory: boolean;
  /** Source of the effect (card that created it) */
  sourceId?: string;
}

/**
 * Filter for selecting valid targets
 */
export interface TargetFilter {
  /** Required tribe */
  tribe?: MinionTribe;
  /** Required keyword */
  keyword?: Keyword;
  /** Minimum attack */
  minAttack?: number;
  /** Maximum attack */
  maxAttack?: number;
  /** Minimum health */
  minHealth?: number;
  /** Maximum health */
  maxHealth?: number;
  /** Minimum cost */
  minCost?: number;
  /** Maximum cost */
  maxCost?: number;
  /** Must be damaged */
  isDamaged?: boolean;
  /** Must have specific race */
  race?: string;
}

/**
 * Condition for effect activation
 */
export interface EffectCondition {
  type: ConditionType;
  value: number | string | boolean;
  comparator?: Comparator;
}

export enum ConditionType {
  /** Check player health */
  PLAYER_HEALTH = 'PLAYER_HEALTH',
  /** Check enemy health */
  ENEMY_HEALTH = 'ENEMY_HEALTH',
  /** Check hand size */
  HAND_SIZE = 'HAND_SIZE',
  /** Check board count */
  BOARD_COUNT = 'BOARD_COUNT',
  /** Check crystal count */
  CRYSTAL_COUNT = 'CRYSTAL_COUNT',
  /** Check if minion has keyword */
  HAS_KEYWORD = 'HAS_KEYWORD',
  /** Check if it's your turn */
  IS_YOUR_TURN = 'IS_YOUR_TURN',
  /** Check minion count of tribe */
  TRIBE_COUNT = 'TRIBE_COUNT',
  /** Check cards in deck */
  DECK_SIZE = 'DECK_SIZE',
  /** Check if combo (another card played this turn) */
  COMBO = 'COMBO',
  /** Check total healing done this game */
  HEALING_DONE = 'HEALING_DONE',
  /** Check total damage done this game */
  DAMAGE_DONE = 'DAMAGE_DONE',
}

export enum Comparator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
}

/**
 * Union type for effect-specific data
 */
export type EffectData =
  | DamageEffectData
  | HealEffectData
  | BuffEffectData
  | DrawEffectData
  | SummonEffectData
  | GrantKeywordData
  | GainCrystalsData
  | DiscoverData
  | TransformData
  | AdaptData
  | ScryData
  | ModifyCostData
  | GenericEffectData;

export interface DamageEffectData {
  amount: number | 'ATTACK' | 'HEALTH';
  isPiercing?: boolean; // Ignores BARRIER
}

export interface HealEffectData {
  amount: number | 'MISSING_HEALTH' | 'MAX_HEALTH';
}

export interface BuffEffectData {
  attack: number;
  health: number;
  isTemporary?: boolean; // End of turn
}

export interface DrawEffectData {
  count: number;
  filter?: TargetFilter;
}

export interface SummonEffectData {
  cardId: string; // Card definition ID to summon
  count: number;
  copySource?: boolean; // Copy the triggering card
}

export interface GrantKeywordData {
  keywords: KeywordInstance[];
  isTemporary?: boolean;
}

export interface GainCrystalsData {
  amount: number;
  isTemporary?: boolean; // This turn only
  isEmpty?: boolean; // Gain empty or full crystals
}

export interface DiscoverData {
  count: number; // Number of options to show
  filter?: TargetFilter;
  pool?: 'CLASS' | 'NEUTRAL' | 'ALL';
}

export interface TransformData {
  targetCardId: string; // What to transform into
}

export interface AdaptData {
  optionCount: number; // Usually 3
  fixedOptions?: AdaptOption[]; // If specified, use these instead of random
}

export interface ScryData {
  count: number; // Number of cards to look at
}

export interface ModifyCostData {
  amount: number; // Positive = increase, negative = decrease
  targetType: 'HAND' | 'DECK' | 'SPECIFIC';
  cardId?: string; // For specific card modifications
}

export interface GenericEffectData {
  value?: number;
  stringValue?: string;
}

/**
 * Effect that's been resolved and is ready to execute
 */
export interface ResolvedEffect {
  effect: Effect;
  sourceId: string;
  sourceOwnerId: string;
  targets: string[]; // Instance IDs of targets
  resolvedValue?: number; // Calculated damage/heal amount
}

/**
 * Create a simple damage effect
 */
export function createDamageEffect(
  amount: number,
  targetType: TargetType,
  trigger: EffectTrigger = EffectTrigger.ON_PLAY
): Effect {
  return {
    id: `damage-${Date.now()}`,
    type: EffectType.DAMAGE,
    trigger,
    targetType,
    data: { amount } as DamageEffectData,
    isMandatory: true,
  };
}

/**
 * Create a simple heal effect
 */
export function createHealEffect(
  amount: number,
  targetType: TargetType,
  trigger: EffectTrigger = EffectTrigger.ON_PLAY
): Effect {
  return {
    id: `heal-${Date.now()}`,
    type: EffectType.HEAL,
    trigger,
    targetType,
    data: { amount } as HealEffectData,
    isMandatory: true,
  };
}

/**
 * Create a draw cards effect
 */
export function createDrawEffect(
  count: number,
  trigger: EffectTrigger = EffectTrigger.ON_PLAY
): Effect {
  return {
    id: `draw-${Date.now()}`,
    type: EffectType.DRAW,
    trigger,
    targetType: TargetType.NONE,
    data: { count } as DrawEffectData,
    isMandatory: true,
  };
}

/**
 * Create a buff effect
 */
export function createBuffEffect(
  attack: number,
  health: number,
  targetType: TargetType,
  trigger: EffectTrigger = EffectTrigger.ON_PLAY,
  isTemporary = false
): Effect {
  return {
    id: `buff-${Date.now()}`,
    type: EffectType.BUFF,
    trigger,
    targetType,
    data: { attack, health, isTemporary } as BuffEffectData,
    isMandatory: true,
  };
}

/**
 * Create a summon effect
 */
export function createSummonEffect(
  cardId: string,
  count: number,
  trigger: EffectTrigger = EffectTrigger.ON_PLAY
): Effect {
  return {
    id: `summon-${Date.now()}`,
    type: EffectType.SUMMON,
    trigger,
    targetType: TargetType.NONE,
    data: { cardId, count } as SummonEffectData,
    isMandatory: true,
  };
}

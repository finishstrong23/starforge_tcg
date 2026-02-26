/**
 * STARFORGE TCG - Card Types
 *
 * Defines all card-related type definitions including card types,
 * rarities, stats, and the complete card definition interface.
 */

import type { KeywordInstance, Keyword } from './Keywords';
import { Race } from './Race';
import type { Effect } from './Effects';
import type { StarforgeDefinition } from './Starforge';

/**
 * Card types in the game
 */
export enum CardType {
  MINION = 'MINION',
  SPELL = 'SPELL',
  STRUCTURE = 'STRUCTURE', // Ongoing effects
}

/**
 * Card rarities with their distribution
 * - Common: 60% of collection
 * - Rare: 30% of collection
 * - Epic: 8% of collection
 * - Legendary: 2% of collection
 */
export enum CardRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/**
 * Minion tribes/types for synergy
 */
export enum MinionTribe {
  MECH = 'MECH',
  BEAST = 'BEAST',
  ELEMENTAL = 'ELEMENTAL',
  DRAGON = 'DRAGON',
  PIRATE = 'PIRATE',
  DEMON = 'DEMON',
  INSECT = 'INSECT',
  CONSTRUCT = 'CONSTRUCT',
  VOID = 'VOID',
  NONE = 'NONE',
}

/**
 * Base statistics for a minion card
 */
export interface MinionStats {
  attack: number;
  health: number;
  maxHealth: number;
}

/**
 * Complete card definition as stored in the database
 * This is the "template" for a card
 */
export interface CardDefinition {
  /** Unique identifier for the card */
  id: string;

  /** Display name */
  name: string;

  /** Crystal cost to play */
  cost: number;

  /** Type of card (minion, spell, structure) */
  type: CardType;

  /** Race restriction (undefined = Neutral) */
  race?: Race;

  /** Card rarity */
  rarity: CardRarity;

  /** Minion-only: Attack value */
  attack?: number;

  /** Minion-only: Health value */
  health?: number;

  /** Minion-only: Tribe for synergies */
  tribe?: MinionTribe;

  /** Keywords the card has */
  keywords: KeywordInstance[];

  /** Effects the card triggers */
  effects: Effect[];

  /** STARFORGE transformation data (Epic/Legendary only) */
  starforge?: StarforgeDefinition;

  /** Flavor text for lore */
  flavorText?: string;

  /** Card text displayed on the card */
  cardText: string;

  /** Whether this card is collectible (vs. token) */
  collectible: boolean;

  /** Set/expansion this card belongs to */
  set: string;
}

/**
 * Runtime card instance with current modified stats
 * This represents a card in play or in hand
 */
export interface CardInstance {
  /** Unique instance ID (different from card definition ID) */
  instanceId: string;

  /** Reference to the base card definition */
  definitionId: string;

  /** Current owner player ID */
  ownerId: string;

  /** Current controller player ID (may differ from owner due to steal effects) */
  controllerId: string;

  /** Current crystal cost (may be modified) */
  currentCost: number;

  /** Current attack (minions only) */
  currentAttack?: number;

  /** Current health (minions only) */
  currentHealth?: number;

  /** Maximum health (minions only) */
  maxHealth?: number;

  /** Current keywords (may be added/removed) */
  keywords: KeywordInstance[];

  /** Whether the minion has attacked this turn */
  hasAttackedThisTurn: boolean;

  /** Number of attacks made this turn (for DOUBLE_STRIKE) */
  attacksMadeThisTurn: number;

  /** Whether the minion was just played (summoning sickness) */
  summonedThisTurn: boolean;

  /** Whether BARRIER is currently active */
  hasBarrier: boolean;

  /** Whether CLOAK is currently active */
  isCloaked: boolean;

  /** Whether the card is silenced (keywords/effects removed) */
  isSilenced: boolean;

  /** Whether this is an ECHO copy that vanishes at end of turn */
  isEchoInstance: boolean;

  /** STARFORGE progress tracking */
  starforgeProgress?: number;

  /** Whether STARFORGE has been triggered */
  isForged: boolean;

  /** Temporary stat buffs (cleared at end of turn) */
  temporaryBuffs: StatBuff[];

  /** Permanent stat buffs */
  permanentBuffs: StatBuff[];

  /** Enchantments/auras affecting this card */
  enchantments: Enchantment[];

  /** Turn number when this was played */
  turnPlayed?: number;

  /** Zone the card is currently in */
  zone: CardZone;
}

/**
 * Zones where cards can exist
 */
export enum CardZone {
  DECK = 'DECK',
  HAND = 'HAND',
  BOARD = 'BOARD',
  GRAVEYARD = 'GRAVEYARD',
  BANISHED = 'BANISHED', // Removed from game
  LIMBO = 'LIMBO', // Temporary zone during effects
}

/**
 * Stat modification buff
 */
export interface StatBuff {
  id: string;
  attackModifier: number;
  healthModifier: number;
  source: string; // Card or effect that created this buff
  isTemporary: boolean;
}

/**
 * Enchantment effect on a card
 */
export interface Enchantment {
  id: string;
  name: string;
  effect: Effect;
  source: string;
}

/**
 * Simplified card reference for efficient lookups
 */
export interface CardReference {
  instanceId: string;
  definitionId: string;
  ownerId: string;
  zone: CardZone;
}

/**
 * Card targeting requirements
 */
export interface TargetRequirements {
  /** Can target minions */
  canTargetMinions: boolean;
  /** Can target heroes */
  canTargetHeroes: boolean;
  /** Can target friendly targets */
  canTargetFriendly: boolean;
  /** Can target enemy targets */
  canTargetEnemy: boolean;
  /** Required tribe (if any) */
  requiredTribe?: MinionTribe;
  /** Required keyword (if any) */
  requiredKeyword?: Keyword;
  /** Minimum attack requirement */
  minAttack?: number;
  /** Maximum attack requirement */
  maxAttack?: number;
  /** Minimum health requirement */
  minHealth?: number;
  /** Maximum health requirement */
  maxHealth?: number;
}

/**
 * Default targeting (can target anything enemy)
 */
export const DefaultTargeting: TargetRequirements = {
  canTargetMinions: true,
  canTargetHeroes: true,
  canTargetFriendly: false,
  canTargetEnemy: true,
};

/**
 * Calculate effective attack of a card instance
 */
export function getEffectiveAttack(card: CardInstance): number {
  if (card.currentAttack === undefined) return 0;

  let attack = card.currentAttack;

  // Apply buffs
  for (const buff of [...card.temporaryBuffs, ...card.permanentBuffs]) {
    attack += buff.attackModifier;
  }

  return Math.max(0, attack);
}

/**
 * Calculate effective health of a card instance
 */
export function getEffectiveHealth(card: CardInstance): number {
  if (card.currentHealth === undefined) return 0;
  return Math.max(0, card.currentHealth);
}

/**
 * Check if a card instance has a specific keyword.
 * STARFORGED minions are immune to Silence — their keywords persist.
 */
export function hasKeyword(card: CardInstance, keyword: Keyword): boolean {
  if (card.isSilenced && !card.isForged) return false;
  return card.keywords.some((k) => k.keyword === keyword);
}

/**
 * Check if a minion can attack this turn
 */
export function canAttack(card: CardInstance): boolean {
  // Must be a minion with attack
  if (card.currentAttack === undefined || card.currentAttack <= 0) {
    return false;
  }

  // Check summoning sickness
  if (card.summonedThisTurn) {
    // BLITZ can attack anything immediately
    if (hasKeyword(card, 'BLITZ' as Keyword)) return true;
    // SWIFT can attack minions (checked elsewhere)
    if (hasKeyword(card, 'SWIFT' as Keyword)) return true;
    return false;
  }

  // Check attack limit
  const maxAttacks = hasKeyword(card, 'DOUBLE_STRIKE' as Keyword) ? 2 : 1;
  if (card.attacksMadeThisTurn >= maxAttacks) {
    return false;
  }

  return true;
}

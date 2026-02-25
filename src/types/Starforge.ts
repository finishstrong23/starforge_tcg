/**
 * STARFORGE TCG - Starforge System Types
 *
 * The flagship transformation mechanic where Epic/Legendary cards
 * upgrade into more powerful versions when conditions are met.
 */

import { Effect } from './Effects';
import type { KeywordInstance } from './Keywords';

/**
 * Types of STARFORGE triggers
 */
export enum StarforgeType {
  /** Pay X Crystals anytime to transform */
  ACTIVE = 'ACTIVE',
  /** Automatic when condition met */
  CONDITIONAL = 'CONDITIONAL',
  /** Accumulates over time/actions */
  PROGRESSIVE = 'PROGRESSIVE',
}

/**
 * Conditions that can trigger STARFORGE transformation
 */
export enum StarforgeConditionType {
  /** Pay crystal cost */
  PAY_COST = 'PAY_COST',
  /** After dying X times (recursion) */
  DEATH_COUNT = 'DEATH_COUNT',
  /** After summoning X minions */
  SUMMON_COUNT = 'SUMMON_COUNT',
  /** Alias for SUMMON_COUNT */
  MINIONS_SUMMONED = 'MINIONS_SUMMONED',
  /** After healing X total health */
  HEALING_DONE = 'HEALING_DONE',
  /** After dealing X total damage */
  DAMAGE_DONE = 'DAMAGE_DONE',
  /** After casting X spells */
  SPELLS_CAST = 'SPELLS_CAST',
  /** After drawing X cards */
  CARDS_DRAWN = 'CARDS_DRAWN',
  /** After BANISHing X cards */
  BANISH_COUNT = 'BANISH_COUNT',
  /** After attacking X times */
  ATTACK_COUNT = 'ATTACK_COUNT',
  /** After X turns in play */
  TURNS_IN_PLAY = 'TURNS_IN_PLAY',
  /** After X minions die */
  MINIONS_DIED = 'MINIONS_DIED',
  /** After gaining X crystals */
  CRYSTALS_GAINED = 'CRYSTALS_GAINED',
  /** After X friendly minions with SWARM */
  SWARM_COUNT = 'SWARM_COUNT',
  /** After using Hero Power X times */
  HERO_POWER_COUNT = 'HERO_POWER_COUNT',
  /** After opponent discards X cards */
  OPPONENT_DISCARDS = 'OPPONENT_DISCARDS',
  /** After playing X cards from another class */
  CARDS_STOLEN = 'CARDS_STOLEN',
  /** After UPGRADING X times */
  UPGRADE_COUNT = 'UPGRADE_COUNT',
  /** After ILLUMINATEing X times */
  ILLUMINATE_COUNT = 'ILLUMINATE_COUNT',
  /** After ADAPTing X times */
  ADAPT_COUNT = 'ADAPT_COUNT',
  /** After SCRYing X total cards */
  SCRY_COUNT = 'SCRY_COUNT',
  /** After playing X ECHO cards */
  ECHO_CARDS_PLAYED = 'ECHO_CARDS_PLAYED',
  /** After dealing X IMMOLATE damage */
  IMMOLATE_DAMAGE = 'IMMOLATE_DAMAGE',
}

/**
 * STARFORGE transformation condition
 */
export interface StarforgeCondition {
  type: StarforgeConditionType;
  /** Target value to reach */
  targetValue: number;
  /** Current progress (for tracking) */
  currentValue?: number;
  /** Whether progress persists between zones */
  persistsAcrossZones: boolean;
  /** Whether progress persists if silenced */
  persistsIfSilenced: boolean;
}

/**
 * Complete STARFORGE definition for a card
 */
export interface StarforgeDefinition {
  /** Type of STARFORGE trigger */
  type: StarforgeType;

  /** Condition(s) that must be met */
  conditions: StarforgeCondition[];

  /** For ACTIVE type: crystal cost to pay */
  activationCost?: number;

  /** The forged (transformed) card stats */
  forgedForm: ForgedCardStats;

  /** Whether transformation is reversible */
  isReversible: boolean;

  /** Flavor text describing the transformation */
  transformationText: string;
}

/**
 * Stats of the forged (transformed) form
 */
export interface ForgedCardStats {
  /** New card name */
  name: string;

  /** New crystal cost (usually same or reduced) */
  cost: number;

  /** New attack value (minions) */
  attack?: number;

  /** New health value (minions) */
  health?: number;

  /** New keywords */
  keywords: KeywordInstance[];

  /** New/modified effects */
  effects: Effect[];

  /** New card text */
  cardText: string;

  /** Reference to alternate art asset */
  artAssetId?: string;
}

/**
 * Runtime STARFORGE tracking for a card instance
 */
export interface StarforgeTracker {
  /** Card instance ID being tracked */
  cardInstanceId: string;

  /** The STARFORGE definition */
  definition: StarforgeDefinition;

  /** Progress for each condition */
  conditionProgress: Map<StarforgeConditionType, number>;

  /** Whether transformation is available */
  isReady: boolean;

  /** Whether transformation has occurred */
  isForged: boolean;

  /** Turn number when forged (if applicable) */
  turnForged?: number;
}

/**
 * Check if STARFORGE conditions are met
 */
export function checkStarforgeReady(tracker: StarforgeTracker): boolean {
  if (tracker.isForged) return false;

  for (const condition of tracker.definition.conditions) {
    const progress = tracker.conditionProgress.get(condition.type) || 0;
    if (progress < condition.targetValue) {
      return false;
    }
  }

  return true;
}

/**
 * Update STARFORGE progress for a condition
 */
export function updateStarforgeProgress(
  tracker: StarforgeTracker,
  conditionType: StarforgeConditionType,
  amount: number
): StarforgeTracker {
  const current = tracker.conditionProgress.get(conditionType) || 0;
  const newProgress = new Map(tracker.conditionProgress);
  newProgress.set(conditionType, current + amount);

  const updatedTracker: StarforgeTracker = {
    ...tracker,
    conditionProgress: newProgress,
    isReady: false, // Will be recalculated
  };

  updatedTracker.isReady = checkStarforgeReady(updatedTracker);

  return updatedTracker;
}

/**
 * Create a new STARFORGE tracker for a card
 */
export function createStarforgeTracker(
  cardInstanceId: string,
  definition: StarforgeDefinition
): StarforgeTracker {
  const conditionProgress = new Map<StarforgeConditionType, number>();

  // Initialize all conditions to 0
  for (const condition of definition.conditions) {
    conditionProgress.set(condition.type, 0);
  }

  return {
    cardInstanceId,
    definition,
    conditionProgress,
    isReady: false,
    isForged: false,
  };
}

/**
 * Example STARFORGE cards from the design document
 */
export const ExampleStarforgeCards = {
  PHOENIX_ETERNUS: {
    type: StarforgeType.CONDITIONAL,
    conditions: [
      {
        type: StarforgeConditionType.DEATH_COUNT,
        targetValue: 5,
        persistsAcrossZones: true,
        persistsIfSilenced: true,
      },
    ],
    forgedForm: {
      name: 'The Immortal Phoenix',
      cost: 0,
      attack: 12,
      health: 10,
      keywords: [{ keyword: 'BARRIER' as any }, { keyword: 'SWIFT' as any }],
      effects: [], // Last Words: Return to play with full Health +3/+3
      cardText: 'Barrier. Swift. Last Words: Return to play with full Health and +3/+3.',
    },
    isReversible: false,
    transformationText: 'After dying 5 times, transform into THE IMMORTAL PHOENIX',
  } as StarforgeDefinition,

  THE_INFINITY_COIL: {
    type: StarforgeType.CONDITIONAL,
    conditions: [
      {
        type: StarforgeConditionType.SUMMON_COUNT,
        targetValue: 15,
        persistsAcrossZones: false,
        persistsIfSilenced: false,
      },
    ],
    forgedForm: {
      name: 'The Omega Coil',
      cost: 8,
      attack: 0,
      health: 20,
      keywords: [],
      effects: [], // End of turn: fill board with 5/5 Mech Titans
      cardText: 'End of turn: Fill your board with 5/5 Mech Titans. Mechs cost (3) less and have Swift.',
    },
    isReversible: false,
    transformationText: 'After summoning 15 Cog-Bots, transform into THE OMEGA COIL',
  } as StarforgeDefinition,

  THE_VOID_TYRANT: {
    type: StarforgeType.CONDITIONAL,
    conditions: [
      {
        type: StarforgeConditionType.BANISH_COUNT,
        targetValue: 10,
        persistsAcrossZones: true,
        persistsIfSilenced: true,
      },
    ],
    forgedForm: {
      name: 'The Void Emperor',
      cost: 5,
      attack: 8,
      health: 8,
      keywords: [{ keyword: 'PHASE' as any }],
      effects: [], // After opponent plays card, BANISH entire hand, they draw 1
      cardText: "Phase. After your opponent plays a card, BANISH their entire hand. They draw 1 card.",
    },
    isReversible: false,
    transformationText: 'After BANISHing 10 cards, transform into THE VOID EMPEROR',
  } as StarforgeDefinition,
};

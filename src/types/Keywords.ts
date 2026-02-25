/**
 * STARFORGE TCG - Keyword Types
 *
 * All 21 keywords in the game, organized by category.
 */

/**
 * Core combat keywords that affect how minions fight
 */
export enum CombatKeyword {
  /** Must be attacked first before other minions */
  GUARDIAN = 'GUARDIAN',
  /** Ignore the next instance of damage received */
  BARRIER = 'BARRIER',
  /** Can attack enemy minions immediately (not Heroes) */
  SWIFT = 'SWIFT',
  /** Can attack anything immediately */
  BLITZ = 'BLITZ',
  /** Can't be attacked or targeted until it attacks */
  CLOAK = 'CLOAK',
  /** Can attack twice per turn */
  DOUBLE_STRIKE = 'DOUBLE_STRIKE',
  /** Damage dealt heals your Hero */
  DRAIN = 'DRAIN',
  /** Destroy any minion this damages */
  LETHAL = 'LETHAL',
}

/**
 * Trigger keywords that activate on specific game events
 */
export enum TriggerKeyword {
  /** Effect triggers when played from hand */
  DEPLOY = 'DEPLOY',
  /** Effect triggers when destroyed */
  LAST_RITES = 'LAST_RITES',
}

/**
 * STARFORGE original keywords with unique mechanics
 */
export enum OriginalKeyword {
  /** Last Words: Draw a card */
  SALVAGE = 'SALVAGE',
  /** Pay X additional Crystals when playing for bonus effect */
  UPGRADE = 'UPGRADE',
  /** Trigger bonus when you heal any target */
  ILLUMINATE = 'ILLUMINATE',
  /** Deal damage when this dies */
  IMMOLATE = 'IMMOLATE',
  /** Exile card permanently (removed from game) */
  BANISH = 'BANISH',
  /** Choose 1 of 3 random bonuses */
  ADAPT = 'ADAPT',
  /** Trigger when you cast a spell */
  RESONATE = 'RESONATE',
  /** Can't be targeted by spells or Hero Powers */
  PHASE = 'PHASE',
  /** Gets +1/+1 for each other friendly minion */
  SWARM = 'SWARM',
  /** Look at top X cards of deck, rearrange in any order */
  SCRY = 'SCRY',
  /** Can be played twice in one turn */
  ECHO = 'ECHO',
}

/**
 * Union type of all keywords
 */
export type Keyword = CombatKeyword | TriggerKeyword | OriginalKeyword;

/**
 * All keywords combined for iteration
 */
export const AllKeywords = {
  ...CombatKeyword,
  ...TriggerKeyword,
  ...OriginalKeyword,
} as const;

/**
 * Keyword with associated value (for UPGRADE, IMMOLATE, SCRY, etc.)
 */
export interface KeywordInstance {
  keyword: Keyword;
  value?: number; // For UPGRADE(X), IMMOLATE(X), SCRY(X)
}

/**
 * Adapt options that can be chosen
 */
export enum AdaptOption {
  ATTACK_PLUS_3 = 'ATTACK_PLUS_3',
  HEALTH_PLUS_3 = 'HEALTH_PLUS_3',
  GUARDIAN = 'GUARDIAN',
  BARRIER = 'BARRIER',
  SWIFT = 'SWIFT',
  DRAIN = 'DRAIN',
  LETHAL = 'LETHAL',
}

/**
 * All possible adapt options for random selection
 */
export const AllAdaptOptions: AdaptOption[] = Object.values(AdaptOption);

/**
 * Check if a keyword is a combat keyword
 */
export function isCombatKeyword(keyword: Keyword): keyword is CombatKeyword {
  return Object.values(CombatKeyword).includes(keyword as CombatKeyword);
}

/**
 * Check if a keyword is a trigger keyword
 */
export function isTriggerKeyword(keyword: Keyword): keyword is TriggerKeyword {
  return Object.values(TriggerKeyword).includes(keyword as TriggerKeyword);
}

/**
 * Check if a keyword is an original STARFORGE keyword
 */
export function isOriginalKeyword(keyword: Keyword): keyword is OriginalKeyword {
  return Object.values(OriginalKeyword).includes(keyword as OriginalKeyword);
}

/**
 * Keywords that require a value parameter
 */
export const KeywordsWithValue: Keyword[] = [
  OriginalKeyword.UPGRADE,
  OriginalKeyword.IMMOLATE,
  OriginalKeyword.SCRY,
];

/**
 * Check if a keyword requires a value
 */
export function keywordRequiresValue(keyword: Keyword): boolean {
  return KeywordsWithValue.includes(keyword);
}

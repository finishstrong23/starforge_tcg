/**
 * STARFORGE TCG - Player Types
 *
 * Defines player state, hero data, and player-related types.
 */

import { Race } from './Race';
import { CardInstance } from './Card';
import { Effect, EffectTrigger, EffectType, TargetType } from './Effects';

/**
 * Hero power definition
 */
export interface HeroPower {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Crystal cost (usually 2) */
  cost: number;
  /** Description of what it does */
  description: string;
  /** The effect(s) it triggers */
  effects: Effect[];
  /** Whether it requires a target */
  requiresTarget: boolean;
  /** Valid targets if required */
  validTargets?: TargetType;
  /** Whether it can be used on the turn the hero is played */
  canUseOnPlayTurn: boolean;
}

/**
 * Hero definition
 */
export interface HeroDefinition {
  /** Unique hero ID */
  id: string;
  /** Hero name */
  name: string;
  /** Race this hero belongs to */
  race: Race;
  /** Starting health */
  maxHealth: number;
  /** Hero power */
  heroPower: HeroPower;
  /** Flavor text / lore */
  flavorText: string;
  /** Opening quote spoken at match start */
  introQuote: string;
  /** Alternate hero skins (cosmetic) */
  skins?: string[];
}

/**
 * Runtime hero state
 */
export interface HeroState {
  /** Reference to hero definition */
  definitionId: string;
  /** Current health */
  currentHealth: number;
  /** Maximum health (can be increased) */
  maxHealth: number;
  /** Armor (absorbs damage before health) */
  armor: number;
  /** Whether hero power has been used this turn */
  heroPowerUsedThisTurn: boolean;
  /** Whether hero power is currently usable */
  heroPowerEnabled: boolean;
  /** Attack value (usually 0, can be granted by weapons/effects) */
  attack: number;
  /** Whether the hero has attacked this turn */
  hasAttackedThisTurn: boolean;
  /** Whether the hero is immune to damage */
  isImmune: boolean;
}

/**
 * Crystal (mana) state
 */
export interface CrystalState {
  /** Current available crystals */
  current: number;
  /** Maximum crystals this turn */
  maximum: number;
  /** Overloaded crystals (locked next turn) - for future mechanics */
  overloaded: number;
  /** Temporary crystals (this turn only) */
  temporary: number;
}

/**
 * Complete player state
 */
export interface PlayerState {
  /** Unique player ID */
  id: string;
  /** Display name */
  name: string;
  /** The race/faction chosen */
  race: Race;
  /** Hero state */
  hero: HeroState;
  /** Crystal (mana) state */
  crystals: CrystalState;
  /** Cards in hand (instance IDs) */
  hand: string[];
  /** Cards in deck (instance IDs, top of deck = index 0) */
  deck: string[];
  /** Cards on board (instance IDs, positions 0-6) */
  board: (string | null)[];
  /** Destroyed cards (instance IDs) */
  graveyard: string[];
  /** Banished cards - removed from game (instance IDs) */
  banished: string[];
  /** Number of cards played this turn (for combo) */
  cardsPlayedThisTurn: number;
  /** Spells cast this turn (for RESONATE) */
  spellsCastThisTurn: number;
  /** Total healing done this game (for ILLUMINATE tracking) */
  totalHealingDone: number;
  /** Total damage dealt this game */
  totalDamageDealt: number;
  /** Minions summoned this game (for SWARM tracking) */
  minionsSummoned: number;
  /** Whether the player has conceded */
  hasConceded: boolean;
  /** Fatigue damage (increases each time drawing from empty deck) */
  fatigueDamage: number;
  /** Cards drawn this turn */
  cardsDrawnThisTurn: number;
}

/**
 * Deck validation rules
 */
export interface DeckRules {
  /** Minimum deck size */
  minSize: number;
  /** Maximum deck size */
  maxSize: number;
  /** Max copies of non-legendary cards */
  maxCopies: number;
  /** Max copies of legendary cards */
  maxLegendaryCopies: number;
}

/**
 * Default deck rules
 */
export const DefaultDeckRules: DeckRules = {
  minSize: 30,
  maxSize: 30,
  maxCopies: 2,
  maxLegendaryCopies: 1,
};

/**
 * Hand size limits
 */
export const HandSizeLimit = 10;

/**
 * Board size limit (minions per player)
 */
export const BoardSizeLimit = 7;

/**
 * Starting health for heroes
 */
export const StartingHealth = 30;

/**
 * Starting hand size
 */
export const StartingHandSize = 3;

/**
 * Cards drawn going second (includes The Coin in future)
 */
export const StartingHandSizeSecond = 4;

/**
 * Create initial player state
 */
export function createInitialPlayerState(
  id: string,
  name: string,
  race: Race,
  heroDefinitionId: string,
  deckCardIds: string[]
): PlayerState {
  return {
    id,
    name,
    race,
    hero: {
      definitionId: heroDefinitionId,
      currentHealth: StartingHealth,
      maxHealth: StartingHealth,
      armor: 0,
      heroPowerUsedThisTurn: false,
      heroPowerEnabled: true,
      attack: 0,
      hasAttackedThisTurn: false,
      isImmune: false,
    },
    crystals: {
      current: 0,
      maximum: 0,
      overloaded: 0,
      temporary: 0,
    },
    hand: [],
    deck: [...deckCardIds], // Copy the array
    board: [null, null, null, null, null, null, null], // 7 slots
    graveyard: [],
    banished: [],
    cardsPlayedThisTurn: 0,
    spellsCastThisTurn: 0,
    totalHealingDone: 0,
    totalDamageDealt: 0,
    minionsSummoned: 0,
    hasConceded: false,
    fatigueDamage: 0,
    cardsDrawnThisTurn: 0,
  };
}

/**
 * Check if player can play a card (has enough crystals)
 */
export function canAffordCard(player: PlayerState, cost: number): boolean {
  return player.crystals.current + player.crystals.temporary >= cost;
}

/**
 * Check if player's board has space
 */
export function hasBoardSpace(player: PlayerState): boolean {
  return player.board.some((slot) => slot === null);
}

/**
 * Get number of minions on board
 */
export function getBoardCount(player: PlayerState): number {
  return player.board.filter((slot) => slot !== null).length;
}

/**
 * Check if player is dead
 */
export function isPlayerDead(player: PlayerState): boolean {
  return player.hero.currentHealth <= 0 || player.hasConceded;
}

/**
 * Get available board position (first empty slot)
 */
export function getAvailableBoardPosition(player: PlayerState): number | null {
  const index = player.board.findIndex((slot) => slot === null);
  return index >= 0 ? index : null;
}

/**
 * Check if hero power can be used
 */
export function canUseHeroPower(player: PlayerState, heroPowerCost: number): boolean {
  if (player.hero.heroPowerUsedThisTurn) return false;
  if (!player.hero.heroPowerEnabled) return false;
  return canAffordCard(player, heroPowerCost);
}

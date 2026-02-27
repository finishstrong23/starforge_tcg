/**
 * STARFORGE TCG - Card Collection & Unlock System
 *
 * Manages player card collections for post-story deckbuilding.
 * Players start with their race's starter deck (30 curated cards).
 * Beating the campaign unlocks access to faction card pools for
 * custom deckbuilding.
 *
 * Unlock progression:
 *   - Start: Starter deck (30 fixed cards) for your chosen race
 *   - Beat a planet: Unlock that race's full 50-card pool for deckbuilding
 *   - Beat the campaign: Unlock ALL faction pools + full neutral pool
 *   - All players always have access to basic neutral cards
 *
 * Deck Rules:
 *   - 30 cards per deck
 *   - Max 2 copies of any non-Legendary card
 *   - Max 1 copy of any Legendary card
 *   - Can only use cards from your race + neutral + unlocked races
 */

import { Race } from '../types/Race';
import type { CardDefinition } from '../types/Card';
import { CardRarity } from '../types/Card';
import {
  COGSMITHS_CARDS,
  LUMINAR_CARDS,
  PYROCLAST_CARDS,
  VOIDBORN_CARDS,
  BIOTITANS_CARDS,
  CRYSTALLINE_CARDS,
  PHANTOM_CORSAIRS_CARDS,
  HIVEMIND_CARDS,
  ASTROMANCERS_CARDS,
  CHRONOBOUND_CARDS,
  NEUTRAL_CARDS,
} from './SampleCards';
import { getExpansionCardsByRace, ALL_EXPANSION_CARDS } from './ExpansionCards';
import { getBalancedStarterDeck } from './BalancedStarterDecks';

// ============================================================================
// Collection State
// ============================================================================

/**
 * Player's card collection state — what they have access to
 */
export interface PlayerCollection {
  /** Player's home race */
  homeRace: Race;
  /** Races the player has unlocked (defeated in campaign) */
  unlockedRaces: Race[];
  /** Whether the full campaign has been completed */
  campaignComplete: boolean;
  /** Total cards available in the collection */
  totalCardsAvailable: number;
}

/**
 * Deck validation result
 */
export interface DeckValidation {
  valid: boolean;
  errors: string[];
}

/**
 * A custom deck built by the player
 */
export interface CustomDeck {
  id: string;
  name: string;
  race: Race;
  cardIds: string[];
  createdAt: string;
  lastModified: string;
}

// ============================================================================
// Collection Management
// ============================================================================

/**
 * Get all cards for a specific race (base + expansion)
 */
function getCardsForRace(race: Race): CardDefinition[] {
  let base: CardDefinition[];
  switch (race) {
    case Race.COGSMITHS: base = COGSMITHS_CARDS; break;
    case Race.LUMINAR: base = LUMINAR_CARDS; break;
    case Race.PYROCLAST: base = PYROCLAST_CARDS; break;
    case Race.VOIDBORN: base = VOIDBORN_CARDS; break;
    case Race.BIOTITANS: base = BIOTITANS_CARDS; break;
    case Race.CRYSTALLINE: base = CRYSTALLINE_CARDS; break;
    case Race.PHANTOM_CORSAIRS: base = PHANTOM_CORSAIRS_CARDS; break;
    case Race.HIVEMIND: base = HIVEMIND_CARDS; break;
    case Race.ASTROMANCERS: base = ASTROMANCERS_CARDS; break;
    case Race.CHRONOBOUND: base = CHRONOBOUND_CARDS; break;
    case Race.NEUTRAL: base = NEUTRAL_CARDS; break;
    default: return [];
  }
  return [...base, ...getExpansionCardsByRace(race)];
}

/**
 * Get the basic neutral cards available to all players (commons + rares only).
 * Full neutral pool unlocks after campaign completion.
 */
export function getBasicNeutralCards(): CardDefinition[] {
  return NEUTRAL_CARDS.filter(
    c => c.collectible && (c.rarity === CardRarity.COMMON || c.rarity === CardRarity.RARE)
  );
}

/**
 * Get ALL cards available to a player based on their collection state.
 * This is the card pool they can build custom decks from.
 */
export function getAvailableCards(collection: PlayerCollection): CardDefinition[] {
  const available: CardDefinition[] = [];

  // Always have access to home race cards
  available.push(...getCardsForRace(collection.homeRace).filter(c => c.collectible));

  // Add cards from unlocked races
  for (const race of collection.unlockedRaces) {
    if (race !== collection.homeRace) {
      available.push(...getCardsForRace(race).filter(c => c.collectible));
    }
  }

  // Neutral cards: basic set always, full set after campaign
  if (collection.campaignComplete) {
    available.push(...NEUTRAL_CARDS.filter(c => c.collectible));
  } else {
    available.push(...getBasicNeutralCards());
  }

  return available;
}

/**
 * Get cards available for deckbuilding for a specific race.
 * Filters the available pool to cards the player's deck race can use.
 */
export function getDeckbuildingPool(
  collection: PlayerCollection,
  deckRace: Race
): CardDefinition[] {
  const allAvailable = getAvailableCards(collection);

  // Can use cards from the deck's race + neutral cards
  return allAvailable.filter(c => {
    if (!c.race || c.race === Race.NEUTRAL) return true;
    return c.race === deckRace;
  });
}

/**
 * Validate a custom deck against the rules
 */
export function validateDeck(
  cardIds: string[],
  deckRace: Race,
  collection: PlayerCollection
): DeckValidation {
  const errors: string[] = [];

  // Check deck size
  if (cardIds.length !== 30) {
    errors.push(`Deck must have exactly 30 cards (has ${cardIds.length})`);
  }

  // Check copy limits
  const cardCounts = new Map<string, number>();
  for (const id of cardIds) {
    cardCounts.set(id, (cardCounts.get(id) || 0) + 1);
  }

  const pool = getDeckbuildingPool(collection, deckRace);
  const poolMap = new Map<string, CardDefinition>();
  for (const card of pool) {
    poolMap.set(card.id, card);
  }

  for (const [id, count] of cardCounts) {
    const card = poolMap.get(id);
    if (!card) {
      errors.push(`Card "${id}" is not available in your collection`);
      continue;
    }

    const maxCopies = card.rarity === CardRarity.LEGENDARY ? 1 : 2;
    if (count > maxCopies) {
      errors.push(
        `Too many copies of "${card.name}" (${count}/${maxCopies} max for ${card.rarity})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Collection Persistence (localStorage)
// ============================================================================

const COLLECTION_STORAGE_KEY = 'starforge_collection';
const DECKS_STORAGE_KEY = 'starforge_custom_decks';

/**
 * Create a new collection for a player starting the campaign
 */
export function createNewCollection(homeRace: Race): PlayerCollection {
  return {
    homeRace,
    unlockedRaces: [homeRace],
    campaignComplete: false,
    totalCardsAvailable: getCardsForRace(homeRace).filter(c => c.collectible).length
      + getBasicNeutralCards().length,
  };
}

/**
 * Unlock a new race in the collection (called when defeating a planet)
 */
export function unlockRace(
  collection: PlayerCollection,
  race: Race
): PlayerCollection {
  if (collection.unlockedRaces.includes(race)) return collection;

  const updated: PlayerCollection = {
    ...collection,
    unlockedRaces: [...collection.unlockedRaces, race],
  };

  // Recalculate available cards
  updated.totalCardsAvailable = getAvailableCards(updated).length;

  return updated;
}

/**
 * Mark the campaign as complete — unlocks full neutral pool
 */
export function completeCampaign(
  collection: PlayerCollection
): PlayerCollection {
  const updated: PlayerCollection = {
    ...collection,
    campaignComplete: true,
  };

  updated.totalCardsAvailable = getAvailableCards(updated).length;
  return updated;
}

/**
 * Save collection to localStorage
 */
export function saveCollection(collection: PlayerCollection): void {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(collection));
  } catch {
    // localStorage not available (e.g., SSR or tests)
  }
}

/**
 * Load collection from localStorage
 */
export function loadCollection(): PlayerCollection | null {
  try {
    const data = localStorage.getItem(COLLECTION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Save custom decks to localStorage
 */
export function saveCustomDecks(decks: CustomDeck[]): void {
  try {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // localStorage not available
  }
}

/**
 * Load custom decks from localStorage
 */
export function loadCustomDecks(): CustomDeck[] {
  try {
    const data = localStorage.getItem(DECKS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get a summary of the player's collection
 */
export function getCollectionSummary(collection: PlayerCollection): {
  totalCards: number;
  racesUnlocked: number;
  totalRaces: number;
  campaignComplete: boolean;
  canBuildCustomDecks: boolean;
} {
  return {
    totalCards: collection.totalCardsAvailable,
    racesUnlocked: collection.unlockedRaces.length,
    totalRaces: 10,
    campaignComplete: collection.campaignComplete,
    canBuildCustomDecks: collection.campaignComplete,
  };
}

// ============================================================================
// Deckbuilding → Gameplay Bridge
// ============================================================================

/**
 * Build a master card lookup from ALL card sources (base + expansion + balanced starters).
 * Used to resolve card IDs to definitions when creating custom gameplay decks.
 */
export function buildCardLookup(): Map<string, CardDefinition> {
  const lookup = new Map<string, CardDefinition>();

  // All base faction cards
  const allRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN, Race.BIOTITANS,
    Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS, Race.HIVEMIND, Race.ASTROMANCERS,
    Race.CHRONOBOUND, Race.NEUTRAL,
  ];

  for (const race of allRaces) {
    for (const card of getCardsForRace(race)) {
      lookup.set(card.id, card);
    }
  }

  // All balanced starter cards
  for (const race of allRaces.filter(r => r !== Race.NEUTRAL)) {
    for (const card of getBalancedStarterDeck(race)) {
      lookup.set(card.id, card);
    }
  }

  // All expansion cards
  for (const card of ALL_EXPANSION_CARDS) {
    lookup.set(card.id, card);
  }

  return lookup;
}

/**
 * Resolve a list of card IDs into CardDefinitions.
 * Returns the definitions in the same order as the IDs, skipping unknown IDs.
 */
export function resolveCardIds(cardIds: string[]): CardDefinition[] {
  const lookup = buildCardLookup();
  const resolved: CardDefinition[] = [];

  for (const id of cardIds) {
    const card = lookup.get(id);
    if (card) {
      resolved.push(card);
    }
  }

  return resolved;
}

/**
 * Get the balanced starter deck card IDs for a race.
 * Used when the player hasn't built a custom deck yet.
 */
export function getStarterDeckCardIds(race: Race): string[] {
  return getBalancedStarterDeck(race).map(card => card.id);
}

/**
 * Get pre-built deck recipes for a race — suggested deck lists the player can
 * use as starting points for custom deckbuilding. These are thematic and fun.
 */
export function getDeckRecipes(race: Race): { name: string; description: string; cardIds: string[] }[] {
  const starter = getBalancedStarterDeck(race);
  const expansion = getExpansionCardsByRace(race);
  const starterIds = starter.map(c => c.id);

  // Recipe 1: Pure starter (the balanced deck as-is)
  const pureStarter = {
    name: 'Starter Deck',
    description: 'The balanced starter deck. A solid foundation for learning the faction.',
    cardIds: starterIds,
  };

  // Recipe 2: Power deck — swap in expansion rares/epics for weaker starter cards
  const expansionRares = expansion.filter(c => c.rarity === CardRarity.RARE || c.rarity === CardRarity.EPIC);
  const powerIds = [...starterIds];
  // Replace the weakest cards (lowest cost commons without keywords) with expansion cards
  const weakCards = starter
    .filter(c => c.rarity === CardRarity.COMMON && (!c.keywords || c.keywords.length === 0))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, Math.min(expansionRares.length, 6));

  for (let i = 0; i < weakCards.length && i < expansionRares.length; i++) {
    const idx = powerIds.indexOf(weakCards[i].id);
    if (idx !== -1) {
      powerIds[idx] = expansionRares[i].id;
    }
  }

  const powerDeck = {
    name: 'Power Deck',
    description: 'Upgraded starter with expansion cards. Stronger but higher mana curve.',
    cardIds: powerIds,
  };

  // Recipe 3: Legendary deck — include the faction legendaries
  const expansionLegendaries = expansion.filter(c => c.rarity === CardRarity.LEGENDARY);
  const legendaryIds = [...powerIds];
  // Replace highest-cost non-legendary cards with legendaries
  const replaceTargets = starter
    .filter(c => c.rarity !== CardRarity.LEGENDARY && c.rarity !== CardRarity.EPIC)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, expansionLegendaries.length);

  for (let i = 0; i < replaceTargets.length && i < expansionLegendaries.length; i++) {
    const idx = legendaryIds.indexOf(replaceTargets[i].id);
    if (idx !== -1) {
      legendaryIds[idx] = expansionLegendaries[i].id;
    }
  }

  const legendaryDeck = {
    name: 'Legendary Deck',
    description: 'Includes powerful Legendary cards with STARFORGE transformations!',
    cardIds: legendaryIds,
  };

  return [pureStarter, powerDeck, legendaryDeck];
}

/**
 * Get all collectible cards grouped by category for the deckbuilding UI.
 */
export function getCollectionByCategory(collection: PlayerCollection): {
  byRace: Map<Race, CardDefinition[]>;
  byRarity: Map<string, CardDefinition[]>;
  byCost: Map<number, CardDefinition[]>;
  starforgeCards: CardDefinition[];
  totalUnique: number;
} {
  const available = getAvailableCards(collection);

  const byRace = new Map<Race, CardDefinition[]>();
  const byRarity = new Map<string, CardDefinition[]>();
  const byCost = new Map<number, CardDefinition[]>();
  const starforgeCards: CardDefinition[] = [];

  for (const card of available) {
    // By race
    const race = card.race || Race.NEUTRAL;
    if (!byRace.has(race)) byRace.set(race, []);
    byRace.get(race)!.push(card);

    // By rarity
    const rarity = card.rarity || 'COMMON';
    if (!byRarity.has(rarity)) byRarity.set(rarity, []);
    byRarity.get(rarity)!.push(card);

    // By cost
    const cost = card.cost;
    if (!byCost.has(cost)) byCost.set(cost, []);
    byCost.get(cost)!.push(card);

    // Starforge-able
    if (card.starforge) {
      starforgeCards.push(card);
    }
  }

  return {
    byRace,
    byRarity,
    byCost,
    starforgeCards,
    totalUnique: available.length,
  };
}

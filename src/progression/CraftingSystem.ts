/**
 * STARFORGE TCG - Crafting & Dust System
 *
 * Hearthstone-style crafting:
 * - Disenchant unwanted cards into Stardust
 * - Craft specific cards using Stardust
 * - Rarity determines dust values
 * - Bulk disenchant extras
 */

import { CardRarity } from '../types/Card';
import type { CardDefinition } from '../types/Card';
import { getCollectibleSampleCards } from '../data/SampleCards';
import { ALL_EXPANSION_CARDS } from '../data/ExpansionCards';

/** Stardust values by rarity */
export const DUST_VALUES = {
  DISENCHANT: {
    [CardRarity.COMMON]: 5,
    [CardRarity.RARE]: 20,
    [CardRarity.EPIC]: 100,
    [CardRarity.LEGENDARY]: 400,
  },
  CRAFT: {
    [CardRarity.COMMON]: 40,
    [CardRarity.RARE]: 100,
    [CardRarity.EPIC]: 400,
    [CardRarity.LEGENDARY]: 1600,
  },
} as const;

export interface CraftingState {
  stardust: number;
  /** Card IDs the player owns (duplicates = multiple copies) */
  ownedCards: string[];
  totalDustEarned: number;
  totalCrafted: number;
  totalDisenchanted: number;
}

const CRAFTING_STATE_KEY = 'starforge_crafting';

export function loadCraftingState(): CraftingState {
  try {
    const raw = localStorage.getItem(CRAFTING_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    stardust: 0,
    ownedCards: [],
    totalDustEarned: 0,
    totalCrafted: 0,
    totalDisenchanted: 0,
  };
}

export function saveCraftingState(state: CraftingState): void {
  try {
    localStorage.setItem(CRAFTING_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Count how many copies of a card the player owns */
export function getOwnedCount(state: CraftingState, cardId: string): number {
  return state.ownedCards.filter(id => id === cardId).length;
}

/** Disenchant one copy of a card into stardust */
export function disenchantCard(
  state: CraftingState,
  cardId: string,
  rarity: CardRarity,
): CraftingState | null {
  const idx = state.ownedCards.indexOf(cardId);
  if (idx === -1) return null;

  const dustValue = DUST_VALUES.DISENCHANT[rarity];
  const newOwned = [...state.ownedCards];
  newOwned.splice(idx, 1);

  const newState: CraftingState = {
    ...state,
    stardust: state.stardust + dustValue,
    ownedCards: newOwned,
    totalDustEarned: state.totalDustEarned + dustValue,
    totalDisenchanted: state.totalDisenchanted + 1,
  };

  saveCraftingState(newState);
  return newState;
}

/** Craft a specific card using stardust */
export function craftCard(
  state: CraftingState,
  cardId: string,
  rarity: CardRarity,
): CraftingState | null {
  const cost = DUST_VALUES.CRAFT[rarity];
  if (state.stardust < cost) return null;

  const newState: CraftingState = {
    ...state,
    stardust: state.stardust - cost,
    ownedCards: [...state.ownedCards, cardId],
    totalCrafted: state.totalCrafted + 1,
  };

  saveCraftingState(newState);
  return newState;
}

/** Add cards to collection (e.g. from pack opening) */
export function addCardsToCollection(
  state: CraftingState,
  cardIds: string[],
): CraftingState {
  const newState: CraftingState = {
    ...state,
    ownedCards: [...state.ownedCards, ...cardIds],
  };
  saveCraftingState(newState);
  return newState;
}

/** Get all collectible cards in the game */
export function getAllCollectibleCards(): CardDefinition[] {
  const all = [...getCollectibleSampleCards(), ...ALL_EXPANSION_CARDS];
  const seen = new Set<string>();
  return all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/** Bulk disenchant all copies beyond maxCopies (default 2) */
export function disenchantExtras(
  state: CraftingState,
  maxCopies: number = 2,
): { newState: CraftingState; dustGained: number; cardsDisenchanted: number } {
  const countMap = new Map<string, number>();
  const keptCards: string[] = [];
  let dustGained = 0;
  let cardsDisenchanted = 0;

  const allCards = getAllCollectibleCards();
  const rarityMap = new Map<string, CardRarity>();
  for (const c of allCards) {
    rarityMap.set(c.id, c.rarity);
  }

  for (const cardId of state.ownedCards) {
    const count = countMap.get(cardId) || 0;
    if (count < maxCopies) {
      keptCards.push(cardId);
      countMap.set(cardId, count + 1);
    } else {
      const rarity = rarityMap.get(cardId) || CardRarity.COMMON;
      dustGained += DUST_VALUES.DISENCHANT[rarity];
      cardsDisenchanted++;
    }
  }

  const newState: CraftingState = {
    ...state,
    stardust: state.stardust + dustGained,
    ownedCards: keptCards,
    totalDustEarned: state.totalDustEarned + dustGained,
    totalDisenchanted: state.totalDisenchanted + cardsDisenchanted,
  };

  saveCraftingState(newState);
  return { newState, dustGained, cardsDisenchanted };
}

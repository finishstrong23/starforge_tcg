/**
 * STARFORGE TCG - Card Pack System
 *
 * Pack types with different rarity distributions.
 * Pity timer guarantees Legendary within N packs.
 * Each pack contains 5 cards with guaranteed rare+.
 */

import { CardRarity } from '../types/Card';
import type { CardDefinition } from '../types/Card';
import { ALL_EXPANSION_CARDS } from '../data/ExpansionCards';
import { ALL_SAMPLE_CARDS, getCollectibleSampleCards } from '../data/SampleCards';

export interface PackType {
  id: string;
  name: string;
  description: string;
  cost: number; // gold
  cardCount: number;
  /** Guaranteed minimum rarity for one card */
  guaranteedRarity: CardRarity;
  /** Rarity weights [common, rare, epic, legendary] */
  weights: [number, number, number, number];
  /** Color theme for UI */
  color: string;
}

export interface PackCard {
  card: CardDefinition;
  isNew: boolean; // first time seeing this card
  rarity: CardRarity;
}

export interface PackResult {
  packType: PackType;
  cards: PackCard[];
  /** Whether pity timer triggered for a guaranteed legendary */
  pityTriggered: boolean;
}

export interface PackState {
  /** Packs opened total */
  totalOpened: number;
  /** Packs since last Legendary (pity counter) */
  packsSinceLegendary: number;
  /** IDs of cards player has seen (for "new" indicator) */
  seenCardIds: string[];
}

const PACK_STATE_KEY = 'starforge_packs';
const PITY_TIMER = 20; // Guaranteed legendary every 20 packs

// Available pack types
export const PACK_TYPES: PackType[] = [
  {
    id: 'standard',
    name: 'Standard Pack',
    description: '5 cards, guaranteed Rare or better',
    cost: 100,
    cardCount: 5,
    guaranteedRarity: CardRarity.RARE,
    weights: [70, 20, 8, 2],
    color: '#4488ff',
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    description: '5 cards, guaranteed Epic or better',
    cost: 250,
    cardCount: 5,
    guaranteedRarity: CardRarity.EPIC,
    weights: [50, 30, 15, 5],
    color: '#aa44ff',
  },
  {
    id: 'legendary',
    name: 'Legendary Pack',
    description: '5 cards, guaranteed Legendary',
    cost: 500,
    cardCount: 5,
    guaranteedRarity: CardRarity.LEGENDARY,
    weights: [40, 25, 20, 15],
    color: '#ff8800',
  },
];

export function loadPackState(): PackState {
  try {
    const raw = localStorage.getItem(PACK_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalOpened: 0, packsSinceLegendary: 0, seenCardIds: [] };
}

export function savePackState(state: PackState): void {
  try {
    localStorage.setItem(PACK_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function getCollectiblePool(): CardDefinition[] {
  // Combine all collectible cards
  const all = [...getCollectibleSampleCards(), ...ALL_EXPANSION_CARDS];
  // Deduplicate by ID
  const seen = new Set<string>();
  return all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function rollRarity(weights: [number, number, number, number]): CardRarity {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  if (roll < weights[0]) return CardRarity.COMMON;
  roll -= weights[0];
  if (roll < weights[1]) return CardRarity.RARE;
  roll -= weights[1];
  if (roll < weights[2]) return CardRarity.EPIC;
  return CardRarity.LEGENDARY;
}

function getCardsByRarity(pool: CardDefinition[], rarity: CardRarity): CardDefinition[] {
  return pool.filter(c => c.rarity === rarity);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function openPack(packType: PackType, state: PackState): { result: PackResult; newState: PackState } {
  const pool = getCollectiblePool();
  const cards: PackCard[] = [];
  let pityTriggered = false;
  let gotLegendary = false;

  // Check pity timer
  const needsPity = state.packsSinceLegendary >= PITY_TIMER - 1;

  // Roll cards
  for (let i = 0; i < packType.cardCount; i++) {
    let rarity: CardRarity;

    if (i === 0) {
      // First card: guaranteed minimum rarity
      rarity = packType.guaranteedRarity;
    } else if (i === packType.cardCount - 1 && needsPity && !gotLegendary) {
      // Last card: pity timer forces legendary
      rarity = CardRarity.LEGENDARY;
      pityTriggered = true;
    } else {
      rarity = rollRarity(packType.weights);
    }

    if (rarity === CardRarity.LEGENDARY) gotLegendary = true;

    // Pick a card of this rarity
    let candidates = getCardsByRarity(pool, rarity);
    if (candidates.length === 0) {
      // Fallback: find any rarity
      candidates = pool;
    }

    const card = pickRandom(candidates);
    const isNew = !state.seenCardIds.includes(card.id);
    cards.push({ card, isNew, rarity });
  }

  // Sort cards: legendary > epic > rare > common, for dramatic reveal
  const rarityOrder = { LEGENDARY: 0, EPIC: 1, RARE: 2, COMMON: 3 };
  cards.sort((a, b) => (rarityOrder[b.rarity] ?? 3) - (rarityOrder[a.rarity] ?? 3));

  // Actually reverse so best card is revealed last
  cards.reverse();

  // Update state
  const newSeenIds = [...state.seenCardIds];
  for (const c of cards) {
    if (!newSeenIds.includes(c.card.id)) {
      newSeenIds.push(c.card.id);
    }
  }

  const newState: PackState = {
    totalOpened: state.totalOpened + 1,
    packsSinceLegendary: gotLegendary ? 0 : state.packsSinceLegendary + 1,
    seenCardIds: newSeenIds,
  };

  savePackState(newState);

  return {
    result: { packType, cards, pityTriggered },
    newState,
  };
}

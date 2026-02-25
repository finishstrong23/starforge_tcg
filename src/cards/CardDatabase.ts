/**
 * STARFORGE TCG - Card Database
 *
 * Central repository for all card definitions with querying capabilities.
 */

import {
  CardDefinition,
  CardType,
  CardRarity,
  MinionTribe,
} from '../types/Card';
import { Race } from '../types/Race';
import type { Keyword } from '../types/Keywords';

/**
 * Query filters for searching cards
 */
export interface CardQuery {
  /** Filter by card type */
  type?: CardType;
  /** Filter by rarity */
  rarity?: CardRarity;
  /** Filter by race */
  race?: Race;
  /** Filter by tribe */
  tribe?: MinionTribe;
  /** Filter by minimum cost */
  minCost?: number;
  /** Filter by maximum cost */
  maxCost?: number;
  /** Filter by exact cost */
  cost?: number;
  /** Filter by minimum attack */
  minAttack?: number;
  /** Filter by maximum attack */
  maxAttack?: number;
  /** Filter by minimum health */
  minHealth?: number;
  /** Filter by maximum health */
  maxHealth?: number;
  /** Filter by having specific keyword */
  hasKeyword?: Keyword;
  /** Filter by having any of these keywords */
  hasAnyKeyword?: Keyword[];
  /** Filter by being collectible */
  collectible?: boolean;
  /** Filter by set/expansion */
  set?: string;
  /** Filter by name (partial match) */
  nameContains?: string;
  /** Filter by having STARFORGE */
  hasStarforge?: boolean;
}

/**
 * Card Database class
 * Stores and queries card definitions
 */
export class CardDatabase {
  private cards: Map<string, CardDefinition> = new Map();
  private cardsByRace: Map<Race, Set<string>> = new Map();
  private cardsByCost: Map<number, Set<string>> = new Map();
  private cardsByRarity: Map<CardRarity, Set<string>> = new Map();
  private cardsByType: Map<CardType, Set<string>> = new Map();

  constructor() {
    // Initialize index maps
    Object.values(Race).forEach((race) => {
      this.cardsByRace.set(race as Race, new Set());
    });
    Object.values(CardRarity).forEach((rarity) => {
      this.cardsByRarity.set(rarity as CardRarity, new Set());
    });
    Object.values(CardType).forEach((type) => {
      this.cardsByType.set(type as CardType, new Set());
    });
    for (let cost = 0; cost <= 15; cost++) {
      this.cardsByCost.set(cost, new Set());
    }
  }

  /**
   * Register a card definition
   */
  registerCard(card: CardDefinition): void {
    if (this.cards.has(card.id)) {
      return; // Skip duplicate — already registered
    }

    this.cards.set(card.id, card);
    this.indexCard(card);
  }

  /**
   * Register multiple cards at once
   */
  registerCards(cards: CardDefinition[]): void {
    for (const card of cards) {
      this.registerCard(card);
    }
  }

  /**
   * Index a card for fast querying
   */
  private indexCard(card: CardDefinition): void {
    // Index by race
    const race = card.race || Race.NEUTRAL;
    this.cardsByRace.get(race)?.add(card.id);

    // Index by cost (cap at 15 for index)
    const costIndex = Math.min(card.cost, 15);
    this.cardsByCost.get(costIndex)?.add(card.id);

    // Index by rarity
    this.cardsByRarity.get(card.rarity)?.add(card.id);

    // Index by type
    this.cardsByType.get(card.type)?.add(card.id);
  }

  /**
   * Get a card by ID
   */
  getCard(id: string): CardDefinition | undefined {
    return this.cards.get(id);
  }

  /**
   * Get a card by ID, throw if not found
   */
  getCardOrThrow(id: string): CardDefinition {
    const card = this.cards.get(id);
    if (!card) {
      throw new Error(`Card ${id} not found in database`);
    }
    return card;
  }

  /**
   * Check if a card exists
   */
  hasCard(id: string): boolean {
    return this.cards.has(id);
  }

  /**
   * Get all cards
   */
  getAllCards(): CardDefinition[] {
    return Array.from(this.cards.values());
  }

  /**
   * Get all card IDs
   */
  getAllCardIds(): string[] {
    return Array.from(this.cards.keys());
  }

  /**
   * Query cards with filters
   */
  query(filters: CardQuery): CardDefinition[] {
    let results: CardDefinition[] = [];

    // Start with a base set based on most selective filter
    if (filters.cost !== undefined) {
      const costIndex = Math.min(filters.cost, 15);
      const ids = this.cardsByCost.get(costIndex);
      results = ids ? this.getCardsByIds(ids) : [];
    } else if (filters.race !== undefined) {
      const ids = this.cardsByRace.get(filters.race);
      results = ids ? this.getCardsByIds(ids) : [];
    } else if (filters.rarity !== undefined) {
      const ids = this.cardsByRarity.get(filters.rarity);
      results = ids ? this.getCardsByIds(ids) : [];
    } else if (filters.type !== undefined) {
      const ids = this.cardsByType.get(filters.type);
      results = ids ? this.getCardsByIds(ids) : [];
    } else {
      results = this.getAllCards();
    }

    // Apply remaining filters
    return results.filter((card) => this.matchesFilters(card, filters));
  }

  /**
   * Get cards available to a specific race (race cards + neutral)
   */
  getCardsForRace(race: Race): CardDefinition[] {
    const raceCards = this.cardsByRace.get(race) || new Set();
    const neutralCards = this.cardsByRace.get(Race.NEUTRAL) || new Set();

    const allIds = new Set([...raceCards, ...neutralCards]);
    return this.getCardsByIds(allIds);
  }

  /**
   * Get collectible cards only
   */
  getCollectibleCards(): CardDefinition[] {
    return this.query({ collectible: true });
  }

  /**
   * Get cards by cost
   */
  getCardsByCost(cost: number): CardDefinition[] {
    return this.query({ cost });
  }

  /**
   * Get cards by rarity
   */
  getCardsByRarity(rarity: CardRarity): CardDefinition[] {
    return this.query({ rarity });
  }

  /**
   * Get cards with STARFORGE
   */
  getStarforgeCards(): CardDefinition[] {
    return this.query({ hasStarforge: true });
  }

  /**
   * Get random cards matching query
   */
  getRandomCards(count: number, filters?: CardQuery): CardDefinition[] {
    const pool = filters ? this.query(filters) : this.getAllCards();

    if (pool.length <= count) {
      return [...pool];
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get total card count
   */
  get size(): number {
    return this.cards.size;
  }

  /**
   * Helper: Get cards by ID set
   */
  private getCardsByIds(ids: Set<string>): CardDefinition[] {
    const cards: CardDefinition[] = [];
    for (const id of ids) {
      const card = this.cards.get(id);
      if (card) {
        cards.push(card);
      }
    }
    return cards;
  }

  /**
   * Helper: Check if card matches all filters
   */
  private matchesFilters(card: CardDefinition, filters: CardQuery): boolean {
    if (filters.type !== undefined && card.type !== filters.type) {
      return false;
    }

    if (filters.rarity !== undefined && card.rarity !== filters.rarity) {
      return false;
    }

    if (filters.race !== undefined) {
      const cardRace = card.race || Race.NEUTRAL;
      if (cardRace !== filters.race) {
        return false;
      }
    }

    if (filters.tribe !== undefined && card.tribe !== filters.tribe) {
      return false;
    }

    if (filters.minCost !== undefined && card.cost < filters.minCost) {
      return false;
    }

    if (filters.maxCost !== undefined && card.cost > filters.maxCost) {
      return false;
    }

    if (filters.cost !== undefined && card.cost !== filters.cost) {
      return false;
    }

    if (filters.minAttack !== undefined) {
      if (card.attack === undefined || card.attack < filters.minAttack) {
        return false;
      }
    }

    if (filters.maxAttack !== undefined) {
      if (card.attack === undefined || card.attack > filters.maxAttack) {
        return false;
      }
    }

    if (filters.minHealth !== undefined) {
      if (card.health === undefined || card.health < filters.minHealth) {
        return false;
      }
    }

    if (filters.maxHealth !== undefined) {
      if (card.health === undefined || card.health > filters.maxHealth) {
        return false;
      }
    }

    if (filters.hasKeyword !== undefined) {
      const hasKw = card.keywords.some((k) => k.keyword === filters.hasKeyword);
      if (!hasKw) {
        return false;
      }
    }

    if (filters.hasAnyKeyword !== undefined && filters.hasAnyKeyword.length > 0) {
      const hasAny = filters.hasAnyKeyword.some((kw) =>
        card.keywords.some((k) => k.keyword === kw)
      );
      if (!hasAny) {
        return false;
      }
    }

    if (filters.collectible !== undefined && card.collectible !== filters.collectible) {
      return false;
    }

    if (filters.set !== undefined && card.set !== filters.set) {
      return false;
    }

    if (filters.nameContains !== undefined) {
      if (!card.name.toLowerCase().includes(filters.nameContains.toLowerCase())) {
        return false;
      }
    }

    if (filters.hasStarforge !== undefined) {
      const hasStarforge = card.starforge !== undefined;
      if (hasStarforge !== filters.hasStarforge) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all cards (useful for testing)
   */
  clear(): void {
    this.cards.clear();
    this.cardsByRace.forEach((set) => set.clear());
    this.cardsByCost.forEach((set) => set.clear());
    this.cardsByRarity.forEach((set) => set.clear());
    this.cardsByType.forEach((set) => set.clear());
  }

  /**
   * Export all cards as JSON
   */
  toJSON(): CardDefinition[] {
    return this.getAllCards();
  }

  /**
   * Import cards from JSON
   */
  fromJSON(cards: CardDefinition[]): void {
    this.clear();
    this.registerCards(cards);
  }
}

/**
 * Global card database instance
 */
export const globalCardDatabase = new CardDatabase();

/**
 * STARFORGE TCG - Main Entry Point
 *
 * A mobile Trading Card Game with 10 asymmetric alien races
 * and the unique STARFORGE card transformation system.
 */

// Types
export * from './types';

// Cards
export * from './cards';

// Events
export * from './events';

// Game State
export * from './game';

// Combat
export * from './combat';

// Game Engine
export * from './engine';

// Heroes
export * from './heroes';

// Sample Data
export * from './data';

// Utilities
export * from './utils';

// AI
export * from './ai';

/**
 * Version information
 */
export const VERSION = '0.1.0';
export const ENGINE_NAME = 'STARFORGE TCG Engine';

/**
 * Quick start helper to create a new game
 */
import { GameEngine } from './engine';
import { CardFactory, CardDatabase, globalCardDatabase, globalCardFactory } from './cards';
import { PlayerSetup } from './game';
import { Race } from './types';
import { ALL_SAMPLE_CARDS, getSampleCardsByRace } from './data';
import { getHeroByRace } from './heroes';

/**
 * Initialize the card database with sample cards
 */
export function initializeSampleDatabase(): CardDatabase {
  globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);
  return globalCardDatabase;
}

/**
 * Create a sample deck for a race
 */
export function createSampleDeck(
  race: Race,
  playerId: string,
  cardFactory: CardFactory = globalCardFactory
): { cards: ReturnType<CardFactory['createInstance']>[], heroId: string } {
  const raceCards = getSampleCardsByRace(race);
  const neutralCards = getSampleCardsByRace(Race.NEUTRAL);

  // Build a 30-card deck
  const deckCardIds: string[] = [];

  // Add race cards (2 copies each, up to 15 unique)
  for (const card of raceCards.slice(0, 15)) {
    if (card.collectible) {
      deckCardIds.push(card.id);
      deckCardIds.push(card.id); // 2 copies
    }
  }

  // Fill with neutrals
  for (const card of neutralCards) {
    if (card.collectible && deckCardIds.length < 30) {
      deckCardIds.push(card.id);
      if (deckCardIds.length < 30) {
        deckCardIds.push(card.id); // 2 copies
      }
    }
  }

  // Trim to 30
  const finalDeckIds = deckCardIds.slice(0, 30);

  // Create card instances
  const cards = finalDeckIds.map(id =>
    cardFactory.createInstance(id, { ownerId: playerId })
  );

  // Get hero
  const hero = getHeroByRace(race);

  return {
    cards,
    heroId: hero?.id || '',
  };
}

/**
 * Quick start: Create a new game with two players
 */
export function quickStartGame(
  player1Race: Race = Race.COGSMITHS,
  player2Race: Race = Race.LUMINAR
): GameEngine {
  // Initialize database
  initializeSampleDatabase();

  // Create decks
  const p1Deck = createSampleDeck(player1Race, 'player1');
  const p2Deck = createSampleDeck(player2Race, 'player2');

  // Create player setups
  const player1: PlayerSetup = {
    id: 'player1',
    name: 'Player 1',
    race: player1Race,
    heroId: p1Deck.heroId,
    deck: p1Deck.cards,
  };

  const player2: PlayerSetup = {
    id: 'player2',
    name: 'Player 2',
    race: player2Race,
    heroId: p2Deck.heroId,
    deck: p2Deck.cards,
  };

  // Create and initialize engine
  const engine = new GameEngine();
  engine.initializeGame(player1, player2);

  return engine;
}

// Log initialization
console.log(`${ENGINE_NAME} v${VERSION} loaded`);

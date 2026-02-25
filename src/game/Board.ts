/**
 * STARFORGE TCG - Board State Management
 *
 * Manages the complete board state including both players'
 * zones, cards, and provides querying utilities.
 */

import { CardZone, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { BoardSizeLimit } from '../types/Player';
import type { PlayerState } from '../types/Player';
import { CombatKeyword } from '../types/Keywords';
import { DeckZone, HandZone, BoardZone, SimpleZone } from './Zone';

/**
 * Complete zone set for a single player
 */
export interface PlayerZones {
  deck: DeckZone;
  hand: HandZone;
  board: BoardZone;
  graveyard: SimpleZone;
  banished: SimpleZone;
}

/**
 * Board state for the entire game
 */
export class GameBoard {
  private playerZones: Map<string, PlayerZones> = new Map();
  private cardRegistry: Map<string, CardInstance> = new Map();

  constructor() {}

  /**
   * Initialize zones for a player
   */
  initializePlayer(playerId: string): void {
    if (this.playerZones.has(playerId)) {
      throw new Error(`Player ${playerId} already initialized`);
    }

    this.playerZones.set(playerId, {
      deck: new DeckZone(),
      hand: new HandZone(),
      board: new BoardZone(),
      graveyard: new SimpleZone(CardZone.GRAVEYARD),
      banished: new SimpleZone(CardZone.BANISHED),
    });
  }

  /**
   * Get zones for a player
   */
  getPlayerZones(playerId: string): PlayerZones {
    const zones = this.playerZones.get(playerId);
    if (!zones) {
      throw new Error(`Player ${playerId} not initialized`);
    }
    return zones;
  }

  /**
   * Register a card instance
   */
  registerCard(card: CardInstance): void {
    this.cardRegistry.set(card.instanceId, card);
  }

  /**
   * Register multiple cards
   */
  registerCards(cards: CardInstance[]): void {
    for (const card of cards) {
      this.registerCard(card);
    }
  }

  /**
   * Get a card instance by ID
   */
  getCard(instanceId: string): CardInstance | undefined {
    return this.cardRegistry.get(instanceId);
  }

  /**
   * Get a card instance, throw if not found
   */
  getCardOrThrow(instanceId: string): CardInstance {
    const card = this.cardRegistry.get(instanceId);
    if (!card) {
      throw new Error(`Card ${instanceId} not found`);
    }
    return card;
  }

  /**
   * Remove a card from registry
   */
  unregisterCard(instanceId: string): void {
    this.cardRegistry.delete(instanceId);
  }

  /**
   * Move a card between zones
   */
  moveCard(
    instanceId: string,
    fromPlayerId: string,
    toPlayerId: string,
    toZone: CardZone,
    position?: number
  ): void {
    // Guard: if moving to board and board is full, skip the move
    if (toZone === CardZone.BOARD && !this.hasBoardSpace(toPlayerId)) {
      return;
    }

    const card = this.getCardOrThrow(instanceId);
    const fromZones = this.getPlayerZones(fromPlayerId);
    const toZones = this.getPlayerZones(toPlayerId);

    // Remove from current zone
    this.removeFromZone(instanceId, fromPlayerId, card.zone);

    // Add to new zone
    const targetZone = this.getZone(toZones, toZone);
    targetZone.add(instanceId, position);

    // Update card state
    card.zone = toZone;
    card.controllerId = toPlayerId;
  }

  /**
   * Remove card from a specific zone
   */
  private removeFromZone(instanceId: string, playerId: string, zone: CardZone): void {
    const zones = this.getPlayerZones(playerId);
    const sourceZone = this.getZone(zones, zone);
    sourceZone.remove(instanceId);
  }

  /**
   * Get zone object by type
   */
  private getZone(zones: PlayerZones, zoneType: CardZone) {
    switch (zoneType) {
      case CardZone.DECK:
        return zones.deck;
      case CardZone.HAND:
        return zones.hand;
      case CardZone.BOARD:
        return zones.board;
      case CardZone.GRAVEYARD:
        return zones.graveyard;
      case CardZone.BANISHED:
        return zones.banished;
      default:
        throw new Error(`Unknown zone type: ${zoneType}`);
    }
  }

  /**
   * Get all cards on a player's board
   */
  getBoardCards(playerId: string): CardInstance[] {
    const zones = this.getPlayerZones(playerId);
    return zones.board.cards.map((id) => this.getCardOrThrow(id));
  }

  /**
   * Get all cards in a player's hand
   */
  getHandCards(playerId: string): CardInstance[] {
    const zones = this.getPlayerZones(playerId);
    return zones.hand.cards.map((id) => this.getCardOrThrow(id));
  }

  /**
   * Get minions that can be attacked (respecting GUARDIAN)
   */
  getAttackableTargets(attackingPlayerId: string, defendingPlayerId: string): CardInstance[] {
    const defenderBoard = this.getBoardCards(defendingPlayerId);

    // Check for GUARDIAN minions
    const guardians = defenderBoard.filter(
      (card) => hasKeyword(card, CombatKeyword.GUARDIAN) && !card.isCloaked
    );

    if (guardians.length > 0) {
      // Must attack guardians first
      return guardians;
    }

    // Can attack any non-cloaked minion
    return defenderBoard.filter((card) => !card.isCloaked);
  }

  /**
   * Check if hero can be attacked (no GUARDIAN minions)
   */
  canAttackHero(defendingPlayerId: string): boolean {
    const defenderBoard = this.getBoardCards(defendingPlayerId);
    const guardians = defenderBoard.filter(
      (card) => hasKeyword(card, CombatKeyword.GUARDIAN) && !card.isCloaked
    );
    return guardians.length === 0;
  }

  /**
   * Get all cards that can attack
   */
  getAttackers(playerId: string): CardInstance[] {
    const boardCards = this.getBoardCards(playerId);
    return boardCards.filter((card) => {
      // Must have attack
      if (!card.currentAttack || card.currentAttack <= 0) return false;

      // Check attack limits
      const maxAttacks = hasKeyword(card, CombatKeyword.DOUBLE_STRIKE) ? 2 : 1;
      if (card.attacksMadeThisTurn >= maxAttacks) return false;

      // Check summoning sickness
      if (card.summonedThisTurn) {
        // BLITZ can attack anything
        if (hasKeyword(card, CombatKeyword.BLITZ)) return true;
        // SWIFT can attack minions (handled elsewhere)
        if (hasKeyword(card, CombatKeyword.SWIFT)) return true;
        return false;
      }

      return true;
    });
  }

  /**
   * Get board count for a player
   */
  getBoardCount(playerId: string): number {
    return this.getPlayerZones(playerId).board.count;
  }

  /**
   * Check if board has space
   */
  hasBoardSpace(playerId: string): boolean {
    return this.getPlayerZones(playerId).board.availableSpace() > 0;
  }

  /**
   * Place a registered card directly onto a player's board (for summoned tokens).
   * The card must already be registered via registerCard().
   */
  moveCardDirectToBoard(playerId: string, instanceId: string): void {
    if (!this.hasBoardSpace(playerId)) return; // Guard: don't crash on full board
    const zones = this.getPlayerZones(playerId);
    const card = this.getCardOrThrow(instanceId);
    zones.board.add(instanceId);
    card.zone = CardZone.BOARD;
    card.controllerId = playerId;
  }

  /**
   * Get deck count for a player
   */
  getDeckCount(playerId: string): number {
    return this.getPlayerZones(playerId).deck.count;
  }

  /**
   * Check if deck is empty
   */
  isDeckEmpty(playerId: string): boolean {
    return this.getPlayerZones(playerId).deck.isEmpty();
  }

  /**
   * Get hand count for a player
   */
  getHandCount(playerId: string): number {
    return this.getPlayerZones(playerId).hand.count;
  }

  /**
   * Check if hand is full
   */
  isHandFull(playerId: string): boolean {
    return this.getPlayerZones(playerId).hand.isFull();
  }

  /**
   * Shuffle a player's deck
   */
  shuffleDeck(playerId: string, seed?: number): void {
    const deck = this.getPlayerZones(playerId).deck;
    if (seed !== undefined) {
      deck.shuffleSeeded(seed);
    } else {
      deck.shuffle();
    }
  }

  /**
   * Draw cards for a player
   */
  drawCards(playerId: string, count: number): { drawn: string[]; burned: string[] } {
    const zones = this.getPlayerZones(playerId);
    const drawn: string[] = [];
    const burned: string[] = [];

    for (let i = 0; i < count; i++) {
      const cardId = zones.deck.draw();
      if (!cardId) break; // Deck empty

      const card = this.getCardOrThrow(cardId);

      if (zones.hand.addWithLimit(cardId)) {
        card.zone = CardZone.HAND;
        drawn.push(cardId);
      } else {
        // Hand full - burn the card
        zones.graveyard.add(cardId);
        card.zone = CardZone.GRAVEYARD;
        burned.push(cardId);
      }
    }

    return { drawn, burned };
  }

  /**
   * Get all card instances
   */
  getAllCards(): CardInstance[] {
    return Array.from(this.cardRegistry.values());
  }

  /**
   * Get cards by zone and player
   */
  getCardsInZone(playerId: string, zone: CardZone): CardInstance[] {
    const zones = this.getPlayerZones(playerId);
    const zoneObj = this.getZone(zones, zone);
    return zoneObj.toArray().map((id) => this.getCardOrThrow(id));
  }

  /**
   * Clear all zones for a player
   */
  clearPlayer(playerId: string): void {
    const zones = this.getPlayerZones(playerId);
    zones.deck.clear();
    zones.hand.clear();
    zones.board.clear();
    zones.graveyard.clear();
    zones.banished.clear();
  }

  /**
   * Reset the entire board
   */
  reset(): void {
    this.playerZones.clear();
    this.cardRegistry.clear();
  }

  /**
   * Get summary of board state
   */
  getSummary(playerId: string): {
    deckCount: number;
    handCount: number;
    boardCount: number;
    graveyardCount: number;
    banishedCount: number;
  } {
    const zones = this.getPlayerZones(playerId);
    return {
      deckCount: zones.deck.count,
      handCount: zones.hand.count,
      boardCount: zones.board.count,
      graveyardCount: zones.graveyard.count,
      banishedCount: zones.banished.count,
    };
  }
}

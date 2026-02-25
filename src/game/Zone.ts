/**
 * STARFORGE TCG - Zone Management
 *
 * Manages card zones (deck, hand, board, graveyard, banished)
 * with proper ordering and querying capabilities.
 */

import { CardZone } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { BoardSizeLimit, HandSizeLimit } from '../types/Player';
import { shuffle, shuffleWithSeed } from '../utils/shuffle';

/**
 * Generic zone interface
 */
export interface IZone {
  readonly type: CardZone;
  readonly cards: string[];
  readonly count: number;
  add(cardId: string, position?: number): void;
  remove(cardId: string): boolean;
  has(cardId: string): boolean;
  clear(): void;
  toArray(): string[];
}

/**
 * Ordered zone (deck, graveyard) where position matters
 */
export class OrderedZone implements IZone {
  readonly type: CardZone;
  private _cards: string[] = [];

  constructor(type: CardZone) {
    this.type = type;
  }

  get cards(): string[] {
    return [...this._cards];
  }

  get count(): number {
    return this._cards.length;
  }

  /**
   * Add card to zone
   * @param cardId Card instance ID
   * @param position Index to insert at (default: end/bottom)
   */
  add(cardId: string, position?: number): void {
    if (position !== undefined && position >= 0 && position <= this._cards.length) {
      this._cards.splice(position, 0, cardId);
    } else {
      this._cards.push(cardId);
    }
  }

  /**
   * Add card to top (index 0)
   */
  addToTop(cardId: string): void {
    this._cards.unshift(cardId);
  }

  /**
   * Add card to bottom (end)
   */
  addToBottom(cardId: string): void {
    this._cards.push(cardId);
  }

  /**
   * Remove card from zone
   */
  remove(cardId: string): boolean {
    const index = this._cards.indexOf(cardId);
    if (index >= 0) {
      this._cards.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Remove and return top card
   */
  removeTop(): string | undefined {
    return this._cards.shift();
  }

  /**
   * Remove and return bottom card
   */
  removeBottom(): string | undefined {
    return this._cards.pop();
  }

  /**
   * Check if zone contains card
   */
  has(cardId: string): boolean {
    return this._cards.includes(cardId);
  }

  /**
   * Get card at position
   */
  getAt(position: number): string | undefined {
    return this._cards[position];
  }

  /**
   * Peek at top cards without removing
   */
  peek(count: number): string[] {
    return this._cards.slice(0, count);
  }

  /**
   * Shuffle the zone
   */
  shuffle(): void {
    shuffle(this._cards);
  }

  /**
   * Shuffle with seed for reproducibility
   */
  shuffleSeeded(seed: number): void {
    this._cards = shuffleWithSeed(this._cards, seed);
  }

  /**
   * Reorder cards (for SCRY)
   */
  reorder(newOrder: string[]): void {
    // Validate all cards exist
    if (newOrder.length !== this._cards.length) {
      throw new Error('Reorder must include all cards');
    }
    for (const cardId of newOrder) {
      if (!this._cards.includes(cardId)) {
        throw new Error(`Card ${cardId} not in zone`);
      }
    }
    this._cards = newOrder;
  }

  /**
   * Clear all cards from zone
   */
  clear(): void {
    this._cards = [];
  }

  /**
   * Get copy of cards array
   */
  toArray(): string[] {
    return [...this._cards];
  }

  /**
   * Get cards in reverse order (top to bottom)
   */
  toArrayReversed(): string[] {
    return [...this._cards].reverse();
  }

  /**
   * Check if zone is empty
   */
  isEmpty(): boolean {
    return this._cards.length === 0;
  }
}

/**
 * Hand zone with size limit
 */
export class HandZone extends OrderedZone {
  private readonly maxSize: number;

  constructor(maxSize: number = HandSizeLimit) {
    super(CardZone.HAND);
    this.maxSize = maxSize;
  }

  /**
   * Check if hand is full
   */
  isFull(): boolean {
    return this.count >= this.maxSize;
  }

  /**
   * Get available space in hand
   */
  availableSpace(): number {
    return Math.max(0, this.maxSize - this.count);
  }

  /**
   * Add card, respecting hand limit
   * Returns true if added, false if burned (hand full)
   */
  addWithLimit(cardId: string): boolean {
    if (this.isFull()) {
      return false; // Card is burned
    }
    this.add(cardId);
    return true;
  }
}

/**
 * Deck zone with draw functionality
 */
export class DeckZone extends OrderedZone {
  constructor() {
    super(CardZone.DECK);
  }

  /**
   * Draw from top of deck
   * Returns card ID or undefined if empty
   */
  draw(): string | undefined {
    return this.removeTop();
  }

  /**
   * Draw multiple cards
   */
  drawMultiple(count: number): string[] {
    const drawn: string[] = [];
    for (let i = 0; i < count; i++) {
      const card = this.draw();
      if (card) {
        drawn.push(card);
      } else {
        break; // Deck empty
      }
    }
    return drawn;
  }

  /**
   * Mill cards (discard from top)
   */
  mill(count: number): string[] {
    return this.drawMultiple(count);
  }
}

/**
 * Board zone with position-based slots
 */
export class BoardZone implements IZone {
  readonly type = CardZone.BOARD;
  private slots: (string | null)[];
  private readonly maxSlots: number;

  constructor(maxSlots: number = BoardSizeLimit) {
    this.maxSlots = maxSlots;
    this.slots = new Array(maxSlots).fill(null);
  }

  get cards(): string[] {
    return this.slots.filter((s): s is string => s !== null);
  }

  get count(): number {
    return this.cards.length;
  }

  /**
   * Get all slots (including nulls)
   */
  get allSlots(): (string | null)[] {
    return [...this.slots];
  }

  /**
   * Add card to specific position or first available
   */
  add(cardId: string, position?: number): void {
    if (position !== undefined && position >= 0 && position < this.maxSlots) {
      if (this.slots[position] === null) {
        this.slots[position] = cardId;
        return;
      }
    }

    // Find first empty slot
    const emptyIndex = this.slots.findIndex((s) => s === null);
    if (emptyIndex >= 0) {
      this.slots[emptyIndex] = cardId;
    } else {
      throw new Error('Board is full');
    }
  }

  /**
   * Remove card from board
   */
  remove(cardId: string): boolean {
    const index = this.slots.indexOf(cardId);
    if (index >= 0) {
      this.slots[index] = null;
      return true;
    }
    return false;
  }

  /**
   * Check if card is on board
   */
  has(cardId: string): boolean {
    return this.slots.includes(cardId);
  }

  /**
   * Get card at specific position
   */
  getAt(position: number): string | null {
    return this.slots[position] ?? null;
  }

  /**
   * Get position of a card
   */
  getPosition(cardId: string): number {
    return this.slots.indexOf(cardId);
  }

  /**
   * Check if board is full
   */
  isFull(): boolean {
    return this.count >= this.maxSlots;
  }

  /**
   * Get available space
   */
  availableSpace(): number {
    return this.maxSlots - this.count;
  }

  /**
   * Get first empty position
   */
  getFirstEmptyPosition(): number | null {
    const index = this.slots.findIndex((s) => s === null);
    return index >= 0 ? index : null;
  }

  /**
   * Get adjacent minions
   */
  getAdjacent(position: number): string[] {
    const adjacent: string[] = [];
    if (position > 0 && this.slots[position - 1]) {
      adjacent.push(this.slots[position - 1]!);
    }
    if (position < this.maxSlots - 1 && this.slots[position + 1]) {
      adjacent.push(this.slots[position + 1]!);
    }
    return adjacent;
  }

  /**
   * Clear the board
   */
  clear(): void {
    this.slots = new Array(this.maxSlots).fill(null);
  }

  /**
   * Get array of card IDs
   */
  toArray(): string[] {
    return this.cards;
  }

  /**
   * Compact board (remove gaps) - optional for some games
   */
  compact(): void {
    const cards = this.cards;
    this.clear();
    cards.forEach((card, i) => {
      this.slots[i] = card;
    });
  }
}

/**
 * Simple unordered zone (graveyard, banished)
 */
export class SimpleZone implements IZone {
  readonly type: CardZone;
  private _cards: string[] = [];

  constructor(type: CardZone) {
    this.type = type;
  }

  get cards(): string[] {
    return [...this._cards];
  }

  get count(): number {
    return this._cards.length;
  }

  add(cardId: string): void {
    this._cards.push(cardId);
  }

  remove(cardId: string): boolean {
    const index = this._cards.indexOf(cardId);
    if (index >= 0) {
      this._cards.splice(index, 1);
      return true;
    }
    return false;
  }

  has(cardId: string): boolean {
    return this._cards.includes(cardId);
  }

  clear(): void {
    this._cards = [];
  }

  toArray(): string[] {
    return [...this._cards];
  }

  /**
   * Get most recently added card
   */
  getLast(): string | undefined {
    return this._cards[this._cards.length - 1];
  }
}

/**
 * STARFORGE TCG - Death Processor
 *
 * Handles minion death, LAST_WORDS triggers, and death-related effects.
 */

import { CardZone, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { TriggerKeyword, OriginalKeyword } from '../types/Keywords';
import type { KeywordInstance } from '../types/Keywords';
import { GameStateManager } from '../game/GameState';
import { GameBoard } from '../game/Board';
import { EventEmitter } from '../events/EventEmitter';
import { GameEventType, createEvent } from '../events/GameEvent';
import type { CardEventData } from '../events/GameEvent';
import { EffectTrigger } from '../types/Effects';
import type { Effect } from '../types/Effects';
import { globalCardDatabase } from '../cards/CardDatabase';
import type { EffectResolver } from '../engine/EffectResolver';

/**
 * Death event for processing
 */
export interface DeathEvent {
  cardInstanceId: string;
  cardDefinitionId: string;
  ownerId: string;
  position: number;
  killedBy?: string;
  effects: Effect[];
  keywords: KeywordInstance[];
}

/**
 * Result of death processing
 */
export interface DeathProcessResult {
  /** Cards that died */
  deaths: DeathEvent[];
  /** Effects that triggered (LAST_WORDS, IMMOLATE, SALVAGE) */
  triggeredEffects: Effect[];
  /** Cards drawn from SALVAGE */
  cardsDrawn: string[];
  /** IMMOLATE damage dealt */
  immolateDamage: Map<string, number>;
}

/**
 * Death Processor class
 */
export class DeathProcessor {
  private gameState: GameStateManager;
  private board: GameBoard;
  private events: EventEmitter;
  private effectResolver: EffectResolver | null = null;

  constructor(gameState: GameStateManager) {
    this.gameState = gameState;
    this.board = gameState.getBoard();
    this.events = gameState.getEvents();
  }

  /**
   * Set the effect resolver (called after construction to avoid circular deps)
   */
  setEffectResolver(resolver: EffectResolver): void {
    this.effectResolver = resolver;
  }

  /**
   * Check for and collect dead minions
   */
  collectDeadMinions(playerId: string): DeathEvent[] {
    const boardCards = this.board.getBoardCards(playerId);
    const deaths: DeathEvent[] = [];

    for (const card of boardCards) {
      if (this.isMinimumDead(card)) {
        const zones = this.board.getPlayerZones(playerId);
        const position = zones.board.getPosition(card.instanceId);

        deaths.push({
          cardInstanceId: card.instanceId,
          cardDefinitionId: card.definitionId,
          ownerId: playerId,
          position,
          effects: [], // Will be populated based on card definition
          keywords: card.keywords,
        });
      }
    }

    return deaths;
  }

  /**
   * Check if a minion is dead
   */
  private isMinimumDead(card: CardInstance): boolean {
    return card.currentHealth !== undefined && card.currentHealth <= 0;
  }

  /**
   * Process all pending deaths
   */
  processDeaths(): DeathProcessResult {
    const result: DeathProcessResult = {
      deaths: [],
      triggeredEffects: [],
      cardsDrawn: [],
      immolateDamage: new Map(),
    };

    // Collect deaths from both players
    const players = Array.from(this.gameState.getState().players.keys());
    for (const playerId of players) {
      const deaths = this.collectDeadMinions(playerId);
      result.deaths.push(...deaths);
    }

    if (result.deaths.length === 0) {
      return result;
    }

    // Phase 1: Move ALL dead cards to graveyard and emit events FIRST.
    // This prevents reentrancy issues where EffectResolver calls processDeaths()
    // after each LAST_WORDS effect, which would re-collect minions still on the board.
    for (const death of result.deaths) {
      this.board.moveCard(
        death.cardInstanceId,
        death.ownerId,
        death.ownerId,
        CardZone.GRAVEYARD
      );

      this.emitEvent(GameEventType.CARD_DESTROYED, death.ownerId, {
        cardInstanceId: death.cardInstanceId,
        cardDefinitionId: death.cardDefinitionId,
        playerId: death.ownerId,
        fromZone: CardZone.BOARD,
        toZone: CardZone.GRAVEYARD,
        position: death.position,
      } as CardEventData);
    }

    // Phase 2: Process death triggers (LAST_WORDS, SALVAGE, IMMOLATE)
    for (const death of result.deaths) {
      // Process LAST_WORDS — look up definition effects and execute them
      if (this.hasKeywordInList(death.keywords, TriggerKeyword.LAST_WORDS)) {
        const cardDef = globalCardDatabase.getCard(death.cardDefinitionId);
        const lastRitesEffects = (cardDef?.effects || []).filter(
          (e: any) => e.trigger === EffectTrigger.ON_DEATH
        );
        result.triggeredEffects.push(...lastRitesEffects);

        // Execute LAST_WORDS effects via the resolver
        if (this.effectResolver && lastRitesEffects.length > 0) {
          this.effectResolver.resolveEffects(lastRitesEffects, {
            sourceCardId: death.cardInstanceId,
            sourceOwnerId: death.ownerId,
            triggerEvent: 'ON_DEATH',
          });
        }
      }

      // Process SALVAGE (draw a card)
      if (this.hasKeywordInList(death.keywords, OriginalKeyword.SALVAGE)) {
        const { drawn } = this.board.drawCards(death.ownerId, 1);
        result.cardsDrawn.push(...drawn);

        if (drawn.length > 0) {
          this.emitEvent(GameEventType.CARD_DRAWN, death.ownerId, {
            cardInstanceId: drawn[0],
            playerId: death.ownerId,
            fromZone: CardZone.DECK,
            toZone: CardZone.HAND,
          } as CardEventData);
        }
      }

      // Process IMMOLATE
      const immolateKeyword = death.keywords.find(
        (k) => k.keyword === OriginalKeyword.IMMOLATE
      );
      if (immolateKeyword && immolateKeyword.value) {
        const damage = immolateKeyword.value;
        // Deal damage to all enemy minions
        const opponentId = this.gameState.getOpponentId(death.ownerId);
        const enemyMinions = this.board.getBoardCards(opponentId);

        for (const enemy of enemyMinions) {
          if (enemy.currentHealth !== undefined) {
            enemy.currentHealth -= damage;
            const current = result.immolateDamage.get(enemy.instanceId) || 0;
            result.immolateDamage.set(enemy.instanceId, current + damage);
          }
        }
      }

      // Update player stats
      const player = this.gameState.getPlayer(death.ownerId);
      // Track friendly minion deaths (for various triggers)
    }

    // Recursively check for more deaths (from IMMOLATE, etc.)
    const additionalDeaths = this.processDeaths();
    result.deaths.push(...additionalDeaths.deaths);
    result.triggeredEffects.push(...additionalDeaths.triggeredEffects);
    result.cardsDrawn.push(...additionalDeaths.cardsDrawn);

    // Merge immolate damage
    for (const [id, damage] of additionalDeaths.immolateDamage) {
      const current = result.immolateDamage.get(id) || 0;
      result.immolateDamage.set(id, current + damage);
    }

    return result;
  }

  /**
   * Destroy a minion directly (not from damage)
   */
  destroyMinion(cardInstanceId: string, source?: string): DeathEvent | null {
    const card = this.board.getCard(cardInstanceId);
    if (!card || card.zone !== CardZone.BOARD) {
      return null;
    }

    // Set health to 0 to mark for death processing
    if (card.currentHealth !== undefined) {
      card.currentHealth = 0;
    }

    const zones = this.board.getPlayerZones(card.controllerId);
    const position = zones.board.getPosition(cardInstanceId);

    return {
      cardInstanceId,
      cardDefinitionId: card.definitionId,
      ownerId: card.controllerId,
      position,
      killedBy: source,
      effects: [],
      keywords: card.keywords,
    };
  }

  /**
   * Banish a minion (remove from game, no LAST_WORDS)
   */
  banishMinion(cardInstanceId: string): boolean {
    const card = this.board.getCard(cardInstanceId);
    if (!card || card.zone !== CardZone.BOARD) {
      return false;
    }

    const ownerId = card.controllerId;

    // Move directly to banished zone (skips LAST_WORDS)
    this.board.moveCard(cardInstanceId, ownerId, ownerId, CardZone.BANISHED);

    this.emitEvent(GameEventType.CARD_BANISHED, ownerId, {
      cardInstanceId,
      cardDefinitionId: card.definitionId,
      playerId: ownerId,
      fromZone: CardZone.BOARD,
      toZone: CardZone.BANISHED,
    } as CardEventData);

    return true;
  }

  /**
   * Check for keyword in list
   */
  private hasKeywordInList(keywords: KeywordInstance[], keyword: string): boolean {
    return keywords.some((k) => k.keyword === keyword);
  }

  /**
   * Helper to emit events
   */
  private emitEvent(
    type: GameEventType,
    playerId: string | undefined,
    data: object
  ): void {
    const state = this.gameState.getState();
    const event = createEvent(type, state.id, state.turn, playerId, data as Record<string, unknown>);
    this.events.emit(event);
  }
}

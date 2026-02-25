/**
 * STARFORGE TCG - Game Engine
 *
 * Main orchestrator that coordinates all game systems:
 * - Game state management
 * - Turn flow
 * - Action processing
 * - Combat resolution
 * - Effect execution
 */

import {
  GamePhase,
  GameStatus,
  DefaultGameConfig,
  ActionType,
} from '../types/Game';
import type {
  GameState,
  GameConfig,
  GameAction,
  PlayCardData,
  AttackData,
  HeroPowerData,
  MulliganData,
} from '../types/Game';
import { CardZone, CardType, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { canAffordCard, hasBoardSpace } from '../types/Player';
import type { PlayerState } from '../types/Player';
import { CombatKeyword, TriggerKeyword } from '../types/Keywords';
import { GameStateManager, PlayerSetup } from '../game/GameState';
import { CombatResolver } from '../combat/CombatResolver';
import { DeathProcessor } from '../combat/DeathProcessor';
import { EventEmitter } from '../events/EventEmitter';
import { GameEventType, createEvent, CardEventData } from '../events/GameEvent';
import { CardFactory, globalCardFactory } from '../cards/CardFactory';
import { CardDatabase, globalCardDatabase } from '../cards/CardDatabase';
import { EffectResolver } from './EffectResolver';
import type { EffectContext } from './EffectResolver';
import { EffectTrigger } from '../types/Effects';
import { getHeroById } from '../heroes';

/**
 * Action validation result
 */
export interface ActionValidation {
  valid: boolean;
  error?: string;
}

/**
 * Action result
 */
export interface ActionResult {
  success: boolean;
  error?: string;
  events: string[];
}

/**
 * Game Engine class
 */
export class GameEngine {
  private stateManager: GameStateManager;
  private combatResolver: CombatResolver;
  private deathProcessor: DeathProcessor;
  private effectResolver: EffectResolver;
  private cardFactory: CardFactory;
  private cardDatabase: CardDatabase;

  constructor(
    config: GameConfig = DefaultGameConfig,
    cardDatabase: CardDatabase = globalCardDatabase,
    cardFactory: CardFactory = globalCardFactory
  ) {
    this.stateManager = new GameStateManager(config);
    this.combatResolver = new CombatResolver(this.stateManager);
    this.deathProcessor = new DeathProcessor(this.stateManager);
    this.effectResolver = new EffectResolver(this.stateManager, this.combatResolver, this.deathProcessor);
    this.cardFactory = cardFactory;
    this.cardDatabase = cardDatabase;
    // Give DeathProcessor access to effect resolver for LAST_WORDS
    this.deathProcessor.setEffectResolver(this.effectResolver);
  }

  /**
   * Initialize a new game
   */
  initializeGame(player1: PlayerSetup, player2: PlayerSetup): void {
    this.stateManager.initializeGame(player1, player2);
  }

  /**
   * Get current game state
   */
  getState(): Readonly<GameState> {
    return this.stateManager.getState();
  }

  /**
   * Get event emitter for subscribing
   */
  getEvents(): EventEmitter {
    return this.stateManager.getEvents();
  }

  /**
   * Process a game action
   */
  processAction(action: GameAction): ActionResult {
    // Validate action
    const validation = this.validateAction(action);
    if (!validation.valid) {
      return { success: false, error: validation.error, events: [] };
    }

    // Record action
    this.stateManager.recordAction(action);

    // Process based on type
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return this.processPlayCard(action);
      case ActionType.ATTACK:
        return this.processAttack(action);
      case ActionType.HERO_POWER:
        return this.processHeroPower(action);
      case ActionType.END_TURN:
        return this.processEndTurn(action);
      case ActionType.MULLIGAN:
        return this.processMulligan(action);
      case ActionType.CONCEDE:
        return this.processConcede(action);
      default:
        return { success: false, error: 'Unknown action type', events: [] };
    }
  }

  /**
   * Validate an action
   */
  validateAction(action: GameAction): ActionValidation {
    const state = this.stateManager.getState();

    // Check game is active
    if (state.status !== GameStatus.ACTIVE) {
      return { valid: false, error: 'Game is not active' };
    }

    // Check it's the player's turn (except for CONCEDE and MULLIGAN)
    if (action.type !== ActionType.CONCEDE && action.type !== ActionType.MULLIGAN) {
      if (state.activePlayerId !== action.playerId) {
        return { valid: false, error: 'Not your turn' };
      }
    }

    // Check phase
    if (action.type === ActionType.MULLIGAN && state.phase !== GamePhase.MULLIGAN) {
      return { valid: false, error: 'Not in mulligan phase' };
    }

    if (
      (action.type === ActionType.PLAY_CARD ||
        action.type === ActionType.ATTACK ||
        action.type === ActionType.HERO_POWER) &&
      state.phase !== GamePhase.MAIN
    ) {
      return { valid: false, error: 'Not in main phase' };
    }

    // Type-specific validation
    switch (action.type) {
      case ActionType.PLAY_CARD:
        return this.validatePlayCard(action);
      case ActionType.ATTACK:
        return this.validateAttack(action);
      case ActionType.HERO_POWER:
        return this.validateHeroPower(action);
      default:
        return { valid: true };
    }
  }

  /**
   * Validate playing a card
   */
  private validatePlayCard(action: GameAction): ActionValidation {
    const data = action.data as PlayCardData;
    const player = this.stateManager.getPlayer(action.playerId);
    const board = this.stateManager.getBoard();

    // Check card is in hand
    const hand = board.getHandCards(action.playerId);
    const card = hand.find((c) => c.instanceId === data.cardInstanceId);

    if (!card) {
      return { valid: false, error: 'Card not in hand' };
    }

    // Check can afford
    if (!canAffordCard(player, card.currentCost)) {
      return { valid: false, error: 'Not enough crystals' };
    }

    // Check board space for minions
    const definition = this.cardDatabase.getCard(card.definitionId);
    if (definition?.type === CardType.MINION) {
      if (!hasBoardSpace(player)) {
        return { valid: false, error: 'Board is full' };
      }
    }

    return { valid: true };
  }

  /**
   * Validate an attack
   */
  private validateAttack(action: GameAction): ActionValidation {
    const data = action.data as AttackData;
    return this.combatResolver.validateAttack(
      data.attackerId,
      data.defenderId,
      action.playerId
    );
  }

  /**
   * Validate hero power use
   */
  private validateHeroPower(action: GameAction): ActionValidation {
    const player = this.stateManager.getPlayer(action.playerId);

    if (player.hero.heroPowerUsedThisTurn) {
      return { valid: false, error: 'Hero power already used this turn' };
    }

    // Hero power costs 2
    if (!canAffordCard(player, 2)) {
      return { valid: false, error: 'Not enough crystals for hero power' };
    }

    return { valid: true };
  }

  /**
   * Process playing a card
   */
  private processPlayCard(action: GameAction): ActionResult {
    const data = action.data as PlayCardData;
    const player = this.stateManager.getPlayer(action.playerId);
    const board = this.stateManager.getBoard();
    const card = this.stateManager.getCard(data.cardInstanceId);
    const definition = this.cardDatabase.getCardOrThrow(card.definitionId);

    // Spend crystals
    player.crystals.current -= card.currentCost;
    player.cardsPlayedThisTurn++;

    // Emit card played event
    this.emitEvent(GameEventType.CARD_PLAYED, action.playerId, {
      cardInstanceId: data.cardInstanceId,
      cardDefinitionId: card.definitionId,
      playerId: action.playerId,
      position: data.position,
      targetId: data.targetId,
      fromZone: CardZone.HAND,
    } as CardEventData);

    // Handle based on card type
    if (definition.type === CardType.MINION) {
      // Move to board
      board.moveCard(
        data.cardInstanceId,
        action.playerId,
        action.playerId,
        CardZone.BOARD,
        data.position
      );

      // Set summoned flag
      card.summonedThisTurn = true;
      card.turnPlayed = this.stateManager.getCurrentTurn();

      // Process DEPLOY effects
      if (hasKeyword(card, TriggerKeyword.DEPLOY)) {
        const deployEffects = definition.effects.filter(
          (e: any) => e.trigger === EffectTrigger.ON_PLAY || e.trigger === EffectTrigger.ON_ENTER
        );
        if (deployEffects.length > 0) {
          this.effectResolver.resolveEffects(deployEffects, {
            sourceCardId: card.instanceId,
            sourceOwnerId: action.playerId,
            targetId: data.targetId,
            triggerEvent: 'ON_PLAY',
          });
        }
      }

      this.emitEvent(GameEventType.CARD_SUMMONED, action.playerId, {
        cardInstanceId: data.cardInstanceId,
        cardDefinitionId: card.definitionId,
        playerId: action.playerId,
        position: data.position,
      } as CardEventData);

      player.minionsSummoned++;
    } else if (definition.type === CardType.SPELL) {
      // Spells go to graveyard after resolving
      player.spellsCastThisTurn++;

      // Process spell effects
      const spellEffects = definition.effects.filter(
        (e: any) => e.trigger === EffectTrigger.ON_PLAY
      );
      if (spellEffects.length > 0) {
        this.effectResolver.resolveEffects(spellEffects, {
          sourceCardId: card.instanceId,
          sourceOwnerId: action.playerId,
          targetId: data.targetId,
          triggerEvent: 'ON_PLAY',
        });
      }

      // Move to graveyard
      board.moveCard(
        data.cardInstanceId,
        action.playerId,
        action.playerId,
        CardZone.GRAVEYARD
      );
    }

    // Process deaths if any minions died
    this.deathProcessor.processDeaths();

    // Check game end
    this.checkGameEnd();

    return { success: true, events: [] };
  }

  /**
   * Process an attack
   */
  private processAttack(action: GameAction): ActionResult {
    const data = action.data as AttackData;

    const result = this.combatResolver.resolveAttack(
      data.attackerId,
      data.defenderId,
      action.playerId
    );

    if (!result.success) {
      return { success: false, error: result.error, events: [] };
    }

    // Process deaths
    this.deathProcessor.processDeaths();

    // Check game end
    this.checkGameEnd();

    return { success: true, events: [] };
  }

  /**
   * Process hero power use
   */
  private processHeroPower(action: GameAction): ActionResult {
    const data = action.data as HeroPowerData;
    const player = this.stateManager.getPlayer(action.playerId);

    // Spend crystals
    player.crystals.current -= 2;
    player.hero.heroPowerUsedThisTurn = true;

    this.emitEvent(GameEventType.HERO_POWER_USED, action.playerId, {
      playerId: action.playerId,
      targetId: data.targetId,
    });

    // Process hero power effects
    const heroDefinition = getHeroById(player.hero.definitionId);
    if (heroDefinition && heroDefinition.heroPower.effects.length > 0) {
      this.effectResolver.resolveEffects(heroDefinition.heroPower.effects, {
        sourceCardId: heroDefinition.heroPower.id,
        sourceOwnerId: action.playerId,
        targetId: data.targetId,
        triggerEvent: 'ACTIVATED',
      });
    }

    // Process deaths
    this.deathProcessor.processDeaths();

    // Check game end
    this.checkGameEnd();

    return { success: true, events: [] };
  }

  /**
   * Process end turn
   */
  private processEndTurn(action: GameAction): ActionResult {
    this.stateManager.endTurn();
    return { success: true, events: [] };
  }

  /**
   * Process mulligan
   */
  private processMulligan(action: GameAction): ActionResult {
    const data = action.data as MulliganData;
    const board = this.stateManager.getBoard();
    const zones = board.getPlayerZones(action.playerId);

    // Return selected cards to deck
    for (const cardId of data.cardIds) {
      const card = this.stateManager.getCard(cardId);
      board.moveCard(cardId, action.playerId, action.playerId, CardZone.DECK);
    }

    // Shuffle deck
    board.shuffleDeck(action.playerId);

    // Draw same number of cards
    board.drawCards(action.playerId, data.cardIds.length);

    return { success: true, events: [] };
  }

  /**
   * Process concede
   */
  private processConcede(action: GameAction): ActionResult {
    this.stateManager.concede(action.playerId);
    return { success: true, events: [] };
  }

  /**
   * Start the game (after mulligan)
   */
  startGame(): void {
    const state = this.stateManager.getState();

    // Draw initial hands
    const players = Array.from(state.players.keys());
    const board = this.stateManager.getBoard();

    // First player draws 3, second player draws 4
    const firstPlayer = state.activePlayerId;
    const secondPlayer = players.find((p) => p !== firstPlayer)!;

    board.drawCards(firstPlayer, 3);
    board.drawCards(secondPlayer, 4);

    // Start first turn
    this.stateManager.startTurn(firstPlayer);
    this.stateManager.setPhase(GamePhase.MAIN);
  }

  /**
   * Check for game end conditions
   */
  private checkGameEnd(): void {
    const result = this.stateManager.checkGameEnd();
    if (result.isOver) {
      this.stateManager.endGame(result.winnerId, result.reason);
    }
  }

  /**
   * Draw a card for a player
   */
  drawCard(playerId: string): { drawn: string | null; burned: boolean } {
    const board = this.stateManager.getBoard();
    const player = this.stateManager.getPlayer(playerId);

    // Check deck empty
    if (board.isDeckEmpty(playerId)) {
      // Fatigue damage
      player.fatigueDamage++;
      this.stateManager.damageHero(playerId, player.fatigueDamage);

      this.emitEvent(GameEventType.FATIGUE_DAMAGE, playerId, {
        playerId,
        damage: player.fatigueDamage,
      });

      this.checkGameEnd();
      return { drawn: null, burned: false };
    }

    const { drawn, burned } = board.drawCards(playerId, 1);

    if (drawn.length > 0) {
      player.cardsDrawnThisTurn++;
      return { drawn: drawn[0], burned: false };
    }

    if (burned.length > 0) {
      return { drawn: burned[0], burned: true };
    }

    return { drawn: null, burned: false };
  }

  /**
   * Helper to emit events
   */
  private emitEvent(
    type: GameEventType,
    playerId: string | undefined,
    data: object
  ): void {
    const state = this.stateManager.getState();
    const event = createEvent(type, state.id, state.turn, playerId, data as Record<string, unknown>);
    this.stateManager.getEvents().emit(event);
  }

  /**
   * Get game state manager for direct access
   */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }

  /**
   * Get combat resolver
   */
  getCombatResolver(): CombatResolver {
    return this.combatResolver;
  }

  /**
   * Get death processor
   */
  getDeathProcessor(): DeathProcessor {
    return this.deathProcessor;
  }
}

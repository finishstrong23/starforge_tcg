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
  ActivateStarforgeData,
} from '../types/Game';
import { CardZone, CardType, CardRarity, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { canAffordCard } from '../types/Player';
import type { PlayerState } from '../types/Player';
import { CombatKeyword, TriggerKeyword, OriginalKeyword } from '../types/Keywords';
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
      case ActionType.ACTIVATE_STARFORGE:
        return this.processStarforge(action);
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
        action.type === ActionType.HERO_POWER ||
        action.type === ActionType.ACTIVATE_STARFORGE) &&
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
      case ActionType.ACTIVATE_STARFORGE:
        return this.validateStarforge(action);
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

    // Check board space for minions and structures (use Board zones, not stale PlayerState)
    const definition = this.cardDatabase.getCard(card.definitionId);
    if (definition?.type === CardType.MINION || definition?.type === CardType.STRUCTURE) {
      if (!board.hasBoardSpace(action.playerId)) {
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
    if (definition.type === CardType.MINION || definition.type === CardType.STRUCTURE) {
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

      // UPGRADE: if the card has UPGRADE(X), auto-spend extra crystals for bonus
      this.processUpgrade(card, definition, player, action.playerId);

      // ECHO: create a copy in hand that vanishes at end of turn
      this.processEchoCopy(card, action.playerId);

      // SWARM: recalculate for board change
      this.effectResolver.recalculateSwarm(action.playerId);
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

      // RESONATE: fire ON_SPELL_CAST triggers on all friendly minions
      this.processSpellCastTriggers(action.playerId);
    }

    // Process deaths if any minions died + recalculate SWARM
    this.processDeathsAndRecalculate();

    // Check game end
    this.checkGameEnd();

    return { success: true, events: [] };
  }

  /**
   * Process an attack
   */
  private processAttack(action: GameAction): ActionResult {
    const data = action.data as AttackData;

    // Fire ON_ATTACK effects on the attacker before combat resolves
    const attacker = this.stateManager.getCard(data.attackerId);
    if (attacker && !attacker.isSilenced) {
      const attackerDef = this.cardDatabase.getCard(attacker.definitionId);
      if (attackerDef) {
        const onAttackEffects = attackerDef.effects.filter(
          (e: any) => e.trigger === EffectTrigger.ON_ATTACK
        );
        if (onAttackEffects.length > 0) {
          this.effectResolver.resolveEffects(onAttackEffects, {
            sourceCardId: attacker.instanceId,
            sourceOwnerId: action.playerId,
            targetId: data.defenderId,
            triggerEvent: 'ON_ATTACK',
          });
        }
      }
    }

    const result = this.combatResolver.resolveAttack(
      data.attackerId,
      data.defenderId,
      action.playerId
    );

    if (!result.success) {
      return { success: false, error: result.error, events: [] };
    }

    // Process deaths + recalculate SWARM
    this.processDeathsAndRecalculate();

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

    // Process deaths + recalculate SWARM
    this.processDeathsAndRecalculate();

    // Check game end
    this.checkGameEnd();

    return { success: true, events: [] };
  }

  /**
   * Process end turn
   */
  private processEndTurn(action: GameAction): ActionResult {
    // Fire ON_TURN_END effects before the turn actually ends
    this.processTurnTriggers(action.playerId, EffectTrigger.ON_TURN_END);
    this.processDeathsAndRecalculate();
    this.checkGameEnd();

    // Clear temporary buffs from the ending player's board
    this.effectResolver.clearTemporaryBuffs(action.playerId);

    this.stateManager.endTurn();

    // Fire ON_TURN_START effects for the new active player
    const newActivePlayer = this.stateManager.getActivePlayerId();
    this.processTurnTriggers(newActivePlayer, EffectTrigger.ON_TURN_START);
    this.processDeathsAndRecalculate();
    this.checkGameEnd();

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

  // ─── STARFORGE ASCENSION ─────────────────────────────────────────────
  // The most powerful play in any TCG: sacrifice ALL your mana this turn
  // AND your entire next turn's mana to ascend a Legendary minion into
  // an unstoppable force. 2x stats, BARRIER, bonus keyword, immediate
  // attack, and permanent silence immunity. High risk, godlike reward.
  // ─────────────────────────────────────────────────────────────────────

  /** Minimum crystals required to activate STARFORGE */
  private static readonly STARFORGE_MIN_COST = 5;

  /**
   * Validate STARFORGE activation
   */
  private validateStarforge(action: GameAction): ActionValidation {
    const data = action.data as ActivateStarforgeData;
    const player = this.stateManager.getPlayer(action.playerId);
    const board = this.stateManager.getBoard();

    // Find the card on the board
    const boardCards = board.getBoardCards(action.playerId);
    const card = boardCards.find((c) => c.instanceId === data.cardInstanceId);

    if (!card) {
      return { valid: false, error: 'Card not on your board' };
    }

    // Must be a legendary minion
    const definition = this.cardDatabase.getCard(card.definitionId);
    if (!definition || definition.rarity !== CardRarity.LEGENDARY) {
      return { valid: false, error: 'Only Legendary minions can be Starforged' };
    }

    if (definition.type !== CardType.MINION) {
      return { valid: false, error: 'Only minions can be Starforged' };
    }

    // Must not already be forged
    if (card.isForged) {
      return { valid: false, error: 'This minion has already ascended' };
    }

    // Must have at least STARFORGE_MIN_COST crystals available
    const availableMana = player.crystals.current + player.crystals.temporary;
    if (availableMana < GameEngine.STARFORGE_MIN_COST) {
      return { valid: false, error: `Not enough crystals (need at least ${GameEngine.STARFORGE_MIN_COST})` };
    }

    return { valid: true };
  }

  /**
   * Determine the bonus keyword granted based on existing keywords.
   * Each legendary gets a synergistic power boost.
   */
  private getStarforgeBonusKeyword(card: CardInstance): CombatKeyword {
    const has = (kw: string) => card.keywords.some(k => k.keyword === kw);

    if (has(CombatKeyword.GUARDIAN))       return CombatKeyword.DRAIN;         // Unkillable tank
    if (has(CombatKeyword.DRAIN))          return CombatKeyword.DOUBLE_STRIKE; // Massive lifesteal
    if (has(CombatKeyword.LETHAL))         return CombatKeyword.CLOAK;         // Invisible assassin
    if (has(CombatKeyword.CLOAK))          return CombatKeyword.DOUBLE_STRIKE; // Sneaky double damage
    if (has(CombatKeyword.SWIFT))          return CombatKeyword.LETHAL;        // Instant killer
    if (has(CombatKeyword.BLITZ))          return CombatKeyword.LETHAL;        // Unstoppable force
    if (has(CombatKeyword.DOUBLE_STRIKE))  return CombatKeyword.DRAIN;         // Double drain
    if (has(CombatKeyword.BARRIER))        return CombatKeyword.DOUBLE_STRIKE; // Protected powerhouse
    return CombatKeyword.DOUBLE_STRIKE; // Default: raw power
  }

  /**
   * Process STARFORGE ASCENSION
   *
   * Cost:   ALL current mana + overload ALL crystals next turn
   * Effect: 2x Attack, 2x Health, BARRIER, bonus keyword,
   *         immediate attack reset, silence immunity (via isForged)
   */
  private processStarforge(action: GameAction): ActionResult {
    const data = action.data as ActivateStarforgeData;
    const player = this.stateManager.getPlayer(action.playerId);
    const card = this.stateManager.getCard(data.cardInstanceId);

    // === COST: Drain ALL mana + overload full pool next turn ===
    player.crystals.current = 0;
    player.crystals.temporary = 0;
    // Overload = maximum+1 (they gain 1 crystal next turn, so this locks all of it)
    player.crystals.overloaded = player.crystals.maximum + 1;

    // === STAT DOUBLING ===
    if (card.currentAttack !== undefined) {
      card.currentAttack *= 2;
    }
    if (card.currentHealth !== undefined && card.maxHealth !== undefined) {
      card.maxHealth *= 2;
      card.currentHealth *= 2;
    }

    // === GRANT BARRIER ===
    if (!card.keywords.some(k => k.keyword === CombatKeyword.BARRIER)) {
      card.keywords.push({ keyword: CombatKeyword.BARRIER });
    }
    card.hasBarrier = true;

    // === GRANT BONUS KEYWORD ===
    const bonusKeyword = this.getStarforgeBonusKeyword(card);
    if (!card.keywords.some(k => k.keyword === bonusKeyword)) {
      card.keywords.push({ keyword: bonusKeyword });
    }

    // === GRANT BLITZ (immediate attack) ===
    if (!card.keywords.some(k => k.keyword === CombatKeyword.BLITZ)) {
      card.keywords.push({ keyword: CombatKeyword.BLITZ });
    }
    card.hasAttackedThisTurn = false;
    card.attacksMadeThisTurn = 0;
    card.summonedThisTurn = false;

    // === MARK AS STARFORGED (grants silence immunity via hasKeyword) ===
    card.isForged = true;

    // Emit STARFORGED event
    this.emitEvent(GameEventType.CARD_PLAYED, action.playerId, {
      cardInstanceId: data.cardInstanceId,
      cardDefinitionId: card.definitionId,
      playerId: action.playerId,
    } as CardEventData);

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
   * Process deaths and recalculate SWARM for both players
   */
  private processDeathsAndRecalculate(): void {
    this.deathProcessor.processDeaths();
    const state = this.stateManager.getState();
    for (const playerId of state.players.keys()) {
      this.effectResolver.recalculateSwarm(playerId);
    }
  }

  // ─── TRIGGER PROCESSING ────────────────────────────────────────────

  /**
   * Scan the board for minions with a given trigger and fire their effects.
   * Used for ON_TURN_START, ON_TURN_END, ON_SPELL_CAST, ON_HEAL, ON_ATTACK.
   */
  private processTurnTriggers(playerId: string, trigger: EffectTrigger): void {
    const board = this.stateManager.getBoard();
    const boardCards = board.getBoardCards(playerId);

    for (const card of boardCards) {
      if (card.isSilenced && !card.isForged) continue;

      const definition = this.cardDatabase.getCard(card.definitionId);
      if (!definition) continue;

      const triggerEffects = definition.effects.filter(
        (e: any) => e.trigger === trigger
      );
      if (triggerEffects.length > 0) {
        this.effectResolver.resolveEffects(triggerEffects, {
          sourceCardId: card.instanceId,
          sourceOwnerId: playerId,
          triggerEvent: trigger,
        });
      }
    }
  }

  /**
   * Process UPGRADE keyword: if the player has enough crystals, spend extra and fire bonus effects
   */
  private processUpgrade(card: CardInstance, definition: any, player: PlayerState, playerId: string): void {
    if (!hasKeyword(card, OriginalKeyword.UPGRADE)) return;

    // Find the UPGRADE keyword value (the extra cost)
    const upgradeKw = card.keywords.find(k => k.keyword === OriginalKeyword.UPGRADE);
    const upgradeCost = upgradeKw?.value ?? 0;
    if (upgradeCost <= 0) return;

    // Check if the player can afford the upgrade
    if (player.crystals.current < upgradeCost) return;

    // Spend the extra crystals
    player.crystals.current -= upgradeCost;

    // Fire ACTIVATED effects (the upgrade bonus)
    const upgradeEffects = definition.effects.filter(
      (e: any) => e.trigger === EffectTrigger.ACTIVATED
    );
    if (upgradeEffects.length > 0) {
      this.effectResolver.resolveEffects(upgradeEffects, {
        sourceCardId: card.instanceId,
        sourceOwnerId: playerId,
        triggerEvent: 'ACTIVATED',
      });
    }
  }

  /**
   * Fire ON_SPELL_CAST triggers on all friendly minions (for RESONATE keyword)
   */
  private processSpellCastTriggers(playerId: string): void {
    const board = this.stateManager.getBoard();
    const boardCards = board.getBoardCards(playerId);

    for (const card of boardCards) {
      if (card.isSilenced && !card.isForged) continue;

      const definition = this.cardDatabase.getCard(card.definitionId);
      if (!definition) continue;

      const spellTriggers = definition.effects.filter(
        (e: any) => e.trigger === EffectTrigger.ON_SPELL_CAST
      );
      if (spellTriggers.length > 0) {
        this.effectResolver.resolveEffects(spellTriggers, {
          sourceCardId: card.instanceId,
          sourceOwnerId: playerId,
          triggerEvent: 'ON_SPELL_CAST',
        });
      }
    }
  }

  /**
   * Create an ECHO copy in hand when an ECHO card is played
   */
  private processEchoCopy(card: CardInstance, playerId: string): void {
    if (!hasKeyword(card, OriginalKeyword.ECHO)) return;

    const board = this.stateManager.getBoard();
    if (board.isHandFull(playerId)) return;

    const definition = this.cardDatabase.getCard(card.definitionId);
    if (!definition) return;

    const echoCopy: CardInstance = {
      instanceId: `echo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      definitionId: card.definitionId,
      ownerId: playerId,
      controllerId: playerId,
      zone: CardZone.HAND,
      currentCost: definition.cost,
      currentAttack: definition.attack,
      currentHealth: definition.health,
      maxHealth: definition.health,
      keywords: definition.keywords ? [...definition.keywords] : [],
      enchantments: [],
      temporaryBuffs: [],
      permanentBuffs: [],
      isSilenced: false,
      hasBarrier: false,
      isCloaked: false,
      isForged: false,
      isEchoInstance: true,
      hasAttackedThisTurn: false,
      attacksMadeThisTurn: 0,
      summonedThisTurn: false,
    };

    board.registerCard(echoCopy);
    const state = this.stateManager.getState();
    (state.cards as Map<string, CardInstance>).set(echoCopy.instanceId, echoCopy);
    const zones = board.getPlayerZones(playerId);
    zones.hand.add(echoCopy.instanceId);
    echoCopy.zone = CardZone.HAND;

    this.emitEvent(GameEventType.ECHO_COPY_CREATED, playerId, {
      cardInstanceId: echoCopy.instanceId,
      cardDefinitionId: card.definitionId,
      playerId,
    } as CardEventData);
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
   * Get the minimum STARFORGE cost (for AI and UI)
   */
  static getStarforgeCost(): number {
    return GameEngine.STARFORGE_MIN_COST;
  }

  /**
   * Check which board minions can be Starforged by a player
   */
  getStarforgeTargets(playerId: string): CardInstance[] {
    const player = this.stateManager.getPlayer(playerId);
    const available = player.crystals.current + player.crystals.temporary;
    if (available < GameEngine.STARFORGE_MIN_COST) return [];

    const board = this.stateManager.getBoard();
    return board.getBoardCards(playerId).filter((card) => {
      if (card.isForged) return false;
      const def = this.cardDatabase.getCard(card.definitionId);
      return def?.rarity === CardRarity.LEGENDARY && def?.type === CardType.MINION;
    });
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

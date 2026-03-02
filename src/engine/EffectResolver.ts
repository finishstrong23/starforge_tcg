/**
 * STARFORGE TCG - Effect Resolver
 *
 * Executes card effects (spells, DEPLOY, LAST_WORDS, hero powers).
 * Maps the Effect type system from Effects.ts to actual game state mutations.
 */

import {
  EffectType,
  EffectTrigger,
  TargetType,
} from '../types/Effects';
import type {
  Effect,
  TargetFilter,
  DamageEffectData,
  HealEffectData,
  BuffEffectData,
  DrawEffectData,
  SummonEffectData,
  GrantKeywordData,
  GenericEffectData,
  TransformData,
  ModifyCostData,
  GainCrystalsData,
  AdaptData,
  ScryData,
} from '../types/Effects';
import { CardZone, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { CardType } from '../types/Card';
import { OriginalKeyword, CombatKeyword, AdaptOption, AllAdaptOptions } from '../types/Keywords';
import { GameStateManager } from '../game/GameState';
import type { GameBoard } from '../game/Board';
import { CombatResolver } from '../combat/CombatResolver';
import { DeathProcessor } from '../combat/DeathProcessor';
import { globalCardDatabase } from '../cards/CardDatabase';
import { GameEventType, createEvent } from '../events/GameEvent';

/**
 * Context for effect resolution — who triggered it and how
 */
export interface EffectContext {
  /** The card whose effect is triggering */
  sourceCardId: string;
  /** The player who owns the source card */
  sourceOwnerId: string;
  /** Player-chosen target (for CHOSEN targeting) */
  targetId?: string;
  /** What triggered this effect */
  triggerEvent?: string;
}

/**
 * Effect Resolver — the bridge between Effect definitions and game state mutations
 */
export class EffectResolver {
  private stateManager: GameStateManager;
  private combatResolver: CombatResolver;
  private deathProcessor: DeathProcessor;
  private board: GameBoard;

  /** Recursion depth guard to prevent infinite loops */
  private resolveDepth = 0;
  private static MAX_DEPTH = 10;

  constructor(
    stateManager: GameStateManager,
    combatResolver: CombatResolver,
    deathProcessor: DeathProcessor
  ) {
    this.stateManager = stateManager;
    this.combatResolver = combatResolver;
    this.deathProcessor = deathProcessor;
    this.board = stateManager.getBoard();
  }

  /**
   * Resolve a list of effects in order
   */
  resolveEffects(effects: Effect[], context: EffectContext): void {
    if (this.resolveDepth >= EffectResolver.MAX_DEPTH) {
      console.warn('EffectResolver: max recursion depth reached, skipping effects');
      return;
    }

    this.resolveDepth++;
    try {
      for (const effect of effects) {
        this.resolveEffect(effect, context);
      }
    } finally {
      this.resolveDepth--;
    }
  }

  /**
   * Resolve a single effect
   */
  private resolveEffect(effect: Effect, context: EffectContext): void {
    // Resolve targets
    const targets = this.resolveTargets(effect, context);

    // Execute based on effect type
    switch (effect.type) {
      case EffectType.DAMAGE:
        this.executeDamage(targets, effect.data as DamageEffectData, context);
        break;

      case EffectType.HEAL:
        this.executeHeal(targets, effect.data as HealEffectData, context);
        break;

      case EffectType.BUFF:
        this.executeBuff(targets, effect.data as BuffEffectData, context);
        break;

      case EffectType.DRAW:
        this.executeDraw(effect.data as DrawEffectData, context);
        break;

      case EffectType.SUMMON:
      case EffectType.CREATE_TOKEN:
        this.executeSummon(effect.data as SummonEffectData, context);
        break;

      case EffectType.DESTROY:
        this.executeDestroy(targets, context);
        break;

      case EffectType.GRANT_KEYWORD:
        this.executeGrantKeyword(targets, effect.data as GrantKeywordData, context);
        break;

      case EffectType.SILENCE:
        this.executeSilence(targets, context);
        break;

      case EffectType.GAIN_CRYSTALS:
        this.executeGainCrystals(effect.data as any, context);
        break;

      case EffectType.RETURN_TO_HAND:
        this.executeReturnToHand(targets, context);
        break;

      case EffectType.DEBUFF:
        this.executeDebuff(targets, effect.data as BuffEffectData, context);
        break;

      case EffectType.SET_STATS:
        this.executeSetStats(targets, effect.data as BuffEffectData, context);
        break;

      case EffectType.BANISH:
        this.executeBanish(targets, context);
        break;

      case EffectType.COPY:
        this.executeCopy(targets, context);
        break;

      case EffectType.STEAL:
        this.executeSteal(targets, context);
        break;

      case EffectType.REMOVE_KEYWORD:
        this.executeRemoveKeyword(targets, effect.data as GrantKeywordData, context);
        break;

      case EffectType.DISCARD:
        this.executeDiscard(effect.data as GenericEffectData, context);
        break;

      case EffectType.SHUFFLE_INTO_DECK:
        this.executeShuffleIntoDeck(targets, context);
        break;

      case EffectType.DESTROY_CRYSTALS:
        this.executeDestroyCrystals(effect.data as GainCrystalsData, context);
        break;

      case EffectType.REFRESH_CRYSTALS:
        this.executeRefreshCrystals(effect.data as GainCrystalsData, context);
        break;

      case EffectType.MODIFY_COST:
        this.executeModifyCost(effect.data as ModifyCostData, context);
        break;

      case EffectType.ADD_TO_HAND:
        this.executeAddToHand(effect.data as SummonEffectData, context);
        break;

      case EffectType.TRANSFORM:
        this.executeTransform(targets, effect.data as TransformData, context);
        break;

      case EffectType.CONDITIONAL:
        this.executeConditional(effect, context);
        break;

      case EffectType.REPEAT:
        this.executeRepeat(effect, context);
        break;

      case EffectType.ADAPT:
        this.executeAdapt(targets, effect.data as AdaptData, context);
        break;

      case EffectType.SCRY:
        this.executeScry(effect.data as ScryData, context);
        break;

      default:
        // Unsupported effect type — skip gracefully
        console.log(`EffectResolver: unsupported effect type ${effect.type}`);
        break;
    }

    // Process any deaths caused by this effect
    this.deathProcessor.processDeaths();
  }

  // ─── Target Resolution ──────────────────────────────────────────────────

  /**
   * Map TargetType enum to actual card/hero instance IDs
   */
  private resolveTargets(effect: Effect, context: EffectContext): string[] {
    const opponentId = this.stateManager.getOpponentId(context.sourceOwnerId);

    switch (effect.targetType) {
      case TargetType.SELF:
        return [context.sourceCardId];

      case TargetType.FRIENDLY_HERO:
      case TargetType.HERO:
        return [`hero_${context.sourceOwnerId}`];

      case TargetType.ENEMY_HERO:
        return [`hero_${opponentId}`];

      case TargetType.ALL_ENEMY_MINIONS:
        return this.board.getBoardCards(opponentId)
          .filter(c => this.matchesFilter(c, effect.targetFilter))
          .map(c => c.instanceId);

      case TargetType.ALL_FRIENDLY_MINIONS:
        return this.board.getBoardCards(context.sourceOwnerId)
          .filter(c => this.matchesFilter(c, effect.targetFilter))
          .map(c => c.instanceId);

      case TargetType.ALL_MINIONS:
        return [
          ...this.board.getBoardCards(context.sourceOwnerId),
          ...this.board.getBoardCards(opponentId),
        ]
          .filter(c => this.matchesFilter(c, effect.targetFilter))
          .map(c => c.instanceId);

      case TargetType.ALL_ENEMIES:
        return [
          `hero_${opponentId}`,
          ...this.board.getBoardCards(opponentId)
            .filter(c => this.matchesFilter(c, effect.targetFilter))
            .map(c => c.instanceId),
        ];

      case TargetType.ALL_FRIENDLIES:
        return [
          `hero_${context.sourceOwnerId}`,
          ...this.board.getBoardCards(context.sourceOwnerId)
            .filter(c => this.matchesFilter(c, effect.targetFilter))
            .map(c => c.instanceId),
        ];

      case TargetType.RANDOM_ENEMY: {
        const enemies = [
          `hero_${opponentId}`,
          ...this.board.getBoardCards(opponentId)
            .filter(c => this.matchesFilter(c, effect.targetFilter))
            .map(c => c.instanceId),
        ];
        return enemies.length > 0
          ? [enemies[Math.floor(Math.random() * enemies.length)]]
          : [];
      }

      case TargetType.RANDOM_ENEMY_MINION: {
        const enemyMinions = this.board.getBoardCards(opponentId)
          .filter(c => this.matchesFilter(c, effect.targetFilter));
        return enemyMinions.length > 0
          ? [enemyMinions[Math.floor(Math.random() * enemyMinions.length)].instanceId]
          : [];
      }

      case TargetType.RANDOM_FRIENDLY_MINION: {
        const friendlyMinions = this.board.getBoardCards(context.sourceOwnerId)
          .filter(c => c.instanceId !== context.sourceCardId)
          .filter(c => this.matchesFilter(c, effect.targetFilter));
        return friendlyMinions.length > 0
          ? [friendlyMinions[Math.floor(Math.random() * friendlyMinions.length)].instanceId]
          : [];
      }

      case TargetType.CHOSEN:
        // Player/AI must provide a targetId
        return context.targetId ? [context.targetId] : [];

      case TargetType.NONE:
        return [];

      default:
        return [];
    }
  }

  /**
   * Check if a card matches a target filter (tribe, keyword, stat ranges)
   */
  private matchesFilter(card: CardInstance, filter?: TargetFilter): boolean {
    if (!filter) return true;

    const def = globalCardDatabase.getCard(card.definitionId);

    if (filter.tribe) {
      const cardTribe = (def as any)?.tribe;
      if (cardTribe !== filter.tribe) return false;
    }

    if (filter.keyword) {
      if (!hasKeyword(card, filter.keyword)) return false;
    }

    if (filter.minAttack !== undefined && (card.currentAttack ?? 0) < filter.minAttack) return false;
    if (filter.maxAttack !== undefined && (card.currentAttack ?? 0) > filter.maxAttack) return false;
    if (filter.minHealth !== undefined && (card.currentHealth ?? 0) < filter.minHealth) return false;
    if (filter.maxHealth !== undefined && (card.currentHealth ?? 0) > filter.maxHealth) return false;
    if (filter.minCost !== undefined && card.currentCost < filter.minCost) return false;
    if (filter.maxCost !== undefined && card.currentCost > filter.maxCost) return false;

    if (filter.isDamaged) {
      if ((card.currentHealth ?? 0) >= (card.maxHealth ?? 0)) return false;
    }

    return true;
  }

  // ─── Effect Executors ───────────────────────────────────────────────────

  /**
   * DAMAGE: Deal damage to targets (hero or minion)
   */
  private executeDamage(targets: string[], data: DamageEffectData, context: EffectContext): void {
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    if (amount <= 0) return;

    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) {
        // Hero damage
        const heroPlayerId = targetId.replace('hero_', '');
        this.stateManager.damageHero(heroPlayerId, amount);
      } else {
        // Minion damage — find which player owns it
        const card = this.board.getCard(targetId);
        if (card && card.zone === CardZone.BOARD) {
          this.combatResolver.dealDamageToMinion(
            targetId,
            amount,
            context.sourceCardId,
            card.controllerId,
            data.isPiercing || false
          );
        }
      }
    }
  }

  /**
   * HEAL: Restore health to targets, then fire ILLUMINATE (ON_HEAL) triggers
   */
  private executeHeal(targets: string[], data: HealEffectData, context: EffectContext): void {
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    if (amount <= 0) return;

    let healingOccurred = false;

    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) {
        const heroPlayerId = targetId.replace('hero_', '');
        this.stateManager.healHero(heroPlayerId, amount);
        healingOccurred = true;
      } else {
        const card = this.board.getCard(targetId);
        if (card && card.zone === CardZone.BOARD) {
          this.combatResolver.healMinion(
            targetId,
            amount,
            context.sourceCardId,
            card.controllerId
          );
          healingOccurred = true;
        }
      }
    }

    // ILLUMINATE: fire ON_HEAL triggers on friendly minions
    if (healingOccurred) {
      this.processIlluminateTriggers(context.sourceOwnerId);
    }
  }

  /**
   * BUFF: Modify attack and/or health of targets.
   * Tracks buffs in StatBuff arrays for cleanup and UI display.
   */
  private executeBuff(targets: string[], data: BuffEffectData, context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue; // Can't buff heroes

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      const attackMod = data.attack || 0;
      const healthMod = data.health || 0;

      // Track the buff for later cleanup / UI display
      const buff = {
        id: `buff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        attackModifier: attackMod,
        healthModifier: healthMod,
        source: context.sourceCardId,
        isTemporary: data.isTemporary || false,
      };

      if (data.isTemporary) {
        card.temporaryBuffs.push(buff);
      } else {
        card.permanentBuffs.push(buff);
      }

      // Apply to current stats
      if (attackMod && card.currentAttack !== undefined) {
        card.currentAttack += attackMod;
      }
      if (healthMod) {
        if (card.currentHealth !== undefined) {
          card.currentHealth += healthMod;
        }
        if (card.maxHealth !== undefined) {
          card.maxHealth += healthMod;
        }
      }
    }
  }

  /**
   * DRAW: Draw cards for the source owner
   */
  private executeDraw(data: DrawEffectData, context: EffectContext): void {
    const count = data.count || 1;
    this.board.drawCards(context.sourceOwnerId, count);
  }

  /**
   * SUMMON: Create token minions on the board
   */
  private executeSummon(data: SummonEffectData, context: EffectContext): void {
    const count = data.count || 1;
    const tokenDefId = data.cardId;

    // Look up the token definition
    const tokenDef = globalCardDatabase.getCard(tokenDefId);

    for (let i = 0; i < count; i++) {
      if (!this.board.hasBoardSpace(context.sourceOwnerId)) break;

      // Create a minimal card instance for the token
      const tokenInstance: CardInstance = {
        instanceId: `token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        definitionId: tokenDefId,
        ownerId: context.sourceOwnerId,
        controllerId: context.sourceOwnerId,
        zone: CardZone.BOARD,
        currentCost: tokenDef?.cost ?? 0,
        currentAttack: tokenDef?.attack ?? 1,
        currentHealth: tokenDef?.health ?? 1,
        maxHealth: tokenDef?.health ?? 1,
        keywords: tokenDef?.keywords ? [...tokenDef.keywords] : [],
        enchantments: [],
        temporaryBuffs: [],
        permanentBuffs: [],
        isSilenced: false,
        hasBarrier: false,
        isCloaked: false,
        isForged: false,
        isEchoInstance: false,
        hasAttackedThisTurn: false,
        attacksMadeThisTurn: 0,
        summonedThisTurn: true,
        turnPlayed: this.stateManager.getCurrentTurn(),
      };

      this.board.registerCard(tokenInstance);
      this.board.moveCardDirectToBoard(context.sourceOwnerId, tokenInstance.instanceId);
    }
  }

  /**
   * DESTROY: Set health to 0 — DeathProcessor handles cleanup
   */
  private executeDestroy(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue; // Can't destroy heroes this way

      const card = this.board.getCard(targetId);
      if (card && card.zone === CardZone.BOARD && card.currentHealth !== undefined) {
        card.currentHealth = 0;
      }
    }
  }

  /**
   * GRANT_KEYWORD: Give keyword(s) to target minions
   */
  private executeGrantKeyword(targets: string[], data: GrantKeywordData, context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      for (const kw of data.keywords) {
        if (!hasKeyword(card, kw.keyword)) {
          card.keywords.push({ ...kw });
        }
      }
    }
  }

  /**
   * SILENCE: Remove all keywords from target minions
   */
  private executeSilence(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      card.keywords = [];
      card.isSilenced = true;
      card.hasBarrier = false;
      card.isCloaked = false;
    }
  }

  /**
   * GAIN_CRYSTALS: Give the player extra crystals
   */
  private executeGainCrystals(data: any, context: EffectContext): void {
    const amount = data.amount || 1;
    const player = this.stateManager.getPlayer(context.sourceOwnerId);
    if (data.isTemporary) {
      player.crystals.current = Math.min(player.crystals.current + amount, 10);
    } else {
      player.crystals.maximum = Math.min(player.crystals.maximum + amount, 10);
      player.crystals.current = Math.min(player.crystals.current + amount, 10);
    }
  }

  /**
   * RETURN_TO_HAND: Bounce a minion back to its owner's hand
   */
  private executeReturnToHand(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      this.board.moveCard(
        targetId,
        card.controllerId,
        card.ownerId,
        CardZone.HAND
      );

      // Reset card state
      const def = globalCardDatabase.getCard(card.definitionId);
      if (def) {
        card.currentCost = def.cost;
        card.currentAttack = def.attack;
        card.currentHealth = def.health;
        card.maxHealth = def.health;
        card.keywords = def.keywords ? [...def.keywords] : [];
        card.isSilenced = false;
        card.hasBarrier = false;
        card.isCloaked = false;
        card.summonedThisTurn = false;
        card.attacksMadeThisTurn = 0;
      }
    }
  }

  /**
   * DEBUFF: Reduce attack and/or health of targets (negative buff)
   */
  private executeDebuff(targets: string[], data: BuffEffectData, _context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      // data.attack and data.health are the debuff amounts (positive values mean reduction)
      if (data.attack && card.currentAttack !== undefined) {
        card.currentAttack = Math.max(0, card.currentAttack - Math.abs(data.attack));
      }
      if (data.health && card.currentHealth !== undefined && card.maxHealth !== undefined) {
        card.maxHealth = Math.max(1, card.maxHealth - Math.abs(data.health));
        card.currentHealth = Math.min(card.currentHealth, card.maxHealth);
      }
    }
  }

  /**
   * SET_STATS: Set attack and/or health to specific values
   */
  private executeSetStats(targets: string[], data: BuffEffectData, _context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      if (data.attack !== undefined && card.currentAttack !== undefined) {
        card.currentAttack = data.attack;
      }
      if (data.health !== undefined && card.currentHealth !== undefined && card.maxHealth !== undefined) {
        card.maxHealth = data.health;
        card.currentHealth = Math.min(card.currentHealth, data.health);
      }
    }
  }

  /**
   * BANISH: Remove a card from the game entirely (move to BANISHED zone)
   */
  private executeBanish(targets: string[], _context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card) continue;

      this.board.moveCard(
        targetId,
        card.controllerId,
        card.ownerId,
        CardZone.BANISHED
      );
    }
  }

  /**
   * COPY: Create a copy of a target card and add it to the source player's hand
   */
  private executeCopy(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card) continue;

      if (this.board.isHandFull(context.sourceOwnerId)) break;

      const def = globalCardDatabase.getCard(card.definitionId);
      if (!def) continue;

      const copy: CardInstance = {
        instanceId: `copy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        definitionId: card.definitionId,
        ownerId: context.sourceOwnerId,
        controllerId: context.sourceOwnerId,
        zone: CardZone.HAND,
        currentCost: def.cost,
        currentAttack: def.attack,
        currentHealth: def.health,
        maxHealth: def.health,
        keywords: def.keywords ? [...def.keywords] : [],
        enchantments: [],
        temporaryBuffs: [],
        permanentBuffs: [],
        isSilenced: false,
        hasBarrier: false,
        isCloaked: false,
        isForged: false,
        isEchoInstance: false,
        hasAttackedThisTurn: false,
        attacksMadeThisTurn: 0,
        summonedThisTurn: false,
      };

      this.board.registerCard(copy);
      this.board.moveCardDirectToBoard(context.sourceOwnerId, copy.instanceId);
      // Move from board to hand
      this.board.moveCard(copy.instanceId, context.sourceOwnerId, context.sourceOwnerId, CardZone.HAND);
    }
  }

  /**
   * STEAL: Take control of an enemy minion
   */
  private executeSteal(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      // Only steal enemy minions
      if (card.controllerId === context.sourceOwnerId) continue;

      if (!this.board.hasBoardSpace(context.sourceOwnerId)) break;

      const previousOwner = card.controllerId;
      this.board.moveCard(targetId, previousOwner, context.sourceOwnerId, CardZone.BOARD);
      card.controllerId = context.sourceOwnerId;
    }
  }

  /**
   * REMOVE_KEYWORD: Remove specific keywords from target minions
   */
  private executeRemoveKeyword(targets: string[], data: GrantKeywordData, _context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      if (data.keywords && data.keywords.length > 0) {
        // Remove specific keywords
        for (const kwToRemove of data.keywords) {
          card.keywords = card.keywords.filter(kw => kw.keyword !== kwToRemove.keyword);
        }
      } else {
        // No specific keywords = remove all (like Silence but without the silenced flag)
        card.keywords = [];
        card.hasBarrier = false;
        card.isCloaked = false;
      }
    }
  }

  /**
   * DISCARD: Remove cards from the source player's hand randomly
   */
  private executeDiscard(data: GenericEffectData, context: EffectContext): void {
    const count = data.value || 1;
    const hand = this.board.getHandCards(context.sourceOwnerId);
    const toDiscard = Math.min(count, hand.length);

    for (let i = 0; i < toDiscard; i++) {
      const remaining = this.board.getHandCards(context.sourceOwnerId);
      if (remaining.length === 0) break;

      const idx = Math.floor(Math.random() * remaining.length);
      const card = remaining[idx];
      this.board.moveCard(
        card.instanceId,
        context.sourceOwnerId,
        context.sourceOwnerId,
        CardZone.GRAVEYARD
      );
    }
  }

  /**
   * SHUFFLE_INTO_DECK: Move cards from board/hand into the deck and shuffle
   */
  private executeShuffleIntoDeck(targets: string[], context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card) continue;

      // Reset stats to base
      const def = globalCardDatabase.getCard(card.definitionId);
      if (def) {
        card.currentCost = def.cost;
        card.currentAttack = def.attack;
        card.currentHealth = def.health;
        card.maxHealth = def.health;
        card.keywords = def.keywords ? [...def.keywords] : [];
        card.isSilenced = false;
        card.hasBarrier = false;
        card.isCloaked = false;
      }

      this.board.moveCard(
        targetId,
        card.controllerId,
        card.ownerId,
        CardZone.DECK
      );
    }

    // Shuffle the decks of affected players
    this.board.shuffleDeck(context.sourceOwnerId);
    const opponentId = this.stateManager.getOpponentId(context.sourceOwnerId);
    this.board.shuffleDeck(opponentId);
  }

  /**
   * DESTROY_CRYSTALS: Destroy opponent's mana crystals
   */
  private executeDestroyCrystals(data: GainCrystalsData, context: EffectContext): void {
    const amount = data.amount || 1;
    const targetPlayerId = this.stateManager.getOpponentId(context.sourceOwnerId);
    const player = this.stateManager.getPlayer(targetPlayerId);
    player.crystals.maximum = Math.max(0, player.crystals.maximum - amount);
    player.crystals.current = Math.min(player.crystals.current, player.crystals.maximum);
  }

  /**
   * REFRESH_CRYSTALS: Restore spent mana crystals
   */
  private executeRefreshCrystals(data: GainCrystalsData, context: EffectContext): void {
    const amount = data.amount || 10; // Default refreshes all
    const player = this.stateManager.getPlayer(context.sourceOwnerId);
    player.crystals.current = Math.min(player.crystals.current + amount, player.crystals.maximum);
  }

  /**
   * MODIFY_COST: Change the cost of cards in hand or deck
   */
  private executeModifyCost(data: ModifyCostData, context: EffectContext): void {
    const amount = data.amount || 0;
    let cards: CardInstance[] = [];

    if (data.targetType === 'HAND') {
      cards = this.board.getHandCards(context.sourceOwnerId);
    } else if (data.targetType === 'DECK') {
      cards = this.board.getCardsInZone(context.sourceOwnerId, CardZone.DECK);
    } else if (data.targetType === 'SPECIFIC' && data.cardId) {
      const card = this.board.getCard(data.cardId);
      if (card) cards = [card];
    }

    for (const card of cards) {
      card.currentCost = Math.max(0, card.currentCost + amount);
    }
  }

  /**
   * ADD_TO_HAND: Create a specific card and add to hand
   */
  private executeAddToHand(data: SummonEffectData, context: EffectContext): void {
    const count = data.count || 1;
    const cardDefId = data.cardId;

    for (let i = 0; i < count; i++) {
      if (this.board.isHandFull(context.sourceOwnerId)) break;

      const def = globalCardDatabase.getCard(cardDefId);
      if (!def) continue;

      const instance: CardInstance = {
        instanceId: `added_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        definitionId: cardDefId,
        ownerId: context.sourceOwnerId,
        controllerId: context.sourceOwnerId,
        zone: CardZone.HAND,
        currentCost: def.cost,
        currentAttack: def.attack,
        currentHealth: def.health,
        maxHealth: def.health,
        keywords: def.keywords ? [...def.keywords] : [],
        enchantments: [],
        temporaryBuffs: [],
        permanentBuffs: [],
        isSilenced: false,
        hasBarrier: false,
        isCloaked: false,
        isForged: false,
        isEchoInstance: false,
        hasAttackedThisTurn: false,
        attacksMadeThisTurn: 0,
        summonedThisTurn: false,
      };

      this.board.registerCard(instance);
      // Register then move to hand zone
      this.board.moveCardDirectToBoard(context.sourceOwnerId, instance.instanceId);
      this.board.moveCard(instance.instanceId, context.sourceOwnerId, context.sourceOwnerId, CardZone.HAND);
    }
  }

  /**
   * TRANSFORM: Replace a minion on the board with a different card
   */
  private executeTransform(targets: string[], data: TransformData, context: EffectContext): void {
    const newDefId = data.targetCardId;
    const newDef = globalCardDatabase.getCard(newDefId);
    if (!newDef) return;

    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      // Transform in-place: update the card's definition and reset stats
      card.definitionId = newDefId;
      card.currentCost = newDef.cost;
      card.currentAttack = newDef.attack;
      card.currentHealth = newDef.health;
      card.maxHealth = newDef.health;
      card.keywords = newDef.keywords ? [...newDef.keywords] : [];
      card.enchantments = [];
      card.temporaryBuffs = [];
      card.permanentBuffs = [];
      card.isSilenced = false;
      card.hasBarrier = false;
      card.isCloaked = false;
      card.isForged = false;
    }
  }

  /**
   * CONDITIONAL: Check a condition, then execute sub-effects if true
   */
  private executeConditional(effect: Effect, context: EffectContext): void {
    if (!effect.condition) return;

    const conditionMet = this.evaluateCondition(effect.condition, context);
    if (!conditionMet) return;

    // The sub-effects are stored in data.value as an array, or the effect itself acts as a wrapper
    const data = effect.data as any;
    if (data.effects && Array.isArray(data.effects)) {
      this.resolveEffects(data.effects, context);
    }
  }

  /**
   * REPEAT: Execute an effect multiple times
   */
  private executeRepeat(effect: Effect, context: EffectContext): void {
    const data = effect.data as any;
    const count = data.value || 2;
    const subEffects = data.effects as Effect[] | undefined;

    if (!subEffects || !Array.isArray(subEffects)) return;

    for (let i = 0; i < count; i++) {
      this.resolveEffects(subEffects, context);
    }
  }

  // ─── Buff Cleanup ──────────────────────────────────────────────────

  /**
   * Clear all temporary buffs from a player's board minions.
   * Called at end of turn to revert isTemporary buff effects.
   */
  clearTemporaryBuffs(playerId: string): void {
    const boardCards = this.board.getBoardCards(playerId);
    for (const card of boardCards) {
      if (card.temporaryBuffs.length === 0) continue;

      for (const buff of card.temporaryBuffs) {
        if (card.currentAttack !== undefined) {
          card.currentAttack = Math.max(0, card.currentAttack - buff.attackModifier);
        }
        if (card.maxHealth !== undefined && card.currentHealth !== undefined) {
          card.maxHealth = Math.max(1, card.maxHealth - buff.healthModifier);
          card.currentHealth = Math.min(card.currentHealth, card.maxHealth);
        }
      }
      card.temporaryBuffs = [];
    }
  }

  // ─── ILLUMINATE (ON_HEAL) Triggers ─────────────────────────────────

  /**
   * Fire ON_HEAL triggers on all friendly minions with ILLUMINATE
   */
  private processIlluminateTriggers(playerId: string): void {
    const boardCards = this.board.getBoardCards(playerId);

    for (const card of boardCards) {
      if (card.isSilenced && !card.isForged) continue;
      if (!hasKeyword(card, OriginalKeyword.ILLUMINATE)) continue;

      const definition = globalCardDatabase.getCard(card.definitionId);
      if (!definition) continue;

      const healTriggers = definition.effects.filter(
        (e: any) => e.trigger === EffectTrigger.ON_HEAL
      );
      if (healTriggers.length > 0) {
        this.resolveEffects(healTriggers, {
          sourceCardId: card.instanceId,
          sourceOwnerId: playerId,
          triggerEvent: 'ON_HEAL',
        });
      }
    }
  }

  // ─── ADAPT ────────────────────────────────────────────────────────

  /**
   * ADAPT: Choose 1 of 3 random bonuses and apply to the target.
   * Without UI choice flow, auto-picks the first random option.
   */
  private executeAdapt(targets: string[], data: AdaptData, context: EffectContext): void {
    const optionCount = data.optionCount || 3;

    // Pick random options from the adapt pool
    const available = [...AllAdaptOptions];
    const options: AdaptOption[] = [];
    for (let i = 0; i < optionCount && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      options.push(available.splice(idx, 1)[0]);
    }

    if (options.length === 0) return;

    // Auto-select first option (AI or engine picks randomly)
    const chosen = options[0];

    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue;

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      this.applyAdaptOption(card, chosen);
    }
  }

  /**
   * Apply a chosen adapt option to a minion
   */
  private applyAdaptOption(card: CardInstance, option: AdaptOption): void {
    switch (option) {
      case AdaptOption.ATTACK_PLUS_3:
        if (card.currentAttack !== undefined) card.currentAttack += 3;
        break;
      case AdaptOption.HEALTH_PLUS_3:
        if (card.currentHealth !== undefined) card.currentHealth += 3;
        if (card.maxHealth !== undefined) card.maxHealth += 3;
        break;
      case AdaptOption.GUARDIAN:
        if (!hasKeyword(card, CombatKeyword.GUARDIAN)) {
          card.keywords.push({ keyword: CombatKeyword.GUARDIAN });
        }
        break;
      case AdaptOption.BARRIER:
        if (!hasKeyword(card, CombatKeyword.BARRIER)) {
          card.keywords.push({ keyword: CombatKeyword.BARRIER });
          card.hasBarrier = true;
        }
        break;
      case AdaptOption.SWIFT:
        if (!hasKeyword(card, CombatKeyword.SWIFT)) {
          card.keywords.push({ keyword: CombatKeyword.SWIFT });
        }
        break;
      case AdaptOption.DRAIN:
        if (!hasKeyword(card, CombatKeyword.DRAIN)) {
          card.keywords.push({ keyword: CombatKeyword.DRAIN });
        }
        break;
      case AdaptOption.LETHAL:
        if (!hasKeyword(card, CombatKeyword.LETHAL)) {
          card.keywords.push({ keyword: CombatKeyword.LETHAL });
        }
        break;
    }
  }

  // ─── SCRY ─────────────────────────────────────────────────────────

  /**
   * SCRY: Look at the top X cards of the deck.
   * Without UI, auto-keeps them in current order (no rearranging).
   */
  private executeScry(data: ScryData, context: EffectContext): void {
    const count = data.count || 1;
    const deckCards = this.board.getCardsInZone(context.sourceOwnerId, CardZone.DECK);

    // Peek at the top `count` cards (just log for now; UI would display them)
    const topCards = deckCards.slice(0, Math.min(count, deckCards.length));

    // Emit SCRY_COMPLETED event so UI can display the cards
    const state = this.stateManager.getState();
    this.stateManager.getEvents().emit(
      createEvent(GameEventType.SCRY_COMPLETED, state.id, state.turn, context.sourceOwnerId, {
        cardIds: topCards.map(c => c.instanceId),
        count: topCards.length,
      })
    );
  }

  // ─── SWARM ────────────────────────────────────────────────────────

  /**
   * Recalculate SWARM buffs for all minions on a player's board.
   * SWARM gives +1/+1 for each other friendly minion.
   */
  recalculateSwarm(playerId: string): void {
    const boardCards = this.board.getBoardCards(playerId);
    const otherCount = boardCards.length - 1; // -1 for the swarm minion itself

    for (const card of boardCards) {
      if (card.isSilenced && !card.isForged) continue;
      if (!hasKeyword(card, OriginalKeyword.SWARM)) continue;

      const definition = globalCardDatabase.getCard(card.definitionId);
      if (!definition) continue;

      const baseAttack = definition.attack ?? 0;
      const baseHealth = definition.health ?? 1;
      const swarmBonus = Math.max(0, otherCount);

      card.currentAttack = baseAttack + swarmBonus;
      card.currentHealth = Math.min(
        card.currentHealth ?? baseHealth,
        baseHealth + swarmBonus
      );
      card.maxHealth = baseHealth + swarmBonus;
    }
  }

  /**
   * Evaluate a condition for CONDITIONAL effects
   */
  private evaluateCondition(condition: import('../types/Effects').EffectCondition, context: EffectContext): boolean {
    const player = this.stateManager.getPlayer(context.sourceOwnerId);
    const opponentId = this.stateManager.getOpponentId(context.sourceOwnerId);
    const opponent = this.stateManager.getPlayer(opponentId);

    let actual: number;

    switch (condition.type) {
      case 'PLAYER_HEALTH':
        actual = player.hero.currentHealth;
        break;
      case 'ENEMY_HEALTH':
        actual = opponent.hero.currentHealth;
        break;
      case 'HAND_SIZE':
        actual = this.board.getHandCount(context.sourceOwnerId);
        break;
      case 'BOARD_COUNT':
        actual = this.board.getBoardCount(context.sourceOwnerId);
        break;
      case 'CRYSTAL_COUNT':
        actual = player.crystals.current;
        break;
      case 'DECK_SIZE':
        actual = this.board.getDeckCount(context.sourceOwnerId);
        break;
      default:
        return true; // Unknown condition type — allow execution
    }

    const target = typeof condition.value === 'number' ? condition.value : 0;
    const comp = condition.comparator || 'GREATER_OR_EQUAL';

    switch (comp) {
      case 'EQUALS': return actual === target;
      case 'NOT_EQUALS': return actual !== target;
      case 'GREATER_THAN': return actual > target;
      case 'LESS_THAN': return actual < target;
      case 'GREATER_OR_EQUAL': return actual >= target;
      case 'LESS_OR_EQUAL': return actual <= target;
      default: return true;
    }
  }
}

/**
 * STARFORGE TCG - Effect Resolver
 *
 * Executes card effects (spells, DEPLOY, LAST_RITES, hero powers).
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
} from '../types/Effects';
import { CardZone, hasKeyword } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { CardType } from '../types/Card';
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
   * HEAL: Restore health to targets
   */
  private executeHeal(targets: string[], data: HealEffectData, context: EffectContext): void {
    const amount = typeof data.amount === 'number' ? data.amount : 0;
    if (amount <= 0) return;

    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) {
        const heroPlayerId = targetId.replace('hero_', '');
        this.stateManager.healHero(heroPlayerId, amount);
      } else {
        const card = this.board.getCard(targetId);
        if (card && card.zone === CardZone.BOARD) {
          this.combatResolver.healMinion(
            targetId,
            amount,
            context.sourceCardId,
            card.controllerId
          );
        }
      }
    }
  }

  /**
   * BUFF: Modify attack and/or health of targets
   */
  private executeBuff(targets: string[], data: BuffEffectData, context: EffectContext): void {
    for (const targetId of targets) {
      if (targetId.startsWith('hero_')) continue; // Can't buff heroes

      const card = this.board.getCard(targetId);
      if (!card || card.zone !== CardZone.BOARD) continue;

      if (data.attack && card.currentAttack !== undefined) {
        card.currentAttack += data.attack;
      }
      if (data.health) {
        if (card.currentHealth !== undefined) {
          card.currentHealth += data.health;
        }
        if (card.maxHealth !== undefined) {
          card.maxHealth += data.health;
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
}

/**
 * STARFORGE TCG - Combat Resolver
 *
 * Handles attack resolution, damage calculation, and combat-related effects.
 */

import { hasKeyword, getEffectiveAttack } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { CombatKeyword, OriginalKeyword } from '../types/Keywords';
import { GameStateManager } from '../game/GameState';
import { GameBoard } from '../game/Board';
import { EventEmitter } from '../events/EventEmitter';
import { GameEventType, createEvent } from '../events/GameEvent';
import type { CombatEventData, DamageEventData, HealEventData } from '../events/GameEvent';

/**
 * Result of a combat action
 */
export interface CombatResult {
  /** Whether combat was successful */
  success: boolean;
  /** Attacker damage dealt */
  attackerDamage: number;
  /** Defender damage dealt (to attacker) */
  defenderDamage: number;
  /** Whether attacker died */
  attackerDied: boolean;
  /** Whether defender died */
  defenderDied: boolean;
  /** Amount healed by DRAIN */
  drainHealing: number;
  /** Error message if combat failed */
  error?: string;
  /** Whether BARRIER was broken */
  barrierBroken: boolean;
  /** Whether LETHAL killed the target */
  lethalTriggered: boolean;
}

/**
 * Combat resolution options
 */
export interface CombatOptions {
  /** Skip validation (for testing) */
  skipValidation?: boolean;
}

/**
 * Combat Resolver class
 */
export class CombatResolver {
  private gameState: GameStateManager;
  private board: GameBoard;
  private events: EventEmitter;

  constructor(gameState: GameStateManager) {
    this.gameState = gameState;
    this.board = gameState.getBoard();
    this.events = gameState.getEvents();
  }

  /**
   * Validate if an attack is legal
   */
  validateAttack(
    attackerId: string,
    defenderId: string,
    attackingPlayerId: string
  ): { valid: boolean; error?: string } {
    // Get attacker
    const attacker = this.board.getCard(attackerId);
    if (!attacker) {
      return { valid: false, error: 'Attacker not found' };
    }

    // Check if attacker belongs to attacking player
    if (attacker.controllerId !== attackingPlayerId) {
      return { valid: false, error: 'You do not control this minion' };
    }

    // Check if attacker can attack
    if (attacker.currentAttack === undefined || attacker.currentAttack <= 0) {
      return { valid: false, error: 'Attacker has no attack value' };
    }

    // Check attack limit
    const maxAttacks = hasKeyword(attacker, CombatKeyword.DOUBLE_STRIKE) ? 2 : 1;
    if (attacker.attacksMadeThisTurn >= maxAttacks) {
      return { valid: false, error: 'Attacker has already attacked this turn' };
    }

    // Check summoning sickness
    if (attacker.summonedThisTurn) {
      const hasBlitz = hasKeyword(attacker, CombatKeyword.BLITZ);
      const hasSwift = hasKeyword(attacker, CombatKeyword.SWIFT);

      if (!hasBlitz && !hasSwift) {
        return { valid: false, error: 'Minion cannot attack the turn it is played' };
      }
    }

    // Get defender
    const defendingPlayerId = this.gameState.getOpponentId(attackingPlayerId);
    const isHeroTarget = defenderId === `hero_${defendingPlayerId}`;

    if (isHeroTarget) {
      // Attacking hero - check GUARDIAN
      if (!this.board.canAttackHero(defendingPlayerId)) {
        return { valid: false, error: 'Must attack GUARDIAN minions first' };
      }

      // SWIFT minions can only attack minions
      if (attacker.summonedThisTurn && hasKeyword(attacker, CombatKeyword.SWIFT)) {
        return { valid: false, error: 'SWIFT minions cannot attack heroes the turn they are played' };
      }
    } else {
      // Attacking minion
      const defender = this.board.getCard(defenderId);
      if (!defender) {
        return { valid: false, error: 'Defender not found' };
      }

      // Check if defender can be attacked
      if (defender.isCloaked) {
        return { valid: false, error: 'Cannot attack CLOAK minions' };
      }

      // Check GUARDIAN restriction
      const attackable = this.board.getAttackableTargets(attackingPlayerId, defendingPlayerId);
      const canAttackThisTarget = attackable.some((c) => c.instanceId === defenderId);

      if (!canAttackThisTarget && attackable.length > 0) {
        return { valid: false, error: 'Must attack GUARDIAN minions first' };
      }
    }

    return { valid: true };
  }

  /**
   * Resolve an attack between two cards or hero
   */
  resolveAttack(
    attackerId: string,
    defenderId: string,
    attackingPlayerId: string,
    options: CombatOptions = {}
  ): CombatResult {
    // Validate attack
    if (!options.skipValidation) {
      const validation = this.validateAttack(attackerId, defenderId, attackingPlayerId);
      if (!validation.valid) {
        return {
          success: false,
          attackerDamage: 0,
          defenderDamage: 0,
          attackerDied: false,
          defenderDied: false,
          drainHealing: 0,
          barrierBroken: false,
          lethalTriggered: false,
          error: validation.error,
        };
      }
    }

    const attacker = this.board.getCardOrThrow(attackerId);
    const defendingPlayerId = this.gameState.getOpponentId(attackingPlayerId);
    const isHeroTarget = defenderId === `hero_${defendingPlayerId}`;

    // Calculate attack damage
    const attackerDamage = getEffectiveAttack(attacker);

    // Emit attack declared event
    this.emitEvent(GameEventType.ATTACK_DECLARED, attackingPlayerId, {
      attackerId,
      attackerOwnerId: attackingPlayerId,
      defenderId,
      defenderOwnerId: defendingPlayerId,
    } as CombatEventData);

    let result: CombatResult;

    if (isHeroTarget) {
      // Attack hero
      result = this.resolveHeroAttack(attacker, attackerDamage, attackingPlayerId, defendingPlayerId);
    } else {
      // Attack minion
      const defender = this.board.getCardOrThrow(defenderId);
      result = this.resolveMinionCombat(attacker, defender, attackingPlayerId, defendingPlayerId);
    }

    // Update attacker state
    attacker.hasAttackedThisTurn = true;
    attacker.attacksMadeThisTurn++;

    // Break CLOAK when attacking
    if (attacker.isCloaked) {
      attacker.isCloaked = false;
      this.emitEvent(GameEventType.CLOAK_BROKEN, attackingPlayerId, {
        cardInstanceId: attackerId,
      });
    }

    // Emit attack resolved event
    this.emitEvent(GameEventType.ATTACK_RESOLVED, attackingPlayerId, {
      attackerId,
      attackerOwnerId: attackingPlayerId,
      defenderId,
      defenderOwnerId: defendingPlayerId,
      attackerDamage: result.attackerDamage,
      defenderDamage: result.defenderDamage,
    } as CombatEventData);

    return result;
  }

  /**
   * Resolve attack against hero
   */
  private resolveHeroAttack(
    attacker: CardInstance,
    damage: number,
    attackingPlayerId: string,
    defendingPlayerId: string
  ): CombatResult {
    // Apply damage to hero
    const actualDamage = this.gameState.damageHero(defendingPlayerId, damage);

    // Handle DRAIN
    let drainHealing = 0;
    if (hasKeyword(attacker, CombatKeyword.DRAIN)) {
      drainHealing = this.gameState.healHero(attackingPlayerId, actualDamage);
    }

    this.emitEvent(GameEventType.DAMAGE_DEALT, attackingPlayerId, {
      targetId: `hero_${defendingPlayerId}`,
      targetType: 'hero',
      amount: actualDamage,
      sourceId: attacker.instanceId,
      sourceType: 'minion',
    } as DamageEventData);

    return {
      success: true,
      attackerDamage: actualDamage,
      defenderDamage: 0,
      attackerDied: false,
      defenderDied: false,
      drainHealing,
      barrierBroken: false,
      lethalTriggered: false,
    };
  }

  /**
   * Resolve combat between two minions
   */
  private resolveMinionCombat(
    attacker: CardInstance,
    defender: CardInstance,
    attackingPlayerId: string,
    defendingPlayerId: string
  ): CombatResult {
    const attackerDamage = getEffectiveAttack(attacker);
    const defenderDamage = getEffectiveAttack(defender);

    let attackerDied = false;
    let defenderDied = false;
    let barrierBroken = false;
    let lethalTriggered = false;
    let drainHealing = 0;

    // Apply damage to defender
    const { died: defDied, barrierBroken: defBarrier, lethal: defLethal } = this.applyDamageToMinion(
      defender,
      attackerDamage,
      attacker,
      defendingPlayerId
    );
    defenderDied = defDied;
    barrierBroken = defBarrier;
    lethalTriggered = defLethal;

    // Apply damage to attacker (counter-attack)
    if (defenderDamage > 0) {
      const { died: atkDied, barrierBroken: atkBarrier, lethal: atkLethal } = this.applyDamageToMinion(
        attacker,
        defenderDamage,
        defender,
        attackingPlayerId
      );
      attackerDied = atkDied;
      if (atkBarrier) barrierBroken = true;
      if (atkLethal) lethalTriggered = true;
    }

    // Handle DRAIN on attacker
    if (hasKeyword(attacker, CombatKeyword.DRAIN) && attackerDamage > 0) {
      const actualDamageDealt = defender.hasBarrier ? 0 : attackerDamage;
      if (actualDamageDealt > 0) {
        drainHealing = this.gameState.healHero(attackingPlayerId, actualDamageDealt);
      }
    }

    return {
      success: true,
      attackerDamage,
      defenderDamage,
      attackerDied,
      defenderDied,
      drainHealing,
      barrierBroken,
      lethalTriggered,
    };
  }

  /**
   * Apply damage to a minion, handling keywords
   */
  private applyDamageToMinion(
    target: CardInstance,
    damage: number,
    source: CardInstance,
    targetOwnerId: string
  ): { died: boolean; barrierBroken: boolean; lethal: boolean } {
    let died = false;
    let barrierBroken = false;
    let lethal = false;

    // Check BARRIER
    if (target.hasBarrier) {
      target.hasBarrier = false;
      barrierBroken = true;

      this.emitEvent(GameEventType.BARRIER_BROKEN, targetOwnerId, {
        cardInstanceId: target.instanceId,
      });

      // BARRIER absorbs all damage
      return { died: false, barrierBroken: true, lethal: false };
    }

    // Apply damage
    if (target.currentHealth !== undefined) {
      target.currentHealth -= damage;

      this.emitEvent(GameEventType.DAMAGE_DEALT, undefined, {
        targetId: target.instanceId,
        targetType: 'minion',
        amount: damage,
        sourceId: source.instanceId,
        sourceType: 'minion',
      } as DamageEventData);

      // Check LETHAL
      if (damage > 0 && hasKeyword(source, CombatKeyword.LETHAL)) {
        target.currentHealth = 0;
        lethal = true;
      }

      // Check death
      if (target.currentHealth <= 0) {
        died = true;
      }
    }

    return { died, barrierBroken, lethal };
  }

  /**
   * Deal spell/effect damage to a minion
   */
  dealDamageToMinion(
    targetId: string,
    damage: number,
    sourceId: string | undefined,
    targetOwnerId: string,
    isPiercing: boolean = false
  ): { died: boolean; actualDamage: number } {
    const target = this.board.getCardOrThrow(targetId);

    // Check PHASE - can't be targeted by spells
    if (hasKeyword(target, OriginalKeyword.PHASE) && sourceId) {
      return { died: false, actualDamage: 0 };
    }

    // Check BARRIER (unless piercing)
    if (target.hasBarrier && !isPiercing) {
      target.hasBarrier = false;

      this.emitEvent(GameEventType.BARRIER_BROKEN, targetOwnerId, {
        cardInstanceId: target.instanceId,
      });

      return { died: false, actualDamage: 0 };
    }

    // Apply damage
    let actualDamage = 0;
    if (target.currentHealth !== undefined) {
      actualDamage = Math.min(damage, target.currentHealth);
      target.currentHealth -= damage;

      this.emitEvent(GameEventType.DAMAGE_DEALT, undefined, {
        targetId,
        targetType: 'minion',
        amount: damage,
        sourceId,
        sourceType: sourceId ? 'spell' : 'effect',
      } as DamageEventData);
    }

    const died = (target.currentHealth ?? 0) <= 0;
    return { died, actualDamage };
  }

  /**
   * Heal a minion
   */
  healMinion(
    targetId: string,
    amount: number,
    sourceId: string | undefined,
    targetOwnerId: string
  ): number {
    const target = this.board.getCardOrThrow(targetId);

    if (target.currentHealth === undefined || target.maxHealth === undefined) {
      return 0;
    }

    const maxHeal = target.maxHealth - target.currentHealth;
    const actualHeal = Math.min(amount, maxHeal);

    if (actualHeal > 0) {
      target.currentHealth += actualHeal;

      this.emitEvent(GameEventType.HEALING_DONE, undefined, {
        targetId,
        targetType: 'minion',
        amount,
        actualHealing: actualHeal,
        sourceId,
      } as HealEventData);
    }

    return actualHeal;
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

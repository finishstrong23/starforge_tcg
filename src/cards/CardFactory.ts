/**
 * STARFORGE TCG - Card Factory
 *
 * Creates card instances from definitions for use in games.
 */

import { CardZone } from '../types/Card';
import type { CardDefinition, CardInstance, StatBuff } from '../types/Card';
import type { KeywordInstance } from '../types/Keywords';
import { generateCardInstanceId } from '../utils/ids';
import { CardDatabase, globalCardDatabase } from './CardDatabase';
import { deepClone } from '../utils/object';

/**
 * Options for creating a card instance
 */
export interface CreateCardOptions {
  /** Owner player ID */
  ownerId: string;
  /** Controller player ID (defaults to owner) */
  controllerId?: string;
  /** Initial zone */
  zone?: CardZone;
  /** Override instance ID (for testing) */
  instanceId?: string;
  /** Whether this is an ECHO copy */
  isEchoInstance?: boolean;
}

/**
 * Card Factory class
 * Creates and manages card instances
 */
export class CardFactory {
  private database: CardDatabase;

  constructor(database: CardDatabase = globalCardDatabase) {
    this.database = database;
  }

  /**
   * Create a card instance from a definition ID
   */
  createInstance(definitionId: string, options: CreateCardOptions): CardInstance {
    const definition = this.database.getCardOrThrow(definitionId);
    return this.createInstanceFromDefinition(definition, options);
  }

  /**
   * Create a card instance from a definition object
   */
  createInstanceFromDefinition(
    definition: CardDefinition,
    options: CreateCardOptions
  ): CardInstance {
    const instanceId = options.instanceId || generateCardInstanceId();

    const instance: CardInstance = {
      instanceId,
      definitionId: definition.id,
      ownerId: options.ownerId,
      controllerId: options.controllerId || options.ownerId,
      currentCost: definition.cost,
      keywords: deepClone(definition.keywords),
      hasAttackedThisTurn: false,
      attacksMadeThisTurn: 0,
      summonedThisTurn: false,
      hasBarrier: this.hasInitialBarrier(definition),
      isCloaked: this.hasInitialCloak(definition),
      isSilenced: false,
      isEchoInstance: options.isEchoInstance || false,
      isForged: false,
      temporaryBuffs: [],
      permanentBuffs: [],
      enchantments: [],
      zone: options.zone || CardZone.DECK,
    };

    // Set minion-specific stats
    if (definition.attack !== undefined) {
      instance.currentAttack = definition.attack;
    }
    if (definition.health !== undefined) {
      instance.currentHealth = definition.health;
      instance.maxHealth = definition.health;
    }

    // Initialize STARFORGE progress if applicable
    if (definition.starforge) {
      instance.starforgeProgress = 0;
    }

    return instance;
  }

  /**
   * Create multiple card instances for a deck
   */
  createDeck(cardIds: string[], ownerId: string): CardInstance[] {
    return cardIds.map((id) =>
      this.createInstance(id, { ownerId, zone: CardZone.DECK })
    );
  }

  /**
   * Create a copy of an existing card instance
   */
  copyInstance(
    source: CardInstance,
    newOwnerId?: string,
    newZone?: CardZone
  ): CardInstance {
    const copy: CardInstance = deepClone(source);
    copy.instanceId = generateCardInstanceId();
    copy.ownerId = newOwnerId || source.ownerId;
    copy.controllerId = newOwnerId || source.controllerId;
    copy.zone = newZone || source.zone;

    // Reset turn-based state
    copy.hasAttackedThisTurn = false;
    copy.attacksMadeThisTurn = 0;
    copy.summonedThisTurn = true;

    return copy;
  }

  /**
   * Create a token minion (not from database)
   */
  createToken(
    name: string,
    attack: number,
    health: number,
    ownerId: string,
    options: {
      keywords?: KeywordInstance[];
      tribe?: string;
      zone?: CardZone;
    } = {}
  ): CardInstance {
    const instanceId = generateCardInstanceId();

    return {
      instanceId,
      definitionId: `token_${name.toLowerCase().replace(/\s/g, '_')}`,
      ownerId,
      controllerId: ownerId,
      currentCost: 0,
      currentAttack: attack,
      currentHealth: health,
      maxHealth: health,
      keywords: options.keywords || [],
      hasAttackedThisTurn: false,
      attacksMadeThisTurn: 0,
      summonedThisTurn: true,
      hasBarrier: (options.keywords || []).some(
        (k) => k.keyword === ('BARRIER' as any)
      ),
      isCloaked: (options.keywords || []).some(
        (k) => k.keyword === ('CLOAK' as any)
      ),
      isSilenced: false,
      isEchoInstance: false,
      isForged: false,
      temporaryBuffs: [],
      permanentBuffs: [],
      enchantments: [],
      zone: options.zone || CardZone.BOARD,
    };
  }

  /**
   * Reset a card instance to its base state (for transformations)
   */
  resetToBase(instance: CardInstance): CardInstance {
    const definition = this.database.getCardOrThrow(instance.definitionId);

    instance.currentCost = definition.cost;
    instance.keywords = deepClone(definition.keywords);
    instance.isSilenced = false;
    instance.temporaryBuffs = [];
    instance.permanentBuffs = [];
    instance.enchantments = [];

    if (definition.attack !== undefined) {
      instance.currentAttack = definition.attack;
    }
    if (definition.health !== undefined) {
      instance.currentHealth = definition.health;
      instance.maxHealth = definition.health;
    }

    instance.hasBarrier = this.hasInitialBarrier(definition);
    instance.isCloaked = this.hasInitialCloak(definition);

    return instance;
  }

  /**
   * Apply a stat buff to a card
   */
  applyBuff(
    instance: CardInstance,
    attackMod: number,
    healthMod: number,
    source: string,
    isTemporary = false
  ): CardInstance {
    const buff: StatBuff = {
      id: generateCardInstanceId(),
      attackModifier: attackMod,
      healthModifier: healthMod,
      source,
      isTemporary,
    };

    if (isTemporary) {
      instance.temporaryBuffs.push(buff);
    } else {
      instance.permanentBuffs.push(buff);
    }

    // Apply health buff
    if (healthMod > 0 && instance.currentHealth !== undefined) {
      instance.currentHealth += healthMod;
      if (instance.maxHealth !== undefined) {
        instance.maxHealth += healthMod;
      }
    }

    return instance;
  }

  /**
   * Remove temporary buffs at end of turn
   */
  clearTemporaryBuffs(instance: CardInstance): CardInstance {
    // Calculate total temporary health buff being removed
    const tempHealthLoss = instance.temporaryBuffs.reduce(
      (sum, buff) => sum + buff.healthModifier,
      0
    );

    instance.temporaryBuffs = [];

    // Reduce max health and current health
    if (instance.maxHealth !== undefined && instance.currentHealth !== undefined) {
      instance.maxHealth = Math.max(1, instance.maxHealth - tempHealthLoss);
      instance.currentHealth = Math.min(instance.currentHealth, instance.maxHealth);
    }

    return instance;
  }

  /**
   * Silence a card (remove keywords and card text effects)
   */
  silenceCard(instance: CardInstance): CardInstance {
    instance.isSilenced = true;
    instance.keywords = [];
    instance.hasBarrier = false;
    instance.isCloaked = false;
    instance.enchantments = [];

    // Keep current stats but remove buffs
    // Note: In some TCGs, silence keeps current stats. We'll follow that pattern.

    return instance;
  }

  /**
   * Grant a keyword to a card
   */
  grantKeyword(
    instance: CardInstance,
    keyword: KeywordInstance,
    _isTemporary = false
  ): CardInstance {
    // Don't grant keywords to silenced cards
    if (instance.isSilenced) return instance;

    // Check if already has keyword
    const hasKeyword = instance.keywords.some(
      (k) => k.keyword === keyword.keyword
    );
    if (hasKeyword) return instance;

    instance.keywords.push(keyword);

    // Handle special keywords
    if (keyword.keyword === ('BARRIER' as any)) {
      instance.hasBarrier = true;
    }
    if (keyword.keyword === ('CLOAK' as any)) {
      instance.isCloaked = true;
    }

    return instance;
  }

  /**
   * Remove a keyword from a card
   */
  removeKeyword(instance: CardInstance, keyword: string): CardInstance {
    instance.keywords = instance.keywords.filter(
      (k) => k.keyword !== keyword
    );

    if (keyword === 'BARRIER') {
      instance.hasBarrier = false;
    }
    if (keyword === 'CLOAK') {
      instance.isCloaked = false;
    }

    return instance;
  }

  /**
   * Helper: Check if definition has BARRIER initially
   */
  private hasInitialBarrier(definition: CardDefinition): boolean {
    return definition.keywords.some((k) => k.keyword === ('BARRIER' as any));
  }

  /**
   * Helper: Check if definition has CLOAK initially
   */
  private hasInitialCloak(definition: CardDefinition): boolean {
    return definition.keywords.some((k) => k.keyword === ('CLOAK' as any));
  }

  /**
   * Get the base definition for a card instance
   */
  getDefinition(instance: CardInstance): CardDefinition {
    return this.database.getCardOrThrow(instance.definitionId);
  }

  /**
   * Calculate the effective attack after all modifiers
   */
  getEffectiveAttack(instance: CardInstance): number {
    if (instance.currentAttack === undefined) return 0;

    let attack = instance.currentAttack;

    for (const buff of [...instance.temporaryBuffs, ...instance.permanentBuffs]) {
      attack += buff.attackModifier;
    }

    return Math.max(0, attack);
  }

  /**
   * Calculate the effective health after all modifiers
   */
  getEffectiveHealth(instance: CardInstance): number {
    return instance.currentHealth !== undefined
      ? Math.max(0, instance.currentHealth)
      : 0;
  }

  /**
   * Calculate effective cost after modifiers
   */
  getEffectiveCost(instance: CardInstance): number {
    // Cost is already modified on the instance
    return Math.max(0, instance.currentCost);
  }
}

/**
 * Global card factory instance
 */
export const globalCardFactory = new CardFactory();

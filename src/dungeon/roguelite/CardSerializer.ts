/**
 * STARFORGE TCG — Roguelite Card Serialization
 *
 * Handles serializing run decks to JSON-safe format for localStorage,
 * and rehydrating them back to full CardInstance[] for battle.
 *
 * Key principle: we only store definitionId + ordered upgrade list.
 * At rehydration time, we rebuild the CardInstance from scratch and
 * replay all upgrades in order. This guarantees deterministic results.
 *
 * For effect-scaling upgrades (SCALE_DAMAGE, SCALE_HEAL), we create
 * temporary patched CardDefinitions and register them in the database
 * so the EffectResolver picks up the modified values naturally.
 */

import type { CardInstance, CardDefinition } from '../../types/Card';
import { CardZone } from '../../types/Card';
import { EffectType } from '../../types/Effects';
import type { DamageEffectData, HealEffectData, Effect } from '../../types/Effects';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { globalCardFactory } from '../../cards/CardFactory';
import { generateCardInstanceId } from '../../utils/ids';
import { deepClone } from '../../utils/object';
import type { SerializedRunCard } from './types';
import { UPGRADES_BY_ID, EFFECT_SCALING_MAP } from './data/upgrades';

/**
 * Serialize a run deck: extract just the data needed for persistence.
 * Called when saving the run state.
 */
export function serializeRunCard(
  definitionId: string,
  runCardId?: string,
): SerializedRunCard {
  return {
    runCardId: runCardId || generateCardInstanceId(),
    definitionId,
    upgrades: [],
  };
}

/**
 * Rehydrate a full run deck from serialized cards.
 * Creates CardInstance[] ready for battle, with all upgrades replayed.
 *
 * @param serializedDeck - the serialized run cards from DungeonRunSave
 * @param ownerId - player ID for the instances (default 'player')
 * @returns array of fully upgraded CardInstances
 */
export function rehydrateDeck(
  serializedDeck: SerializedRunCard[],
  ownerId: string = 'player',
): CardInstance[] {
  return serializedDeck.map(runCard => rehydrateCard(runCard, ownerId));
}

/**
 * Rehydrate a single card from its serialized form.
 * Rebuilds the CardInstance, replays all upgrades, and handles
 * effect scaling by creating patched definitions when needed.
 */
export function rehydrateCard(
  runCard: SerializedRunCard,
  ownerId: string = 'player',
): CardInstance {
  // Calculate total effect scaling from upgrades
  const effectScaling = computeEffectScaling(runCard);

  // Determine which definitionId to use
  let effectiveDefId = runCard.definitionId;

  // If there's effect scaling, create a patched definition
  if (effectScaling.damageBonus > 0 || effectScaling.healBonus > 0) {
    effectiveDefId = getOrCreatePatchedDefinition(
      runCard.definitionId,
      runCard.runCardId,
      effectScaling,
    );
  }

  // Create a fresh CardInstance from the (possibly patched) definition
  const instance = globalCardFactory.createInstance(effectiveDefId, {
    ownerId,
    zone: CardZone.DECK,
    instanceId: runCard.runCardId,
  });

  // Replay all non-effect-scaling upgrades in order
  for (const upgrade of runCard.upgrades) {
    const template = UPGRADES_BY_ID[upgrade.templateId];
    if (!template) continue;

    // Skip effect-scaling upgrades (already handled via patched definition)
    if (EFFECT_SCALING_MAP[upgrade.templateId]) continue;

    template.apply(instance);
  }

  // Apply custom name if set (from Starforge Stamp)
  if (runCard.customName) {
    // Store as a permanent buff source for display
    instance.permanentBuffs.push({
      id: generateCardInstanceId(),
      attackModifier: 0,
      healthModifier: 0,
      source: `Renamed: ${runCard.customName}`,
      isTemporary: false,
    });
  }

  return instance;
}

// ─── Effect Scaling ────────────────────────────────────────

interface EffectScalingTotals {
  damageBonus: number;
  healBonus: number;
}

/**
 * Sum up all effect-scaling upgrades for a card.
 */
function computeEffectScaling(runCard: SerializedRunCard): EffectScalingTotals {
  const totals: EffectScalingTotals = { damageBonus: 0, healBonus: 0 };

  for (const upgrade of runCard.upgrades) {
    const scaling = EFFECT_SCALING_MAP[upgrade.templateId];
    if (!scaling) continue;

    if (scaling.type === 'damage') {
      totals.damageBonus += scaling.delta;
    } else if (scaling.type === 'heal') {
      totals.healBonus += scaling.delta;
    }
  }

  return totals;
}

/**
 * Create a temporary patched CardDefinition with modified effect values.
 * Uses a versioned ID that encodes the scaling amounts so a new version
 * is registered whenever upgrades change (registerCard skips existing IDs).
 * Returns the patched definition's ID.
 */
function getOrCreatePatchedDefinition(
  baseDefId: string,
  runCardId: string,
  scaling: EffectScalingTotals,
): string {
  // Encode scaling into the ID so new upgrades produce new definitions
  const patchedId = `${baseDefId}__run_${runCardId}_d${scaling.damageBonus}_h${scaling.healBonus}`;

  // Already registered from a previous rehydration with same scaling
  if (globalCardDatabase.getCard(patchedId)) {
    return patchedId;
  }

  const baseDef = globalCardDatabase.getCard(baseDefId);
  if (!baseDef) return baseDefId; // Fallback to original

  // Deep clone the definition
  const patched: CardDefinition = deepClone(baseDef);
  patched.id = patchedId;

  // Patch damage effects
  if (scaling.damageBonus > 0) {
    for (const effect of patched.effects) {
      if (effect.type === EffectType.DAMAGE) {
        const data = effect.data as DamageEffectData;
        if (typeof data.amount === 'number') {
          data.amount += scaling.damageBonus;
        }
      }
    }
  }

  // Patch heal effects
  if (scaling.healBonus > 0) {
    for (const effect of patched.effects) {
      if (effect.type === EffectType.HEAL) {
        const data = effect.data as HealEffectData;
        if (typeof data.amount === 'number') {
          data.amount += scaling.healBonus;
        }
      }
    }
  }

  // Register in the database (uses unique ID, won't conflict)
  globalCardDatabase.registerCard(patched);

  return patchedId;
}

/**
 * Get the display name for a run card (custom name or definition name).
 */
export function getRunCardDisplayName(runCard: SerializedRunCard): string {
  if (runCard.customName) return runCard.customName;
  const def = globalCardDatabase.getCard(runCard.definitionId);
  return def ? def.name : runCard.definitionId;
}

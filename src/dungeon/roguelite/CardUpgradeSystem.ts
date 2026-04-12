/**
 * STARFORGE TCG — Roguelite Card Upgrade System
 *
 * Manages offering, filtering, and applying upgrades to run cards.
 * Stat/keyword/cost upgrades mutate CardInstance directly.
 * Effect-scaling upgrades are tracked via templateId and applied
 * during card rehydration in CardSerializer.
 */

import type { CardInstance } from '../../types/Card';
import { CardType } from '../../types/Card';
import { globalCardDatabase } from '../../cards/CardDatabase';
import type { UpgradeTemplate, UpgradeTier, SerializedRunCard, AppliedUpgrade } from './types';
import { ALL_UPGRADES, UPGRADES_BY_ID, UPGRADES_BY_TIER } from './data/upgrades';

/**
 * Get random upgrade offers for a given tier, filtered to cards that can receive them.
 *
 * @param tier - COMMON, RARE, or LEGENDARY
 * @param count - number of options to present (default 3)
 * @param runCard - the serialized run card being upgraded (to filter applicability)
 * @returns array of applicable UpgradeTemplates
 */
export function getUpgradeOffers(
  tier: UpgradeTier,
  count: number = 3,
  runCard?: SerializedRunCard,
): UpgradeTemplate[] {
  let pool = [...UPGRADES_BY_TIER[tier]];

  // Filter by card type applicability if a specific card is provided
  if (runCard) {
    const def = globalCardDatabase.getCard(runCard.definitionId);
    if (def) {
      pool = pool.filter(upgrade => {
        if (upgrade.appliesTo === 'ANY') return true;
        if (upgrade.appliesTo === 'MINION' && def.type === CardType.MINION) return true;
        if (upgrade.appliesTo === 'SPELL' && def.type === CardType.SPELL) return true;
        return false;
      });
    }

    // Filter out duplicate keyword grants the card already has
    const existingUpgradeIds = new Set(runCard.upgrades.map(u => u.templateId));
    pool = pool.filter(upgrade => {
      // Allow stacking stat buffs
      if (upgrade.id.startsWith('SHARPEN') || upgrade.id.startsWith('FORTIFY') ||
          upgrade.id.startsWith('EMPOWER') || upgrade.id.startsWith('DISCOUNT') ||
          upgrade.id.startsWith('SCALE_')) {
        return true;
      }
      // Don't offer keyword grants already applied
      if (upgrade.id.startsWith('GRANT_') && existingUpgradeIds.has(upgrade.id)) {
        return false;
      }
      return true;
    });
  }

  // Shuffle and take `count`
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get mixed-tier upgrade offers (weighted by tier).
 * Used for post-battle rewards where tiers are mixed.
 *
 * @param count - number of options
 * @param allowLegendary - whether legendary upgrades can appear
 * @param runCard - optional card for filtering
 */
export function getMixedUpgradeOffers(
  count: number = 3,
  allowLegendary: boolean = false,
  runCard?: SerializedRunCard,
): UpgradeTemplate[] {
  const weights: [UpgradeTier, number][] = allowLegendary
    ? [['COMMON', 60], ['RARE', 30], ['LEGENDARY', 10]]
    : [['COMMON', 65], ['RARE', 35]];

  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  const results: UpgradeTemplate[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    let roll = Math.random() * totalWeight;
    let selectedTier: UpgradeTier = 'COMMON';
    for (const [tier, weight] of weights) {
      roll -= weight;
      if (roll <= 0) {
        selectedTier = tier;
        break;
      }
    }

    const offers = getUpgradeOffers(selectedTier, 10, runCard);
    const available = offers.filter(u => !usedIds.has(u.id));
    if (available.length > 0) {
      results.push(available[0]);
      usedIds.add(available[0].id);
    }
  }

  return results;
}

/**
 * Apply an upgrade to a CardInstance and record it on the serialized card.
 *
 * @param instance - the live CardInstance to mutate
 * @param runCard - the serialized run card to track the upgrade
 * @param upgradeId - the upgrade template ID to apply
 * @param nodeId - the map node where this upgrade was applied
 * @returns true if upgrade was applied successfully
 */
export function applyUpgrade(
  instance: CardInstance,
  runCard: SerializedRunCard,
  upgradeId: string,
  nodeId: string,
): boolean {
  const template = UPGRADES_BY_ID[upgradeId];
  if (!template) return false;

  // Apply instance-level mutations (stats, keywords, cost)
  template.apply(instance);

  // Record the upgrade on the serialized card
  runCard.upgrades.push({
    templateId: upgradeId,
    appliedAtNode: nodeId,
  });

  return true;
}

/**
 * Get the upgrade template by ID.
 */
export function getUpgradeTemplate(id: string): UpgradeTemplate | undefined {
  return UPGRADES_BY_ID[id];
}

/**
 * Count total upgrades applied to a run card.
 */
export function getUpgradeCount(runCard: SerializedRunCard): number {
  return runCard.upgrades.length;
}

/**
 * Get a human-readable summary of all upgrades applied to a card.
 */
export function getUpgradeSummary(runCard: SerializedRunCard): string[] {
  return runCard.upgrades.map(u => {
    const template = UPGRADES_BY_ID[u.templateId];
    return template ? `${template.name}: ${template.description}` : u.templateId;
  });
}

/**
 * Check if a specific upgrade can be applied to a card.
 */
export function canApplyUpgrade(
  upgradeId: string,
  runCard: SerializedRunCard,
): boolean {
  const template = UPGRADES_BY_ID[upgradeId];
  if (!template) return false;

  const def = globalCardDatabase.getCard(runCard.definitionId);
  if (!def) return false;

  // Type check
  if (template.appliesTo === 'MINION' && def.type !== CardType.MINION) return false;
  if (template.appliesTo === 'SPELL' && def.type !== CardType.SPELL) return false;

  // Don't allow duplicate keyword grants
  if (template.id.startsWith('GRANT_')) {
    const alreadyHas = runCard.upgrades.some(u => u.templateId === template.id);
    if (alreadyHas) return false;
  }

  return true;
}

/**
 * STARFORGE TCG — Roguelite Upgrade Catalog
 *
 * 25 upgrade templates across 3 tiers (Common/Rare/Legendary).
 * Each template's `apply` function mutates a CardInstance in-place.
 *
 * Stat upgrades modify currentAttack/currentHealth/maxHealth directly
 * and also push to permanentBuffs for UI tracking.
 *
 * Effect-scaling upgrades store metadata in `effectScaling` —
 * these are applied during card rehydration by patching the definition.
 */

import type { CardInstance } from '../../../types/Card';
import { CardType } from '../../../types/Card';
import { CombatKeyword, OriginalKeyword, TriggerKeyword } from '../../../types/Keywords';
import type { KeywordInstance } from '../../../types/Keywords';
import { generateCardInstanceId } from '../../../utils/ids';
import type { UpgradeTemplate, UpgradeTier } from '../types';
import { globalCardDatabase } from '../../../cards/CardDatabase';

// ─── Helpers ───────────────────────────────────────────────

function addBuff(instance: CardInstance, attack: number, health: number, source: string): void {
  const buff = {
    id: generateCardInstanceId(),
    attackModifier: attack,
    healthModifier: health,
    source,
    isTemporary: false,
  };
  instance.permanentBuffs.push(buff);

  if (attack !== 0 && instance.currentAttack !== undefined) {
    instance.currentAttack = Math.max(0, instance.currentAttack + attack);
  }
  if (health > 0 && instance.currentHealth !== undefined && instance.maxHealth !== undefined) {
    instance.currentHealth += health;
    instance.maxHealth += health;
  }
}

function grantKeywordSafe(instance: CardInstance, keyword: KeywordInstance): void {
  if (instance.isSilenced) return;
  const has = instance.keywords.some(k => k.keyword === keyword.keyword);
  if (has) {
    // For parameterized keywords, increase the value instead
    if (keyword.value !== undefined) {
      const existing = instance.keywords.find(k => k.keyword === keyword.keyword);
      if (existing && existing.value !== undefined) {
        existing.value += keyword.value;
        return;
      }
    }
    return;
  }
  instance.keywords.push({ ...keyword });

  if (keyword.keyword === CombatKeyword.BARRIER) {
    instance.hasBarrier = true;
  }
  if (keyword.keyword === CombatKeyword.CLOAK) {
    instance.isCloaked = true;
  }
}

function reduceCost(instance: CardInstance, amount: number): void {
  instance.currentCost = Math.max(0, instance.currentCost - amount);
}

function isMinion(instance: CardInstance): boolean {
  const def = globalCardDatabase.getCard(instance.definitionId);
  return def ? def.type === CardType.MINION : instance.currentAttack !== undefined;
}

// ─── Common Upgrades (Tier 1) ──────────────────────────────

const SHARPEN_I: UpgradeTemplate = {
  id: 'SHARPEN_I',
  name: 'Sharpen',
  description: '+2 Attack',
  tier: 'COMMON',
  icon: '⚔️',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 2, 0, 'Sharpen I'),
};

const FORTIFY_I: UpgradeTemplate = {
  id: 'FORTIFY_I',
  name: 'Fortify',
  description: '+3 Health',
  tier: 'COMMON',
  icon: '🛡️',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 0, 3, 'Fortify I'),
};

const EMPOWER_I: UpgradeTemplate = {
  id: 'EMPOWER_I',
  name: 'Empower',
  description: '+2/+2',
  tier: 'COMMON',
  icon: '✨',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 2, 2, 'Empower I'),
};

const DISCOUNT_I: UpgradeTemplate = {
  id: 'DISCOUNT_I',
  name: 'Streamline',
  description: 'Cost -1',
  tier: 'COMMON',
  icon: '💎',
  appliesTo: 'ANY',
  apply: (inst) => reduceCost(inst, 1),
};

const GRANT_SWIFT: UpgradeTemplate = {
  id: 'GRANT_SWIFT',
  name: 'Quicken',
  description: 'Gain Swift',
  tier: 'COMMON',
  icon: '💨',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.SWIFT }),
};

const GRANT_GUARDIAN: UpgradeTemplate = {
  id: 'GRANT_GUARDIAN',
  name: 'Shield Training',
  description: 'Gain Guardian',
  tier: 'COMMON',
  icon: '🏰',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.GUARDIAN }),
};

const GRANT_BARRIER: UpgradeTemplate = {
  id: 'GRANT_BARRIER',
  name: 'Hardlight Shell',
  description: 'Gain Barrier',
  tier: 'COMMON',
  icon: '🔮',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.BARRIER }),
};

const SCALE_DAMAGE_I: UpgradeTemplate = {
  id: 'SCALE_DAMAGE_I',
  name: 'Intensify',
  description: 'Effect damage +2',
  tier: 'COMMON',
  icon: '🔥',
  appliesTo: 'ANY',
  apply: (_inst) => {
    // Effect scaling is handled during rehydration via CardSerializer
    // The apply function is a no-op; scaling is driven by the templateId
  },
};

const SCALE_HEAL_I: UpgradeTemplate = {
  id: 'SCALE_HEAL_I',
  name: 'Mend',
  description: 'Effect healing +2',
  tier: 'COMMON',
  icon: '💚',
  appliesTo: 'ANY',
  apply: (_inst) => {
    // Effect scaling handled during rehydration
  },
};

// ─── Rare Upgrades (Tier 2) ───────────────────────────────

const SHARPEN_II: UpgradeTemplate = {
  id: 'SHARPEN_II',
  name: 'Hone',
  description: '+4 Attack, +2 Health',
  tier: 'RARE',
  icon: '⚔️',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 4, 2, 'Hone'),
};

const FORTIFY_II: UpgradeTemplate = {
  id: 'FORTIFY_II',
  name: 'Reinforce',
  description: '+2 Attack, +5 Health',
  tier: 'RARE',
  icon: '🛡️',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 2, 5, 'Reinforce'),
};

const EMPOWER_II: UpgradeTemplate = {
  id: 'EMPOWER_II',
  name: 'Surge',
  description: '+4/+4',
  tier: 'RARE',
  icon: '✨',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 4, 4, 'Surge'),
};

const DISCOUNT_II: UpgradeTemplate = {
  id: 'DISCOUNT_II',
  name: 'Efficiency',
  description: 'Cost -2',
  tier: 'RARE',
  icon: '💎',
  appliesTo: 'ANY',
  apply: (inst) => reduceCost(inst, 2),
};

const GRANT_DRAIN: UpgradeTemplate = {
  id: 'GRANT_DRAIN',
  name: 'Siphon Rune',
  description: 'Gain Drain',
  tier: 'RARE',
  icon: '🩸',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.DRAIN }),
};

const GRANT_DOUBLE_STRIKE: UpgradeTemplate = {
  id: 'GRANT_DOUBLE_STRIKE',
  name: 'Twin Edge',
  description: 'Gain Double Strike',
  tier: 'RARE',
  icon: '⚡',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.DOUBLE_STRIKE }),
};

const GRANT_BLITZ: UpgradeTemplate = {
  id: 'GRANT_BLITZ',
  name: 'War Drums',
  description: 'Gain Blitz',
  tier: 'RARE',
  icon: '🥁',
  appliesTo: 'MINION',
  apply: (inst) => grantKeywordSafe(inst, { keyword: CombatKeyword.BLITZ }),
};

const SCALE_DAMAGE_II: UpgradeTemplate = {
  id: 'SCALE_DAMAGE_II',
  name: 'Overcharge',
  description: 'Effect damage +5',
  tier: 'RARE',
  icon: '🔥',
  appliesTo: 'ANY',
  apply: (_inst) => {
    // Effect scaling handled during rehydration
  },
};

const SCRY_UP: UpgradeTemplate = {
  id: 'SCRY_UP',
  name: 'Deep Sight',
  description: 'SCRY(X) +2',
  tier: 'RARE',
  icon: '👁️',
  appliesTo: 'ANY',
  apply: (inst) => {
    const scryKw = inst.keywords.find(k => k.keyword === OriginalKeyword.SCRY);
    if (scryKw && scryKw.value !== undefined) {
      scryKw.value += 2;
    }
  },
};

const UPGRADE_UP: UpgradeTemplate = {
  id: 'UPGRADE_UP',
  name: 'Overhaul',
  description: 'UPGRADE(X) +2',
  tier: 'RARE',
  icon: '🔧',
  appliesTo: 'ANY',
  apply: (inst) => {
    const upgradeKw = inst.keywords.find(k => k.keyword === OriginalKeyword.UPGRADE);
    if (upgradeKw && upgradeKw.value !== undefined) {
      upgradeKw.value += 2;
    }
  },
};

// ─── Legendary Upgrades (Tier 3) ──────────────────────────

const OVERFORGE: UpgradeTemplate = {
  id: 'OVERFORGE',
  name: 'Overforge',
  description: 'Apply 2 random Rare upgrades',
  tier: 'LEGENDARY',
  icon: '🔨',
  appliesTo: 'MINION',
  apply: (inst) => {
    // Pick 2 random rare stat/keyword upgrades and apply them
    const rareOptions = [SHARPEN_II, FORTIFY_II, EMPOWER_II, GRANT_DRAIN, GRANT_DOUBLE_STRIKE, GRANT_BLITZ];
    const shuffled = [...rareOptions].sort(() => Math.random() - 0.5);
    shuffled[0].apply(inst);
    shuffled[1].apply(inst);
  },
};

const EMPOWER_III: UpgradeTemplate = {
  id: 'EMPOWER_III',
  name: 'Ascension',
  description: '+6/+6',
  tier: 'LEGENDARY',
  icon: '🌟',
  appliesTo: 'MINION',
  apply: (inst) => addBuff(inst, 6, 6, 'Ascension'),
};

const FREE_CAST: UpgradeTemplate = {
  id: 'FREE_CAST',
  name: 'Void Infusion',
  description: 'Cost becomes 0',
  tier: 'LEGENDARY',
  icon: '🕳️',
  appliesTo: 'ANY',
  apply: (inst) => {
    inst.currentCost = 0;
  },
};

const SCALE_DAMAGE_III: UpgradeTemplate = {
  id: 'SCALE_DAMAGE_III',
  name: 'Cataclysm',
  description: 'Effect damage +10',
  tier: 'LEGENDARY',
  icon: '☄️',
  appliesTo: 'ANY',
  apply: (_inst) => {
    // Effect scaling handled during rehydration
  },
};

const STARFORGE_STAMP: UpgradeTemplate = {
  id: 'STARFORGE_STAMP',
  name: 'Starforge Stamp',
  description: '+4/+4 and gain 2 random combat keywords',
  tier: 'LEGENDARY',
  icon: '⭐',
  appliesTo: 'MINION',
  apply: (inst) => {
    addBuff(inst, 4, 4, 'Starforge Stamp');

    const combatKeywords: KeywordInstance[] = [
      { keyword: CombatKeyword.GUARDIAN },
      { keyword: CombatKeyword.BARRIER },
      { keyword: CombatKeyword.SWIFT },
      { keyword: CombatKeyword.BLITZ },
      { keyword: CombatKeyword.DOUBLE_STRIKE },
      { keyword: CombatKeyword.DRAIN },
      { keyword: CombatKeyword.BANE },
    ];

    // Filter out keywords the card already has
    const available = combatKeywords.filter(
      kw => !inst.keywords.some(k => k.keyword === kw.keyword)
    );

    const shuffled = available.sort(() => Math.random() - 0.5);
    const toGrant = shuffled.slice(0, Math.min(2, shuffled.length));
    for (const kw of toGrant) {
      grantKeywordSafe(inst, kw);
    }
  },
};

const ASCENDANT: UpgradeTemplate = {
  id: 'ASCENDANT',
  name: 'Ascendant',
  description: '+5/+5 and gain Swift + Drain',
  tier: 'LEGENDARY',
  icon: '👑',
  appliesTo: 'MINION',
  apply: (inst) => {
    addBuff(inst, 5, 5, 'Ascendant');
    grantKeywordSafe(inst, { keyword: CombatKeyword.SWIFT });
    grantKeywordSafe(inst, { keyword: CombatKeyword.DRAIN });
  },
};

// ─── Full Catalog ──────────────────────────────────────────

export const ALL_UPGRADES: UpgradeTemplate[] = [
  // Common
  SHARPEN_I, FORTIFY_I, EMPOWER_I, DISCOUNT_I,
  GRANT_SWIFT, GRANT_GUARDIAN, GRANT_BARRIER,
  SCALE_DAMAGE_I, SCALE_HEAL_I,
  // Rare
  SHARPEN_II, FORTIFY_II, EMPOWER_II, DISCOUNT_II,
  GRANT_DRAIN, GRANT_DOUBLE_STRIKE, GRANT_BLITZ,
  SCALE_DAMAGE_II, SCRY_UP, UPGRADE_UP,
  // Legendary
  OVERFORGE, EMPOWER_III, FREE_CAST,
  SCALE_DAMAGE_III, STARFORGE_STAMP, ASCENDANT,
];

export const UPGRADES_BY_ID: Record<string, UpgradeTemplate> = Object.fromEntries(
  ALL_UPGRADES.map(u => [u.id, u])
);

export const UPGRADES_BY_TIER: Record<UpgradeTier, UpgradeTemplate[]> = {
  COMMON: ALL_UPGRADES.filter(u => u.tier === 'COMMON'),
  RARE: ALL_UPGRADES.filter(u => u.tier === 'RARE'),
  LEGENDARY: ALL_UPGRADES.filter(u => u.tier === 'LEGENDARY'),
};

/** Effect-scaling upgrade IDs and their delta amounts */
export const EFFECT_SCALING_MAP: Record<string, { type: 'damage' | 'heal'; delta: number }> = {
  SCALE_DAMAGE_I: { type: 'damage', delta: 2 },
  SCALE_DAMAGE_II: { type: 'damage', delta: 5 },
  SCALE_DAMAGE_III: { type: 'damage', delta: 10 },
  SCALE_HEAL_I: { type: 'heal', delta: 2 },
};

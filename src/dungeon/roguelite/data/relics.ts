/**
 * STARFORGE TCG — Roguelite Relic Catalog
 *
 * 15 relics across 3 tiers. Effects are implemented in RelicSystem.ts
 * and hooked into GameEngine events during battle.
 */

import type { RelicDefinition, RelicTier } from '../types';

// ─── Common Relics ─────────────────────────────────────────

export const RELIC_EMBER_CORE: RelicDefinition = {
  id: 'EMBER_CORE',
  name: 'Ember Core',
  description: 'Turn 1: Gain +1 crystal this battle.',
  flavorText: 'A shard of Ignaros, still warm after millennia.',
  tier: 'COMMON',
  icon: '🔥',
};

export const RELIC_VANGUARD_TOKEN: RelicDefinition = {
  id: 'VANGUARD_TOKEN',
  name: "Vanguard's Token",
  description: 'First minion you play each battle gets +2/+2.',
  flavorText: 'Carried by the first through every breach.',
  tier: 'COMMON',
  icon: '🏅',
};

export const RELIC_SCRAP_COLLECTOR: RelicDefinition = {
  id: 'SCRAP_COLLECTOR',
  name: 'Scrap Collector',
  description: 'When your minion dies, gain 5 gold.',
  flavorText: 'One machine\'s scrap is another\'s treasure.',
  tier: 'COMMON',
  icon: '⚙️',
};

export const RELIC_BATTLE_MEDIC: RelicDefinition = {
  id: 'BATTLE_MEDIC',
  name: 'Battle Medic',
  description: 'Heal 1 HP at the start of each of your turns.',
  flavorText: 'A tiny drone that patches wounds between swings.',
  tier: 'COMMON',
  icon: '💊',
};

export const RELIC_SCOUT_LANTERN: RelicDefinition = {
  id: 'SCOUT_LANTERN',
  name: "Scout's Lantern",
  description: 'Draw 1 extra card at the start of battle.',
  flavorText: 'See further, strike first.',
  tier: 'COMMON',
  icon: '🏮',
};

// ─── Rare Relics ───────────────────────────────────────────

export const RELIC_BLOODFORGE_AMULET: RelicDefinition = {
  id: 'BLOODFORGE_AMULET',
  name: 'Bloodforge Amulet',
  description: 'When your minion deals damage, 20% chance to heal hero for 1.',
  flavorText: 'Forged in the blood of fallen champions.',
  tier: 'RARE',
  icon: '💍',
};

export const RELIC_ECHO_MATRIX: RelicDefinition = {
  id: 'ECHO_MATRIX',
  name: 'Echo Matrix',
  description: 'First spell you cast each battle is cast twice.',
  flavorText: 'Reality stutters, and the spell echoes.',
  tier: 'RARE',
  icon: '🔮',
};

export const RELIC_GRAVEWALKER_CLOAK: RelicDefinition = {
  id: 'GRAVEWALKER_CLOAK',
  name: "Gravewalker's Cloak",
  description: 'When your minion dies, 25% chance to shuffle a copy into your deck.',
  flavorText: 'The dead walk again... and again.',
  tier: 'RARE',
  icon: '🧥',
};

export const RELIC_CHRONOSHARD: RelicDefinition = {
  id: 'CHRONOSHARD',
  name: 'Chronoshard',
  description: 'First card you play each turn costs 1 less.',
  flavorText: 'Time bends to hasten your first move.',
  tier: 'RARE',
  icon: '⏳',
};

export const RELIC_FORGEHEART: RelicDefinition = {
  id: 'FORGEHEART',
  name: 'Forgeheart',
  description: 'When you upgrade a card, heal 5 HP.',
  flavorText: 'The act of creation heals all wounds.',
  tier: 'RARE',
  icon: '❤️‍🔥',
};

// ─── Legendary Relics ──────────────────────────────────────

export const RELIC_STARFORGE_LENS: RelicDefinition = {
  id: 'STARFORGE_LENS',
  name: 'Starforge Lens',
  description: 'STARFORGE cards gain +1 extra progress per trigger.',
  flavorText: 'See the forge as it truly is — infinite potential.',
  tier: 'LEGENDARY',
  icon: '🔭',
};

export const RELIC_CROWN_COSMOS: RelicDefinition = {
  id: 'CROWN_COSMOS',
  name: 'Crown of the Cosmos',
  description: 'All minions in your starting hand get +1/+1.',
  flavorText: 'The stars align for those who wear the crown.',
  tier: 'LEGENDARY',
  icon: '👑',
};

export const RELIC_INFINITY_ENGINE: RelicDefinition = {
  id: 'INFINITY_ENGINE',
  name: 'Infinity Engine',
  description: 'Every 3rd turn, gain +2 crystals.',
  flavorText: 'Perpetual motion made real.',
  tier: 'LEGENDARY',
  icon: '♾️',
};

export const RELIC_PHOENIX_FEATHER: RelicDefinition = {
  id: 'PHOENIX_FEATHER',
  name: 'Phoenix Feather',
  description: 'Survive lethal damage once per battle with 1 HP.',
  flavorText: 'From ashes, rise.',
  tier: 'LEGENDARY',
  icon: '🪶',
};

export const RELIC_NEXUS_PRISM: RelicDefinition = {
  id: 'NEXUS_PRISM',
  name: 'Nexus Prism',
  description: 'When a minion gains a keyword, it also gains +1/+1.',
  flavorText: 'Every keyword echoes with power.',
  tier: 'LEGENDARY',
  icon: '💠',
};

// ─── Full Catalog ──────────────────────────────────────────

export const ALL_RELICS: RelicDefinition[] = [
  RELIC_EMBER_CORE, RELIC_VANGUARD_TOKEN, RELIC_SCRAP_COLLECTOR,
  RELIC_BATTLE_MEDIC, RELIC_SCOUT_LANTERN,
  RELIC_BLOODFORGE_AMULET, RELIC_ECHO_MATRIX, RELIC_GRAVEWALKER_CLOAK,
  RELIC_CHRONOSHARD, RELIC_FORGEHEART,
  RELIC_STARFORGE_LENS, RELIC_CROWN_COSMOS, RELIC_INFINITY_ENGINE,
  RELIC_PHOENIX_FEATHER, RELIC_NEXUS_PRISM,
];

export const RELICS_BY_ID: Record<string, RelicDefinition> = Object.fromEntries(
  ALL_RELICS.map(r => [r.id, r])
);

export const RELICS_BY_TIER: Record<RelicTier, RelicDefinition[]> = {
  COMMON: ALL_RELICS.filter(r => r.tier === 'COMMON'),
  RARE: ALL_RELICS.filter(r => r.tier === 'RARE'),
  LEGENDARY: ALL_RELICS.filter(r => r.tier === 'LEGENDARY'),
};

/**
 * Get random relic offers, excluding relics the player already owns.
 */
export function getRelicOffers(
  count: number,
  ownedRelicIds: string[],
  maxTier: RelicTier = 'LEGENDARY',
): RelicDefinition[] {
  const tierOrder: RelicTier[] = ['COMMON', 'RARE', 'LEGENDARY'];
  const maxIdx = tierOrder.indexOf(maxTier);

  const available = ALL_RELICS.filter(r => {
    if (ownedRelicIds.includes(r.id)) return false;
    const tierIdx = tierOrder.indexOf(r.tier);
    return tierIdx <= maxIdx;
  });

  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

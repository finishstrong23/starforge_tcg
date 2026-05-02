/**
 * STARFORGE TCG — Dungeon Run Card Pool
 * Cards available for drafting in the roguelite dungeon mode.
 */

import type { DungeonCardDefinition, DungeonFaction } from '../types';

const COGSMITHS_CARDS: DungeonCardDefinition[] = [
  { id: 'cog_spark_bolt', name: 'Spark Bolt', faction: 'Cogsmiths', type: 'Spell', cost: 1, keywords: [], cardText: 'Deal 6 damage.', rarity: 'Common' },
  { id: 'cog_gear_shield', name: 'Gear Shield', faction: 'Cogsmiths', type: 'Spell', cost: 1, keywords: [], cardText: 'Gain 5 Block.', rarity: 'Common' },
  { id: 'cog_tinker_bot', name: 'Tinker Bot', faction: 'Cogsmiths', type: 'Minion', cost: 1, attack: 2, health: 3, keywords: [], cardText: '', rarity: 'Common', tribe: 'Mech' },
  { id: 'cog_iron_sentinel', name: 'Iron Sentinel', faction: 'Cogsmiths', type: 'Minion', cost: 2, attack: 2, health: 5, keywords: ['GUARDIAN'], cardText: 'GUARDIAN.', rarity: 'Common', tribe: 'Mech' },
  { id: 'cog_overcharge', name: 'Overcharge', faction: 'Cogsmiths', type: 'Spell', cost: 2, keywords: [], cardText: 'Deal 10 damage. Draw 1 card.', rarity: 'Rare' },
  { id: 'cog_repair_drone', name: 'Repair Drone', faction: 'Cogsmiths', type: 'Minion', cost: 2, attack: 1, health: 4, keywords: [], cardText: 'Deploy: Restore 4 health to your hero.', rarity: 'Common', tribe: 'Mech' },
  { id: 'cog_arc_welder', name: 'Arc Welder', faction: 'Cogsmiths', type: 'Minion', cost: 3, attack: 4, health: 3, keywords: ['SWIFT'], cardText: 'SWIFT.', rarity: 'Rare', tribe: 'Mech' },
  { id: 'cog_blast_charge', name: 'Blast Charge', faction: 'Cogsmiths', type: 'Spell', cost: 3, keywords: [], cardText: 'Deal 8 damage to all enemies.', rarity: 'Rare' },
  { id: 'cog_mech_titan', name: 'Mech Titan', faction: 'Cogsmiths', type: 'Minion', cost: 5, attack: 6, health: 7, keywords: ['GUARDIAN'], cardText: 'GUARDIAN. Deploy: Gain 4 Block.', rarity: 'Epic', tribe: 'Mech' },
  { id: 'cog_forge_master', name: 'Forge Master', faction: 'Cogsmiths', type: 'Minion', cost: 4, attack: 3, health: 5, keywords: [], cardText: 'Deploy: Give all friendly Mechs +2/+2.', rarity: 'Epic', tribe: 'Mech' },
  { id: 'cog_emergency_weld', name: 'Emergency Weld', faction: 'Cogsmiths', type: 'Spell', cost: 0, keywords: [], cardText: 'Gain 3 Block.', rarity: 'Common' },
  { id: 'cog_capacitor', name: 'Capacitor', faction: 'Cogsmiths', type: 'Structure', cost: 2, keywords: [], cardText: 'At the start of your turn, draw 1 card.', rarity: 'Rare' },
  { id: 'cog_omega_cannon', name: 'Omega Cannon', faction: 'Cogsmiths', type: 'Spell', cost: 6, keywords: [], cardText: 'Deal 20 damage.', rarity: 'Legendary' },
  { id: 'cog_scrap_golem', name: 'Scrap Golem MkII', faction: 'Cogsmiths', type: 'Minion', cost: 3, attack: 3, health: 6, keywords: ['LAST_WORDS'], cardText: 'LAST_WORDS: Deal 3 damage to the enemy.', rarity: 'Common', tribe: 'Mech' },
];

const PYROCLAST_CARDS: DungeonCardDefinition[] = [
  { id: 'pyro_ember_strike', name: 'Ember Strike', faction: 'Pyroclast', type: 'Spell', cost: 1, keywords: [], cardText: 'Deal 7 damage.', rarity: 'Common' },
  { id: 'pyro_flame_ward', name: 'Flame Ward', faction: 'Pyroclast', type: 'Spell', cost: 1, keywords: [], cardText: 'Gain 4 Block. Apply 1 Burn to the enemy.', rarity: 'Common' },
  { id: 'pyro_lava_sprite', name: 'Lava Sprite', faction: 'Pyroclast', type: 'Minion', cost: 1, attack: 3, health: 2, keywords: ['IMMOLATE'], cardText: 'IMMOLATE: 4.', rarity: 'Common', tribe: 'Elemental' },
  { id: 'pyro_ash_golem', name: 'Ash Golem', faction: 'Pyroclast', type: 'Minion', cost: 2, attack: 3, health: 4, keywords: [], cardText: 'Deploy: Apply 1 Vulnerable.', rarity: 'Common', tribe: 'Elemental' },
  { id: 'pyro_inferno', name: 'Inferno', faction: 'Pyroclast', type: 'Spell', cost: 3, keywords: [], cardText: 'Deal 5 damage to all enemies. Apply 2 Burn.', rarity: 'Rare' },
  { id: 'pyro_magma_elemental', name: 'Magma Elemental', faction: 'Pyroclast', type: 'Minion', cost: 3, attack: 4, health: 4, keywords: ['ENRAGE'], cardText: 'ENRAGE: +2 Attack when damaged.', rarity: 'Rare', tribe: 'Elemental' },
  { id: 'pyro_eruption', name: 'Eruption', faction: 'Pyroclast', type: 'Spell', cost: 2, keywords: [], cardText: 'Deal 12 damage. Take 3 damage.', rarity: 'Rare' },
  { id: 'pyro_flame_titan', name: 'Flame Titan', faction: 'Pyroclast', type: 'Minion', cost: 5, attack: 7, health: 5, keywords: ['IMMOLATE'], cardText: 'IMMOLATE: 6. Deploy: Deal 3 damage to all enemies.', rarity: 'Epic', tribe: 'Elemental' },
  { id: 'pyro_pyroblast', name: 'Pyroblast', faction: 'Pyroclast', type: 'Spell', cost: 7, keywords: [], cardText: 'Deal 25 damage.', rarity: 'Legendary' },
  { id: 'pyro_ash_cloud', name: 'Ash Cloud', faction: 'Pyroclast', type: 'Spell', cost: 1, keywords: [], cardText: 'Apply 2 Weak to the enemy.', rarity: 'Common' },
  { id: 'pyro_cinder_imp', name: 'Cinder Imp', faction: 'Pyroclast', type: 'Minion', cost: 2, attack: 4, health: 2, keywords: ['SWIFT'], cardText: 'SWIFT.', rarity: 'Common', tribe: 'Elemental' },
  { id: 'pyro_volcanic_core', name: 'Volcanic Core', faction: 'Pyroclast', type: 'Structure', cost: 3, keywords: [], cardText: 'At the start of your turn, deal 3 damage to all enemies.', rarity: 'Epic' },
];

const LUMINAR_CARDS: DungeonCardDefinition[] = [
  { id: 'lum_light_bolt', name: 'Light Bolt', faction: 'Luminar', type: 'Spell', cost: 1, keywords: [], cardText: 'Deal 4 damage. Restore 2 health.', rarity: 'Common' },
  { id: 'lum_radiant_shield', name: 'Radiant Shield', faction: 'Luminar', type: 'Spell', cost: 1, keywords: [], cardText: 'Gain 6 Block.', rarity: 'Common' },
  { id: 'lum_acolyte', name: 'Luminar Acolyte', faction: 'Luminar', type: 'Minion', cost: 1, attack: 1, health: 4, keywords: [], cardText: 'Deploy: Restore 3 health to your hero.', rarity: 'Common' },
  { id: 'lum_sun_guardian', name: 'Sun Guardian', faction: 'Luminar', type: 'Minion', cost: 2, attack: 2, health: 5, keywords: ['GUARDIAN', 'BARRIER'], cardText: 'GUARDIAN. BARRIER.', rarity: 'Rare' },
  { id: 'lum_holy_nova', name: 'Holy Nova', faction: 'Luminar', type: 'Spell', cost: 3, keywords: [], cardText: 'Deal 4 damage to all enemies. Restore 4 health.', rarity: 'Rare' },
  { id: 'lum_beacon_keeper', name: 'Beacon Keeper', faction: 'Luminar', type: 'Minion', cost: 3, attack: 2, health: 6, keywords: [], cardText: 'Deploy: Draw 2 cards.', rarity: 'Rare' },
  { id: 'lum_divine_light', name: 'Divine Light', faction: 'Luminar', type: 'Spell', cost: 2, keywords: [], cardText: 'Restore 8 health. Draw 1 card.', rarity: 'Rare' },
  { id: 'lum_arch_seraph', name: 'Arch Seraph', faction: 'Luminar', type: 'Minion', cost: 5, attack: 4, health: 8, keywords: ['BARRIER', 'DRAIN'], cardText: 'BARRIER. DRAIN.', rarity: 'Epic' },
  { id: 'lum_judgment', name: 'Judgment', faction: 'Luminar', type: 'Spell', cost: 4, keywords: [], cardText: 'Destroy a minion with 4 or less Attack.', rarity: 'Epic' },
  { id: 'lum_dawn_blessing', name: 'Dawn Blessing', faction: 'Luminar', type: 'Spell', cost: 0, keywords: [], cardText: 'Restore 3 health.', rarity: 'Common' },
  { id: 'lum_shrine', name: 'Luminar Shrine', faction: 'Luminar', type: 'Structure', cost: 2, keywords: [], cardText: 'At the start of your turn, restore 2 health to your hero.', rarity: 'Rare' },
  { id: 'lum_radiance', name: 'Radiance', faction: 'Luminar', type: 'Spell', cost: 6, keywords: [], cardText: 'Deal 10 damage to all enemies. Restore 10 health.', rarity: 'Legendary' },
];

const PHANTOM_CORSAIRS_CARDS: DungeonCardDefinition[] = [
  { id: 'pc_shadow_strike', name: 'Shadow Strike', faction: 'PhantomCorsairs', type: 'Spell', cost: 1, keywords: [], cardText: 'Deal 8 damage.', rarity: 'Common' },
  { id: 'pc_phase_cloak', name: 'Phase Cloak', faction: 'PhantomCorsairs', type: 'Spell', cost: 1, keywords: [], cardText: 'Gain 4 Block. Apply 1 Weak.', rarity: 'Common' },
  { id: 'pc_phantom_blade', name: 'Phantom Blade', faction: 'PhantomCorsairs', type: 'Minion', cost: 1, attack: 3, health: 2, keywords: ['CLOAK'], cardText: 'CLOAK.', rarity: 'Common' },
  { id: 'pc_void_stalker', name: 'Void Stalker', faction: 'PhantomCorsairs', type: 'Minion', cost: 2, attack: 3, health: 3, keywords: ['PHASE'], cardText: 'PHASE.', rarity: 'Rare' },
  { id: 'pc_ambush', name: 'Ambush', faction: 'PhantomCorsairs', type: 'Spell', cost: 2, keywords: [], cardText: 'Deal 5 damage. Apply 1 Vulnerable.', rarity: 'Common' },
  { id: 'pc_corsair_captain', name: 'Corsair Captain', faction: 'PhantomCorsairs', type: 'Minion', cost: 3, attack: 4, health: 4, keywords: ['SWIFT'], cardText: 'SWIFT. Deploy: Draw 1 card.', rarity: 'Rare' },
  { id: 'pc_soul_drain', name: 'Soul Drain', faction: 'PhantomCorsairs', type: 'Spell', cost: 3, keywords: [], cardText: 'Deal 8 damage. Restore 4 health.', rarity: 'Rare' },
  { id: 'pc_phantom_lord', name: 'Phantom Lord', faction: 'PhantomCorsairs', type: 'Minion', cost: 5, attack: 6, health: 5, keywords: ['CLOAK', 'DOUBLE_STRIKE'], cardText: 'CLOAK. DOUBLE_STRIKE.', rarity: 'Epic' },
  { id: 'pc_void_rift', name: 'Void Rift', faction: 'PhantomCorsairs', type: 'Spell', cost: 4, keywords: [], cardText: 'Deal 6 damage to all enemies. Apply 2 Vulnerable.', rarity: 'Epic' },
  { id: 'pc_spectral_dagger', name: 'Spectral Dagger', faction: 'PhantomCorsairs', type: 'Spell', cost: 0, keywords: [], cardText: 'Deal 4 damage.', rarity: 'Common' },
  { id: 'pc_shadow_nexus', name: 'Shadow Nexus', faction: 'PhantomCorsairs', type: 'Structure', cost: 3, keywords: [], cardText: 'At the start of your turn, apply 1 Weak to the enemy.', rarity: 'Epic' },
  { id: 'pc_phantom_armada', name: 'Phantom Armada', faction: 'PhantomCorsairs', type: 'Spell', cost: 7, keywords: [], cardText: 'Summon three 3/3 Phantom with CLOAK.', rarity: 'Legendary' },
];

export const ALL_DUNGEON_CARDS: DungeonCardDefinition[] = [
  ...COGSMITHS_CARDS,
  ...PYROCLAST_CARDS,
  ...LUMINAR_CARDS,
  ...PHANTOM_CORSAIRS_CARDS,
];

export function getDungeonCardsByFaction(faction: DungeonFaction): DungeonCardDefinition[] {
  return ALL_DUNGEON_CARDS.filter(c => c.faction === faction);
}

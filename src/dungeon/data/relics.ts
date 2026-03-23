/**
 * STARFORGE TCG — Dungeon Run Relics
 * Passive and triggered artifacts collected during a dungeon run.
 */

import type { DungeonRelic } from '../types';

// ─── Normal Relics ─────────────────────────────────────────

export const ALL_RELICS: DungeonRelic[] = [
  // 1
  {
    id: 'relic_starforged_crystal',
    name: 'Starforged Crystal',
    description: '+1 max energy permanently.',
    flavorText: 'A crystal that hums with the energy of a dying star.',
    trigger: 'PASSIVE',
    effect: { type: 'MAX_ENERGY', value: 1 },
  },
  // 2
  {
    id: 'relic_cogsmiths_wrench',
    name: "Cogsmith's Wrench",
    description: 'Gain 1 energy when a friendly minion dies.',
    flavorText: 'Every breakdown is an opportunity.',
    trigger: 'ON_MINION_DEATH',
    effect: { type: 'GAIN_ENERGY', value: 1 },
  },
  // 3
  {
    id: 'relic_pyroclast_ember_core',
    name: 'Pyroclast Ember Core',
    description: 'Deal 2 damage to the enemy at the start of your turn.',
    flavorText: 'The fire never truly dies.',
    trigger: 'ON_TURN_START',
    effect: { type: 'DAMAGE_ENEMY', value: 2 },
  },
  // 4
  {
    id: 'relic_luminar_chalice',
    name: 'Luminar Chalice',
    description: 'Draw 1 card the first time you heal each combat.',
    flavorText: 'Filled with liquid starlight.',
    trigger: 'ON_HERO_HEAL',
    effect: { type: 'DRAW', value: 1, condition: 'FIRST_HEAL_PER_COMBAT' },
  },
  // 5
  {
    id: 'relic_corsairs_spyglass',
    name: "Corsair's Spyglass",
    description: "See the enemy's full intent for 3 turns.",
    flavorText: 'Peer through the veil of time.',
    trigger: 'ON_COMBAT_START',
    effect: { type: 'REVEAL_INTENT', value: 3 },
  },
  // 6
  {
    id: 'relic_crystal_resonator',
    name: 'Crystal Resonator',
    description: 'Every 4th card played costs 0.',
    flavorText: 'It vibrates at the frequency of creation.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'FREE_CARD', value: 4, condition: 'EVERY_NTH_CARD' },
  },
  // 7
  {
    id: 'relic_void_shard',
    name: 'Void Shard',
    description: 'LAST_WORDS effects deal +3 damage.',
    flavorText: 'A fragment of absolute nothing.',
    trigger: 'PASSIVE',
    effect: { type: 'LAST_WORDS_DAMAGE', value: 3 },
  },
  // 8
  {
    id: 'relic_star_compass',
    name: 'Star Compass',
    description: 'Draw 2 extra cards at combat start.',
    flavorText: 'Points toward destiny, not north.',
    trigger: 'ON_COMBAT_START',
    effect: { type: 'DRAW', value: 2 },
  },
  // 9
  {
    id: 'relic_phantom_ink',
    name: 'Phantom Ink',
    description: 'CLOAK and PHASE minions have +2 Attack.',
    flavorText: 'Written in invisible wavelengths.',
    trigger: 'PASSIVE',
    effect: { type: 'KEYWORD_ATTACK_BUFF', value: 2, condition: 'CLOAK_OR_PHASE' },
  },
  // 10
  {
    id: 'relic_forgeborn_core',
    name: 'Forgeborn Core',
    description: 'Heal 4 when you kill an enemy.',
    flavorText: 'The heart of a fallen titan.',
    trigger: 'ON_KILL',
    effect: { type: 'HEAL', value: 4 },
  },
  // 11
  {
    id: 'relic_mech_capacitor',
    name: 'Mech Capacitor',
    description: 'Playing a Mech gives all Mechs +1 Attack.',
    flavorText: 'Stores energy between dimensions.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'TRIBE_ATTACK_BUFF', value: 1, condition: 'MECH_PLAYED' },
  },
  // 12
  {
    id: 'relic_illuminate_crystal',
    name: 'Illuminate Crystal',
    description: 'First heal each turn triggers ILLUMINATE twice.',
    flavorText: 'Refracts healing into power.',
    trigger: 'ON_HERO_HEAL',
    effect: { type: 'DOUBLE_ILLUMINATE', value: 2, condition: 'FIRST_HEAL_PER_TURN' },
  },
  // 13
  {
    id: 'relic_blast_residue',
    name: 'Blast Residue',
    description: 'Death effect damage gives hero +1 Block.',
    flavorText: 'The aftermath has its uses.',
    trigger: 'ON_MINION_DEATH',
    effect: { type: 'GAIN_BLOCK', value: 1, condition: 'DEATH_EFFECT_DAMAGE' },
  },
  // 14
  {
    id: 'relic_smugglers_map',
    name: "Smuggler's Map",
    description: 'Shop prices reduced by 25%.',
    flavorText: 'X marks every spot.',
    trigger: 'PASSIVE',
    effect: { type: 'SHOP_DISCOUNT', value: 25 },
  },
  // 15
  {
    id: 'relic_ancient_star_chart',
    name: 'Ancient Star Chart',
    description: 'Gain 1 extra energy on the first turn only.',
    flavorText: 'Charted by the Astromancers of old.',
    trigger: 'ON_COMBAT_START',
    effect: { type: 'GAIN_ENERGY', value: 1, condition: 'FIRST_TURN_ONLY' },
  },
  // 16
  {
    id: 'relic_corsairs_dice',
    name: "Corsair's Dice",
    description: '+15 max health.',
    flavorText: 'Loaded, obviously.',
    trigger: 'PASSIVE',
    effect: { type: 'MAX_HEALTH', value: 15 },
  },
  // 17
  {
    id: 'relic_ember_heart',
    name: 'Ember Heart',
    description: 'Gain +1 Strength when healed to full HP.',
    flavorText: 'Burns brighter as it mends.',
    trigger: 'ON_HERO_HEAL',
    effect: { type: 'GAIN_STRENGTH', value: 1, condition: 'HEALED_TO_FULL' },
  },
  // 18
  {
    id: 'relic_scrap_compactor',
    name: 'Scrap Compactor',
    description: 'When a Mech dies, add a 1-cost copy to your draw pile.',
    flavorText: 'Nothing goes to waste.',
    trigger: 'ON_MINION_DEATH',
    effect: { type: 'COPY_TO_DRAW', value: 1, condition: 'MECH_DEATH' },
  },
  // 19
  {
    id: 'relic_void_lens',
    name: 'Void Lens',
    description: 'Gain 1 Block per relic owned at the start of each turn.',
    flavorText: 'Focuses the void into protection.',
    trigger: 'ON_TURN_START',
    effect: { type: 'BLOCK_PER_RELIC', value: 1 },
  },
  // 20
  {
    id: 'relic_phoenix_feather',
    name: 'Phoenix Feather',
    description: 'Once per run: survive at 1 HP instead of dying.',
    flavorText: 'You get one miracle.',
    trigger: 'ON_HERO_DEATH',
    effect: { type: 'PREVENT_DEATH', value: 1 },
  },
  // 21
  {
    id: 'relic_warpstone',
    name: 'Warpstone',
    description: 'Playing a Legendary card draws 1.',
    flavorText: 'Reality bends around it.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'DRAW', value: 1, condition: 'LEGENDARY_PLAYED' },
  },
  // 22
  {
    id: 'relic_pyroclast_brand',
    name: 'Pyroclast Brand',
    description: 'IMMOLATE effects deal double damage.',
    flavorText: 'Seared into the fabric of space.',
    trigger: 'PASSIVE',
    effect: { type: 'DOUBLE_IMMOLATE', value: 2 },
  },
  // 23
  {
    id: 'relic_astral_lens',
    name: 'Astral Lens',
    description: 'See the top card of your draw pile at all times.',
    flavorText: 'The future is visible, if you know where to look.',
    trigger: 'PASSIVE',
    effect: { type: 'SCRY', value: 1 },
  },
  // 24
  {
    id: 'relic_temporal_gear',
    name: 'Temporal Gear',
    description: 'Every 3rd combat turn, gain 3 Block.',
    flavorText: 'Ticks to a rhythm only the Chronobound hear.',
    trigger: 'ON_TURN_START',
    effect: { type: 'GAIN_BLOCK', value: 3, condition: 'EVERY_3RD_TURN' },
  },
  // 25
  {
    id: 'relic_cursed_gold',
    name: 'Cursed Gold',
    description: 'Gain 50 gold. Take 3 damage at the start of each combat.',
    flavorText: 'Everything has a price.',
    trigger: 'PASSIVE',
    effect: { type: 'GOLD_WITH_PENALTY', value: 50, condition: 'COMBAT_START_DAMAGE_3' },
  },
  // 26
  {
    id: 'relic_beacon_fragment',
    name: 'Beacon Fragment',
    description: "Spells cost 1 less on turns you've healed.",
    flavorText: 'A shard of the First Beacon.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'SPELL_DISCOUNT', value: 1, condition: 'HEALED_THIS_TURN' },
  },
  // 27
  {
    id: 'relic_cogsmith_signet',
    name: 'Cogsmith Signet',
    description: 'Mechs start each combat with +2/+2.',
    flavorText: 'Seal of the Grand Artificer.',
    trigger: 'PASSIVE',
    effect: { type: 'TRIBE_STAT_BUFF', value: 2, condition: 'MECH_COMBAT_START' },
  },
  // 28
  {
    id: 'relic_spectral_anchor',
    name: 'Spectral Anchor',
    description: 'After killing an enemy, give a random friendly minion PHASE.',
    flavorText: 'Tethered to the spirit world.',
    trigger: 'ON_KILL',
    effect: { type: 'GRANT_PHASE', value: 1 },
  },
  // 29
  {
    id: 'relic_living_flame',
    name: 'Living Flame',
    description: 'After 3 spells in one turn, deal 5 damage to the enemy.',
    flavorText: 'It feeds on magical resonance.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'DAMAGE_ENEMY', value: 5, condition: 'SPELLS_THIS_TURN_3' },
  },
  // 30
  {
    id: 'relic_starforge_shard',
    name: 'Starforge Shard',
    description: 'Epic and Legendary cards cost 1 less.',
    flavorText: 'Raw creative potential.',
    trigger: 'PASSIVE',
    effect: { type: 'RARITY_DISCOUNT', value: 1, condition: 'EPIC_OR_LEGENDARY' },
  },

  // ─── Boss Relics ───────────────────────────────────────────

  // 31
  {
    id: 'relic_sentinels_crown',
    name: "Sentinel's Crown",
    description: '+2 max energy.',
    flavorText: 'Torn from the Forgeborn.',
    trigger: 'PASSIVE',
    effect: { type: 'MAX_ENERGY', value: 2 },
    isBossRelic: true,
  },
  // 32
  {
    id: 'relic_kess_compass',
    name: "Kess's Compass",
    description: 'Start every combat with 2 random cards drawn extra.',
    flavorText: 'She always knew where to strike.',
    trigger: 'ON_COMBAT_START',
    effect: { type: 'DRAW', value: 2 },
    isBossRelic: true,
  },
  // 33
  {
    id: 'relic_devourers_eye',
    name: "Devourer's Eye",
    description: 'Deal 5 damage to all enemies at the start of combat.',
    flavorText: 'It sees through dimensions.',
    trigger: 'PASSIVE',
    effect: { type: 'DAMAGE_ALL_ENEMIES', value: 5, condition: 'COMBAT_START' },
    isBossRelic: true,
  },
  // 34
  {
    id: 'relic_forge_hammer',
    name: 'Forge Hammer',
    description: 'First card each turn deals +3 damage.',
    flavorText: 'Forged in stellar fire.',
    trigger: 'ON_CARD_PLAYED',
    effect: { type: 'BONUS_DAMAGE', value: 3, condition: 'FIRST_CARD_PER_TURN' },
    isBossRelic: true,
  },
  // 35
  {
    id: 'relic_admirals_coat',
    name: "Admiral's Coat",
    description: 'Gain 3 Block at the start of each turn.',
    flavorText: 'Woven from shadow thread.',
    trigger: 'PASSIVE',
    effect: { type: 'GAIN_BLOCK', value: 3, condition: 'TURN_START' },
    isBossRelic: true,
  },
  // 36
  {
    id: 'relic_star_core',
    name: 'Star Core',
    description: 'Gain 1 Strength every 2 turns.',
    flavorText: 'The heart of the Devourer.',
    trigger: 'ON_TURN_START',
    effect: { type: 'GAIN_STRENGTH', value: 1, condition: 'EVERY_2ND_TURN' },
    isBossRelic: true,
  },
];

// ─── Derived Collections ───────────────────────────────────

export const BOSS_RELICS: DungeonRelic[] = ALL_RELICS.filter((r) => r.isBossRelic === true);
export const NORMAL_RELICS: DungeonRelic[] = ALL_RELICS.filter((r) => !r.isBossRelic);

// ─── Helpers ───────────────────────────────────────────────

/** Look up a relic by its unique id. */
export function getRelicById(id: string): DungeonRelic | undefined {
  return ALL_RELICS.find((r) => r.id === id);
}

/**
 * Return `count` random relics that are not in the `exclude` list.
 * When `bossOnly` is true only boss relics are considered.
 */
export function getRandomRelics(
  count: number,
  exclude: string[] = [],
  bossOnly = false,
): DungeonRelic[] {
  const pool = (bossOnly ? BOSS_RELICS : NORMAL_RELICS).filter(
    (r) => !exclude.includes(r.id),
  );

  // Fisher-Yates shuffle on a copy
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

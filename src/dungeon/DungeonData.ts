/**
 * STARFORGE TCG - Dungeon Run Data
 *
 * Defines bosses, relics, and card bundles for the roguelike dungeon mode.
 * 24 unique bosses across 3 difficulty tiers, 15 relics, faction-themed card bundles.
 */

import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';

/**
 * A dungeon boss encounter
 */
export interface DungeonBoss {
  id: string;
  name: string;
  title: string;
  race: Race;
  tier: 1 | 2 | 3;
  heroPowerName: string;
  heroPowerDescription: string;
  startingHealth: number;
  specialRule?: string;
  introQuote: string;
  defeatQuote: string;
  icon: string;
}

/**
 * A passive relic granting a permanent bonus for the run
 */
export interface DungeonRelic {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'common' | 'rare' | 'legendary';
}

/**
 * A bundle of 3 cards offered after a boss victory
 */
export interface CardBundle {
  id: string;
  name: string;
  description: string;
  cardIds: string[];
  theme: string;
}

// ─── BOSSES ─────────────────────────────────────────────────────────────────

export const DUNGEON_BOSSES: DungeonBoss[] = [
  // Tier 1 (Bosses 1-3): Easy, teaches mechanics
  {
    id: 'boss_ember_imp',
    name: 'Ember Imp',
    title: 'The Spark',
    race: Race.PYROCLAST,
    tier: 1,
    heroPowerName: 'Singe',
    heroPowerDescription: 'Deal 1 damage to a random enemy.',
    startingHealth: 20,
    introQuote: '"Heh heh, burn burn BURN!"',
    defeatQuote: '"No fair... I was just warming up..."',
    icon: '🔥',
  },
  {
    id: 'boss_spore_mother',
    name: 'Spore Mother',
    title: 'The Breeder',
    race: Race.HIVEMIND,
    tier: 1,
    heroPowerName: 'Spawn',
    heroPowerDescription: 'Summon a 1/1 Sporeling.',
    startingHealth: 22,
    introQuote: '"My children are everywhere... and hungry."',
    defeatQuote: '"The swarm... will remember you..."',
    icon: '🍄',
  },
  {
    id: 'boss_tin_sentinel',
    name: 'Tin Sentinel',
    title: 'The Watchman',
    race: Race.COGSMITHS,
    tier: 1,
    heroPowerName: 'Reinforce',
    heroPowerDescription: 'Give a friendly minion +0/+2.',
    startingHealth: 25,
    specialRule: 'Starts with a 0/4 GUARDIAN on board.',
    introQuote: '"Halt. You are not authorized."',
    defeatQuote: '"Systems... failing... warranty... void..."',
    icon: '🤖',
  },
  {
    id: 'boss_crystal_whelp',
    name: 'Crystal Whelp',
    title: 'The Refractor',
    race: Race.CRYSTALLINE,
    tier: 1,
    heroPowerName: 'Refract',
    heroPowerDescription: 'Deal 1 damage. If you cast a spell this turn, deal 2 instead.',
    startingHealth: 20,
    introQuote: '"Pretty lights! Pretty DEADLY lights!"',
    defeatQuote: '"Shattered... like glass..."',
    icon: '💎',
  },
  {
    id: 'boss_vine_creeper',
    name: 'Vine Creeper',
    title: 'The Overgrowth',
    race: Race.BIOTITANS,
    tier: 1,
    heroPowerName: 'Grow',
    heroPowerDescription: 'Give a friendly minion +1/+1.',
    startingHealth: 22,
    introQuote: '"Roots run deep... you cannot escape."',
    defeatQuote: '"The garden... will grow again..."',
    icon: '🌱',
  },
  {
    id: 'boss_shadow_rat',
    name: 'Shadow Rat',
    title: 'The Pickpocket',
    race: Race.PHANTOM_CORSAIRS,
    tier: 1,
    heroPowerName: 'Filch',
    heroPowerDescription: 'Add a random card to your hand.',
    startingHealth: 18,
    introQuote: '"What\'s yours is mine, friend."',
    defeatQuote: '"Okay okay, take it back!"',
    icon: '🐀',
  },
  {
    id: 'boss_star_initiate',
    name: 'Star Initiate',
    title: 'The Student',
    race: Race.ASTROMANCERS,
    tier: 1,
    heroPowerName: 'Study',
    heroPowerDescription: 'Draw a card.',
    startingHealth: 20,
    specialRule: 'Takes 1 fatigue damage per draw from empty deck.',
    introQuote: '"The stars have much to teach... even you."',
    defeatQuote: '"Perhaps I need... more study..."',
    icon: '⭐',
  },
  {
    id: 'boss_time_beetle',
    name: 'Time Beetle',
    title: 'The Tick-Tock',
    race: Race.CHRONOBOUND,
    tier: 1,
    heroPowerName: 'Rewind',
    heroPowerDescription: 'Return a random friendly minion to hand.',
    startingHealth: 20,
    introQuote: '"Tick... tock... your time runs short!"',
    defeatQuote: '"If only I could... turn back... the clock..."',
    icon: '🪲',
  },

  // Tier 2 (Bosses 4-6): Medium, requires strategy
  {
    id: 'boss_inferno_warden',
    name: 'Inferno Warden',
    title: 'The Pyromaniac',
    race: Race.PYROCLAST,
    tier: 2,
    heroPowerName: 'Immolation Aura',
    heroPowerDescription: 'Deal 2 damage to all enemies.',
    startingHealth: 35,
    specialRule: 'At end of turn, deals 1 damage to all minions.',
    introQuote: '"EVERYTHING must burn. Even my own soldiers."',
    defeatQuote: '"The flame... cannot be quenched... but you... you tried."',
    icon: '🌋',
  },
  {
    id: 'boss_hive_queen',
    name: 'Hive Queen',
    title: 'The Brood Mother',
    race: Race.HIVEMIND,
    tier: 2,
    heroPowerName: 'Swarm Call',
    heroPowerDescription: 'Summon two 1/1 Swarmlings.',
    startingHealth: 30,
    specialRule: 'Whenever a friendly minion dies, gain +1 Attack permanently.',
    introQuote: '"We are legion. We are infinite. We are HUNGER."',
    defeatQuote: '"The hive... endures... we will return in numbers..."',
    icon: '👑',
  },
  {
    id: 'boss_forge_master',
    name: 'Forge Master',
    title: 'The Upgrader',
    race: Race.COGSMITHS,
    tier: 2,
    heroPowerName: 'Upgrade Protocol',
    heroPowerDescription: 'Give a friendly Mech +2/+2.',
    startingHealth: 35,
    specialRule: 'Starts with two 2/3 Mechs on board.',
    introQuote: '"My machines grow stronger with every iteration."',
    defeatQuote: '"Impressive. I must... recalibrate."',
    icon: '🔧',
  },
  {
    id: 'boss_void_weaver',
    name: 'Void Weaver',
    title: 'The Unraveler',
    race: Race.VOIDBORN,
    tier: 2,
    heroPowerName: 'Unravel',
    heroPowerDescription: 'Destroy the lowest-health enemy minion.',
    startingHealth: 30,
    introQuote: '"I will unmake you, thread by thread."',
    defeatQuote: '"The void... does not forget..."',
    icon: '🕸️',
  },
  {
    id: 'boss_thornback_ancient',
    name: 'Thornback Ancient',
    title: 'The Living Fortress',
    race: Race.BIOTITANS,
    tier: 2,
    heroPowerName: 'Thorn Shield',
    heroPowerDescription: 'Gain 3 Armor. Deal 1 damage to all attackers.',
    startingHealth: 40,
    specialRule: 'Has GUARDIAN. Cannot attack but deals 2 damage to attackers.',
    introQuote: '"I have stood for ten thousand years. You will not fell me in ten minutes."',
    defeatQuote: '"At last... rest... the roots release me..."',
    icon: '🌳',
  },
  {
    id: 'boss_chrono_priest',
    name: 'Chrono Priest',
    title: 'The Time Loop',
    race: Race.CHRONOBOUND,
    tier: 2,
    heroPowerName: 'Echo Turn',
    heroPowerDescription: 'Copy the last card played this turn.',
    startingHealth: 30,
    specialRule: 'Every 3rd turn, gets an extra turn.',
    introQuote: '"I have seen this fight before. You lose."',
    defeatQuote: '"Impossible... I calculated every timeline..."',
    icon: '⏰',
  },
  {
    id: 'boss_prism_lord',
    name: 'Prism Lord',
    title: 'The Spell Storm',
    race: Race.CRYSTALLINE,
    tier: 2,
    heroPowerName: 'Crystal Cascade',
    heroPowerDescription: 'Cast a random 1-cost spell.',
    startingHealth: 28,
    specialRule: 'Spells cost (1) less.',
    introQuote: '"Each crystal holds a spell. I have THOUSANDS."',
    defeatQuote: '"The crystals... go dark..."',
    icon: '🔮',
  },
  {
    id: 'boss_phantom_admiral',
    name: 'Phantom Admiral',
    title: 'The Ghost Fleet',
    race: Race.PHANTOM_CORSAIRS,
    tier: 2,
    heroPowerName: 'Phase Shift',
    heroPowerDescription: 'Give a friendly minion CLOAK.',
    startingHealth: 28,
    specialRule: 'All minions start with CLOAK.',
    introQuote: '"You fight shadows, mortal. We are everywhere and nowhere."',
    defeatQuote: '"A worthy opponent... take my ship..."',
    icon: '⚓',
  },

  // Tier 3 (Bosses 7-8): Hard, mini-bosses with unique mechanics
  {
    id: 'boss_star_devourer',
    name: 'Star Devourer',
    title: 'The Cosmic Horror',
    race: Race.VOIDBORN,
    tier: 3,
    heroPowerName: 'Devour Star',
    heroPowerDescription: 'Destroy an enemy minion and gain its stats as Armor.',
    startingHealth: 50,
    specialRule: 'Immune while 3+ minions are on opponent\'s board.',
    introQuote: '"I have consumed galaxies. You are... an appetizer."',
    defeatQuote: '"Impossible... I am INFINITE... I am..."',
    icon: '🌑',
  },
  {
    id: 'boss_world_forger',
    name: 'World Forger',
    title: 'The Creator',
    race: Race.COGSMITHS,
    tier: 3,
    heroPowerName: 'Genesis Engine',
    heroPowerDescription: 'Summon a random Legendary minion (1 HP).',
    startingHealth: 45,
    specialRule: 'At turn start, all friendly minions gain +1/+1.',
    introQuote: '"I built worlds before your species crawled from the mud."',
    defeatQuote: '"My greatest creation... was always the next one..."',
    icon: '🏗️',
  },
  {
    id: 'boss_sun_eater',
    name: 'Sun Eater',
    title: 'The Eclipse',
    race: Race.LUMINAR,
    tier: 3,
    heroPowerName: 'Solar Flare',
    heroPowerDescription: 'Deal 3 damage to all enemies. Heal self for 5.',
    startingHealth: 50,
    specialRule: 'Heals 3 HP at end of each turn.',
    introQuote: '"I am the last light you will ever see."',
    defeatQuote: '"The sun... sets... but it always rises again..."',
    icon: '☀️',
  },
  {
    id: 'boss_time_lord',
    name: 'Temporal Archon',
    title: 'The End of Time',
    race: Race.CHRONOBOUND,
    tier: 3,
    heroPowerName: 'Time Stop',
    heroPowerDescription: 'Freeze all enemy minions for 1 turn.',
    startingHealth: 45,
    specialRule: 'Every 4th turn, takes an extra turn.',
    introQuote: '"Time is a river, and I am the dam."',
    defeatQuote: '"Finally... free from the loop..."',
    icon: '⌛',
  },
  {
    id: 'boss_overmind',
    name: 'The Overmind',
    title: 'Collective Consciousness',
    race: Race.HIVEMIND,
    tier: 3,
    heroPowerName: 'Assimilate',
    heroPowerDescription: 'Copy an enemy minion to your board (as a 1/1).',
    startingHealth: 40,
    specialRule: 'Starts each turn by summoning a 2/2 Drone. Board limit: 10.',
    introQuote: '"Resistance is... suboptimal. Join the collective."',
    defeatQuote: '"The signal... fades... but the swarm... remembers..."',
    icon: '🧠',
  },
  {
    id: 'boss_primal_god',
    name: 'Primordial Titan',
    title: 'The First Beast',
    race: Race.BIOTITANS,
    tier: 3,
    heroPowerName: 'Evolve',
    heroPowerDescription: 'Transform a friendly minion into a random one that costs (2) more.',
    startingHealth: 55,
    specialRule: 'Starts with a 5/5 GUARDIAN on board.',
    introQuote: '"Before the stars, there was life. I AM that life."',
    defeatQuote: '"Life... finds... a way..."',
    icon: '🦕',
  },
];

/**
 * Get bosses for a specific tier
 */
export function getBossesByTier(tier: 1 | 2 | 3): DungeonBoss[] {
  return DUNGEON_BOSSES.filter(b => b.tier === tier);
}

/**
 * Select a random boss roster for a dungeon run (8 bosses: 3/3/2)
 */
export function generateBossRoster(seed?: number): DungeonBoss[] {
  const rng = createSeededRng(seed || Date.now());

  const tier1 = shuffle(getBossesByTier(1), rng).slice(0, 3);
  const tier2 = shuffle(getBossesByTier(2), rng).slice(0, 3);
  const tier3 = shuffle(getBossesByTier(3), rng).slice(0, 2);

  return [...tier1, ...tier2, ...tier3];
}

// ─── RELICS ─────────────────────────────────────────────────────────────────

export const DUNGEON_RELICS: DungeonRelic[] = [
  // Common relics
  {
    id: 'relic_crystal_shard',
    name: 'Crystal Shard',
    description: 'Start each game with 1 extra Crystal.',
    icon: '💠',
    tier: 'common',
  },
  {
    id: 'relic_healing_totem',
    name: 'Healing Totem',
    description: 'Heal 3 HP at the start of each game.',
    icon: '💚',
    tier: 'common',
  },
  {
    id: 'relic_sharp_blade',
    name: 'Sharpened Blade',
    description: 'Your minions have +1 Attack.',
    icon: '🗡️',
    tier: 'common',
  },
  {
    id: 'relic_thick_hide',
    name: 'Thick Hide',
    description: 'Your GUARDIAN minions have +2 Health.',
    icon: '🛡️',
    tier: 'common',
  },
  {
    id: 'relic_lucky_coin',
    name: 'Lucky Coin',
    description: 'Draw an extra card at the start of each game.',
    icon: '🪙',
    tier: 'common',
  },

  // Rare relics
  {
    id: 'relic_spell_stone',
    name: 'Spell Stone',
    description: 'Spells cost (1) less (minimum 1).',
    icon: '🟣',
    tier: 'rare',
  },
  {
    id: 'relic_blood_gem',
    name: 'Blood Gem',
    description: 'Whenever you destroy an enemy minion, restore 2 HP.',
    icon: '❤️‍🔥',
    tier: 'rare',
  },
  {
    id: 'relic_echo_chamber',
    name: 'Echo Chamber',
    description: 'The first card you play each turn costs (1) less.',
    icon: '🔊',
    tier: 'rare',
  },
  {
    id: 'relic_war_drum',
    name: 'War Drum',
    description: 'Your minions have +1/+0 on the turn they\'re played.',
    icon: '🥁',
    tier: 'rare',
  },
  {
    id: 'relic_phoenix_feather',
    name: 'Phoenix Feather',
    description: 'The first minion to die each game returns to your hand.',
    icon: '🪶',
    tier: 'rare',
  },

  // Legendary relics
  {
    id: 'relic_starforge_fragment',
    name: 'Starforge Fragment',
    description: 'Your Legendary minions cost (2) less.',
    icon: '⚡',
    tier: 'legendary',
  },
  {
    id: 'relic_void_crown',
    name: 'Void Crown',
    description: 'Start each game with 5 extra maximum HP.',
    icon: '👑',
    tier: 'legendary',
  },
  {
    id: 'relic_time_crystal',
    name: 'Time Crystal',
    description: 'At the start of each game, gain an extra Crystal this turn only.',
    icon: '⏳',
    tier: 'legendary',
  },
  {
    id: 'relic_dragon_heart',
    name: 'Dragon Heart',
    description: 'Your hero has +2 Attack (can attack each turn).',
    icon: '🐲',
    tier: 'legendary',
  },
  {
    id: 'relic_infinity_gauntlet',
    name: 'Infinity Loop',
    description: 'Whenever you play an ECHO card, it costs (0) instead of full price.',
    icon: '♾️',
    tier: 'legendary',
  },
];

/**
 * Get 3 random relics to offer after a relic boss (bosses 2, 5, 7)
 */
export function getRelicChoices(excludeIds: string[], seed?: number): DungeonRelic[] {
  const rng = createSeededRng(seed || Date.now());
  const available = DUNGEON_RELICS.filter(r => !excludeIds.includes(r.id));
  return shuffle(available, rng).slice(0, 3);
}

// ─── CARD BUNDLES ───────────────────────────────────────────────────────────

export const CARD_BUNDLES: CardBundle[] = [
  // Aggro bundles
  {
    id: 'bundle_fire_rush',
    name: 'Fire Rush',
    description: 'Fast, aggressive minions that hit hard.',
    cardIds: ['pyro_flame_imp', 'pyro_emberblade', 'pyro_fire_elemental'],
    theme: 'aggro',
  },
  {
    id: 'bundle_swarm_wave',
    name: 'Swarm Wave',
    description: 'Flood the board with tokens.',
    cardIds: ['hive_drone_caller', 'hive_spawn_pool', 'hive_queen_guard'],
    theme: 'tokens',
  },
  {
    id: 'bundle_quick_strike',
    name: 'Quick Strike',
    description: 'SWIFT and BLITZ minions for immediate impact.',
    cardIds: ['pc_shadow_blade', 'n_swift_runner', 'n_blitz_trooper'],
    theme: 'tempo',
  },

  // Control bundles
  {
    id: 'bundle_shield_wall',
    name: 'Shield Wall',
    description: 'Tough GUARDIAN minions to protect your hero.',
    cardIds: ['lum_light_guardian', 'n_stone_wall', 'cog_iron_defender'],
    theme: 'defense',
  },
  {
    id: 'bundle_healing_light',
    name: 'Healing Light',
    description: 'Sustain and outlast with healing.',
    cardIds: ['lum_healer_acolyte', 'lum_radiant_protector', 'n_medic_bot'],
    theme: 'heal',
  },
  {
    id: 'bundle_void_control',
    name: 'Void Control',
    description: 'Disruption and removal spells.',
    cardIds: ['void_siphon', 'void_exile', 'void_terror'],
    theme: 'removal',
  },

  // Value bundles
  {
    id: 'bundle_card_draw',
    name: 'Knowledge Seeker',
    description: 'Draw more cards, find more answers.',
    cardIds: ['astro_star_reader', 'n_loot_hoarder', 'astro_cosmic_insight'],
    theme: 'draw',
  },
  {
    id: 'bundle_mech_synergy',
    name: 'Mech Army',
    description: 'Mechs that buff each other.',
    cardIds: ['cog_gear_grinder', 'cog_upgrade_bot', 'cog_war_machine'],
    theme: 'synergy',
  },
  {
    id: 'bundle_big_beasts',
    name: 'Big Beasts',
    description: 'Massive creatures to dominate the late game.',
    cardIds: ['bio_thornback', 'bio_apex_predator', 'n_war_golem'],
    theme: 'big',
  },

  // Keyword-themed bundles
  {
    id: 'bundle_death_rattle',
    name: 'Last Words',
    description: 'Minions with powerful death effects.',
    cardIds: ['n_harvest_golem', 'void_dark_soul', 'hive_exploding_drone'],
    theme: 'deathrattle',
  },
  {
    id: 'bundle_spell_power',
    name: 'Spell Power',
    description: 'Boost your spell damage.',
    cardIds: ['crys_spell_amplifier', 'crys_mana_wyrm', 'crys_arcane_bolt'],
    theme: 'spellpower',
  },
  {
    id: 'bundle_echo_combo',
    name: 'Echo Combo',
    description: 'ECHO cards that can be played twice.',
    cardIds: ['chrono_time_walker', 'chrono_echo_blast', 'n_echo_slime'],
    theme: 'echo',
  },
];

/**
 * Get 3 random card bundles to offer after a boss victory
 */
export function getCardBundleChoices(alreadyChosen: string[], seed?: number): CardBundle[] {
  const rng = createSeededRng(seed || Date.now());
  const available = CARD_BUNDLES.filter(b => !alreadyChosen.includes(b.id));
  return shuffle(available, rng).slice(0, 3);
}

// ─── STARTER DECKS ──────────────────────────────────────────────────────────

/**
 * 10-card starter deck for dungeon run (stripped-down basics)
 */
export function getDungeonStarterDeck(race: Race): string[] {
  const starters: Partial<Record<Race, string[]>> = {
    [Race.PYROCLAST]: [
      'pyro_flame_imp', 'pyro_flame_imp',
      'pyro_emberblade', 'pyro_emberblade',
      'pyro_fire_bolt', 'pyro_fire_bolt',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.LUMINAR]: [
      'lum_healer_acolyte', 'lum_healer_acolyte',
      'lum_light_guardian', 'lum_light_guardian',
      'lum_holy_smite', 'lum_holy_smite',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.HIVEMIND]: [
      'hive_drone_caller', 'hive_drone_caller',
      'hive_spawn_pool', 'hive_spawn_pool',
      'hive_stinger', 'hive_stinger',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.COGSMITHS]: [
      'cog_gear_grinder', 'cog_gear_grinder',
      'cog_iron_defender', 'cog_iron_defender',
      'cog_repair_bot', 'cog_repair_bot',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.VOIDBORN]: [
      'void_siphon', 'void_siphon',
      'void_terror', 'void_terror',
      'void_shadow_bolt', 'void_shadow_bolt',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.BIOTITANS]: [
      'bio_seedling', 'bio_seedling',
      'bio_thornback', 'bio_thornback',
      'bio_wild_growth', 'bio_wild_growth',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.CRYSTALLINE]: [
      'crys_mana_wyrm', 'crys_mana_wyrm',
      'crys_arcane_bolt', 'crys_arcane_bolt',
      'crys_spell_amplifier', 'crys_spell_amplifier',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.PHANTOM_CORSAIRS]: [
      'pc_shadow_blade', 'pc_shadow_blade',
      'pc_pickpocket', 'pc_pickpocket',
      'pc_smoke_bomb', 'pc_smoke_bomb',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.ASTROMANCERS]: [
      'astro_star_reader', 'astro_star_reader',
      'astro_cosmic_insight', 'astro_cosmic_insight',
      'astro_nova_bolt', 'astro_nova_bolt',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
    [Race.CHRONOBOUND]: [
      'chrono_time_walker', 'chrono_time_walker',
      'chrono_echo_blast', 'chrono_echo_blast',
      'chrono_rewind', 'chrono_rewind',
      'n_recruit', 'n_recruit',
      'n_wisp', 'n_wisp',
    ],
  };

  return starters[race] || starters[Race.PYROCLAST]!;
}

// ─── UTILITY ────────────────────────────────────────────────────────────────

function createSeededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

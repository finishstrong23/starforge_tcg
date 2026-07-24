import type { EnemyDefinition } from '../types';

// ─── Act 1 - Shattered Reach surface (8 standard enemies) ────────────────────
// Moderate HP (30-60), low-to-mid attack (6-12).

const ACT1_STANDARD: EnemyDefinition[] = [
  {
    id: 'E1-01', name: 'Cogsworn Scout', lore: 'A rusted recon drone running faction-war protocols.',
    maxHealth: 22, attack: 8, art: 'BOT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: 'Rivet burst - deal 8' },
      { type: 'defend', value: 6, description: 'Deploy shield plates - +6 Block' },
      { type: 'attack', value: 4, description: 'Double tap - deal 4 twice' },
    ],
  },
  {
    id: 'E1-02', name: 'Ember Houndling', lore: 'A pup-sized Pyroclast beast with a furnace belly.',
    maxHealth: 19, attack: 7, art: 'HND', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 7, description: 'Cinder bite - deal 7' },
      { type: 'debuff', value: 2, description: 'Soot breath - apply 2 Weak' },
      { type: 'attack', value: 7, description: 'Ember lunge - deal 7' },
    ],
  },
  {
    id: 'E1-03', name: 'Chantling', lore: 'A child acolyte of the Luminar, humming unstable harmonics.',
    maxHealth: 18, attack: 5, art: 'CHT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 5, description: 'Prism bolt - deal 5' },
      { type: 'buff', value: 3, description: 'Channel - gain 3 Strength' },
      { type: 'attack', value: 9, description: 'Released hymn - deal 9' },
    ],
  },
  {
    id: 'E1-04', name: 'Rift Nibbler', lore: 'A trans-dimensional parasite with too many teeth.',
    maxHealth: 16, attack: 6, art: 'RFT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Phase bite - deal 6' },
      { type: 'attack', value: 4, description: 'Ripple chomp - deal 4 twice', },
      { type: 'defend', value: 6, description: 'Warp aside - +6 Block' },
    ],
  },
  {
    id: 'E1-05', name: 'Wire-Tangle', lore: 'A mass of live cabling that remembers being a worker.',
    maxHealth: 26, attack: 8, art: 'WIR', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: 'Snap strike - deal 8' },
      { type: 'debuff', value: 2, description: 'Arc shock - apply 2 Vulnerable' },
      { type: 'defend', value: 10, description: 'Coil up - +10 Block' },
    ],
  },
  {
    id: 'E1-06', name: 'Glasspicker', lore: 'A scavenger that collects shards of the Shattered Reach.',
    maxHealth: 24, attack: 9, art: 'GLS', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 9, description: 'Shiv - deal 9' },
      { type: 'buff', value: 3, description: 'Sharpen - gain 3 Strength' },
      { type: 'attack', value: 12, description: 'Honed stab - deal 12' },
    ],
  },
  {
    id: 'E1-07', name: 'Sump Gremlin', lore: 'A runt hiding in coolant vents. Spits oil.',
    maxHealth: 14, attack: 5, art: 'OIL', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'debuff', value: 2, description: 'Oil spit - apply 2 Weak' },
      { type: 'attack', value: 5, description: 'Wrench chuck - deal 5' },
      { type: 'attack', value: 3, description: 'Flurry - deal 3 three times' },
    ],
  },
  {
    id: 'E1-08', name: 'Null Suit', lore: 'An empty exo-suit that refuses to lie down.',
    maxHealth: 34, attack: 8, art: 'SUT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: 'Rote punch - deal 8' },
      { type: 'defend', value: 12, description: 'Servo-lock - +12 Block' },
      { type: 'attack', value: 6, description: 'Executor protocol - deal 6 twice' },
    ],
  },
];

// ─── Act 2 - Inner Forge (7 standard enemies) ────────────────────────────────
// Higher HP (50-90), moderate attack (10-18).

const ACT2_STANDARD: EnemyDefinition[] = [
  {
    id: 'E2-01', name: 'Magma Strider', lore: 'A six-legged lava skimmer. Leaves scorched footprints.',
    maxHealth: 35, attack: 11, art: 'MAG', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 11, description: 'Scalding kick - deal 11' },
      { type: 'debuff', value: 3, description: 'Heat haze - apply 3 Weak' },
      { type: 'attack', value: 7, description: 'Twin-lance - deal 7 twice' },
    ],
  },
  {
    id: 'E2-02', name: 'Halo Sentinel', lore: 'A Luminar guardian statue that learned anger.',
    maxHealth: 44, attack: 10, art: 'HAL', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 10, description: 'Radiant smite - deal 10' },
      { type: 'defend', value: 16, description: 'Sanctified stance - +16 Block' },
      { type: 'buff', value: 3, description: 'Channel light - gain 3 Strength' },
    ],
  },
  {
    id: 'E2-03', name: 'Forgewright', lore: 'A Cogsmith rogue technician with three working arms.',
    maxHealth: 39, attack: 10, art: 'FRG', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 10, description: 'Hammer drop - deal 10' },
      { type: 'summon', description: 'Assemble - summon a Drone next turn' },
      { type: 'defend', value: 14, description: 'Plate up - +14 Block' },
    ],
  },
  {
    id: 'E2-04', name: 'Rift-Stalker', lore: 'A Warp Rider hunter that phases between attacks.',
    maxHealth: 31, attack: 12, art: 'STK', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 12, description: 'Dimensional strike - deal 12' },
      { type: 'debuff', value: 3, description: 'Probability shift - apply 3 Vulnerable' },
      { type: 'attack', value: 5, description: 'Phase flurry - deal 5 twice' },
    ],
  },
  {
    id: 'E2-05', name: 'Blast Furnace', lore: 'A walking Pyroclast furnace. Vents pressure on impact.',
    maxHealth: 49, attack: 12, art: 'FUR', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 12, description: 'Flame vent - deal 12' },
      { type: 'buff', value: 4, description: 'Stoke - gain 4 Strength' },
      { type: 'attack', value: 16, description: 'Pressure vent - deal 16, self-stun' },
    ],
  },
  {
    id: 'E2-06', name: 'Circuit Priest', lore: 'A Luminar-Cogsmith hybrid preaching a machine gospel.',
    maxHealth: 35, attack: 10, art: 'PRI', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'buff', value: 3, description: 'Bless - gain 3 Strength' },
      { type: 'attack', value: 10, description: 'Sacred bolt - deal 10' },
      { type: 'debuff', value: 2, description: 'Curse - apply 2 Weak, 2 Vulnerable' },
    ],
  },
  {
    id: 'E2-07', name: 'Split Reaver', lore: 'A Warp Rider that fights alongside its other-dimensional self.',
    maxHealth: 39, attack: 9, art: 'SPL', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Twin slash - deal 6 twice' },
      { type: 'defend', value: 12, description: 'Fade - +12 Block' },
      { type: 'attack', value: 14, description: 'Merged strike - deal 14' },
    ],
  },
];

// ─── Act 3 - Deep Below (5 standard enemies) ─────────────────────────────────
// High HP (75-120), high attack (14-22).

const ACT3_STANDARD: EnemyDefinition[] = [
  {
    id: 'E3-01', name: 'Ashen Colossus', lore: 'A walking volcano long past extinction.',
    maxHealth: 64, attack: 16, art: 'COL', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 16, description: 'Tectonic slam - deal 16' },
      { type: 'defend', value: 22, description: 'Lava skin - +22 Block' },
      { type: 'attack', value: 10, description: 'Quake - deal 10 to all' },
    ],
  },
  {
    id: 'E3-02', name: 'Starbound Inquisitor', lore: 'A Luminar judge with sentence already written.',
    maxHealth: 52, attack: 14, art: 'JDG', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 14, description: 'Verdict strike - deal 14' },
      { type: 'debuff', value: 4, description: 'Damnation - apply 4 Vulnerable' },
      { type: 'buff', value: 5, description: 'Witness - gain 5 Strength' },
    ],
  },
  {
    id: 'E3-03', name: 'Warforge Sovereign', lore: 'The last ruling Cogsmith, all ceremony fused to armor.',
    maxHealth: 76, attack: 11, art: 'SOV', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 7, description: 'Scepter blow - deal 7 twice' },
      { type: 'summon', description: 'Coronation - summon 2 Drones' },
      { type: 'defend', value: 26, description: 'Royal plate - +26 Block' },
    ],
  },
  {
    id: 'E3-04', name: 'Paradox Maw', lore: 'A Warp Rider predator with no fixed shape.',
    maxHealth: 48, attack: 16, art: 'MAW', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 16, description: 'Cascade bite - deal 16' },
      { type: 'special', value: 9, description: 'Swallow - deal 9, steal a card' },
      { type: 'attack', value: 12, description: 'Echo strike - deal 12' },
    ],
  },
  {
    id: 'E3-05', name: 'Broken Choir', lore: 'The last members of the Cosmic Choir, singing out of tune.',
    maxHealth: 58, attack: 10, art: 'CHR', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Dissonant chord - deal 6 three times' },
      { type: 'debuff', value: 3, description: 'Silencing note - apply 3 Weak' },
      { type: 'buff', value: 5, description: 'Harmonize - gain 5 Strength' },
    ],
  },
  {
    id: 'E3-06', name: 'Chrono Leech', lore: 'It drinks minutes. Victims age backwards into indecision.',
    maxHealth: 54, attack: 14, art: 'LCH', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 14, description: 'Latch - deal 14' },
      { type: 'special', value: 8, description: 'Drink the hour - deal 8, skip your draw' },
      { type: 'attack', value: 8, description: 'Twin bite - deal 8 twice' },
      { type: 'debuff', value: 3, description: 'Temporal drag - apply 3 Weak' },
    ],
  },
];

// ─── Elites (4 elites across acts) ───────────────────────────────────────────

const ELITES: EnemyDefinition[] = [
  {
    id: 'EL-01', name: 'Gearforged Juggernaut', lore: 'A Cogsmith war-engine that outlived its pilot.',
    maxHealth: 54, attack: 11, art: 'JUG', acts: [1, 2], isElite: true, isBoss: false,
    onDeath: 'Explodes for 6 damage to all.',
    intents: [
      { type: 'attack', value: 11, description: 'Piston punch - deal 11' },
      { type: 'defend', value: 18, description: 'Battle stance - +18 Block' },
      { type: 'attack', value: 16, description: 'Overload - deal 16' },
      { type: 'buff', value: 3, description: 'Re-calibrate - gain 3 Strength' },
    ],
  },
  {
    id: 'EL-02', name: 'Sunfire Herald', lore: 'A Luminar zealot who traded flesh for radiance.',
    maxHealth: 60, attack: 10, art: 'SUN', acts: [1, 2], isElite: true, isBoss: false,
    onDeath: 'Releases stored Lumens - heals player 10 HP.',
    intents: [
      { type: 'attack', value: 10, description: 'Solar lance - deal 10' },
      { type: 'buff', value: 4, description: 'Burn bright - gain 4 Strength' },
      { type: 'attack', value: 15, description: 'Apex ray - deal 15' },
      { type: 'debuff', value: 3, description: 'Blind - apply 3 Weak' },
    ],
  },
  {
    id: 'EL-03', name: 'Magma Tyrant', lore: 'A Pyroclast warlord who ate the Crown of the Unburnt.',
    maxHealth: 66, attack: 12, art: 'TYR', acts: [2, 3], isElite: true, isBoss: false,
    onDeath: 'Death-burst: deal 15 to all enemies.',
    intents: [
      { type: 'attack', value: 12, description: 'Dragon claw - deal 12' },
      { type: 'buff', value: 5, description: 'Stoke the core - gain 5 Strength' },
      { type: 'attack', value: 8, description: 'Ember breath - deal 8 to all' },
      { type: 'defend', value: 22, description: 'Magma skin - +22 Block' },
    ],
  },
  {
    id: 'EL-04', name: 'Rift Warden', lore: 'A Warp Rider jailer with keys to every dimension.',
    maxHealth: 62, attack: 13, art: 'WRD', acts: [2, 3], isElite: true, isBoss: false,
    onDeath: 'Releases a stored rift - next combat starts with -1 Energy.',
    intents: [
      { type: 'attack', value: 13, description: 'Warp strike - deal 13' },
      { type: 'debuff', value: 3, description: 'Seal - apply 3 Weak, 3 Vulnerable' },
      { type: 'special', value: 7, description: 'Chrono-lock - deal 7, skip your draw' },
      { type: 'attack', value: 5, description: 'Fractured slash - deal 5 twice' },
    ],
  },
];

// ─── Bosses (one per act) ────────────────────────────────────────────────────

const BOSSES: EnemyDefinition[] = [
  {
    id: 'BOSS-01', name: 'Scoria Titan', lore: 'The first Pyroclast, risen from the Shattered Reach.',
    maxHealth: 120, attack: 14, art: 'TIT', acts: [1], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 14, description: 'Mountain fist - deal 14' },
      { type: 'debuff', value: 3, description: 'Ash cloud - apply 3 Weak to you' },
      { type: 'attack', value: 6, description: 'Ember rain - deal 6 three times' },
      { type: 'defend', value: 35, description: 'Crust - +35 Block' },
      { type: 'buff', value: 5, description: 'Volcanic awakening - gain 5 Strength' },
      { type: 'attack', value: 24, description: 'ERUPTION - deal 24' },
    ],
  },
  {
    id: 'BOSS-02', name: 'Null Shepherd', lore: 'A Warp Rider archon that tends herds across dimensions.',
    maxHealth: 150, attack: 14, art: 'NUL', acts: [2], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 14, description: 'Void stare - deal 14' },
      { type: 'summon', description: 'Shepherd summons 2 Rift Nibblers' },
      { type: 'debuff', value: 4, description: 'Unmake - apply 4 Vulnerable, 4 Weak' },
      { type: 'special', value: 10, description: 'Pull the flock - deal 10, shuffle hand' },
      { type: 'defend', value: 30, description: 'Phase-out - +30 Block' },
      { type: 'attack', value: 9, description: 'Herd strike - deal 9 twice' },
      { type: 'attack', value: 26, description: 'CULL - deal 26' },
    ],
  },
  {
    id: 'BOSS-03', name: 'The Starforged', lore: 'An ancient construct holding the last Starforge core. Final act of three.',
    maxHealth: 165, attack: 18, art: 'SFG', acts: [3], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 18, description: 'Prime strike - deal 18' },
      { type: 'buff', value: 4, description: 'Reforge - gain 4 Strength' },
      { type: 'attack', value: 12, description: 'Forge hammers - deal 12 twice' },
      { type: 'debuff', value: 5, description: 'Unmake reality - 5 Vulnerable, 5 Weak' },
      { type: 'defend', value: 32, description: 'Adamant core - +32 Block' },
      { type: 'summon', description: 'Forge anvils - summon 2 Sentries' },
      { type: 'special', value: 14, description: 'Chrono-halt - deal 14, skip your turn' },
      { type: 'attack', value: 34, description: 'STARFORGE - deal 34' },
    ],
  },
];

// ─── Enemy summons ────────────────────────────────────────────────────────────
// Minions spawned by 'summon' intents (Forgewright, Warforge Sovereign,
// Null Shepherd, The Starforged). They persist on the enemy board, attack the
// player each enemy turn, and expire after `turns` if not killed first.

export interface EnemySummonDefinition {
  name: string;
  health: number;
  attack: number;
  /** GUARDIAN: player minions must attack this summon before the enemy. */
  guardian?: boolean;
  /** Enemy turns the summon persists. */
  turns: number;
}

export const ENEMY_SUMMON_DEFS: EnemySummonDefinition[] = [
  { name: 'Drone', health: 5, attack: 3, turns: 3 },
  { name: 'Rift Nibbler', health: 7, attack: 3, turns: 3 },
  { name: 'Sentry', health: 9, attack: 4, guardian: true, turns: 3 },
];

/** Match a summon definition mentioned in an intent description. */
export function findEnemySummonInText(text: string): EnemySummonDefinition | undefined {
  const lower = text.toLowerCase();
  return ENEMY_SUMMON_DEFS.find((def) => {
    const name = def.name.toLowerCase();
    return lower.includes(name) || lower.includes(`${name}s`) || lower.includes(name.replace(/y$/, 'ies'));
  });
}

// ─── Pool ────────────────────────────────────────────────────────────────────

export const ENEMY_POOL: EnemyDefinition[] = [
  ...ACT1_STANDARD,
  ...ACT2_STANDARD,
  ...ACT3_STANDARD,
  ...ELITES,
  ...BOSSES,
];

export const getEnemiesByAct = (act: 1 | 2 | 3): EnemyDefinition[] =>
  ENEMY_POOL.filter((e) => e.acts.includes(act) && !e.isBoss && !e.isElite);

export const getElitesByAct = (act: 1 | 2 | 3): EnemyDefinition[] =>
  ENEMY_POOL.filter((e) => e.acts.includes(act) && e.isElite);

export const getBossByAct = (act: 1 | 2 | 3): EnemyDefinition | undefined =>
  ENEMY_POOL.find((e) => e.isBoss && e.acts.includes(act));

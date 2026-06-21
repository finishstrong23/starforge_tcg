import type { EnemyDefinition } from '../types';

// ─── Act 1 - Shattered Reach surface (8 standard enemies) ────────────────────
// Moderate HP (30-60), low-to-mid attack (6-12).

const ACT1_STANDARD: EnemyDefinition[] = [
  {
    id: 'E1-01', name: 'Cogsworn Scout', lore: 'A rusted recon drone running faction-war protocols.',
    maxHealth: 18, attack: 6, art: 'BOT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Rivet burst - deal 6' },
      { type: 'defend', value: 6, description: 'Deploy shield plates - +6 Block' },
      { type: 'attack', value: 4, description: 'Double tap - deal 4' },
    ],
  },
  {
    id: 'E1-02', name: 'Ember Houndling', lore: 'A pup-sized Pyroclast beast with a furnace belly.',
    maxHealth: 16, attack: 6, art: 'HND', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Cinder bite - deal 6' },
      { type: 'debuff', value: 2, description: 'Soot breath - apply 2 Weak' },
      { type: 'attack', value: 5, description: 'Ember lunge - deal 5' },
    ],
  },
  {
    id: 'E1-03', name: 'Chantling', lore: 'A child acolyte of the Luminar, humming unstable harmonics.',
    maxHealth: 16, attack: 4, art: 'CHT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 4, description: 'Prism bolt - deal 4' },
      { type: 'buff', value: 2, description: 'Channel - gain 2 Strength' },
      { type: 'attack', value: 7, description: 'Released hymn - deal 7' },
    ],
  },
  {
    id: 'E1-04', name: 'Rift Nibbler', lore: 'A trans-dimensional parasite with too many teeth.',
    maxHealth: 14, attack: 5, art: 'RFT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 5, description: 'Phase bite - deal 5' },
      { type: 'attack', value: 3, description: 'Ripple chomp - deal 3 twice', },
      { type: 'defend', value: 5, description: 'Warp aside - +5 Block' },
    ],
  },
  {
    id: 'E1-05', name: 'Wire-Tangle', lore: 'A mass of live cabling that remembers being a worker.',
    maxHealth: 22, attack: 7, art: 'WIR', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 7, description: 'Snap strike - deal 7' },
      { type: 'debuff', value: 2, description: 'Arc shock - apply 2 Vulnerable' },
      { type: 'defend', value: 8, description: 'Coil up - +8 Block' },
    ],
  },
  {
    id: 'E1-06', name: 'Glasspicker', lore: 'A scavenger that collects shards of the Shattered Reach.',
    maxHealth: 20, attack: 8, art: 'GLS', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: 'Shiv - deal 8' },
      { type: 'buff', value: 3, description: 'Sharpen - gain 3 Strength' },
      { type: 'attack', value: 10, description: 'Honed stab - deal 10' },
    ],
  },
  {
    id: 'E1-07', name: 'Sump Gremlin', lore: 'A runt hiding in coolant vents. Spits oil.',
    maxHealth: 12, attack: 4, art: 'OIL', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'debuff', value: 2, description: 'Oil spit - apply 2 Weak' },
      { type: 'attack', value: 4, description: 'Wrench chuck - deal 4' },
      { type: 'attack', value: 2, description: 'Flurry - deal 2 three times' },
    ],
  },
  {
    id: 'E1-08', name: 'Null Suit', lore: 'An empty exo-suit that refuses to lie down.',
    maxHealth: 28, attack: 6, art: 'SUT', acts: [1], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 6, description: 'Rote punch - deal 6' },
      { type: 'defend', value: 10, description: 'Servo-lock - +10 Block' },
      { type: 'attack', value: 8, description: 'Executor protocol - deal 8' },
    ],
  },
];

// ─── Act 2 - Inner Forge (7 standard enemies) ────────────────────────────────
// Higher HP (50-90), moderate attack (10-18).

const ACT2_STANDARD: EnemyDefinition[] = [
  {
    id: 'E2-01', name: 'Magma Strider', lore: 'A six-legged lava skimmer. Leaves scorched footprints.',
    maxHealth: 34, attack: 10, art: 'MAG', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 10, description: 'Scalding kick - deal 10' },
      { type: 'debuff', value: 3, description: 'Heat haze - apply 3 Weak' },
      { type: 'attack', value: 6, description: 'Twin-lance - deal 6 twice' },
    ],
  },
  {
    id: 'E2-02', name: 'Halo Sentinel', lore: 'A Luminar guardian statue that learned anger.',
    maxHealth: 42, attack: 8, art: 'HAL', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 8, description: 'Radiant smite - deal 8' },
      { type: 'defend', value: 14, description: 'Sanctified stance - +14 Block' },
      { type: 'buff', value: 3, description: 'Channel light - gain 3 Strength' },
    ],
  },
  {
    id: 'E2-03', name: 'Forgewright', lore: 'A Cogsmith rogue technician with three working arms.',
    maxHealth: 38, attack: 9, art: 'FRG', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 9, description: 'Hammer drop - deal 9' },
      { type: 'summon', description: 'Assemble - summon a Drone next turn' },
      { type: 'defend', value: 12, description: 'Plate up - +12 Block' },
    ],
  },
  {
    id: 'E2-04', name: 'Rift-Stalker', lore: 'A Warp Rider hunter that phases between attacks.',
    maxHealth: 30, attack: 11, art: 'STK', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 11, description: 'Dimensional strike - deal 11' },
      { type: 'debuff', value: 2, description: 'Probability shift - apply 2 Vulnerable' },
      { type: 'attack', value: 7, description: 'Phase flurry - deal 7' },
    ],
  },
  {
    id: 'E2-05', name: 'Blast Furnace', lore: 'A walking Pyroclast furnace. Overheats on impact.',
    maxHealth: 48, attack: 11, art: 'FUR', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 11, description: 'Flame vent - deal 11' },
      { type: 'buff', value: 4, description: 'Stoke - gain 4 Strength' },
      { type: 'attack', value: 15, description: 'Overheat - deal 15, self-stun' },
    ],
  },
  {
    id: 'E2-06', name: 'Circuit Priest', lore: 'A Luminar-Cogsmith hybrid preaching a machine gospel.',
    maxHealth: 34, attack: 8, art: 'PRI', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'buff', value: 3, description: 'Bless - gain 3 Strength' },
      { type: 'attack', value: 8, description: 'Sacred bolt - deal 8' },
      { type: 'debuff', value: 2, description: 'Curse - apply 2 Weak, 2 Vulnerable' },
    ],
  },
  {
    id: 'E2-07', name: 'Split Reaver', lore: 'A Warp Rider that fights alongside its other-dimensional self.',
    maxHealth: 38, attack: 9, art: 'SPL', acts: [2], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 5, description: 'Twin slash - deal 5 twice' },
      { type: 'defend', value: 10, description: 'Fade - +10 Block' },
      { type: 'attack', value: 12, description: 'Merged strike - deal 12' },
    ],
  },
];

// ─── Act 3 - Deep Below (5 standard enemies) ─────────────────────────────────
// High HP (75-120), high attack (14-22).

const ACT3_STANDARD: EnemyDefinition[] = [
  {
    id: 'E3-01', name: 'Ashen Colossus', lore: 'A walking volcano long past extinction.',
    maxHealth: 60, attack: 14, art: 'COL', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 14, description: 'Tectonic slam - deal 14' },
      { type: 'defend', value: 18, description: 'Lava skin - +18 Block' },
      { type: 'attack', value: 8, description: 'Quake - deal 8 to all' },
    ],
  },
  {
    id: 'E3-02', name: 'Starbound Inquisitor', lore: 'A Luminar judge with sentence already written.',
    maxHealth: 50, attack: 13, art: 'JDG', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 13, description: 'Verdict strike - deal 13' },
      { type: 'debuff', value: 4, description: 'Damnation - apply 4 Vulnerable' },
      { type: 'buff', value: 5, description: 'Witness - gain 5 Strength' },
    ],
  },
  {
    id: 'E3-03', name: 'Warforge Sovereign', lore: 'The last ruling Cogsmith, all ceremony fused to armor.',
    maxHealth: 72, attack: 11, art: 'SOV', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 11, description: 'Scepter blow - deal 11' },
      { type: 'summon', description: 'Coronation - summon 2 Drones' },
      { type: 'defend', value: 22, description: 'Royal plate - +22 Block' },
    ],
  },
  {
    id: 'E3-04', name: 'Paradox Maw', lore: 'A Warp Rider predator with no fixed shape.',
    maxHealth: 46, attack: 15, art: 'MAW', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 15, description: 'Cascade bite - deal 15' },
      { type: 'special', value: 7, description: 'Swallow - deal 7, steal a card' },
      { type: 'attack', value: 10, description: 'Echo strike - deal 10' },
    ],
  },
  {
    id: 'E3-05', name: 'Broken Choir', lore: 'The last members of the Cosmic Choir, singing out of tune.',
    maxHealth: 56, attack: 10, art: 'CHR', acts: [3], isElite: false, isBoss: false,
    intents: [
      { type: 'attack', value: 5, description: 'Dissonant chord - deal 5 three times' },
      { type: 'debuff', value: 3, description: 'Silencing note - apply 3 Weak' },
      { type: 'buff', value: 4, description: 'Harmonize - gain 4 Strength' },
    ],
  },
];

// ─── Elites (4 elites across acts) ───────────────────────────────────────────

const ELITES: EnemyDefinition[] = [
  {
    id: 'EL-01', name: 'Gearforged Juggernaut', lore: 'A Cogsmith war-engine that outlived its pilot.',
    maxHealth: 45, attack: 10, art: 'JUG', acts: [1, 2], isElite: true, isBoss: false,
    onDeath: 'Explodes for 6 damage to all.',
    intents: [
      { type: 'attack', value: 10, description: 'Piston punch - deal 10' },
      { type: 'defend', value: 15, description: 'Battle stance - +15 Block' },
      { type: 'attack', value: 14, description: 'Overload - deal 14' },
      { type: 'buff', value: 3, description: 'Re-calibrate - gain 3 Strength' },
    ],
  },
  {
    id: 'EL-02', name: 'Sunfire Herald', lore: 'A Luminar zealot who traded flesh for radiance.',
    maxHealth: 50, attack: 9, art: 'SUN', acts: [1, 2], isElite: true, isBoss: false,
    onDeath: 'Releases stored Lumens - heals player 10 HP.',
    intents: [
      { type: 'attack', value: 9, description: 'Solar lance - deal 9' },
      { type: 'buff', value: 4, description: 'Burn bright - gain 4 Strength' },
      { type: 'attack', value: 13, description: 'Apex ray - deal 13' },
      { type: 'debuff', value: 3, description: 'Blind - apply 3 Weak' },
    ],
  },
  {
    id: 'EL-03', name: 'Magma Tyrant', lore: 'A Pyroclast warlord who ate the Crown of the Unburnt.',
    maxHealth: 60, attack: 11, art: 'TYR', acts: [2, 3], isElite: true, isBoss: false,
    onDeath: 'Death-burst: deal 15 to all enemies.',
    intents: [
      { type: 'attack', value: 11, description: 'Dragon claw - deal 11' },
      { type: 'buff', value: 5, description: 'Stoke the core - gain 5 Strength' },
      { type: 'attack', value: 7, description: 'Ember breath - deal 7 to all' },
      { type: 'defend', value: 20, description: 'Magma skin - +20 Block' },
    ],
  },
  {
    id: 'EL-04', name: 'Rift Warden', lore: 'A Warp Rider jailer with keys to every dimension.',
    maxHealth: 55, attack: 12, art: 'WRD', acts: [2, 3], isElite: true, isBoss: false,
    onDeath: 'Releases a stored rift - next combat starts with -1 Energy.',
    intents: [
      { type: 'attack', value: 12, description: 'Warp strike - deal 12' },
      { type: 'debuff', value: 3, description: 'Seal - apply 3 Weak, 3 Vulnerable' },
      { type: 'special', value: 6, description: 'Chrono-lock - deal 6, skip your draw' },
      { type: 'attack', value: 4, description: 'Fractured slash - deal 4 twice' },
    ],
  },
];

// ─── Bosses (one per act) ────────────────────────────────────────────────────

const BOSSES: EnemyDefinition[] = [
  {
    id: 'BOSS-01', name: 'Scoria Titan', lore: 'The first Pyroclast, risen from the Shattered Reach.',
    maxHealth: 110, attack: 12, art: 'TIT', acts: [1], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 12, description: 'Mountain fist - deal 12' },
      { type: 'debuff', value: 3, description: 'Ash cloud - apply 3 Weak to you' },
      { type: 'attack', value: 5, description: 'Ember rain - deal 5 three times' },
      { type: 'defend', value: 30, description: 'Crust - +30 Block' },
      { type: 'buff', value: 5, description: 'Volcanic awakening - gain 5 Strength' },
      { type: 'attack', value: 22, description: 'ERUPTION - deal 22' },
    ],
  },
  {
    id: 'BOSS-02', name: 'Null Shepherd', lore: 'A Warp Rider archon that tends herds across dimensions.',
    maxHealth: 145, attack: 13, art: 'NUL', acts: [2], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 13, description: 'Void stare - deal 13' },
      { type: 'summon', description: 'Shepherd summons 2 Rift Nibblers' },
      { type: 'debuff', value: 4, description: 'Unmake - apply 4 Vulnerable, 4 Weak' },
      { type: 'special', value: 8, description: 'Pull the flock - deal 8, shuffle hand' },
      { type: 'defend', value: 25, description: 'Phase-out - +25 Block' },
      { type: 'attack', value: 9, description: 'Herd strike - deal 9 twice' },
      { type: 'attack', value: 26, description: 'CULL - deal 26' },
    ],
  },
  {
    id: 'BOSS-03', name: 'The Starforged', lore: 'An ancient construct holding the last Starforge core. Final act of three.',
    maxHealth: 175, attack: 16, art: 'SFG', acts: [3], isElite: false, isBoss: true,
    intents: [
      { type: 'attack', value: 16, description: 'Prime strike - deal 16' },
      { type: 'buff', value: 6, description: 'Reforge - gain 6 Strength' },
      { type: 'attack', value: 9, description: 'Forge hammers - deal 9 three times' },
      { type: 'debuff', value: 5, description: 'Unmake reality - 5 Vulnerable, 5 Weak' },
      { type: 'defend', value: 35, description: 'Adamant core - +35 Block' },
      { type: 'summon', description: 'Forge anvils - summon 2 Sentries' },
      { type: 'special', value: 13, description: 'Chrono-halt - deal 13, skip your turn' },
      { type: 'attack', value: 31, description: 'STARFORGE - deal 31' },
    ],
  },
];

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

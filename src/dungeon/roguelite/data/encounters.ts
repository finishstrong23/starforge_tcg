/**
 * STARFORGE TCG — Roguelite Encounter Pools
 *
 * Defines enemy encounters for each act and node type.
 * Enemies use vanilla STARFORGE decks (no upgrades).
 * Scaling is done via hero HP and AI difficulty.
 */

import { Race } from '../../../types/Race';
import type { EncounterConfig, MapNodeType } from '../types';

// ─── Act 1 Encounters ─────────────────────────────────────

const ACT1_COMBAT: EncounterConfig[] = [
  {
    race: Race.HIVEMIND, heroId: 'hero_hivemind_queen', heroHp: 20,
    difficulty: 'easy', name: 'Hivemind Swarm',
    introText: 'A buzzing horde of drones blocks your path.',
  },
  {
    race: Race.COGSMITHS, heroId: 'hero_cogsmiths_gearsmith', heroHp: 22,
    difficulty: 'easy', name: 'Rogue Automaton',
    introText: 'A malfunctioning construct lurches toward you.',
  },
  {
    race: Race.PYROCLAST, heroId: 'hero_pyroclast_emberlord', heroHp: 20,
    difficulty: 'easy', name: 'Ember Cultist',
    introText: 'A fire worshipper hurls sparks at your shield.',
  },
  {
    race: Race.LUMINAR, heroId: 'hero_luminar_solarius', heroHp: 24,
    difficulty: 'easy', name: 'Fallen Acolyte',
    introText: 'A corrupted light-weaver bars your way.',
  },
  {
    race: Race.BIOTITANS, heroId: 'hero_biotitans_primarch', heroHp: 22,
    difficulty: 'easy', name: 'Feral Genestock',
    introText: 'A mutated beast charges from the undergrowth.',
  },
  {
    race: Race.PHANTOM_CORSAIRS, heroId: 'hero_phantom_corsairs_captain', heroHp: 20,
    difficulty: 'easy', name: 'Ghost Raider',
    introText: 'A spectral pirate materializes with blade drawn.',
  },
];

const ACT1_ELITE: EncounterConfig[] = [
  {
    race: Race.VOIDBORN, heroId: 'hero_voidborn_herald', heroHp: 32,
    difficulty: 'easy', name: 'Void Sentinel',
    introText: 'A towering void construct pulses with dark energy.',
  },
  {
    race: Race.CRYSTALLINE, heroId: 'hero_crystalline_archon', heroHp: 30,
    difficulty: 'medium', name: 'Crystal Golem',
    introText: 'A massive crystal entity blocks the corridor.',
  },
  {
    race: Race.CHRONOBOUND, heroId: 'hero_chronobound_warden', heroHp: 30,
    difficulty: 'easy', name: 'Temporal Warden',
    introText: 'Time itself bends around this ancient guardian.',
  },
];

const ACT1_BOSS: EncounterConfig[] = [
  {
    race: Race.PYROCLAST, heroId: 'hero_pyroclast_emberlord', heroHp: 40,
    difficulty: 'medium', name: 'Inferno Drake',
    introText: 'The first guardian of the dungeon roars with flame.',
  },
  {
    race: Race.HIVEMIND, heroId: 'hero_hivemind_queen', heroHp: 40,
    difficulty: 'medium', name: 'The Brood Queen',
    introText: 'An endless swarm pours from the hive mother.',
  },
  {
    race: Race.COGSMITHS, heroId: 'hero_cogsmiths_gearsmith', heroHp: 40,
    difficulty: 'medium', name: 'Siege Engine Omega',
    introText: 'A war machine the size of a building powers up.',
  },
];

// ─── Act 2 Encounters ─────────────────────────────────────

const ACT2_COMBAT: EncounterConfig[] = [
  {
    race: Race.VOIDBORN, heroId: 'hero_voidborn_herald', heroHp: 30,
    difficulty: 'medium', name: 'Void Aberration',
    introText: 'Reality warps as the void entity materializes.',
  },
  {
    race: Race.ASTROMANCERS, heroId: 'hero_astromancers_sage', heroHp: 28,
    difficulty: 'medium', name: 'Starbound Seer',
    introText: 'A cosmic mage channels stellar energies.',
  },
  {
    race: Race.CHRONOBOUND, heroId: 'hero_chronobound_warden', heroHp: 32,
    difficulty: 'medium', name: 'Paradox Knight',
    introText: 'A warrior displaced in time attacks from all angles.',
  },
  {
    race: Race.PYROCLAST, heroId: 'hero_pyroclast_emberlord', heroHp: 30,
    difficulty: 'medium', name: 'Magma Colossus',
    introText: 'The ground cracks as molten stone rises.',
  },
  {
    race: Race.BIOTITANS, heroId: 'hero_biotitans_primarch', heroHp: 34,
    difficulty: 'medium', name: 'Alpha Predator',
    introText: 'The apex creature of this sector hunts you.',
  },
  {
    race: Race.CRYSTALLINE, heroId: 'hero_crystalline_archon', heroHp: 30,
    difficulty: 'medium', name: 'Mana Wraith',
    introText: 'A crystalline specter drains your energy.',
  },
];

const ACT2_ELITE: EncounterConfig[] = [
  {
    race: Race.PHANTOM_CORSAIRS, heroId: 'hero_phantom_corsairs_captain', heroHp: 44,
    difficulty: 'medium', name: 'Phantom Admiral',
    introText: 'The ghost fleet\'s commander appears before you.',
  },
  {
    race: Race.ASTROMANCERS, heroId: 'hero_astromancers_sage', heroHp: 42,
    difficulty: 'medium', name: 'Nebula Weaver',
    introText: 'Stars dance in deadly patterns around this mage.',
  },
  {
    race: Race.LUMINAR, heroId: 'hero_luminar_solarius', heroHp: 46,
    difficulty: 'hard', name: 'Radiant Champion',
    introText: 'A holy warrior wreathed in blinding light.',
  },
];

const ACT2_BOSS: EncounterConfig[] = [
  {
    race: Race.VOIDBORN, heroId: 'hero_voidborn_herald', heroHp: 55,
    difficulty: 'hard', name: 'The Hollow King',
    introText: 'The ruler of the void dimension challenges you.',
  },
  {
    race: Race.ASTROMANCERS, heroId: 'hero_astromancers_sage', heroHp: 55,
    difficulty: 'hard', name: 'Constellation Prime',
    introText: 'A being made of living starlight bars the way.',
  },
  {
    race: Race.PHANTOM_CORSAIRS, heroId: 'hero_phantom_corsairs_captain', heroHp: 55,
    difficulty: 'hard', name: 'Dread Pirate Revenant',
    introText: 'The most feared corsair of the phantom fleet.',
  },
];

// ─── Act 3 Encounters ─────────────────────────────────────

const ACT3_COMBAT: EncounterConfig[] = [
  {
    race: Race.CHRONOBOUND, heroId: 'hero_chronobound_warden', heroHp: 38,
    difficulty: 'hard', name: 'Chrono Executioner',
    introText: 'A time-looped assassin strikes endlessly.',
  },
  {
    race: Race.VOIDBORN, heroId: 'hero_voidborn_herald', heroHp: 40,
    difficulty: 'hard', name: 'Reality Fracture',
    introText: 'The fabric of space tears open around you.',
  },
  {
    race: Race.COGSMITHS, heroId: 'hero_cogsmiths_gearsmith', heroHp: 42,
    difficulty: 'hard', name: 'War Factory',
    introText: 'An autonomous factory produces armies.',
  },
  {
    race: Race.BIOTITANS, heroId: 'hero_biotitans_primarch', heroHp: 44,
    difficulty: 'hard', name: 'Titan Matriarch',
    introText: 'The mother of all biotitans rises.',
  },
  {
    race: Race.LUMINAR, heroId: 'hero_luminar_solarius', heroHp: 40,
    difficulty: 'hard', name: 'Solar Inquisitor',
    introText: 'Judgment burns with the heat of a star.',
  },
  {
    race: Race.CRYSTALLINE, heroId: 'hero_crystalline_archon', heroHp: 42,
    difficulty: 'hard', name: 'Prism Overlord',
    introText: 'Crystal spires erupt from every surface.',
  },
];

const ACT3_ELITE: EncounterConfig[] = [
  {
    race: Race.HIVEMIND, heroId: 'hero_hivemind_queen', heroHp: 56,
    difficulty: 'hard', name: 'Hive Patriarch',
    introText: 'The supreme intelligence of the swarm.',
  },
  {
    race: Race.PYROCLAST, heroId: 'hero_pyroclast_emberlord', heroHp: 58,
    difficulty: 'hard', name: 'Infernal Archon',
    introText: 'A being of pure fire and destruction.',
  },
  {
    race: Race.CHRONOBOUND, heroId: 'hero_chronobound_warden', heroHp: 55,
    difficulty: 'hard', name: 'Paradox Sovereign',
    introText: 'The master of all timelines stands before you.',
  },
];

const ACT3_BOSS: EncounterConfig[] = [
  {
    race: Race.VOIDBORN, heroId: 'hero_voidborn_herald', heroHp: 70,
    difficulty: 'hard', name: 'The Starforged',
    introText: 'The ultimate power of the forge awaits. Only the worthy survive.',
  },
  {
    race: Race.CHRONOBOUND, heroId: 'hero_chronobound_warden', heroHp: 70,
    difficulty: 'hard', name: 'Entropy Incarnate',
    introText: 'Time itself collapses. Fight or be unmade.',
  },
  {
    race: Race.ASTROMANCERS, heroId: 'hero_astromancers_sage', heroHp: 70,
    difficulty: 'hard', name: 'Cosmic Arbiter',
    introText: 'The judge of all starforged champions awaits.',
  },
];

// ─── Encounter Pools ───────────────────────────────────────

interface ActEncounters {
  combat: EncounterConfig[];
  elite: EncounterConfig[];
  boss: EncounterConfig[];
}

const ENCOUNTER_POOLS: Record<1 | 2 | 3, ActEncounters> = {
  1: { combat: ACT1_COMBAT, elite: ACT1_ELITE, boss: ACT1_BOSS },
  2: { combat: ACT2_COMBAT, elite: ACT2_ELITE, boss: ACT2_BOSS },
  3: { combat: ACT3_COMBAT, elite: ACT3_ELITE, boss: ACT3_BOSS },
};

/**
 * Get a random encounter for the given act and node type.
 * Avoids the player's own race to prevent mirror matches.
 */
export function getEncounter(
  act: 1 | 2 | 3,
  nodeType: MapNodeType,
  playerRace?: Race,
): EncounterConfig {
  const pool = ENCOUNTER_POOLS[act];

  let candidates: EncounterConfig[];
  if (nodeType === 'BOSS') {
    candidates = pool.boss;
  } else if (nodeType === 'ELITE') {
    candidates = pool.elite;
  } else {
    candidates = pool.combat;
  }

  // Filter out player's own race if possible
  if (playerRace) {
    const filtered = candidates.filter(e => e.race !== playerRace);
    if (filtered.length > 0) {
      candidates = filtered;
    }
  }

  // Random pick
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get the boss encounter for a specific act.
 */
export function getActBoss(act: 1 | 2 | 3, playerRace?: Race): EncounterConfig {
  return getEncounter(act, 'BOSS', playerRace);
}

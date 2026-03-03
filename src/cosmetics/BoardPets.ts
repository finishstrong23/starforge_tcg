/**
 * STARFORGE TCG - Board Pets / Mascots (8.3.2)
 *
 * Small animated creatures on your side of the board:
 * - Idle animations (sleeping, exploring, reacting)
 * - React to game events (attacks, damage, lethal)
 * - 1 default pet per faction + unlockable pets
 * - Rarity tiers: Common (static), Rare (animated), Epic (interactive), Legendary (evolves)
 */

import { Race, RaceData } from '../types/Race';

const STORAGE_KEY = 'starforge_board_pets';

/**
 * Pet rarity determines animation complexity
 */
export enum PetRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/**
 * Pet moods / states
 */
export enum PetMood {
  IDLE = 'IDLE',
  HAPPY = 'HAPPY',
  EXCITED = 'EXCITED',
  SCARED = 'SCARED',
  SLEEPING = 'SLEEPING',
  CHEERING = 'CHEERING',
  CELEBRATING = 'CELEBRATING',
  MOURNING = 'MOURNING',
}

/**
 * Pet definition
 */
export interface PetDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: PetRarity;
  faction: Race | null; // null = universal
  unlockCondition: string;
  animations: {
    idle: string[];
    happy: string[];
    scared: string[];
    attack: string[];
    victory: string[];
    defeat: string[];
  };
  evolves?: boolean;
  evolutionStages?: string[];
}

/**
 * Game event types that pets react to
 */
export enum PetGameEvent {
  CARD_PLAYED = 'CARD_PLAYED',
  ATTACK = 'ATTACK',
  DAMAGE_TAKEN = 'DAMAGE_TAKEN',
  MINION_KILLED = 'MINION_KILLED',
  SPELL_CAST = 'SPELL_CAST',
  HEAL = 'HEAL',
  LETHAL = 'LETHAL',
  STARFORGE = 'STARFORGE',
  LOW_HEALTH = 'LOW_HEALTH',
  TURN_START = 'TURN_START',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
}

// ─── Pet Definitions ────────────────────────────────────────────────────────

export const ALL_PETS: PetDefinition[] = [
  // Default faction pets (1 per faction)
  {
    id: 'pet_cog_sparky',
    name: 'Sparky',
    emoji: '\u2699',
    description: 'A tiny wind-up cog companion that whirs and clicks.',
    rarity: PetRarity.RARE,
    faction: Race.COGSMITHS,
    unlockCondition: 'Default Cogsmiths pet',
    animations: {
      idle: ['spinning gears', 'tinkering', 'steam puff'],
      happy: ['sparks fly', 'whistle'],
      scared: ['gears grind', 'hide'],
      attack: ['revs up', 'charges'],
      victory: ['fireworks from exhaust', 'victory spin'],
      defeat: ['powers down', 'sad whistle'],
    },
  },
  {
    id: 'pet_lum_halo',
    name: 'Halo',
    emoji: '\uD83D\uDC7C',
    description: 'A floating orb of warm, divine light.',
    rarity: PetRarity.RARE,
    faction: Race.LUMINAR,
    unlockCondition: 'Default Luminar pet',
    animations: {
      idle: ['gentle bobbing', 'soft glow pulse', 'peaceful orbit'],
      happy: ['bright flash', 'rainbow shimmer'],
      scared: ['dims rapidly', 'hides behind board'],
      attack: ['blindingly bright', 'smite gesture'],
      victory: ['ascends gloriously', 'benediction'],
      defeat: ['slowly fades', 'falls to ground'],
    },
  },
  {
    id: 'pet_pyr_ember',
    name: 'Ember',
    emoji: '\uD83D\uDD25',
    description: 'A mischievous living flame that flickers and dances.',
    rarity: PetRarity.RARE,
    faction: Race.PYROCLAST,
    unlockCondition: 'Default Pyroclast pet',
    animations: {
      idle: ['flickering', 'dancing', 'warming hands'],
      happy: ['blazes up', 'shoots sparks'],
      scared: ['shrinks to ember', 'hides in ash'],
      attack: ['roaring flame', 'fire breath'],
      victory: ['eruption', 'fireworks'],
      defeat: ['sputters out', 'smoke wisp'],
    },
  },
  {
    id: 'pet_void_shadow',
    name: 'Shade',
    emoji: '\uD83D\uDC7B',
    description: 'A small sentient shadow that shifts and whispers.',
    rarity: PetRarity.RARE,
    faction: Race.VOIDBORN,
    unlockCondition: 'Default Voidborn pet',
    animations: {
      idle: ['shifting form', 'floating', 'glancing around'],
      happy: ['expands joyfully', 'dark sparkles'],
      scared: ['flattens to 2D', 'merges with floor'],
      attack: ['lunges menacingly', 'dark tendrils'],
      victory: ['triumphant growth', 'void portal'],
      defeat: ['dissolves slowly', 'sad whisper'],
    },
  },
  {
    id: 'pet_bio_sprout',
    name: 'Sprout',
    emoji: '\uD83C\uDF31',
    description: 'An adorable baby creature that grows during matches.',
    rarity: PetRarity.LEGENDARY,
    faction: Race.BIOTITANS,
    unlockCondition: 'Default Biotitans pet',
    evolves: true,
    evolutionStages: ['\uD83C\uDF31', '\uD83C\uDF3F', '\uD83C\uDF33', '\uD83C\uDF32'],
    animations: {
      idle: ['photosynthesizing', 'stretching', 'swaying'],
      happy: ['blooms flower', 'leaves flutter'],
      scared: ['curls up', 'wilts slightly'],
      attack: ['vine whip', 'spore burst'],
      victory: ['full bloom', 'forest erupts'],
      defeat: ['wilts completely', 'leaf falls'],
    },
  },
  {
    id: 'pet_crys_prism',
    name: 'Prism',
    emoji: '\uD83D\uDC8E',
    description: 'A floating crystal shard that refracts light beautifully.',
    rarity: PetRarity.RARE,
    faction: Race.CRYSTALLINE,
    unlockCondition: 'Default Crystalline pet',
    animations: {
      idle: ['rotating', 'light refraction', 'gentle hum'],
      happy: ['rainbow burst', 'resonating'],
      scared: ['cracks appear', 'dims'],
      attack: ['laser focus', 'shatter burst'],
      victory: ['prismatic explosion', 'levitates high'],
      defeat: ['fractures', 'falls silent'],
    },
  },
  {
    id: 'pet_phan_parrot',
    name: 'Poltergeist',
    emoji: '\uD83E\uDD9C',
    description: 'A ghostly spectral parrot from the Netherstorm.',
    rarity: PetRarity.RARE,
    faction: Race.PHANTOM_CORSAIRS,
    unlockCondition: 'Default Phantom Corsairs pet',
    animations: {
      idle: ['preening', 'lookout', 'pecking at loot'],
      happy: ['squawks', 'flips'],
      scared: ['phases out', 'hides in pocket'],
      attack: ['dive bomb', 'beak strike'],
      victory: ['treasure shower', 'victory lap'],
      defeat: ['flies away', 'sad squawk'],
    },
  },
  {
    id: 'pet_hive_drone',
    name: 'Buzzy',
    emoji: '\uD83D\uDC1D',
    description: 'A loyal drone from the Hivemind collective.',
    rarity: PetRarity.RARE,
    faction: Race.HIVEMIND,
    unlockCondition: 'Default Hivemind pet',
    animations: {
      idle: ['buzzing around', 'building comb', 'dancing'],
      happy: ['waggle dance', 'honey drip'],
      scared: ['erratic flight', 'swarm scatter'],
      attack: ['stinger charge', 'pheromone burst'],
      victory: ['honey celebration', 'swarm formation'],
      defeat: ['falls to ground', 'fading buzz'],
    },
  },
  {
    id: 'pet_astro_nova',
    name: 'Nova',
    emoji: '\u2B50',
    description: 'A tiny captured star that orbits around you.',
    rarity: PetRarity.RARE,
    faction: Race.ASTROMANCERS,
    unlockCondition: 'Default Astromancers pet',
    animations: {
      idle: ['orbiting', 'twinkling', 'constellation trace'],
      happy: ['supernova flash', 'comet trail'],
      scared: ['fades dim', 'hides behind moon'],
      attack: ['meteor shower', 'solar flare'],
      victory: ['galaxy spiral', 'constellation art'],
      defeat: ['goes supernova', 'fades to black hole'],
    },
  },
  {
    id: 'pet_chrono_tick',
    name: 'Tick-Tock',
    emoji: '\u231B',
    description: 'A sentient hourglass that bends time around itself.',
    rarity: PetRarity.RARE,
    faction: Race.CHRONOBOUND,
    unlockCondition: 'Default Chronobound pet',
    animations: {
      idle: ['sand flowing', 'time bubble', 'age/youth flicker'],
      happy: ['time accelerates', 'golden glow'],
      scared: ['freezes time', 'rewinds'],
      attack: ['time blast', 'age beam'],
      victory: ['eternal celebration', 'victory across timelines'],
      defeat: ['sands stop', 'cracks and empties'],
    },
  },

  // Universal unlock pets
  {
    id: 'pet_cosmic_cat',
    name: 'Cosmic Cat',
    emoji: '\uD83D\uDC31',
    description: 'A mysterious feline that walks between dimensions.',
    rarity: PetRarity.EPIC,
    faction: null,
    unlockCondition: 'Win 100 ranked games',
    animations: {
      idle: ['napping', 'licking paw', 'staring into void'],
      happy: ['purring', 'rolling over'],
      scared: ['arches back', 'hisses'],
      attack: ['pounce', 'scratch'],
      victory: ['smug loaf', 'victory purr'],
      defeat: ['nonchalant lick', 'walks away'],
    },
  },
  {
    id: 'pet_stardust_dragon',
    name: 'Stardust',
    emoji: '\uD83D\uDC09',
    description: 'A tiny dragon made of pure stardust.',
    rarity: PetRarity.LEGENDARY,
    faction: null,
    unlockCondition: 'Collect all 10 faction-default pets',
    evolves: true,
    evolutionStages: ['\uD83E\uDD5A', '\uD83D\uDC23', '\uD83E\uDD8E', '\uD83D\uDC09'],
    animations: {
      idle: ['sleeping on hoard', 'tiny flame breath', 'chasing tail'],
      happy: ['loop-de-loop', 'rainbow fire'],
      scared: ['hides under wing', 'squeaks'],
      attack: ['fire breath', 'tail swipe'],
      victory: ['majestic roar', 'flies overhead'],
      defeat: ['sad whimper', 'curls up in egg'],
    },
  },
];

// ─── Pet State Management ───────────────────────────────────────────────────

export interface PetSaveData {
  equippedPetId: string | null;
  unlockedPets: string[];
  petExperience: Record<string, number>;
  totalPetsCollected: number;
}

/**
 * Get the pet to react to a game event
 */
export function getPetReaction(event: PetGameEvent): PetMood {
  switch (event) {
    case PetGameEvent.CARD_PLAYED: return PetMood.HAPPY;
    case PetGameEvent.ATTACK: return PetMood.EXCITED;
    case PetGameEvent.DAMAGE_TAKEN: return PetMood.SCARED;
    case PetGameEvent.MINION_KILLED: return PetMood.EXCITED;
    case PetGameEvent.SPELL_CAST: return PetMood.HAPPY;
    case PetGameEvent.HEAL: return PetMood.HAPPY;
    case PetGameEvent.LETHAL: return PetMood.CELEBRATING;
    case PetGameEvent.STARFORGE: return PetMood.CHEERING;
    case PetGameEvent.LOW_HEALTH: return PetMood.SCARED;
    case PetGameEvent.TURN_START: return PetMood.IDLE;
    case PetGameEvent.VICTORY: return PetMood.CELEBRATING;
    case PetGameEvent.DEFEAT: return PetMood.MOURNING;
    default: return PetMood.IDLE;
  }
}

/**
 * Get animation text for a pet + mood combo
 */
export function getPetAnimation(pet: PetDefinition, mood: PetMood): string {
  switch (mood) {
    case PetMood.HAPPY:
    case PetMood.CHEERING:
      return pet.animations.happy[Math.floor(Math.random() * pet.animations.happy.length)];
    case PetMood.EXCITED:
    case PetMood.CELEBRATING:
      return pet.animations.victory[Math.floor(Math.random() * pet.animations.victory.length)];
    case PetMood.SCARED:
      return pet.animations.scared[Math.floor(Math.random() * pet.animations.scared.length)];
    case PetMood.MOURNING:
      return pet.animations.defeat[Math.floor(Math.random() * pet.animations.defeat.length)];
    default:
      return pet.animations.idle[Math.floor(Math.random() * pet.animations.idle.length)];
  }
}

/**
 * Get evolution stage emoji for evolving pets
 */
export function getPetEvolutionEmoji(pet: PetDefinition, experience: number): string {
  if (!pet.evolves || !pet.evolutionStages) return pet.emoji;
  const stageThresholds = [0, 10, 25, 50];
  let stage = 0;
  for (let i = stageThresholds.length - 1; i >= 0; i--) {
    if (experience >= stageThresholds[i]) {
      stage = i;
      break;
    }
  }
  return pet.evolutionStages[Math.min(stage, pet.evolutionStages.length - 1)];
}

/**
 * Load pet save data
 */
export function loadPetData(): PetSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  // Default: all faction default pets unlocked
  const defaultUnlocked = ALL_PETS
    .filter(p => p.faction !== null && p.unlockCondition.startsWith('Default'))
    .map(p => p.id);

  return {
    equippedPetId: defaultUnlocked[0] || null,
    unlockedPets: defaultUnlocked,
    petExperience: {},
    totalPetsCollected: defaultUnlocked.length,
  };
}

/**
 * Save pet data
 */
export function savePetData(data: PetSaveData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Equip a pet
 */
export function equipPet(data: PetSaveData, petId: string): PetSaveData {
  if (!data.unlockedPets.includes(petId)) return data;
  const updated = { ...data, equippedPetId: petId };
  savePetData(updated);
  return updated;
}

/**
 * Add experience to equipped pet
 */
export function addPetExperience(data: PetSaveData, amount: number): PetSaveData {
  if (!data.equippedPetId) return data;
  const exp = { ...data.petExperience };
  exp[data.equippedPetId] = (exp[data.equippedPetId] || 0) + amount;
  const updated = { ...data, petExperience: exp };
  savePetData(updated);
  return updated;
}

/**
 * Get the currently equipped pet definition
 */
export function getEquippedPet(data: PetSaveData): PetDefinition | null {
  if (!data.equippedPetId) return null;
  return ALL_PETS.find(p => p.id === data.equippedPetId) || null;
}

/**
 * Get pets available for a given faction
 */
export function getPetsForFaction(faction: Race): PetDefinition[] {
  return ALL_PETS.filter(p => p.faction === faction || p.faction === null);
}

/**
 * STARFORGE TCG - Race Types
 *
 * The 10 asymmetric alien races/planets.
 */

/**
 * All playable races in STARFORGE
 */
export enum Race {
  /** Mechanical engineers, artifact synergy */
  COGSMITHS = 'COGSMITHS',
  /** Holy light, healing, divine protection */
  LUMINAR = 'LUMINAR',
  /** Fire worship, aggressive damage, burn */
  PYROCLAST = 'PYROCLAST',
  /** Void energy, disruption, hand manipulation */
  VOIDBORN = 'VOIDBORN',
  /** Evolution, giant creatures, natural growth */
  BIOTITANS = 'BIOTITANS',
  /** Energy crystals, spell synergy, mana manipulation */
  CRYSTALLINE = 'CRYSTALLINE',
  /** Space pirates, card theft, evasion */
  PHANTOM_CORSAIRS = 'PHANTOM_CORSAIRS',
  /** Insectoid swarm, token generation */
  HIVEMIND = 'HIVEMIND',
  /** Cosmic magic, card draw, deck manipulation */
  ASTROMANCERS = 'ASTROMANCERS',
  /** Time manipulation, recursion, extra actions */
  CHRONOBOUND = 'CHRONOBOUND',
  /** Neutral cards (no race restriction) */
  NEUTRAL = 'NEUTRAL',
}

/**
 * Race metadata including theme and playstyle
 */
export interface RaceInfo {
  race: Race;
  name: string;
  planet: string;
  theme: string;
  playstyle: string;
  winCondition: string;
}

/**
 * Complete race information for all races
 */
export const RaceData: Record<Race, RaceInfo> = {
  [Race.COGSMITHS]: {
    race: Race.COGSMITHS,
    name: 'Cogsmiths',
    planet: 'Mechronis',
    theme: 'Mechanical engineers, artifact synergy',
    playstyle: 'Midrange value generation, snowballing artifact engines',
    winCondition: 'Build board of upgraded Mechs that generate card advantage',
  },
  [Race.LUMINAR]: {
    race: Race.LUMINAR,
    name: 'Luminar',
    planet: 'Solhaven',
    theme: 'Holy light, healing, divine protection',
    playstyle: 'Defensive control with healing synergies',
    winCondition: 'Outlast opponent through healing while building overwhelming board',
  },
  [Race.PYROCLAST]: {
    race: Race.PYROCLAST,
    name: 'Pyroclast',
    planet: 'Ignaros',
    theme: 'Fire worship, aggressive damage, burn',
    playstyle: 'Aggressive face damage and suicide minions',
    winCondition: 'Burn opponent down with direct damage and IMMOLATE triggers',
  },
  [Race.VOIDBORN]: {
    race: Race.VOIDBORN,
    name: 'Voidborn',
    planet: 'Nullheim',
    theme: 'Void energy, disruption, hand manipulation',
    playstyle: 'Disruption control, resource denial',
    winCondition: "Strip opponent's resources and win with attrition",
  },
  [Race.BIOTITANS]: {
    race: Race.BIOTITANS,
    name: 'Biotitans',
    planet: 'Primeva',
    theme: 'Evolution, giant creatures, natural growth',
    playstyle: 'Ramp into massive flexible creatures',
    winCondition: 'Overwhelm with giant adaptive beasts',
  },
  [Race.CRYSTALLINE]: {
    race: Race.CRYSTALLINE,
    name: 'Crystalline',
    planet: 'Prismora',
    theme: 'Energy crystals, spell synergy, mana manipulation',
    playstyle: 'Spell-heavy combo deck',
    winCondition: 'Chain spells for massive damage/value',
  },
  [Race.PHANTOM_CORSAIRS]: {
    race: Race.PHANTOM_CORSAIRS,
    name: 'Phantom Corsairs',
    planet: 'Netherstorm',
    theme: 'Space pirates, card theft, evasion',
    playstyle: 'Tempo-based aggro with card theft',
    winCondition: 'Unblockable PHASE minions + stolen cards',
  },
  [Race.HIVEMIND]: {
    race: Race.HIVEMIND,
    name: 'Hivemind',
    planet: 'Xenoptera',
    theme: 'Insectoid swarm, token generation',
    playstyle: 'Token flood aggro',
    winCondition: 'Overwhelm with exponentially growing swarm',
  },
  [Race.ASTROMANCERS]: {
    race: Race.ASTROMANCERS,
    name: 'Astromancers',
    planet: 'Celestara',
    theme: 'Cosmic magic, card draw, deck manipulation',
    playstyle: 'Draw/combo control',
    winCondition: 'Draw entire deck, assemble combo',
  },
  [Race.CHRONOBOUND]: {
    race: Race.CHRONOBOUND,
    name: 'Chronobound',
    planet: 'Temporia',
    theme: 'Time manipulation, recursion, extra actions',
    playstyle: 'Tempo/combo with replay effects',
    winCondition: 'Explosive ECHO turns or extra turn combos',
  },
  [Race.NEUTRAL]: {
    race: Race.NEUTRAL,
    name: 'Neutral',
    planet: 'Various',
    theme: 'Universal cards available to all races',
    playstyle: 'Support any strategy',
    winCondition: 'Depends on deck construction',
  },
};

/**
 * Check if a race has access to a card
 * A race can use cards from their own race + neutral cards
 */
export function canUseCard(playerRace: Race, cardRace: Race | undefined): boolean {
  if (cardRace === undefined || cardRace === Race.NEUTRAL) {
    return true; // Neutral cards available to all
  }
  return playerRace === cardRace;
}

/**
 * MVP Races (Phase 1 implementation)
 */
export const MVPRaces: Race[] = [
  Race.COGSMITHS,
  Race.LUMINAR,
  Race.PYROCLAST,
  Race.VOIDBORN,
  Race.BIOTITANS,
  Race.PHANTOM_CORSAIRS,
  Race.CRYSTALLINE,
  Race.HIVEMIND,
];

/**
 * Phase 2 Races (Alpha implementation)
 */
export const Phase2Races: Race[] = [
  Race.VOIDBORN,
  Race.PHANTOM_CORSAIRS,
  Race.HIVEMIND,
  Race.ASTROMANCERS,
  Race.CHRONOBOUND,
];

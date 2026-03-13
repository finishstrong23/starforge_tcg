/**
 * STARFORGE TCG - Balanced Starter Decks
 *
 * Now uses the v2 curated starter decks from SampleCards.ts,
 * which are the 25-card starter decks designed per faction.
 */

import type { CardDefinition } from '../types/Card';
import { Race } from '../types/Race';
import {
  STARTER_DECK_COGSMITHS,
  STARTER_DECK_LUMINAR,
  STARTER_DECK_PYROCLAST,
  STARTER_DECK_VOIDBORN,
  STARTER_DECK_BIOTITANS,
  STARTER_DECK_CRYSTALLINE,
  STARTER_DECK_PHANTOM_CORSAIRS,
  STARTER_DECK_HIVEMIND,
  STARTER_DECK_ASTROMANCERS,
  STARTER_DECK_CHRONOBOUND,
} from './SampleCards';

// Re-export v2 starter decks as balanced starters
export const BALANCED_STARTER_COGSMITHS = STARTER_DECK_COGSMITHS;
export const BALANCED_STARTER_LUMINAR = STARTER_DECK_LUMINAR;
export const BALANCED_STARTER_PYROCLAST = STARTER_DECK_PYROCLAST;
export const BALANCED_STARTER_VOIDBORN = STARTER_DECK_VOIDBORN;
export const BALANCED_STARTER_BIOTITANS = STARTER_DECK_BIOTITANS;
export const BALANCED_STARTER_CRYSTALLINE = STARTER_DECK_CRYSTALLINE;
export const BALANCED_STARTER_PHANTOM_CORSAIRS = STARTER_DECK_PHANTOM_CORSAIRS;
export const BALANCED_STARTER_HIVEMIND = STARTER_DECK_HIVEMIND;
export const BALANCED_STARTER_ASTROMANCERS = STARTER_DECK_ASTROMANCERS;
export const BALANCED_STARTER_CHRONOBOUND = STARTER_DECK_CHRONOBOUND;

// ============================================================================
// Helper: Get balanced starter deck by race
// ============================================================================
export function getBalancedStarterDeck(race: Race): CardDefinition[] {
  switch (race) {
    case Race.COGSMITHS: return BALANCED_STARTER_COGSMITHS;
    case Race.LUMINAR: return BALANCED_STARTER_LUMINAR;
    case Race.PYROCLAST: return BALANCED_STARTER_PYROCLAST;
    case Race.VOIDBORN: return BALANCED_STARTER_VOIDBORN;
    case Race.BIOTITANS: return BALANCED_STARTER_BIOTITANS;
    case Race.CRYSTALLINE: return BALANCED_STARTER_CRYSTALLINE;
    case Race.PHANTOM_CORSAIRS: return BALANCED_STARTER_PHANTOM_CORSAIRS;
    case Race.HIVEMIND: return BALANCED_STARTER_HIVEMIND;
    case Race.ASTROMANCERS: return BALANCED_STARTER_ASTROMANCERS;
    case Race.CHRONOBOUND: return BALANCED_STARTER_CHRONOBOUND;
    default: return [];
  }
}

// ============================================================================
// All balanced decks map
// ============================================================================
export const BALANCED_STARTER_DECKS: Record<string, CardDefinition[]> = {
  COGSMITHS: BALANCED_STARTER_COGSMITHS,
  LUMINAR: BALANCED_STARTER_LUMINAR,
  PYROCLAST: BALANCED_STARTER_PYROCLAST,
  VOIDBORN: BALANCED_STARTER_VOIDBORN,
  BIOTITANS: BALANCED_STARTER_BIOTITANS,
  CRYSTALLINE: BALANCED_STARTER_CRYSTALLINE,
  PHANTOM_CORSAIRS: BALANCED_STARTER_PHANTOM_CORSAIRS,
  HIVEMIND: BALANCED_STARTER_HIVEMIND,
  ASTROMANCERS: BALANCED_STARTER_ASTROMANCERS,
  CHRONOBOUND: BALANCED_STARTER_CHRONOBOUND,
};

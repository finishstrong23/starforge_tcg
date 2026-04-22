/**
 * STARFORGE TCG - Balanced Starter Decks
 *
 * Launch factions: Pyroclast, Cogsmiths, Luminar, Warp Riders
 * Each deck is 25 cards with legendaries.
 */

import type { CardDefinition } from '../types/Card';
import { Race } from '../types/Race';
import {
  STARTER_DECK_COGSMITHS,
  STARTER_DECK_LUMINAR,
  STARTER_DECK_PYROCLAST,
  STARTER_DECK_WARP_RIDERS,
} from './SampleCards';

// Re-export v2 starter decks as balanced starters
export const BALANCED_STARTER_COGSMITHS = STARTER_DECK_COGSMITHS;
export const BALANCED_STARTER_LUMINAR = STARTER_DECK_LUMINAR;
export const BALANCED_STARTER_PYROCLAST = STARTER_DECK_PYROCLAST;
export const BALANCED_STARTER_WARP_RIDERS = STARTER_DECK_WARP_RIDERS;

// Stub exports for removed factions (empty arrays) to avoid breaking imports
export const BALANCED_STARTER_VOIDBORN: CardDefinition[] = [];
export const BALANCED_STARTER_BIOTITANS: CardDefinition[] = [];
export const BALANCED_STARTER_CRYSTALLINE: CardDefinition[] = [];
export const BALANCED_STARTER_HIVEMIND: CardDefinition[] = [];
export const BALANCED_STARTER_ASTROMANCERS: CardDefinition[] = [];
export const BALANCED_STARTER_CHRONOBOUND: CardDefinition[] = [];

// ============================================================================
// Helper: Get balanced starter deck by race
// ============================================================================
export function getBalancedStarterDeck(race: Race): CardDefinition[] {
  switch (race) {
    case Race.COGSMITHS: return BALANCED_STARTER_COGSMITHS;
    case Race.LUMINAR: return BALANCED_STARTER_LUMINAR;
    case Race.PYROCLAST: return BALANCED_STARTER_PYROCLAST;
    case Race.WARP_RIDERS: return BALANCED_STARTER_WARP_RIDERS;
    default: return BALANCED_STARTER_PYROCLAST;
  }
}

// ============================================================================
// All balanced decks map
// ============================================================================
export const BALANCED_STARTER_DECKS: Record<string, CardDefinition[]> = {
  COGSMITHS: BALANCED_STARTER_COGSMITHS,
  LUMINAR: BALANCED_STARTER_LUMINAR,
  PYROCLAST: BALANCED_STARTER_PYROCLAST,
  WARP_RIDERS: BALANCED_STARTER_WARP_RIDERS,
};

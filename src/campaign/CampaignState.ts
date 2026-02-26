/**
 * STARFORGE TCG - Campaign State & Persistence
 *
 * Manages campaign progress with localStorage persistence.
 * Tracks: home planet, unlocked planets, battle stats, lore discovered.
 */

import { Race } from '../types/Race';
import { getCampaignEncounters } from './CampaignData';

const STORAGE_KEY = 'starforge_campaign';

/**
 * Stats for a single planet encounter
 */
export interface PlanetStats {
  /** Number of times player fought this planet */
  attempts: number;
  /** Number of victories */
  wins: number;
  /** Best remaining health on victory */
  bestHealthRemaining: number;
  /** Fastest win (fewest turns) */
  fastestWin: number;
  /** Has the player seen the lore? */
  loreRevealed: boolean;
}

/**
 * The full campaign save state
 */
export interface CampaignSave {
  /** Player's chosen home planet */
  homeRace: Race;
  /** Races the player has unlocked (always includes home) */
  unlockedRaces: Race[];
  /** Per-planet battle statistics */
  planetStats: Partial<Record<Race, PlanetStats>>;
  /** Total games played across all campaign battles */
  totalGamesPlayed: number;
  /** Total campaign victories */
  totalWins: number;
  /** Current encounter index in the campaign (which planet they're up to) */
  currentEncounterIndex: number;
  /** Timestamp of campaign start */
  startedAt: number;
  /** Timestamp of last activity */
  lastPlayedAt: number;
}

/**
 * Create a fresh campaign save for a given home race
 */
export function createNewCampaign(homeRace: Race): CampaignSave {
  return {
    homeRace,
    unlockedRaces: [homeRace],
    planetStats: {},
    totalGamesPlayed: 0,
    totalWins: 0,
    currentEncounterIndex: 0,
    startedAt: Date.now(),
    lastPlayedAt: Date.now(),
  };
}

/**
 * Load campaign from localStorage, or null if none exists
 */
export function loadCampaign(): CampaignSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CampaignSave;
    // Basic validation
    if (!parsed.homeRace || !parsed.unlockedRaces) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save campaign to localStorage
 */
export function saveCampaign(state: CampaignSave): void {
  try {
    state.lastPlayedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable
    console.warn('Failed to save campaign progress');
  }
}

/**
 * Delete campaign save
 */
export function deleteCampaign(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Record the result of a campaign battle.
 * Returns updated save state.
 */
export function recordBattleResult(
  save: CampaignSave,
  opponentRace: Race,
  won: boolean,
  playerHealthRemaining: number,
  turnCount: number,
): CampaignSave {
  const updated = { ...save };
  updated.totalGamesPlayed++;
  if (won) updated.totalWins++;

  // Update planet stats
  const existing = updated.planetStats[opponentRace] || {
    attempts: 0,
    wins: 0,
    bestHealthRemaining: 0,
    fastestWin: Infinity,
    loreRevealed: false,
  };

  existing.attempts++;
  // Lore revealed on first encounter, win or loss
  existing.loreRevealed = true;

  if (won) {
    existing.wins++;
    if (playerHealthRemaining > existing.bestHealthRemaining) {
      existing.bestHealthRemaining = playerHealthRemaining;
    }
    if (turnCount < existing.fastestWin) {
      existing.fastestWin = turnCount;
    }

    // Unlock the defeated race
    if (!updated.unlockedRaces.includes(opponentRace)) {
      updated.unlockedRaces.push(opponentRace);
    }

    // Advance to next encounter
    const encounters = getCampaignEncounters(updated.homeRace);
    if (updated.currentEncounterIndex < encounters.length - 1) {
      // Only advance if this was the current encounter's race
      const currentEncounter = encounters[updated.currentEncounterIndex];
      if (currentEncounter.race === opponentRace) {
        updated.currentEncounterIndex++;
      }
    }
  }

  updated.planetStats[opponentRace] = existing;
  saveCampaign(updated);
  return updated;
}

/**
 * Get the next encounter the player should face
 */
export function getNextEncounter(save: CampaignSave) {
  const encounters = getCampaignEncounters(save.homeRace);
  if (save.currentEncounterIndex >= encounters.length) return null;
  return encounters[save.currentEncounterIndex];
}

/**
 * Check if the campaign is complete (all planets conquered)
 */
export function isCampaignComplete(save: CampaignSave): boolean {
  const encounters = getCampaignEncounters(save.homeRace);
  return save.currentEncounterIndex >= encounters.length;
}

/**
 * Get completion percentage
 */
export function getCampaignProgress(save: CampaignSave): number {
  const encounters = getCampaignEncounters(save.homeRace);
  if (encounters.length === 0) return 100;
  return Math.round((save.currentEncounterIndex / encounters.length) * 100);
}

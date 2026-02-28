/**
 * STARFORGE TCG - Campaign State & Persistence
 *
 * Manages campaign progress with localStorage persistence.
 * Tracks: home planet, unlocked planets, battle stats, lore discovered.
 */

import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';
import { getCampaignEncounters, PLANET_ENCOUNTERS } from './CampaignData';

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
 * Reward granted after a battle
 */
export interface BattleReward {
  gold: number;
  cardIds: string[];
  firstWinBonus: boolean;
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
  /** Gold currency earned from battles */
  gold: number;
  /** Card IDs the player has earned from rewards */
  earnedCardIds: string[];
  /** Number of card packs opened */
  packsOpened: number;
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
    gold: 0,
    earnedCardIds: [],
    packsOpened: 0,
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

  // Ensure gold/earnedCardIds exist (backwards compatibility)
  if (updated.gold === undefined) updated.gold = 0;
  if (!updated.earnedCardIds) updated.earnedCardIds = [];
  if (updated.packsOpened === undefined) updated.packsOpened = 0;

  saveCampaign(updated);
  return updated;
}

/**
 * Calculate battle rewards based on outcome
 */
export function calculateBattleReward(
  save: CampaignSave,
  opponentRace: Race,
  won: boolean,
  playerHealthRemaining: number,
  turnCount: number,
): BattleReward {
  if (!won) {
    // Small consolation gold for losses
    return { gold: 5, cardIds: [], firstWinBonus: false };
  }

  const encounter = PLANET_ENCOUNTERS[opponentRace];
  const difficultyMultiplier = encounter.difficulty === AIDifficulty.HARD ? 2.0
    : encounter.difficulty === AIDifficulty.MEDIUM ? 1.5 : 1.0;

  // Base gold reward
  let gold = Math.round(25 * difficultyMultiplier);

  // Performance bonuses
  if (playerHealthRemaining >= 20) gold += 10; // healthy win
  if (turnCount <= 8) gold += 15; // fast win

  // First win bonus
  const stats = save.planetStats[opponentRace];
  const isFirstWin = !stats || stats.wins === 0;
  if (isFirstWin) gold += 50;

  // Card reward: earn 1-2 random cards from defeated race's expansion pool
  const cardIds: string[] = [];
  const numCards = isFirstWin ? 2 : (Math.random() < 0.4 ? 1 : 0);
  if (numCards > 0) {
    // Generate deterministic but varied card IDs for the opponent race
    const racePrefix = getRacePrefix(opponentRace);
    if (racePrefix) {
      for (let i = 0; i < numCards; i++) {
        // Pick expansion cards: exp_{prefix}_r1 through exp_{prefix}_r5 (rares)
        const cardNum = Math.floor(Math.random() * 5) + 1;
        const cardId = `exp_${racePrefix}_r${cardNum}`;
        if (!save.earnedCardIds?.includes(cardId)) {
          cardIds.push(cardId);
        }
      }
    }
  }

  return { gold, cardIds, firstWinBonus: isFirstWin };
}

function getRacePrefix(race: Race): string | null {
  const prefixes: Partial<Record<Race, string>> = {
    [Race.COGSMITHS]: 'cog',
    [Race.LUMINAR]: 'lum',
    [Race.PYROCLAST]: 'pyro',
    [Race.VOIDBORN]: 'void',
    [Race.BIOTITANS]: 'bio',
    [Race.CRYSTALLINE]: 'crys',
    [Race.PHANTOM_CORSAIRS]: 'pc',
    [Race.HIVEMIND]: 'hive',
    [Race.ASTROMANCERS]: 'astro',
    [Race.CHRONOBOUND]: 'chrono',
  };
  return prefixes[race] || null;
}

/**
 * Apply rewards to campaign save
 */
export function applyRewards(save: CampaignSave, reward: BattleReward): CampaignSave {
  const updated = { ...save };
  if (updated.gold === undefined) updated.gold = 0;
  if (!updated.earnedCardIds) updated.earnedCardIds = [];

  updated.gold += reward.gold;
  for (const id of reward.cardIds) {
    if (!updated.earnedCardIds.includes(id)) {
      updated.earnedCardIds.push(id);
    }
  }
  saveCampaign(updated);
  return updated;
}

/**
 * Open a card pack (costs 100 gold, grants 3 random expansion cards)
 */
export function openCardPack(save: CampaignSave): { save: CampaignSave; newCards: string[] } | null {
  const PACK_COST = 100;
  if ((save.gold || 0) < PACK_COST) return null;

  const updated = { ...save };
  updated.gold = (updated.gold || 0) - PACK_COST;
  if (!updated.earnedCardIds) updated.earnedCardIds = [];
  updated.packsOpened = (updated.packsOpened || 0) + 1;

  const newCards: string[] = [];
  const racePrefixes = ['cog', 'lum', 'pyro', 'void', 'bio', 'crys', 'pc', 'hive', 'astro', 'chrono'];

  for (let i = 0; i < 3; i++) {
    const prefix = racePrefixes[Math.floor(Math.random() * racePrefixes.length)];
    // Mix of rares (r1-r5) and epics (e1-e3)
    const isEpic = Math.random() < 0.3;
    const num = isEpic
      ? Math.floor(Math.random() * 3) + 1
      : Math.floor(Math.random() * 5) + 1;
    const cardId = `exp_${prefix}_${isEpic ? 'e' : 'r'}${num}`;
    if (!updated.earnedCardIds.includes(cardId)) {
      updated.earnedCardIds.push(cardId);
    }
    newCards.push(cardId);
  }

  saveCampaign(updated);
  return { save: updated, newCards };
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

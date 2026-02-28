/**
 * STARFORGE TCG - PvP Rating & Match History
 *
 * Tracks local ELO rating and PvP match history.
 * Since the game uses P2P with no central server,
 * ratings are calculated locally (honor system).
 */

import { Race } from '../types/Race';

const PVP_KEY = 'starforge_pvp';

export interface PvPMatch {
  id: string;
  playerRace: Race;
  opponentRace: Race;
  won: boolean;
  turnCount: number;
  ratingChange: number;
  ratingAfter: number;
  timestamp: number;
}

export interface PvPProfile {
  /** Current ELO rating (starts at 1000) */
  rating: number;
  /** Peak ELO ever achieved */
  peakRating: number;
  /** Total PvP games */
  totalGames: number;
  /** PvP wins */
  wins: number;
  /** PvP losses */
  losses: number;
  /** Current streak (positive = wins, negative = losses) */
  streak: number;
  /** Best win streak */
  bestWinStreak: number;
  /** Match history (most recent 50) */
  matchHistory: PvPMatch[];
}

const DEFAULT_RATING = 1000;
const K_FACTOR = 32;
const MAX_HISTORY = 50;

function createDefaultProfile(): PvPProfile {
  return {
    rating: DEFAULT_RATING,
    peakRating: DEFAULT_RATING,
    totalGames: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestWinStreak: 0,
    matchHistory: [],
  };
}

export function loadPvPProfile(): PvPProfile {
  try {
    const raw = localStorage.getItem(PVP_KEY);
    if (!raw) return createDefaultProfile();
    return { ...createDefaultProfile(), ...JSON.parse(raw) };
  } catch {
    return createDefaultProfile();
  }
}

function savePvPProfile(profile: PvPProfile): void {
  try {
    localStorage.setItem(PVP_KEY, JSON.stringify(profile));
  } catch {
    console.warn('Failed to save PvP profile');
  }
}

/**
 * Calculate ELO rating change.
 * Since we don't know the opponent's actual rating,
 * we assume they're at the same rating level.
 */
function calculateEloChange(myRating: number, won: boolean, opponentRating = DEFAULT_RATING): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
  const actual = won ? 1 : 0;
  return Math.round(K_FACTOR * (actual - expected));
}

/**
 * Record a PvP match result
 */
export function recordPvPMatch(
  playerRace: Race,
  opponentRace: Race,
  won: boolean,
  turnCount: number,
): PvPProfile {
  const profile = loadPvPProfile();

  const ratingChange = calculateEloChange(profile.rating, won);
  const newRating = Math.max(100, profile.rating + ratingChange);

  profile.rating = newRating;
  if (newRating > profile.peakRating) profile.peakRating = newRating;
  profile.totalGames++;

  if (won) {
    profile.wins++;
    profile.streak = profile.streak > 0 ? profile.streak + 1 : 1;
    if (profile.streak > profile.bestWinStreak) {
      profile.bestWinStreak = profile.streak;
    }
  } else {
    profile.losses++;
    profile.streak = profile.streak < 0 ? profile.streak - 1 : -1;
  }

  const match: PvPMatch = {
    id: `pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerRace,
    opponentRace,
    won,
    turnCount,
    ratingChange,
    ratingAfter: newRating,
    timestamp: Date.now(),
  };

  profile.matchHistory.unshift(match);
  if (profile.matchHistory.length > MAX_HISTORY) {
    profile.matchHistory = profile.matchHistory.slice(0, MAX_HISTORY);
  }

  savePvPProfile(profile);
  return profile;
}

/**
 * Get rank title based on rating
 */
export function getRankTitle(rating: number): { title: string; color: string } {
  if (rating >= 1800) return { title: 'Starforger', color: '#ff8800' };
  if (rating >= 1600) return { title: 'Admiral', color: '#ff44ff' };
  if (rating >= 1400) return { title: 'Commander', color: '#00ccff' };
  if (rating >= 1200) return { title: 'Captain', color: '#00ff88' };
  if (rating >= 1000) return { title: 'Pilot', color: '#ffffff' };
  if (rating >= 800) return { title: 'Cadet', color: '#aaaaaa' };
  return { title: 'Recruit', color: '#666666' };
}

export function resetPvPProfile(): void {
  try {
    localStorage.removeItem(PVP_KEY);
  } catch {
    // ignore
  }
}

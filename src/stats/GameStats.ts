/**
 * STARFORGE TCG - Game Statistics
 *
 * Tracks win/loss records per race, streaks, and global stats.
 * Persists to localStorage, separate from campaign progress.
 */

import { Race } from '../types/Race';

const STATS_KEY = 'starforge_stats';

export interface RaceRecord {
  /** Games played with this race */
  gamesPlayed: number;
  /** Wins with this race */
  wins: number;
  /** Losses with this race */
  losses: number;
  /** Current win streak */
  currentStreak: number;
  /** Best win streak ever */
  bestStreak: number;
  /** Games played against this race */
  gamesAgainst: number;
  /** Wins against this race */
  winsAgainst: number;
}

export interface GlobalStats {
  /** Total games played across all modes */
  totalGames: number;
  /** Total wins */
  totalWins: number;
  /** Total losses */
  totalLosses: number;
  /** Current overall win streak */
  currentStreak: number;
  /** Best overall win streak */
  bestStreak: number;
  /** Fastest win in turns */
  fastestWin: number;
  /** Total turns played */
  totalTurns: number;
  /** Per-race records (as player) */
  raceRecords: Partial<Record<Race, RaceRecord>>;
  /** Per-race records (as opponent) */
  opponentRecords: Partial<Record<Race, RaceRecord>>;
  /** First game timestamp */
  firstGameAt: number;
  /** Last game timestamp */
  lastGameAt: number;
  /** Quick play games */
  quickPlayGames: number;
  /** Campaign games */
  campaignGames: number;
  /** PvP games */
  pvpGames: number;
}

function createEmptyStats(): GlobalStats {
  return {
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    currentStreak: 0,
    bestStreak: 0,
    fastestWin: Infinity,
    totalTurns: 0,
    raceRecords: {},
    opponentRecords: {},
    firstGameAt: 0,
    lastGameAt: 0,
    quickPlayGames: 0,
    campaignGames: 0,
    pvpGames: 0,
  };
}

function createEmptyRaceRecord(): RaceRecord {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    gamesAgainst: 0,
    winsAgainst: 0,
  };
}

export function loadStats(): GlobalStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return createEmptyStats();
    const parsed = JSON.parse(raw) as GlobalStats;
    // Ensure all fields exist (backwards compatibility)
    return { ...createEmptyStats(), ...parsed };
  } catch {
    return createEmptyStats();
  }
}

export function saveStats(stats: GlobalStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    console.warn('Failed to save game stats');
  }
}

export function resetStats(): void {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch {
    // ignore
  }
}

export type GameMode = 'quickplay' | 'campaign' | 'pvp';

export function recordGameResult(
  playerRace: Race,
  opponentRace: Race,
  won: boolean,
  turnCount: number,
  mode: GameMode,
): GlobalStats {
  const stats = loadStats();
  const now = Date.now();

  // Global counts
  stats.totalGames++;
  if (won) {
    stats.totalWins++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.totalLosses++;
    stats.currentStreak = 0;
  }

  stats.totalTurns += turnCount;
  if (won && turnCount < stats.fastestWin) {
    stats.fastestWin = turnCount;
  }

  if (!stats.firstGameAt) stats.firstGameAt = now;
  stats.lastGameAt = now;

  // Mode counts
  if (mode === 'quickplay') stats.quickPlayGames++;
  else if (mode === 'campaign') stats.campaignGames++;
  else if (mode === 'pvp') stats.pvpGames++;

  // Per-race record (as player)
  const raceRec = stats.raceRecords[playerRace] || createEmptyRaceRecord();
  raceRec.gamesPlayed++;
  if (won) {
    raceRec.wins++;
    raceRec.currentStreak++;
    if (raceRec.currentStreak > raceRec.bestStreak) {
      raceRec.bestStreak = raceRec.currentStreak;
    }
  } else {
    raceRec.losses++;
    raceRec.currentStreak = 0;
  }
  stats.raceRecords[playerRace] = raceRec;

  // Per-race opponent record
  const oppRec = stats.opponentRecords[opponentRace] || createEmptyRaceRecord();
  oppRec.gamesAgainst++;
  if (won) oppRec.winsAgainst++;
  stats.opponentRecords[opponentRace] = oppRec;

  saveStats(stats);
  return stats;
}

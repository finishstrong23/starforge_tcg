/**
 * STARFORGE TCG - Puzzle Mode State & Persistence
 *
 * Tracks which puzzles have been solved, solve times, hints used.
 */

import type { PuzzleTier } from './PuzzleData';
import { PUZZLES, TIER_INFO } from './PuzzleData';

const STORAGE_KEY = 'starforge_puzzles';

export interface PuzzleSolveRecord {
  puzzleId: string;
  solved: boolean;
  solveTimeMs: number;
  hintsUsed: number;
  attempts: number;
  solvedAt?: number;
}

export interface PuzzleSaveData {
  records: Record<string, PuzzleSolveRecord>;
  totalSolved: number;
  totalAttempts: number;
  totalHintsUsed: number;
  stardustEarned: number;
}

/**
 * Load puzzle progress
 */
export function loadPuzzleData(): PuzzleSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    return JSON.parse(raw);
  } catch {
    return createEmptyData();
  }
}

/**
 * Save puzzle progress
 */
export function savePuzzleData(data: PuzzleSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save puzzle progress');
  }
}

function createEmptyData(): PuzzleSaveData {
  return {
    records: {},
    totalSolved: 0,
    totalAttempts: 0,
    totalHintsUsed: 0,
    stardustEarned: 0,
  };
}

/**
 * Record a puzzle attempt
 */
export function recordPuzzleAttempt(
  puzzleId: string,
  solved: boolean,
  timeMs: number,
  hintsUsed: number,
): PuzzleSaveData {
  const data = loadPuzzleData();
  const existing = data.records[puzzleId] || {
    puzzleId,
    solved: false,
    solveTimeMs: 0,
    hintsUsed: 0,
    attempts: 0,
  };

  existing.attempts++;
  data.totalAttempts++;

  if (solved && !existing.solved) {
    existing.solved = true;
    existing.solveTimeMs = timeMs;
    existing.hintsUsed = hintsUsed;
    existing.solvedAt = Date.now();
    data.totalSolved++;
    data.totalHintsUsed += hintsUsed;

    // Award stardust
    const puzzle = PUZZLES.find(p => p.id === puzzleId);
    if (puzzle) {
      const reward = TIER_INFO[puzzle.tier].stardustReward;
      data.stardustEarned += reward;
    }
  }

  data.records[puzzleId] = existing;
  savePuzzleData(data);
  return data;
}

/**
 * Check if a specific puzzle has been solved
 */
export function isPuzzleSolved(puzzleId: string): boolean {
  const data = loadPuzzleData();
  return data.records[puzzleId]?.solved ?? false;
}

/**
 * Get tier completion stats
 */
export function getTierCompletion(tier: PuzzleTier): {
  total: number;
  solved: number;
  percentage: number;
} {
  const data = loadPuzzleData();
  const tierPuzzles = PUZZLES.filter(p => p.tier === tier);
  const solved = tierPuzzles.filter(p => data.records[p.id]?.solved).length;
  return {
    total: tierPuzzles.length,
    solved,
    percentage: tierPuzzles.length > 0 ? Math.round((solved / tierPuzzles.length) * 100) : 0,
  };
}

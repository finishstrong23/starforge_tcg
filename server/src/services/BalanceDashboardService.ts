/**
 * STARFORGE TCG - Balance Dashboard Service
 *
 * Automated balance tracking: win rates, play rates, card performance.
 * Supports hot-fix capable nerf/buff pipeline without app updates.
 */

import { query } from '../config/database';

export interface FactionStats {
  race: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  playRate: number;
  avgGameLength: number;
  mirrorMatchRate: number;
}

export interface CardStats {
  cardId: string;
  cardName: string;
  race: string;
  rarity: string;
  playRate: number;
  winRate: number;
  avgTurnPlayed: number;
  pickRate: number; // In draft mode
}

export interface BalancePatch {
  id: string;
  version: string;
  type: 'hotfix' | 'micro' | 'major';
  changes: CardChange[];
  appliedAt: Date;
  revertableUntil: Date; // Full dust refund window
}

export interface CardChange {
  cardId: string;
  cardName: string;
  changeType: 'nerf' | 'buff' | 'rework';
  field: string;
  oldValue: number | string;
  newValue: number | string;
  reason: string;
}

// Active balance overrides (hot-patched without app update)
const balanceOverrides: Map<string, Record<string, unknown>> = new Map();

// Patch history
const patchHistory: BalancePatch[] = [];

/**
 * Get faction win rates and play rates.
 */
export async function getFactionStats(seasonId?: string): Promise<FactionStats[]> {
  try {
    const result = await query(
      `SELECT
        p1_race as race,
        COUNT(*) as games_played,
        SUM(CASE WHEN winner_id = p1_id THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner_id != p1_id AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses,
        AVG(turn_count) as avg_game_length
       FROM game_results
       WHERE ($1::text IS NULL OR season_id = $1)
         AND completed_at > NOW() - INTERVAL '30 days'
       GROUP BY p1_race
       ORDER BY games_played DESC`,
      [seasonId || null]
    );

    const totalGames = result.rows.reduce((sum: number, r: Record<string, unknown>) => sum + parseInt(r.games_played as string), 0);

    return result.rows.map((row: Record<string, unknown>) => {
      const gamesPlayed = parseInt(row.games_played as string);
      const wins = parseInt(row.wins as string);
      const losses = parseInt(row.losses as string);
      return {
        race: row.race as string,
        gamesPlayed,
        wins,
        losses,
        winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
        playRate: totalGames > 0 ? gamesPlayed / totalGames : 0,
        avgGameLength: parseFloat(row.avg_game_length as string) || 0,
        mirrorMatchRate: 0, // Calculated separately
      };
    });
  } catch {
    // Return mock data if DB not available
    const races = ['pyroclast', 'voidborn', 'cogsmiths', 'luminar', 'biotitans',
                   'crystalline', 'phantom_corsairs', 'hivemind', 'astromancers', 'chronobound'];
    return races.map(race => ({
      race,
      gamesPlayed: Math.floor(Math.random() * 5000) + 1000,
      wins: 0, losses: 0,
      winRate: 0.45 + Math.random() * 0.10,
      playRate: 0.10,
      avgGameLength: 7 + Math.random() * 4,
      mirrorMatchRate: 0.05 + Math.random() * 0.05,
    }));
  }
}

/**
 * Get card-level performance stats.
 */
export async function getCardStats(filters?: {
  race?: string;
  rarity?: string;
  minGames?: number;
}): Promise<CardStats[]> {
  try {
    const result = await query(
      `SELECT
        card_id, card_name, race, rarity,
        play_count, win_count, total_games,
        AVG(turn_played) as avg_turn
       FROM card_performance
       WHERE ($1::text IS NULL OR race = $1)
         AND ($2::text IS NULL OR rarity = $2)
         AND total_games >= $3
       GROUP BY card_id, card_name, race, rarity, play_count, win_count, total_games
       ORDER BY play_count DESC
       LIMIT 200`,
      [filters?.race || null, filters?.rarity || null, filters?.minGames || 50]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      cardId: row.card_id as string,
      cardName: row.card_name as string,
      race: row.race as string,
      rarity: row.rarity as string,
      playRate: (row.play_count as number) / Math.max(row.total_games as number, 1),
      winRate: (row.win_count as number) / Math.max(row.play_count as number, 1),
      avgTurnPlayed: parseFloat(row.avg_turn as string) || 0,
      pickRate: 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Apply a balance override (hot-fix without app update).
 * Clients fetch overrides on game start.
 */
export function applyBalanceOverride(
  cardId: string,
  changes: Record<string, unknown>,
  reason: string,
): void {
  balanceOverrides.set(cardId, { ...changes, _reason: reason, _appliedAt: new Date() });
}

/**
 * Remove a balance override.
 */
export function removeBalanceOverride(cardId: string): void {
  balanceOverrides.delete(cardId);
}

/**
 * Get all active balance overrides (clients call this on game start).
 */
export function getActiveOverrides(): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [cardId, changes] of balanceOverrides) {
    result[cardId] = changes;
  }
  return result;
}

/**
 * Create and record a balance patch.
 */
export function createPatch(
  version: string,
  type: 'hotfix' | 'micro' | 'major',
  changes: CardChange[],
): BalancePatch {
  const patch: BalancePatch = {
    id: `patch_${Date.now()}`,
    version,
    type,
    changes,
    appliedAt: new Date(),
    revertableUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day refund window
  };

  patchHistory.push(patch);

  // Apply as overrides
  for (const change of changes) {
    const existing = balanceOverrides.get(change.cardId) || {};
    existing[change.field] = change.newValue;
    existing._patchVersion = version;
    balanceOverrides.set(change.cardId, existing);
  }

  return patch;
}

/**
 * Get patch history.
 */
export function getPatchHistory(): BalancePatch[] {
  return [...patchHistory].reverse();
}

/**
 * Get cards eligible for full dust refund (nerfed within 14 days).
 */
export function getRefundableCards(): { cardId: string; cardName: string; until: Date }[] {
  const now = new Date();
  const refundable: { cardId: string; cardName: string; until: Date }[] = [];

  for (const patch of patchHistory) {
    if (patch.revertableUntil > now) {
      for (const change of patch.changes) {
        if (change.changeType === 'nerf') {
          refundable.push({
            cardId: change.cardId,
            cardName: change.cardName,
            until: patch.revertableUntil,
          });
        }
      }
    }
  }

  return refundable;
}

/**
 * Get matchup data (faction vs faction win rates).
 */
export async function getMatchupMatrix(): Promise<Record<string, Record<string, number>>> {
  const races = ['pyroclast', 'voidborn', 'cogsmiths', 'luminar', 'biotitans',
                 'crystalline', 'phantom_corsairs', 'hivemind', 'astromancers', 'chronobound'];
  const matrix: Record<string, Record<string, number>> = {};

  for (const race of races) {
    matrix[race] = {};
    for (const opp of races) {
      // Simulated balanced data (in production, query DB)
      matrix[race][opp] = race === opp ? 0.50 : 0.45 + Math.random() * 0.10;
    }
  }

  return matrix;
}

/**
 * Get balance summary for the current meta.
 */
export async function getBalanceSummary(): Promise<{
  healthScore: number; // 0-100, higher is more balanced
  outliers: { race: string; winRate: number; deviation: number }[];
  recommendation: string;
}> {
  const stats = await getFactionStats();
  const winRates = stats.map(s => s.winRate);
  const mean = winRates.reduce((a, b) => a + b, 0) / winRates.length;
  const variance = winRates.reduce((sum, wr) => sum + Math.pow(wr - mean, 2), 0) / winRates.length;
  const stdDev = Math.sqrt(variance);

  // Health score: 100 = perfectly balanced, lower = more imbalanced
  const healthScore = Math.max(0, Math.min(100, 100 - (stdDev * 500)));

  const outliers = stats
    .filter(s => Math.abs(s.winRate - mean) > stdDev)
    .map(s => ({
      race: s.race,
      winRate: s.winRate,
      deviation: s.winRate - mean,
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

  let recommendation = 'Meta is healthy. No immediate action needed.';
  if (healthScore < 70) {
    recommendation = `Meta imbalanced. Consider adjusting: ${outliers.map(o =>
      `${o.race} (${o.deviation > 0 ? 'too strong' : 'too weak'}: ${(o.winRate * 100).toFixed(1)}% WR)`
    ).join(', ')}`;
  }

  return { healthScore, outliers, recommendation };
}

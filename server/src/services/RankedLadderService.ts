import { query, withTransaction } from '../config/database';
import { RankTier } from '../models/Player';

/**
 * StarForge TCG - Ranked Ladder Service
 *
 * Handles rank progression, MMR, seasons, and leaderboards.
 *
 * Ladder structure:
 *   Bronze  10→1  (3 stars/div, rank floor at div 5)
 *   Silver  10→1  (3 stars/div, rank floor at div 10 and 5)
 *   Gold    10→1  (3 stars/div, rank floor at div 10 and 5)
 *   Diamond 10→1  (3 stars/div, rank floor at div 10 and 5)
 *   Master   5→1  (4 stars/div, rank floor at entry)
 *   Legend          (MMR-based, no stars)
 *
 * Win streaks (3+ consecutive wins) give a bonus star in Bronze/Silver/Gold.
 */

// ── Tier ordering & configuration ──────────────────────────────────

const TIER_ORDER: RankTier[] = ['bronze', 'silver', 'gold', 'diamond', 'master', 'legend'];

interface TierConfig {
  maxDivision: number;      // highest numbered division (lowest rank within tier)
  starsPerDivision: number; // stars needed to advance one division
  winStreakBonus: boolean;   // do win streaks grant bonus stars?
}

const TIER_CONFIG: Record<RankTier, TierConfig> = {
  bronze:  { maxDivision: 10, starsPerDivision: 3, winStreakBonus: true },
  silver:  { maxDivision: 10, starsPerDivision: 3, winStreakBonus: true },
  gold:    { maxDivision: 10, starsPerDivision: 3, winStreakBonus: true },
  diamond: { maxDivision: 10, starsPerDivision: 3, winStreakBonus: false },
  master:  { maxDivision: 5,  starsPerDivision: 4, winStreakBonus: false },
  legend:  { maxDivision: 1,  starsPerDivision: 0, winStreakBonus: false },
};

// Rank floors — players can never drop below these checkpoints
const RANK_FLOORS: Array<{ tier: RankTier; division: number }> = [
  { tier: 'bronze',  division: 5 },
  { tier: 'silver',  division: 10 },
  { tier: 'silver',  division: 5 },
  { tier: 'gold',    division: 10 },
  { tier: 'gold',    division: 5 },
  { tier: 'diamond', division: 10 },
  { tier: 'diamond', division: 5 },
  { tier: 'master',  division: 5 },
];

// ── MMR constants ──────────────────────────────────────────────────

const BASE_K_FACTOR = 32;
const MIN_K_FACTOR = 16;
const GAMES_FOR_STABLE_MMR = 50;
const DEFAULT_MMR = 1000;

// ── Types ──────────────────────────────────────────────────────────

export interface RankState {
  tier: RankTier;
  division: number;
  stars: number;
  mmr: number;
  peakMmr: number;
  seasonId: string;
}

export interface RankChange {
  oldRank: RankState;
  newRank: RankState;
  mmrDelta: number;
  starsGained: number;  // can be negative
  promoted: boolean;     // promoted to a new tier?
  demoted: boolean;      // demoted to a lower tier?
  reachedLegend: boolean;
  winStreakActive: boolean;
  legendRank?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  displayName: string;
  tier: RankTier;
  division: number;
  stars: number;
  mmr: number;
  gamesWon: number;
  gamesPlayed: number;
  legendRank?: number;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// ── Core service ───────────────────────────────────────────────────

function tierIndex(tier: RankTier): number {
  return TIER_ORDER.indexOf(tier);
}

function nextTier(tier: RankTier): RankTier | null {
  const idx = tierIndex(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

function prevTier(tier: RankTier): RankTier | null {
  const idx = tierIndex(tier);
  return idx > 0 ? TIER_ORDER[idx - 1] : null;
}

/**
 * Check if (tier, division) is at or above a rank floor.
 */
function isAtRankFloor(tier: RankTier, division: number): boolean {
  for (const floor of RANK_FLOORS) {
    if (floor.tier === tier && floor.division === division) return true;
  }
  // Tier entry points are always floors
  const cfg = TIER_CONFIG[tier];
  if (division === cfg.maxDivision && tierIndex(tier) > 0) return true;
  return false;
}

/**
 * Check if player is above a rank floor, meaning they can't drop below current position.
 */
function isAboveRankFloor(tier: RankTier, division: number): boolean {
  // Check if current position IS a rank floor
  if (isAtRankFloor(tier, division)) return true;

  // Check if any floor exists below this position within the same tier
  for (const floor of RANK_FLOORS) {
    if (floor.tier === tier && floor.division > division) {
      // There's a floor below us in same tier — we're above it
      return false;
    }
  }
  return false;
}

/**
 * Calculate expected win probability using Elo formula.
 */
function expectedWinRate(playerMmr: number, opponentMmr: number): number {
  return 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
}

/**
 * Calculate K-factor based on games played (less experienced = more volatile).
 */
function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 10) return BASE_K_FACTOR * 1.5;
  if (gamesPlayed < GAMES_FOR_STABLE_MMR) return BASE_K_FACTOR;
  return MIN_K_FACTOR;
}

/**
 * Calculate MMR change after a game.
 */
function calculateMmrDelta(
  playerMmr: number,
  opponentMmr: number,
  won: boolean,
  gamesPlayed: number
): number {
  const expected = expectedWinRate(playerMmr, opponentMmr);
  const actual = won ? 1 : 0;
  const k = kFactor(gamesPlayed);
  return Math.round(k * (actual - expected));
}

/**
 * Apply star gain/loss and handle promotion/demotion.
 */
function applyStarChange(rank: RankState, starsGained: number): RankState {
  if (rank.tier === 'legend') {
    // Legend players don't use stars — MMR is the rank
    return { ...rank };
  }

  const result = { ...rank };
  result.stars += starsGained;

  const cfg = TIER_CONFIG[result.tier];

  // Handle overflow (promotion)
  while (result.stars >= cfg.starsPerDivision) {
    result.stars -= cfg.starsPerDivision;

    if (result.division > 1) {
      // Advance to next division within same tier
      result.division--;
    } else {
      // Promote to next tier
      const next = nextTier(result.tier);
      if (next) {
        if (next === 'legend') {
          result.tier = 'legend';
          result.division = 1;
          result.stars = 0;
          return result;
        }
        result.tier = next;
        result.division = TIER_CONFIG[next].maxDivision;
        // Carry over extra stars into new tier
      } else {
        result.stars = cfg.starsPerDivision - 1; // cap
        return result;
      }
    }
  }

  // Handle underflow (demotion)
  while (result.stars < 0) {
    // Check if current position is a rank floor
    if (isAtRankFloor(result.tier, result.division)) {
      result.stars = 0;
      return result;
    }

    // Bronze 10 is the absolute bottom
    if (result.tier === 'bronze' && result.division === 10) {
      result.stars = 0;
      return result;
    }

    if (result.division < TIER_CONFIG[result.tier].maxDivision) {
      // Drop to previous division in same tier
      result.division++;
      const prevCfg = TIER_CONFIG[result.tier];
      result.stars += prevCfg.starsPerDivision;
    } else {
      // Drop to previous tier
      const prev = prevTier(result.tier);
      if (prev) {
        result.tier = prev;
        result.division = 1;
        const prevCfg = TIER_CONFIG[prev];
        result.stars += prevCfg.starsPerDivision;
      } else {
        result.stars = 0;
        return result;
      }
    }
  }

  return result;
}

// ── Public API ─────────────────────────────────────────────────────

export async function getPlayerRank(playerId: string, seasonId?: string): Promise<RankState | null> {
  const season = seasonId || await getCurrentSeasonId();
  const result = await query(
    'SELECT tier, division, stars, mmr, peak_mmr, season_id FROM player_ranks WHERE player_id = $1 AND season_id = $2',
    [playerId, season]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    tier: row.tier as RankTier,
    division: row.division,
    stars: row.stars,
    mmr: row.mmr,
    peakMmr: row.peak_mmr,
    seasonId: row.season_id,
  };
}

export async function getPlayerMmr(playerId: string): Promise<number> {
  const rank = await getPlayerRank(playerId);
  return rank?.mmr ?? DEFAULT_MMR;
}

/**
 * Process the result of a ranked game for both players.
 * Returns the rank change info for each player.
 */
export async function processRankedResult(
  player1Id: string,
  player2Id: string,
  winnerId: string | null,
  mode: 'ranked' | 'casual'
): Promise<{ player1: RankChange; player2: RankChange }> {
  const seasonId = await getCurrentSeasonId();

  const [rank1, rank2, stats1, stats2] = await Promise.all([
    getPlayerRank(player1Id, seasonId),
    getPlayerRank(player2Id, seasonId),
    getPlayerStats(player1Id),
    getPlayerStats(player2Id),
  ]);

  const r1 = rank1 || { tier: 'bronze' as RankTier, division: 10, stars: 0, mmr: DEFAULT_MMR, peakMmr: DEFAULT_MMR, seasonId };
  const r2 = rank2 || { tier: 'bronze' as RankTier, division: 10, stars: 0, mmr: DEFAULT_MMR, peakMmr: DEFAULT_MMR, seasonId };

  const p1Won = winnerId === player1Id;
  const p2Won = winnerId === player2Id;
  const isDraw = winnerId === null;

  // Calculate MMR deltas
  const mmrDelta1 = isDraw ? 0 : calculateMmrDelta(r1.mmr, r2.mmr, p1Won, stats1.gamesPlayed);
  const mmrDelta2 = isDraw ? 0 : calculateMmrDelta(r2.mmr, r1.mmr, p2Won, stats2.gamesPlayed);

  // Apply MMR changes
  const newMmr1 = Math.max(0, r1.mmr + mmrDelta1);
  const newMmr2 = Math.max(0, r2.mmr + mmrDelta2);

  // Star changes for ranked mode
  let starChange1 = 0;
  let starChange2 = 0;
  let p1WinStreak = false;
  let p2WinStreak = false;

  if (mode === 'ranked') {
    // Check win streaks
    const [streak1, streak2] = await Promise.all([
      getWinStreak(player1Id),
      getWinStreak(player2Id),
    ]);

    if (p1Won && !isDraw) {
      const newStreak1 = streak1 + 1;
      const bonus = TIER_CONFIG[r1.tier].winStreakBonus && newStreak1 >= 3 ? 1 : 0;
      starChange1 = 1 + bonus;
      p1WinStreak = bonus > 0;
      starChange2 = r2.tier === 'legend' ? 0 : -1;
    } else if (p2Won && !isDraw) {
      const newStreak2 = streak2 + 1;
      const bonus = TIER_CONFIG[r2.tier].winStreakBonus && newStreak2 >= 3 ? 1 : 0;
      starChange2 = 1 + bonus;
      p2WinStreak = bonus > 0;
      starChange1 = r1.tier === 'legend' ? 0 : -1;
    }
  }

  // Apply star changes (only if not legend — legend uses MMR only)
  const newRank1 = r1.tier === 'legend'
    ? { ...r1, mmr: newMmr1, peakMmr: Math.max(r1.peakMmr, newMmr1) }
    : applyStarChange({ ...r1, mmr: newMmr1, peakMmr: Math.max(r1.peakMmr, newMmr1) }, starChange1);

  const newRank2 = r2.tier === 'legend'
    ? { ...r2, mmr: newMmr2, peakMmr: Math.max(r2.peakMmr, newMmr2) }
    : applyStarChange({ ...r2, mmr: newMmr2, peakMmr: Math.max(r2.peakMmr, newMmr2) }, starChange2);

  // Persist to database
  await withTransaction(async (client) => {
    // Update ranks
    await client.query(
      `INSERT INTO player_ranks (player_id, tier, division, stars, mmr, peak_mmr, season_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (player_id, season_id) DO UPDATE SET
         tier = $2, division = $3, stars = $4, mmr = $5, peak_mmr = GREATEST(player_ranks.peak_mmr, $6)`,
      [player1Id, newRank1.tier, newRank1.division, newRank1.stars, newRank1.mmr, newRank1.peakMmr, seasonId]
    );
    await client.query(
      `INSERT INTO player_ranks (player_id, tier, division, stars, mmr, peak_mmr, season_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (player_id, season_id) DO UPDATE SET
         tier = $2, division = $3, stars = $4, mmr = $5, peak_mmr = GREATEST(player_ranks.peak_mmr, $6)`,
      [player2Id, newRank2.tier, newRank2.division, newRank2.stars, newRank2.mmr, newRank2.peakMmr, seasonId]
    );

    // Update stats
    if (p1Won) {
      await client.query(
        `UPDATE player_stats SET games_played = games_played + 1, games_won = games_won + 1,
         win_streak = win_streak + 1, best_win_streak = GREATEST(best_win_streak, win_streak + 1)
         WHERE player_id = $1`,
        [player1Id]
      );
      await client.query(
        `UPDATE player_stats SET games_played = games_played + 1, games_lost = games_lost + 1, win_streak = 0
         WHERE player_id = $1`,
        [player2Id]
      );
    } else if (p2Won) {
      await client.query(
        `UPDATE player_stats SET games_played = games_played + 1, games_won = games_won + 1,
         win_streak = win_streak + 1, best_win_streak = GREATEST(best_win_streak, win_streak + 1)
         WHERE player_id = $1`,
        [player2Id]
      );
      await client.query(
        `UPDATE player_stats SET games_played = games_played + 1, games_lost = games_lost + 1, win_streak = 0
         WHERE player_id = $1`,
        [player1Id]
      );
    } else {
      await client.query('UPDATE player_stats SET games_played = games_played + 1 WHERE player_id = $1', [player1Id]);
      await client.query('UPDATE player_stats SET games_played = games_played + 1 WHERE player_id = $1', [player2Id]);
    }
  });

  // Compute legend ranks
  const legendRank1 = newRank1.tier === 'legend' ? await getLegendRank(player1Id, seasonId) : undefined;
  const legendRank2 = newRank2.tier === 'legend' ? await getLegendRank(player2Id, seasonId) : undefined;

  return {
    player1: {
      oldRank: r1,
      newRank: newRank1,
      mmrDelta: mmrDelta1,
      starsGained: starChange1,
      promoted: tierIndex(newRank1.tier) > tierIndex(r1.tier),
      demoted: tierIndex(newRank1.tier) < tierIndex(r1.tier),
      reachedLegend: r1.tier !== 'legend' && newRank1.tier === 'legend',
      winStreakActive: p1WinStreak,
      legendRank: legendRank1,
    },
    player2: {
      oldRank: r2,
      newRank: newRank2,
      mmrDelta: mmrDelta2,
      starsGained: starChange2,
      promoted: tierIndex(newRank2.tier) > tierIndex(r2.tier),
      demoted: tierIndex(newRank2.tier) < tierIndex(r2.tier),
      reachedLegend: r2.tier !== 'legend' && newRank2.tier === 'legend',
      winStreakActive: p2WinStreak,
      legendRank: legendRank2,
    },
  };
}

/**
 * Process a casual game — only updates MMR (hidden), no star/rank changes.
 */
export async function processCasualResult(
  player1Id: string,
  player2Id: string,
  winnerId: string | null
): Promise<{ mmrDelta1: number; mmrDelta2: number }> {
  const seasonId = await getCurrentSeasonId();
  const [rank1, rank2, stats1, stats2] = await Promise.all([
    getPlayerRank(player1Id, seasonId),
    getPlayerRank(player2Id, seasonId),
    getPlayerStats(player1Id),
    getPlayerStats(player2Id),
  ]);

  const p1Won = winnerId === player1Id;
  const p2Won = winnerId === player2Id;

  const mmrDelta1 = winnerId === null ? 0 : calculateMmrDelta(
    rank1?.mmr ?? DEFAULT_MMR, rank2?.mmr ?? DEFAULT_MMR, p1Won, stats1.gamesPlayed
  );
  const mmrDelta2 = winnerId === null ? 0 : calculateMmrDelta(
    rank2?.mmr ?? DEFAULT_MMR, rank1?.mmr ?? DEFAULT_MMR, p2Won, stats2.gamesPlayed
  );

  const newMmr1 = Math.max(0, (rank1?.mmr ?? DEFAULT_MMR) + mmrDelta1);
  const newMmr2 = Math.max(0, (rank2?.mmr ?? DEFAULT_MMR) + mmrDelta2);

  // Update MMR only (no tier/division/star changes)
  await query(
    `UPDATE player_ranks SET mmr = $1, peak_mmr = GREATEST(peak_mmr, $1) WHERE player_id = $2 AND season_id = $3`,
    [newMmr1, player1Id, seasonId]
  );
  await query(
    `UPDATE player_ranks SET mmr = $1, peak_mmr = GREATEST(peak_mmr, $1) WHERE player_id = $2 AND season_id = $3`,
    [newMmr2, player2Id, seasonId]
  );

  // Update game counts
  if (p1Won) {
    await query('UPDATE player_stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE player_id = $1', [player1Id]);
    await query('UPDATE player_stats SET games_played = games_played + 1, games_lost = games_lost + 1 WHERE player_id = $1', [player2Id]);
  } else if (p2Won) {
    await query('UPDATE player_stats SET games_played = games_played + 1, games_won = games_won + 1 WHERE player_id = $1', [player2Id]);
    await query('UPDATE player_stats SET games_played = games_played + 1, games_lost = games_lost + 1 WHERE player_id = $1', [player1Id]);
  }

  return { mmrDelta1, mmrDelta2 };
}

// ── Leaderboard ────────────────────────────────────────────────────

export async function getLeaderboard(
  seasonId?: string,
  limit = 100,
  offset = 0
): Promise<LeaderboardEntry[]> {
  const season = seasonId || await getCurrentSeasonId();

  const result = await query(
    `SELECT p.id as player_id, p.username, p.display_name,
            pr.tier, pr.division, pr.stars, pr.mmr,
            ps.games_won, ps.games_played,
            RANK() OVER (
              PARTITION BY pr.tier
              ORDER BY pr.mmr DESC
            ) as legend_rank
     FROM player_ranks pr
     JOIN players p ON pr.player_id = p.id
     LEFT JOIN player_stats ps ON p.id = ps.player_id
     WHERE pr.season_id = $1
     ORDER BY
       CASE pr.tier
         WHEN 'legend' THEN 6
         WHEN 'master' THEN 5
         WHEN 'diamond' THEN 4
         WHEN 'gold' THEN 3
         WHEN 'silver' THEN 2
         WHEN 'bronze' THEN 1
       END DESC,
       pr.division ASC,
       pr.stars DESC,
       pr.mmr DESC
     LIMIT $2 OFFSET $3`,
    [season, limit, offset]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    playerId: row.player_id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    tier: row.tier as RankTier,
    division: row.division as number,
    stars: row.stars as number,
    mmr: row.mmr as number,
    gamesWon: row.games_won as number ?? 0,
    gamesPlayed: row.games_played as number ?? 0,
    legendRank: row.tier === 'legend' ? row.legend_rank as number : undefined,
  }));
}

export async function getLegendRank(playerId: string, seasonId?: string): Promise<number> {
  const season = seasonId || await getCurrentSeasonId();

  const result = await query(
    `SELECT COUNT(*) + 1 as rank
     FROM player_ranks
     WHERE season_id = $1 AND tier = 'legend' AND mmr > (
       SELECT mmr FROM player_ranks WHERE player_id = $2 AND season_id = $1
     )`,
    [season, playerId]
  );

  return parseInt(result.rows[0]?.rank ?? '1', 10);
}

// ── Season management ──────────────────────────────────────────────

export async function getCurrentSeasonId(): Promise<string> {
  const result = await query(
    `SELECT id FROM seasons WHERE is_active = true ORDER BY start_date DESC LIMIT 1`
  );

  if (result.rows.length > 0) return result.rows[0].id;

  // Fallback: derive season from current month
  const now = new Date();
  return `season_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getCurrentSeason(): Promise<SeasonInfo | null> {
  const result = await query(
    `SELECT id, name, start_date, end_date, is_active FROM seasons WHERE is_active = true LIMIT 1`
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

/**
 * Reset all players' ranks for a new season.
 * Players drop ~5 divisions from where they ended.
 */
export async function performSeasonReset(newSeasonId: string, newSeasonName: string): Promise<void> {
  const oldSeasonId = await getCurrentSeasonId();

  await withTransaction(async (client) => {
    // Create the new season
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    await client.query(
      `INSERT INTO seasons (id, name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (id) DO UPDATE SET is_active = true`,
      [newSeasonId, newSeasonName, now, endDate]
    );

    // Deactivate old season
    await client.query(
      `UPDATE seasons SET is_active = false WHERE id = $1`,
      [oldSeasonId]
    );

    // Get all players' current ranks
    const players = await client.query(
      `SELECT player_id, tier, division, stars, mmr, peak_mmr FROM player_ranks WHERE season_id = $1`,
      [oldSeasonId]
    );

    // Calculate reset positions
    for (const row of players.rows) {
      const { resetTier, resetDivision } = calculateSeasonReset(row.tier, row.division);

      await client.query(
        `INSERT INTO player_ranks (player_id, tier, division, stars, mmr, peak_mmr, season_id)
         VALUES ($1, $2, $3, 0, $4, $4, $5)
         ON CONFLICT (player_id, season_id) DO NOTHING`,
        [row.player_id, resetTier, resetDivision, row.mmr, newSeasonId]
      );
    }

    // Reset win streaks for the new season
    await client.query('UPDATE player_stats SET win_streak = 0');
  });
}

function calculateSeasonReset(tier: RankTier, division: number): { resetTier: RankTier; resetDivision: number } {
  // Legend/Master → Diamond 5
  if (tier === 'legend' || tier === 'master') {
    return { resetTier: 'diamond', resetDivision: 5 };
  }

  // Drop ~5 divisions
  const totalDrop = 5;
  let remainingDrop = totalDrop;
  let currentTier = tier;
  let currentDiv = division;

  while (remainingDrop > 0) {
    const cfg = TIER_CONFIG[currentTier];
    const divsToBottom = cfg.maxDivision - currentDiv;

    if (divsToBottom >= remainingDrop) {
      currentDiv += remainingDrop;
      remainingDrop = 0;
    } else {
      remainingDrop -= divsToBottom + 1;
      const prev = prevTier(currentTier);
      if (prev) {
        currentTier = prev;
        currentDiv = 1;
      } else {
        currentDiv = cfg.maxDivision;
        remainingDrop = 0;
      }
    }
  }

  return { resetTier: currentTier, resetDivision: currentDiv };
}

// ── Helpers ────────────────────────────────────────────────────────

async function getPlayerStats(playerId: string): Promise<{ gamesPlayed: number }> {
  const result = await query(
    'SELECT games_played FROM player_stats WHERE player_id = $1',
    [playerId]
  );
  return { gamesPlayed: result.rows[0]?.games_played ?? 0 };
}

async function getWinStreak(playerId: string): Promise<number> {
  const result = await query(
    'SELECT win_streak FROM player_stats WHERE player_id = $1',
    [playerId]
  );
  return result.rows[0]?.win_streak ?? 0;
}

/**
 * Get a human-readable rank display string.
 */
export function formatRank(tier: RankTier, division: number, legendRank?: number): string {
  if (tier === 'legend') {
    return legendRank ? `Legend #${legendRank}` : 'Legend';
  }
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${tierName} ${division}`;
}

/**
 * Get the total star count for ordering purposes.
 * Higher = better rank.
 */
export function totalStars(tier: RankTier, division: number, stars: number): number {
  let total = 0;
  for (const t of TIER_ORDER) {
    if (t === tier) {
      const cfg = TIER_CONFIG[t];
      if (t === 'legend') {
        total += 1000; // Legend is always on top
      } else {
        total += (cfg.maxDivision - division) * cfg.starsPerDivision + stars;
      }
      break;
    }
    const cfg = TIER_CONFIG[t];
    total += cfg.maxDivision * cfg.starsPerDivision;
  }
  return total;
}

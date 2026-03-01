/**
 * STARFORGE TCG - Battle Pass Service
 *
 * Server-authoritative battle pass:
 * - 50-tier progression with free + premium tracks
 * - XP earned from games, wins, and quest completions
 * - Season-locked — resets when a new season starts
 * - Rewards granted atomically (gold, stardust, packs)
 * - Premium upgrade costs Nebula Gems
 */

import { query, withTransaction } from '../config/database';
import * as PackService from './PackService';

// ── Constants ───────────────────────────────────────────────────

const MAX_LEVEL = 50;
const PREMIUM_UPGRADE_GEMS = 1000; // Nebula Gems cost for premium pass

export type RewardType = 'gold' | 'stardust' | 'pack_standard' | 'pack_premium' | 'pack_legendary' | 'card_back' | 'title';

export interface BattlePassReward {
  type: RewardType;
  amount: number;
  label: string;
}

export interface BattlePassTier {
  level: number;
  xpRequired: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
}

export interface BattlePassProgress {
  season: string;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  isPremium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
  tiers: BattlePassTier[];
  daysRemaining: number;
}

export interface ClaimResult {
  reward: BattlePassReward;
  grantedCurrency?: { gold?: number; stardust?: number };
  grantedPack?: { packType: string; cards: PackService.PackCard[] };
}

// ── XP Values ───────────────────────────────────────────────────

export const XP_REWARDS = {
  GAME_PLAYED: 15,
  GAME_WON: 30,
  QUEST_COMPLETED: 50,
  DAILY_LOGIN: 10,
  PVP_WIN: 40,
  CAMPAIGN_WIN: 25,
  FAST_WIN: 10,
} as const;

// ── Season Config ───────────────────────────────────────────────

const SEASON_NAMES = [
  'Season of the Void',
  'Season of Starfire',
  'Season of the Swarm',
  'Season of Chrono',
  'Season of the Forge',
  'Season of Crystals',
  'Season of Phantoms',
  'Season of Lumina',
];

function getCurrentSeasonId(): string {
  const epoch = new Date('2025-01-01').getTime();
  const now = Date.now();
  const num = Math.floor((now - epoch) / (30 * 24 * 60 * 60 * 1000)) + 1;
  return `season_bp_${num}`;
}

function getSeasonInfo(): { id: string; name: string; start: string; end: string } {
  const epoch = new Date('2025-01-01').getTime();
  const now = Date.now();
  const num = Math.floor((now - epoch) / (30 * 24 * 60 * 60 * 1000)) + 1;
  const startMs = epoch + (num - 1) * 30 * 24 * 60 * 60 * 1000;
  const endMs = startMs + 30 * 24 * 60 * 60 * 1000;

  return {
    id: `season_bp_${num}`,
    name: SEASON_NAMES[(num - 1) % SEASON_NAMES.length],
    start: new Date(startMs).toISOString().split('T')[0],
    end: new Date(endMs).toISOString().split('T')[0],
  };
}

// ── Tier Definitions ────────────────────────────────────────────

function xpForLevel(level: number): number {
  if (level <= 10) return 100;
  if (level <= 30) return 150;
  return 200;
}

function generateTiers(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];

  for (let level = 1; level <= MAX_LEVEL; level++) {
    const tier: BattlePassTier = {
      level,
      xpRequired: xpForLevel(level),
      freeReward: null,
      premiumReward: null,
    };

    // Free track rewards
    if (level % 5 === 0) {
      if (level <= 20) {
        tier.freeReward = { type: 'pack_standard', amount: 1, label: 'Standard Pack' };
      } else if (level <= 40) {
        tier.freeReward = { type: 'pack_premium', amount: 1, label: 'Premium Pack' };
      } else {
        tier.freeReward = { type: 'pack_legendary', amount: 1, label: 'Legendary Pack' };
      }
    } else if (level % 3 === 0) {
      const dust = level <= 20 ? 25 : level <= 35 ? 50 : 75;
      tier.freeReward = { type: 'stardust', amount: dust, label: `${dust} Stardust` };
    } else if (level % 2 === 0) {
      const gold = level <= 15 ? 25 : level <= 30 ? 40 : 60;
      tier.freeReward = { type: 'gold', amount: gold, label: `${gold} Gold` };
    }

    // Premium track rewards
    if (level === MAX_LEVEL) {
      tier.premiumReward = { type: 'card_back', amount: 1, label: 'Season Card Back' };
    } else if (level === 40) {
      tier.premiumReward = { type: 'title', amount: 1, label: 'Season Title' };
    } else if (level % 5 === 0) {
      if (level <= 25) {
        tier.premiumReward = { type: 'pack_premium', amount: 1, label: 'Premium Pack' };
      } else {
        tier.premiumReward = { type: 'pack_legendary', amount: 1, label: 'Legendary Pack' };
      }
    } else if (level % 3 === 0) {
      const dust = level <= 15 ? 50 : level <= 30 ? 75 : 100;
      tier.premiumReward = { type: 'stardust', amount: dust, label: `${dust} Stardust` };
    } else if (level % 2 === 0) {
      const gold = level <= 15 ? 50 : level <= 30 ? 75 : 100;
      tier.premiumReward = { type: 'gold', amount: gold, label: `${gold} Gold` };
    }

    tiers.push(tier);
  }

  return tiers;
}

const TIERS = generateTiers();

// ── Public API ──────────────────────────────────────────────────

/** Get player's battle pass progress for current season */
export async function getProgress(playerId: string): Promise<BattlePassProgress> {
  const season = getSeasonInfo();
  const seasonId = season.id;

  // Ensure row exists for current season
  await query(
    `INSERT INTO battle_pass_progress (player_id, season_id, tier, xp, is_premium, claimed_tiers)
     VALUES ($1, $2, 1, 0, false, '{"free":[],"premium":[]}')
     ON CONFLICT (player_id, season_id) DO NOTHING`,
    [playerId, seasonId]
  );

  const result = await query(
    `SELECT tier, xp, is_premium, claimed_tiers FROM battle_pass_progress
     WHERE player_id = $1 AND season_id = $2`,
    [playerId, seasonId]
  );

  const row = result.rows[0];
  const claimed = row.claimed_tiers || { free: [], premium: [] };
  const endDate = new Date(season.end);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return {
    season: seasonId,
    seasonName: season.name,
    seasonStart: season.start,
    seasonEnd: season.end,
    level: row.tier,
    xp: row.xp,
    xpForNextLevel: row.tier >= MAX_LEVEL ? 0 : xpForLevel(row.tier),
    isPremium: row.is_premium,
    claimedFree: claimed.free || [],
    claimedPremium: claimed.premium || [],
    tiers: TIERS,
    daysRemaining,
  };
}

/** Add XP to battle pass. Returns new level and whether leveled up. */
export async function addXP(
  playerId: string,
  amount: number,
  _source: string,
): Promise<{ level: number; xp: number; levelsGained: number }> {
  const seasonId = getCurrentSeasonId();

  return withTransaction(async (client) => {
    // Ensure row exists
    await client.query(
      `INSERT INTO battle_pass_progress (player_id, season_id, tier, xp, is_premium, claimed_tiers)
       VALUES ($1, $2, 1, 0, false, '{"free":[],"premium":[]}')
       ON CONFLICT (player_id, season_id) DO NOTHING`,
      [playerId, seasonId]
    );

    // Lock the row to prevent concurrent XP updates
    const result = await client.query(
      `SELECT tier, xp FROM battle_pass_progress
       WHERE player_id = $1 AND season_id = $2
       FOR UPDATE`,
      [playerId, seasonId]
    );

    let level = result.rows[0].tier;
    let xp = result.rows[0].xp + amount;
    const startLevel = level;

    // Level up loop
    while (level < MAX_LEVEL) {
      const needed = xpForLevel(level);
      if (xp >= needed) {
        xp -= needed;
        level++;
      } else {
        break;
      }
    }

    if (level >= MAX_LEVEL) {
      level = MAX_LEVEL;
    }

    await client.query(
      'UPDATE battle_pass_progress SET tier = $1, xp = $2 WHERE player_id = $3 AND season_id = $4',
      [level, xp, playerId, seasonId]
    );

    return { level, xp, levelsGained: level - startLevel };
  });
}

/** Claim a battle pass reward (free or premium track) */
export async function claimReward(
  playerId: string,
  level: number,
  track: 'free' | 'premium',
): Promise<ClaimResult> {
  const seasonId = getCurrentSeasonId();

  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT tier, is_premium, claimed_tiers FROM battle_pass_progress
       WHERE player_id = $1 AND season_id = $2
       FOR UPDATE`,
      [playerId, seasonId]
    );

    if (result.rows.length === 0) {
      throw new Error('No battle pass progress found');
    }

    const row = result.rows[0];

    // Validate level reached
    if (row.tier < level) {
      throw new Error(`Haven't reached level ${level} yet (current: ${row.tier})`);
    }

    // Validate premium access
    if (track === 'premium' && !row.is_premium) {
      throw new Error('Premium pass not unlocked');
    }

    // Check not already claimed
    const claimed = row.claimed_tiers || { free: [], premium: [] };
    const claimedList = track === 'free' ? claimed.free : claimed.premium;
    if (claimedList.includes(level)) {
      throw new Error('Reward already claimed');
    }

    // Get reward
    const tier = TIERS[level - 1];
    if (!tier) throw new Error('Invalid level');

    const reward = track === 'free' ? tier.freeReward : tier.premiumReward;
    if (!reward) throw new Error('No reward at this level for this track');

    // Grant reward
    const claimResult: ClaimResult = { reward };

    if (reward.type === 'gold') {
      await client.query(
        'UPDATE players SET gold = gold + $1, updated_at = NOW() WHERE id = $2',
        [reward.amount, playerId]
      );
      const bal = await client.query('SELECT gold FROM players WHERE id = $1', [playerId]);
      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
         VALUES ($1, 'gold', $2, $3, 'battlepass_reward', $4)`,
        [playerId, reward.amount, bal.rows[0].gold, `bp_${seasonId}_${track}_${level}`]
      );
      claimResult.grantedCurrency = { gold: reward.amount };
    } else if (reward.type === 'stardust') {
      await client.query(
        'UPDATE players SET stardust = stardust + $1, updated_at = NOW() WHERE id = $2',
        [reward.amount, playerId]
      );
      const bal = await client.query('SELECT stardust FROM players WHERE id = $1', [playerId]);
      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
         VALUES ($1, 'stardust', $2, $3, 'battlepass_reward', $4)`,
        [playerId, reward.amount, bal.rows[0].stardust, `bp_${seasonId}_${track}_${level}`]
      );
      claimResult.grantedCurrency = { stardust: reward.amount };
    } else if (reward.type.startsWith('pack_')) {
      // Pack rewards: open a free pack immediately and grant cards
      const packTypeId = reward.type.replace('pack_', '');
      const packResult = await PackService.openFreePack(
        playerId,
        packTypeId,
        `battlepass_${track}_${level}`,
      );
      claimResult.grantedPack = {
        packType: packTypeId,
        cards: packResult.cards,
      };
    } else if (reward.type === 'card_back' || reward.type === 'title') {
      // Cosmetic rewards — store in player achievements/cosmetics
      await client.query(
        `INSERT INTO player_achievements (player_id, achievement_id, progress, completed_at, claimed)
         VALUES ($1, $2, 1, NOW(), true)
         ON CONFLICT (player_id, achievement_id) DO NOTHING`,
        [playerId, `bp_${seasonId}_${reward.type}_${level}`]
      );
    }

    // Mark as claimed
    if (track === 'free') {
      claimed.free.push(level);
    } else {
      claimed.premium.push(level);
    }

    await client.query(
      'UPDATE battle_pass_progress SET claimed_tiers = $1 WHERE player_id = $2 AND season_id = $3',
      [JSON.stringify(claimed), playerId, seasonId]
    );

    return claimResult;
  });
}

/** Upgrade to premium battle pass (costs Nebula Gems) */
export async function upgradeToPremium(playerId: string): Promise<{ success: boolean; gemsSpent: number }> {
  const seasonId = getCurrentSeasonId();

  return withTransaction(async (client) => {
    // Check not already premium
    const result = await client.query(
      'SELECT is_premium FROM battle_pass_progress WHERE player_id = $1 AND season_id = $2',
      [playerId, seasonId]
    );

    if (result.rows.length === 0) {
      throw new Error('No battle pass progress found');
    }

    if (result.rows[0].is_premium) {
      throw new Error('Already premium');
    }

    // Deduct gems
    const gemResult = await client.query(
      `UPDATE players SET nebula_gems = nebula_gems - $1, updated_at = NOW()
       WHERE id = $2 AND nebula_gems >= $1
       RETURNING nebula_gems`,
      [PREMIUM_UPGRADE_GEMS, playerId]
    );

    if (gemResult.rows.length === 0) {
      throw new Error('Insufficient Nebula Gems');
    }

    // Log transaction
    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'nebula_gems', $2, $3, 'battlepass_premium', $4)`,
      [playerId, -PREMIUM_UPGRADE_GEMS, gemResult.rows[0].nebula_gems, seasonId]
    );

    // Upgrade
    await client.query(
      'UPDATE battle_pass_progress SET is_premium = true WHERE player_id = $1 AND season_id = $2',
      [playerId, seasonId]
    );

    return { success: true, gemsSpent: PREMIUM_UPGRADE_GEMS };
  });
}

/** Get the premium upgrade cost */
export function getPremiumCost(): number {
  return PREMIUM_UPGRADE_GEMS;
}

/** Get all tier definitions */
export function getTiers(): BattlePassTier[] {
  return TIERS;
}

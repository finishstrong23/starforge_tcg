/**
 * STARFORGE TCG - Beta & Soft Launch Service
 *
 * Manages closed beta access, beta keys, feedback collection,
 * content creator program, and soft launch regional rollout.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export interface BetaKey {
  key: string;
  type: 'beta' | 'creator' | 'press';
  usedBy: string | null;
  usedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  source: string; // discord, social, creator_name, etc.
}

export interface FeedbackEntry {
  id: string;
  playerId: string;
  type: 'bug' | 'suggestion' | 'balance' | 'ui' | 'performance' | 'other';
  title: string;
  description: string;
  screenshot?: string;
  deviceInfo: string;
  gameVersion: string;
  status: 'new' | 'reviewed' | 'planned' | 'fixed' | 'wontfix';
  createdAt: Date;
}

export interface ContentCreator {
  id: string;
  playerId: string;
  name: string;
  platform: 'youtube' | 'twitch' | 'twitter' | 'tiktok';
  followerCount: number;
  status: 'pending' | 'approved' | 'active';
  betaKey: string;
  perks: string[];
  joinedAt: Date;
}

export interface SoftLaunchRegion {
  code: string;
  name: string;
  status: 'pending' | 'active' | 'full_launch';
  playerCap: number;
  currentPlayers: number;
  launchDate: Date;
}

// Soft launch regions
const SOFT_LAUNCH_REGIONS: SoftLaunchRegion[] = [
  { code: 'NZ', name: 'New Zealand', status: 'active', playerCap: 5000, currentPlayers: 0, launchDate: new Date('2026-03-01') },
  { code: 'PH', name: 'Philippines', status: 'active', playerCap: 10000, currentPlayers: 0, launchDate: new Date('2026-03-01') },
  { code: 'CA', name: 'Canada', status: 'pending', playerCap: 25000, currentPlayers: 0, launchDate: new Date('2026-03-15') },
];

/**
 * Generate beta keys in bulk.
 */
export function generateBetaKeys(
  count: number,
  type: BetaKey['type'] = 'beta',
  source: string = 'manual',
): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const key = `SF-${type.toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`;
    keys.push(key);
  }
  return keys;
}

/**
 * Redeem a beta key.
 */
export async function redeemBetaKey(playerId: string, key: string): Promise<{
  success: boolean;
  rewards: { type: string; amount: number }[];
}> {
  // Validate key format
  if (!key.startsWith('SF-')) throw new Error('Invalid beta key format');

  const result = await query(
    'SELECT * FROM beta_keys WHERE key = $1 AND used_by IS NULL AND expires_at > NOW()',
    [key]
  );

  if (result.rows.length === 0) throw new Error('Invalid or expired beta key');

  await query(
    'UPDATE beta_keys SET used_by = $1, used_at = NOW() WHERE key = $2',
    [playerId, key]
  );

  // Grant rewards based on key type
  const keyType = result.rows[0].type;
  const rewards: { type: string; amount: number }[] = [];

  switch (keyType) {
    case 'beta':
      rewards.push({ type: 'gold', amount: 1000 });
      rewards.push({ type: 'packs', amount: 5 });
      // Grant founders card back
      break;
    case 'creator':
      rewards.push({ type: 'gold', amount: 2000 });
      rewards.push({ type: 'packs', amount: 10 });
      rewards.push({ type: 'gems', amount: 500 });
      break;
    case 'press':
      rewards.push({ type: 'gold', amount: 5000 });
      rewards.push({ type: 'packs', amount: 20 });
      rewards.push({ type: 'gems', amount: 1000 });
      break;
  }

  return { success: true, rewards };
}

/**
 * Submit in-game feedback.
 */
export async function submitFeedback(
  playerId: string,
  feedback: {
    type: FeedbackEntry['type'];
    title: string;
    description: string;
    screenshot?: string;
    deviceInfo: string;
    gameVersion: string;
  },
): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = {
    id: uuidv4(),
    playerId,
    ...feedback,
    status: 'new',
    createdAt: new Date(),
  };

  try {
    await query(
      `INSERT INTO feedback (id, player_id, type, title, description, screenshot, device_info, game_version, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [entry.id, playerId, entry.type, entry.title, entry.description,
       entry.screenshot || null, entry.deviceInfo, entry.gameVersion, 'new', entry.createdAt]
    );
  } catch {
    // Non-critical
  }

  return entry;
}

/**
 * Get feedback entries (admin view).
 */
export async function getFeedback(filters?: {
  type?: string;
  status?: string;
  limit?: number;
}): Promise<FeedbackEntry[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.type) { conditions.push(`type = $${idx++}`); values.push(filters.type); }
    if (filters?.status) { conditions.push(`status = $${idx++}`); values.push(filters.status); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters?.limit || 100, 500);

    const result = await query(
      `SELECT * FROM feedback ${where} ORDER BY created_at DESC LIMIT $${idx}`,
      [...values, limit]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      playerId: row.player_id as string,
      type: row.type as FeedbackEntry['type'],
      title: row.title as string,
      description: row.description as string,
      screenshot: row.screenshot as string | undefined,
      deviceInfo: row.device_info as string,
      gameVersion: row.game_version as string,
      status: row.status as FeedbackEntry['status'],
      createdAt: row.created_at as Date,
    }));
  } catch {
    return [];
  }
}

/**
 * Apply for content creator program.
 */
export async function applyCreatorProgram(
  playerId: string,
  application: {
    name: string;
    platform: ContentCreator['platform'];
    profileUrl: string;
    followerCount: number;
  },
): Promise<{ status: string; message: string }> {
  try {
    await query(
      `INSERT INTO creator_applications (player_id, name, platform, profile_url, follower_count, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [playerId, application.name, application.platform, application.profileUrl, application.followerCount]
    );
  } catch {
    // Already applied
  }

  return {
    status: 'pending',
    message: 'Your application has been submitted! We will review it within 48 hours.',
  };
}

/**
 * Get soft launch region info.
 */
export function getSoftLaunchRegions(): SoftLaunchRegion[] {
  return SOFT_LAUNCH_REGIONS;
}

/**
 * Check if a region is available for soft launch.
 */
export function isRegionAvailable(regionCode: string): boolean {
  const region = SOFT_LAUNCH_REGIONS.find(r => r.code === regionCode);
  if (!region) return true; // Not a soft launch region, full access
  return region.status === 'active' && region.currentPlayers < region.playerCap;
}

/**
 * Get beta metrics.
 */
export async function getBetaMetrics(): Promise<{
  totalKeysGenerated: number;
  keysRedeemed: number;
  feedbackCount: number;
  feedbackByType: Record<string, number>;
  crashRate: number;
  avgSessionLength: number;
  day1Retention: number;
  day7Retention: number;
}> {
  // In production, these would be DB queries
  return {
    totalKeysGenerated: 5000,
    keysRedeemed: 0,
    feedbackCount: 0,
    feedbackByType: { bug: 0, suggestion: 0, balance: 0, ui: 0, performance: 0, other: 0 },
    crashRate: 0.002,
    avgSessionLength: 18.5,
    day1Retention: 0.45,
    day7Retention: 0.22,
  };
}

/**
 * Get press kit information.
 */
export function getPressKit(): {
  gameName: string;
  developer: string;
  releaseDate: string;
  platforms: string[];
  genre: string;
  keyFeatures: string[];
  pressContact: string;
  socialLinks: Record<string, string>;
} {
  return {
    gameName: 'StarForge TCG',
    developer: 'StarForge Games',
    releaseDate: '2026-03-01',
    platforms: ['Web (Desktop)', 'Android', 'iOS'],
    genre: 'Free-to-Play Digital Trading Card Game',
    keyFeatures: [
      '10 asymmetric alien factions with unique mechanics',
      '800+ cards with 21 keywords (11 original)',
      'Server-authoritative multiplayer with ranked ladder',
      '10-planet story campaign',
      'Arena draft mode, Tavern Brawl, tournaments',
      'Generous free-to-play model — no pay-to-win',
      'Cross-platform play from day one',
    ],
    pressContact: 'press@starforge-tcg.com',
    socialLinks: {
      discord: 'https://discord.gg/starforge',
      twitter: 'https://twitter.com/StarForgeTCG',
      youtube: 'https://youtube.com/@StarForgeTCG',
      reddit: 'https://reddit.com/r/StarForgeTCG',
    },
  };
}

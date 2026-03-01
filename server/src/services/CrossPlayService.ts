/**
 * STARFORGE TCG - Cross-Play & Cross-Progression Service
 *
 * Manages cross-platform play, account linking, and progress sync.
 * Players can play on any platform and keep their collection/progress.
 */

import { query } from '../config/database';

export interface PlatformLink {
  platform: 'web' | 'android' | 'ios' | 'steam';
  platformUserId: string;
  linkedAt: Date;
  lastSyncedAt: Date;
}

export interface CrossPlaySession {
  playerId: string;
  platform: string;
  region: string;
  latencyMs: number;
  isActive: boolean;
}

/**
 * Link a platform account to the player's StarForge account.
 */
export async function linkPlatform(
  playerId: string,
  platform: PlatformLink['platform'],
  platformUserId: string,
): Promise<void> {
  // Check if platform account is already linked to someone else
  const existing = await query(
    'SELECT player_id FROM platform_links WHERE platform = $1 AND platform_user_id = $2',
    [platform, platformUserId]
  );

  if (existing.rows.length > 0 && existing.rows[0].player_id !== playerId) {
    throw new Error('This platform account is already linked to another player');
  }

  await query(
    `INSERT INTO platform_links (player_id, platform, platform_user_id, linked_at, last_synced_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (player_id, platform) DO UPDATE SET platform_user_id = $3, last_synced_at = NOW()`,
    [playerId, platform, platformUserId]
  );
}

/**
 * Unlink a platform account.
 */
export async function unlinkPlatform(playerId: string, platform: string): Promise<void> {
  // Must keep at least one linked platform
  const links = await query(
    'SELECT COUNT(*) as cnt FROM platform_links WHERE player_id = $1',
    [playerId]
  );

  if (parseInt(links.rows[0].cnt) <= 1) {
    throw new Error('Cannot unlink last platform. Link another platform first.');
  }

  await query(
    'DELETE FROM platform_links WHERE player_id = $1 AND platform = $2',
    [playerId, platform]
  );
}

/**
 * Get linked platforms for a player.
 */
export async function getLinkedPlatforms(playerId: string): Promise<PlatformLink[]> {
  const result = await query(
    'SELECT platform, platform_user_id, linked_at, last_synced_at FROM platform_links WHERE player_id = $1',
    [playerId]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    platform: row.platform as PlatformLink['platform'],
    platformUserId: row.platform_user_id as string,
    linkedAt: row.linked_at as Date,
    lastSyncedAt: row.last_synced_at as Date,
  }));
}

/**
 * Find a player by platform account.
 */
export async function findByPlatformAccount(
  platform: string,
  platformUserId: string,
): Promise<string | null> {
  const result = await query(
    'SELECT player_id FROM platform_links WHERE platform = $1 AND platform_user_id = $2',
    [platform, platformUserId]
  );

  return result.rows.length > 0 ? result.rows[0].player_id : null;
}

/**
 * Sync progress after platform switch (update last synced timestamp).
 */
export async function syncProgress(playerId: string, platform: string): Promise<void> {
  await query(
    'UPDATE platform_links SET last_synced_at = NOW() WHERE player_id = $1 AND platform = $2',
    [playerId, platform]
  );
}

/**
 * Cross-play matchmaking compatibility check.
 * All platforms can play together — no restrictions.
 */
export function canMatchTogether(platform1: string, platform2: string): boolean {
  // StarForge TCG supports full cross-play between all platforms
  return true;
}

/**
 * Get cross-play stats.
 */
export function getCrossPlayStats(): {
  crossPlayEnabled: boolean;
  crossProgressionEnabled: boolean;
  supportedPlatforms: string[];
  matchmakingPools: string;
} {
  return {
    crossPlayEnabled: true,
    crossProgressionEnabled: true,
    supportedPlatforms: ['web', 'android', 'ios', 'steam'],
    matchmakingPools: 'unified', // All platforms share one matchmaking pool
  };
}

/**
 * STARFORGE TCG - OAuth Service
 *
 * Handles OAuth authentication flows for Google, Apple, and Discord.
 * Creates or links accounts when users authenticate via OAuth providers.
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/database';
import { config } from '../config/env';
import { getProfile } from './AuthService';
import type { AuthResult, AuthTokens } from './AuthService';

export type OAuthProvider = 'google' | 'apple' | 'discord';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

function generateTokens(userId: string, username: string): AuthTokens {
  const accessToken = jwt.sign(
    { userId, username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = jwt.sign(
    { userId, username, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
  };
}

/**
 * Exchange an OAuth authorization code for user tokens.
 * Fetches provider profile, creates or links account, returns auth result.
 */
export async function authenticateOAuth(profile: OAuthProfile): Promise<AuthResult> {
  // Check if this OAuth account is already linked
  const existing = await query(
    'SELECT player_id FROM oauth_accounts WHERE provider = $1 AND provider_id = $2',
    [profile.provider, profile.providerId]
  );

  if (existing.rows.length > 0) {
    // Existing linked account — log in
    const playerId = existing.rows[0].player_id;
    await query(
      'UPDATE players SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
      [playerId]
    );

    const playerResult = await query('SELECT username FROM players WHERE id = $1', [playerId]);
    const tokens = generateTokens(playerId, playerResult.rows[0].username);
    const playerProfile = await getProfile(playerId);
    return { player: playerProfile, tokens };
  }

  // Check if email already has an account (link the OAuth provider)
  const emailMatch = await query(
    'SELECT id, username FROM players WHERE email = $1',
    [profile.email.toLowerCase()]
  );

  if (emailMatch.rows.length > 0) {
    const player = emailMatch.rows[0];

    await query(
      `INSERT INTO oauth_accounts (player_id, provider, provider_id, provider_email, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [player.id, profile.provider, profile.providerId, profile.email.toLowerCase()]
    );

    await query(
      'UPDATE players SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
      [player.id]
    );

    const tokens = generateTokens(player.id, player.username);
    const playerProfile = await getProfile(player.id);
    return { player: playerProfile, tokens };
  }

  // New user — create account + link OAuth
  const id = uuidv4();
  const username = generateUniqueUsername(profile.displayName);
  const now = new Date();

  const player = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO players (id, username, email, password_hash, display_name, avatar_id, level, xp, gold, stardust, nebula_gems, created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [id, username.toLowerCase(), profile.email.toLowerCase(), 'oauth_no_password',
       profile.displayName, 'default', 1, 0, 500, 0, 0, now, now, now]
    );

    // Link OAuth account
    await client.query(
      `INSERT INTO oauth_accounts (player_id, provider, provider_id, provider_email, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, profile.provider, profile.providerId, profile.email.toLowerCase()]
    );

    // Initialize player stats
    await client.query(
      `INSERT INTO player_stats (player_id, games_played, games_won, games_lost, win_streak, best_win_streak, total_damage_dealt, total_cards_played, total_minions_killed, arena_wins, arena_best_run)
       VALUES ($1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
      [id]
    );

    // Initialize rank
    await client.query(
      `INSERT INTO player_ranks (player_id, tier, division, stars, mmr, peak_mmr, season_id)
       VALUES ($1, 'bronze', 10, 0, 1000, 1000, 'season_1')`,
      [id]
    );

    // Initialize login streak
    await client.query(
      `INSERT INTO login_streaks (player_id, current_streak, last_claimed_at, longest_streak)
       VALUES ($1, $2, $3, 1)`,
      [id, 1, now]
    );

    // Grant starter collection
    await client.query(
      `INSERT INTO player_collections (player_id, card_id, count, is_golden)
       SELECT $1, id, 2, false FROM cards WHERE rarity IN ('common', 'uncommon')`,
      [id]
    );

    return result.rows[0];
  });

  const tokens = generateTokens(id, player.username);
  const playerProfile = await getProfile(id);
  return { player: playerProfile, tokens };
}

/**
 * Fetch Google user profile using an access token.
 */
export async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Failed to fetch Google profile');

  const data = await response.json();
  return {
    provider: 'google',
    providerId: data.id,
    email: data.email,
    displayName: data.name || data.email.split('@')[0],
    avatarUrl: data.picture,
  };
}

/**
 * Fetch Discord user profile using an access token.
 */
export async function fetchDiscordProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Failed to fetch Discord profile');

  const data = await response.json();
  return {
    provider: 'discord',
    providerId: data.id,
    email: data.email,
    displayName: data.global_name || data.username,
    avatarUrl: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined,
  };
}

/**
 * Exchange an OAuth authorization code for access token (Google).
 */
export async function exchangeGoogleCode(code: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.google.clientId,
      client_secret: config.oauth.google.clientSecret,
      redirect_uri: config.oauth.google.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) throw new Error('Failed to exchange Google code');

  const data = await response.json();
  return data.access_token;
}

/**
 * Exchange an OAuth authorization code for access token (Discord).
 */
export async function exchangeDiscordCode(code: string): Promise<string> {
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.oauth.discord.clientId,
      client_secret: config.oauth.discord.clientSecret,
      redirect_uri: config.oauth.discord.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) throw new Error('Failed to exchange Discord code');

  const data = await response.json();
  return data.access_token;
}

/**
 * Get OAuth authorization URL for a provider.
 */
export function getAuthorizationUrl(provider: OAuthProvider): string {
  switch (provider) {
    case 'google':
      return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${config.oauth.google.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.oauth.google.callbackUrl)}` +
        `&response_type=code&scope=email%20profile&access_type=offline`;

    case 'discord':
      return `https://discord.com/api/oauth2/authorize?` +
        `client_id=${config.oauth.discord.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.oauth.discord.callbackUrl)}` +
        `&response_type=code&scope=identify%20email`;

    case 'apple':
      return `https://appleid.apple.com/auth/authorize?` +
        `client_id=${config.oauth.apple.clientId}` +
        `&redirect_uri=${encodeURIComponent(config.oauth.apple.callbackUrl)}` +
        `&response_type=code%20id_token&scope=name%20email&response_mode=form_post`;

    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

/**
 * Get linked OAuth accounts for a player.
 */
export async function getLinkedAccounts(playerId: string): Promise<{ provider: string; email: string; linkedAt: Date }[]> {
  const result = await query(
    'SELECT provider, provider_email, created_at FROM oauth_accounts WHERE player_id = $1',
    [playerId]
  );

  return result.rows.map(row => ({
    provider: row.provider,
    email: row.provider_email,
    linkedAt: row.created_at,
  }));
}

/**
 * Unlink an OAuth account from a player.
 */
export async function unlinkAccount(playerId: string, provider: OAuthProvider): Promise<void> {
  // Ensure the player has at least one other auth method
  const player = await query(
    'SELECT password_hash FROM players WHERE id = $1',
    [playerId]
  );
  const oauthCount = await query(
    'SELECT COUNT(*) as cnt FROM oauth_accounts WHERE player_id = $1',
    [playerId]
  );

  const hasPassword = player.rows[0]?.password_hash !== 'oauth_no_password';
  const linkedCount = parseInt(oauthCount.rows[0]?.cnt || '0');

  if (!hasPassword && linkedCount <= 1) {
    throw new Error('Cannot unlink last authentication method. Set a password first.');
  }

  await query(
    'DELETE FROM oauth_accounts WHERE player_id = $1 AND provider = $2',
    [playerId, provider]
  );
}

function generateUniqueUsername(displayName: string): string {
  const base = displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 14) || 'player';
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${base}${suffix}`;
}

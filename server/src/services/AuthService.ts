import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/database';
import { config } from '../config/env';
import { Player, PlayerProfile } from '../models/Player';

const SALT_ROUNDS = 12;
const XP_PER_LEVEL = 1000;
const STARTER_GOLD = 500;

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  player: PlayerProfile;
  tokens: AuthTokens;
}

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) {
    return 'Username must be 3-20 characters';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

function validateEmail(email: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email address';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
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

export async function register(input: RegisterInput): Promise<AuthResult> {
  const usernameErr = validateUsername(input.username);
  if (usernameErr) throw new Error(usernameErr);

  const emailErr = validateEmail(input.email);
  if (emailErr) throw new Error(emailErr);

  const passwordErr = validatePassword(input.password);
  if (passwordErr) throw new Error(passwordErr);

  const existing = await query(
    'SELECT id FROM players WHERE email = $1 OR username = $2',
    [input.email.toLowerCase(), input.username.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    throw new Error('Username or email already taken');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const id = uuidv4();
  const now = new Date();

  const player = await withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO players (id, username, email, password_hash, display_name, avatar_id, level, xp, gold, stardust, nebula_gems, created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [id, input.username.toLowerCase(), input.email.toLowerCase(), passwordHash,
       input.displayName || input.username, 'default', 1, 0, STARTER_GOLD, 0, 0, now, now, now]
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
       VALUES ($1, 1, $2, 1)`,
      [id, now]
    );

    // Grant starter collection (all common + uncommon cards)
    await client.query(
      `INSERT INTO player_collections (player_id, card_id, count, is_golden)
       SELECT $1, id, 2, false FROM cards WHERE rarity IN ('common', 'uncommon')`,
      [id]
    );

    return result.rows[0];
  });

  const tokens = generateTokens(id, player.username);
  const profile = await getProfile(id);

  return { player: profile, tokens };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const result = await query(
    'SELECT * FROM players WHERE email = $1',
    [input.email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const player = result.rows[0];
  const validPassword = await bcrypt.compare(input.password, player.password_hash);
  if (!validPassword) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  await query(
    'UPDATE players SET last_login_at = $1, updated_at = $1 WHERE id = $2',
    [new Date(), player.id]
  );

  // Update login streak
  await updateLoginStreak(player.id);

  const tokens = generateTokens(player.id, player.username);
  const profile = await getProfile(player.id);

  return { player: profile, tokens };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
      userId: string;
      username: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return generateTokens(decoded.userId, decoded.username);
  } catch {
    throw new Error('Invalid refresh token');
  }
}

export async function getProfile(playerId: string): Promise<PlayerProfile> {
  const result = await query(
    `SELECT p.*, ps.games_played, ps.games_won, ps.games_lost, ps.win_streak,
            ps.best_win_streak, ps.total_damage_dealt, ps.total_cards_played,
            ps.total_minions_killed, ps.favorite_race, ps.arena_wins, ps.arena_best_run,
            pr.tier, pr.division, pr.stars, pr.mmr, pr.peak_mmr, pr.season_id,
            ls.current_streak as login_streak
     FROM players p
     LEFT JOIN player_stats ps ON p.id = ps.player_id
     LEFT JOIN player_ranks pr ON p.id = pr.player_id
     LEFT JOIN login_streaks ls ON p.id = ls.player_id
     WHERE p.id = $1`,
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('Player not found');
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    stardust: row.stardust,
    nebulaGems: row.nebula_gems,
    rank: {
      tier: row.tier,
      division: row.division,
      stars: row.stars,
      mmr: row.mmr,
      peakMmr: row.peak_mmr,
      seasonId: row.season_id,
    },
    stats: {
      gamesPlayed: row.games_played,
      gamesWon: row.games_won,
      gamesLost: row.games_lost,
      winStreak: row.win_streak,
      bestWinStreak: row.best_win_streak,
      totalDamageDealt: row.total_damage_dealt,
      totalCardsPlayed: row.total_cards_played,
      totalMinionsKilled: row.total_minions_killed,
      favoriteRace: row.favorite_race,
      arenaWins: row.arena_wins,
      arenaBestRun: row.arena_best_run,
    },
    loginStreak: row.login_streak || 0,
    lastLoginAt: row.last_login_at,
  };
}

export async function updateProfile(
  playerId: string,
  updates: { displayName?: string; avatarId?: string }
): Promise<PlayerProfile> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.displayName) {
    sets.push(`display_name = $${idx++}`);
    values.push(updates.displayName);
  }
  if (updates.avatarId) {
    sets.push(`avatar_id = $${idx++}`);
    values.push(updates.avatarId);
  }

  if (sets.length > 0) {
    sets.push(`updated_at = $${idx++}`);
    values.push(new Date());
    values.push(playerId);

    await query(
      `UPDATE players SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  return getProfile(playerId);
}

export async function addCurrency(
  playerId: string,
  currency: { gold?: number; stardust?: number; nebulaGems?: number }
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (currency.gold) {
    sets.push(`gold = gold + $${idx++}`);
    values.push(currency.gold);
  }
  if (currency.stardust) {
    sets.push(`stardust = stardust + $${idx++}`);
    values.push(currency.stardust);
  }
  if (currency.nebulaGems) {
    sets.push(`nebula_gems = nebula_gems + $${idx++}`);
    values.push(currency.nebulaGems);
  }

  if (sets.length > 0) {
    values.push(playerId);
    await query(
      `UPDATE players SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );
  }
}

export async function addXp(playerId: string, amount: number): Promise<{ leveled: boolean; newLevel: number }> {
  const result = await query('SELECT xp, level FROM players WHERE id = $1', [playerId]);
  const { xp, level } = result.rows[0];
  const newXp = xp + amount;
  const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
  const leveled = newLevel > level;

  await query(
    'UPDATE players SET xp = $1, level = $2 WHERE id = $3',
    [newXp, newLevel, playerId]
  );

  return { leveled, newLevel };
}

async function updateLoginStreak(playerId: string): Promise<void> {
  const result = await query(
    'SELECT current_streak, last_claimed_at, longest_streak FROM login_streaks WHERE player_id = $1',
    [playerId]
  );

  if (result.rows.length === 0) return;

  const row = result.rows[0];
  const lastClaimed = new Date(row.last_claimed_at);
  const now = new Date();
  const daysSinceLast = Math.floor(
    (now.getTime() - lastClaimed.getTime()) / (24 * 60 * 60 * 1000)
  );

  let newStreak: number;
  if (daysSinceLast === 0) {
    return; // Already claimed today
  } else if (daysSinceLast === 1) {
    newStreak = row.current_streak + 1;
  } else {
    newStreak = 1; // Streak broken
  }

  const longestStreak = Math.max(row.longest_streak, newStreak);

  await query(
    `UPDATE login_streaks SET current_streak = $1, last_claimed_at = $2, longest_streak = $3
     WHERE player_id = $4`,
    [newStreak, now, longestStreak, playerId]
  );
}

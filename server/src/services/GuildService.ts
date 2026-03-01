/**
 * STARFORGE TCG - Guild Service
 *
 * Guilds/clans with membership, roles, guild chat, and guild wars.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/database';

export interface Guild {
  id: string;
  name: string;
  tag: string; // 2-5 char clan tag
  description: string;
  iconId: string;
  leaderId: string;
  memberCount: number;
  maxMembers: number;
  level: number;
  xp: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface GuildMember {
  playerId: string;
  username: string;
  displayName: string;
  role: 'leader' | 'officer' | 'member';
  joinedAt: Date;
  contributionXp: number;
}

export interface GuildWar {
  id: string;
  guild1Id: string;
  guild2Id: string;
  guild1Wins: number;
  guild2Wins: number;
  status: 'pending' | 'active' | 'completed';
  startedAt: Date;
  endsAt: Date;
}

const MAX_GUILD_MEMBERS = 50;

/**
 * Create a new guild.
 */
export async function createGuild(
  leaderId: string,
  name: string,
  tag: string,
  description: string,
): Promise<Guild> {
  if (name.length < 3 || name.length > 30) throw new Error('Name must be 3-30 characters');
  if (tag.length < 2 || tag.length > 5) throw new Error('Tag must be 2-5 characters');
  if (!/^[a-zA-Z0-9]+$/.test(tag)) throw new Error('Tag can only contain letters and numbers');

  // Check player isn't already in a guild
  const existing = await query(
    'SELECT guild_id FROM guild_members WHERE player_id = $1',
    [leaderId]
  );
  if (existing.rows.length > 0) throw new Error('Already in a guild');

  // Check name/tag uniqueness
  const nameCheck = await query(
    'SELECT id FROM guilds WHERE LOWER(name) = $1 OR LOWER(tag) = $2',
    [name.toLowerCase(), tag.toLowerCase()]
  );
  if (nameCheck.rows.length > 0) throw new Error('Guild name or tag already taken');

  const id = uuidv4();
  const now = new Date();

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO guilds (id, name, tag, description, icon_id, leader_id, member_count, max_members, level, xp, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7, 1, 0, true, $8)`,
      [id, name, tag.toUpperCase(), description, 'guild_default', leaderId, MAX_GUILD_MEMBERS, now]
    );

    await client.query(
      `INSERT INTO guild_members (guild_id, player_id, role, joined_at, contribution_xp)
       VALUES ($1, $2, 'leader', $3, 0)`,
      [id, leaderId, now]
    );

    return {
      id, name, tag: tag.toUpperCase(), description, iconId: 'guild_default',
      leaderId, memberCount: 1, maxMembers: MAX_GUILD_MEMBERS,
      level: 1, xp: 0, isPublic: true, createdAt: now,
    };
  });
}

/**
 * Get guild info.
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
  const result = await query('SELECT * FROM guilds WHERE id = $1', [guildId]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id, name: row.name, tag: row.tag, description: row.description,
    iconId: row.icon_id, leaderId: row.leader_id, memberCount: row.member_count,
    maxMembers: row.max_members, level: row.level, xp: row.xp,
    isPublic: row.is_public, createdAt: row.created_at,
  };
}

/**
 * Get guild members.
 */
export async function getMembers(guildId: string): Promise<GuildMember[]> {
  const result = await query(
    `SELECT gm.player_id, p.username, p.display_name, gm.role, gm.joined_at, gm.contribution_xp
     FROM guild_members gm JOIN players p ON gm.player_id = p.id
     WHERE gm.guild_id = $1
     ORDER BY CASE gm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END, gm.joined_at`,
    [guildId]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    playerId: row.player_id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    role: row.role as 'leader' | 'officer' | 'member',
    joinedAt: row.joined_at as Date,
    contributionXp: row.contribution_xp as number,
  }));
}

/**
 * Join a public guild.
 */
export async function joinGuild(playerId: string, guildId: string): Promise<void> {
  const existing = await query('SELECT guild_id FROM guild_members WHERE player_id = $1', [playerId]);
  if (existing.rows.length > 0) throw new Error('Already in a guild');

  const guild = await getGuild(guildId);
  if (!guild) throw new Error('Guild not found');
  if (!guild.isPublic) throw new Error('Guild is invite-only');
  if (guild.memberCount >= guild.maxMembers) throw new Error('Guild is full');

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO guild_members (guild_id, player_id, role, joined_at, contribution_xp)
       VALUES ($1, $2, 'member', NOW(), 0)`,
      [guildId, playerId]
    );
    await client.query(
      'UPDATE guilds SET member_count = member_count + 1 WHERE id = $1',
      [guildId]
    );
  });
}

/**
 * Leave a guild.
 */
export async function leaveGuild(playerId: string, guildId: string): Promise<void> {
  const guild = await getGuild(guildId);
  if (!guild) throw new Error('Guild not found');
  if (guild.leaderId === playerId) throw new Error('Leader cannot leave. Transfer leadership first.');

  await withTransaction(async (client) => {
    await client.query(
      'DELETE FROM guild_members WHERE guild_id = $1 AND player_id = $2',
      [guildId, playerId]
    );
    await client.query(
      'UPDATE guilds SET member_count = member_count - 1 WHERE id = $1',
      [guildId]
    );
  });
}

/**
 * Promote or demote a member.
 */
export async function setRole(
  guildId: string,
  actorId: string,
  targetId: string,
  newRole: 'officer' | 'member',
): Promise<void> {
  const guild = await getGuild(guildId);
  if (!guild) throw new Error('Guild not found');

  // Only leader can promote/demote
  const actor = await query(
    'SELECT role FROM guild_members WHERE guild_id = $1 AND player_id = $2',
    [guildId, actorId]
  );
  if (actor.rows[0]?.role !== 'leader') throw new Error('Only the leader can change roles');

  await query(
    'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND player_id = $3',
    [newRole, guildId, targetId]
  );
}

/**
 * Transfer leadership.
 */
export async function transferLeadership(guildId: string, currentLeaderId: string, newLeaderId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND player_id = $3',
      ['member', guildId, currentLeaderId]
    );
    await client.query(
      'UPDATE guild_members SET role = $1 WHERE guild_id = $2 AND player_id = $3',
      ['leader', guildId, newLeaderId]
    );
    await client.query(
      'UPDATE guilds SET leader_id = $1 WHERE id = $2',
      [newLeaderId, guildId]
    );
  });
}

/**
 * Search for guilds.
 */
export async function searchGuilds(searchTerm: string, limit: number = 20): Promise<Guild[]> {
  const result = await query(
    `SELECT * FROM guilds
     WHERE is_public = true AND (LOWER(name) LIKE $1 OR LOWER(tag) LIKE $1)
     ORDER BY member_count DESC LIMIT $2`,
    [`%${searchTerm.toLowerCase()}%`, limit]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string, name: row.name as string, tag: row.tag as string,
    description: row.description as string, iconId: row.icon_id as string,
    leaderId: row.leader_id as string, memberCount: row.member_count as number,
    maxMembers: row.max_members as number, level: row.level as number,
    xp: row.xp as number, isPublic: row.is_public as boolean,
    createdAt: row.created_at as Date,
  }));
}

/**
 * Get player's guild.
 */
export async function getPlayerGuild(playerId: string): Promise<Guild | null> {
  const result = await query(
    `SELECT g.* FROM guilds g JOIN guild_members gm ON g.id = gm.guild_id WHERE gm.player_id = $1`,
    [playerId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id, name: row.name, tag: row.tag, description: row.description,
    iconId: row.icon_id, leaderId: row.leader_id, memberCount: row.member_count,
    maxMembers: row.max_members, level: row.level, xp: row.xp,
    isPublic: row.is_public, createdAt: row.created_at,
  };
}

/**
 * Add guild XP (from member games).
 */
export async function addGuildXp(guildId: string, playerId: string, amount: number): Promise<void> {
  await query(
    'UPDATE guilds SET xp = xp + $1 WHERE id = $2',
    [amount, guildId]
  );
  await query(
    'UPDATE guild_members SET contribution_xp = contribution_xp + $1 WHERE guild_id = $2 AND player_id = $3',
    [amount, guildId, playerId]
  );
}

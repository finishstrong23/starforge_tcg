/**
 * STARFORGE TCG - Chat Service
 *
 * In-game chat system (opt-in) with mute, report, and content filtering.
 */

import { query } from '../config/database';

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'emote' | 'system';
  createdAt: Date;
}

export interface ChatChannel {
  id: string;
  type: 'game' | 'guild' | 'whisper' | 'global';
  name: string;
  participants: string[];
}

// Profanity filter (basic word list)
const FILTERED_WORDS = new Set([
  // Placeholder — in production use a comprehensive filter library
  'spam', 'scam', 'hack', 'cheat', 'exploit',
]);

// Rate limiting per player
const messageCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_MESSAGES_PER_MINUTE = 10;

/**
 * Send a chat message.
 */
export async function sendMessage(
  senderId: string,
  senderName: string,
  channelId: string,
  content: string,
): Promise<ChatMessage> {
  // Rate limit check
  const now = Date.now();
  const limit = messageCounts.get(senderId);
  if (limit && now < limit.resetAt) {
    if (limit.count >= MAX_MESSAGES_PER_MINUTE) {
      throw new Error('Too many messages. Please wait.');
    }
    limit.count++;
  } else {
    messageCounts.set(senderId, { count: 1, resetAt: now + 60000 });
  }

  // Content filtering
  const filtered = filterContent(content);
  if (filtered.blocked) {
    throw new Error('Message contains inappropriate content');
  }

  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    channelId,
    senderId,
    senderName,
    content: filtered.content,
    type: 'text',
    createdAt: new Date(),
  };

  // Store in DB
  try {
    await query(
      `INSERT INTO chat_messages (id, channel_id, sender_id, sender_name, content, type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [message.id, channelId, senderId, senderName, filtered.content, 'text', message.createdAt]
    );
  } catch {
    // Non-critical — message still delivered via WebSocket
  }

  return message;
}

/**
 * Get recent messages in a channel.
 */
export async function getMessages(channelId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const result = await query(
      `SELECT id, channel_id, sender_id, sender_name, content, type, created_at
       FROM chat_messages
       WHERE channel_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [channelId, limit]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      channelId: row.channel_id as string,
      senderId: row.sender_id as string,
      senderName: row.sender_name as string,
      content: row.content as string,
      type: row.type as 'text' | 'emote' | 'system',
      createdAt: row.created_at as Date,
    })).reverse();
  } catch {
    return [];
  }
}

/**
 * Mute a player.
 */
export async function mutePlayer(playerId: string, mutedPlayerId: string): Promise<void> {
  await query(
    `INSERT INTO player_mutes (player_id, muted_player_id, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (player_id, muted_player_id) DO NOTHING`,
    [playerId, mutedPlayerId]
  );
}

/**
 * Unmute a player.
 */
export async function unmutePlayer(playerId: string, mutedPlayerId: string): Promise<void> {
  await query(
    'DELETE FROM player_mutes WHERE player_id = $1 AND muted_player_id = $2',
    [playerId, mutedPlayerId]
  );
}

/**
 * Get muted players for a user.
 */
export async function getMutedPlayers(playerId: string): Promise<string[]> {
  try {
    const result = await query(
      'SELECT muted_player_id FROM player_mutes WHERE player_id = $1',
      [playerId]
    );
    return result.rows.map((r: Record<string, unknown>) => r.muted_player_id as string);
  } catch {
    return [];
  }
}

/**
 * Report a player for chat behavior.
 */
export async function reportPlayer(
  reporterId: string,
  reportedPlayerId: string,
  reason: string,
  messageId?: string,
): Promise<void> {
  await query(
    `INSERT INTO player_reports (reporter_id, reported_player_id, reason, message_id, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())`,
    [reporterId, reportedPlayerId, reason, messageId || null]
  );
}

/**
 * Filter content for profanity and spam.
 */
function filterContent(content: string): { content: string; blocked: boolean } {
  if (content.length > 500) {
    return { content: '', blocked: true };
  }

  if (content.trim().length === 0) {
    return { content: '', blocked: true };
  }

  let filtered = content;
  let blocked = false;

  // Check for filtered words
  const words = content.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (FILTERED_WORDS.has(word)) {
      filtered = filtered.replace(new RegExp(`\\b${word}\\b`, 'gi'), '***');
    }
  }

  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (content.length > 10 && capsRatio > 0.7) {
    filtered = filtered.toLowerCase();
  }

  return { content: filtered, blocked };
}

/**
 * Get or create a game chat channel.
 */
export function getGameChannelId(gameId: string): string {
  return `game:${gameId}`;
}

/**
 * Get or create a guild chat channel.
 */
export function getGuildChannelId(guildId: string): string {
  return `guild:${guildId}`;
}

/**
 * Get or create a whisper channel between two players.
 */
export function getWhisperChannelId(player1Id: string, player2Id: string): string {
  const sorted = [player1Id, player2Id].sort();
  return `whisper:${sorted[0]}:${sorted[1]}`;
}

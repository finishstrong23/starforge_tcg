/**
 * STARFORGE TCG - Deck Sharing Hub
 *
 * In-game deck sharing, browsing popular/winning decks, and community ratings.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export interface SharedDeck {
  id: string;
  playerId: string;
  playerName: string;
  name: string;
  race: string;
  description: string;
  cardIds: string[];
  deckCode: string;
  tags: string[];
  winRate: number;
  gamesPlayed: number;
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckComment {
  id: string;
  deckId: string;
  playerId: string;
  playerName: string;
  content: string;
  createdAt: Date;
}

/**
 * Share a deck to the public hub.
 */
export async function shareDeck(
  playerId: string,
  playerName: string,
  deck: {
    name: string;
    race: string;
    description: string;
    cardIds: string[];
    tags: string[];
  },
): Promise<SharedDeck> {
  const id = uuidv4();
  const deckCode = encodeDeckCode(deck.race, deck.cardIds);
  const now = new Date();

  try {
    await query(
      `INSERT INTO shared_decks (id, player_id, player_name, name, race, description, card_ids, deck_code, tags, win_rate, games_played, likes, views, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0, 0, $10, $10)`,
      [id, playerId, playerName, deck.name, deck.race,
       deck.description, JSON.stringify(deck.cardIds), deckCode,
       JSON.stringify(deck.tags), now]
    );
  } catch {
    // Non-critical if DB not available
  }

  return {
    id, playerId, playerName,
    name: deck.name, race: deck.race, description: deck.description,
    cardIds: deck.cardIds, deckCode, tags: deck.tags,
    winRate: 0, gamesPlayed: 0, likes: 0, views: 0,
    createdAt: now, updatedAt: now,
  };
}

/**
 * Browse shared decks with filters.
 */
export async function browseDecks(filters?: {
  race?: string;
  tag?: string;
  sortBy?: 'popular' | 'newest' | 'winrate' | 'likes';
  limit?: number;
  offset?: number;
}): Promise<SharedDeck[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.race) {
      conditions.push(`race = $${idx++}`);
      values.push(filters.race);
    }
    if (filters?.tag) {
      conditions.push(`tags::text LIKE $${idx++}`);
      values.push(`%${filters.tag}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy: string;
    switch (filters?.sortBy) {
      case 'newest': orderBy = 'created_at DESC'; break;
      case 'winrate': orderBy = 'win_rate DESC'; break;
      case 'likes': orderBy = 'likes DESC'; break;
      default: orderBy = 'views DESC, likes DESC'; break;
    }

    const limit = Math.min(filters?.limit || 20, 100);
    const offset = Math.max(filters?.offset || 0, 0);

    const result = await query(
      `SELECT * FROM shared_decks ${where} ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );

    return result.rows.map(mapDeckRow);
  } catch {
    return [];
  }
}

/**
 * Get a specific shared deck.
 */
export async function getDeck(deckId: string): Promise<SharedDeck | null> {
  try {
    // Increment view count
    await query('UPDATE shared_decks SET views = views + 1 WHERE id = $1', [deckId]);

    const result = await query('SELECT * FROM shared_decks WHERE id = $1', [deckId]);
    if (result.rows.length === 0) return null;
    return mapDeckRow(result.rows[0]);
  } catch {
    return null;
  }
}

/**
 * Like a deck.
 */
export async function likeDeck(playerId: string, deckId: string): Promise<void> {
  try {
    await query(
      `INSERT INTO deck_likes (player_id, deck_id, created_at) VALUES ($1, $2, NOW())
       ON CONFLICT (player_id, deck_id) DO NOTHING`,
      [playerId, deckId]
    );
    await query('UPDATE shared_decks SET likes = likes + 1 WHERE id = $1', [deckId]);
  } catch {
    // Ignore duplicate likes
  }
}

/**
 * Import a deck from a deck code.
 */
export function decodeDeckCode(code: string): { race: string; cardIds: string[] } | null {
  try {
    const decoded = JSON.parse(Buffer.from(code, 'base64url').toString());
    return { race: decoded.r, cardIds: decoded.c };
  } catch {
    return null;
  }
}

/**
 * Generate a deck code.
 */
export function encodeDeckCode(race: string, cardIds: string[]): string {
  return Buffer.from(JSON.stringify({ r: race, c: cardIds })).toString('base64url');
}

/**
 * Get comments on a deck.
 */
export async function getComments(deckId: string, limit: number = 50): Promise<DeckComment[]> {
  try {
    const result = await query(
      `SELECT id, deck_id, player_id, player_name, content, created_at
       FROM deck_comments WHERE deck_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [deckId, limit]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      deckId: row.deck_id as string,
      playerId: row.player_id as string,
      playerName: row.player_name as string,
      content: row.content as string,
      createdAt: row.created_at as Date,
    }));
  } catch {
    return [];
  }
}

/**
 * Add a comment to a deck.
 */
export async function addComment(
  playerId: string,
  playerName: string,
  deckId: string,
  content: string,
): Promise<DeckComment> {
  const id = uuidv4();
  const now = new Date();

  await query(
    `INSERT INTO deck_comments (id, deck_id, player_id, player_name, content, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, deckId, playerId, playerName, content, now]
  );

  return { id, deckId, playerId, playerName, content, createdAt: now };
}

function mapDeckRow(row: Record<string, unknown>): SharedDeck {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    playerName: row.player_name as string,
    name: row.name as string,
    race: row.race as string,
    description: row.description as string,
    cardIds: JSON.parse(row.card_ids as string || '[]'),
    deckCode: row.deck_code as string,
    tags: JSON.parse(row.tags as string || '[]'),
    winRate: parseFloat(row.win_rate as string) || 0,
    gamesPlayed: row.games_played as number || 0,
    likes: row.likes as number || 0,
    views: row.views as number || 0,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * STARFORGE TCG - Crafting Service
 *
 * Server-authoritative crafting system:
 * - Disenchant cards into Stardust
 * - Craft specific cards using Stardust
 * - Bulk disenchant extras (keeps max 2 copies)
 * - All operations are atomic with audit logging
 */

import { query, withTransaction } from '../config/database';

// ── Dust Values (matching client-side CraftingSystem.ts) ────────

export const DUST_VALUES = {
  DISENCHANT: {
    common: 5,
    rare: 20,
    epic: 100,
    legendary: 400,
  } as Record<string, number>,
  CRAFT: {
    common: 40,
    rare: 100,
    epic: 400,
    legendary: 1600,
  } as Record<string, number>,
};

// ── Public Types ────────────────────────────────────────────────

export interface CollectionCard {
  cardId: string;
  name: string;
  rarity: string;
  race: string;
  count: number;
  isGolden: boolean;
}

export interface CraftResult {
  cardId: string;
  rarity: string;
  dustSpent: number;
  newStardust: number;
  newCount: number;
}

export interface DisenchantResult {
  cardId: string;
  rarity: string;
  dustGained: number;
  newStardust: number;
  newCount: number;
}

export interface BulkDisenchantResult {
  cardsDisenchanted: number;
  dustGained: number;
  newStardust: number;
  details: Array<{ cardId: string; rarity: string; count: number; dust: number }>;
}

// ── Public API ──────────────────────────────────────────────────

/** Get player's full card collection */
export async function getCollection(playerId: string): Promise<CollectionCard[]> {
  const result = await query(
    `SELECT pc.card_id, c.name, c.rarity, c.race, pc.count, pc.is_golden
     FROM player_collections pc
     JOIN cards c ON pc.card_id = c.id
     WHERE pc.player_id = $1
     ORDER BY c.race, c.mana_cost, c.name`,
    [playerId]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    cardId: row.card_id as string,
    name: row.name as string,
    rarity: (row.rarity as string).toLowerCase(),
    race: row.race as string,
    count: row.count as number,
    isGolden: row.is_golden as boolean,
  }));
}

/** Craft a specific card. Spends stardust, adds card to collection. */
export async function craftCard(playerId: string, cardId: string): Promise<CraftResult> {
  return withTransaction(async (client) => {
    // 1. Get card info (validate it exists and is collectible)
    const cardResult = await client.query(
      'SELECT id, rarity FROM cards WHERE id = $1 AND is_collectible = true',
      [cardId]
    );
    if (cardResult.rows.length === 0) {
      throw new Error('Card not found or not collectible');
    }

    const rarity = (cardResult.rows[0].rarity as string).toLowerCase();
    const cost = DUST_VALUES.CRAFT[rarity];
    if (!cost) throw new Error('Unknown rarity');

    // 2. Check duplicate protection for legendaries (max 2)
    if (rarity === 'legendary') {
      const ownedResult = await client.query(
        `SELECT count FROM player_collections WHERE player_id = $1 AND card_id = $2 AND is_golden = false`,
        [playerId, cardId]
      );
      if (ownedResult.rows.length > 0 && ownedResult.rows[0].count >= 2) {
        throw new Error('Cannot craft more than 2 copies of a Legendary card');
      }
    }

    // 3. Deduct stardust
    const dustResult = await client.query(
      `UPDATE players SET stardust = stardust - $1, updated_at = NOW()
       WHERE id = $2 AND stardust >= $1
       RETURNING stardust`,
      [cost, playerId]
    );
    if (dustResult.rows.length === 0) {
      throw new Error('Insufficient stardust');
    }

    const newStardust = dustResult.rows[0].stardust;

    // 4. Add card to collection
    const collResult = await client.query(
      `INSERT INTO player_collections (player_id, card_id, count, is_golden)
       VALUES ($1, $2, 1, false)
       ON CONFLICT (player_id, card_id, is_golden)
       DO UPDATE SET count = player_collections.count + 1
       RETURNING count`,
      [playerId, cardId]
    );

    // 5. Log transaction
    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'stardust', $2, $3, 'craft', $4)`,
      [playerId, -cost, newStardust, cardId]
    );

    await client.query(
      `INSERT INTO crafting_log (player_id, action, card_id, rarity, dust_amount)
       VALUES ($1, 'craft', $2, $3, $4)`,
      [playerId, cardId, rarity, -cost]
    );

    return {
      cardId,
      rarity,
      dustSpent: cost,
      newStardust,
      newCount: collResult.rows[0].count,
    };
  });
}

/** Disenchant one copy of a card. Gains stardust. */
export async function disenchantCard(playerId: string, cardId: string): Promise<DisenchantResult> {
  return withTransaction(async (client) => {
    // 1. Check player owns this card
    const collResult = await client.query(
      `SELECT pc.count, c.rarity FROM player_collections pc
       JOIN cards c ON pc.card_id = c.id
       WHERE pc.player_id = $1 AND pc.card_id = $2 AND pc.is_golden = false`,
      [playerId, cardId]
    );

    if (collResult.rows.length === 0 || collResult.rows[0].count <= 0) {
      throw new Error('Card not owned');
    }

    const rarity = (collResult.rows[0].rarity as string).toLowerCase();
    const dustValue = DUST_VALUES.DISENCHANT[rarity];
    if (!dustValue) throw new Error('Unknown rarity');

    // 2. Remove one copy
    const newCount = collResult.rows[0].count - 1;
    if (newCount <= 0) {
      await client.query(
        `DELETE FROM player_collections WHERE player_id = $1 AND card_id = $2 AND is_golden = false`,
        [playerId, cardId]
      );
    } else {
      await client.query(
        `UPDATE player_collections SET count = $1 WHERE player_id = $2 AND card_id = $3 AND is_golden = false`,
        [newCount, playerId, cardId]
      );
    }

    // 3. Grant stardust
    const dustResult = await client.query(
      `UPDATE players SET stardust = stardust + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING stardust`,
      [dustValue, playerId]
    );

    const newStardust = dustResult.rows[0].stardust;

    // 4. Log transaction
    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'stardust', $2, $3, 'disenchant', $4)`,
      [playerId, dustValue, newStardust, cardId]
    );

    await client.query(
      `INSERT INTO crafting_log (player_id, action, card_id, rarity, dust_amount)
       VALUES ($1, 'disenchant', $2, $3, $4)`,
      [playerId, cardId, rarity, dustValue]
    );

    return {
      cardId,
      rarity,
      dustGained: dustValue,
      newStardust,
      newCount: Math.max(0, newCount),
    };
  });
}

/** Bulk disenchant all copies beyond maxCopies (default 2). */
export async function disenchantExtras(
  playerId: string,
  maxCopies: number = 2,
): Promise<BulkDisenchantResult> {
  return withTransaction(async (client) => {
    // Find all cards with more than maxCopies
    const result = await client.query(
      `SELECT pc.card_id, pc.count, c.rarity
       FROM player_collections pc
       JOIN cards c ON pc.card_id = c.id
       WHERE pc.player_id = $1 AND pc.is_golden = false AND pc.count > $2`,
      [playerId, maxCopies]
    );

    let totalDust = 0;
    let totalCards = 0;
    const details: Array<{ cardId: string; rarity: string; count: number; dust: number }> = [];

    for (const row of result.rows) {
      const excess = row.count - maxCopies;
      const rarity = (row.rarity as string).toLowerCase();
      const dustPer = DUST_VALUES.DISENCHANT[rarity] || 0;
      const dust = excess * dustPer;

      totalDust += dust;
      totalCards += excess;

      // Reduce count to maxCopies
      await client.query(
        `UPDATE player_collections SET count = $1 WHERE player_id = $2 AND card_id = $3 AND is_golden = false`,
        [maxCopies, playerId, row.card_id]
      );

      // Log each card type
      await client.query(
        `INSERT INTO crafting_log (player_id, action, card_id, rarity, dust_amount)
         VALUES ($1, 'disenchant_bulk', $2, $3, $4)`,
        [playerId, row.card_id, rarity, dust]
      );

      details.push({ cardId: row.card_id, rarity, count: excess, dust });
    }

    // Grant total stardust
    let newStardust = 0;
    if (totalDust > 0) {
      const dustResult = await client.query(
        `UPDATE players SET stardust = stardust + $1, updated_at = NOW()
         WHERE id = $2 RETURNING stardust`,
        [totalDust, playerId]
      );
      newStardust = dustResult.rows[0].stardust;

      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason)
         VALUES ($1, 'stardust', $2, $3, 'disenchant_bulk')`,
        [playerId, totalDust, newStardust]
      );
    } else {
      const bal = await client.query('SELECT stardust FROM players WHERE id = $1', [playerId]);
      newStardust = bal.rows[0].stardust;
    }

    return {
      cardsDisenchanted: totalCards,
      dustGained: totalDust,
      newStardust,
      details,
    };
  });
}

/** Get dust value tables (for client display) */
export function getDustValues(): typeof DUST_VALUES {
  return DUST_VALUES;
}

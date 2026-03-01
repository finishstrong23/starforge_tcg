/**
 * STARFORGE TCG - Pack Opening Service
 *
 * Server-authoritative pack opening:
 * - All RNG is server-side (prevents client manipulation)
 * - Pity timer: guaranteed Legendary every 40 packs (ROADMAP spec)
 * - Duplicate protection: max 2 of same Legendary
 * - Adds cards to player collection atomically
 * - Logs pack opens for analytics
 */

import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/database';
import * as EconomyService from './EconomyService';

// ── Pack Type Definitions ──────────────────────────────────────

export interface PackType {
  id: string;
  name: string;
  description: string;
  cost: number;
  cardCount: number;
  guaranteedRarity: string;
  weights: [number, number, number, number]; // [common, rare, epic, legendary]
}

export interface PackCard {
  cardId: string;
  name: string;
  rarity: string;
  race: string;
  isNew: boolean;
}

export interface PackResult {
  packId: string;
  packType: string;
  cards: PackCard[];
  pityTriggered: boolean;
  goldSpent: number;
  newGoldBalance: number;
}

const PITY_TIMER = 40; // Guaranteed legendary every 40 packs (ROADMAP spec)

export const PACK_TYPES: PackType[] = [
  {
    id: 'standard',
    name: 'Standard Pack',
    description: '5 cards, guaranteed Rare or better',
    cost: 100,
    cardCount: 5,
    guaranteedRarity: 'rare',
    weights: [70, 20, 8, 2],
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    description: '5 cards, guaranteed Epic or better',
    cost: 250,
    cardCount: 5,
    guaranteedRarity: 'epic',
    weights: [50, 30, 15, 5],
  },
  {
    id: 'legendary',
    name: 'Legendary Pack',
    description: '5 cards, guaranteed Legendary',
    cost: 500,
    cardCount: 5,
    guaranteedRarity: 'legendary',
    weights: [40, 25, 20, 15],
  },
];

// ── Public API ──────────────────────────────────────────────────

/** Get available pack types and costs */
export function getPackTypes(): PackType[] {
  return PACK_TYPES;
}

/** Purchase and open a pack. Returns the cards obtained. */
export async function purchasePack(
  playerId: string,
  packTypeId: string,
): Promise<PackResult> {
  const packType = PACK_TYPES.find(p => p.id === packTypeId);
  if (!packType) throw new Error('Invalid pack type');

  const packId = uuidv4();

  return withTransaction(async (client) => {
    // 1. Deduct gold (fails if insufficient)
    const goldResult = await client.query(
      `UPDATE players SET gold = gold - $1, updated_at = NOW()
       WHERE id = $2 AND gold >= $1
       RETURNING gold`,
      [packType.cost, playerId]
    );

    if (goldResult.rows.length === 0) {
      throw new Error('Insufficient gold');
    }

    const newGoldBalance = goldResult.rows[0].gold;

    // Log gold transaction
    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'gold', $2, $3, 'pack_purchase', $4)`,
      [playerId, -packType.cost, newGoldBalance, packId]
    );

    // 2. Get pity state
    const pityResult = await client.query(
      `SELECT total_opened, packs_since_legendary FROM pack_state WHERE player_id = $1`,
      [playerId]
    );

    let totalOpened = 0;
    let packsSinceLegendary = 0;
    if (pityResult.rows.length > 0) {
      totalOpened = pityResult.rows[0].total_opened;
      packsSinceLegendary = pityResult.rows[0].packs_since_legendary;
    }

    // 3. Get collectible card pool from DB
    const cardPool = await client.query(
      `SELECT id, name, rarity, race FROM cards WHERE is_collectible = true`
    );

    if (cardPool.rows.length === 0) {
      throw new Error('Card pool is empty — seed the cards table first');
    }

    // 4. Get player's existing collection for duplicate protection + "new" detection
    const collectionResult = await client.query(
      `SELECT card_id, count FROM player_collections WHERE player_id = $1 AND is_golden = false`,
      [playerId]
    );
    const owned = new Map<string, number>();
    for (const row of collectionResult.rows) {
      owned.set(row.card_id, row.count);
    }

    // 5. Roll cards server-side
    const needsPity = packsSinceLegendary >= PITY_TIMER - 1;
    const cards: PackCard[] = [];
    let gotLegendary = false;
    const pityTriggered = false;

    const pool = cardPool.rows;
    const byRarity = new Map<string, typeof pool>();
    for (const card of pool) {
      const r = card.rarity.toLowerCase();
      if (!byRarity.has(r)) byRarity.set(r, []);
      byRarity.get(r)!.push(card);
    }

    let pityUsed = false;
    for (let i = 0; i < packType.cardCount; i++) {
      let rarity: string;

      if (i === 0) {
        // First card: guaranteed minimum rarity
        rarity = packType.guaranteedRarity;
      } else if (i === packType.cardCount - 1 && needsPity && !gotLegendary) {
        // Last card: pity timer forces legendary
        rarity = 'legendary';
        pityUsed = true;
      } else {
        rarity = rollRarity(packType.weights);
      }

      if (rarity === 'legendary') gotLegendary = true;

      // Pick a card of this rarity with duplicate protection for legendaries
      let candidates = byRarity.get(rarity) || [];

      if (rarity === 'legendary' && candidates.length > 0) {
        // Duplicate protection: skip legendaries the player already has 2 of
        const filtered = candidates.filter(c => (owned.get(c.id) || 0) < 2);
        if (filtered.length > 0) candidates = filtered;
      }

      if (candidates.length === 0) {
        // Fallback to any card
        candidates = pool;
      }

      const card = candidates[Math.floor(Math.random() * candidates.length)];
      const isNew = !owned.has(card.id);

      cards.push({
        cardId: card.id,
        name: card.name,
        rarity: card.rarity,
        race: card.race,
        isNew,
      });

      // Track for duplicate protection within same pack
      owned.set(card.id, (owned.get(card.id) || 0) + 1);
    }

    // 6. Add cards to collection
    for (const card of cards) {
      await client.query(
        `INSERT INTO player_collections (player_id, card_id, count, is_golden)
         VALUES ($1, $2, 1, false)
         ON CONFLICT (player_id, card_id, is_golden)
         DO UPDATE SET count = player_collections.count + 1`,
        [playerId, card.cardId]
      );
    }

    // 7. Record pack opening
    await client.query(
      `INSERT INTO pack_openings (id, player_id, pack_type, cost, pity_triggered, opened_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [packId, playerId, packType.id, packType.cost, pityUsed]
    );

    // Record individual cards
    for (const card of cards) {
      await client.query(
        `INSERT INTO pack_cards (pack_opening_id, card_id, rarity, is_new)
         VALUES ($1, $2, $3, $4)`,
        [packId, card.cardId, card.rarity, card.isNew]
      );
    }

    // 8. Update pity state
    const newPacksSinceLegendary = gotLegendary ? 0 : packsSinceLegendary + 1;
    await client.query(
      `INSERT INTO pack_state (player_id, total_opened, packs_since_legendary)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id)
       DO UPDATE SET total_opened = $2, packs_since_legendary = $3`,
      [playerId, totalOpened + 1, newPacksSinceLegendary]
    );

    return {
      packId,
      packType: packType.id,
      cards,
      pityTriggered: pityUsed,
      goldSpent: packType.cost,
      newGoldBalance,
    };
  });
}

/** Get player's pack state (pity counter, total opened) */
export async function getPackState(playerId: string): Promise<{
  totalOpened: number;
  packsSinceLegendary: number;
  pityTimer: number;
}> {
  const result = await query(
    'SELECT total_opened, packs_since_legendary FROM pack_state WHERE player_id = $1',
    [playerId]
  );

  if (result.rows.length === 0) {
    return { totalOpened: 0, packsSinceLegendary: 0, pityTimer: PITY_TIMER };
  }

  return {
    totalOpened: result.rows[0].total_opened,
    packsSinceLegendary: result.rows[0].packs_since_legendary,
    pityTimer: PITY_TIMER,
  };
}

/** Get pack opening history */
export async function getPackHistory(
  playerId: string,
  limit: number = 20,
): Promise<Array<{ packId: string; packType: string; cost: number; pityTriggered: boolean; openedAt: Date }>> {
  const result = await query(
    `SELECT id, pack_type, cost, pity_triggered, opened_at
     FROM pack_openings WHERE player_id = $1
     ORDER BY opened_at DESC LIMIT $2`,
    [playerId, limit]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    packId: row.id as string,
    packType: row.pack_type as string,
    cost: row.cost as number,
    pityTriggered: row.pity_triggered as boolean,
    openedAt: row.opened_at as Date,
  }));
}

// ── Internal helpers ────────────────────────────────────────────

function rollRarity(weights: [number, number, number, number]): string {
  const total = weights[0] + weights[1] + weights[2] + weights[3];
  let roll = Math.random() * total;

  if (roll < weights[0]) return 'common';
  roll -= weights[0];
  if (roll < weights[1]) return 'rare';
  roll -= weights[1];
  if (roll < weights[2]) return 'epic';
  return 'legendary';
}

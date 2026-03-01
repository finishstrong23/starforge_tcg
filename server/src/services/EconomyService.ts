/**
 * STARFORGE TCG - Economy Service
 *
 * Central currency management with atomic balance checks and transaction logging.
 * All currency operations go through this service to maintain audit trail.
 */

import { query, withTransaction } from '../config/database';

export type CurrencyType = 'gold' | 'stardust' | 'nebula_gems';

export interface CurrencyBalance {
  gold: number;
  stardust: number;
  nebulaGems: number;
}

export interface TransactionRecord {
  id: number;
  currencyType: CurrencyType;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

/** Get a player's current currency balances */
export async function getBalance(playerId: string): Promise<CurrencyBalance> {
  const result = await query(
    'SELECT gold, stardust, nebula_gems FROM players WHERE id = $1',
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('Player not found');
  }

  const row = result.rows[0];
  return {
    gold: row.gold,
    stardust: row.stardust,
    nebulaGems: row.nebula_gems,
  };
}

/**
 * Spend gold atomically. Returns new balance.
 * Throws if insufficient funds (also enforced by DB constraint).
 */
export async function spendGold(
  playerId: string,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive');

  return withTransaction(async (client) => {
    // Deduct gold with balance check
    const result = await client.query(
      `UPDATE players SET gold = gold - $1, updated_at = NOW()
       WHERE id = $2 AND gold >= $1
       RETURNING gold`,
      [amount, playerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Insufficient gold');
    }

    const newBalance = result.rows[0].gold;

    // Log transaction
    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'gold', $2, $3, $4, $5)`,
      [playerId, -amount, newBalance, reason, referenceId || null]
    );

    return newBalance;
  });
}

/**
 * Spend stardust atomically. Returns new balance.
 */
export async function spendStardust(
  playerId: string,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive');

  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE players SET stardust = stardust - $1, updated_at = NOW()
       WHERE id = $2 AND stardust >= $1
       RETURNING stardust`,
      [amount, playerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Insufficient stardust');
    }

    const newBalance = result.rows[0].stardust;

    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'stardust', $2, $3, $4, $5)`,
      [playerId, -amount, newBalance, reason, referenceId || null]
    );

    return newBalance;
  });
}

/**
 * Spend Nebula Gems atomically. Returns new balance.
 */
export async function spendNebulaGems(
  playerId: string,
  amount: number,
  reason: string,
  referenceId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive');

  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE players SET nebula_gems = nebula_gems - $1, updated_at = NOW()
       WHERE id = $2 AND nebula_gems >= $1
       RETURNING nebula_gems`,
      [amount, playerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Insufficient Nebula Gems');
    }

    const newBalance = result.rows[0].nebula_gems;

    await client.query(
      `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
       VALUES ($1, 'nebula_gems', $2, $3, $4, $5)`,
      [playerId, -amount, newBalance, reason, referenceId || null]
    );

    return newBalance;
  });
}

/**
 * Grant currency (gold, stardust, and/or gems). Returns new balances.
 */
export async function grantCurrency(
  playerId: string,
  currency: { gold?: number; stardust?: number; nebulaGems?: number },
  reason: string,
  referenceId?: string,
): Promise<CurrencyBalance> {
  return withTransaction(async (client) => {
    // Build update
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (currency.gold && currency.gold > 0) {
      sets.push(`gold = gold + $${idx++}`);
      values.push(currency.gold);
    }
    if (currency.stardust && currency.stardust > 0) {
      sets.push(`stardust = stardust + $${idx++}`);
      values.push(currency.stardust);
    }
    if (currency.nebulaGems && currency.nebulaGems > 0) {
      sets.push(`nebula_gems = nebula_gems + $${idx++}`);
      values.push(currency.nebulaGems);
    }

    values.push(playerId);
    const result = await client.query(
      `UPDATE players SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING gold, stardust, nebula_gems`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Player not found');
    }

    const row = result.rows[0];

    // Log each currency change
    if (currency.gold && currency.gold > 0) {
      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
         VALUES ($1, 'gold', $2, $3, $4, $5)`,
        [playerId, currency.gold, row.gold, reason, referenceId || null]
      );
    }
    if (currency.stardust && currency.stardust > 0) {
      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
         VALUES ($1, 'stardust', $2, $3, $4, $5)`,
        [playerId, currency.stardust, row.stardust, reason, referenceId || null]
      );
    }
    if (currency.nebulaGems && currency.nebulaGems > 0) {
      await client.query(
        `INSERT INTO currency_transactions (player_id, currency_type, amount, balance_after, reason, reference_id)
         VALUES ($1, 'nebula_gems', $2, $3, $4, $5)`,
        [playerId, currency.nebulaGems, row.nebula_gems, reason, referenceId || null]
      );
    }

    return { gold: row.gold, stardust: row.stardust, nebulaGems: row.nebula_gems };
  });
}

/** Get recent transaction history for a player */
export async function getTransactionHistory(
  playerId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<TransactionRecord[]> {
  const result = await query(
    `SELECT id, currency_type, amount, balance_after, reason, reference_id, created_at
     FROM currency_transactions
     WHERE player_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    currencyType: row.currency_type as CurrencyType,
    amount: row.amount as number,
    balanceAfter: row.balance_after as number,
    reason: row.reason as string,
    referenceId: row.reference_id as string | null,
    createdAt: row.created_at as Date,
  }));
}

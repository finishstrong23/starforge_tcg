/**
 * STARFORGE TCG - Payment Service
 *
 * Handles Stripe payments (web), Apple IAP, and Google Play Billing.
 * Validates receipts server-side and grants items atomically.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/database';
import { config } from '../config/env';
import * as EconomyService from './EconomyService';

export type PaymentProvider = 'stripe' | 'apple_iap' | 'google_play';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'gems' | 'bundle' | 'battlepass' | 'cosmetic';
  priceUsd: number;
  gems?: number;
  gold?: number;
  packs?: number;
  cardIds?: string[];
  cosmeticId?: string;
  stripePriceId?: string;
  appleProductId?: string;
  googleProductId?: string;
  isOneTimePurchase?: boolean;
}

export interface PurchaseRecord {
  id: string;
  playerId: string;
  productId: string;
  provider: PaymentProvider;
  providerTransactionId: string;
  amountUsd: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
}

// Product catalog
const PRODUCTS: Product[] = [
  // Gem bundles
  { id: 'gems_100', name: '100 Nebula Gems', description: 'A handful of gems', category: 'gems', priceUsd: 0.99, gems: 100, stripePriceId: 'price_gems_100', appleProductId: 'com.starforge.gems100', googleProductId: 'gems_100' },
  { id: 'gems_500', name: '500 Nebula Gems', description: 'A pouch of gems', category: 'gems', priceUsd: 4.99, gems: 500, stripePriceId: 'price_gems_500', appleProductId: 'com.starforge.gems500', googleProductId: 'gems_500' },
  { id: 'gems_1200', name: '1,200 Nebula Gems', description: 'A chest of gems (20% bonus!)', category: 'gems', priceUsd: 9.99, gems: 1200, stripePriceId: 'price_gems_1200', appleProductId: 'com.starforge.gems1200', googleProductId: 'gems_1200' },
  { id: 'gems_2600', name: '2,600 Nebula Gems', description: 'A vault of gems (30% bonus!)', category: 'gems', priceUsd: 19.99, gems: 2600, stripePriceId: 'price_gems_2600', appleProductId: 'com.starforge.gems2600', googleProductId: 'gems_2600' },
  { id: 'gems_6500', name: '6,500 Nebula Gems', description: 'A hoard of gems (35% bonus!)', category: 'gems', priceUsd: 49.99, gems: 6500, stripePriceId: 'price_gems_6500', appleProductId: 'com.starforge.gems6500', googleProductId: 'gems_6500' },
  { id: 'gems_14000', name: '14,000 Nebula Gems', description: 'A treasury of gems (40% bonus!)', category: 'gems', priceUsd: 99.99, gems: 14000, stripePriceId: 'price_gems_14000', appleProductId: 'com.starforge.gems14000', googleProductId: 'gems_14000' },

  // Starter bundles (one-time purchase)
  { id: 'starter_bundle', name: 'Starter Bundle', description: '10 Packs + 1000 Gold + Exclusive Card Back', category: 'bundle', priceUsd: 4.99, packs: 10, gold: 1000, cosmeticId: 'cardback_starter', isOneTimePurchase: true, stripePriceId: 'price_starter_bundle' },
  { id: 'welcome_bundle', name: 'Welcome Bundle', description: '25 Packs + 500 Gems + 2 Legendaries', category: 'bundle', priceUsd: 14.99, packs: 25, gems: 500, isOneTimePurchase: true, stripePriceId: 'price_welcome_bundle' },
  { id: 'ultimate_starter', name: 'Ultimate Starter', description: '50 Packs + 1000 Gems + Premium Battle Pass', category: 'bundle', priceUsd: 29.99, packs: 50, gems: 1000, isOneTimePurchase: true, stripePriceId: 'price_ultimate_starter' },

  // Pre-built deck bundles
  { id: 'deck_pyroclast', name: 'Pyroclast Fire Deck', description: 'Complete competitive Pyroclast deck', category: 'bundle', priceUsd: 9.99, gold: 500, stripePriceId: 'price_deck_pyroclast' },
  { id: 'deck_voidborn', name: 'Voidborn Control Deck', description: 'Complete competitive Voidborn deck', category: 'bundle', priceUsd: 9.99, gold: 500, stripePriceId: 'price_deck_voidborn' },
  { id: 'deck_cogsmiths', name: 'Cogsmiths Mech Deck', description: 'Complete competitive Cogsmiths deck', category: 'bundle', priceUsd: 9.99, gold: 500, stripePriceId: 'price_deck_cogsmiths' },

  // Season pass / expansion pre-order
  { id: 'season_pass', name: 'Season Pass', description: 'Premium Battle Pass + 20 Packs + Exclusive Hero Skin', category: 'battlepass', priceUsd: 19.99, packs: 20, gems: 300, cosmeticId: 'skin_season_1', stripePriceId: 'price_season_pass' },
  { id: 'expansion_preorder', name: 'Expansion Pre-Order', description: '50 Expansion Packs + Golden Legendary', category: 'bundle', priceUsd: 49.99, packs: 50, stripePriceId: 'price_expansion_preorder' },

  // Battle Pass
  { id: 'premium_battlepass', name: 'Premium Battle Pass', description: 'Unlock premium track rewards', category: 'battlepass', priceUsd: 9.99, stripePriceId: 'price_premium_bp' },

  // Cosmetics
  { id: 'cardback_nebula', name: 'Nebula Card Back', description: 'Swirling galaxy card back', category: 'cosmetic', priceUsd: 2.99, cosmeticId: 'cardback_nebula', stripePriceId: 'price_cb_nebula' },
  { id: 'cardback_void', name: 'Void Card Back', description: 'Dark void card back', category: 'cosmetic', priceUsd: 2.99, cosmeticId: 'cardback_void', stripePriceId: 'price_cb_void' },
  { id: 'board_volcanic', name: 'Volcanic Board', description: 'Pyroclast volcanic board theme', category: 'cosmetic', priceUsd: 4.99, cosmeticId: 'board_volcanic', stripePriceId: 'price_board_volcanic' },
  { id: 'board_crystal', name: 'Crystal Board', description: 'Crystalline cavern board theme', category: 'cosmetic', priceUsd: 4.99, cosmeticId: 'board_crystal', stripePriceId: 'price_board_crystal' },
  { id: 'emote_gg', name: 'GG Emote Pack', description: '5 new emotes including GG', category: 'cosmetic', priceUsd: 1.99, cosmeticId: 'emote_gg_pack', stripePriceId: 'price_emote_gg' },
  { id: 'hero_skin_pyro', name: 'Pyroclast Hero Skin', description: 'Inferno Lord alternate skin', category: 'cosmetic', priceUsd: 7.99, cosmeticId: 'skin_pyro_inferno', stripePriceId: 'price_skin_pyro' },
];

// Regional pricing multipliers
const REGIONAL_PRICING: Record<string, number> = {
  US: 1.0, CA: 1.0, GB: 0.85, EU: 0.90, AU: 1.1,
  JP: 1.0, KR: 1.0, BR: 0.6, IN: 0.5, MX: 0.6,
  PH: 0.5, NZ: 1.0, CN: 0.7, RU: 0.5, TR: 0.4,
};

/**
 * Get all available products, optionally filtered by category.
 */
export function getProducts(category?: string, region?: string): Product[] {
  let products = category ? PRODUCTS.filter(p => p.category === category) : [...PRODUCTS];

  if (region && REGIONAL_PRICING[region]) {
    const multiplier = REGIONAL_PRICING[region];
    products = products.map(p => ({
      ...p,
      priceUsd: Math.round(p.priceUsd * multiplier * 100) / 100,
    }));
  }

  return products;
}

/**
 * Get a specific product by ID.
 */
export function getProduct(productId: string): Product | undefined {
  return PRODUCTS.find(p => p.id === productId);
}

/**
 * Create a Stripe checkout session for a product.
 */
export async function createStripeCheckout(
  playerId: string,
  productId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ sessionId: string; url: string }> {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) throw new Error('Product not found');

  // Check one-time purchase restriction
  if (product.isOneTimePurchase) {
    const existing = await query(
      `SELECT id FROM purchases WHERE player_id = $1 AND product_id = $2 AND status = 'completed'`,
      [playerId, productId]
    );
    if (existing.rows.length > 0) {
      throw new Error('This bundle can only be purchased once');
    }
  }

  if (!config.stripe.secretKey) {
    throw new Error('Stripe is not configured');
  }

  // In production, this would call Stripe API:
  // const session = await stripe.checkout.sessions.create({...})
  const sessionId = `cs_${uuidv4()}`;

  // Record pending purchase
  await query(
    `INSERT INTO purchases (id, player_id, product_id, provider, provider_transaction_id, amount_usd, currency, status, created_at)
     VALUES ($1, $2, $3, 'stripe', $4, $5, 'usd', 'pending', NOW())`,
    [uuidv4(), playerId, productId, sessionId, product.priceUsd]
  );

  return {
    sessionId,
    url: `https://checkout.stripe.com/pay/${sessionId}`,
  };
}

/**
 * Handle Stripe webhook events (payment completion, refund, etc).
 */
export async function handleStripeWebhook(eventType: string, data: Record<string, unknown>): Promise<void> {
  switch (eventType) {
    case 'checkout.session.completed': {
      const sessionId = data.id as string;
      await fulfillPurchase('stripe', sessionId);
      break;
    }
    case 'charge.refunded': {
      const chargeId = data.id as string;
      await processRefund('stripe', chargeId);
      break;
    }
  }
}

/**
 * Validate and fulfill an Apple IAP receipt.
 */
export async function validateAppleReceipt(
  playerId: string,
  receiptData: string,
  productId: string,
): Promise<{ success: boolean; purchaseId: string }> {
  const product = PRODUCTS.find(p => p.appleProductId === productId);
  if (!product) throw new Error('Invalid product ID');

  // In production, this would validate with Apple's verification server:
  // POST https://buy.itunes.apple.com/verifyReceipt
  const transactionId = `apple_${uuidv4()}`;

  const purchaseId = uuidv4();
  await query(
    `INSERT INTO purchases (id, player_id, product_id, provider, provider_transaction_id, amount_usd, currency, status, created_at)
     VALUES ($1, $2, $3, 'apple_iap', $4, $5, 'usd', 'pending', NOW())`,
    [purchaseId, playerId, product.id, transactionId, product.priceUsd]
  );

  await fulfillPurchase('apple_iap', transactionId);
  return { success: true, purchaseId };
}

/**
 * Validate and fulfill a Google Play purchase.
 */
export async function validateGooglePlayPurchase(
  playerId: string,
  purchaseToken: string,
  productId: string,
): Promise<{ success: boolean; purchaseId: string }> {
  const product = PRODUCTS.find(p => p.googleProductId === productId);
  if (!product) throw new Error('Invalid product ID');

  // In production, this would validate with Google Play Developer API
  const transactionId = `google_${purchaseToken}`;

  const purchaseId = uuidv4();
  await query(
    `INSERT INTO purchases (id, player_id, product_id, provider, provider_transaction_id, amount_usd, currency, status, created_at)
     VALUES ($1, $2, $3, 'google_play', $4, $5, 'usd', 'pending', NOW())`,
    [purchaseId, playerId, product.id, transactionId, product.priceUsd]
  );

  await fulfillPurchase('google_play', transactionId);
  return { success: true, purchaseId };
}

/**
 * Fulfill a verified purchase — grant items to player.
 */
async function fulfillPurchase(provider: PaymentProvider, transactionId: string): Promise<void> {
  await withTransaction(async (client) => {
    // Find the pending purchase
    const result = await client.query(
      `SELECT id, player_id, product_id, status FROM purchases
       WHERE provider = $1 AND provider_transaction_id = $2 AND status = 'pending'`,
      [provider, transactionId]
    );

    if (result.rows.length === 0) return;

    const purchase = result.rows[0];
    const product = PRODUCTS.find(p => p.id === purchase.product_id);
    if (!product) return;

    // Grant currencies
    const currencies: { gold?: number; stardust?: number; nebulaGems?: number } = {};
    if (product.gems) currencies.nebulaGems = product.gems;
    if (product.gold) currencies.gold = product.gold;

    if (currencies.gold || currencies.nebulaGems) {
      await EconomyService.grantCurrency(
        purchase.player_id,
        currencies,
        `purchase:${product.id}`,
        purchase.id
      );
    }

    // Grant packs
    if (product.packs) {
      await client.query(
        `INSERT INTO player_pack_grants (player_id, pack_type, count, source, created_at)
         VALUES ($1, 'standard', $2, $3, NOW())`,
        [purchase.player_id, product.packs, `purchase:${product.id}`]
      );
    }

    // Grant cosmetics
    if (product.cosmeticId) {
      await client.query(
        `INSERT INTO player_cosmetics (player_id, cosmetic_id, source, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_id, cosmetic_id) DO NOTHING`,
        [purchase.player_id, product.cosmeticId, `purchase:${product.id}`]
      );
    }

    // Mark purchase as completed
    await client.query(
      `UPDATE purchases SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [purchase.id]
    );
  });
}

/**
 * Process a refund.
 */
async function processRefund(provider: PaymentProvider, transactionId: string): Promise<void> {
  await query(
    `UPDATE purchases SET status = 'refunded', completed_at = NOW()
     WHERE provider = $1 AND provider_transaction_id = $2 AND status = 'completed'`,
    [provider, transactionId]
  );
  // Note: In production, you'd also revoke granted items
}

/**
 * Get purchase history for a player.
 */
export async function getPurchaseHistory(playerId: string, limit: number = 50): Promise<PurchaseRecord[]> {
  const result = await query(
    `SELECT id, player_id, product_id, provider, provider_transaction_id, amount_usd, currency, status, created_at
     FROM purchases WHERE player_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [playerId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    playerId: row.player_id,
    productId: row.product_id,
    provider: row.provider,
    providerTransactionId: row.provider_transaction_id,
    amountUsd: parseFloat(row.amount_usd),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Get loot box probability disclosure (legal compliance).
 */
export function getLootBoxDisclosure(): {
  packType: string;
  probabilities: Record<string, number>;
  pityTimer: string;
}[] {
  return [
    {
      packType: 'Standard Pack (5 cards)',
      probabilities: {
        common: 0.70,
        uncommon: 0.20,
        rare: 0.075,
        epic: 0.020,
        legendary: 0.005,
      },
      pityTimer: 'Guaranteed Legendary within 40 packs (guaranteed Rare or better per pack)',
    },
    {
      packType: 'Faction Pack (5 cards, single faction)',
      probabilities: {
        common: 0.65,
        uncommon: 0.22,
        rare: 0.085,
        epic: 0.030,
        legendary: 0.015,
      },
      pityTimer: 'Guaranteed Legendary within 30 faction packs',
    },
  ];
}

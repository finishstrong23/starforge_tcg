/**
 * STARFORGE TCG - Economy Routes
 *
 * API endpoints for currency, packs, crafting, and battle pass.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as EconomyService from '../services/EconomyService';
import * as PackService from '../services/PackService';
import * as CraftingService from '../services/CraftingService';
import * as BattlePassService from '../services/BattlePassService';

const router = Router();

// Maximum XP that can be granted per request (prevents abuse)
const MAX_XP_PER_REQUEST = 200;

// Valid XP sources that the server will accept
const VALID_XP_SOURCES = new Set([
  'game_played', 'game_won', 'quest_completed', 'daily_login',
  'pvp_win', 'campaign_win', 'fast_win',
]);

// ── Currency ────────────────────────────────────────────────────

/** GET /api/economy/balance — Get player's currency balances */
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const balance = await EconomyService.getBalance(req.user!.userId);
    res.json(balance);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch balance';
    res.status(500).json({ error: message });
  }
});

/** GET /api/economy/transactions — Get transaction history */
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const history = await EconomyService.getTransactionHistory(req.user!.userId, limit, offset);
    res.json({ transactions: history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
    res.status(500).json({ error: message });
  }
});

// ── Packs ───────────────────────────────────────────────────────

/** GET /api/economy/packs/types — Get available pack types */
router.get('/packs/types', (_req: Request, res: Response) => {
  res.json({ packs: PackService.getPackTypes() });
});

/** GET /api/economy/packs/state — Get pity timer state */
router.get('/packs/state', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const state = await PackService.getPackState(req.user!.userId);
    res.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pack state';
    res.status(500).json({ error: message });
  }
});

/** POST /api/economy/packs/purchase — Buy and open a pack */
router.post('/packs/purchase', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { packTypeId } = req.body;
    if (!packTypeId || typeof packTypeId !== 'string') {
      res.status(400).json({ error: 'packTypeId is required' });
      return;
    }

    const result = await PackService.purchasePack(req.user!.userId, packTypeId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to purchase pack';
    const status = message.includes('Insufficient') || message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** GET /api/economy/packs/history — Get pack opening history */
router.get('/packs/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const history = await PackService.getPackHistory(req.user!.userId, limit);
    res.json({ history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch pack history';
    res.status(500).json({ error: message });
  }
});

// ── Crafting ────────────────────────────────────────────────────

/** GET /api/economy/crafting/collection — Get player's card collection */
router.get('/crafting/collection', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const collection = await CraftingService.getCollection(req.user!.userId);
    res.json({ cards: collection });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch collection';
    res.status(500).json({ error: message });
  }
});

/** GET /api/economy/crafting/dust-values — Get dust value tables */
router.get('/crafting/dust-values', (_req: Request, res: Response) => {
  res.json(CraftingService.getDustValues());
});

/** POST /api/economy/crafting/craft — Craft a specific card */
router.post('/crafting/craft', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.body;
    if (!cardId || typeof cardId !== 'string') {
      res.status(400).json({ error: 'cardId is required' });
      return;
    }

    const result = await CraftingService.craftCard(req.user!.userId, cardId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to craft card';
    const status = message.includes('Insufficient') || message.includes('Cannot craft') || message.includes('not found')
      ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** POST /api/economy/crafting/disenchant — Disenchant a card */
router.post('/crafting/disenchant', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.body;
    if (!cardId || typeof cardId !== 'string') {
      res.status(400).json({ error: 'cardId is required' });
      return;
    }

    const result = await CraftingService.disenchantCard(req.user!.userId, cardId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disenchant card';
    const status = message.includes('not owned') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** POST /api/economy/crafting/disenchant-extras — Bulk disenchant duplicates */
router.post('/crafting/disenchant-extras', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Clamp to minimum 1 to prevent disenchanting entire collection
    const maxCopies = Math.max(parseInt(req.body.maxCopies) || 2, 1);
    const result = await CraftingService.disenchantExtras(req.user!.userId, maxCopies);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disenchant extras';
    res.status(500).json({ error: message });
  }
});

// ── Battle Pass ─────────────────────────────────────────────────

/** GET /api/economy/battlepass/progress — Get current battle pass progress */
router.get('/battlepass/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const progress = await BattlePassService.getProgress(req.user!.userId);
    res.json(progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch battle pass progress';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/economy/battlepass/add-xp — Add XP from game events.
 *
 * Security: XP amount is capped per request and source must be a valid game event.
 * This endpoint should be called by the game server after match completion.
 * The cap prevents clients from granting themselves unlimited XP.
 */
router.post('/battlepass/add-xp', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, source } = req.body;
    const xpAmount = parseInt(amount);

    if (!xpAmount || xpAmount <= 0) {
      res.status(400).json({ error: 'Valid positive amount is required' });
      return;
    }

    // Cap XP to prevent abuse
    if (xpAmount > MAX_XP_PER_REQUEST) {
      res.status(400).json({ error: `XP amount cannot exceed ${MAX_XP_PER_REQUEST}` });
      return;
    }

    // Validate source
    if (!source || !VALID_XP_SOURCES.has(source)) {
      res.status(400).json({ error: 'Invalid XP source' });
      return;
    }

    const result = await BattlePassService.addXP(req.user!.userId, xpAmount, source);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add XP';
    res.status(500).json({ error: message });
  }
});

/** POST /api/economy/battlepass/claim — Claim a battle pass reward */
router.post('/battlepass/claim', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { level, track } = req.body;
    const tierLevel = parseInt(level);

    if (!tierLevel || tierLevel < 1 || tierLevel > 50) {
      res.status(400).json({ error: 'level must be between 1 and 50' });
      return;
    }

    if (track !== 'free' && track !== 'premium') {
      res.status(400).json({ error: 'track must be "free" or "premium"' });
      return;
    }

    const result = await BattlePassService.claimReward(req.user!.userId, tierLevel, track);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim reward';
    const status = message.includes('already claimed') || message.includes('not unlocked')
      || message.includes('Haven\'t reached') || message.includes('Premium pass')
      ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** POST /api/economy/battlepass/upgrade-premium — Upgrade to premium pass */
router.post('/battlepass/upgrade-premium', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await BattlePassService.upgradeToPremium(req.user!.userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upgrade battle pass';
    const status = message.includes('Insufficient') || message.includes('Already') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** GET /api/economy/battlepass/tiers — Get tier definitions */
router.get('/battlepass/tiers', (_req: Request, res: Response) => {
  res.json({
    tiers: BattlePassService.getTiers(),
    premiumCost: BattlePassService.getPremiumCost(),
  });
});

export default router;

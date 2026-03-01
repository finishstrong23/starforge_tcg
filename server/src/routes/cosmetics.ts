/**
 * STARFORGE TCG - Cosmetic Shop Routes
 *
 * API endpoints for browsing, purchasing, and equipping cosmetics.
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as CosmeticShop from '../services/CosmeticShopService';

const router = Router();

/** GET /api/cosmetics/shop — Get shop items */
router.get('/shop', (req: Request, res: Response) => {
  const { type, rarity, race } = req.query;
  const items = CosmeticShop.getShopItems({
    type: type as CosmeticShop.CosmeticType | undefined,
    rarity: rarity as string | undefined,
    race: race as string | undefined,
    purchasable: true,
  });
  res.json({ items });
});

/** GET /api/cosmetics/featured — Get featured/rotating items */
router.get('/featured', (_req: Request, res: Response) => {
  res.json({ items: CosmeticShop.getFeaturedItems() });
});

/** GET /api/cosmetics/owned — Get player's owned cosmetics */
router.get('/owned', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const cosmetics = await CosmeticShop.getPlayerCosmetics(req.user!.userId);
    res.json({ cosmetics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cosmetics' });
  }
});

/** GET /api/cosmetics/equipped — Get equipped cosmetics */
router.get('/equipped', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const equipped = await CosmeticShop.getEquippedCosmetics(req.user!.userId);
    res.json({ equipped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipped cosmetics' });
  }
});

/** POST /api/cosmetics/purchase — Purchase a cosmetic */
router.post('/purchase', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cosmeticId, currency } = req.body;
    if (!cosmeticId || !currency) {
      res.status(400).json({ error: 'cosmeticId and currency (gold/gems) are required' });
      return;
    }
    if (currency !== 'gold' && currency !== 'gems') {
      res.status(400).json({ error: 'currency must be "gold" or "gems"' });
      return;
    }

    const result = await CosmeticShop.purchaseCosmetic(req.user!.userId, cosmeticId, currency);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    const status = message.includes('not found') || message.includes('Already') || message.includes('Cannot') || message.includes('Insufficient') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

/** POST /api/cosmetics/equip — Equip a cosmetic */
router.post('/equip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cosmeticId } = req.body;
    if (!cosmeticId) {
      res.status(400).json({ error: 'cosmeticId is required' });
      return;
    }

    await CosmeticShop.equipCosmetic(req.user!.userId, cosmeticId);
    res.json({ status: 'equipped' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to equip cosmetic';
    const status = message.includes('not found') || message.includes('not owned') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;

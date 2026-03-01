/**
 * STARFORGE TCG - Balance Dashboard Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as BalanceDashboard from '../services/BalanceDashboardService';

const router = Router();

/** GET /api/balance/factions — Faction win/play rates */
router.get('/factions', async (_req: Request, res: Response) => {
  const stats = await BalanceDashboard.getFactionStats();
  res.json({ factions: stats });
});

/** GET /api/balance/cards — Card performance stats */
router.get('/cards', async (req: Request, res: Response) => {
  const { race, rarity, minGames } = req.query;
  const stats = await BalanceDashboard.getCardStats({
    race: race as string | undefined,
    rarity: rarity as string | undefined,
    minGames: minGames ? parseInt(minGames as string) : undefined,
  });
  res.json({ cards: stats });
});

/** GET /api/balance/matchups — Faction vs faction matrix */
router.get('/matchups', async (_req: Request, res: Response) => {
  const matrix = await BalanceDashboard.getMatchupMatrix();
  res.json({ matchups: matrix });
});

/** GET /api/balance/summary — Meta health summary */
router.get('/summary', async (_req: Request, res: Response) => {
  const summary = await BalanceDashboard.getBalanceSummary();
  res.json(summary);
});

/** GET /api/balance/overrides — Active balance overrides */
router.get('/overrides', (_req: Request, res: Response) => {
  res.json({ overrides: BalanceDashboard.getActiveOverrides() });
});

/** GET /api/balance/patches — Patch history */
router.get('/patches', (_req: Request, res: Response) => {
  res.json({ patches: BalanceDashboard.getPatchHistory() });
});

/** GET /api/balance/refundable — Cards eligible for full dust refund */
router.get('/refundable', (_req: Request, res: Response) => {
  res.json({ cards: BalanceDashboard.getRefundableCards() });
});

export default router;

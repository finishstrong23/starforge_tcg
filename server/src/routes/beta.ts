/**
 * STARFORGE TCG - Beta & Soft Launch Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as BetaService from '../services/BetaService';

const router = Router();

/** POST /api/beta/redeem — Redeem a beta key */
router.post('/redeem', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.body;
    if (!key) { res.status(400).json({ error: 'Beta key required' }); return; }
    const result = await BetaService.redeemBetaKey(req.user!.userId, key);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to redeem key';
    res.status(400).json({ error: message });
  }
});

/** POST /api/beta/feedback — Submit feedback */
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, screenshot, deviceInfo, gameVersion } = req.body;
    if (!type || !title || !description) {
      res.status(400).json({ error: 'type, title, and description are required' });
      return;
    }
    const entry = await BetaService.submitFeedback(req.user!.userId, {
      type, title, description, screenshot,
      deviceInfo: deviceInfo || 'unknown',
      gameVersion: gameVersion || '1.0.0',
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/** GET /api/beta/feedback — Get feedback (admin) */
router.get('/feedback', async (req: Request, res: Response) => {
  const { type, status, limit } = req.query;
  const entries = await BetaService.getFeedback({
    type: type as string | undefined,
    status: status as string | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  });
  res.json({ feedback: entries });
});

/** POST /api/beta/creator-apply — Apply for content creator program */
router.post('/creator-apply', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, platform, profileUrl, followerCount } = req.body;
    if (!name || !platform || !profileUrl) {
      res.status(400).json({ error: 'name, platform, and profileUrl required' });
      return;
    }
    const result = await BetaService.applyCreatorProgram(req.user!.userId, {
      name, platform, profileUrl, followerCount: followerCount || 0,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/** GET /api/beta/regions — Soft launch regions */
router.get('/regions', (_req: Request, res: Response) => {
  res.json({ regions: BetaService.getSoftLaunchRegions() });
});

/** GET /api/beta/metrics — Beta metrics (admin) */
router.get('/metrics', async (_req: Request, res: Response) => {
  const metrics = await BetaService.getBetaMetrics();
  res.json(metrics);
});

/** GET /api/beta/press-kit — Press kit */
router.get('/press-kit', (_req: Request, res: Response) => {
  res.json(BetaService.getPressKit());
});

export default router;

/**
 * STARFORGE TCG - Cross-Play Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as CrossPlayService from '../services/CrossPlayService';

const router = Router();

/** GET /api/crossplay/info — Cross-play info */
router.get('/info', (_req: Request, res: Response) => {
  res.json(CrossPlayService.getCrossPlayStats());
});

/** GET /api/crossplay/platforms — Get linked platforms */
router.get('/platforms', authenticateToken, async (req: AuthRequest, res: Response) => {
  const platforms = await CrossPlayService.getLinkedPlatforms(req.user!.userId);
  res.json({ platforms });
});

/** POST /api/crossplay/link — Link a platform */
router.post('/link', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { platform, platformUserId } = req.body;
    if (!platform || !platformUserId) {
      res.status(400).json({ error: 'platform and platformUserId required' });
      return;
    }
    await CrossPlayService.linkPlatform(req.user!.userId, platform, platformUserId);
    res.json({ status: 'linked' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to link platform';
    res.status(400).json({ error: message });
  }
});

/** DELETE /api/crossplay/link/:platform — Unlink a platform */
router.delete('/link/:platform', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await CrossPlayService.unlinkPlatform(req.user!.userId, req.params.platform);
    res.json({ status: 'unlinked' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unlink platform';
    res.status(400).json({ error: message });
  }
});

/** POST /api/crossplay/sync — Sync progress */
router.post('/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { platform } = req.body;
  if (!platform) { res.status(400).json({ error: 'platform required' }); return; }
  await CrossPlayService.syncProgress(req.user!.userId, platform);
  res.json({ status: 'synced' });
});

export default router;

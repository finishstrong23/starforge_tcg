/**
 * STARFORGE TCG - Launch & Monitoring Routes
 */

import { Router, Request, Response } from 'express';
import * as LaunchService from '../services/LaunchService';

const router = Router();

/** GET /api/launch/platforms — Platform configs */
router.get('/platforms', (_req: Request, res: Response) => {
  res.json({ platforms: LaunchService.getPlatforms() });
});

/** GET /api/launch/version-check — Check client version compatibility */
router.get('/version-check', (req: Request, res: Response) => {
  const { platform, version } = req.query;
  if (!platform || !version) {
    res.status(400).json({ error: 'platform and version required' });
    return;
  }
  res.json(LaunchService.isVersionCompatible(platform as string, version as string));
});

/** GET /api/launch/events — Active launch events */
router.get('/events', (_req: Request, res: Response) => {
  res.json({ events: LaunchService.getActiveLaunchEvents() });
});

/** GET /api/launch/health — Server health dashboard */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ servers: LaunchService.getServerHealth() });
});

/** GET /api/launch/retention — Retention metrics */
router.get('/retention', (_req: Request, res: Response) => {
  res.json({ metrics: LaunchService.getRetentionMetrics() });
});

/** GET /api/launch/checklist — Launch checklist */
router.get('/checklist', (_req: Request, res: Response) => {
  res.json({ checklist: LaunchService.getLaunchChecklist() });
});

/** GET /api/launch/marketing — Marketing assets */
router.get('/marketing', (_req: Request, res: Response) => {
  res.json({ assets: LaunchService.getMarketingAssets() });
});

export default router;

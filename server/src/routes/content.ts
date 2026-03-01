/**
 * STARFORGE TCG - Content Pipeline Routes
 */

import { Router, Request, Response } from 'express';
import * as ContentPipeline from '../services/ContentPipelineService';

const router = Router();

/** GET /api/content/expansions — Get all expansions */
router.get('/expansions', (_req: Request, res: Response) => {
  res.json({ expansions: ContentPipeline.getExpansions() });
});

/** GET /api/content/expansions/:id — Get a specific expansion */
router.get('/expansions/:id', (req: Request, res: Response) => {
  const expansion = ContentPipeline.getExpansion(req.params.id);
  if (!expansion) { res.status(404).json({ error: 'Expansion not found' }); return; }
  res.json(expansion);
});

/** GET /api/content/reveals/:expansionId — Get card reveals */
router.get('/reveals/:expansionId', (req: Request, res: Response) => {
  const reveals = ContentPipeline.getCardReveals(req.params.expansionId);
  res.json({ reveals });
});

/** GET /api/content/reveals/today — Get today's card reveal */
router.get('/reveals/today', (_req: Request, res: Response) => {
  const reveal = ContentPipeline.getTodaysReveal();
  res.json({ reveal });
});

/** GET /api/content/cards — Get server card data */
router.get('/cards', async (req: Request, res: Response) => {
  const { expansion, race, rarity } = req.query;
  const cards = await ContentPipeline.getServerCardData({
    expansion: expansion as string | undefined,
    race: race as string | undefined,
    rarity: rarity as string | undefined,
    isActive: true,
  });
  res.json({ cards });
});

/** GET /api/content/rotation — Standard rotation info */
router.get('/rotation', (_req: Request, res: Response) => {
  res.json(ContentPipeline.getStandardRotation());
});

/** GET /api/content/schedule — Upcoming content schedule */
router.get('/schedule', (_req: Request, res: Response) => {
  res.json({ schedule: ContentPipeline.getContentSchedule() });
});

export default router;

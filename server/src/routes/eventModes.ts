/**
 * STARFORGE TCG - Event Mode Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as EventModeService from '../services/EventModeService';

const router = Router();

/** GET /api/events/current — Get current event mode */
router.get('/current', (_req: Request, res: Response) => {
  const event = EventModeService.getCurrentEvent();
  res.json({ event });
});

/** GET /api/events/schedule — Get upcoming event schedule */
router.get('/schedule', (req: Request, res: Response) => {
  const weeks = Math.min(parseInt(req.query.weeks as string) || 4, 12);
  const schedule = EventModeService.getEventSchedule(weeks);
  res.json({ schedule });
});

/** GET /api/events/modes — Get all available event modes */
router.get('/modes', (_req: Request, res: Response) => {
  res.json({ modes: EventModeService.getAllEventModes() });
});

/** POST /api/events/friendly — Create a friendly challenge */
router.post('/friendly', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { useAllCards, allowSpectators } = req.body;
  const challenge = EventModeService.createFriendlyChallenge(req.user!.userId, {
    useAllCards, allowSpectators,
  });
  res.json(challenge);
});

export default router;

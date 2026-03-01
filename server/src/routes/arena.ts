import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as ArenaService from '../services/ArenaService';

const router = Router();

// Get active arena run
router.get('/active', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const run = await ArenaService.getActiveArenaRun(req.user!.userId);
    if (!run) {
      res.json({ active: false });
      return;
    }
    res.json({ active: true, run });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch arena run' });
  }
});

// Start new arena run
router.post('/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ArenaService.startArenaRun(req.user!.userId);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start arena';
    res.status(400).json({ error: message });
  }
});

// Make a draft pick
router.post('/pick', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.body;
    if (!cardId) {
      res.status(400).json({ error: 'Card ID is required' });
      return;
    }
    const result = await ArenaService.makePick(req.user!.userId, cardId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to make pick';
    res.status(400).json({ error: message });
  }
});

// Record arena game result
router.post('/result', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { won } = req.body;
    if (typeof won !== 'boolean') {
      res.status(400).json({ error: 'Won (boolean) is required' });
      return;
    }
    const run = await ArenaService.recordArenaGame(req.user!.userId, won);
    res.json(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record result';
    res.status(400).json({ error: message });
  }
});

// Claim arena rewards
router.post('/claim', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rewards = await ArenaService.claimArenaRewards(req.user!.userId);
    res.json(rewards);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim rewards';
    res.status(400).json({ error: message });
  }
});

// Arena history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await ArenaService.getArenaHistory(req.user!.userId, limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch arena history' });
  }
});

export default router;

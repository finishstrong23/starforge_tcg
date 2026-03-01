import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { MatchmakingService } from '../services/MatchmakingService';
import { GameMode } from '../models/Game';
import { getPlayerMmr } from '../services/RankedLadderService';

const VALID_MODES: GameMode[] = ['ranked', 'casual', 'arena'];

export function createMatchmakingRoutes(matchmaking: MatchmakingService): Router {
  const router = Router();

  router.post('/queue', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { mode, deckId, race } = req.body;

      if (!mode || !VALID_MODES.includes(mode)) {
        res.status(400).json({ error: `Invalid mode. Must be one of: ${VALID_MODES.join(', ')}` });
        return;
      }

      if (!deckId) {
        res.status(400).json({ error: 'Deck ID is required' });
        return;
      }

      const mmr = await getPlayerMmr(req.user!.userId);

      matchmaking.enqueue({
        playerId: req.user!.userId,
        mode,
        mmr,
        deckId,
        race: race || 'unknown',
        queuedAt: Date.now(),
        expandRange: 0,
      });

      res.json({
        status: 'queued',
        estimatedWait: matchmaking.getEstimatedWait(mode, mmr),
        queueSize: matchmaking.getQueueSize(mode),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to queue for matchmaking' });
    }
  });

  router.delete('/queue', authenticateToken, async (req: AuthRequest, res: Response) => {
    const removed = matchmaking.dequeue(req.user!.userId);
    res.json({ status: removed ? 'removed' : 'not_in_queue' });
  });

  router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const mode = (req.query.mode as GameMode) || 'ranked';
      const mmr = await getPlayerMmr(req.user!.userId);
      res.json({
        queueSize: matchmaking.getQueueSize(mode),
        estimatedWait: matchmaking.getEstimatedWait(mode, mmr),
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch queue status' });
    }
  });

  return router;
}

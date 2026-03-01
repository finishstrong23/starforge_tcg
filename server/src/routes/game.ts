import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as GameStateService from '../services/GameStateService';

const router = Router();

router.get('/active', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const game = GameStateService.getPlayerGame(req.user!.userId);
    if (!game) {
      res.status(404).json({ error: 'No active game' });
      return;
    }
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await GameStateService.getGameHistory(req.user!.userId, limit, offset);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
});

router.get('/stats', (_req: AuthRequest, res: Response) => {
  res.json({
    activeGames: GameStateService.getActiveGameCount(),
  });
});

export default router;

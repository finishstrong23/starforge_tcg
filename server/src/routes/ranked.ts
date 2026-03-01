import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as RankedLadder from '../services/RankedLadderService';

const router = Router();

// GET /api/ranked/rank — get current player's rank
router.get('/rank', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rank = await RankedLadder.getPlayerRank(req.user!.userId);
    if (!rank) {
      res.status(404).json({ error: 'No rank found for current season' });
      return;
    }

    const legendRank = rank.tier === 'legend'
      ? await RankedLadder.getLegendRank(req.user!.userId, rank.seasonId)
      : undefined;

    res.json({
      ...rank,
      legendRank,
      displayRank: RankedLadder.formatRank(rank.tier, rank.division, legendRank),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// GET /api/ranked/rank/:playerId — get another player's rank
router.get('/rank/:playerId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rank = await RankedLadder.getPlayerRank(req.params.playerId);
    if (!rank) {
      res.status(404).json({ error: 'Player rank not found' });
      return;
    }

    const legendRank = rank.tier === 'legend'
      ? await RankedLadder.getLegendRank(req.params.playerId, rank.seasonId)
      : undefined;

    res.json({
      ...rank,
      legendRank,
      displayRank: RankedLadder.formatRank(rank.tier, rank.division, legendRank),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// GET /api/ranked/leaderboard — ranked leaderboard
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const seasonId = req.query.season as string | undefined;

    const entries = await RankedLadder.getLeaderboard(seasonId, limit, offset);

    res.json({
      entries,
      limit,
      offset,
      hasMore: entries.length === limit,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/ranked/season — current season info
router.get('/season', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const season = await RankedLadder.getCurrentSeason();
    if (!season) {
      const seasonId = await RankedLadder.getCurrentSeasonId();
      res.json({ id: seasonId, name: 'Current Season', isActive: true });
      return;
    }
    res.json(season);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch season info' });
  }
});

export default router;

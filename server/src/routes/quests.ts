import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as DailyQuestService from '../services/DailyQuestService';

const router = Router();

// Get today's quests
router.get('/daily', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quests = await DailyQuestService.getDailyQuests(req.user!.userId);
    res.json(quests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch daily quests' });
  }
});

// Reroll a quest
router.post('/daily/:questId/reroll', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const questId = parseInt(req.params.questId);
    const quest = await DailyQuestService.rerollQuest(req.user!.userId, questId);
    res.json(quest);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reroll quest';
    res.status(400).json({ error: message });
  }
});

// Get login streak info
router.get('/login-streak', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const info = await DailyQuestService.getLoginStreakRewards(req.user!.userId);
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch login streak' });
  }
});

// Claim login streak reward
router.post('/login-streak/claim', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reward = await DailyQuestService.claimLoginStreakReward(req.user!.userId);
    res.json(reward);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim reward';
    res.status(400).json({ error: message });
  }
});

// Claim first win bonus
router.post('/first-win', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reward = await DailyQuestService.claimFirstWinBonus(req.user!.userId);
    if (!reward) {
      res.json({ claimed: false, message: 'Already claimed today' });
      return;
    }
    res.json({ claimed: true, reward });
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim first win bonus' });
  }
});

// Get weekly challenge
router.get('/weekly', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await DailyQuestService.getWeeklyChallenge(req.user!.userId);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weekly challenge' });
  }
});

// Get starter deck gifts status
router.get('/starter-decks', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const gifts = await DailyQuestService.getStarterDeckGifts(req.user!.userId);
    res.json(gifts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch starter deck gifts' });
  }
});

// Claim a starter deck gift
router.post('/starter-decks/:day/claim', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const day = parseInt(req.params.day);
    const result = await DailyQuestService.claimStarterDeckGift(req.user!.userId, day);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to claim starter deck';
    res.status(400).json({ error: message });
  }
});

export default router;

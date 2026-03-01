/**
 * STARFORGE TCG - Chat Routes
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as ChatService from '../services/ChatService';

const router = Router();

/** POST /api/chat/send — Send a message */
router.post('/send', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { channelId, content } = req.body;
    if (!channelId || !content) {
      res.status(400).json({ error: 'channelId and content are required' });
      return;
    }

    const message = await ChatService.sendMessage(
      req.user!.userId, req.user!.username, channelId, content
    );
    res.json(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    res.status(400).json({ error: message });
  }
});

/** GET /api/chat/messages/:channelId — Get messages */
router.get('/messages/:channelId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const messages = await ChatService.getMessages(req.params.channelId, limit);

  // Filter out messages from muted players
  const muted = await ChatService.getMutedPlayers(req.user!.userId);
  const filtered = messages.filter(m => !muted.includes(m.senderId));

  res.json({ messages: filtered });
});

/** POST /api/chat/mute — Mute a player */
router.post('/mute', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) { res.status(400).json({ error: 'playerId required' }); return; }
  await ChatService.mutePlayer(req.user!.userId, playerId);
  res.json({ status: 'muted' });
});

/** POST /api/chat/unmute — Unmute a player */
router.post('/unmute', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) { res.status(400).json({ error: 'playerId required' }); return; }
  await ChatService.unmutePlayer(req.user!.userId, playerId);
  res.json({ status: 'unmuted' });
});

/** GET /api/chat/muted — Get muted players */
router.get('/muted', authenticateToken, async (req: AuthRequest, res: Response) => {
  const muted = await ChatService.getMutedPlayers(req.user!.userId);
  res.json({ muted });
});

/** POST /api/chat/report — Report a player */
router.post('/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { playerId, reason, messageId } = req.body;
  if (!playerId || !reason) {
    res.status(400).json({ error: 'playerId and reason required' });
    return;
  }
  await ChatService.reportPlayer(req.user!.userId, playerId, reason, messageId);
  res.json({ status: 'reported' });
});

export default router;

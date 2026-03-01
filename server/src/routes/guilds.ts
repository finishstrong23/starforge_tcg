/**
 * STARFORGE TCG - Guild Routes
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as GuildService from '../services/GuildService';

const router = Router();

/** POST /api/guilds — Create a guild */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, tag, description } = req.body;
    if (!name || !tag) {
      res.status(400).json({ error: 'name and tag are required' });
      return;
    }
    const guild = await GuildService.createGuild(req.user!.userId, name, tag, description || '');
    res.status(201).json(guild);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create guild';
    res.status(400).json({ error: message });
  }
});

/** GET /api/guilds/mine — Get player's guild */
router.get('/mine', authenticateToken, async (req: AuthRequest, res: Response) => {
  const guild = await GuildService.getPlayerGuild(req.user!.userId);
  res.json({ guild });
});

/** GET /api/guilds/search — Search guilds */
router.get('/search', async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string) || '';
  const guilds = await GuildService.searchGuilds(q);
  res.json({ guilds });
});

/** GET /api/guilds/:id — Get guild info */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const guild = await GuildService.getGuild(req.params.id);
  if (!guild) { res.status(404).json({ error: 'Guild not found' }); return; }
  res.json(guild);
});

/** GET /api/guilds/:id/members — Get guild members */
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  const members = await GuildService.getMembers(req.params.id);
  res.json({ members });
});

/** POST /api/guilds/:id/join — Join a guild */
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await GuildService.joinGuild(req.user!.userId, req.params.id);
    res.json({ status: 'joined' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join guild';
    res.status(400).json({ error: message });
  }
});

/** POST /api/guilds/:id/leave — Leave a guild */
router.post('/:id/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await GuildService.leaveGuild(req.user!.userId, req.params.id);
    res.json({ status: 'left' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to leave guild';
    res.status(400).json({ error: message });
  }
});

/** PATCH /api/guilds/:id/members/:memberId — Change member role */
router.patch('/:id/members/:memberId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['officer', 'member'].includes(role)) {
      res.status(400).json({ error: 'Role must be officer or member' });
      return;
    }
    await GuildService.setRole(req.params.id, req.user!.userId, req.params.memberId, role);
    res.json({ status: 'updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update role';
    res.status(400).json({ error: message });
  }
});

/** POST /api/guilds/:id/transfer — Transfer leadership */
router.post('/:id/transfer', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { newLeaderId } = req.body;
    if (!newLeaderId) { res.status(400).json({ error: 'newLeaderId required' }); return; }
    await GuildService.transferLeadership(req.params.id, req.user!.userId, newLeaderId);
    res.json({ status: 'transferred' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to transfer leadership';
    res.status(400).json({ error: message });
  }
});

export default router;

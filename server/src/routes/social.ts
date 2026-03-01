import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

// Friends list
router.get('/friends', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.username, p.display_name, p.avatar_id, p.level,
              pr.tier, pr.division,
              f.status, f.created_at
       FROM friends f
       JOIN players p ON (p.id = CASE WHEN f.player_id = $1 THEN f.friend_id ELSE f.player_id END)
       LEFT JOIN player_ranks pr ON p.id = pr.player_id
       WHERE (f.player_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
       ORDER BY p.username`,
      [req.user!.userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarId: row.avatar_id,
      level: row.level,
      rank: { tier: row.tier, division: row.division },
      since: row.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Send friend request
router.post('/friends/request', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const target = await query('SELECT id FROM players WHERE username = $1', [username.toLowerCase()]);
    if (target.rows.length === 0) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    const targetId = target.rows[0].id;
    if (targetId === req.user!.userId) {
      res.status(400).json({ error: 'Cannot add yourself as friend' });
      return;
    }

    // Check existing friendship
    const existing = await query(
      `SELECT id, status FROM friends
       WHERE (player_id = $1 AND friend_id = $2) OR (player_id = $2 AND friend_id = $1)`,
      [req.user!.userId, targetId]
    );

    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Friend request already exists' });
      return;
    }

    await query(
      `INSERT INTO friends (player_id, friend_id, status, created_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [req.user!.userId, targetId]
    );

    res.status(201).json({ status: 'request_sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept/reject friend request
router.patch('/friends/:friendId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body;
    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Action must be accept or reject' });
      return;
    }

    if (action === 'accept') {
      await query(
        `UPDATE friends SET status = 'accepted' WHERE friend_id = $1 AND player_id = $2 AND status = 'pending'`,
        [req.user!.userId, req.params.friendId]
      );
    } else {
      await query(
        `DELETE FROM friends WHERE friend_id = $1 AND player_id = $2 AND status = 'pending'`,
        [req.user!.userId, req.params.friendId]
      );
    }

    res.json({ status: action === 'accept' ? 'accepted' : 'rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process friend request' });
  }
});

// Pending friend requests
router.get('/friends/pending', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.username, p.display_name, p.avatar_id, p.level, f.created_at
       FROM friends f
       JOIN players p ON p.id = f.player_id
       WHERE f.friend_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user!.userId]
    );

    res.json(result.rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarId: row.avatar_id,
      level: row.level,
      requestedAt: row.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
});

// Share deck
router.post('/decks/share', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { deckId } = req.body;
    if (!deckId) {
      res.status(400).json({ error: 'Deck ID is required' });
      return;
    }

    const deck = await query(
      'SELECT * FROM player_decks WHERE id = $1 AND player_id = $2',
      [deckId, req.user!.userId]
    );

    if (deck.rows.length === 0) {
      res.status(404).json({ error: 'Deck not found' });
      return;
    }

    // Generate a share code (base64 encoded deck data)
    const deckData = deck.rows[0];
    const sharePayload = {
      name: deckData.name,
      race: deckData.race,
      cards: JSON.parse(deckData.card_ids),
    };
    const shareCode = Buffer.from(JSON.stringify(sharePayload)).toString('base64url');

    res.json({ shareCode, url: `/deck/${shareCode}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to share deck' });
  }
});

// Import shared deck
router.post('/decks/import', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { shareCode } = req.body;
    if (!shareCode) {
      res.status(400).json({ error: 'Share code is required' });
      return;
    }

    const decoded = JSON.parse(Buffer.from(shareCode, 'base64url').toString());

    res.json({
      name: decoded.name,
      race: decoded.race,
      cards: decoded.cards,
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid share code' });
  }
});

export default router;

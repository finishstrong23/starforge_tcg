/**
 * STARFORGE TCG - Deck Sharing Hub Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as DeckSharing from '../services/DeckSharingService';

const router = Router();

/** GET /api/decks/browse — Browse shared decks */
router.get('/browse', async (req: Request, res: Response) => {
  const { race, tag, sortBy, limit, offset } = req.query;
  const decks = await DeckSharing.browseDecks({
    race: race as string | undefined,
    tag: tag as string | undefined,
    sortBy: sortBy as 'popular' | 'newest' | 'winrate' | 'likes' | undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined,
  });
  res.json({ decks });
});

/** GET /api/decks/:id — Get a shared deck */
router.get('/:id', async (req: Request, res: Response) => {
  const deck = await DeckSharing.getDeck(req.params.id);
  if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }
  res.json(deck);
});

/** POST /api/decks/share — Share a deck */
router.post('/share', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, race, description, cardIds, tags } = req.body;
    if (!name || !race || !cardIds) {
      res.status(400).json({ error: 'name, race, and cardIds required' });
      return;
    }
    const deck = await DeckSharing.shareDeck(req.user!.userId, req.user!.username, {
      name, race, description: description || '', cardIds, tags: tags || [],
    });
    res.status(201).json(deck);
  } catch (err) {
    res.status(500).json({ error: 'Failed to share deck' });
  }
});

/** POST /api/decks/:id/like — Like a deck */
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  await DeckSharing.likeDeck(req.user!.userId, req.params.id);
  res.json({ status: 'liked' });
});

/** POST /api/decks/decode — Decode a deck code */
router.post('/decode', (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: 'code required' }); return; }
  const result = DeckSharing.decodeDeckCode(code);
  if (!result) { res.status(400).json({ error: 'Invalid deck code' }); return; }
  res.json(result);
});

/** GET /api/decks/:id/comments — Get deck comments */
router.get('/:id/comments', async (req: Request, res: Response) => {
  const comments = await DeckSharing.getComments(req.params.id);
  res.json({ comments });
});

/** POST /api/decks/:id/comments — Add a comment */
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) { res.status(400).json({ error: 'content required' }); return; }
  const comment = await DeckSharing.addComment(
    req.user!.userId, req.user!.username, req.params.id, content
  );
  res.status(201).json(comment);
});

export default router;

/**
 * STARFORGE TCG - Esports & Tournament Routes
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as EsportsService from '../services/EsportsService';

const router = Router();

/** GET /api/esports/tournaments — Get upcoming tournaments */
router.get('/tournaments', (_req: Request, res: Response) => {
  res.json({ tournaments: EsportsService.getUpcomingTournaments() });
});

/** GET /api/esports/tournaments/all — Get all tournaments */
router.get('/tournaments/all', (_req: Request, res: Response) => {
  res.json({ tournaments: EsportsService.getAllTournaments() });
});

/** GET /api/esports/tournaments/:id — Get tournament details */
router.get('/tournaments/:id', (req: Request, res: Response) => {
  const tournament = EsportsService.getTournament(req.params.id);
  if (!tournament) { res.status(404).json({ error: 'Tournament not found' }); return; }
  res.json(tournament);
});

/** POST /api/esports/tournaments/:id/register — Register for tournament */
router.post('/tournaments/:id/register', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await EsportsService.registerForTournament(req.user!.userId, req.params.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

/** GET /api/esports/tournaments/:id/standings — Get standings */
router.get('/tournaments/:id/standings', async (req: Request, res: Response) => {
  const standings = await EsportsService.getStandings(req.params.id);
  res.json({ standings });
});

/** GET /api/esports/tournaments/:id/matches — Get matches */
router.get('/tournaments/:id/matches', async (req: Request, res: Response) => {
  const round = req.query.round ? parseInt(req.query.round as string) : undefined;
  const matches = await EsportsService.getMatches(req.params.id, round);
  res.json({ matches });
});

/** GET /api/esports/calendar — Esports calendar */
router.get('/calendar', (_req: Request, res: Response) => {
  res.json({ calendar: EsportsService.getEsportsCalendar() });
});

/** POST /api/esports/tournaments/create — Create third-party tournament */
router.post('/tournaments/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, format, maxPlayers, rounds, startDate } = req.body;
    if (!name || !format || !maxPlayers) {
      res.status(400).json({ error: 'name, format, maxPlayers required' });
      return;
    }
    const tournament = await EsportsService.createThirdPartyTournament(
      req.user!.username,
      { name, description: description || '', format, maxPlayers, rounds: rounds || 5, startDate: new Date(startDate) }
    );
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

export default router;

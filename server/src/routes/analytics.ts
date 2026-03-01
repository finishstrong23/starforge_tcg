import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Ingest analytics events (batch)
router.post('/events', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { events } = req.body;
    const playerId = req.user?.userId || req.body.playerId || null;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'Events array is required' });
      return;
    }

    if (events.length > 100) {
      res.status(400).json({ error: 'Maximum 100 events per batch' });
      return;
    }

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const event of events) {
      placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(
        playerId,
        event.type,
        JSON.stringify(event.data),
        event.sessionId,
        event.clientTimestamp
      );
    }

    await query(
      `INSERT INTO analytics_events (player_id, event_type, event_data, session_id, client_timestamp)
       VALUES ${placeholders.join(', ')}`,
      values
    );

    res.json({ accepted: events.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ingest events' });
  }
});

// Balance dashboard: win rates by race
router.get('/balance/races', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        race,
        COUNT(*) as total_games,
        SUM(CASE WHEN won THEN 1 ELSE 0 END) as wins,
        ROUND(100.0 * SUM(CASE WHEN won THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as win_rate
      FROM (
        SELECT player1_race as race, (winner_id = player1_id) as won FROM game_records WHERE completed_at IS NOT NULL
        UNION ALL
        SELECT player2_race as race, (winner_id = player2_id) as won FROM game_records WHERE completed_at IS NOT NULL
      ) races
      WHERE race IS NOT NULL
      GROUP BY race
      ORDER BY win_rate DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance data' });
  }
});

// Retention metrics
router.get('/retention', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        'day_1' as metric,
        ROUND(100.0 * COUNT(DISTINCT CASE
          WHEN EXISTS (
            SELECT 1 FROM analytics_events ae2
            WHERE ae2.player_id = ae.player_id
            AND ae2.event_type = 'app_open'
            AND ae2.server_timestamp::date = ae.server_timestamp::date + INTERVAL '1 day'
          ) THEN ae.player_id END
        ) / NULLIF(COUNT(DISTINCT ae.player_id), 0), 1) as retention_rate
      FROM analytics_events ae
      WHERE ae.event_type = 'app_open'
      AND ae.server_timestamp >= NOW() - INTERVAL '30 days'
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retention data' });
  }
});

// Card play rates
router.get('/balance/cards', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await query(`
      SELECT
        event_data->>'cardName' as card_name,
        event_data->>'cardId' as card_id,
        COUNT(*) as play_count,
        COUNT(DISTINCT player_id) as unique_players
      FROM analytics_events
      WHERE event_type = 'card_played'
      AND server_timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY event_data->>'cardName', event_data->>'cardId'
      ORDER BY play_count DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch card stats' });
  }
});

// Game length distribution
router.get('/balance/game-lengths', async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        mode,
        ROUND(AVG(duration_ms) / 1000.0, 1) as avg_seconds,
        ROUND(AVG(turn_count), 1) as avg_turns,
        COUNT(*) as total_games,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) / 1000.0 as median_seconds
      FROM game_records
      WHERE completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '7 days'
      GROUP BY mode
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game length data' });
  }
});

export default router;

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env';
import { rateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import { createMatchmakingRoutes } from './routes/matchmaking';
import socialRoutes from './routes/social';
import analyticsRoutes from './routes/analytics';
import questRoutes from './routes/quests';
import arenaRoutes from './routes/arena';
import rankedRoutes from './routes/ranked';
import { MatchmakingService } from './services/MatchmakingService';
import * as GameStateService from './services/GameStateService';
import { GameWebSocketServer } from './services/WebSocketServer';
import * as RankedLadder from './services/RankedLadderService';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit(config.rateLimit.windowMs, config.rateLimit.max));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// WebSocket server
const wsServer = new GameWebSocketServer(server);

// Matchmaking
const matchmaking = new MatchmakingService((ticket1, ticket2, gameId) => {
  const game = GameStateService.createGame(
    ticket1.playerId,
    ticket2.playerId,
    ticket1.mode,
    {} // Initial game state would be created by the engine
  );
  wsServer.notifyMatchFound(ticket1.playerId, ticket2.playerId, game.id);
});
matchmaking.start();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/matchmaking', createMatchmakingRoutes(matchmaking));
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/arena', arenaRoutes);
app.use('/api/ranked', rankedRoutes);

// Server stats endpoint
app.get('/api/stats', (_req, res) => {
  res.json({
    onlinePlayers: wsServer.getOnlineCount(),
    activeGames: GameStateService.getActiveGameCount(),
    queueSizes: {
      ranked: matchmaking.getQueueSize('ranked'),
      casual: matchmaking.getQueueSize('casual'),
      arena: matchmaking.getQueueSize('arena'),
    },
  });
});

// Start server
server.listen(config.port, () => {
  console.log(`StarForge TCG Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`WebSocket endpoint: ws://localhost:${config.port}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  matchmaking.stop();
  server.close(() => {
    process.exit(0);
  });
});

export { app, server };

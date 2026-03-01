import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config/env';
import { rateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import gameRoutes from './routes/game';
import { createMatchmakingRoutes } from './routes/matchmaking';
import socialRoutes from './routes/social';
import analyticsRoutes from './routes/analytics';
import questRoutes from './routes/quests';
import arenaRoutes from './routes/arena';
import rankedRoutes from './routes/ranked';
import economyRoutes from './routes/economy';
import paymentRoutes from './routes/payments';
import cosmeticRoutes from './routes/cosmetics';
import balanceRoutes from './routes/balance';
import contentRoutes from './routes/content';
import eventModeRoutes from './routes/eventModes';
import chatRoutes from './routes/chat';
import guildRoutes from './routes/guilds';
import liveOpsRoutes from './routes/liveOps';
import betaRoutes from './routes/beta';
import launchRoutes from './routes/launch';
import deckSharingRoutes from './routes/deckSharing';
import esportsRoutes from './routes/esports';
import crossplayRoutes from './routes/crossplay';
import { MatchmakingService } from './services/MatchmakingService';
import * as GameStateService from './services/GameStateService';
import { GameWebSocketServer } from './services/WebSocketServer';
import * as RankedLadder from './services/RankedLadderService';
import * as ServerEngine from './services/ServerGameEngine';
import * as ErrorTracking from './services/ErrorTrackingService';
import * as ABTesting from './services/ABTestingService';

const app = express();
const server = createServer(app);

// Initialize error tracking
ErrorTracking.initialize();

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit(config.rateLimit.windowMs, config.rateLimit.max));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    environment: config.nodeEnv,
    errorTracking: ErrorTracking.getHealth(),
  });
});

// Initialize server-side game engine (loads card database)
ServerEngine.initialize();

// WebSocket server
const wsServer = new GameWebSocketServer(server);

// Matchmaking — creates server-authoritative games
const matchmaking = new MatchmakingService(
  (ticket1, ticket2, gameId) => {
    const initialState = ServerEngine.createServerGame(
      gameId,
      ticket1.playerId,
      ticket2.playerId,
      ticket1.race,
      ticket2.race,
      ticket1.mode
    );

    GameStateService.createGame(
      ticket1.playerId,
      ticket2.playerId,
      ticket1.mode,
      initialState
    );

    wsServer.notifyMatchFound(ticket1.playerId, ticket2.playerId, gameId);
  },
  (ticket, botTicket, gameId) => {
    const initialState = ServerEngine.createServerGame(
      gameId,
      ticket.playerId,
      botTicket.playerId,
      ticket.race,
      botTicket.race,
      ticket.mode
    );

    GameStateService.createGame(
      ticket.playerId,
      botTicket.playerId,
      ticket.mode,
      initialState
    );

    wsServer.notifyMatchFound(ticket.playerId, botTicket.playerId, gameId);
  }
);
matchmaking.start();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/matchmaking', createMatchmakingRoutes(matchmaking));
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/arena', arenaRoutes);
app.use('/api/ranked', rankedRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cosmetics', cosmeticRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/events', eventModeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/live-ops', liveOpsRoutes);
app.use('/api/beta', betaRoutes);
app.use('/api/launch', launchRoutes);
app.use('/api/decks', deckSharingRoutes);
app.use('/api/esports', esportsRoutes);
app.use('/api/crossplay', crossplayRoutes);

// A/B Testing endpoints
app.get('/api/experiments', (_req, res) => {
  res.json({ experiments: ABTesting.listExperiments() });
});

app.get('/api/experiments/:id/results', async (req, res) => {
  const results = await ABTesting.getExperimentResults(req.params.id);
  res.json(results);
});

// Server stats endpoint
app.get('/api/stats', (_req, res) => {
  res.json({
    onlinePlayers: wsServer.getOnlineCount(),
    activeGames: GameStateService.getActiveGameCount(),
    serverGames: ServerEngine.getActiveGameCount(),
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
  console.log(`Server-authoritative game engine: ACTIVE`);
  console.log(`OAuth providers: Google, Apple, Discord ACTIVE`);
  console.log(`Economy & payments: Stripe, Apple IAP, Google Play ACTIVE`);
  console.log(`Content pipeline: balance, expansion, event modes ACTIVE`);
  console.log(`Social: chat, guilds, friends, deck sharing ACTIVE`);
  console.log(`A/B testing: ${config.abTesting.enabled ? 'ENABLED' : 'DISABLED'}`);
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

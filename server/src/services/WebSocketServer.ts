import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthPayload } from '../middleware/auth';
import * as GameStateService from './GameStateService';
import * as RankedLadder from './RankedLadderService';

interface PlayerConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  gameId?: string;
}

type GameAction =
  | { type: 'PLAY_CARD'; cardId: string; targetId?: string; position?: number }
  | { type: 'ATTACK'; attackerId: string; targetId: string }
  | { type: 'END_TURN' }
  | { type: 'CONCEDE' }
  | { type: 'EMOTE'; emoteId: string };

interface ClientMessage {
  type: 'ACTION' | 'RECONNECT' | 'SPECTATE';
  gameId?: string;
  action?: GameAction;
}

interface ServerMessage {
  type: 'GAME_START' | 'GAME_STATE' | 'ACTION_RESULT' | 'GAME_OVER' | 'ERROR' | 'QUEUE_UPDATE' | 'MATCH_FOUND';
  data: unknown;
}

const DISCONNECT_TIMEOUT_MS = 60_000; // 60 seconds to reconnect before forfeit

export class GameWebSocketServer {
  private wss: WSServer;
  private connections = new Map<string, PlayerConnection>();
  private spectators = new Map<string, Set<WebSocket>>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(server: Server) {
    this.wss = new WSServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  private async handleConnection(ws: WebSocket, req: { url?: string }): Promise<void> {
    // Extract token from query string
    const url = new URL(req.url || '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let user: AuthPayload;
    try {
      user = jwt.verify(token, config.jwt.secret) as AuthPayload;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    // Close existing connection for this user (only one connection per player)
    const existing = this.connections.get(user.userId);
    if (existing) {
      existing.ws.close(4002, 'Connected from another location');
    }

    const conn: PlayerConnection = {
      ws,
      userId: user.userId,
      username: user.username,
    };
    this.connections.set(user.userId, conn);

    // Check for active game to reconnect
    const activeGame = GameStateService.getPlayerGame(user.userId);
    if (activeGame) {
      conn.gameId = activeGame.id;

      // Clear any disconnect forfeit timer
      const timer = this.disconnectTimers.get(user.userId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(user.userId);
      }

      // Notify opponent of reconnection
      const opponentId = activeGame.player1Id === user.userId ? activeGame.player2Id : activeGame.player1Id;
      this.sendToPlayer(opponentId, {
        type: 'GAME_STATE',
        data: { event: 'opponent_reconnected' },
      });

      this.send(ws, {
        type: 'GAME_STATE',
        data: { gameId: activeGame.id, state: activeGame.state, turnNumber: activeGame.turnNumber, reconnected: true },
      });
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(conn, msg);
      } catch {
        this.send(ws, { type: 'ERROR', data: { message: 'Invalid message format' } });
      }
    });

    ws.on('close', () => {
      this.connections.delete(user.userId);
      this.handleDisconnect(user.userId);
    });

    ws.on('error', () => {
      this.connections.delete(user.userId);
      this.handleDisconnect(user.userId);
    });
  }

  private handleMessage(conn: PlayerConnection, msg: ClientMessage): void {
    switch (msg.type) {
      case 'ACTION':
        this.handleGameAction(conn, msg.action!);
        break;
      case 'RECONNECT':
        this.handleReconnect(conn, msg.gameId!);
        break;
      case 'SPECTATE':
        this.handleSpectate(conn.ws, msg.gameId!);
        break;
    }
  }

  private handleGameAction(conn: PlayerConnection, action: GameAction): void {
    if (!conn.gameId) {
      this.send(conn.ws, { type: 'ERROR', data: { message: 'Not in a game' } });
      return;
    }

    if (!GameStateService.isPlayerTurn(conn.gameId, conn.userId)) {
      this.send(conn.ws, { type: 'ERROR', data: { message: 'Not your turn' } });
      return;
    }

    // Server-authoritative: validate and apply the action
    const game = GameStateService.getActiveGame(conn.gameId);
    if (!game) return;

    // In production, the game engine would run server-side here
    // For now, broadcast the action to both players for client-side resolution
    const opponentId = game.player1Id === conn.userId ? game.player2Id : game.player1Id;

    this.sendToPlayer(conn.userId, {
      type: 'ACTION_RESULT',
      data: { action, valid: true },
    });

    this.sendToPlayer(opponentId, {
      type: 'ACTION_RESULT',
      data: { action, playerId: conn.userId },
    });

    // Broadcast to spectators
    this.broadcastToSpectators(conn.gameId, {
      type: 'ACTION_RESULT',
      data: { action, playerId: conn.userId },
    });

    // If END_TURN, switch active player
    if (action.type === 'END_TURN') {
      GameStateService.updateGameState(conn.gameId, game.state, opponentId);
    }

    // If CONCEDE, end the game with opponent as winner
    if (action.type === 'CONCEDE') {
      this.notifyGameOver(conn.gameId, opponentId);
      GameStateService.endGame(conn.gameId, opponentId, 0, 0).catch(err =>
        console.error('Failed to end game after concede:', err)
      );
    }
  }

  private handleDisconnect(userId: string): void {
    const game = GameStateService.getPlayerGame(userId);
    if (!game) return;

    const opponentId = game.player1Id === userId ? game.player2Id : game.player1Id;

    // Notify opponent
    this.sendToPlayer(opponentId, {
      type: 'GAME_STATE',
      data: { event: 'opponent_disconnected', reconnectTimeoutMs: DISCONNECT_TIMEOUT_MS },
    });

    // Start a forfeit timer — if the player doesn't reconnect in time, they lose
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(userId);
      // Check if player is still disconnected
      if (!this.connections.has(userId)) {
        this.notifyGameOver(game.id, opponentId);
        GameStateService.endGame(game.id, opponentId, 0, 0).catch(err =>
          console.error('Failed to end game after disconnect timeout:', err)
        );
      }
    }, DISCONNECT_TIMEOUT_MS);

    this.disconnectTimers.set(userId, timer);
  }

  private handleReconnect(conn: PlayerConnection, gameId: string): void {
    const game = GameStateService.getActiveGame(gameId);
    if (!game) {
      this.send(conn.ws, { type: 'ERROR', data: { message: 'Game not found' } });
      return;
    }

    if (game.player1Id !== conn.userId && game.player2Id !== conn.userId) {
      this.send(conn.ws, { type: 'ERROR', data: { message: 'Not a participant' } });
      return;
    }

    conn.gameId = gameId;
    this.send(conn.ws, {
      type: 'GAME_STATE',
      data: { gameId, state: game.state, turnNumber: game.turnNumber },
    });
  }

  private handleSpectate(ws: WebSocket, gameId: string): void {
    const game = GameStateService.getActiveGame(gameId);
    if (!game) {
      this.send(ws, { type: 'ERROR', data: { message: 'Game not found' } });
      return;
    }

    let spectatorSet = this.spectators.get(gameId);
    if (!spectatorSet) {
      spectatorSet = new Set();
      this.spectators.set(gameId, spectatorSet);
    }
    spectatorSet.add(ws);

    ws.on('close', () => spectatorSet!.delete(ws));

    this.send(ws, {
      type: 'GAME_STATE',
      data: { gameId, state: game.state, turnNumber: game.turnNumber, spectating: true },
    });
  }

  // Public methods for external use (matchmaking, etc.)

  notifyMatchFound(player1Id: string, player2Id: string, gameId: string): void {
    this.sendToPlayer(player1Id, {
      type: 'MATCH_FOUND',
      data: { gameId, opponentId: player2Id },
    });
    this.sendToPlayer(player2Id, {
      type: 'MATCH_FOUND',
      data: { gameId, opponentId: player1Id },
    });

    // Set game IDs on connections
    const conn1 = this.connections.get(player1Id);
    const conn2 = this.connections.get(player2Id);
    if (conn1) conn1.gameId = gameId;
    if (conn2) conn2.gameId = gameId;
  }

  async notifyGameOver(gameId: string, winnerId: string | null): Promise<void> {
    const game = GameStateService.getActiveGame(gameId);
    if (!game) return;

    // Process rank changes based on game mode
    let rankChanges: { player1: RankedLadder.RankChange; player2: RankedLadder.RankChange } | null = null;
    let mmrChanges: { mmrDelta1: number; mmrDelta2: number } | null = null;

    try {
      if (game.mode === 'ranked') {
        rankChanges = await RankedLadder.processRankedResult(
          game.player1Id, game.player2Id, winnerId, 'ranked'
        );
      } else if (game.mode === 'casual') {
        mmrChanges = await RankedLadder.processCasualResult(
          game.player1Id, game.player2Id, winnerId
        );
      }
    } catch (err) {
      console.error('Failed to process rank changes:', err);
    }

    // Send personalized game-over messages with rank info
    this.sendToPlayer(game.player1Id, {
      type: 'GAME_OVER',
      data: {
        gameId,
        winnerId,
        rankChange: rankChanges?.player1 ?? null,
        mmrDelta: mmrChanges?.mmrDelta1 ?? rankChanges?.player1?.mmrDelta ?? 0,
      },
    });

    this.sendToPlayer(game.player2Id, {
      type: 'GAME_OVER',
      data: {
        gameId,
        winnerId,
        rankChange: rankChanges?.player2 ?? null,
        mmrDelta: mmrChanges?.mmrDelta2 ?? rankChanges?.player2?.mmrDelta ?? 0,
      },
    });

    this.broadcastToSpectators(gameId, {
      type: 'GAME_OVER',
      data: { gameId, winnerId },
    });

    // Clean up spectators
    this.spectators.delete(gameId);
  }

  private sendToPlayer(playerId: string, msg: ServerMessage): void {
    const conn = this.connections.get(playerId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify(msg));
    }
  }

  private broadcastToSpectators(gameId: string, msg: ServerMessage): void {
    const spectatorSet = this.spectators.get(gameId);
    if (!spectatorSet) return;
    const data = JSON.stringify(msg);
    for (const ws of spectatorSet) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  getOnlineCount(): number {
    return this.connections.size;
  }
}

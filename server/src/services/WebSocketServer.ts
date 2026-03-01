import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthPayload } from '../middleware/auth';
import * as GameStateService from './GameStateService';

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

export class GameWebSocketServer {
  private wss: WSServer;
  private connections = new Map<string, PlayerConnection>();
  private spectators = new Map<string, Set<WebSocket>>();

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
      this.send(ws, {
        type: 'GAME_STATE',
        data: { gameId: activeGame.id, state: activeGame.state, turnNumber: activeGame.turnNumber },
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
    });

    ws.on('error', () => {
      this.connections.delete(user.userId);
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

  notifyGameOver(gameId: string, winnerId: string | null): void {
    const game = GameStateService.getActiveGame(gameId);
    if (!game) return;

    const msg: ServerMessage = {
      type: 'GAME_OVER',
      data: { gameId, winnerId },
    };

    this.sendToPlayer(game.player1Id, msg);
    this.sendToPlayer(game.player2Id, msg);
    this.broadcastToSpectators(gameId, msg);

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

/**
 * STARFORGE TCG - Multiplayer Manager
 *
 * PeerJS-based peer-to-peer networking for real-time PvP.
 * Host creates a room, guest joins with a room code.
 * All game data flows directly between browsers via WebRTC.
 */

import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Race } from '../../types/Race';
import type { GameAction } from '../../types/Game';
import type { PlayerState } from '../../types/Player';
import type { CardInstance } from '../../types/Card';

/**
 * Serializable view of the game state sent to the guest
 */
export interface NetworkViewState {
  myState: PlayerState;
  opponentState: PlayerState;
  myHand: CardInstance[];
  myBoard: CardInstance[];
  opponentBoard: CardInstance[];
  opponentHandSize: number;
  turn: number;
  phase: string;
  activePlayerId: string;
  status: string;
  winnerId?: string;
  myPlayerId: string;
}

/**
 * Messages sent between host and guest
 */
export type NetworkMessage =
  | { type: 'player_info'; race: Race; name: string }
  | { type: 'game_start'; viewState: NetworkViewState }
  | { type: 'state_update'; viewState: NetworkViewState }
  | { type: 'action'; action: GameAction }
  | { type: 'error'; message: string };

type ConnectionCallback = () => void;
type MessageCallback = (message: NetworkMessage) => void;
type ErrorCallback = (error: string) => void;

export class MultiplayerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private roomCode: string = '';
  private _role: 'host' | 'guest' | null = null;

  public onConnected: ConnectionCallback | null = null;
  public onDisconnected: ConnectionCallback | null = null;
  public onMessage: MessageCallback | null = null;
  public onError: ErrorCallback | null = null;

  get role() { return this._role; }
  get code() { return this.roomCode; }
  get isConnected(): boolean { return !!this.connection?.open; }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.roomCode = this.generateCode();
      this._role = 'host';

      this.peer = new Peer(`starforge-${this.roomCode}`, { debug: 0 });

      this.peer.on('open', () => {
        console.log('Room created:', this.roomCode);

        this.peer!.on('connection', (conn) => {
          this.connection = conn;
          this.setupConnection(conn);
        });

        resolve(this.roomCode);
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          this.peer?.destroy();
          this.roomCode = this.generateCode();
          this.peer = new Peer(`starforge-${this.roomCode}`, { debug: 0 });
          this.peer.on('open', () => {
            this.peer!.on('connection', (conn) => {
              this.connection = conn;
              this.setupConnection(conn);
            });
            resolve(this.roomCode);
          });
          this.peer.on('error', (e: any) => {
            this.onError?.(`Connection error: ${e.message || e}`);
            reject(e);
          });
        } else {
          this.onError?.(`Connection error: ${err.message || err}`);
          reject(err);
        }
      });
    });
  }

  joinRoom(code: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase().trim();
      this._role = 'guest';

      this.peer = new Peer(undefined as any, { debug: 0 });

      this.peer.on('open', () => {
        const conn = this.peer!.connect(`starforge-${this.roomCode}`, {
          reliable: true,
        });

        this.connection = conn;

        conn.on('open', () => {
          this.setupConnection(conn);
          resolve();
        });

        conn.on('error', (err: any) => {
          this.onError?.(`Failed to join room: ${err.message || err}`);
          reject(err);
        });
      });

      this.peer.on('error', (err: any) => {
        this.onError?.(`Connection error: ${err.message || err}`);
        reject(err);
      });

      setTimeout(() => {
        if (!this.connection?.open) {
          this.onError?.('Connection timed out. Check the room code and try again.');
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }

  private setupConnection(conn: DataConnection) {
    conn.on('data', (data: unknown) => {
      this.onMessage?.(data as NetworkMessage);
    });

    conn.on('close', () => {
      console.log('Peer disconnected');
      this.onDisconnected?.();
    });

    conn.on('error', (err: any) => {
      this.onError?.(`Connection error: ${err}`);
    });

    this.onConnected?.();
  }

  send(message: NetworkMessage) {
    if (this.connection?.open) {
      this.connection.send(message);
    }
  }

  disconnect() {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = null;
    this.peer = null;
    this._role = null;
    this.roomCode = '';
  }
}

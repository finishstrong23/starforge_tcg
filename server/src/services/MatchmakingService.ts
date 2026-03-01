import { v4 as uuidv4 } from 'uuid';
import { MatchmakingTicket, GameMode } from '../models/Game';

const MMR_RANGE_BASE = 100;
const MMR_RANGE_EXPAND_PER_SEC = 5;
const MAX_MMR_RANGE = 500;
const QUEUE_CHECK_INTERVAL = 1000;

type MatchFoundCallback = (ticket1: MatchmakingTicket, ticket2: MatchmakingTicket, gameId: string) => void;

export class MatchmakingService {
  private queues: Map<GameMode, MatchmakingTicket[]> = new Map();
  private onMatchFound: MatchFoundCallback;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(onMatchFound: MatchFoundCallback) {
    this.onMatchFound = onMatchFound;
    this.queues.set('ranked', []);
    this.queues.set('casual', []);
    this.queues.set('arena', []);
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processQueues(), QUEUE_CHECK_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  enqueue(ticket: MatchmakingTicket): void {
    const queue = this.queues.get(ticket.mode);
    if (!queue) return;

    // Remove existing ticket for this player
    this.dequeue(ticket.playerId);

    ticket.queuedAt = Date.now();
    ticket.expandRange = 0;
    queue.push(ticket);
  }

  dequeue(playerId: string): boolean {
    for (const [, queue] of this.queues) {
      const idx = queue.findIndex(t => t.playerId === playerId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  getQueueSize(mode: GameMode): number {
    return this.queues.get(mode)?.length || 0;
  }

  getEstimatedWait(mode: GameMode, mmr: number): number {
    const queue = this.queues.get(mode);
    if (!queue || queue.length === 0) return 30;

    const matchableCount = queue.filter(t => Math.abs(t.mmr - mmr) <= MAX_MMR_RANGE).length;
    if (matchableCount > 5) return 5;
    if (matchableCount > 2) return 15;
    return 30;
  }

  private processQueues(): void {
    const now = Date.now();

    for (const [, queue] of this.queues) {
      // Update expand ranges based on wait time
      for (const ticket of queue) {
        const waitSec = (now - ticket.queuedAt) / 1000;
        ticket.expandRange = Math.min(
          MMR_RANGE_BASE + waitSec * MMR_RANGE_EXPAND_PER_SEC,
          MAX_MMR_RANGE
        );
      }

      // Try to find matches (greedy: best MMR match first)
      const matched = new Set<number>();

      for (let i = 0; i < queue.length; i++) {
        if (matched.has(i)) continue;

        let bestMatch = -1;
        let bestDiff = Infinity;

        for (let j = i + 1; j < queue.length; j++) {
          if (matched.has(j)) continue;

          const diff = Math.abs(queue[i].mmr - queue[j].mmr);
          const allowedRange = Math.min(queue[i].expandRange, queue[j].expandRange);

          if (diff <= allowedRange && diff < bestDiff) {
            bestDiff = diff;
            bestMatch = j;
          }
        }

        if (bestMatch !== -1) {
          matched.add(i);
          matched.add(bestMatch);

          const gameId = uuidv4();
          this.onMatchFound(queue[i], queue[bestMatch], gameId);
        }
      }

      // Remove matched tickets (reverse order to preserve indices)
      const matchedArr = Array.from(matched).sort((a, b) => b - a);
      for (const idx of matchedArr) {
        queue.splice(idx, 1);
      }
    }
  }
}

import { v4 as uuidv4 } from 'uuid';
import { MatchmakingTicket, GameMode } from '../models/Game';

const MMR_RANGE_BASE = 100;
const MMR_RANGE_EXPAND_PER_SEC = 5;
const MAX_MMR_RANGE = 500;
const QUEUE_CHECK_INTERVAL = 1000;
const BOT_BACKFILL_WAIT_SEC = 30; // After 30 seconds, match with a bot
const APPRENTICE_BOT_WAIT_SEC = 3; // Bronze/Silver ranked players get bots quickly

// Tiers where ranked players are primarily paired against bots for a smoother learning curve.
// This gives new players safe practice before entering competitive Gold+ tiers.
const BOT_PAIRING_TIERS = new Set(['bronze', 'silver']);

const BOT_RACES = [
  'pyroclast', 'verdani', 'mechara', 'voidborn', 'celestari',
  'nethari', 'draconid', 'hivemind', 'crystari', 'aetherian',
];

type MatchFoundCallback = (ticket1: MatchmakingTicket, ticket2: MatchmakingTicket, gameId: string) => void;
type BotMatchCallback = (ticket: MatchmakingTicket, botTicket: MatchmakingTicket, gameId: string) => void;

export class MatchmakingService {
  private queues: Map<GameMode, MatchmakingTicket[]> = new Map();
  private onMatchFound: MatchFoundCallback;
  private onBotMatch: BotMatchCallback | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(onMatchFound: MatchFoundCallback, onBotMatch?: BotMatchCallback) {
    this.onMatchFound = onMatchFound;
    this.onBotMatch = onBotMatch || null;
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

    for (const [mode, queue] of this.queues) {
      // Update expand ranges based on wait time
      for (const ticket of queue) {
        const waitSec = (now - ticket.queuedAt) / 1000;
        ticket.expandRange = Math.min(
          MMR_RANGE_BASE + waitSec * MMR_RANGE_EXPAND_PER_SEC,
          MAX_MMR_RANGE
        );
      }

      // ── Apprentice bot pairing ──────────────────────────────────
      // In ranked mode, Bronze and Silver players are matched against
      // bots after a short wait (3s). This provides a smooth difficulty
      // curve for new players while they learn the game. They can still
      // match against other human apprentice players if one is found
      // within that window.
      if (this.onBotMatch && mode === 'ranked') {
        const apprenticeBots: number[] = [];
        for (let i = 0; i < queue.length; i++) {
          const ticket = queue[i];
          const tier = ticket.rankTier || 'bronze';
          const waitSec = (now - ticket.queuedAt) / 1000;

          if (BOT_PAIRING_TIERS.has(tier) && waitSec >= APPRENTICE_BOT_WAIT_SEC) {
            apprenticeBots.push(i);
          }
        }

        // Match apprentice players with appropriately-skilled bots
        for (const idx of apprenticeBots.reverse()) {
          const ticket = queue[idx];
          const botRace = BOT_RACES[Math.floor(Math.random() * BOT_RACES.length)];

          // Scale bot MMR based on player's rank tier for difficulty curve
          const botMmrOffset = ticket.rankTier === 'bronze'
            ? Math.floor(Math.random() * 50) - 75  // Easier bots for Bronze
            : Math.floor(Math.random() * 80) - 40;  // Closer-matched bots for Silver

          const botTicket: MatchmakingTicket = {
            playerId: `bot_${uuidv4()}`,
            mode: ticket.mode,
            mmr: Math.max(500, ticket.mmr + botMmrOffset),
            deckId: `bot_deck_${botRace}`,
            race: botRace,
            queuedAt: now,
            expandRange: 0,
            rankTier: ticket.rankTier,
          };

          const gameId = uuidv4();
          queue.splice(idx, 1);
          this.onBotMatch(ticket, botTicket, gameId);
        }
      }

      // Try to find human vs human matches (greedy: best MMR match first)
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

      // Bot backfill: match long-waiting players against a bot (Gold+ and casual)
      if (this.onBotMatch) {
        const botBackfill: number[] = [];
        for (let i = 0; i < queue.length; i++) {
          if (matched.has(i)) continue;
          const waitSec = (now - queue[i].queuedAt) / 1000;
          if (waitSec >= BOT_BACKFILL_WAIT_SEC) {
            botBackfill.push(i);
          }
        }

        // Match each long-waiting player with a bot (reverse order for safe removal)
        for (const idx of botBackfill.reverse()) {
          const ticket = queue[idx];
          const botRace = BOT_RACES[Math.floor(Math.random() * BOT_RACES.length)];
          const botTicket: MatchmakingTicket = {
            playerId: `bot_${uuidv4()}`,
            mode: ticket.mode,
            mmr: ticket.mmr + Math.floor(Math.random() * 100) - 50, // +-50 MMR
            deckId: `bot_deck_${botRace}`,
            race: botRace,
            queuedAt: now,
            expandRange: 0,
          };

          const gameId = uuidv4();
          queue.splice(idx, 1);
          this.onBotMatch(ticket, botTicket, gameId);
        }
      }
    }
  }
}

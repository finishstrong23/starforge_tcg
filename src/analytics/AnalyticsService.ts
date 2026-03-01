import { v4 as uuidv4 } from 'uuid';

export type AnalyticsEvent =
  | { type: 'app_open' }
  | { type: 'app_close'; sessionDurationMs: number }
  | { type: 'tutorial_start' }
  | { type: 'tutorial_step'; step: number; stepName: string }
  | { type: 'tutorial_complete'; durationMs: number }
  | { type: 'tutorial_skip'; atStep: number }
  | { type: 'game_start'; mode: string; race: string; opponentRace: string; deckId?: string }
  | { type: 'game_end'; mode: string; result: 'win' | 'loss' | 'draw' | 'concede'; turnCount: number; durationMs: number; race: string; opponentRace: string }
  | { type: 'card_played'; cardId: string; cardName: string; manaCost: number; turn: number }
  | { type: 'card_drawn'; cardId: string; turn: number }
  | { type: 'minion_attack'; attackerId: string; targetId: string; turn: number }
  | { type: 'hero_attack'; targetId: string; turn: number }
  | { type: 'minion_death'; cardId: string; cardName: string; killedBy: string; turn: number }
  | { type: 'keyword_triggered'; keyword: string; cardId: string; turn: number }
  | { type: 'starforge_activated'; cardId: string; cardName: string; turn: number }
  | { type: 'spell_cast'; cardId: string; target?: string; turn: number }
  | { type: 'deck_created'; race: string; cardCount: number }
  | { type: 'deck_edited'; deckId: string }
  | { type: 'deck_deleted'; deckId: string }
  | { type: 'deck_imported'; shareCode: string }
  | { type: 'pack_opened'; packType: string; cards: string[] }
  | { type: 'card_crafted'; cardId: string; cost: number }
  | { type: 'card_disenchanted'; cardId: string; reward: number }
  | { type: 'quest_completed'; questId: string; questType: string }
  | { type: 'quest_rerolled'; questId: string }
  | { type: 'achievement_unlocked'; achievementId: string }
  | { type: 'battle_pass_tier_claimed'; tier: number; isPremium: boolean }
  | { type: 'ranked_promotion'; newTier: string; newDivision: number }
  | { type: 'ranked_demotion'; newTier: string; newDivision: number }
  | { type: 'matchmaking_start'; mode: string }
  | { type: 'matchmaking_found'; mode: string; waitTimeMs: number }
  | { type: 'matchmaking_cancel'; mode: string; waitTimeMs: number }
  | { type: 'arena_start' }
  | { type: 'arena_pick'; cardId: string; pickNumber: number; options: string[] }
  | { type: 'arena_end'; wins: number; losses: number }
  | { type: 'friend_added'; friendId: string }
  | { type: 'friendly_challenge_sent'; friendId: string }
  | { type: 'shop_viewed'; section: string }
  | { type: 'purchase_started'; itemId: string; price: number; currency: string }
  | { type: 'purchase_completed'; itemId: string; price: number; currency: string }
  | { type: 'screen_view'; screen: string; previousScreen?: string }
  | { type: 'error'; errorType: string; message: string; stack?: string }
  | { type: 'performance'; metric: string; value: number };

interface QueuedEvent {
  event: AnalyticsEvent;
  timestamp: number;
  sessionId: string;
}

const FLUSH_INTERVAL = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 100;
const STORAGE_KEY = 'starforge_analytics_queue';

class AnalyticsServiceImpl {
  private sessionId: string;
  private sessionStartTime: number;
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private apiUrl: string;
  private playerId: string | null = null;
  private enabled = true;

  constructor() {
    this.sessionId = uuidv4();
    this.sessionStartTime = Date.now();
    this.apiUrl = this.getApiUrl();

    // Load queued events from storage (in case of crash/close)
    this.loadQueue();
  }

  private getApiUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const isDev = window.location.hostname === 'localhost';
      return isDev ? 'http://localhost:3001/api/analytics' : '/api/analytics';
    }
    return 'http://localhost:3001/api/analytics';
  }

  setPlayerId(playerId: string | null): void {
    this.playerId = playerId;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.track({ type: 'app_close', sessionDurationMs: Date.now() - this.sessionStartTime });
        this.flushSync();
      });

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }

    this.track({ type: 'app_open' });
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }

  track(event: AnalyticsEvent): void {
    if (!this.enabled) return;

    this.queue.push({
      event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });

    // Auto-flush if queue is too large
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }

    // Persist queue to local storage
    this.saveQueue();
  }

  // Convenience methods for common events

  trackScreenView(screen: string, previousScreen?: string): void {
    this.track({ type: 'screen_view', screen, previousScreen });
  }

  trackGameStart(mode: string, race: string, opponentRace: string, deckId?: string): void {
    this.track({ type: 'game_start', mode, race, opponentRace, deckId });
  }

  trackGameEnd(mode: string, result: 'win' | 'loss' | 'draw' | 'concede', turnCount: number, durationMs: number, race: string, opponentRace: string): void {
    this.track({ type: 'game_end', mode, result, turnCount, durationMs, race, opponentRace });
  }

  trackCardPlayed(cardId: string, cardName: string, manaCost: number, turn: number): void {
    this.track({ type: 'card_played', cardId, cardName, manaCost, turn });
  }

  trackKeywordTriggered(keyword: string, cardId: string, turn: number): void {
    this.track({ type: 'keyword_triggered', keyword, cardId, turn });
  }

  trackError(errorType: string, message: string, stack?: string): void {
    this.track({ type: 'error', errorType, message, stack });
  }

  trackPerformance(metric: string, value: number): void {
    this.track({ type: 'performance', metric, value });
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.saveQueue();

    try {
      const response = await fetch(this.apiUrl + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.playerId,
          events: events.map(e => ({
            type: e.event.type,
            data: e.event,
            sessionId: e.sessionId,
            clientTimestamp: new Date(e.timestamp).toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        // Put events back in queue for retry
        this.queue = [...events, ...this.queue];
        this.saveQueue();
      }
    } catch {
      // Network error — put events back for retry
      this.queue = [...events, ...this.queue];
      this.saveQueue();
    }
  }

  private flushSync(): void {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];
    this.saveQueue();

    // Use sendBeacon for reliable delivery on page unload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        this.apiUrl + '/events',
        JSON.stringify({
          playerId: this.playerId,
          events: events.map(e => ({
            type: e.event.type,
            data: e.event,
            sessionId: e.sessionId,
            clientTimestamp: new Date(e.timestamp).toISOString(),
          })),
        })
      );
    }
  }

  private loadQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveQueue(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        if (this.queue.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  // Get session metrics for debugging
  getSessionMetrics(): { sessionId: string; duration: number; eventsTracked: number } {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.sessionStartTime,
      eventsTracked: this.queue.length,
    };
  }
}

// Singleton
export const analytics = new AnalyticsServiceImpl();

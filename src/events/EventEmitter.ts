/**
 * STARFORGE TCG - Event Emitter
 *
 * Pub/sub system for game events with support for
 * multiple listeners and event filtering.
 */

import { GameEvent, GameEventType } from './GameEvent';

/**
 * Event listener callback type
 */
export type EventListener = (event: GameEvent) => void;

/**
 * Event filter function type
 */
export type EventFilter = (event: GameEvent) => boolean;

/**
 * Subscription handle for unsubscribing
 */
export interface Subscription {
  /** Unique subscription ID */
  id: string;
  /** Unsubscribe from events */
  unsubscribe: () => void;
}

/**
 * Internal subscription record
 */
interface SubscriptionRecord {
  id: string;
  listener: EventListener;
  eventType?: GameEventType;
  filter?: EventFilter;
  once: boolean;
}

/**
 * Event Emitter class
 * Manages event subscriptions and dispatching
 */
export class EventEmitter {
  private subscriptions: Map<string, SubscriptionRecord> = new Map();
  private subscriptionsByType: Map<GameEventType, Set<string>> = new Map();
  private globalSubscriptions: Set<string> = new Set();
  private eventHistory: GameEvent[] = [];
  private maxHistorySize: number;
  private idCounter = 0;
  private paused = false;
  private queuedEvents: GameEvent[] = [];

  constructor(maxHistorySize = 1000) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Subscribe to all events
   */
  subscribe(listener: EventListener): Subscription {
    return this.createSubscription(listener, undefined, undefined, false);
  }

  /**
   * Subscribe to a specific event type
   */
  on(eventType: GameEventType, listener: EventListener): Subscription {
    return this.createSubscription(listener, eventType, undefined, false);
  }

  /**
   * Subscribe to an event type once (auto-unsubscribe after first event)
   */
  once(eventType: GameEventType, listener: EventListener): Subscription {
    return this.createSubscription(listener, eventType, undefined, true);
  }

  /**
   * Subscribe with a custom filter
   */
  filter(filter: EventFilter, listener: EventListener): Subscription {
    return this.createSubscription(listener, undefined, filter, false);
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: GameEvent): void {
    // If paused, queue the event
    if (this.paused) {
      this.queuedEvents.push(event);
      return;
    }

    // Add to history
    this.addToHistory(event);

    // Get subscriptions to notify
    const subscriptionsToNotify: SubscriptionRecord[] = [];

    // Add global subscribers
    for (const id of this.globalSubscriptions) {
      const sub = this.subscriptions.get(id);
      if (sub) {
        subscriptionsToNotify.push(sub);
      }
    }

    // Add type-specific subscribers
    const typeSubscriptions = this.subscriptionsByType.get(event.type);
    if (typeSubscriptions) {
      for (const id of typeSubscriptions) {
        const sub = this.subscriptions.get(id);
        if (sub && !this.globalSubscriptions.has(id)) {
          subscriptionsToNotify.push(sub);
        }
      }
    }

    // Notify subscribers
    const toRemove: string[] = [];

    for (const sub of subscriptionsToNotify) {
      // Check filter if present
      if (sub.filter && !sub.filter(event)) {
        continue;
      }

      try {
        sub.listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }

      // Mark for removal if once
      if (sub.once) {
        toRemove.push(sub.id);
      }
    }

    // Remove one-time subscriptions
    for (const id of toRemove) {
      this.removeSubscription(id);
    }
  }

  /**
   * Emit multiple events in order
   */
  emitAll(events: GameEvent[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  /**
   * Pause event emission (events are queued)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume event emission and flush queued events
   */
  resume(): void {
    this.paused = false;
    const queued = [...this.queuedEvents];
    this.queuedEvents = [];
    this.emitAll(queued);
  }

  /**
   * Clear queued events without emitting
   */
  clearQueue(): void {
    this.queuedEvents = [];
  }

  /**
   * Get event history
   */
  getHistory(): GameEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get events of a specific type from history
   */
  getHistoryByType(eventType: GameEventType): GameEvent[] {
    return this.eventHistory.filter((e) => e.type === eventType);
  }

  /**
   * Get recent events (last N)
   */
  getRecentEvents(count: number): GameEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get number of active subscriptions
   */
  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Remove all subscriptions
   */
  removeAllSubscriptions(): void {
    this.subscriptions.clear();
    this.subscriptionsByType.clear();
    this.globalSubscriptions.clear();
  }

  /**
   * Create a subscription record
   */
  private createSubscription(
    listener: EventListener,
    eventType?: GameEventType,
    filter?: EventFilter,
    once = false
  ): Subscription {
    const id = `sub_${this.idCounter++}`;

    const record: SubscriptionRecord = {
      id,
      listener,
      eventType,
      filter,
      once,
    };

    this.subscriptions.set(id, record);

    if (eventType) {
      if (!this.subscriptionsByType.has(eventType)) {
        this.subscriptionsByType.set(eventType, new Set());
      }
      this.subscriptionsByType.get(eventType)!.add(id);
    } else {
      this.globalSubscriptions.add(id);
    }

    return {
      id,
      unsubscribe: () => this.removeSubscription(id),
    };
  }

  /**
   * Remove a subscription
   */
  private removeSubscription(id: string): void {
    const record = this.subscriptions.get(id);
    if (!record) return;

    this.subscriptions.delete(id);

    if (record.eventType) {
      this.subscriptionsByType.get(record.eventType)?.delete(id);
    } else {
      this.globalSubscriptions.delete(id);
    }
  }

  /**
   * Add event to history with size limit
   */
  private addToHistory(event: GameEvent): void {
    this.eventHistory.push(event);

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Create a promise that resolves when a specific event occurs
 */
export function waitForEvent(
  emitter: EventEmitter,
  eventType: GameEventType,
  timeout?: number
): Promise<GameEvent> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | undefined;

    const subscription = emitter.once(eventType, (event) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      resolve(event);
    });

    if (timeout) {
      timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error(`Timeout waiting for event: ${eventType}`));
      }, timeout);
    }
  });
}

/**
 * Create an event collector for testing
 */
export function createEventCollector(emitter: EventEmitter): {
  events: GameEvent[];
  subscription: Subscription;
  clear: () => void;
} {
  const events: GameEvent[] = [];
  const subscription = emitter.subscribe((event) => {
    events.push(event);
  });

  return {
    events,
    subscription,
    clear: () => {
      events.length = 0;
    },
  };
}

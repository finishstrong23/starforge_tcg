/**
 * STARFORGE — Telemetry
 *
 * Lightweight event logging for the launch playtest. No backend required;
 * events are persisted in localStorage as a rolling buffer (cap 500). A
 * hidden debug panel (?debug=1) lets the user export the buffer as JSON
 * to share with the dev team.
 *
 * For server-side aggregation, point the optional `endpoint` at any HTTP
 * POST receiver (Vercel Function, PostHog, custom endpoint). The client
 * fires events fire-and-forget via fetch with keepalive — failures are
 * silent so analytics never block gameplay.
 *
 * Vercel Web Analytics (page views) is enabled separately in the Vercel
 * dashboard and auto-injects its script tag — no code changes needed.
 */

export type TelemetryEventType =
  | 'session_start'
  | 'faction_picked'
  | 'run_start'
  | 'run_end'
  | 'combat_start'
  | 'combat_end'
  | 'card_picked'
  | 'relic_picked'
  | 'potion_picked'
  | 'shop_visited'
  | 'rest_used';

export interface TelemetryEvent {
  type: TelemetryEventType;
  /** Unix ms timestamp. */
  ts: number;
  /** Per-session id. Stable for the lifetime of a tab. */
  sessionId: string;
  /** Arbitrary payload (faction, victory, floor, cause, etc.). */
  payload: Record<string, unknown>;
}

const STORAGE_KEY = 'sf:telemetry:v1';
const MAX_BUFFER  = 500;

let cachedSessionId: string | null = null;

function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  // Cheap, collision-resistant enough for a session bucket.
  cachedSessionId = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return cachedSessionId;
}

function readBuffer(): TelemetryEvent[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(buf: TelemetryEvent[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buf));
  } catch {
    // localStorage may be full or disabled — silently drop.
  }
}

/** Optional remote endpoint for fire-and-forget POSTs. Set via setTelemetryEndpoint. */
let remoteEndpoint: string | null = null;

export function setTelemetryEndpoint(url: string | null): void {
  remoteEndpoint = url;
}

/**
 * Log an event. Persists to localStorage and (optionally) POSTs to the
 * configured remote endpoint with `keepalive` so it survives tab close.
 * Never throws, never blocks.
 */
export function logEvent(type: TelemetryEventType, payload: Record<string, unknown> = {}): void {
  const event: TelemetryEvent = {
    type,
    ts: Date.now(),
    sessionId: getSessionId(),
    payload,
  };

  const buf = readBuffer();
  buf.push(event);
  // Drop oldest events past the cap so the buffer doesn't grow unbounded.
  if (buf.length > MAX_BUFFER) buf.splice(0, buf.length - MAX_BUFFER);
  writeBuffer(buf);

  if (remoteEndpoint && typeof fetch !== 'undefined') {
    try {
      void fetch(remoteEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => { /* swallow */ });
    } catch {
      /* swallow */
    }
  }
}

/** Read the entire stored buffer. Used by the debug panel. */
export function getEvents(): TelemetryEvent[] {
  return readBuffer();
}

/** Wipe the buffer. */
export function clearEvents(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* swallow */ }
}

/** Pretty JSON dump for sharing. */
export function exportAsJSON(): string {
  return JSON.stringify(getEvents(), null, 2);
}

/** Aggregate counts by event type — useful summary for the debug panel. */
export function summarize(): Record<TelemetryEventType, number> {
  const counts = {} as Record<TelemetryEventType, number>;
  for (const e of getEvents()) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  return counts;
}

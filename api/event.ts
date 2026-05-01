/**
 * STARFORGE — Telemetry intake (Vercel Function).
 *
 * Accepts POSTed telemetry events from the client and console.logs them.
 * Vercel retains function logs in the Vercel dashboard's "Logs" tab —
 * 24 h on the Hobby (free) tier, longer on paid. Use `npm run telemetry:fetch`
 * + the aggregation script (scripts/aggregate-telemetry.mjs) to summarise.
 *
 * To upgrade to durable storage later, swap the console.log for:
 *   - PostHog SDK call (free tier 1M events/mo, no cookies)
 *   - Vercel KV / Postgres / Neon (durable, paid)
 *   - Custom Webhook out
 *
 * The client already supports an arbitrary endpoint URL via
 * setTelemetryEndpoint() in src/dungeon/engine/telemetry.ts.
 *
 * Privacy: this function never sets cookies, never returns identifying
 * data, and only logs the event payload as supplied by the client. The
 * client's sessionId is a per-tab random string (not user-linked).
 */

interface TelemetryRequestEvent {
  type: string;
  ts: number;
  sessionId: string;
  payload: Record<string, unknown>;
}

const ALLOWED_TYPES = new Set([
  'session_start',
  'faction_picked',
  'run_start',
  'run_end',
  'combat_start',
  'combat_end',
  'card_picked',
  'relic_picked',
  'potion_picked',
  'shop_visited',
  'rest_used',
]);

const MAX_PAYLOAD_BYTES = 4_000;

// Vercel-style handler. Works for both Edge and Node runtimes.
export default async function handler(request: Request): Promise<Response> {
  // Health check / GET — useful for confirming the route is wired.
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, route: '/api/event' }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // Cap payload size so a misbehaving client can't flood the logs.
  const cl = request.headers.get('content-length');
  if (cl && parseInt(cl) > MAX_PAYLOAD_BYTES) {
    return new Response('payload too large', { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return new Response('payload too large', { status: 413 });
    }
  } catch {
    return new Response('bad request', { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  // Basic shape validation. Don't be strict — clients may add fields.
  if (!body || typeof body !== 'object') {
    return new Response('invalid event', { status: 400 });
  }
  const ev = body as Partial<TelemetryRequestEvent>;
  if (typeof ev.type !== 'string' || !ALLOWED_TYPES.has(ev.type)) {
    return new Response('unknown event type', { status: 400 });
  }
  if (typeof ev.ts !== 'number' || !Number.isFinite(ev.ts)) {
    return new Response('invalid timestamp', { status: 400 });
  }
  if (typeof ev.sessionId !== 'string' || ev.sessionId.length < 4 || ev.sessionId.length > 64) {
    return new Response('invalid session id', { status: 400 });
  }

  // Tag with server-side metadata for triage. Country / city come from
  // Vercel's geo-headers if available, no IP stored.
  const country = request.headers.get('x-vercel-ip-country') ?? '';
  const ua = request.headers.get('user-agent') ?? '';

  // Single-line JSON so the Vercel log viewer can parse / filter cleanly.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    src: 'starforge.event',
    type: ev.type,
    ts: ev.ts,
    sid: ev.sessionId,
    country,
    ua: ua.slice(0, 120),
    payload: ev.payload ?? {},
  }));

  return new Response(null, { status: 204 });
}

// Vercel config: edge runtime is faster + cheaper for this kind of
// fire-and-forget endpoint, and avoids cold-starting a Node container
// for every event POST.
export const config = { runtime: 'edge' };

/**
 * Smoke test for the Vercel telemetry intake function. We can't exercise
 * the runtime here (no edge / Vercel context in Jest), but we can drive
 * the pure handler with synthetic Request objects and assert the
 * validation contract holds.
 *
 * The handler imports nothing from the dungeon engine — it's a pure
 * "validate body shape, console.log, return" function — so this is
 * safe to run in the Node test environment.
 */

import handler from '../../api/event';

function reqJSON(method: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/event', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

describe('api/event — validation contract', () => {
  // Silence the handler's intentional console.log during tests.
  const originalLog = console.log;
  beforeAll(() => { console.log = () => { /* swallow */ }; });
  afterAll(()  => { console.log = originalLog; });

  it('GET returns 200 with health payload', async () => {
    const res = await handler(new Request('https://example.test/api/event', { method: 'GET' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('non-POST methods (other than GET) return 405', async () => {
    for (const method of ['PUT', 'DELETE', 'PATCH']) {
      const res = await handler(new Request('https://example.test/api/event', { method }));
      expect(res.status).toBe(405);
    }
  });

  it('invalid JSON returns 400', async () => {
    const res = await handler(new Request('https://example.test/api/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not-json{',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects unknown event types', async () => {
    const res = await handler(reqJSON('POST', {
      type: 'definitely_not_a_real_event',
      ts: Date.now(),
      sessionId: 's_test1234',
      payload: {},
    }));
    expect(res.status).toBe(400);
  });

  it('rejects bad timestamps', async () => {
    const res = await handler(reqJSON('POST', {
      type: 'run_start',
      ts: 'oops',
      sessionId: 's_test1234',
      payload: {},
    }));
    expect(res.status).toBe(400);
  });

  it('rejects too-short or too-long session ids', async () => {
    for (const sid of ['', 'ab', 'x'.repeat(200)]) {
      const res = await handler(reqJSON('POST', {
        type: 'run_start',
        ts: 1,
        sessionId: sid,
        payload: {},
      }));
      expect(res.status).toBe(400);
    }
  });

  it('accepts a well-formed run_start and returns 204', async () => {
    const res = await handler(reqJSON('POST', {
      type: 'run_start',
      ts: Date.now(),
      sessionId: 's_test_ok_1',
      payload: { faction: 'Pyroclast', ascensionLevel: 3 },
    }));
    expect(res.status).toBe(204);
  });

  it('accepts every event type from the public union', async () => {
    const types = [
      'session_start', 'faction_picked', 'run_start', 'run_end',
      'combat_start', 'combat_end', 'card_picked', 'relic_picked',
      'potion_picked', 'shop_visited', 'rest_used',
    ];
    for (const type of types) {
      const res = await handler(reqJSON('POST', {
        type,
        ts: Date.now(),
        sessionId: 's_test_union',
        payload: {},
      }));
      expect(res.status).toBe(204);
    }
  });
});

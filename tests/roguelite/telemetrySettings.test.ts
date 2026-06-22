import {
  clearEvents,
  getEvents,
  getTelemetrySettings,
  isRemoteTelemetryEnabled,
  logEvent,
  setRemoteTelemetryEnabled,
  setTelemetryEndpoint,
} from '../../src/dungeon/engine/telemetry';

class MemStore {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

beforeAll(() => {
  // @ts-expect-error - Storage-shaped test double.
  globalThis.localStorage = new MemStore();
});

beforeEach(() => {
  localStorage.clear();
  clearEvents();
  setTelemetryEndpoint(null);
  setRemoteTelemetryEnabled(true);
  jest.restoreAllMocks();
});

describe('Phase 8 telemetry settings', () => {
  it('defaults remote telemetry to enabled for production playtests', () => {
    expect(getTelemetrySettings()).toEqual({ remoteEnabled: true });
    expect(isRemoteTelemetryEnabled()).toBe(true);
  });

  it('persists the remote telemetry opt-out', () => {
    setRemoteTelemetryEnabled(false);

    expect(getTelemetrySettings()).toEqual({ remoteEnabled: false });
    expect(isRemoteTelemetryEnabled()).toBe(false);
  });

  it('keeps local feedback telemetry while remote telemetry is disabled', () => {
    setTelemetryEndpoint('/api/event');
    setRemoteTelemetryEnabled(false);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    logEvent('run_start', { faction: 'Pyroclast' });

    expect(getEvents()).toHaveLength(1);
    expect(getEvents()[0].type).toBe('run_start');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records run_abandoned as a first-class event', () => {
    logEvent('run_abandoned', { faction: 'Pyroclast', phase: 'combat' });

    expect(getEvents()).toHaveLength(1);
    expect(getEvents()[0]).toEqual(expect.objectContaining({
      type: 'run_abandoned',
      payload: expect.objectContaining({ faction: 'Pyroclast', phase: 'combat' }),
    }));
  });

  it('sends remote telemetry when endpoint and settings allow it', () => {
    setTelemetryEndpoint('/api/event');
    setRemoteTelemetryEnabled(true);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchMock;

    logEvent('run_end', { victory: false });

    expect(getEvents()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/event', expect.objectContaining({
      method: 'POST',
      keepalive: true,
    }));
  });
});

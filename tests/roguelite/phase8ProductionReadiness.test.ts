import {
  DUNGEON_SAVE_SCHEMA_VERSION,
  DUNGEON_SAVE_STORAGE_KEY,
  createDungeonSaveSnapshot,
  getContextStateFromSave,
  loadDungeonSaveSnapshot,
  normalizeDungeonSaveSnapshot,
  saveDungeonSaveSnapshot,
} from '../../src/dungeon/engine/saveCompatibility';
import {
  DUNGEON_FEEDBACK_EXCLUDED_FIELDS,
  DUNGEON_FEEDBACK_INCLUDED_FIELDS,
  DUNGEON_FEEDBACK_SCHEMA_VERSION,
  createDungeonFeedbackBundle,
  summarizeRunForFeedback,
} from '../../src/dungeon/engine/feedbackExport';
import { DUNGEON_BUILD_VERSION } from '../../src/dungeon/engine/buildInfo';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { logEvent } from '../../src/dungeon/engine/telemetry';
import type { RunState } from '../../src/dungeon/types';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

interface SaveFixture {
  description: string;
  expect: {
    valid: boolean;
    seed?: string;
    faction?: string;
    phase?: string;
    potions?: unknown[];
    runModifiers?: unknown[];
    totalDamageDealt?: number;
  };
  snapshot: unknown;
}

function loadSaveFixtures(): Array<{ name: string; fixture: SaveFixture }> {
  const fixtureDir = path.resolve(__dirname, '../fixtures/dungeon-saves');
  return readdirSync(fixtureDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({
      name,
      fixture: JSON.parse(readFileSync(path.join(fixtureDir, name), 'utf8')) as SaveFixture,
    }));
}

class MemStore {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

function fakeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    phase: 'map',
    seed: 'phase-8-seed',
    currentAct: 1,
    actMaps: [],
    deck: getStarterCards('Pyroclast'),
    hand: [],
    relics: [],
    gold: 33,
    maxHealth: 72,
    currentHealth: 45,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel: 2,
    combatState: null,
    potions: [null, null, null],
    runModifiers: [],
    runStats: {
      totalCombats: 3,
      elitesDefeated: 1,
      bossesDefeated: 0,
      cardsPlayed: 22,
      totalDamageDealt: 140,
    },
    ...overrides,
  };
}

beforeAll(() => {
  // @ts-expect-error - tiny Storage-shaped test double.
  globalThis.localStorage = new MemStore();
});

beforeEach(() => {
  localStorage.clear();
});

describe('Phase 8 save compatibility', () => {
  it('writes versioned dungeon save snapshots', () => {
    const snapshot = createDungeonSaveSnapshot({
      run: fakeRun(),
      draftFaction: 'Pyroclast',
      draftRound: 3,
      draftOptions: [],
      draftPicks: [],
      seed: 'phase-8-seed',
    }, 1000);

    expect(snapshot?.schemaVersion).toBe(DUNGEON_SAVE_SCHEMA_VERSION);
    expect(snapshot?.buildVersion).toBe(DUNGEON_BUILD_VERSION);
    expect(snapshot?.lastSavedAt).toBe(1000);
    expect(snapshot?.run?.seed).toBe('phase-8-seed');
  });

  it('migrates legacy raw context saves into the current shape', () => {
    const legacy = {
      run: {
        ...fakeRun({ seed: undefined, runModifiers: undefined }),
        potions: undefined,
        runStats: {
          totalCombats: 2,
          elitesDefeated: 0,
          bossesDefeated: 0,
          cardsPlayed: 8,
        },
      },
      draftFaction: 'Pyroclast',
      draftRound: 2,
      draftOptions: [],
      draftPicks: [],
    };

    const migrated = normalizeDungeonSaveSnapshot(legacy, 2000);

    expect(migrated?.schemaVersion).toBe(DUNGEON_SAVE_SCHEMA_VERSION);
    expect(migrated?.buildVersion).toBe('legacy');
    expect(migrated?.run?.seed).toBe('legacy-2000');
    expect(migrated?.run?.potions).toEqual([null, null, null]);
    expect(migrated?.run?.runModifiers).toEqual([]);
    expect(migrated?.run?.runStats.totalDamageDealt).toBe(0);
    expect(getContextStateFromSave(migrated!).draftFaction).toBe('Pyroclast');
  });

  it('rejects completed saves so run-end screens do not resurrect', () => {
    expect(normalizeDungeonSaveSnapshot({
      run: fakeRun({ phase: 'run_end_loss' }),
      draftFaction: 'Pyroclast',
    })).toBeNull();
  });

  it('loads and saves through the storage key used by the app', () => {
    const snapshot = createDungeonSaveSnapshot({
      run: fakeRun(),
      draftFaction: 'Pyroclast',
      draftRound: 1,
      draftOptions: [],
      draftPicks: [],
      seed: 'phase-8-seed',
    }, 3000)!;

    saveDungeonSaveSnapshot(snapshot);
    expect(localStorage.getItem(DUNGEON_SAVE_STORAGE_KEY)).not.toBeNull();

    const loaded = loadDungeonSaveSnapshot(3001);
    expect(loaded?.schemaVersion).toBe(DUNGEON_SAVE_SCHEMA_VERSION);
    expect(loaded?.run?.seed).toBe('phase-8-seed');
  });

  it.each(loadSaveFixtures())('migrates save fixture: $name', ({ fixture }) => {
    const migrated = normalizeDungeonSaveSnapshot(fixture.snapshot, 5000);

    if (!fixture.expect.valid) {
      expect(migrated).toBeNull();
      return;
    }

    expect(migrated).not.toBeNull();
    expect(migrated?.schemaVersion).toBe(DUNGEON_SAVE_SCHEMA_VERSION);
    expect(migrated?.run?.seed).toBe(fixture.expect.seed);
    expect(migrated?.draftFaction).toBe(fixture.expect.faction);
    expect(migrated?.run?.phase).toBe(fixture.expect.phase);
    expect(migrated?.run?.potions).toEqual(fixture.expect.potions);
    expect(migrated?.run?.runModifiers).toEqual(fixture.expect.runModifiers);
    expect(migrated?.run?.runStats.totalDamageDealt).toBe(fixture.expect.totalDamageDealt);
  });
});

describe('Phase 8 feedback export', () => {
  it('summarizes a run without requiring private player data', () => {
    const summary = summarizeRunForFeedback(fakeRun(), 'Pyroclast');

    expect(summary.seed).toBe('phase-8-seed');
    expect(summary.faction).toBe('Pyroclast');
    expect(summary.deck[0]).toEqual(expect.objectContaining({ id: 'P-001', upgraded: false }));
    expect(summary.stats.totalDamageDealt).toBe(140);
  });

  it('builds a beta feedback bundle with build, run, meta, and recent telemetry', () => {
    logEvent('run_start', { faction: 'Pyroclast', seed: 'phase-8-seed' });
    logEvent('run_end', { victory: false, act: 1 });

    const bundle = createDungeonFeedbackBundle(fakeRun(), 'Pyroclast', 4000);

    expect(bundle.schemaVersion).toBe(DUNGEON_FEEDBACK_SCHEMA_VERSION);
    expect(bundle.createdAt).toBe(4000);
    expect(bundle.build.version).toBe(DUNGEON_BUILD_VERSION);
    expect(bundle.run?.seed).toBe('phase-8-seed');
    expect(bundle.telemetry.totalEvents).toBe(2);
    expect(bundle.telemetry.recentEvents.map((event) => event.type)).toEqual(['run_start', 'run_end']);
  });

  it('documents privacy boundaries for tester-facing feedback copy', () => {
    const bundle = createDungeonFeedbackBundle(fakeRun(), 'Pyroclast', 5000);
    const serialized = JSON.stringify(bundle).toLowerCase();

    expect(DUNGEON_FEEDBACK_INCLUDED_FIELDS).toEqual(expect.arrayContaining([
      'build version',
      'seed',
      'faction',
      'recent telemetry events',
    ]));
    expect(DUNGEON_FEEDBACK_EXCLUDED_FIELDS).toEqual(expect.arrayContaining([
      'name',
      'email',
      'account id',
      'payment data',
      'full localStorage dump',
    ]));
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('account');
    expect(serialized).not.toContain('payment');
  });
});

import {
  MAX_RECENT_DUNGEON_RUNS,
  applyRunToDungeonMeta,
  deriveDungeonBadges,
  emptyDungeonMeta,
  summarizeDungeonRun,
} from '../../src/dungeon/engine/metaProgression';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import type { AscensionLevel, RelicDefinition, RunState } from '../../src/dungeon/types';

const relic = (id: string): RelicDefinition => ({
  id,
  name: id,
  description: 'Test relic.',
  flavor: 'Test.',
  trigger: 'passive',
  rarity: 'Common',
  art: '*',
});

function fakeRun(overrides: Partial<RunState> = {}): RunState {
  return {
    phase: 'run_end_loss',
    seed: 'phase-7-seed',
    currentAct: 1,
    actMaps: [],
    deck: getStarterCards('Pyroclast'),
    hand: [],
    relics: [],
    gold: 0,
    maxHealth: 72,
    currentHealth: 12,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel: 0,
    combatState: null,
    potions: [null, null, null],
    runModifiers: [],
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
    ...overrides,
  };
}

describe('Phase 7 dungeon meta progression', () => {
  it('derives challenge badges from final run state', () => {
    const run = fakeRun({
      phase: 'run_end_win',
      currentAct: 3,
      currentHealth: 72,
      deck: [...getStarterCards('Pyroclast'), ...getStarterCards('Pyroclast'), ...getStarterCards('Pyroclast')],
      relics: Array.from({ length: 8 }, (_, i) => relic(`R-${i}`)),
      runStats: {
        totalCombats: 12,
        elitesDefeated: 3,
        bossesDefeated: 3,
        cardsPlayed: 80,
        totalDamageDealt: 900,
      },
    });

    expect(deriveDungeonBadges(run, true)).toEqual(expect.arrayContaining([
      'first_run',
      'first_victory',
      'act_one_clear',
      'act_two_clear',
      'elite_hunter',
      'boss_breaker',
      'big_deck',
      'relic_hoard',
      'perfect_finish',
    ]));
  });

  it('summarizes a run into a history entry', () => {
    const run = fakeRun({
      currentAct: 2,
      ascensionLevel: 4,
      currentHealth: 3,
      gold: 123,
      runStats: {
        totalCombats: 5,
        elitesDefeated: 1,
        bossesDefeated: 1,
        cardsPlayed: 44,
        totalDamageDealt: 321,
      },
    });

    const entry = summarizeDungeonRun(run, 'Pyroclast', true, 1000);

    expect(entry.runId).toBe('phase-7-seed:Pyroclast:A4:W:2:5:1:1');
    expect(entry.faction).toBe('Pyroclast');
    expect(entry.victory).toBe(true);
    expect(entry.ascensionLevel).toBe(4);
    expect(entry.badges).toContain('close_call');
    expect(entry.totalDamageDealt).toBe(321);
  });

  it('updates aggregate stats, unlocks badges, and trims recent history', () => {
    let meta = emptyDungeonMeta(1);
    for (let i = 0; i < MAX_RECENT_DUNGEON_RUNS + 5; i++) {
      const run = fakeRun({
        seed: `run-${i}`,
        currentAct: (i % 3 + 1) as 1 | 2 | 3,
        ascensionLevel: (i % 5) as AscensionLevel,
        runStats: {
          totalCombats: 2,
          elitesDefeated: i % 2,
          bossesDefeated: i % 3,
          cardsPlayed: 10,
          totalDamageDealt: 50,
        },
      });
      meta = applyRunToDungeonMeta(meta, summarizeDungeonRun(run, 'Luminar', i % 4 === 0, 1000 + i));
    }

    expect(meta.recentRuns).toHaveLength(MAX_RECENT_DUNGEON_RUNS);
    expect(meta.stats.totalRuns).toBe(MAX_RECENT_DUNGEON_RUNS + 5);
    expect(meta.stats.victories).toBe(14);
    expect(meta.stats.bestActReached).toBe(3);
    expect(meta.stats.highestAscensionByFaction.Luminar).toBe(4);
    expect(meta.unlockedBadges).toContain('first_run');
    expect(meta.recentRuns[0].runId).toBe(`run-${MAX_RECENT_DUNGEON_RUNS + 4}:Luminar:A4:L:1:2:0:0`);
  });

  it('does not double-count the same completed run', () => {
    const run = fakeRun({
      seed: 'duplicate-run',
      currentAct: 2,
      runStats: {
        totalCombats: 4,
        elitesDefeated: 1,
        bossesDefeated: 1,
        cardsPlayed: 24,
        totalDamageDealt: 180,
      },
    });
    const entry = summarizeDungeonRun(run, 'Pyroclast', false, 2000);

    let meta = applyRunToDungeonMeta(emptyDungeonMeta(1), entry);
    meta = applyRunToDungeonMeta(meta, { ...entry, completedAt: 2001 });

    expect(meta.recentRuns).toHaveLength(1);
    expect(meta.stats.totalRuns).toBe(1);
    expect(meta.stats.totalCombats).toBe(4);
    expect(meta.lastUpdatedAt).toBe(2001);
  });
});

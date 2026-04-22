import {
  createPersistence,
  InMemoryAdapter,
  RUNS_DB_NAME,
  META_DB_NAME,
  createNewRun,
  resumeLatestRun,
  endRun,
  emptyMeta,
} from '../../src/roguelite';
import type { CombatState, RunState } from '../../src/roguelite';

function makeTestPersistence() {
  return createPersistence(new InMemoryAdapter());
}

describe('roguelite persistence', () => {
  it('round-trips a RunState through save/load', async () => {
    const p = makeTestPersistence();
    const run = createNewRun({ factionId: 'Pyroclast' });
    const saved = await p.runs.save(run);

    const loaded = await p.runs.get(run.runId);
    expect(loaded).toBeDefined();
    expect(loaded!.runId).toEqual(run.runId);
    expect(loaded!.factionId).toEqual('Pyroclast');
    expect(loaded!.deck.length).toEqual(10);
    expect(loaded!.lastSavedAt).toEqual(saved.lastSavedAt);
    expect(loaded!.schemaVersion).toEqual(1);
  });

  it('lists runs newest-first by lastSavedAt', async () => {
    const p = makeTestPersistence();
    // save() always stamps lastSavedAt = Date.now(), so we sequence saves
    // across a real delay to guarantee ordering.
    const a = await p.runs.save(createNewRun({ factionId: 'Pyroclast' }));
    await new Promise((r) => setTimeout(r, 5));
    const b = await p.runs.save(createNewRun({ factionId: 'Luminar' }));
    const list = await p.runs.listAll();
    expect(list.map((r) => r.runId)).toEqual([b.runId, a.runId]);
    expect(list[0].lastSavedAt).toBeGreaterThanOrEqual(list[1].lastSavedAt);
  });

  it('getActive skips character_select and ended runs', async () => {
    const p = makeTestPersistence();
    const selecting = createNewRun({ factionId: 'Pyroclast' });          // phase: character_select
    const playing = { ...createNewRun({ factionId: 'Luminar' }), phase: 'map' as const };
    const finished = { ...createNewRun({ factionId: 'Cogsmiths' }), phase: 'run_end_win' as const };
    await p.runs.save(selecting);
    const savedPlaying = await p.runs.save(playing);
    await p.runs.save(finished);

    const active = await resumeLatestRun(p.runs);
    expect(active?.runId).toEqual(savedPlaying.runId);
  });

  it('returns undefined when no resumable run exists', async () => {
    const p = makeTestPersistence();
    expect(await resumeLatestRun(p.runs)).toBeUndefined();
  });

  it('preserves a mid-combat CombatState through save/resume', async () => {
    const p = makeTestPersistence();
    const run = createNewRun({ factionId: 'WarpRiders' });
    const combat: CombatState = {
      combatId: 'test-combat',
      phase: 'player_turn',
      turnNumber: 3,
      energy: 1,
      maxEnergyThisTurn: 3,
      hand: run.deck.slice(0, 4),
      drawPile: run.deck.slice(4, 9),
      discardPile: [],
      exhaustPile: [],
      playerStatuses: [
        { id: 'Block', stacks: 5 },
        { id: 'Vulnerable', stacks: 2, duration: 2 },
      ],
      rifts: [],
      enemies: [
        {
          enemyInstanceId: 'e1',
          enemyDefinitionId: 'E-001',
          currentHealth: 37,
          maxHealth: 50,
          currentBlock: 0,
          statusEffects: [],
          currentIntent: { type: 'attack', value: 8, description: 'Crack skull' },
          intentIndex: 2,
          traitIds: [],
        },
      ],
      rngState: 'deadbeefcafe1234',
      actionLog: [
        { turn: 1, sequence: 0, action: 'play_card', cardInstanceId: run.deck[0].instanceId, summary: 'Played a card' },
      ],
    };
    const midCombat: RunState = { ...run, phase: 'combat', combatState: combat };
    await p.runs.save(midCombat);

    const resumed = await resumeLatestRun(p.runs);
    expect(resumed).toBeDefined();
    expect(resumed!.phase).toEqual('combat');
    expect(resumed!.combatState).toEqual(combat);
    expect(resumed!.combatState!.turnNumber).toEqual(3);
    expect(resumed!.combatState!.playerStatuses).toEqual(combat.playerStatuses);
    expect(resumed!.combatState!.rngState).toEqual('deadbeefcafe1234');
  });

  it('meta store is isolated from run store', async () => {
    const p = makeTestPersistence();
    // Save a run and meta; wipe the runs DB; meta must survive.
    const run = createNewRun({ factionId: 'Cogsmiths' });
    await p.runs.save(run);
    const meta = emptyMeta();
    meta.relicTokens.count = 5;
    meta.masteries.push({
      factionId: 'Cogsmiths',
      xp: 42,
      level: 1,
      runsAttempted: 1,
      runsCompleted: 0,
      highestAscension: 0,
    });
    await p.meta.save(meta);

    await p.runs.clear();

    // Runs DB gone
    expect(await p.runs.listAll()).toEqual([]);
    // Meta survives
    const reloaded = await p.meta.load();
    expect(reloaded.relicTokens.count).toEqual(5);
    expect(reloaded.masteries[0].xp).toEqual(42);
  });

  it('endRun archives summary into MetaProgression.recentRuns and deletes the run', async () => {
    const p = makeTestPersistence();
    const run = { ...createNewRun({ factionId: 'Pyroclast' }), phase: 'map' as const };
    const saved = await p.runs.save(run);
    const withStats: RunState = {
      ...saved,
      runStats: {
        ...saved.runStats,
        totalDamageDealt: 150,
        totalCombats: 4,
      },
    };
    await endRun(p.runs, withStats, true, p.meta);

    // Run deleted
    expect(await p.runs.get(run.runId)).toBeUndefined();
    // Meta has the summary
    const m = await p.meta.load();
    expect(m.recentRuns.length).toEqual(1);
    expect(m.recentRuns[0].runId).toEqual(run.runId);
    expect(m.recentRuns[0].victory).toEqual(true);
    expect(m.recentRuns[0].totalDamageDealt).toEqual(150);
  });

  it('recentRuns is trimmed to 50 entries', async () => {
    const p = makeTestPersistence();
    for (let i = 0; i < 55; i++) {
      const run = { ...createNewRun({ factionId: 'Luminar' }), phase: 'map' as const };
      await p.runs.save(run);
      await endRun(p.runs, run, false, p.meta);
    }
    const m = await p.meta.load();
    expect(m.recentRuns.length).toEqual(50);
  });

  it('uses the correct database names for isolation', async () => {
    // Guard against a regression where both stores drift into the same DB.
    expect(RUNS_DB_NAME).not.toEqual(META_DB_NAME);
  });
});

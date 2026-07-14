import { simulateCertifiedPyroclastRun } from './helpers/dungeonScenarioHarness';
import type { NodeType } from '../../src/dungeon/types';

describe('Pyroclast MVP run certification harness', () => {
  it('is deterministic for the same seed and options', () => {
    const options = { maxActs: 1 as const, maxTurnsPerCombat: 36, maxNodesPerAct: 10 };

    const first = simulateCertifiedPyroclastRun('pyro-cert-determinism', options);
    const second = simulateCertifiedPyroclastRun('pyro-cert-determinism', options);

    expect(second).toEqual(first);
  });

  it('stress-tests Act 1 Pyroclast runs across many seeds without invalid mechanics state', () => {
    const seeds = Array.from({ length: 30 }, (_, index) => `pyro-cert-seed-${index + 1}`);
    const results = seeds.map((seed) =>
      simulateCertifiedPyroclastRun(seed, {
        maxActs: 1,
        maxTurnsPerCombat: 40,
        maxNodesPerAct: 10,
      }),
    );

    const failures = results.flatMap((result) =>
      result.invariantFailures.map((failure) => `${result.seed}: ${failure}`),
    );

    expect(failures).toEqual([]);
    expect(results.every((result) => result.combatsStarted > 0)).toBe(true);
    expect(results.every((result) => result.combatsStarted === result.combatsWon + result.combatsLost)).toBe(true);
    expect(results.every((result) => result.turnCaps === 0)).toBe(true);
    expect(results.every((result) => result.deckSize >= 8)).toBe(true);
    expect(results.every((result) => result.potionCount >= 0 && result.potionCount <= 3)).toBe(true);
    expect(results.every((result) => result.currentHealth >= 0 && result.currentHealth <= result.maxHealth)).toBe(true);
  });

  it('covers the non-combat dungeon systems over the seed corpus', () => {
    const results = Array.from({ length: 40 }, (_, index) =>
      simulateCertifiedPyroclastRun(`pyro-cert-coverage-${index + 1}`, {
        maxActs: 1,
        maxTurnsPerCombat: 40,
        maxNodesPerAct: 10,
      }),
    );

    const visited = new Set<NodeType>(results.flatMap((result) => result.visitedNodeTypes));
    const totals = results.reduce(
      (acc, result) => ({
        rewardsTaken: acc.rewardsTaken + result.rewardsTaken,
        potionsGained: acc.potionsGained + result.potionsGained,
        potionsUsed: acc.potionsUsed + result.potionsUsed,
        relicsGained: acc.relicsGained + result.relicsGained,
        cardsAdded: acc.cardsAdded + result.cardsAdded,
        cardsRemoved: acc.cardsRemoved + result.cardsRemoved,
        cardsUpgraded: acc.cardsUpgraded + result.cardsUpgraded,
        eventsResolved: acc.eventsResolved + result.eventsResolved,
        shopsVisited: acc.shopsVisited + result.shopsVisited,
        restsVisited: acc.restsVisited + result.restsVisited,
      }),
      {
        rewardsTaken: 0,
        potionsGained: 0,
        potionsUsed: 0,
        relicsGained: 0,
        cardsAdded: 0,
        cardsRemoved: 0,
        cardsUpgraded: 0,
        eventsResolved: 0,
        shopsVisited: 0,
        restsVisited: 0,
      },
    );

    for (const nodeType of ['combat', 'elite', 'shop', 'rest', 'event', 'treasure', 'boss'] as const) {
      expect(visited.has(nodeType)).toBe(true);
    }
    expect(totals.rewardsTaken).toBeGreaterThan(0);
    expect(totals.potionsGained).toBeGreaterThan(0);
    expect(totals.potionsUsed).toBeGreaterThan(0);
    expect(totals.relicsGained).toBeGreaterThan(0);
    expect(totals.cardsAdded).toBeGreaterThan(0);
    expect(totals.cardsRemoved).toBeGreaterThan(0);
    expect(totals.cardsUpgraded).toBeGreaterThan(0);
    expect(totals.eventsResolved).toBeGreaterThan(0);
    expect(totals.shopsVisited).toBeGreaterThan(0);
    expect(totals.restsVisited).toBeGreaterThan(0);
  });
});

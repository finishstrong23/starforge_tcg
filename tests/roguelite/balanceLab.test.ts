import {
  createBalanceReport,
  formatBalanceReport,
  simulateBalanceRun,
} from '../../src/dungeon/engine/balanceLab';

describe('Phase 6 balance lab', () => {
  it('simulates a deterministic run for a faction/profile/seed tuple', () => {
    const a = simulateBalanceRun('Pyroclast', 'aggressive', 'determinism-seed', {
      maxTurnsPerCombat: 18,
      combatsPerAct: 2,
      includeElites: true,
      includeBosses: false,
    });
    const b = simulateBalanceRun('Pyroclast', 'aggressive', 'determinism-seed', {
      maxTurnsPerCombat: 18,
      combatsPerAct: 2,
      includeElites: true,
      includeBosses: false,
    });

    expect(b).toEqual(a);
    expect(a.faction).toBe('Pyroclast');
    expect(a.profile).toBe('aggressive');
    expect(a.combatsWon + a.combatsLost).toBeGreaterThan(0);
    expect(a.deckSize).toBeGreaterThanOrEqual(10);
  });

  it('creates bucket summaries for every requested faction/profile pair', () => {
    const report = createBalanceReport({
      seed: 'summary-seed',
      runsPerProfile: 2,
      maxTurnsPerCombat: 14,
      combatsPerAct: 1,
      includeElites: false,
      includeBosses: false,
      factions: ['Cogsmiths', 'Luminar'],
      profiles: ['random', 'value'],
    });

    expect(report.runs).toHaveLength(8);
    expect(report.summaries).toHaveLength(4);
    for (const summary of report.summaries) {
      expect(summary.runs).toBe(2);
      expect(summary.winRate).toBeGreaterThanOrEqual(0);
      expect(summary.winRate).toBeLessThanOrEqual(1);
      expect(summary.averageTurns).toBeGreaterThanOrEqual(0);
      expect(summary.averageDeckSize).toBeGreaterThanOrEqual(10);
    }
  });

  it('formats a local report suitable for npm run balance:report', () => {
    const report = process.env.BALANCE_REPORT === '1'
      ? createBalanceReport()
      : createBalanceReport({
        seed: 'format-seed',
        runsPerProfile: 1,
        maxTurnsPerCombat: 10,
        combatsPerAct: 1,
        includeElites: false,
        includeBosses: false,
        factions: ['WarpRiders'],
        profiles: ['archetype'],
      });
    const text = formatBalanceReport(report);

    expect(text).toContain('STARFORGE Dungeon Balance Report');
    expect(text).toContain(process.env.BALANCE_REPORT === '1' ? 'Pyroclast/aggressive' : 'WarpRiders/archetype');
    expect(text).toContain('Top card picks');

    if (process.env.BALANCE_REPORT === '1') {
      console.log(`\n${text}\n`);
    }
  });
});

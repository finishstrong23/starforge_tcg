/**
 * STARFORGE TCG - Balance Test Runner
 * Bundles with esbuild and runs via Node.
 * Usage: npx esbuild run-balance-test.ts --bundle --platform=node --outfile=_test.cjs && node _test.cjs
 */

import { AIBattleSimulator } from './src/ai/AIBattleSimulator';
import { Race } from './src/types/Race';

const ALL_RACES = [
  Race.COGSMITHS,
  Race.LUMINAR,
  Race.PYROCLAST,
  Race.VOIDBORN,
  Race.BIOTITANS,
  Race.PHANTOM_CORSAIRS,
  Race.CRYSTALLINE,
  Race.HIVEMIND,
  Race.ASTROMANCERS,
  Race.CHRONOBOUND,
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          STARFORGE TCG — AI Balance Test (10 Races)        ║');
  console.log('║          50 games per matchup · 45 matchups total          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const sim = new AIBattleSimulator({
    gamesPerMatchup: 50,
    maxTurnsPerGame: 60,
    parallelBatchSize: 25,
  });

  const report = await sim.runFullBalanceTest(ALL_RACES, (p) => {
    const pct = ((p.matchupIndex / p.totalMatchups) * 100).toFixed(0);
    process.stdout.write(
      `\r  [${pct.padStart(3)}%] Matchup ${p.matchupIndex}/${p.totalMatchups}: ${p.matchupLabel} (${p.gamesCompleted}/${p.gamesTotal} games)`
    );
  });

  console.log('\n');

  // ── Matchup results table ──
  console.log('┌──────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  MATCHUP RESULTS                                                                │');
  console.log('├────────────────────────────────┬──────┬──────┬──────┬──────┬──────┬──────────────┤');
  console.log('│ Matchup                        │  R1W │  R2W │Draws │  R1% │  R2% │  Avg Turns   │');
  console.log('├────────────────────────────────┼──────┼──────┼──────┼──────┼──────┼──────────────┤');

  for (const m of report.matchups) {
    const label = `${m.race1} vs ${m.race2}`.padEnd(30);
    const r1w = String(m.race1Wins).padStart(4);
    const r2w = String(m.race2Wins).padStart(4);
    const draws = String(m.draws).padStart(4);
    const r1pct = (m.race1WinRate * 100).toFixed(0).padStart(4) + '%';
    const r2pct = (m.race2WinRate * 100).toFixed(0).padStart(4) + '%';
    const avgT = m.averageTurns.toFixed(1).padStart(10);
    console.log(`│ ${label} │${r1w} │${r2w} │${draws} │${r1pct} │${r2pct} │  ${avgT}  │`);
  }

  console.log('└────────────────────────────────┴──────┴──────┴──────┴──────┴──────┴──────────────┘');

  // ── Race win rates ──
  console.log('\n┌──────────────────────────────────────────────────────┐');
  console.log('│  OVERALL RACE WIN RATES                              │');
  console.log('├──────────────────────┬──────┬──────┬──────┬──────────┤');
  console.log('│ Race                 │ Wins │ Loss │Draws │ Win Rate │');
  console.log('├──────────────────────┼──────┼──────┼──────┼──────────┤');

  const sortedRaces = [...report.raceWinRates.entries()].sort((a, b) => b[1].winRate - a[1].winRate);
  for (const [race, stats] of sortedRaces) {
    const name = race.padEnd(20);
    const wins = String(stats.wins).padStart(4);
    const losses = String(stats.losses).padStart(4);
    const draws = String(stats.draws).padStart(4);
    const wr = (stats.winRate * 100).toFixed(1).padStart(6) + '%';
    console.log(`│ ${name} │${wins} │${losses} │${draws} │  ${wr} │`);
  }

  console.log('└──────────────────────┴──────┴──────┴──────┴──────────┘');

  // ── Summary ──
  console.log(`\nTotal games: ${report.totalGames}`);
  console.log(`Total time: ${(report.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`Throughput: ${report.gamesPerSecond} games/sec`);

  // ── Balance assessment ──
  const rates = sortedRaces.map(([, s]) => s.winRate);
  const highest = rates[0];
  const lowest = rates[rates.length - 1];
  const spread = ((highest - lowest) * 100).toFixed(1);

  console.log(`\nBalance spread: ${spread}% (${sortedRaces[0][0]} ${(highest * 100).toFixed(1)}% → ${sortedRaces[sortedRaces.length - 1][0]} ${(lowest * 100).toFixed(1)}%)`);

  if (parseFloat(spread) <= 15) {
    console.log('Assessment: WELL BALANCED — All races within 15% spread.');
  } else if (parseFloat(spread) <= 25) {
    console.log('Assessment: REASONABLY BALANCED — Some variance but within acceptable range.');
  } else {
    console.log('Assessment: IMBALANCED — Significant win rate spread detected. Further tuning needed.');
  }
}

main().catch(err => {
  console.error('Balance test failed:', err);
  process.exit(1);
});

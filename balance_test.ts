import { AIBattleSimulator } from './src/ai/AIBattleSimulator';
import { AIDifficulty } from './src/ai/AIPlayer';
import { Race } from './src/types/Race';

async function main() {
  const sim = new AIBattleSimulator({
    gamesPerMatchup: 200,
    maxTurnsPerGame: 60,
    aiDifficulty: AIDifficulty.HARD,
    parallelBatchSize: 50,
  });
  const allRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN, Race.BIOTITANS,
    Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS, Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  console.log('Running balance test: 100 games per matchup (45 matchups = 4,500 games)...');

  const report = await sim.runFullBalanceTest(allRaces, (p) => {
    if (p.gamesCompleted === p.gamesTotal) {
      console.log(`  [${p.matchupIndex}/${p.totalMatchups}] ${p.matchupLabel} done`);
    }
  });

  console.log('\n=== OVERALL WIN RATES ===');
  const results: { race: string; winRate: number; line: string }[] = [];
  for (const race of allRaces) {
    const stats = report.raceWinRates.get(race);
    if (stats) {
      const total = stats.wins + stats.losses + stats.draws;
      const wr = stats.winRate * 100;
      const flag = wr < 40 ? ' << LOW' : wr > 60 ? ' << HIGH' : '';
      const line = `${race.padEnd(20)} ${wr.toFixed(1)}% (${stats.wins}W ${stats.losses}L ${stats.draws}D / ${total} games)${flag}`;
      results.push({ race, winRate: wr, line });
    }
  }
  results.sort((a, b) => b.winRate - a.winRate);
  for (const r of results) console.log(r.line);

  console.log(`\nTotal: ${report.totalGames} games in ${(report.totalDurationMs / 1000).toFixed(1)}s (${report.gamesPerSecond.toFixed(0)} games/sec)`);

  // Check if all are in 40-60% range
  const outOfRange = results.filter(r => r.winRate < 40 || r.winRate > 60);
  if (outOfRange.length === 0) {
    console.log('\nALL RACES IN 40-60% RANGE - BALANCED!');
  } else {
    console.log(`\n${outOfRange.length} races OUT OF RANGE:`);
    for (const r of outOfRange) console.log(`  ${r.race}: ${r.winRate.toFixed(1)}%`);
  }
}

main().catch(console.error);

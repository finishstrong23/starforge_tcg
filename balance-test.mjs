/**
 * STARFORGE TCG - Balance Test Runner
 * Run with: node balance-test.mjs [gamesPerMatchup]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamesPerMatchup = parseInt(process.argv[2] || '10', 10);

console.log('Building project first...');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  console.error('Build failed!');
  process.exit(1);
}

console.log('\nBuild successful. Running balance test...\n');

const { AIBattleSimulator } = await import('./dist/ai/AIBattleSimulator.js');
const { Race } = await import('./dist/types/Race.js');

const allRaces = [
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.WARP_RIDERS, Race.CRYSTALLINE,
  Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND
];

const simulator = new AIBattleSimulator({ gamesPerMatchup });

const report = await simulator.runFullBalanceTest(allRaces, (opts) => {
  console.log(`  [${opts.matchupIndex}/${opts.totalMatchups}] ${opts.matchupLabel}: ${opts.gamesCompleted}/${opts.gamesTotal} (${opts.gamesPerSecond} games/sec)`);
});

console.log(`\nTotal: ${report.totalGames} games in ${(report.totalDurationMs / 1000).toFixed(1)}s (${report.gamesPerSecond} games/sec)\n`);

console.log('Race Win Rates:');
const sorted = [...report.raceWinRates.entries()].sort((a, b) => b[1].winRate - a[1].winRate);
for (const [race, stats] of sorted) {
  console.log(`  ${race.padEnd(20)} ${(stats.winRate * 100).toFixed(1)}% (${stats.wins}W/${stats.losses}L/${stats.draws}D)`);
}

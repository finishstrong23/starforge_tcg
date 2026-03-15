/**
 * STARFORGE TCG - 1000-Game Stress Test
 *
 * Runs 1000+ AI vs AI games across all 10 faction matchups.
 * Tests all keywords, validates game stability, and reports balance stats.
 *
 * Usage:
 *   node stress-test.mjs              # Run 1000 games (22 per matchup)
 *   node stress-test.mjs 2000         # Run ~2000 games (44 per matchup)
 *   node stress-test.mjs 5000         # Run ~5000 games (111 per matchup)
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetGames = parseInt(process.argv[2] || '1000', 10);

// 10 races → 45 unique matchups
const MATCHUP_COUNT = 45;
const gamesPerMatchup = Math.max(2, Math.ceil(targetGames / MATCHUP_COUNT));
const totalExpected = gamesPerMatchup * MATCHUP_COUNT;

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         STARFORGE TCG — STRESS TEST SUITE               ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log();
console.log(`  Target games:       ~${targetGames}`);
console.log(`  Games per matchup:  ${gamesPerMatchup}`);
console.log(`  Total matchups:     ${MATCHUP_COUNT}`);
console.log(`  Actual total:       ${totalExpected} games`);
console.log(`  AI difficulty:      HARD`);
console.log();

// Step 1: Build
console.log('🔧 Building project...');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  console.error('❌ Build failed!');
  process.exit(1);
}
console.log('✅ Build successful.\n');

// Step 2: Import and run
const { AIBattleSimulator } = await import('./dist/ai/AIBattleSimulator.js');
const { Race } = await import('./dist/types/Race.js');
const { ALL_SAMPLE_CARDS } = await import('./dist/data/SampleCards.js');
const { globalCardDatabase } = await import('./dist/cards/CardDatabase.js');

// Ensure DB is populated
globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);

// Collect keyword stats from all cards
const allCards = ALL_SAMPLE_CARDS;
const keywordCoverage = new Map();
for (const card of allCards) {
  if (card.keywords) {
    for (const kw of card.keywords) {
      const name = typeof kw === 'string' ? kw : kw.keyword;
      if (!keywordCoverage.has(name)) keywordCoverage.set(name, []);
      keywordCoverage.get(name).push(card.name);
    }
  }
}

console.log('📊 Keyword Coverage in Card Pool:');
console.log('─'.repeat(50));
const allKeywords = [
  'GUARDIAN', 'BARRIER', 'SWIFT', 'BLITZ', 'CLOAK',
  'DOUBLE_STRIKE', 'DRAIN', 'LETHAL',
  'DEPLOY', 'LAST_WORDS',
  'SALVAGE', 'UPGRADE', 'ILLUMINATE', 'BANISH',
  'ADAPT', 'RESONATE', 'PHASE', 'SWARM', 'SCRY', 'ECHO'
];

for (const kw of allKeywords) {
  const cards = keywordCoverage.get(kw) || [];
  const status = cards.length > 0 ? `✅ ${cards.length} cards` : '⚠️  0 cards';
  console.log(`  ${kw.padEnd(16)} ${status}`);
}
console.log();

// Step 3: Run the simulation
const allRaces = [
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
  Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND
];

const simulator = new AIBattleSimulator({
  gamesPerMatchup,
  maxTurnsPerGame: 60,
  parallelBatchSize: 50,
});

let lastMatchup = '';
const startTime = Date.now();

console.log('⚔️  Running games...');
console.log('─'.repeat(60));

const report = await simulator.runFullBalanceTest(allRaces, (opts) => {
  if (opts.matchupLabel !== lastMatchup) {
    if (lastMatchup) process.stdout.write('\n');
    lastMatchup = opts.matchupLabel;
    process.stdout.write(`  [${opts.matchupIndex}/${opts.totalMatchups}] ${opts.matchupLabel}: `);
  }
  process.stdout.write('.');
});
process.stdout.write('\n');

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// Step 4: Report results
console.log();
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║                    RESULTS SUMMARY                      ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log();
console.log(`  Total games played:  ${report.totalGames}`);
console.log(`  Total time:          ${elapsed}s`);
console.log(`  Games per second:    ${report.gamesPerSecond}`);
console.log();

// Race win rates
console.log('📈 Race Win Rates (target: 45-55%):');
console.log('─'.repeat(60));

const raceEntries = [...report.raceWinRates.entries()]
  .sort((a, b) => b[1].winRate - a[1].winRate);

for (const [race, stats] of raceEntries) {
  const pct = (stats.winRate * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(stats.winRate * 40));
  const status = stats.winRate >= 0.45 && stats.winRate <= 0.55 ? '✅' :
                 stats.winRate >= 0.40 && stats.winRate <= 0.60 ? '⚠️ ' : '❌';
  console.log(`  ${status} ${race.padEnd(20)} ${pct.padStart(5)}%  ${bar}  (${stats.wins}W/${stats.losses}L/${stats.draws}D)`);
}

// Matchup details
console.log();
console.log('🔍 Matchup Details:');
console.log('─'.repeat(70));

const imbalanced = [];

for (const m of report.matchups) {
  const r1pct = (m.race1WinRate * 100).toFixed(0);
  const r2pct = (m.race2WinRate * 100).toFixed(0);
  const avgT = m.averageTurns.toFixed(1);
  const flag = Math.abs(m.race1WinRate - 0.5) > 0.2 ? ' ⚠️  IMBALANCED' : '';

  if (flag) imbalanced.push(m);

  console.log(`  ${m.race1} vs ${m.race2}: ${r1pct}%-${r2pct}% (avg ${avgT} turns, ${m.averageGameMs.toFixed(0)}ms/game)${flag}`);
}

// Summary
console.log();
console.log('═'.repeat(60));

const crashCount = report.matchups.filter(m => m.gamesPlayed < gamesPerMatchup).length;
const drawRate = report.matchups.reduce((s, m) => s + m.draws, 0) / report.totalGames;

console.log(`  Games completed:     ${report.totalGames}/${totalExpected} ${report.totalGames === totalExpected ? '✅' : '⚠️'}`);
console.log(`  Crashed matchups:    ${crashCount} ${crashCount === 0 ? '✅' : '❌'}`);
console.log(`  Draw rate:           ${(drawRate * 100).toFixed(1)}% ${drawRate < 0.1 ? '✅' : '⚠️'}`);
console.log(`  Imbalanced matchups: ${imbalanced.length}/${report.matchups.length} ${imbalanced.length < 5 ? '✅' : '⚠️'}`);
console.log();

if (imbalanced.length > 0) {
  console.log('  Most imbalanced matchups:');
  for (const m of imbalanced.slice(0, 5)) {
    const dominant = m.race1WinRate > m.race2WinRate ? m.race1 : m.race2;
    const pct = (Math.max(m.race1WinRate, m.race2WinRate) * 100).toFixed(0);
    console.log(`    → ${dominant} dominates at ${pct}% in ${m.race1} vs ${m.race2}`);
  }
  console.log();
}

console.log('Done! 🎮');

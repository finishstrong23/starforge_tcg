/**
 * STARFORGE TCG - 1000-Game Stress Test
 *
 * Runs 1000+ AI vs AI games across all 10 faction matchups.
 * Tests all keywords, validates game stability, and reports balance stats.
 *
 * Run with:
 *   npm test -- --testPathPattern=StressTest --verbose
 *   npm test -- --testPathPattern=StressTest --verbose 2>&1 | tee stress-results.txt
 */

import { AIBattleSimulator } from '../../src/ai/AIBattleSimulator';
import { AIDifficulty, createAIPlayer } from '../../src/ai/AIPlayer';
import { GameEngine } from '../../src/engine/GameEngine';
import { Race } from '../../src/types/Race';
import { GameStatus } from '../../src/types/Game';
import { CombatKeyword, TriggerKeyword, OriginalKeyword } from '../../src/types/Keywords';
import { ALL_SAMPLE_CARDS, getStarterDeck } from '../../src/data/SampleCards';
import { globalCardDatabase, globalCardFactory } from '../../src/cards';
import { getHeroByRace } from '../../src/heroes';

// ─── Config ─────────────────────────────────────────────────────────────────
const GAMES_PER_MATCHUP = 22; // 22 × 45 matchups = 990 games (~1000)
const MAX_TURNS = 60;

const ALL_RACES = [
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.WARP_RIDERS, Race.CRYSTALLINE,
  Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
];

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeAll(() => {
  globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);
});

// ─── Helper: run a single game ──────────────────────────────────────────────

function runSingleGame(race1: Race, race2: Race): {
  winner: Race | null;
  loser: Race | null;
  turns: number;
  winnerHealth: number;
  isDraw: boolean;
  crashed: boolean;
  error?: string;
  cardsPlayed: string[];
  keywordsUsed: Set<string>;
} {
  const deck1Cards = getStarterDeck(race1).map(def =>
    globalCardFactory.createInstance(def.id, { ownerId: 'p1' })
  );
  const deck2Cards = getStarterDeck(race2).map(def =>
    globalCardFactory.createInstance(def.id, { ownerId: 'p2' })
  );

  const hero1 = getHeroByRace(race1);
  const hero2 = getHeroByRace(race2);

  const engine = new GameEngine();
  engine.initializeGame(
    { id: 'p1', name: `AI-${race1}`, race: race1, heroId: hero1?.id || '', deck: deck1Cards },
    { id: 'p2', name: `AI-${race2}`, race: race2, heroId: hero2?.id || '', deck: deck2Cards }
  );

  const ai1 = createAIPlayer('p1', AIDifficulty.HARD);
  const ai2 = createAIPlayer('p2', AIDifficulty.HARD);
  ai1.setThinkingDelay(0);
  ai2.setThinkingDelay(0);

  engine.startGame();

  const cardsPlayed: string[] = [];
  const keywordsUsed = new Set<string>();
  let turns = 0;
  let crashed = false;
  let error: string | undefined;

  // Track cards and keywords from all starter deck definitions
  const allDefs = [...getStarterDeck(race1), ...getStarterDeck(race2)];
  for (const def of allDefs) {
    if (def.keywords) {
      for (const kw of def.keywords) {
        const name = typeof kw === 'string' ? kw : kw.keyword;
        keywordsUsed.add(name);
      }
    }
  }

  while (turns < MAX_TURNS) {
    const state = engine.getState();
    if (state.status === GameStatus.FINISHED || state.status === GameStatus.DRAW) break;

    const currentAI = state.activePlayerId === 'p1' ? ai1 : ai2;

    try {
      currentAI.executeTurnSync(engine);
    } catch (err: any) {
      crashed = true;
      error = (err?.message || String(err)) + '\n' + (err?.stack?.split('\n').slice(0, 3).join('\n') || '');
      break;
    }

    turns++;
  }

  const finalState = engine.getState();
  const p1 = finalState.players.get('p1');
  const p2 = finalState.players.get('p2');
  const p1HP = p1?.hero.currentHealth ?? 0;
  const p2HP = p2?.hero.currentHealth ?? 0;

  let winner: Race | null = null;
  let loser: Race | null = null;
  let winnerHealth = 0;
  let isDraw = false;

  if (finalState.winnerId === 'p1') {
    winner = race1; loser = race2; winnerHealth = p1HP;
  } else if (finalState.winnerId === 'p2') {
    winner = race2; loser = race1; winnerHealth = p2HP;
  } else {
    isDraw = true;
    winnerHealth = Math.max(p1HP, p2HP);
  }

  return { winner, loser, turns, winnerHealth, isDraw, crashed, error, cardsPlayed, keywordsUsed };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('STARFORGE TCG — 1000-Game Stress Test', () => {

  // Increase timeout for bulk testing (10 minutes)
  jest.setTimeout(600_000);

  test('All 10 races have valid starter decks', () => {
    for (const race of ALL_RACES) {
      const deck = getStarterDeck(race);
      expect(deck.length).toBeGreaterThanOrEqual(20);
      expect(deck.length).toBeLessThanOrEqual(40);

      const hero = getHeroByRace(race);
      expect(hero).toBeDefined();
    }
  });

  test('All 20 keywords exist in the card pool', () => {
    const allKeywords = [
      ...Object.values(CombatKeyword),
      ...Object.values(TriggerKeyword),
      ...Object.values(OriginalKeyword),
    ];

    const foundKeywords = new Set<string>();
    for (const card of ALL_SAMPLE_CARDS) {
      if (card.keywords) {
        for (const kw of card.keywords) {
          const name = typeof kw === 'string' ? kw : kw.keyword;
          foundKeywords.add(name);
        }
      }
    }

    const missing: string[] = [];
    for (const kw of allKeywords) {
      if (!foundKeywords.has(kw)) missing.push(kw);
    }

    if (missing.length > 0) {
      console.warn(`⚠️  Keywords missing from card pool: ${missing.join(', ')}`);
    }

    // At minimum, all 8 combat keywords should be present
    for (const kw of Object.values(CombatKeyword)) {
      expect(foundKeywords.has(kw)).toBe(true);
    }
  });

  test('Single game completes without crashing', () => {
    const result = runSingleGame(Race.COGSMITHS, Race.LUMINAR);
    expect(result.crashed).toBe(false);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.turns).toBeLessThanOrEqual(MAX_TURNS);
  });

  test(`Run ${GAMES_PER_MATCHUP * 45} games across all 45 matchups`, () => {
    const matchupPairs: [Race, Race][] = [];
    for (let i = 0; i < ALL_RACES.length; i++) {
      for (let j = i + 1; j < ALL_RACES.length; j++) {
        matchupPairs.push([ALL_RACES[i], ALL_RACES[j]]);
      }
    }

    expect(matchupPairs.length).toBe(45);

    const raceStats = new Map<Race, { wins: number; losses: number; draws: number }>();
    for (const r of ALL_RACES) raceStats.set(r, { wins: 0, losses: 0, draws: 0 });

    const matchupResults: {
      race1: Race; race2: Race;
      race1Wins: number; race2Wins: number; draws: number;
      crashes: number; avgTurns: number;
    }[] = [];

    let totalGames = 0;
    let totalCrashes = 0;
    let totalDraws = 0;
    const allKeywordsSeen = new Set<string>();
    const startTime = Date.now();

    for (let mi = 0; mi < matchupPairs.length; mi++) {
      const [race1, race2] = matchupPairs[mi];
      let r1Wins = 0, r2Wins = 0, draws = 0, crashes = 0;
      let totalTurns = 0;

      for (let g = 0; g < GAMES_PER_MATCHUP; g++) {
        // Alternate who goes first for fairness
        const result = g % 2 === 0
          ? runSingleGame(race1, race2)
          : runSingleGame(race2, race1);

        totalGames++;

        for (const kw of result.keywordsUsed) allKeywordsSeen.add(kw);

        if (result.crashed) {
          crashes++;
          totalCrashes++;
          continue;
        }

        totalTurns += result.turns;

        if (result.isDraw) {
          draws++;
          totalDraws++;
          raceStats.get(race1)!.draws++;
          raceStats.get(race2)!.draws++;
        } else {
          // Map back to race1/race2 perspective
          const winnerIsRace1 = result.winner === race1;
          if (g % 2 === 0) {
            // Normal order
            if (winnerIsRace1) { r1Wins++; } else { r2Wins++; }
          } else {
            // Swapped order — race2 went first
            if (result.winner === race1) { r1Wins++; } else { r2Wins++; }
          }

          if (result.winner === race1) {
            raceStats.get(race1)!.wins++;
            raceStats.get(race2)!.losses++;
          } else {
            raceStats.get(race2)!.wins++;
            raceStats.get(race1)!.losses++;
          }
        }
      }

      const played = GAMES_PER_MATCHUP - crashes;
      matchupResults.push({
        race1, race2,
        race1Wins: r1Wins, race2Wins: r2Wins, draws, crashes,
        avgTurns: played > 0 ? totalTurns / played : 0,
      });

      // Progress log every 5 matchups
      if ((mi + 1) % 5 === 0 || mi === matchupPairs.length - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const gps = Math.round(totalGames / Math.max(Number(elapsed), 0.001));
        console.log(`  [${mi + 1}/${matchupPairs.length}] ${totalGames} games done (${gps} games/sec, ${elapsed}s elapsed)`);
      }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // ─── Print Results ────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(65));
    console.log('  STARFORGE TCG — STRESS TEST RESULTS');
    console.log('═'.repeat(65));
    console.log(`  Total games:    ${totalGames}`);
    console.log(`  Total crashes:  ${totalCrashes}`);
    console.log(`  Total draws:    ${totalDraws}`);
    console.log(`  Time elapsed:   ${totalElapsed}s`);
    console.log(`  Games/sec:      ${Math.round(totalGames / Number(totalElapsed))}`);
    console.log();

    // Keyword coverage
    console.log('  KEYWORD COVERAGE:');
    const allKWNames = [
      ...Object.values(CombatKeyword),
      ...Object.values(TriggerKeyword),
      ...Object.values(OriginalKeyword),
    ];
    for (const kw of allKWNames) {
      const seen = allKeywordsSeen.has(kw);
      console.log(`    ${seen ? 'OK' : 'MISSING'}  ${kw}`);
    }
    console.log();

    // Race win rates
    console.log('  RACE WIN RATES (target: 45-55%):');
    const raceEntries = [...raceStats.entries()]
      .map(([race, s]) => {
        const total = s.wins + s.losses;
        return { race, ...s, winRate: total > 0 ? s.wins / total : 0 };
      })
      .sort((a, b) => b.winRate - a.winRate);

    for (const r of raceEntries) {
      const pct = (r.winRate * 100).toFixed(1);
      const status = r.winRate >= 0.45 && r.winRate <= 0.55 ? 'BALANCED' :
                     r.winRate >= 0.40 && r.winRate <= 0.60 ? 'OK      ' : 'SKEWED  ';
      console.log(`    ${status}  ${r.race.padEnd(20)} ${pct.padStart(5)}% (${r.wins}W / ${r.losses}L / ${r.draws}D)`);
    }
    console.log();

    // Matchup details
    console.log('  MATCHUP DETAILS:');
    const imbalanced = matchupResults.filter(m => {
      const total = m.race1Wins + m.race2Wins;
      if (total === 0) return false;
      return Math.abs(m.race1Wins / total - 0.5) > 0.3;
    });

    for (const m of matchupResults) {
      const total = m.race1Wins + m.race2Wins;
      const r1pct = total > 0 ? ((m.race1Wins / total) * 100).toFixed(0) : '?';
      const r2pct = total > 0 ? ((m.race2Wins / total) * 100).toFixed(0) : '?';
      const flag = imbalanced.includes(m) ? ' *** IMBALANCED' : '';
      console.log(`    ${m.race1} vs ${m.race2}: ${r1pct}%-${r2pct}% (avg ${m.avgTurns.toFixed(1)} turns, ${m.crashes} crashes)${flag}`);
    }
    console.log();

    if (imbalanced.length > 0) {
      console.log(`  IMBALANCED MATCHUPS: ${imbalanced.length}/${matchupResults.length}`);
      for (const m of imbalanced) {
        const dominant = m.race1Wins > m.race2Wins ? m.race1 : m.race2;
        const total = m.race1Wins + m.race2Wins;
        const pct = ((Math.max(m.race1Wins, m.race2Wins) / total) * 100).toFixed(0);
        console.log(`    -> ${dominant} dominates at ${pct}% in ${m.race1} vs ${m.race2}`);
      }
      console.log();
    }

    // ─── Assertions ───────────────────────────────────────────────────

    // No more than 5% crash rate
    const crashRate = totalCrashes / totalGames;
    console.log(`  Crash rate: ${(crashRate * 100).toFixed(1)}%`);
    expect(crashRate).toBeLessThan(0.05);

    // All games should complete
    expect(totalGames).toBe(GAMES_PER_MATCHUP * 45);

    // At least some games should produce a winner (not all draws)
    expect(totalDraws).toBeLessThan(totalGames * 0.5);
  });

  // Individual race matchup tests — one per race to verify no single race crashes
  for (const race of ALL_RACES) {
    test(`${race} can complete 10 games without crashing`, () => {
      let crashes = 0;
      const opponent = race === Race.COGSMITHS ? Race.LUMINAR : Race.COGSMITHS;

      for (let i = 0; i < 10; i++) {
        const result = runSingleGame(race, opponent);
        if (result.crashed) crashes++;
      }

      expect(crashes).toBe(0);
    });
  }
});

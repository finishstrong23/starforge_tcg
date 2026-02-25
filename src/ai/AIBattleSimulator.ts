/**
 * STARFORGE TCG - AI Battle Simulator
 *
 * High-performance AI vs AI simulation for balance testing.
 * Runs games synchronously (no await) for maximum throughput,
 * then batches in parallel across the event loop for thousands of games.
 */

import { GameEngine } from '../engine/GameEngine';
import { createAIPlayer, AIDifficulty } from './AIPlayer';
import { GameStatus } from '../types/Game';
import { Race } from '../types/Race';
import type { CardDefinition } from '../types/Card';
import { globalCardDatabase, globalCardFactory } from '../cards';
import { ALL_SAMPLE_CARDS, getStarterDeck } from '../data/SampleCards';
import { getHeroByRace } from '../heroes';

// ─── Fixed Starter Deck Loader ──────────────────────────────────────────────
// Uses the pre-built starter decks from the card converter. Each race gets
// exactly one curated 30-card deck for consistent balance testing.

let _dbInitialized = false;
function ensureDatabase() {
  if (!_dbInitialized) {
    globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);
    _dbInitialized = true;
  }
}

function buildDeck(race: Race, playerId: string) {
  const starterDeck = getStarterDeck(race);

  const cards = starterDeck.map(def =>
    globalCardFactory.createInstance(def.id, { ownerId: playerId })
  );
  const hero = getHeroByRace(race);
  return { cards, heroId: hero?.id || '' };
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GameResult {
  winnerRace: Race | null;
  loserRace: Race | null;
  turns: number;
  winnerHealth: number;
  isDraw: boolean;
  durationMs: number;
}

export interface MatchupStats {
  race1: Race;
  race2: Race;
  gamesPlayed: number;
  race1Wins: number;
  race2Wins: number;
  draws: number;
  race1WinRate: number;
  race2WinRate: number;
  averageTurns: number;
  averageWinnerHealth: number;
  averageGameMs: number;
}

export interface BalanceReport {
  totalGames: number;
  totalDurationMs: number;
  gamesPerSecond: number;
  matchups: MatchupStats[];
  raceWinRates: Map<Race, { wins: number; losses: number; draws: number; winRate: number }>;
  timestamp: Date;
}

export interface SimulatorConfig {
  gamesPerMatchup: number;
  maxTurnsPerGame: number;
  aiDifficulty: AIDifficulty;
  parallelBatchSize: number; // how many games run per batch
}

const DEFAULT_CONFIG: SimulatorConfig = {
  gamesPerMatchup: 100,
  maxTurnsPerGame: 60,
  aiDifficulty: AIDifficulty.HARD,
  parallelBatchSize: 50,
};

// ─── Core: single synchronous game (no async/await, maximum speed) ───────────

function runGameSync(
  race1: Race,
  race2: Race,
  maxTurns: number,
  difficulty: AIDifficulty
): GameResult {
  const t0 = performance.now();

  ensureDatabase();
  const deck1 = buildDeck(race1, 'p1');
  const deck2 = buildDeck(race2, 'p2');

  const engine = new GameEngine();
  engine.initializeGame(
    { id: 'p1', name: `AI-${race1}`, race: race1, heroId: deck1.heroId, deck: deck1.cards },
    { id: 'p2', name: `AI-${race2}`, race: race2, heroId: deck2.heroId, deck: deck2.cards }
  );

  const ai1 = createAIPlayer('p1', difficulty);
  const ai2 = createAIPlayer('p2', difficulty);
  // Zero delay — pure simulation speed
  ai1.setThinkingDelay(0);
  ai2.setThinkingDelay(0);

  engine.startGame();

  let turns = 0;

  while (turns < maxTurns) {
    const state = engine.getState();

    if (state.status === GameStatus.FINISHED || state.status === GameStatus.DRAW) break;

    const currentAI = state.activePlayerId === 'p1' ? ai1 : ai2;

    try {
      // executeTurnSync — runs the AI decision synchronously without any delay
      currentAI.executeTurnSync(engine);
    } catch (err: any) {
      console.error(`[BattleSim] Game crash on turn ${turns}:`, err?.message || err, err?.stack?.split('\n').slice(0, 3).join(' | ') || '');
      break;
    }

    turns++;
  }

  const finalState = engine.getState();
  const p1 = finalState.players.get('p1');
  const p2 = finalState.players.get('p2');
  const p1HP = p1?.hero.currentHealth ?? 0;
  const p2HP = p2?.hero.currentHealth ?? 0;

  let winnerRace: Race | null = null;
  let loserRace: Race | null = null;
  let winnerHealth = 0;
  let isDraw = false;

  if (finalState.winnerId === 'p1') {
    winnerRace = race1; loserRace = race2; winnerHealth = p1HP;
  } else if (finalState.winnerId === 'p2') {
    winnerRace = race2; loserRace = race1; winnerHealth = p2HP;
  } else {
    isDraw = true;
    winnerHealth = Math.max(p1HP, p2HP);
  }

  return {
    winnerRace, loserRace, turns, winnerHealth, isDraw,
    durationMs: performance.now() - t0,
  };
}

// ─── Batch runner: yields to event loop between batches so UI stays alive ────

async function runBatch(
  race1: Race,
  race2: Race,
  count: number,
  maxTurns: number,
  difficulty: AIDifficulty,
  startIdx: number
): Promise<GameResult[]> {
  // Yield to allow UI updates before running the batch
  await new Promise<void>(r => setTimeout(r, 0));

  const results: GameResult[] = [];
  for (let i = 0; i < count; i++) {
    // Alternate who goes first for fairness
    const result = (startIdx + i) % 2 === 0
      ? runGameSync(race1, race2, maxTurns, difficulty)
      : runGameSync(race2, race1, maxTurns, difficulty);

    // Flip winner/loser back to race1/race2 perspective when swapped
    if ((startIdx + i) % 2 !== 0 && !result.isDraw) {
      results.push({
        ...result,
        winnerRace: result.winnerRace === race2 ? race2 : race1,
        loserRace: result.loserRace === race1 ? race1 : race2,
      });
    } else {
      results.push(result);
    }
  }
  return results;
}

// ─── Matchup runner ──────────────────────────────────────────────────────────

async function runMatchup(
  race1: Race,
  race2: Race,
  totalGames: number,
  config: SimulatorConfig,
  onBatchDone?: (completed: number, total: number) => void
): Promise<MatchupStats> {
  const allResults: GameResult[] = [];
  const batchSize = config.parallelBatchSize;
  let completed = 0;

  // Split into batches, yield between each so the browser doesn't freeze
  while (completed < totalGames) {
    const thisBatch = Math.min(batchSize, totalGames - completed);
    const results = await runBatch(race1, race2, thisBatch, config.maxTurnsPerGame, config.aiDifficulty, completed);
    allResults.push(...results);
    completed += thisBatch;
    onBatchDone?.(completed, totalGames);
  }

  const race1Wins = allResults.filter(r => r.winnerRace === race1).length;
  const race2Wins = allResults.filter(r => r.winnerRace === race2).length;
  const draws = allResults.filter(r => r.isDraw).length;
  const avgTurns = allResults.reduce((s, r) => s + r.turns, 0) / allResults.length;
  const avgHealth = allResults.reduce((s, r) => s + r.winnerHealth, 0) / allResults.length;
  const avgMs = allResults.reduce((s, r) => s + r.durationMs, 0) / allResults.length;

  return {
    race1, race2,
    gamesPlayed: allResults.length,
    race1Wins, race2Wins, draws,
    race1WinRate: race1Wins / allResults.length,
    race2WinRate: race2Wins / allResults.length,
    averageTurns: avgTurns,
    averageWinnerHealth: avgHealth,
    averageGameMs: avgMs,
  };
}

// ─── Main Simulator class ────────────────────────────────────────────────────

export class AIBattleSimulator {
  private config: SimulatorConfig;
  private abortRequested = false;
  private _running = false;

  constructor(config: Partial<SimulatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get running() { return this._running; }

  abort() { this.abortRequested = true; }

  /**
   * Run full balance test across all faction matchups.
   * Supports thousands of games via batched parallel execution.
   */
  async runFullBalanceTest(
    races: Race[] = [Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN, Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE, Race.HIVEMIND],
    onProgress?: (opts: {
      matchupIndex: number;
      totalMatchups: number;
      matchupLabel: string;
      gamesCompleted: number;
      gamesTotal: number;
      gamesPerSecond: number;
    }) => void
  ): Promise<BalanceReport> {
    this._running = true;
    this.abortRequested = false;
    ensureDatabase();

    const matchupPairs: [Race, Race][] = [];
    for (let i = 0; i < races.length; i++)
      for (let j = i + 1; j < races.length; j++)
        matchupPairs.push([races[i], races[j]]);

    const matchupResults: MatchupStats[] = [];
    const raceStats = new Map<Race, { wins: number; losses: number; draws: number }>();
    for (const r of races) raceStats.set(r, { wins: 0, losses: 0, draws: 0 });

    const globalStart = performance.now();
    let totalGamesCompleted = 0;

    for (let mi = 0; mi < matchupPairs.length; mi++) {
      if (this.abortRequested) break;

      const [race1, race2] = matchupPairs[mi];
      const label = `${race1} vs ${race2}`;

      const stats = await runMatchup(
        race1, race2,
        this.config.gamesPerMatchup,
        this.config,
        (done, total) => {
          totalGamesCompleted += done === total
            ? this.config.parallelBatchSize
            : done % this.config.parallelBatchSize || this.config.parallelBatchSize;

          const elapsed = (performance.now() - globalStart) / 1000;
          onProgress?.({
            matchupIndex: mi + 1,
            totalMatchups: matchupPairs.length,
            matchupLabel: label,
            gamesCompleted: done,
            gamesTotal: total,
            gamesPerSecond: Math.round(totalGamesCompleted / Math.max(elapsed, 0.001)),
          });
        }
      );

      matchupResults.push(stats);

      const r1 = raceStats.get(race1)!;
      const r2 = raceStats.get(race2)!;
      r1.wins += stats.race1Wins; r1.losses += stats.race2Wins; r1.draws += stats.draws;
      r2.wins += stats.race2Wins; r2.losses += stats.race1Wins; r2.draws += stats.draws;
    }

    const totalDurationMs = performance.now() - globalStart;
    const totalGames = matchupResults.reduce((s, m) => s + m.gamesPlayed, 0);

    const raceWinRates = new Map<Race, { wins: number; losses: number; draws: number; winRate: number }>();
    for (const [race, s] of raceStats) {
      const total = s.wins + s.losses;
      raceWinRates.set(race, { ...s, winRate: total > 0 ? s.wins / total : 0 });
    }

    this._running = false;

    return {
      totalGames,
      totalDurationMs,
      gamesPerSecond: Math.round(totalGames / (totalDurationMs / 1000)),
      matchups: matchupResults,
      raceWinRates,
      timestamp: new Date(),
    };
  }
}

export default AIBattleSimulator;

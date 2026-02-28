/**
 * STARFORGE TCG - Tournament Mode
 *
 * 8-player single-elimination bracket tournaments against AI opponents.
 * Features: entry fee, escalating difficulty, prize pool, bracket visualization,
 * tournament history with trophy tracking.
 */

import { Race } from '../types/Race';

const TOURNAMENT_KEY = 'starforge_tournament';

// ── Types ──

export type TournamentTier = 'bronze' | 'silver' | 'gold' | 'starforge';

export interface TournamentConfig {
  tier: TournamentTier;
  name: string;
  entryFee: number;
  prizes: { first: number; second: number; semifinal: number };
  /** AI difficulty for each round: quarterfinal, semifinal, final */
  difficulties: [number, number, number];
  description: string;
  color: string;
}

export interface BracketSlot {
  race: Race;
  name: string;
  isPlayer: boolean;
  seed: number;
}

export interface BracketMatch {
  id: string;
  round: number; // 0=quarterfinal, 1=semifinal, 2=final
  matchIndex: number;
  player1: BracketSlot | null;
  player2: BracketSlot | null;
  winner: BracketSlot | null;
  turnCount?: number;
  isPlayerMatch: boolean;
}

export interface TournamentRun {
  id: string;
  tier: TournamentTier;
  playerRace: Race;
  bracket: BracketMatch[];
  currentRound: number;
  currentMatchId: string | null;
  status: 'in_progress' | 'won' | 'eliminated';
  prizesEarned: number;
  startedAt: number;
  completedAt?: number;
}

export interface TournamentHistory {
  id: string;
  tier: TournamentTier;
  playerRace: Race;
  result: 'champion' | 'finalist' | 'semifinalist' | 'eliminated';
  prizesEarned: number;
  rounds: number; // how far they went
  timestamp: number;
}

export interface TournamentState {
  /** Currently active tournament run (null if none) */
  activeRun: TournamentRun | null;
  /** Past tournament results */
  history: TournamentHistory[];
  /** Trophy count per tier */
  trophies: Record<TournamentTier, number>;
  /** Total prize gold earned from tournaments */
  totalPrizesEarned: number;
  /** Total tournaments entered */
  totalEntered: number;
  /** Total tournament wins */
  totalWins: number;
}

// ── Constants ──

export const TOURNAMENT_CONFIGS: Record<TournamentTier, TournamentConfig> = {
  bronze: {
    tier: 'bronze',
    name: 'Bronze Cup',
    entryFee: 50,
    prizes: { first: 300, second: 150, semifinal: 75 },
    difficulties: [1, 1, 2],
    description: 'Beginner-friendly tournament for new pilots',
    color: '#cd7f32',
  },
  silver: {
    tier: 'silver',
    name: 'Silver Cup',
    entryFee: 100,
    prizes: { first: 600, second: 300, semifinal: 150 },
    difficulties: [1, 2, 2],
    description: 'Intermediate competition for seasoned captains',
    color: '#c0c0c0',
  },
  gold: {
    tier: 'gold',
    name: 'Gold Cup',
    entryFee: 200,
    prizes: { first: 1200, second: 600, semifinal: 300 },
    difficulties: [2, 2, 3],
    description: 'Elite tournament for commanders and admirals',
    color: '#ffd700',
  },
  starforge: {
    tier: 'starforge',
    name: 'Starforge Championship',
    entryFee: 500,
    prizes: { first: 3000, second: 1500, semifinal: 750 },
    difficulties: [2, 3, 3],
    description: 'The ultimate challenge — only legends survive',
    color: '#ff8800',
  },
};

const AI_NAMES: Record<Race, string[]> = {
  [Race.COGSMITHS]: ['Gearmaster Krix', 'Wrenchbot Prime'],
  [Race.LUMINAR]: ['Solaris the Radiant', 'Lightweaver Astra'],
  [Race.PYROCLAST]: ['Blazecaller Zyx', 'Ashborn Inferno'],
  [Race.VOIDBORN]: ['Nullseer Xal', 'Voidwalker Nyx'],
  [Race.BIOTITANS]: ['Apex Growler', 'Primarch Thorne'],
  [Race.CRYSTALLINE]: ['Prismsage Opal', 'Fracture Mage'],
  [Race.PHANTOM_CORSAIRS]: ['Captain Shade', 'Dread Pirate Rex'],
  [Race.HIVEMIND]: ['Swarm Queen Zara', 'Hiveboss Chitik'],
  [Race.ASTROMANCERS]: ['Stargazer Lyra', 'Cosmos Weaver'],
  [Race.CHRONOBOUND]: ['Timekeeper Epoch', 'Chronarch Vex'],
  [Race.NEUTRAL]: ['The Wanderer', 'Rogue Mercenary'],
};

// ── State Management ──

export function loadTournamentState(): TournamentState {
  try {
    const raw = localStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return createDefaultState();
    return { ...createDefaultState(), ...JSON.parse(raw) };
  } catch {
    return createDefaultState();
  }
}

export function saveTournamentState(state: TournamentState): void {
  try {
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save tournament state');
  }
}

function createDefaultState(): TournamentState {
  return {
    activeRun: null,
    history: [],
    trophies: { bronze: 0, silver: 0, gold: 0, starforge: 0 },
    totalPrizesEarned: 0,
    totalEntered: 0,
    totalWins: 0,
  };
}

// ── Bracket Generation ──

function getAvailableRaces(exclude: Race): Race[] {
  const allPlayable = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];
  return allPlayable.filter(r => r !== exclude);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getAIName(race: Race): string {
  const names = AI_NAMES[race] || ['Unknown Challenger'];
  return pickRandom(names);
}

function generateBracketSlots(playerRace: Race): BracketSlot[] {
  const available = getAvailableRaces(playerRace);
  const aiRaces: Race[] = [];

  // Pick 7 unique AI races (with possible repeats if only 9 available)
  for (let i = 0; i < 7; i++) {
    const pool = available.length > 0 ? available : getAvailableRaces(playerRace);
    const idx = Math.floor(Math.random() * pool.length);
    aiRaces.push(pool[idx]);
    if (available.length > 1) available.splice(idx, 1);
  }

  const slots: BracketSlot[] = [
    { race: playerRace, name: 'You', isPlayer: true, seed: 1 },
    ...aiRaces.map((race, i) => ({
      race,
      name: getAIName(race),
      isPlayer: false,
      seed: i + 2,
    })),
  ];

  // Shuffle AI slots (keep player at seed 1 in top bracket half)
  const aiSlots = slots.filter(s => !s.isPlayer);
  for (let i = aiSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [aiSlots[i], aiSlots[j]] = [aiSlots[j], aiSlots[i]];
  }

  // Place player in a random quarterfinal slot
  const playerPosition = Math.floor(Math.random() * 8);
  const result: BracketSlot[] = [];
  let aiIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (i === playerPosition) {
      result.push(slots[0]); // player
    } else {
      result.push(aiSlots[aiIdx++]);
    }
  }

  return result;
}

function createBracket(slots: BracketSlot[]): BracketMatch[] {
  const matches: BracketMatch[] = [];

  // Quarterfinals (4 matches)
  for (let i = 0; i < 4; i++) {
    const p1 = slots[i * 2];
    const p2 = slots[i * 2 + 1];
    const isPlayerMatch = p1.isPlayer || p2.isPlayer;
    matches.push({
      id: `qf_${i}`,
      round: 0,
      matchIndex: i,
      player1: p1,
      player2: p2,
      winner: null,
      isPlayerMatch,
    });
  }

  // Semifinals (2 matches, TBD)
  for (let i = 0; i < 2; i++) {
    matches.push({
      id: `sf_${i}`,
      round: 1,
      matchIndex: i,
      player1: null,
      player2: null,
      winner: null,
      isPlayerMatch: false,
    });
  }

  // Final (1 match, TBD)
  matches.push({
    id: 'final',
    round: 2,
    matchIndex: 0,
    player1: null,
    player2: null,
    winner: null,
    isPlayerMatch: false,
  });

  return matches;
}

// ── Tournament Operations ──

/** Start a new tournament run. Returns updated state (or null if can't afford entry fee). */
export function startTournament(
  tier: TournamentTier,
  playerRace: Race,
  currentGold: number,
): { state: TournamentState; goldSpent: number } | null {
  const config = TOURNAMENT_CONFIGS[tier];
  if (currentGold < config.entryFee) return null;

  const state = loadTournamentState();
  if (state.activeRun) return null; // already in a tournament

  const slots = generateBracketSlots(playerRace);
  const bracket = createBracket(slots);

  // Auto-resolve non-player quarterfinal matches
  resolveAIMatches(bracket, 0);

  // Find the player's first match
  const playerMatch = bracket.find(m => m.round === 0 && m.isPlayerMatch);

  const run: TournamentRun = {
    id: `tourney_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tier,
    playerRace,
    bracket,
    currentRound: 0,
    currentMatchId: playerMatch?.id || null,
    status: 'in_progress',
    prizesEarned: 0,
    startedAt: Date.now(),
  };

  state.activeRun = run;
  state.totalEntered++;
  saveTournamentState(state);

  return { state, goldSpent: config.entryFee };
}

/** Auto-resolve AI vs AI matches for a given round */
function resolveAIMatches(bracket: BracketMatch[], round: number): void {
  const roundMatches = bracket.filter(m => m.round === round && !m.isPlayerMatch);

  for (const match of roundMatches) {
    if (match.player1 && match.player2) {
      // Random winner for AI vs AI
      match.winner = Math.random() < 0.5 ? match.player1 : match.player2;
      match.turnCount = Math.floor(Math.random() * 10) + 6;
    }
  }

  // Advance winners to next round
  advanceWinners(bracket, round);
}

/** Advance winners from completed round to next round */
function advanceWinners(bracket: BracketMatch[], fromRound: number): void {
  const completedMatches = bracket.filter(m => m.round === fromRound && m.winner);
  const nextRound = fromRound + 1;
  const nextMatches = bracket.filter(m => m.round === nextRound);

  for (let i = 0; i < completedMatches.length; i++) {
    const targetMatch = nextMatches[Math.floor(i / 2)];
    if (!targetMatch) continue;

    if (i % 2 === 0) {
      targetMatch.player1 = completedMatches[i].winner;
    } else {
      targetMatch.player2 = completedMatches[i].winner;
    }

    // Check if this becomes a player match
    if (completedMatches[i].winner?.isPlayer) {
      targetMatch.isPlayerMatch = true;
    }
  }
}

/** Record the result of the player's current match */
export function recordTournamentMatch(
  won: boolean,
  turnCount: number,
): TournamentState {
  const state = loadTournamentState();
  const run = state.activeRun;
  if (!run || !run.currentMatchId) return state;

  const config = TOURNAMENT_CONFIGS[run.tier];
  const match = run.bracket.find(m => m.id === run.currentMatchId);
  if (!match) return state;

  // Set winner
  if (won) {
    match.winner = match.player1?.isPlayer ? match.player1 : match.player2;
  } else {
    match.winner = match.player1?.isPlayer ? match.player2 : match.player1;
  }
  match.turnCount = turnCount;

  if (!won) {
    // Player eliminated
    let result: TournamentHistory['result'] = 'eliminated';
    let prizes = 0;

    if (run.currentRound === 0) {
      result = 'eliminated';
      prizes = 0;
    } else if (run.currentRound === 1) {
      result = 'semifinalist';
      prizes = config.prizes.semifinal;
    } else {
      result = 'finalist';
      prizes = config.prizes.second;
    }

    run.status = 'eliminated';
    run.prizesEarned = prizes;
    run.completedAt = Date.now();

    // Archive to history
    archiveTournament(state, run, result);
    state.activeRun = null;
  } else {
    // Advance winners
    advanceWinners(run.bracket, run.currentRound);

    if (run.currentRound >= 2) {
      // Won the final!
      run.status = 'won';
      run.prizesEarned = config.prizes.first;
      run.completedAt = Date.now();

      state.trophies[run.tier]++;
      state.totalWins++;

      archiveTournament(state, run, 'champion');
      state.activeRun = null;
    } else {
      // Next round
      run.currentRound++;

      // Resolve AI vs AI in the new round
      resolveAIMatches(run.bracket, run.currentRound);

      // Find the player's next match
      const nextMatch = run.bracket.find(
        m => m.round === run.currentRound && m.isPlayerMatch && !m.winner,
      );
      run.currentMatchId = nextMatch?.id || null;
    }
  }

  saveTournamentState(state);
  return state;
}

function archiveTournament(
  state: TournamentState,
  run: TournamentRun,
  result: TournamentHistory['result'],
): void {
  state.totalPrizesEarned += run.prizesEarned;

  const entry: TournamentHistory = {
    id: run.id,
    tier: run.tier,
    playerRace: run.playerRace,
    result,
    prizesEarned: run.prizesEarned,
    rounds: run.currentRound + 1,
    timestamp: Date.now(),
  };

  state.history.unshift(entry);
  if (state.history.length > 50) {
    state.history = state.history.slice(0, 50);
  }
}

/** Get the player's current opponent in the active tournament */
export function getCurrentOpponent(run: TournamentRun): BracketSlot | null {
  if (!run.currentMatchId) return null;
  const match = run.bracket.find(m => m.id === run.currentMatchId);
  if (!match) return null;

  if (match.player1?.isPlayer) return match.player2;
  if (match.player2?.isPlayer) return match.player1;
  return null;
}

/** Get the AI difficulty for the current round */
export function getCurrentDifficulty(run: TournamentRun): number {
  const config = TOURNAMENT_CONFIGS[run.tier];
  return config.difficulties[Math.min(run.currentRound, 2)];
}

/** Forfeit the current tournament */
export function forfeitTournament(): TournamentState {
  const state = loadTournamentState();
  const run = state.activeRun;
  if (!run) return state;

  run.status = 'eliminated';
  run.completedAt = Date.now();
  archiveTournament(state, run, 'eliminated');
  state.activeRun = null;
  saveTournamentState(state);
  return state;
}

/** Get round label */
export function getRoundLabel(round: number): string {
  switch (round) {
    case 0: return 'Quarterfinal';
    case 1: return 'Semifinal';
    case 2: return 'Grand Final';
    default: return `Round ${round + 1}`;
  }
}

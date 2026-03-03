/**
 * STARFORGE TCG - Tag Team State Management (8.2.3)
 *
 * Manages the state of a 2v2 Tag Team match:
 * - Team health pools
 * - Turn ordering
 * - Ping communication
 * - Match history and records
 */

import { Race, RaceData } from '../types/Race';
import { TagTeamConfig, DEFAULT_TAG_TEAM_CONFIG, PingType, getTeamSynergy, TagTeamResult } from './TagTeamData';

const STORAGE_KEY = 'starforge_tagteam_records';

/**
 * Active Tag Team match state
 */
export interface TagTeamMatchState {
  /** Team 1 players */
  team1: { name: string; race: Race; isAI: boolean }[];
  /** Team 2 players */
  team2: { name: string; race: Race; isAI: boolean }[];
  /** Team 1 shared HP */
  team1HP: number;
  /** Team 2 shared HP */
  team2HP: number;
  /** Current turn index (0-3 for alternating order) */
  currentTurnIndex: number;
  /** Turn count */
  turnCount: number;
  /** Match config */
  config: TagTeamConfig;
  /** Active pings this turn */
  activePings: { type: PingType; fromPlayer: string; targetId?: string; timestamp: number }[];
  /** Pings remaining this turn */
  pingsRemaining: number;
  /** Phase of the tag team match */
  phase: 'setup' | 'playing' | 'finished';
  /** Active synergy name (if any) */
  synergyName: string | null;
  /** Result (when finished) */
  result: TagTeamResult | null;
}

/**
 * Create a new Tag Team match
 */
export function createTagTeamMatch(
  team1: { name: string; race: Race; isAI: boolean }[],
  team2: { name: string; race: Race; isAI: boolean }[],
  config: TagTeamConfig = DEFAULT_TAG_TEAM_CONFIG,
): TagTeamMatchState {
  const synergy1 = team1.length === 2 ? getTeamSynergy(team1[0].race, team1[1].race) : null;

  return {
    team1,
    team2,
    team1HP: config.teamHealth,
    team2HP: config.teamHealth,
    currentTurnIndex: 0,
    turnCount: 1,
    config,
    activePings: [],
    pingsRemaining: config.maxPingsPerTurn,
    phase: 'playing',
    synergyName: synergy1?.name || null,
    result: null,
  };
}

/**
 * Get the current active player info
 * Turn order: T1-P1 → T2-P1 → T1-P2 → T2-P2
 */
export function getCurrentPlayer(state: TagTeamMatchState): {
  team: 1 | 2;
  playerIndex: number;
  name: string;
  race: Race;
  isAI: boolean;
} {
  const order = [
    { team: 1 as const, playerIndex: 0 },
    { team: 2 as const, playerIndex: 0 },
    { team: 1 as const, playerIndex: 1 },
    { team: 2 as const, playerIndex: 1 },
  ];

  const slot = order[state.currentTurnIndex % 4];
  const teamArr = slot.team === 1 ? state.team1 : state.team2;
  const player = teamArr[slot.playerIndex];

  return {
    team: slot.team,
    playerIndex: slot.playerIndex,
    name: player.name,
    race: player.race,
    isAI: player.isAI,
  };
}

/**
 * Advance to the next player's turn
 */
export function advanceTurn(state: TagTeamMatchState): TagTeamMatchState {
  const nextIndex = (state.currentTurnIndex + 1) % 4;
  const nextTurn = nextIndex === 0 ? state.turnCount + 1 : state.turnCount;

  return {
    ...state,
    currentTurnIndex: nextIndex,
    turnCount: nextTurn,
    activePings: [],
    pingsRemaining: state.config.maxPingsPerTurn,
  };
}

/**
 * Apply damage to a team
 */
export function applyTeamDamage(
  state: TagTeamMatchState,
  team: 1 | 2,
  damage: number,
): TagTeamMatchState {
  const updated = { ...state };
  if (team === 1) {
    updated.team1HP = Math.max(0, state.team1HP - damage);
  } else {
    updated.team2HP = Math.max(0, state.team2HP - damage);
  }

  // Check for game over
  if (updated.team1HP <= 0 || updated.team2HP <= 0) {
    updated.phase = 'finished';
    updated.result = {
      winningTeam: updated.team1HP <= 0 ? 2 : 1,
      team1HP: updated.team1HP,
      team2HP: updated.team2HP,
      turnCount: updated.turnCount,
      mvpPlayer: 'Unknown',
      mvpReason: 'Most damage dealt',
    };
  }

  return updated;
}

/**
 * Send a ping to teammate
 */
export function sendPing(
  state: TagTeamMatchState,
  type: PingType,
  fromPlayer: string,
  targetId?: string,
): TagTeamMatchState {
  if (state.pingsRemaining <= 0) return state;

  return {
    ...state,
    activePings: [
      ...state.activePings,
      { type, fromPlayer, targetId, timestamp: Date.now() },
    ],
    pingsRemaining: state.pingsRemaining - 1,
  };
}

// ─── Records & Persistence ───────────────────────────────────────────────────

export interface TagTeamRecord {
  date: number;
  team1Races: [Race, Race];
  team2Races: [Race, Race];
  won: boolean;
  turnCount: number;
  synergyUsed: string | null;
}

export function loadTagTeamRecords(): TagTeamRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTagTeamRecord(record: TagTeamRecord): void {
  const records = loadTagTeamRecords();
  records.unshift(record);
  // Keep last 50
  if (records.length > 50) records.length = 50;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Get tag team stats
 */
export function getTagTeamStats(): {
  totalGames: number;
  wins: number;
  losses: number;
  favoritePartnerRace: Race | null;
  bestSynergy: string | null;
} {
  const records = loadTagTeamRecords();
  if (records.length === 0) {
    return { totalGames: 0, wins: 0, losses: 0, favoritePartnerRace: null, bestSynergy: null };
  }

  const wins = records.filter(r => r.won).length;

  // Find most used partner race
  const raceCounts: Record<string, number> = {};
  for (const r of records) {
    const partnerRace = r.team1Races[1];
    raceCounts[partnerRace] = (raceCounts[partnerRace] || 0) + 1;
  }
  const topRace = Object.entries(raceCounts).sort(([, a], [, b]) => b - a)[0];

  // Find best synergy
  const synergyCounts: Record<string, { used: number; wins: number }> = {};
  for (const r of records) {
    if (r.synergyUsed) {
      if (!synergyCounts[r.synergyUsed]) synergyCounts[r.synergyUsed] = { used: 0, wins: 0 };
      synergyCounts[r.synergyUsed].used++;
      if (r.won) synergyCounts[r.synergyUsed].wins++;
    }
  }
  const topSynergy = Object.entries(synergyCounts)
    .filter(([, s]) => s.used >= 3)
    .sort(([, a], [, b]) => (b.wins / b.used) - (a.wins / a.used))[0];

  return {
    totalGames: records.length,
    wins,
    losses: records.length - wins,
    favoritePartnerRace: topRace ? topRace[0] as Race : null,
    bestSynergy: topSynergy ? topSynergy[0] : null,
  };
}

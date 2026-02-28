/**
 * STARFORGE TCG - Replay System
 *
 * Records game actions during play and provides replay storage/retrieval.
 * Replays capture full action sequences for playback.
 */

import { Race } from '../types/Race';

const REPLAY_KEY = 'starforge_replays';
const MAX_REPLAYS = 20;

// ── Types ──

export interface ReplayAction {
  /** Turn number when action occurred */
  turn: number;
  /** Which side took the action */
  side: 'player' | 'opponent';
  /** Action category */
  type: 'play_card' | 'attack' | 'hero_power' | 'end_turn' | 'starforge' | 'effect';
  /** Human-readable description */
  description: string;
  /** Timestamp offset in ms from game start */
  timestamp: number;
}

export interface GameReplay {
  id: string;
  /** Player race */
  playerRace: Race;
  /** Opponent race */
  opponentRace: Race;
  /** Game mode */
  mode: 'quickplay' | 'campaign' | 'pvp' | 'tournament';
  /** Whether the player won */
  won: boolean;
  /** Total turns */
  turnCount: number;
  /** All recorded actions */
  actions: ReplayAction[];
  /** Final player health */
  playerHealthFinal: number;
  /** Final opponent health */
  opponentHealthFinal: number;
  /** When the game was played */
  timestamp: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Optional label for the replay */
  label?: string;
  /** Whether the user bookmarked this replay */
  bookmarked: boolean;
}

export interface ReplayState {
  replays: GameReplay[];
}

// ── State Management ──

export function loadReplayState(): ReplayState {
  try {
    const raw = localStorage.getItem(REPLAY_KEY);
    if (!raw) return { replays: [] };
    return { replays: [], ...JSON.parse(raw) };
  } catch {
    return { replays: [] };
  }
}

export function saveReplayState(state: ReplayState): void {
  try {
    localStorage.setItem(REPLAY_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save replays');
  }
}

// ── Recording ──

export class ReplayRecorder {
  private actions: ReplayAction[] = [];
  private startTime: number;
  private playerRace: Race;
  private opponentRace: Race;
  private mode: GameReplay['mode'];

  constructor(playerRace: Race, opponentRace: Race, mode: GameReplay['mode']) {
    this.startTime = Date.now();
    this.playerRace = playerRace;
    this.opponentRace = opponentRace;
    this.mode = mode;
  }

  recordAction(
    turn: number,
    side: 'player' | 'opponent',
    type: ReplayAction['type'],
    description: string,
  ): void {
    this.actions.push({
      turn,
      side,
      type,
      description,
      timestamp: Date.now() - this.startTime,
    });
  }

  finalize(
    won: boolean,
    turnCount: number,
    playerHealth: number,
    opponentHealth: number,
  ): GameReplay {
    const replay: GameReplay = {
      id: `replay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      playerRace: this.playerRace,
      opponentRace: this.opponentRace,
      mode: this.mode,
      won,
      turnCount,
      actions: this.actions,
      playerHealthFinal: playerHealth,
      opponentHealthFinal: opponentHealth,
      timestamp: Date.now(),
      durationSeconds: Math.round((Date.now() - this.startTime) / 1000),
      bookmarked: false,
    };

    // Auto-save to storage
    const state = loadReplayState();
    state.replays.unshift(replay);

    // Keep bookmarked replays, trim non-bookmarked to MAX
    const bookmarked = state.replays.filter(r => r.bookmarked);
    const regular = state.replays.filter(r => !r.bookmarked);
    state.replays = [...bookmarked, ...regular.slice(0, MAX_REPLAYS)];

    saveReplayState(state);
    return replay;
  }
}

// ── Replay Operations ──

/** Toggle bookmark on a replay */
export function toggleBookmark(replayId: string): ReplayState {
  const state = loadReplayState();
  const replay = state.replays.find(r => r.id === replayId);
  if (replay) {
    replay.bookmarked = !replay.bookmarked;
    saveReplayState(state);
  }
  return state;
}

/** Rename a replay */
export function renameReplay(replayId: string, label: string): ReplayState {
  const state = loadReplayState();
  const replay = state.replays.find(r => r.id === replayId);
  if (replay) {
    replay.label = label;
    saveReplayState(state);
  }
  return state;
}

/** Delete a replay */
export function deleteReplay(replayId: string): ReplayState {
  const state = loadReplayState();
  state.replays = state.replays.filter(r => r.id !== replayId);
  saveReplayState(state);
  return state;
}

/** Get replays filtered by mode */
export function getReplaysByMode(mode?: GameReplay['mode']): GameReplay[] {
  const state = loadReplayState();
  if (!mode) return state.replays;
  return state.replays.filter(r => r.mode === mode);
}

/** Get replay statistics */
export function getReplayStats(): {
  totalReplays: number;
  totalBookmarked: number;
  totalWins: number;
  totalLosses: number;
  avgTurnCount: number;
  avgDuration: number;
  longestGame: number;
  shortestWin: number;
} {
  const state = loadReplayState();
  const replays = state.replays;
  const wins = replays.filter(r => r.won);

  return {
    totalReplays: replays.length,
    totalBookmarked: replays.filter(r => r.bookmarked).length,
    totalWins: wins.length,
    totalLosses: replays.length - wins.length,
    avgTurnCount: replays.length > 0
      ? Math.round(replays.reduce((s, r) => s + r.turnCount, 0) / replays.length)
      : 0,
    avgDuration: replays.length > 0
      ? Math.round(replays.reduce((s, r) => s + r.durationSeconds, 0) / replays.length)
      : 0,
    longestGame: replays.length > 0
      ? Math.max(...replays.map(r => r.turnCount))
      : 0,
    shortestWin: wins.length > 0
      ? Math.min(...wins.map(r => r.turnCount))
      : 0,
  };
}

/** Format a duration in seconds to a human-readable string */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

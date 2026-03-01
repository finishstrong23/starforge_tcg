export interface GameRecord {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  mode: GameMode;
  turnCount: number;
  durationMs: number;
  player1Race: string;
  player2Race: string;
  player1DeckId: string;
  player2DeckId: string;
  mmrChange1: number;
  mmrChange2: number;
  replayData: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export type GameMode = 'ranked' | 'casual' | 'arena' | 'friendly' | 'story' | 'brawl';

export interface MatchmakingTicket {
  playerId: string;
  mode: GameMode;
  mmr: number;
  deckId: string;
  race: string;
  queuedAt: number;
  expandRange: number;
}

export interface ActiveGame {
  id: string;
  player1Id: string;
  player2Id: string;
  mode: GameMode;
  state: object;
  turnNumber: number;
  activePlayerId: string;
  turnStartedAt: number;
  createdAt: number;
}

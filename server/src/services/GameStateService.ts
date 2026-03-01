import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { ActiveGame, GameMode, GameRecord } from '../models/Game';

const activeGames = new Map<string, ActiveGame>();
const playerToGame = new Map<string, string>();

const TURN_TIME_LIMIT = 75_000; // 75 seconds per turn

export function createGame(
  player1Id: string,
  player2Id: string,
  mode: GameMode,
  initialState: object
): ActiveGame {
  const game: ActiveGame = {
    id: uuidv4(),
    player1Id,
    player2Id,
    mode,
    state: initialState,
    turnNumber: 1,
    activePlayerId: player1Id,
    turnStartedAt: Date.now(),
    createdAt: Date.now(),
  };

  activeGames.set(game.id, game);
  playerToGame.set(player1Id, game.id);
  playerToGame.set(player2Id, game.id);

  return game;
}

export function getActiveGame(gameId: string): ActiveGame | undefined {
  return activeGames.get(gameId);
}

export function getPlayerGame(playerId: string): ActiveGame | undefined {
  const gameId = playerToGame.get(playerId);
  return gameId ? activeGames.get(gameId) : undefined;
}

export function updateGameState(gameId: string, state: object, nextPlayerId: string): void {
  const game = activeGames.get(gameId);
  if (!game) return;

  game.state = state;
  game.activePlayerId = nextPlayerId;
  game.turnNumber++;
  game.turnStartedAt = Date.now();
}

export function isPlayerTurn(gameId: string, playerId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game) return false;
  return game.activePlayerId === playerId;
}

export function isTurnExpired(gameId: string): boolean {
  const game = activeGames.get(gameId);
  if (!game) return false;
  return Date.now() - game.turnStartedAt > TURN_TIME_LIMIT;
}

export async function endGame(
  gameId: string,
  winnerId: string | null,
  mmrChange1: number,
  mmrChange2: number
): Promise<void> {
  const game = activeGames.get(gameId);
  if (!game) return;

  // Store game record in database
  await query(
    `INSERT INTO game_records (id, player1_id, player2_id, winner_id, mode, turn_count, duration_ms, mmr_change_1, mmr_change_2, created_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0), NOW())`,
    [
      game.id, game.player1Id, game.player2Id, winnerId, game.mode,
      game.turnNumber, Date.now() - game.createdAt,
      mmrChange1, mmrChange2, game.createdAt
    ]
  );

  // Clean up
  activeGames.delete(gameId);
  playerToGame.delete(game.player1Id);
  playerToGame.delete(game.player2Id);
}

export function getActiveGameCount(): number {
  return activeGames.size;
}

export async function getGameHistory(playerId: string, limit = 20, offset = 0): Promise<GameRecord[]> {
  const result = await query(
    `SELECT * FROM game_records
     WHERE player1_id = $1 OR player2_id = $1
     ORDER BY completed_at DESC
     LIMIT $2 OFFSET $3`,
    [playerId, limit, offset]
  );

  return result.rows.map(row => ({
    id: row.id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    winnerId: row.winner_id,
    mode: row.mode,
    turnCount: row.turn_count,
    durationMs: row.duration_ms,
    player1Race: row.player1_race,
    player2Race: row.player2_race,
    player1DeckId: row.player1_deck_id,
    player2DeckId: row.player2_deck_id,
    mmrChange1: row.mmr_change_1,
    mmrChange2: row.mmr_change_2,
    replayData: row.replay_data,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }));
}

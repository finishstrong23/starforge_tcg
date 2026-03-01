/**
 * STARFORGE TCG - Esports & Competitive Service
 *
 * Official tournament system, automated brackets, monthly invitationals,
 * and API for third-party tournament organizers.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export type TournamentFormat = 'swiss' | 'single_elimination' | 'double_elimination';
export type TournamentStatus = 'registration' | 'in_progress' | 'completed' | 'cancelled';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  format: TournamentFormat;
  status: TournamentStatus;
  maxPlayers: number;
  currentPlayers: number;
  rounds: number;
  currentRound: number;
  entryFee: { gold?: number; gems?: number };
  prizePool: TournamentPrize[];
  registrationStart: Date;
  registrationEnd: Date;
  startDate: Date;
  endDate: Date;
  isOfficial: boolean;
  organizer: string;
}

export interface TournamentPrize {
  place: number;
  description: string;
  gold?: number;
  gems?: number;
  packs?: number;
  cosmeticId?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  player1Score: number;
  player2Score: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface TournamentStanding {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  matchPoints: number;
  opponentWinRate: number;
  rank: number;
}

// Scheduled tournaments
const SCHEDULED_TOURNAMENTS: Tournament[] = [
  {
    id: 'weekly_community_1',
    name: 'Weekly Community Cup',
    description: 'Open to all players. Swiss format, 5 rounds.',
    format: 'swiss',
    status: 'registration',
    maxPlayers: 128,
    currentPlayers: 0,
    rounds: 5,
    currentRound: 0,
    entryFee: { gold: 100 },
    prizePool: [
      { place: 1, description: '1st Place', gold: 2000, packs: 10, cosmeticId: 'cardback_tournament_gold' },
      { place: 2, description: '2nd Place', gold: 1000, packs: 5 },
      { place: 3, description: '3rd-4th Place', gold: 500, packs: 3 },
      { place: 5, description: '5th-8th Place', gold: 200, packs: 1 },
    ],
    registrationStart: new Date('2026-03-01'),
    registrationEnd: new Date('2026-03-07T18:00:00Z'),
    startDate: new Date('2026-03-07T19:00:00Z'),
    endDate: new Date('2026-03-07T23:00:00Z'),
    isOfficial: true,
    organizer: 'StarForge Official',
  },
  {
    id: 'monthly_invitational_1',
    name: 'March Invitational',
    description: 'Top 64 Legend players compete for glory.',
    format: 'single_elimination',
    status: 'registration',
    maxPlayers: 64,
    currentPlayers: 0,
    rounds: 6,
    currentRound: 0,
    entryFee: {},
    prizePool: [
      { place: 1, description: 'Champion', gems: 5000, packs: 50, cosmeticId: 'cardback_champion' },
      { place: 2, description: 'Runner-Up', gems: 2500, packs: 25 },
      { place: 3, description: 'Semi-Finalist', gems: 1000, packs: 10 },
      { place: 5, description: 'Quarter-Finalist', gems: 500, packs: 5 },
    ],
    registrationStart: new Date('2026-03-15'),
    registrationEnd: new Date('2026-03-28T18:00:00Z'),
    startDate: new Date('2026-03-29T18:00:00Z'),
    endDate: new Date('2026-03-29T23:00:00Z'),
    isOfficial: true,
    organizer: 'StarForge Esports',
  },
];

/**
 * Get upcoming tournaments.
 */
export function getUpcomingTournaments(): Tournament[] {
  const now = new Date();
  return SCHEDULED_TOURNAMENTS.filter(t =>
    t.status === 'registration' || (t.status === 'in_progress' && t.endDate > now)
  );
}

/**
 * Get all tournaments.
 */
export function getAllTournaments(): Tournament[] {
  return SCHEDULED_TOURNAMENTS;
}

/**
 * Get a specific tournament.
 */
export function getTournament(id: string): Tournament | undefined {
  return SCHEDULED_TOURNAMENTS.find(t => t.id === id);
}

/**
 * Register for a tournament.
 */
export async function registerForTournament(
  playerId: string,
  tournamentId: string,
): Promise<{ success: boolean; position: number }> {
  const tournament = SCHEDULED_TOURNAMENTS.find(t => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  if (tournament.status !== 'registration') throw new Error('Registration is closed');
  if (tournament.currentPlayers >= tournament.maxPlayers) throw new Error('Tournament is full');

  const now = new Date();
  if (now < tournament.registrationStart || now > tournament.registrationEnd) {
    throw new Error('Registration is not open');
  }

  try {
    await query(
      `INSERT INTO tournament_registrations (tournament_id, player_id, registered_at)
       VALUES ($1, $2, NOW())`,
      [tournamentId, playerId]
    );
    tournament.currentPlayers++;
  } catch {
    throw new Error('Already registered');
  }

  return { success: true, position: tournament.currentPlayers };
}

/**
 * Get tournament standings.
 */
export async function getStandings(tournamentId: string): Promise<TournamentStanding[]> {
  try {
    const result = await query(
      `SELECT ts.player_id, p.username as player_name, ts.wins, ts.losses,
              ts.match_points, ts.opponent_win_rate, ts.rank
       FROM tournament_standings ts
       JOIN players p ON ts.player_id = p.id
       WHERE ts.tournament_id = $1
       ORDER BY ts.rank`,
      [tournamentId]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      playerId: row.player_id as string,
      playerName: row.player_name as string,
      wins: row.wins as number,
      losses: row.losses as number,
      matchPoints: row.match_points as number,
      opponentWinRate: parseFloat(row.opponent_win_rate as string) || 0,
      rank: row.rank as number,
    }));
  } catch {
    return [];
  }
}

/**
 * Get tournament matches.
 */
export async function getMatches(
  tournamentId: string,
  round?: number,
): Promise<TournamentMatch[]> {
  try {
    const conditions = ['tournament_id = $1'];
    const values: unknown[] = [tournamentId];

    if (round !== undefined) {
      conditions.push('round = $2');
      values.push(round);
    }

    const result = await query(
      `SELECT * FROM tournament_matches WHERE ${conditions.join(' AND ')} ORDER BY round, id`,
      values
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      tournamentId: row.tournament_id as string,
      round: row.round as number,
      player1Id: row.player1_id as string,
      player2Id: row.player2_id as string,
      winnerId: row.winner_id as string | null,
      player1Score: row.player1_score as number,
      player2Score: row.player2_score as number,
      status: row.status as 'pending' | 'in_progress' | 'completed',
    }));
  } catch {
    return [];
  }
}

/**
 * API endpoint for third-party tournament organizers.
 */
export async function createThirdPartyTournament(
  organizerName: string,
  config: {
    name: string;
    description: string;
    format: TournamentFormat;
    maxPlayers: number;
    rounds: number;
    startDate: Date;
  },
): Promise<Tournament> {
  const tournament: Tournament = {
    id: `tp_${uuidv4().slice(0, 8)}`,
    name: config.name,
    description: config.description,
    format: config.format,
    status: 'registration',
    maxPlayers: config.maxPlayers,
    currentPlayers: 0,
    rounds: config.rounds,
    currentRound: 0,
    entryFee: {},
    prizePool: [],
    registrationStart: new Date(),
    registrationEnd: new Date(config.startDate.getTime() - 60 * 60 * 1000),
    startDate: config.startDate,
    endDate: new Date(config.startDate.getTime() + 6 * 60 * 60 * 1000),
    isOfficial: false,
    organizer: organizerName,
  };

  SCHEDULED_TOURNAMENTS.push(tournament);
  return tournament;
}

/**
 * Get esports calendar.
 */
export function getEsportsCalendar(): {
  type: string;
  name: string;
  frequency: string;
  description: string;
}[] {
  return [
    { type: 'weekly', name: 'Community Cup', frequency: 'Every Saturday', description: 'Open Swiss tournament, 128 players, prizes for top 8' },
    { type: 'monthly', name: 'Monthly Invitational', frequency: 'Last Saturday of month', description: 'Top 64 Legend players, single elimination' },
    { type: 'quarterly', name: 'Quarterly Championship', frequency: 'Every 3 months', description: 'Top 16 invitational with prize pool' },
    { type: 'annual', name: 'StarForge World Championship', frequency: 'Annual', description: 'Year-end championship for top players worldwide' },
  ];
}

/**
 * STARFORGE TCG - 2v2 Tag Team Mode Data (8.2.3)
 *
 * Configuration and data for the Tag Team game mode:
 * - Team setup (shared HP pool, alternating turns)
 * - Team synergy bonuses
 * - Tag team specific rules and configurations
 */

import { Race, RaceData } from '../types/Race';

/**
 * Tag Team game configuration
 */
export interface TagTeamConfig {
  /** Combined team health pool */
  teamHealth: number;
  /** Board slots per player (7 each = 14 total per team) */
  boardSlotsPerPlayer: number;
  /** Maximum hand size per player */
  handSizePerPlayer: number;
  /** Turn order: [Team1-PlayerA, Team1-PlayerB, Team2-PlayerA, Team2-PlayerB] */
  turnOrder: 'alternating' | 'sequential';
  /** Allow limited communication pings during partner's turn */
  allowPings: boolean;
  /** Maximum pings per partner turn */
  maxPingsPerTurn: number;
}

export const DEFAULT_TAG_TEAM_CONFIG: TagTeamConfig = {
  teamHealth: 50,
  boardSlotsPerPlayer: 7,
  handSizePerPlayer: 10,
  turnOrder: 'alternating',
  allowPings: true,
  maxPingsPerTurn: 3,
};

/**
 * Ping types for limited team communication
 */
export enum PingType {
  ATTACK_HERE = 'ATTACK_HERE',
  PLAY_THIS = 'PLAY_THIS',
  DANGER = 'DANGER',
  WELL_PLAYED = 'WELL_PLAYED',
  HELP = 'HELP',
  WAIT = 'WAIT',
}

export const PING_DATA: Record<PingType, { label: string; icon: string; color: string }> = {
  [PingType.ATTACK_HERE]: { label: 'Attack Here!', icon: '\u2694', color: '#ef4444' },
  [PingType.PLAY_THIS]: { label: 'Play This', icon: '\u261D', color: '#3b82f6' },
  [PingType.DANGER]: { label: 'Danger!', icon: '\u26A0', color: '#f59e0b' },
  [PingType.WELL_PLAYED]: { label: 'Well Played', icon: '\uD83D\uDC4D', color: '#22c55e' },
  [PingType.HELP]: { label: 'Help!', icon: '\uD83C\uDD98', color: '#a855f7' },
  [PingType.WAIT]: { label: 'Wait', icon: '\u270B', color: '#6b7280' },
};

/**
 * Team synergy bonuses when specific race combinations are on the same team
 */
export interface TeamSynergy {
  races: [Race, Race];
  name: string;
  description: string;
  bonusType: 'stat_buff' | 'cost_reduction' | 'keyword_grant' | 'draw_bonus' | 'heal_bonus';
  value: number;
}

export const TEAM_SYNERGIES: TeamSynergy[] = [
  {
    races: [Race.PYROCLAST, Race.HIVEMIND],
    name: 'Swarm Fire',
    description: 'Your team\'s minions with 1 Attack gain +1 Attack',
    bonusType: 'stat_buff',
    value: 1,
  },
  {
    races: [Race.LUMINAR, Race.BIOTITANS],
    name: 'Divine Growth',
    description: 'Your team heals 2 HP at the start of each team turn',
    bonusType: 'heal_bonus',
    value: 2,
  },
  {
    races: [Race.VOIDBORN, Race.PHANTOM_CORSAIRS],
    name: 'Shadow Raid',
    description: 'Cards stolen by your team cost (1) less',
    bonusType: 'cost_reduction',
    value: 1,
  },
  {
    races: [Race.CRYSTALLINE, Race.ASTROMANCERS],
    name: 'Arcane Convergence',
    description: 'Your team draws an extra card every 3rd spell cast',
    bonusType: 'draw_bonus',
    value: 3,
  },
  {
    races: [Race.COGSMITHS, Race.CHRONOBOUND],
    name: 'Temporal Machinery',
    description: 'Your team\'s first Mech each turn costs (1) less',
    bonusType: 'cost_reduction',
    value: 1,
  },
  {
    races: [Race.PYROCLAST, Race.CRYSTALLINE],
    name: 'Crystal Flames',
    description: 'Your team\'s damage spells deal +1 damage',
    bonusType: 'stat_buff',
    value: 1,
  },
  {
    races: [Race.BIOTITANS, Race.HIVEMIND],
    name: 'Apex Swarm',
    description: 'Tokens your team summons gain +1 Health',
    bonusType: 'stat_buff',
    value: 1,
  },
  {
    races: [Race.LUMINAR, Race.CHRONOBOUND],
    name: 'Eternal Light',
    description: 'Your team\'s healing effects are increased by 1',
    bonusType: 'heal_bonus',
    value: 1,
  },
  {
    races: [Race.ASTROMANCERS, Race.VOIDBORN],
    name: 'Cosmic Void',
    description: 'Your team draws a card when the opponent discards',
    bonusType: 'draw_bonus',
    value: 1,
  },
  {
    races: [Race.COGSMITHS, Race.PHANTOM_CORSAIRS],
    name: 'Pirate Engineering',
    description: 'Stolen cards your team plays generate a spare part',
    bonusType: 'stat_buff',
    value: 1,
  },
];

/**
 * Find synergy for a given race pair
 */
export function getTeamSynergy(race1: Race, race2: Race): TeamSynergy | null {
  return TEAM_SYNERGIES.find(
    s => (s.races[0] === race1 && s.races[1] === race2) ||
         (s.races[0] === race2 && s.races[1] === race1)
  ) || null;
}

/**
 * Tag Team match result
 */
export interface TagTeamResult {
  winningTeam: 1 | 2;
  team1HP: number;
  team2HP: number;
  turnCount: number;
  mvpPlayer: string;
  mvpReason: string;
}

/**
 * Tag Team player slot
 */
export interface TagTeamSlot {
  playerName: string;
  race: Race;
  isReady: boolean;
  isAI: boolean;
}

/**
 * Tag Team lobby state
 */
export interface TagTeamLobby {
  team1: [TagTeamSlot | null, TagTeamSlot | null];
  team2: [TagTeamSlot | null, TagTeamSlot | null];
  config: TagTeamConfig;
}

/**
 * Create a default lobby
 */
export function createTagTeamLobby(): TagTeamLobby {
  return {
    team1: [null, null],
    team2: [null, null],
    config: { ...DEFAULT_TAG_TEAM_CONFIG },
  };
}

/**
 * AI teammates with preset race/name
 */
export const AI_TEAMMATES: { name: string; race: Race; personality: string }[] = [
  { name: 'Commander Rex', race: Race.COGSMITHS, personality: 'aggressive' },
  { name: 'Priestess Aria', race: Race.LUMINAR, personality: 'defensive' },
  { name: 'Inferno Kane', race: Race.PYROCLAST, personality: 'aggressive' },
  { name: 'Shadow Weaver', race: Race.VOIDBORN, personality: 'control' },
  { name: 'Apex Predator', race: Race.BIOTITANS, personality: 'midrange' },
  { name: 'Crystal Sage', race: Race.CRYSTALLINE, personality: 'combo' },
  { name: 'Captain Mirage', race: Race.PHANTOM_CORSAIRS, personality: 'tempo' },
  { name: 'Hive Queen Zyx', race: Race.HIVEMIND, personality: 'aggressive' },
  { name: 'Star Oracle', race: Race.ASTROMANCERS, personality: 'control' },
  { name: 'Warden Epoch', race: Race.CHRONOBOUND, personality: 'combo' },
];

/**
 * Get a random AI teammate that doesn't match the given race
 */
export function getRandomAITeammate(excludeRace?: Race): typeof AI_TEAMMATES[0] {
  const pool = excludeRace
    ? AI_TEAMMATES.filter(t => t.race !== excludeRace)
    : AI_TEAMMATES;
  return pool[Math.floor(Math.random() * pool.length)];
}

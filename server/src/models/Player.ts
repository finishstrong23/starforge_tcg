export interface Player {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  gold: number;
  stardust: number;
  nebulaGems: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
}

export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  avatarId: string;
  level: number;
  xp: number;
  gold: number;
  stardust: number;
  nebulaGems: number;
  rank: RankInfo;
  stats: PlayerStats;
  loginStreak: number;
  lastLoginAt: Date;
}

export interface RankInfo {
  tier: RankTier;
  division: number;
  stars: number;
  mmr: number;
  peakMmr: number;
  seasonId: string;
}

export type RankTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' | 'legend';

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winStreak: number;
  bestWinStreak: number;
  totalDamageDealt: number;
  totalCardsPlayed: number;
  totalMinionsKilled: number;
  favoriteRace: string | null;
  arenaWins: number;
  arenaBestRun: number;
}

export interface PlayerCollection {
  playerId: string;
  cards: CardOwnership[];
}

export interface CardOwnership {
  cardId: string;
  count: number;
  isGolden: boolean;
}

export interface PlayerDeck {
  id: string;
  playerId: string;
  name: string;
  race: string;
  cardIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginStreak {
  playerId: string;
  currentStreak: number;
  lastClaimedAt: Date;
  longestStreak: number;
}

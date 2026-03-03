/**
 * STARFORGE TCG - Faction Wars Global Event (8.5.4)
 *
 * Seasonal global event where players pledge to a faction:
 * - Global win tracker per faction
 * - Galactic map with faction dominance visualization
 * - Top contributor leaderboard per faction
 * - Exclusive cosmetic rewards for winning faction
 * - Real-time standings
 */

import { Race, RaceData } from '../types/Race';

const STORAGE_KEY = 'starforge_faction_wars';
const SEASON_DURATION_DAYS = 28;

/**
 * Faction Wars season state
 */
export interface FactionWarsSeason {
  seasonId: number;
  startDate: number;
  endDate: number;
  isActive: boolean;
  factionScores: Record<Race, number>;
  playerPledge: Race | null;
  playerContributions: number;
  topContributors: Record<Race, LeaderboardEntry[]>;
  seasonReward: SeasonReward | null;
}

export interface LeaderboardEntry {
  name: string;
  wins: number;
  rank: number;
}

export interface SeasonReward {
  type: 'card_back' | 'board_border' | 'title';
  name: string;
  description: string;
  factionRequired: Race;
}

/**
 * Faction Wars territory on the galactic map
 */
export interface GalacticTerritory {
  race: Race;
  planetName: string;
  baseScore: number;
  dominanceLevel: number; // 0-3 (neutral, contested, controlled, dominated)
  adjacentTerritories: Race[];
}

// ─── Galactic Map Data ──────────────────────────────────────────────────────

export const GALACTIC_MAP: GalacticTerritory[] = [
  {
    race: Race.COGSMITHS,
    planetName: 'Mechronis',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.LUMINAR, Race.CRYSTALLINE, Race.CHRONOBOUND],
  },
  {
    race: Race.LUMINAR,
    planetName: 'Solhaven',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.COGSMITHS, Race.PYROCLAST, Race.BIOTITANS],
  },
  {
    race: Race.PYROCLAST,
    planetName: 'Ignaros',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.LUMINAR, Race.VOIDBORN, Race.HIVEMIND],
  },
  {
    race: Race.VOIDBORN,
    planetName: 'Nullheim',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.PYROCLAST, Race.PHANTOM_CORSAIRS, Race.ASTROMANCERS],
  },
  {
    race: Race.BIOTITANS,
    planetName: 'Primeva',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.LUMINAR, Race.HIVEMIND, Race.CRYSTALLINE],
  },
  {
    race: Race.CRYSTALLINE,
    planetName: 'Prismora',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.COGSMITHS, Race.BIOTITANS, Race.ASTROMANCERS],
  },
  {
    race: Race.PHANTOM_CORSAIRS,
    planetName: 'Netherstorm',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.VOIDBORN, Race.CHRONOBOUND, Race.HIVEMIND],
  },
  {
    race: Race.HIVEMIND,
    planetName: 'Xenoptera',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.PYROCLAST, Race.BIOTITANS, Race.PHANTOM_CORSAIRS],
  },
  {
    race: Race.ASTROMANCERS,
    planetName: 'Celestara',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.VOIDBORN, Race.CRYSTALLINE, Race.CHRONOBOUND],
  },
  {
    race: Race.CHRONOBOUND,
    planetName: 'Temporia',
    baseScore: 0,
    dominanceLevel: 1,
    adjacentTerritories: [Race.COGSMITHS, Race.PHANTOM_CORSAIRS, Race.ASTROMANCERS],
  },
];

/**
 * Faction-specific colors for the galactic map
 */
export const FACTION_COLORS: Record<Race, { primary: string; glow: string }> = {
  [Race.COGSMITHS]: { primary: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
  [Race.LUMINAR]: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.4)' },
  [Race.PYROCLAST]: { primary: '#ef4444', glow: 'rgba(239,68,68,0.4)' },
  [Race.VOIDBORN]: { primary: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
  [Race.BIOTITANS]: { primary: '#22c55e', glow: 'rgba(34,197,94,0.4)' },
  [Race.CRYSTALLINE]: { primary: '#818cf8', glow: 'rgba(129,140,248,0.4)' },
  [Race.PHANTOM_CORSAIRS]: { primary: '#06b6d4', glow: 'rgba(6,182,212,0.4)' },
  [Race.HIVEMIND]: { primary: '#84cc16', glow: 'rgba(132,204,22,0.4)' },
  [Race.ASTROMANCERS]: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
  [Race.CHRONOBOUND]: { primary: '#22d3ee', glow: 'rgba(34,211,238,0.4)' },
  [Race.NEUTRAL]: { primary: '#6b7280', glow: 'rgba(107,114,128,0.4)' },
};

// ─── Season Management ──────────────────────────────────────────────────────

/**
 * Create a new Faction Wars season
 */
export function createSeason(seasonId: number = 1): FactionWarsSeason {
  const now = Date.now();
  const factionScores: Record<string, number> = {};
  const topContributors: Record<string, LeaderboardEntry[]> = {};

  for (const race of Object.values(Race)) {
    if (race === Race.NEUTRAL) continue;
    factionScores[race] = Math.floor(Math.random() * 500) + 100; // Simulated baseline
    topContributors[race] = generateMockLeaderboard(race);
  }

  return {
    seasonId,
    startDate: now,
    endDate: now + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000,
    isActive: true,
    factionScores: factionScores as Record<Race, number>,
    playerPledge: null,
    playerContributions: 0,
    topContributors: topContributors as Record<Race, LeaderboardEntry[]>,
    seasonReward: {
      type: 'card_back',
      name: `Season ${seasonId} Champion`,
      description: 'Exclusive card back for the winning faction',
      factionRequired: Race.NEUTRAL,
    },
  };
}

/**
 * Load or create Faction Wars season
 */
export function loadFactionWars(): FactionWarsSeason {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const season: FactionWarsSeason = JSON.parse(raw);
      // Check if season expired
      if (Date.now() > season.endDate) {
        const newSeason = createSeason(season.seasonId + 1);
        saveFactionWars(newSeason);
        return newSeason;
      }
      return season;
    }
  } catch { /* ignore */ }

  const season = createSeason();
  saveFactionWars(season);
  return season;
}

/**
 * Save Faction Wars state
 */
export function saveFactionWars(season: FactionWarsSeason): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(season));
}

/**
 * Pledge to a faction
 */
export function pledgeToFaction(season: FactionWarsSeason, race: Race): FactionWarsSeason {
  if (season.playerPledge) return season; // Already pledged
  return {
    ...season,
    playerPledge: race,
  };
}

/**
 * Record a ranked win contribution
 */
export function recordWinContribution(season: FactionWarsSeason): FactionWarsSeason {
  if (!season.playerPledge || !season.isActive) return season;

  const updatedScores = { ...season.factionScores };
  updatedScores[season.playerPledge] = (updatedScores[season.playerPledge] || 0) + 1;

  // Simulate other factions also gaining points
  for (const race of Object.values(Race)) {
    if (race === Race.NEUTRAL || race === season.playerPledge) continue;
    if (Math.random() > 0.5) {
      updatedScores[race] = (updatedScores[race] || 0) + Math.floor(Math.random() * 2);
    }
  }

  const updated = {
    ...season,
    factionScores: updatedScores,
    playerContributions: season.playerContributions + 1,
  };
  saveFactionWars(updated);
  return updated;
}

/**
 * Get faction rankings sorted by score
 */
export function getFactionRankings(season: FactionWarsSeason): {
  race: Race;
  name: string;
  score: number;
  rank: number;
}[] {
  return Object.entries(season.factionScores)
    .filter(([race]) => race !== Race.NEUTRAL)
    .map(([race, score]) => ({
      race: race as Race,
      name: RaceData[race as Race].name,
      score,
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Get days remaining in the season
 */
export function getDaysRemaining(season: FactionWarsSeason): number {
  const remaining = season.endDate - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Calculate dominance level for a territory based on scores
 */
export function calculateDominance(season: FactionWarsSeason, race: Race): number {
  const rankings = getFactionRankings(season);
  const myRanking = rankings.find(r => r.race === race);
  if (!myRanking) return 0;

  if (myRanking.rank === 1) return 3; // Dominated
  if (myRanking.rank <= 3) return 2; // Controlled
  if (myRanking.rank <= 6) return 1; // Contested
  return 0; // Neutral
}

/**
 * Get the top faction
 */
export function getLeadingFaction(season: FactionWarsSeason): Race {
  const rankings = getFactionRankings(season);
  return rankings[0]?.race || Race.NEUTRAL;
}

// ─── Mock Data Generators ───────────────────────────────────────────────────

function generateMockLeaderboard(race: Race): LeaderboardEntry[] {
  const namePool = [
    'StarSlayer', 'CosmicKing', 'VoidWalker', 'FlameHeart',
    'LightBringer', 'SwarmLord', 'TimeKeeper', 'CrystalMage',
    'GearMaster', 'PhantomAce', 'NovaStar', 'DarkTide',
    'SunBlade', 'IronFist', 'ShadowFang', 'ThunderCall',
    'FrostBite', 'EmberGlow', 'NightShade', 'WindRunner',
  ];

  const shuffled = [...namePool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 10).map((name, i) => ({
    name: `${name}${Math.floor(Math.random() * 999)}`,
    wins: Math.floor(Math.random() * 50) + 10 - i * 3,
    rank: i + 1,
  }));
}

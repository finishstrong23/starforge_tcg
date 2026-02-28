/**
 * STARFORGE TCG - Seasonal Rank Rewards
 *
 * Players earn cosmetic rewards (card backs, titles, profile borders)
 * based on their peak rank each season. Rewards are claimed at
 * season end or when viewing past seasons.
 */

const SEASONAL_KEY = 'starforge_seasonal_rewards';

// ── Types ──

export type RewardCategory = 'card_back' | 'title' | 'border' | 'emote';

export interface SeasonalReward {
  id: string;
  name: string;
  description: string;
  category: RewardCategory;
  /** Minimum rank required (e.g., 'Pilot', 'Captain', etc.) */
  requiredRank: string;
  /** Minimum rating required */
  requiredRating: number;
  /** Visual preview color/gradient */
  previewColor: string;
  /** Season-specific variant */
  seasonVariant: boolean;
}

export interface ClaimedReward {
  rewardId: string;
  season: number;
  seasonName: string;
  claimedAt: number;
}

export interface SeasonalRewardsState {
  /** All claimed rewards across seasons */
  claimedRewards: ClaimedReward[];
  /** Currently equipped card back */
  equippedCardBack: string | null;
  /** Currently equipped title */
  equippedTitle: string | null;
  /** Currently equipped border */
  equippedBorder: string | null;
  /** Seasons where rewards were already granted */
  processedSeasons: number[];
}

// ── Reward Definitions ──

export const RANK_REWARDS: SeasonalReward[] = [
  // Card Backs
  {
    id: 'cb_pilot',
    name: 'Star Pilot',
    description: 'A simple starfield card back for reaching Pilot rank',
    category: 'card_back',
    requiredRank: 'Pilot',
    requiredRating: 1000,
    previewColor: 'linear-gradient(135deg, #1a1a3e 0%, #2a2a5e 50%, #1a1a3e 100%)',
    seasonVariant: true,
  },
  {
    id: 'cb_captain',
    name: 'Nebula Captain',
    description: 'A swirling nebula pattern for reaching Captain rank',
    category: 'card_back',
    requiredRank: 'Captain',
    requiredRating: 1200,
    previewColor: 'linear-gradient(135deg, #00ff88 0%, #0088ff 50%, #8800ff 100%)',
    seasonVariant: true,
  },
  {
    id: 'cb_commander',
    name: 'Commander\'s Crest',
    description: 'A prestigious crest for reaching Commander rank',
    category: 'card_back',
    requiredRank: 'Commander',
    requiredRating: 1400,
    previewColor: 'linear-gradient(135deg, #00ccff 0%, #0066ff 50%, #0033cc 100%)',
    seasonVariant: true,
  },
  {
    id: 'cb_admiral',
    name: 'Admiral\'s Insignia',
    description: 'The Admiral\'s exclusive holographic card back',
    category: 'card_back',
    requiredRank: 'Admiral',
    requiredRating: 1600,
    previewColor: 'linear-gradient(135deg, #ff44ff 0%, #aa00ff 50%, #6600cc 100%)',
    seasonVariant: true,
  },
  {
    id: 'cb_starforger',
    name: 'Starforger\'s Mark',
    description: 'The legendary card back for Starforger rank',
    category: 'card_back',
    requiredRank: 'Starforger',
    requiredRating: 1800,
    previewColor: 'linear-gradient(135deg, #ff8800 0%, #ff4400 30%, #ff0066 60%, #ff8800 100%)',
    seasonVariant: true,
  },

  // Titles
  {
    id: 'title_voyager',
    name: 'Voyager',
    description: 'Earned by reaching Pilot rank',
    category: 'title',
    requiredRank: 'Pilot',
    requiredRating: 1000,
    previewColor: '#ffffff',
    seasonVariant: false,
  },
  {
    id: 'title_veteran',
    name: 'Veteran',
    description: 'Earned by reaching Captain rank',
    category: 'title',
    requiredRank: 'Captain',
    requiredRating: 1200,
    previewColor: '#00ff88',
    seasonVariant: false,
  },
  {
    id: 'title_tactician',
    name: 'Tactician',
    description: 'Earned by reaching Commander rank',
    category: 'title',
    requiredRank: 'Commander',
    requiredRating: 1400,
    previewColor: '#00ccff',
    seasonVariant: false,
  },
  {
    id: 'title_warlord',
    name: 'Warlord',
    description: 'Earned by reaching Admiral rank',
    category: 'title',
    requiredRank: 'Admiral',
    requiredRating: 1600,
    previewColor: '#ff44ff',
    seasonVariant: false,
  },
  {
    id: 'title_legend',
    name: 'Legend',
    description: 'The ultimate title for Starforger rank',
    category: 'title',
    requiredRank: 'Starforger',
    requiredRating: 1800,
    previewColor: '#ff8800',
    seasonVariant: false,
  },

  // Borders
  {
    id: 'border_bronze',
    name: 'Bronze Frame',
    description: 'A bronze profile border',
    category: 'border',
    requiredRank: 'Pilot',
    requiredRating: 1000,
    previewColor: '#cd7f32',
    seasonVariant: false,
  },
  {
    id: 'border_silver',
    name: 'Silver Frame',
    description: 'A silver profile border',
    category: 'border',
    requiredRank: 'Captain',
    requiredRating: 1200,
    previewColor: '#c0c0c0',
    seasonVariant: false,
  },
  {
    id: 'border_gold',
    name: 'Gold Frame',
    description: 'A gold profile border',
    category: 'border',
    requiredRank: 'Commander',
    requiredRating: 1400,
    previewColor: '#ffd700',
    seasonVariant: false,
  },
  {
    id: 'border_diamond',
    name: 'Diamond Frame',
    description: 'A diamond-studded profile border',
    category: 'border',
    requiredRank: 'Admiral',
    requiredRating: 1600,
    previewColor: '#88ddff',
    seasonVariant: false,
  },
  {
    id: 'border_cosmic',
    name: 'Cosmic Frame',
    description: 'An animated cosmic profile border',
    category: 'border',
    requiredRank: 'Starforger',
    requiredRating: 1800,
    previewColor: '#ff8800',
    seasonVariant: false,
  },
];

// ── State Management ──

export function loadSeasonalRewards(): SeasonalRewardsState {
  try {
    const raw = localStorage.getItem(SEASONAL_KEY);
    if (!raw) return createDefaultState();
    return { ...createDefaultState(), ...JSON.parse(raw) };
  } catch {
    return createDefaultState();
  }
}

export function saveSeasonalRewards(state: SeasonalRewardsState): void {
  try {
    localStorage.setItem(SEASONAL_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save seasonal rewards');
  }
}

function createDefaultState(): SeasonalRewardsState {
  return {
    claimedRewards: [],
    equippedCardBack: null,
    equippedTitle: null,
    equippedBorder: null,
    processedSeasons: [],
  };
}

// ── Operations ──

/** Get rewards unlocked by a given peak rating */
export function getUnlockedRewards(peakRating: number): SeasonalReward[] {
  return RANK_REWARDS.filter(r => peakRating >= r.requiredRating);
}

/** Process end-of-season rewards for a given season */
export function processSeasonRewards(
  season: number,
  seasonName: string,
  peakRating: number,
): SeasonalRewardsState {
  const state = loadSeasonalRewards();

  if (state.processedSeasons.includes(season)) return state;

  const unlocked = getUnlockedRewards(peakRating);
  const now = Date.now();

  for (const reward of unlocked) {
    const rewardId = reward.seasonVariant ? `${reward.id}_s${season}` : reward.id;

    // Don't duplicate non-variant rewards
    if (!reward.seasonVariant && state.claimedRewards.some(cr => cr.rewardId === reward.id)) {
      continue;
    }

    state.claimedRewards.push({
      rewardId,
      season,
      seasonName,
      claimedAt: now,
    });
  }

  state.processedSeasons.push(season);
  saveSeasonalRewards(state);
  return state;
}

/** Equip a card back */
export function equipCardBack(rewardId: string | null): SeasonalRewardsState {
  const state = loadSeasonalRewards();
  state.equippedCardBack = rewardId;
  saveSeasonalRewards(state);
  return state;
}

/** Equip a title */
export function equipTitle(rewardId: string | null): SeasonalRewardsState {
  const state = loadSeasonalRewards();
  state.equippedTitle = rewardId;
  saveSeasonalRewards(state);
  return state;
}

/** Equip a border */
export function equipBorder(rewardId: string | null): SeasonalRewardsState {
  const state = loadSeasonalRewards();
  state.equippedBorder = rewardId;
  saveSeasonalRewards(state);
  return state;
}

/** Get all owned card backs */
export function getOwnedCardBacks(state: SeasonalRewardsState): ClaimedReward[] {
  return state.claimedRewards.filter(cr => {
    const base = cr.rewardId.replace(/_s\d+$/, '');
    const reward = RANK_REWARDS.find(r => r.id === base);
    return reward?.category === 'card_back';
  });
}

/** Get all owned titles */
export function getOwnedTitles(state: SeasonalRewardsState): ClaimedReward[] {
  return state.claimedRewards.filter(cr => {
    const reward = RANK_REWARDS.find(r => r.id === cr.rewardId);
    return reward?.category === 'title';
  });
}

/** Get all owned borders */
export function getOwnedBorders(state: SeasonalRewardsState): ClaimedReward[] {
  return state.claimedRewards.filter(cr => {
    const reward = RANK_REWARDS.find(r => r.id === cr.rewardId);
    return reward?.category === 'border';
  });
}

/** Get the reward definition from a claimed reward ID */
export function getRewardDefinition(rewardId: string): SeasonalReward | undefined {
  const baseId = rewardId.replace(/_s\d+$/, '');
  return RANK_REWARDS.find(r => r.id === baseId);
}

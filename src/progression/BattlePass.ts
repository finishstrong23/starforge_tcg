/**
 * STARFORGE TCG - Battle Pass System
 *
 * 50-tier progression track with free + premium rewards.
 * XP earned from games, wins, and quest completions.
 * Season-locked — resets when a new season starts.
 */

import { CardRarity } from '../types/Card';

// ── Reward Types ──────────────────────────────────────────────

export type BattlePassRewardType = 'gold' | 'stardust' | 'pack_standard' | 'pack_premium' | 'pack_legendary' | 'card_back' | 'title';

export interface BattlePassReward {
  type: BattlePassRewardType;
  amount: number;
  label: string;
  icon: string;
}

export interface BattlePassTier {
  level: number;
  xpRequired: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
}

export interface BattlePassState {
  /** Current season number */
  season: number;
  /** Season start date (ISO) */
  seasonStart: string;
  /** Season end date (ISO) */
  seasonEnd: string;
  /** Season display name */
  seasonName: string;
  /** Current XP in this season */
  xp: number;
  /** Current level (1-50) */
  level: number;
  /** Whether premium pass is unlocked */
  isPremium: boolean;
  /** Which free rewards have been claimed (level numbers) */
  claimedFree: number[];
  /** Which premium rewards have been claimed (level numbers) */
  claimedPremium: number[];
  /** Total XP earned this season */
  totalXpEarned: number;
  /** History of completed seasons */
  seasonHistory: SeasonSummary[];
}

export interface SeasonSummary {
  season: number;
  seasonName: string;
  finalLevel: number;
  totalXp: number;
  wasPremium: boolean;
  rewardsClaimed: number;
}

// ── Constants ─────────────────────────────────────────────────

const BATTLE_PASS_KEY = 'starforge_battlepass';
const MAX_LEVEL = 50;

/** XP required for each level bracket */
function xpForLevel(level: number): number {
  if (level <= 10) return 100;
  if (level <= 30) return 150;
  return 200;
}

/** Total XP needed to reach a given level */
function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** XP rewards for game actions */
export const XP_REWARDS = {
  GAME_PLAYED: 15,
  GAME_WON: 30,
  QUEST_COMPLETED: 50,
  DAILY_LOGIN: 10,
  PVP_WIN: 40,
  CAMPAIGN_WIN: 25,
  FAST_WIN: 10,      // bonus for winning in < 8 turns
} as const;

// ── Season Config ─────────────────────────────────────────────

const SEASON_NAMES = [
  'Season of the Void',
  'Season of Starfire',
  'Season of the Swarm',
  'Season of Chrono',
  'Season of the Forge',
  'Season of Crystals',
  'Season of Phantoms',
  'Season of Lumina',
];

function getCurrentSeasonNumber(): number {
  // Season changes every 30 days from a fixed epoch
  const epoch = new Date('2025-01-01').getTime();
  const now = Date.now();
  return Math.floor((now - epoch) / (30 * 24 * 60 * 60 * 1000)) + 1;
}

function getSeasonDates(seasonNum: number): { start: string; end: string; name: string } {
  const epoch = new Date('2025-01-01').getTime();
  const startMs = epoch + (seasonNum - 1) * 30 * 24 * 60 * 60 * 1000;
  const endMs = startMs + 30 * 24 * 60 * 60 * 1000;
  return {
    start: new Date(startMs).toISOString().split('T')[0],
    end: new Date(endMs).toISOString().split('T')[0],
    name: SEASON_NAMES[(seasonNum - 1) % SEASON_NAMES.length],
  };
}

// ── Tier Definitions ──────────────────────────────────────────

function generateTiers(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];

  for (let level = 1; level <= MAX_LEVEL; level++) {
    const tier: BattlePassTier = {
      level,
      xpRequired: xpForLevel(level),
      freeReward: null,
      premiumReward: null,
    };

    // Free track rewards
    if (level % 5 === 0) {
      // Every 5 levels: pack
      if (level <= 20) {
        tier.freeReward = { type: 'pack_standard', amount: 1, label: 'Standard Pack', icon: '\u{1F4E6}' };
      } else if (level <= 40) {
        tier.freeReward = { type: 'pack_premium', amount: 1, label: 'Premium Pack', icon: '\u{1F381}' };
      } else {
        tier.freeReward = { type: 'pack_legendary', amount: 1, label: 'Legendary Pack', icon: '\u{1F451}' };
      }
    } else if (level % 3 === 0) {
      // Every 3 levels: stardust
      const dust = level <= 20 ? 25 : level <= 35 ? 50 : 75;
      tier.freeReward = { type: 'stardust', amount: dust, label: `${dust} Stardust`, icon: '\u2728' };
    } else if (level % 2 === 0) {
      // Every 2 levels: gold
      const gold = level <= 15 ? 25 : level <= 30 ? 40 : 60;
      tier.freeReward = { type: 'gold', amount: gold, label: `${gold} Gold`, icon: '\u{1FA99}' };
    }

    // Premium track rewards
    if (level === MAX_LEVEL) {
      tier.premiumReward = { type: 'card_back', amount: 1, label: 'Season Card Back', icon: '\u{1F3C6}' };
    } else if (level === 40) {
      tier.premiumReward = { type: 'title', amount: 1, label: 'Season Title', icon: '\u{1F396}' };
    } else if (level % 5 === 0) {
      // Every 5 levels on premium: better pack
      if (level <= 25) {
        tier.premiumReward = { type: 'pack_premium', amount: 1, label: 'Premium Pack', icon: '\u{1F381}' };
      } else {
        tier.premiumReward = { type: 'pack_legendary', amount: 1, label: 'Legendary Pack', icon: '\u{1F451}' };
      }
    } else if (level % 3 === 0) {
      const dust = level <= 15 ? 50 : level <= 30 ? 75 : 100;
      tier.premiumReward = { type: 'stardust', amount: dust, label: `${dust} Stardust`, icon: '\u2728' };
    } else if (level % 2 === 0) {
      const gold = level <= 15 ? 50 : level <= 30 ? 75 : 100;
      tier.premiumReward = { type: 'gold', amount: gold, label: `${gold} Gold`, icon: '\u{1FA99}' };
    }

    tiers.push(tier);
  }

  return tiers;
}

export const BATTLE_PASS_TIERS = generateTiers();

// ── State Management ──────────────────────────────────────────

function createFreshState(): BattlePassState {
  const season = getCurrentSeasonNumber();
  const { start, end, name } = getSeasonDates(season);
  return {
    season,
    seasonStart: start,
    seasonEnd: end,
    seasonName: name,
    xp: 0,
    level: 1,
    isPremium: false,
    claimedFree: [],
    claimedPremium: [],
    totalXpEarned: 0,
    seasonHistory: [],
  };
}

export function loadBattlePass(): BattlePassState {
  try {
    const raw = localStorage.getItem(BATTLE_PASS_KEY);
    if (raw) {
      const state = JSON.parse(raw) as BattlePassState;
      return checkSeasonRollover(state);
    }
  } catch { /* ignore */ }
  return createFreshState();
}

export function saveBattlePass(state: BattlePassState): void {
  try {
    localStorage.setItem(BATTLE_PASS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function checkSeasonRollover(state: BattlePassState): BattlePassState {
  const currentSeason = getCurrentSeasonNumber();
  if (state.season === currentSeason) return state;

  // Archive old season
  const summary: SeasonSummary = {
    season: state.season,
    seasonName: state.seasonName,
    finalLevel: state.level,
    totalXp: state.totalXpEarned,
    wasPremium: state.isPremium,
    rewardsClaimed: state.claimedFree.length + state.claimedPremium.length,
  };

  const { start, end, name } = getSeasonDates(currentSeason);
  const newState: BattlePassState = {
    season: currentSeason,
    seasonStart: start,
    seasonEnd: end,
    seasonName: name,
    xp: 0,
    level: 1,
    isPremium: false,
    claimedFree: [],
    claimedPremium: [],
    totalXpEarned: 0,
    seasonHistory: [...(state.seasonHistory || []), summary].slice(-10),
  };

  saveBattlePass(newState);
  return newState;
}

/** Add XP and level up as needed */
export function addXP(state: BattlePassState, amount: number): BattlePassState {
  let xp = state.xp + amount;
  let level = state.level;

  // Level up
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
    } else {
      break;
    }
  }

  // Cap XP at max level
  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
  }

  const newState: BattlePassState = {
    ...state,
    xp,
    level,
    totalXpEarned: state.totalXpEarned + amount,
  };

  saveBattlePass(newState);
  return newState;
}

/** Claim a free track reward */
export function claimFreeReward(state: BattlePassState, level: number): BattlePassState | null {
  if (state.level < level) return null;
  if (state.claimedFree.includes(level)) return null;

  const tier = BATTLE_PASS_TIERS[level - 1];
  if (!tier?.freeReward) return null;

  const newState: BattlePassState = {
    ...state,
    claimedFree: [...state.claimedFree, level],
  };

  saveBattlePass(newState);
  return newState;
}

/** Claim a premium track reward */
export function claimPremiumReward(state: BattlePassState, level: number): BattlePassState | null {
  if (!state.isPremium) return null;
  if (state.level < level) return null;
  if (state.claimedPremium.includes(level)) return null;

  const tier = BATTLE_PASS_TIERS[level - 1];
  if (!tier?.premiumReward) return null;

  const newState: BattlePassState = {
    ...state,
    claimedPremium: [...state.claimedPremium, level],
  };

  saveBattlePass(newState);
  return newState;
}

/** Upgrade to premium battle pass */
export function upgradeToPremium(state: BattlePassState): BattlePassState {
  const newState: BattlePassState = { ...state, isPremium: true };
  saveBattlePass(newState);
  return newState;
}

/** Get XP progress within current level */
export function getLevelProgress(state: BattlePassState): { current: number; needed: number; percent: number } {
  if (state.level >= MAX_LEVEL) return { current: 0, needed: 0, percent: 100 };
  const needed = xpForLevel(state.level);
  return { current: state.xp, needed, percent: Math.round((state.xp / needed) * 100) };
}

/** Get days remaining in the season */
export function getDaysRemaining(state: BattlePassState): number {
  const end = new Date(state.seasonEnd).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

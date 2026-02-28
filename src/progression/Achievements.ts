/**
 * STARFORGE TCG - Achievement System
 *
 * Milestone-based achievements that reward gold and track player progress.
 * Categories: Combat, Collection, Campaign, Social, Mastery
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string; // SVG path data or symbol
  target: number;
  progress: number;
  reward: number; // gold
  unlocked: boolean;
  claimed: boolean;
  tier: 1 | 2 | 3; // bronze, silver, gold
}

export type AchievementCategory = 'combat' | 'collection' | 'campaign' | 'mastery';

export interface AchievementState {
  achievements: Achievement[];
  totalUnlocked: number;
  totalClaimed: number;
}

const ACHIEVEMENTS_KEY = 'starforge_achievements';

// Achievement definitions
const ACHIEVEMENT_DEFS: Omit<Achievement, 'progress' | 'unlocked' | 'claimed'>[] = [
  // Combat achievements
  { id: 'first_blood', name: 'First Blood', description: 'Win your first game', category: 'combat', icon: 'sword', target: 1, reward: 50, tier: 1 },
  { id: 'warrior', name: 'Warrior', description: 'Win 10 games', category: 'combat', icon: 'sword', target: 10, reward: 100, tier: 2 },
  { id: 'champion', name: 'Champion', description: 'Win 50 games', category: 'combat', icon: 'sword', target: 50, reward: 300, tier: 3 },
  { id: 'streak_3', name: 'Hot Streak', description: 'Win 3 games in a row', category: 'combat', icon: 'fire', target: 3, reward: 75, tier: 1 },
  { id: 'streak_5', name: 'Unstoppable', description: 'Win 5 games in a row', category: 'combat', icon: 'fire', target: 5, reward: 150, tier: 2 },
  { id: 'streak_10', name: 'Legendary Streak', description: 'Win 10 games in a row', category: 'combat', icon: 'fire', target: 10, reward: 400, tier: 3 },
  { id: 'quick_win', name: 'Speed Runner', description: 'Win a game in 8 turns or fewer', category: 'combat', icon: 'bolt', target: 1, reward: 100, tier: 2 },
  { id: 'comeback', name: 'Never Give Up', description: 'Win with 5 or less health remaining', category: 'combat', icon: 'heart', target: 1, reward: 75, tier: 1 },
  { id: 'perfect_win', name: 'Flawless Victory', description: 'Win without taking any damage', category: 'combat', icon: 'shield', target: 1, reward: 200, tier: 3 },
  { id: 'play_100', name: 'Dedicated Player', description: 'Play 100 games total', category: 'combat', icon: 'game', target: 100, reward: 200, tier: 2 },

  // Campaign achievements
  { id: 'first_planet', name: 'Explorer', description: 'Complete your first campaign planet', category: 'campaign', icon: 'planet', target: 1, reward: 75, tier: 1 },
  { id: 'half_campaign', name: 'Galactic Traveler', description: 'Complete 5 campaign planets', category: 'campaign', icon: 'planet', target: 5, reward: 200, tier: 2 },
  { id: 'full_campaign', name: 'Conqueror', description: 'Complete all 10 campaign planets', category: 'campaign', icon: 'planet', target: 10, reward: 500, tier: 3 },

  // Collection achievements
  { id: 'open_pack', name: 'Unboxer', description: 'Open your first card pack', category: 'collection', icon: 'pack', target: 1, reward: 25, tier: 1 },
  { id: 'open_10', name: 'Collector', description: 'Open 10 card packs', category: 'collection', icon: 'pack', target: 10, reward: 100, tier: 2 },
  { id: 'open_50', name: 'Hoarder', description: 'Open 50 card packs', category: 'collection', icon: 'pack', target: 50, reward: 300, tier: 3 },
  { id: 'first_legendary', name: 'Jackpot', description: 'Find your first Legendary card', category: 'collection', icon: 'star', target: 1, reward: 100, tier: 2 },
  { id: 'build_deck', name: 'Decksmith', description: 'Build a custom deck', category: 'collection', icon: 'cards', target: 1, reward: 50, tier: 1 },

  // Mastery achievements
  { id: 'play_all_races', name: 'Versatile', description: 'Play a game with every race', category: 'mastery', icon: 'globe', target: 10, reward: 200, tier: 2 },
  { id: 'win_all_races', name: 'Master of All', description: 'Win a game with every race', category: 'mastery', icon: 'globe', target: 10, reward: 500, tier: 3 },
  { id: 'starforge_card', name: 'Starforger', description: 'Starforge a card in battle', category: 'mastery', icon: 'star', target: 1, reward: 75, tier: 1 },
  { id: 'login_7', name: 'Weekly Warrior', description: 'Log in 7 days in a row', category: 'mastery', icon: 'calendar', target: 7, reward: 150, tier: 2 },
  { id: 'login_30', name: 'Monthly Maven', description: 'Log in 30 days in a row', category: 'mastery', icon: 'calendar', target: 30, reward: 500, tier: 3 },
  { id: 'earn_1000', name: 'Gold Rush', description: 'Earn 1000 gold total', category: 'mastery', icon: 'coin', target: 1000, reward: 100, tier: 2 },
  { id: 'complete_quests', name: 'Questmaster', description: 'Complete 20 daily quests', category: 'mastery', icon: 'scroll', target: 20, reward: 200, tier: 2 },
];

export function loadAchievements(): AchievementState {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) {
      const state = JSON.parse(raw) as AchievementState;
      // Merge with any new achievements added in updates
      return mergeNewAchievements(state);
    }
  } catch { /* ignore */ }
  return createFreshState();
}

function createFreshState(): AchievementState {
  return {
    achievements: ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      progress: 0,
      unlocked: false,
      claimed: false,
    })),
    totalUnlocked: 0,
    totalClaimed: 0,
  };
}

function mergeNewAchievements(state: AchievementState): AchievementState {
  const existingIds = new Set(state.achievements.map(a => a.id));
  const newAchievements = ACHIEVEMENT_DEFS
    .filter(def => !existingIds.has(def.id))
    .map(def => ({ ...def, progress: 0, unlocked: false, claimed: false }));

  if (newAchievements.length === 0) return state;

  return {
    ...state,
    achievements: [...state.achievements, ...newAchievements],
  };
}

export function saveAchievements(state: AchievementState): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

/** Update progress for an achievement by ID, returns newly unlocked achievement IDs */
export function updateAchievement(
  state: AchievementState,
  achievementId: string,
  progress: number,
): { state: AchievementState; newlyUnlocked: string[] } {
  const newlyUnlocked: string[] = [];

  const achievements = state.achievements.map(a => {
    if (a.id === achievementId && !a.unlocked) {
      const newProgress = Math.min(a.target, progress);
      const unlocked = newProgress >= a.target;
      if (unlocked) newlyUnlocked.push(a.id);
      return { ...a, progress: newProgress, unlocked };
    }
    return a;
  });

  const updated: AchievementState = {
    achievements,
    totalUnlocked: achievements.filter(a => a.unlocked).length,
    totalClaimed: achievements.filter(a => a.claimed).length,
  };

  saveAchievements(updated);
  return { state: updated, newlyUnlocked };
}

/** Increment progress for an achievement */
export function incrementAchievement(
  state: AchievementState,
  achievementId: string,
  amount: number = 1,
): { state: AchievementState; newlyUnlocked: string[] } {
  const current = state.achievements.find(a => a.id === achievementId);
  if (!current || current.unlocked) return { state, newlyUnlocked: [] };
  return updateAchievement(state, achievementId, current.progress + amount);
}

/** Claim an unlocked achievement's reward */
export function claimAchievementReward(
  state: AchievementState,
  achievementId: string,
): { state: AchievementState; goldReward: number } {
  let goldReward = 0;
  const achievements = state.achievements.map(a => {
    if (a.id === achievementId && a.unlocked && !a.claimed) {
      goldReward = a.reward;
      return { ...a, claimed: true };
    }
    return a;
  });

  const updated: AchievementState = {
    achievements,
    totalUnlocked: achievements.filter(a => a.unlocked).length,
    totalClaimed: achievements.filter(a => a.claimed).length,
  };

  saveAchievements(updated);
  return { state: updated, goldReward };
}

/** Get achievements grouped by category */
export function getAchievementsByCategory(state: AchievementState): Record<AchievementCategory, Achievement[]> {
  const grouped: Record<AchievementCategory, Achievement[]> = {
    combat: [],
    collection: [],
    campaign: [],
    mastery: [],
  };
  for (const a of state.achievements) {
    grouped[a.category].push(a);
  }
  return grouped;
}

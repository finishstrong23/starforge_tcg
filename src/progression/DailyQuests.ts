/**
 * STARFORGE TCG - Daily Quest & Login Reward System
 *
 * Engagement loop with:
 * - Daily login streak with escalating gold rewards
 * - 3 daily quests refreshed every 24 hours
 * - Quest types: win games, play cards, use keywords, play races
 * - Quest progress tracking persisted to localStorage
 */

export interface DailyQuest {
  id: string;
  description: string;
  target: number;
  progress: number;
  reward: number; // gold
  type: QuestType;
  /** Race filter for race-specific quests */
  raceFilter?: string;
  completed: boolean;
  claimed: boolean;
}

export type QuestType =
  | 'win_games'
  | 'play_games'
  | 'play_minions'
  | 'play_spells'
  | 'deal_damage'
  | 'heal_amount'
  | 'win_with_race'
  | 'play_cards_cost'
  | 'destroy_minions'
  | 'use_hero_power';

export interface DailyState {
  /** ISO date string of last login */
  lastLoginDate: string;
  /** Current login streak (consecutive days) */
  loginStreak: number;
  /** Whether today's login reward was claimed */
  loginRewardClaimed: boolean;
  /** Today's login reward amount */
  loginRewardAmount: number;
  /** Active daily quests */
  quests: DailyQuest[];
  /** ISO date when quests were last refreshed */
  questRefreshDate: string;
  /** Player's gold balance */
  gold: number;
  /** Total gold earned all time */
  totalGoldEarned: number;
}

const DAILY_KEY = 'starforge_daily';

// Login reward tiers (by streak day, cycles after 7)
const LOGIN_REWARDS = [25, 30, 35, 40, 50, 60, 100];

// Quest templates
const QUEST_TEMPLATES: { type: QuestType; desc: string; targets: number[]; rewards: number[] }[] = [
  { type: 'win_games', desc: 'Win {n} games', targets: [2, 3, 5], rewards: [30, 45, 75] },
  { type: 'play_games', desc: 'Play {n} games', targets: [3, 5], rewards: [25, 40] },
  { type: 'play_minions', desc: 'Play {n} minions', targets: [10, 15, 20], rewards: [25, 35, 50] },
  { type: 'play_spells', desc: 'Cast {n} spells', targets: [5, 8], rewards: [30, 45] },
  { type: 'deal_damage', desc: 'Deal {n} damage to enemy heroes', targets: [20, 30, 50], rewards: [30, 40, 60] },
  { type: 'destroy_minions', desc: 'Destroy {n} enemy minions', targets: [8, 12], rewards: [30, 40] },
  { type: 'use_hero_power', desc: 'Use your Hero Power {n} times', targets: [5, 8], rewards: [25, 35] },
];

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function generateDailyQuests(dateStr: string): DailyQuest[] {
  const rng = seededRng(dateStr + '_starforge_quests');
  const used = new Set<number>();
  const quests: DailyQuest[] = [];

  while (quests.length < 3) {
    const idx = Math.floor(rng() * QUEST_TEMPLATES.length);
    if (used.has(idx)) continue;
    used.add(idx);

    const template = QUEST_TEMPLATES[idx];
    const tierIdx = Math.floor(rng() * template.targets.length);
    const target = template.targets[tierIdx];
    const reward = template.rewards[tierIdx];

    quests.push({
      id: `${dateStr}_q${quests.length}`,
      description: template.desc.replace('{n}', String(target)),
      target,
      progress: 0,
      reward,
      type: template.type,
      completed: false,
      claimed: false,
    });
  }

  return quests;
}

export function loadDailyState(): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const state = JSON.parse(raw) as DailyState;
      return refreshIfNeeded(state);
    }
  } catch { /* ignore */ }
  return createFreshState();
}

function createFreshState(): DailyState {
  const today = getTodayStr();
  return {
    lastLoginDate: today,
    loginStreak: 1,
    loginRewardClaimed: false,
    loginRewardAmount: LOGIN_REWARDS[0],
    quests: generateDailyQuests(today),
    questRefreshDate: today,
    gold: 0,
    totalGoldEarned: 0,
  };
}

function refreshIfNeeded(state: DailyState): DailyState {
  const today = getTodayStr();
  if (state.lastLoginDate === today) return state;

  // Check if yesterday for streak continuation
  const lastDate = new Date(state.lastLoginDate);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak: number;
  if (diffDays === 1) {
    newStreak = state.loginStreak + 1;
  } else {
    newStreak = 1; // streak broken
  }

  const rewardIdx = (newStreak - 1) % LOGIN_REWARDS.length;

  return {
    ...state,
    lastLoginDate: today,
    loginStreak: newStreak,
    loginRewardClaimed: false,
    loginRewardAmount: LOGIN_REWARDS[rewardIdx],
    quests: generateDailyQuests(today),
    questRefreshDate: today,
  };
}

export function saveDailyState(state: DailyState): void {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function claimLoginReward(state: DailyState): DailyState {
  if (state.loginRewardClaimed) return state;
  const updated = {
    ...state,
    loginRewardClaimed: true,
    gold: state.gold + state.loginRewardAmount,
    totalGoldEarned: state.totalGoldEarned + state.loginRewardAmount,
  };
  saveDailyState(updated);
  return updated;
}

export function claimQuestReward(state: DailyState, questId: string): DailyState {
  const quests = state.quests.map(q => {
    if (q.id === questId && q.completed && !q.claimed) {
      return { ...q, claimed: true };
    }
    return q;
  });
  const quest = quests.find(q => q.id === questId);
  const reward = quest?.claimed && !state.quests.find(q => q.id === questId)?.claimed
    ? quest.reward : 0;

  const updated = {
    ...state,
    quests,
    gold: state.gold + reward,
    totalGoldEarned: state.totalGoldEarned + reward,
  };
  saveDailyState(updated);
  return updated;
}

/** Update quest progress after a game event */
export function updateQuestProgress(
  state: DailyState,
  type: QuestType,
  amount: number = 1,
): DailyState {
  let changed = false;
  const quests = state.quests.map(q => {
    if (q.type === type && !q.completed) {
      const newProgress = Math.min(q.target, q.progress + amount);
      const completed = newProgress >= q.target;
      if (newProgress !== q.progress) changed = true;
      return { ...q, progress: newProgress, completed };
    }
    return q;
  });

  if (!changed) return state;

  const updated = { ...state, quests };
  saveDailyState(updated);
  return updated;
}

export function addGold(state: DailyState, amount: number): DailyState {
  const updated = {
    ...state,
    gold: state.gold + amount,
    totalGoldEarned: state.totalGoldEarned + amount,
  };
  saveDailyState(updated);
  return updated;
}

export function spendGold(state: DailyState, amount: number): DailyState | null {
  if (state.gold < amount) return null;
  const updated = { ...state, gold: state.gold - amount };
  saveDailyState(updated);
  return updated;
}

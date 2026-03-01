import { query, withTransaction } from '../config/database';
import * as AuthService from './AuthService';

export interface Quest {
  id: number;
  questType: string;
  questDescription: string;
  targetValue: number;
  currentValue: number;
  rewardGold: number;
  rewardXp: number;
  isCompleted: boolean;
  canReroll: boolean;
  assignedAt: Date;
}

interface QuestTemplate {
  type: string;
  description: string;
  target: number;
  gold: number;
  xp: number;
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: 'win_games', description: 'Win {target} games', target: 3, gold: 50, xp: 100 },
  { type: 'win_games', description: 'Win {target} games', target: 5, gold: 80, xp: 150 },
  { type: 'play_cards', description: 'Play {target} cards', target: 20, gold: 40, xp: 80 },
  { type: 'play_cards', description: 'Play {target} cards', target: 30, gold: 60, xp: 120 },
  { type: 'deal_damage', description: 'Deal {target} damage to enemy heroes', target: 50, gold: 50, xp: 100 },
  { type: 'deal_damage', description: 'Deal {target} damage to enemy heroes', target: 100, gold: 80, xp: 150 },
  { type: 'kill_minions', description: 'Destroy {target} enemy minions', target: 15, gold: 50, xp: 100 },
  { type: 'kill_minions', description: 'Destroy {target} enemy minions', target: 25, gold: 70, xp: 130 },
  { type: 'play_race', description: 'Play {target} games as Pyroclast', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Verdani', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Mechara', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Voidborn', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Celestari', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Nethari', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Draconid', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Hivemind', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Crystari', target: 3, gold: 60, xp: 100 },
  { type: 'play_race', description: 'Play {target} games as Aetherian', target: 3, gold: 60, xp: 100 },
  { type: 'use_keywords', description: 'Trigger {target} keyword effects', target: 10, gold: 50, xp: 100 },
  { type: 'use_hero_power', description: 'Use your Hero Power {target} times', target: 5, gold: 30, xp: 60 },
  { type: 'play_spells', description: 'Cast {target} spells', target: 8, gold: 50, xp: 100 },
  { type: 'win_ranked', description: 'Win {target} Ranked games', target: 2, gold: 70, xp: 120 },
  { type: 'starforge', description: 'Activate Starforge Ascension {target} time(s)', target: 1, gold: 60, xp: 100 },
];

const WEEKLY_QUEST: QuestTemplate = {
  type: 'weekly_wins', description: 'Win {target} games this week', target: 15, gold: 200, xp: 500,
};

const FIRST_WIN_GOLD = 25;
const FIRST_WIN_XP = 50;

const LOGIN_STREAK_REWARDS: Record<number, { gold: number; xp: number }> = {
  3: { gold: 50, xp: 100 },
  7: { gold: 100, xp: 200 },
  14: { gold: 200, xp: 400 },
  30: { gold: 500, xp: 1000 },
};

function pickRandomQuests(count: number, exclude: string[]): QuestTemplate[] {
  const available = QUEST_TEMPLATES.filter(t => !exclude.includes(t.type + t.target));
  const picked: QuestTemplate[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    picked.push(available[idx]);
    available.splice(idx, 1);
  }

  return picked;
}

export async function getDailyQuests(playerId: string): Promise<Quest[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await query(
    `SELECT * FROM daily_quests WHERE player_id = $1 AND assigned_at >= $2 ORDER BY id`,
    [playerId, today]
  );

  if (result.rows.length === 0) {
    // Assign new quests for today
    return assignDailyQuests(playerId);
  }

  return result.rows.map(rowToQuest);
}

async function assignDailyQuests(playerId: string): Promise<Quest[]> {
  const templates = pickRandomQuests(3, []);
  const quests: Quest[] = [];

  for (const tmpl of templates) {
    const description = tmpl.description.replace('{target}', tmpl.target.toString());
    const result = await query(
      `INSERT INTO daily_quests (player_id, quest_type, quest_description, target_value, reward_gold, reward_xp, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [playerId, tmpl.type, description, tmpl.target, tmpl.gold, tmpl.xp]
    );
    quests.push(rowToQuest(result.rows[0]));
  }

  return quests;
}

export async function rerollQuest(playerId: string, questId: number): Promise<Quest> {
  const existing = await query(
    'SELECT * FROM daily_quests WHERE id = $1 AND player_id = $2 AND can_reroll = true AND is_completed = false',
    [questId, playerId]
  );

  if (existing.rows.length === 0) {
    throw new Error('Quest cannot be rerolled');
  }

  // Check if already rerolled today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rerolledToday = await query(
    `SELECT COUNT(*) as count FROM daily_quests
     WHERE player_id = $1 AND assigned_at >= $2 AND can_reroll = false AND is_completed = false`,
    [playerId, today]
  );

  if (parseInt(rerolledToday.rows[0].count) > 0) {
    throw new Error('Already rerolled a quest today');
  }

  // Pick a new random quest (different from current ones)
  const currentQuests = await query(
    'SELECT quest_type, target_value FROM daily_quests WHERE player_id = $1 AND assigned_at >= $2',
    [playerId, today]
  );
  const exclude = currentQuests.rows.map(r => r.quest_type + r.target_value);
  const [newTemplate] = pickRandomQuests(1, exclude);

  if (!newTemplate) {
    throw new Error('No alternative quests available');
  }

  const description = newTemplate.description.replace('{target}', newTemplate.target.toString());

  const result = await query(
    `UPDATE daily_quests SET quest_type = $1, quest_description = $2, target_value = $3,
     current_value = 0, reward_gold = $4, reward_xp = $5, can_reroll = false
     WHERE id = $6 RETURNING *`,
    [newTemplate.type, description, newTemplate.target, newTemplate.gold, newTemplate.xp, questId]
  );

  return rowToQuest(result.rows[0]);
}

export async function updateQuestProgress(
  playerId: string,
  eventType: string,
  amount: number,
  metadata?: { race?: string }
): Promise<{ completed: Quest[]; rewards: { gold: number; xp: number } }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map event types to quest types
  const questTypes = mapEventToQuestTypes(eventType, metadata);

  const result = await query(
    `SELECT * FROM daily_quests
     WHERE player_id = $1 AND assigned_at >= $2 AND is_completed = false
     AND quest_type = ANY($3)`,
    [playerId, today, questTypes]
  );

  const completed: Quest[] = [];
  let totalGold = 0;
  let totalXp = 0;

  for (const row of result.rows) {
    const newValue = Math.min(row.current_value + amount, row.target_value);
    const isNowComplete = newValue >= row.target_value;

    await query(
      `UPDATE daily_quests SET current_value = $1, is_completed = $2,
       completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END
       WHERE id = $3`,
      [newValue, isNowComplete, row.id]
    );

    if (isNowComplete) {
      completed.push(rowToQuest({ ...row, current_value: newValue, is_completed: true }));
      totalGold += row.reward_gold;
      totalXp += row.reward_xp;
    }
  }

  // Grant rewards
  if (totalGold > 0 || totalXp > 0) {
    if (totalGold > 0) {
      await AuthService.addCurrency(playerId, { gold: totalGold });
    }
    if (totalXp > 0) {
      await AuthService.addXp(playerId, totalXp);
    }
  }

  return { completed, rewards: { gold: totalGold, xp: totalXp } };
}

export async function claimFirstWinBonus(playerId: string): Promise<{ gold: number; xp: number } | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already claimed today
  const existing = await query(
    `SELECT id FROM analytics_events
     WHERE player_id = $1 AND event_type = 'first_win_claimed'
     AND server_timestamp >= $2`,
    [playerId, today]
  );

  if (existing.rows.length > 0) return null;

  // Record the claim
  await query(
    `INSERT INTO analytics_events (player_id, event_type, event_data, server_timestamp)
     VALUES ($1, 'first_win_claimed', '{}', NOW())`,
    [playerId]
  );

  await AuthService.addCurrency(playerId, { gold: FIRST_WIN_GOLD });
  await AuthService.addXp(playerId, FIRST_WIN_XP);

  return { gold: FIRST_WIN_GOLD, xp: FIRST_WIN_XP };
}

export async function getLoginStreakRewards(playerId: string): Promise<{
  currentStreak: number;
  nextMilestone: number | null;
  claimableReward: { gold: number; xp: number } | null;
}> {
  const result = await query(
    'SELECT current_streak FROM login_streaks WHERE player_id = $1',
    [playerId]
  );

  if (result.rows.length === 0) {
    return { currentStreak: 0, nextMilestone: 3, claimableReward: null };
  }

  const streak = result.rows[0].current_streak;
  const milestones = Object.keys(LOGIN_STREAK_REWARDS).map(Number).sort((a, b) => a - b);

  // Find claimable reward (exact milestone match)
  const claimableReward = LOGIN_STREAK_REWARDS[streak] || null;

  // Find next milestone
  const nextMilestone = milestones.find(m => m > streak) || null;

  return { currentStreak: streak, nextMilestone, claimableReward };
}

export async function claimLoginStreakReward(playerId: string): Promise<{ gold: number; xp: number }> {
  const { claimableReward } = await getLoginStreakRewards(playerId);
  if (!claimableReward) {
    throw new Error('No login streak reward available');
  }

  await AuthService.addCurrency(playerId, { gold: claimableReward.gold });
  await AuthService.addXp(playerId, claimableReward.xp);

  return claimableReward;
}

function mapEventToQuestTypes(eventType: string, metadata?: { race?: string }): string[] {
  switch (eventType) {
    case 'game_win': return ['win_games', 'win_ranked'];
    case 'card_played': return ['play_cards'];
    case 'damage_dealt': return ['deal_damage'];
    case 'minion_killed': return ['kill_minions'];
    case 'game_played': return metadata?.race ? ['play_race'] : [];
    case 'keyword_triggered': return ['use_keywords'];
    case 'hero_power_used': return ['use_hero_power'];
    case 'spell_cast': return ['play_spells'];
    case 'starforge_activated': return ['starforge'];
    default: return [];
  }
}

function rowToQuest(row: any): Quest {
  return {
    id: row.id,
    questType: row.quest_type,
    questDescription: row.quest_description,
    targetValue: row.target_value,
    currentValue: row.current_value,
    rewardGold: row.reward_gold,
    rewardXp: row.reward_xp,
    isCompleted: row.is_completed,
    canReroll: row.can_reroll,
    assignedAt: row.assigned_at,
  };
}

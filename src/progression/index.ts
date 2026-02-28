/**
 * STARFORGE TCG - Progression Module Index
 */

export {
  type DailyQuest,
  type QuestType,
  type DailyState,
  loadDailyState,
  saveDailyState,
  claimLoginReward,
  claimQuestReward,
  updateQuestProgress,
  addGold,
  spendGold,
} from './DailyQuests';

export {
  type Achievement,
  type AchievementCategory,
  type AchievementState,
  loadAchievements,
  saveAchievements,
  updateAchievement,
  incrementAchievement,
  claimAchievementReward,
  getAchievementsByCategory,
} from './Achievements';

export {
  type PackType,
  type PackCard,
  type PackResult,
  type PackState,
  PACK_TYPES,
  loadPackState,
  savePackState,
  openPack,
} from './CardPacks';

export {
  type CraftingState,
  DUST_VALUES,
  loadCraftingState,
  saveCraftingState,
  getOwnedCount,
  craftCard,
  disenchantCard,
  addCardsToCollection,
  getAllCollectibleCards,
  disenchantExtras,
} from './CraftingSystem';

export {
  type BattlePassState,
  type BattlePassReward,
  type BattlePassRewardType,
  type BattlePassTier,
  type SeasonSummary,
  BATTLE_PASS_TIERS,
  XP_REWARDS,
  loadBattlePass,
  saveBattlePass,
  addXP,
  claimFreeReward,
  claimPremiumReward,
  upgradeToPremium,
  getLevelProgress,
  getDaysRemaining,
} from './BattlePass';

export {
  type TournamentTier,
  type TournamentConfig,
  type BracketSlot,
  type BracketMatch,
  type TournamentRun,
  type TournamentHistory,
  type TournamentState,
  TOURNAMENT_CONFIGS,
  loadTournamentState,
  saveTournamentState,
  startTournament,
  recordTournamentMatch,
  getCurrentOpponent,
  getCurrentDifficulty,
  forfeitTournament,
  getRoundLabel,
} from './TournamentMode';

export {
  type ReplayAction,
  type GameReplay,
  type ReplayState,
  ReplayRecorder,
  loadReplayState,
  saveReplayState,
  toggleBookmark,
  renameReplay,
  deleteReplay,
  getReplaysByMode,
  getReplayStats,
  formatDuration,
} from './ReplaySystem';

export {
  type RewardCategory,
  type SeasonalReward,
  type ClaimedReward,
  type SeasonalRewardsState,
  RANK_REWARDS,
  loadSeasonalRewards,
  saveSeasonalRewards,
  getUnlockedRewards,
  processSeasonRewards,
  equipCardBack,
  equipTitle,
  equipBorder,
  getOwnedCardBacks,
  getOwnedTitles,
  getOwnedBorders,
  getRewardDefinition,
} from './SeasonalRewards';

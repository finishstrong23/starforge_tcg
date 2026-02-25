/**
 * STARFORGE TCG - Type Definitions Index
 *
 * Central export for all game type definitions.
 */

// Keywords - enums are values, Keyword/KeywordInstance are types
export {
  CombatKeyword,
  TriggerKeyword,
  OriginalKeyword,
  AllKeywords,
  AdaptOption,
  AllAdaptOptions,
  isCombatKeyword,
  isTriggerKeyword,
  isOriginalKeyword,
  KeywordsWithValue,
  keywordRequiresValue,
} from './Keywords';
export type { Keyword, KeywordInstance } from './Keywords';

// Cards - enums are values, interfaces are types
export {
  CardType,
  CardRarity,
  MinionTribe,
  CardZone,
  DefaultTargeting,
  getEffectiveAttack,
  getEffectiveHealth,
  hasKeyword,
  canAttack,
} from './Card';
export type {
  MinionStats,
  CardDefinition,
  CardInstance,
  StatBuff,
  Enchantment,
  CardReference,
  TargetRequirements,
} from './Card';

// Races
export {
  Race,
  RaceData,
  canUseCard,
  MVPRaces,
  Phase2Races,
} from './Race';
export type { RaceInfo } from './Race';

// Effects
export {
  EffectTrigger,
  EffectType,
  TargetType,
  ConditionType,
  Comparator,
  createDamageEffect,
  createHealEffect,
  createDrawEffect,
  createBuffEffect,
  createSummonEffect,
} from './Effects';
export type {
  Effect,
  TargetFilter,
  EffectCondition,
  EffectData,
  DamageEffectData,
  HealEffectData,
  BuffEffectData,
  DrawEffectData,
  SummonEffectData,
  GrantKeywordData,
  GainCrystalsData,
  DiscoverData,
  TransformData,
  AdaptData,
  ScryData,
  ModifyCostData,
  GenericEffectData,
  ResolvedEffect,
} from './Effects';

// STARFORGE
export {
  StarforgeType,
  StarforgeConditionType,
  checkStarforgeReady,
  updateStarforgeProgress,
  createStarforgeTracker,
  ExampleStarforgeCards,
} from './Starforge';
export type {
  StarforgeCondition,
  StarforgeDefinition,
  ForgedCardStats,
  StarforgeTracker,
} from './Starforge';

// Player
export {
  DefaultDeckRules,
  HandSizeLimit,
  BoardSizeLimit,
  StartingHealth,
  StartingHandSize,
  StartingHandSizeSecond,
  createInitialPlayerState,
  canAffordCard,
  hasBoardSpace,
  getBoardCount,
  isPlayerDead,
  getAvailableBoardPosition,
  canUseHeroPower,
} from './Player';
export type {
  HeroPower,
  HeroDefinition,
  HeroState,
  CrystalState,
  PlayerState,
  DeckRules,
} from './Player';

// Game
export {
  GamePhase,
  GameStatus,
  ActionType,
  ChoiceType,
  GameMode,
  DefaultGameConfig,
  createInitialGameState,
  getOpponentId,
  getPlayer,
  getCard,
  isPlayerTurn,
  isGameOver,
} from './Game';
export type {
  GameAction,
  ActionData,
  PlayCardData,
  AttackData,
  HeroPowerData,
  MulliganData,
  ChooseOptionData,
  ChooseTargetData,
  ActivateStarforgeData,
  UseUpgradeData,
  EmptyData,
  GameState,
  PendingChoice,
  ChoiceOption,
  GameConfig,
} from './Game';

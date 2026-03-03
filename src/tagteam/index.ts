/**
 * STARFORGE TCG - Tag Team Mode Exports
 */

export {
  type TagTeamConfig,
  type TeamSynergy,
  type TagTeamResult,
  type TagTeamSlot,
  type TagTeamLobby,
  DEFAULT_TAG_TEAM_CONFIG,
  PingType,
  PING_DATA,
  TEAM_SYNERGIES,
  AI_TEAMMATES,
  getTeamSynergy,
  createTagTeamLobby,
  getRandomAITeammate,
} from './TagTeamData';

export {
  type TagTeamMatchState,
  type TagTeamRecord,
  createTagTeamMatch,
  getCurrentPlayer,
  advanceTurn,
  applyTeamDamage,
  sendPing,
  loadTagTeamRecords,
  saveTagTeamRecord,
  getTagTeamStats,
} from './TagTeamState';

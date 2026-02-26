/**
 * STARFORGE TCG - Campaign Module
 */

export { STARTER_PLANETS, CAMPAIGN_ORDER, PLANET_ENCOUNTERS, getCampaignEncounters, STARTER_DESCRIPTIONS } from './CampaignData';
export type { PlanetEncounter } from './CampaignData';

export {
  createNewCampaign,
  loadCampaign,
  saveCampaign,
  deleteCampaign,
  recordBattleResult,
  getNextEncounter,
  isCampaignComplete,
  getCampaignProgress,
} from './CampaignState';
export type { CampaignSave, PlanetStats } from './CampaignState';

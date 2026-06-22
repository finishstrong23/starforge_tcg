import type { Faction } from '../types';

export const MVP_FACTION: Faction = 'Pyroclast';

export const MVP_VISIBLE_FACTIONS: Faction[] = [MVP_FACTION];

export const MVP_MODE = {
  enabled: true,
  title: 'Pyroclast MVP',
  setupSubtitle: 'Build Heat, Vent it often, keep momentum',
  hiddenFactionCopy: 'Other factions return after Pyroclast is fully tuned.',
} as const;

export function isMvpFaction(faction: Faction): boolean {
  return MVP_VISIBLE_FACTIONS.includes(faction);
}

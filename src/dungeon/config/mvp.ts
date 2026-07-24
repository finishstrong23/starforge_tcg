import type { Faction } from '../types';

/** Default faction pre-selected in the run-setup picker. */
export const MVP_FACTION: Faction = 'Pyroclast';

/**
 * Factions selectable at run setup. Re-locked to Pyroclast (2026-07-24):
 * the MVP ships one deeply tuned faction — heat-first card pool, StS-hard
 * enemies. The other three factions' content and engine tests stay live in
 * the repo; unlock by growing this list, everything else keys off it.
 */
export const MVP_VISIBLE_FACTIONS: Faction[] = ['Pyroclast'];

export const MVP_MODE = {
  enabled: true,
  title: 'Pyroclast Trials',
  setupSubtitle: 'Master the Heat engine. Survive the Shattered Reach.',
  hiddenFactionCopy: 'Cogsmiths, Luminar, and Warp Riders return in a later update.',
} as const;

export function isMvpFaction(faction: Faction): boolean {
  return MVP_VISIBLE_FACTIONS.includes(faction);
}

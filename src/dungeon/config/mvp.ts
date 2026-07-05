import type { Faction } from '../types';

/** Default faction pre-selected in the run-setup picker. */
export const MVP_FACTION: Faction = 'Pyroclast';

/**
 * Factions selectable at run setup. All four core factions are live.
 * (The 2026-06-22 single-faction MVP lock was a deliberate tuning-focus
 * decision — reversed for the Shattered Reach MVP, whose definition of done
 * requires a draftable pool from all four factions. Re-lock by shrinking
 * this list; everything else keys off it.)
 */
export const MVP_VISIBLE_FACTIONS: Faction[] = ['Pyroclast', 'Cogsmiths', 'Luminar', 'WarpRiders'];

export const MVP_MODE = {
  enabled: false,
  title: 'Choose Your Faction',
  setupSubtitle: 'Four factions, four ways through the Shattered Reach',
  hiddenFactionCopy: '',
} as const;

export function isMvpFaction(faction: Faction): boolean {
  return MVP_VISIBLE_FACTIONS.includes(faction);
}

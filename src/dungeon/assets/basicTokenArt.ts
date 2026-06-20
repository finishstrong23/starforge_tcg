import type { Faction } from '../types';
import { factionArt, getFactionArt, getSceneArt, sceneArt } from './artRegistry';

export const FACTION_TOKEN_ART: Record<Faction, string> = factionArt;

export const DUNGEON_SCENE_ART = {
  combat: sceneArt.combat,
  shop: sceneArt.shop,
  rest: sceneArt.rest,
  boss: sceneArt.boss,
  draft: sceneArt.draft,
  reward: sceneArt.reward,
  blessing: sceneArt.blessing,
  event: sceneArt.event,
  victory: sceneArt.victory,
  defeat: sceneArt.defeat,
} as const;

export type DungeonSceneArt = keyof typeof DUNGEON_SCENE_ART;

export function getFactionTokenArt(faction: Faction): string {
  return getFactionArt(faction);
}

export function getDungeonSceneArt(scene: DungeonSceneArt): string {
  return getSceneArt(scene);
}

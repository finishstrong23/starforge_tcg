import type { Faction } from '../types';

const artPath = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

export const FACTION_TOKEN_ART: Record<Faction, string> = {
  Pyroclast: artPath('art/dungeon/factions/pyroclast.png'),
  Cogsmiths: artPath('art/dungeon/factions/cogsmiths.png'),
  Luminar: artPath('art/dungeon/factions/luminar.png'),
  WarpRiders: artPath('art/dungeon/factions/warpriders.png'),
};

export const DUNGEON_SCENE_ART = {
  combat: artPath('art/dungeon/backgrounds/combat.png'),
  shop: artPath('art/dungeon/backgrounds/shop.png'),
  rest: artPath('art/dungeon/backgrounds/rest.png'),
  boss: artPath('art/dungeon/backgrounds/boss.png'),
} as const;

export type DungeonSceneArt = keyof typeof DUNGEON_SCENE_ART;

export function getFactionTokenArt(faction: Faction): string {
  return FACTION_TOKEN_ART[faction];
}

export function getDungeonSceneArt(scene: DungeonSceneArt): string {
  return DUNGEON_SCENE_ART[scene];
}

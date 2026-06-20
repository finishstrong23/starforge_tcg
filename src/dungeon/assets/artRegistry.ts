import type { Faction, IntentType, NodeType, StatusEffectType } from '../types';

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

export const factionArt: Record<Faction, string> = {
  Pyroclast: assetUrl('art/dungeon/factions/pyroclast.png'),
  Cogsmiths: assetUrl('art/dungeon/factions/cogsmiths.png'),
  Luminar: assetUrl('art/dungeon/factions/luminar.png'),
  WarpRiders: assetUrl('art/dungeon/factions/warpriders.png'),
};

export const sceneArt = {
  combat: assetUrl('art/dungeon/backgrounds/combat.png'),
  shop: assetUrl('art/dungeon/backgrounds/shop.png'),
  rest: assetUrl('art/dungeon/backgrounds/rest.png'),
  boss: assetUrl('art/dungeon/backgrounds/boss.png'),
  draft: assetUrl('art/dungeon/backgrounds/draft.png'),
  reward: assetUrl('art/dungeon/backgrounds/reward.png'),
  blessing: assetUrl('art/dungeon/backgrounds/blessing.png'),
  event: assetUrl('art/dungeon/backgrounds/event.png'),
  victory: assetUrl('art/dungeon/backgrounds/victory.png'),
  defeat: assetUrl('art/dungeon/backgrounds/defeat.png'),
} as const;

export type SceneArtId = keyof typeof sceneArt;

export const mapNodeArt: Record<NodeType, string> = {
  combat: assetUrl('art/dungeon/map/combat.svg'),
  elite: assetUrl('art/dungeon/map/elite.svg'),
  boss: assetUrl('art/dungeon/map/boss.svg'),
  rest: assetUrl('art/dungeon/map/rest.svg'),
  shop: assetUrl('art/dungeon/map/shop.svg'),
  treasure: assetUrl('art/dungeon/map/treasure.svg'),
  event: assetUrl('art/dungeon/map/event.svg'),
};

export const intentArt: Record<IntentType, string> = {
  attack: assetUrl('art/dungeon/ui/intent_attack.png'),
  defend: assetUrl('art/dungeon/ui/intent_defend.png'),
  buff: assetUrl('art/dungeon/ui/intent_buff.png'),
  debuff: assetUrl('art/dungeon/ui/intent_debuff.png'),
  summon: assetUrl('art/dungeon/ui/intent_summon.png'),
  special: assetUrl('art/dungeon/ui/intent_special.png'),
};

export const statusArt: Partial<Record<StatusEffectType, string>> = {
  burn: assetUrl('art/dungeon/status/burn.png'),
  poison: assetUrl('art/dungeon/status/poison.png'),
  shield: assetUrl('art/dungeon/status/shield.png'),
  strength: assetUrl('art/dungeon/status/strength.png'),
  weak: assetUrl('art/dungeon/status/weak.png'),
  vulnerable: assetUrl('art/dungeon/status/vulnerable.png'),
  barrier: assetUrl('art/dungeon/status/barrier.png'),
  stealth: assetUrl('art/dungeon/status/stealth.png'),
  phase: assetUrl('art/dungeon/status/phase.png'),
};

export const uiArt = {
  cardBack: assetUrl('art/dungeon/ui/card_back.png'),
  drawPile: assetUrl('art/dungeon/ui/draw_pile.png'),
  discardPile: assetUrl('art/dungeon/ui/discard_pile.png'),
  gold: assetUrl('art/dungeon/ui/gold.png'),
  cardRemoval: assetUrl('art/dungeon/ui/card_removal.png'),
} as const;

export function getFactionArt(faction: Faction): string {
  return factionArt[faction];
}

export function getSceneArt(scene: SceneArtId): string {
  return sceneArt[scene];
}

export function getMapNodeArt(type: NodeType): string {
  return mapNodeArt[type];
}

export function getEnemyArt(enemyId: string, isBoss = false): string {
  return assetUrl(`art/dungeon/${isBoss ? 'bosses' : 'enemies'}/${enemyId}.svg`);
}

export function getRelicArt(relicId: string): string {
  return assetUrl(`art/dungeon/relics/${relicId}.svg`);
}

export function getPotionArt(potionId: string): string {
  return assetUrl(`art/dungeon/potions/${potionId}.svg`);
}

export function getCardArt(cardId: string): string {
  return assetUrl(`cards/${cardId}.svg`);
}

export function getIntentArt(intent: IntentType): string {
  return intentArt[intent];
}

export function getStatusArt(status: StatusEffectType | string): string | undefined {
  return statusArt[status as StatusEffectType];
}

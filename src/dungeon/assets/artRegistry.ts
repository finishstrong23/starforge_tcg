import type { Faction, IntentType, NodeType, PotionCategory, StatusEffectType } from '../types';

const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

export const factionArt: Record<Faction, string> = {
  Pyroclast: assetUrl('art/dungeon/factions/pyroclast.png'),
  Cogsmiths: assetUrl('art/dungeon/factions/cogsmiths.png'),
  Luminar: assetUrl('art/dungeon/factions/luminar.png'),
  WarpRiders: assetUrl('art/dungeon/factions/warpriders.png'),
};

export const factionResourceArt: Record<Faction, string> = {
  Pyroclast: assetUrl('art/dungeon/ui/resource_pyroclast.svg'),
  Cogsmiths: assetUrl('art/dungeon/ui/resource_cogsmiths.svg'),
  Luminar: assetUrl('art/dungeon/ui/resource_luminar.svg'),
  WarpRiders: assetUrl('art/dungeon/ui/resource_warpriders.svg'),
};

export const sceneArt = {
  combat: assetUrl('art/dungeon/backgrounds/combat.png'),
  shop: assetUrl('art/dungeon/backgrounds/shop.png'),
  rest: assetUrl('art/dungeon/backgrounds/rest.png'),
  boss: assetUrl('art/dungeon/backgrounds/boss.png'),
  draft: assetUrl('art/dungeon/backgrounds/draft.svg'),
  reward: assetUrl('art/dungeon/backgrounds/reward.svg'),
  blessing: assetUrl('art/dungeon/backgrounds/blessing.svg'),
  event: assetUrl('art/dungeon/backgrounds/event.svg'),
  victory: assetUrl('art/dungeon/backgrounds/victory.svg'),
  defeat: assetUrl('art/dungeon/backgrounds/defeat.svg'),
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
  attack: assetUrl('art/dungeon/ui/intent_attack.svg'),
  defend: assetUrl('art/dungeon/ui/intent_defend.svg'),
  buff: assetUrl('art/dungeon/ui/intent_buff.svg'),
  debuff: assetUrl('art/dungeon/ui/intent_debuff.svg'),
  summon: assetUrl('art/dungeon/ui/intent_summon.svg'),
  special: assetUrl('art/dungeon/ui/intent_special.svg'),
};

export const statusArt: Partial<Record<StatusEffectType, string>> = {
  burn: assetUrl('art/dungeon/status/burn.svg'),
  poison: assetUrl('art/dungeon/status/poison.svg'),
  shield: assetUrl('art/dungeon/status/shield.svg'),
  strength: assetUrl('art/dungeon/status/strength.svg'),
  weak: assetUrl('art/dungeon/status/weak.svg'),
  vulnerable: assetUrl('art/dungeon/status/vulnerable.svg'),
  barrier: assetUrl('art/dungeon/status/barrier.svg'),
  stealth: assetUrl('art/dungeon/status/stealth.svg'),
  phase: assetUrl('art/dungeon/status/phase.svg'),
};

export const uiArt = {
  cardBack: assetUrl('art/dungeon/ui/card_back.svg'),
  drawPile: assetUrl('art/dungeon/ui/draw_pile.svg'),
  discardPile: assetUrl('art/dungeon/ui/discard_pile.svg'),
  gold: assetUrl('art/dungeon/ui/gold.svg'),
  cardRemoval: assetUrl('art/dungeon/ui/card_removal.svg'),
  tutorialEnergy: assetUrl('art/dungeon/ui/tutorial_energy.svg'),
  tutorialRelics: assetUrl('art/dungeon/ui/tutorial_relics.svg'),
  tutorialMap: assetUrl('art/dungeon/ui/tutorial_map.svg'),
} as const;

export const potionEffectArt: Record<PotionCategory | 'Phoenix', string> = {
  Defense: assetUrl('art/dungeon/potions/effects/defense.svg'),
  Tempo: assetUrl('art/dungeon/potions/effects/tempo.svg'),
  Damage: assetUrl('art/dungeon/potions/effects/damage.svg'),
  Buff: assetUrl('art/dungeon/potions/effects/buff.svg'),
  Debuff: assetUrl('art/dungeon/potions/effects/debuff.svg'),
  Utility: assetUrl('art/dungeon/potions/effects/utility.svg'),
  Recovery: assetUrl('art/dungeon/potions/effects/recovery.svg'),
  Extreme: assetUrl('art/dungeon/potions/effects/extreme.svg'),
  Phoenix: assetUrl('art/dungeon/potions/effects/phoenix.svg'),
};

export function getFactionArt(faction: Faction): string {
  return factionArt[faction];
}

export function getFactionResourceArt(faction: Faction): string {
  return factionResourceArt[faction];
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

export function getPotionEffectArt(category: PotionCategory | 'Phoenix'): string {
  return potionEffectArt[category];
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

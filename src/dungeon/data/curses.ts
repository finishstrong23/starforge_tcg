import type { CardDefinition, Faction } from '../types';
import { createCardInstance } from '../engine/draft';

export interface CurseDefinition {
  id: string;
  name: string;
  cardText: string;
}

export const CURSE_POOL: CurseDefinition[] = [
  {
    id: 'void_debt',
    name: 'Void Debt',
    cardText: 'Unplayable. A dead draw until removed.',
  },
  {
    id: 'glass_splinter',
    name: 'Glass Splinter',
    cardText: 'Unplayable. A shard of bad luck lodged in the deck.',
  },
];

export function getCurseDef(curseId: string): CurseDefinition | undefined {
  return CURSE_POOL.find((curse) => curse.id === curseId);
}

export function createCurseInstance(curseId: string, faction: Faction) {
  const curse = getCurseDef(curseId);
  if (!curse) return undefined;

  const card: CardDefinition = {
    id: `CURSE-${curse.id}`,
    name: curse.name,
    faction,
    type: 'Curse',
    cost: 99,
    keywords: [],
    cardText: curse.cardText,
    rarity: 'Common',
    complexityTier: 1,
  };

  return createCardInstance(card);
}

import type { CardDefinition, Faction, Rarity } from '../types';

export const CARD_POOL: CardDefinition[] = [];

export const getCardsByFaction = (faction: Faction): CardDefinition[] =>
  CARD_POOL.filter((c) => c.faction === faction);

export const getCardsByRarity = (rarity: Rarity): CardDefinition[] =>
  CARD_POOL.filter((c) => c.rarity === rarity);

import type { FactionId } from './card';

export interface StarterDeckCard {
  cardId: string;
  count: number;
}

export interface StarterDeck {
  factionId: FactionId;
  characterName: string;
  cards: StarterDeckCard[];
  signatureCardId: string;  // Id of the 1-of Special power card unique to this character
}

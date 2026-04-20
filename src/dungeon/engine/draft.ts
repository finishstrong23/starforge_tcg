import type { CardDefinition, CardInstance } from '../types';

export function generateDraftOptions(_round: number, _existingDeck: CardInstance[]): CardDefinition[] {
  return [];
}

export function getStarterCards(_chosenCards: CardInstance[]): CardInstance[] {
  return [];
}

export function createCardInstance(_def: CardDefinition): CardInstance {
  throw new Error('createCardInstance not implemented');
}

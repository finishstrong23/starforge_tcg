/**
 * STARFORGE TCG - Deck Code Import/Export
 *
 * Encodes deck card IDs into a compact shareable string and decodes back.
 * Format: base64-encoded JSON of card ID array, prefixed with "SF1-".
 */

import { globalCardDatabase } from '../cards/CardDatabase';

const DECK_CODE_PREFIX = 'SF1-';

/**
 * Encode a deck (array of card IDs) into a shareable code string.
 */
export function encodeDeck(cardIds: string[]): string {
  const json = JSON.stringify(cardIds);
  const encoded = btoa(json);
  return DECK_CODE_PREFIX + encoded;
}

/**
 * Decode a deck code string back into an array of card IDs.
 * Returns null if the code is invalid.
 */
export function decodeDeck(code: string): string[] | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(DECK_CODE_PREFIX)) return null;

    const encoded = trimmed.slice(DECK_CODE_PREFIX.length);
    const json = atob(encoded);
    const cardIds = JSON.parse(json);

    if (!Array.isArray(cardIds)) return null;
    if (!cardIds.every((id: unknown) => typeof id === 'string')) return null;

    // Validate all card IDs exist
    for (const id of cardIds) {
      if (!globalCardDatabase.getCard(id)) return null;
    }

    return cardIds;
  } catch {
    return null;
  }
}

/**
 * Validate a deck code without fully decoding.
 */
export function isValidDeckCode(code: string): boolean {
  return decodeDeck(code) !== null;
}

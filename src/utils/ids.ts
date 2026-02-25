/**
 * STARFORGE TCG - ID Generation Utilities
 *
 * Functions for generating unique identifiers for games, cards, and effects.
 */

/**
 * Counter for generating sequential IDs within a session
 */
let idCounter = 0;

/**
 * Generate a unique ID with optional prefix
 * @param prefix Optional prefix for the ID
 * @returns Unique string ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const counter = (idCounter++).toString(36);
  return prefix ? `${prefix}_${timestamp}${random}${counter}` : `${timestamp}${random}${counter}`;
}

/**
 * Generate a game ID
 * Format: game_<timestamp>_<random>
 */
export function generateGameId(): string {
  return generateId('game');
}

/**
 * Generate a card instance ID
 * Format: card_<timestamp>_<random>
 */
export function generateCardInstanceId(): string {
  return generateId('card');
}

/**
 * Generate an effect instance ID
 * Format: effect_<timestamp>_<random>
 */
export function generateEffectId(): string {
  return generateId('effect');
}

/**
 * Generate a player ID
 * Format: player_<timestamp>_<random>
 */
export function generatePlayerId(): string {
  return generateId('player');
}

/**
 * Generate a buff ID
 * Format: buff_<timestamp>_<random>
 */
export function generateBuffId(): string {
  return generateId('buff');
}

/**
 * Generate a short ID (8 characters)
 * Useful for display purposes
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Check if a string is a valid STARFORGE ID format
 */
export function isValidId(id: string): boolean {
  // Must be a non-empty string
  if (!id || typeof id !== 'string') return false;
  // Must contain only alphanumeric characters and underscores
  return /^[a-zA-Z0-9_]+$/.test(id);
}

/**
 * Extract the prefix from an ID
 * @param id The full ID
 * @returns The prefix or empty string if no prefix
 */
export function getIdPrefix(id: string): string {
  const underscoreIndex = id.indexOf('_');
  return underscoreIndex > 0 ? id.substring(0, underscoreIndex) : '';
}

/**
 * Check if an ID has a specific prefix
 */
export function hasPrefix(id: string, prefix: string): boolean {
  return id.startsWith(`${prefix}_`);
}

/**
 * Reset the ID counter (useful for testing)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

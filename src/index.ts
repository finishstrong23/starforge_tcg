/**
 * STARFORGE — public entry.
 *
 * Dungeon-run-only build. The 1v1 engine and its quick-start helpers
 * (initializeSampleDatabase, createSampleDeck, quickStartGame, etc.)
 * were removed during the launch pivot. The dungeon mode is the entire
 * game; consume it via:
 *
 *   import { DungeonRoot } from './dungeon';
 */

export const VERSION = '0.1.0';
export const GAME_NAME = 'STARFORGE Dungeon Run';

export { DungeonRoot } from './dungeon';

console.log(`${GAME_NAME} v${VERSION} loaded`);

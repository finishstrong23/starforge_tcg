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

import { DUNGEON_BUILD_NAME, DUNGEON_BUILD_VERSION } from './dungeon/engine/buildInfo';

export const VERSION = DUNGEON_BUILD_VERSION;
export const GAME_NAME = DUNGEON_BUILD_NAME;

export { DungeonRoot } from './dungeon';

console.log(`${GAME_NAME} v${VERSION} loaded`);

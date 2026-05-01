/**
 * STARFORGE — UI components barrel export.
 *
 * Dungeon-run-only build. Only the components actually used by the dungeon
 * tree (or rendered globally like ErrorBoundary / SpaceBackground / Logo)
 * are re-exported here. Legacy 1v1 components (GameBoard, Card,
 * HeroPortrait, CrystalBar, etc.) were removed during the launch pivot.
 */

export { ErrorBoundary } from './ErrorBoundary';
export { StarforgeLogo } from './StarforgeLogo';
export { SpaceBackground } from './SpaceBackground';

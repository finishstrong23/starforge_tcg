/**
 * STARFORGE — App entry.
 *
 * Dungeon-run mode only. No menu screen — the app opens straight into the
 * dungeon's faction-select / draft / map / combat flow. The "Abandon Run"
 * button inside the dungeon takes the player back to a fresh faction
 * selection (handled inside DungeonRoot itself).
 */

import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DungeonRoot } from '../dungeon';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      {/* onBack is intentionally a no-op: there is no "back" — only a
          new run. DungeonRoot's "Abandon Run" already wipes state and
          shows faction-select again. */}
      <DungeonRoot onBack={() => { /* no-op */ }} />
    </ErrorBoundary>
  );
};

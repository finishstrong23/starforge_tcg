/**
 * STARFORGE — App entry.
 *
 * Dungeon-run mode only. No menu screen — the app opens straight into the
 * dungeon's faction-select / draft / map / combat flow. The "Abandon Run"
 * button inside the dungeon takes the player back to a fresh faction
 * selection (handled inside DungeonRoot itself).
 */

import React, { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DungeonRoot } from '../dungeon';
import { TelemetryDebugPanel } from '../dungeon/components/TelemetryDebugPanel';
import { logEvent } from '../dungeon/engine/telemetry';

export const App: React.FC = () => {
  // Emit one session_start per tab. (The session id is stable for the life
  // of the tab so server-side aggregation can group events by session.)
  useEffect(() => {
    logEvent('session_start', {
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });
  }, []);

  return (
    <ErrorBoundary>
      {/* "Start New Run" reloads the page so we get a fresh DungeonRunProvider
          state — simpler and more reliable than a soft-reset reducer action. */}
      <DungeonRoot onBack={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }} />
      <TelemetryDebugPanel />
    </ErrorBoundary>
  );
};

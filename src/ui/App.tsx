/**
 * STARFORGE — App entry.
 *
 * Dungeon-run mode only. No menu screen — the app opens straight into the
 * dungeon's faction-select / draft / map / combat flow. The in-run Menu
 * can quit the active run and return to fresh faction selection.
 */

import React, { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DungeonRoot } from '../dungeon';
import { TelemetryDebugPanel } from '../dungeon/components/TelemetryDebugPanel';
import { TelemetrySettingsPanel } from '../dungeon/components/TelemetrySettingsPanel';
import { logEvent } from '../dungeon/engine/telemetry';
import { clearDungeonSave } from '../dungeon/context/DungeonRunContext';

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
      <div className="starforge-app-shell">
        {/* "Start New Run" clears the saved run, then reloads. The reload
            gives us a fresh DungeonRunProvider state (cleaner than wiring
            a soft-reset reducer action just for one entry point). */}
        <DungeonRoot onBack={() => {
          clearDungeonSave();
          if (typeof window !== 'undefined') window.location.reload();
        }} />
        <TelemetrySettingsPanel />
        <TelemetryDebugPanel />
      </div>
    </ErrorBoundary>
  );
};

/**
 * Hidden telemetry debug panel.
 *
 * Shown only when the URL contains `?debug=1`. Lets the user view a
 * summary of logged events, copy the full buffer as JSON, and clear it.
 * Useful for closed-beta testing where players can paste their session
 * log into Discord without us needing a backend.
 */

import React, { useState } from 'react';
import { clearEvents, exportAsJSON, summarize, type TelemetryEventType } from '../engine/telemetry';

const DEBUG_FLAG_RE = /[?&]debug=1\b/;

function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return DEBUG_FLAG_RE.test(window.location.search);
}

export const TelemetryDebugPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  if (!isDebugMode()) return null;

  const counts = summarize();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportAsJSON());
      alert('Telemetry JSON copied to clipboard.');
    } catch {
      // Fallback: show the JSON in a prompt.
      window.prompt('Copy the telemetry JSON:', exportAsJSON());
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear all logged telemetry events? This cannot be undone.')) {
      clearEvents();
      force((n) => n + 1);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Telemetry (debug)"
        style={{
          position: 'fixed',
          right: 8,
          bottom: 8,
          zIndex: 999,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid #c89b3c',
          background: '#0a0a14',
          color: '#c89b3c',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 0 12px #c89b3c44',
        }}
      >
        📊
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 12,
            bottom: 56,
            width: 320,
            maxHeight: 460,
            zIndex: 999,
            padding: '12px 14px',
            background: '#0a0a14',
            border: '1px solid #2a2a4a',
            borderRadius: 8,
            color: '#ddd',
            fontSize: 11,
            boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#c89b3c',
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            Telemetry · {total} events
          </div>
          {total === 0 && (
            <div style={{ color: '#666', fontStyle: 'italic', marginBottom: 8 }}>
              No events logged yet.
            </div>
          )}
          {(Object.keys(counts) as TelemetryEventType[]).sort().map((k) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '2px 0',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <span style={{ color: '#aaa' }}>{k}</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>{counts[k]}</span>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: '#1a3050',
                border: '1px solid #4aa8e0',
                color: '#4aa8e0',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid #553030',
                color: '#cc6666',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import {
  getTelemetrySettings,
  setRemoteTelemetryEnabled,
} from '../engine/telemetry';

export const TelemetrySettingsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => getTelemetrySettings());

  const handleRemoteChange = (enabled: boolean) => {
    setSettings(setRemoteTelemetryEnabled(enabled));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="Privacy settings"
        style={{
          position: 'fixed',
          left: 8,
          bottom: 8,
          zIndex: 998,
          padding: '7px 10px',
          borderRadius: 6,
          border: '1px solid #2b6f99',
          background: '#081018',
          color: '#8fd5ff',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 0 12px rgba(43,111,153,0.35)',
        }}
      >
        Privacy
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            bottom: 48,
            width: 300,
            zIndex: 998,
            padding: '12px 14px',
            background: '#0a0a14',
            border: '1px solid #2a2a4a',
            borderRadius: 8,
            color: '#ddd',
            fontSize: 11,
            boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
          }}
        >
          <div
            style={{
              fontSize: 9,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#8fd5ff',
              opacity: 0.8,
              marginBottom: 10,
            }}
          >
            Telemetry
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
          >
            <input
              type="checkbox"
              checked={settings.remoteEnabled}
              onChange={(event) => handleRemoteChange(event.currentTarget.checked)}
            />
            <span>Send remote playtest events</span>
          </label>

          <div style={{ marginTop: 8, color: '#8aa0b8', lineHeight: 1.45 }}>
            Local event history remains on this device for feedback export.
          </div>
        </div>
      )}
    </>
  );
};

/**
 * STARFORGE — UI entry point.
 *
 * Web-only build. Capacitor mobile shell was removed during the
 * dungeon-only pivot — if mobile shipping comes back, reintroduce
 * `initCapacitor()` here behind a build-time flag.
 *
 * Telemetry: in production, telemetry events POST to /api/event
 * (Vercel Function). In dev they stay localStorage-only so we don't
 * spam the dev environment.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { setTelemetryEndpoint } from '../dungeon/engine/telemetry';

if (import.meta.env.PROD) {
  setTelemetryEndpoint('/api/event');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

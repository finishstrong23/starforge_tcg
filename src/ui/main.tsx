/**
 * STARFORGE — UI entry point.
 *
 * Web-only build. Capacitor mobile shell was removed during the
 * dungeon-only pivot — if mobile shipping comes back, reintroduce
 * `initCapacitor()` here behind a build-time flag.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

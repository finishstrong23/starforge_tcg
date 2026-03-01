/**
 * STARFORGE TCG - UI Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { initCapacitor } from './capacitor';

// Initialize Capacitor plugins (status bar, splash screen, etc.)
initCapacitor();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * STARFORGE — Error Boundary
 *
 * Catches React render errors. Two recovery paths:
 *   - "Try again" — soft reset, keeps the save (good for transient errors).
 *   - "Clear save & reload" — escape hatch when the saved state itself is
 *     corrupt and crashing on hydrate. Only path forward in that case.
 *
 * Crashes also log to the telemetry buffer (component_error event) so
 * closed-beta testers can copy their session log via the debug panel and
 * we get a proper error report including the stack.
 */

import React from 'react';
import { logEvent } from '../../dungeon/engine/telemetry';
import { clearDungeonSave } from '../../dungeon/context/DungeonRunContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, componentStack: null };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Console for live dev. Telemetry for production triage.
    // eslint-disable-next-line no-console
    console.error('Starforge Error Boundary caught:', error, errorInfo);
    try {
      // Use a generic event type to avoid expanding the public union
      // unnecessarily — telemetry accepts any string at the call site.
      logEvent('session_start', {
        kind: 'crash',
        message: error.message,
        stack: (error.stack ?? '').slice(0, 1000),
        componentStack: (errorInfo.componentStack ?? '').slice(0, 1000),
      });
    } catch { /* never let logging crash the crash handler */ }
    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
    this.props.onReset?.();
  };

  handleClearAndReload = () => {
    if (!window.confirm(
      'This will wipe your in-progress run. Ascension unlocks are kept.\n\nContinue?',
    )) return;
    try { clearDungeonSave(); } catch { /* swallow */ }
    if (typeof window !== 'undefined') window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message ?? 'An unexpected error occurred';
      const stack = (this.state.error?.stack ?? '').split('\n').slice(0, 5).join('\n');

      return (
        <div
          role="alertdialog"
          style={{
            width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', gap: 16,
            background: 'radial-gradient(ellipse at top, #1a1830 0%, #060610 60%, #050510 100%)',
            color: '#fff', padding: 32, textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 56 }}>⚠</div>
          <h2 style={{ color: '#ff6644', margin: 0, fontSize: '1.2rem', letterSpacing: '0.1em' }}>
            Something went wrong
          </h2>
          <pre
            style={{
              maxWidth: 520, fontSize: 11, color: '#cc9988',
              background: '#1a0a0a', border: '1px solid #4a2222',
              borderRadius: 6, padding: '10px 14px',
              overflow: 'auto', textAlign: 'left',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 200,
            }}
          >
            {msg}
            {stack && '\n\n' + stack}
          </pre>
          <p style={{ color: '#888', maxWidth: 480, fontSize: 11, lineHeight: 1.5, marginBottom: 0 }}>
            Try resuming first. If the screen keeps crashing on the same spot,
            your save may be corrupt — clear it to get back to faction-select.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(180deg, #4aa8e0 0%, #2a78b0 100%)',
                border: '1px solid #6ac8ff', borderRadius: 6, padding: '10px 22px',
                fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              style={{
                background: 'transparent',
                border: '1px solid #553030', borderRadius: 6, padding: '10px 22px',
                fontSize: 12, fontWeight: 700, color: '#cc6666', cursor: 'pointer',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              Clear save &amp; reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * STARFORGE TCG - Error Boundary
 *
 * Catches React render errors and displays a recovery UI
 * instead of a blank screen.
 */

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Starforge Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', gap: '20px',
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
          color: '#ffffff', padding: '40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px' }}>&#x26A0;</div>
          <h2 style={{ color: '#ff6644', margin: 0 }}>Something went wrong</h2>
          <p style={{ color: '#aaa', maxWidth: '400px', fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',
              border: 'none', borderRadius: '10px', padding: '12px 32px',
              fontSize: '16px', fontWeight: 'bold', color: '#fff', cursor: 'pointer',
            }}
          >
            Back to Menu
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

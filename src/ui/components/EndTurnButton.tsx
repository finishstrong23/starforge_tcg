/**
 * STARFORGE TCG - End Turn Button Component
 */

import React from 'react';
import { useGame } from '../context/GameContext';

export const EndTurnButton: React.FC = () => {
  const { isPlayerTurn, endTurn } = useGame();

  return (
    <button
      style={{
        ...styles.button,
        ...(isPlayerTurn ? styles.buttonActive : styles.buttonDisabled),
      }}
      onClick={endTurn}
      disabled={!isPlayerTurn}
    >
      <div style={styles.buttonText}>
        {isPlayerTurn ? 'End Turn' : 'Enemy Turn'}
      </div>
      <div style={styles.buttonGlow} />
    </button>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  button: {
    position: 'absolute',
    right: '20px',
    bottom: '50%',
    transform: 'translateY(50%)',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  buttonActive: {
    background: 'linear-gradient(135deg, #00aa55 0%, #008844 100%)',
    boxShadow: '0 0 20px rgba(0, 170, 85, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
    border: '3px solid #00ff88',
  },
  buttonDisabled: {
    background: 'linear-gradient(135deg, #444455 0%, #333344 100%)',
    boxShadow: 'none',
    border: '3px solid #555566',
    cursor: 'not-allowed',
  },
  buttonText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    zIndex: 1,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  },
  buttonGlow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
    animation: 'rotate 4s linear infinite',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

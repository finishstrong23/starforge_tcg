/**
 * STARFORGE TCG - Game Over Overlay Component
 */

import React from 'react';

interface GameOverlayProps {
  winnerId?: string;
  onPlayAgain: () => void;
  /** If true, button says "Continue" instead of "Play Again" (for campaign) */
  isCampaign?: boolean;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({
  winnerId,
  onPlayAgain,
  isCampaign = false,
}) => {
  const isVictory = winnerId === 'player';
  const isDraw = !winnerId;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <div
          style={{
            ...styles.title,
            color: isDraw ? '#ffcc00' : isVictory ? '#00ff88' : '#ff4444',
            textShadow: isDraw
              ? '0 0 30px #ffcc00'
              : isVictory
              ? '0 0 30px #00ff88'
              : '0 0 30px #ff4444',
          }}
        >
          {isDraw ? 'DRAW!' : isVictory ? 'VICTORY!' : 'DEFEAT'}
        </div>

        <div style={styles.subtitle}>
          {isDraw
            ? 'The battle ends in a stalemate'
            : isVictory
            ? 'You have conquered your opponent!'
            : 'Your opponent has triumphed'}
        </div>

        <div style={styles.iconContainer}>
          {isDraw ? '⚖️' : isVictory ? '🏆' : '💀'}
        </div>

        <button style={styles.button} onClick={onPlayAgain}>
          {isCampaign ? 'Continue' : 'Play Again'}
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '40px 60px',
    background: 'linear-gradient(135deg, rgba(30, 30, 50, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
    borderRadius: '20px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: '64px',
    fontWeight: 'bold',
    letterSpacing: '8px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#aaaaaa',
    textAlign: 'center',
  },
  iconContainer: {
    fontSize: '80px',
    margin: '20px 0',
  },
  button: {
    background: 'linear-gradient(135deg, #00aa55 0%, #008844 100%)',
    border: '2px solid #00ff88',
    borderRadius: '10px',
    padding: '15px 50px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0, 170, 85, 0.4)',
  },
};

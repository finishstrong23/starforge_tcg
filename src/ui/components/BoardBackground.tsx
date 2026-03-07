/**
 * STARFORGE TCG - Game Board Background
 *
 * Displays board.png as the full-screen game board background
 * with a slow rotating spiral animation + subtle pulsing glow.
 */

import React from 'react';

const boardImg = 'https://raw.githubusercontent.com/finishstrong23/starforge_tcg/main/src/assets/board.png';

export const BoardBackground: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* Inject keyframes once */}
      <style>{`
        @keyframes bg-spiral-rotate {
          0% { transform: scale(1.45) rotate(0deg); }
          100% { transform: scale(1.45) rotate(360deg); }
        }
        @keyframes bg-pulse {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.25; }
        }
      `}</style>
      <img src={boardImg} alt="" style={styles.image} />
      {/* Pulsing overlay for depth effect */}
      <div style={styles.pulseOverlay} />
      {/* Vignette for cleaner edges */}
      <div style={styles.vignette} />
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    animation: 'bg-spiral-rotate 120s linear infinite',
    transformOrigin: 'center center',
  },
  pulseOverlay: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '140%',
    background: 'radial-gradient(ellipse at center, rgba(100, 50, 200, 0.3) 0%, transparent 60%)',
    animation: 'bg-pulse 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.7) 100%)',
    pointerEvents: 'none',
  },
};

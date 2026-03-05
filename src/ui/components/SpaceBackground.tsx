/**
 * STARFORGE TCG - Animated Cosmic Background
 *
 * Uses background.png as the main visual with subtle animated overlays.
 */

import React from 'react';

const backgroundImg = 'https://raw.githubusercontent.com/finishstrong23/starforge_tcg/main/src/assets/background.png';

export const SpaceBackground: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* Main background image */}
      <img src={backgroundImg} alt="" style={styles.image} />
      {/* Subtle animated overlay for depth */}
      <div style={styles.overlay} />
      {/* Star twinkle layer */}
      <div style={styles.stars} />
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: '#040410',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 40%, rgba(10, 15, 40, 0.2) 0%, rgba(4, 4, 16, 0.5) 70%)',
  },
  stars: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 45%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 55% 70%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 85% 55%, rgba(200,200,255,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 90% 85%, rgba(255,255,255,0.5) 0%, transparent 100%)`,
    animation: 'twinkle 8s ease-in-out infinite',
  },
};

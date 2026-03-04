/**
 * STARFORGE TCG - Animated Cosmic Background
 *
 * Pure CSS animated background with slowly spiraling cosmic nebula swirls.
 * Subtle, fluid, smooth — no static images needed.
 */

import React from 'react';

export const SpaceBackground: React.FC = () => {
  return (
    <div style={styles.container}>
      {/* Base dark gradient */}
      <div style={styles.base} />
      {/* Nebula layer 1 - slow clockwise drift */}
      <div style={styles.nebula1} />
      {/* Nebula layer 2 - slow counter-clockwise drift */}
      <div style={styles.nebula2} />
      {/* Nebula layer 3 - deep purple accent */}
      <div style={styles.nebula3} />
      {/* Star particles */}
      <div style={styles.stars} />
      <div style={styles.stars2} />
      {/* Inline keyframes */}
      <style>{`
        @keyframes cosmic-drift-1 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(30px, -20px) rotate(120deg) scale(1.05); }
          66% { transform: translate(-20px, 15px) rotate(240deg) scale(0.98); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
        @keyframes cosmic-drift-2 {
          0% { transform: translate(0, 0) rotate(0deg) scale(1.02); }
          33% { transform: translate(-25px, 25px) rotate(-120deg) scale(0.97); }
          66% { transform: translate(20px, -15px) rotate(-240deg) scale(1.04); }
          100% { transform: translate(0, 0) rotate(-360deg) scale(1.02); }
        }
        @keyframes cosmic-drift-3 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.3; }
          50% { transform: translate(15px, -10px) rotate(180deg); opacity: 0.5; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 0.3; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes twinkle2 {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
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
  base: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(10, 15, 40, 1) 0%, rgba(4, 4, 16, 1) 70%)',
  },
  nebula1: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    width: '160%',
    height: '160%',
    background: 'radial-gradient(ellipse at 40% 40%, rgba(20, 60, 120, 0.15) 0%, rgba(80, 40, 120, 0.08) 30%, transparent 60%)',
    animation: 'cosmic-drift-1 90s linear infinite',
  },
  nebula2: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '140%',
    background: 'radial-gradient(ellipse at 60% 55%, rgba(60, 20, 100, 0.12) 0%, rgba(20, 80, 100, 0.06) 35%, transparent 55%)',
    animation: 'cosmic-drift-2 120s linear infinite',
  },
  nebula3: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '120%',
    height: '120%',
    background: 'radial-gradient(ellipse at 50% 30%, rgba(100, 40, 160, 0.08) 0%, transparent 40%), radial-gradient(ellipse at 30% 70%, rgba(20, 60, 140, 0.06) 0%, transparent 35%)',
    animation: 'cosmic-drift-3 150s linear infinite',
    opacity: 0.3,
  },
  stars: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 45%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 40% 10%, rgba(200,220,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 55% 70%, rgba(255,255,255,0.7) 0%, transparent 100%),
      radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 85% 55%, rgba(200,200,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 15% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 90% 85%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 35% 65%, rgba(200,220,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 60% 15%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 75% 90%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 20% 35%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 45% 85%, rgba(200,200,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 5% 60%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 95% 40%, rgba(200,220,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 30% 95%, rgba(255,255,255,0.5) 0%, transparent 100%)`,
    animation: 'twinkle 8s ease-in-out infinite',
  },
  stars2: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 33% 52%, rgba(200,220,255,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 48% 18%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 63% 78%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 78% 38%, rgba(200,200,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 93% 62%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 8% 72%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 23% 92%, rgba(200,220,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 53% 42%, rgba(255,255,255,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 68% 8%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 83% 72%, rgba(200,200,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 38% 32%, rgba(255,255,255,0.3) 0%, transparent 100%)`,
    animation: 'twinkle2 12s ease-in-out infinite',
  },
};

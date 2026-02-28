/**
 * STARFORGE TCG - Animated Game Board Background
 *
 * Multi-layered background with:
 * - Deep space gradient base
 * - Nebula cloud layers with subtle color
 * - Twinkling star field (CSS animated)
 * - Subtle grid lines for the battlefield
 * - Atmospheric edge vignette
 */

import React, { useMemo } from 'react';

// Deterministic star generation
function generateStars(count: number, seed: number) {
  const stars: { x: number; y: number; r: number; opacity: number; twinkle: boolean; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    const s = Math.sin(seed + i * 127.1) * 43758.5453;
    const r1 = s - Math.floor(s);
    const s2 = Math.sin(seed + i * 269.3 + 37) * 43758.5453;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin(seed + i * 419.7 + 71) * 43758.5453;
    const r3 = s3 - Math.floor(s3);
    const colors = ['#ffffff', '#aaccff', '#ffddaa', '#88aaff', '#ffeedd'];
    stars.push({
      x: r1 * 100,
      y: r2 * 100,
      r: 0.15 + r3 * 0.6,
      opacity: 0.15 + r3 * 0.65,
      twinkle: r3 > 0.6,
      color: colors[Math.floor(r1 * colors.length)],
    });
  }
  return stars;
}

export const BoardBackground: React.FC = () => {
  const stars = useMemo(() => generateStars(80, 42), []);

  return (
    <div style={styles.container}>
      {/* Inject twinkle animation */}
      <style>{`
        @keyframes bg-twinkle {
          0%, 100% { opacity: var(--star-opacity); }
          50% { opacity: calc(var(--star-opacity) * 0.3); }
        }
        @keyframes bg-nebula-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5px, -3px) scale(1.02); }
        }
      `}</style>

      {/* SVG background layer */}
      <svg width="100%" height="100%" style={styles.svgLayer} preserveAspectRatio="none">
        <defs>
          {/* Deep space gradient */}
          <linearGradient id="bg_space" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#060612" />
            <stop offset="30%" stopColor="#0a0a22" />
            <stop offset="60%" stopColor="#0c1028" />
            <stop offset="100%" stopColor="#060612" />
          </linearGradient>

          {/* Nebula gradients */}
          <radialGradient id="bg_neb1" cx="0.25" cy="0.3" r="0.35">
            <stop offset="0%" stopColor="#1a1050" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#0c0830" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="bg_neb2" cx="0.75" cy="0.6" r="0.3">
            <stop offset="0%" stopColor="#102040" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#081830" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="bg_neb3" cx="0.5" cy="0.8" r="0.4">
            <stop offset="0%" stopColor="#200820" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Battlefield center glow */}
          <radialGradient id="bg_arena" cx="0.5" cy="0.45" r="0.35">
            <stop offset="0%" stopColor="#1a3055" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#0f1830" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Vignette */}
          <radialGradient id="bg_vig" cx="0.5" cy="0.5" r="0.7">
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* Base space fill */}
        <rect width="100%" height="100%" fill="url(#bg_space)" />

        {/* Nebula clouds */}
        <rect width="100%" height="100%" fill="url(#bg_neb1)" />
        <rect width="100%" height="100%" fill="url(#bg_neb2)" />
        <rect width="100%" height="100%" fill="url(#bg_neb3)" />

        {/* Arena center glow */}
        <rect width="100%" height="100%" fill="url(#bg_arena)" />

        {/* Star field */}
        {stars.map((star, i) => (
          <circle
            key={i}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.r}
            fill={star.color}
            opacity={star.opacity}
            style={star.twinkle ? {
              animation: `bg-twinkle ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.37) % 3}s`,
              ['--star-opacity' as any]: star.opacity,
            } : undefined}
          />
        ))}

        {/* Subtle grid lines for battlefield area */}
        <line x1="15%" y1="35%" x2="85%" y2="35%" stroke="#ffffff" strokeWidth="0.5" opacity="0.03" />
        <line x1="15%" y1="55%" x2="85%" y2="55%" stroke="#ffffff" strokeWidth="0.5" opacity="0.03" />
        <line x1="50%" y1="25%" x2="50%" y2="70%" stroke="#ffffff" strokeWidth="0.3" opacity="0.02" />

        {/* Vignette */}
        <rect width="100%" height="100%" fill="url(#bg_vig)" />
      </svg>

      {/* Nebula overlay divs for CSS animation */}
      <div style={styles.nebulaOverlay1} />
      <div style={styles.nebulaOverlay2} />
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
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  nebulaOverlay1: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: '40%',
    height: '35%',
    background: 'radial-gradient(ellipse, rgba(30, 20, 80, 0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'bg-nebula-drift 20s ease-in-out infinite',
    pointerEvents: 'none',
  },
  nebulaOverlay2: {
    position: 'absolute',
    top: '50%',
    right: '5%',
    width: '35%',
    height: '30%',
    background: 'radial-gradient(ellipse, rgba(20, 40, 80, 0.12) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'bg-nebula-drift 25s ease-in-out infinite reverse',
    pointerEvents: 'none',
  },
};

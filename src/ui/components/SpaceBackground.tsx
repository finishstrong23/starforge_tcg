/**
 * STARFORGE TCG - Animated Space Background
 *
 * Full-screen animated background with:
 * - Deep space gradient
 * - Parallax star layers (small, medium, large)
 * - Drifting nebula clouds
 * - Subtle shooting stars
 * - Edge vignette
 */

import React, { useMemo } from 'react';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
  twinkle: boolean;
  speed: number;
}

function generateStarLayer(count: number, seed: number, minR: number, maxR: number): Star[] {
  const rng = seededRandom(seed);
  const colors = ['#ffffff', '#c8d8ff', '#ffeedd', '#aaccff', '#ffe8cc', '#ddeeff'];
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * 100,
      y: rng() * 100,
      r: minR + rng() * (maxR - minR),
      opacity: 0.2 + rng() * 0.7,
      color: colors[Math.floor(rng() * colors.length)],
      twinkle: rng() > 0.5,
      speed: 0.5 + rng() * 2,
    });
  }
  return stars;
}

export const SpaceBackground: React.FC = () => {
  const farStars = useMemo(() => generateStarLayer(100, 42, 0.2, 0.6), []);
  const midStars = useMemo(() => generateStarLayer(50, 137, 0.5, 1.0), []);
  const nearStars = useMemo(() => generateStarLayer(20, 256, 0.8, 1.5), []);

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes space-twinkle {
          0%, 100% { opacity: var(--star-o, 0.5); }
          50% { opacity: calc(var(--star-o, 0.5) * 0.2); }
        }
        @keyframes nebula-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(15px, -8px) scale(1.05) rotate(1deg); }
          66% { transform: translate(-8px, 5px) scale(0.97) rotate(-0.5deg); }
        }
        @keyframes nebula-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-12px, 10px) scale(1.03); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateX(200px) translateY(100px); opacity: 0; }
        }
      `}</style>

      <svg
        width="100%"
        height="100%"
        style={styles.svg}
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1000 1000"
      >
        <defs>
          {/* Deep space base */}
          <linearGradient id="space_bg" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#03030a" />
            <stop offset="25%" stopColor="#060614" />
            <stop offset="50%" stopColor="#0a0a22" />
            <stop offset="75%" stopColor="#080818" />
            <stop offset="100%" stopColor="#040410" />
          </linearGradient>

          {/* Nebula 1 - purple/blue */}
          <radialGradient id="neb1" cx="0.3" cy="0.25" r="0.4">
            <stop offset="0%" stopColor="#1a1050" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#120840" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Nebula 2 - teal/blue */}
          <radialGradient id="neb2" cx="0.7" cy="0.6" r="0.35">
            <stop offset="0%" stopColor="#0a2838" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#081828" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Nebula 3 - warm accent */}
          <radialGradient id="neb3" cx="0.5" cy="0.85" r="0.3">
            <stop offset="0%" stopColor="#281010" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Nebula 4 - green accent (forge glow) */}
          <radialGradient id="neb4" cx="0.5" cy="0.4" r="0.25">
            <stop offset="0%" stopColor="#002a1a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Vignette */}
          <radialGradient id="space_vig" cx="0.5" cy="0.5" r="0.75">
            <stop offset="40%" stopColor="transparent" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
          </radialGradient>
        </defs>

        {/* Base */}
        <rect width="1000" height="1000" fill="url(#space_bg)" />

        {/* Nebula layers */}
        <rect width="1000" height="1000" fill="url(#neb1)" />
        <rect width="1000" height="1000" fill="url(#neb2)" />
        <rect width="1000" height="1000" fill="url(#neb3)" />
        <rect width="1000" height="1000" fill="url(#neb4)" />

        {/* Far star layer */}
        {farStars.map((star, i) => (
          <circle
            key={`f${i}`}
            cx={star.x * 10}
            cy={star.y * 10}
            r={star.r}
            fill={star.color}
            opacity={star.opacity}
            style={star.twinkle ? {
              animation: `space-twinkle ${2 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.31) % 4}s`,
              ['--star-o' as any]: star.opacity,
            } : undefined}
          />
        ))}

        {/* Mid star layer */}
        {midStars.map((star, i) => (
          <circle
            key={`m${i}`}
            cx={star.x * 10}
            cy={star.y * 10}
            r={star.r}
            fill={star.color}
            opacity={star.opacity}
            style={star.twinkle ? {
              animation: `space-twinkle ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.47) % 5}s`,
              ['--star-o' as any]: star.opacity,
            } : undefined}
          />
        ))}

        {/* Near star layer (bigger, brighter) */}
        {nearStars.map((star, i) => (
          <g key={`n${i}`}>
            {/* Glow halo */}
            <circle
              cx={star.x * 10}
              cy={star.y * 10}
              r={star.r * 3}
              fill={star.color}
              opacity={star.opacity * 0.15}
            />
            {/* Core */}
            <circle
              cx={star.x * 10}
              cy={star.y * 10}
              r={star.r}
              fill={star.color}
              opacity={star.opacity}
              style={star.twinkle ? {
                animation: `space-twinkle ${2.5 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${(i * 0.6) % 3}s`,
                ['--star-o' as any]: star.opacity,
              } : undefined}
            />
          </g>
        ))}

        {/* Vignette overlay */}
        <rect width="1000" height="1000" fill="url(#space_vig)" />
      </svg>

      {/* CSS nebula overlays that animate */}
      <div style={styles.nebulaDrift1} />
      <div style={styles.nebulaDrift2} />
      <div style={styles.nebulaDrift3} />
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
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  nebulaDrift1: {
    position: 'absolute',
    top: '5%',
    left: '10%',
    width: '45%',
    height: '40%',
    background: 'radial-gradient(ellipse at center, rgba(30, 15, 80, 0.18) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebula-drift-1 30s ease-in-out infinite',
  },
  nebulaDrift2: {
    position: 'absolute',
    top: '45%',
    right: '5%',
    width: '40%',
    height: '35%',
    background: 'radial-gradient(ellipse at center, rgba(10, 40, 60, 0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebula-drift-2 25s ease-in-out infinite',
  },
  nebulaDrift3: {
    position: 'absolute',
    bottom: '10%',
    left: '30%',
    width: '35%',
    height: '25%',
    background: 'radial-gradient(ellipse at center, rgba(0, 40, 30, 0.12) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'nebula-drift-1 35s ease-in-out infinite reverse',
  },
};

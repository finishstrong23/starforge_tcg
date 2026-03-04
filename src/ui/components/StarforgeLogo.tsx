/**
 * STARFORGE TCG - SVG Logo Component
 *
 * Renders the STARFORGE title as a stylized SVG with:
 * - Glowing text with metallic gradient
 * - Animated star/forge icon
 * - Subtle pulsing glow effect
 */

import React from 'react';

interface StarforgeLogoProps {
  width?: number;
  height?: number;
}

export const StarforgeLogo: React.FC<StarforgeLogoProps> = ({
  width = 320,
  height = 120,
}) => {
  return (
    <div style={{ width, maxWidth: '100%' }}>
      <style>{`
        @keyframes logo-glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes logo-star-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes logo-star-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes logo-anvil-glow {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,150,0,0.4)); }
          50% { filter: drop-shadow(0 0 8px rgba(255,150,0,0.8)); }
        }
      `}</style>
      <svg
        viewBox="0 0 400 140"
        width="100%"
        height="auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main text gradient — metallic gold/green */}
          <linearGradient id="logo_text_grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#88ffcc" />
            <stop offset="30%" stopColor="#00ff88" />
            <stop offset="60%" stopColor="#00cc66" />
            <stop offset="100%" stopColor="#008844" />
          </linearGradient>

          {/* Outline glow gradient */}
          <linearGradient id="logo_outline_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="50%" stopColor="#ffaa00" />
            <stop offset="100%" stopColor="#00ff88" />
          </linearGradient>

          {/* Star/forge icon gradient */}
          <radialGradient id="logo_star_grad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#ffdd44" />
            <stop offset="70%" stopColor="#ff8800" />
            <stop offset="100%" stopColor="#cc4400" />
          </radialGradient>

          {/* Ambient glow */}
          <filter id="logo_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="logo_text_glow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="#00ff88" floodOpacity="0.5" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow halo */}
        <ellipse
          cx="200"
          cy="65"
          rx="160"
          ry="50"
          fill="none"
          stroke="#00ff88"
          strokeWidth="1"
          opacity="0.15"
          style={{ animation: 'logo-glow-pulse 3s ease-in-out infinite' }}
        />

        {/* Central star/anvil icon */}
        <g
          transform="translate(200, 28)"
          style={{ animation: 'logo-star-pulse 3s ease-in-out infinite' }}
        >
          {/* Outer star burst rays */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={angle}
              x1="0"
              y1="0"
              x2={Math.cos((angle * Math.PI) / 180) * 18}
              y2={Math.sin((angle * Math.PI) / 180) * 18}
              stroke="#ffaa00"
              strokeWidth={angle % 90 === 0 ? 1.5 : 0.8}
              opacity={angle % 90 === 0 ? 0.9 : 0.5}
            />
          ))}
          {/* Center star */}
          <polygon
            points="0,-10 3,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -3,-3"
            fill="url(#logo_star_grad)"
            filter="url(#logo_glow)"
          />
          {/* Inner bright core */}
          <circle cx="0" cy="0" r="2.5" fill="#ffffff" opacity="0.9" />
        </g>

        {/* Main title: STARFORGE */}
        <text
          x="200"
          y="80"
          textAnchor="middle"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="48"
          fontWeight="900"
          letterSpacing="8"
          fill="url(#logo_text_grad)"
          filter="url(#logo_text_glow)"
        >
          STARFORGE
        </text>

        {/* Decorative underline */}
        <line
          x1="80"
          y1="92"
          x2="320"
          y2="92"
          stroke="url(#logo_outline_grad)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Small diamond accents on the underline */}
        <polygon points="80,92 84,89 88,92 84,95" fill="#ffaa00" opacity="0.7" />
        <polygon points="312,92 316,89 320,92 316,95" fill="#ffaa00" opacity="0.7" />

        {/* Subtitle: TCG */}
        <text
          x="200"
          y="115"
          textAnchor="middle"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="16"
          fontWeight="400"
          letterSpacing="12"
          fill="#667788"
        >
          TCG
        </text>

        {/* Small forge sparks */}
        {[
          { cx: 145, cy: 22, r: 1.2, delay: 0 },
          { cx: 255, cy: 18, r: 1, delay: 1 },
          { cx: 170, cy: 30, r: 0.8, delay: 0.5 },
          { cx: 230, cy: 25, r: 0.9, delay: 1.5 },
          { cx: 190, cy: 15, r: 0.7, delay: 2 },
          { cx: 210, cy: 20, r: 1.1, delay: 0.8 },
        ].map((spark, i) => (
          <circle
            key={i}
            cx={spark.cx}
            cy={spark.cy}
            r={spark.r}
            fill="#ffcc44"
            opacity="0.6"
            style={{
              animation: `logo-glow-pulse 2s ease-in-out infinite`,
              animationDelay: `${spark.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
};

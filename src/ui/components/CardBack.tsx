/**
 * STARFORGE TCG - Ornate Card Back Design
 *
 * Professional SVG card back with layered decorative patterns:
 * - Deep gradient background
 * - Ornate border with corner filigree
 * - Central STARFORGE emblem with radiating geometry
 * - Starfield particle dots
 * - Shimmer highlight overlay
 */

import React from 'react';

interface CardBackProps {
  width?: number;
  height?: number;
}

export const CardBack: React.FC<CardBackProps> = ({ width = 50, height = 70 }) => {
  const cx = width / 2;
  const cy = height / 2;
  const innerPad = 3;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: '6px', display: 'block' }}>
      <defs>
        {/* Deep background */}
        <linearGradient id="cb_bg" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#0a0a2a" />
          <stop offset="50%" stopColor="#12123a" />
          <stop offset="100%" stopColor="#08081e" />
        </linearGradient>
        {/* Gold border gradient */}
        <linearGradient id="cb_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c89b3c" />
          <stop offset="30%" stopColor="#f0d060" />
          <stop offset="60%" stopColor="#c89b3c" />
          <stop offset="100%" stopColor="#a07828" />
        </linearGradient>
        {/* Central emblem glow */}
        <radialGradient id="cb_glow" cx="0.5" cy="0.5" r="0.4">
          <stop offset="0%" stopColor="#4466ff" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#2233aa" stopOpacity="0.1" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Shimmer highlight */}
        <linearGradient id="cb_shimmer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Background fill */}
      <rect width={width} height={height} rx="6" fill="url(#cb_bg)" />

      {/* Outer gold border */}
      <rect x="1" y="1" width={width - 2} height={height - 2} rx="5"
        fill="none" stroke="url(#cb_gold)" strokeWidth="1.5" opacity="0.7" />

      {/* Inner decorative border */}
      <rect x={innerPad} y={innerPad} width={width - innerPad * 2} height={height - innerPad * 2} rx="4"
        fill="none" stroke="#c89b3c" strokeWidth="0.5" opacity="0.35" strokeDasharray="2,3" />

      {/* Corner filigree decorations */}
      {renderCornerFiligree(innerPad + 1, innerPad + 1, 1, 1)}
      {renderCornerFiligree(width - innerPad - 1, innerPad + 1, -1, 1)}
      {renderCornerFiligree(innerPad + 1, height - innerPad - 1, 1, -1)}
      {renderCornerFiligree(width - innerPad - 1, height - innerPad - 1, -1, -1)}

      {/* Background star dots */}
      {Array.from({ length: 12 }, (_, i) => {
        const sx = (Math.sin(i * 2.7 + 1.3) * 0.5 + 0.5) * (width - 12) + 6;
        const sy = (Math.cos(i * 3.1 + 0.7) * 0.5 + 0.5) * (height - 12) + 6;
        return (
          <circle key={`star${i}`} cx={sx} cy={sy}
            r={0.3 + (i % 3) * 0.3}
            fill="#8899cc" opacity={0.15 + (i % 4) * 0.08} />
        );
      })}

      {/* Central glow */}
      <rect width={width} height={height} fill="url(#cb_glow)" />

      {/* Radiating geometry ring */}
      <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.28}
        fill="none" stroke="#c89b3c" strokeWidth="0.5" opacity="0.3" />
      <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.22}
        fill="none" stroke="#4466ff" strokeWidth="0.3" opacity="0.25" />

      {/* 8-point star emblem */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const innerR = Math.min(width, height) * 0.08;
        const outerR = Math.min(width, height) * 0.2;
        return (
          <line key={`ray${i}`}
            x1={cx + Math.cos(angle) * innerR} y1={cy + Math.sin(angle) * innerR}
            x2={cx + Math.cos(angle) * outerR} y2={cy + Math.sin(angle) * outerR}
            stroke="#c89b3c" strokeWidth={i % 2 === 0 ? '1' : '0.5'}
            opacity={i % 2 === 0 ? 0.4 : 0.25} strokeLinecap="round" />
        );
      })}

      {/* Central 4-point star */}
      {renderCentralStar(cx, cy, Math.min(width, height) * 0.12)}

      {/* Center gem dot */}
      <circle cx={cx} cy={cy} r={2} fill="#4488ff" opacity="0.6" />
      <circle cx={cx} cy={cy} r={1} fill="#88bbff" opacity="0.8" />

      {/* Shimmer overlay */}
      <rect width={width} height={height} rx="6" fill="url(#cb_shimmer)" />
    </svg>
  );
};

function renderCornerFiligree(x: number, y: number, dx: number, dy: number) {
  const s = 5;
  return (
    <g key={`corner_${x}_${y}`}>
      <path
        d={`M ${x} ${y + dy * s} Q ${x} ${y} ${x + dx * s} ${y}`}
        fill="none" stroke="#c89b3c" strokeWidth="0.8" opacity="0.4" />
      <path
        d={`M ${x} ${y + dy * (s - 2)} Q ${x + dx * 1} ${y + dy * 1} ${x + dx * (s - 2)} ${y}`}
        fill="none" stroke="#c89b3c" strokeWidth="0.4" opacity="0.25" />
      <circle cx={x + dx * 1.5} cy={y + dy * 1.5} r={0.8}
        fill="#c89b3c" opacity="0.3" />
    </g>
  );
}

function renderCentralStar(cx: number, cy: number, size: number) {
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return (
    <polygon points={points.join(' ')}
      fill="#c89b3c" opacity="0.2" stroke="#f0d060" strokeWidth="0.5" />
  );
}

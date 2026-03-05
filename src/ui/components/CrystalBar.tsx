/**
 * STARFORGE TCG - Crystal (Mana) Bar Component
 *
 * SVG-based crystal gems with fill/empty states and glow effects.
 */

import React from 'react';

interface CrystalBarProps {
  current: number;
  max: number;
  overloaded?: number;
  isOpponent?: boolean;
}

const CrystalGem: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="20" height="22" viewBox="0 0 16 18" style={{ display: 'block' }}>
    <defs>
      <linearGradient id={filled ? 'cg_fill' : 'cg_empty'} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor={filled ? '#44ddff' : '#334455'} />
        <stop offset="50%" stopColor={filled ? '#0088cc' : '#222233'} />
        <stop offset="100%" stopColor={filled ? '#005588' : '#1a1a28'} />
      </linearGradient>
    </defs>
    {/* Crystal diamond shape */}
    <polygon
      points="8,1 15,7 8,17 1,7"
      fill={`url(#${filled ? 'cg_fill' : 'cg_empty'})`}
      stroke={filled ? '#66ddff' : '#445566'}
      strokeWidth="1"
      opacity={filled ? 1 : 0.5}
    />
    {/* Inner facet highlight */}
    {filled && (
      <>
        <polygon points="8,3 12,7 8,13" fill="#88eeff" opacity="0.15" />
        <line x1="8" y1="2" x2="8" y2="8" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
      </>
    )}
  </svg>
);

export const CrystalBar: React.FC<CrystalBarProps> = ({
  current,
  max,
  overloaded = 0,
  isOpponent = false,
}) => {
  const crystals = [];

  for (let i = 0; i < max; i++) {
    const isFilled = i < current;
    crystals.push(
      <div key={i} style={styles.crystalWrap}>
        <CrystalGem filled={isFilled} />
      </div>
    );
  }

  // Empty slots up to 10
  for (let i = max; i < 10; i++) {
    crystals.push(
      <div key={i} style={styles.crystalSlot} />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.crystalsRow}>
        {crystals}
      </div>
      <div style={styles.countText}>
        {current}/{max}
        {overloaded > 0 && (
          <span style={styles.overloadText}> (LOCKED: {overloaded})</span>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  crystalsRow: {
    display: 'flex',
    gap: '2px',
    alignItems: 'center',
  },
  crystalWrap: {
    transition: 'all 0.3s ease',
  },
  crystalSlot: {
    width: '18px',
    height: '20px',
    background: 'rgba(30, 30, 50, 0.3)',
    borderRadius: '2px',
    border: '1px solid rgba(60, 60, 90, 0.2)',
    clipPath: 'polygon(50% 0%, 100% 35%, 50% 100%, 0% 35%)',
  },
  countText: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00aaff',
    textShadow: '0 0 5px rgba(0, 170, 255, 0.4)',
    minWidth: '44px',
  },
  overloadText: {
    fontSize: '10px',
    color: '#ff4444',
    fontWeight: 'bold',
    textShadow: '0 0 4px rgba(255, 68, 68, 0.5)',
  },
};

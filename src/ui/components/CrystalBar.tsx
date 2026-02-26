/**
 * STARFORGE TCG - Crystal (Mana) Bar Component
 */

import React from 'react';

interface CrystalBarProps {
  current: number;
  max: number;
  overloaded?: number;
  isOpponent?: boolean;
}

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
      <div
        key={i}
        style={{
          ...styles.crystal,
          ...(isFilled ? styles.crystalFilled : styles.crystalEmpty),
        }}
      >
        💎
      </div>
    );
  }

  // Add empty slots up to 10
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
    gap: '3px',
  },
  crystal: {
    width: '18px',
    height: '18px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  crystalFilled: {
    filter: 'brightness(1.2) saturate(1.5)',
    textShadow: '0 0 5px #00aaff',
  },
  crystalEmpty: {
    filter: 'brightness(0.4) grayscale(0.8)',
    opacity: 0.5,
  },
  crystalSlot: {
    width: '18px',
    height: '18px',
    background: 'rgba(50, 50, 80, 0.3)',
    borderRadius: '50%',
    border: '1px solid rgba(100, 100, 150, 0.3)',
  },
  countText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#00aaff',
    textShadow: '0 0 5px rgba(0, 170, 255, 0.5)',
    minWidth: '40px',
  },
  overloadText: {
    fontSize: '10px',
    color: '#ff4444',
    fontWeight: 'bold',
    textShadow: '0 0 4px rgba(255, 68, 68, 0.5)',
  },
};

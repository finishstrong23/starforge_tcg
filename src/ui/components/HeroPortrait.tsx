/**
 * STARFORGE TCG - Hero Portrait Component
 */

import React, { useState } from 'react';

interface HeroPortraitProps {
  health: number;
  maxHealth: number;
  armor?: number;
  isOpponent?: boolean;
  heroPowerUsed?: boolean;
  canUseHeroPower?: boolean;
  isValidTarget?: boolean;
  onClick?: () => void;
  onHeroPowerClick?: () => void;
  heroPowerName?: string;
  heroPowerDescription?: string;
}

export const HeroPortrait: React.FC<HeroPortraitProps> = ({
  health,
  maxHealth,
  armor = 0,
  isOpponent = false,
  heroPowerUsed = false,
  canUseHeroPower = false,
  isValidTarget = false,
  onClick,
  onHeroPowerClick,
  heroPowerName,
  heroPowerDescription,
}) => {
  const [heroPowerHovered, setHeroPowerHovered] = useState(false);
  const healthPercent = Math.max(0, health / maxHealth) * 100;
  const isDamaged = health < maxHealth;

  return (
    <div
      style={{
        ...styles.container,
        ...(isValidTarget ? styles.validTarget : {}),
      }}
      onClick={onClick}
    >
      {/* Hero frame */}
      <div style={styles.heroFrame}>
        {/* Portrait area */}
        <div style={styles.portrait}>
          <div style={styles.portraitIcon}>
            {isOpponent ? '👹' : '🧙'}
          </div>
        </div>

        {/* Health bar */}
        <div style={styles.healthBarContainer}>
          <div
            style={{
              ...styles.healthBar,
              width: `${healthPercent}%`,
              background: isDamaged
                ? 'linear-gradient(90deg, #cc3333 0%, #ff4444 100%)'
                : 'linear-gradient(90deg, #22aa44 0%, #33cc55 100%)',
            }}
          />
        </div>

        {/* Health number */}
        <div style={styles.healthNumber}>
          <span style={isDamaged ? styles.damagedHealth : undefined}>
            {health}
          </span>
          /{maxHealth}
        </div>

        {/* Armor */}
        {armor > 0 && (
          <div style={styles.armorBadge}>
            🛡️ {armor}
          </div>
        )}
      </div>

      {/* Hero power button (player only) */}
      {!isOpponent && (
        <div
          style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={() => setHeroPowerHovered(true)}
          onMouseLeave={() => setHeroPowerHovered(false)}
        >
          <div
            style={{
              ...styles.heroPowerButton,
              ...(heroPowerUsed ? styles.heroPowerUsed : {}),
              ...(canUseHeroPower ? styles.heroPowerAvailable : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (canUseHeroPower && onHeroPowerClick) {
                onHeroPowerClick();
              }
            }}
          >
            <div style={styles.heroPowerCost}>2</div>
            <div style={styles.heroPowerIcon}>⚡</div>
          </div>
          {/* Hero Power Tooltip */}
          {heroPowerHovered && heroPowerName && (
            <div style={styles.heroPowerTooltip}>
              <div style={styles.tooltipName}>⚡ {heroPowerName}</div>
              <div style={styles.tooltipCostLine}>Cost: 2 crystals</div>
              {heroPowerDescription && (
                <div style={styles.tooltipDesc}>{heroPowerDescription}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  heroFrame: {
    position: 'relative',
    width: '80px',
    height: '100px',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)',
    border: '3px solid #666688',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  validTarget: {
    filter: 'brightness(1.2)',
  },
  portrait: {
    flex: 1,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
  },
  portraitIcon: {
    fontSize: '40px',
  },
  healthBarContainer: {
    width: '90%',
    height: '8px',
    background: '#333344',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '5px 0',
  },
  healthBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  healthNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '5px',
  },
  damagedHealth: {
    color: '#ff4444',
  },
  armorBadge: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    background: 'linear-gradient(135deg, #666688 0%, #444466 100%)',
    borderRadius: '10px',
    padding: '2px 6px',
    fontSize: '12px',
    color: '#ffffff',
  },
  heroPowerButton: {
    position: 'relative',
    width: '50px',
    height: '50px',
    background: 'linear-gradient(135deg, #333355 0%, #222244 100%)',
    border: '2px solid #555577',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  heroPowerUsed: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  heroPowerAvailable: {
    border: '2px solid #00ff88',
    boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
  },
  heroPowerCost: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    width: '20px',
    height: '20px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
    border: '2px solid #88ccff',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroPowerIcon: {
    fontSize: '24px',
  },
  heroPowerTooltip: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '200px',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '2px solid #ffcc00',
    borderRadius: '10px',
    padding: '10px',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
    pointerEvents: 'none' as const,
  },
  tooltipName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffcc00',
    marginBottom: '4px',
    textAlign: 'center' as const,
  },
  tooltipCostLine: {
    fontSize: '11px',
    color: '#88aacc',
    marginBottom: '6px',
    textAlign: 'center' as const,
  },
  tooltipDesc: {
    fontSize: '12px',
    color: '#ccccee',
    lineHeight: '1.4',
    textAlign: 'center' as const,
  },
};

/**
 * STARFORGE TCG - Hero Portrait Component
 *
 * Professional hero portraits with:
 * - Procedural SVG portraits (helmeted warrior / dark lord)
 * - Animated health bar with gradient and glow
 * - Ornate frame border with inner bevel
 * - Armor badge with shield icon
 * - Hero power button with glow pulse and tooltip
 * - Valid target highlight ring
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

/** SVG hero portrait — a stylized helmeted figure */
const HeroFace: React.FC<{ isOpponent: boolean; size: number }> = ({ isOpponent, size }) => {
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.38; // scale factor

  if (isOpponent) {
    // Dark lord / antagonist portrait
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="hp_opp_bg" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#2a1030" />
            <stop offset="100%" stopColor="#0a0512" />
          </radialGradient>
          <radialGradient id="hp_opp_glow" cx="0.5" cy="0.4" r="0.4">
            <stop offset="0%" stopColor="#ff2244" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width={size} height={size} fill="url(#hp_opp_bg)" />
        <rect width={size} height={size} fill="url(#hp_opp_glow)" />

        {/* Hood/helm shape */}
        <path d={`M ${cx - s * 0.9} ${cy + s * 0.2}
                   Q ${cx - s * 0.9} ${cy - s * 0.8} ${cx} ${cy - s * 1.1}
                   Q ${cx + s * 0.9} ${cy - s * 0.8} ${cx + s * 0.9} ${cy + s * 0.2}
                   L ${cx + s * 0.6} ${cy + s * 0.9}
                   L ${cx - s * 0.6} ${cy + s * 0.9} Z`}
          fill="#1a0825" stroke="#cc2244" strokeWidth="1" opacity="0.8" />

        {/* Face shadow */}
        <ellipse cx={cx} cy={cy + s * 0.1} rx={s * 0.5} ry={s * 0.45}
          fill="#0a0010" opacity="0.6" />

        {/* Glowing eyes */}
        <ellipse cx={cx - s * 0.22} cy={cy - s * 0.05} rx={s * 0.13} ry={s * 0.06}
          fill="#ff2244" opacity="0.9" />
        <ellipse cx={cx + s * 0.22} cy={cy - s * 0.05} rx={s * 0.13} ry={s * 0.06}
          fill="#ff2244" opacity="0.9" />
        {/* Eye glow */}
        <ellipse cx={cx - s * 0.22} cy={cy - s * 0.05} rx={s * 0.25} ry={s * 0.12}
          fill="#ff2244" opacity="0.15" />
        <ellipse cx={cx + s * 0.22} cy={cy - s * 0.05} rx={s * 0.25} ry={s * 0.12}
          fill="#ff2244" opacity="0.15" />

        {/* Horn decorations */}
        <path d={`M ${cx - s * 0.6} ${cy - s * 0.5} Q ${cx - s * 1.0} ${cy - s * 1.3} ${cx - s * 0.5} ${cy - s * 1.0}`}
          fill="none" stroke="#aa1133" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
        <path d={`M ${cx + s * 0.6} ${cy - s * 0.5} Q ${cx + s * 1.0} ${cy - s * 1.3} ${cx + s * 0.5} ${cy - s * 1.0}`}
          fill="none" stroke="#aa1133" strokeWidth="2" opacity="0.7" strokeLinecap="round" />

        {/* Jaw/chin line */}
        <path d={`M ${cx - s * 0.3} ${cy + s * 0.35} Q ${cx} ${cy + s * 0.55} ${cx + s * 0.3} ${cy + s * 0.35}`}
          fill="none" stroke="#cc2244" strokeWidth="0.5" opacity="0.3" />
      </svg>
    );
  }

  // Player hero — helmeted warrior
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="hp_pl_bg" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#102040" />
          <stop offset="100%" stopColor="#060818" />
        </radialGradient>
        <radialGradient id="hp_pl_glow" cx="0.5" cy="0.35" r="0.4">
          <stop offset="0%" stopColor="#2288ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="hp_helm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#88aacc" />
          <stop offset="50%" stopColor="#556688" />
          <stop offset="100%" stopColor="#334455" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} fill="url(#hp_pl_bg)" />
      <rect width={size} height={size} fill="url(#hp_pl_glow)" />

      {/* Helm shape */}
      <path d={`M ${cx - s * 0.75} ${cy + s * 0.15}
                 Q ${cx - s * 0.8} ${cy - s * 0.7} ${cx} ${cy - s * 0.95}
                 Q ${cx + s * 0.8} ${cy - s * 0.7} ${cx + s * 0.75} ${cy + s * 0.15}
                 L ${cx + s * 0.55} ${cy + s * 0.6}
                 L ${cx - s * 0.55} ${cy + s * 0.6} Z`}
        fill="url(#hp_helm)" stroke="#88aacc" strokeWidth="0.8" opacity="0.85" />

      {/* Visor slit */}
      <rect x={cx - s * 0.5} y={cy - s * 0.12} width={s * 1.0} height={s * 0.2}
        rx="2" fill="#0a1020" opacity="0.8" />
      {/* Visor glow - eyes behind */}
      <ellipse cx={cx - s * 0.18} cy={cy - s * 0.02} rx={s * 0.08} ry={s * 0.05}
        fill="#44aaff" opacity="0.7" />
      <ellipse cx={cx + s * 0.18} cy={cy - s * 0.02} rx={s * 0.08} ry={s * 0.05}
        fill="#44aaff" opacity="0.7" />

      {/* Helm crest / ridge */}
      <path d={`M ${cx} ${cy - s * 0.95} Q ${cx + s * 0.05} ${cy - s * 0.5} ${cx} ${cy + s * 0.15}`}
        fill="none" stroke="#aaccee" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />

      {/* Cheek guards */}
      <path d={`M ${cx - s * 0.7} ${cy + s * 0.1} L ${cx - s * 0.55} ${cy + s * 0.55}`}
        fill="none" stroke="#6688aa" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      <path d={`M ${cx + s * 0.7} ${cy + s * 0.1} L ${cx + s * 0.55} ${cy + s * 0.55}`}
        fill="none" stroke="#6688aa" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />

      {/* Chin guard */}
      <path d={`M ${cx - s * 0.35} ${cy + s * 0.45} Q ${cx} ${cy + s * 0.65} ${cx + s * 0.35} ${cy + s * 0.45}`}
        fill="none" stroke="#556688" strokeWidth="1" opacity="0.4" />

      {/* Shoulder armor hints */}
      <ellipse cx={cx - s * 0.9} cy={cy + s * 0.85} rx={s * 0.4} ry={s * 0.15}
        fill="#445566" opacity="0.3" />
      <ellipse cx={cx + s * 0.9} cy={cy + s * 0.85} rx={s * 0.4} ry={s * 0.15}
        fill="#445566" opacity="0.3" />
    </svg>
  );
};

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
  const healthColor = healthPercent > 50
    ? `linear-gradient(90deg, #22aa44 0%, #33cc55 100%)`
    : healthPercent > 25
    ? `linear-gradient(90deg, #cc8800 0%, #ddaa22 100%)`
    : `linear-gradient(90deg, #cc3333 0%, #ff4444 100%)`;

  return (
    <div
      style={{
        ...styles.container,
        ...(isValidTarget ? styles.validTarget : {}),
      }}
      onClick={onClick}
    >
      {/* Hero frame */}
      <div style={{
        ...styles.heroFrame,
        ...(isValidTarget ? {
          border: '3px solid #ff0066',
          boxShadow: '0 0 15px #ff0066, 0 0 30px rgba(255, 0, 102, 0.3)',
        } : {}),
      }}>
        {/* Portrait area */}
        <div style={styles.portrait}>
          <HeroFace isOpponent={isOpponent} size={110} />
        </div>

        {/* Health bar */}
        <div style={styles.healthBarContainer}>
          <div
            style={{
              ...styles.healthBar,
              width: `${healthPercent}%`,
              background: healthColor,
            }}
          />
          {/* Health bar shine */}
          <div style={styles.healthBarShine} />
        </div>

        {/* Health number */}
        <div style={styles.healthNumber}>
          <span style={isDamaged ? styles.damagedHealth : undefined}>
            {health}
          </span>
          <span style={styles.healthMax}>/{maxHealth}</span>
        </div>

        {/* Armor */}
        {armor > 0 && (
          <div style={styles.armorBadge}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M 7 1 L 12 3 L 12 7 Q 12 11 7 13 Q 2 11 2 7 L 2 3 Z"
                fill="#667788" stroke="#99aabb" strokeWidth="0.8" />
            </svg>
            <span style={styles.armorText}>{armor}</span>
          </div>
        )}

        {/* Frame inner bevel */}
        <div style={styles.frameBevel} />
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
            {/* SVG lightning bolt icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ zIndex: 1 }}>
              <path d="M 13 2 L 4 14 L 11 14 L 10 22 L 20 10 L 13 10 Z"
                fill={canUseHeroPower ? '#ffcc00' : '#666688'}
                stroke={canUseHeroPower ? '#ffee66' : '#555566'}
                strokeWidth="0.5" opacity="0.9" />
            </svg>
            {/* Inner glow ring */}
            {canUseHeroPower && (
              <div style={styles.heroPowerRing} />
            )}
          </div>

          {/* Hero Power Tooltip */}
          {heroPowerHovered && heroPowerName && (
            <div style={styles.heroPowerTooltip}>
              <div style={styles.tooltipName}>
                <svg width="12" height="12" viewBox="0 0 24 24" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                  <path d="M 13 2 L 4 14 L 11 14 L 10 22 L 20 10 L 13 10 Z"
                    fill="#ffcc00" strokeWidth="0" />
                </svg>
                {heroPowerName}
              </div>
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
    width: '100px',
    height: '120px',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a20 100%)',
    border: '3px solid #556688',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  validTarget: {},
  portrait: {
    flex: 1,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  healthBarContainer: {
    position: 'relative',
    width: '90%',
    height: '10px',
    background: '#1a1a22',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '4px 0',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  healthBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  healthBarShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
    borderRadius: '3px 3px 0 0',
    pointerEvents: 'none',
  },
  healthNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '4px',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
  },
  healthMax: {
    color: '#889999',
    fontSize: '14px',
  },
  damagedHealth: {
    color: '#ff4444',
    textShadow: '0 0 6px rgba(255, 68, 68, 0.5)',
  },
  armorBadge: {
    position: 'absolute',
    top: '3px',
    right: '3px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '8px',
    padding: '2px 5px',
  },
  armorText: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#bbccdd',
  },
  frameBevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    pointerEvents: 'none',
  },
  heroPowerButton: {
    position: 'relative',
    width: 'var(--hero-power-size, 50px)',
    height: 'var(--hero-power-size, 50px)',
    background: 'linear-gradient(135deg, #222244 0%, #1a1a33 100%)',
    border: '2px solid #444466',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  heroPowerUsed: {
    opacity: 0.4,
    cursor: 'not-allowed',
    filter: 'grayscale(0.6)',
  },
  heroPowerAvailable: {
    border: '2px solid #00ff88',
    boxShadow: '0 0 12px rgba(0, 255, 136, 0.4), 0 0 24px rgba(0, 255, 136, 0.15), 0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  heroPowerRing: {
    position: 'absolute',
    top: '2px',
    left: '2px',
    right: '2px',
    bottom: '2px',
    borderRadius: '50%',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    pointerEvents: 'none',
    animation: 'pulse-glow 2s ease-in-out infinite',
  },
  heroPowerCost: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    width: '24px',
    height: '24px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
    border: '2px solid #88ccff',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ffffff',
    zIndex: 5,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
  },
  heroPowerTooltip: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '210px',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '2px solid #c89b3c',
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

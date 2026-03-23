import React, { useState } from 'react';
import type { RunCard, DungeonCardDefinition } from '../types';
import { FACTION_COLORS } from '../types';

interface CardComponentProps {
  card: RunCard | DungeonCardDefinition;
  onClick?: () => void;
  onDragStart?: () => void;
  disabled?: boolean;
  selected?: boolean;
  compact?: boolean;
  showUpgrade?: boolean;
  effectiveCost?: number;
}

const RARITY_GLOW: Record<string, string> = {
  Common: 'none',
  Rare: '0 0 8px 2px rgba(60, 130, 255, 0.6)',
  Epic: '0 0 8px 2px rgba(160, 60, 220, 0.6)',
  Legendary: '0 0 10px 3px rgba(255, 180, 40, 0.7)',
};

function isRunCard(card: RunCard | DungeonCardDefinition): card is RunCard {
  return 'instanceId' in card;
}

const CardComponent: React.FC<CardComponentProps> = ({
  card,
  onClick,
  onDragStart,
  disabled = false,
  selected = false,
  compact = false,
  showUpgrade,
  effectiveCost,
}) => {
  const [hovered, setHovered] = useState(false);

  const upgraded = isRunCard(card) && card.upgraded;
  const shouldShowUpgrade = showUpgrade ?? upgraded;
  const displayCost = effectiveCost ?? (upgraded && isRunCard(card) && card.upgradedCost != null ? card.upgradedCost : card.cost);
  const displayText = upgraded && isRunCard(card) && card.upgradedText ? card.upgradedText : card.cardText;
  const displayKeywords = upgraded && isRunCard(card) && card.upgradedKeywords ? card.upgradedKeywords : card.keywords;

  const factionColors = FACTION_COLORS[card.faction];
  const width = compact ? 100 : 140;
  const height = compact ? 140 : 200;
  const fontSize = compact ? 0.7 : 1;

  const rarityGlow = RARITY_GLOW[card.rarity] || 'none';

  const borderColor = selected
    ? '#fff'
    : shouldShowUpgrade
      ? '#ffd700'
      : factionColors.primary;

  const boxShadow = [
    selected ? '0 0 12px 4px rgba(255, 215, 0, 0.7)' : '',
    rarityGlow,
  ]
    .filter(Boolean)
    .join(', ') || 'none';

  const containerStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: 10,
    border: `2px solid ${borderColor}`,
    background: `linear-gradient(180deg, ${factionColors.bg} 0%, #111 100%)`,
    position: 'relative',
    cursor: disabled ? 'default' : 'pointer',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
    opacity: disabled ? 0.5 : 1,
    filter: disabled ? 'grayscale(0.7)' : 'none',
    transform: hovered && !compact ? 'scale(1.1)' : 'scale(1)',
    zIndex: hovered ? 100 : 1,
    transition: 'transform 0.15s ease, z-index 0s, box-shadow 0.15s ease',
    boxShadow,
    flexShrink: 0,
  };

  const costSize = compact ? 20 : 28;
  const costStyle: React.CSSProperties = {
    position: 'absolute',
    top: 4,
    left: 4,
    width: costSize,
    height: costSize,
    borderRadius: '50%',
    background: disabled ? '#666' : 'linear-gradient(135deg, #4a9eff, #1a5abb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: compact ? 11 : 14,
    border: '1.5px solid rgba(255,255,255,0.3)',
    boxShadow: disabled ? 'none' : '0 0 6px rgba(74, 158, 255, 0.5)',
    zIndex: 2,
  };

  const nameStyle: React.CSSProperties = {
    textAlign: 'center',
    color: shouldShowUpgrade ? '#ffd700' : '#fff',
    fontWeight: 'bold',
    fontSize: compact ? 9 : 12,
    padding: compact ? '6px 20px 0' : '8px 30px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };

  const typeBadgeStyle: React.CSSProperties = {
    textAlign: 'center',
    fontSize: compact ? 7 : 9,
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 1,
  };

  const keywordTagStyle = (kw: string): React.CSSProperties => {
    const kwColors: Record<string, string> = {
      Guardian: '#4a9eff',
      Barrier: '#66ccff',
      Swift: '#7fff7f',
      Blitz: '#ff6b35',
      Drain: '#cc44cc',
      'Double Strike': '#ff4444',
      Deploy: '#ffd700',
      'Last Words': '#9966cc',
      Salvage: '#d4760a',
      Upgrade: '#ff9900',
      Illuminate: '#ffd700',
      Immolate: '#e63946',
      STARFORGE: '#ff00ff',
      Phase: '#7b2d8e',
      Cloak: '#555',
      Enrage: '#cc0000',
    };
    return {
      display: 'inline-block',
      fontSize: compact ? 6 : 8,
      padding: compact ? '0 2px' : '1px 4px',
      margin: '0 1px',
      borderRadius: 3,
      background: kwColors[kw] || '#555',
      color: '#fff',
      fontWeight: 600,
      lineHeight: 1.4,
    };
  };

  const keywordsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 1,
    padding: compact ? '1px 3px' : '2px 6px',
    minHeight: compact ? 10 : 14,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    padding: compact ? '2px 4px' : '4px 8px',
    fontSize: compact ? 7 : 10,
    color: '#ccc',
    textAlign: 'center',
    overflow: 'hidden',
    lineHeight: 1.3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const statIconSize = compact ? 12 : 16;

  const bottomRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: compact ? '0 6px 3px' : '0 10px 6px',
  };

  const attackStatStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: compact ? 11 : 14,
  };

  const healthStatStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    color: '#e63946',
    fontWeight: 'bold',
    fontSize: compact ? 11 : 14,
  };

  const factionStripStyle: React.CSSProperties = {
    height: compact ? 3 : 4,
    background: `linear-gradient(90deg, ${factionColors.primary}, ${factionColors.secondary})`,
    width: '100%',
    flexShrink: 0,
  };

  const upgradeStarStyle: React.CSSProperties = {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: compact ? 10 : 14,
    color: '#ffd700',
    textShadow: '0 0 4px rgba(255, 215, 0, 0.8)',
    zIndex: 2,
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '105%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.95)',
    border: `1px solid ${factionColors.primary}`,
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    fontSize: 11,
    whiteSpace: 'nowrap',
    zIndex: 200,
    pointerEvents: 'none',
    maxWidth: 220,
  };

  return (
    <div
      style={containerStyle}
      onClick={disabled ? undefined : onClick}
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable={!!onDragStart}
    >
      {/* Cost crystal */}
      <div style={costStyle}>{displayCost}</div>

      {/* Upgrade star */}
      {shouldShowUpgrade && <div style={upgradeStarStyle}>★</div>}

      {/* Card name */}
      <div style={nameStyle}>{card.name}</div>

      {/* Type badge */}
      <div style={typeBadgeStyle}>{card.type}</div>

      {/* Keywords */}
      {displayKeywords.length > 0 && (
        <div style={keywordsContainerStyle}>
          {displayKeywords.map((kw, i) => (
            <span key={i} style={keywordTagStyle(kw)}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Card text body */}
      <div style={bodyStyle}>
        <span>{displayText}</span>
      </div>

      {/* Bottom stats (minion only) */}
      {card.type === 'Minion' && (
        <div style={bottomRowStyle}>
          <div style={attackStatStyle}>
            <span style={{ fontSize: statIconSize }}>⚔</span>
            {card.attack ?? 0}
          </div>
          <div style={healthStatStyle}>
            <span style={{ fontSize: statIconSize }}>♥</span>
            {card.health ?? 0}
          </div>
        </div>
      )}

      {/* Faction color strip */}
      <div style={factionStripStyle} />

      {/* Hover tooltip */}
      {hovered && !compact && (
        <div style={tooltipStyle}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {card.name} — {card.rarity}
          </div>
          <div style={{ color: '#aaa', fontSize: 10 }}>{displayText}</div>
          {displayKeywords.length > 0 && (
            <div style={{ marginTop: 4, color: '#88bbff', fontSize: 10 }}>
              {displayKeywords.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { CardComponent };
export default CardComponent;

import React, { useState } from 'react';
import type { DungeonRelic } from '../types';

interface RelicBarProps {
  relics: DungeonRelic[];
}

const RELIC_EMOJI_MAP: Record<string, string> = {
  shield: '\uD83D\uDEE1\uFE0F',
  sword: '\u2694\uFE0F',
  heart: '\u2764\uFE0F',
  fire: '\uD83D\uDD25',
  star: '\u2B50',
  crown: '\uD83D\uDC51',
  gem: '\uD83D\uDC8E',
  skull: '\uD83D\uDC80',
  bolt: '\u26A1',
  eye: '\uD83D\uDC41\uFE0F',
  ring: '\uD83D\uDC8D',
  key: '\uD83D\uDD11',
  potion: '\uD83E\uDDEA',
  feather: '\uD83E\uDEB6',
  crystal: '\uD83D\uDD2E',
};

function getRelicIcon(relic: DungeonRelic): string {
  const nameLower = relic.name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(RELIC_EMOJI_MAP)) {
    if (nameLower.includes(keyword)) {
      return emoji;
    }
  }
  // Fallback: first letter of name in a colored circle
  return relic.name.charAt(0).toUpperCase();
}

function getRelicColor(relic: DungeonRelic): string {
  if (relic.isBossRelic) return '#ff4444';
  const triggerColors: Record<string, string> = {
    ON_COMBAT_START: '#4ecdc4',
    ON_CARD_PLAYED: '#45b7d1',
    ON_KILL: '#e63946',
    ON_HERO_HEAL: '#2ecc71',
    ON_TURN_START: '#f39c12',
    ON_MINION_DEATH: '#9b59b6',
    ON_HERO_DEATH: '#e74c3c',
    PASSIVE: '#95a5a6',
  };
  return triggerColors[relic.trigger] || '#aaaaaa';
}

const RelicBar: React.FC<RelicBarProps> = ({ relics }) => {
  const [hoveredRelicId, setHoveredRelicId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (relics.length === 0) return null;

  const showScrollHint = relics.length > 12;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
        padding: '6px 12px',
        boxSizing: 'border-box',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,215,0,0.3) transparent',
        }}
      >
        {relics.map((relic) => {
          const icon = getRelicIcon(relic);
          const color = getRelicColor(relic);
          const isEmoji = icon.length > 1 || icon.charCodeAt(0) > 127;
          const isHovered = hoveredRelicId === relic.id;

          return (
            <div
              key={relic.id}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: '6px',
                border: `2px solid ${relic.isBossRelic ? '#ff4444' : 'rgba(255, 215, 0, 0.6)'}`,
                background: `radial-gradient(circle at 30% 30%, ${color}44, ${color}11)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isHovered
                  ? `0 0 12px ${color}88, inset 0 0 6px ${color}44`
                  : `inset 0 0 4px ${color}22`,
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredRelicId(relic.id);
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
              }}
              onMouseLeave={() => setHoveredRelicId(null)}
            >
              {isEmoji ? (
                <span
                  style={{
                    fontSize: '16px',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {icon}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: color,
                    fontFamily: 'serif',
                    userSelect: 'none',
                  }}
                >
                  {icon}
                </span>
              )}
            </div>
          );
        })}

        {/* Scroll indicator when more than 12 relics */}
        {showScrollHint && (
          <div
            style={{
              flexShrink: 0,
              width: 24,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 215, 0, 0.5)',
              fontSize: '14px',
              userSelect: 'none',
            }}
          >
            &raquo;
          </div>
        )}
      </div>

      {/* Tooltip with name, description, and flavor text */}
      {hoveredRelicId &&
        (() => {
          const relic = relics.find((r) => r.id === hoveredRelicId);
          if (!relic) return null;
          const color = getRelicColor(relic);

          return (
            <div
              style={{
                position: 'fixed',
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: 'rgba(10, 10, 20, 0.95)',
                border: `1px solid ${color}88`,
                borderRadius: '8px',
                padding: '10px 14px',
                maxWidth: '260px',
                minWidth: '160px',
                pointerEvents: 'none',
                boxShadow: `0 4px 20px rgba(0,0,0,0.8), 0 0 8px ${color}33`,
              }}
            >
              {/* Relic name */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: color,
                  marginBottom: '4px',
                  fontFamily: 'sans-serif',
                }}
              >
                {relic.name}
                {relic.isBossRelic && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      color: '#ff4444',
                      fontWeight: 'normal',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Boss
                  </span>
                )}
              </div>

              {/* Full description */}
              <div
                style={{
                  fontSize: '12px',
                  color: '#cccccc',
                  lineHeight: 1.4,
                  marginBottom: relic.flavorText ? '6px' : '0',
                }}
              >
                {relic.description}
              </div>

              {/* Flavor text */}
              {relic.flavorText && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#888888',
                    fontStyle: 'italic',
                    lineHeight: 1.3,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '6px',
                  }}
                >
                  {relic.flavorText}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
};

export default RelicBar;

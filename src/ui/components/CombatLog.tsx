/**
 * STARFORGE TCG - Combat Log / Play-by-Play Tracker
 *
 * Displays a scrollable log of recent game events in human-readable format.
 * Shows attacks, card plays, deaths, hero damage, healing, and turn changes.
 * Hovering over entries with card data shows a mini card tooltip.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { globalCardDatabase } from '../../cards/CardDatabase';

export interface CombatLogEntry {
  id: number;
  turn: number;
  text: string;
  type: 'attack' | 'play' | 'death' | 'damage' | 'heal' | 'turn' | 'keyword' | 'effect' | 'hero_power';
  isPlayer: boolean;
  timestamp: number;
  cardId?: string; // Card definition ID for tooltip
}

interface CombatLogProps {
  entries: CombatLogEntry[];
}

const TYPE_ICONS: Record<CombatLogEntry['type'], string> = {
  attack: '\u2694\uFE0F',
  play: '\uD83C\uDCCF',
  death: '\uD83D\uDC80',
  damage: '\uD83D\uDCA5',
  heal: '\uD83D\uDC9A',
  turn: '\u23F3',
  keyword: '\u2728',
  effect: '\u26A1',
  hero_power: '\uD83D\uDD2E',
};

const TYPE_COLORS: Record<CombatLogEntry['type'], string> = {
  attack: '#ff6600',
  play: '#00ccff',
  death: '#ff4444',
  damage: '#ff8844',
  heal: '#44ff88',
  turn: '#888899',
  keyword: '#ffcc00',
  effect: '#aa88ff',
  hero_power: '#cc66ff',
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9d9d9d',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
};

/** Mini card tooltip shown on hover */
const CardTooltip: React.FC<{ cardId: string }> = ({ cardId }) => {
  const def = globalCardDatabase.getCard(cardId);
  if (!def) return null;

  const rarityColor = RARITY_COLORS[def.rarity] || '#9d9d9d';

  return (
    <div style={tooltipStyles.container}>
      <div style={tooltipStyles.header}>
        <span style={tooltipStyles.cost}>{def.cost}</span>
        <span style={{ ...tooltipStyles.name, color: rarityColor }}>{def.name}</span>
      </div>
      {def.attack !== undefined && def.health !== undefined && (
        <div style={tooltipStyles.stats}>
          <span style={tooltipStyles.attack}>{def.attack}</span>
          <span style={tooltipStyles.separator}>/</span>
          <span style={tooltipStyles.health}>{def.health}</span>
        </div>
      )}
      {def.cardText && (
        <div style={tooltipStyles.cardText}>{def.cardText}</div>
      )}
    </div>
  );
};

export const CombatLog: React.FC<CombatLogProps> = ({ entries }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new entries arrive (newest entries shown first)
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length, isExpanded]);

  const visibleEntries = entries.slice(-30).reverse();

  const handleMouseEnter = (e: React.MouseEvent, cardId?: string) => {
    if (!cardId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ top: rect.top - 4, left: rect.right + 8 });
    setHoveredCardId(cardId);
  };

  const handleMouseLeave = () => {
    setHoveredCardId(null);
  };

  return (
    <div className="combat-log" style={styles.container}>
      {/* Header / Toggle */}
      <div
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.headerIcon}>{'\uD83D\uDCDC'}</span>
        <span style={styles.headerText}>Battle Log</span>
        <span style={styles.entryCount}>{entries.length}</span>
        <span style={styles.toggleArrow}>{isExpanded ? '\u25BC' : '\u25B2'}</span>
      </div>

      {/* Log entries */}
      {isExpanded && (
        <div className="log-body" style={styles.logBody} ref={scrollRef}>
          {visibleEntries.length === 0 ? (
            <div style={styles.emptyLog}>No actions yet...</div>
          ) : (
            visibleEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  ...styles.entry,
                  borderLeft: `3px solid ${TYPE_COLORS[entry.type]}`,
                  cursor: entry.cardId ? 'pointer' : 'default',
                  background: hoveredCardId && entry.cardId === hoveredCardId ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
                onMouseEnter={(e) => handleMouseEnter(e, entry.cardId)}
                onMouseLeave={handleMouseLeave}
              >
                <span style={styles.entryIcon}>{TYPE_ICONS[entry.type]}</span>
                <span className="entry-text" style={{
                  ...styles.entryText,
                  color: entry.type === 'turn' ? '#888899' : '#ccccdd',
                  textDecoration: entry.cardId ? 'underline dotted rgba(255,255,255,0.3)' : 'none',
                }}>
                  {entry.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Card tooltip portal */}
      {hoveredCardId && createPortal(
        <div style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          zIndex: 10000,
          pointerEvents: 'none',
          transform: 'translateY(-100%)',
        }}>
          <CardTooltip cardId={hoveredCardId} />
        </div>,
        document.body
      )}
    </div>
  );
};

const tooltipStyles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '1px solid #ffcc00',
    borderRadius: '8px',
    padding: '8px 12px',
    minWidth: '160px',
    maxWidth: '220px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  cost: {
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#1a5fff',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  name: {
    fontSize: '13px',
    fontWeight: 'bold',
    lineHeight: '1.2',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  attack: {
    color: '#ffcc00',
  },
  separator: {
    color: '#888',
  },
  health: {
    color: '#cc2222',
  },
  cardText: {
    fontSize: '11px',
    color: '#ccccdd',
    lineHeight: '1.4',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '4px',
    marginTop: '2px',
  },
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'absolute',
    top: '50px',
    left: '10px',
    width: '260px',
    zIndex: 400,
    pointerEvents: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: 'rgba(10, 15, 30, 0.85)',
    border: '1px solid #334',
    borderRadius: '6px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerIcon: {
    fontSize: '14px',
  },
  headerText: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#aabbcc',
    flex: 1,
  },
  entryCount: {
    fontSize: '11px',
    color: '#667788',
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '6px',
    padding: '2px 6px',
  },
  toggleArrow: {
    fontSize: '11px',
    color: '#667788',
  },
  logBody: {
    maxHeight: '250px',
    overflowY: 'auto',
    background: 'rgba(10, 15, 30, 0.90)',
    border: '1px solid #334',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    scrollbarWidth: 'thin' as any,
    scrollbarColor: '#334 transparent',
  },
  emptyLog: {
    padding: '10px',
    textAlign: 'center',
    color: '#556677',
    fontSize: '12px',
    fontStyle: 'italic',
  },
  entry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '4px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s ease',
  },
  entryIcon: {
    fontSize: '12px',
    flexShrink: 0,
    marginTop: '1px',
  },
  entryText: {
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#ccccdd',
  },
};

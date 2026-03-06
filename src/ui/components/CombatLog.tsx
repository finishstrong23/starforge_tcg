/**
 * STARFORGE TCG - Combat Log / Play-by-Play Tracker
 *
 * Displays a scrollable log of recent game events in human-readable format.
 * Shows attacks, card plays, deaths, hero damage, healing, and turn changes.
 */

import React, { useEffect, useRef, useState } from 'react';

export interface CombatLogEntry {
  id: number;
  turn: number;
  text: string;
  type: 'attack' | 'play' | 'death' | 'damage' | 'heal' | 'turn' | 'keyword' | 'effect' | 'hero_power';
  isPlayer: boolean;
  timestamp: number;
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

export const CombatLog: React.FC<CombatLogProps> = ({ entries }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, isExpanded]);

  const visibleEntries = entries.slice(-30);

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
                }}
              >
                <span style={styles.entryIcon}>{TYPE_ICONS[entry.type]}</span>
                <span className="entry-text" style={{
                  ...styles.entryText,
                  color: entry.type === 'turn' ? '#888899' : '#ccccdd',
                }}>
                  {entry.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
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

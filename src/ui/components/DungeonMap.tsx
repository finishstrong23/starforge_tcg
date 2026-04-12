/**
 * STARFORGE TCG — Roguelite Dungeon Map Screen
 *
 * Wraps the existing MapView component with run state.
 * Shows act info, HP, gold, relics, and lets player pick next node.
 */

import React, { useState } from 'react';
import { MapView } from '../../dungeon/components/MapView';
import type { DungeonRunSave, MapNode } from '../../dungeon/roguelite/types';
import { findNode, getNextNodes } from '../../dungeon/roguelite/RunManager';
import { RELICS_BY_ID } from '../../dungeon/roguelite/data/relics';
import { hapticTap } from '../capacitor';

interface DungeonMapProps {
  save: DungeonRunSave;
  onSelectNode: (nodeId: string) => void;
  onViewDeck: () => void;
  onAbandon: () => void;
}

const NODE_TYPE_ICONS: Record<string, string> = {
  COMBAT: '\u2694\uFE0F',
  ELITE: '\uD83D\uDC80',
  BOSS: '\uD83D\uDC79',
  REST: '\u26FA',
  SHOP: '\uD83D\uDED2',
  FORGE: '\uD83D\uDD28',
  TREASURE: '\uD83D\uDCE6',
};

export const DungeonMap: React.FC<DungeonMapProps> = ({
  save,
  onSelectNode,
  onViewDeck,
  onAbandon,
}) => {
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const nextNodes = getNextNodes(save);
  const nextNodeIds = new Set(nextNodes.map(n => n.id));

  const handleNodeClick = (nodeId: string) => {
    if (nextNodeIds.has(nodeId)) {
      hapticTap();
      onSelectNode(nodeId);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.actLabel}>Act {save.act} / 3</div>
        <div style={styles.statsRow}>
          <span style={styles.hpBadge}>HP: {save.hp}/{save.maxHp}</span>
          <span style={styles.goldBadge}>Gold: {save.gold}</span>
          <span style={styles.deckBadge}>Deck: {save.deck.length}</span>
        </div>
      </div>

      {/* Relic bar */}
      {save.relics.length > 0 && (
        <div style={styles.relicBar}>
          {save.relics.map(id => {
            const relic = RELICS_BY_ID[id];
            return relic ? (
              <span key={id} style={styles.relicIcon} title={`${relic.name}: ${relic.description}`}>
                {relic.icon}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Map */}
      <div style={styles.mapContainer}>
        <MapView
          map={save.map}
          currentNodeId={save.currentNodeId || ''}
          onSelectNode={handleNodeClick}
          act={save.act}
        />
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(NODE_TYPE_ICONS).map(([type, icon]) => (
          <span key={type} style={styles.legendItem}>
            {icon} {type.charAt(0) + type.slice(1).toLowerCase()}
          </span>
        ))}
      </div>

      {/* Bottom actions */}
      <div style={styles.bottomBar}>
        <button style={styles.actionButton} onClick={onViewDeck}>
          View Deck ({save.deck.length})
        </button>
        <button
          style={{ ...styles.actionButton, ...styles.abandonButton }}
          onClick={() => setShowAbandonConfirm(true)}
        >
          Abandon Run
        </button>
      </div>

      {/* Abandon confirm */}
      {showAbandonConfirm && (
        <div style={styles.overlay}>
          <div style={styles.confirmBox}>
            <p>Abandon this run? All progress will be lost.</p>
            <div style={styles.confirmButtons}>
              <button style={styles.confirmYes} onClick={onAbandon}>Abandon</button>
              <button style={styles.confirmNo} onClick={() => setShowAbandonConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
    color: '#fff',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  actLabel: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
  },
  hpBadge: {
    padding: '4px 10px',
    background: 'rgba(255,60,60,0.2)',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#f88',
  },
  goldBadge: {
    padding: '4px 10px',
    background: 'rgba(255,215,0,0.2)',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#ffd700',
  },
  deckBadge: {
    padding: '4px 10px',
    background: 'rgba(100,149,237,0.2)',
    borderRadius: '12px',
    fontSize: '0.85rem',
    color: '#8af',
  },
  relicBar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexWrap: 'wrap',
  },
  relicIcon: {
    fontSize: '1.4rem',
    cursor: 'help',
  },
  mapContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '10px',
  },
  legend: {
    display: 'flex',
    gap: '12px',
    padding: '8px 16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    fontSize: '0.75rem',
    color: '#aab',
  },
  legendItem: {
    whiteSpace: 'nowrap',
  },
  bottomBar: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    justifyContent: 'center',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  actionButton: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#ddd',
    cursor: 'pointer',
    fontSize: '13px',
  },
  abandonButton: {
    color: '#f66',
    borderColor: 'rgba(255,100,100,0.3)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  confirmBox: {
    background: '#1a1a3e',
    border: '1px solid rgba(255,100,100,0.3)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    maxWidth: '300px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '16px',
  },
  confirmYes: {
    padding: '8px 20px',
    background: 'rgba(255,60,60,0.3)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: '8px',
    color: '#f88',
    cursor: 'pointer',
  },
  confirmNo: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#ddd',
    cursor: 'pointer',
  },
};

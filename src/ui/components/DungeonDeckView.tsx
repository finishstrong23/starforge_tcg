/**
 * STARFORGE TCG — Roguelite Deck Viewer
 *
 * Browse the current run deck and see upgrade history per card.
 */

import React, { useState } from 'react';
import type { DungeonRunSave, SerializedRunCard } from '../../dungeon/roguelite/types';
import { getRunCardDisplayName } from '../../dungeon/roguelite/CardSerializer';
import { UPGRADES_BY_ID } from '../../dungeon/roguelite/data/upgrades';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap } from '../capacitor';

interface DungeonDeckViewProps {
  save: DungeonRunSave;
  onClose: () => void;
}

export const DungeonDeckView: React.FC<DungeonDeckViewProps> = ({
  save,
  onClose,
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const selected = selectedCard
    ? save.deck.find(c => c.runCardId === selectedCard) ?? null
    : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Your Deck</h1>
        <div style={styles.deckCount}>{save.deck.length} cards</div>
      </div>

      <div style={styles.grid}>
        {save.deck.map(rc => {
          const def = globalCardDatabase.getCard(rc.definitionId);
          const isSelected = selectedCard === rc.runCardId;
          return (
            <button
              key={rc.runCardId}
              style={{
                ...styles.card,
                ...(isSelected ? styles.cardSelected : {}),
              }}
              onClick={() => {
                hapticTap();
                setSelectedCard(isSelected ? null : rc.runCardId);
              }}
            >
              <div style={styles.cardName}>{getRunCardDisplayName(rc)}</div>
              {def && (
                <div style={styles.cardCost}>Cost: {def.cost}</div>
              )}
              {def && def.attack !== undefined && (
                <div style={styles.cardStats}>{def.attack}/{def.health}</div>
              )}
              {rc.upgrades.length > 0 && (
                <div style={styles.upgradeCount}>+{rc.upgrades.length} upgrade{rc.upgrades.length > 1 ? 's' : ''}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Card detail panel */}
      {selected && (
        <div style={styles.detailPanel}>
          <CardDetail card={selected} />
        </div>
      )}

      <button style={styles.closeBtn} onClick={onClose}>Close</button>
    </div>
  );
};

const CardDetail: React.FC<{ card: SerializedRunCard }> = ({ card }) => {
  const def = globalCardDatabase.getCard(card.definitionId);

  return (
    <div style={styles.detail}>
      <div style={styles.detailName}>{getRunCardDisplayName(card)}</div>
      {def && (
        <>
          <div style={styles.detailBase}>
            Base: {def.name} | Cost {def.cost}
            {def.attack !== undefined ? ` | ${def.attack}/${def.health}` : ''}
          </div>
          {def.cardText && (
            <div style={styles.detailText}>{def.cardText}</div>
          )}
        </>
      )}

      {card.upgrades.length > 0 ? (
        <div style={styles.upgradeHistory}>
          <div style={styles.historyTitle}>Upgrade History</div>
          {card.upgrades.map((u, i) => {
            const template = UPGRADES_BY_ID[u.templateId];
            return (
              <div key={i} style={styles.historyEntry}>
                <span style={styles.historyIndex}>{i + 1}.</span>
                <span style={styles.historyIcon}>{template?.icon || '?'}</span>
                <span style={styles.historyName}>{template?.name || u.templateId}</span>
                <span style={styles.historyDesc}>{template?.description || ''}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={styles.noUpgrades}>No upgrades applied yet</div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a3e 50%, #0a1a2e 100%)',
    color: '#fff',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.8rem',
    color: '#ffd700',
    margin: 0,
  },
  deckCount: {
    fontSize: '1rem',
    color: '#8af',
    background: 'rgba(100,149,237,0.15)',
    padding: '4px 12px',
    borderRadius: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '8px',
    maxWidth: '700px',
    width: '100%',
    marginBottom: '16px',
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    fontSize: '12px',
  },
  cardSelected: {
    borderColor: '#ffd700',
    background: 'rgba(255,215,0,0.1)',
  },
  cardName: {
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '2px',
    fontSize: '13px',
  },
  cardCost: {
    color: '#8af',
    fontSize: '0.8rem',
  },
  cardStats: {
    color: '#7f7',
    fontSize: '0.8rem',
  },
  upgradeCount: {
    color: '#f90',
    fontSize: '0.75rem',
    marginTop: '2px',
  },
  detailPanel: {
    width: '100%',
    maxWidth: '700px',
    marginBottom: '16px',
  },
  detail: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '10px',
    padding: '16px',
  },
  detailName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '4px',
  },
  detailBase: {
    color: '#aab',
    fontSize: '0.9rem',
    marginBottom: '4px',
  },
  detailText: {
    color: '#ccc',
    fontSize: '0.85rem',
    lineHeight: '1.3',
    marginBottom: '12px',
  },
  upgradeHistory: {
    marginTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '10px',
  },
  historyTitle: {
    fontSize: '0.85rem',
    fontWeight: 'bold',
    color: '#7df',
    marginBottom: '8px',
  },
  historyEntry: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    marginBottom: '6px',
    fontSize: '0.85rem',
  },
  historyIndex: {
    color: '#666',
    minWidth: '18px',
  },
  historyIcon: {
    fontSize: '1rem',
  },
  historyName: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  historyDesc: {
    color: '#aab',
    fontSize: '0.8rem',
  },
  noUpgrades: {
    color: '#666',
    fontSize: '0.85rem',
    fontStyle: 'italic',
    marginTop: '8px',
  },
  closeBtn: {
    marginTop: '12px',
    padding: '10px 30px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#aab',
    cursor: 'pointer',
    fontSize: '13px',
  },
};

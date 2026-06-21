import React, { useState } from 'react';
import type { CardInstance } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { getCardCost } from '../engine/cardStats';

interface DeckViewerProps {
  onClose: () => void;
}

type SortKey = 'cost' | 'name' | 'type' | 'faction';

function sortDeck(deck: CardInstance[], key: SortKey): CardInstance[] {
  return [...deck].sort((a, b) => {
    const ac = getCardCost(a);
    const bc = getCardCost(b);
    switch (key) {
      case 'cost': return ac - bc || a.name.localeCompare(b.name);
      case 'name': return a.name.localeCompare(b.name);
      case 'type': return a.type.localeCompare(b.type) || ac - bc;
      case 'faction': return a.faction.localeCompare(b.faction) || ac - bc;
      default: return 0;
    }
  });
}

export const DeckViewer: React.FC<DeckViewerProps> = ({ onClose }) => {
  const { runState } = useDungeonRun();
  const [sort, setSort] = useState<SortKey>('cost');

  const deck = runState?.deck ?? [];
  const sorted = sortDeck(deck, sort);

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'cost', label: 'Cost' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'faction', label: 'Faction' },
  ];

  const sortBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 10px', background: active ? '#1e1e3a' : 'transparent',
    border: active ? '1px solid #3a3a5a' : '1px solid #1a1a2e',
    color: active ? '#ccc' : '#666', borderRadius: 3, fontSize: 9, cursor: 'pointer',
    letterSpacing: '0.1em', textTransform: 'uppercase',
  });

  const s: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 150,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    panel: {
      width: '100%',
      maxWidth: 560,
      height: '100%',
      background: '#0c0c1a',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: '1px solid #1a1a2e',
      flexShrink: 0,
    },
    title: {
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: 0,
    },
    closeBtn: {
      background: 'transparent',
      border: '1px solid #2a2a3a',
      color: '#aaa',
      padding: '4px 12px',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      letterSpacing: '0.1em',
    },
    sortRow: {
      display: 'flex',
      gap: 6,
      padding: '8px 14px',
      borderBottom: '1px solid #111120',
      flexShrink: 0,
    },
    meta: {
      padding: '4px 14px 6px',
      fontSize: 9,
      opacity: 0.35,
      letterSpacing: '0.1em',
      flexShrink: 0,
    },
    grid: {
      flex: 1,
      overflowY: 'auto',
      padding: '10px 12px 16px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      alignContent: 'flex-start',
      justifyContent: 'center',
    },
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.panel}>
        <div style={s.header}>
          <h3 style={s.title}>Deck - {deck.length} cards</h3>
          <button type="button" style={s.closeBtn} onClick={onClose}>Close</button>
        </div>

        <div style={s.sortRow}>
          <span style={{ fontSize: 9, color: '#555', alignSelf: 'center', marginRight: 4, letterSpacing: '0.1em' }}>
            SORT:
          </span>
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              style={sortBtnStyle(sort === key)}
              onClick={() => setSort(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={s.meta}>
          {deck.filter((c) => c.upgraded).length} upgraded -{' '}
          {deck.filter((c) => c.type === 'Attack').length} attacks -{' '}
          {deck.filter((c) => c.type === 'Skill').length} skills -{' '}
          {deck.filter((c) => c.type === 'Power').length} powers
        </div>

        <div style={s.grid}>
          {sorted.map((card) => (
            <CardComponent key={card.instanceId} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
};

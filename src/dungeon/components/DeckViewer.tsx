import React, { useState, useEffect, useCallback } from 'react';
import type { RunCard } from '../types';
import { CardComponent } from './CardComponent';

type TabKey = 'deck' | 'draw' | 'discard' | 'exhaust';
type SortKey = 'cost' | 'name' | 'faction' | 'type';

interface DeckViewerProps {
  deck: RunCard[];
  drawPile: RunCard[];
  discardPile: RunCard[];
  exhaustPile: RunCard[];
  isOpen: boolean;
  onClose: () => void;
  activeTab?: TabKey;
}

const TAB_CONFIG: { key: TabKey; label: string }[] = [
  { key: 'deck', label: 'Full Deck' },
  { key: 'draw', label: 'Draw Pile' },
  { key: 'discard', label: 'Discard' },
  { key: 'exhaust', label: 'Exhaust' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'cost', label: 'Cost' },
  { key: 'name', label: 'Name' },
  { key: 'faction', label: 'Faction' },
  { key: 'type', label: 'Type' },
];

function sortCards(cards: RunCard[], sortBy: SortKey): RunCard[] {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return (
          (a.upgraded && a.upgradedCost != null ? a.upgradedCost : a.cost) -
            (b.upgraded && b.upgradedCost != null ? b.upgradedCost : b.cost) ||
          a.name.localeCompare(b.name)
        );
      case 'name':
        return a.name.localeCompare(b.name);
      case 'faction':
        return a.faction.localeCompare(b.faction) || a.name.localeCompare(b.name);
      case 'type':
        return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
  return sorted;
}

const FADE_IN_KEYFRAMES = `
@keyframes deckViewerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes deckViewerSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const DeckViewer: React.FC<DeckViewerProps> = ({
  deck,
  drawPile,
  discardPile,
  exhaustPile,
  isOpen,
  onClose,
  activeTab: initialTab,
}) => {
  const [currentTab, setCurrentTab] = useState<TabKey>(initialTab || 'deck');
  const [sortBy, setSortBy] = useState<SortKey>('cost');

  // Reset tab when opened with a specific tab
  useEffect(() => {
    if (isOpen && initialTab) {
      setCurrentTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Click outside content area closes the viewer
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const pileMap: Record<TabKey, RunCard[]> = {
    deck,
    draw: drawPile,
    discard: discardPile,
    exhaust: exhaustPile,
  };

  const currentCards = sortCards(pileMap[currentTab], sortBy);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'deckViewerFadeIn 0.25s ease-out',
      }}
      onClick={handleOverlayClick}
    >
      <style>{FADE_IN_KEYFRAMES}</style>

      {/* Content container */}
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'deckViewerSlideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (X) in top-right corner */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(255,255,255,0.1)';
          }}
        >
          &times;
        </button>

        {/* Tab bar: Full Deck (N) | Draw Pile (N) | Discard (N) | Exhaust (N) */}
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '16px 16px 0',
            flexShrink: 0,
          }}
        >
          {TAB_CONFIG.map(({ key, label }) => {
            const count = pileMap[key].length;
            const isActive = currentTab === key;

            return (
              <button
                key={key}
                onClick={() => setCurrentTab(key)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid #ffd700'
                    : '2px solid transparent',
                  background: isActive
                    ? 'rgba(255, 215, 0, 0.1)'
                    : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#ffd700' : '#888888',
                  fontSize: '13px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontFamily: 'sans-serif',
                  cursor: 'pointer',
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#bbbbbb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#888888';
                  }
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort options: by cost, by name, by faction, by type */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'sans-serif',
            }}
          >
            Sort:
          </span>
          {SORT_OPTIONS.map(({ key, label }) => {
            const isActive = sortBy === key;
            return (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: '4px 10px',
                  border: isActive
                    ? '1px solid rgba(255,215,0,0.5)'
                    : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(255,215,0,0.15)' : 'transparent',
                  color: isActive ? '#ffd700' : '#888',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontFamily: 'sans-serif',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Responsive card grid (3-4 columns) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,215,0,0.3) transparent',
          }}
        >
          {currentCards.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#555',
                fontSize: '14px',
                fontFamily: 'sans-serif',
                padding: '60px 0',
              }}
            >
              No cards in this pile.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px',
                justifyItems: 'center',
              }}
            >
              {currentCards.map((card) => (
                <CardComponent
                  key={card.instanceId}
                  card={card}
                  compact={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeckViewer;

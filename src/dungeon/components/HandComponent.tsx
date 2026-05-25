import React from 'react';
import type { CardInstance } from '../types';
import { CardComponent } from './CardComponent';
import { getCardCost } from '../engine/cardStats';

export interface HandComponentProps {
  hand: CardInstance[];
  energy: number;
  selectedId: string | null;
  onCardSelect: (instanceId: string) => void;
  disabled?: boolean;
  drawCount?: number;
  discardCount?: number;
  previews?: Record<string, string[]>;
}

const PileBadge: React.FC<{ label: string; count: number; color: string; emoji: string }> = ({
  label, count, color, emoji,
}) => (
  <div
    title={`${label}: ${count}`}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 44,
      padding: '4px 6px',
      background: '#0c0c1a',
      border: `1px solid ${color}55`,
      borderRadius: 5,
      gap: 1,
      flexShrink: 0,
    }}
  >
    <div style={{ fontSize: 14, lineHeight: 1, color }}>{emoji}</div>
    <div style={{ fontSize: 13, fontWeight: 800, color: '#eee', lineHeight: 1 }}>{count}</div>
    <div style={{ fontSize: 7, letterSpacing: '0.15em', opacity: 0.55, textTransform: 'uppercase' }}>
      {label}
    </div>
  </div>
);

export const HandComponent: React.FC<HandComponentProps> = ({
  hand,
  energy,
  selectedId,
  onCardSelect,
  disabled = false,
  drawCount,
  discardCount,
  previews = {},
}) => {
  const showPiles = drawCount !== undefined || discardCount !== undefined;

  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      padding: '4px 8px 0',
      width: '100%',
    },
    label: {
      fontSize: 9,
      letterSpacing: '0.2em',
      opacity: 0.35,
      textTransform: 'uppercase',
      paddingLeft: 4,
      marginBottom: 4,
    },
    handCol: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
    },
    row: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
    },
    pilesCol: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-end',
      flexShrink: 0,
    },
  };

  return (
    <div style={s.wrapper}>
      {/* Draw pile (left) */}
      {showPiles && (
        <PileBadge label="Draw" count={drawCount ?? 0} color="#3b8fff" emoji="🂠" />
      )}

      {/* Hand (center) */}
      <div style={s.handCol}>
        <div style={s.label}>Hand ({hand.length})</div>
        {hand.length === 0 ? (
          <div style={{ ...s.label, alignSelf: 'center', opacity: 0.4, paddingTop: 4 }}>
            No cards in hand
          </div>
        ) : (
          <div style={s.row}>
            {hand.map((card) => {
              const affordable = getCardCost(card) <= energy;
              const isSelected = card.instanceId === selectedId;
              return (
                <CardComponent
                  key={card.instanceId}
                  card={card}
                  selectable={!disabled && affordable}
                  selected={isSelected}
                  unaffordable={!affordable}
                  previewLines={previews[card.instanceId]}
                  onClick={!disabled && affordable ? () => onCardSelect(card.instanceId) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Discard pile (right) */}
      {showPiles && (
        <PileBadge label="Discard" count={discardCount ?? 0} color="#c89b3c" emoji="🃏" />
      )}
    </div>
  );
};

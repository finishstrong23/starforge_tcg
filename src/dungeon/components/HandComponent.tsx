import React from 'react';
import type { CardInstance } from '../types';
import { CardComponent } from './CardComponent';
import { getCardCost } from '../engine/cardStats';
import { uiArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

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

const PileBadge: React.FC<{ label: string; count: number; color: string; fallback: string; src: string }> = ({
  label, count, color, fallback, src,
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
    <TokenArt
      src={src}
      fallback={fallback}
      alt=""
      style={{ width: 24, height: 24 }}
      fallbackStyle={{ fontSize: 14, lineHeight: 1, color }}
    />
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
    emptyState: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      color: '#aaa',
      opacity: 0.72,
      paddingTop: 2,
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
        <PileBadge label="Draw" count={drawCount ?? 0} color="#3b8fff" fallback="D" src={uiArt.drawPile} />
      )}

      {/* Hand (center) */}
      <div style={s.handCol}>
        <div style={s.label}>Hand ({hand.length})</div>
        {hand.length === 0 ? (
          <div style={s.emptyState}>
            <TokenArt
              src={uiArt.cardBack}
              fallback="CB"
              alt=""
              style={{ width: 22, height: 22 }}
              fallbackStyle={{ fontSize: 11, lineHeight: 1 }}
            />
            <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              No cards in hand
            </span>
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
        <PileBadge label="Discard" count={discardCount ?? 0} color="#c89b3c" fallback="X" src={uiArt.discardPile} />
      )}
    </div>
  );
};

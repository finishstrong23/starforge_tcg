import React from 'react';
import type { CardInstance } from '../types';
import { CardComponent } from './CardComponent';

export interface HandComponentProps {
  hand: CardInstance[];
  energy: number;
  selectedId: string | null;
  onCardSelect: (instanceId: string) => void;
  disabled?: boolean;
}

export const HandComponent: React.FC<HandComponentProps> = ({
  hand,
  energy,
  selectedId,
  onCardSelect,
  disabled = false,
}) => {
  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '4px 6px 0',
      width: '100%',
    },
    label: {
      fontSize: 9,
      letterSpacing: '0.2em',
      opacity: 0.35,
      textTransform: 'uppercase',
      alignSelf: 'flex-start',
      paddingLeft: 4,
    },
    row: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
    },
  };

  if (hand.length === 0) {
    return (
      <div style={s.wrapper}>
        <div style={{ ...s.label, alignSelf: 'center', paddingTop: 8 }}>No cards in hand</div>
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <div style={s.label}>Hand ({hand.length})</div>
      <div style={s.row}>
        {hand.map((card) => {
          const affordable = card.cost <= energy;
          const isSelected = card.instanceId === selectedId;
          return (
            <CardComponent
              key={card.instanceId}
              card={card}
              selectable={!disabled && affordable}
              selected={isSelected}
              unaffordable={!affordable}
              onClick={!disabled && affordable ? () => onCardSelect(card.instanceId) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

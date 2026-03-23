import React from 'react';
import type { RunCard, DungeonRelic } from '../types';
import CardComponent from './CardComponent';

interface HandComponentProps {
  cards: RunCard[];
  energy: number;
  relics: DungeonRelic[];
  hasHealedThisTurn: boolean;
  onPlayCard: (instanceId: string) => void;
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  disabled?: boolean;
}

/**
 * Compute effective cost of a card after relic reductions.
 */
function computeEffectiveCost(card: RunCard, relics: DungeonRelic[]): number {
  let cost = card.upgraded && card.upgradedCost != null ? card.upgradedCost : card.cost;

  for (const relic of relics) {
    if (relic.effect.type === 'COST_REDUCTION') {
      if (!relic.effect.condition || matchesCondition(card, relic.effect.condition)) {
        cost = Math.max(0, cost - relic.effect.value);
      }
    }
  }

  return cost;
}

function matchesCondition(card: RunCard, condition: string): boolean {
  const lower = condition.toLowerCase();
  if (lower === 'minion' || lower === 'spell' || lower === 'structure') {
    return card.type.toLowerCase() === lower;
  }
  if (lower === card.faction.toLowerCase()) {
    return true;
  }
  return true;
}

const MAX_VISIBLE = 10;

const HandComponent: React.FC<HandComponentProps> = ({
  cards,
  energy,
  relics,
  hasHealedThisTurn: _hasHealedThisTurn,
  onPlayCard,
  selectedCardId,
  onSelectCard,
  disabled = false,
}) => {
  const visibleCards = cards.slice(0, MAX_VISIBLE);
  const hasOverflow = cards.length > MAX_VISIBLE;

  // Compute arc rotation for each card in the fan
  const count = visibleCards.length;
  const maxRotation = Math.min(count * 2, 15); // cap the fan angle

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: '10px 20px 0',
    minHeight: 220,
    width: '100%',
    overflowX: hasOverflow ? 'auto' : 'visible',
    overflowY: 'visible',
    pointerEvents: disabled ? 'none' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const handleCardClick = (card: RunCard) => {
    if (disabled) return;

    if (selectedCardId === card.instanceId) {
      // Deselect, then play
      onSelectCard(null);
      const effectiveCost = computeEffectiveCost(card, relics);
      if (effectiveCost <= energy) {
        onPlayCard(card.instanceId);
      }
    } else {
      onSelectCard(card.instanceId);
    }
  };

  return (
    <div style={containerStyle}>
      {visibleCards.map((card, index) => {
        const effectiveCost = computeEffectiveCost(card, relics);
        const canAfford = effectiveCost <= energy;
        const isSelected = selectedCardId === card.instanceId;

        // Fan arc calculations
        const midpoint = (count - 1) / 2;
        const offset = index - midpoint;
        const rotation = count <= 1 ? 0 : (offset / midpoint) * maxRotation;
        const verticalOffset = count <= 1 ? 0 : Math.abs(offset) * 6;

        const cardWrapperStyle: React.CSSProperties = {
          display: 'inline-flex',
          marginLeft: index === 0 ? 0 : -20,
          transform: `rotate(${rotation}deg) translateY(${verticalOffset}px)`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.2s ease, margin 0.2s ease',
          zIndex: isSelected ? 50 : index,
          position: 'relative',
        };

        const hoverWrapperStyle: React.CSSProperties = {
          ...cardWrapperStyle,
        };

        return (
          <div
            key={card.instanceId}
            style={hoverWrapperStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = `rotate(${rotation}deg) translateY(${verticalOffset - 30}px)`;
              el.style.zIndex = '50';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.transform = `rotate(${rotation}deg) translateY(${verticalOffset}px)`;
              el.style.zIndex = isSelected ? '50' : String(index);
            }}
          >
            <CardComponent
              card={card}
              onClick={() => handleCardClick(card)}
              disabled={!canAfford || disabled}
              selected={isSelected}
              effectiveCost={effectiveCost}
            />
          </div>
        );
      })}
      {hasOverflow && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 8,
            color: '#aaa',
            fontSize: 11,
            background: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          +{cards.length - MAX_VISIBLE} more
        </div>
      )}
    </div>
  );
};

export default HandComponent;

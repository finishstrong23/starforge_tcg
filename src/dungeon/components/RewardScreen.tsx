import React, { useState, useEffect } from 'react';
import type { DungeonCardDefinition, DungeonRelic, RewardState } from '../types';
import { CardComponent } from './CardComponent';

interface RewardScreenProps {
  reward: RewardState;
  onPickCard: (cardId: string) => void;
  onPickRelic: (relicId: string) => void;
  onSkip: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.88)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  fontFamily: 'sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 'bold',
  letterSpacing: 6,
  textTransform: 'uppercase',
  marginBottom: 8,
  background: 'linear-gradient(135deg, #ffd700, #ffaa00, #ffd700)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 0 16px rgba(255, 215, 0, 0.5))',
};

const goldContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 24,
  padding: '8px 20px',
  background: 'rgba(255, 215, 0, 0.1)',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  borderRadius: 20,
};

const goldAmountStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#ffd700',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 12,
};

const cardsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 20,
};

const cardWrapperStyle = (hovered: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
});

const addButtonStyle = (hovered: boolean): React.CSSProperties => ({
  padding: '6px 20px',
  fontSize: 12,
  fontWeight: 'bold',
  letterSpacing: 1,
  textTransform: 'uppercase',
  background: hovered
    ? 'linear-gradient(135deg, #5ab8ff, #2a6abb)'
    : 'linear-gradient(135deg, #4a9eff, #1a5abb)',
  color: '#fff',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background 0.15s ease',
});

const relicContainerStyle = (hovered: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 16,
  background: hovered ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  border: `2px solid ${hovered ? '#ffd700' : 'rgba(255, 215, 0, 0.25)'}`,
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  maxWidth: 280,
  textAlign: 'center' as const,
  marginBottom: 20,
  transform: hovered ? 'scale(1.03)' : 'scale(1)',
  boxShadow: hovered ? '0 0 20px rgba(255, 215, 0, 0.2)' : 'none',
});

const skipButtonStyle: React.CSSProperties = {
  padding: '10px 32px',
  fontSize: 14,
  fontWeight: 'bold',
  letterSpacing: 2,
  textTransform: 'uppercase',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#888',
  border: '2px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  marginTop: 8,
};

const continueButtonStyle: React.CSSProperties = {
  padding: '12px 40px',
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 3,
  textTransform: 'uppercase',
  background: 'linear-gradient(135deg, #ffd700, #cc9900)',
  color: '#000',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  marginTop: 16,
};

const RewardScreen: React.FC<RewardScreenProps> = ({
  reward,
  onPickCard,
  onPickRelic,
  onSkip,
}) => {
  const [displayedGold, setDisplayedGold] = useState(0);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoveredRelic, setHoveredRelic] = useState(false);
  const [picked, setPicked] = useState(false);

  // Animated gold counter
  useEffect(() => {
    if (reward.gold <= 0) {
      setDisplayedGold(0);
      return;
    }

    let current = 0;
    const target = reward.gold;
    const step = Math.max(1, Math.floor(target / 20));
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayedGold(current);
      if (current >= target) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [reward.gold]);

  const handlePickCard = (cardId: string) => {
    setPicked(true);
    onPickCard(cardId);
  };

  const handlePickRelic = (relicId: string) => {
    setPicked(true);
    onPickRelic(relicId);
  };

  const showContinue = picked || reward.picked;

  return (
    <div style={overlayStyle}>
      {/* Title */}
      <div style={titleStyle}>VICTORY!</div>

      {/* Gold earned */}
      {reward.gold > 0 && (
        <div style={goldContainerStyle}>
          <span style={{ fontSize: 22 }}>&#x1FA99;</span>
          <span style={goldAmountStyle}>+{displayedGold}</span>
          <span style={{ fontSize: 13, color: '#aa8800' }}>gold</span>
        </div>
      )}

      {/* Card choices */}
      {!showContinue && reward.cardOptions.length > 0 && (
        <>
          <div style={sectionLabelStyle}>Choose a card to add to your deck</div>
          <div style={cardsRowStyle}>
            {reward.cardOptions.map((card) => {
              const isHovered = hoveredCardId === card.id;
              return (
                <div
                  key={card.id}
                  style={cardWrapperStyle(isHovered)}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  <CardComponent
                    card={card}
                    onClick={() => handlePickCard(card.id)}
                  />
                  <button
                    style={addButtonStyle(isHovered)}
                    onClick={() => handlePickCard(card.id)}
                  >
                    ADD TO DECK
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Relic option */}
      {!showContinue && reward.relicOptions.length > 0 && (
        <>
          <div style={sectionLabelStyle}>Relic</div>
          {reward.relicOptions.map((relic) => (
            <div
              key={relic.id}
              style={relicContainerStyle(hoveredRelic)}
              onClick={() => handlePickRelic(relic.id)}
              onMouseEnter={() => setHoveredRelic(true)}
              onMouseLeave={() => setHoveredRelic(false)}
            >
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffd700', marginBottom: 6 }}>
                {relic.name}
              </div>
              <div style={{ fontSize: 12, color: '#ccc', marginBottom: 6, lineHeight: 1.4 }}>
                {relic.description}
              </div>
              <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                {relic.flavorText}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Skip button (only before picking) */}
      {!showContinue && (
        <button
          style={skipButtonStyle}
          onClick={onSkip}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ccc';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#888';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          SKIP
        </button>
      )}

      {/* Continue button (after picking or skipping handled externally via reward.picked) */}
      {showContinue && (
        <button
          style={continueButtonStyle}
          onClick={onSkip}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 18px rgba(255, 215, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          CONTINUE
        </button>
      )}
    </div>
  );
};

export { RewardScreen };
export default RewardScreen;

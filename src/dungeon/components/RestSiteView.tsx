import React, { useState } from 'react';
import type { RunCard } from '../types';
import { CardComponent } from './CardComponent';
import { getUpgradePreview, canUpgrade } from '../engine/cardUpgrade';

interface RestSiteViewProps {
  heroHealth: number;
  maxHeroHealth: number;
  deck: RunCard[];
  onHeal: () => void;
  onUpgrade: (instanceId: string) => void;
  onLeave: () => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at center bottom, #2a1a0a 0%, #1a0f05 40%, #0a0a0a 100%)',
  padding: '24px 16px',
  color: '#fff',
  fontFamily: 'sans-serif',
};

const ambientGlowStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '10%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 300,
  height: 200,
  borderRadius: '50%',
  background: 'radial-gradient(ellipse, rgba(255, 160, 50, 0.15) 0%, transparent 70%)',
  pointerEvents: 'none',
  zIndex: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 'bold',
  letterSpacing: 3,
  textTransform: 'uppercase',
  marginBottom: 8,
  color: '#ffaa44',
  textShadow: '0 0 20px rgba(255, 170, 68, 0.4)',
  zIndex: 1,
};

const healthBarContainerStyle: React.CSSProperties = {
  width: 240,
  height: 20,
  borderRadius: 10,
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  marginBottom: 24,
  position: 'relative',
  zIndex: 1,
};

const healthBarFillStyle = (pct: number): React.CSSProperties => ({
  width: `${pct}%`,
  height: '100%',
  background: pct > 50
    ? 'linear-gradient(90deg, #44cc44, #66ee66)'
    : pct > 25
      ? 'linear-gradient(90deg, #cccc44, #eeee66)'
      : 'linear-gradient(90deg, #cc4444, #ee6666)',
  transition: 'width 0.5s ease',
});

const healthTextStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 'bold',
  color: '#fff',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
};

const optionsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 24,
  zIndex: 1,
};

const optionButtonStyle = (
  type: 'heal' | 'upgrade',
  hovered: boolean
): React.CSSProperties => {
  const isHeal = type === 'heal';
  const glowColor = isHeal ? 'rgba(68, 204, 68, 0.3)' : 'rgba(255, 215, 0, 0.3)';
  const borderColor = isHeal ? '#44cc44' : '#ffd700';
  const bgHover = isHeal
    ? 'rgba(68, 204, 68, 0.12)'
    : 'rgba(255, 215, 0, 0.12)';
  return {
    width: 200,
    padding: '24px 16px',
    borderRadius: 14,
    border: `2px solid ${hovered ? borderColor : 'rgba(255, 255, 255, 0.15)'}`,
    background: hovered ? bgHover : 'rgba(255, 255, 255, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    textAlign: 'center' as const,
    transform: hovered ? 'scale(1.05)' : 'scale(1)',
    boxShadow: hovered ? `0 0 24px ${glowColor}` : 'none',
  };
};

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
};

const deckGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  justifyContent: 'center',
  maxWidth: 720,
  maxHeight: '55vh',
  overflowY: 'auto',
  padding: 16,
};

const previewContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  alignItems: 'center',
  marginBottom: 20,
};

const arrowStyle: React.CSSProperties = {
  fontSize: 28,
  color: '#ffd700',
  textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
};

const continueButtonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: '12px 40px',
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 3,
  textTransform: 'uppercase',
  background: 'linear-gradient(135deg, #ffaa44, #cc7722)',
  color: '#fff',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  zIndex: 1,
};

const RestSiteView: React.FC<RestSiteViewProps> = ({
  heroHealth,
  maxHeroHealth,
  deck,
  onHeal,
  onUpgrade,
  onLeave,
}) => {
  const [hoveredOption, setHoveredOption] = useState<'heal' | 'upgrade' | null>(null);
  const [mode, setMode] = useState<'choose' | 'upgrade' | 'done'>('choose');
  const [selectedCard, setSelectedCard] = useState<RunCard | null>(null);

  const healAmount = Math.floor(maxHeroHealth * 0.3);
  const healthPct = Math.round((heroHealth / maxHeroHealth) * 100);

  const handleHeal = () => {
    onHeal();
    setMode('done');
  };

  const handleSelectUpgradeMode = () => {
    setMode('upgrade');
  };

  const handleCardClick = (card: RunCard) => {
    if (!canUpgrade(card)) return;
    setSelectedCard(card);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedCard) return;
    onUpgrade(selectedCard.instanceId);
    setSelectedCard(null);
    setMode('done');
  };

  // ─── Upgrade Card Selection ────────────────────────────────
  if (mode === 'upgrade') {
    const preview = selectedCard ? getUpgradePreview(selectedCard) : null;

    return (
      <div style={overlayStyle}>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffd700', marginBottom: 4 }}>
          UPGRADE A CARD
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
          Choose a card to upgrade. Upgradeable cards are highlighted.
        </div>

        {/* Before / After preview */}
        {selectedCard && preview && (
          <div style={previewContainerStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>BEFORE</div>
              <CardComponent card={selectedCard} />
            </div>
            <div style={arrowStyle}>&rarr;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#ffd700', marginBottom: 4 }}>AFTER</div>
              <CardComponent card={preview} showUpgrade />
            </div>
          </div>
        )}

        {/* Deck grid */}
        <div style={deckGridStyle}>
          {deck.map((card) => {
            const upgradeable = canUpgrade(card);
            const isSelected = selectedCard?.instanceId === card.instanceId;
            return (
              <CardComponent
                key={card.instanceId}
                card={card}
                compact
                disabled={!upgradeable}
                selected={isSelected}
                onClick={upgradeable ? () => handleCardClick(card) : undefined}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {selectedCard && (
            <button
              onClick={handleConfirmUpgrade}
              style={{
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ffd700, #cc9900)',
                color: '#000',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 6,
                cursor: 'pointer',
                letterSpacing: 1,
              }}
            >
              CONFIRM UPGRADE
            </button>
          )}
          <button
            onClick={() => {
              setSelectedCard(null);
              setMode('choose');
            }}
            style={{
              padding: '8px 24px',
              fontSize: 14,
              fontWeight: 'bold',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#aaa',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            BACK
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Rest Site / Done ──────────────────────────────────
  return (
    <div style={containerStyle}>
      {/* Ambient warm glow */}
      <div style={ambientGlowStyle} />

      {/* Title */}
      <div style={titleStyle}>
        REST SITE &#x1F525;
      </div>

      {/* Health bar */}
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6, zIndex: 1 }}>
        HP: {heroHealth} / {maxHeroHealth}
      </div>
      <div style={healthBarContainerStyle}>
        <div style={healthBarFillStyle(healthPct)} />
        <div style={healthTextStyle}>
          {heroHealth} / {maxHeroHealth}
        </div>
      </div>

      {mode === 'choose' ? (
        <>
          {/* Option buttons */}
          <div style={optionsRowStyle}>
            {/* REST / Heal */}
            <div
              style={optionButtonStyle('heal', hoveredOption === 'heal')}
              onClick={handleHeal}
              onMouseEnter={() => setHoveredOption('heal')}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>&#x2764;&#xFE0F;</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#44cc44', marginBottom: 6 }}>
                REST
              </div>
              <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.4 }}>
                Heal <span style={{ color: '#44cc44', fontWeight: 'bold' }}>{healAmount} HP</span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                (30% of max health)
              </div>
            </div>

            {/* UPGRADE */}
            <div
              style={optionButtonStyle('upgrade', hoveredOption === 'upgrade')}
              onClick={handleSelectUpgradeMode}
              onMouseEnter={() => setHoveredOption('upgrade')}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>&#x1F528;</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ffd700', marginBottom: 6 }}>
                UPGRADE
              </div>
              <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.4 }}>
                Upgrade a card in your deck
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                Enhance stats or reduce cost
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Done state — show continue */
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 16, color: '#aaa', marginBottom: 8 }}>
            You feel refreshed and ready to continue.
          </div>
        </div>
      )}

      {/* Continue / Leave button */}
      {mode === 'done' && (
        <button
          style={continueButtonStyle}
          onClick={onLeave}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 0 15px rgba(255, 170, 68, 0.4)';
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

export { RestSiteView };
export default RestSiteView;

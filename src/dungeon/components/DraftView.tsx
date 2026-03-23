import React, { useState } from 'react';
import type { DungeonCardDefinition, DungeonFaction, DungeonRelic } from '../types';
import { CardComponent } from './CardComponent';
import { ALL_FACTIONS, FACTION_COLORS } from '../types';

interface DraftViewProps {
  draftRound: number;
  draftFaction: DungeonFaction | null;
  draftOptions: DungeonCardDefinition[];
  draftRelicOptions: DungeonRelic[];
  currentDeck: { id: string; name: string; faction: string; cost: number }[];
  onSelectFaction: (faction: DungeonFaction) => void;
  onPickCard: (cardId: string) => void;
  onPickRelic: (relicId: string) => void;
}

const FACTION_DESCRIPTIONS: Record<DungeonFaction, string> = {
  Cogsmiths: 'Mechs & Last Words \u2014 Chain explosions from fallen machines',
  Pyroclast: 'Fire & Immolate \u2014 Burn everything to the ground',
  Luminar: 'Healing & Illuminate \u2014 Outlast and overwhelm',
  PhantomCorsairs: 'Stealth & Phase \u2014 Strike from the shadows',
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
  padding: '24px 16px',
  color: '#fff',
  fontFamily: 'sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 'bold',
  letterSpacing: 3,
  textTransform: 'uppercase',
  marginBottom: 8,
  textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
  color: '#ffd700',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#aaa',
  marginBottom: 24,
};

const factionGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  maxWidth: 500,
  width: '100%',
};

const cardRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const mainContentStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  width: '100%',
  maxWidth: 900,
  justifyContent: 'center',
};

const draftAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flex: 1,
};

const sidebarStyle: React.CSSProperties = {
  width: 200,
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: 10,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: 12,
  maxHeight: 500,
  overflowY: 'auto',
};

const sidebarTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 'bold',
  color: '#ffd700',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

const deckEntryStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  fontSize: 12,
  color: '#ccc',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const costBadgeStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #4a9eff, #1a5abb)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 10,
  fontWeight: 'bold',
  color: '#fff',
  flexShrink: 0,
};

const pickButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 24px',
  fontSize: 14,
  fontWeight: 'bold',
  letterSpacing: 2,
  textTransform: 'uppercase',
  background: 'linear-gradient(135deg, #4a9eff, #1a5abb)',
  color: '#fff',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const relicCardStyle: React.CSSProperties = {
  width: 220,
  padding: 16,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '2px solid rgba(255, 215, 0, 0.3)',
  borderRadius: 10,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, border-color 0.15s ease',
  textAlign: 'center',
};

const DraftView: React.FC<DraftViewProps> = ({
  draftRound,
  draftFaction,
  draftOptions,
  draftRelicOptions,
  currentDeck,
  onSelectFaction,
  onPickCard,
  onPickRelic,
}) => {
  const [hoveredFaction, setHoveredFaction] = useState<DungeonFaction | null>(null);
  const [hoveredRelic, setHoveredRelic] = useState<string | null>(null);
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);

  // ─── Faction Select (Round 0) ─────────────────────────────
  if (draftRound === 0) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>CHOOSE YOUR FACTION</div>
        <div style={subtitleStyle}>Each faction has a unique playstyle and card pool</div>
        <div style={factionGridStyle}>
          {ALL_FACTIONS.map((faction) => {
            const colors = FACTION_COLORS[faction];
            const isHovered = hoveredFaction === faction;
            const buttonStyle: React.CSSProperties = {
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${isHovered ? colors.primary : 'rgba(255,255,255,0.15)'}`,
              background: isHovered
                ? `linear-gradient(135deg, ${colors.bg}, rgba(255,255,255,0.08))`
                : colors.bg,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isHovered ? `0 0 20px ${colors.primary}44` : 'none',
              textAlign: 'center' as const,
            };
            return (
              <div
                key={faction}
                style={buttonStyle}
                onClick={() => onSelectFaction(faction)}
                onMouseEnter={() => setHoveredFaction(faction)}
                onMouseLeave={() => setHoveredFaction(null)}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: colors.primary,
                    marginBottom: 8,
                  }}
                >
                  {faction}
                </div>
                <div style={{ fontSize: 12, color: '#bbb', lineHeight: 1.4 }}>
                  {FACTION_DESCRIPTIONS[faction]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Relic Draft (Round 10) ───────────────────────────────
  if (draftRound === 10) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>CHOOSE A RELIC</div>
        <div style={subtitleStyle}>Relics provide powerful passive bonuses for your run</div>
        <div style={cardRowStyle}>
          {draftRelicOptions.map((relic) => {
            const isHovered = hoveredRelic === relic.id;
            const style: React.CSSProperties = {
              ...relicCardStyle,
              borderColor: isHovered ? '#ffd700' : 'rgba(255, 215, 0, 0.3)',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isHovered ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none',
            };
            return (
              <div
                key={relic.id}
                style={style}
                onClick={() => onPickRelic(relic.id)}
                onMouseEnter={() => setHoveredRelic(relic.id)}
                onMouseLeave={() => setHoveredRelic(null)}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffd700',
                    marginBottom: 8,
                  }}
                >
                  {relic.name}
                </div>
                <div style={{ fontSize: 12, color: '#ccc', marginBottom: 8, lineHeight: 1.4 }}>
                  {relic.description}
                </div>
                <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic', lineHeight: 1.3 }}>
                  {relic.flavorText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Card Draft (Rounds 1-9) ──────────────────────────────
  const handlePickCard = (cardId: string) => {
    setPickedCardId(cardId);
    setTimeout(() => {
      setPickedCardId(null);
      onPickCard(cardId);
    }, 300);
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>BUILD YOUR DECK</div>
      <div style={subtitleStyle}>
        Pick {draftRound} of 9
        {draftFaction && (
          <span
            style={{
              marginLeft: 12,
              color: FACTION_COLORS[draftFaction].primary,
              fontWeight: 'bold',
            }}
          >
            {draftFaction}
          </span>
        )}
      </div>

      <div style={mainContentStyle}>
        <div style={draftAreaStyle}>
          <div style={cardRowStyle}>
            {draftOptions.map((card) => {
              const isPicked = pickedCardId === card.id;
              const wrapperStyle: React.CSSProperties = {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: isPicked ? 0 : 1,
                transform: isPicked ? 'translateX(200px) scale(0.5)' : 'none',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              };
              return (
                <div key={card.id} style={wrapperStyle}>
                  <CardComponent card={card} onClick={() => handlePickCard(card.id)} />
                  <button
                    style={pickButtonStyle}
                    onClick={() => handlePickCard(card.id)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        '0 0 15px rgba(74, 158, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    }}
                  >
                    PICK
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deck Sidebar */}
        <div style={sidebarStyle}>
          <div style={sidebarTitleStyle}>Your Deck ({currentDeck.length})</div>
          {currentDeck.length === 0 && (
            <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
              No cards yet...
            </div>
          )}
          {currentDeck.map((entry, i) => (
            <div key={`${entry.id}-${i}`} style={deckEntryStyle}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </span>
              <div style={costBadgeStyle}>{entry.cost}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { DraftView };
export default DraftView;

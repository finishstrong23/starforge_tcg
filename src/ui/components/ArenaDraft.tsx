/**
 * STARFORGE TCG - Arena Draft Mode
 *
 * Draft a deck from random card offers, then play until 3 losses or 12 wins.
 * Each pick offers 3 cards of similar rarity. Rewards scale with wins.
 */

import React, { useState, useCallback } from 'react';
import backgroundImg from '../../assets/background.png';

interface ArenaCard {
  cardId: string;
  name: string;
  race: string;
  manaCost: number;
  attack: number;
  health: number;
  rarity: string;
  keywords: string[];
}

interface ArenaDraftProps {
  onDraftComplete: (deckCards: string[]) => void;
  onBack: () => void;
}

const TOTAL_PICKS = 30;

const RARITY_COLORS: Record<string, string> = {
  common: '#888899',
  uncommon: '#44cc44',
  rare: '#4488ff',
  epic: '#aa44ff',
  legendary: '#ffaa00',
};

// Mock card pool for client-side offline drafting
function generateMockChoices(pickNumber: number): ArenaCard[] {
  const rarities = pickNumber === 1 ? ['legendary', 'legendary', 'legendary']
    : pickNumber % 10 === 0 ? ['rare', 'epic', 'rare']
    : ['common', 'common', 'uncommon'];

  const races = ['Pyroclast', 'Verdani', 'Mechara', 'Voidborn', 'Celestari',
                 'Nethari', 'Draconid', 'Hivemind', 'Crystari', 'Aetherian'];

  const keywords = ['GUARDIAN', 'BARRIER', 'SWIFT', 'BLITZ', 'DRAIN', 'LETHAL',
                    'DEPLOY', 'SALVAGE', 'ADAPT', 'PHASE', 'SWARM'];

  return rarities.map((rarity, i) => {
    const race = races[Math.floor(Math.random() * races.length)];
    const mana = rarity === 'legendary' ? 5 + Math.floor(Math.random() * 5)
      : Math.floor(Math.random() * 8) + 1;
    const kws = Math.random() > 0.5 ? [keywords[Math.floor(Math.random() * keywords.length)]] : [];
    return {
      cardId: `arena_${pickNumber}_${i}_${Date.now()}`,
      name: `${rarity === 'legendary' ? 'Grand ' : ''}${race} ${['Warrior', 'Sentinel', 'Invoker', 'Scout', 'Titan'][i % 5]}`,
      race,
      manaCost: mana,
      attack: Math.max(1, mana - 1 + Math.floor(Math.random() * 3)),
      health: Math.max(1, mana + Math.floor(Math.random() * 3)),
      rarity,
      keywords: kws,
    };
  });
}

export const ArenaDraft: React.FC<ArenaDraftProps> = ({ onDraftComplete, onBack }) => {
  const [pickedCards, setPickedCards] = useState<ArenaCard[]>([]);
  const [currentChoices, setCurrentChoices] = useState<ArenaCard[]>(() => generateMockChoices(1));
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pickAnimation, setPickAnimation] = useState<number | null>(null);

  const pickNumber = pickedCards.length + 1;
  const isDraftComplete = pickedCards.length >= TOTAL_PICKS;

  const handlePick = useCallback((index: number) => {
    if (isDraftComplete) return;

    setPickAnimation(index);
    const chosen = currentChoices[index];

    setTimeout(() => {
      const newPicked = [...pickedCards, chosen];
      setPickedCards(newPicked);
      setPickAnimation(null);

      if (newPicked.length < TOTAL_PICKS) {
        setCurrentChoices(generateMockChoices(newPicked.length + 1));
      } else {
        onDraftComplete(newPicked.map(c => c.cardId));
      }
    }, 400);
  }, [currentChoices, pickedCards, isDraftComplete, onDraftComplete]);

  // Mana curve stats
  const manaCurve = [0, 0, 0, 0, 0, 0, 0, 0];
  pickedCards.forEach(c => {
    const bucket = Math.min(c.manaCost, 7);
    manaCurve[bucket]++;
  });
  const maxCurve = Math.max(...manaCurve, 1);

  return (
    <div style={draftStyles.container}>
      {/* Header */}
      <div style={draftStyles.header}>
        <button style={draftStyles.backBtn} onClick={onBack}>Back</button>
        <h1 style={draftStyles.title}>Arena Draft</h1>
        <div style={draftStyles.pickCounter}>
          Pick {Math.min(pickNumber, TOTAL_PICKS)} / {TOTAL_PICKS}
        </div>
      </div>

      {/* Progress bar */}
      <div style={draftStyles.progressBar}>
        <div style={{
          ...draftStyles.progressFill,
          width: `${(pickedCards.length / TOTAL_PICKS) * 100}%`,
        }} />
      </div>

      {/* Card choices */}
      {!isDraftComplete && (
        <div style={draftStyles.choices}>
          {currentChoices.map((card, idx) => (
            <div
              key={card.cardId}
              style={{
                ...draftStyles.cardChoice,
                border: hoveredCard === idx ? `2px solid ${RARITY_COLORS[card.rarity]}` : '2px solid #333355',
                transform: pickAnimation === idx ? 'scale(1.05)' : hoveredCard === idx ? 'translateY(-8px)' : 'none',
                opacity: pickAnimation !== null && pickAnimation !== idx ? 0.3 : 1,
              }}
              onMouseEnter={() => setHoveredCard(idx)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handlePick(idx)}
            >
              {/* Rarity glow */}
              <div style={{
                ...draftStyles.rarityGlow,
                background: `radial-gradient(ellipse at top, ${RARITY_COLORS[card.rarity]}33, transparent)`,
              }} />

              {/* Card content */}
              <div style={draftStyles.cardMana}>{card.manaCost}</div>

              <div style={draftStyles.cardName}>{card.name}</div>

              <div style={{ ...draftStyles.cardRarity, color: RARITY_COLORS[card.rarity] }}>
                {card.rarity.toUpperCase()}
              </div>

              <div style={draftStyles.cardRace}>{card.race}</div>

              {/* Stats */}
              <div style={draftStyles.cardStats}>
                <span style={draftStyles.statAttack}>{card.attack}</span>
                <span style={draftStyles.statDivider}>/</span>
                <span style={draftStyles.statHealth}>{card.health}</span>
              </div>

              {/* Keywords */}
              {card.keywords.length > 0 && (
                <div style={draftStyles.cardKeywords}>
                  {card.keywords.map(kw => (
                    <span key={kw} style={draftStyles.keywordTag}>{kw}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom: Mana curve + picked cards summary */}
      <div style={draftStyles.bottom}>
        {/* Mana Curve */}
        <div style={draftStyles.curveSection}>
          <div style={draftStyles.curveTitle}>Mana Curve</div>
          <div style={draftStyles.curveChart}>
            {manaCurve.map((count, i) => (
              <div key={i} style={draftStyles.curveColumn}>
                <div style={{
                  ...draftStyles.curveBar,
                  height: `${(count / maxCurve) * 60}px`,
                }} />
                <div style={draftStyles.curveLabel}>{i === 7 ? '7+' : i}</div>
                <div style={draftStyles.curveCount}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deck summary */}
        <div style={draftStyles.deckSummary}>
          <div style={draftStyles.curveTitle}>Deck ({pickedCards.length}/{TOTAL_PICKS})</div>
          <div style={draftStyles.deckList}>
            {pickedCards.slice(-8).map((card, i) => (
              <div key={i} style={draftStyles.deckItem}>
                <span style={{ color: RARITY_COLORS[card.rarity] }}>{card.manaCost}</span>
                <span style={draftStyles.deckItemName}>{card.name}</span>
              </div>
            ))}
            {pickedCards.length > 8 && (
              <div style={draftStyles.deckMore}>+{pickedCards.length - 8} more...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const draftStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    display: 'flex',
    flexDirection: 'column',
    color: '#ccccdd',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
  },
  backBtn: {
    background: '#333355',
    border: '1px solid #555577',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#aaaacc',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    fontSize: '28px',
    color: '#ffaa00',
    margin: 0,
    textShadow: '0 0 15px rgba(255, 170, 0, 0.3)',
    letterSpacing: '2px',
  },
  pickCounter: {
    fontSize: '16px',
    color: '#888899',
    fontWeight: 'bold',
  },
  progressBar: {
    height: '4px',
    background: '#1a1a2e',
    margin: '0 24px',
    borderRadius: '2px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffaa00, #ff6600)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  choices: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    padding: '24px',
  },
  cardChoice: {
    position: 'relative',
    width: '220px',
    height: '320px',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    borderRadius: '16px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'transform 0.2s, border-color 0.2s, opacity 0.3s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    overflow: 'hidden',
  },
  rarityGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '60px',
  },
  cardMana: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #4488ff, #2266cc)',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(68, 136, 255, 0.4)',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    marginTop: '20px',
  },
  cardRarity: {
    fontSize: '11px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  cardRace: {
    fontSize: '12px',
    color: '#666688',
  },
  cardStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  statAttack: {
    color: '#ff6644',
  },
  statDivider: {
    color: '#444466',
    fontSize: '18px',
  },
  statHealth: {
    color: '#44cc66',
  },
  cardKeywords: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '4px',
    marginTop: '8px',
  },
  keywordTag: {
    padding: '2px 8px',
    background: '#333355',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#aabbcc',
    letterSpacing: '1px',
  },
  bottom: {
    display: 'flex',
    gap: '24px',
    padding: '16px 24px',
    borderTop: '1px solid #222244',
    background: '#0a0a18',
  },
  curveSection: {
    flex: 1,
  },
  curveTitle: {
    fontSize: '12px',
    color: '#666688',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  curveChart: {
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
    height: '80px',
  },
  curveColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
  },
  curveBar: {
    width: '100%',
    maxWidth: '24px',
    background: 'linear-gradient(180deg, #4488ff, #2244aa)',
    borderRadius: '2px 2px 0 0',
    minHeight: '2px',
    transition: 'height 0.3s ease',
  },
  curveLabel: {
    fontSize: '10px',
    color: '#888899',
  },
  curveCount: {
    fontSize: '10px',
    color: '#555577',
  },
  deckSummary: {
    flex: 1,
    maxWidth: '250px',
  },
  deckList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    maxHeight: '100px',
    overflowY: 'auto',
  },
  deckItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    padding: '2px 4px',
  },
  deckItemName: {
    color: '#aaaacc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deckMore: {
    fontSize: '11px',
    color: '#555577',
    fontStyle: 'italic',
  },
};

/**
 * STARFORGE TCG - Card Pack Opening Screen
 *
 * Animated pack opening experience:
 * - Pack selection shop with gold balance
 * - Click-to-open animation with glow burst
 * - Sequential card reveal with rarity effects
 * - "New!" badge for first-time cards
 * - Self-contained gold management via localStorage
 */

import React, { useState, useCallback } from 'react';
import { PACK_TYPES, openPack, loadPackState, type PackResult, type PackType, type PackState } from '../../progression/CardPacks';
import { loadDailyState, spendGold as spendDailyGold, saveDailyState } from '../../progression/DailyQuests';
import { CardArt } from './CardArt';
import type { Race } from '../../types/Race';

interface PackOpeningProps {
  onBack: () => void;
}

type Phase = 'shop' | 'opening' | 'reveal';

export const PackOpening: React.FC<PackOpeningProps> = ({ onBack }) => {
  const [phase, setPhase] = useState<Phase>('shop');
  const [packState, setPackState] = useState<PackState>(loadPackState);
  const [result, setResult] = useState<PackResult | null>(null);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [gold, setGold] = useState(() => loadDailyState().gold);

  const handleBuyPack = useCallback((packType: PackType) => {
    if (gold < packType.cost) return;
    const dailyState = loadDailyState();
    const updated = spendDailyGold(dailyState, packType.cost);
    if (!updated) return;
    saveDailyState(updated);
    setGold(updated.gold);

    const { result: packResult, newState } = openPack(packType, packState);
    setPackState(newState);
    setResult(packResult);
    setRevealIndex(-1);
    setPhase('opening');

    // Auto-transition to reveal after burst animation
    setTimeout(() => {
      setPhase('reveal');
      setRevealIndex(0);
    }, 1200);
  }, [gold, packState]);

  const handleRevealNext = useCallback(() => {
    if (!result) return;
    if (revealIndex < result.cards.length - 1) {
      setRevealIndex(prev => prev + 1);
    }
  }, [result, revealIndex]);

  const handleDone = useCallback(() => {
    setPhase('shop');
    setResult(null);
    setRevealIndex(-1);
  }, []);

  const allRevealed = result && revealIndex >= result.cards.length - 1;

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pack-glow-burst {
          0% { transform: scale(1); box-shadow: 0 0 20px rgba(255,204,0,0.3); }
          40% { transform: scale(1.1); box-shadow: 0 0 60px rgba(255,204,0,0.8), 0 0 100px rgba(255,150,0,0.4); }
          70% { transform: scale(1.05); }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes card-reveal-flip {
          0% { transform: rotateY(180deg) scale(0.8); opacity: 0; }
          40% { transform: rotateY(90deg) scale(1.1); opacity: 0.5; }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes legendary-glow {
          0%, 100% { box-shadow: 0 0 15px #ff8800, 0 0 30px rgba(255,136,0,0.4); }
          50% { box-shadow: 0 0 25px #ffaa00, 0 0 50px rgba(255,170,0,0.6); }
        }
        @keyframes new-badge-pop {
          0% { transform: scale(0) rotate(-20deg); }
          60% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes pack-particles {
          0% { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={phase === 'shop' ? onBack : handleDone}>
          {phase === 'shop' ? 'Back' : 'Done'}
        </button>
        <h1 style={styles.title}>Card Packs</h1>
        <div style={styles.goldDisplay}>
          <span style={styles.goldAmount}>{gold}</span>
          <span style={styles.goldLabel}>gold</span>
        </div>
      </div>

      {/* Shop phase */}
      {phase === 'shop' && (
        <div style={styles.shopGrid}>
          {PACK_TYPES.map(pack => (
            <div key={pack.id} style={{
              ...styles.packCard,
              borderColor: pack.color + '66',
              opacity: gold < pack.cost ? 0.5 : 1,
            }}>
              {/* Pack visual */}
              <div style={{
                ...styles.packVisual,
                background: `linear-gradient(135deg, ${pack.color}22 0%, ${pack.color}08 100%)`,
                borderColor: pack.color + '44',
              }}>
                <svg width="60" height="80" viewBox="0 0 60 80">
                  <rect x="5" y="5" width="50" height="70" rx="4"
                    fill={pack.color + '20'} stroke={pack.color} strokeWidth="1.5" />
                  <rect x="10" y="30" width="40" height="4" rx="2"
                    fill={pack.color} opacity="0.5" />
                  <circle cx="30" cy="50" r="8" fill="none" stroke={pack.color} strokeWidth="1" opacity="0.4" />
                  <text x="30" y="54" textAnchor="middle" fill={pack.color} fontSize="10" fontWeight="bold" opacity="0.6">
                    {pack.cardCount}
                  </text>
                </svg>
              </div>
              <div style={styles.packInfo}>
                <div style={{ ...styles.packName, color: pack.color }}>{pack.name}</div>
                <div style={styles.packDesc}>{pack.description}</div>
                <button
                  style={{
                    ...styles.buyBtn,
                    background: `linear-gradient(135deg, ${pack.color} 0%, ${pack.color}cc 100%)`,
                    opacity: gold < pack.cost ? 0.5 : 1,
                  }}
                  onClick={() => handleBuyPack(pack)}
                  disabled={gold < pack.cost}
                >
                  {pack.cost} Gold
                </button>
              </div>
            </div>
          ))}
          <div style={styles.packStats}>
            <span style={styles.statsText}>Packs opened: {packState.totalOpened}</span>
            <span style={styles.statsText}>Pity timer: {packState.packsSinceLegendary}/20</span>
          </div>
        </div>
      )}

      {/* Opening burst animation */}
      {phase === 'opening' && result && (
        <div style={styles.openingContainer}>
          <div style={{
            ...styles.packBurst,
            animation: 'pack-glow-burst 1.2s ease-out forwards',
            borderColor: result.packType.color,
            boxShadow: `0 0 30px ${result.packType.color}`,
          }}>
            <svg width="80" height="100" viewBox="0 0 60 80">
              <rect x="5" y="5" width="50" height="70" rx="4"
                fill={result.packType.color + '30'} stroke={result.packType.color} strokeWidth="2" />
            </svg>
          </div>
          {/* Burst particles */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 80 + Math.sin(i * 2.3) * 30;
            return (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '6px', height: '6px', borderRadius: '50%',
                background: i % 2 === 0 ? result.packType.color : '#ffdd66',
                animation: `pack-particles 1s ease-out ${i * 0.03}s forwards`,
                '--px': `${Math.cos(angle) * dist}px`,
                '--py': `${Math.sin(angle) * dist}px`,
              } as React.CSSProperties} />
            );
          })}
        </div>
      )}

      {/* Card reveal phase */}
      {phase === 'reveal' && result && (
        <div style={styles.revealContainer}>
          <div style={styles.cardRow}>
            {result.cards.map((pc, i) => {
              const isRevealed = i <= revealIndex;
              const rarityColor = pc.rarity === 'LEGENDARY' ? '#ff8800'
                : pc.rarity === 'EPIC' ? '#aa44ff'
                : pc.rarity === 'RARE' ? '#0070dd'
                : '#888888';

              return (
                <div key={i} style={{
                  ...styles.revealCard,
                  ...(isRevealed ? {
                    animation: 'card-reveal-flip 0.5s ease-out forwards',
                    borderColor: rarityColor,
                    boxShadow: pc.rarity === 'LEGENDARY'
                      ? `0 0 15px #ff8800, 0 0 30px rgba(255,136,0,0.4)`
                      : `0 0 8px ${rarityColor}66`,
                  } : {
                    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a20 100%)',
                    cursor: 'pointer',
                  }),
                }}
                  onClick={!isRevealed ? handleRevealNext : undefined}
                >
                  {isRevealed ? (
                    <>
                      <CardArt
                        cardId={pc.card.id}
                        race={(pc.card as any).race as Race | undefined}
                        cardType={(pc.card.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
                        cost={pc.card.cost}
                        width={90} height={55}
                      />
                      <div style={styles.revealName}>{pc.card.name}</div>
                      <div style={{ ...styles.revealRarity, color: rarityColor }}>
                        {pc.rarity}
                      </div>
                      {pc.isNew && (
                        <div style={styles.newBadge}>NEW!</div>
                      )}
                    </>
                  ) : (
                    <div style={styles.cardBackText}>?</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tap to reveal / done */}
          <div style={styles.revealHint}>
            {allRevealed ? (
              <button style={styles.doneBtn} onClick={handleDone}>
                {gold >= 100 ? 'Open Another' : 'Back to Shop'}
              </button>
            ) : (
              <span style={styles.hintText}>Click to reveal next card</span>
            )}
          </div>

          {result.pityTriggered && allRevealed && (
            <div style={styles.pityText}>Pity timer activated - guaranteed Legendary!</div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    background: 'linear-gradient(135deg, #060612 0%, #0c0c22 100%)',
    overflow: 'auto', padding: '20px',
  },
  header: {
    width: '100%', maxWidth: '800px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '30px',
  },
  backBtn: {
    background: 'transparent', border: '1px solid #444466',
    borderRadius: '8px', padding: '8px 16px', color: '#888',
    fontSize: '14px', cursor: 'pointer',
  },
  title: {
    fontSize: '28px', fontWeight: 'bold', color: '#ffcc00',
    margin: 0, letterSpacing: '2px',
    textShadow: '0 0 15px rgba(255,204,0,0.3)',
  },
  goldDisplay: {
    display: 'flex', alignItems: 'baseline', gap: '6px',
  },
  goldAmount: {
    fontSize: '22px', fontWeight: 'bold', color: '#ffcc00',
    textShadow: '0 0 8px rgba(255,204,0,0.3)',
  },
  goldLabel: { fontSize: '13px', color: '#aa8844' },
  shopGrid: {
    display: 'flex', gap: '20px', flexWrap: 'wrap',
    justifyContent: 'center', maxWidth: '800px',
  },
  packCard: {
    width: '220px', background: 'linear-gradient(135deg, #12122e 0%, #0a0a1e 100%)',
    border: '2px solid', borderRadius: '16px', padding: '20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  packVisual: {
    width: '80px', height: '100px', borderRadius: '10px',
    border: '1px solid', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
  },
  packInfo: {
    textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  packName: { fontSize: '16px', fontWeight: 'bold' },
  packDesc: { fontSize: '12px', color: '#888899', lineHeight: '1.3' },
  buyBtn: {
    border: 'none', borderRadius: '10px', padding: '10px 20px',
    fontSize: '15px', fontWeight: 'bold', color: '#fff',
    cursor: 'pointer', marginTop: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  packStats: {
    width: '100%', textAlign: 'center', marginTop: '10px',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  statsText: { fontSize: '12px', color: '#666688' },
  openingContainer: {
    flex: 1, display: 'flex', justifyContent: 'center',
    alignItems: 'center', position: 'relative',
  },
  packBurst: {
    width: '100px', height: '130px', borderRadius: '12px',
    border: '3px solid', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
  },
  revealContainer: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '20px', paddingTop: '20px',
  },
  cardRow: {
    display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
  },
  revealCard: {
    width: '120px', height: '160px', borderRadius: '10px',
    border: '2px solid #333355',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a20 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '4px', padding: '8px',
    position: 'relative', overflow: 'hidden',
    transition: 'border-color 0.3s ease',
  },
  cardBackText: {
    fontSize: '32px', color: '#444466', fontWeight: 'bold',
  },
  revealName: {
    fontSize: '11px', fontWeight: 'bold', color: '#ffffff',
    textAlign: 'center', lineHeight: '1.2',
  },
  revealRarity: {
    fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  newBadge: {
    position: 'absolute', top: '4px', right: '4px',
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',
    color: '#fff', fontSize: '9px', fontWeight: 'bold',
    padding: '2px 6px', borderRadius: '4px',
    animation: 'new-badge-pop 0.4s ease-out forwards',
  },
  revealHint: { textAlign: 'center' },
  hintText: { fontSize: '14px', color: '#888899' },
  doneBtn: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',
    border: 'none', borderRadius: '10px', padding: '12px 30px',
    fontSize: '16px', fontWeight: 'bold', color: '#fff', cursor: 'pointer',
  },
  pityText: {
    fontSize: '12px', color: '#ffcc00', textAlign: 'center',
    fontStyle: 'italic',
  },
};

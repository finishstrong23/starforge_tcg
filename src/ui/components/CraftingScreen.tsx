/**
 * STARFORGE TCG - Crafting Screen
 *
 * Hearthstone-style crafting interface:
 * - Browse all cards with search/filter
 * - Craft specific cards with Stardust
 * - Disenchant owned cards for Stardust
 * - Bulk disenchant extras
 * - Animated craft/disenchant effects
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { CardRarity } from '../../types/Card';
import type { CardDefinition } from '../../types/Card';
import { CardArt } from './CardArt';
import { SoundManager } from '../../audio';
import {
  loadCraftingState,
  getAllCollectibleCards,
  getOwnedCount,
  craftCard,
  disenchantCard,
  disenchantExtras,
  DUST_VALUES,
  type CraftingState,
} from '../../progression/CraftingSystem';

interface CraftingScreenProps {
  onBack: () => void;
}

const ALL_RACES: (Race | 'NEUTRAL')[] = [
  'NEUTRAL' as any,
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS,
  Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
];

const RARITY_ORDER: CardRarity[] = [CardRarity.COMMON, CardRarity.RARE, CardRarity.EPIC, CardRarity.LEGENDARY];
const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9d9d9d', RARE: '#0070dd', EPIC: '#a335ee', LEGENDARY: '#ff8000',
};

type OwnershipFilter = 'all' | 'owned' | 'unowned';

export const CraftingScreen: React.FC<CraftingScreenProps> = ({ onBack }) => {
  const [craftingState, setCraftingState] = useState<CraftingState>(loadCraftingState);
  const [filterRace, setFilterRace] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [filterOwnership, setFilterOwnership] = useState<OwnershipFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);
  const [craftEffect, setCraftEffect] = useState<'craft' | 'disenchant' | null>(null);

  const allCards = useMemo(() => getAllCollectibleCards(), []);

  const filteredCards = useMemo(() => {
    let cards = allCards;
    if (filterRace) {
      cards = cards.filter(c => {
        const cardRace = (c as any).race;
        if (filterRace === 'NEUTRAL') return !cardRace || cardRace === 'NEUTRAL';
        return cardRace === filterRace;
      });
    }
    if (filterRarity) {
      cards = cards.filter(c => c.rarity === filterRarity);
    }
    if (filterOwnership === 'owned') {
      cards = cards.filter(c => getOwnedCount(craftingState, c.id) > 0);
    } else if (filterOwnership === 'unowned') {
      cards = cards.filter(c => getOwnedCount(craftingState, c.id) === 0);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      cards = cards.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.cardText && c.cardText.toLowerCase().includes(q))
      );
    }
    cards.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    return cards;
  }, [allCards, filterRace, filterRarity, filterOwnership, searchText, craftingState]);

  const handleCraft = useCallback((card: CardDefinition) => {
    const result = craftCard(craftingState, card.id, card.rarity);
    if (result) {
      setCraftingState(result);
      setCraftEffect('craft');
      SoundManager.play('craft' as any);
      setTimeout(() => setCraftEffect(null), 600);
    } else {
      SoundManager.play('error');
    }
  }, [craftingState]);

  const handleDisenchant = useCallback((card: CardDefinition) => {
    const result = disenchantCard(craftingState, card.id, card.rarity);
    if (result) {
      setCraftingState(result);
      setCraftEffect('disenchant');
      SoundManager.play('disenchant' as any);
      setTimeout(() => setCraftEffect(null), 600);
    } else {
      SoundManager.play('error');
    }
  }, [craftingState]);

  const handleDisenchantExtras = useCallback(() => {
    const { newState, dustGained, cardsDisenchanted } = disenchantExtras(craftingState);
    if (cardsDisenchanted > 0) {
      setCraftingState(newState);
      SoundManager.play('disenchant' as any);
    }
  }, [craftingState]);

  const selectedOwned = selectedCard ? getOwnedCount(craftingState, selectedCard.id) : 0;
  const selectedCraftCost = selectedCard ? DUST_VALUES.CRAFT[selectedCard.rarity] : 0;
  const selectedDisenchantValue = selectedCard ? DUST_VALUES.DISENCHANT[selectedCard.rarity] : 0;

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes craft-burst {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(0,200,255,0); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(0,200,255,0.8), 0 0 80px rgba(0,200,255,0.3); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,200,255,0); }
        }
        @keyframes disenchant-burst {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(255,100,0,0); }
          50% { transform: scale(1.05); box-shadow: 0 0 40px rgba(255,100,0,0.8), 0 0 80px rgba(255,100,0,0.3); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(255,100,0,0); }
        }
        @keyframes dust-float {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-30px) scale(0.5); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
        <h1 style={styles.title}>Crafting</h1>
        <div style={styles.dustDisplay}>
          <span style={styles.dustIcon}>&#x2728;</span>
          <span style={styles.dustAmount}>{craftingState.stardust}</span>
          <span style={styles.dustLabel}>Stardust</span>
        </div>
      </div>

      <div style={styles.mainLayout}>
        {/* Left: Card Grid */}
        <div style={styles.leftPanel}>
          {/* Filters */}
          <div style={styles.filters}>
            <input
              style={styles.searchInput}
              placeholder="Search cards..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <div style={styles.filterRow}>
              <button style={{
                ...styles.filterBtn,
                ...(filterRace === null ? styles.filterBtnActive : {}),
              }} onClick={() => setFilterRace(null)}>All</button>
              {ALL_RACES.map(r => {
                const label = r === 'NEUTRAL' ? 'Neutral' : RaceData[r as Race]?.name || r;
                return (
                  <button key={r} style={{
                    ...styles.filterBtn,
                    ...(filterRace === r ? styles.filterBtnActive : {}),
                  }} onClick={() => setFilterRace(filterRace === r ? null : r as string)}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={styles.filterRow}>
              {RARITY_ORDER.map(r => (
                <button key={r} style={{
                  ...styles.filterBtn,
                  color: filterRarity === r ? RARITY_COLORS[r] : '#888',
                  ...(filterRarity === r ? { borderColor: RARITY_COLORS[r], background: RARITY_COLORS[r] + '15' } : {}),
                }} onClick={() => setFilterRarity(filterRarity === r ? null : r)}>
                  {r}
                </button>
              ))}
              <span style={{ color: '#333' }}>|</span>
              {(['all', 'owned', 'unowned'] as OwnershipFilter[]).map(f => (
                <button key={f} style={{
                  ...styles.filterBtn,
                  ...(filterOwnership === f ? styles.filterBtnActive : {}),
                }} onClick={() => setFilterOwnership(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <span style={{ color: '#333' }}>|</span>
              <button
                style={{ ...styles.filterBtn, color: '#ff8844', borderColor: '#ff884444' }}
                onClick={handleDisenchantExtras}
              >
                Disenchant Extras
              </button>
            </div>
          </div>

          <div style={styles.resultsInfo}>
            Showing {filteredCards.length} cards
          </div>

          {/* Card Grid */}
          <div style={styles.cardGrid}>
            {filteredCards.map(card => {
              const rarityColor = RARITY_COLORS[card.rarity] || '#888';
              const owned = getOwnedCount(craftingState, card.id);
              const isSelected = selectedCard?.id === card.id;
              return (
                <div key={card.id}
                  style={{
                    ...styles.cardItem,
                    borderColor: isSelected ? '#00ccff' : owned > 0 ? rarityColor + '44' : '#1a1a33',
                    opacity: owned === 0 ? 0.6 : 1,
                    boxShadow: isSelected ? '0 0 12px rgba(0,204,255,0.5)' : 'none',
                  }}
                  onClick={() => setSelectedCard(card)}
                >
                  <div style={{
                    ...styles.cardArtWrap,
                    borderColor: rarityColor + '66',
                  }}>
                    <CardArt
                      cardId={card.id}
                      race={(card as any).race as Race | undefined}
                      cardType={(card.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
                      cost={card.cost}
                      width={90} height={55}
                    />
                  </div>
                  <div style={styles.cardCost}>{card.cost}</div>
                  <div style={styles.cardItemName}>{card.name}</div>
                  <div style={{ ...styles.cardItemRarity, color: rarityColor }}>
                    {card.rarity}
                  </div>
                  {card.attack !== undefined && (
                    <div style={styles.cardStats}>{card.attack}/{card.health}</div>
                  )}
                  {/* Owned count badge */}
                  <div style={{
                    ...styles.ownedBadge,
                    background: owned > 0 ? 'rgba(0,200,100,0.3)' : 'rgba(100,100,100,0.2)',
                    color: owned > 0 ? '#00ff88' : '#666',
                  }}>
                    {owned > 0 ? `x${owned}` : '0'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Card Detail + Craft/Disenchant */}
        <div style={{
          ...styles.rightPanel,
          ...(craftEffect === 'craft' ? { animation: 'craft-burst 0.6s ease-out' } : {}),
          ...(craftEffect === 'disenchant' ? { animation: 'disenchant-burst 0.6s ease-out' } : {}),
        }}>
          {selectedCard ? (
            <>
              <CardArt
                cardId={selectedCard.id}
                race={(selectedCard as any).race as Race | undefined}
                cardType={(selectedCard.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
                cost={selectedCard.cost}
                width={200} height={120}
                isForged={false}
              />
              <div style={styles.detailName}>{selectedCard.name}</div>
              <div style={{
                ...styles.detailRarity,
                color: RARITY_COLORS[selectedCard.rarity],
              }}>{selectedCard.rarity}</div>
              <div style={styles.detailType}>{selectedCard.type}</div>
              {selectedCard.attack !== undefined && (
                <div style={styles.detailStats}>
                  Attack: {selectedCard.attack} | Health: {selectedCard.health}
                </div>
              )}
              {selectedCard.cardText && (
                <div style={styles.detailText}>{selectedCard.cardText}</div>
              )}
              <div style={styles.detailCost}>Cost: {selectedCard.cost} mana</div>
              <div style={styles.ownedInfo}>
                Owned: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{selectedOwned}</span>
              </div>

              {/* Dust values */}
              <div style={styles.dustValues}>
                <div style={styles.dustRow}>
                  <span style={{ color: '#888' }}>Craft cost:</span>
                  <span style={{ color: '#00ccff', fontWeight: 'bold' }}>
                    {selectedCraftCost} &#x2728;
                  </span>
                </div>
                <div style={styles.dustRow}>
                  <span style={{ color: '#888' }}>Disenchant:</span>
                  <span style={{ color: '#ff8844', fontWeight: 'bold' }}>
                    +{selectedDisenchantValue} &#x2728;
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                <button
                  style={{
                    ...styles.craftBtn,
                    opacity: craftingState.stardust >= selectedCraftCost ? 1 : 0.4,
                  }}
                  onClick={() => handleCraft(selectedCard)}
                  disabled={craftingState.stardust < selectedCraftCost}
                >
                  Craft ({selectedCraftCost} &#x2728;)
                </button>
                <button
                  style={{
                    ...styles.disenchantBtn,
                    opacity: selectedOwned > 0 ? 1 : 0.4,
                  }}
                  onClick={() => handleDisenchant(selectedCard)}
                  disabled={selectedOwned === 0}
                >
                  Disenchant (+{selectedDisenchantValue} &#x2728;)
                </button>
              </div>
            </>
          ) : (
            <div style={styles.noSelection}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x2728;</div>
              <div style={{ color: '#666688', fontSize: '16px' }}>Select a card to craft or disenchant</div>
              <div style={{ color: '#444466', fontSize: '13px', marginTop: '12px', lineHeight: '1.6' }}>
                Disenchant unwanted cards for Stardust<br />
                Craft the exact cards you need
              </div>
            </div>
          )}

          {/* Crafting stats */}
          <div style={styles.craftingStats}>
            <div style={styles.statItem}>
              <span style={{ color: '#666' }}>Crafted:</span> {craftingState.totalCrafted}
            </div>
            <div style={styles.statItem}>
              <span style={{ color: '#666' }}>Disenchanted:</span> {craftingState.totalDisenchanted}
            </div>
            <div style={styles.statItem}>
              <span style={{ color: '#666' }}>Total Dust Earned:</span> {craftingState.totalDustEarned}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex',
    flexDirection: 'column', background: 'linear-gradient(135deg, #060612 0%, #0c0c22 100%)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', flexShrink: 0,
  },
  backBtn: {
    background: 'transparent', border: '1px solid #444466',
    borderRadius: '8px', padding: '8px 16px', color: '#888',
    fontSize: '14px', cursor: 'pointer',
  },
  title: {
    fontSize: '24px', fontWeight: 'bold', color: '#00ccff',
    margin: 0, letterSpacing: '2px',
  },
  dustDisplay: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(0,204,255,0.08)', border: '1px solid rgba(0,204,255,0.3)',
    borderRadius: '20px', padding: '8px 16px',
  },
  dustIcon: { fontSize: '20px' },
  dustAmount: {
    fontSize: '20px', fontWeight: 'bold', color: '#00ccff',
    textShadow: '0 0 8px rgba(0,204,255,0.3)',
  },
  dustLabel: { fontSize: '12px', color: '#668899' },
  mainLayout: {
    display: 'flex', flex: 1, overflow: 'hidden', gap: '0',
  },
  leftPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    padding: '0 12px 12px 20px',
  },
  rightPanel: {
    width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '10px', padding: '12px 20px',
    background: 'linear-gradient(180deg, rgba(10,10,30,0.9) 0%, rgba(5,5,20,0.95) 100%)',
    borderLeft: '1px solid #1a1a33', overflowY: 'auto',
  },
  filters: {
    display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, marginBottom: '8px',
  },
  searchInput: {
    background: '#12122e', border: '1px solid #333355',
    borderRadius: '8px', padding: '8px 14px', color: '#ffffff',
    fontSize: '14px', outline: 'none', width: '100%',
  },
  filterRow: {
    display: 'flex', gap: '4px', flexWrap: 'wrap',
  },
  filterBtn: {
    background: '#12122e', border: '1px solid #222244',
    borderRadius: '6px', padding: '4px 10px', color: '#888899',
    fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  filterBtnActive: {
    borderColor: '#00ccff', color: '#00ccff',
    background: 'rgba(0,204,255,0.08)',
  },
  resultsInfo: {
    fontSize: '12px', color: '#666688', flexShrink: 0, marginBottom: '6px',
  },
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '8px', overflowY: 'auto', flex: 1,
  },
  cardItem: {
    background: 'rgba(255,255,255,0.02)', border: '2px solid #1a1a33',
    borderRadius: '8px', padding: '8px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', position: 'relative', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardArtWrap: {
    borderRadius: '4px', overflow: 'hidden', border: '1px solid',
  },
  cardCost: {
    position: 'absolute', top: '4px', left: '4px',
    width: '20px', height: '20px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #0066cc, #0044aa)',
    border: '1px solid #88ccff', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    fontSize: '11px', fontWeight: 'bold', color: '#fff',
  },
  cardItemName: {
    fontSize: '10px', fontWeight: 'bold', color: '#ffffff',
    textAlign: 'center', lineHeight: '1.2',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  cardItemRarity: {
    fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase',
  },
  cardStats: {
    fontSize: '11px', color: '#aabbcc',
  },
  ownedBadge: {
    position: 'absolute', top: '4px', right: '4px',
    borderRadius: '10px', padding: '1px 6px',
    fontSize: '10px', fontWeight: 'bold',
  },
  noSelection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, textAlign: 'center', padding: '20px',
  },
  detailName: {
    fontSize: '18px', fontWeight: 'bold', color: '#ffffff', textAlign: 'center',
  },
  detailRarity: {
    fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase',
  },
  detailType: { fontSize: '12px', color: '#888899' },
  detailStats: {
    fontSize: '14px', color: '#aabbcc', fontWeight: 'bold',
  },
  detailText: {
    fontSize: '12px', color: '#ccccdd', textAlign: 'center',
    lineHeight: '1.4', padding: '8px', background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px', width: '100%',
  },
  detailCost: {
    fontSize: '13px', color: '#0088ff', fontWeight: 'bold',
  },
  ownedInfo: {
    fontSize: '14px', color: '#cccccc',
  },
  dustValues: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '6px',
    padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
  },
  dustRow: {
    display: 'flex', justifyContent: 'space-between', fontSize: '13px',
  },
  actionButtons: {
    display: 'flex', gap: '8px', width: '100%',
  },
  craftBtn: {
    flex: 1, background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
    border: '2px solid #00aaff', borderRadius: '10px', padding: '12px 8px',
    fontSize: '13px', fontWeight: 'bold', color: '#ffffff', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,136,204,0.3)',
  },
  disenchantBtn: {
    flex: 1, background: 'linear-gradient(135deg, #cc4400 0%, #993300 100%)',
    border: '2px solid #ff6600', borderRadius: '10px', padding: '12px 8px',
    fontSize: '13px', fontWeight: 'bold', color: '#ffffff', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(204,68,0,0.3)',
  },
  craftingStats: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '10px', borderTop: '1px solid #1a1a33', marginTop: 'auto',
  },
  statItem: {
    fontSize: '11px', color: '#888899',
  },
};

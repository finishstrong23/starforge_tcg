/**
 * STARFORGE TCG - Collection Manager
 *
 * Full card collection browser with:
 * - Grid view of all cards with art
 * - Filter by race, cost, rarity, type
 * - Search by name
 * - Collection completion percentage per race
 * - Card detail popup
 */

import React, { useState, useMemo } from 'react';
import { Race, RaceData } from '../../types/Race';
import { CardRarity } from '../../types/Card';
import type { CardDefinition } from '../../types/Card';
import { ALL_SAMPLE_CARDS, getCollectibleSampleCards } from '../../data/SampleCards';
import { ALL_EXPANSION_CARDS } from '../../data/ExpansionCards';
import { CardArt } from './CardArt';
import { hapticTap } from '../capacitor';
import { SpaceBackground } from './SpaceBackground';

interface CollectionManagerProps {
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

function getAllCollectibleCards(): CardDefinition[] {
  const all = [...getCollectibleSampleCards(), ...ALL_EXPANSION_CARDS];
  const seen = new Set<string>();
  return all.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

export const CollectionManager: React.FC<CollectionManagerProps> = ({ onBack }) => {
  const [filterRace, setFilterRace] = useState<string | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [filterCost, setFilterCost] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCard, setSelectedCard] = useState<CardDefinition | null>(null);

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
    if (filterCost !== null) {
      if (filterCost === 7) {
        cards = cards.filter(c => c.cost >= 7);
      } else {
        cards = cards.filter(c => c.cost === filterCost);
      }
    }
    if (filterType) {
      cards = cards.filter(c => c.type === filterType);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      cards = cards.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.cardText && c.cardText.toLowerCase().includes(q))
      );
    }
    // Sort by cost, then name
    cards.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    return cards;
  }, [allCards, filterRace, filterRarity, filterCost, filterType, searchText]);

  // Race stats
  const raceStats = useMemo(() => {
    const stats: Record<string, { total: number }> = {};
    for (const r of ALL_RACES) {
      const raceCards = allCards.filter(c => {
        const cr = (c as any).race;
        if (r === 'NEUTRAL') return !cr || cr === 'NEUTRAL';
        return cr === r;
      });
      stats[r as string] = { total: raceCards.length };
    }
    return stats;
  }, [allCards]);

  return (
    <div style={styles.container}>
      <SpaceBackground />
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
        <h1 style={styles.title}>Collection</h1>
        <span style={styles.cardCount}>{allCards.length} cards</span>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {/* Search */}
        <input
          style={styles.searchInput}
          placeholder="Search cards..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />

        {/* Race filter */}
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
                {label} ({raceStats[r as string]?.total || 0})
              </button>
            );
          })}
        </div>

        {/* Cost filter */}
        <div style={styles.filterRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(cost => (
            <button key={cost} style={{
              ...styles.costBtn,
              ...(filterCost === cost ? styles.costBtnActive : {}),
            }} onClick={() => setFilterCost(filterCost === cost ? null : cost)}>
              {cost === 7 ? '7+' : cost}
            </button>
          ))}
        </div>

        {/* Rarity + type filters */}
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
          {['MINION', 'SPELL', 'STRUCTURE'].map(t => (
            <button key={t} style={{
              ...styles.filterBtn,
              ...(filterType === t ? styles.filterBtnActive : {}),
            }} onClick={() => setFilterType(filterType === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={styles.resultsInfo}>
        Showing {filteredCards.length} cards
      </div>

      {/* Card grid */}
      <div style={styles.cardGrid}>
        {filteredCards.map(card => {
          const rarityColor = RARITY_COLORS[card.rarity] || '#888';
          return (
            <div key={card.id} style={styles.cardItem}
              onClick={() => setSelectedCard(card)}>
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
                <div style={styles.cardStats}>
                  {card.attack}/{card.health}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Card detail popup */}
      {selectedCard && (
        <div style={styles.detailOverlay} onClick={() => setSelectedCard(null)}>
          <div style={styles.detailCard} onClick={e => e.stopPropagation()}>
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
            <div style={styles.detailCost}>Cost: {selectedCard.cost}</div>
            <button style={styles.detailClose} onClick={() => setSelectedCard(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex',
    flexDirection: 'column', background: '#040410',
    overflow: 'hidden',
    position: 'relative',
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
  cardCount: { fontSize: '14px', color: '#666688' },
  filters: {
    padding: '0 20px 12px', display: 'flex', flexDirection: 'column',
    gap: '8px', flexShrink: 0,
  },
  searchInput: {
    background: '#12122e', border: '1px solid #333355',
    borderRadius: '8px', padding: '10px 14px', color: '#ffffff',
    fontSize: '14px', outline: 'none', width: '100%',
    minHeight: '44px',
  },
  filterRow: {
    display: 'flex', gap: '4px', flexWrap: 'wrap',
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  filterBtn: {
    background: '#12122e', border: '1px solid #222244',
    borderRadius: '6px', padding: '6px 10px', color: '#888899',
    fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
    minHeight: '36px',
  },
  filterBtnActive: {
    borderColor: '#00ccff', color: '#00ccff',
    background: 'rgba(0,204,255,0.08)',
  },
  costBtn: {
    width: '36px', height: '36px', borderRadius: '6px',
    background: '#12122e', border: '1px solid #222244',
    color: '#888899', fontSize: '13px', fontWeight: 'bold',
    cursor: 'pointer', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
  },
  costBtnActive: {
    borderColor: '#0088ff', color: '#0088ff',
    background: 'rgba(0,136,255,0.1)',
  },
  resultsInfo: {
    padding: '0 20px 8px', fontSize: '12px', color: '#666688', flexShrink: 0,
  },
  cardGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '8px', padding: '0 20px 20px', overflowY: 'auto', flex: 1,
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  cardItem: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a33',
    borderRadius: '8px', padding: '8px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', position: 'relative', transition: 'border-color 0.2s',
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
  detailOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  detailCard: {
    width: '280px', maxWidth: '90vw', background: 'linear-gradient(135deg, #12122e, #0a0a1e)',
    border: '2px solid #c89b3c', borderRadius: '16px', padding: '20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    maxHeight: '85vh', overflowY: 'auto',
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
    fontSize: '13px', color: '#ccccdd', textAlign: 'center',
    lineHeight: '1.4', padding: '8px', background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px', width: '100%',
  },
  detailCost: {
    fontSize: '14px', color: '#0088ff', fontWeight: 'bold',
  },
  detailClose: {
    background: 'transparent', border: '1px solid #444466',
    borderRadius: '8px', padding: '8px 20px', color: '#888',
    fontSize: '14px', cursor: 'pointer', marginTop: '4px',
  },
};

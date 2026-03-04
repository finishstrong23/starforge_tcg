/**
 * STARFORGE TCG - Deck Builder Component
 *
 * Allows players to build custom 30-card decks from their collection.
 * Available after completing the campaign or from Quick Play when unlocked.
 *
 * Features:
 * - Browse cards by race, cost, rarity
 * - Drag to add/remove cards from deck
 * - Deck recipes (pre-built templates)
 * - Mana curve display
 * - Deck validation (30 cards, copy limits)
 * - Starforge card highlighting
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { CardRarity } from '../../types/Card';
import type { CardDefinition } from '../../types/Card';
import {
  getDeckbuildingPool,
  validateDeck,
  getDeckRecipes,
  createNewCollection,
  completeCampaign,
  getBalancedStarterDeck,
} from '../../data';
import type { PlayerCollection } from '../../data';
import backgroundImg from '../../assets/background.png';

interface DeckBuilderProps {
  playerRace: Race;
  /** Called when user confirms deck and wants to play */
  onConfirm: (deckCardIds: string[]) => void;
  /** Called when user cancels / goes back */
  onBack: () => void;
  /** Whether deckbuilding is fully unlocked (campaign complete) */
  isUnlocked: boolean;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  playerRace,
  onConfirm,
  onBack,
  isUnlocked,
}) => {
  // Build a "full unlock" collection for the deckbuilding pool
  const collection = useMemo<PlayerCollection>(() => {
    if (isUnlocked) {
      const c = createNewCollection(playerRace);
      return completeCampaign({
        ...c,
        unlockedRaces: [
          Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
          Race.BIOTITANS, Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS,
          Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
        ],
      });
    }
    return createNewCollection(playerRace);
  }, [playerRace, isUnlocked]);

  // Available card pool
  const cardPool = useMemo(() => {
    const pool = getDeckbuildingPool(collection, playerRace);
    // Deduplicate by ID
    const seen = new Set<string>();
    return pool.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [collection, playerRace]);

  // State
  const [deckCardIds, setDeckCardIds] = useState<string[]>(() => {
    // Start with balanced starter deck
    return getBalancedStarterDeck(playerRace).map(c => c.id);
  });
  const [filterCost, setFilterCost] = useState<number | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<'cards' | 'recipes'>('cards');

  // Card lookup
  const cardMap = useMemo(() => {
    const map = new Map<string, CardDefinition>();
    for (const c of cardPool) map.set(c.id, c);
    // Also add balanced starter cards that might not be in the pool
    for (const c of getBalancedStarterDeck(playerRace)) map.set(c.id, c);
    return map;
  }, [cardPool, playerRace]);

  // Deck card counts
  const deckCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of deckCardIds) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [deckCardIds]);

  // Filtered cards for browse
  const filteredCards = useMemo(() => {
    let cards = [...cardPool];

    if (filterCost !== null) {
      cards = cards.filter(c => c.cost === filterCost);
    }
    if (filterRarity) {
      cards = cards.filter(c => c.rarity === filterRarity);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      cards = cards.filter(c =>
        c.name.toLowerCase().includes(lower) ||
        (c.cardText && c.cardText.toLowerCase().includes(lower))
      );
    }

    // Sort: race cards first, then neutrals, then by cost
    cards.sort((a, b) => {
      const aIsRace = a.race === playerRace ? 0 : 1;
      const bIsRace = b.race === playerRace ? 0 : 1;
      if (aIsRace !== bIsRace) return aIsRace - bIsRace;
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.name.localeCompare(b.name);
    });

    return cards;
  }, [cardPool, filterCost, filterRarity, searchText, playerRace]);

  // Mana curve
  const manaCurve = useMemo(() => {
    const curve: number[] = new Array(11).fill(0);
    for (const id of deckCardIds) {
      const card = cardMap.get(id);
      if (card) {
        const idx = Math.min(card.cost, 10);
        curve[idx]++;
      }
    }
    return curve;
  }, [deckCardIds, cardMap]);

  // Validation
  const validation = useMemo(() => {
    return validateDeck(deckCardIds, playerRace, collection);
  }, [deckCardIds, playerRace, collection]);

  // Recipes
  const recipes = useMemo(() => getDeckRecipes(playerRace), [playerRace]);

  // Actions
  const addCard = useCallback((cardId: string) => {
    const card = cardMap.get(cardId);
    if (!card) return;
    const currentCount = deckCounts.get(cardId) || 0;
    const maxCopies = card.rarity === CardRarity.LEGENDARY ? 1 : 2;
    if (currentCount >= maxCopies) return;
    if (deckCardIds.length >= 30) return;
    setDeckCardIds(prev => [...prev, cardId]);
  }, [cardMap, deckCounts, deckCardIds.length]);

  const removeCard = useCallback((cardId: string) => {
    setDeckCardIds(prev => {
      const idx = prev.indexOf(cardId);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const loadRecipe = useCallback((cardIds: string[]) => {
    setDeckCardIds(cardIds);
  }, []);

  const clearDeck = useCallback(() => {
    setDeckCardIds([]);
  }, []);

  // Deck cards grouped and sorted
  const deckCards = useMemo(() => {
    const uniqueIds = [...new Set(deckCardIds)];
    return uniqueIds
      .map(id => ({ card: cardMap.get(id)!, count: deckCounts.get(id) || 0 }))
      .filter(x => x.card)
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [deckCardIds, cardMap, deckCounts]);

  const maxCurve = Math.max(...manaCurve, 1);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>Back</button>
        <h1 style={styles.title}>Deck Builder</h1>
        <div style={styles.raceLabel}>
          {RaceData[playerRace]?.name || playerRace}
        </div>
        <div style={styles.deckCount}>
          <span style={{ color: deckCardIds.length === 30 ? '#00ff88' : '#ff4444' }}>
            {deckCardIds.length}/30
          </span>
        </div>
      </div>

      <div style={styles.body} className="deckbuilder-body">
        {/* Left: Card Pool */}
        <div style={styles.poolPanel} className="deckbuilder-pool">
          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(activeTab === 'cards' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('cards')}
            >
              Cards
            </button>
            <button
              style={{ ...styles.tab, ...(activeTab === 'recipes' ? styles.tabActive : {}) }}
              onClick={() => setActiveTab('recipes')}
            >
              Recipes
            </button>
          </div>

          {activeTab === 'cards' && (
            <>
              {/* Search */}
              <input
                style={styles.searchInput}
                placeholder="Search cards..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />

              {/* Filters */}
              <div style={styles.filters}>
                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Cost:</span>
                  {[null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cost => (
                    <button
                      key={cost === null ? 'all' : cost}
                      style={{
                        ...styles.filterButton,
                        ...(filterCost === cost ? styles.filterButtonActive : {}),
                      }}
                      onClick={() => setFilterCost(cost)}
                    >
                      {cost === null ? 'All' : cost === 10 ? '10+' : cost}
                    </button>
                  ))}
                </div>
                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Rarity:</span>
                  {[null, CardRarity.COMMON, CardRarity.RARE, CardRarity.EPIC, CardRarity.LEGENDARY].map(rarity => (
                    <button
                      key={rarity || 'all'}
                      style={{
                        ...styles.filterButton,
                        ...(filterRarity === rarity ? styles.filterButtonActive : {}),
                        ...(rarity === CardRarity.LEGENDARY ? { color: '#ffaa00' } : {}),
                        ...(rarity === CardRarity.EPIC ? { color: '#bb44ff' } : {}),
                        ...(rarity === CardRarity.RARE ? { color: '#4488ff' } : {}),
                      }}
                      onClick={() => setFilterRarity(rarity)}
                    >
                      {rarity === null ? 'All' : rarity.charAt(0) + rarity.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Grid */}
              <div style={styles.cardGrid}>
                {filteredCards.map(card => {
                  const inDeck = deckCounts.get(card.id) || 0;
                  const maxCopies = card.rarity === CardRarity.LEGENDARY ? 1 : 2;
                  const canAdd = inDeck < maxCopies && deckCardIds.length < 30;
                  const rarityColor =
                    card.rarity === CardRarity.LEGENDARY ? '#ffaa00' :
                    card.rarity === CardRarity.EPIC ? '#bb44ff' :
                    card.rarity === CardRarity.RARE ? '#4488ff' : '#aaaaaa';

                  return (
                    <button
                      key={card.id}
                      style={{
                        ...styles.poolCard,
                        opacity: canAdd ? 1 : 0.5,
                        borderColor: card.starforge ? '#ffaa00' : inDeck > 0 ? '#00ff88' : '#333355',
                      }}
                      onClick={() => canAdd && addCard(card.id)}
                    >
                      <div style={styles.poolCardHeader}>
                        <span style={styles.poolCardCost}>{card.cost}</span>
                        <span style={styles.poolCardName}>{card.name}</span>
                        {inDeck > 0 && <span style={styles.poolCardCount}>x{inDeck}</span>}
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                        {card.attack !== undefined ? `${card.attack}/${card.health}` : 'Spell'}
                        {' '}
                        <span style={{ color: rarityColor }}>{card.rarity}</span>
                      </div>
                      {card.cardText && (
                        <div style={styles.poolCardText}>{card.cardText}</div>
                      )}
                      {card.starforge && (
                        <div style={{ fontSize: '9px', color: '#ffaa00', marginTop: '2px' }}>
                          STARFORGE
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'recipes' && (
            <div style={styles.recipesPanel}>
              {recipes.map((recipe, i) => (
                <div key={i} style={styles.recipeCard}>
                  <h3 style={styles.recipeName}>{recipe.name}</h3>
                  <p style={styles.recipeDesc}>{recipe.description}</p>
                  <button
                    style={styles.recipeButton}
                    onClick={() => loadRecipe(recipe.cardIds)}
                  >
                    Load Deck
                  </button>
                </div>
              ))}
              <div style={styles.recipeCard}>
                <h3 style={styles.recipeName}>Empty Deck</h3>
                <p style={styles.recipeDesc}>Start from scratch and build your own creation.</p>
                <button style={styles.recipeButton} onClick={clearDeck}>
                  Clear Deck
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Current Deck */}
        <div style={styles.deckPanel} className="deckbuilder-deck">
          <h2 style={styles.deckTitle}>Your Deck</h2>

          {/* Mana Curve */}
          <div style={styles.manaCurve}>
            {manaCurve.slice(0, 10).map((count, cost) => (
              <div key={cost} style={styles.curveBar}>
                <div
                  style={{
                    ...styles.curveBarFill,
                    height: `${(count / maxCurve) * 60}px`,
                    background: count > 0 ? '#00ff88' : '#222',
                  }}
                />
                <span style={styles.curveLabel}>{cost}</span>
                {count > 0 && <span style={styles.curveCount}>{count}</span>}
              </div>
            ))}
          </div>

          {/* Deck List */}
          <div style={styles.deckList}>
            {deckCards.map(({ card, count }) => {
              const rarityColor =
                card.rarity === CardRarity.LEGENDARY ? '#ffaa00' :
                card.rarity === CardRarity.EPIC ? '#bb44ff' :
                card.rarity === CardRarity.RARE ? '#4488ff' : '#aaaaaa';

              return (
                <button
                  key={card.id}
                  style={styles.deckEntry}
                  onClick={() => removeCard(card.id)}
                >
                  <span style={styles.deckEntryCost}>{card.cost}</span>
                  <span style={{ ...styles.deckEntryName, color: rarityColor }}>{card.name}</span>
                  <span style={styles.deckEntryCount}>x{count}</span>
                </button>
              );
            })}
          </div>

          {/* Validation / Confirm */}
          <div style={styles.deckFooter}>
            {!validation.valid && validation.errors.length > 0 && (
              <div style={styles.validationErrors}>
                {validation.errors.map((err, i) => (
                  <div key={i} style={{ color: '#ff4444', fontSize: '12px' }}>{err}</div>
                ))}
              </div>
            )}
            <button
              style={{
                ...styles.confirmButton,
                opacity: validation.valid ? 1 : 0.4,
                cursor: validation.valid ? 'pointer' : 'not-allowed',
              }}
              disabled={!validation.valid}
              onClick={() => validation.valid && onConfirm(deckCardIds)}
            >
              Play With This Deck
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    color: '#ffffff',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 15px',
    borderBottom: '1px solid #333355',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  backButton: {
    background: '#333',
    border: '1px solid #555',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: {
    fontSize: '24px',
    color: '#00ff88',
    margin: 0,
    letterSpacing: '2px',
  },
  raceLabel: {
    fontSize: '16px',
    color: '#ffcc00',
    fontWeight: 'bold',
  },
  deckCount: {
    marginLeft: 'auto',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  poolPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333355',
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #333355',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  tabActive: {
    color: '#00ff88',
    borderBottomColor: '#00ff88',
  },
  searchInput: {
    margin: '10px',
    padding: '10px 14px',
    background: '#1a1a2e',
    border: '1px solid #333355',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    flexShrink: 0,
  },
  filters: {
    padding: '0 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexShrink: 0,
  },
  filterGroup: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: '12px',
    color: '#888',
    marginRight: '4px',
  },
  filterButton: {
    background: '#1a1a2e',
    border: '1px solid #333355',
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#aaa',
    fontSize: '11px',
    cursor: 'pointer',
  },
  filterButtonActive: {
    background: '#203040',
    borderColor: '#00ff88',
    color: '#00ff88',
  },
  cardGrid: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
    alignContent: 'start',
  },
  poolCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '1px solid #333355',
    borderRadius: '8px',
    padding: '8px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    transition: 'all 0.15s ease',
  },
  poolCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  poolCardCost: {
    background: '#2244aa',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  poolCardName: {
    fontSize: '12px',
    fontWeight: 'bold',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  poolCardCount: {
    color: '#00ff88',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  poolCardText: {
    fontSize: '10px',
    color: '#999',
    marginTop: '4px',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  recipesPanel: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recipeCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '1px solid #333355',
    borderRadius: '12px',
    padding: '16px',
  },
  recipeName: {
    fontSize: '18px',
    color: '#00ff88',
    margin: '0 0 8px 0',
  },
  recipeDesc: {
    fontSize: '13px',
    color: '#999',
    margin: '0 0 12px 0',
    lineHeight: '1.4',
  },
  recipeButton: {
    background: 'linear-gradient(135deg, #2244aa 0%, #3355cc 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  deckPanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden',
  },
  deckTitle: {
    fontSize: '16px',
    color: '#ffffff',
    padding: '12px 15px',
    margin: 0,
    borderBottom: '1px solid #333355',
    flexShrink: 0,
  },
  manaCurve: {
    display: 'flex',
    gap: '2px',
    padding: '10px 15px',
    alignItems: 'flex-end',
    height: '100px',
    flexShrink: 0,
    borderBottom: '1px solid #333355',
  },
  curveBar: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  curveBarFill: {
    width: '100%',
    borderRadius: '3px 3px 0 0',
    minHeight: '2px',
    transition: 'height 0.2s ease',
  },
  curveLabel: {
    fontSize: '10px',
    color: '#666',
  },
  curveCount: {
    fontSize: '10px',
    color: '#00ff88',
    position: 'absolute',
    marginTop: '-16px',
  },
  deckList: {
    flex: 1,
    overflowY: 'auto',
    padding: '5px 10px',
  },
  deckEntry: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #222',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '12px',
  },
  deckEntryCost: {
    background: '#2244aa',
    borderRadius: '4px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  deckEntryName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deckEntryCount: {
    color: '#888',
    fontSize: '11px',
  },
  deckFooter: {
    padding: '10px 15px',
    borderTop: '1px solid #333355',
    flexShrink: 0,
  },
  validationErrors: {
    marginBottom: '8px',
  },
  confirmButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
  },
};

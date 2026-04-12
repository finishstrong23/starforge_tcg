/**
 * STARFORGE TCG — Roguelite Shop Screen
 *
 * Buy cards, upgrades, relics, or remove cards.
 */

import React, { useMemo, useState } from 'react';
import type { DungeonRunSave, ShopItem } from '../../dungeon/roguelite/types';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { UPGRADES_BY_ID, UPGRADES_BY_TIER } from '../../dungeon/roguelite/data/upgrades';
import { getRelicOffers, RELICS_BY_ID } from '../../dungeon/roguelite/data/relics';
import { Race } from '../../types/Race';
import { hapticTap } from '../capacitor';

interface DungeonShopProps {
  save: DungeonRunSave;
  onBuyCard: (definitionId: string, cost: number) => void;
  onBuyRelic: (relicId: string, cost: number) => void;
  onRemoveCard: (runCardId: string, cost: number) => void;
  onLeave: () => void;
}

interface ShopInventory {
  cards: { id: string; name: string; cost: number; price: number }[];
  relics: { id: string; name: string; description: string; icon: string; price: number }[];
  removePrice: number;
}

export const DungeonShop: React.FC<DungeonShopProps> = ({
  save,
  onBuyCard,
  onBuyRelic,
  onRemoveCard,
  onLeave,
}) => {
  const [boughtCards, setBoughtCards] = useState<Set<string>>(new Set());
  const [boughtRelics, setBoughtRelics] = useState<Set<string>>(new Set());

  const shop: ShopInventory = useMemo(() => {
    // Get available cards for the player's race
    const raceCards = globalCardDatabase.getCardsForRace(save.race)
      .filter(c => c.collectible && c.cost <= 5);
    const shuffled = [...raceCards].sort(() => Math.random() - 0.5);
    const cardOffers = shuffled.slice(0, 4).map(c => ({
      id: c.id,
      name: c.name,
      cost: c.cost,
      price: 50 + c.cost * 20 + (save.act - 1) * 15,
    }));

    const relicOffers = getRelicOffers(2, save.relics, save.act >= 2 ? 'RARE' : 'COMMON')
      .map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        icon: r.icon,
        price: r.tier === 'COMMON' ? 150 : r.tier === 'RARE' ? 250 : 350,
      }));

    return {
      cards: cardOffers,
      relics: relicOffers,
      removePrice: 75,
    };
  }, [save.race, save.act, save.relics]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Shop</h1>
      <div style={styles.goldDisplay}>Gold: {save.gold}</div>

      {/* Cards for sale */}
      <h2 style={styles.section}>Cards</h2>
      <div style={styles.grid}>
        {shop.cards.map(card => {
          const sold = boughtCards.has(card.id);
          return (
            <button
              key={card.id}
              style={{ ...styles.item, ...(sold ? styles.soldItem : {}) }}
              disabled={sold || save.gold < card.price}
              onClick={() => {
                hapticTap();
                setBoughtCards(prev => new Set(prev).add(card.id));
                onBuyCard(card.id, card.price);
              }}
            >
              <div style={styles.itemName}>{card.name}</div>
              <div style={styles.itemCost}>Crystal cost: {card.cost}</div>
              <div style={styles.price}>{sold ? 'SOLD' : `${card.price}g`}</div>
            </button>
          );
        })}
      </div>

      {/* Relics for sale */}
      <h2 style={styles.section}>Relics</h2>
      <div style={styles.grid}>
        {shop.relics.map(relic => {
          const sold = boughtRelics.has(relic.id);
          return (
            <button
              key={relic.id}
              style={{ ...styles.item, ...(sold ? styles.soldItem : {}) }}
              disabled={sold || save.gold < relic.price}
              onClick={() => {
                hapticTap();
                setBoughtRelics(prev => new Set(prev).add(relic.id));
                onBuyRelic(relic.id, relic.price);
              }}
            >
              <div style={styles.itemName}>{relic.icon} {relic.name}</div>
              <div style={styles.itemDesc}>{relic.description}</div>
              <div style={styles.price}>{sold ? 'SOLD' : `${relic.price}g`}</div>
            </button>
          );
        })}
      </div>

      {/* Card removal */}
      <h2 style={styles.section}>Remove a Card ({shop.removePrice}g)</h2>
      <div style={styles.grid}>
        {save.deck.map(rc => {
          const def = globalCardDatabase.getCard(rc.definitionId);
          return (
            <button
              key={rc.runCardId}
              style={styles.removeItem}
              disabled={save.gold < shop.removePrice}
              onClick={() => { hapticTap(); onRemoveCard(rc.runCardId, shop.removePrice); }}
            >
              <div style={styles.itemName}>{def?.name || rc.definitionId}</div>
            </button>
          );
        })}
      </div>

      <button style={styles.leaveBtn} onClick={onLeave}>Leave Shop</button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #1a1a0a 0%, #2a2a1a 50%, #1a1a2e 100%)', color: '#fff', overflow: 'auto' },
  title: { fontSize: '2rem', color: '#ffd700', margin: '10px 0' },
  goldDisplay: { fontSize: '1.2rem', color: '#ffd700', marginBottom: '20px', padding: '6px 20px', background: 'rgba(255,215,0,0.1)', borderRadius: '20px' },
  section: { color: '#ccc', fontSize: '1rem', marginTop: '20px', marginBottom: '10px', width: '100%', maxWidth: '700px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxWidth: '700px', width: '100%' },
  item: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: '13px' },
  soldItem: { opacity: 0.4, cursor: 'default' },
  removeItem: { background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '10px', padding: '10px', cursor: 'pointer', textAlign: 'left', color: '#f88', fontSize: '13px' },
  itemName: { fontWeight: 'bold', color: '#ffd700', marginBottom: '2px' },
  itemCost: { color: '#8af', fontSize: '0.8rem' },
  itemDesc: { color: '#aab', fontSize: '0.8rem', marginBottom: '4px' },
  price: { color: '#ffd700', fontWeight: 'bold', marginTop: '6px' },
  leaveBtn: { marginTop: '30px', padding: '10px 30px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#aab', cursor: 'pointer' },
};

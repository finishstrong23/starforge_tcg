/**
 * STARFORGE TCG — Roguelite Forge Screen
 *
 * Pick a card from deck, then choose 1 of 3 upgrade options.
 */

import React, { useState, useMemo } from 'react';
import type { DungeonRunSave } from '../../dungeon/roguelite/types';
import { getUpgradeOffers } from '../../dungeon/roguelite/CardUpgradeSystem';
import { getRunCardDisplayName } from '../../dungeon/roguelite/CardSerializer';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap } from '../capacitor';

interface DungeonForgeProps {
  save: DungeonRunSave;
  onUpgradeCard: (runCardId: string, upgradeId: string) => void;
  onSkip: () => void;
}

export const DungeonForge: React.FC<DungeonForgeProps> = ({
  save,
  onUpgradeCard,
  onSkip,
}) => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const upgradeOffers = useMemo(() => {
    if (!selectedCard) return [];
    const runCard = save.deck.find(c => c.runCardId === selectedCard);
    if (!runCard) return [];
    // Forge offers a mix of common and rare
    return getUpgradeOffers(Math.random() < 0.4 ? 'RARE' : 'COMMON', 3, runCard);
  }, [selectedCard, save.deck]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>The Forge</h1>
      <p style={styles.subtitle}>Choose a card to upgrade</p>

      {!selectedCard ? (
        <div style={styles.grid}>
          {save.deck.map(rc => {
            const def = globalCardDatabase.getCard(rc.definitionId);
            return (
              <button
                key={rc.runCardId}
                style={styles.card}
                onClick={() => { hapticTap(); setSelectedCard(rc.runCardId); }}
              >
                <div style={styles.name}>{getRunCardDisplayName(rc)}</div>
                {def && <div style={styles.stats}>Cost {def.cost}{def.attack !== undefined ? ` | ${def.attack}/${def.health}` : ''}</div>}
                {rc.upgrades.length > 0 && <div style={styles.upgrades}>+{rc.upgrades.length} upgrades</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <p style={styles.hint}>Choose an upgrade for {getRunCardDisplayName(save.deck.find(c => c.runCardId === selectedCard)!)}:</p>
          <div style={styles.grid}>
            {upgradeOffers.map(u => (
              <button
                key={u.id}
                style={styles.upgradeCard}
                onClick={() => { hapticTap(); onUpgradeCard(selectedCard, u.id); }}
              >
                <div style={styles.upgradeName}>{u.icon} {u.name}</div>
                <div style={styles.upgradeDesc}>{u.description}</div>
                <div style={styles.tier}>{u.tier}</div>
              </button>
            ))}
          </div>
          <button style={styles.backBtn} onClick={() => setSelectedCard(null)}>Pick different card</button>
        </div>
      )}

      <button style={styles.skipBtn} onClick={onSkip}>Leave Forge</button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #2a1a0a 0%, #3a2a1a 50%, #1a1a2e 100%)', color: '#fff' },
  title: { fontSize: '2rem', color: '#ff6b35', margin: '10px 0' },
  subtitle: { color: '#aab', marginBottom: '20px' },
  hint: { color: '#ddd', textAlign: 'center', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px', maxWidth: '700px', width: '100%' },
  card: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: '13px' },
  name: { fontWeight: 'bold', color: '#ffd700', marginBottom: '2px' },
  stats: { color: '#aab', fontSize: '0.8rem' },
  upgrades: { color: '#f90', fontSize: '0.8rem', marginTop: '2px' },
  upgradeCard: { background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.4)', borderRadius: '10px', padding: '16px', cursor: 'pointer', textAlign: 'left', color: '#fff' },
  upgradeName: { fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' },
  upgradeDesc: { color: '#ccc', marginBottom: '4px' },
  tier: { color: '#aab', fontSize: '0.75rem', textTransform: 'uppercase' },
  backBtn: { marginTop: '12px', padding: '6px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#aab', cursor: 'pointer', fontSize: '12px' },
  skipBtn: { marginTop: '20px', padding: '10px 30px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#aab', cursor: 'pointer' },
};

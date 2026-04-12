/**
 * STARFORGE TCG — Roguelite Rest Site Screen
 *
 * Player chooses: Heal 30% max HP OR Upgrade a card.
 */

import React, { useState, useMemo } from 'react';
import type { DungeonRunSave } from '../../dungeon/roguelite/types';
import { getUpgradeOffers } from '../../dungeon/roguelite/CardUpgradeSystem';
import { getRunCardDisplayName } from '../../dungeon/roguelite/CardSerializer';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap } from '../capacitor';

interface DungeonRestProps {
  save: DungeonRunSave;
  onHeal: () => void;
  onUpgradeCard: (runCardId: string, upgradeId: string) => void;
}

export const DungeonRest: React.FC<DungeonRestProps> = ({
  save,
  onHeal,
  onUpgradeCard,
}) => {
  const [choice, setChoice] = useState<'pick' | 'upgrade'>('pick');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const healAmount = Math.floor(save.maxHp * 0.3);

  const upgradeOffers = useMemo(() => {
    if (!selectedCard) return [];
    const runCard = save.deck.find(c => c.runCardId === selectedCard);
    if (!runCard) return [];
    return getUpgradeOffers('COMMON', 3, runCard);
  }, [selectedCard, save.deck]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rest Site</h1>
      <p style={styles.hp}>HP: {save.hp} / {save.maxHp}</p>

      {choice === 'pick' && (
        <div style={styles.choices}>
          <button style={styles.choiceBtn} onClick={() => { hapticTap(); onHeal(); }}>
            <div style={styles.choiceIcon}>+</div>
            <div style={styles.choiceName}>Rest</div>
            <div style={styles.choiceDesc}>Heal {healAmount} HP</div>
          </button>
          <button style={styles.choiceBtn} onClick={() => { hapticTap(); setChoice('upgrade'); }}>
            <div style={styles.choiceIcon}>^</div>
            <div style={styles.choiceName}>Forge</div>
            <div style={styles.choiceDesc}>Upgrade a card</div>
          </button>
        </div>
      )}

      {choice === 'upgrade' && !selectedCard && (
        <div>
          <p style={styles.hint}>Select a card to upgrade:</p>
          <div style={styles.grid}>
            {save.deck.map(rc => {
              const def = globalCardDatabase.getCard(rc.definitionId);
              return (
                <button
                  key={rc.runCardId}
                  style={styles.card}
                  onClick={() => { hapticTap(); setSelectedCard(rc.runCardId); }}
                >
                  <div style={styles.cardName}>{getRunCardDisplayName(rc)}</div>
                  {def && def.attack !== undefined && <div style={styles.cardStats}>{def.attack}/{def.health}</div>}
                  {rc.upgrades.length > 0 && <div style={styles.upgradeCount}>+{rc.upgrades.length}</div>}
                </button>
              );
            })}
          </div>
          <button style={styles.backBtn} onClick={() => setChoice('pick')}>Back</button>
        </div>
      )}

      {choice === 'upgrade' && selectedCard && (
        <div>
          <p style={styles.hint}>Choose upgrade:</p>
          <div style={styles.grid}>
            {upgradeOffers.map(u => (
              <button
                key={u.id}
                style={styles.upgradeCard}
                onClick={() => { hapticTap(); onUpgradeCard(selectedCard, u.id); }}
              >
                <div style={styles.upgradeName}>{u.icon} {u.name}</div>
                <div style={styles.upgradeDesc}>{u.description}</div>
              </button>
            ))}
          </div>
          <button style={styles.backBtn} onClick={() => setSelectedCard(null)}>Pick different card</button>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #0a1a2e 0%, #1a2a3e 50%, #0a2a2e 100%)', color: '#fff' },
  title: { fontSize: '2rem', color: '#7df', margin: '10px 0' },
  hp: { fontSize: '1.1rem', color: '#f88', marginBottom: '20px' },
  choices: { display: 'flex', gap: '20px', marginTop: '30px' },
  choiceBtn: { width: '160px', padding: '30px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(125,221,255,0.3)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', color: '#fff' },
  choiceIcon: { fontSize: '2rem', marginBottom: '8px' },
  choiceName: { fontWeight: 'bold', fontSize: '1.1rem', color: '#7df' },
  choiceDesc: { color: '#aab', fontSize: '0.85rem', marginTop: '4px' },
  hint: { color: '#aab', textAlign: 'center', marginBottom: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxWidth: '700px', width: '100%' },
  card: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontSize: '13px' },
  cardName: { fontWeight: 'bold', color: '#ffd700' },
  cardStats: { color: '#7f7', fontSize: '0.8rem' },
  upgradeCount: { color: '#f90', fontSize: '0.8rem' },
  upgradeCard: { background: 'rgba(125,221,255,0.08)', border: '1px solid rgba(125,221,255,0.3)', borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'left', color: '#fff' },
  upgradeName: { fontWeight: 'bold', marginBottom: '4px' },
  upgradeDesc: { color: '#ccc', fontSize: '0.9rem' },
  backBtn: { marginTop: '12px', padding: '6px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#aab', cursor: 'pointer', fontSize: '12px' },
};

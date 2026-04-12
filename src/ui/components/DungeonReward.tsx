/**
 * STARFORGE TCG — Roguelite Post-Battle Reward Screen
 *
 * After winning a battle, player picks from:
 * - Add a card to deck
 * - Upgrade a card
 * - Remove a card from deck
 * - Gold reward (auto-collected)
 */

import React, { useState, useMemo } from 'react';
import type { DungeonRunSave, RewardOffer, SerializedRunCard } from '../../dungeon/roguelite/types';
import { getUpgradeOffers } from '../../dungeon/roguelite/CardUpgradeSystem';
import { getRunCardDisplayName } from '../../dungeon/roguelite/CardSerializer';
import { UPGRADES_BY_ID } from '../../dungeon/roguelite/data/upgrades';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap } from '../capacitor';

interface DungeonRewardProps {
  save: DungeonRunSave;
  rewards: RewardOffer;
  onAddCard: (definitionId: string) => void;
  onUpgradeCard: (runCardId: string, upgradeId: string) => void;
  onRemoveCard: (runCardId: string) => void;
  onSkip: () => void;
}

type RewardTab = 'cards' | 'upgrade' | 'remove';

export const DungeonReward: React.FC<DungeonRewardProps> = ({
  save,
  rewards,
  onAddCard,
  onUpgradeCard,
  onRemoveCard,
  onSkip,
}) => {
  const [tab, setTab] = useState<RewardTab>('cards');
  const [selectedDeckCard, setSelectedDeckCard] = useState<string | null>(null);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);

  const upgradeOffers = useMemo(() => {
    if (!selectedDeckCard) return [];
    const runCard = save.deck.find(c => c.runCardId === selectedDeckCard);
    if (!runCard) return [];
    const tier = rewards.sourceNodeType === 'ELITE' || rewards.sourceNodeType === 'BOSS' ? 'RARE' : 'COMMON';
    return getUpgradeOffers(tier, 3, runCard);
  }, [selectedDeckCard, save.deck, rewards.sourceNodeType]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Victory!</h1>
      <div style={styles.goldReward}>+{rewards.goldReward} Gold</div>

      {/* Tab selector */}
      <div style={styles.tabs}>
        {rewards.cardOffers.length > 0 && (
          <button
            style={{ ...styles.tab, ...(tab === 'cards' ? styles.activeTab : {}) }}
            onClick={() => { hapticTap(); setTab('cards'); }}
          >
            Add Card
          </button>
        )}
        {rewards.upgradeOffers.length > 0 && (
          <button
            style={{ ...styles.tab, ...(tab === 'upgrade' ? styles.activeTab : {}) }}
            onClick={() => { hapticTap(); setTab('upgrade'); }}
          >
            Upgrade Card
          </button>
        )}
        {rewards.canRemoveCard && (
          <button
            style={{ ...styles.tab, ...(tab === 'remove' ? styles.activeTab : {}) }}
            onClick={() => { hapticTap(); setTab('remove'); }}
          >
            Remove Card
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={styles.content}>
        {tab === 'cards' && (
          <div style={styles.cardGrid}>
            {rewards.cardOffers.map(cardId => {
              const def = globalCardDatabase.getCard(cardId);
              if (!def) return null;
              return (
                <button
                  key={cardId}
                  style={styles.rewardCard}
                  onClick={() => { hapticTap(); onAddCard(cardId); }}
                >
                  <div style={styles.cardName}>{def.name}</div>
                  <div style={styles.cardCost}>Cost: {def.cost}</div>
                  {def.attack !== undefined && (
                    <div style={styles.cardStats}>{def.attack}/{def.health}</div>
                  )}
                  <div style={styles.cardText}>{def.cardText}</div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'upgrade' && !selectedDeckCard && (
          <div>
            <p style={styles.hint}>Select a card from your deck to upgrade:</p>
            <div style={styles.cardGrid}>
              {save.deck.map(rc => {
                const def = globalCardDatabase.getCard(rc.definitionId);
                return (
                  <button
                    key={rc.runCardId}
                    style={styles.rewardCard}
                    onClick={() => { hapticTap(); setSelectedDeckCard(rc.runCardId); }}
                  >
                    <div style={styles.cardName}>{getRunCardDisplayName(rc)}</div>
                    {def && def.attack !== undefined && (
                      <div style={styles.cardStats}>{def.attack}/{def.health}</div>
                    )}
                    {rc.upgrades.length > 0 && (
                      <div style={styles.upgradeCount}>+{rc.upgrades.length} upgrades</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'upgrade' && selectedDeckCard && (
          <div>
            <p style={styles.hint}>Choose an upgrade:</p>
            <div style={styles.cardGrid}>
              {upgradeOffers.map(upgrade => (
                <button
                  key={upgrade.id}
                  style={{
                    ...styles.rewardCard,
                    ...(selectedUpgrade === upgrade.id ? styles.selectedCard : {}),
                  }}
                  onClick={() => {
                    hapticTap();
                    onUpgradeCard(selectedDeckCard, upgrade.id);
                  }}
                >
                  <div style={styles.upgradeName}>{upgrade.icon} {upgrade.name}</div>
                  <div style={styles.upgradeDesc}>{upgrade.description}</div>
                  <div style={styles.upgradeTier}>{upgrade.tier}</div>
                </button>
              ))}
            </div>
            <button
              style={styles.backBtn}
              onClick={() => setSelectedDeckCard(null)}
            >
              Pick different card
            </button>
          </div>
        )}

        {tab === 'remove' && (
          <div>
            <p style={styles.hint}>Select a card to remove from your deck:</p>
            <div style={styles.cardGrid}>
              {save.deck.map(rc => (
                <button
                  key={rc.runCardId}
                  style={styles.rewardCard}
                  onClick={() => { hapticTap(); onRemoveCard(rc.runCardId); }}
                >
                  <div style={styles.cardName}>{getRunCardDisplayName(rc)}</div>
                  {rc.upgrades.length > 0 && (
                    <div style={styles.upgradeCount}>+{rc.upgrades.length} upgrades</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button style={styles.skipBtn} onClick={onSkip}>
        Skip Rewards
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #0a2a1a 0%, #1a3a2a 50%, #0a1a2e 100%)',
    color: '#fff',
  },
  title: {
    fontSize: '2rem',
    color: '#ffd700',
    margin: '10px 0',
  },
  goldReward: {
    fontSize: '1.2rem',
    color: '#ffd700',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  tab: {
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#aab',
    cursor: 'pointer',
    fontSize: '13px',
  },
  activeTab: {
    background: 'rgba(255,215,0,0.15)',
    borderColor: 'rgba(255,215,0,0.4)',
    color: '#ffd700',
  },
  content: {
    width: '100%',
    maxWidth: '700px',
    flex: 1,
  },
  hint: {
    color: '#aab',
    textAlign: 'center',
    marginBottom: '16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '12px',
  },
  rewardCard: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    fontSize: '13px',
  },
  selectedCard: {
    borderColor: '#ffd700',
    background: 'rgba(255,215,0,0.1)',
  },
  cardName: {
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '4px',
  },
  cardCost: {
    color: '#8af',
    fontSize: '0.85rem',
  },
  cardStats: {
    color: '#7f7',
    fontSize: '0.85rem',
  },
  cardText: {
    color: '#ccc',
    fontSize: '0.8rem',
    marginTop: '4px',
    lineHeight: '1.3',
  },
  upgradeCount: {
    color: '#f90',
    fontSize: '0.8rem',
    marginTop: '4px',
  },
  upgradeName: {
    fontWeight: 'bold',
    fontSize: '1rem',
    marginBottom: '4px',
  },
  upgradeDesc: {
    color: '#ccc',
    marginBottom: '4px',
  },
  upgradeTier: {
    color: '#aab',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
  },
  backBtn: {
    marginTop: '12px',
    padding: '6px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#aab',
    cursor: 'pointer',
    fontSize: '12px',
  },
  skipBtn: {
    marginTop: '20px',
    padding: '10px 30px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#aab',
    cursor: 'pointer',
    fontSize: '13px',
  },
};

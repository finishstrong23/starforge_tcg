/**
 * STARFORGE TCG — Roguelite Dungeon Run (Phase Router)
 *
 * Slay-the-Spire-style roguelite mode. Death resets the run.
 * Over 3 acts (~20 battles), player upgrades cards with stacked
 * keyword combos until their deck becomes absurdly powerful.
 *
 * This component is the top-level router that renders the correct
 * screen based on the current run phase and manages all transitions.
 */

import React, { useState, useCallback } from 'react';
import type { DungeonRunSave, RewardOffer, MapNodeType } from '../../dungeon/roguelite/types';
import {
  createRun,
  saveRun,
  loadRun,
  endRun,
  abandonRun,
  advanceToNode,
  completeCurrentNode,
  recordBattle,
  healHp,
  addCardToDeck,
  removeCardFromDeck,
  addRelic,
  spendGold,
  earnGold,
  returnToMap,
  findNode,
  calculateGoldReward,
  transitionAct,
} from '../../dungeon/roguelite/RunManager';
import { rehydrateDeck } from '../../dungeon/roguelite/CardSerializer';
import { getEncounter } from '../../dungeon/roguelite/data/encounters';
import { getRelicOffers, RELICS_BY_ID } from '../../dungeon/roguelite/data/relics';
import { getUpgradeOffers } from '../../dungeon/roguelite/CardUpgradeSystem';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { AIDifficulty } from '../../ai/AIPlayer';
import { Race } from '../../types/Race';

import { DungeonHeroSelect } from './DungeonHeroSelect';
import { DungeonMap } from './DungeonMap';
import { DungeonBattle } from './DungeonBattle';
import type { DungeonBattleResult } from './DungeonBattle';
import { DungeonReward } from './DungeonReward';
import { DungeonForge } from './DungeonForge';
import { DungeonShop } from './DungeonShop';
import { DungeonRest } from './DungeonRest';
import { DungeonDeckView } from './DungeonDeckView';
import { DungeonRunSummary } from './DungeonRunSummary';

interface DungeonRunProps {
  onBack: () => void;
}

export const DungeonRun: React.FC<DungeonRunProps> = ({ onBack }) => {
  const [save, setSave] = useState<DungeonRunSave | null>(() => loadRun());
  const [showDeck, setShowDeck] = useState(false);

  // ─── Persist helper ──────────────────────────────────────
  const updateSave = useCallback((updated: DungeonRunSave) => {
    saveRun(updated);
    setSave({ ...updated });
  }, []);

  // ─── No active run → Hero Select ────────────────────────
  if (!save) {
    return (
      <DungeonHeroSelect
        onSelectHero={(race: Race, heroId: string) => {
          const run = createRun(race, heroId);
          updateSave(run);
        }}
        onBack={onBack}
      />
    );
  }

  // ─── Deck overlay (available from MAP, REST, etc.) ──────
  if (showDeck) {
    return (
      <DungeonDeckView
        save={save}
        onClose={() => setShowDeck(false)}
      />
    );
  }

  // ─── Phase Router ───────────────────────────────────────
  switch (save.phase) {
    // ── MAP ──────────────────────────────────────────────
    case 'MAP':
      return (
        <DungeonMap
          save={save}
          onSelectNode={(nodeId: string) => {
            const updated = advanceToNode({ ...save }, nodeId);
            updateSave(updated);
          }}
          onViewDeck={() => setShowDeck(true)}
          onAbandon={() => {
            endRun(save, 'DEATH');
            setSave(null);
          }}
        />
      );

    // ── BATTLE ───────────────────────────────────────────
    case 'BATTLE': {
      const node = save.currentNodeId ? findNode(save.map, save.currentNodeId) : null;
      const nodeType: MapNodeType = node?.type || 'COMBAT';
      const encounter = getEncounter(save.act, nodeType, save.race);

      const difficultyMap: Record<string, AIDifficulty> = {
        easy: AIDifficulty.EASY,
        medium: AIDifficulty.MEDIUM,
        hard: AIDifficulty.HARD,
      };

      const playerDeck = rehydrateDeck(save.deck, 'player');

      return (
        <DungeonBattle
          playerRace={save.race}
          playerHeroId={save.heroId}
          playerDeck={playerDeck}
          opponentRace={encounter.race}
          difficulty={difficultyMap[encounter.difficulty] || AIDifficulty.MEDIUM}
          opponentHeroHp={encounter.heroHp}
          encounterName={encounter.name}
          onBattleEnd={(result: DungeonBattleResult) => {
            const updated = { ...save };

            // Record battle
            recordBattle(updated, {
              nodeId: save.currentNodeId || '',
              enemyRace: encounter.race,
              won: result.won,
              turns: result.turnCount,
              hpBefore: save.hp,
              hpAfter: result.won ? result.playerHealthRemaining : 0,
            });

            if (!result.won) {
              // Death
              updated.phase = 'DEATH';
              updateSave(updated);
              return;
            }

            // Update HP from battle result
            updated.hp = Math.min(save.maxHp, result.playerHealthRemaining);

            // Complete the node
            completeCurrentNode(updated);

            // Generate rewards
            const goldReward = calculateGoldReward(save.act, nodeType);
            earnGold(updated, goldReward);

            // Build reward offer
            const cardOffers = generateCardOffers(save.race, 3);
            const upgradeTier = nodeType === 'ELITE' || nodeType === 'BOSS' ? 'RARE' : 'COMMON';
            const relicOffers = nodeType === 'BOSS'
              ? getRelicOffers(3, save.relics, save.act >= 2 ? 'RARE' : 'COMMON').map(r => r.id)
              : [];

            const rewards: RewardOffer = {
              cardOffers,
              upgradeOffers: [upgradeTier], // tier indicator for the reward screen
              relicOffers,
              goldReward,
              canRemoveCard: nodeType === 'COMBAT' || nodeType === 'ELITE',
              sourceNodeType: nodeType,
            };

            updated.pendingRewards = rewards;
            updated.phase = 'REWARD';
            updateSave(updated);
          }}
        />
      );
    }

    // ── REWARD ───────────────────────────────────────────
    case 'REWARD': {
      const rewards = save.pendingRewards;
      if (!rewards) {
        // No pending rewards, go to map
        const updated = returnToMap({ ...save });
        updateSave(updated);
        return null;
      }

      return (
        <DungeonReward
          save={save}
          rewards={rewards}
          onAddCard={(definitionId: string) => {
            const updated = { ...save };
            addCardToDeck(updated, definitionId);
            updated.pendingRewards = undefined;
            const next = returnToMap(updated);
            updateSave(next);
          }}
          onUpgradeCard={(runCardId: string, upgradeId: string) => {
            const updated = { ...save };
            // Apply upgrade to the serialized card
            const card = updated.deck.find(c => c.runCardId === runCardId);
            if (card) {
              card.upgrades.push({
                templateId: upgradeId,
                appliedAtNode: save.currentNodeId || '',
              });
            }
            updated.pendingRewards = undefined;
            const next = returnToMap(updated);
            updateSave(next);
          }}
          onRemoveCard={(runCardId: string) => {
            const updated = { ...save };
            removeCardFromDeck(updated, runCardId);
            updated.pendingRewards = undefined;
            const next = returnToMap(updated);
            updateSave(next);
          }}
          onSkip={() => {
            const updated = { ...save };
            updated.pendingRewards = undefined;
            const next = returnToMap(updated);
            updateSave(next);
          }}
        />
      );
    }

    // ── SHOP ─────────────────────────────────────────────
    case 'SHOP':
      return (
        <DungeonShop
          save={save}
          onBuyCard={(definitionId: string, cost: number) => {
            const updated = { ...save };
            if (spendGold(updated, cost)) {
              addCardToDeck(updated, definitionId);
              updateSave(updated);
            }
          }}
          onBuyRelic={(relicId: string, cost: number) => {
            const updated = { ...save };
            if (spendGold(updated, cost)) {
              addRelic(updated, relicId);
              updateSave(updated);
            }
          }}
          onRemoveCard={(runCardId: string, cost: number) => {
            const updated = { ...save };
            if (spendGold(updated, cost)) {
              removeCardFromDeck(updated, runCardId);
              updateSave(updated);
            }
          }}
          onLeave={() => {
            const updated = { ...save };
            completeCurrentNode(updated);
            const next = returnToMap(updated);
            updateSave(next);
          }}
        />
      );

    // ── REST ─────────────────────────────────────────────
    case 'REST':
      return (
        <DungeonRest
          save={save}
          onHeal={() => {
            const updated = { ...save };
            const healAmount = Math.floor(save.maxHp * 0.3);
            healHp(updated, healAmount);
            completeCurrentNode(updated);
            const next = returnToMap(updated);
            updateSave(next);
          }}
          onUpgradeCard={(runCardId: string, upgradeId: string) => {
            const updated = { ...save };
            const card = updated.deck.find(c => c.runCardId === runCardId);
            if (card) {
              card.upgrades.push({
                templateId: upgradeId,
                appliedAtNode: save.currentNodeId || '',
              });
            }
            completeCurrentNode(updated);
            const next = returnToMap(updated);
            updateSave(next);
          }}
        />
      );

    // ── FORGE ────────────────────────────────────────────
    case 'FORGE':
      return (
        <DungeonForge
          save={save}
          onUpgradeCard={(runCardId: string, upgradeId: string) => {
            const updated = { ...save };
            const card = updated.deck.find(c => c.runCardId === runCardId);
            if (card) {
              card.upgrades.push({
                templateId: upgradeId,
                appliedAtNode: save.currentNodeId || '',
              });
            }
            completeCurrentNode(updated);
            const next = returnToMap(updated);
            updateSave(next);
          }}
          onSkip={() => {
            const updated = { ...save };
            completeCurrentNode(updated);
            const next = returnToMap(updated);
            updateSave(next);
          }}
        />
      );

    // ── TREASURE ─────────────────────────────────────────
    case 'TREASURE': {
      // Auto-grant a relic + show upgrade choice
      // For simplicity, show as a reward screen with relic + upgrade
      const treasureRelics = getRelicOffers(1, save.relics, save.act >= 2 ? 'RARE' : 'COMMON');

      return (
        <div style={styles.treasureContainer}>
          <h1 style={styles.treasureTitle}>Treasure Found!</h1>
          <p style={styles.treasureSubtitle}>A hidden cache of ancient power</p>

          {treasureRelics.length > 0 && (
            <div style={styles.treasureRelic}>
              <div style={styles.treasureRelicIcon}>{treasureRelics[0].icon}</div>
              <div style={styles.treasureRelicName}>{treasureRelics[0].name}</div>
              <div style={styles.treasureRelicDesc}>{treasureRelics[0].description}</div>
            </div>
          )}

          <div style={styles.treasureGold}>+20 Gold</div>

          <button
            style={styles.treasureBtn}
            onClick={() => {
              const updated = { ...save };
              // Grant relic
              if (treasureRelics.length > 0) {
                addRelic(updated, treasureRelics[0].id);
              }
              // Grant gold
              earnGold(updated, 20);
              completeCurrentNode(updated);
              const next = returnToMap(updated);
              updateSave(next);
            }}
          >
            Collect & Continue
          </button>
        </div>
      );
    }

    // ── ACT TRANSITION ───────────────────────────────────
    case 'ACT_TRANSITION': {
      const nextAct = save.act;
      const actNames: Record<number, string> = {
        1: 'The Abandoned Outpost',
        2: 'The Corrupted Depths',
        3: 'The Starforge Core',
      };

      return (
        <div style={styles.transitionContainer}>
          <div style={styles.transitionIcon}>
            {nextAct === 2 ? '\u2694\uFE0F' : nextAct === 3 ? '\uD83D\uDD25' : '\u2728'}
          </div>
          <h1 style={styles.transitionTitle}>Act {nextAct}</h1>
          <h2 style={styles.transitionName}>{actNames[nextAct] || 'Unknown Sector'}</h2>
          <p style={styles.transitionDesc}>
            {nextAct === 2
              ? 'The enemies grow stronger. Elite encounters lurk ahead.'
              : nextAct === 3
              ? 'The final act. Only the most powerful decks will survive.'
              : 'Your journey begins.'}
          </p>
          <div style={styles.transitionStats}>
            HP: {save.hp}/{save.maxHp} | Deck: {save.deck.length} | Relics: {save.relics.length}
          </div>
          <button
            style={styles.transitionBtn}
            onClick={() => {
              const updated = { ...save, phase: 'MAP' as const };
              updateSave(updated);
            }}
          >
            Enter Act {nextAct}
          </button>
        </div>
      );
    }

    // ── VICTORY ──────────────────────────────────────────
    case 'VICTORY':
      return (
        <DungeonRunSummary
          save={save}
          result="VICTORY"
          onContinue={() => {
            endRun(save, 'VICTORY');
            setSave(null);
          }}
        />
      );

    // ── DEATH ────────────────────────────────────────────
    case 'DEATH':
      return (
        <DungeonRunSummary
          save={save}
          result="DEATH"
          onContinue={() => {
            endRun(save, 'DEATH');
            setSave(null);
          }}
        />
      );

    default:
      return null;
  }
};

// ─── Helpers ─────────────────────────────────────────────

/**
 * Generate card offers for post-battle rewards.
 * Picks random collectible cards from the player's race.
 */
function generateCardOffers(race: Race, count: number): string[] {
  const raceCards = globalCardDatabase.getCardsForRace(race)
    .filter(c => c.collectible && c.cost <= 6);
  const shuffled = [...raceCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => c.id);
}

// ─── Inline Styles for Treasure & Transition ─────────────

const styles: Record<string, React.CSSProperties> = {
  // Treasure
  treasureContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #1a1a0a 0%, #2a2a1a 50%, #1a1a2e 100%)',
    color: '#fff',
  },
  treasureTitle: {
    fontSize: '2rem',
    color: '#ffd700',
    margin: '10px 0',
  },
  treasureSubtitle: {
    color: '#aab',
    marginBottom: '24px',
  },
  treasureRelic: {
    background: 'rgba(255,215,0,0.1)',
    border: '2px solid rgba(255,215,0,0.4)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '16px',
    maxWidth: '300px',
  },
  treasureRelicIcon: {
    fontSize: '3rem',
    marginBottom: '8px',
  },
  treasureRelicName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '4px',
  },
  treasureRelicDesc: {
    color: '#ccc',
    fontSize: '0.9rem',
  },
  treasureGold: {
    fontSize: '1.2rem',
    color: '#ffd700',
    marginBottom: '20px',
  },
  treasureBtn: {
    padding: '12px 30px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  // Act Transition
  transitionContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a3e 50%, #0a0a2e 100%)',
    color: '#fff',
  },
  transitionIcon: {
    fontSize: '4rem',
    marginBottom: '12px',
  },
  transitionTitle: {
    fontSize: '2.5rem',
    color: '#ffd700',
    margin: '0 0 4px',
  },
  transitionName: {
    fontSize: '1.3rem',
    color: '#7df',
    margin: '0 0 16px',
    fontWeight: 'normal',
  },
  transitionDesc: {
    color: '#aab',
    fontSize: '1rem',
    textAlign: 'center',
    maxWidth: '400px',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  transitionStats: {
    color: '#888',
    fontSize: '0.9rem',
    marginBottom: '24px',
  },
  transitionBtn: {
    padding: '12px 40px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

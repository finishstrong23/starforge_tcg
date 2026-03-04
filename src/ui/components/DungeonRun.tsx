/**
 * STARFORGE TCG - Dungeon Run Mode
 *
 * Roguelike mode: start with 10 cards, fight 8 bosses, collect
 * card bundles and relics along the way. 1 loss = run over.
 */

import React, { useState, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';
import { GameProvider, useGame } from '../context/GameContext';
import { GameBoard } from './GameBoard';
import {
  createDungeonRun,
  getCurrentBoss,
  recordBossFight,
  chooseCardBundle,
  chooseRelic,
  removeCards,
  skipRemoval,
  getBundleChoices,
  getRelicOptions,
  saveDungeonRun,
  loadDungeonRun,
  deleteDungeonRun,
  saveRunToHistory,
  loadRunHistory,
  hasCompletedWithRace,
} from '../../dungeon/DungeonState';
import type { DungeonRunSave, DungeonRunRecord } from '../../dungeon/DungeonState';
import type { DungeonBoss, DungeonRelic as RelicType, CardBundle } from '../../dungeon/DungeonData';
import backgroundImg from '../../assets/background.png';

interface DungeonRunProps {
  onBack: () => void;
}

export const DungeonRun: React.FC<DungeonRunProps> = ({ onBack }) => {
  const [save, setSave] = useState<DungeonRunSave | null>(() => loadDungeonRun());

  // ── Faction Selection ──
  if (!save || !save.isActive) {
    return <FactionSelect onSelect={(race) => {
      const run = createDungeonRun(race);
      saveDungeonRun(run);
      setSave(run);
    }} onBack={onBack} />;
  }

  const updateSave = (updated: DungeonRunSave) => {
    saveDungeonRun(updated);
    setSave(updated);
  };

  switch (save.phase) {
    case 'pre_boss':
      return (
        <PreBossScreen
          save={save}
          onFight={() => updateSave({ ...save, phase: 'fighting' })}
          onAbandon={() => {
            saveRunToHistory(save);
            deleteDungeonRun();
            setSave(null);
          }}
        />
      );

    case 'fighting': {
      const boss = getCurrentBoss(save);
      if (!boss) return null;
      return (
        <DungeonBattle
          save={save}
          boss={boss}
          onBattleEnd={(won, hpRemaining) => {
            const updated = recordBossFight(save, won, hpRemaining);
            if (!updated.isActive) {
              saveRunToHistory(updated);
              deleteDungeonRun();
            }
            updateSave(updated);
          }}
        />
      );
    }

    case 'choose_cards': {
      const bundles = getBundleChoices(save);
      return (
        <ChooseCardsScreen
          save={save}
          bundles={bundles}
          onChoose={(bundle) => updateSave(chooseCardBundle(save, bundle))}
        />
      );
    }

    case 'choose_relic': {
      const relics = getRelicOptions(save);
      return (
        <ChooseRelicScreen
          save={save}
          relics={relics}
          onChoose={(relic) => updateSave(chooseRelic(save, relic))}
        />
      );
    }

    case 'remove_cards':
      return (
        <RemoveCardsScreen
          save={save}
          onRemove={(ids) => updateSave(removeCards(save, ids))}
          onSkip={() => updateSave(skipRemoval(save))}
        />
      );

    case 'run_over':
      return (
        <RunResultScreen
          save={save}
          won={false}
          onContinue={() => {
            deleteDungeonRun();
            setSave(null);
          }}
        />
      );

    case 'run_victory':
      return (
        <RunResultScreen
          save={save}
          won={true}
          onContinue={() => {
            deleteDungeonRun();
            setSave(null);
          }}
        />
      );

    default:
      return null;
  }
};

// ─── FACTION SELECT ─────────────────────────────────────────────────────────

const FactionSelect: React.FC<{
  onSelect: (race: Race) => void;
  onBack: () => void;
}> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<Race>(Race.PYROCLAST);
  const history = loadRunHistory();

  const races = [
    Race.PYROCLAST, Race.LUMINAR, Race.HIVEMIND, Race.COGSMITHS, Race.VOIDBORN,
    Race.BIOTITANS, Race.CRYSTALLINE, Race.PHANTOM_CORSAIRS, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>Back</button>
        <h1 style={s.title}>Dungeon Run</h1>
        <p style={s.subtitle}>Choose your faction. Start with 10 cards. Defeat 8 bosses.</p>
      </div>

      <div style={s.factionGrid}>
        {races.map((race) => {
          const info = RaceData[race];
          const completed = hasCompletedWithRace(race);
          const isSel = selected === race;
          return (
            <button
              key={race}
              onClick={() => setSelected(race)}
              style={{
                ...s.factionCard,
                borderColor: isSel ? '#ffd700' : 'rgba(255,255,255,0.15)',
                background: isSel
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%)'
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <div style={s.factionName}>{info.name}</div>
              <div style={s.factionPlanet}>{info.planet}</div>
              {completed && <div style={s.completedBadge}>Cleared</div>}
            </button>
          );
        })}
      </div>

      <div style={s.selectedInfo}>
        <h3 style={{ color: '#ffd700', margin: '0 0 4px' }}>{RaceData[selected].name}</h3>
        <p style={{ color: '#aaa', margin: 0, fontSize: 14 }}>{RaceData[selected].playstyle}</p>
      </div>

      <button onClick={() => onSelect(selected)} style={s.startBtn}>
        Begin Run
      </button>

      {history.length > 0 && (
        <div style={s.historySection}>
          <h3 style={{ color: '#888', fontSize: 14, margin: '16px 0 8px' }}>Recent Runs</h3>
          <div style={s.historyList}>
            {history.slice(0, 5).map((r, i) => (
              <div key={i} style={s.historyItem}>
                <span style={{ color: r.won ? '#4ade80' : '#f87171' }}>
                  {r.won ? 'Victory' : `${r.bossesDefeated}/8`}
                </span>
                <span style={{ color: '#888', marginLeft: 8 }}>{RaceData[r.race]?.name}</span>
                <span style={{ color: '#666', marginLeft: 'auto', fontSize: 12 }}>
                  {r.relics.length} relics
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PRE-BOSS SCREEN ────────────────────────────────────────────────────────

const PreBossScreen: React.FC<{
  save: DungeonRunSave;
  onFight: () => void;
  onAbandon: () => void;
}> = ({ save, onFight, onAbandon }) => {
  const boss = getCurrentBoss(save);
  if (!boss) return null;

  return (
    <div style={s.container}>
      <div style={s.runHeader}>
        <div style={s.runInfo}>
          <span style={s.runStat}>HP: {save.currentHP}/{save.maxHP}</span>
          <span style={s.runStat}>Boss {save.currentBossIndex + 1}/8</span>
          <span style={s.runStat}>Deck: {save.deck.length} cards</span>
          <span style={s.runStat}>Relics: {save.relics.length}</span>
        </div>
      </div>

      {save.relics.length > 0 && (
        <div style={s.relicBar}>
          {save.relics.map((r) => (
            <div key={r.id} style={s.relicIcon} title={`${r.name}: ${r.description}`}>
              {r.icon}
            </div>
          ))}
        </div>
      )}

      <div style={s.bossCard}>
        <div style={s.bossIcon}>{boss.icon}</div>
        <h2 style={s.bossName}>{boss.name}</h2>
        <div style={s.bossTitle}>{boss.title}</div>
        <div style={s.bossTier}>Tier {boss.tier} Boss</div>
        <div style={s.bossHP}>HP: {boss.startingHealth}</div>
        <div style={s.bossHeroPower}>
          <strong>{boss.heroPowerName}:</strong> {boss.heroPowerDescription}
        </div>
        {boss.specialRule && (
          <div style={s.bossSpecial}>Special: {boss.specialRule}</div>
        )}
        <div style={s.bossQuote}>{boss.introQuote}</div>
      </div>

      <div style={s.actionRow}>
        <button onClick={onFight} style={s.fightBtn}>Fight!</button>
        <button onClick={onAbandon} style={s.abandonBtn}>Abandon Run</button>
      </div>
    </div>
  );
};

// ─── DUNGEON BATTLE ─────────────────────────────────────────────────────────

const DungeonBattleInner: React.FC<{
  onBattleEnd: (won: boolean, hpRemaining: number) => void;
}> = ({ onBattleEnd }) => {
  const { gameState, playerState, isGameOver, turnNumber } = useGame();
  const resultSentRef = React.useRef(false);

  const handleGameEnd = useCallback(() => {
    if (resultSentRef.current) return;
    if (!isGameOver || !gameState || !playerState) return;
    resultSentRef.current = true;

    const won = gameState.winnerId === 'player';
    onBattleEnd(won, Math.max(0, playerState.hero.currentHealth));
  }, [isGameOver, gameState, playerState, onBattleEnd]);

  return <GameBoard onBackToMenu={handleGameEnd} isCampaign={true} />;
};

const DungeonBattle: React.FC<{
  save: DungeonRunSave;
  boss: DungeonBoss;
  onBattleEnd: (won: boolean, hpRemaining: number) => void;
}> = ({ save, boss, onBattleEnd }) => {
  // Map boss tier to AI difficulty
  const diffMap: Record<number, AIDifficulty> = {
    1: AIDifficulty.EASY,
    2: AIDifficulty.MEDIUM,
    3: AIDifficulty.HARD,
  };

  return (
    <GameProvider
      playerRace={save.race}
      aiDifficulty={diffMap[boss.tier] || AIDifficulty.MEDIUM}
      opponentRace={boss.race}
      customDeckCardIds={save.deck}
    >
      <DungeonBattleInner onBattleEnd={onBattleEnd} />
    </GameProvider>
  );
};

// ─── CHOOSE CARDS SCREEN ────────────────────────────────────────────────────

const ChooseCardsScreen: React.FC<{
  save: DungeonRunSave;
  bundles: CardBundle[];
  onChoose: (bundle: CardBundle) => void;
}> = ({ save, bundles, onChoose }) => {
  return (
    <div style={s.container}>
      <RunStatus save={save} />
      <h2 style={s.choiceTitle}>Choose a Card Bundle</h2>
      <p style={s.choiceSubtitle}>Add 3 cards to your deck ({save.deck.length} cards currently)</p>

      <div style={s.bundleGrid}>
        {bundles.map((bundle) => (
          <button
            key={bundle.id}
            onClick={() => onChoose(bundle)}
            style={s.bundleCard}
          >
            <h3 style={s.bundleName}>{bundle.name}</h3>
            <p style={s.bundleDesc}>{bundle.description}</p>
            <div style={s.bundleCards}>
              {bundle.cardIds.map((id, i) => (
                <div key={i} style={s.bundleCardItem}>{id.replace(/_/g, ' ')}</div>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── CHOOSE RELIC SCREEN ────────────────────────────────────────────────────

const ChooseRelicScreen: React.FC<{
  save: DungeonRunSave;
  relics: RelicType[];
  onChoose: (relic: RelicType) => void;
}> = ({ save, relics, onChoose }) => {
  return (
    <div style={s.container}>
      <RunStatus save={save} />
      <h2 style={s.choiceTitle}>Choose a Relic</h2>
      <p style={s.choiceSubtitle}>Permanent passive bonus for the rest of this run</p>

      <div style={s.relicGrid}>
        {relics.map((relic) => (
          <button
            key={relic.id}
            onClick={() => onChoose(relic)}
            style={{
              ...s.relicCard,
              borderColor: relic.tier === 'legendary' ? '#ffd700'
                : relic.tier === 'rare' ? '#60a5fa' : '#888',
            }}
          >
            <div style={s.relicBigIcon}>{relic.icon}</div>
            <h3 style={s.relicName}>{relic.name}</h3>
            <div style={s.relicTier}>{relic.tier}</div>
            <p style={s.relicDesc}>{relic.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── REMOVE CARDS SCREEN ────────────────────────────────────────────────────

const RemoveCardsScreen: React.FC<{
  save: DungeonRunSave;
  onRemove: (ids: string[]) => void;
  onSkip: () => void;
}> = ({ save, onRemove, onSkip }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const maxRemove = 2;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < maxRemove) {
        next.add(id);
      }
      return next;
    });
  };

  // Deduplicate for display (show count)
  const cardCounts = new Map<string, number>();
  for (const id of save.deck) {
    cardCounts.set(id, (cardCounts.get(id) || 0) + 1);
  }

  return (
    <div style={s.container}>
      <RunStatus save={save} />
      <h2 style={s.choiceTitle}>Remove Cards</h2>
      <p style={s.choiceSubtitle}>
        Remove up to {maxRemove} cards from your deck to streamline it
        ({selected.size}/{maxRemove} selected)
      </p>

      <div style={s.removeGrid}>
        {Array.from(cardCounts.entries()).map(([id, count]) => {
          const isSel = selected.has(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              style={{
                ...s.removeCard,
                borderColor: isSel ? '#f87171' : 'rgba(255,255,255,0.15)',
                background: isSel ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)',
              }}
            >
              <span>{id.replace(/_/g, ' ')}</span>
              {count > 1 && <span style={{ color: '#888', fontSize: 12 }}>x{count}</span>}
            </button>
          );
        })}
      </div>

      <div style={s.actionRow}>
        {selected.size > 0 && (
          <button
            onClick={() => onRemove(Array.from(selected))}
            style={s.removeBtn}
          >
            Remove {selected.size} Card{selected.size > 1 ? 's' : ''}
          </button>
        )}
        <button onClick={onSkip} style={s.skipBtn}>Skip</button>
      </div>
    </div>
  );
};

// ─── RUN RESULT SCREEN ──────────────────────────────────────────────────────

const RunResultScreen: React.FC<{
  save: DungeonRunSave;
  won: boolean;
  onContinue: () => void;
}> = ({ save, won }) => {
  // onContinue triggers deletion + reset to faction select
  return (
    <div style={s.container}>
      <div style={s.resultScreen}>
        <div style={s.resultIcon}>{won ? '🏆' : '💀'}</div>
        <h1 style={{ ...s.resultTitle, color: won ? '#ffd700' : '#f87171' }}>
          {won ? 'DUNGEON CLEARED!' : 'RUN OVER'}
        </h1>
        <p style={s.resultSubtitle}>
          {won
            ? `You defeated all 8 bosses as ${RaceData[save.race].name}!`
            : `Defeated by boss ${save.currentBossIndex + 1} of 8.`}
        </p>

        <div style={s.resultStats}>
          <div style={s.resultStat}>
            <span style={s.statLabel}>Bosses Defeated</span>
            <span style={s.statValue}>{save.bossesDefeated}/8</span>
          </div>
          <div style={s.resultStat}>
            <span style={s.statLabel}>Final Deck Size</span>
            <span style={s.statValue}>{save.deck.length}</span>
          </div>
          <div style={s.resultStat}>
            <span style={s.statLabel}>Relics Collected</span>
            <span style={s.statValue}>{save.relics.length}</span>
          </div>
        </div>

        {save.relics.length > 0 && (
          <div style={s.resultRelics}>
            {save.relics.map(r => (
              <div key={r.id} style={s.resultRelic}>
                <span>{r.icon}</span>
                <span style={{ marginLeft: 6 }}>{r.name}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => {
          deleteDungeonRun();
          window.location.reload();
        }} style={s.startBtn}>
          {won ? 'Play Again' : 'Try Again'}
        </button>
      </div>
    </div>
  );
};

// ─── RUN STATUS BAR ─────────────────────────────────────────────────────────

const RunStatus: React.FC<{ save: DungeonRunSave }> = ({ save }) => (
  <div style={s.runHeader}>
    <div style={s.runInfo}>
      <span style={s.runStat}>
        HP: <span style={{ color: save.currentHP > 10 ? '#4ade80' : '#f87171' }}>
          {save.currentHP}
        </span>/{save.maxHP}
      </span>
      <span style={s.runStat}>Boss {save.currentBossIndex + 1}/8</span>
      <span style={s.runStat}>Deck: {save.deck.length}</span>
    </div>
    {save.relics.length > 0 && (
      <div style={s.relicBar}>
        {save.relics.map(r => (
          <div key={r.id} style={s.relicIcon} title={`${r.name}: ${r.description}`}>
            {r.icon}
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── STYLES ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'auto',
    padding: 20,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    color: '#ffd700',
    margin: '0 0 4px',
    textShadow: '0 2px 10px rgba(255,215,0,0.3)',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    margin: 0,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ccc',
    padding: '6px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    marginBottom: 8,
  },
  factionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
    width: '100%',
    maxWidth: 700,
    marginBottom: 16,
  },
  factionCard: {
    padding: '12px 8px',
    borderRadius: 8,
    border: '2px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    textAlign: 'center',
    color: '#fff',
    transition: 'all 0.2s',
    position: 'relative',
  },
  factionName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  factionPlanet: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  completedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    background: '#4ade80',
    color: '#000',
    fontSize: 9,
    padding: '1px 5px',
    borderRadius: 3,
    fontWeight: 'bold',
  },
  selectedInfo: {
    textAlign: 'center',
    marginBottom: 16,
  },
  startBtn: {
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    color: '#000',
    border: 'none',
    padding: '12px 40px',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  historySection: {
    width: '100%',
    maxWidth: 500,
    marginTop: 8,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    fontSize: 13,
  },

  // Run header
  runHeader: {
    width: '100%',
    maxWidth: 700,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
  },
  runInfo: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  runStat: {
    fontSize: 14,
    color: '#ccc',
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 12px',
    borderRadius: 4,
  },
  relicBar: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  relicIcon: {
    fontSize: 20,
    cursor: 'help',
    background: 'rgba(255,215,0,0.1)',
    borderRadius: 4,
    padding: '2px 6px',
  },

  // Boss card
  bossCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,215,0,0.3)',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    maxWidth: 400,
    width: '100%',
    marginBottom: 20,
  },
  bossIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  bossName: {
    fontSize: 24,
    color: '#ffd700',
    margin: '0 0 2px',
  },
  bossTitle: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bossTier: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  bossHP: {
    fontSize: 16,
    color: '#f87171',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bossHeroPower: {
    fontSize: 13,
    color: '#60a5fa',
    marginBottom: 6,
  },
  bossSpecial: {
    fontSize: 12,
    color: '#fbbf24',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bossQuote: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },

  // Actions
  actionRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  fightBtn: {
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px 40px',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  abandonBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#888',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '12px 20px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },

  // Choose cards / relics
  choiceTitle: {
    fontSize: 24,
    color: '#ffd700',
    margin: '0 0 4px',
    textAlign: 'center',
  },
  choiceSubtitle: {
    color: '#aaa',
    fontSize: 14,
    margin: '0 0 20px',
    textAlign: 'center',
  },
  bundleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 700,
  },
  bundleCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(96,165,250,0.3)',
    borderRadius: 10,
    padding: 16,
    cursor: 'pointer',
    textAlign: 'center',
    color: '#fff',
    transition: 'all 0.2s',
  },
  bundleName: {
    fontSize: 16,
    color: '#60a5fa',
    margin: '0 0 4px',
  },
  bundleDesc: {
    fontSize: 12,
    color: '#aaa',
    margin: '0 0 10px',
  },
  bundleCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  bundleCardItem: {
    fontSize: 11,
    color: '#ccc',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    padding: '2px 6px',
    textTransform: 'capitalize',
  },

  // Relics
  relicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    width: '100%',
    maxWidth: 600,
  },
  relicCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px solid #888',
    borderRadius: 10,
    padding: 16,
    cursor: 'pointer',
    textAlign: 'center',
    color: '#fff',
    transition: 'all 0.2s',
  },
  relicBigIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  relicName: {
    fontSize: 15,
    color: '#ffd700',
    margin: '0 0 2px',
  },
  relicTier: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  relicDesc: {
    fontSize: 12,
    color: '#ccc',
    margin: 0,
  },

  // Remove cards
  removeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 6,
    width: '100%',
    maxWidth: 700,
    marginBottom: 16,
  },
  removeCard: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 13,
    textTransform: 'capitalize',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
  },
  removeBtn: {
    background: 'linear-gradient(135deg, #f87171 0%, #b91c1c 100%)',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  skipBtn: {
    background: 'rgba(255,255,255,0.1)',
    color: '#ccc',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '10px 24px',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },

  // Result screen
  resultScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 36,
    margin: '0 0 8px',
    textShadow: '0 2px 15px rgba(255,215,0,0.3)',
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#aaa',
    margin: '0 0 24px',
  },
  resultStats: {
    display: 'flex',
    gap: 24,
    marginBottom: 20,
  },
  resultStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  resultRelics: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultRelic: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    color: '#ffd700',
  },
};

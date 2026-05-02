import React, { useEffect, useState, useCallback } from 'react';
import type { RunState, BoardMinion, DungeonEnemy, FloatingText } from '../types';
import { FACTION_COLORS } from '../types';
import { CardComponent } from './CardComponent';
import { EnemyComponent } from './EnemyComponent';
import { RelicBar } from './RelicBar';
import { DeckViewer } from './DeckViewer';
import { getCardCostWithRelics } from '../engine/relicEffects';

interface CombatViewProps {
  state: RunState;
  onPlayCard: (instanceId: string, targetId?: string) => void;
  onAttackWithMinion: (minionId: string, targetId: string) => void;
  onEndTurn: () => void;
  onSelectMinion: (id: string | null) => void;
  onSelectCard: (id: string | null) => void;
  onExecuteEnemyTurn: () => void;
}

const statusIcons: Record<string, string> = {
  STRENGTH: '💪',
  DEXTERITY: '🏃',
  VULNERABLE: '💥',
  WEAK: '😵',
  BURN: '🔥',
  BARRIER: '🛡️',
  GUARDIAN: '🏰',
  CLOAK: '👻',
  PHASE: '✨',
  SWIFT: '⚡',
  BLITZ: '🗡️',
  DOUBLE_STRIKE: '⚔️',
  DRAIN: '🩸',
  ENRAGE: '😤',
  REGEN: '💚',
};

export function CombatView({
  state,
  onPlayCard,
  onAttackWithMinion,
  onEndTurn,
  onSelectMinion,
  onSelectCard,
  onExecuteEnemyTurn,
}: CombatViewProps) {
  const [showDeck, setShowDeck] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const isPlayerTurn = state.combatPhase === 'PLAYER_ACTING';
  const isEnemyTurn = state.combatPhase === 'ENEMY_TURN_START' || state.combatPhase === 'ENEMY_TURN_END';

  // Auto-execute enemy turn
  useEffect(() => {
    if (state.combatPhase === 'ENEMY_TURN_START') {
      const timer = setTimeout(() => {
        onExecuteEnemyTurn();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state.combatPhase, onExecuteEnemyTurn]);

  // Add floating text
  const addFloatingText = useCallback((text: string, color: string) => {
    const id = Math.random().toString(36).slice(2);
    const ft: FloatingText = { id, text, x: 50, y: 40, color, createdAt: Date.now() };
    setFloatingTexts(prev => [...prev, ft]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
    }, 1500);
  }, []);

  const handleCardClick = (instanceId: string) => {
    if (!isPlayerTurn) return;
    const card = state.hand.find(c => c.instanceId === instanceId);
    if (!card) return;
    const cost = getCardCostWithRelics(card, state.relics, state.hasHealedThisTurn);
    if (cost > state.energy) return;
    if (card.type === 'Minion' && state.board.length >= 4) return;

    onPlayCard(instanceId);
  };

  const handleMinionClick = (minionId: string) => {
    if (!isPlayerTurn) return;
    const minion = state.board.find(m => m.instanceId === minionId);
    if (!minion || minion.hasAttacked || minion.summonedThisTurn) {
      // Check SWIFT/BLITZ
      if (minion && minion.summonedThisTurn) {
        const hasSwift = minion.card.keywords.includes('SWIFT') || minion.statusEffects.some(s => s.type === 'SWIFT');
        const hasBlitz = minion.card.keywords.includes('BLITZ') || minion.statusEffects.some(s => s.type === 'BLITZ');
        if (!hasSwift && !hasBlitz) return;
      } else if (minion?.hasAttacked) {
        return;
      }
    }
    onSelectMinion(state.selectedMinionId === minionId ? null : minionId);
  };

  const handleEnemyClick = (enemyId: string) => {
    if (!isPlayerTurn) return;
    if (state.selectedMinionId) {
      onAttackWithMinion(state.selectedMinionId, enemyId);
      onSelectMinion(null);
    }
  };

  const enemy = state.currentEnemyGroup[0] || state.currentEnemy;

  return (
    <div style={styles.container}>
      {/* Relic Bar */}
      <div style={styles.topBar}>
        <RelicBar relics={state.relics} />
        <div style={styles.pileInfo}>
          <button onClick={() => setShowDeck(true)} style={styles.pileButton}>
            📚 Deck: {state.drawPile.length}
          </button>
          <button onClick={() => setShowDeck(true)} style={styles.pileButton}>
            ♻️ Discard: {state.discardPile.length}
          </button>
          {state.exhaustPile.length > 0 && (
            <button onClick={() => setShowDeck(true)} style={styles.pileButton}>
              🔥 Exhaust: {state.exhaustPile.length}
            </button>
          )}
        </div>
      </div>

      {/* Enemy Area */}
      <div style={styles.enemyArea}>
        {state.currentEnemyGroup.map(e => (
          <EnemyComponent
            key={e.id}
            enemy={e}
            onClick={() => handleEnemyClick(e.id)}
            isTargetable={!!state.selectedMinionId && isPlayerTurn}
            heroStatusEffects={state.heroStatusEffects}
          />
        ))}
      </div>

      {/* Combat Log Indicator */}
      {state.combatLog.length > 0 && (
        <div style={styles.combatLogArea}>
          <div style={styles.lastLog}>{state.combatLog[state.combatLog.length - 1]}</div>
        </div>
      )}

      {/* Player Board */}
      <div style={styles.boardArea}>
        <div style={styles.boardLabel}>YOUR BOARD</div>
        <div style={styles.boardSlots}>
          {state.board.map(minion => (
            <div
              key={minion.instanceId}
              onClick={() => handleMinionClick(minion.instanceId)}
              style={{
                ...styles.minionSlot,
                ...(state.selectedMinionId === minion.instanceId ? styles.selectedMinion : {}),
                ...(minion.hasAttacked ? styles.exhaustedMinion : {}),
                ...(minion.summonedThisTurn && !minion.card.keywords.includes('SWIFT') && !minion.card.keywords.includes('BLITZ') ? styles.summonSick : {}),
              }}
            >
              <div style={styles.minionName}>{minion.card.name}</div>
              <div style={styles.minionStats}>
                <span style={styles.atkStat}>⚔️ {minion.currentAttack}</span>
                <span style={styles.hpStat}>❤️ {minion.currentHealth}/{minion.maxHealth}</span>
              </div>
              {minion.statusEffects.length > 0 && (
                <div style={styles.minionEffects}>
                  {minion.statusEffects.map((s, i) => (
                    <span key={i} style={styles.statusBadge} title={`${s.type}: ${s.stacks}`}>
                      {statusIcons[s.type] || '?'}{s.stacks > 1 ? s.stacks : ''}
                    </span>
                  ))}
                </div>
              )}
              {minion.card.keywords.length > 0 && (
                <div style={styles.minionKeywords}>
                  {minion.card.keywords.map((kw, i) => (
                    <span key={i} style={styles.kwTag}>{kw}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {state.board.length < 4 && Array.from({ length: 4 - state.board.length }).map((_, i) => (
            <div key={`empty-${i}`} style={styles.emptySlot}>
              <span style={{ opacity: 0.3 }}>Empty</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Status */}
      <div style={styles.heroArea}>
        <div style={styles.heroInfo}>
          <div style={styles.heroHP}>
            <span style={styles.hpLabel}>HP</span>
            <div style={styles.hpBarOuter}>
              <div
                style={{
                  ...styles.hpBarInner,
                  width: `${(state.heroHealth / state.maxHeroHealth) * 100}%`,
                  backgroundColor: state.heroHealth / state.maxHeroHealth > 0.5 ? '#4ade80' :
                    state.heroHealth / state.maxHeroHealth > 0.25 ? '#facc15' : '#ef4444',
                }}
              />
            </div>
            <span style={styles.hpText}>{state.heroHealth}/{state.maxHeroHealth}</span>
          </div>
          {state.heroBlock > 0 && (
            <div style={styles.blockDisplay}>🛡️ {state.heroBlock}</div>
          )}
          <div style={styles.energyDisplay}>
            {Array.from({ length: state.maxEnergy }).map((_, i) => (
              <span key={i} style={i < state.energy ? styles.energyFull : styles.energyEmpty}>
                ◆
              </span>
            ))}
            <span style={styles.energyText}>{state.energy}/{state.maxEnergy}</span>
          </div>
          {state.heroStatusEffects.length > 0 && (
            <div style={styles.heroEffects}>
              {state.heroStatusEffects.map((s, i) => (
                <span key={i} style={styles.statusBadge} title={`${s.type}: ${s.stacks}`}>
                  {statusIcons[s.type] || '?'}{s.stacks > 1 ? s.stacks : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hand */}
      <div style={styles.handArea}>
        <div style={styles.handContainer}>
          {state.hand.map((card, index) => {
            const effectiveCost = getCardCostWithRelics(card, state.relics, state.hasHealedThisTurn);
            const canAfford = effectiveCost <= state.energy;
            const boardFull = card.type === 'Minion' && state.board.length >= 4;
            return (
              <div
                key={card.instanceId}
                style={{
                  ...styles.handCard,
                  transform: `rotate(${(index - (state.hand.length - 1) / 2) * 3}deg)`,
                  zIndex: state.selectedCardId === card.instanceId ? 100 : index + 1,
                }}
              >
                <CardComponent
                  card={card}
                  onClick={() => handleCardClick(card.instanceId)}
                  disabled={!canAfford || boardFull || !isPlayerTurn}
                  selected={state.selectedCardId === card.instanceId}
                  effectiveCost={effectiveCost}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionBar}>
        <button
          onClick={onEndTurn}
          disabled={!isPlayerTurn}
          style={{
            ...styles.endTurnButton,
            ...(isPlayerTurn ? styles.endTurnActive : styles.endTurnDisabled),
          }}
        >
          {isPlayerTurn ? 'END TURN' : isEnemyTurn ? 'ENEMY TURN...' : 'WAITING...'}
        </button>
        <button onClick={() => setShowDeck(true)} style={styles.viewButton}>
          VIEW DECK
        </button>
      </div>

      {/* Turn Indicator */}
      <div style={styles.turnIndicator}>
        Turn {state.turn}
      </div>

      {/* Floating Damage Numbers */}
      {floatingTexts.map(ft => (
        <div
          key={ft.id}
          style={{
            ...styles.floatingText,
            color: ft.color,
            left: `${ft.x}%`,
            top: `${ft.y}%`,
          }}
        >
          {ft.text}
        </div>
      ))}

      {/* Deck Viewer */}
      {showDeck && (
        <DeckViewer
          deck={state.deck}
          drawPile={state.drawPile}
          discardPile={state.discardPile}
          exhaustPile={state.exhaustPile}
          isOpen={showDeck}
          onClose={() => setShowDeck(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#fff',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
    height: '44px',
  },
  pileInfo: {
    display: 'flex',
    gap: '8px',
  },
  pileButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ccc',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  enemyArea: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px',
    gap: '20px',
    flex: '0 0 auto',
    minHeight: '160px',
  },
  combatLogArea: {
    textAlign: 'center',
    padding: '2px 12px',
    flexShrink: 0,
  },
  lastLog: {
    fontSize: '12px',
    color: '#aaa',
    fontStyle: 'italic',
  },
  boardArea: {
    padding: '8px 20px',
    flex: '0 0 auto',
  },
  boardLabel: {
    fontSize: '11px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: '6px',
    textAlign: 'center',
  },
  boardSlots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  minionSlot: {
    width: '130px',
    padding: '8px',
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  },
  selectedMinion: {
    border: '2px solid #ffd700',
    boxShadow: '0 0 15px rgba(255,215,0,0.5)',
    transform: 'scale(1.05)',
  },
  exhaustedMinion: {
    opacity: 0.6,
  },
  summonSick: {
    opacity: 0.5,
    border: '2px dashed rgba(255,255,255,0.2)',
  },
  emptySlot: {
    width: '130px',
    padding: '8px',
    background: 'rgba(255,255,255,0.03)',
    border: '2px dashed rgba(255,255,255,0.1)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#555',
    fontSize: '12px',
  },
  minionName: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  minionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '2px',
  },
  atkStat: { color: '#facc15' },
  hpStat: { color: '#ef4444' },
  minionEffects: {
    display: 'flex',
    gap: '2px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '2px',
  },
  minionKeywords: {
    display: 'flex',
    gap: '2px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '2px',
  },
  kwTag: {
    fontSize: '9px',
    background: 'rgba(100,100,255,0.3)',
    padding: '1px 4px',
    borderRadius: '3px',
    color: '#aac',
  },
  statusBadge: {
    fontSize: '12px',
    background: 'rgba(255,255,255,0.1)',
    padding: '1px 3px',
    borderRadius: '4px',
    cursor: 'help',
  },
  heroArea: {
    padding: '6px 20px',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    background: 'rgba(255,255,255,0.05)',
    padding: '8px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  heroHP: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  hpLabel: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 'bold',
  },
  hpBarOuter: {
    width: '120px',
    height: '16px',
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  hpBarInner: {
    height: '100%',
    borderRadius: '8px',
    transition: 'width 0.5s ease, background-color 0.5s ease',
  },
  hpText: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '60px',
  },
  blockDisplay: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#60a5fa',
    background: 'rgba(96,165,250,0.15)',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  energyDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  energyFull: {
    color: '#60a5fa',
    fontSize: '18px',
    textShadow: '0 0 8px rgba(96,165,250,0.8)',
  },
  energyEmpty: {
    color: '#333',
    fontSize: '18px',
  },
  energyText: {
    fontSize: '14px',
    color: '#60a5fa',
    fontWeight: 'bold',
    marginLeft: '4px',
  },
  heroEffects: {
    display: 'flex',
    gap: '4px',
  },
  handArea: {
    padding: '4px 20px 12px',
    flex: '1 1 auto',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: '180px',
    overflow: 'visible',
  },
  handContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '-10px',
    perspective: '1000px',
  },
  handCard: {
    transition: 'transform 0.2s ease, z-index 0.2s ease',
    marginLeft: '-15px',
    transformOrigin: 'bottom center',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '8px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  endTurnButton: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    transition: 'all 0.2s ease',
  },
  endTurnActive: {
    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
    color: '#000',
    boxShadow: '0 0 20px rgba(74,222,128,0.4)',
  },
  endTurnDisabled: {
    background: '#333',
    color: '#666',
    cursor: 'not-allowed',
  },
  viewButton: {
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#aaa',
    cursor: 'pointer',
  },
  turnIndicator: {
    position: 'absolute',
    top: '50px',
    right: '12px',
    fontSize: '12px',
    color: '#666',
  },
  floatingText: {
    position: 'absolute',
    fontSize: '24px',
    fontWeight: 'bold',
    pointerEvents: 'none',
    animation: 'floatUp 1.5s ease-out forwards',
    textShadow: '0 0 10px currentColor',
  },
};

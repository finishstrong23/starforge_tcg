import React, { useCallback, useState } from 'react';
import type { CardInstance, CombatState } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { playCard, attackWithMinion, endPlayerTurn } from '../engine/combat';
import { EnemyComponent } from './EnemyComponent';
import { HandComponent } from './HandComponent';
import { CardComponent } from './CardComponent';

// ─── HUD sub-component ────────────────────────────────────────────────────────

const EnergyPips: React.FC<{ current: number; max: number }> = ({ current, max }) => (
  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: i < current ? '#00aaff' : '#1a2a3a',
          border: '1px solid #2a3a4a',
          boxShadow: i < current ? '0 0 6px #00aaff88' : 'none',
          transition: 'background 200ms',
        }}
      />
    ))}
  </div>
);

const StatusBadges: React.FC<{ effects: CombatState['playerStatusEffects'] }> = ({ effects }) => {
  const ICONS: Record<string, string> = {
    burn: '🔥', poison: '☠', shield: '🛡', strength: '💪',
    weak: '⬇', vulnerable: '↓', barrier: '🔷', stealth: '👤', phase: '✦',
  };
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {effects.map((e) => (
        <span
          key={e.type}
          title={`${e.type} ×${e.stacks}`}
          style={{
            fontSize: 10,
            padding: '2px 5px',
            background: '#ffffff14',
            borderRadius: 3,
            letterSpacing: '0.04em',
          }}
        >
          {ICONS[e.type] ?? '?'} {e.stacks}
        </span>
      ))}
    </div>
  );
};

// ─── Board row ────────────────────────────────────────────────────────────────

const BoardRow: React.FC<{
  cards: CardInstance[];
  label: string;
  selectedId: string | null;
  targetableIds?: Set<string>;
  onCardClick: (id: string) => void;
}> = ({ cards, label, selectedId, targetableIds, onCardClick }) => {
  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minHeight: 30,
      padding: '4px 8px',
      width: '100%',
    },
    label: {
      fontSize: 8,
      letterSpacing: '0.2em',
      opacity: 0.3,
      textTransform: 'uppercase',
      alignSelf: 'flex-start',
    },
    row: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
  };

  if (cards.length === 0) return null;

  return (
    <div style={s.wrapper}>
      <div style={s.label}>{label}</div>
      <div style={s.row}>
        {cards.map((c) => (
          <CardComponent
            key={c.instanceId}
            card={c}
            compact
            selected={c.instanceId === selectedId}
            targetable={targetableIds?.has(c.instanceId)}
            onClick={() => onCardClick(c.instanceId)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Combat log ───────────────────────────────────────────────────────────────

const CombatLog: React.FC<{ log: string[] }> = ({ log }) => (
  <div
    style={{
      width: '100%',
      padding: '4px 10px',
      background: '#06060e',
      borderTop: '1px solid #1a1a2e',
      borderBottom: '1px solid #1a1a2e',
      maxHeight: 56,
      overflowY: 'auto',
    }}
  >
    {log.slice(-4).map((entry, i) => (
      <div
        key={i}
        style={{
          fontSize: 9,
          color: i === log.length - 1 ? '#ddd' : '#777',
          lineHeight: 1.5,
          letterSpacing: '0.03em',
        }}
      >
        {entry}
      </div>
    ))}
  </div>
);

// ─── HUD bar ─────────────────────────────────────────────────────────────────

interface HUDProps {
  cs: CombatState;
  onEndTurn: () => void;
  isEnemyTurn: boolean;
}

const HUDBar: React.FC<HUDProps> = ({ cs, onEndTurn, isEnemyTurn }) => {
  const hpPct = Math.max(0, (cs.playerHealth / cs.playerMaxHealth) * 100);
  const hpColor = hpPct > 60 ? '#22cc44' : hpPct > 30 ? '#ffcc00' : '#ff4444';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: '#08081a',
        borderTop: '1px solid #1a1a2e',
        gap: 10,
        flexShrink: 0,
      }}
    >
      {/* HP block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa' }}>
          <span>HP</span>
          <span style={{ color: hpColor, fontWeight: 700 }}>
            {cs.playerHealth}/{cs.playerMaxHealth}
          </span>
        </div>
        <div style={{ width: '100%', height: 5, background: '#1a1a2e', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: 3, transition: 'width 300ms' }} />
        </div>
        {cs.playerShield > 0 && (
          <div style={{ fontSize: 9, color: '#3b8fff', fontWeight: 600 }}>🛡 {cs.playerShield}</div>
        )}
      </div>

      {/* Status effects */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <StatusBadges effects={cs.playerStatusEffects} />
      </div>

      {/* Energy */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{ fontSize: 8, opacity: 0.4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Energy</div>
        <EnergyPips current={cs.playerEnergy} max={cs.playerMaxEnergy} />
      </div>

      {/* End turn */}
      <button
        type="button"
        onClick={onEndTurn}
        disabled={isEnemyTurn}
        style={{
          padding: '7px 14px',
          background: isEnemyTurn ? 'transparent' : 'linear-gradient(180deg, #ffcc00, #cc9900)',
          color: isEnemyTurn ? '#555' : '#0a0a12',
          border: isEnemyTurn ? '1px solid #2a2a3a' : '1px solid #ffcc00',
          borderRadius: 4,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.12em',
          cursor: isEnemyTurn ? 'default' : 'pointer',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {isEnemyTurn ? 'Enemy Turn' : 'End Turn'}
      </button>
    </div>
  );
};

// ─── CombatView ───────────────────────────────────────────────────────────────

export const CombatView: React.FC = () => {
  const { runState, setCombatState } = useDungeonRun();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedMinionId, setSelectedMinionId] = useState<string | null>(null);

  const cs = runState?.combatState;
  const relics = runState?.relics ?? [];

  const handleCardSelect = useCallback((instanceId: string) => {
    if (!cs) return;
    if (selectedCardId === instanceId) {
      setSelectedCardId(null);
      return;
    }
    setSelectedCardId(instanceId);
    setSelectedMinionId(null);
  }, [cs, selectedCardId]);

  const handleEnemyClick = useCallback(() => {
    if (!cs) return;

    // Play selected hand card targeting the enemy
    if (selectedCardId) {
      const next = playCard(cs, selectedCardId, 'enemy');
      setSelectedCardId(null);
      setCombatState(next);
      return;
    }

    // Attack with selected player minion
    if (selectedMinionId) {
      // If enemy board has a GUARDIAN, must target it first
      const guardians = cs.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN'));
      const targetId = guardians.length > 0 ? guardians[0].instanceId : 'enemy';
      const next = attackWithMinion(cs, selectedMinionId, targetId);
      setSelectedMinionId(null);
      setCombatState(next);
    }
  }, [cs, selectedCardId, selectedMinionId, setCombatState]);

  const handleEnemyMinionClick = useCallback((minionId: string) => {
    if (!cs) return;

    if (selectedCardId) {
      const next = playCard(cs, selectedCardId, minionId);
      setSelectedCardId(null);
      setCombatState(next);
      return;
    }

    if (selectedMinionId) {
      const next = attackWithMinion(cs, selectedMinionId, minionId);
      setSelectedMinionId(null);
      setCombatState(next);
    }
  }, [cs, selectedCardId, selectedMinionId, setCombatState]);

  const handlePlayerMinionClick = useCallback((minionId: string) => {
    if (!cs) return;
    const minion = cs.playerBoard.find((m) => m.instanceId === minionId);
    if (!minion) return;
    if (minion.hasAttacked) return;
    setSelectedMinionId(minionId === selectedMinionId ? null : minionId);
    setSelectedCardId(null);
  }, [cs, selectedMinionId]);

  const handleEndTurn = useCallback(() => {
    if (!cs) return;
    setSelectedCardId(null);
    setSelectedMinionId(null);
    const next = endPlayerTurn(cs, relics);
    setCombatState(next);
  }, [cs, relics, setCombatState]);

  if (!cs) return null;

  const isEnemyTurn = cs.phase === 'enemy_turn';
  const isCombatOver = cs.phase === 'combat_end_win' || cs.phase === 'combat_end_loss';

  // Which enemy minions are targetable
  const enemyGuardians = cs.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN'));
  const targetableEnemyMinionIds = new Set<string>(
    enemyGuardians.length > 0
      ? enemyGuardians.map((m) => m.instanceId)
      : (selectedCardId || selectedMinionId)
      ? cs.enemyBoard.map((m) => m.instanceId)
      : [],
  );

  const canTargetEnemy =
    (selectedCardId !== null || selectedMinionId !== null) && enemyGuardians.length === 0;

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'radial-gradient(ellipse at top, #0d0d20 0%, #080810 100%)',
      color: '#f0f0f8',
      overflow: 'hidden',
      userSelect: 'none',
    },
    enemySection: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '10px 8px 4px',
      flexShrink: 0,
    },
    boardSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    boardDivider: {
      width: '90%',
      alignSelf: 'center',
      height: 1,
      background: 'linear-gradient(90deg, transparent, #3a3a5a, transparent)',
      margin: '4px 0',
      flexShrink: 0,
    },
    handSection: {
      flexShrink: 0,
      borderTop: '1px solid #1a1a2e',
      padding: '4px 0',
      maxHeight: 200,
      overflowY: 'auto',
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      zIndex: 10,
      gap: 12,
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: '0.15em',
    },
  };

  return (
    <div style={s.root}>
      {/* Combat-end overlay */}
      {isCombatOver && (
        <div style={s.overlay}>
          {cs.phase === 'combat_end_win' ? (
            <>
              <span>⚔️ Victory!</span>
              <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>Collecting rewards…</span>
            </>
          ) : (
            <>
              <span style={{ color: '#ff4444' }}>💀 Defeated</span>
              <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>The dungeon claims another soul.</span>
            </>
          )}
        </div>
      )}

      {/* Enemy section */}
      <div style={s.enemySection}>
        <EnemyComponent
          enemy={cs.enemy}
          isTargeted={canTargetEnemy}
          onClick={canTargetEnemy ? handleEnemyClick : undefined}
        />
      </div>

      {/* Board section */}
      <div style={s.boardSection}>
        <BoardRow
          cards={cs.enemyBoard}
          label="Enemy Minions"
          selectedId={null}
          targetableIds={targetableEnemyMinionIds}
          onCardClick={handleEnemyMinionClick}
        />

        <div style={s.boardDivider} />

        <BoardRow
          cards={cs.playerBoard}
          label="Your Minions"
          selectedId={selectedMinionId}
          onCardClick={handlePlayerMinionClick}
        />
      </div>

      {/* Combat log */}
      <CombatLog log={cs.combatLog} />

      {/* Hand */}
      <div style={s.handSection}>
        <HandComponent
          hand={cs.hand}
          energy={cs.playerEnergy}
          selectedId={selectedCardId}
          onCardSelect={handleCardSelect}
          disabled={isEnemyTurn || isCombatOver}
        />
      </div>

      {/* HUD */}
      <HUDBar cs={cs} onEndTurn={handleEndTurn} isEnemyTurn={isEnemyTurn || isCombatOver} />
    </div>
  );
};

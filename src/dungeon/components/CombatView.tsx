import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CardInstance, CombatState } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { playCard, attackWithMinion, endPlayerTurn, executeEnemyTurn } from '../engine/combat';
import { EnemyComponent } from './EnemyComponent';
import { HandComponent } from './HandComponent';
import { CardComponent } from './CardComponent';

const ENEMY_TURN_DELAY_MS = 1200;
const ENEMY_ACTION_LINGER_MS = 900;
const FLOAT_DURATION_MS = 1300;

// ─── Floating combat numbers ──────────────────────────────────────────────────

interface FloatNum {
  id: number;
  text: string;
  color: string;
  shadow: string;
  top: string;
  left: string;
}

let _floatId = 0;

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

const CombatLog: React.FC<{ log: string[] }> = ({ log }) => {
  const visible = log.slice(-7);
  return (
    <div
      style={{
        width: '100%',
        padding: '8px 16px 10px',
        background: 'linear-gradient(180deg, #07070f 0%, #0a0a1a 100%)',
        border: '1px solid #1a1a2e',
        maxHeight: 130,
        overflowY: 'auto',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: 8,
          letterSpacing: '0.25em',
          color: '#c89b3c',
          opacity: 0.55,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        ▸ Combat Log
      </div>
      {visible.map((entry, i) => {
        const isLatest = i === visible.length - 1;
        return (
          <div
            key={`${log.length - visible.length + i}-${entry}`}
            style={{
              fontSize: 11,
              color: isLatest ? '#e8e8ff' : '#666',
              lineHeight: 1.5,
              letterSpacing: '0.03em',
              fontWeight: isLatest ? 600 : 400,
              padding: '1px 0',
              animation: isLatest ? 'dungeonLogSlide 300ms ease-out' : undefined,
            }}
          >
            <span style={{ color: '#c89b3c88', marginRight: 6 }}>›</span>
            {entry}
          </div>
        );
      })}
    </div>
  );
};

// ─── HUD bar ─────────────────────────────────────────────────────────────────

interface HUDProps {
  cs: CombatState;
  onEndTurn: () => void;
  isEnemyTurn: boolean;
  shakeKey: number;
}

const HUDBar: React.FC<HUDProps> = ({ cs, onEndTurn, isEnemyTurn, shakeKey }) => {
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
      {/* Status effects (left) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
        <StatusBadges effects={cs.playerStatusEffects} />
      </div>

      {/* HP block (center) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 140, alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa', width: '100%' }}>
          <span>HP</span>
          <span style={{ color: hpColor, fontWeight: 700 }}>
            {cs.playerHealth}/{cs.playerMaxHealth}
          </span>
        </div>
        {/* HP bar shakes when player takes damage */}
        <div
          key={`shake-${shakeKey}`}
          style={{
            width: '100%',
            height: 6,
            background: '#1a1a2e',
            borderRadius: 3,
            overflow: 'hidden',
            animation: shakeKey > 0 ? 'dungeonShake 320ms ease-out' : undefined,
          }}
        >
          <div style={{ width: `${hpPct}%`, height: '100%', background: hpColor, borderRadius: 3, transition: 'width 300ms' }} />
        </div>
        {cs.playerShield > 0 && (
          <div style={{ fontSize: 10, color: '#3b8fff', fontWeight: 700, textShadow: '0 0 6px #3b8fff66' }}>
            🛡 {cs.playerShield}
          </div>
        )}
      </div>

      {/* Energy + End turn (right) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 8, opacity: 0.4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Energy</div>
          <EnergyPips current={cs.playerEnergy} max={cs.playerMaxEnergy} />
        </div>

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
    </div>
  );
};

// ─── CombatView ───────────────────────────────────────────────────────────────

// Spread float numbers horizontally so multi-hit stacks are readable
const X_SLOTS = [38, 48, 56, 44, 52, 42, 58] as const;
let _xSlot = 0;
const nextX = () => `${X_SLOTS[_xSlot++ % X_SLOTS.length]}%`;

export const CombatView: React.FC = () => {
  const { runState, setCombatState } = useDungeonRun();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedMinionId, setSelectedMinionId] = useState<string | null>(null);
  const [enemyActing, setEnemyActing] = useState(false);

  // ── Floating numbers + flash state ─────────────────────────────────────────
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const [enemyFlashKey, setEnemyFlashKey] = useState(0);
  const [playerFlashKey, setPlayerFlashKey] = useState(0);
  const [playerHealKey, setPlayerHealKey] = useState(0);
  const [playerShakeKey, setPlayerShakeKey] = useState(0);

  const prevPlayerHP    = useRef<number | null>(null);
  const prevEnemyHP     = useRef<number | null>(null);
  const prevPlayerShield = useRef<number | null>(null);
  const prevEnemyShield  = useRef<number | null>(null);

  const cs = runState?.combatState;
  const relics = runState?.relics ?? [];

  // Spawn a floating number and auto-remove after animation
  const spawnFloat = useCallback((
    text: string,
    color: string,
    shadow: string,
    top: string,
  ) => {
    const id = ++_floatId;
    const left = nextX();
    setFloatNums((prev) => [...prev, { id, text, color, shadow, top, left }]);
    window.setTimeout(() => {
      setFloatNums((prev) => prev.filter((f) => f.id !== id));
    }, FLOAT_DURATION_MS);
  }, []);

  // Watch HP/shield changes, spawn floats + trigger flashes
  useEffect(() => {
    if (!cs) return;

    const enemyHP     = cs.enemy.currentHealth;
    const enemyShield = cs.enemy.currentShield;
    const playerHP    = cs.playerHealth;
    const playerShield = cs.playerShield;

    // Enemy takes damage
    if (prevEnemyHP.current !== null && enemyHP < prevEnemyHP.current) {
      const rawDmg = prevEnemyHP.current - enemyHP;
      // If shield also dropped, show both numbers
      if (prevEnemyShield.current !== null && prevEnemyShield.current > enemyShield) {
        const blocked = prevEnemyShield.current - enemyShield;
        spawnFloat(`🛡 ${blocked}`, '#3b8fff', '#001a4488', '16%');
      }
      spawnFloat(`-${rawDmg}`, '#ff4455', '#ff000044', '22%');
      setEnemyFlashKey((k) => k + 1);
    }
    // Enemy gains shield
    if (prevEnemyShield.current !== null && enemyShield > prevEnemyShield.current) {
      spawnFloat(`+🛡 ${enemyShield - prevEnemyShield.current}`, '#3b8fff', '#001a8888', '18%');
    }

    // Player takes damage
    if (prevPlayerHP.current !== null && playerHP < prevPlayerHP.current) {
      const rawDmg = prevPlayerHP.current - playerHP;
      if (prevPlayerShield.current !== null && prevPlayerShield.current > playerShield) {
        const blocked = prevPlayerShield.current - playerShield;
        spawnFloat(`🛡 ${blocked}`, '#3b8fff', '#001a4488', '72%');
      }
      spawnFloat(`-${rawDmg}`, '#ff4455', '#ff000044', '78%');
      setPlayerFlashKey((k) => k + 1);
      setPlayerShakeKey((k) => k + 1);
    }
    // Player heals
    if (prevPlayerHP.current !== null && playerHP > prevPlayerHP.current) {
      spawnFloat(`+${playerHP - prevPlayerHP.current}`, '#22dd66', '#00aa4444', '74%');
      setPlayerHealKey((k) => k + 1);
    }
    // Player gains shield
    if (prevPlayerShield.current !== null && playerShield > prevPlayerShield.current) {
      spawnFloat(`+🛡 ${playerShield - prevPlayerShield.current}`, '#3b8fff', '#001a8888', '76%');
    }

    prevPlayerHP.current    = playerHP;
    prevEnemyHP.current     = enemyHP;
    prevPlayerShield.current = playerShield;
    prevEnemyShield.current  = enemyShield;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs?.playerHealth, cs?.enemy.currentHealth, cs?.playerShield, cs?.enemy.currentShield]);

  // Initialise refs on first render so first-turn changes don't misfire
  useEffect(() => {
    if (!cs || prevPlayerHP.current !== null) return;
    prevPlayerHP.current     = cs.playerHealth;
    prevEnemyHP.current      = cs.enemy.currentHealth;
    prevPlayerShield.current  = cs.playerShield;
    prevEnemyShield.current   = cs.enemy.currentShield;
  }, [cs]);

  // Attack cards need to click an enemy target. Everything else plays immediately.
  const needsTarget = (card: CardInstance): boolean => card.type === 'Attack';

  const handleCardSelect = useCallback((instanceId: string) => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;
    const card = cs.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;

    if (!needsTarget(card)) {
      const next = playCard(cs, instanceId, 'enemy');
      setSelectedCardId(null);
      setSelectedMinionId(null);
      setCombatState(next);
      return;
    }

    if (selectedCardId === instanceId) {
      setSelectedCardId(null);
      return;
    }
    setSelectedCardId(instanceId);
    setSelectedMinionId(null);
  }, [cs, selectedCardId, setCombatState]);

  const handleEnemyClick = useCallback(() => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;

    if (selectedCardId) {
      const next = playCard(cs, selectedCardId, 'enemy');
      setSelectedCardId(null);
      setCombatState(next);
      return;
    }

    if (selectedMinionId) {
      const guardians = cs.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN'));
      const targetId = guardians.length > 0 ? guardians[0].instanceId : 'enemy';
      const next = attackWithMinion(cs, selectedMinionId, targetId);
      setSelectedMinionId(null);
      setCombatState(next);
    }
  }, [cs, selectedCardId, selectedMinionId, setCombatState]);

  const handleEnemyMinionClick = useCallback((minionId: string) => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;

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
    if (cs.phase !== 'player_turn') return;
    const minion = cs.playerBoard.find((m) => m.instanceId === minionId);
    if (!minion) return;
    if (minion.hasAttacked) return;
    setSelectedMinionId(minionId === selectedMinionId ? null : minionId);
    setSelectedCardId(null);
  }, [cs, selectedMinionId]);

  const handleEndTurn = useCallback(() => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;
    setSelectedCardId(null);
    setSelectedMinionId(null);
    const next = endPlayerTurn(cs, relics);
    setCombatState(next);
  }, [cs, relics, setCombatState]);

  // Drive enemy turn with staged delay
  useEffect(() => {
    if (!cs) return;
    if (cs.phase !== 'enemy_turn') {
      setEnemyActing(false);
      return;
    }
    let resolveId: number | null = null;
    const showIntentId = window.setTimeout(() => {
      setEnemyActing(true);
      resolveId = window.setTimeout(() => {
        const next = executeEnemyTurn(cs);
        setCombatState(next);
      }, ENEMY_ACTION_LINGER_MS);
    }, ENEMY_TURN_DELAY_MS);
    return () => {
      window.clearTimeout(showIntentId);
      if (resolveId !== null) window.clearTimeout(resolveId);
    };
  }, [cs, setCombatState]);

  if (!cs) return null;

  const isEnemyTurn = cs.phase === 'enemy_turn';
  const isCombatOver = cs.phase === 'combat_end_win' || cs.phase === 'combat_end_loss';

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
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a1830 0%, #0a0a18 45%, #050510 100%)',
      color: '#f0f0f8',
      overflow: 'hidden',
      userSelect: 'none',
      position: 'relative',
    },
    enemySection: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '32px 16px 18px',
      flexShrink: 0,
      borderBottom: '1px solid #1a1a2e',
      background: 'linear-gradient(180deg, rgba(70,20,40,0.14) 0%, rgba(10,10,22,0) 100%)',
      position: 'relative',
      overflow: 'hidden',
    },
    boardSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '8px 0',
      gap: 0,
    },
    handSection: {
      flexShrink: 0,
      borderTop: '1px solid #1a1a2e',
      padding: '8px 0 6px',
      maxHeight: 220,
      overflowY: 'auto',
      background: 'linear-gradient(0deg, rgba(40,40,80,0.18) 0%, rgba(10,10,22,0) 100%)',
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
    turnBanner: {
      position: 'absolute',
      top: 8,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 5,
      padding: '5px 16px',
      background: isEnemyTurn
        ? 'linear-gradient(180deg, #3a0e14 0%, #200608 100%)'
        : 'linear-gradient(180deg, #0e1a3a 0%, #060820 100%)',
      border: isEnemyTurn ? '1px solid #ff4466' : '1px solid #3b8fff',
      color: isEnemyTurn ? '#ff8899' : '#8ab5ff',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      borderRadius: 4,
      boxShadow: isEnemyTurn ? '0 0 14px #ff446644' : '0 0 10px #3b8fff33',
      animation: isEnemyTurn ? 'dungeonTurnPulse 900ms ease-in-out infinite' : undefined,
      whiteSpace: 'nowrap',
    },
  };

  return (
    <div style={s.root}>
      <style>{`
        @keyframes dungeonTurnPulse {
          0%, 100% { filter: brightness(1); }
          50%      { filter: brightness(1.35); }
        }
        @keyframes dungeonIntentPulse {
          0%, 100% { box-shadow: 0 0 0 0 currentColor, 0 0 6px 0 rgba(255,255,255,0.02); transform: scale(1); }
          50%      { box-shadow: 0 0 0 3px currentColor, 0 0 22px 2px currentColor; transform: scale(1.03); }
        }
        @keyframes dungeonLogSlide {
          0%   { opacity: 0; transform: translateX(-10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes dungeonFloatUp {
          0%   { opacity: 1;   transform: translateY(0)     scale(1);    }
          15%  { opacity: 1;   transform: translateY(-10px) scale(1.18); }
          100% { opacity: 0;   transform: translateY(-64px) scale(0.88); }
        }
        @keyframes dungeonDmgFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes dungeonHealFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes dungeonShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-4px); }
          40%  { transform: translateX(4px); }
          60%  { transform: translateX(-3px); }
          80%  { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* ── Floating combat numbers (absolute over root) ─── */}
      {floatNums.map((f) => (
        <div
          key={f.id}
          style={{
            position: 'absolute',
            top: f.top,
            left: f.left,
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            fontSize: 26,
            fontWeight: 900,
            color: f.color,
            textShadow: `0 0 12px ${f.shadow}, 0 2px 4px rgba(0,0,0,0.8)`,
            letterSpacing: '-0.02em',
            animation: `dungeonFloatUp ${FLOAT_DURATION_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
            fontFamily: 'monospace',
          }}
        >
          {f.text}
        </div>
      ))}

      <div style={s.turnBanner}>
        {isEnemyTurn ? '⚠ Enemy Turn' : `Your Turn · ${cs.turn}`}
      </div>

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

      {/* ── Enemy section ── */}
      <div style={s.enemySection}>
        {/* Red flash on enemy damage */}
        {enemyFlashKey > 0 && (
          <div
            key={`ef-${enemyFlashKey}`}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,40,60,0.30)',
              pointerEvents: 'none',
              zIndex: 3,
              animation: 'dungeonDmgFlash 500ms ease-out forwards',
            }}
          />
        )}
        {/* Player-heal (enemy section shows nothing for heal; kept for parity) */}
        <EnemyComponent
          enemy={cs.enemy}
          isTargeted={canTargetEnemy}
          intentPulsing={isEnemyTurn}
          intentResolving={enemyActing}
          onClick={canTargetEnemy ? handleEnemyClick : undefined}
        />
      </div>

      {/* ── Board section ── */}
      <div style={s.boardSection}>
        <BoardRow
          cards={cs.enemyBoard}
          label="Enemy Minions"
          selectedId={null}
          targetableIds={targetableEnemyMinionIds}
          onCardClick={handleEnemyMinionClick}
        />

        {/* Combat log sits in the center of the battlefield */}
        <CombatLog log={cs.combatLog} />

        <BoardRow
          cards={cs.playerBoard}
          label="Your Minions"
          selectedId={selectedMinionId}
          onCardClick={handlePlayerMinionClick}
        />
      </div>

      {/* ── Hand ── */}
      {/* Player damage flash behind hand */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {playerFlashKey > 0 && (
          <div
            key={`pf-${playerFlashKey}`}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,40,60,0.22)',
              pointerEvents: 'none',
              zIndex: 3,
              animation: 'dungeonDmgFlash 500ms ease-out forwards',
            }}
          />
        )}
        {playerHealKey > 0 && (
          <div
            key={`ph-${playerHealKey}`}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(40,220,100,0.18)',
              pointerEvents: 'none',
              zIndex: 3,
              animation: 'dungeonHealFlash 600ms ease-out forwards',
            }}
          />
        )}
        <div style={s.handSection}>
          <HandComponent
            hand={cs.hand}
            energy={cs.playerEnergy}
            selectedId={selectedCardId}
            onCardSelect={handleCardSelect}
            disabled={isEnemyTurn || isCombatOver}
          />
        </div>
      </div>

      {/* ── HUD ── */}
      <HUDBar
        cs={cs}
        onEndTurn={handleEndTurn}
        isEnemyTurn={isEnemyTurn || isCombatOver}
        shakeKey={playerShakeKey}
      />
    </div>
  );
};

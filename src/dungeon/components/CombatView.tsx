import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CardDefinition, CardInstance, CombatState } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { playCard, attackWithMinion, endPlayerTurn, executeEnemyTurn, getCardChoice, applyAugment } from '../engine/combat';
import { CARD_POOL } from '../data/cards';
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


// ─── Status strip ─────────────────────────────────────────────────────────────
// Horizontal bar that runs left-to-right above or below the combat log,
// showing every active buff / debuff / rift on a side. Replaces the cramped
// HUD-corner badges with a prominent, scannable row.

const STATUS_META: Record<string, { emoji: string; color: string; label: string }> = {
  burn:       { emoji: '🔥', color: '#ff5a2e', label: 'Burn'        },
  poison:     { emoji: '☠',  color: '#44cc44', label: 'Poison'      },
  shield:     { emoji: '🛡', color: '#3b8fff', label: 'Shield'      },
  strength:   { emoji: '💪', color: '#ffcc00', label: 'Strength'    },
  weak:       { emoji: '⬇',  color: '#aaaaaa', label: 'Weak'        },
  vulnerable: { emoji: '↓',  color: '#ff8c00', label: 'Vulnerable'  },
  barrier:    { emoji: '🔷', color: '#00aaff', label: 'Barrier'     },
  stealth:    { emoji: '👤', color: '#cccccc', label: 'Stealth'     },
  phase:      { emoji: '✦',  color: '#c27dff', label: 'Phase'       },
};

const RIFT_META: Record<string, { emoji: string; color: string; label: string; tip: (turns: number) => string }> = {
  cost:    { emoji: '⚡', color: '#c27dff', label: 'Cost Rift',    tip: (t) => `Cost Rift: 1 random card costs −1 each turn (${t} left)` },
  genesis: { emoji: '⚡', color: '#ff7acc', label: 'Genesis Rift', tip: (t) => `Genesis Rift: +2 Energy this turn (${t} left)`         },
  energy:  { emoji: '⚡', color: '#4adfff', label: 'Energy Rift',  tip: (t) => `Energy Rift: +1 Energy each turn (${t} left)`          },
  chaos:   { emoji: '⚡', color: '#ffd24a', label: 'Chaos Rift',   tip: (t) => `Chaos Rift: deals 3 to enemy each turn (${t} left)`    },
};

interface StatusStripProps {
  effects: CombatState['playerStatusEffects'];
  rifts?: CombatState['playerRifts'];
  side: 'enemy' | 'player';
  label?: string;
}

const StatusStrip: React.FC<StatusStripProps> = ({ effects, rifts = [], side, label }) => {
  const empty = effects.length === 0 && rifts.length === 0;

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 14px',
    minHeight: 28,
    background: side === 'enemy'
      ? 'linear-gradient(180deg, rgba(60,16,28,0.32) 0%, rgba(10,10,22,0) 100%)'
      : 'linear-gradient(0deg,  rgba(20,32,60,0.32) 0%, rgba(10,10,22,0) 100%)',
    borderTop: side === 'enemy' ? 'none' : '1px solid #1a1a2e',
    borderBottom: side === 'enemy' ? '1px solid #1a1a2e' : 'none',
    flexShrink: 0,
    flexWrap: 'wrap',
    overflowX: 'auto',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: side === 'enemy' ? '#cc7788' : '#88aacc',
    opacity: 0.55,
    flexShrink: 0,
    minWidth: 50,
  };

  const chipBase = (color: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    background: `${color}22`,
    border: `1px solid ${color}88`,
    borderRadius: 4,
    color,
    letterSpacing: '0.04em',
    boxShadow: `0 0 6px ${color}44`,
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  });

  return (
    <div style={wrapperStyle}>
      <span style={labelStyle}>{label ?? (side === 'enemy' ? 'Enemy' : 'You')}</span>
      {empty && (
        <span style={{ fontSize: 10, color: '#555', fontStyle: 'italic' }}>—</span>
      )}
      {effects.map((e) => {
        const meta = STATUS_META[e.type] ?? { emoji: '?', color: '#888', label: e.type };
        return (
          <span
            key={e.type}
            title={`${meta.label} ×${e.stacks}`}
            style={chipBase(meta.color)}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{meta.emoji}</span>
            <span>{meta.label}</span>
            <span style={{ opacity: 0.7 }}>×{e.stacks}</span>
          </span>
        );
      })}
      {rifts.map((r, i) => {
        const meta = RIFT_META[r.type];
        if (!meta) return null;
        return (
          <span
            key={`rift-${i}`}
            title={meta.tip(r.turnsRemaining)}
            style={chipBase(meta.color)}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{meta.emoji}</span>
            <span>{meta.label}</span>
            <span style={{ opacity: 0.7 }}>{r.turnsRemaining}t</span>
          </span>
        );
      })}
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

const CombatLog: React.FC<{ log: string[]; cardPool: CardInstance[] }> = ({ log, cardPool }) => {
  const visible = log.slice(-7);

  // Build the name → card lookup. Runtime instances (with live lumens /
  // augments / fluxState) take priority. Static CARD_POOL is the fallback so
  // exhausted / used-up cards (e.g. an augment that's been attached and
  // removed from hand) still get tooltips in the log.
  const cardByName = new Map<string, CardDefinition | CardInstance>();
  for (const def of CARD_POOL) {
    if (def.name) cardByName.set(def.name, def);
  }
  for (const c of cardPool) {
    if (c.name) cardByName.set(c.name, c);
  }
  // Sort longest first so e.g. "Heavy Wrench" matches before "Wrench".
  const names = [...cardByName.keys()].sort((a, b) => b.length - a.length);

  function splitLogEntry(text: string): Array<{ text: string; card?: CardDefinition | CardInstance }> {
    if (names.length === 0) return [{ text }];
    const pattern = new RegExp(`(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const parts = text.split(pattern);
    return parts.map(p => ({ text: p, card: cardByName.get(p) }));
  }

  const [tooltip, setTooltip] = useState<{ card: CardDefinition | CardInstance; x: number; y: number } | null>(null);

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
        position: 'relative',
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
        const parts = splitLogEntry(entry);
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
            {parts.map((part, pi) =>
              part.card ? (
                <span
                  key={pi}
                  style={{ color: '#ffcc88', textDecoration: 'underline dotted', cursor: 'help' }}
                  onMouseEnter={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({ card: part.card!, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {part.text}
                </span>
              ) : (
                <span key={pi}>{part.text}</span>
              )
            )}
          </div>
        );
      })}

      {/* Tooltip portal-like overlay */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 8,
          transform: 'translateY(-100%)',
          zIndex: 999,
          background: '#0d0d1e',
          border: '1px solid #3a3a5a',
          borderRadius: 6,
          padding: '8px 12px',
          minWidth: 180,
          maxWidth: 240,
          pointerEvents: 'none',
          boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: '#eee' }}>
            {tooltip.card.name}
            <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.6, marginLeft: 8 }}>
              {tooltip.card.cost}⚡ · {tooltip.card.type}
            </span>
          </div>
          {(tooltip.card.attack !== undefined || tooltip.card.health !== undefined) && (
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>
              ⚔ {tooltip.card.attack ?? 0} / ❤ {tooltip.card.health ?? 0}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#ccc', lineHeight: 1.5 }}>
            {tooltip.card.cardText}
          </div>
        </div>
      )}
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
      {/* Spacer to balance the right-side controls; statuses live in the
          dedicated strip above the player minion row. */}
      <div style={{ flex: 1, minWidth: 0 }} />

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

      {/* Heat (Pyroclast) */}
      {cs.playerFaction === 'Pyroclast' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 8, opacity: 0.5, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Heat</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ff6622', textShadow: '0 0 10px #ff662299', lineHeight: 1 }}>
            🔥 {cs.playerHeat}
          </div>
        </div>
      )}

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

  // Choice cards present a modal with two options ("Choose one: A OR B").
  const [pendingChoice, setPendingChoice] = useState<{
    cardId: string;
    optionA: string;
    optionB: string;
    cardName: string;
  } | null>(null);

  // Augment cards open a target-picker modal showing the player's hand.
  const [pendingAugment, setPendingAugment] = useState<{ cardId: string; cardName: string } | null>(null);

  const handleCardSelect = useCallback((instanceId: string) => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;
    const card = cs.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    if (card.cost > cs.playerEnergy) return;

    // Augment cards: show target-picker before playing.
    if (card.type === 'Augment') {
      setPendingAugment({ cardId: instanceId, cardName: card.name });
      setSelectedCardId(null);
      setSelectedMinionId(null);
      return;
    }

    // Choice cards: show modal, defer play until user picks.
    const choice = getCardChoice(card);
    if (choice) {
      setPendingChoice({ cardId: instanceId, ...choice, cardName: card.name });
      setSelectedCardId(null);
      setSelectedMinionId(null);
      return;
    }

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

  const handleAugmentTargetPick = useCallback((targetId: string) => {
    if (!cs || !pendingAugment) return;
    const next = applyAugment(cs, pendingAugment.cardId, targetId);
    setPendingAugment(null);
    setCombatState(next);
  }, [cs, pendingAugment, setCombatState]);

  const handleAugmentCancel = useCallback(() => setPendingAugment(null), []);

  const handleChoicePick = useCallback((optionText: string) => {
    if (!cs || !pendingChoice) return;
    const next = playCard(cs, pendingChoice.cardId, 'enemy', optionText);
    setPendingChoice(null);
    setCombatState(next);
  }, [cs, pendingChoice, setCombatState]);

  const handleChoiceCancel = useCallback(() => setPendingChoice(null), []);

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
      height: '100vh',
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
        @keyframes dungeonVignette {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes dungeonEnemyLunge {
          0%   { transform: translateY(0); }
          40%  { transform: translateY(38px) scale(1.05); }
          70%  { transform: translateY(8px) scale(1.02); }
          100% { transform: translateY(0) scale(1); }
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

      {/* Choice modal — for "Choose one: A OR B" cards (e.g. Shimmer, Void Whisper) */}
      {pendingChoice && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.78)',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.25em',
              opacity: 0.55,
              textTransform: 'uppercase',
              color: '#c89b3c',
            }}
          >
            ▸ {pendingChoice.cardName}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#eee' }}>Choose one:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
            {[pendingChoice.optionA, pendingChoice.optionB].map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleChoicePick(opt)}
                style={{
                  padding: '14px 18px',
                  background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a18 100%)',
                  color: '#fff',
                  border: '1px solid #c89b3c',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 0 12px #c89b3c33',
                  transition: 'background 100ms, transform 100ms',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span style={{ color: '#c89b3c', marginRight: 6 }}>{i === 0 ? 'A.' : 'B.'}</span>
                {opt[0].toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleChoiceCancel}
            style={{
              marginTop: 8,
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#888',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Augment target picker — for Cogsmiths "Attach to a card in hand" */}
      {pendingAugment && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.25em',
              opacity: 0.55,
              textTransform: 'uppercase',
              color: '#4aa8e0',
            }}
          >
            ▸ {pendingAugment.cardName}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#eee' }}>
            Pick a card in hand to attach to:
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              maxWidth: 600,
            }}
          >
            {cs.hand
              .filter((c) => c.instanceId !== pendingAugment.cardId && c.type !== 'Augment')
              .map((c) => (
                <button
                  key={c.instanceId}
                  type="button"
                  onClick={() => handleAugmentTargetPick(c.instanceId)}
                  style={{
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <CardComponent card={c} selectable />
                </button>
              ))}
          </div>

          {cs.hand.filter((c) => c.instanceId !== pendingAugment.cardId && c.type !== 'Augment').length === 0 && (
            <div style={{ color: '#aaa', fontSize: 12 }}>
              No valid targets in hand.
            </div>
          )}

          <button
            type="button"
            onClick={handleAugmentCancel}
            style={{
              marginTop: 8,
              padding: '6px 14px',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#888',
              fontSize: 10,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
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
        {/* Enemy "lunge" — re-keyed on every player damage event so the enemy
            visibly dives toward the player instead of just flashing the screen */}
        <div
          key={`lunge-${playerFlashKey}`}
          style={{
            animation: playerFlashKey > 0 ? 'dungeonEnemyLunge 520ms cubic-bezier(0.5,0,0.4,1)' : undefined,
            transformOrigin: 'center bottom',
          }}
        >
          <EnemyComponent
            enemy={cs.enemy}
            isTargeted={canTargetEnemy}
            intentPulsing={isEnemyTurn}
            intentResolving={enemyActing}
            onClick={canTargetEnemy ? handleEnemyClick : undefined}
          />
        </div>
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

        {/* Enemy buff/debuff strip — above the combat log */}
        <StatusStrip effects={cs.enemy.statusEffects} side="enemy" label={cs.enemy.name} />

        {/* Combat log sits in the center of the battlefield */}
        <CombatLog log={cs.combatLog} cardPool={[...cs.hand, ...cs.drawPile, ...cs.discardPile, ...cs.playerBoard]} />

        {/* Player buff/debuff/rift strip — below the combat log */}
        <StatusStrip effects={cs.playerStatusEffects} rifts={cs.playerRifts} side="player" />

        <BoardRow
          cards={cs.playerBoard}
          label="Your Minions"
          selectedId={selectedMinionId}
          onCardClick={handlePlayerMinionClick}
        />
      </div>

      {/* Full-screen red vignette on player damage (sits at screen edges) */}
      {playerFlashKey > 0 && (
        <div
          key={`pf-${playerFlashKey}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 15,
            background:
              'radial-gradient(ellipse at center, rgba(255,40,60,0) 35%, rgba(255,30,50,0.55) 100%)',
            animation: 'dungeonVignette 700ms ease-out forwards',
          }}
        />
      )}
      {playerHealKey > 0 && (
        <div
          key={`ph-${playerHealKey}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 15,
            background:
              'radial-gradient(ellipse at center, rgba(40,220,100,0) 40%, rgba(40,220,100,0.4) 100%)',
            animation: 'dungeonVignette 700ms ease-out forwards',
          }}
        />
      )}

      {/* ── Hand (always visible — held during enemy turn) ── */}
      <div style={s.handSection}>
        <HandComponent
          hand={cs.hand}
          energy={cs.playerEnergy}
          selectedId={selectedCardId}
          onCardSelect={handleCardSelect}
          disabled={isEnemyTurn || isCombatOver}
          drawCount={cs.drawPile.length}
          discardCount={cs.discardPile.length}
        />
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CardDefinition, CardInstance, CombatState } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { playCard, attackWithMinion, endPlayerTurn, executeEnemyTurn, getCardChoice, applyAugment } from '../engine/combat';
import { getCardStats, getCardText } from '../engine/cardStats';
import { CARD_POOL } from '../data/cards';
import { pickRandomBackground } from '../assets/backgrounds';
import { getDungeonSceneArt } from '../assets/basicTokenArt';
import { EnemyComponent } from './EnemyComponent';
import { HandComponent } from './HandComponent';
import { CardComponent } from './CardComponent';
import { PotionInventory } from './PotionInventory';
import { LumenAllocatorModal } from './LumenAllocatorModal';
import { PotionDrinkBurst } from './PotionDrinkBurst';
import { TutorialOverlay, isTutorialDismissed } from './TutorialOverlay';
import { getPotionDef } from '../data/potions';
import { isChannelCard } from '../engine/combat';
import { getCardPlayPreview } from '../engine/cardPreview';
import { FactionResourcePanel } from './FactionResourcePanel';

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
          {(() => {
            const ts = getCardStats(tooltip.card);
            return (
              <>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: '#eee' }}>
                  {tooltip.card.name}
                  <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.6, marginLeft: 8 }}>
                    {ts.cost}⚡ · {tooltip.card.type}
                  </span>
                </div>
                {(ts.attack !== undefined || ts.health !== undefined) && (
                  <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>
                    ⚔ {ts.attack ?? 0} / ❤ {ts.health ?? 0}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#ccc', lineHeight: 1.5 }}>
                  {ts.text}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// ─── HUD corner panels (mockup-style) ────────────────────────────────────────

/**
 * Top-left player card. Shows avatar circle, HP bar, gold count, and a small
 * potion-slot row underneath. Mirrors the "PLAYER" panel from the dungeon
 * mockups.
 */
const PlayerHUD: React.FC<{
  cs: CombatState;
  gold: number;
  shakeKey: number;
  potions: import('../types').PotionInstance[] | (import('../types').PotionInstance | null)[];
  onDrinkPotion: (slotIndex: number) => void;
  potionsDisabled: boolean;
}> = ({ cs, gold, shakeKey, potions, onDrinkPotion, potionsDisabled }) => {
  const hpPct = Math.max(0, (cs.playerHealth / cs.playerMaxHealth) * 100);
  const hpColor = hpPct > 60 ? '#22cc44' : hpPct > 30 ? '#ffcc00' : '#ff4444';

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        background: 'linear-gradient(180deg, rgba(10,10,22,0.86) 0%, rgba(10,10,22,0.62) 100%)',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 180,
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3a3a5a, #1a1a2e)',
            border: '1px solid #5a5a7a',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#aaa', textTransform: 'uppercase' }}>
            Player
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ color: hpColor, fontWeight: 700 }}>♥ {cs.playerHealth}/{cs.playerMaxHealth}</span>
            <span style={{ color: '#ffcc00', fontWeight: 700 }}>● {gold}</span>
          </div>
        </div>
      </div>

      {/* HP bar with shake on damage */}
      <div
        key={`hp-shake-${shakeKey}`}
        style={{
          width: '100%',
          height: 5,
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
          🛡 {cs.playerShield} Block
        </div>
      )}

      {/* Potion inventory — 3 slots, always visible. Drinking is disabled
          during enemy turns / combat-end. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span
          style={{
            fontSize: 7,
            letterSpacing: '0.25em',
            opacity: 0.45,
            textTransform: 'uppercase',
            color: '#aaa',
            minWidth: 38,
          }}
        >
          Potions
        </span>
        <PotionInventory
          slots={potions}
          onUse={onDrinkPotion}
          disabled={potionsDisabled}
          compact
        />
      </div>

      {/* Inline status icons row — keeps player buffs/debuffs visible without
          a full-width strip. */}
      {(cs.playerStatusEffects.length > 0 || cs.playerRifts.length > 0 || cs.playerPowers.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {cs.playerStatusEffects.map((e) => {
            const meta = STATUS_META[e.type] ?? { emoji: '?', color: '#888', label: e.type };
            return (
              <span
                key={e.type}
                title={`${meta.label} ×${e.stacks}`}
                style={{
                  fontSize: 11,
                  padding: '1px 4px',
                  background: `${meta.color}22`,
                  border: `1px solid ${meta.color}66`,
                  borderRadius: 3,
                  color: meta.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {meta.emoji}
                <span style={{ fontSize: 9 }}>{e.stacks}</span>
              </span>
            );
          })}
          {cs.playerRifts.map((r, i) => {
            const m = RIFT_META[r.type];
            return m ? (
              <span
                key={`rift-${i}`}
                title={m.tip(r.turnsRemaining)}
                style={{
                  fontSize: 11,
                  padding: '1px 4px',
                  background: `${m.color}22`,
                  border: `1px solid ${m.color}66`,
                  borderRadius: 3,
                  color: m.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                ⚡<span style={{ fontSize: 9 }}>{r.turnsRemaining}</span>
              </span>
            ) : null;
          })}
          {cs.playerPowers.map((p) => (
            <span
              key={`pwr-${p.instanceId}`}
              title={`${p.name}: ${getCardText(p)}`}
              style={{
                fontSize: 11,
                padding: '1px 4px',
                background: '#ffaa4422',
                border: '1px solid #ffaa4488',
                borderRadius: 3,
                color: '#ffaa44',
              }}
            >
              ⚙
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Top-right utility button row: combat log toggle and (placeholder) settings.
 */
const UtilityButtons: React.FC<{ logOpen: boolean; onToggleLog: () => void }> = ({ logOpen, onToggleLog }) => {
  const baseStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 8,
    background: 'linear-gradient(180deg, rgba(10,10,22,0.86), rgba(10,10,22,0.62))',
    border: '1px solid #2a2a4a',
    color: '#ccc',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    transition: 'border-color 100ms, color 100ms, background 100ms',
  };
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 4,
        display: 'flex',
        gap: 6,
      }}
    >
      <button
        type="button"
        onClick={onToggleLog}
        title={logOpen ? 'Hide combat log' : 'Show combat log'}
        style={{
          ...baseStyle,
          borderColor: logOpen ? '#c89b3c' : '#2a2a4a',
          color: logOpen ? '#c89b3c' : '#ccc',
        }}
      >
        ▤
      </button>
    </div>
  );
};

/**
 * Big hex/orb energy display in the bottom-left corner.
 */
const EnergyOrb: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const color = '#3b8fff';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 18,
        left: 18,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: `radial-gradient(circle at 50% 40%, ${color}55 0%, ${color}22 60%, transparent 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 3,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: 'rgba(8,8,20,0.85)',
            border: `2px solid ${color}`,
            boxShadow: `0 0 18px ${color}88, inset 0 0 12px ${color}44`,
          }}
        />
        <span style={{ position: 'relative', fontSize: 22, fontWeight: 900, color: '#fff', textShadow: `0 0 10px ${color}` }}>
          {current}/{max}
        </span>
      </div>
      <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#88aacc', textTransform: 'uppercase' }}>
        Energy
      </div>
    </div>
  );
};

/**
 * Bottom-right HUD: discard count and end turn button.
 */
const RightHUD: React.FC<{
  cs: CombatState;
  onEndTurn: () => void;
  isEnemyTurn: boolean;
}> = ({ cs, onEndTurn, isEnemyTurn }) => {
  const heat = cs.playerHeat ?? 0;
  const heatLabel = heat >= 10 ? 'Critical' : heat >= 6 ? 'Primed' : heat >= 3 ? 'Warming' : 'Stored';
  const heatColor = heat >= 10 ? '#ff3d1e' : heat >= 6 ? '#ff8a2a' : '#f0d060';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 18,
        right: 18,
        zIndex: 4,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
      }}
    >
      {cs.playerFaction === 'Pyroclast' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 8, opacity: 0.65, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#ffb199' }}>
            Heat
          </div>
          <div
            style={{
              minWidth: 54,
              padding: '5px 10px',
              background: 'linear-gradient(180deg, rgba(68,18,12,0.95), rgba(16,8,12,0.86))',
              border: `1px solid ${heatColor}`,
              borderRadius: 6,
              boxShadow: `0 0 16px ${heatColor}55, inset 0 0 10px rgba(255,80,40,0.18)`,
              color: '#fff4ec',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{heat}</div>
            <div style={{ fontSize: 7, fontWeight: 800, color: heatColor, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
              {heatLabel}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{ fontSize: 8, opacity: 0.55, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa' }}>
          Discard
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#c89b3c',
            padding: '4px 10px',
            background: 'rgba(8,8,20,0.7)',
            border: '1px solid #c89b3c66',
            borderRadius: 6,
            minWidth: 36,
            textAlign: 'center',
          }}
        >
          {cs.discardPile.length}
        </div>
      </div>

      <button
        type="button"
        onClick={onEndTurn}
        disabled={isEnemyTurn}
        style={{
          padding: '12px 22px',
          background: isEnemyTurn
            ? 'rgba(20,20,30,0.7)'
            : 'linear-gradient(180deg, #ffd24a 0%, #c89b3c 100%)',
          color: isEnemyTurn ? '#666' : '#0a0a12',
          border: isEnemyTurn ? '1px solid #2a2a3a' : '1px solid #ffe18a',
          borderRadius: 6,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '0.18em',
          cursor: isEnemyTurn ? 'default' : 'pointer',
          textTransform: 'uppercase',
          flexShrink: 0,
          boxShadow: isEnemyTurn ? 'none' : '0 0 16px rgba(255,210,74,0.4)',
        }}
      >
        {isEnemyTurn ? 'Enemy Turn' : 'End Turn'}
      </button>
    </div>
  );
};

/**
 * Vertical relic column on the left side of the screen, mockup-style.
 * Replaces the existing horizontal RelicBar overlay during combat.
 */
const VerticalRelicColumn: React.FC<{ relics: import('../types').RelicDefinition[]; drawCount: number; deckTotal: number }> = ({ relics, drawCount, deckTotal }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  if (relics.length === 0 && drawCount === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '32%',
        left: 12,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 6px',
        background: 'linear-gradient(180deg, rgba(10,10,22,0.78), rgba(10,10,22,0.52))',
        border: '1px solid #2a2a4a',
        borderRadius: 10,
        backdropFilter: 'blur(6px)',
      }}
    >
      {relics.length > 0 && (
        <div style={{ fontSize: 7, letterSpacing: '0.25em', color: '#aaa', textTransform: 'uppercase' }}>
          Relics
        </div>
      )}
      {relics.map((relic) => (
        <div
          key={relic.id}
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            background: hoveredId === relic.id ? '#1e1e3a' : '#12121e',
            border: hoveredId === relic.id ? '1px solid #5a5a7a' : '1px solid #2a2a3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            setHoveredId(relic.id);
            const r = e.currentTarget.getBoundingClientRect();
            setHoverPos({ x: r.right + 6, y: r.top });
          }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {relic.art}
        </div>
      ))}

      {/* Deck count below relics */}
      <div
        style={{
          marginTop: 4,
          fontSize: 14,
          color: '#88aacc',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        🂠
        <div style={{ fontSize: 10, color: '#aaa' }}>{drawCount}/{deckTotal}</div>
      </div>

      {hoveredId && (() => {
        const r = relics.find((x) => x.id === hoveredId)!;
        return (
          <div
            style={{
              position: 'fixed',
              left: hoverPos.x,
              top: hoverPos.y,
              width: 200,
              padding: '8px 10px',
              background: '#0d0d1e',
              border: '1px solid #3a3a5a',
              borderRadius: 6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{r.art}</span>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#eee' }}>{r.name}</div>
            </div>
            <div style={{ fontSize: 9, color: '#ccc', lineHeight: 1.4, marginBottom: 4 }}>{r.description}</div>
            <div style={{ fontSize: 8, fontStyle: 'italic', color: '#888' }}>"{r.flavor}"</div>
          </div>
        );
      })()}
    </div>
  );
};

// ─── CombatView ───────────────────────────────────────────────────────────────

// Spread float numbers horizontally so multi-hit stacks are readable
const X_SLOTS = [38, 48, 56, 44, 52, 42, 58] as const;
let _xSlot = 0;
const nextX = () => `${X_SLOTS[_xSlot++ % X_SLOTS.length]}%`;

export const CombatView: React.FC = () => {
  const { runState, setCombatState, usePotion } = useDungeonRun();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedMinionId, setSelectedMinionId] = useState<string | null>(null);
  const [enemyActing, setEnemyActing] = useState(false);
  // Combat log is hidden by default (clean center view); toggled via the
  // top-right button to keep the mockup-style layout uncluttered.
  const [logOpen, setLogOpen] = useState(false);

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

  // Track per-slot potion definition ids so we can detect a "drink" event:
  // a slot transitions from a known potion id → null. Re-keys the burst.
  const prevPotionSlots = useRef<(string | null)[]>([null, null, null]);
  const [potionBurst, setPotionBurst] = useState<{
    key: number;
    category: import('../types').PotionCategory;
    potionId: string;
    potionName: string;
  } | null>(null);

  const cs = runState?.combatState;

  // Pick a stable random background per encounter, seeded by enemy ID so the
  // same fight always shows the same scene (and re-renders don't flicker).
  const bgUrl = useMemo(
    () => (runState?.phase === 'boss_combat' ? getDungeonSceneArt('boss') : pickRandomBackground(cs?.enemy.id ?? 'default')),
    [cs?.enemy.id, runState?.phase],
  );
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
  }, [cs?.playerHealth, cs?.enemy.currentHealth, cs?.playerShield, cs?.enemy.currentShield]);

  // Initialise refs on first render so first-turn changes don't misfire
  useEffect(() => {
    if (!cs || prevPlayerHP.current !== null) return;
    prevPlayerHP.current     = cs.playerHealth;
    prevEnemyHP.current      = cs.enemy.currentHealth;
    prevPlayerShield.current  = cs.playerShield;
    prevEnemyShield.current   = cs.enemy.currentShield;
  }, [cs]);

  // Detect a drink event: a slot transitions from a known potion id → null.
  // Look up the prior definition and trigger the burst overlay.
  useEffect(() => {
    const slots: (string | null)[] = (runState?.potions ?? [null, null, null]).map(
      (p) => p?.definitionId ?? null,
    );
    for (let i = 0; i < 3; i++) {
      const before = prevPotionSlots.current[i];
      const after = slots[i];
      if (before && !after) {
        const def = getPotionDef(before);
        if (def) {
          setPotionBurst({
            key: Date.now() + i,
            category: def.category,
            potionId: def.id,
            potionName: def.name,
          });
        }
      }
    }
    prevPotionSlots.current = slots;
  }, [runState?.potions[0]?.definitionId, runState?.potions[1]?.definitionId, runState?.potions[2]?.definitionId]);

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

  // Potion targeting modes:
  //   - pendingPotionTarget = slot index of a Forgefire-Flask-style potion
  //     awaiting a target click. Highlights enemies as selectable.
  //   - pendingLumenAllocation = slot index of Lumen Infusion awaiting a
  //     distribution from the lumen-allocator modal.
  const [pendingPotionTarget, setPendingPotionTarget] = useState<number | null>(null);
  const [pendingLumenAllocation, setPendingLumenAllocation] = useState<number | null>(null);

  const handleCardSelect = useCallback((instanceId: string) => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;
    const card = cs.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    if (getCardStats(card).cost > cs.playerEnergy) return;

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

    // Potion target-pick mode (Forgefire Flask) takes priority over card/minion
    // attacks.
    if (pendingPotionTarget !== null) {
      usePotion(pendingPotionTarget, { targetId: 'enemy' });
      setPendingPotionTarget(null);
      return;
    }

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
  }, [cs, selectedCardId, selectedMinionId, setCombatState, pendingPotionTarget, usePotion]);

  const handleEnemyMinionClick = useCallback((minionId: string) => {
    if (!cs) return;
    if (cs.phase !== 'player_turn') return;

    if (pendingPotionTarget !== null) {
      usePotion(pendingPotionTarget, { targetId: minionId });
      setPendingPotionTarget(null);
      return;
    }

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
  }, [cs, selectedCardId, selectedMinionId, setCombatState, pendingPotionTarget, usePotion]);

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

  // ── Potion drinking ───────────────────────────────────────────────────
  // Phase 2 minimum:
  //   - Self-targeted potions drink immediately.
  //   - Forgefire Flask defaults to the main enemy (full target picker in Phase 4).
  //   - Lumen Infusion defaults to even-distribution (proper allocator in Phase 4).
  // The reducer guards against drinking outside the player turn / mid-resolution.
  const handleDrinkPotion = useCallback((slotIndex: number) => {
    if (!runState) return;
    const slot = runState.potions[slotIndex];
    if (!slot) return;
    const def = getPotionDef(slot.definitionId);
    if (!def) return;

    if (def.targeting === 'enemy') {
      // Enter target-pick mode. The user clicks an enemy or minion to resolve.
      setPendingPotionTarget(slotIndex);
      setSelectedCardId(null);
      setSelectedMinionId(null);
      return;
    }

    if (def.targeting === 'lumen-allocation') {
      // If there are Channel cards in hand, show the allocator. If not, the
      // engine's fallback (12 Block) is fine — drink immediately.
      const hasChannel = (cs?.hand ?? []).some((c) => c.keywords.includes('ILLUMINATE') && /(^|\s)channel\./i.test(getCardText(c)));
      if (hasChannel) {
        setPendingLumenAllocation(slotIndex);
        return;
      }
      usePotion(slotIndex);
      return;
    }

    usePotion(slotIndex);
  }, [runState, cs, usePotion]);

  const handlePotionTargetCancel = useCallback(() => {
    setPendingPotionTarget(null);
  }, []);

  const handleLumenAllocate = useCallback((allocation: Record<string, number>) => {
    if (pendingLumenAllocation === null) return;
    usePotion(pendingLumenAllocation, { lumenAllocation: allocation });
    setPendingLumenAllocation(null);
  }, [pendingLumenAllocation, usePotion]);

  const handleLumenCancel = useCallback(() => {
    setPendingLumenAllocation(null);
  }, []);

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

  const cardPreviews = useMemo(() => {
    const previews: Record<string, string[]> = {};
    if (!cs) return previews;
    for (const card of cs.hand) {
      const preview = getCardPlayPreview(cs, card);
      if (preview) previews[card.instanceId] = preview.lines;
    }
    return previews;
  }, [cs]);

  if (!cs) return null;

  const isEnemyTurn = cs.phase === 'enemy_turn';
  const isCombatOver = cs.phase === 'combat_end_win' || cs.phase === 'combat_end_loss';

  const enemyGuardians = cs.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN'));
  // Potion targeting bypasses GUARDIAN — Forgefire Flask can hit any enemy.
  const isPotionTargeting = pendingPotionTarget !== null;
  const targetableEnemyMinionIds = new Set<string>(
    isPotionTargeting
      ? cs.enemyBoard.map((m) => m.instanceId)
      : enemyGuardians.length > 0
      ? enemyGuardians.map((m) => m.instanceId)
      : (selectedCardId || selectedMinionId)
      ? cs.enemyBoard.map((m) => m.instanceId)
      : [],
  );
  const canTargetEnemy =
    isPotionTargeting ||
    ((selectedCardId !== null || selectedMinionId !== null) && enemyGuardians.length === 0);

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      // Layered background: a dark vertical gradient + the encounter art (if any).
      // Gradient is stronger at the top and bottom so combat-log + HUD text stay legible.
      backgroundImage: bgUrl
        ? [
            'linear-gradient(180deg, rgba(5,5,16,0.85) 0%, rgba(5,5,16,0.45) 35%, rgba(5,5,16,0.45) 65%, rgba(5,5,16,0.92) 100%)',
            `url("${bgUrl}")`,
          ].join(', ')
        : 'radial-gradient(ellipse at 50% 0%, #1a1830 0%, #0a0a18 45%, #050510 100%)',
      backgroundSize: bgUrl ? 'cover, cover' : 'auto',
      backgroundPosition: bgUrl ? 'center, center' : 'center',
      backgroundRepeat: 'no-repeat',
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
        @keyframes dungeonPotionDrain {
          0%   { transform: scale(1.18); opacity: 0.95; box-shadow: 0 0 16px currentColor; }
          50%  { transform: scale(0.92); opacity: 0.55; }
          100% { transform: scale(1);    opacity: 0.4;  box-shadow: none; }
        }
      `}</style>

      {/* ── Potion drink burst overlay ─── */}
      {potionBurst && (
        <PotionDrinkBurst
          burstKey={potionBurst.key}
          category={potionBurst.category}
          potionId={potionBurst.potionId}
          potionName={potionBurst.potionName}
        />
      )}

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

      {/* First-run tutorial overlay (combat #1, #2, #3 of the player's
          first run, on turn 1 only). Permanently dismissible. */}
      {(() => {
        if (isTutorialDismissed()) return null;
        if (cs.turn !== 1) return null;
        const combatNum = (runState?.runStats.totalCombats ?? 0); // 0-indexed = combat #1, 1 = #2, 2 = #3
        if (combatNum > 2) return null;
        return <TutorialOverlay step={combatNum as 0 | 1 | 2} />;
      })()}

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

      {/* ── Top-left: Player HUD ────────────────────────────────────── */}
      <PlayerHUD
        cs={cs}
        gold={runState?.gold ?? 0}
        shakeKey={playerShakeKey}
        potions={runState?.potions ?? [null, null, null]}
        onDrinkPotion={handleDrinkPotion}
        potionsDisabled={isEnemyTurn || isCombatOver}
      />

      {/* ── Top-right: Utility buttons (combat log toggle) ─────────── */}
      <UtilityButtons logOpen={logOpen} onToggleLog={() => setLogOpen((v) => !v)} />

      {/* ── Left: Vertical relic + deck column ─────────────────────── */}
      <VerticalRelicColumn
        relics={runState?.relics ?? []}
        drawCount={cs.drawPile.length}
        deckTotal={runState?.deck.length ?? 0}
      />

      {/* ── Center: Enemy area (transparent so background art shows) ─ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 80,
          gap: 16,
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Red flash overlay on enemy damage */}
        {enemyFlashKey > 0 && (
          <div
            key={`ef-${enemyFlashKey}`}
            style={{
              position: 'absolute',
              top: 60,
              left: '20%',
              right: '20%',
              height: 260,
              background: 'radial-gradient(ellipse at center, rgba(255,40,60,0.40) 0%, rgba(255,40,60,0) 75%)',
              pointerEvents: 'none',
              zIndex: 3,
              animation: 'dungeonDmgFlash 500ms ease-out forwards',
            }}
          />
        )}

        {/* Enemy + intent. Lunges down on player-damage events. */}
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

        {/* Enemy minions row, shown only if any */}
        {cs.enemyBoard.length > 0 && (
          <BoardRow
            cards={cs.enemyBoard}
            label="Enemy Minions"
            selectedId={null}
            targetableIds={targetableEnemyMinionIds}
            onCardClick={handleEnemyMinionClick}
          />
        )}

        {/* Player minions row, shown only if any */}
        {cs.playerBoard.length > 0 && (
          <BoardRow
            cards={cs.playerBoard}
            label="Your Minions"
            selectedId={selectedMinionId}
            onCardClick={handlePlayerMinionClick}
          />
        )}
      </div>

      <FactionResourcePanel cs={cs} />

      {/* Full-screen red vignette on player damage */}
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

      {/* ── Bottom-center: Hand. Sits between the energy orb and the right HUD. */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 110,    // clear the energy orb
          right: 220,   // clear the right HUD (heat + discard + end turn)
          zIndex: 4,
        }}
      >
        <HandComponent
          hand={cs.hand}
          energy={cs.playerEnergy}
          selectedId={selectedCardId}
          onCardSelect={handleCardSelect}
          disabled={isEnemyTurn || isCombatOver}
          previews={cardPreviews}
        />
      </div>

      {/* ── Bottom-left: Energy orb ────────────────────────────────── */}
      <EnergyOrb current={cs.playerEnergy} max={cs.playerMaxEnergy} />

      {/* ── Bottom-right: Heat + Discard + End Turn ────────────────── */}
      <RightHUD
        cs={cs}
        onEndTurn={handleEndTurn}
        isEnemyTurn={isEnemyTurn || isCombatOver}
      />

      {/* ── Combat log overlay (toggleable) ────────────────────────────
          NOTE: avoid `backdrop-filter` and `overflow: hidden` here. Either
          one creates a CSS containing block that traps the tooltip's
          `position: fixed` element inside this overlay, hiding the
          card-name tooltips. CombatLog already has its own border / scroll
          so we just need to position the panel. */}

      {/* Potion targeting banner — appears while waiting for enemy click */}
      {pendingPotionTarget !== null && (() => {
        const slot = runState?.potions[pendingPotionTarget];
        const def = slot ? getPotionDef(slot.definitionId) : null;
        if (!def) return null;
        return (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              padding: '10px 22px',
              background: 'rgba(8,8,20,0.92)',
              border: '1px solid #ff6622',
              borderRadius: 6,
              color: '#ff8866',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              boxShadow: '0 0 18px rgba(255,102,34,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            🌋 {def.name} — pick a target
            <button
              type="button"
              onClick={handlePotionTargetCancel}
              style={{
                padding: '3px 10px',
                background: 'transparent',
                border: '1px solid #555',
                color: '#aaa',
                fontSize: 9,
                letterSpacing: '0.15em',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        );
      })()}

      {/* Lumen allocator — for Lumen Infusion when Channel cards are in hand */}
      {pendingLumenAllocation !== null && cs && (
        <LumenAllocatorModal
          channelCards={cs.hand.filter(isChannelCard)}
          total={3}
          onCancel={handleLumenCancel}
          onConfirm={handleLumenAllocate}
        />
      )}

      {logOpen && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 12,
            width: 340,
            zIndex: 6,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            borderRadius: 8,
          }}
        >
          <CombatLog log={cs.combatLog} cardPool={[...cs.hand, ...cs.drawPile, ...cs.discardPile, ...cs.playerBoard]} />
        </div>
      )}
    </div>
  );
};

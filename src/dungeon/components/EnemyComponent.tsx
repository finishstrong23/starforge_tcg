import React from 'react';
import type { EnemyInstance, IntentType } from '../types';

const INTENT_COLOR: Record<IntentType, string> = {
  attack:  '#ff4444',
  defend:  '#3b8fff',
  buff:    '#ffcc00',
  debuff:  '#cc44ff',
  summon:  '#22cc88',
  special: '#ff88cc',
};

const INTENT_EMOJI: Record<IntentType, string> = {
  attack:  '⚔',
  defend:  '🛡',
  buff:    '✨',
  debuff:  '☠',
  summon:  '🔮',
  special: '⭐',
};

const STATUS_DISPLAY: Record<string, { emoji: string; color: string }> = {
  burn:       { emoji: '🔥', color: '#ff5a2e' },
  poison:     { emoji: '☠',  color: '#44cc44' },
  shield:     { emoji: '🛡',  color: '#3b8fff' },
  strength:   { emoji: '💪',  color: '#ffcc00' },
  weak:       { emoji: '⬇',  color: '#aaaaaa' },
  vulnerable: { emoji: '↓',  color: '#ff8c00' },
  barrier:    { emoji: '🔷', color: '#00aaff' },
};

export interface EnemyComponentProps {
  enemy: EnemyInstance;
  isTargeted?: boolean;
  onClick?: () => void;
}

export const EnemyComponent: React.FC<EnemyComponentProps> = ({
  enemy, isTargeted = false, onClick,
}) => {
  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];
  const hpPct = Math.max(0, (enemy.currentHealth / enemy.maxHealth) * 100);
  const hpColor = hpPct > 60 ? '#22cc44' : hpPct > 30 ? '#ffcc00' : '#ff4444';
  const intentColor = INTENT_COLOR[intent.type];

  const statusBadgeStyle = (color: string): React.CSSProperties => ({
    fontSize: 9,
    padding: '2px 4px',
    background: `${color}22`,
    border: `1px solid ${color}66`,
    borderRadius: 3,
    color,
  });

  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '10px 12px',
      cursor: onClick ? 'pointer' : 'default',
      borderRadius: 8,
      border: isTargeted ? '2px solid #ff3366' : '2px solid transparent',
      boxShadow: isTargeted ? '0 0 16px #ff336666' : 'none',
      transition: 'box-shadow 120ms, border-color 120ms',
      minWidth: 140,
    },
    name: {
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '0.06em',
      color: '#eee',
    },
    art: {
      fontSize: 52,
      lineHeight: 1,
      filter: isTargeted ? 'drop-shadow(0 0 8px #ff3366)' : undefined,
    },
    hpRow: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    },
    hpLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 10,
      color: '#aaa',
    },
    hpBar: {
      width: '100%',
      height: 7,
      background: '#1a1a2e',
      borderRadius: 4,
      overflow: 'hidden',
    },
    hpFill: {
      height: '100%',
      width: `${hpPct}%`,
      background: hpColor,
      borderRadius: 4,
      transition: 'width 300ms ease',
    },
    shieldBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      fontSize: 11,
      color: '#3b8fff',
      fontWeight: 600,
    },
    statusRow: {
      display: 'flex',
      gap: 4,
      flexWrap: 'wrap',
      justifyContent: 'center',
    } as React.CSSProperties,
    intentBox: {
      width: '100%',
      padding: '5px 8px',
      background: `${intentColor}18`,
      border: `1px solid ${intentColor}55`,
      borderRadius: 5,
      display: 'flex',
      alignItems: 'center',
      gap: 5,
    },
    intentEmoji: {
      fontSize: 14,
    },
    intentText: {
      fontSize: 9,
      color: intentColor,
      letterSpacing: '0.04em',
      lineHeight: 1.3,
    },
  };

  return (
    <div style={s.wrapper} onClick={onClick}>
      <div style={s.name}>{enemy.name}</div>
      <div style={s.art}>{enemy.art}</div>

      {/* HP bar */}
      <div style={s.hpRow}>
        <div style={s.hpLabel}>
          <span>HP</span>
          <span style={{ color: hpColor, fontWeight: 600 }}>
            {enemy.currentHealth} / {enemy.maxHealth}
          </span>
        </div>
        <div style={s.hpBar}><div style={s.hpFill} /></div>
      </div>

      {/* Shield */}
      {enemy.currentShield > 0 && (
        <div style={s.shieldBadge}>🛡 {enemy.currentShield}</div>
      )}

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div style={s.statusRow}>
          {enemy.statusEffects.map((e) => {
            const d = STATUS_DISPLAY[e.type];
            if (!d) return null;
            return (
              <span key={e.type} style={statusBadgeStyle(d.color)}>
                {d.emoji} {e.stacks}
              </span>
            );
          })}
        </div>
      )}

      {/* Intent */}
      <div style={s.intentBox}>
        <span style={s.intentEmoji}>{INTENT_EMOJI[intent.type]}</span>
        <span style={s.intentText}>{intent.description}</span>
      </div>
    </div>
  );
};

import React from 'react';
import type { EnemyInstance, IntentType } from '../types';
import { getEnemyArt, getIntentArt, getStatusArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

const INTENT_COLOR: Record<IntentType, string> = {
  attack:  '#ff4444',
  defend:  '#3b8fff',
  buff:    '#ffcc00',
  debuff:  '#cc44ff',
  summon:  '#22cc88',
  special: '#ff88cc',
};

const INTENT_EMOJI: Record<IntentType, string> = {
  attack:  'ATK',
  defend:  'DEF',
  buff:    'BUF',
  debuff:  'HEX',
  summon:  'SUM',
  special: 'SPC',
};

const STATUS_DISPLAY: Record<string, { emoji: string; color: string }> = {
  burn:       { emoji: 'BRN', color: '#ff5a2e' },
  poison:     { emoji: 'PSN', color: '#44cc44' },
  shield:     { emoji: 'SHD', color: '#3b8fff' },
  strength:   { emoji: 'STR', color: '#ffcc00' },
  weak:       { emoji: 'WEK', color: '#aaaaaa' },
  vulnerable: { emoji: 'VUL', color: '#ff8c00' },
  barrier:    { emoji: 'BAR', color: '#00aaff' },
};

export interface EnemyComponentProps {
  enemy: EnemyInstance;
  isTargeted?: boolean;
  /** Pulse the intent box (enemy turn telegraphing). */
  intentPulsing?: boolean;
  /** Enemy is mid-action — flash brighter. */
  intentResolving?: boolean;
  onClick?: () => void;
}

export const EnemyComponent: React.FC<EnemyComponentProps> = ({
  enemy,
  isTargeted = false,
  intentPulsing = false,
  intentResolving = false,
  onClick,
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
      gap: 8,
      padding: '14px 18px',
      cursor: onClick ? 'pointer' : 'default',
      borderRadius: 10,
      border: isTargeted ? '2px solid #ff3366' : '2px solid transparent',
      boxShadow: isTargeted ? '0 0 16px #ff336666' : 'none',
      transition: 'box-shadow 120ms, border-color 120ms',
      minWidth: 200,
      maxWidth: 320,
    },
    name: {
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: '0.08em',
      color: '#eee',
      textTransform: 'uppercase',
    },
    art: {
      width: 118,
      height: 118,
      borderRadius: 12,
      background: 'rgba(244, 236, 216, 0.08)',
      border: '1px solid rgba(255,255,255,0.08)',
      filter: isTargeted
        ? 'drop-shadow(0 0 12px #ff3366)'
        : intentResolving
        ? `drop-shadow(0 0 14px ${intentColor})`
        : undefined,
      transition: 'filter 200ms',
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
      height: 8,
      background: '#1a1a2e',
      borderRadius: 4,
      overflow: 'hidden',
      border: '1px solid #2a2a3a',
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
    },
    intentBox: {
      width: '100%',
      padding: '8px 12px',
      background: intentResolving ? `${intentColor}44` : `${intentColor}22`,
      border: `2px solid ${intentColor}${intentPulsing ? 'cc' : '88'}`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: intentColor,
      animation: intentPulsing
        ? 'dungeonIntentPulse 850ms ease-in-out infinite'
        : undefined,
      boxShadow: intentPulsing ? `0 0 12px ${intentColor}66` : 'none',
      transition: 'background 160ms, box-shadow 160ms',
    },
    intentEmoji: {
      width: 24,
      height: 24,
      flexShrink: 0,
      filter: `drop-shadow(0 0 4px ${intentColor}aa)`,
    },
    intentBlock: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      flex: 1,
    },
    intentLabel: {
      fontSize: 8,
      letterSpacing: '0.25em',
      opacity: 0.7,
      textTransform: 'uppercase',
      color: intentColor,
    },
    intentText: {
      fontSize: 11,
      color: '#fff',
      letterSpacing: '0.05em',
      lineHeight: 1.3,
      fontWeight: 600,
    },
  };

  return (
    <div style={s.wrapper} onClick={onClick}>
      <div style={s.name}>{enemy.name}</div>
      <TokenArt
        src={getEnemyArt(enemy.id, enemy.isBoss)}
        fallback={enemy.art}
        alt=""
        style={s.art}
        fallbackStyle={{ fontSize: 72, lineHeight: 1 }}
      />

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
        <div style={s.shieldBadge}>Block {enemy.currentShield}</div>
      )}

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div style={s.statusRow}>
          {enemy.statusEffects.map((e) => {
            const d = STATUS_DISPLAY[e.type];
            if (!d) return null;
            return (
              <span key={e.type} style={statusBadgeStyle(d.color)}>
                <TokenArt
                  src={getStatusArt(e.type)}
                  fallback={d.emoji}
                  alt=""
                  style={{ width: 12, height: 12, marginRight: 3, verticalAlign: 'middle' }}
                  fallbackStyle={{ lineHeight: 1 }}
                />
                {e.stacks}
              </span>
            );
          })}
        </div>
      )}

      {/* Intent — enlarged and telegraphed */}
      <div style={s.intentBox}>
        <TokenArt
          src={getIntentArt(intent.type)}
          fallback={INTENT_EMOJI[intent.type]}
          alt=""
          style={s.intentEmoji}
          fallbackStyle={{ fontSize: 22, lineHeight: 1 }}
        />
        <div style={s.intentBlock}>
          <span style={s.intentLabel}>
            {intentResolving ? 'Acting...' : intentPulsing ? 'Incoming' : 'Next Turn'}
            {intent.value !== undefined && ` - ${intent.value}`}
          </span>
          <span style={s.intentText}>{intent.description}</span>
        </div>
      </div>
    </div>
  );
};

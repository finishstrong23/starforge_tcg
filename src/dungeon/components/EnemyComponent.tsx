import React, { useEffect, useState, useMemo } from 'react';
import type { DungeonEnemy, IntentType, StatusEffect } from '../types';
import { computeDisplayedDamage } from '../engine/combat';

interface EnemyComponentProps {
  enemy: DungeonEnemy;
  onClick?: () => void;
  isTargetable?: boolean;
  showDamage?: number;
  heroStatusEffects?: StatusEffect[];
}

const INTENT_CONFIG: Record<IntentType, { icon: string; color: string; label: (v?: number) => string }> = {
  ATTACK: {
    icon: '⚔️',
    color: '#e63946',
    label: (v) => `Attacks for ${v ?? '?'}`,
  },
  MULTI_ATTACK: {
    icon: '⚔️',
    color: '#e63946',
    label: (v) => `Multi-attack`,
  },
  AOE_ATTACK: {
    icon: '💥',
    color: '#ff6b35',
    label: (v) => `Attacks ALL for ${v ?? '?'}`,
  },
  DEFEND: {
    icon: '🛡️',
    color: '#4a9eff',
    label: (v) => `Blocks for ${v ?? '?'}`,
  },
  BUFF: {
    icon: '💪',
    color: '#4caf50',
    label: () => 'Buffing',
  },
  DEBUFF: {
    icon: '💀',
    color: '#9b59b6',
    label: () => 'Debuffing',
  },
  ATTACK_BUFF: {
    icon: '⚔️',
    color: '#e63946',
    label: (v) => `Attacks for ${v ?? '?'} + Buff`,
  },
  ATTACK_DEBUFF: {
    icon: '⚔️',
    color: '#9b59b6',
    label: (v) => `Attacks for ${v ?? '?'} + Debuff`,
  },
  SPECIAL: {
    icon: '⭐',
    color: '#ff9800',
    label: () => 'Special',
  },
  UNKNOWN: {
    icon: '❓',
    color: '#666',
    label: () => 'Unknown',
  },
};

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  STRENGTH: { icon: '⚔', color: '#e63946' },
  DEXTERITY: { icon: '🏃', color: '#4caf50' },
  VULNERABLE: { icon: '💔', color: '#ff6b35' },
  WEAK: { icon: '📉', color: '#999' },
  BURN: { icon: '🔥', color: '#e63946' },
  BARRIER: { icon: '🛡', color: '#4a9eff' },
  DRAIN: { icon: '🩸', color: '#9b59b6' },
  PHASE: { icon: '👻', color: '#7b2d8e' },
  GUARDIAN: { icon: '🗿', color: '#888' },
  CLOAK: { icon: '🌑', color: '#333' },
  SWIFT: { icon: '💨', color: '#7fff7f' },
  BLITZ: { icon: '⚡', color: '#ff9800' },
  DOUBLE_STRIKE: { icon: '⚔⚔', color: '#cc0000' },
  ENRAGE: { icon: '😡', color: '#cc0000' },
  REGEN: { icon: '💚', color: '#4caf50' },
  ILLUMINATE_STACKS: { icon: '✨', color: '#ffd700' },
  IMMOLATE_STACKS: { icon: '🔥', color: '#ff4500' },
};

// CSS keyframe animation injected once
const PULSE_KEYFRAMES = `
@keyframes dungeonIntentPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}
@keyframes dungeonDamageFloat {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = PULSE_KEYFRAMES;
  document.head.appendChild(style);
}

const EnemyComponent: React.FC<EnemyComponentProps> = ({
  enemy,
  onClick,
  isTargetable = false,
  showDamage,
  heroStatusEffects = [],
}) => {
  const [damageVisible, setDamageVisible] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (showDamage != null && showDamage > 0) {
      setDamageVisible(true);
      const timer = setTimeout(() => setDamageVisible(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showDamage]);

  const healthPct = enemy.maxHealth > 0 ? (enemy.currentHealth / enemy.maxHealth) * 100 : 0;
  const healthColor = healthPct > 50 ? '#4caf50' : healthPct > 25 ? '#ffc107' : '#e63946';
  const intent = enemy.intent;
  const intentCfg = INTENT_CONFIG[intent.type];

  // Live-updated displayed damage accounting for Strength, Weak, Vulnerable
  const displayedDamage = useMemo(() => {
    const baseDmg = intent.damage ?? intent.value ?? 0;
    if (baseDmg <= 0) return 0;
    return computeDisplayedDamage(baseDmg, enemy.statusEffects, heroStatusEffects);
  }, [intent.damage, intent.value, enemy.statusEffects, heroStatusEffects]);

  const hasAttackDamage = intent.type === 'ATTACK' || intent.type === 'MULTI_ATTACK'
    || intent.type === 'AOE_ATTACK' || intent.type === 'ATTACK_BUFF'
    || intent.type === 'ATTACK_DEBUFF';

  const isBoss = enemy.isBoss;
  const containerWidth = isBoss ? 280 : 220;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: containerWidth,
    padding: isBoss ? '16px 20px' : '12px 16px',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
    borderRadius: 12,
    border: isTargetable
      ? '2px solid #e63946'
      : isBoss
        ? '3px solid #ff9800'
        : '1.5px solid #333',
    boxShadow: isTargetable
      ? '0 0 14px rgba(230, 57, 70, 0.5)'
      : isBoss
        ? '0 0 20px rgba(255, 152, 0, 0.3), inset 0 0 30px rgba(255, 152, 0, 0.05)'
        : '0 2px 8px rgba(0,0,0,0.4)',
    cursor: isTargetable ? 'pointer' : 'default',
    position: 'relative',
    userSelect: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  // Intent indicator
  const intentContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 48,
  };

  const intentIconStyle: React.CSSProperties = {
    fontSize: isBoss ? 32 : 26,
    animation: 'dungeonIntentPulse 2s ease-in-out infinite',
  };

  const intentTextStyle: React.CSSProperties = {
    fontSize: 11,
    color: intentCfg.color,
    fontWeight: 600,
    marginTop: 2,
    textAlign: 'center',
  };

  // Name
  const nameStyle: React.CSSProperties = {
    fontSize: isBoss ? 18 : 15,
    fontWeight: 'bold',
    color: isBoss ? '#ff9800' : '#fff',
    textAlign: 'center',
    marginBottom: 6,
    textShadow: isBoss ? '0 0 8px rgba(255, 152, 0, 0.5)' : 'none',
    letterSpacing: isBoss ? 1 : 0,
  };

  // Elite badge
  const eliteBadgeStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#ffd700',
    background: 'rgba(255, 215, 0, 0.15)',
    padding: '1px 6px',
    borderRadius: 4,
    marginBottom: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  };

  // HP bar
  const hpBarOuterStyle: React.CSSProperties = {
    width: '100%',
    height: isBoss ? 22 : 18,
    background: '#222',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #444',
    marginBottom: 6,
  };

  const hpBarFillStyle: React.CSSProperties = {
    width: `${healthPct}%`,
    height: '100%',
    background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
    transition: 'width 0.3s ease',
    borderRadius: 3,
  };

  const hpTextStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isBoss ? 12 : 11,
    fontWeight: 'bold',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  };

  // Block
  const blockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#4a9eff',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  };

  // Status effects row
  const statusRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  };

  const statusBadgeStyle = (effect: StatusEffect): React.CSSProperties => {
    const cfg = STATUS_ICONS[effect.type] || { icon: '?', color: '#888' };
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'rgba(255,255,255,0.08)',
      borderRadius: 4,
      padding: '1px 5px',
      fontSize: 11,
      color: cfg.color,
      border: `1px solid ${cfg.color}44`,
    };
  };

  // Floating damage
  const floatingDamageStyle: React.CSSProperties = {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e63946',
    textShadow: '0 0 6px rgba(230, 57, 70, 0.8)',
    animation: 'dungeonDamageFloat 0.8s ease-out forwards',
    pointerEvents: 'none',
    zIndex: 10,
  };

  return (
    <div style={containerStyle} onClick={isTargetable ? onClick : undefined}>
      {/* Intent indicator */}
      <div style={intentContainerStyle}>
        <div style={intentIconStyle}>
          {intentCfg.icon}
          {hasAttackDamage && (
            <span style={{ fontSize: isBoss ? 18 : 15, marginLeft: 4, fontFamily: 'monospace', fontWeight: 'bold' }}>
              {displayedDamage}
              {intent.type === 'MULTI_ATTACK' && intent.hits && (
                <span style={{ fontSize: isBoss ? 13 : 11, opacity: 0.9 }}> x{intent.hits}</span>
              )}
            </span>
          )}
          {intent.type === 'DEFEND' && (intent.block ?? intent.value) != null && (
            <span style={{ fontSize: isBoss ? 18 : 15, marginLeft: 4, fontFamily: 'monospace', fontWeight: 'bold' }}>
              {intent.block ?? intent.value}
            </span>
          )}
        </div>
        <div style={intentTextStyle}>
          {intent.description || intentCfg.label(intent.value)}
        </div>
      </div>

      {/* Enemy name */}
      <div style={nameStyle}>{enemy.name}</div>

      {/* Elite badge */}
      {enemy.isElite && !enemy.isBoss && <div style={eliteBadgeStyle}>Elite</div>}

      {/* Boss badge */}
      {enemy.isBoss && (
        <div style={{ ...eliteBadgeStyle, color: '#ff9800', background: 'rgba(255,152,0,0.15)' }}>
          Boss
        </div>
      )}

      {/* HP bar */}
      <div style={hpBarOuterStyle}>
        <div style={hpBarFillStyle} />
        <div style={hpTextStyle}>
          {enemy.currentHealth}/{enemy.maxHealth}
        </div>
      </div>

      {/* Block */}
      {enemy.block > 0 && (
        <div style={blockStyle}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          {enemy.block}
        </div>
      )}

      {/* Status effects */}
      {enemy.statusEffects.length > 0 && (
        <div style={statusRowStyle}>
          {enemy.statusEffects.map((effect, i) => {
            const cfg = STATUS_ICONS[effect.type] || { icon: '?', color: '#888' };
            return (
              <div key={`${effect.type}-${i}`} style={statusBadgeStyle(effect)}>
                <span>{cfg.icon}</span>
                <span>{effect.stacks}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating damage */}
      {damageVisible && showDamage != null && showDamage > 0 && (
        <div style={floatingDamageStyle}>-{showDamage}</div>
      )}
    </div>
  );
};

export { EnemyComponent };
export default EnemyComponent;

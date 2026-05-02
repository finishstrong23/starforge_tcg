import React, { useEffect, useState, useMemo } from 'react';
import type { DungeonEnemy, IntentType, StatusEffect } from '../types';
import { computeDisplayedDamage } from '../engine/combat';

interface EnemyComponentProps {
  enemy: DungeonEnemy;
  onClick?: () => void;
  isTargetable?: boolean;
  showDamage?: number;
  heroStatusEffects?: StatusEffect[];
  isEnemyTurn?: boolean;
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
const INTENT_KEYFRAMES = `
@keyframes dungeonIntentPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}
@keyframes dungeonIntentFadeIn {
  0% { opacity: 0; transform: translateY(6px) scale(0.85); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dungeonIntentGlow {
  0%, 100% { box-shadow: 0 0 6px var(--intent-glow-color, rgba(255,255,255,0.2)); }
  50% { box-shadow: 0 0 14px var(--intent-glow-color, rgba(255,255,255,0.4)); }
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
  style.textContent = INTENT_KEYFRAMES;
  document.head.appendChild(style);
}

const EnemyComponent: React.FC<EnemyComponentProps> = ({
  enemy,
  onClick,
  isTargetable = false,
  showDamage,
  heroStatusEffects = [],
  isEnemyTurn = false,
}) => {
  const [damageVisible, setDamageVisible] = useState(false);
  const [intentHovered, setIntentHovered] = useState(false);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    if (showDamage != null && showDamage > 0) {
      setDamageVisible(true);
      const timer = setTimeout(() => setDamageVisible(false), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showDamage]);

  const healthPct = enemy.maxHealth > 0 ? (enemy.currentHealth / enemy.maxHealth) * 100 : 0;
  const healthColor = healthPct > 50 ? '#4caf50' : healthPct > 25 ? '#ffc107' : '#e63946';
  const intent = enemy.intent;
  const intentCfg = INTENT_CONFIG[intent.type];

  const displayedDamage = useMemo(() => {
    const baseDmg = intent.damage ?? intent.value ?? 0;
    if (baseDmg <= 0) return 0;
    return computeDisplayedDamage(baseDmg, enemy.statusEffects, heroStatusEffects);
  }, [intent.damage, intent.value, enemy.statusEffects, heroStatusEffects]);

  const hasAttackDamage = intent.type === 'ATTACK' || intent.type === 'MULTI_ATTACK'
    || intent.type === 'AOE_ATTACK' || intent.type === 'ATTACK_BUFF'
    || intent.type === 'ATTACK_DEBUFF';

  const isCompositeIntent = intent.type === 'ATTACK_BUFF' || intent.type === 'ATTACK_DEBUFF';
  const secondaryIcon = intent.type === 'ATTACK_BUFF' ? '💪' : intent.type === 'ATTACK_DEBUFF' ? '💀' : null;

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

  const nameStyle: React.CSSProperties = {
    fontSize: isBoss ? 18 : 15,
    fontWeight: 'bold',
    color: isBoss ? '#ff9800' : '#fff',
    textAlign: 'center',
    marginBottom: 6,
    textShadow: isBoss ? '0 0 8px rgba(255, 152, 0, 0.5)' : 'none',
    letterSpacing: isBoss ? 1 : 0,
  };

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

  const blockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    color: '#4a9eff',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  };

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

  // --- Intent bubble styles ---
  const intentBubbleSize = isBoss ? 40 : 34;
  const intentColor = intentCfg.color;
  const intentGlowColor = intentColor + '66';
  const upcomingIntents = enemy.upcomingIntents ?? [];

  const intentWrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: intentBubbleSize + 14,
    position: 'relative',
    opacity: isEnemyTurn ? 0 : 1,
    transition: 'opacity 0.4s ease',
    animation: isEnemyTurn ? 'none' : 'dungeonIntentFadeIn 0.5s ease-out',
  };

  const intentBubbleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: intentBubbleSize,
    height: intentBubbleSize,
    padding: '4px 10px',
    background: `${intentColor}22`,
    border: `2px solid ${intentColor}88`,
    borderRadius: intentBubbleSize / 2,
    animation: intentHovered
      ? 'none'
      : 'dungeonIntentPulse 2.5s ease-in-out infinite',
    boxShadow: intentHovered
      ? `0 0 16px ${intentGlowColor}, 0 0 4px ${intentGlowColor}`
      : `0 0 6px ${intentGlowColor}`,
    transition: 'box-shadow 0.2s ease, background 0.2s ease',
    cursor: 'default',
    position: 'relative',
  };

  const intentIconFontSize = isBoss ? 22 : 18;

  const tooltipText = intent.description || intentCfg.label(intent.value);
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: 6,
    padding: '5px 10px',
    background: 'rgba(0,0,0,0.9)',
    border: `1px solid ${intentColor}66`,
    borderRadius: 6,
    fontSize: 11,
    color: '#ddd',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 20,
    opacity: intentHovered ? 1 : 0,
    transition: 'opacity 0.2s ease',
    textAlign: 'center',
    maxWidth: 200,
  };

  // Upcoming intent mini-bubble styles
  const upcomingBubbleSize = isBoss ? 24 : 20;
  const upcomingIconFontSize = isBoss ? 13 : 11;

  return (
    <div style={containerStyle} onClick={isTargetable ? onClick : undefined}>
      {/* Intent row: current bubble + upcoming trail */}
      <div style={intentWrapperStyle}>
        {/* Tooltip */}
        <div style={tooltipStyle}>{tooltipText}</div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {/* Main intent bubble */}
          <div
            style={intentBubbleStyle}
            onMouseEnter={() => setIntentHovered(true)}
            onMouseLeave={() => setIntentHovered(false)}
          >
            {/* Primary icon */}
            <span style={{ fontSize: intentIconFontSize, lineHeight: 1 }}>
              {intentCfg.icon}
            </span>

            {/* Secondary icon for composite intents */}
            {isCompositeIntent && secondaryIcon && (
              <span style={{
                fontSize: intentIconFontSize - 4,
                lineHeight: 1,
                opacity: 0.9,
              }}>
                {secondaryIcon}
              </span>
            )}

            {/* Damage number */}
            {hasAttackDamage && (
              <span style={{
                fontSize: isBoss ? 16 : 14,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: intentColor,
                lineHeight: 1,
              }}>
                {displayedDamage}
                {intent.type === 'MULTI_ATTACK' && intent.hits && (
                  <span style={{ fontSize: isBoss ? 11 : 10, opacity: 0.85 }}>
                    x{intent.hits}
                  </span>
                )}
              </span>
            )}

            {/* Block number */}
            {intent.type === 'DEFEND' && (intent.block ?? intent.value) != null && (
              <span style={{
                fontSize: isBoss ? 16 : 14,
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: intentColor,
                lineHeight: 1,
              }}>
                {intent.block ?? intent.value}
              </span>
            )}
          </div>

          {/* Upcoming intent trail */}
          {upcomingIntents.length > 0 && upcomingIntents.map((upcoming, idx) => {
            const upCfg = INTENT_CONFIG[upcoming.type];
            const upColor = upCfg.color;
            const opacity = idx === 0 ? 0.5 : 0.3;
            return (
              <React.Fragment key={idx}>
                {/* Connector dot */}
                <div style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: `rgba(255,255,255,${opacity * 0.6})`,
                  flexShrink: 0,
                }} />
                {/* Mini bubble */}
                <div
                  title={upcoming.description || upCfg.label(upcoming.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    minWidth: upcomingBubbleSize,
                    height: upcomingBubbleSize,
                    padding: '2px 5px',
                    background: `${upColor}15`,
                    border: `1.5px solid ${upColor}44`,
                    borderRadius: upcomingBubbleSize / 2,
                    opacity,
                    transition: 'opacity 0.3s ease',
                    cursor: 'default',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: upcomingIconFontSize, lineHeight: 1 }}>
                    {upCfg.icon}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
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

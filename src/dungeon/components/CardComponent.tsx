import React from 'react';
import type { CardInstance, Faction, Keyword, StatusEffect } from '../types';

// ─── Theme ────────────────────────────────────────────────────────────────────

const FACTION_COLOR: Record<Faction, string> = {
  Cogsmiths:  '#4aa8e0',
  Pyroclast:  '#ff5a2e',
  Luminar:    '#f5d67a',
  WarpRiders: '#c27dff',
};

const RARITY_COLOR: Record<string, string> = {
  Common:    '#9d9d9d',
  Uncommon:  '#1eff00',
  Rare:      '#0070dd',
  Epic:      '#a335ee',
  Legendary: '#ff8000',
};

const TYPE_BG: Record<string, string> = {
  Attack:  '#3b1a1a',
  Skill:   '#1a2d3b',
  Power:   '#1a1a3b',
  Minion:  '#1a2e1a',
  Augment: '#2e2a1a',
  Spell:   '#1a1a3b',
  Structure:'#1e1e2e',
};

const KW_LABEL: Partial<Record<Keyword, string>> = {
  GUARDIAN:   'Guardian',
  BARRIER:    'Barrier',
  SWIFT:      'Swift',
  BLITZ:      'Blitz',
  DEPLOY:     'Deploy',
  LAST_WORDS: 'Last Words',
  IMMOLATE:   'Immolate',
  ILLUMINATE: 'Illuminate',
  DRAIN:      'Drain',
  CLOAK:      'Cloak',
  PHASE:      'Flux',
  UPGRADE:    'Upgrade',
};

const STATUS_EMOJI: Partial<Record<string, string>> = {
  burn:       '🔥',
  poison:     '☠',
  shield:     '🛡',
  strength:   '💪',
  weak:       '⬇',
  vulnerable: '↓',
  barrier:    '🔷',
  stealth:    '👤',
  phase:      '✦',
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface CardComponentProps {
  card: CardInstance;
  /** Card is in hand and player can afford it. */
  selectable?: boolean;
  /** Card is currently selected for targeting. */
  selected?: boolean;
  /** Cost exceeds current energy — dim the card. */
  unaffordable?: boolean;
  /** Card can be clicked as an attack target. */
  targetable?: boolean;
  /** Compact mode for board (minions in play). */
  compact?: boolean;
  onClick?: () => void;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  selectable = false,
  selected = false,
  unaffordable = false,
  targetable = false,
  compact = false,
  onClick,
}) => {
  const accent = FACTION_COLOR[card.faction] ?? '#aaaaaa';
  const rarityColor = RARITY_COLOR[card.rarity] ?? '#9d9d9d';
  const typeBg = TYPE_BG[card.type] ?? '#121220';
  const isMinion = card.type === 'Minion';

  const w = compact ? 64 : 108;
  const h = compact ? 88 : 155;

  const styles: Record<string, React.CSSProperties> = {
    card: {
      position: 'relative',
      width: w,
      height: h,
      borderRadius: compact ? 4 : 6,
      border: selected
        ? `2px solid ${accent}`
        : targetable
        ? '2px solid #ff3366'
        : `1px solid ${unaffordable ? '#2a2a3a' : accent + '66'}`,
      background: unaffordable
        ? '#0a0a12'
        : `linear-gradient(160deg, ${typeBg} 60%, ${accent}18 100%)`,
      cursor: onClick ? 'pointer' : 'default',
      opacity: unaffordable ? 0.45 : 1,
      boxShadow: selected
        ? `0 0 10px ${accent}88, 0 0 20px ${accent}44`
        : targetable
        ? '0 0 8px #ff336688'
        : selectable
        ? `0 2px 8px ${accent}44`
        : 'none',
      transition: 'box-shadow 100ms, border-color 100ms, opacity 100ms',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      flexShrink: 0,
    },
    costBadge: {
      position: 'absolute',
      top: compact ? 2 : 4,
      left: compact ? 2 : 4,
      width: compact ? 16 : 22,
      height: compact ? 16 : 22,
      borderRadius: '50%',
      background: unaffordable ? '#222' : accent,
      color: unaffordable ? '#555' : '#000',
      fontSize: compact ? 9 : 12,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1,
    },
    typeTag: {
      position: 'absolute',
      top: compact ? 2 : 4,
      right: compact ? 2 : 4,
      fontSize: compact ? 7 : 8,
      letterSpacing: '0.06em',
      color: rarityColor,
      opacity: 0.85,
      textTransform: 'uppercase',
    },
    body: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: compact ? '18px 3px 3px' : '26px 5px 4px',
      gap: compact ? 1 : 2,
      overflow: 'hidden',
    },
    name: {
      fontSize: compact ? 7 : 9,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '0.04em',
      lineHeight: 1.15,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    artBox: {
      flex: compact ? 0 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: compact ? 18 : 28,
      lineHeight: 1,
      overflow: 'hidden',
      height: compact ? 22 : undefined,
    },
    text: {
      fontSize: compact ? 0 : 7,
      color: '#bbb',
      lineHeight: 1.3,
      overflow: 'hidden',
      display: compact ? 'none' : '-webkit-box',
      WebkitLineClamp: 3,
      WebkitBoxOrient: 'vertical',
    },
    keywords: {
      display: compact ? 'none' : 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginTop: 2,
    },
    kwBadge: {
      fontSize: 6,
      padding: '1px 3px',
      border: `1px solid ${accent}55`,
      borderRadius: 2,
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
    stats: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: compact ? '0 2px 2px' : '0 4px 4px',
      fontSize: compact ? 8 : 9,
      fontWeight: 700,
    },
    statusRow: {
      position: 'absolute',
      bottom: compact ? 20 : 28,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 2,
      fontSize: 7,
    },
    upgradeDot: {
      position: 'absolute',
      bottom: compact ? 2 : 3,
      right: compact ? 2 : 3,
      width: 5,
      height: 5,
      borderRadius: '50%',
      background: '#00ff88',
    },
  };

  const factionGlyph: Record<Faction, string> = {
    Cogsmiths: '⚙',
    Pyroclast: '🔥',
    Luminar: '☀',
    WarpRiders: '✦',
  };

  const renderStatuses = (effects: StatusEffect[]) =>
    effects.map((e) => (
      <span key={e.type} title={`${e.type} ×${e.stacks}`}>
        {STATUS_EMOJI[e.type] ?? '?'}{e.stacks > 1 ? e.stacks : ''}
      </span>
    ));

  return (
    <div style={styles.card} onClick={onClick} role={onClick ? 'button' : undefined}>
      {/* Cost */}
      <div style={styles.costBadge}>{card.cost}</div>
      {/* Type / rarity */}
      <div style={styles.typeTag}>{card.rarity[0]}</div>

      <div style={styles.body}>
        <div style={styles.name}>{card.name}</div>

        <div style={styles.artBox}>
          {factionGlyph[card.faction]}
        </div>

        {!compact && (
          <div style={styles.text}>{card.upgraded ? (card.upgradeText ?? card.cardText) : card.cardText}</div>
        )}

        {!compact && card.keywords.length > 0 && (
          <div style={styles.keywords}>
            {card.keywords.map((kw) => (
              <span key={kw} style={styles.kwBadge}>{KW_LABEL[kw] ?? kw}</span>
            ))}
          </div>
        )}
      </div>

      {/* Minion stats */}
      {isMinion && (
        <div style={styles.stats}>
          <span style={{ color: '#ffcc00' }}>⚔{card.attack ?? 0}</span>
          <span style={{ color: '#22cc44' }}>♥{card.currentHealth ?? card.health ?? 0}</span>
        </div>
      )}

      {/* Status effects on card */}
      {card.statusEffects.length > 0 && (
        <div style={styles.statusRow}>{renderStatuses(card.statusEffects)}</div>
      )}

      {/* Upgraded indicator */}
      {card.upgraded && <div style={styles.upgradeDot} title="Upgraded" />}
    </div>
  );
};

import React from 'react';
import type { CardInstance, Faction, Keyword, StatusEffect } from '../types';
import { getCardStats } from '../engine/cardStats';
import { getCardArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

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
  Curse:   '#2b1728',
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
  /** Larger presentation for draft/reward choices where text readability matters. */
  size?: 'normal' | 'draft';
  /** Exact or best-known combat preview lines for in-hand cards. */
  previewLines?: string[];
  onClick?: () => void;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  selectable = false,
  selected = false,
  unaffordable = false,
  targetable = false,
  compact = false,
  size = 'normal',
  previewLines,
  onClick,
}) => {
  const accent = FACTION_COLOR[card.faction] ?? '#aaaaaa';
  const rarityColor = RARITY_COLOR[card.rarity] ?? '#9d9d9d';
  const typeBg = TYPE_BG[card.type] ?? '#121220';
  const isMinion = card.type === 'Minion';
  const stats = getCardStats(card);

  const isDraftSize = !compact && size === 'draft';
  const w = compact ? 64 : isDraftSize ? 158 : 108;
  const h = compact ? 88 : isDraftSize ? 226 : 155;

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
      width: compact ? 16 : isDraftSize ? 24 : 22,
      height: compact ? 16 : isDraftSize ? 24 : 22,
      borderRadius: '50%',
      background: unaffordable ? '#222' : accent,
      color: unaffordable ? '#555' : '#000',
      fontSize: compact ? 9 : isDraftSize ? 14 : 12,
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
      fontSize: compact ? 7 : isDraftSize ? 10 : 8,
      letterSpacing: '0.06em',
      color: rarityColor,
      opacity: 0.85,
      textTransform: 'uppercase',
    },
    body: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: compact ? '18px 3px 3px' : isDraftSize ? '32px 10px 8px' : '26px 5px 4px',
      gap: compact ? 1 : isDraftSize ? 5 : 2,
      overflow: 'hidden',
    },
    name: {
      fontSize: compact ? 7 : isDraftSize ? 12 : 9,
      fontWeight: 700,
      color: '#fff',
      letterSpacing: '0.04em',
      lineHeight: 1.15,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    artBox: {
      flex: compact ? 0 : isDraftSize ? '0 0 74px' : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: compact ? 18 : isDraftSize ? 36 : 28,
      lineHeight: 1,
      overflow: 'hidden',
      height: compact ? 22 : isDraftSize ? 74 : undefined,
      borderRadius: compact ? 3 : 5,
      background: compact ? 'transparent' : 'rgba(244, 236, 216, 0.08)',
    },
    text: {
      fontSize: compact ? 0 : isDraftSize ? 11 : 7,
      color: '#d6d6df',
      lineHeight: isDraftSize ? 1.38 : 1.25,
      overflow: 'hidden',
      display: compact ? 'none' : '-webkit-box',
      WebkitLineClamp: previewLines && previewLines.length > 0 ? 2 : isDraftSize ? 4 : 3,
      WebkitBoxOrient: 'vertical',
    },
    preview: {
      display: compact || !previewLines || previewLines.length === 0 ? 'none' : 'flex',
      flexWrap: 'wrap',
      gap: 3,
      marginTop: 3,
    },
    previewPill: {
      fontSize: isDraftSize ? 8 : 6,
      padding: '1px 4px',
      border: '1px solid #67e8aa66',
      borderRadius: 3,
      color: '#9fffc8',
      background: 'rgba(17, 80, 56, 0.4)',
      lineHeight: 1.25,
      whiteSpace: 'nowrap',
    },
    keywords: {
      display: compact ? 'none' : 'flex',
      flexWrap: 'wrap',
      gap: 2,
      marginTop: 2,
    },
    kwBadge: {
      fontSize: isDraftSize ? 8 : 6,
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
      padding: compact ? '0 2px 2px' : isDraftSize ? '0 8px 8px' : '0 4px 4px',
      fontSize: compact ? 8 : isDraftSize ? 12 : 9,
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

  // Flux: extract just the active body so the player sees their actual outcome inline
  const isFlux = /^\s*flux\./i.test(stats.text);
  const fluxBody = isFlux && card.fluxState
    ? (() => {
        const t = stats.text;
        const re = new RegExp(`${card.fluxState}:\\s*([^A-C]*?)(?=\\s*[A-C]:|$)`, 'i');
        const m = t.match(re);
        return m ? m[1].trim() : t;
      })()
    : null;
  const fluxColor = card.fluxState === 'A' ? '#4adfff' : card.fluxState === 'B' ? '#ff7acc' : '#ffd24a';

  const renderStatuses = (effects: StatusEffect[]) =>
    effects.map((e) => (
      <span key={e.type} title={`${e.type} ×${e.stacks}`}>
        {STATUS_EMOJI[e.type] ?? '?'}{e.stacks > 1 ? e.stacks : ''}
      </span>
    ));

  return (
    <div style={styles.card} onClick={onClick} role={onClick ? 'button' : undefined}>
      {/* Cost */}
      <div style={styles.costBadge}>{stats.cost}</div>
      {/* Type / rarity */}
      <div style={styles.typeTag}>{card.rarity[0]}</div>

      {/* Flux state badge — shows the WarpRiders A/B/C step */}
      {isFlux && card.fluxState && (
        <div
          title={`Flux state ${card.fluxState} — shifts at end of turn`}
          style={{
            position: 'absolute',
            top: compact ? 2 : 4,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: compact ? '0 4px' : '1px 6px',
            fontSize: compact ? 8 : 10,
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: fluxColor,
            background: '#0a0a14',
            border: `1px solid ${fluxColor}`,
            borderRadius: 3,
            boxShadow: `0 0 6px ${fluxColor}66`,
            lineHeight: 1.2,
          }}
        >
          ✦{card.fluxState}
        </div>
      )}

      {/* Lumens — Luminar Channel cards */}
      {card.lumens !== undefined && card.lumens > 0 && (
        <div
          title={`${card.lumens} Lumen${card.lumens === 1 ? '' : 's'} — released when this card is played`}
          style={{
            position: 'absolute',
            top: compact ? 2 : 4,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: compact ? '0 4px' : '1px 6px',
            fontSize: compact ? 8 : 10,
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: '#ffe87a',
            background: '#0a0a14',
            border: '1px solid #ffe87a',
            borderRadius: 3,
            boxShadow: '0 0 8px #ffe87a99',
            lineHeight: 1.2,
          }}
        >
          ✨ {card.lumens}
        </div>
      )}

      {/* Summon badge — Cogsmiths drones/sentries/titans */}
      {card.summonAutoDamage !== undefined && (
        <div
          title={
            card.summonTurnsLeft === undefined || card.summonTurnsLeft < 0
              ? `Auto-attacks for ${card.summonAutoDamage}${(card.summonActionsPerTurn ?? 1) > 1 ? `×${card.summonActionsPerTurn}` : ''} per turn — permanent`
              : `Auto-attacks for ${card.summonAutoDamage}${(card.summonActionsPerTurn ?? 1) > 1 ? `×${card.summonActionsPerTurn}` : ''} per turn — ${card.summonTurnsLeft} turn${card.summonTurnsLeft === 1 ? '' : 's'} left`
          }
          style={{
            position: 'absolute',
            top: compact ? 2 : 4,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: compact ? '0 4px' : '1px 6px',
            fontSize: compact ? 8 : 10,
            fontWeight: 900,
            letterSpacing: '0.08em',
            color: '#22cc88',
            background: '#0a0a14',
            border: '1px solid #22cc88',
            borderRadius: 3,
            boxShadow: '0 0 6px #22cc8866',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          🤖 {card.summonTurnsLeft === undefined || card.summonTurnsLeft < 0 ? '∞' : card.summonTurnsLeft}
        </div>
      )}

      {/* Augment markers — Cogsmiths attached augments */}
      {card.augments && card.augments.length > 0 && (
        <div
          title={`Augments: ${card.augments.join(', ')}`}
          style={{
            position: 'absolute',
            bottom: compact ? 2 : 16,
            left: compact ? 2 : 4,
            display: 'flex',
            gap: 2,
          }}
        >
          {card.augments.map((aug, i) => (
            <span
              key={i}
              style={{
                fontSize: compact ? 7 : 9,
                padding: '0 3px',
                background: '#1a3050',
                color: '#4aa8e0',
                border: '1px solid #4aa8e0',
                borderRadius: 2,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              ⚙
            </span>
          ))}
        </div>
      )}

      <div style={styles.body}>
        <div style={styles.name}>{card.name}</div>

        <div style={styles.artBox}>
          <TokenArt
            src={getCardArt(card.id)}
            fallback={factionGlyph[card.faction]}
            alt=""
            style={{
              width: compact ? 24 : isDraftSize ? 74 : 46,
              height: compact ? 22 : isDraftSize ? 74 : 46,
            }}
            fallbackStyle={{ fontSize: compact ? 18 : isDraftSize ? 36 : 28, lineHeight: 1 }}
          />
        </div>

        {!compact && (
          <div style={styles.text}>
            {isFlux && card.fluxState ? (
              <>
                <span style={{ color: fluxColor, fontWeight: 700 }}>[{card.fluxState}]</span>{' '}
                {fluxBody}
              </>
            ) : (
              stats.text
            )}
          </div>
        )}

        {!compact && previewLines && previewLines.length > 0 && (
          <div style={styles.preview} title={previewLines.join(' / ')}>
            {previewLines.map((line) => (
              <span key={line} style={styles.previewPill}>{line}</span>
            ))}
          </div>
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
          <span style={{ color: '#ffcc00' }}>⚔{stats.attack ?? 0}</span>
          <span style={{ color: '#22cc44' }}>♥{card.currentHealth ?? stats.health ?? 0}</span>
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

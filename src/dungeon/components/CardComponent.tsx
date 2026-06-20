import React from 'react';
import type { CardInstance, CardType, Faction, Keyword, StatusEffect } from '../types';
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

interface CardTokenPalette {
  base: string;
  accent: string;
  shadow: string;
  light: string;
  dark: string;
}

const CARD_TOKEN_PALETTE: Record<Faction, CardTokenPalette> = {
  Cogsmiths: {
    base: '#f0b55a',
    accent: '#39c5cf',
    shadow: '#bd6c32',
    light: '#fff0a6',
    dark: '#20212a',
  },
  Pyroclast: {
    base: '#ff7043',
    accent: '#ffd15c',
    shadow: '#b93b30',
    light: '#ffe399',
    dark: '#241713',
  },
  Luminar: {
    base: '#f7df8a',
    accent: '#ffffff',
    shadow: '#d79a3d',
    light: '#fff8c9',
    dark: '#2d2415',
  },
  WarpRiders: {
    base: '#9f7cff',
    accent: '#41d9ff',
    shadow: '#5b42b8',
    light: '#f3e8ff',
    dark: '#201934',
  },
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

const hashCardId = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  return hash;
};

const renderTokenMotif = (
  type: CardType,
  palette: CardTokenPalette,
  variant: number,
  strokeWidth: number
): React.ReactNode => {
  const commonStroke = {
    stroke: palette.dark,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'Attack':
      return (
        <g>
          <polygon points="24,61 53,19 60,31 33,69" fill={palette.light} {...commonStroke} />
          <polygon points="32,32 69,57 58,66 24,43" fill={palette.accent} {...commonStroke} />
          <circle cx="45" cy="45" r={variant % 2 === 0 ? 7 : 5} fill={palette.shadow} {...commonStroke} />
        </g>
      );
    case 'Skill':
      return (
        <g>
          <path d="M45 18 L68 28 V45 C68 58 58 68 45 74 C32 68 22 58 22 45 V28 Z" fill={palette.light} {...commonStroke} />
          <path d="M45 28 V61" fill="none" {...commonStroke} />
          <path d="M32 43 H58" fill="none" {...commonStroke} />
        </g>
      );
    case 'Power':
      return (
        <g>
          <circle cx="45" cy="45" r="18" fill={palette.accent} {...commonStroke} />
          <path d="M45 14 V23 M45 67 V76 M14 45 H23 M67 45 H76 M24 24 L31 31 M59 59 L66 66 M66 24 L59 31 M31 59 L24 66" fill="none" {...commonStroke} />
          <circle cx="45" cy="45" r="7" fill={palette.light} stroke="none" />
        </g>
      );
    case 'Augment':
      return (
        <g>
          <rect x="28" y="28" width="34" height="34" rx="8" fill={palette.light} {...commonStroke} />
          <circle cx="45" cy="45" r="11" fill={palette.accent} {...commonStroke} />
          <path d="M45 16 V27 M45 63 V74 M16 45 H27 M63 45 H74" fill="none" {...commonStroke} />
          <circle cx="45" cy="45" r="3" fill={palette.dark} />
        </g>
      );
    case 'Minion':
      return (
        <g>
          <path d="M24 37 C24 24 34 18 45 18 C56 18 66 24 66 37 V58 C66 67 57 72 45 72 C33 72 24 67 24 58 Z" fill={palette.light} {...commonStroke} />
          <circle cx="35" cy="44" r="5" fill={palette.dark} />
          <circle cx="55" cy="44" r="5" fill={palette.dark} />
          <path d="M36 58 H54" fill="none" {...commonStroke} />
          <path d={variant % 2 === 0 ? 'M26 31 L15 24 M64 31 L75 24' : 'M28 25 L21 14 M62 25 L69 14'} fill="none" {...commonStroke} />
        </g>
      );
    case 'Curse':
      return (
        <g>
          <polygon points="45,16 70,43 45,76 20,43" fill={palette.shadow} {...commonStroke} />
          <path d="M47 23 L39 42 L50 42 L42 64" fill="none" stroke={palette.light} strokeWidth={strokeWidth + 1} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="61" cy="29" r="4" fill={palette.accent} stroke="none" />
        </g>
      );
    case 'Spell':
      return (
        <g>
          <circle cx="45" cy="45" r="23" fill={palette.light} {...commonStroke} />
          <path d="M48 21 L31 49 H44 L39 70 L61 38 H47 Z" fill={palette.accent} {...commonStroke} />
        </g>
      );
    case 'Structure':
      return (
        <g>
          <rect x="27" y="34" width="36" height="36" rx="4" fill={palette.light} {...commonStroke} />
          <rect x="34" y="22" width="22" height="18" rx="4" fill={palette.accent} {...commonStroke} />
          <path d="M34 52 H56 M45 34 V70" fill="none" {...commonStroke} />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="45" cy="45" r="22" fill={palette.light} {...commonStroke} />
          <circle cx="45" cy="45" r="9" fill={palette.accent} {...commonStroke} />
        </g>
      );
  }
};

const CardFallbackToken: React.FC<{ card: CardInstance; size: number; compact: boolean }> = ({
  card,
  size,
  compact,
}) => {
  const palette = CARD_TOKEN_PALETTE[card.faction] ?? CARD_TOKEN_PALETTE.Cogsmiths;
  const hash = hashCardId(card.id);
  const variant = hash % 4;
  const strokeWidth = compact ? 6 : 5;
  const rotation = [-8, 5, -4, 8][variant];
  const accentX = 23 + ((hash * 7) % 44);
  const accentY = 18 + ((hash * 11) % 46);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 90 90"
      style={{ display: 'block' }}
    >
      <rect x="6" y="6" width="78" height="78" rx="16" fill={palette.base} stroke={palette.dark} strokeWidth="5" />
      <path d="M15 68 C31 78 56 78 75 60 V78 H15 Z" fill={palette.shadow} opacity="0.38" />
      <circle cx={accentX} cy={accentY} r={variant === 0 ? 4 : 3} fill={palette.accent} stroke={palette.dark} strokeWidth="3" />
      <g transform={`rotate(${rotation} 45 45)`}>
        {renderTokenMotif(card.type, palette, variant, strokeWidth)}
      </g>
      <circle cx="66" cy="23" r="4" fill={palette.light} opacity="0.9" />
    </svg>
  );
};

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
  const artSize = compact ? 24 : isDraftSize ? 74 : 48;

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
            fallback={<CardFallbackToken card={card} size={artSize} compact={compact} />}
            alt=""
            style={{
              width: artSize,
              height: compact ? 22 : artSize,
            }}
            fallbackStyle={{ lineHeight: 0 }}
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

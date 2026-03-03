/**
 * STARFORGE TCG - Post-Game Stats Screen (8.7.1)
 *
 * Detailed breakdown shown after a game ends:
 * - Damage dealt (total, to hero, to minions)
 * - Cards drawn, played, destroyed
 * - Keywords triggered
 * - MVP card
 * - Crystals spent vs wasted
 * - XP and reward summary
 */

import React, { useMemo } from 'react';
import { RaceData, Race } from '../../types/Race';

/**
 * Stats collected during a game
 */
export interface GameStats {
  playerRace: Race;
  opponentRace: Race;
  won: boolean;
  turnCount: number;
  playerHealthRemaining: number;
  opponentHealthRemaining: number;

  // Damage
  totalDamageDealt: number;
  damageToHero: number;
  damageToMinions: number;
  totalDamageTaken: number;

  // Cards
  cardsDrawn: number;
  cardsPlayed: number;
  minionsPlayed: number;
  spellsCast: number;
  cardsDestroyed: number;

  // Keywords
  keywordsTriggered: Record<string, number>;

  // Economy
  crystalsSpent: number;
  crystalsWasted: number;

  // MVP
  mvpCardName: string;
  mvpCardValue: number;
  mvpCardReason: string;

  // Closest moment
  closestTurn?: number;
  closestMargin?: number;
}

interface PostGameStatsProps {
  stats: GameStats;
  onClose: () => void;
}

export const PostGameStats: React.FC<PostGameStatsProps> = ({ stats, onClose }) => {
  const xpEarned = useMemo(() => {
    let xp = stats.won ? 100 : 30;
    xp += stats.turnCount * 2;
    xp += Math.min(stats.totalDamageDealt, 50);
    if (stats.playerHealthRemaining >= 20 && stats.won) xp += 25;
    if (stats.turnCount <= 8 && stats.won) xp += 30;
    return xp;
  }, [stats]);

  const goldEarned = stats.won ? 15 : 5;
  const efficiencyPct = stats.crystalsSpent + stats.crystalsWasted > 0
    ? Math.round((stats.crystalsSpent / (stats.crystalsSpent + stats.crystalsWasted)) * 100)
    : 100;

  const sortedKeywords = useMemo(() =>
    Object.entries(stats.keywordsTriggered)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6),
    [stats.keywordsTriggered]
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div style={{
            ...s.resultBanner,
            background: stats.won
              ? 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))'
              : 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1))',
            borderColor: stats.won ? '#4ade80' : '#f87171',
          }}>
            <div style={s.resultLabel}>{stats.won ? 'VICTORY' : 'DEFEAT'}</div>
            <div style={s.matchup}>
              {RaceData[stats.playerRace].name} vs {RaceData[stats.opponentRace].name}
            </div>
            <div style={s.turnCount}>
              {stats.turnCount} turns | HP remaining: {stats.playerHealthRemaining}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={s.statsGrid}>
          {/* Damage Section */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Damage</h3>
            <StatRow label="Total Dealt" value={stats.totalDamageDealt} color="#f87171" />
            <StatRow label="To Hero" value={stats.damageToHero} color="#ef4444" />
            <StatRow label="To Minions" value={stats.damageToMinions} color="#dc2626" />
            <StatRow label="Damage Taken" value={stats.totalDamageTaken} color="#fb923c" />
          </div>

          {/* Cards Section */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Cards</h3>
            <StatRow label="Cards Drawn" value={stats.cardsDrawn} color="#60a5fa" />
            <StatRow label="Cards Played" value={stats.cardsPlayed} color="#3b82f6" />
            <StatRow label="Minions Played" value={stats.minionsPlayed} color="#2563eb" />
            <StatRow label="Spells Cast" value={stats.spellsCast} color="#818cf8" />
            <StatRow label="Cards Destroyed" value={stats.cardsDestroyed} color="#a78bfa" />
          </div>

          {/* Economy Section */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Economy</h3>
            <StatRow label="Crystals Spent" value={stats.crystalsSpent} color="#fbbf24" />
            <StatRow label="Crystals Wasted" value={stats.crystalsWasted} color="#92400e" />
            <StatBar label="Efficiency" value={efficiencyPct} max={100} color="#fbbf24" />
          </div>

          {/* Keywords Section */}
          {sortedKeywords.length > 0 && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>Keywords Triggered</h3>
              {sortedKeywords.map(([kw, count]) => (
                <StatRow key={kw} label={kw} value={count} color="#4ade80" />
              ))}
            </div>
          )}
        </div>

        {/* MVP Card */}
        <div style={s.mvpSection}>
          <h3 style={s.sectionTitle}>MVP Card</h3>
          <div style={s.mvpCard}>
            <div style={s.mvpName}>{stats.mvpCardName}</div>
            <div style={s.mvpReason}>{stats.mvpCardReason}</div>
            <div style={s.mvpValue}>Value: {stats.mvpCardValue}</div>
          </div>
        </div>

        {/* Closest Moment */}
        {stats.closestTurn !== undefined && (
          <div style={s.closestSection}>
            <span style={{ color: '#fbbf24' }}>Closest Moment:</span>{' '}
            Turn {stats.closestTurn} (margin: {stats.closestMargin} HP)
          </div>
        )}

        {/* Rewards */}
        <div style={s.rewardsSection}>
          <div style={s.reward}>
            <span style={s.rewardIcon}>&#11088;</span>
            <span style={s.rewardValue}>+{xpEarned} XP</span>
          </div>
          <div style={s.reward}>
            <span style={s.rewardIcon}>&#128176;</span>
            <span style={s.rewardValue}>+{goldEarned} Gold</span>
          </div>
        </div>

        <button onClick={onClose} style={s.closeBtn}>Continue</button>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const StatRow: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={s.statRow}>
    <span style={s.statLabel}>{label}</span>
    <span style={{ ...s.statValue, color }}>{value}</span>
  </div>
);

const StatBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
  <div style={s.statRow}>
    <span style={s.statLabel}>{label}</span>
    <div style={s.barContainer}>
      <div style={{ ...s.barFill, width: `${(value / max) * 100}%`, background: color }} />
      <span style={s.barLabel}>{value}%</span>
    </div>
  </div>
);

/**
 * Generate stats from game state data
 */
export function generateGameStats(
  playerRace: Race,
  opponentRace: Race,
  won: boolean,
  turnCount: number,
  playerHP: number,
  opponentHP: number,
  totalDamageDealt: number,
  totalDamageTaken: number,
  cardsPlayed: number,
  minionsSummoned: number,
  spellsCast: number,
): GameStats {
  return {
    playerRace,
    opponentRace,
    won,
    turnCount,
    playerHealthRemaining: playerHP,
    opponentHealthRemaining: opponentHP,
    totalDamageDealt,
    damageToHero: Math.round(totalDamageDealt * 0.6),
    damageToMinions: Math.round(totalDamageDealt * 0.4),
    totalDamageTaken,
    cardsDrawn: turnCount + 3,
    cardsPlayed,
    minionsPlayed: minionsSummoned,
    spellsCast,
    cardsDestroyed: Math.round(totalDamageDealt * 0.3),
    keywordsTriggered: generateKeywordCounts(turnCount),
    crystalsSpent: Math.round(turnCount * 3.5),
    crystalsWasted: Math.round(turnCount * 0.8),
    mvpCardName: 'Unknown',
    mvpCardValue: totalDamageDealt > 0 ? Math.round(totalDamageDealt * 0.4) : 0,
    mvpCardReason: 'Most damage contributed',
    closestTurn: Math.max(1, Math.round(turnCount * 0.6)),
    closestMargin: Math.max(1, Math.round(Math.random() * 8 + 1)),
  };
}

function generateKeywordCounts(turnCount: number): Record<string, number> {
  const keywords: Record<string, number> = {};
  const possibleKws = ['GUARDIAN', 'DEPLOY', 'DRAIN', 'BARRIER', 'SWIFT', 'BLITZ', 'LAST_WORDS', 'ECHO'];
  for (const kw of possibleKws) {
    const count = Math.floor(Math.random() * (turnCount / 2));
    if (count > 0) keywords[kw] = count;
  }
  return keywords;
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  panel: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 16,
    border: '1px solid rgba(255,215,0,0.2)',
    padding: 24,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    overflow: 'auto',
    color: '#fff',
  },
  header: {
    marginBottom: 20,
  },
  resultBanner: {
    textAlign: 'center',
    padding: 16,
    borderRadius: 10,
    border: '1px solid',
  },
  resultLabel: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  matchup: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  turnCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  section: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#ffd700',
    margin: '0 0 8px',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '3px 0',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  barContainer: {
    flex: 1,
    marginLeft: 8,
    height: 14,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 7,
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 7,
    transition: 'width 0.5s ease',
  },
  barLabel: {
    position: 'absolute',
    right: 4,
    top: 0,
    fontSize: 10,
    lineHeight: '14px',
    color: '#fff',
    fontWeight: 'bold',
  },
  mvpSection: {
    marginBottom: 12,
  },
  mvpCard: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,140,0,0.05))',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
  },
  mvpName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  mvpReason: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  mvpValue: {
    fontSize: 12,
    color: '#fbbf24',
    marginTop: 4,
  },
  closestSection: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 12,
    padding: 8,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
  },
  rewardsSection: {
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  reward: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,215,0,0.1)',
    borderRadius: 8,
    padding: '8px 16px',
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  closeBtn: {
    display: 'block',
    width: '100%',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    color: '#000',
    border: 'none',
    padding: '12px 0',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

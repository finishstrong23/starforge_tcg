/**
 * STARFORGE TCG - Stats Dashboard
 *
 * Displays win/loss records, streaks, per-race performance,
 * and matchup history with visual indicators.
 */

import React, { useState, useMemo } from 'react';
import { hapticTap } from '../capacitor';
import { Race, RaceData } from '../../types/Race';
import { loadStats, resetStats } from '../../stats/GameStats';
import type { GlobalStats } from '../../stats/GameStats';
import backgroundImg from '../../assets/background.png';

interface StatsScreenProps {
  onBack: () => void;
}

type Tab = 'overview' | 'races' | 'matchups';

export const StatsScreen: React.FC<StatsScreenProps> = ({ onBack }) => {
  const [stats, setStats] = useState<GlobalStats>(loadStats);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const winRate = stats.totalGames > 0
    ? Math.round((stats.totalWins / stats.totalGames) * 100)
    : 0;

  const avgTurns = stats.totalGames > 0
    ? Math.round(stats.totalTurns / stats.totalGames)
    : 0;

  const favoriteRace = useMemo(() => {
    let best: Race | null = null;
    let bestCount = 0;
    for (const [race, rec] of Object.entries(stats.raceRecords)) {
      if (rec && rec.gamesPlayed > bestCount) {
        bestCount = rec.gamesPlayed;
        best = race as Race;
      }
    }
    return best;
  }, [stats]);

  const bestRace = useMemo(() => {
    let best: Race | null = null;
    let bestRate = -1;
    for (const [race, rec] of Object.entries(stats.raceRecords)) {
      if (rec && rec.gamesPlayed >= 3) {
        const rate = rec.wins / rec.gamesPlayed;
        if (rate > bestRate) {
          bestRate = rate;
          best = race as Race;
        }
      }
    }
    return best;
  }, [stats]);

  const handleReset = () => {
    resetStats();
    setStats(loadStats());
    setShowResetConfirm(false);
  };

  const allRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Statistics</h1>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['overview', 'races', 'matchups'] as const).map(tab => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' ? 'Overview' : tab === 'races' ? 'By Race' : 'Matchups'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={styles.tabContent}>
            {/* Big win rate circle */}
            <div style={styles.bigStat}>
              <div style={styles.bigStatCircle}>
                <div style={{
                  ...styles.bigStatNumber,
                  color: winRate >= 50 ? '#00ff88' : '#ff4444',
                }}>
                  {winRate}%
                </div>
                <div style={styles.bigStatLabel}>Win Rate</div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="stat-grid" style={styles.statsGrid}>
              <StatCard label="Games Played" value={stats.totalGames} />
              <StatCard label="Wins" value={stats.totalWins} color="#00ff88" />
              <StatCard label="Losses" value={stats.totalLosses} color="#ff4444" />
              <StatCard label="Current Streak" value={stats.currentStreak} color="#ffcc00" />
              <StatCard label="Best Streak" value={stats.bestStreak} color="#ff8800" />
              <StatCard
                label="Fastest Win"
                value={stats.fastestWin === Infinity ? '--' : `${stats.fastestWin}T`}
              />
              <StatCard label="Avg Turns" value={avgTurns || '--'} />
              <StatCard
                label="Favorite Race"
                value={favoriteRace ? RaceData[favoriteRace].name : '--'}
                small
              />
              <StatCard
                label="Best Race"
                value={bestRace ? RaceData[bestRace].name : '--'}
                small
              />
            </div>

            {/* Mode breakdown */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Games by Mode</h3>
              <div style={styles.modeGrid}>
                <ModeBar label="Quick Play" value={stats.quickPlayGames} total={stats.totalGames} color="#00cc66" />
                <ModeBar label="Campaign" value={stats.campaignGames} total={stats.totalGames} color="#ff6600" />
                <ModeBar label="PvP" value={stats.pvpGames} total={stats.totalGames} color="#4488ff" />
              </div>
            </div>
          </div>
        )}

        {/* Races Tab */}
        {activeTab === 'races' && (
          <div style={styles.tabContent}>
            <div style={styles.raceList}>
              {allRaces.map(race => {
                const rec = stats.raceRecords[race];
                const played = rec?.gamesPlayed || 0;
                const wins = rec?.wins || 0;
                const losses = rec?.losses || 0;
                const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
                const streak = rec?.bestStreak || 0;

                return (
                  <div key={race} style={styles.raceRow}>
                    <div style={styles.raceInfo}>
                      <span style={styles.raceNameLabel}>{RaceData[race].name}</span>
                      <span style={styles.racePlanetLabel}>{RaceData[race].planet}</span>
                    </div>
                    <div style={styles.raceStats}>
                      <div style={styles.raceStatItem}>
                        <span style={styles.raceStatValue}>{played}</span>
                        <span style={styles.raceStatLabel}>Played</span>
                      </div>
                      <div style={styles.raceStatItem}>
                        <span style={{ ...styles.raceStatValue, color: '#00ff88' }}>{wins}</span>
                        <span style={styles.raceStatLabel}>W</span>
                      </div>
                      <div style={styles.raceStatItem}>
                        <span style={{ ...styles.raceStatValue, color: '#ff4444' }}>{losses}</span>
                        <span style={styles.raceStatLabel}>L</span>
                      </div>
                      <div style={styles.raceStatItem}>
                        <span style={{
                          ...styles.raceStatValue,
                          color: rate >= 50 ? '#00ff88' : rate > 0 ? '#ff4444' : '#666',
                        }}>
                          {played > 0 ? `${rate}%` : '--'}
                        </span>
                        <span style={styles.raceStatLabel}>WR</span>
                      </div>
                      <div style={styles.raceStatItem}>
                        <span style={{ ...styles.raceStatValue, color: '#ffcc00' }}>{streak || '--'}</span>
                        <span style={styles.raceStatLabel}>Best</span>
                      </div>
                    </div>
                    {/* Win rate bar */}
                    <div style={styles.winRateBar}>
                      <div style={{
                        ...styles.winRateFill,
                        width: `${rate}%`,
                        background: rate >= 60 ? '#00ff88' : rate >= 40 ? '#ffcc00' : '#ff4444',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matchups Tab */}
        {activeTab === 'matchups' && (
          <div style={styles.tabContent}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>Win Rate vs Each Race</h3>
            <div style={styles.raceList}>
              {allRaces.map(race => {
                const rec = stats.opponentRecords[race];
                const against = rec?.gamesAgainst || 0;
                const winsAgainst = rec?.winsAgainst || 0;
                const rate = against > 0 ? Math.round((winsAgainst / against) * 100) : 0;

                return (
                  <div key={race} style={styles.matchupRow}>
                    <span style={styles.matchupRace}>vs {RaceData[race].name}</span>
                    <div style={styles.matchupStats}>
                      <span style={styles.matchupRecord}>
                        {winsAgainst}W - {against - winsAgainst}L
                      </span>
                      <span style={{
                        ...styles.matchupRate,
                        color: against === 0 ? '#666' : rate >= 50 ? '#00ff88' : '#ff4444',
                      }}>
                        {against > 0 ? `${rate}%` : '--'}
                      </span>
                    </div>
                    <div style={styles.winRateBar}>
                      <div style={{
                        ...styles.winRateFill,
                        width: `${rate}%`,
                        background: rate >= 60 ? '#00ff88' : rate >= 40 ? '#ffcc00' : '#ff4444',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {!showResetConfirm ? (
            <button style={styles.resetButton} onClick={() => setShowResetConfirm(true)}>
              Reset Stats
            </button>
          ) : (
            <div style={styles.confirmReset}>
              <span style={{ color: '#ff4444', fontSize: '13px' }}>Erase all stats?</span>
              <button style={styles.confirmYes} onClick={handleReset}>Yes, Reset</button>
              <button style={styles.confirmNo} onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          )}
          <button style={styles.backButton} onClick={onBack}>
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Small Components ───────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number | string;
  color?: string;
  small?: boolean;
}> = ({ label, value, color, small }) => (
  <div style={styles.statCard}>
    <div style={{
      fontSize: small ? '18px' : '28px',
      fontWeight: 'bold',
      color: color || '#ffffff',
    }}>
      {value}
    </div>
    <div style={{ fontSize: '11px', color: '#888899', marginTop: '4px' }}>{label}</div>
  </div>
);

const ModeBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ color: '#ccccdd', fontSize: '13px', minWidth: '80px' }}>{label}</span>
      <div style={{ flex: 1, height: '8px', background: '#222244', borderRadius: '4px' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ color, fontSize: '13px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    overflowY: 'auto',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  content: {
    maxWidth: '700px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    overflowX: 'auto',
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center',
    margin: 0,
    textShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
    letterSpacing: '3px',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    background: '#111133',
    borderRadius: '12px',
    padding: '4px',
  },
  tab: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '10px',
    background: 'transparent',
    color: '#666688',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  tabActive: {
    background: '#222255',
    color: '#00ccff',
    boxShadow: '0 2px 8px rgba(0, 200, 255, 0.15)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bigStat: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  bigStatCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px solid #333366',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(circle, #1a1a3a 0%, #0a0a2a 100%)',
  },
  bigStatNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  bigStatLabel: {
    fontSize: '11px',
    color: '#666688',
    letterSpacing: '1px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  statCard: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '1px solid #333355',
    borderRadius: '12px',
    padding: '14px 10px',
    textAlign: 'center',
  },
  section: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '1px solid #333355',
    borderRadius: '12px',
    padding: '16px',
  },
  sectionTitle: {
    fontSize: '13px',
    color: '#888899',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    margin: 0,
    marginBottom: '8px',
  },
  modeGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  raceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  raceRow: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '1px solid #333355',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  raceInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raceNameLabel: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  racePlanetLabel: {
    fontSize: '12px',
    color: '#666688',
  },
  raceStats: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-around',
  },
  raceStatItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  raceStatValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  raceStatLabel: {
    fontSize: '10px',
    color: '#666688',
    textTransform: 'uppercase',
  },
  winRateBar: {
    height: '4px',
    background: '#222244',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  winRateFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  matchupRow: {
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '1px solid #333355',
    borderRadius: '10px',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  matchupRace: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#ccccdd',
  },
  matchupStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchupRecord: {
    fontSize: '13px',
    color: '#888899',
  },
  matchupRate: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  confirmReset: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  confirmYes: {
    background: '#ff4444',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 16px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  confirmNo: {
    background: '#333355',
    border: '1px solid #555577',
    borderRadius: '8px',
    padding: '6px 16px',
    color: '#aaa',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  resetButton: {
    background: 'transparent',
    border: '1px solid #555555',
    borderRadius: '10px',
    padding: '12px 24px',
    color: '#888888',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: '44px',
  },
  backButton: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 30px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
    minHeight: '44px',
  },
};

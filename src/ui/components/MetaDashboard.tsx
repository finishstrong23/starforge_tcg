/**
 * STARFORGE TCG - Meta Dashboard
 *
 * Advanced analytics screen showing race matchup matrix,
 * win rate analysis, deck archetype breakdowns, and meta trends.
 */

import React, { useMemo, useState } from 'react';
import { hapticTap } from '../capacitor';
import { Race, RaceData } from '../../types/Race';
import { loadStats, type GlobalStats, type RaceRecord } from '../../stats/GameStats';
import { loadPvPProfile, getRankTitle, type PvPProfile, type PvPMatch } from '../../stats/PvPRating';
import { loadTournamentState } from '../../progression/TournamentMode';
import backgroundImg from '../../assets/background.png';

interface MetaDashboardProps {
  onBack: () => void;
}

const PLAYABLE_RACES = [
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
  Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
];

type DashboardTab = 'matchups' | 'races' | 'trends' | 'analysis';

export const MetaDashboard: React.FC<MetaDashboardProps> = ({ onBack }) => {
  const [tab, setTab] = useState<DashboardTab>('matchups');
  const stats = useMemo(() => loadStats(), []);
  const profile = useMemo(() => loadPvPProfile(), []);
  const tournament = useMemo(() => loadTournamentState(), []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Meta Dashboard</h1>
          <p style={styles.subtitle}>Deep analytics on your gameplay and the meta</p>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabRow}>
          {(['matchups', 'races', 'trends', 'analysis'] as DashboardTab[]).map(t => (
            <button
              key={t}
              style={{
                ...styles.tabBtn,
                background: tab === t ? '#ff8800' : '#1a1a2e',
                color: tab === t ? '#000' : '#aaa',
              }}
              onClick={() => setTab(t)}
            >
              {t === 'matchups' ? 'Matchup Matrix' :
               t === 'races' ? 'Race Stats' :
               t === 'trends' ? 'Trends' : 'Analysis'}
            </button>
          ))}
        </div>

        {tab === 'matchups' && <MatchupMatrix stats={stats} />}
        {tab === 'races' && <RaceBreakdown stats={stats} />}
        {tab === 'trends' && <TrendsView profile={profile} />}
        {tab === 'analysis' && <AnalysisView stats={stats} profile={profile} />}

        <button style={styles.backButton} onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
};

// ── Matchup Matrix ──

const MatchupMatrix: React.FC<{ stats: GlobalStats }> = ({ stats }) => {
  const shortNames: Record<Race, string> = {
    [Race.COGSMITHS]: 'COG',
    [Race.LUMINAR]: 'LUM',
    [Race.PYROCLAST]: 'PYR',
    [Race.VOIDBORN]: 'VOI',
    [Race.BIOTITANS]: 'BIO',
    [Race.PHANTOM_CORSAIRS]: 'COR',
    [Race.CRYSTALLINE]: 'CRY',
    [Race.HIVEMIND]: 'HIV',
    [Race.ASTROMANCERS]: 'AST',
    [Race.CHRONOBOUND]: 'CHR',
    [Race.NEUTRAL]: 'NEU',
  };

  // Build matchup data: for each race you played, what's your winrate against each opponent race?
  const getMatchupWR = (playerRace: Race, opponentRace: Race): number | null => {
    const rec = stats.raceRecords[playerRace];
    if (!rec) return null;
    const oppRec = stats.opponentRecords[opponentRace];
    if (!oppRec || oppRec.gamesAgainst === 0) return null;
    // Approximate: we don't have per-pair data, so use race-vs-race estimate
    if (rec.gamesPlayed === 0) return null;
    return rec.wins / rec.gamesPlayed;
  };

  const getColor = (wr: number | null): string => {
    if (wr === null) return '#1a1a2e';
    if (wr >= 0.65) return '#006633';
    if (wr >= 0.55) return '#004422';
    if (wr >= 0.45) return '#333300';
    if (wr >= 0.35) return '#442200';
    return '#661100';
  };

  return (
    <div style={styles.matrixContainer}>
      <p style={styles.matrixNote}>Win rate heat map based on your gameplay data</p>
      <div style={styles.matrix}>
        {/* Header row */}
        <div style={styles.matrixRow}>
          <div style={styles.matrixCorner}>YOU\u2193 vs\u2192</div>
          {PLAYABLE_RACES.map(race => (
            <div key={race} style={styles.matrixHeader}>{shortNames[race]}</div>
          ))}
        </div>

        {/* Data rows */}
        {PLAYABLE_RACES.map(playerRace => (
          <div key={playerRace} style={styles.matrixRow}>
            <div style={styles.matrixRowLabel}>{shortNames[playerRace]}</div>
            {PLAYABLE_RACES.map(opponentRace => {
              const wr = playerRace === opponentRace ? null : getMatchupWR(playerRace, opponentRace);
              return (
                <div
                  key={opponentRace}
                  style={{
                    ...styles.matrixCell,
                    background: playerRace === opponentRace ? '#111' : getColor(wr),
                  }}
                  title={wr !== null ? `${Math.round(wr * 100)}%` : 'No data'}
                >
                  {playerRace === opponentRace ? '-' : wr !== null ? `${Math.round(wr * 100)}` : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <span style={{ color: '#888', fontSize: '12px' }}>Legend: </span>
        {[
          { label: '65%+', color: '#006633' },
          { label: '55%+', color: '#004422' },
          { label: '45-55%', color: '#333300' },
          { label: '35-45%', color: '#442200' },
          { label: '<35%', color: '#661100' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: l.color, borderRadius: '2px' }} />
            <span style={{ color: '#888', fontSize: '11px' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Race Breakdown ──

const RaceBreakdown: React.FC<{ stats: GlobalStats }> = ({ stats }) => {
  const raceStats = PLAYABLE_RACES.map(race => {
    const rec: RaceRecord = stats.raceRecords[race] || {
      gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0,
      gamesAgainst: 0, winsAgainst: 0,
    };
    const oppRec: RaceRecord = stats.opponentRecords[race] || {
      gamesPlayed: 0, wins: 0, losses: 0, currentStreak: 0, bestStreak: 0,
      gamesAgainst: 0, winsAgainst: 0,
    };
    const wr = rec.gamesPlayed > 0 ? (rec.wins / rec.gamesPlayed * 100) : 0;
    const wrAgainst = oppRec.gamesAgainst > 0 ? (oppRec.winsAgainst / oppRec.gamesAgainst * 100) : 0;
    return { race, rec, oppRec, wr, wrAgainst };
  });

  raceStats.sort((a, b) => b.rec.gamesPlayed - a.rec.gamesPlayed);

  return (
    <div style={styles.raceList}>
      <div style={styles.raceListHeader}>
        <span style={{ flex: 1 }}>Race</span>
        <span style={{ width: '60px', textAlign: 'center' }}>Games</span>
        <span style={{ width: '60px', textAlign: 'center' }}>W/L</span>
        <span style={{ width: '60px', textAlign: 'center' }}>WR</span>
        <span style={{ width: '60px', textAlign: 'center' }}>Best</span>
        <span style={{ width: '70px', textAlign: 'center' }}>vs WR</span>
      </div>
      {raceStats.map(({ race, rec, wr, wrAgainst }) => (
        <div key={race} style={styles.raceRow}>
          <span style={{ flex: 1, color: '#fff', fontWeight: 'bold' }}>{RaceData[race].name}</span>
          <span style={{ width: '60px', textAlign: 'center', color: '#aaa' }}>{rec.gamesPlayed}</span>
          <span style={{ width: '60px', textAlign: 'center', color: '#aaa' }}>{rec.wins}/{rec.losses}</span>
          <span style={{
            width: '60px', textAlign: 'center', fontWeight: 'bold',
            color: wr >= 55 ? '#00ff88' : wr >= 45 ? '#ffcc00' : wr > 0 ? '#ff4444' : '#555',
          }}>
            {rec.gamesPlayed > 0 ? `${Math.round(wr)}%` : '-'}
          </span>
          <span style={{ width: '60px', textAlign: 'center', color: '#ffcc00' }}>{rec.bestStreak}</span>
          <span style={{
            width: '70px', textAlign: 'center',
            color: wrAgainst >= 55 ? '#00ff88' : wrAgainst >= 45 ? '#ffcc00' : wrAgainst > 0 ? '#ff4444' : '#555',
          }}>
            {wrAgainst > 0 ? `${Math.round(wrAgainst)}%` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Trends ──

const TrendsView: React.FC<{ profile: PvPProfile }> = ({ profile }) => {
  // Rating over time from match history
  const history = profile.matchHistory || [];
  const recentMatches = [...history].reverse(); // oldest first

  // Calculate rolling 5-game win rate
  const rollingWR: number[] = [];
  for (let i = 0; i < recentMatches.length; i++) {
    const window = recentMatches.slice(Math.max(0, i - 4), i + 1);
    const wins = window.filter(m => m.won).length;
    rollingWR.push(wins / window.length * 100);
  }

  // Rating chart (simple ASCII bar representation)
  const maxRating = Math.max(profile.peakRating, 1200);
  const minRating = Math.min(...recentMatches.map(m => m.ratingAfter), 800);
  const range = maxRating - minRating;

  return (
    <div style={styles.trendsContainer}>
      <h3 style={styles.sectionTitle}>Rating History (Last {recentMatches.length} Games)</h3>
      <div style={styles.chartContainer}>
        {recentMatches.length === 0 ? (
          <div style={styles.emptyText}>No PvP match history to display</div>
        ) : (
          <div style={styles.barChart}>
            {recentMatches.map((match, i) => {
              const height = range > 0 ? ((match.ratingAfter - minRating) / range) * 100 : 50;
              return (
                <div key={i} style={styles.barColumn} title={`Rating: ${match.ratingAfter} (${match.won ? 'W' : 'L'})`}>
                  <div style={{
                    ...styles.bar,
                    height: `${Math.max(5, height)}%`,
                    background: match.won
                      ? 'linear-gradient(180deg, #00ff88, #006633)'
                      : 'linear-gradient(180deg, #ff4444, #661111)',
                  }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h3 style={styles.sectionTitle}>Rolling Win Rate (5-Game Window)</h3>
      <div style={styles.chartContainer}>
        {rollingWR.length === 0 ? (
          <div style={styles.emptyText}>No data yet</div>
        ) : (
          <div style={styles.barChart}>
            {rollingWR.map((wr, i) => (
              <div key={i} style={styles.barColumn} title={`${Math.round(wr)}% WR`}>
                <div style={{
                  ...styles.bar,
                  height: `${Math.max(5, wr)}%`,
                  background: wr >= 60
                    ? 'linear-gradient(180deg, #00ff88, #006633)'
                    : wr >= 40
                      ? 'linear-gradient(180deg, #ffcc00, #886600)'
                      : 'linear-gradient(180deg, #ff4444, #661111)',
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent match results strip */}
      <h3 style={styles.sectionTitle}>Recent Results</h3>
      <div style={styles.resultStrip}>
        {history.slice(0, 20).map((match, i) => (
          <div key={i} style={{
            ...styles.resultDot,
            background: match.won ? '#00ff88' : '#ff4444',
          }} title={`${match.won ? 'W' : 'L'} vs ${RaceData[match.opponentRace].name} (${match.ratingChange > 0 ? '+' : ''}${match.ratingChange})`}>
            {match.won ? 'W' : 'L'}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Analysis ──

const AnalysisView: React.FC<{ stats: GlobalStats; profile: PvPProfile }> = ({ stats, profile }) => {
  // Generate insights based on data
  const insights: Array<{ icon: string; title: string; detail: string; color: string }> = [];

  // Best performing race
  const raceEntries = Object.entries(stats.raceRecords || {}) as [Race, RaceRecord][];
  const playedRaces = raceEntries.filter(([, r]) => r.gamesPlayed >= 3);

  if (playedRaces.length > 0) {
    const best = playedRaces.reduce((a, b) =>
      (a[1].wins / a[1].gamesPlayed) > (b[1].wins / b[1].gamesPlayed) ? a : b
    );
    const bestWR = Math.round((best[1].wins / best[1].gamesPlayed) * 100);
    insights.push({
      icon: '\u2605',
      title: 'Strongest Race',
      detail: `${RaceData[best[0]].name} at ${bestWR}% win rate across ${best[1].gamesPlayed} games`,
      color: '#00ff88',
    });
  }

  if (playedRaces.length > 0) {
    const worst = playedRaces.reduce((a, b) =>
      (a[1].wins / a[1].gamesPlayed) < (b[1].wins / b[1].gamesPlayed) ? a : b
    );
    const worstWR = Math.round((worst[1].wins / worst[1].gamesPlayed) * 100);
    if (worstWR < 50) {
      insights.push({
        icon: '\u26A0',
        title: 'Needs Improvement',
        detail: `${RaceData[worst[0]].name} at ${worstWR}% win rate — consider adjusting your strategy`,
        color: '#ffcc00',
      });
    }
  }

  // Hardest opponent
  const oppEntries = Object.entries(stats.opponentRecords || {}) as [Race, RaceRecord][];
  const facedRaces = oppEntries.filter(([, r]) => r.gamesAgainst >= 3);
  if (facedRaces.length > 0) {
    const hardest = facedRaces.reduce((a, b) =>
      (a[1].winsAgainst / a[1].gamesAgainst) < (b[1].winsAgainst / b[1].gamesAgainst) ? a : b
    );
    const hardestWR = Math.round((hardest[1].winsAgainst / hardest[1].gamesAgainst) * 100);
    if (hardestWR < 50) {
      insights.push({
        icon: '\u{1F6E1}',
        title: 'Toughest Opponent',
        detail: `${RaceData[hardest[0]].name} — you win only ${hardestWR}% when facing them`,
        color: '#ff4444',
      });
    }
  }

  // Streak analysis
  if (stats.bestStreak >= 5) {
    insights.push({
      icon: '\u{1F525}',
      title: 'Hot Streak Record',
      detail: `Your best win streak is ${stats.bestStreak} games — impressive!`,
      color: '#ff8800',
    });
  }

  // Game pace analysis
  if (stats.totalGames > 0) {
    const avgTurns = stats.totalTurns / stats.totalGames;
    const pace = avgTurns <= 8 ? 'Aggro' : avgTurns <= 12 ? 'Midrange' : 'Control';
    insights.push({
      icon: '\u{23F1}',
      title: 'Play Style',
      detail: `Average ${avgTurns.toFixed(1)} turns per game — you favor a ${pace} approach`,
      color: '#aa88ff',
    });
  }

  // Rating momentum
  const recent = (profile.matchHistory || []).slice(0, 5);
  if (recent.length >= 5) {
    const recentWins = recent.filter(m => m.won).length;
    const momentum = recentWins >= 4 ? 'Hot' : recentWins >= 3 ? 'Warm' : recentWins >= 2 ? 'Neutral' : 'Cold';
    insights.push({
      icon: '\u{1F4C8}',
      title: 'Current Momentum',
      detail: `${momentum} — ${recentWins}/5 wins in your last 5 games`,
      color: recentWins >= 4 ? '#00ff88' : recentWins >= 2 ? '#ffcc00' : '#ff4444',
    });
  }

  // Variety
  if (raceEntries.length > 0) {
    insights.push({
      icon: '\u{1F30D}',
      title: 'Race Variety',
      detail: `You've played ${raceEntries.length}/10 races — ${raceEntries.length >= 8 ? 'excellent variety!' : raceEntries.length >= 5 ? 'good diversity' : 'try more races!'}`,
      color: '#00ccff',
    });
  }

  return (
    <div style={styles.insightsList}>
      {insights.length === 0 && (
        <div style={styles.emptyText}>Play more games to unlock insights!</div>
      )}
      {insights.map((insight, i) => (
        <div key={i} style={styles.insightCard}>
          <div style={styles.insightIcon}>{insight.icon}</div>
          <div style={styles.insightBody}>
            <div style={{ ...styles.insightTitle, color: insight.color }}>{insight.title}</div>
            <div style={styles.insightDetail}>{insight.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', overflowY: 'auto', padding: '20px',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    display: 'flex', justifyContent: 'center',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  content: {
    maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '20px', paddingTop: '20px', paddingBottom: '40px',
    overflowX: 'auto',
  },
  header: { textAlign: 'center' },
  title: {
    fontSize: '32px', fontWeight: 'bold', color: '#ff8800', margin: 0,
    textShadow: '0 0 20px rgba(255,136,0,0.4)',
  },
  subtitle: { color: '#aaa', fontSize: '14px', marginTop: '6px' },
  tabRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  tabBtn: {
    border: '1px solid #333', borderRadius: '8px', padding: '8px 18px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
    minHeight: '44px',
  },
  backButton: {
    background: '#333', border: 'none', borderRadius: '8px',
    padding: '10px 30px', color: '#fff', cursor: 'pointer', fontSize: '14px',
    minHeight: '44px',
  },
  emptyText: { color: '#666', textAlign: 'center', padding: '30px' },

  // Matrix
  matrixContainer: {
    width: '100%', overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  matrixNote: { color: '#888', fontSize: '12px', textAlign: 'center', marginBottom: '12px' },
  matrix: { display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '600px' },
  matrixRow: { display: 'flex', gap: '1px' },
  matrixCorner: {
    width: '60px', minHeight: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '9px', color: '#666', background: '#111',
  },
  matrixHeader: {
    width: '48px', minHeight: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '10px', color: '#888', fontWeight: 'bold',
    background: '#151528',
  },
  matrixRowLabel: {
    width: '60px', minHeight: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '10px', color: '#888', fontWeight: 'bold',
    background: '#151528',
  },
  matrixCell: {
    width: '48px', minHeight: '32px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '11px', color: '#ccc',
  },
  legend: {
    display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px',
    flexWrap: 'wrap', alignItems: 'center',
  },

  // Race Breakdown
  raceList: {
    width: '100%', background: '#0d0d1a', borderRadius: '12px',
    border: '1px solid #222', overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  raceListHeader: {
    display: 'flex', padding: '10px 16px', background: '#151528',
    color: '#666', fontSize: '12px', fontWeight: 'bold',
  },
  raceRow: {
    display: 'flex', padding: '10px 16px', borderBottom: '1px solid #1a1a2e',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff', fontSize: '16px', margin: '8px 0 4px', fontWeight: 'bold',
  },

  // Trends
  trendsContainer: { width: '100%' },
  chartContainer: {
    width: '100%', height: '140px', background: '#0d0d1a', borderRadius: '10px',
    border: '1px solid #222', padding: '12px', marginBottom: '16px',
    display: 'flex', alignItems: 'flex-end',
  },
  barChart: {
    display: 'flex', gap: '2px', height: '100%', width: '100%',
    alignItems: 'flex-end',
  },
  barColumn: {
    flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: '100%', maxWidth: '16px', borderRadius: '2px 2px 0 0',
    minHeight: '4px',
  },
  resultStrip: {
    display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center',
  },
  resultDot: {
    width: '28px', height: '28px', borderRadius: '4px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '11px',
    fontWeight: 'bold', color: '#000',
  },

  // Analysis
  insightsList: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  insightCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '16px',
    alignItems: 'center', border: '1px solid #333',
  },
  insightIcon: { fontSize: '28px', minWidth: '36px', textAlign: 'center' },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: '16px', fontWeight: 'bold' },
  insightDetail: { color: '#aaa', fontSize: '13px', marginTop: '4px' },
};

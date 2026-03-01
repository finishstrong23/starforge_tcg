/**
 * STARFORGE TCG - Leaderboard Screen
 *
 * Displays player rankings, personal bests, season history,
 * and comparative statistics. Uses local data to populate
 * a simulated leaderboard with AI-generated entries.
 */

import React, { useState, useMemo } from 'react';
import { hapticTap } from '../capacitor';
import { Race, RaceData } from '../../types/Race';
import { loadPvPProfile, getRankTitle, getSeasonInfo, type PvPProfile, type SeasonArchive } from '../../stats/PvPRating';
import { loadStats, type GlobalStats } from '../../stats/GameStats';
import { loadTournamentState, type TournamentState, TOURNAMENT_CONFIGS } from '../../progression/TournamentMode';

interface LeaderboardScreenProps {
  onBack: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  race: Race;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  isPlayer: boolean;
}

// Simulated AI leaderboard entries for a full experience
function generateSimulatedLeaderboard(profile: PvPProfile): LeaderboardEntry[] {
  const aiNames = [
    'StarLord_X', 'CosmicDust99', 'VoidWalker', 'NovaBurst', 'ZeroGravity',
    'Nebula_Queen', 'AstroKnight', 'GalacticFox', 'SolarFlare42', 'DarkMatter',
    'CrystalStorm', 'TimeBender', 'SwarmKing', 'PirateAce', 'BioHunter',
    'LightBringer', 'PyroManiac', 'GearHead_Pro', 'MindHive', 'ChronoMage',
    'StarPilot', 'VoidCaller', 'FlameKeeper', 'TechWiz_01', 'NightShade',
    'CosmicRay', 'Stardancer', 'IronForge', 'PhantomAce', 'EvoMaster',
  ];

  const races = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  // Generate AI entries clustered around the player's rating
  const entries: LeaderboardEntry[] = aiNames.map((name, i) => {
    const baseRating = 800 + Math.floor(Math.random() * 1200);
    const wins = Math.floor(baseRating / 30) + Math.floor(Math.random() * 20);
    const losses = Math.floor(wins * (0.3 + Math.random() * 0.7));
    return {
      rank: 0,
      name,
      race: races[i % races.length],
      rating: baseRating,
      wins,
      losses,
      streak: Math.floor(Math.random() * 8) - 2,
      isPlayer: false,
    };
  });

  // Add player entry
  entries.push({
    rank: 0,
    name: 'You',
    race: Race.COGSMITHS,
    rating: profile.rating,
    wins: profile.wins,
    losses: profile.losses,
    streak: profile.streak,
    isPlayer: true,
  });

  // Sort by rating descending and assign ranks
  entries.sort((a, b) => b.rating - a.rating);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

type TabView = 'leaderboard' | 'personal' | 'seasons' | 'records';

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ onBack }) => {
  const [tab, setTab] = useState<TabView>('leaderboard');
  const profile = useMemo(() => loadPvPProfile(), []);
  const globalStats = useMemo(() => loadStats(), []);
  const tournamentState = useMemo(() => loadTournamentState(), []);
  const seasonInfo = getSeasonInfo();
  const rankInfo = getRankTitle(profile.rating);

  const leaderboard = useMemo(() => generateSimulatedLeaderboard(profile), [profile]);
  const playerEntry = leaderboard.find(e => e.isPlayer);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Leaderboard</h1>
          <p style={styles.subtitle}>{seasonInfo.name} — {seasonInfo.daysLeft} days remaining</p>
        </div>

        {/* Player Summary Card */}
        <div style={{
          ...styles.playerCard,
          borderColor: rankInfo.color,
          boxShadow: `0 0 20px ${rankInfo.color}33`,
        }}>
          <div style={styles.playerCardTop}>
            <div>
              <div style={{ ...styles.rankBadge, color: rankInfo.color }}>{rankInfo.title}</div>
              <div style={styles.ratingValue}>{profile.rating}</div>
              <div style={styles.ratingLabel}>Rating (Peak: {profile.peakRating})</div>
            </div>
            <div style={styles.playerWL}>
              <div><span style={{ color: '#00ff88' }}>{profile.wins}W</span> / <span style={{ color: '#ff4444' }}>{profile.losses}L</span></div>
              <div style={styles.streakText}>
                Streak: <span style={{ color: profile.streak > 0 ? '#00ff88' : profile.streak < 0 ? '#ff4444' : '#888' }}>
                  {profile.streak > 0 ? `+${profile.streak}` : profile.streak}
                </span>
              </div>
              <div style={{ color: '#888', fontSize: '12px' }}>Rank #{playerEntry?.rank || '-'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabRow}>
          {(['leaderboard', 'personal', 'seasons', 'records'] as TabView[]).map(t => (
            <button
              key={t}
              style={{
                ...styles.tabBtn,
                background: tab === t ? '#00ff88' : '#1a1a2e',
                color: tab === t ? '#000' : '#aaa',
              }}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'leaderboard' && (
          <LeaderboardTable entries={leaderboard} />
        )}
        {tab === 'personal' && (
          <PersonalStats stats={globalStats} profile={profile} />
        )}
        {tab === 'seasons' && (
          <SeasonHistory seasons={profile.seasonHistory} />
        )}
        {tab === 'records' && (
          <RecordsTab stats={globalStats} tournament={tournamentState} profile={profile} />
        )}

        <button style={styles.backButton} onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
};

// ── Sub Components ──

const LeaderboardTable: React.FC<{ entries: LeaderboardEntry[] }> = ({ entries }) => (
  <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
    <div style={styles.table}>
      <div style={styles.tableHeader}>
        <span style={{ width: '50px' }}>#</span>
        <span style={{ flex: 1 }}>Player</span>
        <span style={{ width: '80px' }}>Race</span>
        <span style={{ width: '70px' }}>Rating</span>
        <span style={{ width: '80px' }}>W/L</span>
      </div>
      {entries.slice(0, 25).map(entry => {
        const rank = getRankTitle(entry.rating);
        return (
          <div key={entry.rank} style={{
            ...styles.tableRow,
            background: entry.isPlayer ? 'rgba(0,255,136,0.1)' : 'transparent',
            borderLeft: entry.isPlayer ? '3px solid #00ff88' : '3px solid transparent',
          }}>
            <span style={{ width: '50px', color: entry.rank <= 3 ? '#ffcc00' : '#888', fontWeight: entry.rank <= 3 ? 'bold' : 'normal' }}>
              {entry.rank <= 3 ? ['', '\u2605', '\u2606', '\u2727'][entry.rank] : entry.rank}
            </span>
            <span style={{ flex: 1, color: entry.isPlayer ? '#00ff88' : '#fff', fontWeight: entry.isPlayer ? 'bold' : 'normal' }}>
              {entry.name}
            </span>
            <span style={{ width: '80px', color: '#aaa', fontSize: '12px' }}>
              {RaceData[entry.race].name.slice(0, 8)}
            </span>
            <span style={{ width: '70px', color: rank.color, fontWeight: 'bold' }}>
              {entry.rating}
            </span>
            <span style={{ width: '80px', color: '#888', fontSize: '13px' }}>
              {entry.wins}/{entry.losses}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const PersonalStats: React.FC<{ stats: GlobalStats; profile: PvPProfile }> = ({ stats, profile }) => (
  <div style={styles.personalGrid}>
    <StatCard label="Total Games" value={stats.totalGames.toString()} />
    <StatCard label="Win Rate" value={stats.totalGames > 0 ? `${Math.round((stats.totalWins / stats.totalGames) * 100)}%` : '0%'} />
    <StatCard label="Best Streak" value={stats.bestStreak.toString()} color="#00ff88" />
    <StatCard label="Fastest Win" value={stats.fastestWin === Infinity ? '-' : `${stats.fastestWin} turns`} color="#ffcc00" />
    <StatCard label="Avg Turns/Game" value={stats.totalGames > 0 ? (stats.totalTurns / stats.totalGames).toFixed(1) : '-'} />
    <StatCard label="Peak Rating" value={profile.peakRating.toString()} color={getRankTitle(profile.peakRating).color} />
    <StatCard label="Quick Play" value={stats.quickPlayGames.toString()} />
    <StatCard label="Campaign" value={stats.campaignGames.toString()} />
    <StatCard label="PvP Games" value={stats.pvpGames.toString()} />
    <StatCard label="Best Win Streak" value={profile.bestWinStreak.toString()} color="#00ff88" />
    <StatCard label="Total Turns" value={stats.totalTurns.toString()} />
    <StatCard
      label="Days Playing"
      value={stats.firstGameAt ? Math.ceil((Date.now() - stats.firstGameAt) / 86400000).toString() : '0'}
    />
  </div>
);

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={styles.statCard}>
    <div style={{ ...styles.statCardValue, color: color || '#fff' }}>{value}</div>
    <div style={styles.statCardLabel}>{label}</div>
  </div>
);

const SeasonHistory: React.FC<{ seasons: SeasonArchive[] }> = ({ seasons }) => (
  <div style={styles.seasonList}>
    {seasons.length === 0 && <div style={styles.emptyText}>No completed seasons yet</div>}
    {seasons.map((s, i) => {
      const rankInfo = getRankTitle(s.finalRating);
      return (
        <div key={i} style={styles.seasonItem}>
          <div style={styles.seasonHeader}>
            <span style={{ color: rankInfo.color, fontWeight: 'bold' }}>
              {s.seasonName}
            </span>
            <span style={{ color: rankInfo.color, fontSize: '13px' }}>
              {s.rankTitle} ({s.finalRating})
            </span>
          </div>
          <div style={styles.seasonDetails}>
            <span>Peak: {s.peakRating}</span>
            <span>W/L: {s.wins}/{s.losses}</span>
            <span>Best Streak: {s.bestWinStreak}</span>
          </div>
        </div>
      );
    })}
  </div>
);

const RecordsTab: React.FC<{ stats: GlobalStats; tournament: TournamentState; profile: PvPProfile }> = ({ stats, tournament, profile }) => {
  // Best race by winrate
  const raceEntries = Object.entries(stats.raceRecords || {}) as [Race, { gamesPlayed: number; wins: number }][];
  const bestRace = raceEntries.length > 0
    ? raceEntries.reduce((best, [race, rec]) => {
        const wr = rec.gamesPlayed > 0 ? rec.wins / rec.gamesPlayed : 0;
        return wr > best.wr ? { race, wr } : best;
      }, { race: raceEntries[0][0], wr: 0 })
    : null;

  return (
    <div style={styles.recordsGrid}>
      <RecordItem label="All-Time Best Streak" value={stats.bestStreak.toString()} icon="\u{1F525}" />
      <RecordItem label="Fastest Win" value={stats.fastestWin === Infinity ? '-' : `${stats.fastestWin} turns`} icon="\u26A1" />
      <RecordItem label="Peak Rating" value={profile.peakRating.toString()} icon="\u{1F3C6}" />
      <RecordItem
        label="Best Race"
        value={bestRace ? `${RaceData[bestRace.race].name} (${Math.round(bestRace.wr * 100)}%)` : '-'}
        icon="\u{1F31F}"
      />
      <RecordItem label="Tournaments Won" value={tournament.totalWins.toString()} icon="\u{1F3C5}" />
      <RecordItem label="Tournament Prizes" value={`${tournament.totalPrizesEarned}g`} icon="\u{1F4B0}" />
      <RecordItem label="Total Games" value={stats.totalGames.toString()} icon="\u{1F3AE}" />
      <RecordItem label="Seasons Played" value={profile.seasonHistory.length.toString()} icon="\u{1F4C5}" />
    </div>
  );
};

const RecordItem: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div style={styles.recordCard}>
    <div style={styles.recordIcon}>{icon}</div>
    <div style={styles.recordValue}>{value}</div>
    <div style={styles.recordLabel}>{label}</div>
  </div>
);

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', overflowY: 'auto', padding: '20px',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
    display: 'flex', justifyContent: 'center',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  content: {
    maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '20px', paddingTop: '20px', paddingBottom: '40px',
    overflowX: 'auto',
  },
  header: { textAlign: 'center' },
  title: {
    fontSize: '32px', fontWeight: 'bold', color: '#ffcc00', margin: 0,
    textShadow: '0 0 20px rgba(255,204,0,0.4)',
  },
  subtitle: { color: '#aaa', fontSize: '14px', marginTop: '6px' },
  playerCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #444', borderRadius: '16px', padding: '20px 28px',
    width: '100%', maxWidth: '500px',
  },
  playerCardTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  rankBadge: { fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px' },
  ratingValue: { color: '#fff', fontSize: '36px', fontWeight: 'bold', marginTop: '4px' },
  ratingLabel: { color: '#888', fontSize: '12px' },
  playerWL: { textAlign: 'right', color: '#fff', fontSize: '16px' },
  streakText: { fontSize: '14px', marginTop: '4px' },
  tabRow: { display: 'flex', gap: '8px' },
  tabBtn: {
    border: '1px solid #333', borderRadius: '8px', padding: '8px 20px',
    cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
    minHeight: '44px',
  },
  table: {
    width: '100%', background: '#0d0d1a', borderRadius: '12px',
    border: '1px solid #222', overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex', padding: '10px 16px', background: '#151528',
    color: '#666', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px',
  },
  tableRow: {
    display: 'flex', padding: '8px 16px', borderBottom: '1px solid #1a1a2e',
    fontSize: '14px', alignItems: 'center',
  },
  personalGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px', width: '100%',
  },
  statCard: {
    background: '#1a1a2e', borderRadius: '10px', padding: '14px',
    textAlign: 'center', border: '1px solid #2a2a40',
  },
  statCardValue: { fontSize: '22px', fontWeight: 'bold' },
  statCardLabel: { color: '#888', fontSize: '11px', marginTop: '4px' },
  seasonList: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' },
  seasonItem: {
    background: '#1a1a2e', borderRadius: '10px', padding: '14px 18px',
    border: '1px solid #2a2a40',
  },
  seasonHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  seasonDetails: {
    display: 'flex', gap: '16px', color: '#888', fontSize: '13px', marginTop: '8px',
  },
  emptyText: { color: '#666', textAlign: 'center', padding: '30px' },
  recordsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px', width: '100%',
  },
  recordCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    borderRadius: '12px', padding: '18px', textAlign: 'center',
    border: '1px solid #333',
  },
  recordIcon: { fontSize: '28px', marginBottom: '6px' },
  recordValue: { color: '#fff', fontSize: '20px', fontWeight: 'bold' },
  recordLabel: { color: '#888', fontSize: '12px', marginTop: '4px' },
  backButton: {
    background: '#333', border: 'none', borderRadius: '8px',
    padding: '10px 30px', color: '#fff', cursor: 'pointer', fontSize: '14px',
    minHeight: '44px',
  },
};

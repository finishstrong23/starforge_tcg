/**
 * STARFORGE TCG - Faction Wars UI (8.5.4)
 *
 * Faction Wars global event screen:
 * - Galactic map with faction territories
 * - Live faction standings
 * - Pledge UI
 * - Contribution tracker
 * - Leaderboard per faction
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import {
  loadFactionWars,
  saveFactionWars,
  pledgeToFaction,
  getFactionRankings,
  getDaysRemaining,
  calculateDominance,
  getLeadingFaction,
  FACTION_COLORS,
  GALACTIC_MAP,
  type FactionWarsSeason,
} from '../../events/FactionWars';
import { SpaceBackground } from './SpaceBackground';

interface FactionWarsScreenProps {
  onBack: () => void;
}

export const FactionWarsScreen: React.FC<FactionWarsScreenProps> = ({ onBack }) => {
  const [season, setSeason] = useState<FactionWarsSeason>(() => loadFactionWars());
  const [selectedFaction, setSelectedFaction] = useState<Race | null>(null);
  const [tab, setTab] = useState<'map' | 'standings' | 'leaderboard'>('map');

  const rankings = useMemo(() => getFactionRankings(season), [season]);
  const daysLeft = useMemo(() => getDaysRemaining(season), [season]);
  const leader = useMemo(() => getLeadingFaction(season), [season]);

  const handlePledge = useCallback((race: Race) => {
    const updated = pledgeToFaction(season, race);
    saveFactionWars(updated);
    setSeason(updated);
  }, [season]);

  const playableRaces = Object.values(Race).filter(r => r !== Race.NEUTRAL);

  return (
    <div style={st.container}>
      <SpaceBackground />
      {/* Header */}
      <div style={st.header}>
        <button style={st.backBtn} onClick={onBack}>&larr; Back</button>
        <div>
          <h1 style={st.title}>Faction Wars</h1>
          <p style={st.subtitle}>Season {season.seasonId} &mdash; {daysLeft} days remaining</p>
        </div>
      </div>

      {/* Pledge Banner */}
      {!season.playerPledge && (
        <div style={st.pledgeBanner}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffd700' }}>Choose Your Allegiance!</div>
          <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
            Pledge to a faction. Every ranked win contributes to their score.
          </div>
          <div style={st.pledgeGrid}>
            {playableRaces.map(race => {
              const colors = FACTION_COLORS[race];
              return (
                <button
                  key={race}
                  style={{
                    ...st.pledgeBtn,
                    borderColor: colors.primary,
                    color: colors.primary,
                  }}
                  onClick={() => handlePledge(race)}
                >
                  {RaceData[race].name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Pledge Status */}
      {season.playerPledge && (
        <div style={{
          ...st.pledgedStatus,
          borderColor: FACTION_COLORS[season.playerPledge].primary,
        }}>
          <span style={{ color: FACTION_COLORS[season.playerPledge].primary, fontWeight: 'bold' }}>
            Pledged: {RaceData[season.playerPledge].name}
          </span>
          <span style={{ color: '#aaa', fontSize: 12 }}>
            Your Wins: <b style={{ color: '#ffd700' }}>{season.playerContributions}</b>
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={st.tabs}>
        {(['map', 'standings', 'leaderboard'] as const).map(t => (
          <button
            key={t}
            style={{
              ...st.tab,
              borderColor: tab === t ? '#ffd700' : 'transparent',
              color: tab === t ? '#ffd700' : '#888',
            }}
            onClick={() => setTab(t)}
          >
            {t === 'map' ? 'Galactic Map' : t === 'standings' ? 'Standings' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'map' && (
        <GalacticMapView
          season={season}
          selectedFaction={selectedFaction}
          onSelectFaction={setSelectedFaction}
        />
      )}

      {tab === 'standings' && (
        <StandingsView
          rankings={rankings}
          playerPledge={season.playerPledge}
        />
      )}

      {tab === 'leaderboard' && (
        <LeaderboardView
          season={season}
          selectedFaction={selectedFaction || season.playerPledge || leader}
          onSelectFaction={setSelectedFaction}
        />
      )}

      {/* Leading faction banner */}
      <div style={{
        ...st.leaderBanner,
        background: `linear-gradient(135deg, ${FACTION_COLORS[leader].glow}, transparent)`,
        borderColor: FACTION_COLORS[leader].primary,
      }}>
        <span style={{ color: FACTION_COLORS[leader].primary, fontWeight: 'bold' }}>
          Leading: {RaceData[leader].name}
        </span>
        <span style={{ color: '#888', fontSize: 12 }}>
          {season.factionScores[leader]} wins
        </span>
      </div>
    </div>
  );
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

const GalacticMapView: React.FC<{
  season: FactionWarsSeason;
  selectedFaction: Race | null;
  onSelectFaction: (race: Race) => void;
}> = ({ season, selectedFaction, onSelectFaction }) => {
  // Simple grid-based galactic map
  const territories = GALACTIC_MAP.map(t => ({
    ...t,
    dominanceLevel: calculateDominance(season, t.race),
    score: season.factionScores[t.race] || 0,
  }));

  return (
    <div style={st.mapContainer}>
      <div style={st.mapGrid}>
        {territories.map(territory => {
          const colors = FACTION_COLORS[territory.race];
          const sel = selectedFaction === territory.race;
          const glowIntensity = territory.dominanceLevel / 3;

          return (
            <button
              key={territory.race}
              style={{
                ...st.planet,
                borderColor: sel ? '#fff' : colors.primary,
                background: `radial-gradient(circle, ${colors.glow.replace('0.4', String(0.2 + glowIntensity * 0.4))}, rgba(0,0,0,0.8))`,
                boxShadow: `0 0 ${10 + territory.dominanceLevel * 10}px ${colors.glow}`,
                transform: sel ? 'scale(1.1)' : 'scale(1)',
              }}
              onClick={() => onSelectFaction(territory.race)}
            >
              <div style={{ color: colors.primary, fontWeight: 'bold', fontSize: 11 }}>
                {territory.planetName}
              </div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                {territory.score}
              </div>
              <div style={{ color: '#888', fontSize: 9 }}>
                {['Neutral', 'Contested', 'Controlled', 'Dominated'][territory.dominanceLevel]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected territory info */}
      {selectedFaction && selectedFaction !== Race.NEUTRAL && (
        <div style={{
          ...st.territoryInfo,
          borderColor: FACTION_COLORS[selectedFaction].primary,
        }}>
          <div style={{ color: FACTION_COLORS[selectedFaction].primary, fontWeight: 'bold', fontSize: 16 }}>
            {RaceData[selectedFaction].name}
          </div>
          <div style={{ color: '#aaa', fontSize: 12 }}>
            {RaceData[selectedFaction].planet} &mdash; {RaceData[selectedFaction].theme}
          </div>
          <div style={{ color: '#ffd700', fontSize: 14, marginTop: 4 }}>
            Score: {season.factionScores[selectedFaction] || 0} wins
          </div>
        </div>
      )}
    </div>
  );
};

const StandingsView: React.FC<{
  rankings: ReturnType<typeof getFactionRankings>;
  playerPledge: Race | null;
}> = ({ rankings, playerPledge }) => {
  const maxScore = rankings[0]?.score || 1;

  return (
    <div style={st.standingsContainer}>
      {rankings.map(entry => {
        const colors = FACTION_COLORS[entry.race];
        const isPledged = playerPledge === entry.race;
        const barWidth = (entry.score / maxScore) * 100;

        return (
          <div
            key={entry.race}
            style={{
              ...st.standingRow,
              borderColor: isPledged ? colors.primary : 'rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 40 }}>
              <span style={{
                color: entry.rank <= 3 ? '#ffd700' : '#888',
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                #{entry.rank}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                  {entry.name} {isPledged && '(You)'}
                </span>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                  {entry.score}
                </span>
              </div>
              <div style={st.barBg}>
                <div style={{
                  ...st.barFill,
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${colors.primary}, ${colors.glow.replace('0.4', '0.6')})`,
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LeaderboardView: React.FC<{
  season: FactionWarsSeason;
  selectedFaction: Race;
  onSelectFaction: (race: Race) => void;
}> = ({ season, selectedFaction, onSelectFaction }) => {
  const entries = season.topContributors[selectedFaction] || [];
  const colors = FACTION_COLORS[selectedFaction];

  return (
    <div style={st.leaderboardContainer}>
      {/* Faction selector */}
      <div style={st.factionTabs}>
        {Object.values(Race).filter(r => r !== Race.NEUTRAL).map(race => (
          <button
            key={race}
            style={{
              ...st.factionTab,
              borderColor: selectedFaction === race ? FACTION_COLORS[race].primary : 'transparent',
              color: selectedFaction === race ? FACTION_COLORS[race].primary : '#555',
            }}
            onClick={() => onSelectFaction(race)}
          >
            {RaceData[race].name.slice(0, 4)}
          </button>
        ))}
      </div>

      <h3 style={{ color: colors.primary, fontSize: 14, margin: '8px 0', textAlign: 'center' }}>
        Top {RaceData[selectedFaction].name} Contributors
      </h3>

      {entries.map((entry, i) => (
        <div key={i} style={st.lbRow}>
          <span style={{
            color: i < 3 ? '#ffd700' : '#888',
            fontWeight: 'bold',
            width: 32,
            textAlign: 'center',
          }}>
            #{entry.rank}
          </span>
          <span style={{ flex: 1, color: '#ccc', fontSize: 13 }}>{entry.name}</span>
          <span style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
            {entry.wins} wins
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#040410',
    color: '#fff',
    overflow: 'auto',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#aaa',
    fontSize: 14,
    cursor: 'pointer',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    margin: 0,
    letterSpacing: 2,
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
    margin: 0,
  },
  pledgeBanner: {
    padding: 16,
    margin: '0 20px',
    background: 'rgba(255,215,0,0.05)',
    borderRadius: 10,
    border: '1px solid rgba(255,215,0,0.2)',
    textAlign: 'center',
  },
  pledgeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 10,
  },
  pledgeBtn: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  pledgedStatus: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    margin: '0 20px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    border: '1px solid',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '8px 20px',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#888',
  },
  // Map
  mapContainer: {
    flex: 1,
    padding: '0 20px 20px',
  },
  mapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: 10,
    marginTop: 8,
  },
  planet: {
    padding: 12,
    borderRadius: 12,
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  territoryInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    border: '1px solid',
    background: 'rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  // Standings
  standingsContainer: {
    flex: 1,
    padding: '0 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  standingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s ease',
  },
  // Leaderboard
  leaderboardContainer: {
    flex: 1,
    padding: '0 20px 20px',
  },
  factionTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    marginBottom: 8,
  },
  factionTab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '4px 8px',
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  lbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  leaderBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    borderTop: '1px solid',
    background: 'rgba(0,0,0,0.3)',
  },
};

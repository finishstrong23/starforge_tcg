/**
 * STARFORGE TCG - Campaign Map
 *
 * The galaxy map showing all planets, progress, and the next battle.
 * Conquered planets glow, locked planets are dimmed, current target pulses.
 */

import React, { useState } from 'react';
import { Race, RaceData } from '../../types/Race';
import { PLANET_ENCOUNTERS, getCampaignEncounters } from '../../campaign/CampaignData';
import type { CampaignSave } from '../../campaign/CampaignState';
import { getNextEncounter, getCampaignProgress, isCampaignComplete } from '../../campaign/CampaignState';
import backgroundImg from '../../assets/background.png';
import logoImg from '../../assets/logo.png';

interface CampaignMapProps {
  save: CampaignSave;
  onSelectPlanet: (race: Race) => void;
  onBackToMenu: () => void;
  onDeleteCampaign: () => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  save,
  onSelectPlanet,
  onBackToMenu,
  onDeleteCampaign,
}) => {
  const [hoveredPlanet, setHoveredPlanet] = useState<Race | null>(null);
  const encounters = getCampaignEncounters(save.homeRace);
  const nextEncounter = getNextEncounter(save);
  const progress = getCampaignProgress(save);
  const complete = isCampaignComplete(save);
  const homeEncounter = PLANET_ENCOUNTERS[save.homeRace];

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={onBackToMenu}>
              Main Menu
            </button>
          </div>
          <div style={styles.headerCenter}>
            <img
              src={logoImg}
              alt="STARFORGE"
              style={styles.logo}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div style={styles.headerTitle}>GALACTIC CAMPAIGN</div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.resetButton} onClick={onDeleteCampaign}>
              New Campaign
            </button>
          </div>
        </div>

        {/* Player Stats Bar */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={{ color: homeEncounter.color }}>{homeEncounter.icon}</span>
            <span style={{ color: '#ffffff' }}>{RaceData[save.homeRace].name}</span>
            <span style={{ color: '#666' }}>Homeworld</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '20px' }}>{save.unlockedRaces.length}</span>
            <span style={{ color: '#888' }}>/ 10 Planets</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '20px' }}>{save.totalWins}</span>
            <span style={{ color: '#888' }}>Victories</span>
          </div>
          <div style={styles.statItem}>
            <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '20px' }}>{save.totalGamesPlayed}</span>
            <span style={{ color: '#888' }}>Battles</span>
          </div>
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            <span style={styles.progressLabel}>{progress}% Conquered</span>
          </div>
        </div>

        {/* Campaign Complete Banner */}
        {complete && (
          <div style={styles.completeBanner}>
            <div style={styles.completeTitle}>GALAXY CONQUERED</div>
            <div style={styles.completeSubtitle}>
              All ten worlds bow before you. The STARFORGE is yours.
            </div>
            <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>
              Replay any planet to improve your records, or start a new campaign with a different homeworld.
            </div>
          </div>
        )}

        {/* Planet Grid */}
        <div style={styles.planetGrid}>
          {encounters.map((encounter, index) => {
            const isUnlocked = save.unlockedRaces.includes(encounter.race);
            const isNext = nextEncounter?.race === encounter.race;
            const isFuture = index > save.currentEncounterIndex;
            const stats = save.planetStats[encounter.race];
            const isHovered = hoveredPlanet === encounter.race;
            const canReplay = isUnlocked;
            const canPlay = isNext || canReplay;

            return (
              <button
                key={encounter.race}
                style={{
                  ...styles.planetNode,
                  borderColor: isNext
                    ? encounter.color
                    : isUnlocked
                    ? encounter.color + '88'
                    : '#222233',
                  opacity: isFuture && !isUnlocked ? 0.4 : 1,
                  boxShadow: isNext
                    ? `0 0 20px ${encounter.color}44, 0 0 40px ${encounter.color}22`
                    : isHovered && canPlay
                    ? `0 0 15px ${encounter.color}33`
                    : 'none',
                  cursor: canPlay ? 'pointer' : 'default',
                  animation: isNext ? 'pulse 2s infinite' : 'none',
                }}
                onClick={() => canPlay && onSelectPlanet(encounter.race)}
                onMouseEnter={() => setHoveredPlanet(encounter.race)}
                onMouseLeave={() => setHoveredPlanet(null)}
                disabled={!canPlay}
              >
                {/* Planet icon */}
                <div style={styles.planetIcon}>
                  {isUnlocked ? encounter.icon : isFuture ? '🔒' : encounter.icon}
                </div>

                {/* Planet info */}
                <div style={styles.planetInfo}>
                  <div style={{
                    ...styles.planetName,
                    color: isUnlocked ? encounter.color : isFuture ? '#555' : encounter.color,
                  }}>
                    {isFuture && !isUnlocked ? '???' : RaceData[encounter.race].name}
                  </div>
                  <div style={styles.planetWorld}>
                    {isFuture && !isUnlocked ? 'Unknown World' : encounter.planet}
                  </div>
                </div>

                {/* Status badge */}
                <div style={styles.statusArea}>
                  {isUnlocked && (
                    <span style={styles.conqueredBadge}>CONQUERED</span>
                  )}
                  {isNext && !isUnlocked && (
                    <span style={{ ...styles.nextBadge, background: encounter.color }}>
                      NEXT TARGET
                    </span>
                  )}
                </div>

                {/* Stats if available */}
                {stats && (
                  <div style={styles.planetStats}>
                    <span>{stats.wins}W / {stats.attempts - stats.wins}L</span>
                    {stats.wins > 0 && stats.fastestWin < Infinity && (
                      <span>Best: {stats.fastestWin} turns</span>
                    )}
                  </div>
                )}

                {/* Connector line */}
                {index < encounters.length - 1 && (
                  <div style={{
                    ...styles.connector,
                    background: index < save.currentEncounterIndex
                      ? '#00ff8844'
                      : '#222233',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 136, 0.2); }
          50% { box-shadow: 0 0 30px rgba(0, 255, 136, 0.5), 0 0 50px rgba(0, 255, 136, 0.2); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'column',
    padding: '20px',
    overflowY: 'auto',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
  },
  content: {
    maxWidth: '900px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    paddingTop: '10px',
    paddingBottom: '40px',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flex: '1' },
  headerCenter: {
    flex: '2',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  headerRight: { flex: '1', textAlign: 'right' },
  logo: {
    maxWidth: '200px',
    width: '100%',
    height: 'auto',
    filter: 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.3))',
  },
  headerTitle: {
    fontSize: '16px',
    color: '#00ff88',
    letterSpacing: '4px',
    fontWeight: 'bold',
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '14px',
  },
  resetButton: {
    background: 'rgba(255, 60, 60, 0.15)',
    border: '1px solid #663333',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#ff6666',
    cursor: 'pointer',
    fontSize: '14px',
  },
  statsBar: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '12px 20px',
    background: 'rgba(20, 20, 40, 0.8)',
    borderRadius: '12px',
    border: '1px solid #222244',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  progressBarContainer: {
    flex: '1 1 200px',
    minWidth: '150px',
    height: '22px',
    background: '#111122',
    borderRadius: '11px',
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #00cc66, #00ff88)',
    borderRadius: '11px',
    transition: 'width 0.5s ease',
  },
  progressLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '11px',
    color: '#ffffff',
    fontWeight: 'bold',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  completeBanner: {
    width: '100%',
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(255, 204, 0, 0.1) 100%)',
    border: '2px solid #00ff8844',
    borderRadius: '12px',
    textAlign: 'center',
  },
  completeTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: '4px',
    textShadow: '0 0 20px #00ff8844',
  },
  completeSubtitle: {
    fontSize: '16px',
    color: '#cccccc',
    marginTop: '6px',
  },
  planetGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  planetNode: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 18px',
    background: 'linear-gradient(135deg, #12122a 0%, #1a1a35 100%)',
    border: '2px solid #222244',
    borderRadius: '12px',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    position: 'relative',
    textAlign: 'left',
  },
  planetIcon: {
    fontSize: '32px',
    width: '48px',
    textAlign: 'center',
    flexShrink: 0,
  },
  planetInfo: {
    flex: 1,
    minWidth: 0,
  },
  planetName: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  planetWorld: {
    fontSize: '12px',
    color: '#666',
  },
  statusArea: {
    flexShrink: 0,
  },
  conqueredBadge: {
    fontSize: '11px',
    color: '#00ff88',
    border: '1px solid #00ff8844',
    borderRadius: '4px',
    padding: '3px 8px',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },
  nextBadge: {
    fontSize: '11px',
    color: '#000',
    borderRadius: '4px',
    padding: '3px 10px',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },
  planetStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#666',
    flexShrink: 0,
  },
  connector: {
    position: 'absolute',
    bottom: '-10px',
    left: '38px',
    width: '2px',
    height: '10px',
  },
};

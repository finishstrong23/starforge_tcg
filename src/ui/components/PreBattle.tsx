/**
 * STARFORGE TCG - Pre-Battle Encounter Screen
 *
 * Shown before each campaign battle. Sets the stage with lore,
 * enemy taunts, and lets the player psyche up before fighting.
 */

import React, { useState, useEffect } from 'react';
import { Race, RaceData } from '../../types/Race';
import { PLANET_ENCOUNTERS } from '../../campaign/CampaignData';
import type { PlanetStats } from '../../campaign/CampaignState';
import { hapticTap } from '../capacitor';
import backgroundImg from '../../assets/background.png';

interface PreBattleProps {
  opponentRace: Race;
  playerRace: Race;
  stats?: PlanetStats;
  onFight: () => void;
  onBack: () => void;
  onCustomizeDeck?: () => void;
}

export const PreBattle: React.FC<PreBattleProps> = ({
  opponentRace,
  playerRace,
  stats,
  onFight,
  onBack,
  onCustomizeDeck,
}) => {
  const encounter = PLANET_ENCOUNTERS[opponentRace];
  const playerInfo = RaceData[playerRace];
  const playerEncounter = PLANET_ENCOUNTERS[playerRace];
  const [showTaunt, setShowTaunt] = useState(false);
  const [ready, setReady] = useState(false);

  // Animate the taunt appearing
  useEffect(() => {
    const t1 = setTimeout(() => setShowTaunt(true), 600);
    const t2 = setTimeout(() => setReady(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Back button */}
        <button style={styles.backButton} onClick={onBack}>
          Back to Map
        </button>

        {/* Planet title */}
        <div style={styles.titleArea}>
          <span style={{ fontSize: '60px' }}>{encounter.icon}</span>
          <div>
            <div style={{ ...styles.planetTitle, color: encounter.color }}>
              {encounter.title}
            </div>
            <div style={styles.planetSubtitle}>
              {encounter.planet} — {RaceData[opponentRace].name}
            </div>
          </div>
        </div>

        {/* Briefing */}
        <div style={styles.briefingBox}>
          <div style={styles.briefingLabel}>MISSION BRIEFING</div>
          <p style={styles.briefingText}>{encounter.introBriefing}</p>
        </div>

        {/* Enemy taunt */}
        <div style={{
          ...styles.tauntBox,
          borderColor: encounter.color + '44',
          opacity: showTaunt ? 1 : 0,
          transform: showTaunt ? 'translateY(0)' : 'translateY(10px)',
        }}>
          <div style={{ ...styles.tauntLabel, color: encounter.color }}>
            ENEMY TRANSMISSION
          </div>
          <p style={styles.tauntText}>{encounter.enemyTaunt}</p>
        </div>

        {/* Previous attempts */}
        {stats && stats.attempts > 0 && (
          <div style={styles.historyBox}>
            <div style={styles.historyLabel}>BATTLE HISTORY</div>
            <div style={styles.historyStats}>
              <span>Attempts: {stats.attempts}</span>
              <span style={{ color: stats.wins > 0 ? '#00ff88' : '#ff6666' }}>
                Victories: {stats.wins}
              </span>
              {stats.wins > 0 && stats.fastestWin < Infinity && (
                <span>Fastest Win: {stats.fastestWin} turns</span>
              )}
            </div>
          </div>
        )}

        {/* Matchup display */}
        <div style={styles.matchup}>
          <div style={styles.matchupSide}>
            <span style={{ fontSize: '36px' }}>{playerEncounter.icon}</span>
            <div style={{ ...styles.matchupName, color: playerEncounter.color }}>
              {playerInfo.name}
            </div>
            <div style={styles.matchupRole}>YOUR FORCES</div>
          </div>
          <div style={styles.vsText}>VS</div>
          <div style={styles.matchupSide}>
            <span style={{ fontSize: '36px' }}>{encounter.icon}</span>
            <div style={{ ...styles.matchupName, color: encounter.color }}>
              {RaceData[opponentRace].name}
            </div>
            <div style={styles.matchupRole}>DEFENDING</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {onCustomizeDeck && (
            <button
              style={{
                background: 'linear-gradient(135deg, #9933ff 0%, #7722cc 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 30px',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(153, 51, 255, 0.4)',
                letterSpacing: '2px',
                opacity: ready ? 1 : 0.5,
              }}
              onClick={onCustomizeDeck}
              disabled={!ready}
            >
              CUSTOMIZE DECK
            </button>
          )}
          <button
            style={{
              ...styles.fightButton,
              background: `linear-gradient(135deg, ${encounter.color} 0%, ${encounter.color}cc 100%)`,
              opacity: ready ? 1 : 0.5,
              transform: ready ? 'scale(1)' : 'scale(0.95)',
            }}
            onClick={() => { hapticTap(); onFight(); }}
            disabled={!ready}
          >
            ENGAGE
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '20px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
  } as React.CSSProperties,
  content: {
    maxWidth: '700px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  backButton: {
    alignSelf: 'flex-start',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '14px',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'left',
  },
  planetTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    letterSpacing: '2px',
  },
  planetSubtitle: {
    fontSize: '14px',
    color: '#888',
  },
  briefingBox: {
    width: '100%',
    padding: '18px',
    background: 'rgba(20, 20, 40, 0.9)',
    borderRadius: '12px',
    border: '1px solid #222244',
  },
  briefingLabel: {
    fontSize: '11px',
    color: '#666',
    letterSpacing: '2px',
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  briefingText: {
    fontSize: '15px',
    color: '#cccccc',
    lineHeight: '1.7',
    margin: 0,
  },
  tauntBox: {
    width: '100%',
    padding: '16px',
    background: 'rgba(30, 15, 15, 0.8)',
    borderRadius: '12px',
    border: '1px solid',
    transition: 'all 0.5s ease',
  },
  tauntLabel: {
    fontSize: '11px',
    letterSpacing: '2px',
    marginBottom: '6px',
    fontWeight: 'bold',
  },
  tauntText: {
    fontSize: '15px',
    color: '#dddddd',
    fontStyle: 'italic',
    lineHeight: '1.6',
    margin: 0,
  },
  historyBox: {
    width: '100%',
    padding: '12px 18px',
    background: 'rgba(20, 20, 40, 0.6)',
    borderRadius: '8px',
    border: '1px solid #222244',
  },
  historyLabel: {
    fontSize: '10px',
    color: '#555',
    letterSpacing: '2px',
    marginBottom: '4px',
    fontWeight: 'bold',
  },
  historyStats: {
    display: 'flex',
    gap: '20px',
    fontSize: '13px',
    color: '#888',
  },
  matchup: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
    padding: '16px',
  },
  matchupSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '120px',
  },
  matchupName: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  matchupRole: {
    fontSize: '10px',
    color: '#555',
    letterSpacing: '2px',
  },
  vsText: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#444',
    letterSpacing: '4px',
  },
  fightButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '18px 60px',
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#000000',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '4px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    minHeight: '56px',
  },
};

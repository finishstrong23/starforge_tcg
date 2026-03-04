/**
 * STARFORGE TCG - Planet Selection Screen
 *
 * First screen new players see. Pick 1 of 2 starter planets.
 * This is the "choose your class" moment — should feel momentous.
 */

import React, { useState } from 'react';
import { Race, RaceData } from '../../types/Race';
import { STARTER_PLANETS, STARTER_DESCRIPTIONS, PLANET_ENCOUNTERS } from '../../campaign/CampaignData';
import { hapticTap, hapticImpact } from '../capacitor';
import { SpaceBackground } from './SpaceBackground';
import { StarforgeLogo } from './StarforgeLogo';

interface PlanetSelectProps {
  onSelect: (race: Race) => void;
}

export const PlanetSelect: React.FC<PlanetSelectProps> = ({ onSelect }) => {
  const [hoveredRace, setHoveredRace] = useState<Race | null>(null);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!selectedRace) return;
    hapticImpact();
    setConfirmed(true);
    setTimeout(() => onSelect(selectedRace), 600);
  };

  return (
    <div style={styles.container}>
      <SpaceBackground />
      <div style={styles.content}>
        {/* Title */}
        <div style={styles.header}>
          <StarforgeLogo width={240} />
          <h2 style={styles.subtitle}>STORY MODE</h2>
          <p style={styles.prompt}>
            The galaxy is fractured. Ten worlds wage war for control of the STARFORGE —
            an ancient weapon that can reshape reality itself.
          </p>
          <p style={styles.promptHighlight}>
            Choose your homeworld. Your journey begins here.
          </p>
        </div>

        {/* Planet Cards */}
        <div style={styles.planetRow}>
          {STARTER_PLANETS.map((race) => {
            const raceInfo = RaceData[race];
            const encounter = PLANET_ENCOUNTERS[race];
            const desc = STARTER_DESCRIPTIONS[race];
            const isSelected = selectedRace === race;
            const isHovered = hoveredRace === race;

            return (
              <button
                key={race}
                style={{
                  ...styles.planetCard,
                  borderColor: isSelected ? encounter.color : isHovered ? encounter.color + '88' : '#333355',
                  boxShadow: isSelected
                    ? `0 0 30px ${encounter.color}66, inset 0 0 30px ${encounter.color}22`
                    : isHovered
                    ? `0 0 15px ${encounter.color}33`
                    : 'none',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  opacity: confirmed && !isSelected ? 0.3 : 1,
                }}
                onClick={() => { hapticTap(); setSelectedRace(race); }}
                onMouseEnter={() => setHoveredRace(race)}
                onMouseLeave={() => setHoveredRace(null)}
                onTouchStart={() => setHoveredRace(race)}
                onTouchEnd={() => setHoveredRace(null)}
              >
                {/* Planet icon & name */}
                <div style={styles.planetHeader}>
                  <span style={{ fontSize: '48px' }}>{encounter.icon}</span>
                  <div>
                    <div style={{ ...styles.planetName, color: encounter.color }}>
                      {raceInfo.name}
                    </div>
                    <div style={styles.planetWorld}>
                      Planet {encounter.planet}
                    </div>
                  </div>
                </div>

                {/* Pitch */}
                <div style={styles.pitch}>"{desc.pitch}"</div>

                {/* Fantasy */}
                <div style={styles.fantasy}>{desc.fantasy}</div>

                {/* Playstyle */}
                <div style={styles.strength}>
                  <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>Playstyle: </span>
                  {desc.strength}
                </div>

                {/* Theme tags */}
                <div style={styles.tags}>
                  {raceInfo.theme.split(', ').map((tag) => (
                    <span key={tag} style={{ ...styles.tag, borderColor: encounter.color + '66' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div style={{ ...styles.selectedBadge, background: encounter.color }}>
                    SELECTED
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm button */}
        {selectedRace && (
          <button
            style={{
              ...styles.confirmButton,
              background: `linear-gradient(135deg, ${PLANET_ENCOUNTERS[selectedRace].color} 0%, ${PLANET_ENCOUNTERS[selectedRace].color}cc 100%)`,
              opacity: confirmed ? 0.5 : 1,
            }}
            onClick={handleConfirm}
            disabled={confirmed}
          >
            {confirmed ? 'Launching...' : `Launch from ${PLANET_ENCOUNTERS[selectedRace].planet}`}
          </button>
        )}
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
    background: '#040410',
    position: 'relative',
  } as React.CSSProperties,
  content: {
    maxWidth: '900px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    maxWidth: '300px',
    width: '100%',
    height: 'auto',
    filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.5))',
  },
  subtitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: '6px',
    margin: 0,
    textShadow: '0 0 15px #00ff8866',
  },
  prompt: {
    fontSize: '16px',
    color: '#aaaaaa',
    maxWidth: '600px',
    lineHeight: '1.6',
    margin: 0,
  },
  promptHighlight: {
    fontSize: '18px',
    color: '#ffffff',
    fontWeight: 'bold',
    margin: 0,
  },
  planetRow: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  planetCard: {
    flex: '1 1 380px',
    maxWidth: '420px',
    background: 'linear-gradient(135deg, #12122a 0%, #1a1a35 50%, #15152a 100%)',
    border: '2px solid #333355',
    borderRadius: '16px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    position: 'relative',
    overflow: 'hidden',
  },
  planetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  planetName: {
    fontSize: '24px',
    fontWeight: 'bold',
  },
  planetWorld: {
    fontSize: '13px',
    color: '#888888',
  },
  pitch: {
    fontSize: '18px',
    fontStyle: 'italic',
    color: '#cccccc',
    borderLeft: '3px solid #444466',
    paddingLeft: '12px',
  },
  fantasy: {
    fontSize: '14px',
    color: '#bbbbbb',
    lineHeight: '1.5',
  },
  strength: {
    fontSize: '13px',
    color: '#aaaaaa',
    lineHeight: '1.4',
  },
  tags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: '11px',
    color: '#aaaaaa',
    border: '1px solid #444466',
    borderRadius: '4px',
    padding: '2px 8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  selectedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: '2px',
  },
  confirmButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '18px 60px',
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#000000',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    letterSpacing: '1px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
};

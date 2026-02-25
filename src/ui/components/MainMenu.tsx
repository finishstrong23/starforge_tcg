/**
 * STARFORGE TCG - Main Menu Component
 */

import React, { useState } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';

interface MainMenuProps {
  onStartGame: (playerRace: Race, aiDifficulty: AIDifficulty) => void;
  onPlayFriend?: () => void;
  onBalanceTest?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, onPlayFriend, onBalanceTest }) => {
  const [selectedRace, setSelectedRace] = useState<Race>(Race.COGSMITHS);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>(AIDifficulty.MEDIUM);

  const availableRaces = [
    Race.COGSMITHS,
    Race.LUMINAR,
    Race.PYROCLAST,
    Race.VOIDBORN,
    Race.BIOTITANS,
    Race.PHANTOM_CORSAIRS,
    Race.CRYSTALLINE,
    Race.HIVEMIND,
    Race.ASTROMANCERS,
    Race.CHRONOBOUND,
  ];

  const difficulties = [
    { value: AIDifficulty.EASY, label: 'Easy', description: 'Random plays, forgiving mistakes' },
    { value: AIDifficulty.MEDIUM, label: 'Medium', description: 'Basic strategy, some optimization' },
    { value: AIDifficulty.HARD, label: 'Hard', description: 'Smart decisions, threat evaluation' },
  ];

  const handleStartGame = () => {
    onStartGame(selectedRace, selectedDifficulty);
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Title */}
        <div style={styles.titleContainer}>
          <h1 style={styles.title}>STARFORGE</h1>
          <p style={styles.subtitle}>Trading Card Game</p>
        </div>

        {/* Race Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Choose Your Planet</h2>
          <div style={styles.raceGrid}>
            {availableRaces.map((race) => {
              const raceInfo = RaceData[race];
              const isSelected = selectedRace === race;
              return (
                <button
                  key={race}
                  style={{
                    ...styles.raceCard,
                    ...(isSelected ? styles.raceCardSelected : {}),
                  }}
                  onClick={() => setSelectedRace(race)}
                >
                  <div style={styles.raceName}>{raceInfo.name}</div>
                  <div style={styles.racePlanet}>{raceInfo.planet}</div>
                  <div style={styles.raceMechanic}>{raceInfo.playstyle}</div>
                  <div style={styles.raceTheme}>{raceInfo.theme}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>AI Difficulty</h2>
          <div style={styles.difficultyGrid}>
            {difficulties.map((diff) => {
              const isSelected = selectedDifficulty === diff.value;
              return (
                <button
                  key={diff.value}
                  style={{
                    ...styles.difficultyCard,
                    ...(isSelected ? styles.difficultyCardSelected : {}),
                  }}
                  onClick={() => setSelectedDifficulty(diff.value)}
                >
                  <div style={styles.difficultyLabel}>{diff.label}</div>
                  <div style={styles.difficultyDesc}>{diff.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Buttons */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
          <button style={styles.startButton} onClick={handleStartGame}>
            Play vs AI
          </button>

          {onPlayFriend && (
            <button
              style={{
                background: 'linear-gradient(135deg, #4488ff 0%, #3366dd 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '18px 50px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(68, 136, 255, 0.4)',
              }}
              onClick={onPlayFriend}
            >
              Play vs Friend
            </button>
          )}
        </div>

        {/* Balance Test Button */}
        {onBalanceTest && (
          <button
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 50px',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
            }}
            onClick={onBalanceTest}
          >
            ⚖️ AI Balance Tester
          </button>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '20px',
    overflowY: 'auto',
    flexDirection: 'column',
  },
  content: {
    maxWidth: '900px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
    paddingTop: '40px',
    paddingBottom: '40px',
  },
  titleContainer: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#00ff88',
    textShadow: '0 0 20px #00ff88, 0 0 40px #00ff88',
    letterSpacing: '8px',
    margin: 0,
  },
  subtitle: {
    fontSize: '24px',
    color: '#aaaaaa',
    marginTop: '10px',
  },
  section: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#ffffff',
    marginBottom: '10px',
  },
  raceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '15px',
    width: '100%',
  },
  raceCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #333355',
    borderRadius: '12px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    color: '#ffffff',
  },
  raceCardSelected: {
    border: '2px solid #00ff88',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
    background: 'linear-gradient(135deg, #1a2a2e 0%, #203040 100%)',
  },
  raceName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: '4px',
  },
  racePlanet: {
    fontSize: '12px',
    color: '#888888',
    marginBottom: '8px',
  },
  raceMechanic: {
    fontSize: '14px',
    color: '#ffcc00',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  raceTheme: {
    fontSize: '12px',
    color: '#aaaaaa',
    lineHeight: '1.3',
  },
  difficultyGrid: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  difficultyCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #333355',
    borderRadius: '12px',
    padding: '15px 25px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    color: '#ffffff',
    minWidth: '150px',
  },
  difficultyCardSelected: {
    border: '2px solid #ff6600',
    boxShadow: '0 0 15px rgba(255, 102, 0, 0.4)',
    background: 'linear-gradient(135deg, #2a1a1e 0%, #402020 100%)',
  },
  difficultyLabel: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ff6600',
    marginBottom: '4px',
  },
  difficultyDesc: {
    fontSize: '12px',
    color: '#aaaaaa',
  },
  startButton: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '12px',
    padding: '18px 60px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.4)',
    marginTop: '20px',
  },
};

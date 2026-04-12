/**
 * STARFORGE TCG — Roguelite Hero Select Screen
 *
 * Player picks a race/hero to start a new dungeon run.
 */

import React from 'react';
import { Race, RaceData, LaunchFactions } from '../../types/Race';
import { getHeroByRace } from '../../heroes/HeroDefinitions';
import { hapticTap } from '../capacitor';

interface DungeonHeroSelectProps {
  onSelectHero: (race: Race, heroId: string) => void;
  onBack: () => void;
}

export const DungeonHeroSelect: React.FC<DungeonHeroSelectProps> = ({
  onSelectHero,
  onBack,
}) => {
  const availableRaces = LaunchFactions;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>DUNGEON RUN</h1>
        <p style={styles.subtitle}>Choose your champion to enter the forge depths</p>
      </div>

      <div style={styles.heroGrid}>
        {availableRaces.map(race => {
          const info = RaceData[race];
          const hero = getHeroByRace(race);
          if (!hero) return null;

          return (
            <button
              key={race}
              style={styles.heroCard}
              onClick={() => {
                hapticTap();
                onSelectHero(race, hero.id);
              }}
            >
              <div style={styles.heroName}>{info.name}</div>
              <div style={styles.heroPlanet}>{info.planet}</div>
              <div style={styles.heroAbility}>{hero.heroPower.name}</div>
              <div style={styles.heroDesc}>{info.playstyle}</div>
            </button>
          );
        })}
      </div>

      <button style={styles.backButton} onClick={onBack}>
        Back to Menu
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 50%, #0a1a2e 100%)',
    color: '#fff',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ffd700, #ff6b35)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: '10px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#aab',
    margin: 0,
  },
  heroGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    maxWidth: '900px',
    width: '100%',
    marginBottom: '30px',
  },
  heroCard: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    transition: 'transform 0.2s, border-color 0.2s',
    fontSize: '14px',
  },
  heroName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: '4px',
  },
  heroPlanet: {
    fontSize: '0.85rem',
    color: '#8af',
    marginBottom: '8px',
  },
  heroAbility: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#7df',
    marginBottom: '4px',
  },
  heroDesc: {
    fontSize: '0.8rem',
    color: '#aab',
    lineHeight: '1.3',
  },
  backButton: {
    padding: '10px 30px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#aab',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

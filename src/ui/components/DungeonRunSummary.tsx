/**
 * STARFORGE TCG — Roguelite Run Summary Screen
 *
 * Shown on victory or death. Displays run stats, battle log,
 * relics collected, and upgrade count.
 */

import React from 'react';
import type { DungeonRunSave } from '../../dungeon/roguelite/types';
import { RaceData } from '../../types/Race';
import { RELICS_BY_ID } from '../../dungeon/roguelite/data/relics';
import { hapticTap } from '../capacitor';

interface DungeonRunSummaryProps {
  save: DungeonRunSave;
  result: 'VICTORY' | 'DEATH';
  onContinue: () => void;
}

export const DungeonRunSummary: React.FC<DungeonRunSummaryProps> = ({
  save,
  result,
  onContinue,
}) => {
  const isVictory = result === 'VICTORY';
  const battlesWon = save.battleLog.filter(b => b.won).length;
  const totalUpgrades = save.deck.reduce((sum, c) => sum + c.upgrades.length, 0);
  const duration = Date.now() - save.startedAt;
  const minutes = Math.floor(duration / 60000);
  const raceName = RaceData[save.race]?.name || save.race;

  return (
    <div style={styles.container}>
      <div style={styles.iconWrap}>
        <div style={styles.icon}>{isVictory ? '\uD83C\uDFC6' : '\uD83D\uDC80'}</div>
      </div>

      <h1 style={{ ...styles.title, color: isVictory ? '#ffd700' : '#f87171' }}>
        {isVictory ? 'VICTORY!' : 'DEFEAT'}
      </h1>

      <p style={styles.subtitle}>
        {isVictory
          ? `You conquered all 3 acts as ${raceName}!`
          : `Fallen in Act ${save.act} as ${raceName}.`}
      </p>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <StatBox label="Battles Won" value={String(battlesWon)} />
        <StatBox label="Act Reached" value={`${save.act} / 3`} />
        <StatBox label="Deck Size" value={String(save.deck.length)} />
        <StatBox label="Upgrades" value={String(totalUpgrades)} />
        <StatBox label="Relics" value={String(save.relics.length)} />
        <StatBox label="Gold" value={String(save.gold)} />
        <StatBox label="Final HP" value={`${save.hp}/${save.maxHp}`} />
        <StatBox label="Duration" value={`${minutes}m`} />
      </div>

      {/* Relics collected */}
      {save.relics.length > 0 && (
        <div style={styles.relicSection}>
          <div style={styles.sectionTitle}>Relics Collected</div>
          <div style={styles.relicGrid}>
            {save.relics.map(id => {
              const relic = RELICS_BY_ID[id];
              return (
                <div key={id} style={styles.relicItem}>
                  <span style={styles.relicIcon}>{relic?.icon || '?'}</span>
                  <span style={styles.relicName}>{relic?.name || id}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Battle log */}
      {save.battleLog.length > 0 && (
        <div style={styles.logSection}>
          <div style={styles.sectionTitle}>Battle Log</div>
          <div style={styles.logList}>
            {save.battleLog.map((b, i) => (
              <div key={i} style={styles.logEntry}>
                <span style={{ color: b.won ? '#4ade80' : '#f87171', minWidth: '16px' }}>
                  {b.won ? 'W' : 'L'}
                </span>
                <span style={styles.logRace}>
                  {RaceData[b.enemyRace]?.name || b.enemyRace}
                </span>
                <span style={styles.logTurns}>{b.turns}t</span>
                <span style={styles.logHp}>
                  {b.hpBefore} &rarr; {b.hpAfter} HP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        style={styles.continueBtn}
        onClick={() => { hapticTap(); onContinue(); }}
      >
        {isVictory ? 'Play Again' : 'Try Again'}
      </button>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={styles.statBox}>
    <div style={styles.statValue}>{value}</div>
    <div style={styles.statLabel}>{label}</div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: 'linear-gradient(135deg, #0a0a1e 0%, #1a1a2e 50%, #0a0a2e 100%)',
    color: '#fff',
    overflow: 'auto',
  },
  iconWrap: {
    marginTop: '20px',
    marginBottom: '8px',
  },
  icon: {
    fontSize: '4rem',
  },
  title: {
    fontSize: '2.5rem',
    margin: '0 0 4px',
    textShadow: '0 2px 15px rgba(255,215,0,0.3)',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#aab',
    margin: '0 0 24px',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    maxWidth: '500px',
    width: '100%',
    marginBottom: '24px',
  },
  statBox: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#888',
    marginTop: '2px',
    textTransform: 'uppercase',
  },
  relicSection: {
    width: '100%',
    maxWidth: '500px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#7df',
    marginBottom: '8px',
  },
  relicGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  relicItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '0.85rem',
  },
  relicIcon: {
    fontSize: '1.1rem',
  },
  relicName: {
    color: '#ffd700',
  },
  logSection: {
    width: '100%',
    maxWidth: '500px',
    marginBottom: '24px',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  logEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '0.8rem',
  },
  logRace: {
    color: '#ccc',
    flex: 1,
  },
  logTurns: {
    color: '#888',
  },
  logHp: {
    color: '#f88',
    minWidth: '90px',
    textAlign: 'right',
  },
  continueBtn: {
    padding: '12px 40px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: '20px',
  },
};

import React from 'react';
import type { RunStats, RunCard, DungeonRelic } from '../types';

interface RunSummaryProps {
  victory: boolean;
  stats: RunStats;
  deck: RunCard[];
  relics: DungeonRelic[];
  act: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function RunSummary({ victory, stats, deck, relics, act, onPlayAgain, onMainMenu }: RunSummaryProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Title */}
        <div style={{
          ...styles.title,
          color: victory ? '#ffd700' : '#ef4444',
          textShadow: victory ? '0 0 40px rgba(255,215,0,0.6)' : '0 0 40px rgba(239,68,68,0.6)',
        }}>
          {victory ? 'VICTORY!' : 'RUN OVER'}
        </div>
        <div style={styles.subtitle}>
          {victory ? 'You have conquered the Star Devourer!' : `Defeated on Act ${act}`}
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <StatRow label="Floors Reached" value={stats.floorReached} />
          <StatRow label="Turns Played" value={stats.turnsPlayed} />
          <StatRow label="Damage Dealt" value={stats.damageDealt} />
          <StatRow label="Damage Taken" value={stats.damageTaken} />
          <StatRow label="Enemies Killed" value={stats.enemiesKilled} />
          <StatRow label="Cards Collected" value={stats.cardsCollected} />
          <StatRow label="Relics Found" value={stats.relicsCollected} />
        </div>

        {/* Relics */}
        {relics.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Relics Collected</div>
            <div style={styles.relicList}>
              {relics.map(r => (
                <div key={r.id} style={styles.relicItem} title={r.description}>
                  <span style={styles.relicIcon}>{r.name[0]}</span>
                  <span style={styles.relicName}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Deck */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Final Deck ({deck.length} cards)</div>
          <div style={styles.deckList}>
            {deck.map(card => (
              <div key={card.instanceId} style={styles.deckCard}>
                <span style={{
                  ...styles.costBubble,
                  backgroundColor: card.upgraded ? '#b8860b' : '#1e40af',
                }}>
                  {card.upgraded && card.upgradedCost !== undefined ? card.upgradedCost : card.cost}
                </span>
                <span style={{
                  ...styles.cardNameText,
                  color: card.upgraded ? '#ffd700' : '#fff',
                }}>
                  {card.name}{card.upgraded ? '+' : ''}
                </span>
                <span style={styles.factionTag}>{card.faction}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          <button onClick={onPlayAgain} style={styles.playAgainButton}>
            PLAY AGAIN
          </button>
          <button onClick={onMainMenu} style={styles.menuButton}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.statRow}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 1s ease',
  },
  container: {
    width: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '40px',
    textAlign: 'center',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#fff',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    marginBottom: '32px',
  },
  statsGrid: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#999',
    fontSize: '14px',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#fff',
  },
  section: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  relicList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },
  relicItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,215,0,0.1)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(255,215,0,0.3)',
    cursor: 'help',
  },
  relicIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255,215,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffd700',
  },
  relicName: {
    fontSize: '12px',
    color: '#ddd',
  },
  deckList: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
    maxHeight: '200px',
    overflow: 'auto',
  },
  deckCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '4px',
    fontSize: '12px',
  },
  costBubble: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 0,
  },
  cardNameText: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  factionTag: {
    fontSize: '9px',
    color: '#666',
  },
  buttons: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '32px',
  },
  playAgainButton: {
    padding: '14px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ffd700, #b8860b)',
    color: '#000',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    letterSpacing: '2px',
    boxShadow: '0 0 20px rgba(255,215,0,0.3)',
  },
  menuButton: {
    padding: '14px 40px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'rgba(255,255,255,0.1)',
    color: '#aaa',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
};

/**
 * STARFORGE TCG - Post-Battle Results Screen
 *
 * The most important screen for retention. Must feel rewarding
 * on BOTH victory and defeat. Key design principles:
 *
 * VICTORY: Unlock new race, show epic lore, celebrate
 * DEFEAT: Reveal lore anyway, show tactical tips, encourage retry
 *
 * Every battle teaches something. Every battle progresses the story.
 */

import React, { useState, useEffect } from 'react';
import { Race, RaceData } from '../../types/Race';
import { PLANET_ENCOUNTERS } from '../../campaign/CampaignData';
import type { PlanetStats, BattleReward } from '../../campaign/CampaignState';
import { SoundManager } from '../../audio';
import { hapticTap, hapticHeavy } from '../capacitor';
import backgroundImg from '../../assets/background.png';

interface PostBattleProps {
  opponentRace: Race;
  playerRace: Race;
  won: boolean;
  playerHealthRemaining: number;
  turnCount: number;
  /** Whether this was the first time fighting this planet */
  firstEncounter: boolean;
  /** Whether a new race was just unlocked */
  newUnlock: boolean;
  stats: PlanetStats;
  onContinue: () => void;
  onRetry: () => void;
  /** Rewards earned from this battle */
  reward?: BattleReward;
  /** Player's total gold after rewards */
  totalGold?: number;
}

export const PostBattle: React.FC<PostBattleProps> = ({
  opponentRace,
  won,
  playerHealthRemaining,
  turnCount,
  firstEncounter,
  newUnlock,
  stats,
  onContinue,
  onRetry,
  reward,
  totalGold,
}) => {
  const encounter = PLANET_ENCOUNTERS[opponentRace];
  const [phase, setPhase] = useState(0); // 0=result, 1=stats, 2=lore, 3=unlock

  // Animate phases appearing sequentially
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Performance rating (stars)
  const getStars = (): number => {
    if (!won) return 0;
    if (playerHealthRemaining >= 20 && turnCount <= 10) return 3;
    if (playerHealthRemaining >= 10) return 2;
    return 1;
  };
  const stars = getStars();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Result Banner */}
        <div style={{
          ...styles.resultBanner,
          borderColor: won ? '#00ff88' : '#ff6644',
          boxShadow: won
            ? '0 0 40px rgba(0, 255, 136, 0.2)'
            : '0 0 40px rgba(255, 100, 68, 0.15)',
        }}>
          {/* Planet icon */}
          <span style={{ fontSize: '48px' }}>{encounter.icon}</span>

          {/* Result text */}
          <div style={{
            ...styles.resultTitle,
            color: won ? '#00ff88' : '#ff6644',
            textShadow: won ? '0 0 30px #00ff8866' : '0 0 30px #ff664466',
          }}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </div>

          <div style={styles.resultSubtitle}>
            {won ? encounter.victoryText : encounter.defeatText}
          </div>

          {/* Stars for victory */}
          {won && (
            <div style={styles.starsRow}>
              {[1, 2, 3].map(i => (
                <span key={i} style={{
                  fontSize: '32px',
                  opacity: i <= stars ? 1 : 0.2,
                  transition: 'opacity 0.3s ease',
                  transitionDelay: `${i * 0.2}s`,
                }}>
                  {i <= stars ? '⭐' : '☆'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Battle Stats */}
        <div style={{
          ...styles.statsBox,
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(10px)',
        }}>
          <div style={styles.statsTitle}>BATTLE REPORT</div>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{turnCount}</span>
              <span style={styles.statLabel}>Turns</span>
            </div>
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: won ? '#00ff88' : '#ff6644' }}>
                {playerHealthRemaining}
              </span>
              <span style={styles.statLabel}>Health Left</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.attempts}</span>
              <span style={styles.statLabel}>Total Attempts</span>
            </div>
            <div style={styles.statItem}>
              <span style={{ ...styles.statValue, color: '#ffcc00' }}>{stats.wins}</span>
              <span style={styles.statLabel}>Victories</span>
            </div>
          </div>

          {/* Personal best callouts */}
          {won && stats.wins === 1 && (
            <div style={styles.achievementBadge}>FIRST VICTORY</div>
          )}
          {won && turnCount <= stats.fastestWin && stats.wins > 1 && (
            <div style={styles.achievementBadge}>NEW SPEED RECORD</div>
          )}
          {won && playerHealthRemaining >= stats.bestHealthRemaining && stats.wins > 1 && (
            <div style={styles.achievementBadge}>NEW HEALTH RECORD</div>
          )}
        </div>

        {/* Battle Rewards */}
        {reward && (
          <div style={{
            ...styles.rewardBox,
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(10px)',
          }}>
            <div style={styles.rewardTitle}>REWARDS</div>
            <div style={styles.rewardGrid}>
              <div style={styles.rewardItem}>
                <span style={{ fontSize: '24px' }}>&#x1FA99;</span>
                <span style={styles.rewardValue}>+{reward.gold}</span>
                <span style={styles.rewardLabel}>Gold</span>
              </div>
              {reward.cardIds.length > 0 && (
                <div style={styles.rewardItem}>
                  <span style={{ fontSize: '24px' }}>&#x1F0CF;</span>
                  <span style={styles.rewardValue}>+{reward.cardIds.length}</span>
                  <span style={styles.rewardLabel}>{reward.cardIds.length === 1 ? 'Card' : 'Cards'}</span>
                </div>
              )}
              {reward.firstWinBonus && (
                <div style={{ ...styles.achievementBadge, background: 'linear-gradient(135deg, #00cc88 0%, #00aa66 100%)' }}>
                  FIRST WIN BONUS +50g
                </div>
              )}
            </div>
            {totalGold !== undefined && (
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '8px' }}>
                Total Gold: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{totalGold}</span>
                {totalGold >= 100 && (
                  <span style={{ color: '#00ff88', marginLeft: '8px' }}>
                    (Card pack available!)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lore Reveal — shown on EVERY encounter, win or loss */}
        {firstEncounter && (
          <div style={{
            ...styles.loreBox,
            borderColor: encounter.color + '44',
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
          }}>
            <div style={styles.loreHeader}>
              <span style={{ color: encounter.color, fontWeight: 'bold' }}>
                {won ? 'INTELLIGENCE ACQUIRED' : 'RECON DATA RECOVERED'}
              </span>
            </div>
            <p style={styles.loreText}>{encounter.loreUnlock}</p>
            <div style={styles.loreFooter}>
              {won
                ? 'This knowledge is now part of your galactic archives.'
                : 'Even in defeat, your scouts gathered valuable intelligence.'}
            </div>
          </div>
        )}

        {/* New Race Unlock — only on victory */}
        {newUnlock && (
          <div style={{
            ...styles.unlockBox,
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
          }}>
            <div style={styles.unlockTitle}>NEW RACE UNLOCKED</div>
            <div style={styles.unlockContent}>
              <span style={{ fontSize: '40px' }}>{encounter.icon}</span>
              <div>
                <div style={{ ...styles.unlockRaceName, color: encounter.color }}>
                  {RaceData[opponentRace].name}
                </div>
                <div style={styles.unlockDesc}>
                  You can now play as the {RaceData[opponentRace].name} in Quick Play and future campaigns!
                </div>
              </div>
            </div>
            <div style={styles.unlockPlaystyle}>
              <span style={{ color: '#ffcc00' }}>Playstyle: </span>
              {RaceData[opponentRace].playstyle}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{
          ...styles.buttonRow,
          opacity: phase >= 3 ? 1 : 0,
        }}>
          {!won && (
            <button
              style={{
                ...styles.retryButton,
                background: `linear-gradient(135deg, ${encounter.color} 0%, ${encounter.color}cc 100%)`,
              }}
              onClick={onRetry}
            >
              FIGHT AGAIN
            </button>
          )}
          <button
            style={{
              ...styles.continueButton,
              ...(won ? {
                background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
              } : {}),
            }}
            onClick={onContinue}
          >
            {won ? 'CONTINUE CAMPAIGN' : 'BACK TO MAP'}
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
    maxWidth: '650px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  resultBanner: {
    width: '100%',
    padding: '28px',
    background: 'linear-gradient(135deg, rgba(20, 20, 40, 0.95) 0%, rgba(15, 15, 30, 0.95) 100%)',
    borderRadius: '16px',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
  },
  resultTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    letterSpacing: '8px',
  },
  resultSubtitle: {
    fontSize: '15px',
    color: '#bbbbbb',
    lineHeight: '1.6',
    maxWidth: '500px',
  },
  starsRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  statsBox: {
    width: '100%',
    padding: '18px',
    background: 'rgba(20, 20, 40, 0.8)',
    borderRadius: '12px',
    border: '1px solid #222244',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.5s ease',
  },
  statsTitle: {
    fontSize: '11px',
    color: '#555',
    letterSpacing: '3px',
    fontWeight: 'bold',
  },
  statsGrid: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  achievementBadge: {
    padding: '4px 16px',
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: '2px',
  },
  loreBox: {
    width: '100%',
    padding: '18px',
    background: 'rgba(25, 20, 35, 0.9)',
    borderRadius: '12px',
    border: '1px solid',
    transition: 'all 0.5s ease',
  },
  loreHeader: {
    fontSize: '11px',
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  loreText: {
    fontSize: '14px',
    color: '#cccccc',
    lineHeight: '1.7',
    margin: '0 0 8px 0',
    fontStyle: 'italic',
  },
  loreFooter: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  unlockBox: {
    width: '100%',
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08) 0%, rgba(0, 170, 85, 0.05) 100%)',
    borderRadius: '12px',
    border: '2px solid #00ff8833',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'all 0.5s ease',
  },
  unlockTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: '3px',
    textAlign: 'center',
  },
  unlockContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  unlockRaceName: {
    fontSize: '22px',
    fontWeight: 'bold',
  },
  unlockDesc: {
    fontSize: '13px',
    color: '#999',
    lineHeight: '1.5',
  },
  unlockPlaystyle: {
    fontSize: '13px',
    color: '#888',
  },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    transition: 'opacity 0.5s ease',
  },
  retryButton: {
    border: 'none',
    borderRadius: '12px',
    padding: '16px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#000',
    cursor: 'pointer',
    letterSpacing: '2px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  rewardBox: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, rgba(40, 30, 10, 0.9) 0%, rgba(30, 20, 5, 0.9) 100%)',
    borderRadius: '12px',
    border: '1px solid #ffcc0033',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.5s ease',
  },
  rewardTitle: {
    fontSize: '11px',
    color: '#ffcc00',
    letterSpacing: '3px',
    fontWeight: 'bold',
  },
  rewardGrid: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  rewardValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffcc00',
  },
  rewardLabel: {
    fontSize: '10px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  continueButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid #444',
    borderRadius: '12px',
    padding: '16px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
};

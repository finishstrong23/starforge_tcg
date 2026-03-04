/**
 * STARFORGE TCG - Battle Pass Screen
 *
 * Visual progression track with 50 tiers, free + premium rewards,
 * XP bar, season timer, and reward claim buttons.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { SoundManager } from '../../audio';
import { hapticTap } from '../capacitor';
import { SpaceBackground } from './SpaceBackground';
import {
  loadBattlePass,
  saveBattlePass,
  claimFreeReward,
  claimPremiumReward,
  upgradeToPremium,
  getLevelProgress,
  getDaysRemaining,
  BATTLE_PASS_TIERS,
  type BattlePassState,
  type BattlePassReward,
} from '../../progression/BattlePass';

interface BattlePassScreenProps {
  onBack: () => void;
}

export const BattlePassScreen: React.FC<BattlePassScreenProps> = ({ onBack }) => {
  const [state, setState] = useState<BattlePassState>(loadBattlePass);
  const progress = getLevelProgress(state);
  const daysLeft = getDaysRemaining(state);

  const handleClaimFree = useCallback((level: number) => {
    const result = claimFreeReward(state, level);
    if (result) {
      hapticTap();
      setState(result);
      SoundManager.play('craft' as any);
    }
  }, [state]);

  const handleClaimPremium = useCallback((level: number) => {
    const result = claimPremiumReward(state, level);
    if (result) {
      hapticTap();
      setState(result);
      SoundManager.play('craft' as any);
    }
  }, [state]);

  const handleUpgrade = useCallback(() => {
    const result = upgradeToPremium(state);
    setState(result);
    SoundManager.play('legendaryPlay');
  }, [state]);

  // Count unclaimed rewards
  const unclaimedFree = useMemo(() => {
    return BATTLE_PASS_TIERS.filter(t =>
      t.freeReward && t.level <= state.level && !state.claimedFree.includes(t.level)
    ).length;
  }, [state]);

  const unclaimedPremium = useMemo(() => {
    if (!state.isPremium) return 0;
    return BATTLE_PASS_TIERS.filter(t =>
      t.premiumReward && t.level <= state.level && !state.claimedPremium.includes(t.level)
    ).length;
  }, [state]);

  return (
    <div style={styles.container}>
      <SpaceBackground />
      <style>{`
        @keyframes bp-shine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bp-claim-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(255,204,0,0.3); }
          50% { box-shadow: 0 0 16px rgba(255,204,0,0.7), 0 0 32px rgba(255,204,0,0.3); }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
        <div style={styles.headerCenter}>
          <h1 style={styles.title}>{state.seasonName}</h1>
          <div style={styles.seasonInfo}>
            Season {state.season} | {daysLeft} days remaining
          </div>
        </div>
        <div style={styles.levelBadge}>
          <div style={styles.levelNumber}>{state.level}</div>
          <div style={styles.levelLabel}>LEVEL</div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div style={styles.xpBarContainer}>
        <div style={styles.xpBarOuter}>
          <div style={{
            ...styles.xpBarInner,
            width: `${progress.percent}%`,
          }} />
          <div style={styles.xpBarText}>
            {state.level >= 50 ? 'MAX LEVEL' : `${progress.current} / ${progress.needed} XP`}
          </div>
        </div>
        <div style={styles.xpTotal}>Total: {state.totalXpEarned} XP earned</div>
      </div>

      {/* Premium Upgrade Banner */}
      {!state.isPremium && (
        <div style={styles.premiumBanner}>
          <div style={styles.premiumText}>
            Unlock the <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>PREMIUM PASS</span> for
            exclusive rewards, extra gold, and the season card back!
          </div>
          <button style={styles.premiumBtn} onClick={handleUpgrade}>
            Upgrade to Premium
          </button>
        </div>
      )}

      {/* Unclaimed notification */}
      {(unclaimedFree > 0 || unclaimedPremium > 0) && (
        <div style={styles.unclaimedBar}>
          {unclaimedFree > 0 && (
            <span style={{ color: '#00ff88' }}>{unclaimedFree} free reward{unclaimedFree > 1 ? 's' : ''} to claim!</span>
          )}
          {unclaimedFree > 0 && unclaimedPremium > 0 && <span style={{ color: '#444' }}> | </span>}
          {unclaimedPremium > 0 && (
            <span style={{ color: '#ffcc00' }}>{unclaimedPremium} premium reward{unclaimedPremium > 1 ? 's' : ''} to claim!</span>
          )}
        </div>
      )}

      {/* Tier Track */}
      <div style={styles.trackContainer}>
        <div style={styles.trackScroll}>
          {BATTLE_PASS_TIERS.map((tier) => {
            const isUnlocked = state.level >= tier.level;
            const isCurrent = state.level === tier.level;
            const freeClaimed = state.claimedFree.includes(tier.level);
            const premiumClaimed = state.claimedPremium.includes(tier.level);
            const canClaimFree = isUnlocked && tier.freeReward && !freeClaimed;
            const canClaimPremium = state.isPremium && isUnlocked && tier.premiumReward && !premiumClaimed;

            return (
              <div key={tier.level} style={{
                ...styles.tierColumn,
                ...(isCurrent ? styles.tierCurrent : {}),
                opacity: isUnlocked ? 1 : 0.4,
              }}>
                {/* Level number */}
                <div style={{
                  ...styles.tierLevel,
                  color: isCurrent ? '#00ff88' : isUnlocked ? '#ffffff' : '#666',
                  background: isCurrent ? 'rgba(0,255,136,0.15)' : 'transparent',
                }}>
                  {tier.level}
                </div>

                {/* Premium reward */}
                <div style={{
                  ...styles.rewardSlot,
                  ...styles.premiumSlot,
                  ...(canClaimPremium ? { animation: 'bp-claim-pulse 1.5s ease-in-out infinite' } : {}),
                  ...(premiumClaimed ? styles.claimedSlot : {}),
                  opacity: !state.isPremium && !tier.premiumReward ? 0.2 : 1,
                }} onClick={() => canClaimPremium && handleClaimPremium(tier.level)}>
                  {tier.premiumReward ? (
                    <>
                      <span style={styles.rewardIcon}>{tier.premiumReward.icon}</span>
                      <span style={styles.rewardLabel}>{tier.premiumReward.label}</span>
                      {premiumClaimed && <span style={styles.claimed}>&#x2713;</span>}
                      {canClaimPremium && <span style={styles.claimTag}>CLAIM</span>}
                    </>
                  ) : (
                    <span style={{ color: '#333', fontSize: '10px' }}>--</span>
                  )}
                </div>

                {/* Progress connector */}
                <div style={{
                  ...styles.connector,
                  background: isUnlocked
                    ? 'linear-gradient(180deg, #ffcc00, #00ff88)'
                    : 'linear-gradient(180deg, #333, #222)',
                }} />

                {/* Free reward */}
                <div style={{
                  ...styles.rewardSlot,
                  ...styles.freeSlot,
                  ...(canClaimFree ? { animation: 'bp-claim-pulse 1.5s ease-in-out infinite' } : {}),
                  ...(freeClaimed ? styles.claimedSlot : {}),
                }} onClick={() => canClaimFree && handleClaimFree(tier.level)}>
                  {tier.freeReward ? (
                    <>
                      <span style={styles.rewardIcon}>{tier.freeReward.icon}</span>
                      <span style={styles.rewardLabel}>{tier.freeReward.label}</span>
                      {freeClaimed && <span style={styles.claimed}>&#x2713;</span>}
                      {canClaimFree && <span style={styles.claimTag}>CLAIM</span>}
                    </>
                  ) : (
                    <span style={{ color: '#333', fontSize: '10px' }}>--</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Track labels */}
      <div style={styles.trackLabels}>
        <div style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: '11px' }}>PREMIUM TRACK</div>
        <div style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '11px' }}>FREE TRACK</div>
      </div>

      {/* Season History */}
      {state.seasonHistory.length > 0 && (
        <div style={styles.historySection}>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '6px' }}>Past Seasons</div>
          <div style={styles.historyRow}>
            {state.seasonHistory.map((s, i) => (
              <div key={i} style={styles.historyItem}>
                <span style={{ color: '#aaa', fontSize: '11px' }}>{s.seasonName}</span>
                <span style={{ color: '#ffcc00', fontSize: '13px', fontWeight: 'bold' }}>Lv.{s.finalLevel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: '#040410',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', flexShrink: 0,
  },
  backBtn: {
    background: 'transparent', border: '1px solid #444466',
    borderRadius: '8px', padding: '8px 16px', color: '#888',
    fontSize: '14px', cursor: 'pointer',
  },
  headerCenter: { textAlign: 'center', flex: 1 },
  title: {
    fontSize: '22px', fontWeight: 'bold', color: '#ffcc00',
    margin: 0, letterSpacing: '2px',
    textShadow: '0 0 12px rgba(255,204,0,0.3)',
  },
  seasonInfo: { fontSize: '12px', color: '#888899', marginTop: '4px' },
  levelBadge: {
    width: '60px', height: '60px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a2a3a 0%, #0a1520 100%)',
    border: '3px solid #ffcc00', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    boxShadow: '0 0 16px rgba(255,204,0,0.3)',
  },
  levelNumber: { fontSize: '22px', fontWeight: 'bold', color: '#ffcc00', lineHeight: 1 },
  levelLabel: { fontSize: '8px', color: '#998800', letterSpacing: '1px' },
  xpBarContainer: {
    padding: '0 20px 12px', flexShrink: 0,
  },
  xpBarOuter: {
    width: '100%', height: '24px', borderRadius: '12px',
    background: '#1a1a33', border: '1px solid #333355',
    position: 'relative', overflow: 'hidden',
  },
  xpBarInner: {
    height: '100%', borderRadius: '12px',
    background: 'linear-gradient(90deg, #00cc66, #00ff88, #44ffaa)',
    transition: 'width 0.5s ease',
    boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
  },
  xpBarText: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontSize: '12px', fontWeight: 'bold', color: '#ffffff',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  xpTotal: { fontSize: '11px', color: '#666688', textAlign: 'right', marginTop: '4px' },
  premiumBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', background: 'linear-gradient(90deg, rgba(255,204,0,0.08), rgba(255,170,0,0.04))',
    borderTop: '1px solid rgba(255,204,0,0.2)', borderBottom: '1px solid rgba(255,204,0,0.2)',
    flexShrink: 0, flexWrap: 'wrap', gap: '8px',
  } as React.CSSProperties,
  premiumText: { fontSize: '13px', color: '#cccccc', flex: 1 },
  premiumBtn: {
    background: 'linear-gradient(135deg, #ffcc00, #ffaa00)',
    border: 'none', borderRadius: '8px', padding: '10px 20px',
    fontSize: '14px', fontWeight: 'bold', color: '#000',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(255,204,0,0.3)',
    whiteSpace: 'nowrap', marginLeft: '16px',
  },
  unclaimedBar: {
    textAlign: 'center', padding: '8px', fontSize: '13px', fontWeight: 'bold',
    background: 'rgba(0,0,0,0.3)', flexShrink: 0,
  },
  trackContainer: {
    flex: 1, overflow: 'hidden', padding: '8px 0',
  },
  trackScroll: {
    display: 'flex', overflowX: 'auto', overflowY: 'hidden',
    gap: '2px', padding: '0 20px', height: '100%',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x proximity',
  } as React.CSSProperties,
  tierColumn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', minWidth: '80px', flexShrink: 0, transition: 'opacity 0.3s',
    scrollSnapAlign: 'center',
  } as React.CSSProperties,
  tierCurrent: {
    background: 'rgba(0,255,136,0.03)', borderRadius: '8px',
    border: '1px solid rgba(0,255,136,0.2)',
  },
  tierLevel: {
    fontSize: '14px', fontWeight: 'bold', borderRadius: '6px',
    padding: '2px 8px', textAlign: 'center',
  },
  rewardSlot: {
    width: '72px', minHeight: '56px', borderRadius: '8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '2px', cursor: 'pointer',
    padding: '4px', position: 'relative', transition: 'transform 0.15s',
  },
  premiumSlot: {
    background: 'linear-gradient(135deg, rgba(255,204,0,0.08) 0%, rgba(255,170,0,0.04) 100%)',
    border: '1px solid rgba(255,204,0,0.2)',
  },
  freeSlot: {
    background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,204,102,0.03) 100%)',
    border: '1px solid rgba(0,255,136,0.15)',
  },
  claimedSlot: {
    opacity: 0.5, background: 'rgba(0,0,0,0.2)',
    border: '1px solid #222244',
  },
  connector: {
    width: '4px', height: '12px', borderRadius: '2px', flexShrink: 0,
  },
  rewardIcon: { fontSize: '18px' },
  rewardLabel: {
    fontSize: '8px', color: '#aaaacc', textAlign: 'center',
    lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden',
    textOverflow: 'ellipsis', maxWidth: '68px',
  },
  claimed: {
    position: 'absolute', top: '2px', right: '4px',
    fontSize: '12px', color: '#00ff88',
  },
  claimTag: {
    position: 'absolute', bottom: '-2px',
    fontSize: '8px', fontWeight: 'bold', color: '#ffcc00',
    background: 'rgba(0,0,0,0.8)', borderRadius: '4px', padding: '1px 4px',
    letterSpacing: '0.5px',
  },
  trackLabels: {
    display: 'flex', justifyContent: 'space-around', padding: '4px 20px',
    flexShrink: 0,
  },
  historySection: {
    padding: '8px 20px 12px', flexShrink: 0,
    borderTop: '1px solid #1a1a33',
  },
  historyRow: {
    display: 'flex', gap: '8px', overflowX: 'auto',
  },
  historyItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '2px', padding: '6px 10px', background: 'rgba(255,255,255,0.02)',
    borderRadius: '6px', border: '1px solid #222244', flexShrink: 0,
  },
};

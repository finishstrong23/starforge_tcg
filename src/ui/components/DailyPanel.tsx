/**
 * STARFORGE TCG - Daily Quests & Login Rewards Panel
 *
 * Slide-out panel showing:
 * - Login streak with today's reward
 * - 3 daily quests with progress bars
 * - Gold balance display
 * Self-contained state management via localStorage.
 */

import React, { useState, useCallback } from 'react';
import type { DailyState, DailyQuest } from '../../progression/DailyQuests';
import { claimLoginReward, claimQuestReward, loadDailyState, saveDailyState } from '../../progression/DailyQuests';
import { hapticTap } from '../capacitor';

interface DailyPanelProps {
  onClose: () => void;
}

export const DailyPanel: React.FC<DailyPanelProps> = ({ onClose }) => {
  const [state, setState] = useState<DailyState>(loadDailyState);
  const [claimAnim, setClaimAnim] = useState<string | null>(null);

  const handleClaimLogin = useCallback(() => {
    if (state.loginRewardClaimed) return;
    hapticTap();
    setClaimAnim('login');
    const updated = claimLoginReward(state);
    saveDailyState(updated);
    setTimeout(() => {
      setState(updated);
      setClaimAnim(null);
    }, 400);
  }, [state]);

  const handleClaimQuest = useCallback((questId: string) => {
    hapticTap();
    setClaimAnim(questId);
    const updated = claimQuestReward(state, questId);
    saveDailyState(updated);
    setTimeout(() => {
      setState(updated);
      setClaimAnim(null);
    }, 400);
  }, [state]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <style>{`
          @keyframes dp-coin-pop {
            0% { transform: scale(0.5); opacity: 0; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes dp-claim-flash {
            0% { background-color: rgba(255, 204, 0, 0); }
            50% { background-color: rgba(255, 204, 0, 0.15); }
            100% { background-color: rgba(255, 204, 0, 0); }
          }
        `}</style>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Daily Rewards</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Gold balance */}
        <div style={styles.goldBar}>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="9" fill="#cc9900" stroke="#ffcc00" strokeWidth="1" />
            <text x="10" y="14" textAnchor="middle" fill="#ffee88" fontSize="10" fontWeight="bold">$</text>
          </svg>
          <span style={styles.goldAmount}>{state.gold}</span>
          <span style={styles.goldLabel}>Gold</span>
        </div>

        {/* Login Streak */}
        <div style={{
          ...styles.section,
          ...(claimAnim === 'login' ? { animation: 'dp-claim-flash 0.4s ease-out' } : {}),
        }}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Login Streak</span>
            <span style={styles.streakBadge}>Day {state.loginStreak}</span>
          </div>
          <div style={styles.loginRow}>
            <span style={styles.loginText}>
              {state.loginRewardClaimed
                ? 'Claimed today!'
                : `+${state.loginRewardAmount} gold waiting`}
            </span>
            <button
              style={{
                ...styles.claimBtn,
                ...(state.loginRewardClaimed ? styles.claimBtnDisabled : {}),
              }}
              onClick={handleClaimLogin}
              disabled={state.loginRewardClaimed}
            >
              {state.loginRewardClaimed ? 'Claimed' : `Claim +${state.loginRewardAmount}`}
            </button>
          </div>
          {/* Streak dots */}
          <div style={styles.streakDots}>
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <div key={day} style={{
                ...styles.streakDot,
                background: day <= (state.loginStreak % 7 || 7)
                  ? 'linear-gradient(135deg, #ffcc00 0%, #ff8800 100%)'
                  : '#222244',
                borderColor: day <= (state.loginStreak % 7 || 7) ? '#ffdd44' : '#444466',
              }}>
                <span style={{ fontSize: '8px', color: day <= (state.loginStreak % 7 || 7) ? '#fff' : '#666' }}>
                  {day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Quests */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Daily Quests</span>
          </div>
          {state.quests.map(quest => (
            <QuestRow
              key={quest.id}
              quest={quest}
              isAnimating={claimAnim === quest.id}
              onClaim={() => handleClaimQuest(quest.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const QuestRow: React.FC<{
  quest: DailyQuest;
  isAnimating: boolean;
  onClaim: () => void;
}> = ({ quest, isAnimating, onClaim }) => {
  const progress = Math.min(1, quest.progress / quest.target);

  return (
    <div style={{
      ...styles.questRow,
      ...(isAnimating ? { animation: 'dp-claim-flash 0.4s ease-out' } : {}),
    }}>
      <div style={styles.questInfo}>
        <span style={styles.questDesc}>{quest.description}</span>
        <div style={styles.progressBarBg}>
          <div style={{
            ...styles.progressBarFill,
            width: `${progress * 100}%`,
            background: quest.completed
              ? 'linear-gradient(90deg, #00cc66 0%, #00ff88 100%)'
              : 'linear-gradient(90deg, #0066cc 0%, #0088ff 100%)',
          }} />
        </div>
        <span style={styles.questProgress}>{quest.progress}/{quest.target}</span>
      </div>
      <div style={styles.questReward}>
        {quest.completed && !quest.claimed ? (
          <button style={styles.claimBtn} onClick={onClaim}>+{quest.reward}</button>
        ) : quest.claimed ? (
          <span style={styles.claimedText}>Done</span>
        ) : (
          <span style={styles.rewardText}>{quest.reward} g</span>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(4px)',
  },
  panel: {
    width: '380px', maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
    background: 'linear-gradient(135deg, #12122e 0%, #0a0a1e 100%)',
    border: '2px solid #333366', borderRadius: '16px',
    padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  } as React.CSSProperties,
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  title: {
    fontSize: '22px', fontWeight: 'bold', color: '#ffcc00',
    margin: 0, letterSpacing: '1px',
    textShadow: '0 0 10px rgba(255,204,0,0.3)',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#888',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px',
  },
  goldBar: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(204,153,0,0.1)', border: '1px solid #664400',
    borderRadius: '10px', padding: '8px 14px',
  },
  goldAmount: {
    fontSize: '20px', fontWeight: 'bold', color: '#ffcc00',
    textShadow: '0 0 6px rgba(255,204,0,0.3)',
  },
  goldLabel: { fontSize: '13px', color: '#aa8844' },
  section: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid #222244',
    borderRadius: '12px', padding: '14px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '14px', fontWeight: 'bold', color: '#8888bb',
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  streakBadge: {
    fontSize: '13px', fontWeight: 'bold', color: '#ffcc00',
    background: 'rgba(255,204,0,0.1)', padding: '2px 10px',
    borderRadius: '10px', border: '1px solid #664400',
  },
  loginRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  loginText: { fontSize: '14px', color: '#ccccdd' },
  streakDots: {
    display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '4px',
  },
  streakDot: {
    width: '28px', height: '28px', borderRadius: '50%',
    border: '2px solid', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    transition: 'all 0.3s ease',
  },
  questRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 0', borderBottom: '1px solid #1a1a33',
  },
  questInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  questDesc: { fontSize: '13px', color: '#ccccdd' },
  progressBarBg: {
    width: '100%', height: '6px', background: '#1a1a33',
    borderRadius: '3px', overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', borderRadius: '3px', transition: 'width 0.5s ease',
  },
  questProgress: { fontSize: '11px', color: '#888899' },
  questReward: { flexShrink: 0 },
  claimBtn: {
    background: 'linear-gradient(135deg, #cc9900 0%, #aa7700 100%)',
    border: '1px solid #ffcc00', borderRadius: '8px',
    padding: '5px 12px', fontSize: '13px', fontWeight: 'bold',
    color: '#ffffff', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(204,153,0,0.3)',
  },
  claimBtnDisabled: {
    background: '#222244', border: '1px solid #444466',
    color: '#666688', cursor: 'default', boxShadow: 'none',
  },
  claimedText: { fontSize: '12px', color: '#44aa66', fontWeight: 'bold' },
  rewardText: { fontSize: '12px', color: '#888899' },
};

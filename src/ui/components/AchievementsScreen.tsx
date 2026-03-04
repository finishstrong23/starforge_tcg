/**
 * STARFORGE TCG - Achievements Screen
 *
 * Displays achievements grouped by category with progress bars,
 * tier badges, and claim buttons for rewards.
 * Self-contained state management via localStorage.
 */

import React, { useState, useCallback } from 'react';
import {
  type AchievementState,
  type AchievementCategory,
  type Achievement,
  getAchievementsByCategory,
  claimAchievementReward,
  loadAchievements,
  saveAchievements,
} from '../../progression/Achievements';
import { loadDailyState, addGold, saveDailyState } from '../../progression/DailyQuests';
import { hapticTap } from '../capacitor';
import { SpaceBackground } from './SpaceBackground';

interface AchievementsScreenProps {
  onBack: () => void;
}

const CATEGORY_LABELS: Record<AchievementCategory, { name: string; color: string }> = {
  combat: { name: 'Combat', color: '#ff4444' },
  campaign: { name: 'Campaign', color: '#ff8800' },
  collection: { name: 'Collection', color: '#aa44ff' },
  mastery: { name: 'Mastery', color: '#00ccff' },
};

const TIER_COLORS: Record<number, string> = { 1: '#cc8855', 2: '#aabbcc', 3: '#ffcc00' };
const TIER_NAMES: Record<number, string> = { 1: 'Bronze', 2: 'Silver', 3: 'Gold' };

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ onBack }) => {
  const [state, setState] = useState<AchievementState>(loadAchievements);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>('combat');
  const grouped = getAchievementsByCategory(state);

  const handleClaim = useCallback((achievementId: string) => {
    hapticTap();
    const { state: newState, goldReward } = claimAchievementReward(state, achievementId);
    saveAchievements(newState);
    setState(newState);
    if (goldReward > 0) {
      const daily = loadDailyState();
      const updated = addGold(daily, goldReward);
      saveDailyState(updated);
    }
  }, [state]);

  const totalCount = state.achievements.length;
  const unlockedCount = state.totalUnlocked;

  return (
    <div style={styles.container}>
      <SpaceBackground />
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>Back</button>
        <div>
          <h1 style={styles.title}>Achievements</h1>
          <div style={styles.progressSummary}>
            {unlockedCount}/{totalCount} unlocked
          </div>
        </div>
        <div style={{ width: '60px' }} /> {/* spacer */}
      </div>

      {/* Overall progress bar */}
      <div style={styles.overallBarBg}>
        <div style={{
          ...styles.overallBarFill,
          width: `${(unlockedCount / totalCount) * 100}%`,
        }} />
      </div>

      {/* Category tabs */}
      <div style={styles.tabs}>
        {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map(cat => {
          const info = CATEGORY_LABELS[cat];
          const isActive = activeCategory === cat;
          const catAchievements = grouped[cat];
          const unclaimed = catAchievements.filter(a => a.unlocked && !a.claimed).length;
          return (
            <button key={cat} style={{
              ...styles.tab,
              borderColor: isActive ? info.color : 'transparent',
              color: isActive ? info.color : '#666688',
              background: isActive ? `${info.color}11` : 'transparent',
            }} onClick={() => setActiveCategory(cat)}>
              {info.name}
              {unclaimed > 0 && (
                <span style={styles.unclaimedBadge}>{unclaimed}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Achievement list */}
      <div style={styles.list}>
        {grouped[activeCategory].map(achievement => (
          <AchievementRow
            key={achievement.id}
            achievement={achievement}
            categoryColor={CATEGORY_LABELS[activeCategory].color}
            onClaim={() => handleClaim(achievement.id)}
          />
        ))}
      </div>
    </div>
  );
};

const AchievementRow: React.FC<{
  achievement: Achievement;
  categoryColor: string;
  onClaim: () => void;
}> = ({ achievement, categoryColor, onClaim }) => {
  const progress = Math.min(1, achievement.progress / achievement.target);
  const tierColor = TIER_COLORS[achievement.tier];
  const canClaim = achievement.unlocked && !achievement.claimed;

  return (
    <div style={{
      ...styles.row,
      opacity: achievement.claimed ? 0.6 : 1,
      borderLeftColor: achievement.unlocked ? tierColor : '#222244',
    }}>
      {/* Tier badge */}
      <div style={{
        ...styles.tierBadge,
        background: achievement.unlocked
          ? `linear-gradient(135deg, ${tierColor} 0%, ${tierColor}aa 100%)`
          : '#1a1a2e',
        borderColor: achievement.unlocked ? tierColor : '#333355',
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          {achievement.unlocked ? (
            <polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8"
              fill={achievement.tier === 3 ? '#fff' : '#ddd'}
              opacity="0.9" />
          ) : (
            <circle cx="10" cy="10" r="6" fill="none" stroke="#555" strokeWidth="1" strokeDasharray="2,2" />
          )}
        </svg>
      </div>

      {/* Content */}
      <div style={styles.rowContent}>
        <div style={styles.rowHeader}>
          <span style={{
            ...styles.achName,
            color: achievement.unlocked ? '#ffffff' : '#888899',
          }}>
            {achievement.name}
          </span>
          <span style={{ ...styles.tierLabel, color: tierColor }}>
            {TIER_NAMES[achievement.tier]}
          </span>
        </div>
        <div style={styles.achDesc}>{achievement.description}</div>
        {!achievement.unlocked && (
          <div style={styles.progressRow}>
            <div style={styles.progressBg}>
              <div style={{
                ...styles.progressFill,
                width: `${progress * 100}%`,
                background: categoryColor,
              }} />
            </div>
            <span style={styles.progressText}>{achievement.progress}/{achievement.target}</span>
          </div>
        )}
      </div>

      {/* Reward/Claim */}
      <div style={styles.rewardArea}>
        {canClaim ? (
          <button style={styles.claimBtn} onClick={onClaim}>
            +{achievement.reward}g
          </button>
        ) : achievement.claimed ? (
          <span style={styles.claimedIcon}>✓</span>
        ) : (
          <span style={styles.rewardPreview}>{achievement.reward}g</span>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    background: '#040410',
    overflow: 'auto', padding: '16px',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  } as React.CSSProperties,
  header: {
    width: '100%', maxWidth: '700px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'transparent', border: '1px solid #444466',
    borderRadius: '8px', padding: '8px 16px', color: '#888',
    fontSize: '14px', cursor: 'pointer',
  },
  title: {
    fontSize: '28px', fontWeight: 'bold', color: '#ffcc00',
    margin: 0, textAlign: 'center', letterSpacing: '2px',
  },
  progressSummary: {
    fontSize: '13px', color: '#888899', textAlign: 'center',
  },
  overallBarBg: {
    width: '100%', maxWidth: '700px', height: '6px',
    background: '#1a1a2e', borderRadius: '3px',
    overflow: 'hidden', marginBottom: '20px',
  },
  overallBarFill: {
    height: '100%', borderRadius: '3px',
    background: 'linear-gradient(90deg, #ffcc00 0%, #ff8800 100%)',
    transition: 'width 0.5s ease',
  },
  tabs: {
    display: 'flex', gap: '4px', marginBottom: '16px',
    width: '100%', maxWidth: '700px',
  },
  tab: {
    flex: 1, padding: '10px', border: 'none',
    borderBottom: '3px solid', borderRadius: '8px 8px 0 0',
    background: 'transparent', fontSize: '13px',
    fontWeight: 'bold', cursor: 'pointer', minHeight: '44px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
  },
  unclaimedBadge: {
    background: '#ff4444', color: '#fff', fontSize: '10px',
    fontWeight: 'bold', padding: '1px 6px', borderRadius: '8px',
  },
  list: {
    width: '100%', maxWidth: '700px', display: 'flex',
    flexDirection: 'column', gap: '8px',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'rgba(255,255,255,0.02)', border: '1px solid #1a1a33',
    borderLeft: '4px solid', borderRadius: '10px', padding: '12px',
    transition: 'opacity 0.3s ease',
  },
  tierBadge: {
    width: '36px', height: '36px', borderRadius: '8px',
    border: '2px solid', display: 'flex',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  rowContent: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '4px',
  },
  rowHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  achName: { fontSize: '14px', fontWeight: 'bold' },
  tierLabel: { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' },
  achDesc: { fontSize: '12px', color: '#888899', lineHeight: '1.3' },
  progressRow: {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px',
  },
  progressBg: {
    flex: 1, height: '5px', background: '#1a1a33',
    borderRadius: '3px', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '3px', transition: 'width 0.5s ease',
  },
  progressText: { fontSize: '11px', color: '#666688', minWidth: '40px' },
  rewardArea: { flexShrink: 0, textAlign: 'center' },
  claimBtn: {
    background: 'linear-gradient(135deg, #cc9900 0%, #aa7700 100%)',
    border: '1px solid #ffcc00', borderRadius: '8px',
    padding: '6px 12px', fontSize: '13px', fontWeight: 'bold',
    color: '#fff', cursor: 'pointer',
  },
  claimedIcon: { fontSize: '18px', color: '#44aa66' },
  rewardPreview: { fontSize: '12px', color: '#666688' },
};

/**
 * STARFORGE TCG - Arena Results Screen
 *
 * Shows arena run progress (wins/losses) and rewards when complete.
 */

import React from 'react';
import { SpaceBackground } from './SpaceBackground';

interface ArenaResultsProps {
  wins: number;
  losses: number;
  isComplete: boolean;
  onPlayGame: () => void;
  onClaimRewards: () => void;
  onBack: () => void;
}

const MAX_WINS = 12;
const MAX_LOSSES = 3;

const REWARD_TABLE: Record<number, { gold: number; packs: number; dust: number }> = {
  0:  { gold: 25,  packs: 1, dust: 0 },
  1:  { gold: 35,  packs: 1, dust: 10 },
  2:  { gold: 45,  packs: 1, dust: 20 },
  3:  { gold: 60,  packs: 1, dust: 25 },
  4:  { gold: 80,  packs: 1, dust: 30 },
  5:  { gold: 100, packs: 1, dust: 40 },
  6:  { gold: 130, packs: 1, dust: 50 },
  7:  { gold: 160, packs: 1, dust: 60 },
  8:  { gold: 200, packs: 2, dust: 80 },
  9:  { gold: 240, packs: 2, dust: 100 },
  10: { gold: 280, packs: 2, dust: 120 },
  11: { gold: 340, packs: 2, dust: 150 },
  12: { gold: 400, packs: 3, dust: 200 },
};

export const ArenaResults: React.FC<ArenaResultsProps> = ({
  wins, losses, isComplete, onPlayGame, onClaimRewards, onBack,
}) => {
  const rewards = REWARD_TABLE[wins] || REWARD_TABLE[0];

  return (
    <div style={arStyles.container}>
      <SpaceBackground />
      <div style={arStyles.card}>
        <h1 style={arStyles.title}>Arena Run</h1>

        {/* Win/Loss display */}
        <div style={arStyles.record}>
          <div style={arStyles.recordSection}>
            <div style={arStyles.recordLabel}>Wins</div>
            <div style={arStyles.winBoxes}>
              {Array.from({ length: MAX_WINS }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...arStyles.recordBox,
                    background: i < wins ? '#44cc44' : '#1a1a2e',
                    borderColor: i < wins ? '#44cc44' : '#333355',
                    boxShadow: i < wins ? '0 0 8px rgba(68, 204, 68, 0.3)' : 'none',
                  }}
                />
              ))}
            </div>
            <div style={arStyles.recordCount}>{wins} / {MAX_WINS}</div>
          </div>

          <div style={arStyles.recordSection}>
            <div style={arStyles.recordLabel}>Losses</div>
            <div style={arStyles.lossBoxes}>
              {Array.from({ length: MAX_LOSSES }, (_, i) => (
                <div
                  key={i}
                  style={{
                    ...arStyles.recordBox,
                    ...arStyles.lossBox,
                    background: i < losses ? '#cc4444' : '#1a1a2e',
                    borderColor: i < losses ? '#cc4444' : '#333355',
                    boxShadow: i < losses ? '0 0 8px rgba(204, 68, 68, 0.3)' : 'none',
                  }}
                />
              ))}
            </div>
            <div style={arStyles.recordCount}>{losses} / {MAX_LOSSES}</div>
          </div>
        </div>

        {/* Rewards preview */}
        <div style={arStyles.rewardsSection}>
          <h3 style={arStyles.rewardsTitle}>
            {isComplete ? 'Rewards Earned' : 'Current Rewards'}
          </h3>
          <div style={arStyles.rewardsList}>
            <div style={arStyles.rewardItem}>
              <span style={arStyles.rewardIcon}>G</span>
              <span style={arStyles.rewardValue}>{rewards.gold} Gold</span>
            </div>
            <div style={arStyles.rewardItem}>
              <span style={{ ...arStyles.rewardIcon, background: '#8844ff' }}>P</span>
              <span style={arStyles.rewardValue}>{rewards.packs} Pack{rewards.packs > 1 ? 's' : ''}</span>
            </div>
            {rewards.dust > 0 && (
              <div style={arStyles.rewardItem}>
                <span style={{ ...arStyles.rewardIcon, background: '#44aaff' }}>S</span>
                <span style={arStyles.rewardValue}>{rewards.dust} Stardust</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={arStyles.actions}>
          {isComplete ? (
            <>
              <button style={arStyles.claimBtn} onClick={onClaimRewards}>
                Claim Rewards
              </button>
              <button style={arStyles.backBtn} onClick={onBack}>
                Back to Menu
              </button>
            </>
          ) : (
            <>
              <button style={arStyles.playBtn} onClick={onPlayGame}>
                Play Next Game
              </button>
              <button style={arStyles.backBtn} onClick={onBack}>
                Back to Menu
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const arStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#040410',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    maxWidth: '500px',
    width: '90%',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '2px solid #333366',
    borderRadius: '20px',
    padding: '32px',
  },
  title: {
    textAlign: 'center',
    fontSize: '28px',
    color: '#ffaa00',
    margin: '0 0 24px',
    letterSpacing: '2px',
    textShadow: '0 0 15px rgba(255, 170, 0, 0.3)',
  },
  record: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  recordSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  recordLabel: {
    width: '60px',
    fontSize: '14px',
    color: '#888899',
    fontWeight: 'bold',
  },
  winBoxes: {
    display: 'flex',
    gap: '4px',
    flex: 1,
  },
  lossBoxes: {
    display: 'flex',
    gap: '6px',
    flex: 1,
  },
  recordBox: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid',
    transition: 'all 0.3s ease',
  },
  lossBox: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
  },
  recordCount: {
    fontSize: '14px',
    color: '#666688',
    width: '50px',
    textAlign: 'right',
  },
  rewardsSection: {
    background: '#0a0a18',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
  },
  rewardsTitle: {
    fontSize: '14px',
    color: '#888899',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 12px',
    textAlign: 'center',
  },
  rewardsList: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
  },
  rewardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rewardIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#ffaa00',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#000',
  },
  rewardValue: {
    fontSize: '14px',
    color: '#ccccdd',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  playBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
  },
  claimBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(255, 170, 0, 0.3)',
  },
  backBtn: {
    width: '100%',
    padding: '12px',
    background: '#333355',
    border: '1px solid #555577',
    borderRadius: '10px',
    color: '#aaaacc',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

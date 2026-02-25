/**
 * STARFORGE TCG - Turn Timer Component
 *
 * 30 second countdown timer that auto-ends turn when it expires
 */

import React, { useEffect, useState } from 'react';

interface TurnTimerProps {
  isPlayerTurn: boolean;
  turnNumber: number;
  onTimeUp: () => void;
  maxTime?: number; // seconds
}

export const TurnTimer: React.FC<TurnTimerProps> = ({
  isPlayerTurn,
  turnNumber,
  onTimeUp,
  maxTime = 30,
}) => {
  const [timeLeft, setTimeLeft] = useState(maxTime);

  useEffect(() => {
    console.log('[TurnTimer] Effect triggered - turn:', turnNumber, 'isPlayerTurn:', isPlayerTurn);

    // Reset timer when turn changes
    setTimeLeft(maxTime);

    if (!isPlayerTurn) {
      // Don't start interval for opponent turn
      return;
    }

    // Start countdown interval
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        console.log('[TurnTimer] tick:', prev);
        if (prev <= 1) {
          clearInterval(interval);
          // Time's up - end turn
          setTimeout(() => onTimeUp(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup: interval captured in closure
    return () => {
      console.log('[TurnTimer] Cleanup - clearing interval');
      clearInterval(interval);
    };
  }, [turnNumber, isPlayerTurn, maxTime, onTimeUp]);

  // Calculate percentage for progress bar
  const percentage = (timeLeft / maxTime) * 100;

  // Color changes as time runs out
  let color = '#00ff88';
  if (timeLeft <= 10) {
    color = '#ff3333';
  } else if (timeLeft <= 20) {
    color = '#ffcc00';
  }

  return (
    <div style={styles.container}>
      <div style={styles.timerBox}>
        <div style={styles.timeText}>
          <span style={{ color }}>{isPlayerTurn ? timeLeft : '--'}</span>
        </div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: isPlayerTurn ? `${percentage}%` : '100%',
              backgroundColor: isPlayerTurn ? color : '#666',
            }}
          />
        </div>
        <div style={styles.label}>
          {isPlayerTurn ? 'Your Turn' : "Opponent's Turn"}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBox: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #444466',
    borderRadius: '12px',
    padding: '10px 20px',
    minWidth: '150px',
    textAlign: 'center',
  },
  timeText: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    background: '#333344',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '5px',
  },
  progressFill: {
    height: '100%',
    transition: 'width 1s linear, background-color 0.3s',
    borderRadius: '3px',
  },
  label: {
    fontSize: '12px',
    color: '#aaaaaa',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
};

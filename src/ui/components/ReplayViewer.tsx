/**
 * STARFORGE TCG - Replay Viewer
 *
 * Browse saved game replays with action-by-action playback,
 * bookmark management, and replay statistics.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { hapticTap } from '../capacitor';
import { RaceData } from '../../types/Race';
import {
  type GameReplay,
  type ReplayAction,
  loadReplayState,
  toggleBookmark,
  deleteReplay,
  renameReplay,
  getReplayStats,
  formatDuration,
} from '../../progression/ReplaySystem';

interface ReplayViewerProps {
  onBack: () => void;
}

type FilterMode = 'all' | 'quickplay' | 'campaign' | 'pvp' | 'tournament' | 'bookmarked';

export const ReplayViewer: React.FC<ReplayViewerProps> = ({ onBack }) => {
  const [replays, setReplays] = useState<GameReplay[]>([]);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedReplay, setSelectedReplay] = useState<GameReplay | null>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    refreshReplays();
  }, []);

  const refreshReplays = () => {
    const state = loadReplayState();
    setReplays(state.replays);
  };

  const filteredReplays = replays.filter(r => {
    if (filter === 'bookmarked') return r.bookmarked;
    if (filter === 'all') return true;
    return r.mode === filter;
  });

  const stats = getReplayStats();

  // Playback controls
  const startPlayback = useCallback(() => {
    if (!selectedReplay) return;
    hapticTap();
    setIsPlaying(true);
  }, [selectedReplay]);

  const pausePlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackRef.current) clearTimeout(playbackRef.current);
  }, []);

  const resetPlayback = useCallback(() => {
    setPlaybackIndex(0);
    setIsPlaying(false);
    if (playbackRef.current) clearTimeout(playbackRef.current);
  }, []);

  useEffect(() => {
    if (!isPlaying || !selectedReplay) return;
    if (playbackIndex >= selectedReplay.actions.length) {
      setIsPlaying(false);
      return;
    }

    const delay = Math.max(200, 1000 / playbackSpeed);
    playbackRef.current = setTimeout(() => {
      setPlaybackIndex(prev => prev + 1);
    }, delay);

    return () => {
      if (playbackRef.current) clearTimeout(playbackRef.current);
    };
  }, [isPlaying, playbackIndex, selectedReplay, playbackSpeed]);

  const handleToggleBookmark = (id: string) => {
    toggleBookmark(id);
    refreshReplays();
  };

  const handleDelete = (id: string) => {
    deleteReplay(id);
    if (selectedReplay?.id === id) {
      setSelectedReplay(null);
    }
    refreshReplays();
  };

  const handleRename = (id: string) => {
    const name = prompt('Enter replay name:');
    if (name) {
      renameReplay(id, name);
      refreshReplays();
    }
  };

  // Detail / playback view
  if (selectedReplay) {
    const actions = selectedReplay.actions;
    const visibleActions = actions.slice(0, playbackIndex + 1);
    const currentTurn = visibleActions.length > 0 ? visibleActions[visibleActions.length - 1].turn : 0;

    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.header}>
            <h1 style={styles.title}>
              {selectedReplay.label || `${RaceData[selectedReplay.playerRace].name} vs ${RaceData[selectedReplay.opponentRace].name}`}
            </h1>
            <p style={styles.subtitle}>
              {selectedReplay.won ? 'Victory' : 'Defeat'} — {selectedReplay.turnCount} turns — {formatDuration(selectedReplay.durationSeconds)}
            </p>
          </div>

          {/* Playback Controls */}
          <div style={styles.controlBar}>
            <button style={styles.controlBtn} onClick={resetPlayback}>|&lt;</button>
            <button style={styles.controlBtn} onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 1))}>&lt;</button>
            <button style={styles.controlBtn} onClick={isPlaying ? pausePlayback : startPlayback}>
              {isPlaying ? '||' : '\u25B6'}
            </button>
            <button style={styles.controlBtn} onClick={() => setPlaybackIndex(Math.min(actions.length - 1, playbackIndex + 1))}>&gt;</button>
            <button style={styles.controlBtn} onClick={() => setPlaybackIndex(actions.length - 1)}>&gt;|</button>
            <div style={styles.speedControl}>
              {[0.5, 1, 2, 4].map(speed => (
                <button
                  key={speed}
                  style={{
                    ...styles.speedBtn,
                    background: playbackSpeed === speed ? '#00ff88' : '#333',
                    color: playbackSpeed === speed ? '#000' : '#fff',
                  }}
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressTrack}>
              <div style={{
                ...styles.progressFill,
                width: `${actions.length > 0 ? ((playbackIndex + 1) / actions.length) * 100 : 0}%`,
              }} />
            </div>
            <div style={styles.progressLabel}>
              Action {playbackIndex + 1} / {actions.length} — Turn {currentTurn}
            </div>
          </div>

          {/* Action Log */}
          <div style={styles.actionLog}>
            {visibleActions.length === 0 ? (
              <div style={styles.emptyText}>Press play to start replay</div>
            ) : (
              visibleActions.map((action, i) => (
                <ActionLine key={i} action={action} isCurrent={i === playbackIndex} />
              ))
            )}
          </div>

          {/* Match Summary */}
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <div style={{ color: '#00ff88', fontWeight: 'bold' }}>You ({RaceData[selectedReplay.playerRace].name})</div>
              <div style={{ color: '#fff', fontSize: '24px' }}>{selectedReplay.playerHealthFinal} HP</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ color: '#ff4444', fontWeight: 'bold' }}>Opponent ({RaceData[selectedReplay.opponentRace].name})</div>
              <div style={{ color: '#fff', fontSize: '24px' }}>{selectedReplay.opponentHealthFinal} HP</div>
            </div>
          </div>

          <button style={styles.backButton} onClick={() => { setSelectedReplay(null); resetPlayback(); }}>
            Back to Replays
          </button>
        </div>
      </div>
    );
  }

  // Replay browser view
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Replay Theater</h1>
          <p style={styles.subtitle}>Review your past battles action by action</p>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}><div style={styles.statValue}>{stats.totalReplays}</div><div style={styles.statLabel}>Replays</div></div>
          <div style={styles.statItem}><div style={styles.statValue}>{stats.totalWins}W / {stats.totalLosses}L</div><div style={styles.statLabel}>Record</div></div>
          <div style={styles.statItem}><div style={styles.statValue}>{stats.avgTurnCount}</div><div style={styles.statLabel}>Avg Turns</div></div>
          <div style={styles.statItem}><div style={styles.statValue}>{stats.shortestWin || '-'}</div><div style={styles.statLabel}>Fastest Win</div></div>
        </div>

        {/* Filter Tabs */}
        <div style={styles.filterRow}>
          {(['all', 'quickplay', 'campaign', 'pvp', 'tournament', 'bookmarked'] as FilterMode[]).map(f => (
            <button
              key={f}
              style={{
                ...styles.filterBtn,
                background: filter === f ? '#00ff88' : '#1a1a2e',
                color: filter === f ? '#000' : '#aaa',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'quickplay' ? 'Quick Play' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Replay List */}
        <div style={styles.replayList}>
          {filteredReplays.length === 0 && (
            <div style={styles.emptyText}>No replays found. Play some games to record replays!</div>
          )}
          {filteredReplays.map(replay => (
            <div key={replay.id} style={styles.replayItem}>
              <div style={styles.replayInfo} onClick={() => { setSelectedReplay(replay); setPlaybackIndex(0); }}>
                <div style={styles.replayTitle}>
                  {replay.bookmarked && <span style={{ color: '#ffcc00', marginRight: '6px' }}>{'\u2605'}</span>}
                  {replay.label || `${RaceData[replay.playerRace].name} vs ${RaceData[replay.opponentRace].name}`}
                </div>
                <div style={styles.replayMeta}>
                  <span style={{ color: replay.won ? '#00ff88' : '#ff4444' }}>
                    {replay.won ? 'Victory' : 'Defeat'}
                  </span>
                  {' — '}{replay.turnCount} turns — {formatDuration(replay.durationSeconds)}
                  {' — '}{replay.mode}
                  {' — '}{new Date(replay.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div style={styles.replayActions}>
                <button style={styles.smallBtn} onClick={() => handleToggleBookmark(replay.id)} title="Bookmark">
                  {replay.bookmarked ? '\u2605' : '\u2606'}
                </button>
                <button style={styles.smallBtn} onClick={() => handleRename(replay.id)} title="Rename">
                  {'\u270E'}
                </button>
                <button style={{ ...styles.smallBtn, color: '#ff4444' }} onClick={() => handleDelete(replay.id)} title="Delete">
                  {'\u2716'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <button style={styles.backButton} onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
};

// ── Action Line Component ──

const ActionLine: React.FC<{ action: ReplayAction; isCurrent: boolean }> = ({ action, isCurrent }) => {
  const typeColors: Record<string, string> = {
    play_card: '#00ff88',
    attack: '#ff4444',
    hero_power: '#ffcc00',
    end_turn: '#666',
    starforge: '#ff8800',
    effect: '#aa88ff',
  };

  return (
    <div style={{
      padding: '4px 12px',
      fontSize: '13px',
      background: isCurrent ? 'rgba(0,255,136,0.1)' : 'transparent',
      borderLeft: `3px solid ${isCurrent ? '#00ff88' : 'transparent'}`,
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    }}>
      <span style={{ color: '#555', fontSize: '11px', minWidth: '28px' }}>T{action.turn}</span>
      <span style={{
        color: action.side === 'player' ? '#00aaff' : '#ff6666',
        fontSize: '11px',
        minWidth: '60px',
      }}>
        {action.side === 'player' ? 'PLAYER' : 'ENEMY'}
      </span>
      <span style={{
        color: typeColors[action.type] || '#888',
        fontSize: '10px',
        padding: '1px 6px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
        minWidth: '70px',
        textAlign: 'center',
      }}>
        {action.type.replace('_', ' ').toUpperCase()}
      </span>
      <span style={{ color: '#ccc' }}>{action.description}</span>
    </div>
  );
};

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', overflowY: 'auto', padding: '20px',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
    display: 'flex', justifyContent: 'center',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  content: {
    maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '20px', paddingTop: '20px', paddingBottom: '40px',
    overflowX: 'auto',
  },
  header: { textAlign: 'center' },
  title: {
    fontSize: '32px', fontWeight: 'bold', color: '#00ccff', margin: 0,
    textShadow: '0 0 20px rgba(0,204,255,0.4)',
  },
  subtitle: { color: '#aaa', fontSize: '14px', marginTop: '6px' },
  statsRow: {
    display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap',
  },
  statItem: { textAlign: 'center' },
  statValue: { color: '#fff', fontSize: '20px', fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: '12px', marginTop: '2px' },
  filterRow: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
  },
  filterBtn: {
    border: '1px solid #333', borderRadius: '6px', padding: '6px 14px',
    cursor: 'pointer', fontSize: '13px', minHeight: '44px',
  },
  replayList: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  replayItem: {
    background: '#1a1a2e', border: '1px solid #333355', borderRadius: '10px',
    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', cursor: 'pointer',
  },
  replayInfo: { flex: 1 },
  replayTitle: { color: '#fff', fontWeight: 'bold', fontSize: '15px' },
  replayMeta: { color: '#888', fontSize: '12px', marginTop: '4px' },
  replayActions: { display: 'flex', gap: '6px' },
  smallBtn: {
    background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer',
    fontSize: '16px', padding: '4px 8px',
  },
  emptyText: { color: '#666', textAlign: 'center', padding: '40px' },
  backButton: {
    background: '#333', border: 'none', borderRadius: '8px',
    padding: '10px 30px', color: '#fff', cursor: 'pointer', fontSize: '14px',
    minHeight: '44px',
  },
  // Playback
  controlBar: {
    display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center',
  },
  controlBtn: {
    background: '#1a1a2e', border: '1px solid #444', borderRadius: '6px',
    padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: '16px',
    minWidth: '40px', minHeight: '44px',
  },
  speedControl: { display: 'flex', gap: '4px', marginLeft: '16px' },
  speedBtn: {
    border: 'none', borderRadius: '4px', padding: '4px 10px',
    cursor: 'pointer', fontSize: '12px',
  },
  progressContainer: { width: '100%', maxWidth: '700px' },
  progressTrack: {
    width: '100%', height: '6px', background: '#222', borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #00ff88, #00ccff)',
    borderRadius: '3px', transition: 'width 0.2s ease',
  },
  progressLabel: {
    color: '#888', fontSize: '12px', textAlign: 'center', marginTop: '4px',
  },
  actionLog: {
    width: '100%', maxHeight: '300px', overflowY: 'auto',
    background: '#0a0a14', borderRadius: '10px', border: '1px solid #222',
    padding: '8px 0',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  summaryRow: { display: 'flex', gap: '24px' },
  summaryCard: {
    background: '#1a1a2e', borderRadius: '10px', padding: '16px 24px',
    textAlign: 'center', border: '1px solid #333',
  },
};

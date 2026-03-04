/**
 * STARFORGE TCG - Spectator Mode Screen
 *
 * Browse and watch live games. Players can see active ranked and casual
 * games, view player info, and connect as a spectator via WebSocket.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { hapticTap } from '../capacitor';
import { SpaceBackground } from './SpaceBackground';

interface SpectateScreenProps {
  onBack: () => void;
}

interface SpectatableGame {
  id: string;
  mode: string;
  turnNumber: number;
  durationMs: number;
  player1Id: string;
  player2Id: string;
}

interface SpectatorState {
  connected: boolean;
  gameId: string | null;
  gameState: any | null;
  error: string | null;
}

export const SpectateScreen: React.FC<SpectateScreenProps> = ({ onBack }) => {
  const [games, setGames] = useState<SpectatableGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spectating, setSpectating] = useState<SpectatorState>({
    connected: false,
    gameId: null,
    gameState: null,
    error: null,
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Fetch available games
  const fetchGames = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/games/spectatable', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to fetch games');

      const data = await res.json();
      setGames(data.games || []);
      setError(null);
    } catch (err) {
      setError('Unable to load live games. Make sure the server is running.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    // Refresh game list every 10 seconds
    const interval = setInterval(fetchGames, 10_000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Connect as spectator
  const handleSpectate = useCallback((gameId: string) => {
    hapticTap();

    const token = localStorage.getItem('auth_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'SPECTATE', gameId }));
      setSpectating({
        connected: true,
        gameId,
        gameState: null,
        error: null,
      });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'GAME_STATE') {
          setSpectating(prev => ({
            ...prev,
            gameState: msg.data?.state || msg.data,
          }));
        } else if (msg.type === 'ACTION_RESULT') {
          setSpectating(prev => ({
            ...prev,
            gameState: msg.data?.gameState || prev.gameState,
          }));
        } else if (msg.type === 'GAME_OVER') {
          setSpectating(prev => ({
            ...prev,
            gameState: {
              ...prev.gameState,
              status: 'FINISHED',
              winnerId: msg.data?.winnerId,
            },
          }));
        } else if (msg.type === 'ERROR') {
          setSpectating(prev => ({
            ...prev,
            error: msg.data?.message || 'Connection error',
          }));
        }
      } catch {
        // Ignore parse errors
      }
    };

    socket.onerror = () => {
      setSpectating(prev => ({
        ...prev,
        error: 'WebSocket connection failed',
      }));
    };

    socket.onclose = () => {
      setSpectating(prev => ({
        ...prev,
        connected: false,
      }));
    };

    setWs(socket);
  }, []);

  const handleStopSpectating = useCallback(() => {
    hapticTap();
    if (ws) {
      ws.close();
      setWs(null);
    }
    setSpectating({
      connected: false,
      gameId: null,
      gameState: null,
      error: null,
    });
  }, [ws]);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  const formatDuration = (ms: number): string => {
    const mins = Math.floor(ms / 60_000);
    const secs = Math.floor((ms % 60_000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Spectating a live game
  if (spectating.connected && spectating.gameState) {
    return (
      <div style={styles.container}>
        <SpaceBackground />
        <div style={styles.spectateHeader}>
          <button style={styles.backBtn} onClick={handleStopSpectating}>
            &#x2190; Back to Games
          </button>
          <div style={styles.liveTag}>LIVE</div>
          <span style={styles.spectateTitle}>
            Spectating Game
          </span>
        </div>
        <div style={styles.spectateView}>
          {renderGameBoard(spectating.gameState)}
        </div>
      </div>
    );
  }

  // Game browser
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => { hapticTap(); onBack(); }}>
          &#x2190; Back
        </button>
        <h1 style={styles.title}>Spectate Live Games</h1>
        <button style={styles.refreshBtn} onClick={() => { hapticTap(); fetchGames(); }}>
          &#x21BB; Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Spectating error */}
      {spectating.error && (
        <div style={styles.errorBanner}>{spectating.error}</div>
      )}

      {/* Loading */}
      {loading && games.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.spinner}>&#x23F3;</div>
          <p>Loading live games...</p>
        </div>
      )}

      {/* No games */}
      {!loading && games.length === 0 && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>&#x1F50D;</div>
          <p style={styles.emptyText}>No live games right now</p>
          <p style={styles.emptySubtext}>
            Games become spectatable after turn 2. Check back soon!
          </p>
        </div>
      )}

      {/* Game list */}
      {games.length > 0 && (
        <div style={styles.gameList}>
          <div style={styles.listHeader}>
            <span style={styles.colMode}>Mode</span>
            <span style={styles.colTurn}>Turn</span>
            <span style={styles.colDuration}>Duration</span>
            <span style={styles.colAction}></span>
          </div>
          {games.map((game) => (
            <div key={game.id} style={styles.gameRow}>
              <span style={styles.colMode}>
                <span style={{
                  ...styles.modeBadge,
                  background: game.mode === 'ranked' ? '#c9a44c' : '#4a7c8c',
                }}>
                  {game.mode === 'ranked' ? 'Ranked' : 'Casual'}
                </span>
              </span>
              <span style={styles.colTurn}>
                Turn {game.turnNumber}
              </span>
              <span style={styles.colDuration}>
                {formatDuration(game.durationMs)}
              </span>
              <span style={styles.colAction}>
                <button
                  style={styles.watchBtn}
                  onClick={() => handleSpectate(game.id)}
                >
                  Watch
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Spectated Game Board Renderer ───────────────────────────────────

function renderGameBoard(state: any): React.ReactNode {
  if (!state) return <div style={styles.emptyState}>Waiting for game data...</div>;

  const players = state.players || {};
  const playerIds = Object.keys(players);
  const p1 = players[playerIds[0]];
  const p2 = players[playerIds[1]];

  const isGameOver = state.status === 'FINISHED' || state.status === 'DRAW';

  return (
    <div style={styles.boardContainer}>
      {/* Game Over overlay */}
      {isGameOver && (
        <div style={styles.gameOverOverlay}>
          <div style={styles.gameOverText}>
            {state.status === 'DRAW'
              ? 'DRAW!'
              : `${players[state.winnerId]?.name || 'Player'} Wins!`
            }
          </div>
        </div>
      )}

      {/* Opponent (top) */}
      {p2 && (
        <div style={styles.playerArea}>
          <div style={styles.playerInfo}>
            <span style={styles.playerName}>{p2.name || playerIds[1]?.slice(0, 8)}</span>
            <span style={styles.raceBadge}>{p2.race}</span>
          </div>
          <div style={styles.statsRow}>
            <span style={styles.stat}>&#x2764; {p2.hero?.currentHealth || 0}/{p2.hero?.maxHealth || 30}</span>
            {p2.hero?.armor > 0 && <span style={styles.stat}>&#x1F6E1; {p2.hero.armor}</span>}
            <span style={styles.stat}>&#x1F48E; {p2.crystals?.current || 0}/{p2.crystals?.maximum || 0}</span>
            <span style={styles.stat}>&#x1F0CF; {p2.handSize || 0}</span>
            <span style={styles.stat}>&#x1F4DA; {p2.deckSize || 0}</span>
          </div>
          <div style={styles.boardSlots}>
            {(p2.board || []).map((card: any, i: number) => (
              <div key={card?.instanceId || `empty-${i}`} style={styles.minionSlot}>
                {card ? (
                  <div style={styles.minionCard}>
                    <div style={styles.minionStats}>
                      <span style={styles.atkStat}>{card.currentAttack ?? '?'}</span>
                      <span style={styles.hpStat}>{card.currentHealth ?? '?'}</span>
                    </div>
                    {card.keywords?.length > 0 && (
                      <div style={styles.keywordIcons}>
                        {card.keywords.slice(0, 3).map((k: any, j: number) => (
                          <span key={j} style={styles.kwTag}>{k.keyword?.slice(0, 3)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turn indicator */}
      <div style={styles.turnIndicator}>
        <span style={styles.turnText}>Turn {state.turn || 1}</span>
        <span style={styles.activePlayer}>
          {state.activePlayerId === playerIds[0] ? (p1?.name || 'Player 1') : (p2?.name || 'Player 2')}'s turn
        </span>
      </div>

      {/* Player (bottom) */}
      {p1 && (
        <div style={styles.playerArea}>
          <div style={styles.boardSlots}>
            {(p1.board || []).map((card: any, i: number) => (
              <div key={card?.instanceId || `empty-b-${i}`} style={styles.minionSlot}>
                {card ? (
                  <div style={styles.minionCard}>
                    <div style={styles.minionStats}>
                      <span style={styles.atkStat}>{card.currentAttack ?? '?'}</span>
                      <span style={styles.hpStat}>{card.currentHealth ?? '?'}</span>
                    </div>
                    {card.keywords?.length > 0 && (
                      <div style={styles.keywordIcons}>
                        {card.keywords.slice(0, 3).map((k: any, j: number) => (
                          <span key={j} style={styles.kwTag}>{k.keyword?.slice(0, 3)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div style={styles.statsRow}>
            <span style={styles.stat}>&#x2764; {p1.hero?.currentHealth || 0}/{p1.hero?.maxHealth || 30}</span>
            {p1.hero?.armor > 0 && <span style={styles.stat}>&#x1F6E1; {p1.hero.armor}</span>}
            <span style={styles.stat}>&#x1F48E; {p1.crystals?.current || 0}/{p1.crystals?.maximum || 0}</span>
            <span style={styles.stat}>&#x1F0CF; {p1.handSize || 0}</span>
            <span style={styles.stat}>&#x1F4DA; {p1.deckSize || 0}</span>
          </div>
          <div style={styles.playerInfo}>
            <span style={styles.playerName}>{p1.name || playerIds[0]?.slice(0, 8)}</span>
            <span style={styles.raceBadge}>{p1.race}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: '#040410',
    color: '#e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#c9a44c',
    margin: 0,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#e0e0e0',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  refreshBtn: {
    background: 'rgba(100,200,255,0.15)',
    border: '1px solid rgba(100,200,255,0.3)',
    color: '#88ccff',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  errorBanner: {
    background: 'rgba(255,60,60,0.15)',
    border: '1px solid rgba(255,60,60,0.3)',
    color: '#ff8888',
    padding: '12px 24px',
    margin: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: '#888',
  },
  spinner: {
    fontSize: '48px',
    animation: 'spin 2s linear infinite',
  },
  emptyIcon: {
    fontSize: '64px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#aaa',
    margin: 0,
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  gameList: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 24px',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    color: '#888',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  gameRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.15s',
  },
  colMode: { flex: '0 0 100px' },
  colTurn: { flex: '0 0 80px', textAlign: 'center' as const },
  colDuration: { flex: '0 0 80px', textAlign: 'center' as const },
  colAction: { flex: 1, textAlign: 'right' as const },
  modeBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
  },
  watchBtn: {
    background: 'linear-gradient(135deg, #4a7c8c, #2d5a6a)',
    border: 'none',
    color: '#fff',
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'transform 0.1s',
  },

  // Spectate view styles
  spectateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  liveTag: {
    background: '#e53935',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
  },
  spectateTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#c9a44c',
  },
  spectateView: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },

  // Board renderer styles
  boardContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    height: '100%',
    position: 'relative',
  },
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  raceBadge: {
    background: 'rgba(201,164,76,0.2)',
    color: '#c9a44c',
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'capitalize' as const,
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#ccc',
  },
  boardSlots: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '80px',
    padding: '8px 0',
  },
  minionSlot: {
    width: '70px',
    height: '80px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minionCard: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(40,40,80,0.8), rgba(20,20,40,0.9))',
    borderRadius: '8px',
    border: '1px solid rgba(201,164,76,0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '4px',
  },
  minionStats: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0 6px',
  },
  atkStat: {
    color: '#ff9944',
    fontWeight: 700,
    fontSize: '16px',
  },
  hpStat: {
    color: '#44cc44',
    fontWeight: 700,
    fontSize: '16px',
  },
  keywordIcons: {
    display: 'flex',
    gap: '2px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  kwTag: {
    background: 'rgba(100,200,255,0.2)',
    color: '#88ccff',
    padding: '1px 4px',
    borderRadius: '4px',
    fontSize: '8px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  turnIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '12px',
    background: 'rgba(201,164,76,0.1)',
    border: '1px solid rgba(201,164,76,0.2)',
    borderRadius: '8px',
  },
  turnText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#c9a44c',
  },
  activePlayer: {
    fontSize: '14px',
    color: '#aaa',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: '12px',
  },
  gameOverText: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#c9a44c',
    textShadow: '0 0 20px rgba(201,164,76,0.5)',
  },
};

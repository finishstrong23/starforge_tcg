/**
 * STARFORGE TCG - PvP Lobby Component
 *
 * Create or join a game room using a short room code.
 * Players pick their race, then connect via PeerJS.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { MultiplayerManager } from '../network/MultiplayerManager';

type LobbyPhase = 'choose' | 'creating' | 'waiting' | 'joining' | 'ready';

interface LobbyProps {
  onGameReady: (config: {
    role: 'host' | 'guest';
    manager: MultiplayerManager;
    myRace: Race;
    opponentRace: Race;
  }) => void;
  onBack: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onGameReady, onBack }) => {
  const [phase, setPhase] = useState<LobbyPhase>('choose');
  const [selectedRace, setSelectedRace] = useState<Race>(Race.COGSMITHS);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const managerRef = useRef<MultiplayerManager | null>(null);

  const availableRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN, Race.BIOTITANS,
    Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE, Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  const cleanup = useCallback(() => {
    managerRef.current?.disconnect();
    managerRef.current = null;
  }, []);

  const handleCreateGame = useCallback(async () => {
    setError('');
    setPhase('creating');
    setStatusText('Creating room...');

    const mgr = new MultiplayerManager();
    managerRef.current = mgr;

    mgr.onError = (err) => setError(err);

    try {
      const code = await mgr.createRoom();
      setRoomCode(code);
      setPhase('waiting');
      setStatusText('Waiting for opponent...');

      // Wait for guest to connect and send their race
      mgr.onConnected = () => {
        setStatusText('Opponent connected! Waiting for their setup...');
      };

      mgr.onMessage = (msg) => {
        if (msg.type === 'player_info') {
          // Guest connected with their race, start the game
          onGameReady({
            role: 'host',
            manager: mgr,
            myRace: selectedRace,
            opponentRace: msg.race,
          });
        }
      };
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      setPhase('choose');
      cleanup();
    }
  }, [selectedRace, onGameReady, cleanup]);

  const handleJoinGame = useCallback(async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) {
      setError('Please enter a valid room code');
      return;
    }

    setError('');
    setPhase('joining');
    setStatusText('Connecting...');

    const mgr = new MultiplayerManager();
    managerRef.current = mgr;

    mgr.onError = (err) => {
      setError(err);
      setPhase('choose');
    };

    try {
      await mgr.joinRoom(code);
      setStatusText('Connected! Starting game...');

      // Send our race info to the host
      mgr.send({ type: 'player_info', race: selectedRace, name: 'Player 2' });

      // Wait for host to start the game and send initial state
      mgr.onMessage = (msg) => {
        if (msg.type === 'game_start' || msg.type === 'state_update') {
          // Infer opponent race from the state
          const oppRace = msg.viewState.opponentState?.race || Race.COGSMITHS;
          onGameReady({
            role: 'guest',
            manager: mgr,
            myRace: selectedRace,
            opponentRace: oppRace,
          });
        }
      };
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      setPhase('choose');
      cleanup();
    }
  }, [joinCode, selectedRace, onGameReady, cleanup]);

  const handleCancel = useCallback(() => {
    cleanup();
    setPhase('choose');
    setRoomCode('');
    setError('');
  }, [cleanup]);

  // Waiting screen (host created room, waiting for guest)
  if (phase === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.title}>STARFORGE</h1>
          <p style={styles.subtitle}>Waiting for Opponent</p>

          <div style={styles.codeBox}>
            <div style={styles.codeLabel}>Share this code with your friend:</div>
            <div style={styles.codeDisplay}>{roomCode}</div>
            <button
              style={styles.copyButton}
              onClick={() => {
                navigator.clipboard?.writeText(roomCode);
              }}
            >
              Copy Code
            </button>
          </div>

          <div style={styles.statusText}>{statusText}</div>
          <div style={styles.pulse} />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Connecting screen
  if (phase === 'creating' || phase === 'joining') {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <h1 style={styles.title}>STARFORGE</h1>
          <div style={styles.statusText}>{statusText}</div>
          <div style={styles.pulse} />
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>
    );
  }

  // Main lobby: pick race + create or join
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>STARFORGE</h1>
        <p style={styles.subtitle}>Play vs Friend</p>

        {/* Race Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Choose Your Planet</h2>
          <div style={styles.raceGrid}>
            {availableRaces.map((race) => {
              const raceInfo = RaceData[race];
              const isSelected = selectedRace === race;
              return (
                <button
                  key={race}
                  style={{
                    ...styles.raceCard,
                    ...(isSelected ? styles.raceCardSelected : {}),
                  }}
                  onClick={() => setSelectedRace(race)}
                >
                  <div style={styles.raceName}>{raceInfo.name}</div>
                  <div style={styles.racePlanet}>{raceInfo.planet}</div>
                  <div style={styles.raceMechanic}>{raceInfo.playstyle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Create / Join */}
        <div style={styles.actionSection}>
          <button style={styles.createButton} onClick={handleCreateGame}>
            Create Game
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>OR</span>
            <span style={styles.dividerLine} />
          </div>

          <div style={styles.joinRow}>
            <input
              style={styles.codeInput}
              type="text"
              placeholder="ROOM CODE"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinGame(); }}
            />
            <button style={styles.joinButton} onClick={handleJoinGame}>
              Join Game
            </button>
          </div>
        </div>

        <button style={styles.backButton} onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '20px',
    overflowY: 'auto',
    flexDirection: 'column',
  },
  content: {
    maxWidth: '900px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '25px',
    paddingTop: '30px',
    paddingBottom: '40px',
  },
  title: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#00ff88',
    textShadow: '0 0 20px #00ff88, 0 0 40px #00ff88',
    letterSpacing: '8px',
    margin: 0,
  },
  subtitle: {
    fontSize: '22px',
    color: '#aaaaaa',
    margin: 0,
  },
  section: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#ffffff',
    margin: 0,
  },
  raceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    width: '100%',
  },
  raceCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #333355',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#ffffff',
  },
  raceCardSelected: {
    border: '2px solid #00ff88',
    boxShadow: '0 0 12px rgba(0, 255, 136, 0.4)',
    background: 'linear-gradient(135deg, #1a2a2e 0%, #203040 100%)',
  },
  raceName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: '2px',
  },
  racePlanet: {
    fontSize: '11px',
    color: '#888888',
    marginBottom: '4px',
  },
  raceMechanic: {
    fontSize: '13px',
    color: '#ffcc00',
    fontWeight: 'bold',
  },
  actionSection: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  createButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.4)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#444466',
  },
  dividerText: {
    color: '#666688',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  joinRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  codeInput: {
    flex: 1,
    background: 'rgba(20, 20, 40, 0.8)',
    border: '2px solid #444466',
    borderRadius: '10px',
    padding: '14px 16px',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: '4px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  joinButton: {
    background: 'linear-gradient(135deg, #4488ff 0%, #3366dd 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 24px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(68, 136, 255, 0.3)',
    whiteSpace: 'nowrap',
  },
  codeBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '2px solid #00ff88',
    borderRadius: '16px',
    padding: '30px 50px',
  },
  codeLabel: {
    fontSize: '16px',
    color: '#aaaaaa',
  },
  codeDisplay: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: '12px',
    textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
    fontFamily: 'monospace',
  },
  copyButton: {
    background: 'rgba(0, 255, 136, 0.15)',
    border: '1px solid #00ff88',
    borderRadius: '8px',
    padding: '8px 20px',
    color: '#00ff88',
    fontSize: '14px',
    cursor: 'pointer',
  },
  statusText: {
    fontSize: '16px',
    color: '#aaaaaa',
  },
  pulse: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#00ff88',
    boxShadow: '0 0 10px #00ff88',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  error: {
    color: '#ff4444',
    fontSize: '14px',
    background: 'rgba(255, 0, 0, 0.1)',
    border: '1px solid rgba(255, 0, 0, 0.3)',
    borderRadius: '8px',
    padding: '10px 16px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  cancelButton: {
    background: 'rgba(255, 50, 50, 0.2)',
    border: '1px solid #ff4444',
    borderRadius: '10px',
    padding: '12px 30px',
    color: '#ff6666',
    fontSize: '16px',
    cursor: 'pointer',
  },
  backButton: {
    background: 'transparent',
    border: '1px solid #555577',
    borderRadius: '10px',
    padding: '10px 24px',
    color: '#888888',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '10px',
  },
};

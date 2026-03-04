/**
 * STARFORGE TCG - Tournament Screen
 *
 * Full tournament experience: tier selection, bracket visualization,
 * match progression, and tournament history with trophy showcase.
 */

import React, { useState, useCallback } from 'react';
import { hapticTap } from '../capacitor';
import { Race, RaceData } from '../../types/Race';
import {
  type TournamentTier,
  type TournamentRun,
  type TournamentState,
  type BracketMatch,
  TOURNAMENT_CONFIGS,
  loadTournamentState,
  startTournament,
  forfeitTournament,
  getCurrentOpponent,
  getRoundLabel,
} from '../../progression/TournamentMode';
import { loadDailyState, spendGold, type DailyState } from '../../progression/DailyQuests';
import backgroundImg from '../../assets/background.png';

interface TournamentScreenProps {
  onBack: () => void;
  onStartMatch: (opponentRace: Race, difficulty: number) => void;
}

export const TournamentScreen: React.FC<TournamentScreenProps> = ({ onBack, onStartMatch }) => {
  const [state, setState] = useState<TournamentState>(loadTournamentState);
  const [selectedTier, setSelectedTier] = useState<TournamentTier>('bronze');
  const [selectedRace, setSelectedRace] = useState<Race>(Race.COGSMITHS);
  const [showHistory, setShowHistory] = useState(false);
  const [gold, setGold] = useState(() => loadDailyState().gold);

  const availableRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  const handleEnterTournament = useCallback(() => {
    const config = TOURNAMENT_CONFIGS[selectedTier];
    if (gold < config.entryFee) return;

    hapticTap();
    const result = startTournament(selectedTier, selectedRace, gold);
    if (result) {
      const currentDaily = loadDailyState();
      const updatedDaily = spendGold(currentDaily, config.entryFee);
      if (updatedDaily) setGold(updatedDaily.gold);
      setState(result.state);
    }
  }, [selectedTier, selectedRace, gold]);

  const handleForfeit = useCallback(() => {
    setState(forfeitTournament());
  }, []);

  const handlePlayMatch = useCallback(() => {
    if (!state.activeRun) return;
    const opponent = getCurrentOpponent(state.activeRun);
    if (!opponent) return;

    hapticTap();
    const config = TOURNAMENT_CONFIGS[state.activeRun.tier];
    const difficulty = config.difficulties[Math.min(state.activeRun.currentRound, 2)];
    onStartMatch(opponent.race, difficulty);
  }, [state.activeRun, onStartMatch]);

  // Active tournament view
  if (state.activeRun) {
    return (
      <div style={styles.container}>
        <div style={styles.content}>
          <div style={styles.header}>
            <h1 style={{ ...styles.title, color: TOURNAMENT_CONFIGS[state.activeRun.tier].color }}>
              {TOURNAMENT_CONFIGS[state.activeRun.tier].name}
            </h1>
            <p style={styles.subtitle}>
              {getRoundLabel(state.activeRun.currentRound)} — Playing as {RaceData[state.activeRun.playerRace].name}
            </p>
          </div>

          {/* Bracket */}
          <BracketView bracket={state.activeRun.bracket} currentMatchId={state.activeRun.currentMatchId} />

          {/* Current Match */}
          {state.activeRun.currentMatchId && (() => {
            const opponent = getCurrentOpponent(state.activeRun!);
            return opponent ? (
              <div style={styles.matchPanel}>
                <h2 style={styles.matchTitle}>Next Match: {getRoundLabel(state.activeRun!.currentRound)}</h2>
                <div style={styles.matchup}>
                  <div style={styles.matchupSide}>
                    <div style={styles.matchupName}>You</div>
                    <div style={styles.matchupRace}>{RaceData[state.activeRun!.playerRace].name}</div>
                  </div>
                  <div style={styles.vsText}>VS</div>
                  <div style={styles.matchupSide}>
                    <div style={styles.matchupName}>{getCurrentOpponent(state.activeRun!)?.name}</div>
                    <div style={styles.matchupRace}>{RaceData[opponent.race].name}</div>
                  </div>
                </div>
                <button style={styles.fightButton} onClick={handlePlayMatch}>
                  FIGHT!
                </button>
              </div>
            ) : null;
          })()}

          <div style={styles.buttonRow}>
            <button style={styles.forfeitButton} onClick={handleForfeit}>Forfeit Tournament</button>
            <button style={styles.backButton} onClick={onBack}>Back to Menu</button>
          </div>
        </div>
      </div>
    );
  }

  // Tournament selection view
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Tournament Arena</h1>
          <p style={styles.subtitle}>Enter 8-player single-elimination brackets and compete for glory</p>
          <div style={styles.goldDisplay}>Gold: {gold}</div>
        </div>

        {/* Trophy Showcase */}
        <div style={styles.trophyBar}>
          {(Object.keys(TOURNAMENT_CONFIGS) as TournamentTier[]).map(tier => (
            <div key={tier} style={styles.trophyItem}>
              <div style={{ ...styles.trophyIcon, color: TOURNAMENT_CONFIGS[tier].color }}>
                {state.trophies[tier] > 0 ? `\u2605 ${state.trophies[tier]}` : '\u2606'}
              </div>
              <div style={styles.trophyLabel}>{TOURNAMENT_CONFIGS[tier].name}</div>
            </div>
          ))}
        </div>

        {/* Tier Selection */}
        <div style={styles.tierGrid}>
          {(Object.keys(TOURNAMENT_CONFIGS) as TournamentTier[]).map(tier => {
            const config = TOURNAMENT_CONFIGS[tier];
            const isSelected = selectedTier === tier;
            const canAfford = gold >= config.entryFee;
            return (
              <button
                key={tier}
                style={{
                  ...styles.tierCard,
                  borderColor: isSelected ? config.color : '#333355',
                  boxShadow: isSelected ? `0 0 20px ${config.color}44` : 'none',
                }}
                onClick={() => setSelectedTier(tier)}
              >
                <div style={{ ...styles.tierName, color: config.color }}>{config.name}</div>
                <div style={styles.tierDesc}>{config.description}</div>
                <div style={styles.tierDetails}>
                  <div>Entry: <span style={{ color: canAfford ? '#ffcc00' : '#ff4444' }}>{config.entryFee}g</span></div>
                  <div>1st: <span style={{ color: '#ffcc00' }}>{config.prizes.first}g</span></div>
                  <div>2nd: <span style={{ color: '#c0c0c0' }}>{config.prizes.second}g</span></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Race Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Choose Your Race</h2>
          <div style={styles.raceGrid}>
            {availableRaces.map(race => (
              <button
                key={race}
                style={{
                  ...styles.raceButton,
                  borderColor: selectedRace === race ? '#00ff88' : '#333355',
                  boxShadow: selectedRace === race ? '0 0 10px rgba(0,255,136,0.3)' : 'none',
                }}
                onClick={() => setSelectedRace(race)}
              >
                {RaceData[race].name}
              </button>
            ))}
          </div>
        </div>

        {/* Enter Button */}
        <button
          style={{
            ...styles.enterButton,
            opacity: gold >= TOURNAMENT_CONFIGS[selectedTier].entryFee ? 1 : 0.5,
          }}
          onClick={handleEnterTournament}
          disabled={gold < TOURNAMENT_CONFIGS[selectedTier].entryFee}
        >
          Enter {TOURNAMENT_CONFIGS[selectedTier].name} ({TOURNAMENT_CONFIGS[selectedTier].entryFee}g)
        </button>

        {/* History Toggle */}
        <button style={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? 'Hide' : 'Show'} Tournament History ({state.history.length})
        </button>

        {showHistory && (
          <div style={styles.historyList}>
            {state.history.length === 0 && <div style={styles.emptyText}>No tournaments played yet</div>}
            {state.history.map(h => (
              <div key={h.id} style={styles.historyItem}>
                <div style={{ color: TOURNAMENT_CONFIGS[h.tier].color, fontWeight: 'bold' }}>
                  {TOURNAMENT_CONFIGS[h.tier].name}
                </div>
                <div style={{ color: '#aaa', fontSize: '13px' }}>
                  {RaceData[h.playerRace].name} — {h.result === 'champion' ? 'CHAMPION!' : h.result}
                  {h.prizesEarned > 0 && ` — ${h.prizesEarned}g`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          <div>Entered: {state.totalEntered}</div>
          <div>Won: {state.totalWins}</div>
          <div>Total Prizes: {state.totalPrizesEarned}g</div>
        </div>

        <button style={styles.backButton} onClick={onBack}>Back to Menu</button>
      </div>
    </div>
  );
};

// ── Bracket Visualization ──

const BracketView: React.FC<{ bracket: BracketMatch[]; currentMatchId: string | null }> = ({ bracket, currentMatchId }) => {
  const rounds = [
    bracket.filter(m => m.round === 0),
    bracket.filter(m => m.round === 1),
    bracket.filter(m => m.round === 2),
  ];

  return (
    <div style={styles.bracketContainer}>
      {rounds.map((roundMatches, roundIdx) => (
        <div key={roundIdx} style={styles.bracketRound}>
          <div style={styles.roundLabel}>{getRoundLabel(roundIdx)}</div>
          <div style={styles.bracketMatchColumn}>
            {roundMatches.map(match => (
              <BracketMatchCard key={match.id} match={match} isCurrent={match.id === currentMatchId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const BracketMatchCard: React.FC<{ match: BracketMatch; isCurrent: boolean }> = ({ match, isCurrent }) => {
  const getSlotStyle = (slot: BracketMatch['player1'], isWinner: boolean) => ({
    padding: '4px 8px',
    fontSize: '12px',
    color: slot?.isPlayer ? '#00ff88' : isWinner ? '#ffffff' : '#666',
    fontWeight: (slot?.isPlayer ? 'bold' : 'normal') as React.CSSProperties['fontWeight'],
    textDecoration: (!isWinner && match.winner) ? 'line-through' : 'none',
    background: isWinner ? 'rgba(0,255,136,0.1)' : 'transparent',
  });

  return (
    <div style={{
      ...styles.bracketMatch,
      borderColor: isCurrent ? '#ffcc00' : '#333355',
      boxShadow: isCurrent ? '0 0 10px rgba(255,204,0,0.3)' : 'none',
    }}>
      <div style={getSlotStyle(match.player1, match.winner === match.player1)}>
        {match.player1 ? (match.player1.isPlayer ? 'YOU' : match.player1.name) : 'TBD'}
      </div>
      <div style={{ borderTop: '1px solid #333', width: '100%' }} />
      <div style={getSlotStyle(match.player2, match.winner === match.player2)}>
        {match.player2 ? (match.player2.isPlayer ? 'YOU' : match.player2.name) : 'TBD'}
      </div>
    </div>
  );
};

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', overflowY: 'auto', padding: '20px',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    display: 'flex', justifyContent: 'center',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  content: {
    maxWidth: '1000px', width: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '24px', paddingTop: '20px', paddingBottom: '40px',
    overflowX: 'auto',
  },
  header: { textAlign: 'center' },
  title: {
    fontSize: '36px', fontWeight: 'bold', color: '#ffcc00', margin: 0,
    textShadow: '0 0 20px rgba(255,204,0,0.5)',
  },
  subtitle: { color: '#aaa', fontSize: '16px', marginTop: '8px' },
  goldDisplay: {
    color: '#ffcc00', fontSize: '20px', fontWeight: 'bold', marginTop: '8px',
  },
  trophyBar: {
    display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap',
  },
  trophyItem: { textAlign: 'center' },
  trophyIcon: { fontSize: '28px' },
  trophyLabel: { fontSize: '11px', color: '#888', marginTop: '4px' },
  tierGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px', width: '100%',
  },
  tierCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #333355', borderRadius: '12px', padding: '16px',
    cursor: 'pointer', textAlign: 'left', color: '#fff',
  },
  tierName: { fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' },
  tierDesc: { fontSize: '12px', color: '#aaa', marginBottom: '10px' },
  tierDetails: { fontSize: '13px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '2px' },
  section: { width: '100%', textAlign: 'center' },
  sectionTitle: { color: '#fff', fontSize: '18px', marginBottom: '12px' },
  raceGrid: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
  },
  raceButton: {
    background: '#1a1a2e', border: '2px solid #333355', borderRadius: '8px',
    padding: '8px 16px', color: '#fff', cursor: 'pointer', fontSize: '13px',
    minHeight: '44px',
  },
  enterButton: {
    background: 'linear-gradient(135deg, #ffcc00 0%, #ff8800 100%)',
    border: 'none', borderRadius: '12px', padding: '16px 48px',
    fontSize: '20px', fontWeight: 'bold', color: '#000', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255,204,0,0.4)',
    minHeight: '44px',
  },
  historyToggle: {
    background: 'transparent', border: '1px solid #555', borderRadius: '8px',
    padding: '8px 24px', color: '#aaa', cursor: 'pointer', fontSize: '14px',
  },
  historyList: {
    width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  historyItem: {
    background: '#1a1a2e', borderRadius: '8px', padding: '10px 16px',
    border: '1px solid #333',
  },
  emptyText: { color: '#666', textAlign: 'center', padding: '20px' },
  statsRow: {
    display: 'flex', gap: '24px', color: '#888', fontSize: '14px',
  },
  backButton: {
    background: '#333', border: 'none', borderRadius: '8px',
    padding: '10px 30px', color: '#fff', cursor: 'pointer', fontSize: '14px',
    minHeight: '44px',
  },
  // Bracket styles
  bracketContainer: {
    display: 'flex', gap: '32px', justifyContent: 'center', alignItems: 'center',
    width: '100%', overflowX: 'auto', padding: '16px 0',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  bracketRound: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  roundLabel: { color: '#888', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
  bracketMatchColumn: {
    display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center',
  },
  bracketMatch: {
    background: '#1a1a2e', border: '1px solid #333355', borderRadius: '6px',
    minWidth: '160px', overflow: 'hidden',
  },
  // Active tournament
  matchPanel: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    border: '2px solid #ffcc00', borderRadius: '16px', padding: '24px',
    textAlign: 'center', width: '100%', maxWidth: '500px',
    boxShadow: '0 0 30px rgba(255,204,0,0.2)',
  },
  matchTitle: { color: '#ffcc00', fontSize: '20px', margin: '0 0 16px' },
  matchup: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' },
  matchupSide: { textAlign: 'center' },
  matchupName: { color: '#fff', fontSize: '16px', fontWeight: 'bold' },
  matchupRace: { color: '#aaa', fontSize: '13px', marginTop: '4px' },
  vsText: { color: '#ff4444', fontSize: '24px', fontWeight: 'bold' },
  fightButton: {
    background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
    border: 'none', borderRadius: '12px', padding: '14px 48px',
    fontSize: '20px', fontWeight: 'bold', color: '#fff', cursor: 'pointer',
    marginTop: '20px', boxShadow: '0 4px 20px rgba(255,0,0,0.4)',
    minHeight: '44px',
  },
  buttonRow: { display: 'flex', gap: '12px' },
  forfeitButton: {
    background: '#442222', border: '1px solid #663333', borderRadius: '8px',
    padding: '10px 24px', color: '#ff6666', cursor: 'pointer', fontSize: '14px',
  },
};

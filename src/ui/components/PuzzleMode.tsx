/**
 * STARFORGE TCG - Lethal Puzzle Mode (8.2.2)
 *
 * Puzzle browser and solver interface.
 * Players view pre-constructed board states and must find lethal in 1 turn.
 */

import React, { useState, useCallback, useRef } from 'react';
import { RaceData } from '../../types/Race';
import {
  PUZZLES,
  TIER_INFO,
  getTierSummary,
  getPuzzlesByTier,
} from '../../puzzle/PuzzleData';
import type { PuzzleDefinition, PuzzleTier } from '../../puzzle/PuzzleData';
import {
  loadPuzzleData,
  isPuzzleSolved,
  recordPuzzleAttempt,
  getTierCompletion,
} from '../../puzzle/PuzzleState';
import backgroundImg from '../../assets/background.png';

interface PuzzleModeProps {
  onBack: () => void;
}

type PuzzleView = 'browser' | 'solving';

export const PuzzleMode: React.FC<PuzzleModeProps> = ({ onBack }) => {
  const [view, setView] = useState<PuzzleView>('browser');
  const [selectedTier, setSelectedTier] = useState<PuzzleTier>('novice');
  const [activePuzzle, setActivePuzzle] = useState<PuzzleDefinition | null>(null);

  if (view === 'solving' && activePuzzle) {
    return (
      <PuzzleSolver
        puzzle={activePuzzle}
        onBack={() => {
          setView('browser');
          setActivePuzzle(null);
        }}
        onSolved={() => {
          recordPuzzleAttempt(activePuzzle.id, true, 0, 0);
          setView('browser');
          setActivePuzzle(null);
        }}
      />
    );
  }

  return (
    <PuzzleBrowser
      selectedTier={selectedTier}
      onSelectTier={setSelectedTier}
      onSelectPuzzle={(p) => {
        setActivePuzzle(p);
        setView('solving');
      }}
      onBack={onBack}
    />
  );
};

// ─── PUZZLE BROWSER ─────────────────────────────────────────────────────────

const PuzzleBrowser: React.FC<{
  selectedTier: PuzzleTier;
  onSelectTier: (tier: PuzzleTier) => void;
  onSelectPuzzle: (puzzle: PuzzleDefinition) => void;
  onBack: () => void;
}> = ({ selectedTier, onSelectTier, onSelectPuzzle, onBack }) => {
  const tiers = getTierSummary();
  const puzzles = getPuzzlesByTier(selectedTier);
  const data = loadPuzzleData();

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={onBack} style={s.backBtn}>Back</button>
        <h1 style={s.title}>Lethal Puzzles</h1>
        <p style={s.subtitle}>
          Find lethal in 1 turn. {data.totalSolved}/{PUZZLES.length} solved
        </p>
      </div>

      {/* Tier tabs */}
      <div style={s.tierTabs}>
        {tiers.map(({ tier, count, info }) => {
          const completion = getTierCompletion(tier);
          const active = tier === selectedTier;
          return (
            <button
              key={tier}
              onClick={() => onSelectTier(tier)}
              style={{
                ...s.tierTab,
                borderColor: active ? info.color : 'transparent',
                background: active ? `${info.color}15` : 'transparent',
                color: active ? info.color : '#888',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{info.label}</div>
              <div style={{ fontSize: 11 }}>{completion.solved}/{count}</div>
            </button>
          );
        })}
      </div>

      {/* Puzzle list */}
      <div style={s.puzzleList}>
        {puzzles.map((puzzle) => {
          const solved = isPuzzleSolved(puzzle.id);
          const record = data.records[puzzle.id];
          return (
            <button
              key={puzzle.id}
              onClick={() => onSelectPuzzle(puzzle)}
              style={{
                ...s.puzzleCard,
                borderColor: solved ? '#4ade80' : 'rgba(255,255,255,0.15)',
              }}
            >
              <div style={s.puzzleHeader}>
                <span style={s.puzzleName}>{puzzle.name}</span>
                {solved && <span style={s.solvedBadge}>Solved</span>}
              </div>
              <div style={s.puzzleDesc}>{puzzle.description}</div>
              <div style={s.puzzleMeta}>
                <span>{RaceData[puzzle.playerRace].name}</span>
                <span>Crystals: {puzzle.playerCrystals}</span>
                <span>HP: {puzzle.opponentHP}</span>
                {record && <span>Attempts: {record.attempts}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        <div style={s.statBox}>
          <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{data.totalSolved}</div>
          <div style={{ color: '#888', fontSize: 11 }}>Solved</div>
        </div>
        <div style={s.statBox}>
          <div style={{ color: '#60a5fa', fontSize: 20, fontWeight: 'bold' }}>{data.totalAttempts}</div>
          <div style={{ color: '#888', fontSize: 11 }}>Attempts</div>
        </div>
        <div style={s.statBox}>
          <div style={{ color: '#c084fc', fontSize: 20, fontWeight: 'bold' }}>{data.stardustEarned}</div>
          <div style={{ color: '#888', fontSize: 11 }}>Stardust</div>
        </div>
      </div>
    </div>
  );
};

// ─── PUZZLE SOLVER ──────────────────────────────────────────────────────────

const PuzzleSolver: React.FC<{
  puzzle: PuzzleDefinition;
  onBack: () => void;
  onSolved: () => void;
}> = ({ puzzle, onBack, onSolved }) => {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const tierInfo = TIER_INFO[puzzle.tier];

  return (
    <div style={s.container}>
      <div style={s.solverHeader}>
        <button onClick={onBack} style={s.backBtn}>Back</button>
        <div>
          <span style={{ color: tierInfo.color, fontSize: 12, textTransform: 'uppercase' }}>
            {tierInfo.label}
          </span>
          <h2 style={{ color: '#ffd700', margin: '2px 0', fontSize: 20 }}>{puzzle.name}</h2>
        </div>
      </div>

      <p style={{ color: '#ccc', fontSize: 14, textAlign: 'center', margin: '0 0 16px' }}>
        {puzzle.description}
      </p>

      {/* Board visualization */}
      <div style={s.boardVisual}>
        {/* Opponent side */}
        <div style={s.sideLabel}>
          <span style={s.hpBadge}>Hero HP: {puzzle.opponentHP}</span>
        </div>
        <div style={s.boardRow}>
          {puzzle.opponentBoard.length === 0 ? (
            <div style={s.emptyBoard}>No minions</div>
          ) : (
            puzzle.opponentBoard.map((m, i) => (
              <div key={i} style={s.minionCard}>
                <div style={s.minionName}>{m.name}</div>
                <div style={s.minionStats}>{m.attack}/{m.health}</div>
                {m.keywords.length > 0 && (
                  <div style={s.minionKeywords}>{m.keywords.join(', ')}</div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={s.divider} />

        {/* Player side */}
        <div style={s.boardRow}>
          {puzzle.playerBoard.length === 0 ? (
            <div style={s.emptyBoard}>No minions</div>
          ) : (
            puzzle.playerBoard.map((m, i) => (
              <div key={i} style={{
                ...s.minionCard,
                borderColor: m.canAttack ? '#4ade80' : '#555',
              }}>
                <div style={s.minionName}>{m.name}</div>
                <div style={s.minionStats}>{m.attack}/{m.health}</div>
                {m.keywords.length > 0 && (
                  <div style={s.minionKeywords}>{m.keywords.join(', ')}</div>
                )}
                {m.canAttack && <div style={s.canAttackBadge}>Can Attack</div>}
              </div>
            ))
          )}
        </div>
        <div style={s.sideLabel}>
          <span style={s.hpBadge}>Your HP: {puzzle.playerHP}</span>
          <span style={s.crystalBadge}>Crystals: {puzzle.playerCrystals}</span>
        </div>

        {/* Hand */}
        {puzzle.playerHand.length > 0 && (
          <div style={s.handSection}>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>Hand:</div>
            <div style={s.handRow}>
              {puzzle.playerHand.map((card, i) => (
                <div key={i} style={s.handCard}>
                  <div style={s.handCardCost}>{card.cost}</div>
                  <div style={s.handCardName}>{card.name}</div>
                  {card.type === 'MINION' && (
                    <div style={s.handCardStats}>{card.attack}/{card.health}</div>
                  )}
                  {card.effect && <div style={s.handCardEffect}>{card.effect}</div>}
                  {card.keywords && card.keywords.length > 0 && (
                    <div style={s.minionKeywords}>{card.keywords.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={s.controlRow}>
        {!showHint && (
          <button onClick={() => setShowHint(true)} style={s.hintBtn}>
            Show Hint
          </button>
        )}
        {!showSolution && (
          <button onClick={() => setShowSolution(true)} style={s.solutionBtn}>
            Show Solution
          </button>
        )}
        <button onClick={onSolved} style={s.solvedBtn}>
          Mark as Solved
        </button>
      </div>

      {showHint && (
        <div style={s.hintBox}>
          <strong>Hint:</strong> {puzzle.hint}
        </div>
      )}

      {showSolution && (
        <div style={s.solutionBox}>
          <strong>Solution:</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: 20 }}>
            {puzzle.solutionSteps.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: '#ccc', marginBottom: 2 }}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

// ─── STYLES ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: `url(${backgroundImg}) center/cover no-repeat, linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)`,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'auto',
    padding: 20,
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: '#ffd700',
    margin: '0 0 4px',
    textShadow: '0 2px 10px rgba(255,215,0,0.3)',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    margin: 0,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ccc',
    padding: '6px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    marginBottom: 8,
  },
  tierTabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tierTab: {
    padding: '8px 14px',
    borderRadius: 6,
    border: '2px solid transparent',
    cursor: 'pointer',
    textAlign: 'center',
    background: 'transparent',
    transition: 'all 0.2s',
  },
  puzzleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    maxWidth: 600,
    marginBottom: 16,
  },
  puzzleCard: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#fff',
    transition: 'all 0.2s',
  },
  puzzleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  puzzleName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  solvedBadge: {
    fontSize: 11,
    background: '#4ade80',
    color: '#000',
    padding: '1px 6px',
    borderRadius: 3,
    fontWeight: 'bold',
  },
  puzzleDesc: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 4,
  },
  puzzleMeta: {
    display: 'flex',
    gap: 12,
    fontSize: 11,
    color: '#666',
  },
  statsRow: {
    display: 'flex',
    gap: 20,
    justifyContent: 'center',
  },
  statBox: {
    textAlign: 'center',
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 16px',
    borderRadius: 6,
  },

  // Solver
  solverHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    width: '100%',
    maxWidth: 600,
  },
  boardVisual: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 600,
    marginBottom: 16,
  },
  sideLabel: {
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  hpBadge: {
    fontSize: 13,
    color: '#f87171',
    background: 'rgba(248,113,113,0.1)',
    padding: '2px 10px',
    borderRadius: 4,
  },
  crystalBadge: {
    fontSize: 13,
    color: '#60a5fa',
    background: 'rgba(96,165,250,0.1)',
    padding: '2px 10px',
    borderRadius: 4,
  },
  boardRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    minHeight: 60,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '8px 0',
  },
  emptyBoard: {
    fontSize: 13,
    color: '#555',
    fontStyle: 'italic',
    padding: '20px 0',
  },
  minionCard: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #555',
    borderRadius: 6,
    padding: '6px 10px',
    textAlign: 'center',
    minWidth: 80,
  },
  minionName: {
    fontSize: 11,
    color: '#ccc',
    marginBottom: 2,
  },
  minionStats: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  minionKeywords: {
    fontSize: 10,
    color: '#60a5fa',
    marginTop: 2,
  },
  canAttackBadge: {
    fontSize: 9,
    color: '#4ade80',
    marginTop: 2,
  },
  handSection: {
    marginTop: 12,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  handRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  handCard: {
    background: 'rgba(96,165,250,0.1)',
    border: '1px solid rgba(96,165,250,0.3)',
    borderRadius: 6,
    padding: '6px 10px',
    textAlign: 'center',
    minWidth: 90,
  },
  handCardCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  handCardName: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 1,
  },
  handCardStats: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffd700',
    marginTop: 2,
  },
  handCardEffect: {
    fontSize: 10,
    color: '#aaa',
    fontStyle: 'italic',
    marginTop: 2,
  },
  controlRow: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  hintBtn: {
    background: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.3)',
    color: '#fbbf24',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  solutionBtn: {
    background: 'rgba(192,132,252,0.1)',
    border: '1px solid rgba(192,132,252,0.3)',
    color: '#c084fc',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
  solvedBtn: {
    background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    color: '#000',
    border: 'none',
    padding: '8px 20px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 'bold',
  },
  hintBox: {
    background: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#fbbf24',
    width: '100%',
    maxWidth: 600,
    marginBottom: 8,
  },
  solutionBox: {
    background: 'rgba(192,132,252,0.1)',
    border: '1px solid rgba(192,132,252,0.2)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#c084fc',
    width: '100%',
    maxWidth: 600,
  },
};

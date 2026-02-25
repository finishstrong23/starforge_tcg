/**
 * STARFORGE TCG - Balance Tester UI
 * High-performance in-browser AI vs AI simulation
 */

import React, { useState, useRef, useCallback } from 'react';
import { AIBattleSimulator } from '../../ai/AIBattleSimulator';
import type { BalanceReport, MatchupStats } from '../../ai/AIBattleSimulator';
import { AIDifficulty } from '../../ai/AIPlayer';
import { Race, RaceData } from '../../types/Race';
import { globalCardDatabase } from '../../cards';
import { ALL_SAMPLE_CARDS } from '../../data/SampleCards';
import { GameEngine } from '../../engine/GameEngine';
import { globalCardFactory } from '../../cards';
import { getHeroByRace } from '../../heroes';

interface BalanceTesterProps {
  onBack: () => void;
}

const RACES = [
  Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
  Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE, Race.HIVEMIND,
  Race.ASTROMANCERS, Race.CHRONOBOUND,
];

const RACE_COLORS: Record<string, string> = {
  [Race.COGSMITHS]:        '#f59e0b',
  [Race.LUMINAR]:          '#60a5fa',
  [Race.PYROCLAST]:        '#ef4444',
  [Race.VOIDBORN]:         '#7c3aed',
  [Race.BIOTITANS]:        '#22c55e',
  [Race.CRYSTALLINE]:      '#a855f7',
  [Race.PHANTOM_CORSAIRS]: '#6366f1',
  [Race.HIVEMIND]:         '#84cc16',
  [Race.ASTROMANCERS]:     '#06b6d4',
  [Race.CHRONOBOUND]:      '#f97316',
};

/** Display planet name instead of race enum */
const planetName = (race: Race | string): string => {
  const data = RaceData[race as Race];
  return data ? data.planet : String(race);
};

const PRESETS = [
  { label: '100', value: 100 },
  { label: '500', value: 500 },
  { label: '1,000', value: 1000 },
  { label: '5,000', value: 5000 },
  { label: '10,000', value: 10000 },
];

interface ProgressState {
  matchupIndex: number;
  totalMatchups: number;
  matchupLabel: string;
  gamesCompleted: number;
  gamesTotal: number;
  gamesPerSecond: number;
}

export const BalanceTester: React.FC<BalanceTesterProps> = ({ onBack }) => {
  const [gamesPerMatchup, setGamesPerMatchup] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [report, setReport] = useState<BalanceReport | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const simulatorRef = useRef<AIBattleSimulator | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const totalMatchups = (RACES.length * (RACES.length - 1)) / 2;
  const totalGames = gamesPerMatchup * totalMatchups;

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const runTest = useCallback(async () => {
    setIsRunning(true);
    setReport(null);
    setProgress(null);
    setElapsedMs(0);
    setError(null);

    startTimeRef.current = performance.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(performance.now() - startTimeRef.current);
    }, 200);

    const simulator = new AIBattleSimulator({
      gamesPerMatchup,
      aiDifficulty: AIDifficulty.HARD,
      parallelBatchSize: Math.min(100, gamesPerMatchup),
    });
    simulatorRef.current = simulator;

    try {
      const result = await simulator.runFullBalanceTest(RACES, (p) => {
        setProgress({ ...p });
      });
      setReport(result);
    } catch (err) {
      console.error('Balance test error:', err);
      setError(String(err));
    }

    stopTimer();
    setIsRunning(false);
    simulatorRef.current = null;
  }, [gamesPerMatchup]);

  const abortTest = useCallback(() => {
    simulatorRef.current?.abort();
    stopTimer();
    setIsRunning(false);
  }, []);

  // Quick single-game smoke test
  const runSmokeTest = useCallback(async () => {
    setError(null);
    try {
      globalCardDatabase.registerCards(ALL_SAMPLE_CARDS);
      const r1 = Race.COGSMITHS, r2 = Race.LUMINAR;
      const buildDeck = (race: Race, pid: string) => {
        const ids = ALL_SAMPLE_CARDS
          .filter(c => c.collectible && (c.race === race || !c.race))
          .slice(0, 15)
          .flatMap(c => [c.id, c.id])
          .slice(0, 30);
        return {
          cards: ids.map(id => globalCardFactory.createInstance(id, { ownerId: pid })),
          heroId: getHeroByRace(race)?.id || '',
        };
      };
      const d1 = buildDeck(r1, 'p1'), d2 = buildDeck(r2, 'p2');
      const engine = new GameEngine();
      engine.initializeGame(
        { id: 'p1', name: 'Test1', race: r1, heroId: d1.heroId, deck: d1.cards },
        { id: 'p2', name: 'Test2', race: r2, heroId: d2.heroId, deck: d2.cards }
      );
      engine.startGame();
      const state = engine.getState();
      setError(`✅ Smoke test OK — phase: ${state.phase}, activePlayer: ${state.activePlayerId}, deckSizes: ${d1.cards.length}/${d2.cards.length}`);
    } catch (e) {
      setError(`❌ Smoke test FAILED: ${e}`);
    }
  }, []);

  const getWinRateColor = (rate: number) => {
    if (rate >= 0.58) return '#ef4444';
    if (rate >= 0.53) return '#f97316';
    if (rate >= 0.47) return '#22c55e';
    if (rate >= 0.42) return '#f97316';
    return '#60a5fa';
  };

  const getBalanceLabel = (spread: number) => {
    if (spread < 0.06) return { text: '✅ EXCELLENT', color: '#22c55e' };
    if (spread < 0.12) return { text: '🟡 GOOD', color: '#86efac' };
    if (spread < 0.20) return { text: '🟠 MODERATE', color: '#f59e0b' };
    return { text: '🔴 IMBALANCED', color: '#ef4444' };
  };

  const winRates = report
    ? [...report.raceWinRates.entries()].sort((a, b) => b[1].winRate - a[1].winRate)
    : [];

  const spread = winRates.length >= 2
    ? winRates[0][1].winRate - winRates[winRates.length - 1][1].winRate
    : 0;

  const balanceLabel = report ? getBalanceLabel(spread) : null;

  // Overall progress across ALL games
  const overallCompleted = progress
    ? (progress.matchupIndex - 1) * gamesPerMatchup + progress.gamesCompleted
    : 0;
  const overallPct = totalGames > 0 ? (overallCompleted / totalGames) * 100 : 0;

  const fmtMs = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '20px', boxSizing: 'border-box',
      color: '#e2e8f0', fontFamily: 'monospace',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
      overflow: 'auto',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <button onClick={onBack} style={btnStyle}>← Back</button>
        <h1 style={{ margin: 0, fontSize: '22px', color: '#f59e0b' }}>⚖️ STARFORGE Balance Tester</h1>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#475569' }}>
          {RACES.length} planets · {totalMatchups} matchups
        </div>
      </div>

      {/* Controls */}
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Games per matchup:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setGamesPerMatchup(p.value)}
                disabled={isRunning}
                style={{
                  ...btnStyle,
                  background: gamesPerMatchup === p.value ? '#f59e0b' : 'rgba(255,255,255,0.07)',
                  color: gamesPerMatchup === p.value ? '#000' : '#94a3b8',
                  fontWeight: gamesPerMatchup === p.value ? 'bold' : 'normal',
                  padding: '6px 12px',
                }}
              >
                {p.label}
              </button>
            ))}
            <input
              type="number"
              min={10}
              max={100000}
              value={gamesPerMatchup}
              onChange={e => setGamesPerMatchup(Math.max(10, Number(e.target.value)))}
              disabled={isRunning}
              style={{
                background: '#0f172a', border: '1px solid #334155',
                color: '#e2e8f0', borderRadius: '6px',
                padding: '6px 10px', width: '90px', fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ color: '#475569', fontSize: '12px' }}>
            = {totalGames.toLocaleString()} total games
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {!isRunning && report && (
              <button onClick={() => { setReport(null); setProgress(null); setError(null); setElapsedMs(0); }} style={{ ...btnStyle, padding: '10px 16px', fontSize: '12px', color: '#94a3b8' }}>
                🗑 Clear
              </button>
            )}
            {!isRunning && (
              <button onClick={runSmokeTest} style={{ ...btnStyle, padding: '10px 16px', fontSize: '12px', color: '#94a3b8' }}>
                🔬 Test
              </button>
            )}
            {isRunning ? (
              <button onClick={abortTest} style={{ ...btnStyle, background: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', padding: '10px 24px' }}>
                ⛔ Abort
              </button>
            ) : (
              <button onClick={runTest} style={{ ...btnStyle, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', fontWeight: 'bold', padding: '10px 28px', fontSize: '15px' }}>
                ▶ Run
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {(isRunning || (report && progress)) && (
        <div style={{ ...panelStyle, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            <span>
              {isRunning
                ? `${progress?.matchupLabel ?? 'Starting...'} [${progress?.matchupIndex ?? 0}/${progress?.totalMatchups ?? totalMatchups}]`
                : '✅ Complete'}
            </span>
            <span style={{ color: '#f59e0b' }}>
              {progress?.gamesPerSecond ? `${progress.gamesPerSecond.toLocaleString()} games/sec` : ''}
              {' · '}{fmtMs(report?.totalDurationMs ?? elapsedMs)}
            </span>
          </div>
          {/* Overall bar */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '4px' }}>
            <div style={{
              background: isRunning ? '#f59e0b' : '#22c55e',
              height: '100%',
              width: `${isRunning ? overallPct : 100}%`,
              borderRadius: '4px',
              transition: 'width 0.2s ease',
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            {overallCompleted.toLocaleString()} / {totalGames.toLocaleString()} games
            {report && ` · ${report.gamesPerSecond.toLocaleString()} avg games/sec`}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{ ...panelStyle, background: 'rgba(127,29,29,0.4)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px' }}>
          ❌ Error: {error}
          <div style={{ color: '#f87171', marginTop: '4px', fontSize: '11px' }}>Check browser console (F12) for details.</div>
        </div>
      )}

      {/* Results */}
      {report && (
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, marginTop: '4px' }}>

          {/* Left: Overall win rates */}
          <div style={{ ...panelStyle, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '14px' }}>
              PLANET PERFORMANCE
              <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: 'normal', color: balanceLabel?.color }}>
                {balanceLabel?.text} (spread {(spread * 100).toFixed(1)}%)
              </span>
            </div>

            {winRates.map(([race, stats], rank) => (
              <div key={race} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: RACE_COLORS[race] }}>
                    #{rank + 1} {planetName(race)}
                  </span>
                  <span style={{ color: getWinRateColor(stats.winRate), fontWeight: 'bold' }}>
                    {(stats.winRate * 100).toFixed(1)}%
                    <span style={{ color: '#475569', fontWeight: 'normal', marginLeft: '8px', fontSize: '11px' }}>
                      {stats.wins}W / {stats.losses}L / {stats.draws}D
                    </span>
                  </span>
                </div>
                <div style={{ position: 'relative', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', height: '8px' }}>
                  {/* 50% marker */}
                  <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: '#334155' }} />
                  <div style={{
                    background: RACE_COLORS[race],
                    height: '100%',
                    width: `${stats.winRate * 100}%`,
                    borderRadius: '3px',
                    opacity: 0.85,
                  }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: '16px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '11px', color: '#64748b' }}>
              {report.totalGames.toLocaleString()} games · {fmtMs(report.totalDurationMs)} · {report.gamesPerSecond.toLocaleString()} g/s
            </div>
          </div>

          {/* Right: Matchup grid */}
          <div style={{ ...panelStyle, flex: 1.2, minWidth: 0, overflow: 'auto' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '14px' }}>
              MATCHUP BREAKDOWN
            </div>

            {report.matchups.map((m: MatchupStats, i: number) => {
              const r1pct = (m.race1WinRate * 100).toFixed(1);
              const r2pct = (m.race2WinRate * 100).toFixed(1);
              const winner = m.race1Wins > m.race2Wins ? m.race1 : m.race2Wins > m.race1Wins ? m.race2 : null;
              return (
                <div key={i} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: RACE_COLORS[m.race1], minWidth: '90px' }}>{planetName(m.race1)}</span>
                    <span style={{ color: '#334155' }}>vs</span>
                    <span style={{ color: RACE_COLORS[m.race2], minWidth: '90px' }}>{planetName(m.race2)}</span>
                    <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '11px' }}>
                      ~{m.averageTurns.toFixed(0)} turns
                    </span>
                  </div>
                  {/* Split bar */}
                  <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${m.race1WinRate * 100}%`, background: RACE_COLORS[m.race1], opacity: 0.8 }} />
                    <div style={{ width: `${(m.draws / m.gamesPlayed) * 100}%`, background: '#334155' }} />
                    <div style={{ flex: 1, background: RACE_COLORS[m.race2], opacity: 0.8 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                    <span style={{ color: winner === m.race1 ? '#e2e8f0' : '#475569' }}>{r1pct}% ({m.race1Wins}W)</span>
                    {m.draws > 0 && <span>{m.draws}D</span>}
                    <span style={{ color: winner === m.race2 ? '#e2e8f0' : '#475569' }}>{r2pct}% ({m.race2Wins}W)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#e2e8f0',
  padding: '7px 14px',
  borderRadius: '7px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '13px',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '12px',
};

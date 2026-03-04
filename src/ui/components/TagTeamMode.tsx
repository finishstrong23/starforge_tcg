/**
 * STARFORGE TCG - 2v2 Tag Team Mode UI (8.2.3)
 *
 * Full Tag Team experience:
 * - Team setup (pick faction + AI partner)
 * - Synergy display
 * - Tag Team battle with shared HP
 * - Match results with MVP
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';
import { GameProvider } from '../context/GameContext';
import { GameBoard } from './GameBoard';
import {
  TagTeamConfig,
  DEFAULT_TAG_TEAM_CONFIG,
  PingType,
  PING_DATA,
  TEAM_SYNERGIES,
  AI_TEAMMATES,
  getTeamSynergy,
  getRandomAITeammate,
  createTagTeamMatch,
  getCurrentPlayer,
  saveTagTeamRecord,
  getTagTeamStats,
  type TagTeamMatchState,
  type TagTeamRecord,
} from '../../tagteam';
import { SpaceBackground } from './SpaceBackground';

interface TagTeamModeProps {
  onBack: () => void;
}

type TagTeamPhase = 'setup' | 'battle' | 'results';

export const TagTeamMode: React.FC<TagTeamModeProps> = ({ onBack }) => {
  const [phase, setPhase] = useState<TagTeamPhase>('setup');
  const [playerRace, setPlayerRace] = useState<Race>(Race.COGSMITHS);
  const [partnerRace, setPartnerRace] = useState<Race | null>(null);
  const [partnerName, setPartnerName] = useState<string>('');
  const [matchState, setMatchState] = useState<TagTeamMatchState | null>(null);
  const [battleWon, setBattleWon] = useState(false);

  const stats = useMemo(() => getTagTeamStats(), []);

  const availableRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  const synergy = useMemo(() => {
    if (!partnerRace) return null;
    return getTeamSynergy(playerRace, partnerRace);
  }, [playerRace, partnerRace]);

  const handleAutoPartner = useCallback(() => {
    const ai = getRandomAITeammate(playerRace);
    setPartnerRace(ai.race);
    setPartnerName(ai.name);
  }, [playerRace]);

  const handleStartBattle = useCallback(() => {
    if (!partnerRace) return;

    // Create enemy team with 2 random AI opponents
    const enemy1Race = availableRaces[Math.floor(Math.random() * availableRaces.length)];
    let enemy2Race = availableRaces[Math.floor(Math.random() * availableRaces.length)];
    while (enemy2Race === enemy1Race) {
      enemy2Race = availableRaces[Math.floor(Math.random() * availableRaces.length)];
    }

    const match = createTagTeamMatch(
      [
        { name: 'You', race: playerRace, isAI: false },
        { name: partnerName || 'AI Partner', race: partnerRace, isAI: true },
      ],
      [
        { name: 'Enemy Captain', race: enemy1Race, isAI: true },
        { name: 'Enemy Lieutenant', race: enemy2Race, isAI: true },
      ],
    );

    setMatchState(match);
    setPhase('battle');
  }, [playerRace, partnerRace, partnerName, availableRaces]);

  const handleBattleEnd = useCallback((won: boolean) => {
    setBattleWon(won);

    if (matchState && partnerRace) {
      const record: TagTeamRecord = {
        date: Date.now(),
        team1Races: [playerRace, partnerRace],
        team2Races: [matchState.team2[0].race, matchState.team2[1].race],
        won,
        turnCount: matchState.turnCount,
        synergyUsed: synergy?.name || null,
      };
      saveTagTeamRecord(record);
    }

    setPhase('results');
  }, [matchState, playerRace, partnerRace, synergy]);

  // ── Setup Phase ──
  if (phase === 'setup') {
    return (
      <div style={st.container}>
        <SpaceBackground />
        <div style={st.header}>
          <button style={st.backBtn} onClick={onBack}>&larr; Back</button>
          <h1 style={st.title}>2v2 Tag Team</h1>
          <p style={st.subtitle}>Team up with an AI partner and battle a duo of enemies!</p>
        </div>

        {/* Stats bar */}
        {stats.totalGames > 0 && (
          <div style={st.statsBar}>
            <span>Record: <b style={{ color: '#4ade80' }}>{stats.wins}W</b> / <b style={{ color: '#f87171' }}>{stats.losses}L</b></span>
            {stats.bestSynergy && <span>Best Synergy: <b style={{ color: '#fbbf24' }}>{stats.bestSynergy}</b></span>}
          </div>
        )}

        {/* Your Faction */}
        <div style={st.section}>
          <h3 style={st.sectionTitle}>Your Faction</h3>
          <div style={st.raceGrid}>
            {availableRaces.map(race => {
              const info = RaceData[race];
              const sel = playerRace === race;
              return (
                <button
                  key={race}
                  style={{
                    ...st.raceCard,
                    borderColor: sel ? '#00ff88' : '#2a2a44',
                    background: sel ? 'rgba(0,255,136,0.08)' : 'rgba(15,15,30,0.8)',
                  }}
                  onClick={() => {
                    setPlayerRace(race);
                    if (partnerRace === race) setPartnerRace(null);
                  }}
                >
                  <div style={{ color: sel ? '#00ff88' : '#ccc', fontWeight: 'bold', fontSize: 12 }}>
                    {info.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Partner Selection */}
        <div style={st.section}>
          <h3 style={st.sectionTitle}>
            Partner Faction
            <button style={st.randomBtn} onClick={handleAutoPartner}>Random AI</button>
          </h3>
          <div style={st.raceGrid}>
            {availableRaces.filter(r => r !== playerRace).map(race => {
              const info = RaceData[race];
              const sel = partnerRace === race;
              const hasSynergy = !!getTeamSynergy(playerRace, race);
              return (
                <button
                  key={race}
                  style={{
                    ...st.raceCard,
                    borderColor: sel ? '#60a5fa' : hasSynergy ? '#fbbf24' : '#2a2a44',
                    background: sel ? 'rgba(96,165,250,0.08)' : 'rgba(15,15,30,0.8)',
                  }}
                  onClick={() => {
                    setPartnerRace(race);
                    const ai = AI_TEAMMATES.find(t => t.race === race);
                    setPartnerName(ai?.name || RaceData[race].name + ' Ally');
                  }}
                >
                  <div style={{ color: sel ? '#60a5fa' : '#ccc', fontWeight: 'bold', fontSize: 12 }}>
                    {info.name}
                  </div>
                  {hasSynergy && <div style={{ color: '#fbbf24', fontSize: 9 }}>SYNERGY</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Synergy Display */}
        {synergy && (
          <div style={st.synergyBox}>
            <div style={st.synergyTitle}>Team Synergy: {synergy.name}</div>
            <div style={st.synergyDesc}>{synergy.description}</div>
          </div>
        )}

        {/* Team Preview */}
        {partnerRace && (
          <div style={st.teamPreview}>
            <div style={st.teamMember}>
              <div style={{ color: '#00ff88', fontWeight: 'bold' }}>{RaceData[playerRace].name}</div>
              <div style={{ color: '#888', fontSize: 11 }}>You</div>
            </div>
            <div style={{ color: '#ffd700', fontSize: 20 }}>&amp;</div>
            <div style={st.teamMember}>
              <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{RaceData[partnerRace].name}</div>
              <div style={{ color: '#888', fontSize: 11 }}>{partnerName}</div>
            </div>
            <div style={{ color: '#888', fontSize: 12 }}>Shared HP: 50</div>
          </div>
        )}

        {/* Start Button */}
        <button
          style={{
            ...st.startBtn,
            opacity: partnerRace ? 1 : 0.4,
            pointerEvents: partnerRace ? 'auto' : 'none',
          }}
          onClick={handleStartBattle}
        >
          Start Tag Team Battle
        </button>
      </div>
    );
  }

  // ── Battle Phase ──
  if (phase === 'battle' && matchState) {
    return (
      <TagTeamBattle
        matchState={matchState}
        playerRace={playerRace}
        onEnd={handleBattleEnd}
        synergy={synergy}
      />
    );
  }

  // ── Results Phase ──
  return (
    <div style={st.container}>
      <SpaceBackground />
      <div style={st.resultsPanel}>
        <div style={{
          ...st.resultBanner,
          background: battleWon
            ? 'linear-gradient(135deg, rgba(74,222,128,0.2), rgba(34,197,94,0.1))'
            : 'linear-gradient(135deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1))',
          borderColor: battleWon ? '#4ade80' : '#f87171',
        }}>
          <div style={{ fontSize: 32, fontWeight: 'bold', letterSpacing: 4, color: battleWon ? '#4ade80' : '#f87171' }}>
            {battleWon ? 'TEAM VICTORY' : 'TEAM DEFEAT'}
          </div>
          <div style={{ color: '#aaa', fontSize: 14, marginTop: 4 }}>
            {RaceData[playerRace].name} &amp; {partnerRace ? RaceData[partnerRace].name : '???'}
          </div>
        </div>

        {synergy && (
          <div style={{ ...st.synergyBox, marginTop: 16 }}>
            <div style={st.synergyTitle}>Synergy Active: {synergy.name}</div>
          </div>
        )}

        <div style={st.rewardsRow}>
          <div style={st.rewardItem}>
            <span style={{ fontSize: 20 }}>&#11088;</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>+{battleWon ? 120 : 40} XP</span>
          </div>
          <div style={st.rewardItem}>
            <span style={{ fontSize: 20 }}>&#128176;</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>+{battleWon ? 20 : 8} Gold</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button style={st.startBtn} onClick={() => setPhase('setup')}>Play Again</button>
          <button style={st.backBtn} onClick={onBack}>Main Menu</button>
        </div>
      </div>
    </div>
  );
};

// ─── Tag Team Battle Sub-Component ──────────────────────────────────────────

interface TagTeamBattleProps {
  matchState: TagTeamMatchState;
  playerRace: Race;
  onEnd: (won: boolean) => void;
  synergy: { name: string; description: string } | null;
}

const TagTeamBattle: React.FC<TagTeamBattleProps> = ({ matchState, playerRace, onEnd, synergy }) => {
  const [showPings, setShowPings] = useState(false);

  const enemyRace = matchState.team2[0].race;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Tag Team HUD overlay */}
      <div style={st.tagHUD}>
        <div style={st.teamHP}>
          <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 'bold' }}>YOUR TEAM</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{matchState.config.teamHealth} HP</div>
          <div style={{ color: '#888', fontSize: 10 }}>
            {RaceData[matchState.team1[0].race].name} + {RaceData[matchState.team1[1].race].name}
          </div>
        </div>
        {synergy && (
          <div style={st.synergyBadge}>
            <div style={{ color: '#fbbf24', fontSize: 10, fontWeight: 'bold' }}>{synergy.name}</div>
          </div>
        )}
        <div style={st.teamHP}>
          <div style={{ color: '#f87171', fontSize: 11, fontWeight: 'bold' }}>ENEMY TEAM</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{matchState.config.teamHealth} HP</div>
          <div style={{ color: '#888', fontSize: 10 }}>
            {RaceData[matchState.team2[0].race].name} + {RaceData[matchState.team2[1].race].name}
          </div>
        </div>
      </div>

      {/* Ping button */}
      <button
        style={st.pingBtn}
        onClick={() => setShowPings(!showPings)}
      >
        &#x1F4E3; Ping
      </button>

      {showPings && (
        <div style={st.pingMenu}>
          {Object.values(PingType).map(pt => {
            const data = PING_DATA[pt];
            return (
              <button
                key={pt}
                style={{ ...st.pingItem, borderColor: data.color }}
                onClick={() => setShowPings(false)}
              >
                <span>{data.icon}</span>
                <span style={{ color: data.color }}>{data.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Actual game board */}
      <GameProvider
        playerRace={playerRace}
        aiDifficulty={AIDifficulty.MEDIUM}
      >
        <GameBoard onBackToMenu={() => onEnd(false)} />
      </GameProvider>
    </div>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#040410',
    color: '#fff',
    padding: 20,
    overflowY: 'auto',
    gap: 16,
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    width: '100%',
    maxWidth: 600,
  },
  backBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '10px 20px',
    color: '#aaa',
    fontSize: 14,
    cursor: 'pointer',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#60a5fa',
    margin: '8px 0 4px',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
    margin: 0,
  },
  statsBar: {
    display: 'flex',
    gap: 24,
    fontSize: 13,
    color: '#aaa',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
  },
  section: {
    width: '100%',
    maxWidth: 600,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#ffd700',
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  raceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: 6,
  },
  raceCard: {
    padding: '8px 6px',
    borderRadius: 6,
    border: '2px solid #2a2a44',
    cursor: 'pointer',
    textAlign: 'center' as const,
    background: 'rgba(15,15,30,0.8)',
  },
  randomBtn: {
    background: 'rgba(96,165,250,0.15)',
    border: '1px solid rgba(96,165,250,0.3)',
    borderRadius: 6,
    padding: '4px 12px',
    color: '#60a5fa',
    fontSize: 11,
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  synergyBox: {
    background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.03))',
    border: '1px solid rgba(251,191,36,0.3)',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center' as const,
    width: '100%',
    maxWidth: 600,
  },
  synergyTitle: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 14,
  },
  synergyDesc: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  teamPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    justifyContent: 'center' as const,
  },
  teamMember: {
    textAlign: 'center' as const,
    padding: '8px 16px',
  },
  startBtn: {
    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
    border: 'none',
    borderRadius: 10,
    padding: '14px 40px',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(96,165,250,0.3)',
  },
  // Battle HUD
  tagHUD: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.8), transparent)',
    zIndex: 100,
    pointerEvents: 'none' as const,
  },
  teamHP: {
    textAlign: 'center' as const,
  },
  synergyBadge: {
    background: 'rgba(251,191,36,0.15)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  pingBtn: {
    position: 'absolute' as const,
    bottom: 80,
    right: 16,
    background: 'rgba(251,191,36,0.2)',
    border: '1px solid rgba(251,191,36,0.4)',
    borderRadius: 20,
    padding: '8px 16px',
    color: '#fbbf24',
    fontSize: 13,
    cursor: 'pointer',
    zIndex: 100,
  },
  pingMenu: {
    position: 'absolute' as const,
    bottom: 120,
    right: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    background: 'rgba(0,0,0,0.9)',
    borderRadius: 10,
    padding: 8,
    zIndex: 101,
  },
  pingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #333',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    fontSize: 12,
  },
  // Results
  resultsPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
    padding: 24,
    maxWidth: 500,
  },
  resultBanner: {
    textAlign: 'center' as const,
    padding: 20,
    borderRadius: 12,
    border: '1px solid',
    width: '100%',
  },
  rewardsRow: {
    display: 'flex',
    gap: 24,
  },
  rewardItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,215,0,0.1)',
    borderRadius: 8,
    padding: '8px 16px',
  },
};

/**
 * STARFORGE TCG - Main Menu Component
 *
 * Clean Hearthstone-inspired layout:
 * - Central play area with mode selection
 * - Bottom navigation bar for collection/shop/progression
 * - Minimal, elegant, not cluttered
 */

import React, { useState } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';
import { hapticTap } from '../capacitor';
import { StarforgeLogo } from './StarforgeLogo';
import { SpaceBackground } from './SpaceBackground';

interface MainMenuProps {
  onStartGame: (playerRace: Race, aiDifficulty: AIDifficulty) => void;
  onPlayFriend?: () => void;
  onBalanceTest?: () => void;
  onCampaign?: () => void;
  onDeckbuilder?: (playerRace: Race, aiDifficulty: AIDifficulty) => void;
  onTutorial?: () => void;
  onSettings?: () => void;
  onStats?: () => void;
  onCollection?: () => void;
  onCrafting?: () => void;
  onBattlePass?: () => void;
  onPacks?: () => void;
  onAchievements?: () => void;
  onDaily?: () => void;
  onTournament?: () => void;
  onReplays?: () => void;
  onLeaderboard?: () => void;
  onMetaDashboard?: () => void;
  onSpectate?: () => void;
  onDungeonRun?: () => void;
  onPuzzles?: () => void;
  onTagTeam?: () => void;
  onFactionWars?: () => void;
}

type MenuView = 'main' | 'play';

export const MainMenu: React.FC<MainMenuProps> = (props) => {
  const {
    onStartGame, onPlayFriend, onBalanceTest, onCampaign, onDeckbuilder,
    onTutorial, onSettings, onStats, onCollection, onCrafting,
    onBattlePass, onPacks, onAchievements, onDaily,
    onTournament, onReplays, onLeaderboard, onMetaDashboard, onSpectate,
    onDungeonRun, onPuzzles, onTagTeam, onFactionWars,
  } = props;

  const [view, setView] = useState<MenuView>('main');
  const [selectedRace, setSelectedRace] = useState<Race>(Race.COGSMITHS);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>(AIDifficulty.MEDIUM);


  const availableRaces = [
    Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.VOIDBORN,
    Race.BIOTITANS, Race.PHANTOM_CORSAIRS, Race.CRYSTALLINE,
    Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND,
  ];

  const difficulties = [
    { value: AIDifficulty.EASY, label: 'Easy' },
    { value: AIDifficulty.MEDIUM, label: 'Medium' },
    { value: AIDifficulty.HARD, label: 'Hard' },
  ];

  // ── Play Mode Selection ──
  if (view === 'play') {
    return (
      <div style={s.container}>
        <SpaceBackground />
        <div style={s.playView}>
          <h2 style={s.playTitle}>Select Race & Difficulty</h2>

          {/* Race Grid */}
          <div style={s.raceGrid}>
            {availableRaces.map((race) => {
              const info = RaceData[race];
              const sel = selectedRace === race;
              return (
                <button
                  key={race}
                  style={{
                    ...s.raceCard,
                    borderColor: sel ? '#00ff88' : '#2a2a44',
                    boxShadow: sel ? '0 0 12px rgba(0,255,136,0.3)' : 'none',
                    background: sel ? 'rgba(0,255,136,0.08)' : 'rgba(15,15,30,0.8)',
                  }}
                  onClick={() => setSelectedRace(race)}
                >
                  <div style={{ color: sel ? '#00ff88' : '#ccc', fontWeight: 'bold', fontSize: '13px' }}>
                    {info.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px' }}>{info.playstyle}</div>
                </button>
              );
            })}
          </div>

          {/* Difficulty */}
          <div style={s.diffRow}>
            {difficulties.map((d) => (
              <button
                key={d.value}
                style={{
                  ...s.diffBtn,
                  borderColor: selectedDifficulty === d.value ? '#ff6600' : '#2a2a44',
                  color: selectedDifficulty === d.value ? '#ff6600' : '#888',
                }}
                onClick={() => setSelectedDifficulty(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={s.playActions}>
            <button style={s.goBtn} onClick={() => { hapticTap(); onStartGame(selectedRace, selectedDifficulty); }}>
              Quick Play
            </button>
            {onDeckbuilder && (
              <button style={s.buildBtn} onClick={() => { hapticTap(); onDeckbuilder(selectedRace, selectedDifficulty); }}>
                Build Deck & Play
              </button>
            )}
          </div>

          <button style={s.backLink} onClick={() => setView('main')}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Main View ──
  return (
    <div style={s.container}>
      {/* Animated space background */}
      <SpaceBackground />

      {/* Top bar: settings & info */}
      <div style={s.topBar}>
        {onDaily && <button style={s.topBtn} onClick={onDaily}>Quests</button>}
        {onSettings && <button style={s.topBtn} onClick={onSettings}>Settings</button>}
        {onTutorial && <button style={s.topBtn} onClick={onTutorial}>How to Play</button>}
      </div>

      {/* Center: Logo + Play Modes */}
      <div style={s.center}>
        {/* Logo */}
        <div style={s.logoArea}>
          <StarforgeLogo width={320} />
        </div>

        {/* Primary Play Buttons - vertical stack */}
        <div style={s.modeStack}>
          {onCampaign && (
            <button style={s.modeBtn} onClick={() => { hapticTap(); onCampaign(); }}>
              <span style={s.modeBtnIcon}>&#x2694;</span>
              <span style={s.modeBtnLabel}>Story Mode</span>
            </button>
          )}
          <button style={{ ...s.modeBtn, ...s.modeBtnAlt }} onClick={() => { hapticTap(); setView('play'); }}>
            <span style={s.modeBtnIcon}>&#x269B;</span>
            <span style={s.modeBtnLabel}>Quick Play</span>
          </button>
          {onTournament && (
            <button style={{ ...s.modeBtn, ...s.modeBtnTourney }} onClick={() => { hapticTap(); onTournament(); }}>
              <span style={s.modeBtnIcon}>&#x2605;</span>
              <span style={s.modeBtnLabel}>Tournament</span>
            </button>
          )}
          {onDungeonRun && (
            <button style={{ ...s.modeBtn, background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }} onClick={() => { hapticTap(); onDungeonRun(); }}>
              <span style={s.modeBtnIcon}>&#x1F3F0;</span>
              <span style={s.modeBtnLabel}>Dungeon Run</span>
            </button>
          )}
          {onPuzzles && (
            <button style={{ ...s.modeBtn, background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }} onClick={() => { hapticTap(); onPuzzles(); }}>
              <span style={s.modeBtnIcon}>&#x1F9E9;</span>
              <span style={s.modeBtnLabel}>Lethal Puzzles</span>
            </button>
          )}
          {onTagTeam && (
            <button style={{ ...s.modeBtn, background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }} onClick={() => { hapticTap(); onTagTeam(); }}>
              <span style={s.modeBtnIcon}>&#x1F91D;</span>
              <span style={s.modeBtnLabel}>2v2 Tag Team</span>
            </button>
          )}
          {onFactionWars && (
            <button style={{ ...s.modeBtn, background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }} onClick={() => { hapticTap(); onFactionWars(); }}>
              <span style={s.modeBtnIcon}>&#x2694;</span>
              <span style={s.modeBtnLabel}>Faction Wars</span>
            </button>
          )}
          {onPlayFriend && (
            <button style={{ ...s.modeBtn, ...s.modeBtnFriend }} onClick={() => { hapticTap(); onPlayFriend(); }}>
              <span style={s.modeBtnIcon}>&#x2699;</span>
              <span style={s.modeBtnLabel}>Play vs Friend</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <div style={s.bottomBar}>
        {onCollection && (
          <button style={s.navBtn} onClick={onCollection}>
            <div style={s.navIcon}>&#x1F0CF;</div>
            <div style={s.navLabel}>Collection</div>
          </button>
        )}
        {onPacks && (
          <button style={s.navBtn} onClick={onPacks}>
            <div style={s.navIcon}>&#x1F381;</div>
            <div style={s.navLabel}>Shop</div>
          </button>
        )}
        {onCrafting && (
          <button style={s.navBtn} onClick={onCrafting}>
            <div style={s.navIcon}>&#x2728;</div>
            <div style={s.navLabel}>Craft</div>
          </button>
        )}
        {onBattlePass && (
          <button style={s.navBtn} onClick={onBattlePass}>
            <div style={s.navIcon}>&#x1F525;</div>
            <div style={s.navLabel}>Battle Pass</div>
          </button>
        )}
        {onAchievements && (
          <button style={s.navBtn} onClick={onAchievements}>
            <div style={s.navIcon}>&#x1F3C6;</div>
            <div style={s.navLabel}>Achieve</div>
          </button>
        )}
        {onLeaderboard && (
          <button style={s.navBtn} onClick={onLeaderboard}>
            <div style={s.navIcon}>&#x1F4CA;</div>
            <div style={s.navLabel}>Ladder</div>
          </button>
        )}
        {onSpectate && (
          <button style={s.navBtn} onClick={onSpectate}>
            <div style={s.navIcon}>&#x1F441;</div>
            <div style={s.navLabel}>Spectate</div>
          </button>
        )}
        {onReplays && (
          <button style={s.navBtn} onClick={onReplays}>
            <div style={s.navIcon}>&#x1F3AC;</div>
            <div style={s.navLabel}>Replays</div>
          </button>
        )}
        {onMetaDashboard && (
          <button style={s.navBtn} onClick={onMetaDashboard}>
            <div style={s.navIcon}>&#x1F4C8;</div>
            <div style={s.navLabel}>Meta</div>
          </button>
        )}
        {onStats && (
          <button style={s.navBtn} onClick={onStats}>
            <div style={s.navIcon}>&#x1F4CB;</div>
            <div style={s.navLabel}>Stats</div>
          </button>
        )}
      </div>
    </div>
  );
};

// ── Styles ──

const s: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#040410',
    position: 'relative',
    overflow: 'hidden',
  },

  // Top bar
  topBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    position: 'relative',
    zIndex: 10,
  },
  topBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '10px 16px',
    minHeight: '44px',
    color: '#aaa',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // Center area
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '32px',
    padding: '0 20px',
    overflowY: 'auto',
    minHeight: 0,
  },
  logoArea: {
    textAlign: 'center',
  },

  // Mode stack
  modeStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    maxWidth: '320px',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #ff6600 0%, #cc4400 100%)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 16px rgba(255,102,0,0.3)',
    transition: 'transform 0.15s',
  },
  modeBtnAlt: {
    background: 'linear-gradient(135deg, #00cc66 0%, #009944 100%)',
    boxShadow: '0 4px 16px rgba(0,204,102,0.3)',
  },
  modeBtnTourney: {
    background: 'linear-gradient(135deg, #ffcc00 0%, #dd9900 100%)',
    color: '#000',
    boxShadow: '0 4px 16px rgba(255,204,0,0.3)',
  },
  modeBtnFriend: {
    background: 'linear-gradient(135deg, #4488ff 0%, #2266cc 100%)',
    boxShadow: '0 4px 16px rgba(68,136,255,0.3)',
  },
  modeBtnIcon: {
    fontSize: '20px',
    width: '28px',
    textAlign: 'center',
  },
  modeBtnLabel: {
    flex: 1,
  },

  // Bottom nav bar
  bottomBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 8px 14px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
    flexWrap: 'wrap',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexShrink: 0,
  } as React.CSSProperties,
  navBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '8px 12px',
    borderRadius: '8px',
    minWidth: '58px',
    minHeight: '48px',
  },
  navIcon: {
    fontSize: '22px',
    lineHeight: '1',
  },
  navLabel: {
    fontSize: '11px',
    color: '#889',
    letterSpacing: '0.5px',
  },

  // Play view
  playView: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '20px',
    overflowY: 'auto',
    minHeight: 0,
  },
  playTitle: {
    fontSize: '22px',
    color: '#fff',
    margin: 0,
    letterSpacing: '1px',
  },
  raceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px',
    width: '100%',
    maxWidth: '600px',
  },
  raceCard: {
    padding: '12px 10px',
    borderRadius: '8px',
    border: '2px solid #2a2a44',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
    minHeight: '48px',
  },
  diffRow: {
    display: 'flex',
    gap: '8px',
  },
  diffBtn: {
    background: 'rgba(15,15,30,0.8)',
    border: '2px solid #2a2a44',
    borderRadius: '8px',
    padding: '12px 24px',
    minHeight: '48px',
    color: '#888',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  playActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  goBtn: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,204,102,0.4)',
  },
  buildBtn: {
    background: 'linear-gradient(135deg, #9933ff 0%, #7722cc 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(153,51,255,0.3)',
  },
  backLink: {
    background: 'transparent',
    border: 'none',
    color: '#667',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '12px 24px',
    minHeight: '44px',
    marginTop: '8px',
  },
};

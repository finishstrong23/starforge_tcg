/**
 * STARFORGE TCG — Main Menu
 *
 * Trimmed to two modes only:
 *   1. 1v1 Match — standard Hearthstone / MTG-style versus AI (race + difficulty)
 *   2. Dungeon Run — STS2-style roguelite mode
 *
 * Logo and background preserved. All other modes (story, puzzles, co-op,
 * collection, shop, crafting, battle pass, achievements, ladder, replays,
 * meta, stats, daily quests, settings, tutorial, play-vs-friend) are
 * removed from the landing page per design.
 */

import React, { useState } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';
import { hapticTap } from '../capacitor';
import { StarforgeLogo } from './StarforgeLogo';
import { SpaceBackground } from './SpaceBackground';

interface MainMenuProps {
  onStartGame: (playerRace: Race, aiDifficulty: AIDifficulty) => void;
  onDungeonRun?: () => void;
  onDeckbuilder?: (playerRace: Race, aiDifficulty: AIDifficulty) => void;

  // ── Deprecated props ───────────────────────────────────────────────────
  // These are kept for prop-interface compatibility with App.tsx but are no
  // longer rendered on the landing page.
  onPlayFriend?: () => void;
  onBalanceTest?: () => void;
  onCampaign?: () => void;
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
  onCoopDungeon?: () => void;
  onPuzzles?: () => void;
}

type MenuView = 'main' | 'play';

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onDungeonRun,
  onDeckbuilder,
}) => {
  const [view, setView] = useState<MenuView>('main');
  const [selectedRace, setSelectedRace] = useState<Race>(Race.PYROCLAST);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>(AIDifficulty.MEDIUM);

  const availableRaces = [
    Race.PYROCLAST, Race.COGSMITHS, Race.LUMINAR, Race.WARP_RIDERS,
  ];

  const difficulties = [
    { value: AIDifficulty.EASY,   label: 'Easy'   },
    { value: AIDifficulty.MEDIUM, label: 'Medium' },
    { value: AIDifficulty.HARD,   label: 'Hard'   },
  ];

  // ── 1v1 Match: race + difficulty selection ──
  if (view === 'play') {
    return (
      <div style={s.container}>
        <SpaceBackground />
        <div style={s.playView}>
          <h2 style={s.playTitle}>Select Race & Difficulty</h2>

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
                  <div style={{ color: sel ? '#00ff88' : '#ddd', fontWeight: 'bold', fontSize: '14px' }}>
                    {info.name}
                  </div>
                  <div style={{ color: sel ? '#aaffcc' : '#aaa', fontSize: '11px' }}>
                    {info.playstyle}
                  </div>
                </button>
              );
            })}
          </div>

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

          <div style={s.playActions}>
            <button
              data-testid="quick-play-button"
              style={s.goBtn}
              onClick={() => { hapticTap(); onStartGame(selectedRace, selectedDifficulty); }}
            >
              Quick Play
            </button>
            {onDeckbuilder && (
              <button
                style={s.buildBtn}
                onClick={() => { hapticTap(); onDeckbuilder(selectedRace, selectedDifficulty); }}
              >
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

  // ── Main view: just the logo and the two mode buttons ──
  return (
    <div style={s.container}>
      <SpaceBackground />

      <div style={s.center}>
        <div style={s.logoArea}>
          <StarforgeLogo width="100%" />
        </div>

        <div style={s.modeStack}>
          <button
            data-testid="menu-quick-play"
            style={{ ...s.modeBtn, ...s.modeBtnVersus }}
            onClick={() => { hapticTap(); setView('play'); }}
          >
            <span style={s.modeBtnIcon}>&#x269B;</span>
            <span style={s.modeBtnLabel}>1v1 Match</span>
          </button>

          {onDungeonRun && (
            <button
              style={{ ...s.modeBtn, ...s.modeBtnDungeon }}
              onClick={() => { hapticTap(); onDungeonRun(); }}
            >
              <span style={s.modeBtnIcon}>&#x1F3F0;</span>
              <span style={s.modeBtnLabel}>Dungeon Run</span>
            </button>
          )}
        </div>
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

  // Center (main view)
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '32px',
    padding: '40px 20px',
    minHeight: 0,
    position: 'relative',
    zIndex: 5,
  },
  logoArea: {
    textAlign: 'center',
    width: '100%',
    maxWidth: '640px',
    padding: '0 20px',
  },

  // Mode buttons (only two)
  modeStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    width: '100%',
    maxWidth: '360px',
  },
  modeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 28px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    transition: 'transform 0.15s, box-shadow 0.15s',
    minHeight: '64px',
  },
  modeBtnVersus: {
    background: 'linear-gradient(135deg, #00cc66 0%, #009944 100%)',
    boxShadow: '0 6px 24px rgba(0,204,102,0.35)',
  },
  modeBtnDungeon: {
    background: 'linear-gradient(135deg, #9933ff 0%, #6620cc 100%)',
    boxShadow: '0 6px 24px rgba(153,51,255,0.35)',
  },
  modeBtnIcon: {
    fontSize: '24px',
    width: '32px',
    textAlign: 'center',
  },
  modeBtnLabel: {
    flex: 1,
    letterSpacing: '0.04em',
  },

  // 1v1 Match selection view
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
    position: 'relative',
    zIndex: 5,
  },
  playTitle: {
    fontSize: '22px',
    color: '#fff',
    margin: 0,
    letterSpacing: '1px',
    textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
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
    backdropFilter: 'blur(6px)',
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
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#cccccc',
    fontSize: '15px',
    cursor: 'pointer',
    padding: '12px 28px',
    minHeight: '44px',
    marginTop: '8px',
    fontWeight: 'bold',
  },
};

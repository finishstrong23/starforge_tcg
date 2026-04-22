/**
 * STARFORGE TCG - Co-op Dungeon Run (Prototype)
 *
 * Orchestrator component for the cooperative dungeon mode.
 * Phase-based rendering: lobby → map → combat → reward → event → shop → rest → victory/defeat
 *
 * Prototype: uses AI partner for single-player testing.
 * Multiplayer co-op uses existing MultiplayerManager (PeerJS).
 */

import React, { useState, useCallback } from 'react';
import { Race, RaceData } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';
import { GameProvider, useGame } from '../context/GameContext';
import { GameBoard } from './GameBoard';
import { SpaceBackground } from './SpaceBackground';
import {
  createCoopRun,
  getCurrentNode,
  getAvailableNodes,
  selectNode,
  recordCombatResult,
  resolveEvent,
  purchaseShopItem,
  leaveShop,
  rest,
  chooseBundle,
  chooseRelic,
  finishReward,
  saveCoopRun,
  deleteCoopRun,
} from '../../coop/CoopDungeonState';
import type { CoopRunState, CoopPhase } from '../../coop/CoopDungeonState';
import type { MapNode, CoopEvent, ShopItem } from '../../coop/CoopDungeonData';
import { getTeamSynergy, COOP_RELICS } from '../../coop/CoopDungeonData';
import { getCardBundleChoices, getRelicChoices } from '../../coop/DungeonSourceData';
import type { DungeonBoss, DungeonRelic, CardBundle } from '../../coop/DungeonSourceData';

interface CoopDungeonProps {
  onBack: () => void;
}

const LAUNCH_RACES = [Race.PYROCLAST, Race.COGSMITHS, Race.LUMINAR, Race.WARP_RIDERS];

export const CoopDungeon: React.FC<CoopDungeonProps> = ({ onBack }) => {
  const [runState, setRunState] = useState<CoopRunState | null>(null);

  const updateState = useCallback((state: CoopRunState) => {
    saveCoopRun(state);
    setRunState(state);
  }, []);

  // ── Lobby: race selection for both players ──
  if (!runState) {
    return (
      <CoopLobby
        onStart={(p1Race, p2Race) => {
          const state = createCoopRun(
            { id: 'player1', name: 'You', race: p1Race },
            { id: 'player2', name: 'Partner (AI)', race: p2Race },
          );
          updateState(state);
        }}
        onBack={onBack}
      />
    );
  }

  const { phase } = runState;

  switch (phase) {
    case 'map':
      return (
        <CoopMapScreen
          state={runState}
          onSelectNode={(nodeId) => updateState(selectNode(runState, nodeId))}
          onAbandon={() => { deleteCoopRun(); setRunState(null); }}
        />
      );

    case 'pre_combat':
    case 'boss_intro':
      return (
        <CoopPreCombat
          state={runState}
          isBoss={phase === 'boss_intro'}
          onFight={() => updateState({ ...runState, phase: 'combat' })}
        />
      );

    case 'combat':
      return (
        <CoopBattle
          state={runState}
          onBattleEnd={(won, hpRemaining) => {
            updateState(recordCombatResult(runState, won, hpRemaining));
          }}
        />
      );

    case 'reward':
      return (
        <CoopRewardScreen
          state={runState}
          onChooseBundle={(pi, bundle) => updateState(chooseBundle(runState, pi, bundle))}
          onChooseRelic={(relic) => updateState(chooseRelic(runState, relic))}
          onContinue={() => updateState(finishReward(runState))}
        />
      );

    case 'event':
      return (
        <CoopEventScreen
          state={runState}
          onChoose={(idx) => updateState(resolveEvent(runState, idx))}
        />
      );

    case 'shop':
      return (
        <CoopShopScreen
          state={runState}
          onBuy={(item, pi) => updateState(purchaseShopItem(runState, item, pi))}
          onLeave={() => updateState(leaveShop(runState))}
        />
      );

    case 'rest':
      return (
        <CoopRestScreen
          state={runState}
          onRest={() => updateState(rest(runState))}
        />
      );

    case 'victory':
      return (
        <CoopEndScreen
          state={runState}
          won={true}
          onBack={() => { deleteCoopRun(); setRunState(null); }}
        />
      );

    case 'defeat':
      return (
        <CoopEndScreen
          state={runState}
          won={false}
          onBack={() => { deleteCoopRun(); setRunState(null); }}
        />
      );

    default:
      return null;
  }
};

// ─── LOBBY ──────────────────────────────────────────────────────────────────

const CoopLobby: React.FC<{
  onStart: (p1Race: Race, p2Race: Race) => void;
  onBack: () => void;
}> = ({ onStart, onBack }) => {
  const [myRace, setMyRace] = useState<Race>(Race.PYROCLAST);
  const [partnerRace, setPartnerRace] = useState<Race>(Race.LUMINAR);

  const synergy = getTeamSynergy(myRace, partnerRace);

  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <h2 style={cs.title}>Co-op Dungeon Run</h2>
        <p style={cs.subtitle}>Choose your races and face the dungeon together!</p>

        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: '#00ff88', margin: '0 0 8px' }}>Your Race</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {LAUNCH_RACES.map(race => (
                <button
                  key={race}
                  style={{
                    ...cs.raceBtn,
                    borderColor: myRace === race ? '#00ff88' : '#2a2a44',
                    color: myRace === race ? '#00ff88' : '#aaa',
                  }}
                  onClick={() => setMyRace(race)}
                >
                  {RaceData[race].name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#ff6600', margin: '0 0 8px' }}>Partner Race (AI)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {LAUNCH_RACES.map(race => (
                <button
                  key={race}
                  style={{
                    ...cs.raceBtn,
                    borderColor: partnerRace === race ? '#ff6600' : '#2a2a44',
                    color: partnerRace === race ? '#ff6600' : '#aaa',
                  }}
                  onClick={() => setPartnerRace(race)}
                >
                  {RaceData[race].name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {synergy && (
          <div style={cs.synergyBox}>
            <strong>{synergy.name}</strong>: {synergy.description}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          <button style={cs.goBtn} onClick={() => onStart(myRace, partnerRace)}>
            Start Dungeon Run
          </button>
          <button style={cs.backBtn} onClick={onBack}>Back</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAP SCREEN ─────────────────────────────────────────────────────────────

const CoopMapScreen: React.FC<{
  state: CoopRunState;
  onSelectNode: (nodeId: string) => void;
  onAbandon: () => void;
}> = ({ state, onSelectNode, onAbandon }) => {
  const map = state.maps[state.act - 1];
  const currentNode = getCurrentNode(state);
  const available = getAvailableNodes(state);
  const availableIds = new Set(available.map(n => n.id));

  // Group nodes by row
  const rows: Map<number, MapNode[]> = new Map();
  for (const node of map.nodes) {
    const row = node.row;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(node);
  }
  const sortedRows = [...rows.entries()].sort(([a], [b]) => a - b);

  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        {/* Header with HP and gold */}
        <div style={cs.mapHeader}>
          <div style={cs.statBox}>
            <span style={{ color: '#ef4444' }}>HP: {state.sharedHP}/{state.maxHP}</span>
            <span style={{ color: '#fbbf24', marginLeft: '16px' }}>Gold: {state.gold}</span>
          </div>
          <h2 style={{ ...cs.title, margin: '4px 0' }}>Act {state.act} — Dungeon Map</h2>
          <div style={{ fontSize: '12px', color: '#888' }}>
            {state.players[0].name} ({RaceData[state.players[0].race].name}) +{' '}
            {state.players[1].name} ({RaceData[state.players[1].race].name})
            {state.synergy && <span style={{ color: '#a855f7' }}> — {state.synergy.name}</span>}
          </div>
        </div>

        {/* Relics bar */}
        {state.relics.length > 0 && (
          <div style={cs.relicBar}>
            {state.relics.map(r => (
              <span key={r.id} title={`${r.name}: ${r.description}`} style={cs.relicIcon}>
                {r.icon}
              </span>
            ))}
          </div>
        )}

        {/* Map nodes */}
        <div style={cs.mapArea}>
          {sortedRows.map(([row, nodes]) => (
            <div key={row} style={cs.mapRow}>
              {nodes.map(node => {
                const isAvailable = availableIds.has(node.id);
                const isCurrent = node.id === state.currentNodeId;
                const isVisited = node.visited;
                return (
                  <button
                    key={node.id}
                    style={{
                      ...cs.mapNode,
                      borderColor: isCurrent ? '#00ff88' : isAvailable ? '#fbbf24' : isVisited ? '#444' : '#2a2a44',
                      opacity: isVisited && !isCurrent ? 0.4 : 1,
                      cursor: isAvailable ? 'pointer' : 'default',
                      boxShadow: isAvailable ? '0 0 10px rgba(251,191,36,0.3)' : 'none',
                    }}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && onSelectNode(node.id)}
                  >
                    <div style={{ fontSize: '20px' }}>{node.icon}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>{node.type}</div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <button style={{ ...cs.backBtn, marginTop: '12px' }} onClick={onAbandon}>
          Abandon Run
        </button>
      </div>
    </div>
  );
};

// ─── PRE-COMBAT ─────────────────────────────────────────────────────────────

const CoopPreCombat: React.FC<{
  state: CoopRunState;
  isBoss: boolean;
  onFight: () => void;
}> = ({ state, isBoss, onFight }) => {
  const boss = state.currentBoss;
  if (!boss) return null;

  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <h2 style={{ ...cs.title, color: isBoss ? '#ef4444' : '#fbbf24' }}>
          {isBoss ? 'ACT BOSS' : 'Combat Encounter'}
        </h2>
        <div style={cs.bossCard}>
          <div style={{ fontSize: '32px' }}>{boss.icon}</div>
          <h3 style={{ color: '#fff', margin: '8px 0 4px' }}>{boss.name}</h3>
          <div style={{ color: '#aaa', fontSize: '12px' }}>{boss.title}</div>
          <div style={{ color: '#ef4444', marginTop: '8px' }}>HP: {state.currentBossHP}</div>
          {boss.specialRule && (
            <div style={{ color: '#a855f7', fontSize: '12px', marginTop: '4px' }}>{boss.specialRule}</div>
          )}
          <div style={{ color: '#888', fontSize: '11px', fontStyle: 'italic', marginTop: '8px' }}>
            "{boss.introQuote}"
          </div>
        </div>
        <div style={cs.statBox}>
          <span style={{ color: '#ef4444' }}>Team HP: {state.sharedHP}/{state.maxHP}</span>
        </div>
        <button style={cs.goBtn} onClick={onFight}>Fight!</button>
      </div>
    </div>
  );
};

// ─── COMBAT (reuses existing GameBoard with AI) ─────────────────────────────

const CoopBattle: React.FC<{
  state: CoopRunState;
  onBattleEnd: (won: boolean, hpRemaining: number) => void;
}> = ({ state, onBattleEnd }) => {
  // Use player 1's deck vs boss (AI), player 2 is AI partner for prototype
  const boss = state.currentBoss;
  if (!boss) return null;

  return (
    <GameProvider
      playerRace={state.players[0].race}
      aiDifficulty={AIDifficulty.MEDIUM}
      opponentRace={boss.race}
      customDeckCardIds={state.players[0].deck}
    >
      <CoopBattleInner
        state={state}
        onBattleEnd={onBattleEnd}
      />
    </GameProvider>
  );
};

const CoopBattleInner: React.FC<{
  state: CoopRunState;
  onBattleEnd: (won: boolean, hpRemaining: number) => void;
}> = ({ state, onBattleEnd }) => {
  const game = useGame();

  // Watch for game end
  React.useEffect(() => {
    if (!game.gameState) return;
    const gs = game.gameState;
    if (gs.status === 'FINISHED' || gs.status === 'ABANDONED') {
      const won = gs.winnerId === 'player1';
      const playerHP = game.playerState?.hero?.currentHealth ?? 0;
      // Map player HP back to shared HP
      const hpRemaining = won ? Math.max(state.sharedHP - (30 - playerHP), 1) : 0;
      onBattleEnd(won, hpRemaining);
    }
  }, [game.gameState?.status]);

  return (
    <div>
      {/* HP overlay */}
      <div style={{
        position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, background: 'rgba(0,0,0,0.8)', padding: '4px 12px', borderRadius: '8px',
        color: '#ef4444', fontSize: '12px', fontWeight: 'bold',
      }}>
        Team HP: {state.sharedHP}/{state.maxHP} | Act {state.act}
      </div>
      <GameBoard
        onBackToMenu={() => onBattleEnd(false, 0)}
      />
    </div>
  );
};

// ─── REWARD SCREEN ──────────────────────────────────────────────────────────

const CoopRewardScreen: React.FC<{
  state: CoopRunState;
  onChooseBundle: (playerIndex: 0 | 1, bundle: CardBundle) => void;
  onChooseRelic: (relic: DungeonRelic) => void;
  onContinue: () => void;
}> = ({ state, onChooseBundle, onChooseRelic, onContinue }) => {
  const [pickedBundle, setPickedBundle] = useState(false);
  const [pickedRelic, setPickedRelic] = useState(false);

  const bundles = getCardBundleChoices(state.chosenBundleIds, state.seed + state.bossesDefeated);
  const relics = getRelicChoices(state.relics.map(r => r.id), state.seed + state.bossesDefeated);

  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <h2 style={{ ...cs.title, color: '#00ff88' }}>Victory!</h2>
        <div style={cs.statBox}>
          <span style={{ color: '#fbbf24' }}>+{10 + state.act * 5} Gold</span>
          <span style={{ color: '#ef4444', marginLeft: '16px' }}>HP: {state.sharedHP}/{state.maxHP}</span>
        </div>

        {/* Card bundle choice */}
        {!pickedBundle && bundles.length > 0 && (
          <div>
            <h3 style={{ color: '#ddd', margin: '12px 0 8px' }}>Choose Cards (for you):</h3>
            <div style={cs.choiceRow}>
              {bundles.map(b => (
                <button
                  key={b.id}
                  style={cs.choiceCard}
                  onClick={() => { onChooseBundle(0, b); setPickedBundle(true); }}
                >
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{b.description}</div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                    {b.cardIds.length} cards
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Relic choice (every other fight) */}
        {pickedBundle && !pickedRelic && state.bossesDefeated % 2 === 0 && relics.length > 0 && (
          <div>
            <h3 style={{ color: '#ddd', margin: '12px 0 8px' }}>Choose a Relic:</h3>
            <div style={cs.choiceRow}>
              {relics.map(r => (
                <button
                  key={r.id}
                  style={cs.choiceCard}
                  onClick={() => { onChooseRelic(r); setPickedRelic(true); }}
                >
                  <div style={{ fontSize: '24px' }}>{r.icon}</div>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{r.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(pickedBundle || bundles.length === 0) && (
          <button style={{ ...cs.goBtn, marginTop: '16px' }} onClick={onContinue}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
};

// ─── EVENT SCREEN ───────────────────────────────────────────────────────────

const CoopEventScreen: React.FC<{
  state: CoopRunState;
  onChoose: (choiceIndex: number) => void;
}> = ({ state, onChoose }) => {
  const event = state.currentEvent;
  if (!event) return null;

  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{event.icon}</div>
        <h2 style={cs.title}>{event.title}</h2>
        <p style={{ color: '#ccc', fontSize: '14px', maxWidth: '400px', margin: '0 auto 16px', lineHeight: 1.5 }}>
          {event.description}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '350px', margin: '0 auto' }}>
          {event.choices.map((choice, i) => (
            <button
              key={i}
              style={cs.eventChoice}
              onClick={() => onChoose(i)}
            >
              <div style={{ fontWeight: 'bold', color: '#fff' }}>{choice.label}</div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>{choice.description}</div>
            </button>
          ))}
        </div>
        <div style={{ ...cs.statBox, marginTop: '16px' }}>
          <span style={{ color: '#ef4444' }}>HP: {state.sharedHP}/{state.maxHP}</span>
          <span style={{ color: '#fbbf24', marginLeft: '16px' }}>Gold: {state.gold}</span>
        </div>
      </div>
    </div>
  );
};

// ─── SHOP SCREEN ────────────────────────────────────────────────────────────

const CoopShopScreen: React.FC<{
  state: CoopRunState;
  onBuy: (item: ShopItem, playerIndex?: 0 | 1) => void;
  onLeave: () => void;
}> = ({ state, onBuy, onLeave }) => {
  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <h2 style={cs.title}>Shop</h2>
        <div style={cs.statBox}>
          <span style={{ color: '#fbbf24' }}>Gold: {state.gold}</span>
          <span style={{ color: '#ef4444', marginLeft: '16px' }}>HP: {state.sharedHP}/{state.maxHP}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px', margin: '12px auto 0' }}>
          {state.shopItems.map(item => (
            <button
              key={item.id}
              style={{
                ...cs.shopItem,
                opacity: state.gold < item.cost ? 0.5 : 1,
              }}
              disabled={state.gold < item.cost}
              onClick={() => onBuy(item, 0)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#fff' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{item.description}</div>
                </div>
                <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '16px', marginLeft: '12px' }}>
                  {item.cost}g
                </div>
              </div>
            </button>
          ))}
        </div>
        <button style={{ ...cs.backBtn, marginTop: '16px' }} onClick={onLeave}>Leave Shop</button>
      </div>
    </div>
  );
};

// ─── REST SCREEN ────────────────────────────────────────────────────────────

const CoopRestScreen: React.FC<{
  state: CoopRunState;
  onRest: () => void;
}> = ({ state, onRest }) => {
  const healAmount = Math.round(state.maxHP * 0.25);
  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <div style={{ fontSize: '48px' }}>{'\u{1F3D5}'}</div>
        <h2 style={cs.title}>Rest Site</h2>
        <p style={{ color: '#ccc', fontSize: '14px' }}>
          Your team rests and recuperates.
        </p>
        <div style={cs.statBox}>
          <span style={{ color: '#ef4444' }}>HP: {state.sharedHP}/{state.maxHP}</span>
          <span style={{ color: '#22c55e', marginLeft: '12px' }}>+{healAmount} HP</span>
        </div>
        <button style={cs.goBtn} onClick={onRest}>
          Rest (+{healAmount} HP)
        </button>
      </div>
    </div>
  );
};

// ─── END SCREEN ─────────────────────────────────────────────────────────────

const CoopEndScreen: React.FC<{
  state: CoopRunState;
  won: boolean;
  onBack: () => void;
}> = ({ state, won, onBack }) => {
  return (
    <div style={cs.container}>
      <SpaceBackground />
      <div style={cs.panel}>
        <div style={{ fontSize: '48px' }}>{won ? '\u{1F3C6}' : '\u{1F480}'}</div>
        <h2 style={{ ...cs.title, color: won ? '#00ff88' : '#ef4444' }}>
          {won ? 'Victory!' : 'Defeat'}
        </h2>
        <p style={{ color: '#ccc', fontSize: '14px' }}>
          {won
            ? 'You conquered all 3 acts of the dungeon!'
            : `Your team fell in Act ${state.act}.`}
        </p>
        <div style={{ color: '#aaa', fontSize: '13px', margin: '8px 0' }}>
          <div>Bosses Defeated: {state.bossesDefeated}</div>
          <div>Relics: {state.relics.length}</div>
          <div>
            Team: {RaceData[state.players[0].race].name} + {RaceData[state.players[1].race].name}
          </div>
          {state.synergy && <div style={{ color: '#a855f7' }}>Synergy: {state.synergy.name}</div>}
        </div>
        <button style={cs.goBtn} onClick={onBack}>
          {won ? 'Play Again' : 'Try Again'}
        </button>
      </div>
    </div>
  );
};

// ─── SHARED STYLES ──────────────────────────────────────────────────────────

const cs: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#040410',
    position: 'relative',
    overflow: 'auto',
  },
  panel: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: '20px',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    color: '#fff',
    fontSize: '22px',
    margin: '0 0 8px',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    fontSize: '13px',
    margin: '0 0 16px',
  },
  raceBtn: {
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #2a2a44',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#aaa',
    fontSize: '13px',
    cursor: 'pointer',
    minWidth: '140px',
  },
  synergyBox: {
    background: 'rgba(168,85,247,0.15)',
    border: '1px solid #a855f7',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#d8b4fe',
    fontSize: '12px',
    marginTop: '12px',
    maxWidth: '350px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  goBtn: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 32px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 20px',
    color: '#888',
    fontSize: '13px',
    cursor: 'pointer',
  },
  statBox: {
    fontSize: '14px',
    margin: '8px 0',
  },
  mapHeader: {
    marginBottom: '12px',
  },
  relicBar: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap' as const,
  },
  relicIcon: {
    fontSize: '20px',
    cursor: 'help',
  },
  mapArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '350px',
    overflow: 'auto',
    padding: '4px',
  },
  mapRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  },
  mapNode: {
    width: '60px',
    height: '60px',
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #2a2a44',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: '4px',
  },
  bossCard: {
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    padding: '16px',
    margin: '12px auto',
    maxWidth: '280px',
  },
  choiceRow: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  choiceCard: {
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #2a2a44',
    borderRadius: '10px',
    padding: '12px',
    cursor: 'pointer',
    width: '140px',
    textAlign: 'center' as const,
  },
  eventChoice: {
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #2a2a44',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  shopItem: {
    background: 'rgba(15,15,30,0.9)',
    border: '2px solid #2a2a44',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
};

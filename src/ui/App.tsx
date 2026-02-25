/**
 * STARFORGE TCG - Main App Component
 */

import React, { useState, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { BalanceTester } from './components/BalanceTester';
import { GameProvider } from './context/GameContext';
import { PvPGameProvider } from './context/PvPGameContext';
import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';
import type { MultiplayerManager } from './network/MultiplayerManager';

type GameScreen = 'menu' | 'game' | 'pvp-lobby' | 'pvp-game' | 'balance';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameConfig, setGameConfig] = useState<{
    playerRace: Race;
    aiDifficulty: AIDifficulty;
  } | null>(null);
  const [pvpConfig, setPvpConfig] = useState<{
    role: 'host' | 'guest';
    manager: MultiplayerManager;
    myRace: Race;
    opponentRace: Race;
  } | null>(null);

  const handleStartGame = useCallback((playerRace: Race, aiDifficulty: AIDifficulty) => {
    setGameConfig({ playerRace, aiDifficulty });
    setScreen('game');
  }, []);

  const handleBackToMenu = useCallback(() => {
    // Clean up PvP connection if active
    if (pvpConfig) {
      pvpConfig.manager.disconnect();
      setPvpConfig(null);
    }
    setScreen('menu');
    setGameConfig(null);
  }, [pvpConfig]);

  const handlePvPReady = useCallback((config: {
    role: 'host' | 'guest';
    manager: MultiplayerManager;
    myRace: Race;
    opponentRace: Race;
  }) => {
    setPvpConfig(config);
    setScreen('pvp-game');
  }, []);

  const handlePvPDisconnect = useCallback(() => {
    if (pvpConfig) {
      pvpConfig.manager.disconnect();
      setPvpConfig(null);
    }
    setScreen('menu');
  }, [pvpConfig]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
    }}>
      {screen === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onPlayFriend={() => setScreen('pvp-lobby')}
          onBalanceTest={() => setScreen('balance')}
        />
      )}
      {screen === 'balance' && (
        <BalanceTester onBack={handleBackToMenu} />
      )}
      {screen === 'game' && gameConfig && (
        <GameProvider
          playerRace={gameConfig.playerRace}
          aiDifficulty={gameConfig.aiDifficulty}
        >
          <GameBoard onBackToMenu={handleBackToMenu} />
        </GameProvider>
      )}
      {screen === 'pvp-lobby' && (
        <Lobby
          onGameReady={handlePvPReady}
          onBack={handleBackToMenu}
        />
      )}
      {screen === 'pvp-game' && pvpConfig && (
        <PvPGameProvider
          role={pvpConfig.role}
          manager={pvpConfig.manager}
          myRace={pvpConfig.myRace}
          opponentRace={pvpConfig.opponentRace}
          onDisconnect={handlePvPDisconnect}
        >
          <GameBoard onBackToMenu={handlePvPDisconnect} />
        </PvPGameProvider>
      )}
    </div>
  );
};

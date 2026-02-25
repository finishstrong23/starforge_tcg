/**
 * STARFORGE TCG - Main App Component
 */

import React, { useState, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { MainMenu } from './components/MainMenu';
import { BalanceTester } from './components/BalanceTester';
import { GameProvider } from './context/GameContext';
import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';

type GameScreen = 'menu' | 'game' | 'balance';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameConfig, setGameConfig] = useState<{
    playerRace: Race;
    aiDifficulty: AIDifficulty;
  } | null>(null);

  const handleStartGame = useCallback((playerRace: Race, aiDifficulty: AIDifficulty) => {
    setGameConfig({ playerRace, aiDifficulty });
    setScreen('game');
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen('menu');
    setGameConfig(null);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0f2040 100%)',
    }}>
      {screen === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
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
    </div>
  );
};

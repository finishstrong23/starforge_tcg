/**
 * STARFORGE TCG - Campaign Game Wrapper
 *
 * Wraps GameProvider + GameBoard for campaign battles.
 * Captures the game result (win/loss, health remaining, turns)
 * and routes to the PostBattle screen.
 */

import React, { useCallback, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { GameProvider, useGame } from '../context/GameContext';
import { Race } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';

export interface CampaignBattleResult {
  won: boolean;
  playerHealthRemaining: number;
  turnCount: number;
}

interface CampaignGameProps {
  playerRace: Race;
  opponentRace: Race;
  difficulty: AIDifficulty;
  onBattleEnd: (result: CampaignBattleResult) => void;
  customDeckCardIds?: string[];
}

/**
 * Inner component that has access to game context
 */
const CampaignGameInner: React.FC<{
  onBattleEnd: (result: CampaignBattleResult) => void;
}> = ({ onBattleEnd }) => {
  const { gameState, playerState, isGameOver, turnNumber } = useGame();
  const resultSentRef = useRef(false);

  const handleGameEnd = useCallback(() => {
    if (resultSentRef.current) return;
    if (!isGameOver || !gameState || !playerState) return;

    resultSentRef.current = true;

    const won = gameState.winnerId === 'player';
    onBattleEnd({
      won,
      playerHealthRemaining: Math.max(0, playerState.hero.currentHealth),
      turnCount: turnNumber,
    });
  }, [isGameOver, gameState, playerState, turnNumber, onBattleEnd]);

  return (
    <GameBoard onBackToMenu={handleGameEnd} isCampaign={true} />
  );
};

export const CampaignGame: React.FC<CampaignGameProps> = ({
  playerRace,
  opponentRace,
  difficulty,
  onBattleEnd,
  customDeckCardIds,
}) => {
  return (
    <GameProvider
      playerRace={playerRace}
      aiDifficulty={difficulty}
      opponentRace={opponentRace}
      customDeckCardIds={customDeckCardIds}
    >
      <CampaignGameInner onBattleEnd={onBattleEnd} />
    </GameProvider>
  );
};

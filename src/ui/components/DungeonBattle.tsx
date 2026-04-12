/**
 * STARFORGE TCG — Roguelite Dungeon Battle Wrapper
 *
 * Wraps GameProvider + GameBoard for roguelite dungeon battles.
 * Injects the player's upgraded run deck via customDeckInstances
 * and captures battle results (win/loss, HP remaining, turns).
 *
 * Pattern copied from CampaignGame.tsx.
 */

import React, { useCallback, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { GameProvider, useGame } from '../context/GameContext';
import { Race } from '../../types/Race';
import type { AIDifficulty } from '../../ai/AIPlayer';
import type { CardInstance } from '../../types/Card';

export interface DungeonBattleResult {
  won: boolean;
  playerHealthRemaining: number;
  turnCount: number;
}

interface DungeonBattleProps {
  /** Player's race */
  playerRace: Race;
  /** Player's hero ID (from HeroDefinitions) */
  playerHeroId: string;
  /** Pre-built deck with upgrades applied */
  playerDeck: CardInstance[];
  /** Opponent race (for AI deck) */
  opponentRace: Race;
  /** AI difficulty level */
  difficulty: AIDifficulty;
  /** Override opponent hero HP (for act scaling) */
  opponentHeroHp?: number;
  /** Callback when battle ends */
  onBattleEnd: (result: DungeonBattleResult) => void;
  /** Encounter name for display */
  encounterName?: string;
}

/**
 * Inner component that has access to game context.
 * Detects game over and reports result to parent.
 */
const DungeonBattleInner: React.FC<{
  onBattleEnd: (result: DungeonBattleResult) => void;
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

/**
 * Roguelite dungeon battle component.
 * Provides upgraded run deck to the game engine.
 */
export const DungeonBattle: React.FC<DungeonBattleProps> = ({
  playerRace,
  playerHeroId,
  playerDeck,
  opponentRace,
  difficulty,
  opponentHeroHp,
  onBattleEnd,
}) => {
  return (
    <GameProvider
      playerRace={playerRace}
      aiDifficulty={difficulty}
      opponentRace={opponentRace}
      customDeckInstances={playerDeck}
      playerHeroId={playerHeroId}
      opponentHeroHp={opponentHeroHp}
    >
      <DungeonBattleInner onBattleEnd={onBattleEnd} />
    </GameProvider>
  );
};

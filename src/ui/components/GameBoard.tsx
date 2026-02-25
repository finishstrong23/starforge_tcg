/**
 * STARFORGE TCG - Game Board Component
 *
 * Hearthstone-style game board layout with:
 * - Opponent area (top)
 * - Board battlefield (middle)
 * - Player area (bottom)
 * - Spell/hero power targeting mode
 */

import React, { useCallback, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Card } from './Card';
import { HeroPortrait } from './HeroPortrait';
import { CrystalBar } from './CrystalBar';
import { EndTurnButton } from './EndTurnButton';
import { GameOverlay } from './GameOverlay';
import { TurnTimer } from './TurnTimer';
import { getHeroById } from '../../heroes';

interface GameBoardProps {
  onBackToMenu: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ onBackToMenu }) => {
  const {
    gameState,
    playerState,
    opponentState,
    isPlayerTurn,
    isGameOver,
    turnNumber,
    playerHand,
    playerBoard,
    opponentBoard,
    selectedCard,
    validTargets,
    attackingMinion,
    targetingMode,
    selectCard,
    playCard,
    attack,
    useHeroPower,
    canPlayCard,
    canAttack,
    endTurn,
    handleTargetClick,
    cancelTargeting,
  } = useGame();

  // Timer callback - auto end turn when time runs out
  const handleTimeUp = useCallback(() => {
    if (isPlayerTurn) {
      endTurn();
    }
  }, [isPlayerTurn, endTurn]);

  // Look up hero power info for tooltips
  const playerHeroDef = useMemo(() =>
    getHeroById(playerState?.hero.definitionId || ''), [playerState?.hero.definitionId]);

  if (!gameState || !playerState || !opponentState) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading game...</div>
      </div>
    );
  }

  const handleCardClick = (card: any) => {
    if (card.zone === 'HAND' && canPlayCard(card)) {
      // Use selectCard which handles targeting mode
      selectCard(card);
    } else if (card.zone === 'BOARD' && card.controllerId === 'player') {
      // Select for attack
      selectCard(card);
    }
  };

  const onTargetClick = (targetId: string) => {
    handleTargetClick(targetId);
  };

  const handleBoardClick = () => {
    // Cancel targeting on board click
    if (targetingMode !== 'none') {
      cancelTargeting();
    } else if (selectedCard || attackingMinion) {
      selectCard(null);
    }
  };

  // Targeting mode label
  const targetingLabel = targetingMode === 'spell'
    ? 'Choose a target for your spell'
    : targetingMode === 'heropower'
    ? 'Choose a target for your hero power'
    : null;

  return (
    <div style={styles.container}>
      {/* Game Over Overlay */}
      {isGameOver && (
        <GameOverlay
          winnerId={gameState.winnerId}
          onPlayAgain={onBackToMenu}
        />
      )}

      {/* Targeting overlay label */}
      {targetingLabel && (
        <div style={styles.targetingBanner}>
          {targetingLabel}
          <button style={styles.cancelButton} onClick={cancelTargeting}>Cancel</button>
        </div>
      )}

      {/* Opponent Area */}
      <div style={styles.opponentArea}>
        {/* Opponent Hand (face down) */}
        <div style={styles.opponentHand}>
          {opponentState.hand.map((_, index) => (
            <div key={index} style={styles.cardBack}>
              <div style={styles.cardBackDesign}>★</div>
            </div>
          ))}
        </div>

        {/* Opponent Info */}
        <div style={styles.opponentInfo}>
          <CrystalBar
            current={opponentState.crystals.current}
            max={opponentState.crystals.maximum}
            isOpponent
          />
          <div style={styles.deckCount}>
            Deck: {opponentState.deck.length}
          </div>
        </div>
      </div>

      {/* Battlefield */}
      <div style={styles.battlefield} onClick={handleBoardClick}>
        {/* Opponent Board */}
        <div style={styles.boardRow}>
          <HeroPortrait
            health={opponentState.hero.currentHealth}
            maxHealth={opponentState.hero.maxHealth}
            armor={opponentState.hero.armor}
            isOpponent
            isValidTarget={validTargets.includes('hero_opponent')}
            onClick={() => onTargetClick('hero_opponent')}
          />
          <div style={styles.minionsRow}>
            {opponentBoard.map((card) => (
              <Card
                key={card.instanceId}
                card={card}
                isOnBoard
                isEnemy
                isValidTarget={validTargets.includes(card.instanceId)}
                onClick={() => onTargetClick(card.instanceId)}
              />
            ))}
          </div>
        </div>

        {/* Center Divider with Timer */}
        <div style={styles.centerDivider}>
          <TurnTimer
            isPlayerTurn={isPlayerTurn}
            turnNumber={turnNumber}
            onTimeUp={handleTimeUp}
            maxTime={30}
          />
        </div>

        {/* Player Board */}
        <div style={styles.boardRow}>
          <HeroPortrait
            health={playerState.hero.currentHealth}
            maxHealth={playerState.hero.maxHealth}
            armor={playerState.hero.armor}
            heroPowerUsed={playerState.hero.heroPowerUsedThisTurn}
            canUseHeroPower={isPlayerTurn && !playerState.hero.heroPowerUsedThisTurn && playerState.crystals.current >= 2}
            heroPowerName={playerHeroDef?.heroPower.name}
            heroPowerDescription={playerHeroDef?.heroPower.description}
            onHeroPowerClick={() => useHeroPower()}
            isValidTarget={validTargets.includes('hero_player')}
            onClick={() => onTargetClick('hero_player')}
          />
          <div style={styles.minionsRow}>
            {playerBoard.map((card) => (
              <Card
                key={card.instanceId}
                card={card}
                isOnBoard
                isSelected={selectedCard?.instanceId === card.instanceId}
                canAttack={canAttack(card)}
                isValidTarget={validTargets.includes(card.instanceId)}
                onClick={() => {
                  if (validTargets.includes(card.instanceId)) {
                    onTargetClick(card.instanceId);
                  } else {
                    handleCardClick(card);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Player Area */}
      <div style={styles.playerArea}>
        {/* Player Info */}
        <div style={styles.playerInfo}>
          <CrystalBar
            current={playerState.crystals.current}
            max={playerState.crystals.maximum}
          />
          <div style={styles.deckCount}>
            Deck: {playerState.deck.length}
          </div>
        </div>

        {/* Player Hand */}
        <div style={styles.playerHand}>
          {playerHand.map((card, index) => (
            <Card
              key={card.instanceId}
              card={card}
              isInHand
              canPlay={canPlayCard(card)}
              isSelected={selectedCard?.instanceId === card.instanceId}
              onClick={() => handleCardClick(card)}
              style={{
                transform: `rotate(${(index - playerHand.length / 2) * 3}deg)`,
                marginLeft: index > 0 ? '-20px' : '0',
              }}
            />
          ))}
        </div>

        {/* End Turn Button */}
        <EndTurnButton />
      </div>

      {/* Turn number display */}
      <div style={styles.turnNumber}>
        Turn {turnNumber}
      </div>

      {/* Back button */}
      <button style={styles.backButton} onClick={onBackToMenu}>
        ✕
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  loading: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: '24px',
    color: '#ffffff',
  },
  targetingBanner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid #ff6600',
    borderRadius: '12px',
    padding: '12px 24px',
    color: '#ffcc00',
    fontSize: '18px',
    fontWeight: 'bold',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    pointerEvents: 'auto',
  },
  cancelButton: {
    background: 'rgba(255, 0, 0, 0.3)',
    border: '1px solid #ff4444',
    borderRadius: '6px',
    color: '#ff6666',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  opponentArea: {
    height: '15%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    background: 'linear-gradient(180deg, rgba(20, 20, 40, 0.9) 0%, transparent 100%)',
  },
  opponentHand: {
    display: 'flex',
    justifyContent: 'center',
    gap: '5px',
  },
  cardBack: {
    width: '50px',
    height: '70px',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)',
    border: '2px solid #444466',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackDesign: {
    fontSize: '20px',
    color: '#666688',
  },
  opponentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginTop: '5px',
  },
  battlefield: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    background: `
      radial-gradient(ellipse at center, rgba(30, 60, 100, 0.4) 0%, transparent 70%),
      linear-gradient(180deg, #0a1525 0%, #152035 50%, #0a1525 100%)
    `,
    position: 'relative',
  },
  boardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '30px',
    minHeight: '140px',
  },
  minionsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    minWidth: '500px',
    minHeight: '130px',
    padding: '10px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  centerDivider: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px 0',
  },
  playerArea: {
    height: '22%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '10px 20px',
    background: 'linear-gradient(0deg, rgba(20, 20, 40, 0.9) 0%, transparent 100%)',
    position: 'relative',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '10px',
  },
  deckCount: {
    fontSize: '14px',
    color: '#888888',
  },
  playerHand: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    minHeight: '145px',
    paddingBottom: '10px',
  },
  turnNumber: {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '14px',
    color: '#666688',
  },
  backButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '40px',
    height: '40px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid #444',
    borderRadius: '50%',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

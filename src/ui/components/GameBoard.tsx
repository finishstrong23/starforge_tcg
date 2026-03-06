/**
 * STARFORGE TCG - Game Board Component
 *
 * Hearthstone-style game board layout with:
 * - Opponent area (top)
 * - Board battlefield (middle)
 * - Player area (bottom)
 * - Spell/hero power targeting mode
 * - Combat log / play-by-play tracker
 * - Attack animations between combatants
 */

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { SoundManager } from '../../audio';
import { Card } from './Card';
import { HeroPortrait } from './HeroPortrait';
import { CrystalBar } from './CrystalBar';
import { EndTurnButton } from './EndTurnButton';
import { GameOverlay } from './GameOverlay';
import { TurnTimer } from './TurnTimer';
import { CombatLog } from './CombatLog';
import { AttackAnimation } from './AttackAnimation';
import { VFXOverlay } from './VFXOverlay';
import { CardBack } from './CardBack';
import { BoardBackground } from './BoardBackground';
import { EmoteWheel, EmoteBubble, type Emote } from './EmoteWheel';
import { CardArt } from './CardArt';
import { HeroIntro } from './HeroIntro';
import { getHeroById } from '../../heroes';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap, hapticImpact } from '../capacitor';
import type { Race } from '../../types/Race';

interface GameBoardProps {
  onBackToMenu: () => void;
  /** If true, game over overlay shows "Continue" and routes to campaign results */
  isCampaign?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ onBackToMenu, isCampaign = false }) => {
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
    opponentHandCount,
    playerDeckCount,
    opponentDeckCount,
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
    activateStarforge,
    canStarforge,
    combatLog,
    currentAnimation,
    onAnimationComplete,
    vfxEvents,
    dismissVFX,
  } = useGame();

  // ── Drag-and-drop state ──
  const [isDragOver, setIsDragOver] = useState(false);
  const draggedCardIdRef = useRef<string | null>(null);

  // ── Card flight animation state ──
  const [flightCard, setFlightCard] = useState<{
    definitionId: string;
    cost: number;
    race?: string;
    cardType: string;
  } | null>(null);
  const flightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hero intro state ──
  const [showIntro, setShowIntro] = useState(true);

  // ── Hand expand state (Hearthstone-style) ──
  const [handExpanded, setHandExpanded] = useState(false);
  const [hoveredHandCard, setHoveredHandCard] = useState<string | null>(null);

  // ── Emote state ──
  const [playerEmote, setPlayerEmote] = useState<string | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<string | null>(null);

  // Timer callback - auto end turn when time runs out
  const handleTimeUp = useCallback(() => {
    if (isPlayerTurn) {
      endTurn();
    }
  }, [isPlayerTurn, endTurn]);

  // Look up hero definitions for intro + tooltips
  const playerHeroDef = useMemo(() =>
    getHeroById(playerState?.hero?.definitionId || ''), [playerState?.hero?.definitionId]);
  const opponentHeroDef = useMemo(() =>
    getHeroById(opponentState?.hero?.definitionId || ''), [opponentState?.hero?.definitionId]);

  const handleIntroComplete = useCallback(() => setShowIntro(false), []);

  // ── Card flight trigger ──
  const triggerCardFlight = useCallback((card: any) => {
    const def = globalCardDatabase.getCard(card.definitionId);
    setFlightCard({
      definitionId: card.definitionId,
      cost: card.currentCost,
      race: (def as any)?.race,
      cardType: def?.type || 'MINION',
    });
    if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
    flightTimerRef.current = setTimeout(() => setFlightCard(null), 900);
  }, []);

  // ── Emote handler ──
  const handleEmote = useCallback((emote: Emote) => {
    setPlayerEmote(emote.message);
    // AI responds with a random emote after a delay
    setTimeout(() => {
      const responses = ['Well played.', 'Greetings!', 'Thank you.', 'Wow!'];
      setOpponentEmote(responses[Math.floor(Math.random() * responses.length)]);
    }, 1200 + Math.random() * 1500);
  }, []);

  // ── Drag-and-drop handlers ──
  // NOTE: These useCallback hooks MUST be before the early return below,
  // otherwise React sees a different hook count between renders (error #310).
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    const card = playerHand.find(c => c.instanceId === cardId);
    if (card && canPlayCard(card)) {
      triggerCardFlight(card);
      // Delay the actual card play so the flight animation is visible
      setTimeout(() => {
        selectCard(card);
      }, 400);
    }
  }, [playerHand, canPlayCard, selectCard, triggerCardFlight]);

  if (!gameState || !playerState || !opponentState) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>Loading game...</div>
      </div>
    );
  }

  const handleCardClick = (card: any) => {
    hapticTap();
    if (card.zone === 'BOARD' && card.controllerId === 'player') {
      selectCard(card);
    } else if (card.zone === 'HAND') {
      // Click to play hand cards (same as drag-and-drop)
      selectCard(card);
    }
  };

  const onTargetClick = (targetId: string) => {
    hapticImpact();
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
    : targetingMode === 'attack'
    ? 'Choose a target to attack'
    : null;

  return (
    <div className="game-board" style={styles.container}>
      {/* Animated starfield background */}
      <BoardBackground />

      {/* Hero Intro Overlay — dramatic entrance before match starts */}
      {showIntro && playerHeroDef && opponentHeroDef && (
        <HeroIntro
          playerHero={playerHeroDef}
          opponentHero={opponentHeroDef}
          onComplete={handleIntroComplete}
        />
      )}

      {/* VFX Overlay - floating damage/heal numbers, death bursts, spell rings */}
      <VFXOverlay events={vfxEvents} onEventDone={dismissVFX} />

      {/* Attack Animation Overlay */}
      <AttackAnimation
        animation={currentAnimation}
        onComplete={onAnimationComplete}
      />

      {/* Game Over Overlay */}
      {isGameOver && (
        <GameOverlay
          winnerId={gameState.winnerId}
          onPlayAgain={onBackToMenu}
          isCampaign={isCampaign}
        />
      )}

      {/* Targeting overlay label */}
      {targetingLabel && (
        <div style={styles.targetingBanner}>
          {targetingLabel}
          <button style={styles.cancelButton} onClick={cancelTargeting}>Cancel</button>
        </div>
      )}

      {/* Opponent's Turn Banner */}
      {!isPlayerTurn && !isGameOver && (
        <div style={styles.opponentTurnBanner}>
          <div style={styles.opponentTurnText}>Opponent&apos;s Turn</div>
        </div>
      )}

      {/* Combat Log - Play by Play Tracker */}
      <CombatLog entries={combatLog} />

      {/* Opponent Area */}
      <div style={styles.opponentArea}>
        {/* Opponent Hand (face down) — use actual Board zone count */}
        <div style={styles.opponentHand}>
          {Array.from({ length: opponentHandCount }, (_, index) => (
            <div key={index} style={styles.cardBack}>
              <CardBack width={60} height={85} />
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
            Deck: {opponentDeckCount}
          </div>
        </div>
      </div>

      {/* Battlefield */}
      <div style={styles.battlefield} onClick={handleBoardClick}>
        {/* Opponent Board */}
        <div style={styles.boardRow}>
          <div data-card-id="hero_opponent" style={{ position: 'relative' }} onClick={(e) => {
            e.stopPropagation();
            onTargetClick('hero_opponent');
          }}>
            <HeroPortrait
              health={opponentState.hero.currentHealth}
              maxHealth={opponentState.hero.maxHealth}
              armor={opponentState.hero.armor}
              isOpponent
              isValidTarget={validTargets.includes('hero_opponent')}
              onClick={() => onTargetClick('hero_opponent')}
            />
            {/* Opponent Emote Bubble */}
            {opponentEmote && (
              <EmoteBubble
                message={opponentEmote}
                isOpponent
                onDone={() => setOpponentEmote(null)}
              />
            )}
          </div>
          <div style={styles.minionsRow}>
            {opponentBoard.map((card) => (
              <div key={card.instanceId} data-card-id={card.instanceId} onClick={(e) => e.stopPropagation()}>
                <Card
                  card={card}
                  isOnBoard
                  isEnemy
                  isValidTarget={validTargets.includes(card.instanceId)}
                  onClick={() => onTargetClick(card.instanceId)}
                />
              </div>
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
            paused={showIntro}
          />
        </div>

        {/* Player Board */}
        <div style={styles.boardRow}>
          <div data-card-id="hero_player" style={{ position: 'relative' }} onClick={(e) => {
            e.stopPropagation();
            onTargetClick('hero_player');
          }}>
            <HeroPortrait
              health={playerState.hero.currentHealth}
              maxHealth={playerState.hero.maxHealth}
              armor={playerState.hero.armor}
              heroPowerUsed={playerState.hero.heroPowerUsedThisTurn}
              canUseHeroPower={isPlayerTurn && !playerState.hero.heroPowerUsedThisTurn && playerState.crystals.current >= 2}
              heroPowerName={playerHeroDef?.heroPower?.name}
              heroPowerDescription={playerHeroDef?.heroPower?.description}
              onHeroPowerClick={() => useHeroPower()}
              isValidTarget={validTargets.includes('hero_player')}
              onClick={() => onTargetClick('hero_player')}
            />
            {/* Player Emote Bubble */}
            {playerEmote && (
              <EmoteBubble
                message={playerEmote}
                onDone={() => setPlayerEmote(null)}
              />
            )}
            {/* Emote Wheel */}
            <div style={{ position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
              <EmoteWheel onEmote={handleEmote} />
            </div>
          </div>
          <div
            style={{
              ...styles.minionsRow,
              ...(isDragOver ? {
                borderColor: 'rgba(0, 255, 136, 0.6)',
                boxShadow: 'inset 0 0 30px rgba(0, 255, 136, 0.15), 0 0 20px rgba(0, 255, 136, 0.2)',
              } : {}),
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {playerBoard.map((card) => (
              <div key={card.instanceId} data-card-id={card.instanceId} style={{ position: 'relative' }}>
                <Card
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
                {/* STARFORGE ASCENSION Button */}
                {canStarforge(card) && (
                  <button
                    style={styles.starforgeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticImpact();
                      activateStarforge(card);
                    }}
                    title={`STARFORGE: Spend ALL mana + lose next turn's mana. 2x stats, BARRIER, bonus keyword, immediate attack, silence immunity.`}
                  >
                    STARFORGE
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mana Crystal Bar — moved to separate absolute position on left */}
      </div>

      {/* Mana Crystal Bar — left side, below battle log */}
      <div style={styles.manaBarFixed}>
        <CrystalBar
          current={playerState.crystals.current}
          max={playerState.crystals.maximum}
          overloaded={playerState.crystals.overloaded}
          compact
        />
        <div style={styles.deckCountLeft}>
          Deck: {playerDeckCount}
        </div>
      </div>

      {/* Player Area — Hearthstone-style expandable hand */}
      <div
        style={{
          ...styles.playerArea,
          height: handExpanded ? '35%' : '22%',
          transition: 'height 0.3s ease',
        }}
        onClick={(e) => {
          // Click the area (not a card) to toggle
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest?.('[data-hand-zone]')) {
            setHandExpanded(!handExpanded);
          }
        }}
      >
        {/* Player Hand */}
        <div
          data-hand-zone
          style={{
            ...styles.playerHand,
            minHeight: '100px',
          }}
          onMouseEnter={() => setHandExpanded(true)}
          onMouseLeave={() => { setHandExpanded(false); setHoveredHandCard(null); }}
        >
          {playerHand.map((card, index) => {
            const isHovered = hoveredHandCard === card.instanceId;
            const liftY = isHovered ? -30 : 0;
            const hoverScale = isHovered ? 1.15 : 1;

            return (
              <div
                key={card.instanceId}
                style={{
                  transform: `translateY(${liftY}px) scale(${hoverScale})`,
                  marginLeft: index > 0 ? 'max(-15px, -1vw)' : '0',
                  transition: 'transform 0.25s ease, margin-left 0.3s ease, z-index 0s',
                  zIndex: isHovered ? 100 : index,
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredHandCard(card.instanceId)}
                onMouseLeave={() => setHoveredHandCard(null)}
              >
                <Card
                  card={card}
                  isInHand
                  canPlay={canPlayCard(card)}
                  isSelected={selectedCard?.instanceId === card.instanceId}
                  onClick={() => handleCardClick(card)}
                  onDragStart={() => {
                    draggedCardIdRef.current = card.instanceId;
                    SoundManager.play('cardDrag' as any);
                  }}
                  onDragEnd={() => {
                    draggedCardIdRef.current = null;
                    setIsDragOver(false);
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* End Turn Button */}
        <EndTurnButton />
      </div>

      {/* Turn number display */}
      <div style={styles.turnNumber}>
        Turn {turnNumber}
      </div>

      {/* Sound toggle */}
      <SoundToggle />

      {/* Back button */}
      <button style={styles.backButton} onClick={onBackToMenu}>
        {'\u2715'}
      </button>

      {/* Card Flight Animation Overlay */}
      {flightCard && (
        <div style={styles.flightOverlay}>
          <div style={styles.flightCard}>
            <CardArt
              cardId={flightCard.definitionId}
              race={flightCard.race as Race | undefined}
              cardType={flightCard.cardType as 'MINION' | 'SPELL' | 'STRUCTURE'}
              cost={flightCard.cost}
              width={120}
              height={70}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(SoundManager.muted);
  return (
    <button
      style={{
        position: 'absolute',
        top: '10px',
        right: '62px',
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '4px 10px',
        color: muted ? '#ff4444' : '#00ff88',
        fontSize: '16px',
        cursor: 'pointer',
        zIndex: 100,
        minWidth: '36px',
        minHeight: '36px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={() => {
        const on = SoundManager.toggle();
        setMuted(!on);
      }}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '\u{1F507}' : '\u{1F50A}'}
    </button>
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
    background: 'transparent',
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
    top: '46%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 0, 0, 0.9)',
    border: '2px solid #ff6600',
    borderRadius: '14px',
    padding: '16px 32px',
    color: '#ffcc00',
    fontSize: '20px',
    fontWeight: 'bold',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    pointerEvents: 'auto',
    boxShadow: '0 0 30px rgba(255, 102, 0, 0.3)',
    textShadow: '0 0 8px rgba(255, 204, 0, 0.5)',
  },
  opponentTurnBanner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 450,
    pointerEvents: 'none',
    animation: 'pulse-glow 2s ease-in-out infinite',
  },
  opponentTurnText: {
    background: 'rgba(180, 0, 0, 0.85)',
    border: '2px solid #ff4444',
    borderRadius: '12px',
    padding: '14px 36px',
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    textShadow: '0 0 10px rgba(255, 68, 68, 0.8)',
    boxShadow: '0 0 30px rgba(255, 0, 0, 0.3)',
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
    height: '14%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 10px',
    background: 'linear-gradient(180deg, rgba(20, 20, 40, 0.5) 0%, transparent 100%)',
  },
  opponentHand: {
    display: 'flex',
    justifyContent: 'center',
    gap: '5px',
  },
  cardBack: {
    width: 'var(--opponent-card-w, 50px)',
    height: 'var(--opponent-card-h, 70px)',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: '10px 20px',
    background: 'transparent',
    position: 'relative',
  },
  boardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    minHeight: '160px',
    flexWrap: 'wrap' as const,
  },
  minionsRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '900px',
    minHeight: '180px',
    padding: '14px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    flexWrap: 'wrap' as const,
  },
  centerDivider: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '6px 0',
  },
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '8px 10px',
    background: 'linear-gradient(0deg, rgba(10, 10, 25, 0.7) 0%, transparent 100%)',
    position: 'relative',
    cursor: 'pointer',
    overflow: 'visible',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '8px',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 200,
  },
  manaBarFixed: {
    position: 'absolute',
    left: '10px',
    bottom: '24%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
    zIndex: 400,
    pointerEvents: 'auto',
  },
  deckCount: {
    fontSize: '16px',
    color: '#888888',
    background: 'rgba(0, 10, 30, 0.85)',
    borderRadius: '10px',
    padding: '6px 14px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  deckCountLeft: {
    fontSize: '12px',
    color: '#888888',
    background: 'rgba(0, 10, 30, 0.85)',
    borderRadius: '8px',
    padding: '4px 10px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  playerHand: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: '4px',
    maxWidth: '100%',
    overflow: 'visible',
    gap: '4px',
    flexWrap: 'nowrap' as const,
    position: 'relative',
    zIndex: 1,
  },
  handHint: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: '2px',
    pointerEvents: 'none',
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
    width: '44px',
    height: '44px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid #444',
    borderRadius: '50%',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  starforgeButton: {
    position: 'absolute',
    bottom: '-22px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #ffaa00 0%, #cc4400 50%, #aa00ff 100%)',
    border: '2px solid #ffdd44',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    zIndex: 30,
    letterSpacing: '1px',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    boxShadow: '0 0 8px #ffaa00, 0 0 16px rgba(170, 0, 255, 0.4)',
    animation: 'starforgePulse 1.5s ease-in-out infinite',
  },
  flightOverlay: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 800,
    pointerEvents: 'none',
    animation: 'card-flight 0.9s ease-out forwards',
  },
  flightCard: {
    width: 'var(--flight-card-w, 130px)',
    height: 'var(--flight-card-h, 80px)',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)',
    border: '3px solid #00ff88',
    boxShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 255, 136, 0.2)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
};

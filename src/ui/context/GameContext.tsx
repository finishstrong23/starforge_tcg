/**
 * STARFORGE TCG - Game Context
 *
 * React context for managing game state and interactions.
 * Supports spell/hero power targeting mode for CHOSEN effects.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { AIDifficulty, createAIPlayer } from '../../ai/AIPlayer';
import type { AIPlayer } from '../../ai/AIPlayer';
import { GamePhase, GameStatus, ActionType } from '../../types/Game';
import type { GameState } from '../../types/Game';
import { CardZone, CardType } from '../../types/Card';
import type { CardInstance } from '../../types/Card';
import { canAffordCard, hasBoardSpace } from '../../types/Player';
import type { PlayerState } from '../../types/Player';
import { Race } from '../../types/Race';
import { TargetType } from '../../types/Effects';
import { getHeroById } from '../../heroes';
import {
  initializeSampleDatabase,
  createSampleDeck,
  globalCardDatabase,
} from '../../index';

type TargetingMode = 'none' | 'attack' | 'spell' | 'heropower';

interface GameContextValue {
  // Game state
  gameState: GameState | null;
  playerState: PlayerState | null;
  opponentState: PlayerState | null;
  isPlayerTurn: boolean;
  isGameOver: boolean;
  turnNumber: number;

  // Cards
  playerHand: CardInstance[];
  playerBoard: CardInstance[];
  opponentBoard: CardInstance[];

  // Selection state
  selectedCard: CardInstance | null;
  validTargets: string[];
  attackingMinion: CardInstance | null;
  targetingMode: TargetingMode;

  // Actions
  selectCard: (card: CardInstance | null) => void;
  playCard: (card: CardInstance, position?: number, targetId?: string) => void;
  attack: (attacker: CardInstance, targetId: string) => void;
  useHeroPower: (targetId?: string) => void;
  endTurn: () => void;
  handleTargetClick: (targetId: string) => void;
  cancelTargeting: () => void;

  // Helpers
  canPlayCard: (card: CardInstance) => boolean;
  canAttack: (minion: CardInstance) => boolean;
  getCardDefinition: (card: CardInstance) => any;
}

export const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
  playerRace: Race;
  aiDifficulty: AIDifficulty;
}

/**
 * Check if a card definition has any CHOSEN targeting effects
 */
function hasChosenTarget(def: any): boolean {
  if (!def?.effects?.length) return false;
  return def.effects.some((e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN');
}

/**
 * Compute valid spell targets based on effect target type
 */
function computeSpellTargets(
  def: any,
  board: any,
  playerId: string,
  opponentId: string
): string[] {
  if (!def?.effects?.length) return [];

  const targets: string[] = [];
  // Find the first CHOSEN effect to determine valid targets
  const chosenEffect = def.effects.find(
    (e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN'
  );

  if (!chosenEffect) return [];

  const effectType = chosenEffect.type;

  // Damage/Destroy effects can target enemy minions and hero
  if (effectType === 'DAMAGE' || effectType === 'DESTROY') {
    const enemyMinions = board.getBoardCards(opponentId);
    for (const m of enemyMinions) {
      targets.push(m.instanceId);
    }
    if (effectType === 'DAMAGE') {
      targets.push(`hero_${opponentId}`);
    }
  }
  // Heal effects can target hero and friendly minions
  else if (effectType === 'HEAL') {
    targets.push(`hero_${playerId}`);
    const friendlyMinions = board.getBoardCards(playerId);
    for (const m of friendlyMinions) {
      targets.push(m.instanceId);
    }
    // Also allow healing enemy minions (full flexibility)
    const enemyMinions = board.getBoardCards(opponentId);
    for (const m of enemyMinions) {
      targets.push(m.instanceId);
    }
  }
  // Buff/GrantKeyword effects target friendly minions
  else if (effectType === 'BUFF' || effectType === 'GRANT_KEYWORD') {
    const friendlyMinions = board.getBoardCards(playerId);
    for (const m of friendlyMinions) {
      targets.push(m.instanceId);
    }
  }
  // Silence targets enemy minions
  else if (effectType === 'SILENCE') {
    const enemyMinions = board.getBoardCards(opponentId);
    for (const m of enemyMinions) {
      targets.push(m.instanceId);
    }
  }
  // Default: can target any minion
  else {
    const allMinions = [
      ...board.getBoardCards(playerId),
      ...board.getBoardCards(opponentId),
    ];
    for (const m of allMinions) {
      targets.push(m.instanceId);
    }
  }

  return targets;
}

export const GameProvider: React.FC<GameProviderProps> = ({
  children,
  playerRace,
  aiDifficulty,
}) => {
  // Use a simple counter to force re-renders
  const [updateCounter, setUpdateCounter] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [attackingMinion, setAttackingMinion] = useState<CardInstance | null>(null);
  const [validTargets, setValidTargets] = useState<string[]>([]);
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('none');
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null);
  const [pendingHeroPower, setPendingHeroPower] = useState(false);

  const engineRef = useRef<GameEngine | null>(null);
  const aiRef = useRef<AIPlayer | null>(null);
  const aiTurnInProgressRef = useRef(false);

  // Force UI update
  const forceUpdate = useCallback(() => {
    setUpdateCounter(c => c + 1);
  }, []);

  // Cancel targeting mode
  const cancelTargeting = useCallback(() => {
    setTargetingMode('none');
    setPendingSpell(null);
    setPendingHeroPower(false);
    setValidTargets([]);
    setSelectedCard(null);
    setAttackingMinion(null);
  }, []);

  // Initialize game
  useEffect(() => {
    console.log('Initializing game...');

    // Clear previous database and reinitialize
    globalCardDatabase.clear();
    initializeSampleDatabase();

    // Create player deck
    const playerDeck = createSampleDeck(playerRace, 'player');

    // Create AI deck (random race for variety)
    const allRaces = [Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.BIOTITANS, Race.CRYSTALLINE,
                      Race.VOIDBORN, Race.PHANTOM_CORSAIRS, Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND];
    const aiRace = allRaces.filter(r => r !== playerRace)[Math.floor(Math.random() * (allRaces.length - 1))];
    const aiDeck = createSampleDeck(aiRace, 'opponent');

    // Create game engine
    const engine = new GameEngine();
    engine.initializeGame(
      {
        id: 'player',
        name: 'Player',
        race: playerRace,
        heroId: playerDeck.heroId,
        deck: playerDeck.cards,
      },
      {
        id: 'opponent',
        name: 'AI Opponent',
        race: aiRace,
        heroId: aiDeck.heroId,
        deck: aiDeck.cards,
      }
    );

    // Start the game
    engine.startGame();
    console.log('Game started, active player:', engine.getState().activePlayerId);

    // Create AI player - no delay for fast turns
    const ai = createAIPlayer('opponent', aiDifficulty);
    ai.setThinkingDelay(0);

    engineRef.current = engine;
    aiRef.current = ai;

    // Subscribe to game events
    const events = engine.getEvents();
    const subscription = events.subscribe((event) => {
      console.log('Game event:', event.type);
      forceUpdate();
    });

    // Initial update
    forceUpdate();

    return () => {
      subscription.unsubscribe();
    };
  }, [playerRace, aiDifficulty, forceUpdate]);

  // Get current state from engine
  const gameState = engineRef.current?.getState() || null;
  const playerState = gameState?.players.get('player') || null;
  const opponentState = gameState?.players.get('opponent') || null;
  const isPlayerTurn = gameState?.activePlayerId === 'player' && gameState?.phase === GamePhase.MAIN;
  const isGameOver = gameState?.status === GameStatus.FINISHED || gameState?.status === GameStatus.DRAW;
  const turnNumber = gameState?.turn || 0;

  // Get cards from zones
  const getCardsFromZone = useCallback((playerId: string, zone: CardZone): CardInstance[] => {
    if (!engineRef.current) return [];
    const board = engineRef.current.getStateManager().getBoard();
    return board.getCardsInZone(playerId, zone);
  }, [updateCounter]); // Re-run when counter changes

  const playerHand = getCardsFromZone('player', CardZone.HAND);
  const playerBoard = getCardsFromZone('player', CardZone.BOARD);
  const opponentBoard = getCardsFromZone('opponent', CardZone.BOARD);

  // AI Turn Logic - runs when it becomes opponent's turn
  useEffect(() => {
    if (!engineRef.current || !aiRef.current) return;

    const state = engineRef.current.getState();
    if (state.status !== GameStatus.ACTIVE) return;
    if (state.activePlayerId !== 'opponent') return;
    if (aiTurnInProgressRef.current) return;

    console.log('AI turn starting...');
    aiTurnInProgressRef.current = true;

    // Execute AI turn
    const runAI = async () => {
      try {
        // Small delay so UI can update
        await new Promise(resolve => setTimeout(resolve, 200));

        if (engineRef.current && aiRef.current) {
          await aiRef.current.executeTurn(engineRef.current);
          console.log('AI turn complete, active player now:', engineRef.current.getState().activePlayerId);
        }
      } catch (err) {
        console.error('AI turn error:', err);
      } finally {
        aiTurnInProgressRef.current = false;
        forceUpdate();
      }
    };

    runAI();
  }, [updateCounter, forceUpdate]); // Trigger on any state change

  // Can play card check
  const canPlayCard = useCallback((card: CardInstance): boolean => {
    if (!isPlayerTurn || !playerState) return false;
    if (!canAffordCard(playerState, card.currentCost)) return false;
    // Minions need board space
    const def = globalCardDatabase.getCard(card.definitionId);
    if (def?.type === CardType.MINION || def?.type === CardType.STRUCTURE) {
      if (!hasBoardSpace(playerState)) return false;
    }
    return true;
  }, [isPlayerTurn, playerState]);

  // Can attack check
  const canAttack = useCallback((minion: CardInstance): boolean => {
    if (!isPlayerTurn) return false;
    if (minion.controllerId !== 'player') return false;
    if (minion.hasAttackedThisTurn) return false;
    if (minion.summonedThisTurn && !minion.keywords.some(k =>
      k.keyword === 'SWIFT' || k.keyword === 'BLITZ'
    )) return false;
    return true;
  }, [isPlayerTurn]);

  // Select card — handles hand cards (play/target), board cards (attack mode)
  const selectCard = useCallback((card: CardInstance | null) => {
    // If in targeting mode and clicking null, cancel
    if (!card) {
      cancelTargeting();
      return;
    }

    // If in spell/heropower targeting mode, the card click should be handled by handleTargetClick
    if (targetingMode === 'spell' || targetingMode === 'heropower') {
      return;
    }

    setSelectedCard(card);
    setAttackingMinion(null);
    setValidTargets([]);
    setTargetingMode('none');

    // Board card = attack mode
    if (card.zone === CardZone.BOARD && canAttack(card)) {
      setAttackingMinion(card);
      setTargetingMode('attack');
      if (engineRef.current) {
        const board = engineRef.current.getStateManager().getBoard();
        const targets = board.getAttackableTargets('player', 'opponent');
        const targetIds = targets.map(t => t.instanceId);
        if (board.canAttackHero('opponent')) {
          targetIds.push('hero_opponent');
        }
        setValidTargets(targetIds);
      }
      return;
    }

    // Hand card = try to play
    if (card.zone === CardZone.HAND && canPlayCard(card)) {
      const def = globalCardDatabase.getCard(card.definitionId);

      // Check if it has CHOSEN targeting
      if (hasChosenTarget(def)) {
        // Enter spell targeting mode
        setPendingSpell(card);
        setTargetingMode('spell');
        if (engineRef.current) {
          const board = engineRef.current.getStateManager().getBoard();
          const targets = computeSpellTargets(def, board, 'player', 'opponent');
          setValidTargets(targets);
        }
        return;
      }

      // No targeting needed — play immediately
      playCard(card);
    }
  }, [canAttack, canPlayCard, targetingMode, cancelTargeting]);

  // Play card action
  const playCard = useCallback((card: CardInstance, position?: number, targetId?: string) => {
    if (!engineRef.current || !canPlayCard(card)) return;

    console.log('Playing card:', card.definitionId, targetId ? `targeting ${targetId}` : '');

    engineRef.current.processAction({
      type: ActionType.PLAY_CARD,
      playerId: 'player',
      timestamp: Date.now(),
      data: {
        cardInstanceId: card.instanceId,
        position,
        targetId,
      },
    });

    cancelTargeting();
    forceUpdate();
  }, [canPlayCard, forceUpdate, cancelTargeting]);

  // Attack action
  const attack = useCallback((attacker: CardInstance, targetId: string) => {
    if (!engineRef.current || !canAttack(attacker)) return;

    console.log('Attacking:', attacker.definitionId, '->', targetId);

    engineRef.current.processAction({
      type: ActionType.ATTACK,
      playerId: 'player',
      timestamp: Date.now(),
      data: {
        attackerId: attacker.instanceId,
        defenderId: targetId,
      },
    });

    cancelTargeting();
    forceUpdate();
  }, [canAttack, forceUpdate, cancelTargeting]);

  // Hero power action
  const useHeroPower = useCallback((targetId?: string) => {
    if (!engineRef.current || !isPlayerTurn || !playerState) return;
    if (playerState.hero.heroPowerUsedThisTurn) return;
    if (!canAffordCard(playerState, 2)) return;

    // Check if hero power requires a target
    const heroDef = getHeroById(playerState.hero.definitionId);
    if (heroDef?.heroPower.requiresTarget && !targetId) {
      // Enter hero power targeting mode
      setPendingHeroPower(true);
      setTargetingMode('heropower');

      if (engineRef.current) {
        const board = engineRef.current.getStateManager().getBoard();
        const targets: string[] = [];
        const validTargetType = heroDef.heroPower.validTargets;

        if (validTargetType === TargetType.FRIENDLY_MINION || validTargetType === TargetType.ALL_CHARACTERS) {
          const friendlyMinions = board.getBoardCards('player');
          for (const m of friendlyMinions) targets.push(m.instanceId);
        }
        if (validTargetType === TargetType.ENEMY_MINION || validTargetType === TargetType.ALL_CHARACTERS || validTargetType === TargetType.ALL_ENEMIES) {
          const enemyMinions = board.getBoardCards('opponent');
          for (const m of enemyMinions) targets.push(m.instanceId);
        }
        if (validTargetType === TargetType.ALL_CHARACTERS || validTargetType === TargetType.ALL_ENEMIES) {
          targets.push('hero_opponent');
        }
        if (validTargetType === TargetType.ALL_CHARACTERS) {
          targets.push('hero_player');
        }
        // For CHOSEN (generic), allow all
        if (validTargetType === TargetType.CHOSEN) {
          targets.push('hero_player', 'hero_opponent');
          for (const m of board.getBoardCards('player')) targets.push(m.instanceId);
          for (const m of board.getBoardCards('opponent')) targets.push(m.instanceId);
        }

        setValidTargets(targets);
      }
      return;
    }

    // No target needed or target provided — use immediately
    engineRef.current.processAction({
      type: ActionType.HERO_POWER,
      playerId: 'player',
      timestamp: Date.now(),
      data: { targetId },
    });

    cancelTargeting();
    forceUpdate();
  }, [isPlayerTurn, playerState, forceUpdate, cancelTargeting]);

  // Handle clicking a target (used for attack, spell, and hero power targeting)
  const handleTargetClick = useCallback((targetId: string) => {
    if (targetingMode === 'attack' && attackingMinion) {
      attack(attackingMinion, targetId);
    } else if (targetingMode === 'spell' && pendingSpell) {
      playCard(pendingSpell, undefined, targetId);
    } else if (targetingMode === 'heropower' && pendingHeroPower) {
      if (!engineRef.current || !isPlayerTurn || !playerState) return;
      if (playerState.hero.heroPowerUsedThisTurn) return;
      if (!canAffordCard(playerState, 2)) return;

      engineRef.current.processAction({
        type: ActionType.HERO_POWER,
        playerId: 'player',
        timestamp: Date.now(),
        data: { targetId },
      });

      cancelTargeting();
      forceUpdate();
    }
  }, [targetingMode, attackingMinion, pendingSpell, pendingHeroPower, attack, playCard, isPlayerTurn, playerState, forceUpdate, cancelTargeting]);

  // End turn action
  const endTurn = useCallback(() => {
    if (!engineRef.current) return;

    // Allow ending turn even if not strictly "player turn" (for timer)
    const state = engineRef.current.getState();
    if (state.activePlayerId !== 'player') return;

    console.log('Player ending turn');

    engineRef.current.processAction({
      type: ActionType.END_TURN,
      playerId: 'player',
      timestamp: Date.now(),
      data: {},
    });

    cancelTargeting();
    forceUpdate();
  }, [forceUpdate, cancelTargeting]);

  // Get card definition
  const getCardDefinition = useCallback((card: CardInstance) => {
    return globalCardDatabase.getCard(card.definitionId);
  }, []);

  const value: GameContextValue = {
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
    endTurn,
    handleTargetClick,
    cancelTargeting,
    getCardDefinition,
    canPlayCard,
    canAttack,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

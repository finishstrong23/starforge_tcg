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
import { GameEventType } from '../../events/GameEvent';
import type { GameEvent, CombatEventData, CardEventData, DamageEventData, HealEventData, TurnEventData } from '../../events/GameEvent';
import type { CombatLogEntry } from '../components/CombatLog';
import type { AttackAnimationData } from '../components/AttackAnimation';
import {
  initializeSampleDatabase,
  createSampleDeck,
  createCustomGameDeck,
  initializeFullDatabase,
  globalCardDatabase,
} from '../../index';
import { SoundManager } from '../../audio';
import type { VFXEvent } from '../components/VFXOverlay';

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

  // STARFORGE
  activateStarforge: (card: CardInstance) => void;
  canStarforge: (card: CardInstance) => boolean;
  starforgeTargets: CardInstance[];

  // Helpers
  canPlayCard: (card: CardInstance) => boolean;
  canAttack: (minion: CardInstance) => boolean;
  getCardDefinition: (card: CardInstance) => any;

  // Combat log
  combatLog: CombatLogEntry[];

  // Attack animation
  currentAnimation: AttackAnimationData | null;
  onAnimationComplete: () => void;

  // VFX
  vfxEvents: VFXEvent[];
  dismissVFX: (id: number) => void;
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
  /** Force a specific opponent race (for campaign mode) */
  opponentRace?: Race;
  /** Custom deck card IDs (for custom deckbuilding) */
  customDeckCardIds?: string[];
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
  opponentRace: forcedOpponentRace,
  customDeckCardIds,
}) => {
  // Use a simple counter to force re-renders
  const [updateCounter, setUpdateCounter] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [attackingMinion, setAttackingMinion] = useState<CardInstance | null>(null);
  const [validTargets, setValidTargets] = useState<string[]>([]);
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('none');
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null);
  const [pendingHeroPower, setPendingHeroPower] = useState(false);

  // Combat log state
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const logIdRef = useRef(0);

  // VFX state
  const [vfxEvents, setVfxEvents] = useState<VFXEvent[]>([]);
  const vfxIdRef = useRef(0);
  const emitVFX = useCallback((type: VFXEvent['type'], targetId: string, value?: number, label?: string) => {
    const event: VFXEvent = { id: vfxIdRef.current++, type, targetId, value, label, createdAt: Date.now() };
    setVfxEvents(prev => [...prev, event]);
  }, []);
  const dismissVFX = useCallback((id: number) => {
    setVfxEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Attack animation state
  const [currentAnimation, setCurrentAnimation] = useState<AttackAnimationData | null>(null);
  const pendingAttackRef = useRef<{ attacker: CardInstance; targetId: string } | null>(null);
  const animationIdRef = useRef(0);
  // Queue for opponent (AI) attack animations
  const aiAnimationQueueRef = useRef<AttackAnimationData[]>([]);
  const aiAnimationActiveRef = useRef(false);
  const queueAiAttackRef = useRef<((data: CombatEventData) => void) | null>(null);

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

  // Helper: get a card's display name from instance ID
  const getCardName = useCallback((instanceId: string): string => {
    if (!engineRef.current) return 'Unknown';
    try {
      const board = engineRef.current.getStateManager().getBoard();
      const card = board.getCard(instanceId);
      if (card) {
        const def = globalCardDatabase.getCard(card.definitionId);
        return def?.name || card.definitionId;
      }
    } catch { /* card may have been destroyed */ }
    return 'Unknown';
  }, []);

  // Helper: add an entry to the combat log
  const addLogEntry = useCallback((text: string, type: CombatLogEntry['type'], isPlayer: boolean, turn: number) => {
    const entry: CombatLogEntry = {
      id: logIdRef.current++,
      turn,
      text,
      type,
      isPlayer,
      timestamp: Date.now(),
    };
    setCombatLog(prev => [...prev, entry]);
  }, []);

  // Convert game events to combat log entries
  const handleGameEventForLog = useCallback((event: GameEvent) => {
    const isPlayer = event.playerId === 'player';
    const who = isPlayer ? 'You' : 'Opponent';

    switch (event.type) {
      case GameEventType.TURN_STARTED: {
        const data = event.data as TurnEventData;
        const turnPlayer = data.playerId === 'player' ? 'Your' : "Opponent's";
        addLogEntry(`--- ${turnPlayer} Turn ${data.turnNumber} ---`, 'turn', isPlayer, event.turn);
        if (data.playerId === 'player') SoundManager.play('turnStart');
        break;
      }
      case GameEventType.CARD_PLAYED: {
        const data = event.data as CardEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        addLogEntry(`${who} played ${name}`, 'play', isPlayer, event.turn);
        if (def?.rarity === 'LEGENDARY') {
          SoundManager.play('legendaryPlay');
        } else if (def?.type === CardType.SPELL) {
          SoundManager.play('spellCast');
          if (data.cardInstanceId) emitVFX('spell', data.cardInstanceId);
        } else {
          SoundManager.play('cardPlay');
        }
        break;
      }
      case GameEventType.ATTACK_DECLARED: {
        const data = event.data as CombatEventData;
        const attackerName = getCardName(data.attackerId);
        const isHeroTarget = data.defenderId.startsWith('hero_');
        const defenderName = isHeroTarget ? 'Hero' : getCardName(data.defenderId);
        const attacker = data.attackerOwnerId === 'player' ? 'Your' : "Opponent's";
        addLogEntry(`${attacker} ${attackerName} attacks ${defenderName}`, 'attack', data.attackerOwnerId === 'player', event.turn);
        SoundManager.play('attack');
        // Queue animation for opponent attacks
        if (data.attackerOwnerId === 'opponent') {
          queueAiAttackRef.current?.(data);
        }
        break;
      }
      case GameEventType.DAMAGE_DEALT: {
        const data = event.data as DamageEventData;
        if (data.amount > 0) {
          emitVFX('damage', data.targetId, data.amount);
        }
        if (data.targetType === 'hero') {
          const targetHero = data.targetId === 'hero_player' ? 'Your Hero' : "Opponent's Hero";
          addLogEntry(`${targetHero} takes ${data.amount} damage`, 'damage', data.targetId === 'hero_opponent', event.turn);
          SoundManager.play('heroDamage');
        }
        break;
      }
      case GameEventType.CARD_DESTROYED: {
        const data = event.data as CardEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        const owner = data.playerId === 'player' ? 'Your' : "Opponent's";
        addLogEntry(`${owner} ${name} was destroyed`, 'death', data.playerId !== 'player', event.turn);
        if (data.cardInstanceId) emitVFX('death', data.cardInstanceId);
        SoundManager.play('minionDeath');
        break;
      }
      case GameEventType.HEALING_DONE: {
        const data = event.data as HealEventData;
        if (data.actualHealing > 0) {
          const targetName = data.targetType === 'hero'
            ? (data.targetId === 'hero_player' ? 'Your Hero' : "Opponent's Hero")
            : getCardName(data.targetId);
          addLogEntry(`${targetName} healed for ${data.actualHealing}`, 'heal', data.targetId.includes('player'), event.turn);
          emitVFX('heal', data.targetId, data.actualHealing);
          SoundManager.play('heal');
        }
        break;
      }
      case GameEventType.HERO_POWER_USED: {
        addLogEntry(`${who} used Hero Power`, 'hero_power', isPlayer, event.turn);
        SoundManager.play('heroPower');
        break;
      }
      case GameEventType.BARRIER_BROKEN: {
        addLogEntry(`Barrier broken!`, 'keyword', isPlayer, event.turn);
        SoundManager.play('barrierBreak');
        break;
      }
    }
  }, [getCardName, addLogEntry]);

  // Process next AI animation from queue
  const processAiAnimationQueue = useCallback(() => {
    if (aiAnimationQueueRef.current.length === 0) {
      aiAnimationActiveRef.current = false;
      return;
    }
    aiAnimationActiveRef.current = true;
    const next = aiAnimationQueueRef.current.shift()!;
    setCurrentAnimation(next);
    // Auto-clear after animation duration (the attack already resolved)
    setTimeout(() => {
      setCurrentAnimation(null);
      forceUpdate();
      // Small gap before next animation
      setTimeout(() => processAiAnimationQueue(), 100);
    }, 500);
  }, [forceUpdate]);

  // Queue an opponent attack animation — assign to ref for access from event handler
  queueAiAttackRef.current = useCallback((data: CombatEventData) => {
    const anim: AttackAnimationData = {
      id: `ai_anim_${animationIdRef.current++}`,
      attackerId: data.attackerId,
      defenderId: data.defenderId,
      damage: data.attackerDamage || 0,
      counterDamage: data.defenderDamage || 0,
      isPlayerAttack: false,
    };
    aiAnimationQueueRef.current.push(anim);
    if (!aiAnimationActiveRef.current) {
      processAiAnimationQueue();
    }
  }, [processAiAnimationQueue]);

  // Animation complete callback
  const onAnimationComplete = useCallback(() => {
    const pending = pendingAttackRef.current;
    pendingAttackRef.current = null;
    setCurrentAnimation(null);

    // Now actually resolve the attack
    if (pending && engineRef.current) {
      engineRef.current.processAction({
        type: ActionType.ATTACK,
        playerId: 'player',
        timestamp: Date.now(),
        data: {
          attackerId: pending.attacker.instanceId,
          defenderId: pending.targetId,
        },
      });
      forceUpdate();
    }
  }, [forceUpdate]);

  // Initialize game
  useEffect(() => {
    console.log('Initializing game...');

    // Clear previous database and reinitialize
    globalCardDatabase.clear();
    if (customDeckCardIds) {
      initializeFullDatabase();
    } else {
      initializeSampleDatabase();
    }

    // Create player deck — use custom deck if provided, otherwise auto-generate
    const playerDeck = customDeckCardIds
      ? createCustomGameDeck(customDeckCardIds, playerRace, 'player')
      : createSampleDeck(playerRace, 'player');

    // Create AI deck — use forced race for campaign, random otherwise
    const allRaces = [Race.COGSMITHS, Race.LUMINAR, Race.PYROCLAST, Race.BIOTITANS, Race.CRYSTALLINE,
                      Race.VOIDBORN, Race.PHANTOM_CORSAIRS, Race.HIVEMIND, Race.ASTROMANCERS, Race.CHRONOBOUND];
    const aiRace = forcedOpponentRace || allRaces.filter(r => r !== playerRace)[Math.floor(Math.random() * (allRaces.length - 1))];
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

    // Create AI player with small delay so attacks are visible
    const ai = createAIPlayer('opponent', aiDifficulty);
    ai.setThinkingDelay(300);

    engineRef.current = engine;
    aiRef.current = ai;

    // Subscribe to game events
    const events = engine.getEvents();
    const subscription = events.subscribe((event) => {
      console.log('Game event:', event.type);
      handleGameEventForLog(event);
      forceUpdate();
    });

    // Initial update
    forceUpdate();

    return () => {
      subscription.unsubscribe();
    };
  }, [playerRace, aiDifficulty, forcedOpponentRace, forceUpdate, handleGameEventForLog]);

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
        if (engineRef.current) {
          const board = engineRef.current.getStateManager().getBoard();
          const targets = computeSpellTargets(def, board, 'player', 'opponent');

          // Auto-target if there's exactly 1 valid target
          if (targets.length === 1) {
            playCard(card, undefined, targets[0]);
            return;
          }

          // Multiple targets — enter targeting mode
          setPendingSpell(card);
          setTargetingMode('spell');
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

  // Attack action — plays animation first, then resolves
  const attack = useCallback((attacker: CardInstance, targetId: string) => {
    if (!engineRef.current || !canAttack(attacker)) return;

    console.log('Attacking:', attacker.definitionId, '->', targetId);

    // Get damage for animation display
    const attackDamage = attacker.currentAttack ?? 0;
    let counterDamage = 0;
    if (!targetId.startsWith('hero_')) {
      try {
        const board = engineRef.current.getStateManager().getBoard();
        const defender = board.getCard(targetId);
        if (defender) counterDamage = defender.currentAttack ?? 0;
      } catch { /* defender may not exist */ }
    }

    // Store the pending attack and trigger animation
    pendingAttackRef.current = { attacker, targetId };
    setCurrentAnimation({
      id: `anim_${animationIdRef.current++}`,
      attackerId: attacker.instanceId,
      defenderId: targetId,
      damage: attackDamage,
      counterDamage,
      isPlayerAttack: true,
    });

    cancelTargeting();
  }, [canAttack, cancelTargeting]);

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
    SoundManager.play('turnEnd');

    engineRef.current.processAction({
      type: ActionType.END_TURN,
      playerId: 'player',
      timestamp: Date.now(),
      data: {},
    });

    cancelTargeting();
    forceUpdate();
  }, [forceUpdate, cancelTargeting]);

  // STARFORGE: Check if a minion can be Starforged
  const canStarforge = useCallback((card: CardInstance): boolean => {
    if (!isPlayerTurn || !engineRef.current) return false;
    const targets = engineRef.current.getStarforgeTargets('player');
    return targets.some(t => t.instanceId === card.instanceId);
  }, [isPlayerTurn, updateCounter]);

  // STARFORGE: Get all eligible targets
  const starforgeTargets = useMemo((): CardInstance[] => {
    if (!isPlayerTurn || !engineRef.current) return [];
    return engineRef.current.getStarforgeTargets('player');
  }, [isPlayerTurn, updateCounter]);

  // STARFORGE: Activate Starforge on a legendary minion
  const activateStarforge = useCallback((card: CardInstance) => {
    if (!engineRef.current || !canStarforge(card)) return;

    console.log('STARFORGE ASCENSION:', card.definitionId);
    SoundManager.play('starforge');
    emitVFX('starforge', card.instanceId);

    engineRef.current.processAction({
      type: ActionType.ACTIVATE_STARFORGE,
      playerId: 'player',
      timestamp: Date.now(),
      data: {
        cardInstanceId: card.instanceId,
      },
    });

    // Log it
    const def = globalCardDatabase.getCard(card.definitionId);
    const name = def?.name || card.definitionId;
    addLogEntry(
      `STARFORGE ASCENSION: ${name} has been STARFORGED! 2x stats, immune to silence!`,
      'keyword',
      true,
      gameState?.turn || 0
    );

    cancelTargeting();
    forceUpdate();
  }, [canStarforge, forceUpdate, cancelTargeting, addLogEntry, gameState]);

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
    activateStarforge,
    canStarforge,
    starforgeTargets,
    getCardDefinition,
    canPlayCard,
    canAttack,
    combatLog,
    currentAnimation,
    onAnimationComplete,
    vfxEvents,
    dismissVFX,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

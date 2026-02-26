/**
 * STARFORGE TCG - PvP Game Context
 *
 * Provides the same GameContextValue as GameContext, but for PvP multiplayer.
 * - Host: runs the GameEngine locally, sends state updates to guest
 * - Guest: renders from received state, sends actions to host
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameContext } from './GameContext';
import { GameEngine } from '../../engine/GameEngine';
import { GamePhase, GameStatus, ActionType } from '../../types/Game';
import type { GameAction } from '../../types/Game';
import { CardZone, CardType, hasKeyword } from '../../types/Card';
import type { CardInstance } from '../../types/Card';
import { canAffordCard, hasBoardSpace } from '../../types/Player';
import type { PlayerState } from '../../types/Player';
import { CombatKeyword } from '../../types/Keywords';
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
  globalCardDatabase,
} from '../../index';
import { MultiplayerManager } from '../network/MultiplayerManager';
import type { NetworkViewState, NetworkMessage } from '../network/MultiplayerManager';

type TargetingMode = 'none' | 'attack' | 'spell' | 'heropower';

/** Check if a card definition has CHOSEN targeting effects */
function hasChosenTarget(def: any): boolean {
  if (!def?.effects?.length) return false;
  return def.effects.some((e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN');
}

/** Compute valid spell targets from card arrays */
function computeSpellTargetsFromArrays(
  def: any,
  myBoard: CardInstance[],
  oppBoard: CardInstance[],
  myPlayerId: string,
  oppPlayerId: string
): string[] {
  if (!def?.effects?.length) return [];
  const targets: string[] = [];
  const chosenEffect = def.effects.find(
    (e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN'
  );
  if (!chosenEffect) return [];

  const effectType = chosenEffect.type;
  if (effectType === 'DAMAGE' || effectType === 'DESTROY') {
    for (const m of oppBoard) targets.push(m.instanceId);
    if (effectType === 'DAMAGE') targets.push(`hero_${oppPlayerId}`);
  } else if (effectType === 'HEAL') {
    targets.push(`hero_${myPlayerId}`);
    for (const m of myBoard) targets.push(m.instanceId);
    for (const m of oppBoard) targets.push(m.instanceId);
  } else if (effectType === 'BUFF' || effectType === 'GRANT_KEYWORD') {
    for (const m of myBoard) targets.push(m.instanceId);
  } else if (effectType === 'SILENCE') {
    for (const m of oppBoard) targets.push(m.instanceId);
  } else {
    for (const m of [...myBoard, ...oppBoard]) targets.push(m.instanceId);
  }
  return targets;
}

/** Compute attack targets from opponent board (respects GUARDIAN) */
function computeAttackTargets(oppBoard: CardInstance[], oppPlayerId: string): string[] {
  const guardians = oppBoard.filter(c =>
    hasKeyword(c, CombatKeyword.GUARDIAN) && !c.isCloaked
  );
  const targetIds: string[] = [];
  if (guardians.length > 0) {
    for (const g of guardians) targetIds.push(g.instanceId);
  } else {
    for (const c of oppBoard) {
      if (!c.isCloaked) targetIds.push(c.instanceId);
    }
    targetIds.push(`hero_${oppPlayerId}`);
  }
  return targetIds;
}

interface PvPGameProviderProps {
  children: React.ReactNode;
  role: 'host' | 'guest';
  manager: MultiplayerManager;
  myRace: Race;
  opponentRace: Race;
  onDisconnect: () => void;
}

export const PvPGameProvider: React.FC<PvPGameProviderProps> = ({
  children,
  role,
  manager,
  myRace,
  opponentRace,
  onDisconnect,
}) => {
  const [updateCounter, setUpdateCounter] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardInstance | null>(null);
  const [attackingMinion, setAttackingMinion] = useState<CardInstance | null>(null);
  const [validTargets, setValidTargets] = useState<string[]>([]);
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('none');
  const [pendingSpell, setPendingSpell] = useState<CardInstance | null>(null);
  const [pendingHeroPower, setPendingHeroPower] = useState(false);

  // Combat log and animation state
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const logIdRef = useRef(0);
  const [currentAnimation, setCurrentAnimation] = useState<AttackAnimationData | null>(null);
  const pendingPvPAttackRef = useRef<{ attacker: CardInstance; targetId: string } | null>(null);
  const animationIdRef = useRef(0);

  // Host state
  const engineRef = useRef<GameEngine | null>(null);
  const myPlayerIdRef = useRef<string>(role === 'host' ? 'player1' : 'player2');
  const oppPlayerIdRef = useRef<string>(role === 'host' ? 'player2' : 'player1');

  // Guest state: received view from host
  const [guestView, setGuestView] = useState<NetworkViewState | null>(null);

  const forceUpdate = useCallback(() => {
    setUpdateCounter(c => c + 1);
  }, []);

  const cancelTargeting = useCallback(() => {
    setTargetingMode('none');
    setPendingSpell(null);
    setPendingHeroPower(false);
    setValidTargets([]);
    setSelectedCard(null);
    setAttackingMinion(null);
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

  // Convert game events to combat log entries (for PvP)
  const handlePvPGameEventForLog = useCallback((event: GameEvent) => {
    const myPlayerId = myPlayerIdRef.current;
    const isPlayer = event.playerId === myPlayerId;
    const who = isPlayer ? 'You' : 'Opponent';

    switch (event.type) {
      case GameEventType.TURN_STARTED: {
        const data = event.data as TurnEventData;
        const turnPlayer = data.playerId === myPlayerId ? 'Your' : "Opponent's";
        addLogEntry(`--- ${turnPlayer} Turn ${data.turnNumber} ---`, 'turn', isPlayer, event.turn);
        break;
      }
      case GameEventType.CARD_PLAYED: {
        const data = event.data as CardEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        addLogEntry(`${who} played ${name}`, 'play', isPlayer, event.turn);
        break;
      }
      case GameEventType.ATTACK_DECLARED: {
        const data = event.data as CombatEventData;
        const isHeroTarget = data.defenderId.startsWith('hero_');
        const attacker = data.attackerOwnerId === myPlayerId ? 'Your' : "Opponent's";
        addLogEntry(`${attacker} minion attacks ${isHeroTarget ? 'Hero' : 'minion'}`, 'attack', data.attackerOwnerId === myPlayerId, event.turn);
        break;
      }
      case GameEventType.CARD_DESTROYED: {
        const data = event.data as CardEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        const owner = data.playerId === myPlayerId ? 'Your' : "Opponent's";
        addLogEntry(`${owner} ${name} was destroyed`, 'death', data.playerId !== myPlayerId, event.turn);
        break;
      }
      case GameEventType.HERO_POWER_USED: {
        addLogEntry(`${who} used Hero Power`, 'hero_power', isPlayer, event.turn);
        break;
      }
    }
  }, [addLogEntry]);

  // Animation complete callback for PvP
  const onAnimationComplete = useCallback(() => {
    const pending = pendingPvPAttackRef.current;
    pendingPvPAttackRef.current = null;
    setCurrentAnimation(null);

    if (pending && engineRef.current && role === 'host') {
      const myPlayerId = myPlayerIdRef.current;
      engineRef.current.processAction({
        type: ActionType.ATTACK,
        playerId: myPlayerId,
        timestamp: Date.now(),
        data: {
          attackerId: pending.attacker.instanceId,
          defenderId: pending.targetId,
        },
      });
      forceUpdate();
    } else if (pending && role === 'guest') {
      const myPlayerId = myPlayerIdRef.current;
      manager.send({
        type: 'action',
        action: {
          type: ActionType.ATTACK,
          playerId: myPlayerId,
          timestamp: Date.now(),
          data: {
            attackerId: pending.attacker.instanceId,
            defenderId: pending.targetId,
          },
        },
      });
    }
  }, [role, manager, forceUpdate]);

  // --- HOST: Extract view state for the guest ---
  const extractViewForGuest = useCallback((): NetworkViewState | null => {
    if (!engineRef.current) return null;
    const state = engineRef.current.getState();
    const board = engineRef.current.getStateManager().getBoard();
    const guestId = 'player2';
    const hostId = 'player1';
    const guestState = state.players.get(guestId);
    const hostState = state.players.get(hostId);
    if (!guestState || !hostState) return null;

    return {
      myState: guestState,
      opponentState: hostState,
      myHand: board.getCardsInZone(guestId, CardZone.HAND),
      myBoard: board.getCardsInZone(guestId, CardZone.BOARD),
      opponentBoard: board.getCardsInZone(hostId, CardZone.BOARD),
      opponentHandSize: hostState.hand.length,
      turn: state.turn,
      phase: state.phase,
      activePlayerId: state.activePlayerId,
      status: state.status,
      winnerId: state.winnerId,
      myPlayerId: guestId,
    };
  }, []);

  const sendStateToGuest = useCallback(() => {
    const view = extractViewForGuest();
    if (view) {
      manager.send({ type: 'state_update', viewState: view });
    }
  }, [extractViewForGuest, manager]);

  // --- HOST: Initialize game engine ---
  useEffect(() => {
    if (role !== 'host') return;

    globalCardDatabase.clear();
    initializeSampleDatabase();

    const hostDeck = createSampleDeck(myRace, 'player1');
    const guestDeck = createSampleDeck(opponentRace, 'player2');

    const engine = new GameEngine();
    engine.initializeGame(
      { id: 'player1', name: 'Player 1', race: myRace, heroId: hostDeck.heroId, deck: hostDeck.cards },
      { id: 'player2', name: 'Player 2', race: opponentRace, heroId: guestDeck.heroId, deck: guestDeck.cards },
    );
    engine.startGame();
    engineRef.current = engine;

    const events = engine.getEvents();
    const sub = events.subscribe((event) => {
      handlePvPGameEventForLog(event);
      forceUpdate();
      // Send state to guest after each event
      setTimeout(() => sendStateToGuest(), 50);
    });

    forceUpdate();

    // Send initial state to guest
    setTimeout(() => {
      const view = extractViewForGuest();
      if (view) {
        manager.send({ type: 'game_start', viewState: view });
      }
    }, 300);

    return () => { sub.unsubscribe(); };
  }, [role, myRace, opponentRace, forceUpdate, manager, sendStateToGuest, extractViewForGuest]);

  // --- GUEST: Initialize card database for definitions ---
  useEffect(() => {
    if (role !== 'guest') return;
    globalCardDatabase.clear();
    initializeSampleDatabase();
  }, [role]);

  // --- Network message handler ---
  useEffect(() => {
    manager.onMessage = (msg: NetworkMessage) => {
      if (role === 'host') {
        // Host receives guest actions
        if (msg.type === 'action') {
          if (engineRef.current) {
            try {
              engineRef.current.processAction(msg.action);
              forceUpdate();
              sendStateToGuest();
            } catch (err) {
              console.error('Error processing guest action:', err);
            }
          }
        }
      } else {
        // Guest receives state updates
        if (msg.type === 'game_start' || msg.type === 'state_update') {
          setGuestView(msg.viewState);
        }
      }
    };

    manager.onDisconnected = () => {
      onDisconnect();
    };

    return () => {
      manager.onMessage = null;
      manager.onDisconnected = null;
    };
  }, [role, manager, forceUpdate, sendStateToGuest, onDisconnect]);

  // --- Derive UI state ---
  const myPlayerId = myPlayerIdRef.current;
  const oppPlayerId = oppPlayerIdRef.current;

  let playerState: PlayerState | null = null;
  let opponentState: PlayerState | null = null;
  let playerHand: CardInstance[] = [];
  let playerBoard: CardInstance[] = [];
  let opponentBoard: CardInstance[] = [];
  let isPlayerTurn = false;
  let isGameOver = false;
  let turnNumber = 0;
  let gameStatus: string = '';
  let winnerId: string | undefined;

  if (role === 'host' && engineRef.current) {
    const state = engineRef.current.getState();
    const board = engineRef.current.getStateManager().getBoard();
    playerState = state.players.get(myPlayerId) || null;
    opponentState = state.players.get(oppPlayerId) || null;
    playerHand = board.getCardsInZone(myPlayerId, CardZone.HAND);
    playerBoard = board.getCardsInZone(myPlayerId, CardZone.BOARD);
    opponentBoard = board.getCardsInZone(oppPlayerId, CardZone.BOARD);
    isPlayerTurn = state.activePlayerId === myPlayerId && state.phase === GamePhase.MAIN;
    isGameOver = state.status === GameStatus.FINISHED || state.status === GameStatus.DRAW;
    turnNumber = state.turn;
    gameStatus = state.status;
    winnerId = state.winnerId;
  } else if (role === 'guest' && guestView) {
    playerState = guestView.myState;
    opponentState = guestView.opponentState;
    playerHand = guestView.myHand;
    playerBoard = guestView.myBoard;
    opponentBoard = guestView.opponentBoard;
    isPlayerTurn = guestView.activePlayerId === myPlayerId && guestView.phase === GamePhase.MAIN;
    isGameOver = guestView.status === GameStatus.FINISHED || guestView.status === (GameStatus.DRAW as string);
    turnNumber = guestView.turn;
    gameStatus = guestView.status;
    winnerId = guestView.winnerId;
  }

  // --- Minimal gameState-like object for components that read from it ---
  const gameState = (playerState && opponentState) ? {
    winnerId,
    status: gameStatus as GameStatus,
    activePlayerId: role === 'host'
      ? engineRef.current?.getState().activePlayerId || ''
      : guestView?.activePlayerId || '',
    turn: turnNumber,
    phase: (role === 'host'
      ? engineRef.current?.getState().phase
      : guestView?.phase) as GamePhase || GamePhase.MAIN,
    // These fields satisfy the GameState interface minimally
    id: 'pvp-game',
    players: new Map([[myPlayerId, playerState], [oppPlayerId, opponentState]]),
    cards: new Map(),
    effectQueue: [],
    history: [],
    turnTimer: 90,
    turnTimeLimit: 90,
    allowReconnect: false,
    randomSeed: 0,
    revealedCards: [],
  } : null;

  // --- Can play card check ---
  const canPlayCard = useCallback((card: CardInstance): boolean => {
    if (!isPlayerTurn || !playerState) return false;
    if (!canAffordCard(playerState, card.currentCost)) return false;
    const def = globalCardDatabase.getCard(card.definitionId);
    if (def?.type === CardType.MINION || def?.type === CardType.STRUCTURE) {
      if (!hasBoardSpace(playerState)) return false;
    }
    return true;
  }, [isPlayerTurn, playerState]);

  // --- Can attack check ---
  const canAttack = useCallback((minion: CardInstance): boolean => {
    if (!isPlayerTurn) return false;
    if (minion.controllerId !== myPlayerId) return false;
    if (minion.hasAttackedThisTurn) return false;
    if (minion.summonedThisTurn && !minion.keywords.some(k =>
      k.keyword === 'SWIFT' || k.keyword === 'BLITZ'
    )) return false;
    return true;
  }, [isPlayerTurn, myPlayerId]);

  // --- Process action (host: local, guest: send to host) ---
  const processAction = useCallback((action: GameAction) => {
    if (role === 'host') {
      if (!engineRef.current) return;
      try {
        engineRef.current.processAction(action);
        cancelTargeting();
        forceUpdate();
        sendStateToGuest();
      } catch (err) {
        console.error('Error processing action:', err);
      }
    } else {
      // Guest sends action to host
      manager.send({ type: 'action', action });
      cancelTargeting();
    }
  }, [role, manager, forceUpdate, cancelTargeting, sendStateToGuest]);

  // --- Select card / targeting ---
  const selectCard = useCallback((card: CardInstance | null) => {
    if (!card) {
      cancelTargeting();
      return;
    }
    if (targetingMode === 'spell' || targetingMode === 'heropower') return;

    setSelectedCard(card);
    setAttackingMinion(null);
    setValidTargets([]);
    setTargetingMode('none');

    // Board card → attack mode
    if (card.zone === CardZone.BOARD && canAttack(card)) {
      setAttackingMinion(card);
      setTargetingMode('attack');
      setValidTargets(computeAttackTargets(opponentBoard, oppPlayerId));
      return;
    }

    // Hand card → play
    if (card.zone === CardZone.HAND && canPlayCard(card)) {
      const def = globalCardDatabase.getCard(card.definitionId);
      if (hasChosenTarget(def)) {
        setPendingSpell(card);
        setTargetingMode('spell');
        setValidTargets(
          computeSpellTargetsFromArrays(def, playerBoard, opponentBoard, myPlayerId, oppPlayerId)
        );
        return;
      }
      // No targeting needed
      processAction({
        type: ActionType.PLAY_CARD,
        playerId: myPlayerId,
        timestamp: Date.now(),
        data: { cardInstanceId: card.instanceId },
      });
    }
  }, [canAttack, canPlayCard, targetingMode, cancelTargeting, opponentBoard, playerBoard, myPlayerId, oppPlayerId, processAction]);

  // --- Play card with target ---
  const playCard = useCallback((card: CardInstance, position?: number, targetId?: string) => {
    if (!canPlayCard(card)) return;
    processAction({
      type: ActionType.PLAY_CARD,
      playerId: myPlayerId,
      timestamp: Date.now(),
      data: { cardInstanceId: card.instanceId, position, targetId },
    });
  }, [canPlayCard, myPlayerId, processAction]);

  // --- Attack ---
  const attack = useCallback((attacker: CardInstance, targetId: string) => {
    if (!canAttack(attacker)) return;

    // Show animation, then resolve
    const attackDamage = attacker.currentAttack ?? 0;
    let counterDamage = 0;
    if (!targetId.startsWith('hero_')) {
      const defender = [...playerBoard, ...opponentBoard].find(c => c.instanceId === targetId);
      if (defender) counterDamage = defender.currentAttack ?? 0;
    }

    pendingPvPAttackRef.current = { attacker, targetId };
    setCurrentAnimation({
      id: `anim_${animationIdRef.current++}`,
      attackerId: attacker.instanceId,
      defenderId: targetId,
      damage: attackDamage,
      counterDamage,
      isPlayerAttack: true,
    });
    cancelTargeting();
  }, [canAttack, playerBoard, opponentBoard, cancelTargeting]);

  // --- Hero power ---
  const useHeroPower = useCallback((targetId?: string) => {
    if (!isPlayerTurn || !playerState) return;
    if (playerState.hero.heroPowerUsedThisTurn) return;
    if (!canAffordCard(playerState, 2)) return;

    const heroDef = getHeroById(playerState.hero.definitionId);
    if (heroDef?.heroPower.requiresTarget && !targetId) {
      setPendingHeroPower(true);
      setTargetingMode('heropower');

      const targets: string[] = [];
      const validTargetType = heroDef.heroPower.validTargets;

      if (validTargetType === TargetType.FRIENDLY_MINION || validTargetType === TargetType.ALL_CHARACTERS) {
        for (const m of playerBoard) targets.push(m.instanceId);
      }
      if (validTargetType === TargetType.ENEMY_MINION || validTargetType === TargetType.ALL_CHARACTERS || validTargetType === TargetType.ALL_ENEMIES) {
        for (const m of opponentBoard) targets.push(m.instanceId);
      }
      if (validTargetType === TargetType.ALL_CHARACTERS || validTargetType === TargetType.ALL_ENEMIES) {
        targets.push(`hero_${oppPlayerId}`);
      }
      if (validTargetType === TargetType.ALL_CHARACTERS) {
        targets.push(`hero_${myPlayerId}`);
      }
      if (validTargetType === TargetType.CHOSEN) {
        targets.push(`hero_${myPlayerId}`, `hero_${oppPlayerId}`);
        for (const m of playerBoard) targets.push(m.instanceId);
        for (const m of opponentBoard) targets.push(m.instanceId);
      }
      setValidTargets(targets);
      return;
    }

    processAction({
      type: ActionType.HERO_POWER,
      playerId: myPlayerId,
      timestamp: Date.now(),
      data: { targetId },
    });
  }, [isPlayerTurn, playerState, playerBoard, opponentBoard, myPlayerId, oppPlayerId, processAction]);

  // --- Handle target click ---
  const handleTargetClick = useCallback((targetId: string) => {
    if (targetingMode === 'attack' && attackingMinion) {
      attack(attackingMinion, targetId);
    } else if (targetingMode === 'spell' && pendingSpell) {
      playCard(pendingSpell, undefined, targetId);
    } else if (targetingMode === 'heropower' && pendingHeroPower) {
      if (!isPlayerTurn || !playerState) return;
      if (playerState.hero.heroPowerUsedThisTurn) return;
      if (!canAffordCard(playerState, 2)) return;

      processAction({
        type: ActionType.HERO_POWER,
        playerId: myPlayerId,
        timestamp: Date.now(),
        data: { targetId },
      });
      cancelTargeting();
    }
  }, [targetingMode, attackingMinion, pendingSpell, pendingHeroPower, attack, playCard, isPlayerTurn, playerState, myPlayerId, processAction, cancelTargeting]);

  // --- End turn ---
  const endTurn = useCallback(() => {
    const activeId = role === 'host'
      ? engineRef.current?.getState().activePlayerId
      : guestView?.activePlayerId;
    if (activeId !== myPlayerId) return;

    processAction({
      type: ActionType.END_TURN,
      playerId: myPlayerId,
      timestamp: Date.now(),
      data: {},
    });
  }, [role, guestView, myPlayerId, processAction]);

  // --- Get card definition ---
  const getCardDefinition = useCallback((card: CardInstance) => {
    return globalCardDatabase.getCard(card.definitionId);
  }, []);

  // --- Map winnerId for display (translate to 'player' for local win) ---
  const displayWinnerId = winnerId === myPlayerId ? 'player' : winnerId ? 'opponent' : undefined;
  const displayGameState = gameState ? { ...gameState, winnerId: displayWinnerId } : null;

  const value = {
    gameState: displayGameState as any,
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
    canPlayCard,
    canAttack,
    getCardDefinition,
    combatLog,
    currentAnimation,
    onAnimationComplete,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

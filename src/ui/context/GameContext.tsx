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
import { canAffordCard } from '../../types/Player';
import type { PlayerState } from '../../types/Player';
import { Race } from '../../types/Race';
import { TargetType } from '../../types/Effects';
import { getHeroById } from '../../heroes';
import { GameEventType } from '../../events/GameEvent';
import type { GameEvent, CombatEventData, CardEventData, DamageEventData, HealEventData, TurnEventData, LastWordsEventData } from '../../events/GameEvent';
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
import type { BoardVFXEvent } from '../components/BoardVFX';
import { firePetEvent } from '../components/BoardPet';
import { PetGameEvent } from '../../cosmetics/BoardPets';
import { getCardVoiceline, VoiceEvent, getInteractionLine } from '../../lore/CardVoicelines';
import { loadFactionWars, recordWinContribution, saveFactionWars } from '../../events/FactionWars';
import { AdaptOption } from '../../types/Keywords';
import type { PendingAdaptChoice } from '../../engine/EffectResolver';

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

  // Zone counts (from Board zones, the actual source of truth)
  opponentHandCount: number;
  playerDeckCount: number;
  opponentDeckCount: number;

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

  // Board VFX (screen shake, cracks, supernova, shatter)
  boardVFXEvents: BoardVFXEvent[];
  dismissBoardVFX: (id: number) => void;
  boardShakeClass: string;

  // Legendary cinematic
  legendaryCinematic: {
    cardName: string;
    cardRace: Race;
    attack?: number;
    health?: number;
    cost: number;
  } | null;
  dismissLegendaryCinematic: () => void;

  // Voiceline bubble
  voicelineBubble: { text: string; side: 'player' | 'opponent' } | null;

  // Adapt choice
  pendingAdaptChoice: PendingAdaptChoice | null;
  resolveAdaptChoice: (option: AdaptOption) => void;
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
 * Check if a card definition has any effects that require player targeting
 */
function hasChosenTarget(def: any): boolean {
  if (!def?.effects?.length) return false;
  return def.effects.some((e: any) =>
    e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN' ||
    e.targetType === TargetType.FRIENDLY_MINION || e.targetType === 'FRIENDLY_MINION' ||
    e.targetType === TargetType.ENEMY_MINION || e.targetType === 'ENEMY_MINION'
  );
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

  // Check for FRIENDLY_MINION targeting first (DEPLOY buffs on friendlies)
  const friendlyMinionEffect = def.effects.find(
    (e: any) => e.targetType === TargetType.FRIENDLY_MINION || e.targetType === 'FRIENDLY_MINION'
  );
  if (friendlyMinionEffect) {
    const friendlyMinions = board.getBoardCards(playerId);
    for (const m of friendlyMinions) {
      targets.push(m.instanceId);
    }
    return targets;
  }

  // Check for ENEMY_MINION targeting
  const enemyMinionEffect = def.effects.find(
    (e: any) => e.targetType === TargetType.ENEMY_MINION || e.targetType === 'ENEMY_MINION'
  );
  if (enemyMinionEffect) {
    const enemyMinions = board.getBoardCards(opponentId);
    for (const m of enemyMinions) {
      targets.push(m.instanceId);
    }
    return targets;
  }

  // Find the first CHOSEN effect to determine valid targets
  const chosenEffect = def.effects.find(
    (e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN'
  );

  if (!chosenEffect) return [];

  const effectType = String(chosenEffect.type);

  // Check if the card text mentions "friendly" — additional safety for buff targeting
  const cardText = (def.cardText || '').toLowerCase();
  const isBuff = effectType === 'BUFF' || effectType === 'GRANT_KEYWORD' ||
    cardText.includes('+') && (cardText.includes('give') || cardText.includes('grant'));

  // Damage/Destroy effects can target enemy minions and hero
  if (effectType === 'DAMAGE' || effectType === 'DESTROY' || effectType === 'DEBUFF') {
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
  // Buff/GrantKeyword effects target ONLY friendly minions on board
  else if (isBuff) {
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
  // Default: all minions on board
  else {
    const friendlyMinions = board.getBoardCards(playerId);
    for (const m of friendlyMinions) {
      targets.push(m.instanceId);
    }
    const enemyMinions = board.getBoardCards(opponentId);
    for (const m of enemyMinions) {
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

  // Adapt choice state
  const [pendingAdaptChoice, setPendingAdaptChoice] = useState<PendingAdaptChoice | null>(null);

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

  // Board VFX state (screen shake, cracks, supernova, shatter)
  const [boardVFXEvents, setBoardVFXEvents] = useState<BoardVFXEvent[]>([]);
  const [boardShakeClass, setBoardShakeClass] = useState('');

  // Legendary cinematic state
  const [legendaryCinematic, setLegendaryCinematic] = useState<GameContextValue['legendaryCinematic']>(null);
  const dismissLegendaryCinematic = useCallback(() => setLegendaryCinematic(null), []);

  // Voiceline bubble state
  const [voicelineBubble, setVoicelineBubble] = useState<GameContextValue['voicelineBubble']>(null);
  const voicelineTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const showVoiceline = useCallback((text: string, side: 'player' | 'opponent') => {
    setVoicelineBubble({ text, side });
    if (voicelineTimerRef.current) clearTimeout(voicelineTimerRef.current);
    voicelineTimerRef.current = setTimeout(() => setVoicelineBubble(null), 3000);
  }, []);
  const boardVFXIdRef = useRef(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const emitBoardVFX = useCallback((type: BoardVFXEvent['type'], intensity: number = 0.5, duration: number = 300) => {
    const event: BoardVFXEvent = {
      id: boardVFXIdRef.current++,
      type,
      intensity: Math.min(1, Math.max(0, intensity)),
      duration,
      createdAt: Date.now(),
    };
    setBoardVFXEvents(prev => [...prev, event]);
    if (type === 'screen_shake') {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      const cls = intensity > 0.8 ? 'board-shake-extreme'
        : intensity > 0.5 ? 'board-shake-heavy'
        : intensity > 0.25 ? 'board-shake-medium'
        : 'board-shake-light';
      setBoardShakeClass(cls);
      shakeTimerRef.current = setTimeout(() => setBoardShakeClass(''), duration);
    }
  }, []);
  const dismissBoardVFX = useCallback((id: number) => {
    setBoardVFXEvents(prev => prev.filter(e => e.id !== id));
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

  // Force UI update — batched via rAF to prevent "too many re-renders"
  const rafPendingRef = useRef(false);
  const forceUpdate = useCallback(() => {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      setUpdateCounter(c => c + 1);
    });
  }, []);

  // Refs for stable access inside effects (avoids dependency churn)
  const forceUpdateRef = useRef(forceUpdate);
  forceUpdateRef.current = forceUpdate;

  // Cancel targeting mode
  const cancelTargeting = useCallback(() => {
    setTargetingMode('none');
    setPendingSpell(null);
    setPendingHeroPower(false);
    setValidTargets([]);
    setSelectedCard(null);
    setAttackingMinion(null);
  }, []);

  // Resolve an adapt choice made by the player
  const resolveAdaptChoice = useCallback((option: AdaptOption) => {
    if (!engineRef.current) return;
    const resolver = engineRef.current.getEffectResolver();
    resolver.resolveAdapt(option);
    setPendingAdaptChoice(null);
    forceUpdateRef.current();
  }, []);

  // Check if the engine has a pending adapt choice after an action
  const checkPendingAdapt = useCallback(() => {
    if (!engineRef.current) return;
    const resolver = engineRef.current.getEffectResolver();
    if (resolver.pendingAdapt) {
      // For AI (opponent), auto-pick a random option
      if (resolver.pendingAdapt.sourceOwnerId !== 'player') {
        const options = resolver.pendingAdapt.options;
        const randomChoice = options[Math.floor(Math.random() * options.length)];
        resolver.resolveAdapt(randomChoice);
      } else {
        // For player, show the choice UI
        setPendingAdaptChoice({ ...resolver.pendingAdapt });
      }
    }
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

  // Helper: get a card's definition ID from instance ID
  const getCardDefId = useCallback((instanceId: string): string | undefined => {
    if (!engineRef.current) return undefined;
    try {
      const board = engineRef.current.getStateManager().getBoard();
      const card = board.getCard(instanceId);
      return card?.definitionId;
    } catch { /* card may have been destroyed */ }
    return undefined;
  }, []);

  // Helper: add an entry to the combat log
  const addLogEntry = useCallback((text: string, type: CombatLogEntry['type'], isPlayer: boolean, turn: number, cardId?: string) => {
    const entry: CombatLogEntry = {
      id: logIdRef.current++,
      turn,
      text,
      type,
      isPlayer,
      timestamp: Date.now(),
      cardId,
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
        addLogEntry(`${who} played ${name}`, 'play', isPlayer, event.turn, data.cardDefinitionId);
        if (def?.rarity === 'LEGENDARY') {
          SoundManager.play('legendaryPlay');
          // Legendary entrance cinematic
          setLegendaryCinematic({
            cardName: name,
            cardRace: (def as any).race || Race.NEUTRAL,
            attack: (def as any).attack,
            health: (def as any).health,
            cost: def.cost,
          });
        } else if (def?.type === CardType.SPELL) {
          SoundManager.play('spellCast');
          if (data.cardInstanceId) emitVFX('spell', data.cardInstanceId);
        } else {
          SoundManager.play('cardPlay');
        }
        // Pet reacts to card play
        firePetEvent(def?.type === CardType.SPELL ? PetGameEvent.SPELL_CAST : PetGameEvent.CARD_PLAYED);
        // Voiceline on card play
        const playVoiceline = getCardVoiceline(data.cardDefinitionId, VoiceEvent.PLAY);
        if (playVoiceline) {
          showVoiceline(playVoiceline.text, isPlayer ? 'player' : 'opponent');
        }
        break;
      }
      case GameEventType.ATTACK_DECLARED: {
        const data = event.data as CombatEventData;
        const attackerName = getCardName(data.attackerId);
        const isHeroTarget = data.defenderId.startsWith('hero_');
        const defenderName = isHeroTarget ? 'Hero' : getCardName(data.defenderId);
        const attacker = data.attackerOwnerId === 'player' ? 'Your' : "Opponent's";
        addLogEntry(`${attacker} ${attackerName} attacks ${defenderName}`, 'attack', data.attackerOwnerId === 'player', event.turn, getCardDefId(data.attackerId));
        SoundManager.play('attack');
        firePetEvent(PetGameEvent.ATTACK);
        // Queue animation for opponent attacks
        if (data.attackerOwnerId === 'opponent') {
          queueAiAttackRef.current?.(data);
        }
        // Attack voiceline — look up definition from instance
        try {
          const attackerCard = engineRef.current?.getStateManager().getBoard().getCard(data.attackerId);
          if (attackerCard) {
            const atkVoiceline = getCardVoiceline(attackerCard.definitionId, VoiceEvent.ATTACK);
            if (atkVoiceline) {
              showVoiceline(atkVoiceline.text, data.attackerOwnerId === 'player' ? 'player' : 'opponent');
            }
          }
        } catch { /* card may not be on board */ }
        break;
      }
      case GameEventType.DAMAGE_DEALT: {
        const data = event.data as DamageEventData;
        if (data.amount > 0) {
          firePetEvent(data.targetType === 'hero' && data.targetId === 'hero_player'
            ? PetGameEvent.DAMAGE_TAKEN : PetGameEvent.ATTACK);
          emitVFX('damage', data.targetId, data.amount);
          // Board VFX: scale shake + crack with damage
          if (data.amount >= 15) {
            emitBoardVFX('screen_shake', 1, 400);
            emitBoardVFX('board_crack', 1, 1500);
            emitBoardVFX('impact_flash', 0.8, 200);
          } else if (data.amount >= 10) {
            emitBoardVFX('screen_shake', 0.7, 300);
            emitBoardVFX('board_crack', 0.6, 1500);
            emitBoardVFX('impact_flash', 0.5, 200);
          } else if (data.amount >= 6) {
            emitBoardVFX('screen_shake', 0.4, 200);
            emitBoardVFX('impact_flash', 0.3, 150);
          } else if (data.amount >= 3) {
            emitBoardVFX('screen_shake', 0.2, 150);
          }
        }
        if (data.targetType === 'hero') {
          const targetHero = data.targetId === 'hero_player' ? 'Your Hero' : "Opponent's Hero";
          const sourceDefId = data.sourceId ? getCardDefId(data.sourceId) : undefined;
          addLogEntry(`${targetHero} takes ${data.amount} damage`, 'damage', data.targetId === 'hero_opponent', event.turn, sourceDefId);
          SoundManager.play('heroDamage');
        }
        break;
      }
      case GameEventType.CARD_DESTROYED: {
        const data = event.data as CardEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        const owner = data.playerId === 'player' ? 'Your' : "Opponent's";
        addLogEntry(`${owner} ${name} was destroyed`, 'death', data.playerId !== 'player', event.turn, data.cardDefinitionId);
        if (data.cardInstanceId) emitVFX('death', data.cardInstanceId);
        SoundManager.play('minionDeath');
        firePetEvent(PetGameEvent.MINION_KILLED);
        // Death voiceline
        const deathVoiceline = getCardVoiceline(data.cardDefinitionId, VoiceEvent.DEATH);
        if (deathVoiceline) {
          showVoiceline(deathVoiceline.text, data.playerId === 'player' ? 'player' : 'opponent');
        }
        break;
      }
      case GameEventType.HEALING_DONE: {
        const data = event.data as HealEventData;
        if (data.actualHealing > 0) {
          firePetEvent(PetGameEvent.HEAL);
          const targetName = data.targetType === 'hero'
            ? (data.targetId === 'hero_player' ? 'Your Hero' : "Opponent's Hero")
            : getCardName(data.targetId);
          const healSourceDefId = data.targetType !== 'hero' ? getCardDefId(data.targetId) : undefined;
          addLogEntry(`${targetName} healed for ${data.actualHealing}`, 'heal', data.targetId.includes('player'), event.turn, healSourceDefId);
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
      case GameEventType.LAST_WORDS_TRIGGERED: {
        const data = event.data as LastWordsEventData;
        const def = globalCardDatabase.getCard(data.cardDefinitionId);
        const name = def?.name || data.cardDefinitionId;
        const owner = data.playerId === 'player' ? 'Your' : "Opponent's";
        // Extract the Last Words portion of the card text
        const lwText = data.effectDescription.match(/LAST WORDS:\s*(.*?)(?:\.|$)/i)?.[1] || 'effect triggered';
        addLogEntry(`${owner} ${name}'s Last Words: ${lwText}`, 'effect', data.playerId !== 'player', event.turn, data.cardDefinitionId);
        if (data.cardInstanceId) emitVFX('last_words', data.cardInstanceId, undefined, 'LAST WORDS');
        break;
      }
    }
  }, [getCardName, getCardDefId, addLogEntry, emitVFX, emitBoardVFX, showVoiceline]);

  // Ref for stable access in init effect subscription
  const handleGameEventForLogRef = useRef(handleGameEventForLog);
  handleGameEventForLogRef.current = handleGameEventForLog;

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
      // Gap before next animation so player can see each one
      setTimeout(() => processAiAnimationQueue(), 400);
    }, 800);
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
      checkPendingAdapt();
      forceUpdate();
    }
  }, [forceUpdate, checkPendingAdapt]);

  // Initialize game
  useEffect(() => {
    console.log('Initializing game...');

    try {
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
      // Launch factions only
      const allRaces = [Race.PYROCLAST, Race.COGSMITHS, Race.LUMINAR, Race.PHANTOM_CORSAIRS];
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

      // Create AI player with longer delay so each action is visible (Hearthstone-style)
      const ai = createAIPlayer('opponent', aiDifficulty);
      ai.setThinkingDelay(1200);

      engineRef.current = engine;
      aiRef.current = ai;

      // Subscribe to game events (use refs for stable callbacks)
      const events = engine.getEvents();
      const subscription = events.subscribe((event) => {
        try {
          handleGameEventForLogRef.current(event);
        } catch (e) {
          console.error('Error handling game event:', e);
        }
        forceUpdateRef.current();
      });

      // Initial update
      forceUpdateRef.current();

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Game initialization failed:', err);
      // Engine stays null — GameBoard will show loading state
      return undefined;
    }
    // Only re-init when game config props change (callbacks accessed via stable refs)
  }, [playerRace, aiDifficulty, forcedOpponentRace]);

  // Get current state from engine
  const gameState = engineRef.current?.getState() || null;
  const playerState = gameState?.players.get('player') || null;
  const opponentState = gameState?.players.get('opponent') || null;
  const activePlayerId = gameState?.activePlayerId || null;
  const isPlayerTurn = activePlayerId === 'player' && gameState?.phase === GamePhase.MAIN;
  const isGameOver = gameState?.status === GameStatus.FINISHED || gameState?.status === GameStatus.DRAW;
  const turnNumber = gameState?.turn || 0;

  // Board shatter VFX on game over
  const gameOverFiredRef = useRef(false);
  useEffect(() => {
    if (isGameOver && !gameOverFiredRef.current) {
      gameOverFiredRef.current = true;
      emitBoardVFX('board_shatter', 1, 2000);
      emitBoardVFX('screen_shake', 1, 500);
      // Pet reacts to game over
      const playerWon = gameState?.winnerId === 'player';
      firePetEvent(playerWon ? PetGameEvent.VICTORY : PetGameEvent.DEFEAT);
      // Record faction wars contribution on win
      if (playerWon) {
        try {
          const season = loadFactionWars();
          if (season.playerPledge) {
            const updated = recordWinContribution(season);
            saveFactionWars(updated);
          }
        } catch (_e) { /* faction wars not initialized */ }
      }
    }
    if (!isGameOver) {
      gameOverFiredRef.current = false;
    }
  }, [isGameOver, emitBoardVFX]);

  // Get cards from zones — depends on updateCounter to refresh after engine state changes
  const getCardsFromZone = useCallback((playerId: string, zone: CardZone): CardInstance[] => {
    if (!engineRef.current) return [];
    try {
      const board = engineRef.current.getStateManager().getBoard();
      return board.getCardsInZone(playerId, zone);
    } catch (e) {
      console.error(`Error reading ${zone} for ${playerId}:`, e);
      return [];
    }
  }, [updateCounter]); // Re-run when counter changes

  const playerHand = getCardsFromZone('player', CardZone.HAND);
  const playerBoard = getCardsFromZone('player', CardZone.BOARD);
  const opponentBoard = getCardsFromZone('opponent', CardZone.BOARD);

  // Zone counts from Board (actual source of truth — PlayerState arrays are never updated)
  const opponentHandCount = engineRef.current?.getStateManager().getBoard().getHandCount('opponent') ?? 0;
  const playerDeckCount = engineRef.current?.getStateManager().getBoard().getDeckCount('player') ?? 0;
  const opponentDeckCount = engineRef.current?.getStateManager().getBoard().getDeckCount('opponent') ?? 0;

  // AI Turn Logic - runs only when activePlayerId changes (not on every state change)
  useEffect(() => {
    if (activePlayerId !== 'opponent') return;
    if (!engineRef.current || !aiRef.current) return;

    const state = engineRef.current.getState();
    if (state.status !== GameStatus.ACTIVE) return;
    if (aiTurnInProgressRef.current) return;

    console.log('AI turn starting...');
    aiTurnInProgressRef.current = true;

    // Execute AI turn — step-by-step with UI updates between each action
    const runAI = async () => {
      try {
        // Initial delay so player can see it's the AI's turn
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (engineRef.current && aiRef.current) {
          // Override the AI's executeTurn to force UI updates between actions
          const engine = engineRef.current;
          const ai = aiRef.current;
          const stateManager = engine.getStateManager();
          const board = stateManager.getBoard();
          let actionsTaken = 0;
          const maxActions = 15;
          const turnStartTime = Date.now();
          const maxTurnDurationMs = 20000; // Safety: 20 second max for AI turn

          while (actionsTaken < maxActions) {
            // Safety timeout — never let AI turn run longer than 20 seconds
            if (Date.now() - turnStartTime > maxTurnDurationMs) {
              console.warn('AI turn safety timeout reached, ending turn');
              break;
            }

            const state = stateManager.getState();
            if (state.activePlayerId !== 'opponent' || state.phase !== GamePhase.MAIN) break;
            if (state.status !== GameStatus.ACTIVE) break;

            const action = (ai as any).decideAction(stateManager, board, engine);
            if (!action) break;

            const result = engine.processAction(action);
            if (!result.success) break;
            actionsTaken++;

            // Auto-resolve adapt choices for AI
            const aiResolver = engine.getEffectResolver();
            if (aiResolver.pendingAdapt) {
              const aiOptions = aiResolver.pendingAdapt.options;
              const aiChoice = aiOptions[Math.floor(Math.random() * aiOptions.length)];
              aiResolver.resolveAdapt(aiChoice);
            }

            // Force UI update so the player can SEE each AI action
            forceUpdateRef.current();

            // Wait between actions so player can see each move (Hearthstone-style pacing)
            await new Promise(resolve => setTimeout(resolve, 1200));
          }

          // End turn
          engine.processAction({
            type: ActionType.END_TURN,
            playerId: 'opponent',
            timestamp: Date.now(),
            data: {},
          });

          console.log('AI turn complete, active player now:', engine.getState().activePlayerId);
        }
      } catch (err) {
        console.error('AI turn error:', err);
        // On error, force end the AI turn so game doesn't get stuck
        try {
          if (engineRef.current) {
            engineRef.current.processAction({
              type: ActionType.END_TURN,
              playerId: 'opponent',
              timestamp: Date.now(),
              data: {},
            });
          }
        } catch { /* ignore */ }
      } finally {
        aiTurnInProgressRef.current = false;
        forceUpdateRef.current();
      }
    };

    runAI();
  }, [activePlayerId]); // Only trigger when the active player changes

  // Can play card check (uses Board zones for board space, not stale PlayerState)
  const canPlayCard = useCallback((card: CardInstance): boolean => {
    if (!isPlayerTurn || !playerState) return false;
    if (!canAffordCard(playerState, card.currentCost)) return false;
    // Minions and structures need board space — check the actual Board zones
    const def = globalCardDatabase.getCard(card.definitionId);
    if (def?.type === CardType.MINION || def?.type === CardType.STRUCTURE) {
      if (!engineRef.current) return false;
      const board = engineRef.current.getStateManager().getBoard();
      if (!board.hasBoardSpace('player')) return false;
    }
    return true;
  }, [isPlayerTurn, playerState, updateCounter]);

  // Can attack check
  const canAttack = useCallback((minion: CardInstance): boolean => {
    if (!isPlayerTurn) return false;
    if (minion.controllerId !== 'player') return false;
    // Minions with 0 attack cannot attack
    if (minion.currentAttack === undefined || minion.currentAttack <= 0) return false;
    // DOUBLE_STRIKE allows 2 attacks per turn; check attacksMadeThisTurn instead of hasAttackedThisTurn
    const hasDoubleStrike = minion.keywords.some(k => k.keyword === 'DOUBLE_STRIKE');
    const maxAttacks = hasDoubleStrike ? 2 : 1;
    if (minion.attacksMadeThisTurn >= maxAttacks) return false;
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
      const isMinion = def?.type === CardType.MINION || def?.type === CardType.STRUCTURE;

      // Check if it has CHOSEN targeting
      if (hasChosenTarget(def)) {
        // Detect self-buff DEPLOY cards ("Gain +1/+1") — play instantly, no targeting
        const cardText = (def?.cardText || '').toLowerCase();
        const chosenEffect = def?.effects?.find(
          (e: any) => e.targetType === TargetType.CHOSEN || e.targetType === 'CHOSEN' ||
            e.targetType === TargetType.FRIENDLY_MINION || e.targetType === 'FRIENDLY_MINION' ||
            e.targetType === TargetType.ENEMY_MINION || e.targetType === 'ENEMY_MINION'
        );
        const effectType = chosenEffect ? String(chosenEffect.type) : '';
        const isBuff = effectType === 'BUFF' || effectType === 'GRANT_KEYWORD';
        const isSelfBuff = isBuff && isMinion && (
          cardText.includes('gain +') || cardText.includes('gains +')
        );

        // Self-buff DEPLOY: play instantly with self as target, no UI prompt
        if (isSelfBuff) {
          playCard(card, undefined, card.instanceId);
          return;
        }

        if (engineRef.current) {
          const board = engineRef.current.getStateManager().getBoard();
          const targets = computeSpellTargets(def, board, 'player', 'opponent');

          // For DEPLOY minion "Give" buffs, include self as a choosable target
          // (engine places minion on board BEFORE resolving DEPLOY)
          if (isMinion && isBuff && !targets.includes(card.instanceId)) {
            targets.push(card.instanceId);
          }

          if (targets.length === 0) {
            // Hearthstone rule: minions play even with no valid battlecry targets
            if (isMinion) {
              playCard(card);
            }
            return;
          }

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
    checkPendingAdapt();
    forceUpdate();
  }, [canPlayCard, forceUpdate, cancelTargeting, checkPendingAdapt]);

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
    const heroPowerCost = playerState.hero.heroPowerCostOverride ?? 2;
    if (!canAffordCard(playerState, heroPowerCost)) return;

    // Check if hero power requires a target
    const heroDef = getHeroById(playerState.hero.definitionId);
    if (heroDef?.heroPower?.requiresTarget && !targetId) {
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
    checkPendingAdapt();
    forceUpdate();
  }, [isPlayerTurn, playerState, forceUpdate, cancelTargeting, checkPendingAdapt]);

  // Handle clicking a target (used for attack, spell, and hero power targeting)
  const handleTargetClick = useCallback((targetId: string) => {
    if (targetingMode === 'attack' && attackingMinion) {
      attack(attackingMinion, targetId);
    } else if (targetingMode === 'spell' && pendingSpell) {
      playCard(pendingSpell, undefined, targetId);
    } else if (targetingMode === 'heropower' && pendingHeroPower) {
      if (!engineRef.current || !isPlayerTurn || !playerState) return;
      if (playerState.hero.heroPowerUsedThisTurn) return;
      const hpCost = playerState.hero.heroPowerCostOverride ?? 2;
      if (!canAffordCard(playerState, hpCost)) return;

      engineRef.current.processAction({
        type: ActionType.HERO_POWER,
        playerId: 'player',
        timestamp: Date.now(),
        data: { targetId },
      });

      cancelTargeting();
      checkPendingAdapt();
      forceUpdate();
    }
  }, [targetingMode, attackingMinion, pendingSpell, pendingHeroPower, attack, playCard, isPlayerTurn, playerState, forceUpdate, cancelTargeting, checkPendingAdapt]);

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
    checkPendingAdapt();
    forceUpdate();
  }, [forceUpdate, cancelTargeting, checkPendingAdapt]);

  // STARFORGE: Check if a minion can be Starforged
  const canStarforge = useCallback((card: CardInstance): boolean => {
    if (!isPlayerTurn || !engineRef.current) return false;
    try {
      const targets = engineRef.current.getStarforgeTargets('player');
      return targets.some(t => t.instanceId === card.instanceId);
    } catch { return false; }
  }, [isPlayerTurn, updateCounter]);

  // STARFORGE: Get all eligible targets
  const starforgeTargets = useMemo((): CardInstance[] => {
    if (!isPlayerTurn || !engineRef.current) return [];
    try {
      return engineRef.current.getStarforgeTargets('player');
    } catch { return []; }
  }, [isPlayerTurn, updateCounter]);

  // STARFORGE: Activate Starforge on a legendary minion
  const activateStarforge = useCallback((card: CardInstance) => {
    if (!engineRef.current || !canStarforge(card)) return;

    console.log('STARFORGE ASCENSION:', card.definitionId);
    SoundManager.play('starforge');
    emitVFX('starforge', card.instanceId);
    emitBoardVFX('supernova', 1, 1500);
    emitBoardVFX('screen_shake', 0.8, 300);
    firePetEvent(PetGameEvent.STARFORGE);
    // STARFORGE voiceline
    const sfVoiceline = getCardVoiceline(card.definitionId, VoiceEvent.STARFORGE);
    if (sfVoiceline) showVoiceline(sfVoiceline.text, 'player');

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
    boardVFXEvents,
    dismissBoardVFX,
    boardShakeClass,
    legendaryCinematic,
    dismissLegendaryCinematic,
    voicelineBubble,
    pendingAdaptChoice,
    resolveAdaptChoice,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

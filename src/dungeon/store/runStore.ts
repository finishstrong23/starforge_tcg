/**
 * STARFORGE TCG — Dungeon Run State Store
 *
 * React Context provider for roguelite dungeon run state.
 * Key design principle: enemy intents are computed ONCE per turn cycle,
 * stored on the enemy object, and executed from that stored value.
 * The displayed damage live-updates based on current status effects
 * but the underlying intent decision is immutable until next turn.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type {
  RunState,
  DungeonFaction,
  DungeonCardDefinition,
  DungeonEnemy,
  CombatPhase,
  RunCard,
  BoardMinion,
  StatusEffect,
  EnemyIntent,
  RunPhase,
  MapNode,
  DungeonRelic,
  RewardState,
  FloatingText,
  RunStats,
} from '../types';
import { generateMap } from '../engine/mapgen';
import { getDraftOptions, createRunCard } from '../engine/draft';
import {
  initCombat,
  drawCards,
  canPlayCard,
  playMinion,
  endPlayerTurn as discardHand,
  resolveMinionAttack,
  resolveEnemyAttack,
  applyStatus,
  tickStatuses,
  hasStatus,
  getStatusStacks,
  parseSpellEffect,
  processLastWords,
  processImmolate,
  computeDisplayedDamage,
  shuffleArray,
  createId,
} from '../engine/combat';
import {
  createEnemy,
  getActEnemies,
  getActElites,
  getActBoss,
} from '../data/enemies';
import { ALL_DUNGEON_CARDS } from '../data/cards';
import { ALL_RELICS } from '../data/relics';
import {
  processRelicsCombatStart,
  processRelicsTurnStart,
  processRelicsCardPlayed,
  processRelicsOnKill,
  processRelicsOnMinionDeath,
  getPassiveModifiers,
  getCardCostWithRelics,
  shouldPhoenixSave,
} from '../engine/relicEffects';
import { applyUpgrade } from '../engine/cardUpgrade';

// ─── Initial State ────────────────────────────────────────────

function createInitialState(): RunState {
  return {
    phase: 'DRAFT',
    act: 1,
    deck: [],
    hand: [],
    drawPile: [],
    discardPile: [],
    exhaustPile: [],
    energy: 3,
    maxEnergy: 3,
    heroHealth: 75,
    maxHeroHealth: 75,
    heroBlock: 0,
    heroStatusEffects: [],
    board: [],
    currentEnemy: null,
    currentEnemyGroup: [],
    map: [],
    currentNodeId: '',
    relics: [],
    gold: 50,
    turn: 0,
    combatPhase: 'COMBAT_START',
    runSeed: '',
    combatLog: [],
    stats: {
      turnsPlayed: 0,
      damageDealt: 0,
      damageTaken: 0,
      cardsCollected: 0,
      relicsCollected: 0,
      enemiesKilled: 0,
      floorReached: 0,
    },
    reward: null,
    draftRound: 1,
    draftFaction: null,
    draftOptions: [],
    draftRelicOptions: [],
    cardsPlayedThisTurn: 0,
    hasHealedThisTurn: false,
    hasHealedThisCombat: false,
    phoenixFeatherUsed: false,
    selectedMinionId: null,
    selectedCardId: null,
    floatingTexts: [],
  };
}

// ─── Intent Helpers ───────────────────────────────────────────

/**
 * Recalculate the intent for an enemy at a given turn.
 * This is the single point where intent decisions are made.
 */
function rollIntent(enemy: DungeonEnemy, turn: number): EnemyIntent {
  return enemy.aiPattern.getIntent(turn, enemy);
}

/**
 * Roll intents for all enemies in the group.
 */
function rollAllIntents(enemies: DungeonEnemy[], turn: number): DungeonEnemy[] {
  return enemies.map(e => ({
    ...e,
    intent: rollIntent(e, turn),
  }));
}

// ─── Context ──────────────────────────────────────────────────

interface RunActions {
  startNewRun(): void;
  selectDraftFaction(faction: DungeonFaction): void;
  pickDraftCard(cardId: string): void;
  pickStartingRelic(relicId: string): void;
  moveToNode(nodeId: string): void;
  playCard(instanceId: string, targetId?: string): void;
  attackWithMinion(minionId: string, targetId: string): void;
  endPlayerTurn(): void;
  executeEnemyTurn(): void;
  selectMinion(id: string | null): void;
  selectCard(id: string | null): void;
  buyCard(cardId: string): void;
  buyRelic(relicId: string): void;
  removeCard(instanceId: string): void;
  upgradeCard(instanceId: string): void;
  healAtRest(): void;
  returnToMap(): void;
  pickRewardCard(cardId: string): void;
  pickRewardRelic(relicId: string): void;
  skipReward(): void;
  nextAct(): void;
}

const StateContext = createContext<RunState>(createInitialState());
const ActionsContext = createContext<RunActions>({} as RunActions);

export function useRunState(): RunState {
  return useContext(StateContext);
}

export function useRunActions(): RunActions {
  return useContext(ActionsContext);
}

// ─── Provider ─────────────────────────────────────────────────

export function RunProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RunState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback((updater: (prev: RunState) => Partial<RunState>) => {
    setState(prev => {
      const changes = updater(prev);
      const next = { ...prev, ...changes };
      stateRef.current = next;
      return next;
    });
  }, []);

  // ── Draft Actions ────────────────────────────────────────

  const startNewRun = useCallback(() => {
    const seed = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const modifiers = getPassiveModifiers([]);
    setState({
      ...createInitialState(),
      runSeed: seed,
      maxEnergy: 3 + modifiers.extraMaxEnergy,
      energy: 3 + modifiers.extraMaxEnergy,
      maxHeroHealth: 75 + modifiers.extraMaxHealth,
      heroHealth: 75 + modifiers.extraMaxHealth,
    });
  }, []);

  const selectDraftFaction = useCallback((faction: DungeonFaction) => {
    const s = stateRef.current;
    const result = getDraftOptions(1, faction, ALL_DUNGEON_CARDS, [], ALL_RELICS);
    update(() => ({
      draftFaction: faction,
      draftRound: 1,
      draftOptions: result.cards,
      draftRelicOptions: result.relics,
    }));
  }, [update]);

  const pickDraftCard = useCallback((cardId: string) => {
    const s = stateRef.current;
    const card = s.draftOptions.find(c => c.id === cardId);
    if (!card || !s.draftFaction) return;

    const runCard = createRunCard(card);
    const newDeck = [...s.deck, runCard];
    const nextRound = s.draftRound + 1;

    if (nextRound > 9) {
      // Switch to relic pick
      const result = getDraftOptions(10, s.draftFaction, ALL_DUNGEON_CARDS, newDeck.map(c => c.id), ALL_RELICS);
      update(() => ({
        deck: newDeck,
        draftRound: 10,
        draftOptions: [],
        draftRelicOptions: result.relics,
        stats: { ...s.stats, cardsCollected: s.stats.cardsCollected + 1 },
      }));
    } else {
      const result = getDraftOptions(nextRound, s.draftFaction, ALL_DUNGEON_CARDS, newDeck.map(c => c.id), ALL_RELICS);
      update(() => ({
        deck: newDeck,
        draftRound: nextRound,
        draftOptions: result.cards,
        draftRelicOptions: result.relics,
        stats: { ...s.stats, cardsCollected: s.stats.cardsCollected + 1 },
      }));
    }
  }, [update]);

  const pickStartingRelic = useCallback((relicId: string) => {
    const s = stateRef.current;
    const relic = s.draftRelicOptions.find(r => r.id === relicId);
    if (!relic) return;

    const newRelics = [...s.relics, relic];
    const modifiers = getPassiveModifiers(newRelics);
    const map = generateMap(s.runSeed, 1);

    update(() => ({
      relics: newRelics,
      maxEnergy: 3 + modifiers.extraMaxEnergy,
      energy: 3 + modifiers.extraMaxEnergy,
      maxHeroHealth: 75 + modifiers.extraMaxHealth,
      heroHealth: Math.min(s.heroHealth, 75 + modifiers.extraMaxHealth),
      phase: 'MAP' as RunPhase,
      map,
      currentNodeId: map[0][0].id,
      stats: { ...s.stats, relicsCollected: s.stats.relicsCollected + 1 },
    }));
  }, [update]);

  // ── Map Actions ──────────────────────────────────────────

  const moveToNode = useCallback((nodeId: string) => {
    const s = stateRef.current;
    const node = findNode(s.map, nodeId);
    if (!node) return;

    // Mark current node as completed and make destination accessible
    const newMap = markNodeCompleted(s.map, s.currentNodeId, nodeId);

    switch (node.type) {
      case 'COMBAT':
      case 'ELITE':
      case 'BOSS': {
        const enemies = spawnEnemies(node.type, s.act as 1 | 2 | 3, s.runSeed + nodeId);
        // Intent is already set by createEnemy (turn 1 intent)
        const combat = initCombat(s.deck);
        const relicStart = processRelicsCombatStart(s.relics);

        // Draw extra cards from relics
        let { drawPile, hand, discardPile } = combat;
        if (relicStart.extraDraw > 0) {
          const drawn = drawCards(drawPile, combat.discardPile, hand, relicStart.extraDraw);
          drawPile = drawn.drawPile;
          hand = drawn.hand;
          discardPile = drawn.discardPile;
        }

        const modifiers = getPassiveModifiers(s.relics);

        update(() => ({
          phase: 'COMBAT' as RunPhase,
          combatPhase: 'PLAYER_ACTING' as CombatPhase,
          currentNodeId: nodeId,
          map: newMap,
          currentEnemy: enemies[0],
          currentEnemyGroup: enemies,
          drawPile,
          hand,
          discardPile,
          exhaustPile: [],
          board: [],
          heroBlock: 0,
          energy: s.maxEnergy + relicStart.extraEnergy,
          turn: 1,
          combatLog: [],
          cardsPlayedThisTurn: 0,
          hasHealedThisTurn: false,
          hasHealedThisCombat: false,
          selectedMinionId: null,
          selectedCardId: null,
          heroHealth: s.heroHealth - modifiers.cursedGoldDamage,
        }));
        break;
      }
      case 'REST':
        update(() => ({
          phase: 'REST' as RunPhase,
          currentNodeId: nodeId,
          map: newMap,
        }));
        break;
      case 'SHOP':
        update(() => ({
          phase: 'SHOP' as RunPhase,
          currentNodeId: nodeId,
          map: newMap,
        }));
        break;
      case 'TREASURE': {
        // Give a random relic
        const available = ALL_RELICS.filter(r => !s.relics.some(owned => owned.id === r.id) && !r.isBossRelic);
        const relic = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null;
        update(() => ({
          phase: 'REWARD' as RunPhase,
          currentNodeId: nodeId,
          map: newMap,
          reward: {
            cardOptions: [],
            relicOptions: relic ? [relic] : [],
            gold: 25 + Math.floor(Math.random() * 25),
            picked: false,
          },
        }));
        break;
      }
    }
  }, [update]);

  // ── Combat Actions (INTENT SYSTEM CORE) ──────────────────

  const playCard = useCallback((instanceId: string, targetId?: string) => {
    const s = stateRef.current;
    if (s.combatPhase !== 'PLAYER_ACTING') return;

    const cardIndex = s.hand.findIndex(c => c.instanceId === instanceId);
    if (cardIndex === -1) return;

    const card = s.hand[cardIndex];
    const cost = getCardCostWithRelics(card, s.relics, s.hasHealedThisTurn);
    if (cost > s.energy) return;

    const newHand = s.hand.filter(c => c.instanceId !== instanceId);
    let newBoard = [...s.board];
    let newEnergy = s.energy - cost;
    let newEnemyGroup = [...s.currentEnemyGroup];
    let newHeroHealth = s.heroHealth;
    let newHeroBlock = s.heroBlock;
    let newHeroEffects = [...s.heroStatusEffects];
    let newDiscardPile = [...s.discardPile];
    let newDrawPile = [...s.drawPile];
    let newExhaustPile = [...s.exhaustPile];
    let newStats = { ...s.stats };
    const newLog = [...s.combatLog];
    let cardsPlayed = s.cardsPlayedThisTurn + 1;
    let healed = s.hasHealedThisTurn;

    if (card.type === 'Minion') {
      const minion = playMinion(card);
      newBoard = [...newBoard, minion];
      newLog.push(`Played ${card.name}`);
    } else if (card.type === 'Spell') {
      const effects = parseSpellEffect(card);

      if (effects.damage > 0) {
        if (effects.aoeMultiplier) {
          newEnemyGroup = newEnemyGroup.map(enemy => ({
            ...enemy,
            currentHealth: enemy.currentHealth - effects.damage,
          }));
          newStats.damageDealt += effects.damage * newEnemyGroup.length;
        } else {
          const target = newEnemyGroup[0];
          if (target) {
            newEnemyGroup = newEnemyGroup.map(e =>
              e.id === target.id
                ? { ...e, currentHealth: e.currentHealth - effects.damage }
                : e
            );
            newStats.damageDealt += effects.damage;
          }
        }
      }

      if (effects.heal > 0) {
        newHeroHealth = Math.min(s.maxHeroHealth, newHeroHealth + effects.heal);
        healed = true;
      }

      if (effects.block > 0) {
        newHeroBlock += effects.block;
      }

      if (effects.draw > 0) {
        const drawn = drawCards(newDrawPile, newDiscardPile, newHand, effects.draw);
        newDrawPile = drawn.drawPile;
        newDiscardPile = drawn.discardPile;
        // Note: newHand is already modified above (card removed), but drawCards adds to it
        // We need to handle this carefully
      }

      if (effects.applyStatus) {
        const status = effects.applyStatus;
        newEnemyGroup = newEnemyGroup.map(enemy => ({
          ...enemy,
          statusEffects: applyStatus(enemy.statusEffects, status.type, status.stacks, status.type === 'VULNERABLE' || status.type === 'WEAK' ? 2 : undefined),
        }));
      }

      newLog.push(`Cast ${card.name}`);
      newDiscardPile = [...newDiscardPile, card];
    } else if (card.type === 'Structure') {
      const minion = playMinion(card);
      newBoard = [...newBoard, minion];
      newLog.push(`Built ${card.name}`);
    }

    // Remove dead enemies
    const deadEnemies = newEnemyGroup.filter(e => e.currentHealth <= 0);
    if (deadEnemies.length > 0) {
      newStats.enemiesKilled += deadEnemies.length;
      newEnemyGroup = newEnemyGroup.filter(e => e.currentHealth > 0);
    }

    // Check for combat victory
    if (newEnemyGroup.length === 0) {
      update(() => ({
        hand: card.type === 'Spell' ? newHand : [...newHand],
        board: newBoard,
        energy: newEnergy,
        currentEnemyGroup: [],
        currentEnemy: null,
        heroHealth: newHeroHealth,
        heroBlock: newHeroBlock,
        heroStatusEffects: newHeroEffects,
        discardPile: newDiscardPile,
        drawPile: newDrawPile,
        exhaustPile: newExhaustPile,
        combatPhase: 'COMBAT_VICTORY' as CombatPhase,
        combatLog: newLog,
        cardsPlayedThisTurn: cardsPlayed,
        hasHealedThisTurn: healed,
        stats: newStats,
      }));
      // Transition to reward after delay
      setTimeout(() => {
        const current = stateRef.current;
        if (current.combatPhase === 'COMBAT_VICTORY') {
          generateReward(current);
        }
      }, 1500);
      return;
    }

    update(() => ({
      hand: card.type === 'Spell' ? newHand : [...newHand],
      board: newBoard,
      energy: newEnergy,
      currentEnemyGroup: newEnemyGroup,
      currentEnemy: newEnemyGroup[0],
      heroHealth: newHeroHealth,
      heroBlock: newHeroBlock,
      heroStatusEffects: newHeroEffects,
      discardPile: newDiscardPile,
      drawPile: newDrawPile,
      exhaustPile: newExhaustPile,
      combatLog: newLog,
      cardsPlayedThisTurn: cardsPlayed,
      hasHealedThisTurn: healed,
      stats: newStats,
    }));
  }, [update]);

  const attackWithMinion = useCallback((minionId: string, targetId: string) => {
    const s = stateRef.current;
    if (s.combatPhase !== 'PLAYER_ACTING') return;

    const minionIndex = s.board.findIndex(m => m.instanceId === minionId);
    if (minionIndex === -1) return;

    const minion = s.board[minionIndex];
    const targetEnemy = s.currentEnemyGroup.find(e => e.id === targetId);
    if (!targetEnemy) return;

    const result = resolveMinionAttack(minion, targetEnemy);
    let newBoard = s.board.map(m => m.instanceId === minionId ? result.minion : m);
    let newEnemyGroup = s.currentEnemyGroup.map(e => e.id === targetId ? result.enemy : e);
    let newHeroHealth = s.heroHealth;
    let newStats = { ...s.stats, damageDealt: s.stats.damageDealt + result.damageDealt };
    const newLog = [...s.combatLog, `${minion.card.name} attacks ${targetEnemy.name} for ${result.damageDealt}`];

    if (result.drainHeal > 0) {
      newHeroHealth = Math.min(s.maxHeroHealth, newHeroHealth + result.drainHeal);
    }

    // Remove dead enemies
    const deadEnemies = newEnemyGroup.filter(e => e.currentHealth <= 0);
    newStats.enemiesKilled += deadEnemies.length;
    newEnemyGroup = newEnemyGroup.filter(e => e.currentHealth > 0);

    if (newEnemyGroup.length === 0) {
      update(() => ({
        board: newBoard,
        currentEnemyGroup: [],
        currentEnemy: null,
        heroHealth: newHeroHealth,
        combatPhase: 'COMBAT_VICTORY' as CombatPhase,
        combatLog: newLog,
        stats: newStats,
      }));
      setTimeout(() => {
        const current = stateRef.current;
        if (current.combatPhase === 'COMBAT_VICTORY') {
          generateReward(current);
        }
      }, 1500);
      return;
    }

    update(() => ({
      board: newBoard,
      currentEnemyGroup: newEnemyGroup,
      currentEnemy: newEnemyGroup[0],
      heroHealth: newHeroHealth,
      combatLog: newLog,
      stats: newStats,
    }));
  }, [update]);

  /**
   * End player turn: discard hand, transition to ENEMY_TURN_START.
   * The intent icons are already on each enemy from the previous cycle.
   */
  const endPlayerTurn = useCallback(() => {
    const s = stateRef.current;
    if (s.combatPhase !== 'PLAYER_ACTING') return;

    const { hand: newHand, discardPile: newDiscard } = discardHand(s.hand, s.discardPile);

    // Reset minion attack flags for next turn
    const newBoard = s.board.map(m => ({
      ...m,
      hasAttacked: false,
      summonedThisTurn: false,
    }));

    update(() => ({
      hand: newHand,
      discardPile: newDiscard,
      board: newBoard,
      combatPhase: 'ENEMY_TURN_START' as CombatPhase,
      selectedMinionId: null,
      selectedCardId: null,
    }));
  }, [update]);

  /**
   * Execute enemy turn: resolve stored intents, then compute NEXT intents.
   * This is the core of the intent lifecycle:
   *   1. Execute each enemy's current intent (the one displayed this turn)
   *   2. Tick status effects on enemies
   *   3. Compute and store the NEXT turn's intent on each enemy
   *   4. Transition to PLAYER_TURN_START (draw, energy refresh)
   */
  const executeEnemyTurn = useCallback(() => {
    const s = stateRef.current;
    if (s.combatPhase !== 'ENEMY_TURN_START') return;

    let heroHealth = s.heroHealth;
    let heroBlock = s.heroBlock;
    let heroEffects = [...s.heroStatusEffects];
    let board = [...s.board];
    let enemyGroup = [...s.currentEnemyGroup];
    const log = [...s.combatLog];
    let stats = { ...s.stats };

    // ── Step 1: Execute each enemy's stored intent ──────────
    for (let i = 0; i < enemyGroup.length; i++) {
      const enemy = enemyGroup[i];
      const intent = enemy.intent;

      switch (intent.type) {
        case 'ATTACK':
        case 'MULTI_ATTACK': {
          const hits = intent.hits ?? 1;
          for (let h = 0; h < hits; h++) {
            const result = resolveEnemyAttack(
              enemy,
              heroHealth,
              heroBlock,
              heroEffects,
            );
            heroHealth = result.heroHealth;
            heroBlock = result.heroBlock;
            stats.damageTaken += result.damageDealt;
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'AOE_ATTACK': {
          // Damage hero
          const heroResult = resolveEnemyAttack(enemy, heroHealth, heroBlock, heroEffects);
          heroHealth = heroResult.heroHealth;
          heroBlock = heroResult.heroBlock;
          stats.damageTaken += heroResult.damageDealt;
          // Damage all board minions
          board = board.map(m => {
            const dmg = intent.damage ?? 0;
            return { ...m, currentHealth: m.currentHealth - dmg };
          }).filter(m => m.currentHealth > 0);
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'DEFEND': {
          const blockGain = intent.block ?? intent.value ?? 0;
          enemyGroup = enemyGroup.map(e =>
            e.id === enemy.id
              ? { ...e, block: e.block + blockGain }
              : e
          );
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'BUFF': {
          const buffValue = intent.value ?? 0;
          if (intent.description.toLowerCase().includes('strength')) {
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, statusEffects: applyStatus(e.statusEffects, 'STRENGTH', buffValue) }
                : e
            );
          } else if (intent.description.toLowerCase().includes('regen')) {
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, statusEffects: applyStatus(e.statusEffects, 'REGEN', buffValue) }
                : e
            );
          } else if (intent.description.toLowerCase().includes('heal')) {
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, currentHealth: Math.min(e.maxHealth, e.currentHealth + buffValue) }
                : e
            );
          } else if (intent.description.toLowerCase().includes('enrage')) {
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, statusEffects: applyStatus(e.statusEffects, 'STRENGTH', buffValue) }
                : e
            );
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'DEBUFF': {
          if (intent.description.toLowerCase().includes('vulnerable')) {
            heroEffects = applyStatus(heroEffects, 'VULNERABLE', intent.value ?? 1, 2);
          }
          if (intent.description.toLowerCase().includes('weak')) {
            heroEffects = applyStatus(heroEffects, 'WEAK', intent.value ?? 1, 2);
          }
          if (intent.description.toLowerCase().includes('burn')) {
            heroEffects = applyStatus(heroEffects, 'BURN', intent.value ?? 1);
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'ATTACK_BUFF': {
          // Attack portion
          const atkResult = resolveEnemyAttack(enemy, heroHealth, heroBlock, heroEffects);
          heroHealth = atkResult.heroHealth;
          heroBlock = atkResult.heroBlock;
          stats.damageTaken += atkResult.damageDealt;
          // Buff portion
          const bVal = intent.value ?? 0;
          if (intent.buffName?.toLowerCase().includes('strength') || intent.description.toLowerCase().includes('strength')) {
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, statusEffects: applyStatus(e.statusEffects, 'STRENGTH', bVal) }
                : e
            );
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'ATTACK_DEBUFF': {
          // Attack portion
          const atkResult2 = resolveEnemyAttack(enemy, heroHealth, heroBlock, heroEffects);
          heroHealth = atkResult2.heroHealth;
          heroBlock = atkResult2.heroBlock;
          stats.damageTaken += atkResult2.damageDealt;
          // Debuff portion
          if (intent.debuffName?.toLowerCase().includes('weak') || intent.description.toLowerCase().includes('weak')) {
            heroEffects = applyStatus(heroEffects, 'WEAK', 1, 2);
          }
          if (intent.debuffName?.toLowerCase().includes('vulnerable') || intent.description.toLowerCase().includes('vulnerable')) {
            heroEffects = applyStatus(heroEffects, 'VULNERABLE', 1, 2);
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'SPECIAL': {
          // Parse special intent descriptions
          const desc = intent.description.toLowerCase();
          if (desc.includes('heal')) {
            const healAmt = intent.value ?? 0;
            enemyGroup = enemyGroup.map(e =>
              e.id === enemy.id
                ? { ...e, currentHealth: Math.min(e.maxHealth, e.currentHealth + healAmt) }
                : e
            );
          } else if (desc.includes('deal') && desc.includes('all')) {
            const dmg = intent.value ?? 0;
            heroHealth -= dmg;
            board = board.map(m => ({
              ...m, currentHealth: m.currentHealth - dmg,
            })).filter(m => m.currentHealth > 0);
            stats.damageTaken += dmg;
          } else if (desc.includes('deal') || desc.includes('supernova')) {
            const dmg = intent.value ?? 0;
            heroHealth -= dmg;
            stats.damageTaken += dmg;
          } else if (desc.includes('summon')) {
            // Summon logic would go here
          } else if (desc.includes('steal')) {
            // Steal logic would go here
          } else if (desc.includes('destroy') || desc.includes('devour') || desc.includes('consume')) {
            if (board.length > 0) {
              const targetIdx = Math.floor(Math.random() * board.length);
              board = board.filter((_, idx) => idx !== targetIdx);
            }
          }
          log.push(`${enemy.name}: ${intent.description}`);
          break;
        }
        case 'UNKNOWN':
        default:
          log.push(`${enemy.name} is preparing...`);
          break;
      }
    }

    // ── Step 2: Tick status effects on enemies ──────────────
    enemyGroup = enemyGroup.map(e => ({
      ...e,
      statusEffects: tickStatuses(e.statusEffects),
      block: 0, // Enemy block resets each turn
    }));

    // Tick hero status effects
    let burnDamage = 0;
    const burnStacks = getStatusStacks(heroEffects, 'BURN');
    if (burnStacks > 0) {
      burnDamage = burnStacks;
      heroHealth -= burnDamage;
      stats.damageTaken += burnDamage;
    }
    heroEffects = tickStatuses(heroEffects);

    // ── Step 3: Check for hero death ───────────────────────
    if (heroHealth <= 0) {
      if (shouldPhoenixSave(s.relics, s.phoenixFeatherUsed)) {
        heroHealth = Math.floor(s.maxHeroHealth * 0.5);
        log.push('Phoenix Feather saves you from death!');
        update(() => ({
          heroHealth,
          heroBlock: 0,
          heroStatusEffects: heroEffects,
          board,
          currentEnemyGroup: enemyGroup,
          currentEnemy: enemyGroup[0] || null,
          combatLog: log,
          stats,
          phoenixFeatherUsed: true,
        }));
      } else {
        update(() => ({
          heroHealth: 0,
          combatPhase: 'RUN_DEATH' as CombatPhase,
          phase: 'DEATH' as RunPhase,
          combatLog: log,
          stats,
        }));
        return;
      }
    }

    // ── Step 4: Compute NEXT turn's intent for every enemy ──
    const nextTurn = s.turn + 1;
    enemyGroup = rollAllIntents(enemyGroup, nextTurn);

    // Log intent decisions for debugging
    for (const enemy of enemyGroup) {
      console.log(
        `[Intent] ${enemy.name} (turn ${nextTurn}): ${enemy.intent.type}` +
        (enemy.intent.damage != null ? ` dmg=${enemy.intent.damage}` : '') +
        (enemy.intent.hits != null ? ` x${enemy.intent.hits}` : '') +
        (enemy.intent.block != null ? ` block=${enemy.intent.block}` : '') +
        ` — "${enemy.intent.description}"`
      );
    }

    // ── Step 5: Transition to player turn ────────────────────
    // Draw cards and refresh energy
    const drawn = drawCards(s.drawPile, s.discardPile, [], 5);
    const relicTurn = processRelicsTurnStart(s.relics, nextTurn, s.relics.length);

    // Apply relic turn-start effects
    if (relicTurn.strength > 0) {
      heroEffects = applyStatus(heroEffects, 'STRENGTH', relicTurn.strength);
    }
    if (relicTurn.damageToEnemy > 0) {
      enemyGroup = enemyGroup.map(e => ({
        ...e,
        currentHealth: e.currentHealth - relicTurn.damageToEnemy,
      })).filter(e => e.currentHealth > 0);
    }

    const modifiers = getPassiveModifiers(s.relics);
    const newHeroBlock = relicTurn.block;

    update(() => ({
      heroHealth,
      heroBlock: newHeroBlock,
      heroStatusEffects: heroEffects,
      board,
      currentEnemyGroup: enemyGroup,
      currentEnemy: enemyGroup.length > 0 ? enemyGroup[0] : null,
      hand: drawn.hand,
      drawPile: drawn.drawPile,
      discardPile: drawn.discardPile,
      energy: s.maxEnergy,
      turn: nextTurn,
      combatPhase: (enemyGroup.length === 0 ? 'COMBAT_VICTORY' : 'PLAYER_ACTING') as CombatPhase,
      combatLog: log,
      cardsPlayedThisTurn: 0,
      hasHealedThisTurn: false,
      stats: { ...stats, turnsPlayed: stats.turnsPlayed + 1 },
    }));

    // If all enemies died from relic effects
    if (enemyGroup.length === 0) {
      setTimeout(() => {
        const current = stateRef.current;
        if (current.combatPhase === 'COMBAT_VICTORY') {
          generateReward(current);
        }
      }, 1500);
    }
  }, [update]);

  // ── Selection ────────────────────────────────────────────

  const selectMinion = useCallback((id: string | null) => {
    update(() => ({ selectedMinionId: id }));
  }, [update]);

  const selectCard = useCallback((id: string | null) => {
    update(() => ({ selectedCardId: id }));
  }, [update]);

  // ── Reward Actions ───────────────────────────────────────

  const generateReward = useCallback((s: RunState) => {
    const node = findNode(s.map, s.currentNodeId);
    const isElite = node?.type === 'ELITE';
    const isBoss = node?.type === 'BOSS';

    // Generate card reward options
    const faction = s.draftFaction ?? 'Cogsmiths';
    const factionCards = ALL_DUNGEON_CARDS.filter(c => c.faction === faction);
    const otherCards = ALL_DUNGEON_CARDS.filter(c => c.faction !== faction);
    const pool = Math.random() < 0.7 ? factionCards : otherCards;
    const shuffled = shuffleArray(pool);
    const cardOptions = shuffled.slice(0, 3);

    // Relic for elites/bosses
    const relicOptions: DungeonRelic[] = [];
    if (isElite || isBoss) {
      const available = ALL_RELICS.filter(r =>
        !s.relics.some(owned => owned.id === r.id) &&
        (isBoss ? true : !r.isBossRelic)
      );
      if (available.length > 0) {
        const shuffledRelics = shuffleArray(available);
        relicOptions.push(...shuffledRelics.slice(0, isBoss ? 1 : 3));
      }
    }

    const goldReward = isBoss ? 75 : isElite ? 50 : 25 + Math.floor(Math.random() * 15);

    update(() => ({
      phase: 'REWARD' as RunPhase,
      reward: {
        cardOptions,
        relicOptions,
        gold: goldReward,
        picked: false,
      },
      gold: s.gold + goldReward,
      stats: { ...s.stats, floorReached: s.stats.floorReached + 1 },
    }));
  }, [update]);

  const pickRewardCard = useCallback((cardId: string) => {
    const s = stateRef.current;
    if (!s.reward || s.reward.picked) return;
    const card = s.reward.cardOptions.find(c => c.id === cardId);
    if (!card) return;

    const runCard = createRunCard(card);
    update(() => ({
      deck: [...s.deck, runCard],
      reward: { ...s.reward!, picked: true },
      stats: { ...s.stats, cardsCollected: s.stats.cardsCollected + 1 },
    }));
  }, [update]);

  const pickRewardRelic = useCallback((relicId: string) => {
    const s = stateRef.current;
    if (!s.reward) return;
    const relic = s.reward.relicOptions.find(r => r.id === relicId);
    if (!relic) return;

    const newRelics = [...s.relics, relic];
    const modifiers = getPassiveModifiers(newRelics);
    update(() => ({
      relics: newRelics,
      maxEnergy: 3 + modifiers.extraMaxEnergy,
      maxHeroHealth: 75 + modifiers.extraMaxHealth,
      heroHealth: Math.min(s.heroHealth, 75 + modifiers.extraMaxHealth),
      reward: { ...s.reward!, picked: true },
      stats: { ...s.stats, relicsCollected: s.stats.relicsCollected + 1 },
    }));
  }, [update]);

  const skipReward = useCallback(() => {
    update(() => ({
      phase: 'MAP' as RunPhase,
      reward: null,
    }));
  }, [update]);

  // ── Shop Actions ─────────────────────────────────────────

  const buyCard = useCallback((cardId: string) => {
    const s = stateRef.current;
    const card = ALL_DUNGEON_CARDS.find(c => c.id === cardId);
    if (!card) return;
    const cost = card.rarity === 'Legendary' ? 150 : card.rarity === 'Epic' ? 100 : card.rarity === 'Rare' ? 75 : 50;
    if (s.gold < cost) return;

    const runCard = createRunCard(card);
    update(() => ({
      deck: [...s.deck, runCard],
      gold: s.gold - cost,
      stats: { ...s.stats, cardsCollected: s.stats.cardsCollected + 1 },
    }));
  }, [update]);

  const buyRelic = useCallback((relicId: string) => {
    const s = stateRef.current;
    const relic = ALL_RELICS.find(r => r.id === relicId);
    if (!relic || s.gold < 100) return;

    update(() => ({
      relics: [...s.relics, relic],
      gold: s.gold - 100,
      stats: { ...s.stats, relicsCollected: s.stats.relicsCollected + 1 },
    }));
  }, [update]);

  const removeCard = useCallback((instanceId: string) => {
    const s = stateRef.current;
    const cost = 75;
    if (s.gold < cost) return;

    update(() => ({
      deck: s.deck.filter(c => c.instanceId !== instanceId),
      gold: s.gold - cost,
    }));
  }, [update]);

  const upgradeCard = useCallback((instanceId: string) => {
    const s = stateRef.current;
    const card = s.deck.find(c => c.instanceId === instanceId);
    if (!card || card.upgraded) return;

    const upgraded = applyUpgrade(card);
    update(() => ({
      deck: s.deck.map(c => c.instanceId === instanceId ? upgraded : c),
    }));
  }, [update]);

  // ── Rest Site ────────────────────────────────────────────

  const healAtRest = useCallback(() => {
    const s = stateRef.current;
    const healAmount = Math.floor(s.maxHeroHealth * 0.3);
    update(() => ({
      heroHealth: Math.min(s.maxHeroHealth, s.heroHealth + healAmount),
    }));
  }, [update]);

  // ── Navigation ───────────────────────────────────────────

  const returnToMap = useCallback(() => {
    update(() => ({
      phase: 'MAP' as RunPhase,
      reward: null,
      combatPhase: 'COMBAT_START' as CombatPhase,
    }));
  }, [update]);

  const nextAct = useCallback(() => {
    const s = stateRef.current;
    const nextActNum = Math.min(3, s.act + 1) as 1 | 2 | 3;
    const map = generateMap(s.runSeed, nextActNum);

    update(() => ({
      act: nextActNum,
      map,
      currentNodeId: map[0][0].id,
      phase: 'MAP' as RunPhase,
    }));
  }, [update]);

  // ── Assemble actions ─────────────────────────────────────

  const actions: RunActions = {
    startNewRun,
    selectDraftFaction,
    pickDraftCard,
    pickStartingRelic,
    moveToNode,
    playCard,
    attackWithMinion,
    endPlayerTurn,
    executeEnemyTurn,
    selectMinion,
    selectCard,
    buyCard,
    buyRelic,
    removeCard,
    upgradeCard,
    healAtRest,
    returnToMap,
    pickRewardCard,
    pickRewardRelic,
    skipReward,
    nextAct,
  };

  return React.createElement(
    StateContext.Provider,
    { value: state },
    React.createElement(
      ActionsContext.Provider,
      { value: actions },
      children
    )
  );
}

// ─── Utilities ────────────────────────────────────────────────

function findNode(map: MapNode[][], nodeId: string): MapNode | undefined {
  for (const row of map) {
    for (const node of row) {
      if (node.id === nodeId) return node;
    }
  }
  return undefined;
}

function markNodeCompleted(map: MapNode[][], currentId: string, nextId: string): MapNode[][] {
  return map.map(row =>
    row.map(node => {
      if (node.id === currentId) return { ...node, completed: true };
      if (node.id === nextId) return { ...node, accessible: true };
      return node;
    })
  );
}

function spawnEnemies(
  nodeType: 'COMBAT' | 'ELITE' | 'BOSS',
  act: 1 | 2 | 3,
  seed: string,
): DungeonEnemy[] {
  if (nodeType === 'BOSS') {
    return [createEnemy(getActBoss(act))];
  }

  const pool = nodeType === 'ELITE' ? getActElites(act) : getActEnemies(act);
  // Pick 1-2 enemies for regular combat, 1 for elite
  const count = nodeType === 'ELITE' ? 1 : (seed.charCodeAt(0) % 2) + 1;
  const shuffled = shuffleArray(pool, seed);
  return shuffled.slice(0, count).map(id => createEnemy(id));
}

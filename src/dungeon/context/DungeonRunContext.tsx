import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type {
  AscensionLevel,
  CardDefinition,
  CardInstance,
  CombatState,
  Faction,
  PotionContext,
  PotionInstance,
  RelicDefinition,
  RunModifierDefinition,
  RunPhase,
  RunState,
} from '../types';
import { getEnemiesByAct, getElitesByAct, getBossByAct } from '../data/enemies';
import { generateActMap, visitNode } from '../engine/mapgen';
import { createCardInstance, generateDraftOptions, getStarterCards } from '../engine/draft';
import { initCombat } from '../engine/combat';
import { applyPotion } from '../data/potions';
import { BLESSING_POOL, applyBlessing as resolveBlessing, type BlessingId } from '../data/blessings';
import { applyRelicsToCombat, applyRelicsToRun } from '../engine/relicEffects';
import { logEvent } from '../engine/telemetry';
import { getAscensionMods } from '../engine/ascension';
import { pickEventForNode } from '../engine/eventSelection';
import { applyRunModifiersToCombat, consumeNextCombatModifiers } from '../engine/runModifiers';
import { recordDungeonRunEnd } from '../engine/metaProgression';
import { MVP_FACTION } from '../config/mvp';
import {
  clearDungeonSaveSnapshot,
  createDungeonSaveSnapshot,
  getContextStateFromSave,
  loadDungeonSaveSnapshot,
  saveDungeonSaveSnapshot,
} from '../engine/saveCompatibility';

// ─── Context value ─────────────────────────────────────────────────────────────

export interface DungeonRunContextValue {
  runState: RunState | null;
  /** Active during 'draft' phase. */
  draftFaction: Faction | null;
  draftRound: number;       // 1-3
  draftOptions: CardDefinition[];
  draftPicks: CardInstance[];

  startNewRun: (faction: Faction, seed?: string, ascensionLevel?: AscensionLevel) => void;
  /** Pick a card from the current draft round. Advances round; auto-completes on round 3. */
  pickDraftCard: (card: CardDefinition) => void;
  /** Directly finalise the deck and move to 'map'. */
  completeDraft: (deck: CardInstance[]) => void;
  travelToNode: (nodeId: string) => void;
  addRelic: (relic: RelicDefinition) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => void;
  healPlayer: (amount: number) => void;
  damagePlayer: (amount: number) => void;
  increaseMaxHealth: (amount: number, heal?: boolean) => void;
  addCardToDeck: (card: CardInstance) => void;
  removeCardFromDeck: (instanceId: string) => void;
  upgradeCard: (instanceId: string) => void;
  addRunModifier: (modifier: RunModifierDefinition) => void;
  setCombatState: (state: CombatState | null) => void;
  advanceAct: () => void;
  endRun: (won: boolean) => void;
  /** Immediately abandon the current run and return to faction select. */
  resetRun: () => void;
  /** Return to the map from a non-combat node (rest/shop/reward/treasure). */
  returnToMap: () => void;

  // ── Potions ──────────────────────────────────────────────────────────
  /** Add a potion to the first empty inventory slot, or a specific slot if given.
   *  Caller must check if inventory is full (returns false in that case). */
  addPotion: (potion: PotionInstance, slotIndex?: number) => boolean;
  /** Drink the potion in `slotIndex` and clear the slot. No-op if empty / not in combat / not on player turn. */
  usePotion: (slotIndex: number, ctx?: PotionContext) => void;
  /** Discard the potion in `slotIndex` (used by the full-inventory pickup picker). */
  discardPotion: (slotIndex: number) => void;

  // ── Blessings ────────────────────────────────────────────────────────
  /** Apply an act-start blessing and route into the new act's map. No-op
   *  if not currently in the 'blessing' phase or the id is unknown. */
  applyBlessing: (blessingId: BlessingId) => void;
}

// ─── Reducer ───────────────────────────────────────────────────────────────────

interface ContextState {
  run: RunState | null;
  draftFaction: Faction | null;
  draftRound: number;
  draftOptions: CardDefinition[];
  draftPicks: CardInstance[];
  seed: string;
}

type Action =
  | { type: 'START_RUN'; faction: Faction; seed: string; ascensionLevel?: AscensionLevel }
  | { type: 'PICK_DRAFT'; card: CardDefinition }
  | { type: 'COMPLETE_DRAFT'; deck: CardInstance[] }
  | { type: 'TRAVEL_TO_NODE'; nodeId: string }
  | { type: 'ADD_RELIC'; relic: RelicDefinition }
  | { type: 'ADD_GOLD'; amount: number }
  | { type: 'SPEND_GOLD'; amount: number }
  | { type: 'HEAL_PLAYER'; amount: number }
  | { type: 'DAMAGE_PLAYER'; amount: number }
  | { type: 'INCREASE_MAX_HEALTH'; amount: number; heal?: boolean }
  | { type: 'ADD_CARD'; card: CardInstance }
  | { type: 'REMOVE_CARD'; instanceId: string }
  | { type: 'UPGRADE_CARD'; instanceId: string }
  | { type: 'ADD_RUN_MODIFIER'; modifier: RunModifierDefinition }
  | { type: 'SET_COMBAT'; state: CombatState | null }
  | { type: 'ADVANCE_ACT' }
  | { type: 'END_RUN'; won: boolean }
  | { type: 'RESET_RUN' }
  | { type: 'RETURN_TO_MAP' }
  | { type: 'ADD_POTION'; potion: PotionInstance; slotIndex?: number }
  | { type: 'DISCARD_POTION'; slotIndex: number }
  | { type: 'USE_POTION'; slotIndex: number; ctx?: PotionContext }
  | { type: 'APPLY_BLESSING'; blessingId: BlessingId };

const INITIAL: ContextState = {
  run: null,
  draftFaction: null,
  draftRound: 1,
  draftOptions: [],
  draftPicks: [],
  seed: '',
};

function makeRunState(faction: Faction, seed: string, ascensionLevel: AscensionLevel = 0): RunState {
  const mods = getAscensionMods(ascensionLevel);
  const baseHp = 72 - mods.startingHpPenalty;          // A5
  return {
    phase: 'draft',
    seed,
    currentAct: 1,
    actMaps: [
      generateActMap(1, seed, mods.extraEliteNodes),    // A2
      generateActMap(2, seed, mods.extraEliteNodes),
      generateActMap(3, seed, mods.extraEliteNodes),
    ],
    deck: getStarterCards(faction),
    hand: [],
    relics: [],
    gold: 99,
    maxHealth: baseHp,
    currentHealth: baseHp,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel,
    combatState: null,
    potions: [null, null, null],
    runModifiers: [],
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
  };
}

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function reducer(state: ContextState, action: Action): ContextState {
  switch (action.type) {
    // ── Start new run ─────────────────────────────────────────────────────────
    case 'START_RUN': {
      const ascension = action.ascensionLevel ?? 0;
      const run = makeRunState(action.faction, action.seed, ascension);
      const options = generateDraftOptions(1, run.deck, action.faction);
      logEvent('faction_picked', { faction: action.faction });
      logEvent('run_start', { faction: action.faction, seed: action.seed, ascensionLevel: ascension });
      return {
        run,
        draftFaction: action.faction,
        draftRound: 1,
        draftOptions: options,
        draftPicks: [],
        seed: action.seed,
      };
    }

    case 'RESET_RUN': {
      if (state.run) {
        logEvent('run_abandoned', {
          faction: state.draftFaction,
          currentAct: state.run.currentAct,
          phase: state.run.phase,
          totalCombats: state.run.runStats.totalCombats,
          deckSize: state.run.deck.length,
          relicCount: state.run.relics.length,
          currentHP: state.run.currentHealth,
          gold: state.run.gold,
        });
      }
      clearDungeonSaveSnapshot();
      return INITIAL;
    }

    // ── Pick a draft card ─────────────────────────────────────────────────────
    case 'PICK_DRAFT': {
      if (!state.run) return state;
      const pick = createCardInstance(action.card);
      const newPicks = [...state.draftPicks, pick];

      if (state.draftRound >= 3) {
        // Final pick → complete draft inline
        return reducer(
          { ...state, draftPicks: newPicks },
          { type: 'COMPLETE_DRAFT', deck: [...state.run.deck, ...newPicks] },
        );
      }

      const nextRound = state.draftRound + 1;
      const combined = [...state.run.deck, ...newPicks];
      const options = generateDraftOptions(nextRound, combined, state.draftFaction ?? undefined);
      return { ...state, draftPicks: newPicks, draftRound: nextRound, draftOptions: options };
    }

    // ── Complete draft ────────────────────────────────────────────────────────
    case 'COMPLETE_DRAFT': {
      if (!state.run) return state;
      // After draft, route into the Act 1 blessing screen instead of
      // straight to the map (mirrors STS Neow's Bounty).
      return {
        ...state,
        run: { ...state.run, deck: action.deck, phase: 'blessing' },
        draftPicks: [],
      };
    }

    // ── Travel to map node ────────────────────────────────────────────────────
    case 'TRAVEL_TO_NODE': {
      if (!state.run) return state;
      let runForTransition = state.run;
      const actIdx = state.run.currentAct - 1;
      const currentMap = state.run.actMaps[actIdx];
      const node = currentMap.nodes.find((n) => n.id === action.nodeId);
      if (!node) return state;

      const updatedMap = visitNode(currentMap, action.nodeId);
      const actMaps = state.run.actMaps.map((m, i) => (i === actIdx ? updatedMap : m));

      const nodePhaseMap: Record<string, RunPhase> = {
        combat: 'combat',
        elite: 'elite_combat',
        boss: 'boss_combat',
        rest: 'rest',
        shop: 'shop',
        treasure: 'reward',
        event: 'event',
      };
      const phase: RunPhase = nodePhaseMap[node.type] ?? 'map';

      let combatState: CombatState | null = null;

      if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
        let enemy;
        if (node.type === 'boss') {
          enemy = getBossByAct(state.run.currentAct);
        } else if (node.type === 'elite') {
          enemy = pickRandom(getElitesByAct(state.run.currentAct));
        } else {
          enemy = pickRandom(getEnemiesByAct(state.run.currentAct));
        }

        if (enemy) {
          const mods = getAscensionMods(state.run.ascensionLevel);
          combatState = initCombat(
            state.run.deck,
            state.run.currentHealth,
            state.run.maxHealth,
            state.run.relics,
            enemy,
            state.draftFaction ?? MVP_FACTION,
            {
              enemyHpMul:     mods.enemyHpMul,
              enemyDamageMul: mods.enemyDamageMul,
              bossStrength:   mods.bossStrength,
              drawPerTurn:    mods.drawPerTurn,
            },
          );
          combatState = applyRunModifiersToCombat(combatState, runForTransition.runModifiers ?? []);
          runForTransition = consumeNextCombatModifiers(runForTransition);
          combatState = applyRelicsToCombat('combat_start', state.run.relics, combatState, {
            combatIndex: state.run.runStats.totalCombats,
          });
          logEvent('combat_start', {
            faction: state.draftFaction,
            act: state.run.currentAct,
            nodeType: node.type,
            enemyId: enemy.id,
            enemyName: enemy.name,
            playerHP: state.run.currentHealth,
            playerMaxHP: state.run.maxHealth,
            relicCount: state.run.relics.length,
          });
        }
      } else if (node.type === 'shop') {
        logEvent('shop_visited', { faction: state.draftFaction, act: state.run.currentAct });
      } else if (node.type === 'rest') {
        logEvent('rest_used', { faction: state.draftFaction, act: state.run.currentAct });
      } else if (node.type === 'event') {
        const event = pickEventForNode(state.run.currentAct, state.run.seed ?? state.seed, node.id);
        logEvent('event_visited', { faction: state.draftFaction, act: state.run.currentAct, eventId: event.id });
      }

      return {
        ...state,
        run: { ...runForTransition, phase, actMaps, combatState },
      };
    }

    // ── Relic / resource mutations ────────────────────────────────────────────
    case 'ADD_RELIC': {
      if (!state.run) return state;
      logEvent('relic_picked', {
        faction: state.draftFaction,
        relicId: action.relic.id,
        relicName: action.relic.name,
        relicRarity: action.relic.rarity,
      });
      return { ...state, run: { ...state.run, relics: [...state.run.relics, action.relic] } };
    }
    case 'ADD_GOLD': {
      if (!state.run) return state;
      return { ...state, run: { ...state.run, gold: state.run.gold + action.amount } };
    }
    case 'SPEND_GOLD': {
      if (!state.run) return state;
      return { ...state, run: { ...state.run, gold: Math.max(0, state.run.gold - action.amount) } };
    }
    case 'HEAL_PLAYER': {
      if (!state.run) return state;
      return {
        ...state,
        run: {
          ...state.run,
          currentHealth: Math.min(state.run.currentHealth + action.amount, state.run.maxHealth),
        },
      };
    }
    case 'DAMAGE_PLAYER': {
      if (!state.run) return state;
      return {
        ...state,
        run: {
          ...state.run,
          currentHealth: Math.max(0, state.run.currentHealth - action.amount),
        },
      };
    }
    case 'INCREASE_MAX_HEALTH': {
      if (!state.run) return state;
      const nextMax = Math.max(1, state.run.maxHealth + action.amount);
      const healAmount = action.heal === false ? 0 : Math.max(0, action.amount);
      return {
        ...state,
        run: {
          ...state.run,
          maxHealth: nextMax,
          currentHealth: Math.min(nextMax, state.run.currentHealth + healAmount),
        },
      };
    }

    // ── Deck mutations ────────────────────────────────────────────────────────
    case 'ADD_CARD': {
      if (!state.run) return state;
      logEvent('card_picked', {
        faction: state.draftFaction,
        cardId: action.card.id,
        cardName: action.card.name,
        rarity: action.card.rarity,
        complexityTier: action.card.complexityTier,
      });
      return { ...state, run: { ...state.run, deck: [...state.run.deck, action.card] } };
    }
    case 'REMOVE_CARD': {
      if (!state.run) return state;
      return {
        ...state,
        run: {
          ...state.run,
          deck: state.run.deck.filter((c) => c.instanceId !== action.instanceId),
        },
      };
    }
    case 'UPGRADE_CARD': {
      if (!state.run) return state;
      return {
        ...state,
        run: {
          ...state.run,
          deck: state.run.deck.map((c) =>
            c.instanceId === action.instanceId ? { ...c, upgraded: true } : c,
          ),
        },
      };
    }
    case 'ADD_RUN_MODIFIER': {
      if (!state.run) return state;
      logEvent('event_choice', {
        faction: state.draftFaction,
        kind: 'run_modifier',
        modifierId: action.modifier.id,
      });
      return {
        ...state,
        run: {
          ...state.run,
          runModifiers: [...(state.run.runModifiers ?? []), action.modifier],
        },
      };
    }

    // ── Combat state update ───────────────────────────────────────────────────
    case 'SET_COMBAT': {
      if (!state.run) return state;
      const cs = action.state;

      if (!cs) {
        return { ...state, run: { ...state.run, combatState: null } };
      }

      if (cs.phase === 'combat_end_loss') {
        return {
          ...state,
          run: {
            ...state.run,
            currentHealth: 0,
            combatState: null,
            phase: 'run_end_loss',
          },
        };
      }

      if (cs.phase === 'combat_end_win') {
        const isBoss = state.run.phase === 'boss_combat';
        const isElite = state.run.phase === 'elite_combat';

        // Apply combat-end relic effects (heal, gold)
        let updatedRun = applyRelicsToRun('combat_end', state.run.relics, state.run);

        // Sync health from combat outcome
        updatedRun = {
          ...updatedRun,
          currentHealth: cs.playerHealth,
          maxHealth: cs.playerMaxHealth,
          combatState: null,
          runStats: {
            ...updatedRun.runStats,
            totalCombats: updatedRun.runStats.totalCombats + 1,
            elitesDefeated: updatedRun.runStats.elitesDefeated + (isElite ? 1 : 0),
            bossesDefeated: updatedRun.runStats.bossesDefeated + (isBoss ? 1 : 0),
          },
        };

        // Determine next phase
        if (isBoss && updatedRun.currentAct === 3) {
          updatedRun = { ...updatedRun, phase: 'run_end_win' };
        } else {
          updatedRun = { ...updatedRun, phase: 'reward' };
        }

        return { ...state, run: updatedRun };
      }

      // Mid-combat update — sync health into run state too
      return {
        ...state,
        run: {
          ...state.run,
          combatState: cs,
          currentHealth: cs.playerHealth,
        },
      };
    }

    // ── Potion inventory ──────────────────────────────────────────────────────
    case 'ADD_POTION': {
      if (!state.run) return state;
      const slots = [...state.run.potions];
      const target = action.slotIndex ?? slots.findIndex((p) => p === null);
      if (target < 0 || target > 2) return state; // inventory full and no slot specified
      slots[target] = action.potion;
      logEvent('potion_picked', {
        faction: state.draftFaction,
        potionId: action.potion.definitionId,
      });
      return { ...state, run: { ...state.run, potions: slots } };
    }
    case 'DISCARD_POTION': {
      if (!state.run) return state;
      if (action.slotIndex < 0 || action.slotIndex > 2) return state;
      const slots = [...state.run.potions];
      slots[action.slotIndex] = null;
      return { ...state, run: { ...state.run, potions: slots } };
    }
    case 'USE_POTION': {
      if (!state.run) return state;
      const cs = state.run.combatState;
      if (!cs) return state;                // no combat → can't drink
      if (cs.phase !== 'player_turn') return state;
      if (action.slotIndex < 0 || action.slotIndex > 2) return state;

      const potion = state.run.potions[action.slotIndex];
      if (!potion) return state;            // slot empty

      const result = applyPotion(cs, potion.definitionId, action.ctx);
      if (!result.ok) return state;         // unknown potion id

      const slots = [...state.run.potions];
      slots[action.slotIndex] = null;
      return {
        ...state,
        run: {
          ...state.run,
          potions: slots,
          combatState: result.state,
        },
      };
    }

    // ── Act-start blessing ────────────────────────────────────────────────────
    case 'APPLY_BLESSING': {
      if (!state.run) return state;
      if (state.run.phase !== 'blessing') return state;

      const blessing = BLESSING_POOL.find((b) => b.id === action.blessingId);
      if (!blessing) return state;

      const result = resolveBlessing(blessing, state.run);

      // Build the new deck if the blessing added a card. The reducer owns
      // instance creation so the helper stays pure.
      let newDeck = state.run.deck;
      if (result.pickedCard) {
        newDeck = [...newDeck, createCardInstance(result.pickedCard)];
      }

      logEvent('relic_picked', {
        // Re-uses the relic_picked event channel for now — blessings are
        // quasi-relics for analytics purposes (run-long pickup).
        kind: 'blessing',
        blessingId: blessing.id,
        act: state.run.currentAct,
      });

      const merged: RunState = {
        ...state.run,
        ...result.patch,
        deck: newDeck,
        phase: 'map',
      };

      return { ...state, run: merged };
    }

    // ── Advance act ───────────────────────────────────────────────────────────
    case 'ADVANCE_ACT': {
      if (!state.run) return state;
      const nextAct = Math.min(3, state.run.currentAct + 1) as 1 | 2 | 3;
      // STS-style act transition: full heal + new blessing screen before
      // entering the new act's map.
      return {
        ...state,
        run: {
          ...state.run,
          currentAct: nextAct,
          currentHealth: state.run.maxHealth,
          phase: 'blessing',
        },
      };
    }

    // ── End run ───────────────────────────────────────────────────────────────
    case 'END_RUN': {
      if (!state.run) return state;
      logEvent('run_end', {
        faction: state.draftFaction,
        victory: action.won,
        currentAct: state.run.currentAct,
        totalCombats: state.run.runStats.totalCombats,
        elitesDefeated: state.run.runStats.elitesDefeated,
        bossesDefeated: state.run.runStats.bossesDefeated,
        cardsPlayed: state.run.runStats.cardsPlayed,
        deckSize: state.run.deck.length,
        relicCount: state.run.relics.length,
        finalHP: state.run.currentHealth,
        gold: state.run.gold,
      });
      return {
        ...state,
        run: { ...state.run, phase: action.won ? 'run_end_win' : 'run_end_loss' },
      };
    }

    case 'RETURN_TO_MAP': {
      if (!state.run) return state;
      return { ...state, run: { ...state.run, phase: 'map' } };
    }

    default:
      return state;
  }
}

// ─── Context & Provider ────────────────────────────────────────────────────────

const DungeonRunContext = createContext<DungeonRunContextValue | null>(null);

// ── Save / hydrate ────────────────────────────────────────────────────────
// Versioned localStorage-based run persistence. Snapshots every state change
// and migrates older beta saves before hydration.

function hydrate(initial: ContextState): ContextState {
  const snapshot = loadDungeonSaveSnapshot();
  return snapshot ? getContextStateFromSave(snapshot) : initial;
}

function persist(state: ContextState): void {
  saveDungeonSaveSnapshot(createDungeonSaveSnapshot(state));
}

export function clearDungeonSave(): void {
  clearDungeonSaveSnapshot();
}

export const DungeonRunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [s, dispatch] = useReducer(reducer, INITIAL, hydrate);
  const recordedRunEndId = useRef<string | null>(null);

  // Persist on every state transition. cheap (~1KB per write); the buffer
  // of typical runs stays well under 50KB.
  useEffect(() => { persist(s); }, [s]);

  useEffect(() => {
    const run = s.run;
    if (!run || (run.phase !== 'run_end_win' && run.phase !== 'run_end_loss')) return;
    const won = run.phase === 'run_end_win';
    const recordKey = [
      run.seed ?? 'legacy',
      s.draftFaction ?? 'Unknown',
      run.ascensionLevel,
      won ? 'W' : 'L',
      run.currentAct,
      run.runStats.totalCombats,
      run.runStats.bossesDefeated,
      run.runStats.elitesDefeated,
    ].join(':');
    if (recordedRunEndId.current === recordKey) return;
    recordedRunEndId.current = recordKey;
    recordDungeonRunEnd(run, s.draftFaction, won);
  }, [s.run, s.draftFaction]);

  const startNewRun = useCallback((faction: Faction, seed?: string, ascensionLevel: AscensionLevel = 0) => {
    dispatch({
      type: 'START_RUN',
      faction,
      seed: seed ?? String(Date.now()),
      ascensionLevel,
    });
  }, []);

  const pickDraftCard = useCallback((card: CardDefinition) => {
    dispatch({ type: 'PICK_DRAFT', card });
  }, []);

  const completeDraft = useCallback((deck: CardInstance[]) => {
    dispatch({ type: 'COMPLETE_DRAFT', deck });
  }, []);

  const travelToNode = useCallback((nodeId: string) => {
    dispatch({ type: 'TRAVEL_TO_NODE', nodeId });
  }, []);

  const addRelic = useCallback((relic: RelicDefinition) => {
    dispatch({ type: 'ADD_RELIC', relic });
  }, []);

  const addGold = useCallback((amount: number) => {
    dispatch({ type: 'ADD_GOLD', amount });
  }, []);

  const spendGold = useCallback((amount: number) => {
    dispatch({ type: 'SPEND_GOLD', amount });
  }, []);

  const healPlayer = useCallback((amount: number) => {
    dispatch({ type: 'HEAL_PLAYER', amount });
  }, []);

  const damagePlayer = useCallback((amount: number) => {
    dispatch({ type: 'DAMAGE_PLAYER', amount });
  }, []);

  const increaseMaxHealth = useCallback((amount: number, heal = true) => {
    dispatch({ type: 'INCREASE_MAX_HEALTH', amount, heal });
  }, []);

  const addCardToDeck = useCallback((card: CardInstance) => {
    dispatch({ type: 'ADD_CARD', card });
  }, []);

  const removeCardFromDeck = useCallback((instanceId: string) => {
    dispatch({ type: 'REMOVE_CARD', instanceId });
  }, []);

  const upgradeCard = useCallback((instanceId: string) => {
    dispatch({ type: 'UPGRADE_CARD', instanceId });
  }, []);

  const addRunModifier = useCallback((modifier: RunModifierDefinition) => {
    dispatch({ type: 'ADD_RUN_MODIFIER', modifier });
  }, []);

  const setCombatState = useCallback((state: CombatState | null) => {
    dispatch({ type: 'SET_COMBAT', state });
  }, []);

  const advanceAct = useCallback(() => {
    dispatch({ type: 'ADVANCE_ACT' });
  }, []);

  const endRun = useCallback((won: boolean) => {
    dispatch({ type: 'END_RUN', won });
  }, []);

  const resetRun = useCallback(() => {
    dispatch({ type: 'RESET_RUN' });
  }, []);

  const returnToMap = useCallback(() => {
    dispatch({ type: 'RETURN_TO_MAP' });
  }, []);

  const addPotion = useCallback((potion: PotionInstance, slotIndex?: number) => {
    const slots = s.run?.potions ?? [];
    const empty = slots.findIndex((p) => p === null);
    if (slotIndex === undefined && empty === -1) return false; // inventory full
    dispatch({ type: 'ADD_POTION', potion, slotIndex });
    return true;
  }, [s.run?.potions]);

  const usePotion = useCallback((slotIndex: number, ctx?: PotionContext) => {
    dispatch({ type: 'USE_POTION', slotIndex, ctx });
  }, []);

  const discardPotion = useCallback((slotIndex: number) => {
    dispatch({ type: 'DISCARD_POTION', slotIndex });
  }, []);

  const applyBlessing = useCallback((blessingId: BlessingId) => {
    dispatch({ type: 'APPLY_BLESSING', blessingId });
  }, []);

  const value = useMemo<DungeonRunContextValue>(
    () => ({
      runState: s.run,
      draftFaction: s.draftFaction,
      draftRound: s.draftRound,
      draftOptions: s.draftOptions,
      draftPicks: s.draftPicks,
      startNewRun,
      pickDraftCard,
      completeDraft,
      travelToNode,
      addRelic,
      addGold,
      spendGold,
      healPlayer,
      damagePlayer,
      increaseMaxHealth,
      addCardToDeck,
      removeCardFromDeck,
      upgradeCard,
      addRunModifier,
      setCombatState,
      advanceAct,
      endRun,
      resetRun,
      returnToMap,
      addPotion,
      usePotion,
      discardPotion,
      applyBlessing,
    }),
    [
      s,
      startNewRun, pickDraftCard, completeDraft, travelToNode,
      addRelic, addGold, spendGold, healPlayer, damagePlayer, increaseMaxHealth,
      addCardToDeck, removeCardFromDeck, upgradeCard, addRunModifier, setCombatState,
      advanceAct, endRun, resetRun, returnToMap,
      addPotion, usePotion, discardPotion, applyBlessing,
    ],
  );

  return <DungeonRunContext.Provider value={value}>{children}</DungeonRunContext.Provider>;
};

export const useDungeonRun = (): DungeonRunContextValue => {
  const ctx = useContext(DungeonRunContext);
  if (!ctx) throw new Error('useDungeonRun must be used inside DungeonRunProvider');
  return ctx;
};

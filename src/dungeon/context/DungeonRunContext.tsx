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
  RunState,
} from '../types';
import type { BlessingId } from '../data/blessings';
import { recordDungeonRunEnd } from '../engine/metaProgression';
import { ensureNodeStates } from '../engine/nodeRewards';
import { INITIAL, reducer, type ContextState } from '../engine/runReducer';
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

  // ── Reward screen (claims are idempotent — guarded by persisted flags) ──
  takeRewardCard: (cardId: string) => void;
  skipRewardCard: () => void;
  takeRewardRelic: () => void;
  /** Take the offered potion. Pass slotIndex to overwrite a full slot; omit
   *  to use the first empty slot (no-op when full — open the swap picker). */
  takeRewardPotion: (slotIndex?: number) => void;
  skipRewardPotion: () => void;

  // ── Shop (atomic purchases: gold + item + sold flag in one dispatch) ──
  shopBuyCard: (cardId: string) => void;
  shopBuyRelic: (relicId: string) => void;
  shopBuyPotion: (index: number, slotIndex?: number) => void;
  shopRemoveCard: (instanceId: string) => void;

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

// ─── Context & Provider ────────────────────────────────────────────────────────

const DungeonRunContext = createContext<DungeonRunContextValue | null>(null);

// ── Save / hydrate ────────────────────────────────────────────────────────
// Versioned localStorage-based run persistence. Snapshots every state change
// and migrates older beta saves before hydration.

function hydrate(initial: ContextState): ContextState {
  const snapshot = loadDungeonSaveSnapshot();
  if (!snapshot) return initial;
  const state = getContextStateFromSave(snapshot);
  // Saves from builds before node-resolution state was persisted may land on
  // a reward/shop/blessing screen with no rolled offers — synthesize them.
  if (state.run) {
    return { ...state, run: ensureNodeStates(state.run, state.draftFaction ?? undefined) };
  }
  return state;
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

  const takeRewardCard = useCallback((cardId: string) => {
    dispatch({ type: 'REWARD_TAKE_CARD', cardId });
  }, []);

  const skipRewardCard = useCallback(() => {
    dispatch({ type: 'REWARD_SKIP_CARD' });
  }, []);

  const takeRewardRelic = useCallback(() => {
    dispatch({ type: 'REWARD_TAKE_RELIC' });
  }, []);

  const takeRewardPotion = useCallback((slotIndex?: number) => {
    dispatch({ type: 'REWARD_TAKE_POTION', slotIndex });
  }, []);

  const skipRewardPotion = useCallback(() => {
    dispatch({ type: 'REWARD_SKIP_POTION' });
  }, []);

  const shopBuyCard = useCallback((cardId: string) => {
    dispatch({ type: 'SHOP_BUY_CARD', cardId });
  }, []);

  const shopBuyRelic = useCallback((relicId: string) => {
    dispatch({ type: 'SHOP_BUY_RELIC', relicId });
  }, []);

  const shopBuyPotion = useCallback((index: number, slotIndex?: number) => {
    dispatch({ type: 'SHOP_BUY_POTION', index, slotIndex });
  }, []);

  const shopRemoveCard = useCallback((instanceId: string) => {
    dispatch({ type: 'SHOP_REMOVE_CARD', instanceId });
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
      takeRewardCard,
      skipRewardCard,
      takeRewardRelic,
      takeRewardPotion,
      skipRewardPotion,
      shopBuyCard,
      shopBuyRelic,
      shopBuyPotion,
      shopRemoveCard,
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
      takeRewardCard, skipRewardCard, takeRewardRelic, takeRewardPotion, skipRewardPotion,
      shopBuyCard, shopBuyRelic, shopBuyPotion, shopRemoveCard,
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

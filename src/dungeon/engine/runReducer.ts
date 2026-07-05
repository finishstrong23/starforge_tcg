/**
 * Run-state reducer for the dungeon mode.
 *
 * Extracted from DungeonRunContext so it is (a) testable without React and
 * (b) the single place where run state mutates. Every roll that affects the
 * run (rewards, shop stock, blessings, enemy selection, combat RNG seed) is
 * seeded from the run seed + node id and persisted, so a page refresh always
 * restores the exact same offers and claim state.
 */

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
import { generateActMap, visitNode } from './mapgen';
import { createCardInstance, generateDraftOptions, getStarterCards } from './draft';
import { initCombat } from './combat';
import { applyPotion, potionShopPrice } from '../data/potions';
import { BLESSING_POOL, applyBlessing as resolveBlessing, type BlessingId } from '../data/blessings';
import { applyRelicsToCombat, applyRelicsToRun } from './relicEffects';
import { logEvent } from './telemetry';
import { getAscensionMods } from './ascension';
import { pickEventForNode } from './eventSelection';
import { applyRunModifiersToCombat, consumeNextCombatModifiers } from './runModifiers';
import { MVP_FACTION } from '../config/mvp';
import { clearDungeonSaveSnapshot } from './saveCompatibility';
import { createSeededRng, hashSeed } from './seededRng';
import {
  REMOVAL_COST,
  REMOVALS_PER_SHOP,
  cardPrice,
  getCardDefById,
  getRelicById,
  relicPrice,
  rollBlessingOptionIds,
  rollRewardBundle,
  rollShopStock,
} from './nodeRewards';

// ─── State & actions ────────────────────────────────────────────────────────

export interface ContextState {
  run: RunState | null;
  draftFaction: Faction | null;
  draftRound: number;
  draftOptions: CardDefinition[];
  draftPicks: CardInstance[];
  seed: string;
}

export type Action =
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
  | { type: 'APPLY_BLESSING'; blessingId: BlessingId }
  // Reward-screen claims (idempotent — guarded by persisted claim flags)
  | { type: 'REWARD_TAKE_CARD'; cardId: string }
  | { type: 'REWARD_SKIP_CARD' }
  | { type: 'REWARD_TAKE_RELIC' }
  | { type: 'REWARD_TAKE_POTION'; slotIndex?: number }
  | { type: 'REWARD_SKIP_POTION' }
  // Shop purchases (atomic: spend gold + grant item + mark sold)
  | { type: 'SHOP_BUY_CARD'; cardId: string }
  | { type: 'SHOP_BUY_RELIC'; relicId: string }
  | { type: 'SHOP_BUY_POTION'; index: number; slotIndex?: number }
  | { type: 'SHOP_REMOVE_CARD'; instanceId: string };

export const INITIAL: ContextState = {
  run: null,
  draftFaction: null,
  draftRound: 1,
  draftOptions: [],
  draftPicks: [],
  seed: '',
};

export function makeRunState(faction: Faction, seed: string, ascensionLevel: AscensionLevel = 0): RunState {
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
    pendingReward: null,
    shopStock: null,
    blessingOptionIds: null,
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
  };
}

function pickWith<T>(rng: () => number, arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(rng() * arr.length)] : undefined;
}

/** First empty potion slot, honoring an explicit override. -1 = no slot. */
function resolvePotionSlot(potions: (PotionInstance | null)[], slotIndex?: number): number {
  if (slotIndex !== undefined) {
    return slotIndex >= 0 && slotIndex <= 2 ? slotIndex : -1;
  }
  return potions.findIndex((p) => p === null);
}

/**
 * Attach a relic to the run and apply its acquisition effect (the
 * 'run_start' trigger fires when the relic is picked up mid-run: Ironbark
 * Amulet's +8 Max HP, Overclocked Core's -5, Heartwake Echo's -10%).
 */
function acquireRelic(run: RunState, relic: RelicDefinition): RunState {
  const withRelic: RunState = { ...run, relics: [...run.relics, relic] };
  return applyRelicsToRun('run_start', [relic], withRelic);
}

export function reducer(state: ContextState, action: Action): ContextState {
  switch (action.type) {
    // ── Start new run ─────────────────────────────────────────────────────────
    case 'START_RUN': {
      const ascension = action.ascensionLevel ?? 0;
      const run = makeRunState(action.faction, action.seed, ascension);
      const options = generateDraftOptions(
        1, run.deck, action.faction, createSeededRng(action.seed, 'draft', 1),
      );
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
      const options = generateDraftOptions(
        nextRound, combined, state.draftFaction ?? undefined,
        createSeededRng(state.seed, 'draft', nextRound),
      );
      return { ...state, draftPicks: newPicks, draftRound: nextRound, draftOptions: options };
    }

    // ── Complete draft ────────────────────────────────────────────────────────
    case 'COMPLETE_DRAFT': {
      if (!state.run) return state;
      // After draft, route into the Act 1 blessing screen instead of
      // straight to the map (mirrors STS Neow's Bounty).
      const run: RunState = { ...state.run, deck: action.deck, phase: 'blessing' };
      return {
        ...state,
        run: { ...run, blessingOptionIds: rollBlessingOptionIds(run, state.draftFaction ?? undefined) },
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
      const runSeed = state.run.seed ?? state.seed;

      let combatState: CombatState | null = null;
      let shopStock = state.run.shopStock ?? null;
      let pendingReward = state.run.pendingReward ?? null;
      let goldDelta = 0;

      if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
        let enemy;
        const enemyRng = createSeededRng(runSeed, 'enemy', state.run.currentAct, node.id);
        if (node.type === 'boss') {
          enemy = getBossByAct(state.run.currentAct);
        } else if (node.type === 'elite') {
          enemy = pickWith(enemyRng, getElitesByAct(state.run.currentAct));
        } else {
          enemy = pickWith(enemyRng, getEnemiesByAct(state.run.currentAct));
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
              rngSeed:        hashSeed(`${runSeed}:combatRng:${state.run.currentAct}:${node.id}`),
            },
          );
          combatState = applyRunModifiersToCombat(combatState, runForTransition.runModifiers ?? []);
          runForTransition = consumeNextCombatModifiers(runForTransition);
          combatState = applyRelicsToCombat('combat_start', state.run.relics, combatState, {
            combatIndex: state.run.runStats.totalCombats,
            // Seeded so combat_start relic effects (Stasis Cube's card pick,
            // Navigator's Bone reroll, ...) are reproducible per node.
            rng: createSeededRng(runSeed, 'relicfx', state.run.currentAct, node.id),
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
        shopStock = rollShopStock(
          { ...runForTransition, actMaps },
          node.id,
          state.draftFaction ?? undefined,
        );
        logEvent('shop_visited', { faction: state.draftFaction, act: state.run.currentAct });
      } else if (node.type === 'treasure') {
        // Treasure chest: rolled like a reward bundle (guaranteed relic) and
        // the gold is awarded atomically with this transition.
        pendingReward = rollRewardBundle({ ...runForTransition, actMaps }, {
          sourceNodeId: node.id,
          isElite: false,
          isBossReward: false,
          isTreasure: true,
          faction: state.draftFaction ?? undefined,
        });
        goldDelta = pendingReward.gold;
      } else if (node.type === 'rest') {
        logEvent('rest_used', { faction: state.draftFaction, act: state.run.currentAct });
      } else if (node.type === 'event') {
        const event = pickEventForNode(state.run.currentAct, runSeed, node.id);
        logEvent('event_visited', { faction: state.draftFaction, act: state.run.currentAct, eventId: event.id });
      }

      return {
        ...state,
        run: {
          ...runForTransition,
          phase,
          actMaps,
          combatState,
          shopStock,
          pendingReward,
          gold: runForTransition.gold + goldDelta,
        },
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
      return { ...state, run: acquireRelic(state.run, action.relic) };
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
      const nextHealth = Math.max(0, state.run.currentHealth - action.amount);
      // Non-combat damage (events) can kill: dropping to 0 ends the run
      // instead of stranding a 0-HP player on the map.
      if (nextHealth <= 0) {
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
      return {
        ...state,
        run: { ...state.run, currentHealth: nextHealth },
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

        // Sync health from combat outcome. Elite onDeath curses (e.g. Rift
        // Warden's Stored Rift) arrive as pendingRunModifiers on the final
        // combat state and attach to the run here.
        updatedRun = {
          ...updatedRun,
          currentHealth: cs.playerHealth,
          maxHealth: cs.playerMaxHealth,
          combatState: null,
          runModifiers: [
            ...(updatedRun.runModifiers ?? []),
            ...(cs.pendingRunModifiers ?? []),
          ],
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
          // Roll the reward bundle now and award its gold atomically with
          // this transition. The persisted bundle + claim flags make the
          // reward screen refresh-proof.
          const currentMap = updatedRun.actMaps[updatedRun.currentAct - 1];
          const bundle = rollRewardBundle(updatedRun, {
            sourceNodeId: currentMap?.currentNodeId ?? null,
            isElite,
            isBossReward: isBoss,
            isTreasure: false,
            faction: state.draftFaction ?? undefined,
          });
          updatedRun = {
            ...updatedRun,
            phase: 'reward',
            pendingReward: bundle,
            gold: updatedRun.gold + bundle.gold,
          };
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

    // ── Reward-screen claims ──────────────────────────────────────────────────
    case 'REWARD_TAKE_CARD': {
      if (!state.run) return state;
      const pr = state.run.pendingReward;
      if (!pr || pr.cardResolved || !pr.cardOptionIds.includes(action.cardId)) return state;
      const def = getCardDefById(action.cardId);
      if (!def) return state;
      logEvent('card_picked', {
        faction: state.draftFaction,
        cardId: def.id,
        cardName: def.name,
        rarity: def.rarity,
        complexityTier: def.complexityTier,
      });
      return {
        ...state,
        run: {
          ...state.run,
          deck: [...state.run.deck, createCardInstance(def)],
          pendingReward: { ...pr, cardResolved: true },
        },
      };
    }
    case 'REWARD_SKIP_CARD': {
      if (!state.run) return state;
      const pr = state.run.pendingReward;
      if (!pr || pr.cardResolved) return state;
      return { ...state, run: { ...state.run, pendingReward: { ...pr, cardResolved: true } } };
    }
    case 'REWARD_TAKE_RELIC': {
      if (!state.run) return state;
      const pr = state.run.pendingReward;
      if (!pr || !pr.relicId || pr.relicTaken) return state;
      const relic = getRelicById(pr.relicId);
      if (!relic) return state;
      logEvent('relic_picked', {
        faction: state.draftFaction,
        relicId: relic.id,
        relicName: relic.name,
        relicRarity: relic.rarity,
      });
      return {
        ...state,
        run: {
          ...acquireRelic(state.run, relic),
          pendingReward: { ...pr, relicTaken: true },
        },
      };
    }
    case 'REWARD_TAKE_POTION': {
      if (!state.run) return state;
      const pr = state.run.pendingReward;
      if (!pr || !pr.potion || pr.potionResolved) return state;
      const slot = resolvePotionSlot(state.run.potions, action.slotIndex);
      if (slot === -1) return state; // full and no swap slot chosen — UI opens the picker
      const slots = [...state.run.potions];
      slots[slot] = pr.potion;
      logEvent('potion_picked', { faction: state.draftFaction, potionId: pr.potion.definitionId });
      return {
        ...state,
        run: {
          ...state.run,
          potions: slots,
          pendingReward: { ...pr, potionResolved: true },
        },
      };
    }
    case 'REWARD_SKIP_POTION': {
      if (!state.run) return state;
      const pr = state.run.pendingReward;
      if (!pr || pr.potionResolved) return state;
      return { ...state, run: { ...state.run, pendingReward: { ...pr, potionResolved: true } } };
    }

    // ── Shop purchases ────────────────────────────────────────────────────────
    case 'SHOP_BUY_CARD': {
      if (!state.run) return state;
      const stock = state.run.shopStock;
      if (!stock || !stock.cardIds.includes(action.cardId) || stock.soldCardIds.includes(action.cardId)) return state;
      const def = getCardDefById(action.cardId);
      if (!def) return state;
      const mods = getAscensionMods(state.run.ascensionLevel);
      const price = Math.ceil(cardPrice(def) * mods.shopPriceMul);
      if (state.run.gold < price) return state;
      logEvent('card_picked', {
        faction: state.draftFaction,
        cardId: def.id,
        cardName: def.name,
        rarity: def.rarity,
        complexityTier: def.complexityTier,
      });
      return {
        ...state,
        run: {
          ...state.run,
          gold: state.run.gold - price,
          deck: [...state.run.deck, createCardInstance(def)],
          shopStock: { ...stock, soldCardIds: [...stock.soldCardIds, action.cardId] },
        },
      };
    }
    case 'SHOP_BUY_RELIC': {
      if (!state.run) return state;
      const stock = state.run.shopStock;
      if (!stock || !stock.relicIds.includes(action.relicId) || stock.soldRelicIds.includes(action.relicId)) return state;
      const relic = getRelicById(action.relicId);
      if (!relic) return state;
      const mods = getAscensionMods(state.run.ascensionLevel);
      const price = Math.ceil(relicPrice(relic) * mods.shopPriceMul);
      if (state.run.gold < price) return state;
      logEvent('relic_picked', {
        faction: state.draftFaction,
        relicId: relic.id,
        relicName: relic.name,
        relicRarity: relic.rarity,
      });
      return {
        ...state,
        run: {
          ...acquireRelic({ ...state.run, gold: state.run.gold - price }, relic),
          shopStock: { ...stock, soldRelicIds: [...stock.soldRelicIds, action.relicId] },
        },
      };
    }
    case 'SHOP_BUY_POTION': {
      if (!state.run) return state;
      const stock = state.run.shopStock;
      if (!stock || stock.soldPotionIndexes.includes(action.index)) return state;
      const potion = stock.potions[action.index];
      if (!potion) return state;
      const mods = getAscensionMods(state.run.ascensionLevel);
      const price = Math.ceil(potionShopPrice(state.run.currentAct) * mods.shopPriceMul);
      if (state.run.gold < price) return state;
      const slot = resolvePotionSlot(state.run.potions, action.slotIndex);
      if (slot === -1) return state; // full and no swap slot chosen — UI opens the picker
      const slots = [...state.run.potions];
      slots[slot] = potion;
      logEvent('potion_picked', { faction: state.draftFaction, potionId: potion.definitionId });
      return {
        ...state,
        run: {
          ...state.run,
          gold: state.run.gold - price,
          potions: slots,
          shopStock: { ...stock, soldPotionIndexes: [...stock.soldPotionIndexes, action.index] },
        },
      };
    }
    case 'SHOP_REMOVE_CARD': {
      if (!state.run) return state;
      const stock = state.run.shopStock;
      if (!stock || stock.removalsUsed >= REMOVALS_PER_SHOP) return state;
      if (state.run.gold < REMOVAL_COST) return state;
      if (!state.run.deck.some((c) => c.instanceId === action.instanceId)) return state;
      return {
        ...state,
        run: {
          ...state.run,
          gold: state.run.gold - REMOVAL_COST,
          deck: state.run.deck.filter((c) => c.instanceId !== action.instanceId),
          shopStock: { ...stock, removalsUsed: stock.removalsUsed + 1 },
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

      // Only blessings actually offered on this screen can be applied.
      const offered = state.run.blessingOptionIds;
      if (offered && offered.length > 0 && !offered.includes(action.blessingId)) return state;

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
        blessingOptionIds: null,
      };

      return { ...state, run: merged };
    }

    // ── Advance act ───────────────────────────────────────────────────────────
    case 'ADVANCE_ACT': {
      if (!state.run) return state;
      const nextAct = Math.min(3, state.run.currentAct + 1) as 1 | 2 | 3;
      // STS-style act transition: full heal + new blessing screen before
      // entering the new act's map.
      const run: RunState = {
        ...state.run,
        currentAct: nextAct,
        currentHealth: state.run.maxHealth,
        phase: 'blessing',
        pendingReward: null,
        shopStock: null,
      };
      return {
        ...state,
        run: { ...run, blessingOptionIds: rollBlessingOptionIds(run, state.draftFaction ?? undefined) },
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
      return {
        ...state,
        run: { ...state.run, phase: 'map', pendingReward: null, shopStock: null },
      };
    }

    default:
      return state;
  }
}

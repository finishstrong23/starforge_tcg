/**
 * STARFORGE TCG - Co-op Dungeon Run State
 *
 * Manages co-op dungeon run progression, save/load, and phase transitions.
 * Two players share HP and gold, each with their own deck and relics.
 */

import { Race } from '../types/Race';
import type { DungeonBoss, DungeonRelic, CardBundle } from '../dungeon/DungeonData';
import type { CoopMap, MapNode, CoopEvent, CoopEventEffect, ShopItem } from './CoopDungeonData';
import {
  generateCoopMap,
  getCoopBoss,
  scaleCoopBossHP,
  getTeamSynergy,
  getRandomEvent,
  generateShopItems,
  getDungeonStarterDeck,
  COOP_RELICS,
} from './CoopDungeonData';
import type { TeamSynergy } from '../tagteam/TagTeamData';

// ─── STATE TYPES ────────────────────────────────────────────────────────────

export type CoopPhase =
  | 'lobby'
  | 'map'
  | 'pre_combat'
  | 'combat'
  | 'reward'
  | 'event'
  | 'shop'
  | 'rest'
  | 'boss_intro'
  | 'victory'
  | 'defeat';

export interface CoopPlayerState {
  id: string;
  name: string;
  race: Race;
  deck: string[];
  ready: boolean;
}

export interface CoopRunState {
  /** Phase of the run */
  phase: CoopPhase;
  /** Both players */
  players: [CoopPlayerState, CoopPlayerState];
  /** Shared HP */
  sharedHP: number;
  /** Max shared HP */
  maxHP: number;
  /** Shared gold */
  gold: number;
  /** Current act (1-3) */
  act: number;
  /** Maps for each act */
  maps: CoopMap[];
  /** Current node ID on the map */
  currentNodeId: string;
  /** Shared relics */
  relics: DungeonRelic[];
  /** Current boss (for combat phase) */
  currentBoss: DungeonBoss | null;
  /** Scaled boss HP */
  currentBossHP: number;
  /** Current event (for event phase) */
  currentEvent: CoopEvent | null;
  /** Shop items (for shop phase) */
  shopItems: ShopItem[];
  /** Team synergy bonus */
  synergy: TeamSynergy | null;
  /** Visited event IDs (to avoid repeats) */
  visitedEventIds: string[];
  /** Bosses defeated count */
  bossesDefeated: number;
  /** Run seed */
  seed: number;
  /** Timestamp */
  startedAt: number;
  /** Is the run still active */
  isActive: boolean;
  /** Card bundles already chosen */
  chosenBundleIds: string[];
}

// ─── CREATE RUN ─────────────────────────────────────────────────────────────

export function createCoopRun(
  player1: { id: string; name: string; race: Race },
  player2: { id: string; name: string; race: Race },
): CoopRunState {
  const seed = Date.now();

  const maps = [
    generateCoopMap(1, seed),
    generateCoopMap(2, seed),
    generateCoopMap(3, seed),
  ];

  const synergy = getTeamSynergy(player1.race, player2.race);

  return {
    phase: 'map',
    players: [
      {
        id: player1.id,
        name: player1.name,
        race: player1.race,
        deck: getDungeonStarterDeck(player1.race),
        ready: false,
      },
      {
        id: player2.id,
        name: player2.name,
        race: player2.race,
        deck: getDungeonStarterDeck(player2.race),
        ready: false,
      },
    ],
    sharedHP: 40,
    maxHP: 40,
    gold: 20,
    act: 1,
    maps,
    currentNodeId: maps[0].startNodeId,
    relics: [],
    currentBoss: null,
    currentBossHP: 0,
    currentEvent: null,
    shopItems: [],
    synergy,
    visitedEventIds: [],
    bossesDefeated: 0,
    seed,
    startedAt: seed,
    isActive: true,
    chosenBundleIds: [],
  };
}

// ─── NODE NAVIGATION ────────────────────────────────────────────────────────

export function getCurrentMap(state: CoopRunState): CoopMap {
  return state.maps[state.act - 1];
}

export function getCurrentNode(state: CoopRunState): MapNode | null {
  const map = getCurrentMap(state);
  return map.nodes.find(n => n.id === state.currentNodeId) || null;
}

export function getAvailableNodes(state: CoopRunState): MapNode[] {
  const node = getCurrentNode(state);
  if (!node) return [];
  const map = getCurrentMap(state);
  return node.connections
    .map(id => map.nodes.find(n => n.id === id))
    .filter((n): n is MapNode => n != null);
}

export function selectNode(state: CoopRunState, nodeId: string): CoopRunState {
  const map = getCurrentMap(state);
  const node = map.nodes.find(n => n.id === nodeId);
  if (!node) return state;

  // Mark as visited
  node.visited = true;

  const updated = { ...state, currentNodeId: nodeId };

  switch (node.type) {
    case 'COMBAT':
    case 'ELITE': {
      const boss = getCoopBoss(
        node.type === 'ELITE' ? state.act + 1 : state.act,
        state.seed + state.bossesDefeated,
      );
      return {
        ...updated,
        phase: 'pre_combat',
        currentBoss: boss,
        currentBossHP: scaleCoopBossHP(boss, state.act),
      };
    }
    case 'BOSS': {
      const boss = getCoopBoss(state.act, state.seed + 100 + state.act);
      return {
        ...updated,
        phase: 'boss_intro',
        currentBoss: boss,
        currentBossHP: scaleCoopBossHP(boss, state.act) + 20, // Bosses get extra HP
      };
    }
    case 'EVENT': {
      const event = getRandomEvent(state.seed + state.visitedEventIds.length, state.visitedEventIds);
      return {
        ...updated,
        phase: 'event',
        currentEvent: event,
        visitedEventIds: [...state.visitedEventIds, event.id],
      };
    }
    case 'SHOP': {
      const items = generateShopItems(
        state.act,
        [state.players[0].race, state.players[1].race],
        state.relics.map(r => r.id),
        state.seed + state.bossesDefeated + 50,
      );
      return { ...updated, phase: 'shop', shopItems: items };
    }
    case 'REST':
      return { ...updated, phase: 'rest' };
    case 'TREASURE': {
      // Give gold + maybe a relic
      const goldReward = 15 + state.act * 5;
      return { ...updated, phase: 'reward', gold: state.gold + goldReward };
    }
    default:
      return updated;
  }
}

// ─── COMBAT RESOLUTION ──────────────────────────────────────────────────────

export function recordCombatResult(
  state: CoopRunState,
  won: boolean,
  teamHPRemaining: number,
): CoopRunState {
  if (!won) {
    return {
      ...state,
      phase: 'defeat',
      sharedHP: 0,
      isActive: false,
    };
  }

  const goldReward = 10 + state.act * 5;
  const newHP = Math.min(teamHPRemaining, state.maxHP);

  return {
    ...state,
    phase: 'reward',
    sharedHP: newHP,
    gold: state.gold + goldReward,
    bossesDefeated: state.bossesDefeated + 1,
    currentBoss: null,
  };
}

// ─── BOSS DEFEATED → NEXT ACT ──────────────────────────────────────────────

export function advanceAct(state: CoopRunState): CoopRunState {
  if (state.act >= 3) {
    return { ...state, phase: 'victory', isActive: false };
  }

  const nextAct = state.act + 1;
  const nextMap = state.maps[nextAct - 1];

  return {
    ...state,
    act: nextAct,
    currentNodeId: nextMap.startNodeId,
    phase: 'map',
  };
}

// ─── REWARD CHOICES ─────────────────────────────────────────────────────────

export function chooseBundle(
  state: CoopRunState,
  playerIndex: 0 | 1,
  bundle: CardBundle,
): CoopRunState {
  const players = [...state.players] as [CoopPlayerState, CoopPlayerState];
  players[playerIndex] = {
    ...players[playerIndex],
    deck: [...players[playerIndex].deck, ...bundle.cardIds],
  };
  return {
    ...state,
    players,
    chosenBundleIds: [...state.chosenBundleIds, bundle.id],
  };
}

export function chooseRelic(state: CoopRunState, relic: DungeonRelic): CoopRunState {
  return {
    ...state,
    relics: [...state.relics, relic],
  };
}

export function finishReward(state: CoopRunState): CoopRunState {
  const node = getCurrentNode(state);
  if (node?.type === 'BOSS') {
    return advanceAct(state);
  }
  return { ...state, phase: 'map' };
}

// ─── EVENT RESOLUTION ───────────────────────────────────────────────────────

export function applyEventEffect(state: CoopRunState, effect: CoopEventEffect): CoopRunState {
  switch (effect.type) {
    case 'heal':
      return { ...state, sharedHP: Math.min(state.sharedHP + effect.amount, state.maxHP) };
    case 'damage':
      return {
        ...state,
        sharedHP: Math.max(state.sharedHP - effect.amount, 0),
        ...(state.sharedHP - effect.amount <= 0 ? { phase: 'defeat' as const, isActive: false } : {}),
      };
    case 'gold':
      return { ...state, gold: Math.max(state.gold + effect.amount, 0) };
    case 'relic': {
      const relic = COOP_RELICS.find(r => r.id === effect.relicId);
      return relic ? { ...state, relics: [...state.relics, relic] } : state;
    }
    case 'max_hp':
      return { ...state, maxHP: state.maxHP + effect.amount, sharedHP: state.sharedHP + effect.amount };
    case 'upgrade_random_card':
    case 'remove_card':
    case 'draw_cards':
      // These are applied during gameplay, not state changes
      return state;
    case 'composite':
      return effect.effects.reduce((s, e) => applyEventEffect(s, e), state);
    default:
      return state;
  }
}

export function resolveEvent(state: CoopRunState, choiceIndex: number): CoopRunState {
  if (!state.currentEvent) return state;
  const choice = state.currentEvent.choices[choiceIndex];
  if (!choice) return state;

  const updated = applyEventEffect(state, choice.effect);
  return { ...updated, phase: updated.phase === 'defeat' ? 'defeat' : 'map', currentEvent: null };
}

// ─── SHOP ───────────────────────────────────────────────────────────────────

export function purchaseShopItem(
  state: CoopRunState,
  item: ShopItem,
  playerIndex?: 0 | 1,
): CoopRunState {
  if (state.gold < item.cost) return state;

  let updated = { ...state, gold: state.gold - item.cost };

  switch (item.type) {
    case 'card_bundle':
      if (item.bundleData && playerIndex != null) {
        updated = chooseBundle(updated, playerIndex, item.bundleData);
      }
      break;
    case 'relic':
      if (item.relicData) {
        updated = chooseRelic(updated, item.relicData);
      }
      break;
    case 'heal':
      updated.sharedHP = Math.min(updated.sharedHP + (item.healAmount || 10), updated.maxHP);
      break;
    case 'remove_card':
      // Handled by UI — player picks which card to remove
      break;
  }

  // Remove purchased item from shop
  updated.shopItems = updated.shopItems.filter(i => i.id !== item.id);
  return updated;
}

export function leaveShop(state: CoopRunState): CoopRunState {
  return { ...state, phase: 'map', shopItems: [] };
}

// ─── REST ───────────────────────────────────────────────────────────────────

export function rest(state: CoopRunState): CoopRunState {
  const healAmount = Math.round(state.maxHP * 0.25);
  return {
    ...state,
    phase: 'map',
    sharedHP: Math.min(state.sharedHP + healAmount, state.maxHP),
  };
}

// ─── PERSISTENCE ────────────────────────────────────────────────────────────

const COOP_STORAGE_KEY = 'starforge_coop_dungeon';

export function saveCoopRun(state: CoopRunState): void {
  try {
    localStorage.setItem(COOP_STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

export function loadCoopRun(): CoopRunState | null {
  try {
    const data = localStorage.getItem(COOP_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function deleteCoopRun(): void {
  localStorage.removeItem(COOP_STORAGE_KEY);
}

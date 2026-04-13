/**
 * STARFORGE TCG — Roguelite Run Manager
 *
 * Manages the full lifecycle of a roguelite dungeon run:
 * create → save → load → advance → transition acts → kill/victory
 *
 * Persists to localStorage. One active run at a time + history of 50.
 */

import { Race, LaunchFactions } from '../../types/Race';
import { generateCardInstanceId } from '../../utils/ids';
import { generateMap, getAccessibleNodes } from '../engine/mapgen';
import { getDungeonStarterDeck } from '../DungeonData';
import { serializeRunCard } from './CardSerializer';
import type {
  DungeonRunSave,
  RunPhase,
  MapNode,
  MapNodeType,
  RogueliteSaveData,
  CompletedRun,
  RewardOffer,
  BattleRecord,
  SerializedRunCard,
} from './types';

// ─── Constants ─────────────────────────────────────────────

const STORAGE_KEY = 'starforge_dungeon_v2';
const MAX_HISTORY = 50;
const STARTING_HP = 75;
const STARTING_GOLD = 100;

// ─── Run Creation ──────────────────────────────────────────

/**
 * Create a new roguelite dungeon run.
 */
export function createRun(race: Race, heroId: string): DungeonRunSave {
  const seed = generateSeed();
  const starterCardIds = getDungeonStarterDeck(race);
  const deck: SerializedRunCard[] = starterCardIds.map(id => serializeRunCard(id));

  // Generate the Act 1 map
  const rawMap = generateMap(seed, 1);
  const map = injectForgeNodes(rawMap, seed);

  return {
    version: 1,
    seed,
    race,
    heroId,
    deck,
    relics: [],
    gold: STARTING_GOLD,
    hp: STARTING_HP,
    maxHp: STARTING_HP,
    map,
    currentNodeId: null,
    act: 1,
    phase: 'MAP',
    battleLog: [],
    startedAt: Date.now(),
  };
}

/**
 * Generate a random seed string.
 */
function generateSeed(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Post-process a generated map to convert some nodes to FORGE type.
 * mapgen.ts doesn't know about FORGE, so we convert ~15% of mid-row nodes.
 */
function injectForgeNodes(map: MapNode[][], seed: string): MapNode[][] {
  // Simple deterministic selection based on node IDs
  for (const row of map) {
    for (const node of row) {
      // Only convert COMBAT or SHOP nodes in rows 2-7
      if (node.row < 2 || node.row > 7) continue;
      if (node.type !== 'COMBAT' && node.type !== 'SHOP') continue;

      // Hash the node ID for deterministic selection
      let hash = 0;
      const idStr = seed + node.id;
      for (let i = 0; i < idStr.length; i++) {
        hash = Math.imul(31, hash) + idStr.charCodeAt(i) | 0;
      }
      const roll = Math.abs(hash % 100);

      // ~12% chance to become a FORGE node
      if (roll < 12) {
        (node as any).type = 'FORGE' as MapNodeType;
      }
    }
  }

  return map;
}

// ─── Persistence ───────────────────────────────────────────

/**
 * Save the current run state to localStorage.
 */
export function saveRun(save: DungeonRunSave): void {
  try {
    const data = loadSaveData();
    data.active = save;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save roguelite run:', e);
  }
}

/**
 * Load the active run from localStorage.
 * Sanitizes transient phases (BATTLE) that can't be resumed after reload.
 */
export function loadRun(): DungeonRunSave | null {
  try {
    const data = loadSaveData();
    if (!data.active || data.active.version !== 1) return null;

    const run = data.active;

    // A battle in progress can't be resumed after page reload — send
    // the player back to the map so they can re-enter the node (or pick
    // a different one). Their HP/gold/deck state is preserved.
    if (run.phase === 'BATTLE') {
      run.phase = 'MAP';
      run.pendingRewards = undefined;
    }

    return run;
  } catch {
    return null;
  }
}

/**
 * End the current run (death or victory) and move to history.
 */
export function endRun(
  save: DungeonRunSave,
  result: 'VICTORY' | 'DEATH',
): void {
  const data = loadSaveData();

  const completed: CompletedRun = {
    seed: save.seed,
    race: save.race,
    heroId: save.heroId,
    result,
    act: save.act,
    battlesWon: save.battleLog.filter(b => b.won).length,
    relicsCollected: save.relics.length,
    upgradesApplied: save.deck.reduce((sum, c) => sum + c.upgrades.length, 0),
    duration: Date.now() - save.startedAt,
    completedAt: Date.now(),
  };

  data.history.unshift(completed);
  if (data.history.length > MAX_HISTORY) {
    data.history = data.history.slice(0, MAX_HISTORY);
  }

  data.active = null;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save roguelite history:', e);
  }
}

/**
 * Delete the active run without saving to history.
 */
export function abandonRun(): void {
  const data = loadSaveData();
  data.active = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to abandon roguelite run:', e);
  }
}

/**
 * Load completed run history.
 */
export function loadHistory(): CompletedRun[] {
  return loadSaveData().history;
}

/**
 * Load raw save data from localStorage.
 */
function loadSaveData(): RogueliteSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { active: null, history: [] };
    return JSON.parse(raw) as RogueliteSaveData;
  } catch {
    return { active: null, history: [] };
  }
}

// ─── Run State Mutations ───────────────────────────────────

/**
 * Advance to a selected map node. Updates accessibility and phase.
 */
export function advanceToNode(save: DungeonRunSave, nodeId: string): DungeonRunSave {
  // Mark the node as current
  save.currentNodeId = nodeId;

  // Find the node and determine the phase
  const node = findNode(save.map, nodeId);
  if (!node) return save;

  // Update phase based on node type
  const phaseMap: Record<MapNodeType, RunPhase> = {
    COMBAT: 'BATTLE',
    ELITE: 'BATTLE',
    BOSS: 'BATTLE',
    REST: 'REST',
    SHOP: 'SHOP',
    FORGE: 'FORGE',
    TREASURE: 'TREASURE',
  };

  save.phase = phaseMap[node.type] || 'MAP';

  return save;
}

/**
 * Mark the current node as completed and update accessibility.
 */
export function completeCurrentNode(save: DungeonRunSave): DungeonRunSave {
  if (!save.currentNodeId) return save;

  const node = findNode(save.map, save.currentNodeId);
  if (!node) return save;

  // Mark completed
  node.completed = true;

  // Update accessibility: connected nodes become accessible
  const accessible = getAccessibleNodes(save.map, save.currentNodeId);
  for (const connId of accessible) {
    const connNode = findNode(save.map, connId);
    if (connNode) {
      connNode.accessible = true;
    }
  }

  return save;
}

/**
 * Record a battle result and update HP.
 */
export function recordBattle(
  save: DungeonRunSave,
  record: BattleRecord,
): DungeonRunSave {
  save.battleLog.push(record);
  save.hp = Math.max(0, record.hpAfter);

  if (!record.won || save.hp <= 0) {
    save.phase = 'DEATH';
  } else {
    save.phase = 'REWARD';
  }

  return save;
}

/**
 * Apply damage to run HP (from elite encounters, traps, etc.)
 */
export function takeDamage(save: DungeonRunSave, amount: number): DungeonRunSave {
  save.hp = Math.max(0, save.hp - amount);
  if (save.hp <= 0) {
    save.phase = 'DEATH';
  }
  return save;
}

/**
 * Heal run HP (from rest sites, relics, etc.)
 */
export function healHp(save: DungeonRunSave, amount: number): DungeonRunSave {
  save.hp = Math.min(save.maxHp, save.hp + amount);
  return save;
}

/**
 * Add a card to the run deck.
 */
export function addCardToDeck(save: DungeonRunSave, definitionId: string): DungeonRunSave {
  save.deck.push(serializeRunCard(definitionId));
  return save;
}

/**
 * Remove a card from the run deck by runCardId.
 */
export function removeCardFromDeck(save: DungeonRunSave, runCardId: string): DungeonRunSave {
  save.deck = save.deck.filter(c => c.runCardId !== runCardId);
  return save;
}

/**
 * Add a relic to the run.
 */
export function addRelic(save: DungeonRunSave, relicId: string): DungeonRunSave {
  if (!save.relics.includes(relicId)) {
    save.relics.push(relicId);
  }
  return save;
}

/**
 * Spend gold. Returns false if insufficient.
 */
export function spendGold(save: DungeonRunSave, amount: number): boolean {
  if (save.gold < amount) return false;
  save.gold -= amount;
  return true;
}

/**
 * Earn gold.
 */
export function earnGold(save: DungeonRunSave, amount: number): DungeonRunSave {
  save.gold += amount;
  return save;
}

/**
 * Transition to the next act. Generates a new map and resets node position.
 */
export function transitionAct(save: DungeonRunSave): DungeonRunSave {
  if (save.act >= 3) {
    // Completed all 3 acts — victory!
    save.phase = 'VICTORY';
    return save;
  }

  const nextAct = (save.act + 1) as 1 | 2 | 3;
  save.act = nextAct;
  save.map = injectForgeNodes(generateMap(save.seed, nextAct), save.seed);
  save.currentNodeId = null;
  save.phase = 'ACT_TRANSITION';

  return save;
}

/**
 * Return to map after completing a node interaction.
 */
export function returnToMap(save: DungeonRunSave): DungeonRunSave {
  // Check if the current node is the boss (row 9)
  if (save.currentNodeId) {
    const node = findNode(save.map, save.currentNodeId);
    if (node && node.type === 'BOSS') {
      return transitionAct(save);
    }
  }

  save.phase = 'MAP';
  return save;
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Find a node by ID in the map.
 */
export function findNode(map: MapNode[][], nodeId: string): MapNode | undefined {
  for (const row of map) {
    for (const node of row) {
      if (node.id === nodeId) return node;
    }
  }
  return undefined;
}

/**
 * Get all accessible (unvisited, connected) nodes from current position.
 */
export function getNextNodes(save: DungeonRunSave): MapNode[] {
  if (!save.currentNodeId) {
    // Start of act — return row 0 nodes
    return save.map[0] || [];
  }

  const accessible = getAccessibleNodes(save.map, save.currentNodeId);
  return accessible
    .map(id => findNode(save.map, id))
    .filter((n): n is MapNode => n !== undefined && !n.completed);
}

/**
 * Get the races available for run selection.
 */
export function getAvailableRaces(): Race[] {
  return LaunchFactions;
}

/**
 * Calculate gold reward for a battle based on act and node type.
 */
export function calculateGoldReward(act: 1 | 2 | 3, nodeType: MapNodeType): number {
  const base: Record<MapNodeType, number> = {
    COMBAT: 15,
    ELITE: 30,
    BOSS: 50,
    REST: 0,
    SHOP: 0,
    FORGE: 0,
    TREASURE: 20,
  };

  const actMultiplier = [1, 1.3, 1.6][act - 1];
  const goldBase = base[nodeType] || 15;
  const variance = Math.floor(Math.random() * 10) - 5; // -5 to +5

  return Math.max(0, Math.round(goldBase * actMultiplier + variance));
}

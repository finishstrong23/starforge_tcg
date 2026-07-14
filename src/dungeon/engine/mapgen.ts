import type { ActMap, MapNode, NodeType } from '../types';
import { hashSeed, mulberry32 } from './seededRng';

// ─── Topology ─────────────────────────────────────────────────────────────────
// Each act offers FOUR parallel rails into one shared boss. A rail is a fixed
// chain of 9 rooms (rows 0–8) + the boss (row 9): picking a rail's first room
// commits the player to that rail — there are no cross edges.
//
// Every rail in an act carries the SAME room multiset in a different seeded
// order, so all routes are exactly equal in fights, elites, and rewards — the
// choice is sequencing (shop before or after the elite? rest early or late?),
// never quantity. This replaced the branching 3-lane map whose worst-case
// routes could reach the boss with a single fight and no elite.
//
// Rail shape:
//   row 0      combat opener (warm-up, always)
//   rows 1–7   the act's middle multiset, shuffled per rail; elites are
//              confined to the middle window (rows 3–6) so they always land
//              mid-act, jittered per rail
//   row 8      rest (the guaranteed pre-boss breather)
//   row 9      shared boss

const RAILS = 4;
const MIDDLE_ROWS = [1, 2, 3, 4, 5, 6, 7];
const REST_ROW = 8;
const BOSS_ROW = 9;

/** Elites may only occupy these rows ("towards the middle"). */
const ELITE_MIN_ROW = 3;
const ELITE_MAX_ROW = 6;

type MiddleType = Exclude<NodeType, 'boss'>;

/** Per-act middle multiset (rows 1–7, identical on every rail). */
const ACT_MIDDLE: Record<1 | 2 | 3, MiddleType[]> = {
  1: ['combat', 'combat', 'elite', 'rest', 'shop', 'event', 'treasure'],
  2: ['combat', 'combat', 'combat', 'elite', 'shop', 'event', 'treasure'],
  3: ['combat', 'combat', 'elite', 'elite', 'shop', 'event', 'treasure'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function nodeId(row: number, col: number): string {
  return `n-${row}-${col}`;
}

/** Row occupied by the middle slot at index i (rows 1–7). */
function rowOfIndex(i: number): number {
  return MIDDLE_ROWS[0] + i;
}

/**
 * A rail ordering is valid when every elite sits inside the middle window,
 * and (when there are exactly two) they aren't back-to-back.
 */
function elitesValid(order: MiddleType[]): boolean {
  const eliteRows = order
    .map((t, i) => (t === 'elite' ? rowOfIndex(i) : -1))
    .filter((r) => r !== -1);
  if (eliteRows.some((r) => r < ELITE_MIN_ROW || r > ELITE_MAX_ROW)) return false;
  if (eliteRows.length === 2 && Math.abs(eliteRows[0] - eliteRows[1]) < 2) return false;
  return true;
}

/**
 * Deterministic fallback if the seeded shuffle keeps failing: swap elites
 * into legal window slots (spread across the window when there are two).
 */
function forceElitesIntoWindow(order: MiddleType[]): MiddleType[] {
  const out = order.slice();
  const eliteIdx = out.map((t, i) => (t === 'elite' ? i : -1)).filter((i) => i !== -1);
  // Preferred window slots, spread out: rows 3, 5, 6, 4 → indices 2, 4, 5, 3.
  const targets = [2, 4, 5, 3];
  eliteIdx.forEach((from, n) => {
    const to = targets[n % targets.length];
    if (from === to) return;
    [out[from], out[to]] = [out[to], out[from]];
  });
  return out;
}

// ─── Map generation ───────────────────────────────────────────────────────────

export function generateActMap(actNumber: 1 | 2 | 3, seed: string, extraElites = 0): ActMap {
  const rng = mulberry32(hashSeed(`${seed}-act${actNumber}`));

  // The shared multiset. Ascension A2+ converts combats into elites on EVERY
  // rail equally, so routes stay identical in difficulty.
  const multiset: MiddleType[] = [...ACT_MIDDLE[actNumber]];
  for (let i = 0; i < extraElites; i++) {
    const ci = multiset.indexOf('combat');
    if (ci === -1) break;
    multiset[ci] = 'elite';
  }

  const nodes: MapNode[] = [];
  const bossId = nodeId(BOSS_ROW, 1);

  for (let rail = 0; rail < RAILS; rail++) {
    // Order the middle rooms; elites must land in the middle window.
    let order = shuffle(multiset, rng);
    let guard = 0;
    while (!elitesValid(order) && guard++ < 40) {
      order = shuffle(multiset, rng);
    }
    if (!elitesValid(order)) order = forceElitesIntoWindow(order);

    const railRooms: MapNode[] = [];

    // Row 0: combat opener.
    railRooms.push({
      id: nodeId(0, rail), row: 0, col: rail, type: 'combat', visited: false, connections: [],
    });

    // Rows 1–7: the shuffled middle.
    order.forEach((type, i) => {
      railRooms.push({
        id: nodeId(rowOfIndex(i), rail), row: rowOfIndex(i), col: rail, type, visited: false, connections: [],
      });
    });

    // Row 8: guaranteed pre-boss rest.
    railRooms.push({
      id: nodeId(REST_ROW, rail), row: REST_ROW, col: rail, type: 'rest', visited: false, connections: [],
    });

    // Chain the rail: each room leads only to the next; the rest leads to the boss.
    for (let i = 0; i < railRooms.length - 1; i++) {
      railRooms[i].connections.push(railRooms[i + 1].id);
    }
    railRooms[railRooms.length - 1].connections.push(bossId);

    nodes.push(...railRooms);
  }

  // Row 9: single shared boss.
  nodes.push({
    id: bossId, row: BOSS_ROW, col: 1, type: 'boss', visited: false, connections: [],
  });

  return {
    actNumber,
    nodes,
    currentNodeId: null, // player picks one of the four rail openers
    completed: false,
  };
}

// ─── Traversal helpers ────────────────────────────────────────────────────────

export function getAvailableNodes(map: ActMap, currentNodeId: string | null): MapNode[] {
  // Before entering the map, the rail openers (row 0) are the available picks.
  if (!currentNodeId) {
    return map.nodes.filter((n) => n.row === 0);
  }
  const current = map.nodes.find((n) => n.id === currentNodeId);
  if (!current) return [];
  return current.connections
    .map((id) => map.nodes.find((n) => n.id === id))
    .filter((n): n is MapNode => n !== undefined);
}

export function visitNode(map: ActMap, nodeId: string): ActMap {
  const target = map.nodes.find((n) => n.id === nodeId);
  if (!target) return map;

  const completed = target.type === 'boss';

  return {
    ...map,
    currentNodeId: nodeId,
    completed,
    nodes: map.nodes.map((n) =>
      n.id === nodeId ? { ...n, visited: true } : n,
    ),
  };
}

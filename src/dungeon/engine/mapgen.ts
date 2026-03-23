/**
 * STARFORGE TCG — Dungeon Map Generation
 * Slay the Spire-style procedural map with seeded randomness.
 */

import type { MapNode, MapNodeType } from '../types';

// ─── Seeded PRNG (mulberry32) ──────────────────────────────

function createSeededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h |= 0; h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Node Type Distribution ────────────────────────────────

type NodeWeights = Record<MapNodeType, number>;

const ACT_WEIGHTS: Record<1 | 2 | 3, NodeWeights> = {
  1: { COMBAT: 0.45, ELITE: 0.10, REST: 0.20, SHOP: 0.15, TREASURE: 0.10, BOSS: 0 },
  2: { COMBAT: 0.35, ELITE: 0.20, REST: 0.20, SHOP: 0.15, TREASURE: 0.10, BOSS: 0 },
  3: { COMBAT: 0.30, ELITE: 0.25, REST: 0.15, SHOP: 0.15, TREASURE: 0.15, BOSS: 0 },
};

function pickNodeType(rand: () => number, act: 1 | 2 | 3): MapNodeType {
  const weights = ACT_WEIGHTS[act];
  const roll = rand();
  let cumulative = 0;
  for (const type of ['COMBAT', 'ELITE', 'REST', 'SHOP', 'TREASURE'] as MapNodeType[]) {
    cumulative += weights[type];
    if (roll < cumulative) return type;
  }
  return 'COMBAT';
}

// ─── Helpers ───────────────────────────────────────────────

function nodeId(act: number, row: number, col: number): string {
  return `act${act}_r${row}_c${col}`;
}

/** Pick a random integer in [min, max] inclusive. */
function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

// ─── Map Generation ────────────────────────────────────────

/**
 * Generate a single act's map (10 rows, 3-4 columns per row).
 * Returns a 2D array indexed by [row][column-index].
 */
export function generateMap(seed: string, act: 1 | 2 | 3): MapNode[][] {
  const rand = createSeededRandom(`${seed}_act${act}`);

  // Step 1: Determine column count per row and create nodes
  const map: MapNode[][] = [];
  const colCounts: number[] = [];

  for (let row = 0; row < 10; row++) {
    let numCols: number;
    if (row === 0) {
      numCols = 1; // single entry combat node
    } else if (row === 8 || row === 9) {
      numCols = 1; // single REST before boss, single BOSS
    } else {
      numCols = randInt(rand, 3, 4);
    }
    colCounts.push(numCols);

    const rowNodes: MapNode[] = [];
    for (let col = 0; col < numCols; col++) {
      let type: MapNodeType;
      if (row === 0) type = 'COMBAT';
      else if (row === 8) type = 'REST';
      else if (row === 9) type = 'BOSS';
      else type = pickNodeType(rand, act);

      rowNodes.push({
        id: nodeId(act, row, col),
        type,
        act,
        row,
        col,
        connections: [],
        completed: false,
        accessible: row === 0,
      });
    }
    map.push(rowNodes);
  }

  // Step 2: Build connections (no crossing paths)
  for (let row = 0; row < 9; row++) {
    const currentRow = map[row];
    const nextRow = map[row + 1];
    const nextCols = nextRow.length;

    if (nextCols === 1) {
      // Every node in current row connects to the single next node
      for (const node of currentRow) {
        node.connections.push(nextRow[0].id);
      }
      continue;
    }

    if (currentRow.length === 1) {
      // Single node connects to 1-2 nodes in next row
      const numConnections = Math.min(randInt(rand, 1, 2), nextCols);
      // Pick starting column
      const startCol = randInt(rand, 0, nextCols - numConnections);
      for (let c = startCol; c < startCol + numConnections; c++) {
        currentRow[0].connections.push(nextRow[c].id);
      }
      continue;
    }

    // Multiple nodes in both rows: assign connections avoiding crossings.
    // Strategy: map each current col to a range in the next row.
    // Every current node gets at least 1 connection, every next node gets at least 1 incoming.

    const curLen = currentRow.length;

    // Start by assigning each current node a "primary" target column proportionally
    const primaryTargets: number[] = [];
    for (let i = 0; i < curLen; i++) {
      const target = Math.round((i / (curLen - 1)) * (nextCols - 1));
      primaryTargets.push(target);
    }

    // Track which next-row nodes have incoming connections
    const incomingCount = new Array(nextCols).fill(0);

    // Assign primary connections
    for (let i = 0; i < curLen; i++) {
      const targetCol = primaryTargets[i];
      currentRow[i].connections.push(nextRow[targetCol].id);
      incomingCount[targetCol]++;
    }

    // Optionally add a second connection to an adjacent column (no crossing)
    for (let i = 0; i < curLen; i++) {
      if (rand() < 0.4) {
        const primary = primaryTargets[i];
        // Determine allowed secondary targets: adjacent to primary, within bounds,
        // and must not cross with neighbors
        const candidates: number[] = [];

        // Can go one column right if it doesn't cross with next node's primary
        if (primary + 1 < nextCols) {
          const nextPrimary = i + 1 < curLen ? primaryTargets[i + 1] : nextCols;
          if (primary + 1 <= nextPrimary) {
            candidates.push(primary + 1);
          }
        }
        // Can go one column left if it doesn't cross with previous node's primary
        if (primary - 1 >= 0) {
          const prevPrimary = i - 1 >= 0 ? primaryTargets[i - 1] : -1;
          if (primary - 1 >= prevPrimary) {
            candidates.push(primary - 1);
          }
        }

        if (candidates.length > 0) {
          // Prefer candidates that have no incoming connections
          const unconnected = candidates.filter(c => incomingCount[c] === 0);
          const choice = unconnected.length > 0
            ? unconnected[randInt(rand, 0, unconnected.length - 1)]
            : candidates[randInt(rand, 0, candidates.length - 1)];

          const targetId = nextRow[choice].id;
          if (!currentRow[i].connections.includes(targetId)) {
            currentRow[i].connections.push(targetId);
            incomingCount[choice]++;
          }
        }
      }
    }

    // Ensure every next-row node has at least one incoming connection
    for (let c = 0; c < nextCols; c++) {
      if (incomingCount[c] === 0) {
        // Connect from the nearest current-row node that won't cause a crossing
        let bestSource = -1;
        let bestDist = Infinity;
        for (let i = 0; i < curLen; i++) {
          const primary = primaryTargets[i];
          // Check crossing: connection from i to c must not cross
          // existing connections from nodes < i that go to cols > c
          // or from nodes > i that go to cols < c
          let crosses = false;
          for (let j = 0; j < curLen; j++) {
            if (j === i) continue;
            for (const connId of currentRow[j].connections) {
              const connCol = nextRow.findIndex(n => n.id === connId);
              if ((j < i && connCol > c) || (j > i && connCol < c)) {
                crosses = true;
                break;
              }
            }
            if (crosses) break;
          }
          if (!crosses) {
            const dist = Math.abs(primary - c);
            if (dist < bestDist) {
              bestDist = dist;
              bestSource = i;
            }
          }
        }
        if (bestSource >= 0) {
          const targetId = nextRow[c].id;
          if (!currentRow[bestSource].connections.includes(targetId)) {
            currentRow[bestSource].connections.push(targetId);
            incomingCount[c]++;
          }
        }
      }
    }

    // Sort each node's connections by target column to keep them ordered
    for (const node of currentRow) {
      node.connections.sort((a, b) => {
        const colA = nextRow.findIndex(n => n.id === a);
        const colB = nextRow.findIndex(n => n.id === b);
        return colA - colB;
      });
    }
  }

  // Step 3: Verify reachability from row 0 — remove unreachable nodes
  const reachable = new Set<string>();
  reachable.add(map[0][0].id);

  for (let row = 0; row < 9; row++) {
    for (const node of map[row]) {
      if (!reachable.has(node.id)) continue;
      for (const connId of node.connections) {
        reachable.add(connId);
      }
    }
  }

  // Remove unreachable nodes from rows 1-7
  for (let row = 1; row <= 7; row++) {
    map[row] = map[row].filter(node => reachable.has(node.id));
    // Also clean up connections pointing to removed nodes
    if (row > 0) {
      for (const node of map[row - 1]) {
        node.connections = node.connections.filter(id => {
          return map[row].some(n => n.id === id);
        });
      }
    }
  }

  // Step 4: Verify all reachable nodes can reach the boss
  // Build reverse reachability from boss
  const canReachBoss = new Set<string>();
  canReachBoss.add(map[9][0].id);
  canReachBoss.add(map[8][0].id); // REST before boss always connects to boss

  for (let row = 7; row >= 0; row--) {
    for (const node of map[row]) {
      for (const connId of node.connections) {
        if (canReachBoss.has(connId)) {
          canReachBoss.add(node.id);
          break;
        }
      }
    }
  }

  // For nodes that can't reach boss, add a connection to a reachable node in next row
  for (let row = 0; row < 8; row++) {
    for (const node of map[row]) {
      if (!reachable.has(node.id)) continue;
      if (canReachBoss.has(node.id)) continue;

      // Find a node in next row that can reach the boss
      const nextRow = map[row + 1];
      const reachableNext = nextRow.filter(n => canReachBoss.has(n.id));
      if (reachableNext.length > 0) {
        // Pick the one closest by column
        const sorted = [...reachableNext].sort((a, b) =>
          Math.abs(a.col - node.col) - Math.abs(b.col - node.col)
        );
        const target = sorted[0];
        if (!node.connections.includes(target.id)) {
          node.connections.push(target.id);
        }
        canReachBoss.add(node.id);
      }
    }
  }

  // Step 5: Ensure at least one path has a REST node
  // Check all paths from row 0 to row 9
  const hasRestOnSomePath = checkPathHasNodeType(map, 'REST');
  if (!hasRestOnSomePath) {
    // Force a node in rows 1-7 to be REST along a random path
    // Walk a random path from row 0 to row 7
    let currentNode = map[0][0];
    const pathNodes: MapNode[] = [];
    for (let row = 0; row < 8; row++) {
      if (row > 0 && row < 8) {
        pathNodes.push(currentNode);
      }
      if (currentNode.connections.length === 0) break;
      const nextId = currentNode.connections[randInt(rand, 0, currentNode.connections.length - 1)];
      const nextRowNodes = map[row + 1];
      const nextNode = nextRowNodes.find(n => n.id === nextId);
      if (!nextNode) break;
      currentNode = nextNode;
    }
    // Convert one path node to REST (prefer middle rows)
    if (pathNodes.length > 0) {
      const midIdx = Math.floor(pathNodes.length / 2);
      pathNodes[midIdx].type = 'REST';
    }
  }

  return map;
}

/**
 * Check if at least one path from row 0 to the end contains a node of the given type.
 */
function checkPathHasNodeType(map: MapNode[][], type: MapNodeType): boolean {
  // BFS/DFS tracking whether we've seen the type on any complete path
  // We use DFS with memoization
  const nodeMap = new Map<string, MapNode>();
  for (const row of map) {
    for (const node of row) {
      nodeMap.set(node.id, node);
    }
  }

  function dfs(id: string, seenType: boolean): boolean {
    const node = nodeMap.get(id);
    if (!node) return false;
    const hasType = seenType || node.type === type;

    // If this is the last row, return whether we've seen the type
    if (node.row === 9) return hasType;
    // Row 8 (REST) also counts
    if (node.row === 8 && node.connections.length === 0) return hasType;

    for (const connId of node.connections) {
      if (dfs(connId, hasType)) return true;
    }
    return false;
  }

  return dfs(map[0][0].id, false);
}

/**
 * Generate maps for all 3 acts.
 * Returns a 3D array: [actIndex][row][column-index].
 */
export function generateFullMap(seed: string): MapNode[][][] {
  return [
    generateMap(seed, 1),
    generateMap(seed, 2),
    generateMap(seed, 3),
  ];
}

/**
 * Get the IDs of nodes the player can currently move to from the given node.
 * A node is accessible if it's connected from the current node.
 */
export function getAccessibleNodes(map: MapNode[][], currentNodeId: string): string[] {
  // Find the current node
  for (const row of map) {
    for (const node of row) {
      if (node.id === currentNodeId) {
        // Return connections that exist in the map
        return node.connections.filter(connId =>
          map.some(r => r.some(n => n.id === connId))
        );
      }
    }
  }
  return [];
}

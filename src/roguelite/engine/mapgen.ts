// Phase 3 — Map Generation
// TypeScript port of docs/roguelite/map_generator_reference.py (Python reference).
// Algorithm: 15-row directed acyclic graph, STS2-style procedural generation.
// Spec: docs/roguelite/map-generation-algorithm.md

import type { NodeType, MapNode, MapRow, ActMap } from '../types/map_state';

// ─── Configuration ─────────────────────────────────────────────────────────

export const MAP_CONFIG = {
  TOTAL_ROWS: 15,
  ROW_BODY_START: 3,   // first body row (1-indexed)
  ROW_BODY_END: 13,    // last body row (1-indexed, inclusive)
  ROW_PRE_BOSS_REST: 14,
  ROW_BOSS: 15,
  // Weighted room type distribution — must sum to 100 for readability.
  ROOM_WEIGHTS: [
    { type: 'combat'  as NodeType, weight: 35 },
    { type: 'anomaly' as NodeType, weight: 22 },
    { type: 'rest'    as NodeType, weight: 18 },
    { type: 'shop'    as NodeType, weight: 12 },
    { type: 'elite'   as NodeType, weight: 13 },
  ],
  MIN_RESTS: 2,
  MIN_SHOPS: 1,
  MIN_ANOMALIES: 3,
  JITTER_MAGNITUDE: 0.04,
  MAX_EDGES_PER_NODE: 3,
  MAX_RETRIES: 10,
} as const;

// ─── Internal PRNG ─────────────────────────────────────────────────────────
// Self-contained SplitMix64 that replicates Python reference semantics:
//   • randFloat() = next_u64() / 2^64 (all 64 bits, matching Python float div)
//   • randInt(lo, hi) = inclusive both ends (Python: lo + int(f * (hi-lo+1)))
//   • shuffle() = Fisher-Yates with randInt(0, i) inclusive
//
// Kept separate from src/roguelite/engine/rng.ts to avoid coupling the map
// generator to the run-level PRNG's float formula (which uses top-53-bit
// conversion for compatibility with the combat RNG stream).

class MapPRNG {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed & 0xFFFFFFFFFFFFFFFFn;
  }

  nextU64(): bigint {
    this.state = (this.state + 0x9E3779B97F4A7C15n) & 0xFFFFFFFFFFFFFFFFn;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & 0xFFFFFFFFFFFFFFFFn;
    z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & 0xFFFFFFFFFFFFFFFFn;
    return (z ^ (z >> 31n)) & 0xFFFFFFFFFFFFFFFFn;
  }

  // Matches Python: self.next_u64() / (1 << 64).
  // Both JS and Python use IEEE 754 double division — results are identical.
  randFloat(): number {
    return Number(this.nextU64()) / (2 ** 64);
  }

  // Inclusive on both ends — matches Python's rand_int(lo, hi).
  randInt(lo: number, hi: number): number {
    return lo + Math.floor(this.randFloat() * (hi - lo + 1));
  }

  // Accumulator-based weighted pick — matches Python's weighted_pick.
  weightedPick<T>(items: ReadonlyArray<{ type: T; weight: number }>): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    const roll = this.randFloat() * total;
    let acc = 0;
    for (const item of items) {
      acc += item.weight;
      if (roll < acc) return item.type;
    }
    return items[items.length - 1].type;
  }

  // Fisher-Yates in-place shuffle — matches Python's prng_shuffle.
  shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randInt(0, i); // [0, i] inclusive
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}

// ─── Seed derivation ────────────────────────────────────────────────────────

// Deterministic seed for act N of a given run. Uses FNV-1a 64-bit hash +
// SplitMix64 mixing — synchronous, platform-identical. The spec allows
// SplitMix64 as the hash function (map-generation-algorithm.md §Seed derivation).
function deriveSeed(runId: string, actNumber: number): bigint {
  const key = `${runId}|act${actNumber}`;
  const MASK = 0xFFFFFFFFFFFFFFFFn;
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash ^ BigInt(key.charCodeAt(i))) & MASK) * prime & MASK;
  }
  // SplitMix64 finalisation mix for avalanche quality.
  let z = hash;
  z = ((z ^ (z >> 30n)) * 0xBF58476D1CE4E5B9n) & MASK;
  z = ((z ^ (z >> 27n)) * 0x94D049BB133111EBn) & MASK;
  return (z ^ (z >> 31n)) & MASK;
}

// ─── Phase 1: place nodes per row ──────────────────────────────────────────

function placeNodes(prng: MapPRNG): MapNode[][] {
  // rowsArr[i] holds nodes for 1-indexed row (i + 1).
  const rowsArr: MapNode[][] = Array.from({ length: MAP_CONFIG.TOTAL_ROWS }, () => []);

  // Row 1: single entry node.
  rowsArr[0] = [{ id: 'r1n0', row: 1, x: 0.5, type: 'entry', outgoingEdges: [], visited: false }];

  // Row 2: exactly 3 combat nodes at fixed positions.
  rowsArr[1] = [0.25, 0.5, 0.75].map((x, i) => ({
    id: `r2n${i}`, row: 2, x, type: 'combat' as NodeType, outgoingEdges: [], visited: false,
  }));

  // Rows 3–12: 2-4 nodes each with horizontal jitter.
  for (let rowNum = MAP_CONFIG.ROW_BODY_START; rowNum < MAP_CONFIG.ROW_BODY_END; rowNum++) {
    const count = prng.randInt(2, 4);
    rowsArr[rowNum - 1] = Array.from({ length: count }, (_, i) => {
      const baseX = (i + 1) / (count + 1);
      const jitter = (prng.randFloat() - 0.5) * 2 * MAP_CONFIG.JITTER_MAGNITUDE;
      const x = Math.max(0.05, Math.min(0.95, baseX + jitter));
      return { id: `r${rowNum}n${i}`, row: rowNum, x, type: 'combat' as NodeType, outgoingEdges: [], visited: false };
    });
  }

  // Row 13: 2-3 nodes (pre-boss convergence).
  {
    const count = prng.randInt(2, 3);
    rowsArr[12] = Array.from({ length: count }, (_, i) => {
      const baseX = (i + 1) / (count + 1);
      const jitter = (prng.randFloat() - 0.5) * 2 * MAP_CONFIG.JITTER_MAGNITUDE;
      const x = Math.max(0.1, Math.min(0.9, baseX + jitter));
      return { id: `r13n${i}`, row: 13, x, type: 'combat' as NodeType, outgoingEdges: [], visited: false };
    });
  }

  // Row 14: forced rest.
  rowsArr[13] = [{ id: 'r14n0', row: 14, x: 0.5, type: 'rest', outgoingEdges: [], visited: false }];

  // Row 15: boss.
  rowsArr[14] = [{ id: 'r15n0', row: 15, x: 0.5, type: 'boss', outgoingEdges: [], visited: false }];

  // Sort each row by x so the crossing check works correctly.
  for (const row of rowsArr) {
    row.sort((a, b) => a.x - b.x);
  }

  return rowsArr;
}

// ─── Phase 2: roll room types for body nodes ───────────────────────────────

function rollRoomTypes(prng: MapPRNG, rowsArr: MapNode[][]): void {
  const weights = MAP_CONFIG.ROOM_WEIGHTS;
  // 0-indexed range: body rows 3..13 = indices 2..12. Skip index 1 (row 2, fixed combat).
  for (let ri = MAP_CONFIG.ROW_BODY_START - 1; ri < MAP_CONFIG.ROW_BODY_END; ri++) {
    if (ri === 1) continue; // row 2: forced all-combat
    for (const node of rowsArr[ri]) {
      node.type = prng.weightedPick(weights);
    }
  }
}

// ─── Phase 3: diversity constraints ────────────────────────────────────────

function applyDiversityConstraints(prng: MapPRNG, rowsArr: MapNode[][]): void {
  // D1: no elite in rows 2 or 3 (indices 1 and 2).
  for (const ri of [1, 2]) {
    for (const node of rowsArr[ri]) {
      if (node.type === 'elite') node.type = 'combat';
    }
  }

  // Helpers for D2/D3/D4.
  const bodyRange = () => rowsArr.slice(MAP_CONFIG.ROW_BODY_START - 1, MAP_CONFIG.ROW_BODY_END);
  const countType = (t: NodeType) => bodyRange().reduce((s, row) => s + row.filter(n => n.type === t).length, 0);

  function promoteCombatsTo(target: NodeType, minCount: number): void {
    const shortfall = minCount - countType(target);
    if (shortfall <= 0) return;
    const candidates: MapNode[] = [];
    for (const row of bodyRange()) {
      for (const node of row) {
        if (node.type === 'combat') candidates.push(node);
      }
    }
    prng.shuffle(candidates);
    for (let i = 0; i < Math.min(shortfall, candidates.length); i++) {
      candidates[i].type = target;
    }
  }

  promoteCombatsTo('rest', MAP_CONFIG.MIN_RESTS);
  promoteCombatsTo('shop', MAP_CONFIG.MIN_SHOPS);
  promoteCombatsTo('anomaly', MAP_CONFIG.MIN_ANOMALIES);

  // D5: no adjacent-row elites on a singleton path.
  // Simplified: if both rows have ≤2 nodes and each has exactly 1 elite, demote second.
  for (let ri = MAP_CONFIG.ROW_BODY_START - 1; ri < MAP_CONFIG.ROW_BODY_END - 1; ri++) {
    const currElites = rowsArr[ri].filter(n => n.type === 'elite');
    const nextElites = rowsArr[ri + 1].filter(n => n.type === 'elite');
    if (
      currElites.length === 1 &&
      nextElites.length === 1 &&
      rowsArr[ri].length <= 2 &&
      rowsArr[ri + 1].length <= 2
    ) {
      nextElites[0].type = 'combat';
    }
  }
}

// ─── Phase 4: build edges ──────────────────────────────────────────────────

function wouldCross(rowsArr: MapNode[][], nodeRowIdx: number, nodeIdx: number, cand: MapNode): boolean {
  const node = rowsArr[nodeRowIdx][nodeIdx];
  // rowsArr[node.row] is the NEXT row (node.row is 1-indexed, array is 0-indexed).
  const nextRow = rowsArr[node.row];
  if (!nextRow) return false;
  const idToNode = new Map<string, MapNode>(nextRow.map(n => [n.id, n]));

  for (let oi = 0; oi < rowsArr[nodeRowIdx].length; oi++) {
    if (oi === nodeIdx) continue;
    const other = rowsArr[nodeRowIdx][oi];
    if (!other.outgoingEdges.length) continue;
    for (const targetId of other.outgoingEdges) {
      const target = idToNode.get(targetId);
      if (!target) continue;
      if (
        (other.x < node.x && target.x > cand.x) ||
        (other.x > node.x && target.x < cand.x)
      ) return true;
    }
  }
  return false;
}

function buildEdges(prng: MapPRNG, rowsArr: MapNode[][]): void {
  for (let ri = 0; ri < MAP_CONFIG.TOTAL_ROWS - 1; ri++) {
    const currRow = rowsArr[ri];
    const nextRow = rowsArr[ri + 1];
    if (!currRow.length || !nextRow.length) continue;

    // Special case: rowsArr[13] (REST, row 14) → rowsArr[14] (BOSS, row 15).
    // Python: "if row_idx + 1 == ROW_PRE_BOSS_REST - 1 + 1" simplifies to ri + 1 == 14 → ri == 13.
    if (ri + 1 === 14) {
      const bossNode = nextRow[0];
      for (const node of currRow) {
        node.outgoingEdges = [bossNode.id];
      }
      continue;
    }

    // Single-node row: connect to 1-3 closest nodes in next row.
    if (currRow.length === 1) {
      const count = Math.min(prng.randInt(1, MAP_CONFIG.MAX_EDGES_PER_NODE), nextRow.length);
      const targets = nextRow
        .slice()
        .sort((a, b) => Math.abs(a.x - currRow[0].x) - Math.abs(b.x - currRow[0].x))
        .slice(0, count)
        .sort((a, b) => a.x - b.x);
      currRow[0].outgoingEdges = targets.map(n => n.id);
      continue;
    }

    // General case: each node picks 1-3 next-row targets by proximity, no crossing.
    for (let ni = 0; ni < currRow.length; ni++) {
      const node = currRow[ni];
      const desired = Math.min(
        prng.randInt(1, MAP_CONFIG.MAX_EDGES_PER_NODE),
        nextRow.length,
      );

      // Candidates sorted by x-distance (closest first).
      const candidates = nextRow.slice().sort((a, b) => Math.abs(a.x - node.x) - Math.abs(b.x - node.x));

      const chosen: MapNode[] = [];
      for (const cand of candidates) {
        if (chosen.length >= desired) break;
        if (!wouldCross(rowsArr, ri, ni, cand)) chosen.push(cand);
      }

      if (!chosen.length) chosen.push(candidates[0]);

      chosen.sort((a, b) => a.x - b.x);
      node.outgoingEdges = chosen.map(n => n.id);
    }
  }
}

// ─── Phase 5: validate and repair ─────────────────────────────────────────

function validateAndRepair(rowsArr: MapNode[][]): boolean {
  const allNodes = new Map<string, MapNode>();
  for (const row of rowsArr) {
    for (const n of row) allNodes.set(n.id, n);
  }

  // Build incoming-edge index.
  const incoming = new Map<string, string[]>();
  for (const id of allNodes.keys()) incoming.set(id, []);
  for (const n of allNodes.values()) {
    for (const outId of n.outgoingEdges) {
      incoming.get(outId)?.push(n.id);
    }
  }

  // Repair: every row-2..row-15 node needs at least one incoming edge.
  for (let ri = 1; ri < MAP_CONFIG.TOTAL_ROWS; ri++) {
    for (const node of rowsArr[ri]) {
      if (!incoming.get(node.id)?.length) {
        const prevRow = rowsArr[ri - 1];
        const closest = prevRow.reduce((best, n) =>
          Math.abs(n.x - node.x) < Math.abs(best.x - node.x) ? n : best
        );
        if (!closest.outgoingEdges.includes(node.id)) {
          closest.outgoingEdges.push(node.id);
          incoming.get(node.id)!.push(closest.id);
        }
      }
    }
  }

  // Repair: every row-1..row-14 node needs at least one outgoing edge.
  for (let ri = 0; ri < MAP_CONFIG.TOTAL_ROWS - 1; ri++) {
    for (const node of rowsArr[ri]) {
      if (!node.outgoingEdges.length) {
        const nextRow = rowsArr[ri + 1];
        const closest = nextRow.reduce((best, n) =>
          Math.abs(n.x - node.x) < Math.abs(best.x - node.x) ? n : best
        );
        node.outgoingEdges.push(closest.id);
      }
    }
  }

  // Final reachability check: is boss reachable from entry?
  const entry = rowsArr[0][0];
  const boss = rowsArr[MAP_CONFIG.TOTAL_ROWS - 1][0];
  const visited = new Set<string>();
  const stack = [entry.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const outId of allNodes.get(id)!.outgoingEdges) stack.push(outId);
  }
  return visited.has(boss.id);
}

// ─── Main generator ────────────────────────────────────────────────────────

/** Generate a single act's map graph. Same `runId + actNumber` always
 *  produces the same map. Retries up to MAX_RETRIES times with a derived
 *  seed if validation fails (per spec implementation note #4). */
export function generateActMap(runId: string, actNumber: 1 | 2 | 3): ActMap {
  const baseSeed = deriveSeed(runId, actNumber);

  for (let retry = 0; retry < MAP_CONFIG.MAX_RETRIES; retry++) {
    const seed = (baseSeed + BigInt(retry)) & 0xFFFFFFFFFFFFFFFFn;
    const prng = new MapPRNG(seed);

    const rowsArr = placeNodes(prng);
    rollRoomTypes(prng, rowsArr);
    applyDiversityConstraints(prng, rowsArr);
    buildEdges(prng, rowsArr);

    if (validateAndRepair(rowsArr)) {
      const rows: MapRow[] = rowsArr.map((nodes, i) => ({ index: i + 1, nodes }));
      return {
        actNumber,
        actSeed: seed.toString(16).padStart(16, '0'),
        rows,
        completed: false,
      };
    }
  }

  throw new Error(
    `generateActMap: failed after ${MAP_CONFIG.MAX_RETRIES} retries — algorithm bug (runId=${runId}, act=${actNumber})`,
  );
}

// ─── Game utility functions ────────────────────────────────────────────────

/** Return a flat map of all nodes by ID from a generated ActMap. */
export function buildNodeIndex(actMap: ActMap): Map<string, MapNode> {
  const index = new Map<string, MapNode>();
  for (const row of actMap.rows) {
    for (const node of row.nodes) index.set(node.id, node);
  }
  return index;
}

/** Return the nodes the player can travel to next.
 *  - If `currentNodeId` is null, returns all row-2 nodes (the first choice).
 *  - Otherwise returns the unvisited outgoing neighbors of the current node. */
export function getAvailableNodes(actMap: ActMap, currentNodeId: string | null): MapNode[] {
  if (currentNodeId === null) {
    // Start of act: entry node (row 1) is always connected to all row-2 nodes.
    const entry = actMap.rows[0]?.nodes[0];
    if (!entry) return [];
    const index = buildNodeIndex(actMap);
    return entry.outgoingEdges.map(id => index.get(id)).filter((n): n is MapNode => !!n && !n.visited);
  }

  const index = buildNodeIndex(actMap);
  const current = index.get(currentNodeId);
  if (!current) return [];
  return current.outgoingEdges
    .map(id => index.get(id))
    .filter((n): n is MapNode => !!n && !n.visited);
}

/** Mark a node visited. Returns a new ActMap (does not mutate the original). */
export function visitNode(actMap: ActMap, nodeId: string): ActMap {
  return {
    ...actMap,
    rows: actMap.rows.map(row => ({
      ...row,
      nodes: row.nodes.map(node =>
        node.id === nodeId ? { ...node, visited: true } : node
      ),
    })),
  };
}

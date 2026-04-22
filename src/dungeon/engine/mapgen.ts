import type { ActMap, MapNode, NodeType } from '../types';

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────

/** Mulberry32 — small, fast, good enough for map-gen determinism. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Generation constants ─────────────────────────────────────────────────────

const COLS = 3;
const MID_ROWS = [1, 2, 3, 4, 5, 6];  // procedural middle rows
const REST_ROW = 7;
const BOSS_ROW = 8;
const TOTAL_ROWS = 9;

/** Per-act distributions for the 18 middle slots (rows 1-6 × 3 cols). */
const ACT_DISTRIBUTIONS: Record<1 | 2 | 3, Record<Exclude<NodeType, 'boss'>, number>> = {
  1: { combat: 10, elite: 2, rest: 2, shop: 2, treasure: 2 },
  2: { combat: 9,  elite: 3, rest: 2, shop: 2, treasure: 2 },
  3: { combat: 8,  elite: 4, rest: 2, shop: 2, treasure: 2 },
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

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Map generation ───────────────────────────────────────────────────────────

export function generateActMap(actNumber: 1 | 2 | 3, seed: string): ActMap {
  const rng = mulberry32(hashSeed(`${seed}-act${actNumber}`));
  const nodes: MapNode[] = [];

  // Row 0: single combat start node in the middle column
  const startId = nodeId(0, 1);
  nodes.push({
    id: startId,
    row: 0,
    col: 1,
    type: 'combat',
    visited: false,
    connections: [],
  });

  // Rows 1-6: procedural distribution
  const dist = ACT_DISTRIBUTIONS[actNumber];
  const typePool: Exclude<NodeType, 'boss'>[] = [];
  (Object.keys(dist) as Exclude<NodeType, 'boss'>[]).forEach((t) => {
    for (let i = 0; i < dist[t]; i++) typePool.push(t);
  });
  const shuffledTypes = shuffle(typePool, rng);

  let idx = 0;
  for (const row of MID_ROWS) {
    for (let col = 0; col < COLS; col++) {
      const type = shuffledTypes[idx++] ?? 'combat';
      nodes.push({
        id: nodeId(row, col),
        row,
        col,
        type,
        visited: false,
        connections: [],
      });
    }
  }

  // Row 7: rest row (3 rests, one per column — a breather before boss)
  for (let col = 0; col < COLS; col++) {
    nodes.push({
      id: nodeId(REST_ROW, col),
      row: REST_ROW,
      col,
      type: 'rest',
      visited: false,
      connections: [],
    });
  }

  // Row 8: boss (single centered node)
  const bossId = nodeId(BOSS_ROW, 1);
  nodes.push({
    id: bossId,
    row: BOSS_ROW,
    col: 1,
    type: 'boss',
    visited: false,
    connections: [],
  });

  // ─── Wire forward connections (no dead ends, no crossing edges) ────────────
  // Edges may only go to col-1, col, or col+1 in the next row. We first build
  // a set of "arriving" columns per row so every node gets at least one
  // incoming edge; then we ensure every source has at least one outgoing edge.

  for (let r = 0; r < TOTAL_ROWS - 1; r++) {
    const sources = nodes.filter((n) => n.row === r);
    const targetsRow = r + 1;
    const targets = nodes.filter((n) => n.row === targetsRow);

    // Pass 1: every source picks 1-2 outgoing edges to adjacent-column targets
    for (const src of sources) {
      const candidates = targets.filter((t) => Math.abs(t.col - src.col) <= 1);
      if (candidates.length === 0) continue;

      const count = 1 + (rng() < 0.45 ? 1 : 0);
      const picked = shuffle(candidates, rng).slice(0, Math.min(count, candidates.length));
      for (const t of picked) {
        if (!src.connections.includes(t.id)) src.connections.push(t.id);
      }
    }

    // Pass 2: guarantee every target in next row has at least one incoming edge
    for (const tgt of targets) {
      const hasIncoming = sources.some((s) => s.connections.includes(tgt.id));
      if (hasIncoming) continue;

      const eligibleSources = sources.filter((s) => Math.abs(s.col - tgt.col) <= 1);
      if (eligibleSources.length === 0) continue;
      const src = pickRandom(eligibleSources, rng);
      if (!src.connections.includes(tgt.id)) src.connections.push(tgt.id);
    }
  }

  // Prevent two edges from "crossing" (source A → col+1 while source A+1 → col)
  // is permitted in STS — leaving it in for variety.

  return {
    actNumber,
    nodes,
    currentNodeId: startId,
    completed: false,
  };
}

// ─── Traversal helpers ────────────────────────────────────────────────────────

export function getAvailableNodes(map: ActMap, currentNodeId: string): MapNode[] {
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

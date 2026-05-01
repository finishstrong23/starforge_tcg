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

// ─── Topology constants ───────────────────────────────────────────────────────
// The map is a 9-row grid. Row 0 = three start nodes (one per column), one
// per path. Rows 1–6 are the procedural middle. The convergence band (1–2
// consecutive rows somewhere in rows 1–5) allows ±1 column crossing; all
// other rows are lane-locked. The band position is seeded-random each run so
// every map has a distinct shape. Rows 5→6→7 always funnel back to separate
// rest stops before the single boss.

const COLS = 3;
const MID_ROWS = [1, 2, 3, 4, 5, 6];
const REST_ROW = 7;
const BOSS_ROW = 8;
const TOTAL_ROWS = 9;

/** Per-act distributions for the 18 middle slots (rows 1–6 × 3 cols). */
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

export function generateActMap(actNumber: 1 | 2 | 3, seed: string, extraElites = 0): ActMap {
  const rng = mulberry32(hashSeed(`${seed}-act${actNumber}`));
  const nodes: MapNode[] = [];

  // Row 0: THREE combat start nodes — the player chooses a path.
  for (let col = 0; col < COLS; col++) {
    nodes.push({
      id: nodeId(0, col),
      row: 0,
      col,
      type: 'combat',
      visited: false,
      connections: [],
    });
  }

  // Rows 1–6: procedural distribution (18 slots).
  // Ascension A2+ adds `extraElites` elite nodes to each act, taken from
  // the combat pool (so the total slot count stays at 18).
  const dist = { ...ACT_DISTRIBUTIONS[actNumber] };
  for (let i = 0; i < extraElites; i++) {
    if (dist.combat <= 0) break;
    dist.combat -= 1;
    dist.elite  += 1;
  }
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

  // Row 7: one rest per column — every path gets a breather before the boss.
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

  // Row 8: single centered boss.
  const bossId = nodeId(BOSS_ROW, 1);
  nodes.push({
    id: bossId,
    row: BOSS_ROW,
    col: 1,
    type: 'boss',
    visited: false,
    connections: [],
  });

  // ── Randomised convergence band ──────────────────────────────────────────
  // Pick a window of 1–2 consecutive rows (anywhere in rows 1–5) where paths
  // may cross ±1 column. Everything outside that window stays lane-locked.
  // Rows 5 and 6 are always lane-locked so paths re-separate before the rests.
  const convStart = 1 + Math.floor(rng() * 4); // 1, 2, 3, or 4
  const convWindowSize = rng() < 0.62 ? 2 : 1;
  const convEnd = Math.min(convStart + convWindowSize - 1, 4); // never past row 4
  const convergenceRows = new Set<number>();
  for (let r = convStart; r <= convEnd; r++) convergenceRows.add(r);

  // Probability of a lane-locked node also sprouting an optional ±1 branch.
  // Kept low so the three-path feel dominates. Disabled for rows adjacent to
  // the convergence band (would blur the visual separation too much).
  const BRANCH_PROB = 0.22;

  // ── Wire edges ────────────────────────────────────────────────────────────
  for (let r = 0; r < TOTAL_ROWS - 1; r++) {
    const sources = nodes.filter((n) => n.row === r);
    const targets = nodes.filter((n) => n.row === r + 1);

    // Row 7 → 8: every rest stop funnels into the single boss.
    if (r === REST_ROW) {
      const boss = targets[0];
      if (boss) {
        for (const src of sources) src.connections.push(boss.id);
      }
      continue;
    }

    const allowCross = convergenceRows.has(r);

    if (!allowCross) {
      // Lane-locked: guaranteed same-column edge plus an occasional branch.
      for (const src of sources) {
        const tgt = targets.find((t) => t.col === src.col);
        if (tgt) src.connections.push(tgt.id);

        // Optional branch: only in rows far enough from the convergence band.
        const distFromConv = Math.min(
          Math.abs(r - convStart + 1),
          Math.abs(r - convEnd),
        );
        if (distFromConv >= 2 && rng() < BRANCH_PROB) {
          const adj = targets.filter((t) => Math.abs(t.col - src.col) === 1);
          if (adj.length > 0) {
            const branch = adj[Math.floor(rng() * adj.length)];
            if (branch && !src.connections.includes(branch.id)) {
              src.connections.push(branch.id);
            }
          }
        }
      }
      continue;
    }

    // Convergence band: ±1 column edges, 1–2 per source, for a narrow mixing
    // window. Paths touch here but re-commit to their lane after convEnd.
    for (const src of sources) {
      const candidates = targets.filter((t) => Math.abs(t.col - src.col) <= 1);
      if (candidates.length === 0) continue;

      const count = 1 + (rng() < 0.5 ? 1 : 0);
      const picked = shuffle(candidates, rng).slice(0, Math.min(count, candidates.length));
      for (const t of picked) {
        if (!src.connections.includes(t.id)) src.connections.push(t.id);
      }
    }

    // Guarantee every convergence-band target has at least one incoming edge.
    for (const tgt of targets) {
      const hasIncoming = sources.some((s) => s.connections.includes(tgt.id));
      if (hasIncoming) continue;

      const eligibleSources = sources.filter((s) => Math.abs(s.col - tgt.col) <= 1);
      if (eligibleSources.length === 0) continue;
      const src = pickRandom(eligibleSources, rng);
      if (!src.connections.includes(tgt.id)) src.connections.push(tgt.id);
    }
  }

  return {
    actNumber,
    nodes,
    currentNodeId: null, // player picks one of the three row-0 starts
    completed: false,
  };
}

// ─── Traversal helpers ────────────────────────────────────────────────────────

export function getAvailableNodes(map: ActMap, currentNodeId: string | null): MapNode[] {
  // Before entering the map, the three row-0 start nodes are the available picks.
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

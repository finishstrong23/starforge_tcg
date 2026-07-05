/**
 * Stress suite for the LIVE map generator (src/dungeon/engine/mapgen.ts).
 *
 * The pre-existing 10,000-seed mapgen suite targets the legacy
 * src/roguelite generator (16-row topology) that the shipped game does not
 * use. This suite pins the 9-row generator the dungeon actually runs on:
 * connectivity (no dead ends, boss always reachable), forward-only edges,
 * per-act node-type distributions, and ascension elite injection.
 */

import { generateActMap, getAvailableNodes, visitNode } from '../../src/dungeon/engine/mapgen';
import type { ActMap, MapNode } from '../../src/dungeon/types';

const ACTS = [1, 2, 3] as const;
const STRESS_SEEDS = 3000;

const EXPECTED_MIDDLE: Record<1 | 2 | 3, Record<string, number>> = {
  1: { combat: 8, elite: 2, rest: 2, shop: 2, treasure: 2, event: 2 },
  2: { combat: 7, elite: 3, rest: 2, shop: 2, treasure: 2, event: 2 },
  3: { combat: 6, elite: 4, rest: 2, shop: 2, treasure: 2, event: 2 },
};

function byId(map: ActMap): Map<string, MapNode> {
  return new Map(map.nodes.map((n) => [n.id, n]));
}

function reachableFromStarts(map: ActMap): Set<string> {
  const lookup = byId(map);
  const frontier = map.nodes.filter((n) => n.row === 0).map((n) => n.id);
  const seen = new Set<string>(frontier);
  while (frontier.length > 0) {
    const id = frontier.pop()!;
    for (const next of lookup.get(id)!.connections) {
      if (!seen.has(next)) {
        seen.add(next);
        frontier.push(next);
      }
    }
  }
  return seen;
}

describe(`live mapgen — ${STRESS_SEEDS}-seed stress`, () => {
  it('every seed produces a fully valid, fully connected map for every act', () => {
    // Plain-boolean checks in the hot loop; a single assertion at the end.
    // (Millions of expect() calls make this take ~10x longer.)
    const failures: string[] = [];
    for (let i = 0; i < STRESS_SEEDS && failures.length < 10; i++) {
      const seed = `stress-${i}`;
      for (const act of ACTS) {
        const map = generateActMap(act, seed);
        const lookup = byId(map);
        const label = `${seed}/act${act}`;

        // Structure: 3 starts + 18 middle + 3 rests + 1 boss = 25 nodes.
        if (map.nodes.length !== 25) failures.push(`${label}: ${map.nodes.length} nodes`);
        if (new Set(map.nodes.map((n) => n.id)).size !== 25) failures.push(`${label}: duplicate ids`);

        // Exactly one boss, on the boss row.
        const bosses = map.nodes.filter((n) => n.type === 'boss');
        if (bosses.length !== 1 || bosses[0].row !== 8) failures.push(`${label}: bad boss placement`);

        // Row 7 is all rest sites and every one funnels into the boss.
        const preBoss = map.nodes.filter((n) => n.row === 7);
        if (preBoss.length !== 3) failures.push(`${label}: row 7 has ${preBoss.length} nodes`);
        for (const rest of preBoss) {
          if (rest.type !== 'rest') failures.push(`${label}: row-7 ${rest.id} is ${rest.type}`);
          if (rest.connections.length !== 1 || rest.connections[0] !== bosses[0]?.id) {
            failures.push(`${label}: rest ${rest.id} does not funnel to boss`);
          }
        }

        // Edges: forward-only, one row at a time, to valid ids; no dead ends.
        for (const node of map.nodes) {
          for (const targetId of node.connections) {
            const target = lookup.get(targetId);
            if (!target || target.row !== node.row + 1) {
              failures.push(`${label}: bad edge ${node.id} -> ${targetId}`);
            }
          }
          if (node.row < 8 && node.connections.length === 0) {
            failures.push(`${label}: dead end at ${node.id}`);
          }
        }

        // Full connectivity: every node reachable from the three starts —
        // combined with forward-only edges and no dead ends, this also
        // guarantees the boss is reachable from every path.
        if (reachableFromStarts(map).size !== 25) {
          failures.push(`${label}: orphaned nodes`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('per-act node-type distributions match the design counts', () => {
    for (let i = 0; i < 200; i++) {
      for (const act of ACTS) {
        const map = generateActMap(act, `dist-${i}`);
        const middle = map.nodes.filter((n) => n.row >= 1 && n.row <= 6);
        expect(middle).toHaveLength(18);
        const counts: Record<string, number> = {};
        for (const node of middle) counts[node.type] = (counts[node.type] ?? 0) + 1;
        expect(counts).toEqual(EXPECTED_MIDDLE[act]);
      }
    }
  });

  it('ascension extraElites converts combats into elites', () => {
    for (let i = 0; i < 50; i++) {
      const base = generateActMap(1, `elite-${i}`, 0);
      const harder = generateActMap(1, `elite-${i}`, 1);
      const count = (m: ActMap, t: string) => m.nodes.filter((n) => n.type === t).length;
      expect(count(harder, 'elite')).toBe(count(base, 'elite') + 1);
      expect(count(harder, 'combat')).toBe(count(base, 'combat') - 1);
    }
  });

  it('same seed → identical map; different seeds diverge', () => {
    const a = generateActMap(2, 'determinism');
    const b = generateActMap(2, 'determinism');
    expect(a).toEqual(b);
    const c = generateActMap(2, 'determinism-2');
    expect(JSON.stringify(c)).not.toEqual(JSON.stringify(a));
  });
});

describe('live mapgen — traversal API', () => {
  const map = generateActMap(1, 'traversal');

  it('offers the three row-0 starts before the first move', () => {
    const starts = getAvailableNodes(map, null);
    expect(starts).toHaveLength(3);
    expect(starts.every((n) => n.row === 0)).toBe(true);
  });

  it('offers only the current node\'s outgoing connections afterwards', () => {
    const start = map.nodes.find((n) => n.row === 0)!;
    const visited = visitNode(map, start.id);
    const next = getAvailableNodes(visited, start.id);
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((n) => start.connections.includes(n.id))).toBe(true);
  });

  it('visitNode marks progress immutably and completes on the boss', () => {
    const boss = map.nodes.find((n) => n.type === 'boss')!;
    const done = visitNode(map, boss.id);
    expect(done.completed).toBe(true);
    expect(map.completed).toBe(false); // original untouched
  });
});

import {
  generateActMap,
  getAvailableNodes,
  visitNode,
  buildNodeIndex,
  MAP_CONFIG,
} from '../../src/roguelite/engine/mapgen';
import type { ActMap, MapNode } from '../../src/roguelite/types/map_state';

// ─── Helpers ───────────────────────────────────────────────────────────────

function bossReachable(actMap: ActMap): boolean {
  const index = buildNodeIndex(actMap);
  const entry = actMap.rows[0]?.nodes[0];
  const boss = actMap.rows[MAP_CONFIG.TOTAL_ROWS - 1]?.nodes[0];
  if (!entry || !boss) return false;

  const visited = new Set<string>();
  const stack = [entry.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const out of index.get(id)!.outgoingEdges) stack.push(out);
  }
  return visited.has(boss.id);
}

function countBodyType(actMap: ActMap, type: string): number {
  let n = 0;
  // Body rows: indices 2..12 (0-indexed) = 1-indexed rows 3..13.
  for (let ri = MAP_CONFIG.ROW_BODY_START - 1; ri < MAP_CONFIG.ROW_BODY_END; ri++) {
    for (const node of actMap.rows[ri].nodes) {
      if (node.type === type) n++;
    }
  }
  return n;
}

function allNodesReachable(actMap: ActMap): boolean {
  const index = buildNodeIndex(actMap);
  const entry = actMap.rows[0]?.nodes[0];
  if (!entry) return false;

  const reachable = new Set<string>();
  const stack = [entry.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const out of index.get(id)!.outgoingEdges) stack.push(out);
  }

  // Every node except the entry should be reachable (entry is always row 1).
  for (const [id] of index) {
    if (!reachable.has(id)) return false;
  }
  return true;
}

function validateMap(actMap: ActMap): void {
  expect(bossReachable(actMap)).toBe(true);
  expect(allNodesReachable(actMap)).toBe(true);
  expect(countBodyType(actMap, 'rest')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_RESTS);
  expect(countBodyType(actMap, 'shop')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_SHOPS);
  expect(countBodyType(actMap, 'anomaly')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_ANOMALIES);
}

// ─── Determinism ───────────────────────────────────────────────────────────

describe('generateActMap determinism', () => {
  it('same runId + actNumber produces byte-identical map', () => {
    const a = generateActMap('determinism-test', 1);
    const b = generateActMap('determinism-test', 1);
    expect(a.rows).toEqual(b.rows);
    expect(a.actSeed).toEqual(b.actSeed);
  });

  it('different runIds produce different maps', () => {
    const a = generateActMap('run-alpha', 1);
    const b = generateActMap('run-beta', 1);
    // Different seeds → different actSeeds
    expect(a.actSeed).not.toEqual(b.actSeed);
  });

  it('same runId but different act produces different map', () => {
    const a = generateActMap('multi-act-run', 1);
    const b = generateActMap('multi-act-run', 2);
    const c = generateActMap('multi-act-run', 3);
    expect(a.actSeed).not.toEqual(b.actSeed);
    expect(b.actSeed).not.toEqual(c.actSeed);
  });
});

// ─── Structural invariants ─────────────────────────────────────────────────

describe('generateActMap structure', () => {
  const map = generateActMap('structure-test', 1);

  it('has exactly 15 rows', () => {
    expect(map.rows.length).toBe(15);
  });

  it('row indices are 1..15', () => {
    map.rows.forEach((row, i) => expect(row.index).toBe(i + 1));
  });

  it('row 1 has a single entry node', () => {
    expect(map.rows[0].nodes.length).toBe(1);
    expect(map.rows[0].nodes[0].type).toBe('entry');
    expect(map.rows[0].nodes[0].id).toBe('r1n0');
  });

  it('row 2 has exactly 3 combat nodes', () => {
    expect(map.rows[1].nodes.length).toBe(3);
    for (const node of map.rows[1].nodes) {
      expect(node.type).toBe('combat');
    }
  });

  it('row 14 has a single rest node', () => {
    expect(map.rows[13].nodes.length).toBe(1);
    expect(map.rows[13].nodes[0].type).toBe('rest');
  });

  it('row 15 has a single boss node', () => {
    expect(map.rows[14].nodes.length).toBe(1);
    expect(map.rows[14].nodes[0].type).toBe('boss');
  });

  it('body rows (3–13) have 2-4 nodes each', () => {
    // rows 3..12 = indices 2..11; row 13 = index 12 (2-3 nodes)
    for (let ri = 2; ri <= 11; ri++) {
      expect(map.rows[ri].nodes.length).toBeGreaterThanOrEqual(2);
      expect(map.rows[ri].nodes.length).toBeLessThanOrEqual(4);
    }
    expect(map.rows[12].nodes.length).toBeGreaterThanOrEqual(2);
    expect(map.rows[12].nodes.length).toBeLessThanOrEqual(3);
  });

  it('node IDs are unique within the map', () => {
    const ids = new Set<string>();
    for (const row of map.rows) {
      for (const node of row.nodes) ids.add(node.id);
    }
    const totalNodes = map.rows.reduce((s, r) => s + r.nodes.length, 0);
    expect(ids.size).toBe(totalNodes);
  });

  it('node.row matches the containing row index', () => {
    for (const row of map.rows) {
      for (const node of row.nodes) {
        expect(node.row).toBe(row.index);
      }
    }
  });

  it('all nodes start with visited = false', () => {
    for (const row of map.rows) {
      for (const node of row.nodes) {
        expect(node.visited).toBe(false);
      }
    }
  });

  it('actSeed is a 16-char lowercase hex string', () => {
    expect(map.actSeed).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ─── Connectivity invariants ───────────────────────────────────────────────

describe('generateActMap connectivity', () => {
  it('boss is reachable from entry', () => {
    const map = generateActMap('connectivity-test', 1);
    expect(bossReachable(map)).toBe(true);
  });

  it('all nodes are reachable from entry', () => {
    const map = generateActMap('reachability-test', 1);
    expect(allNodesReachable(map)).toBe(true);
  });

  it('outgoing edges point to valid node IDs', () => {
    const map = generateActMap('edge-validity', 1);
    const index = buildNodeIndex(map);
    for (const [, node] of index) {
      for (const outId of node.outgoingEdges) {
        expect(index.has(outId)).toBe(true);
      }
    }
  });

  it('edges only go forward (to higher row numbers)', () => {
    const map = generateActMap('forward-edges', 1);
    const index = buildNodeIndex(map);
    for (const [, node] of index) {
      for (const outId of node.outgoingEdges) {
        const target = index.get(outId)!;
        expect(target.row).toBeGreaterThan(node.row);
      }
    }
  });

  it('rest (row 14) connects to boss (row 15)', () => {
    const map = generateActMap('rest-boss', 1);
    const restNode = map.rows[13].nodes[0];
    const bossNode = map.rows[14].nodes[0];
    expect(restNode.outgoingEdges).toContain(bossNode.id);
  });
});

// ─── Diversity constraints ─────────────────────────────────────────────────

describe('diversity constraints', () => {
  it('meets rest, shop, anomaly minimums', () => {
    const map = generateActMap('diversity-basic', 1);
    expect(countBodyType(map, 'rest')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_RESTS);
    expect(countBodyType(map, 'shop')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_SHOPS);
    expect(countBodyType(map, 'anomaly')).toBeGreaterThanOrEqual(MAP_CONFIG.MIN_ANOMALIES);
  });

  it('D1: no elite in rows 2 or 3 across 200 seeds', () => {
    for (let i = 0; i < 200; i++) {
      const map = generateActMap(`d1-test-${i}`, 1);
      for (const node of map.rows[1].nodes) expect(node.type).not.toBe('elite');
      for (const node of map.rows[2].nodes) expect(node.type).not.toBe('elite');
    }
  });

  it('body nodes are only valid body types', () => {
    const map = generateActMap('body-types', 1);
    const bodyTypes = new Set(['combat', 'elite', 'rest', 'shop', 'anomaly']);
    for (let ri = 2; ri <= 12; ri++) {
      for (const node of map.rows[ri].nodes) {
        expect(bodyTypes.has(node.type)).toBe(true);
      }
    }
  });
});

// ─── CI: 10,000-seed stress test ──────────────────────────────────────────

describe('10,000-seed stress test', () => {
  it('all seeds produce valid maps', () => {
    // Each generated map must satisfy all structural + diversity invariants.
    for (let i = 0; i < 10000; i++) {
      const map = generateActMap(`stress-${i}`, 1);
      validateMap(map);
    }
  }, 60_000); // 60-second timeout — pure computation, typically finishes in ~5s
});

// ─── getAvailableNodes ─────────────────────────────────────────────────────

describe('getAvailableNodes', () => {
  it('returns row-2 nodes when currentNodeId is null', () => {
    const map = generateActMap('available-null', 1);
    const available = getAvailableNodes(map, null);
    // Entry (r1n0) connects to all 3 row-2 nodes.
    expect(available.length).toBe(3);
    for (const node of available) {
      expect(node.row).toBe(2);
      expect(node.type).toBe('combat');
    }
  });

  it('returns outgoing neighbors of the current node', () => {
    const map = generateActMap('available-current', 1);
    const row2Node = map.rows[1].nodes[0];
    const available = getAvailableNodes(map, row2Node.id);
    const index = buildNodeIndex(map);
    const expected = row2Node.outgoingEdges.map(id => index.get(id)!);
    expect(available).toEqual(expected);
  });

  it('excludes already-visited nodes', () => {
    const map = generateActMap('available-visited', 1);
    const row2Node = map.rows[1].nodes[0];
    if (row2Node.outgoingEdges.length < 2) return; // skip if only 1 outgoing

    // Visit the first outgoing neighbor.
    const firstOutId = row2Node.outgoingEdges[0];
    const updatedMap = visitNode(map, firstOutId);
    const available = getAvailableNodes(updatedMap, row2Node.id);
    const availableIds = available.map(n => n.id);
    expect(availableIds).not.toContain(firstOutId);
  });
});

// ─── visitNode ────────────────────────────────────────────────────────────

describe('visitNode', () => {
  it('marks the target node as visited', () => {
    const map = generateActMap('visit-test', 1);
    const node = map.rows[1].nodes[0];
    expect(node.visited).toBe(false);

    const updated = visitNode(map, node.id);
    const index = buildNodeIndex(updated);
    expect(index.get(node.id)!.visited).toBe(true);
  });

  it('does not mutate the original map', () => {
    const map = generateActMap('visit-immutable', 1);
    const node = map.rows[1].nodes[0];
    visitNode(map, node.id);
    expect(node.visited).toBe(false);
  });

  it('only marks the target node, not others in same row', () => {
    const map = generateActMap('visit-selective', 1);
    const row2 = map.rows[1].nodes;
    if (row2.length < 2) return;

    const target = row2[0];
    const other = row2[1];
    const updated = visitNode(map, target.id);
    const index = buildNodeIndex(updated);
    expect(index.get(target.id)!.visited).toBe(true);
    expect(index.get(other.id)!.visited).toBe(false);
  });
});

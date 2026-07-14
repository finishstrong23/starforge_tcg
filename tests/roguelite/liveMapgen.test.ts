/**
 * Stress suite for the LIVE map generator (src/dungeon/engine/mapgen.ts).
 *
 * Rail topology: each act offers 4 parallel rails (fixed chains of 9 rooms)
 * into one shared boss. Every rail in an act carries the SAME room multiset
 * in a different seeded order, so all routes are exactly equal in fights,
 * elites, and rewards — the old branching map could produce routes that
 * reached the boss with a single fight and no elite.
 */

import { generateActMap, getAvailableNodes, visitNode } from '../../src/dungeon/engine/mapgen';
import type { ActMap, MapNode } from '../../src/dungeon/types';

const ACTS = [1, 2, 3] as const;
const STRESS_SEEDS = 3000;
const RAILS = 4;
const BOSS_ROW = 9;
const REST_ROW = 8;
const ELITE_MIN_ROW = 3;
const ELITE_MAX_ROW = 6;

/** Expected per-rail middle composition (rows 1-7). */
const EXPECTED_MIDDLE: Record<1 | 2 | 3, Record<string, number>> = {
  1: { combat: 2, elite: 1, rest: 1, shop: 1, event: 1, treasure: 1 },
  2: { combat: 3, elite: 1, shop: 1, event: 1, treasure: 1 },
  3: { combat: 2, elite: 2, shop: 1, event: 1, treasure: 1 },
};

/** Guaranteed fights (combat + elite) before the boss, incl. the opener. */
const EXPECTED_FIGHTS: Record<1 | 2 | 3, number> = { 1: 4, 2: 5, 3: 5 };

function rail(map: ActMap, col: number): MapNode[] {
  return map.nodes
    .filter((n) => n.col === col && n.type !== 'boss')
    .sort((a, b) => a.row - b.row);
}

describe(`live mapgen — ${STRESS_SEEDS}-seed rail stress`, () => {
  it('every seed produces four equal, valid rails into one boss', () => {
    // Plain-boolean checks in the hot loop; a single assertion at the end.
    const failures: string[] = [];
    for (let i = 0; i < STRESS_SEEDS && failures.length < 10; i++) {
      const seed = `stress-${i}`;
      for (const act of ACTS) {
        const map = generateActMap(act, seed);
        const label = `${seed}/act${act}`;

        // Structure: 4 rails x 9 rooms + 1 boss = 37 unique nodes.
        if (map.nodes.length !== 37) failures.push(`${label}: ${map.nodes.length} nodes`);
        if (new Set(map.nodes.map((n) => n.id)).size !== 37) failures.push(`${label}: duplicate ids`);

        const bosses = map.nodes.filter((n) => n.type === 'boss');
        if (bosses.length !== 1 || bosses[0].row !== BOSS_ROW) failures.push(`${label}: bad boss`);

        for (let col = 0; col < RAILS; col++) {
          const rooms = rail(map, col);
          if (rooms.length !== 9) { failures.push(`${label}: rail ${col} has ${rooms.length} rooms`); continue; }

          // Shape: combat opener, pre-boss rest, chain edges only.
          if (rooms[0].type !== 'combat' || rooms[0].row !== 0) failures.push(`${label}: rail ${col} opener`);
          if (rooms[8].type !== 'rest' || rooms[8].row !== REST_ROW) failures.push(`${label}: rail ${col} rest`);
          for (let r = 0; r < rooms.length; r++) {
            const expectedNext = r < rooms.length - 1 ? rooms[r + 1].id : bosses[0]?.id;
            if (rooms[r].connections.length !== 1 || rooms[r].connections[0] !== expectedNext) {
              failures.push(`${label}: rail ${col} row ${r} edges ${rooms[r].connections.join(',')}`);
            }
          }

          // Composition: exact multiset per rail (identical routes).
          const middle = rooms.filter((n) => n.row >= 1 && n.row <= 7);
          const counts: Record<string, number> = {};
          for (const n of middle) counts[n.type] = (counts[n.type] ?? 0) + 1;
          if (JSON.stringify(counts, Object.keys(counts).sort()) !== JSON.stringify(EXPECTED_MIDDLE[act], Object.keys(EXPECTED_MIDDLE[act]).sort())) {
            failures.push(`${label}: rail ${col} composition ${JSON.stringify(counts)}`);
          }

          // Elites confined to the middle window; a pair is never adjacent.
          const eliteRows = middle.filter((n) => n.type === 'elite').map((n) => n.row);
          if (eliteRows.some((r) => r < ELITE_MIN_ROW || r > ELITE_MAX_ROW)) {
            failures.push(`${label}: rail ${col} elite outside window (${eliteRows.join(',')})`);
          }
          if (eliteRows.length === 2 && Math.abs(eliteRows[0] - eliteRows[1]) < 2) {
            failures.push(`${label}: rail ${col} adjacent elites`);
          }

          // The user-facing guarantee: minimum fights before the boss.
          const fights = rooms.filter((n) => n.type === 'combat' || n.type === 'elite').length;
          if (fights !== EXPECTED_FIGHTS[act]) {
            failures.push(`${label}: rail ${col} has ${fights} fights, want ${EXPECTED_FIGHTS[act]}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('rails within an act differ in ordering (sequencing is a real choice)', () => {
    let identicalPairs = 0;
    let comparisons = 0;
    for (let i = 0; i < 200; i++) {
      const map = generateActMap(1, `order-${i}`);
      const orders = [0, 1, 2, 3].map((c) => rail(map, c).map((n) => n.type).join(','));
      for (let a = 0; a < orders.length; a++) {
        for (let b = a + 1; b < orders.length; b++) {
          comparisons++;
          if (orders[a] === orders[b]) identicalPairs++;
        }
      }
    }
    // Occasional coincidental duplicates are fine; wholesale sameness is not.
    expect(identicalPairs / comparisons).toBeLessThan(0.2);
  });

  it('ascension extraElites converts a combat on EVERY rail', () => {
    for (let i = 0; i < 50; i++) {
      const base = generateActMap(1, `elite-${i}`, 0);
      const harder = generateActMap(1, `elite-${i}`, 1);
      for (let col = 0; col < RAILS; col++) {
        const count = (m: ActMap, t: string) => rail(m, col).filter((n) => n.type === t).length;
        expect(count(harder, 'elite')).toBe(count(base, 'elite') + 1);
        expect(count(harder, 'combat')).toBe(count(base, 'combat') - 1);
      }
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

  it('offers the four rail openers before the first move', () => {
    const starts = getAvailableNodes(map, null);
    expect(starts).toHaveLength(4);
    expect(starts.every((n) => n.row === 0 && n.type === 'combat')).toBe(true);
  });

  it('commits the player to the chosen rail: exactly one next room', () => {
    const start = map.nodes.find((n) => n.row === 0)!;
    let m = visitNode(map, start.id);
    let currentId = start.id;
    for (let step = 0; step < 9; step++) {
      const next = getAvailableNodes(m, currentId);
      expect(next).toHaveLength(1);           // no branching after committing
      expect(next[0].col === start.col || next[0].type === 'boss').toBe(true);
      m = visitNode(m, next[0].id);
      currentId = next[0].id;
    }
    expect(m.completed).toBe(true);           // ninth step lands on the boss
  });

  it('visitNode marks progress immutably and completes on the boss', () => {
    const boss = map.nodes.find((n) => n.type === 'boss')!;
    const done = visitNode(map, boss.id);
    expect(done.completed).toBe(true);
    expect(map.completed).toBe(false); // original untouched
  });
});

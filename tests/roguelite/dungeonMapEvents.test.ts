import { generateActMap, getAvailableNodes, visitNode } from '../../src/dungeon/engine/mapgen';
import type { ActMap, MapNode } from '../../src/dungeon/types';

function bodyNodes(map: ActMap): MapNode[] {
  return map.nodes.filter((node) => node.row >= 1 && node.row <= 7);
}

function reachableIds(map: ActMap): Set<string> {
  const starts = getAvailableNodes(map, null);
  const reachable = new Set<string>();
  const stack = starts.map((node) => node.id);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const node = map.nodes.find((n) => n.id === id);
    if (!node) continue;
    for (const next of node.connections) stack.push(next);
  }
  return reachable;
}

describe('Phase 4 dungeon event nodes', () => {
  it('adds exactly two event nodes to each act middle without changing slot count', () => {
    for (const act of [1, 2, 3] as const) {
      const map = generateActMap(act, 'phase-4-events');
      const middle = bodyNodes(map);
      expect(middle).toHaveLength(28);
      // One event per rail — every route sees exactly one event room.
      expect(middle.filter((node) => node.type === 'event')).toHaveLength(4);
    }
  });

  it('keeps events out of start, rest, and boss rows', () => {
    const map = generateActMap(1, 'event-placement');
    for (const node of map.nodes.filter((n) => n.type === 'event')) {
      expect(node.row).toBeGreaterThanOrEqual(1);
      expect(node.row).toBeLessThanOrEqual(7);
    }
    expect(map.nodes.filter((node) => node.row === 0).every((node) => node.type === 'combat')).toBe(true);
    expect(map.nodes.filter((node) => node.row === 8).every((node) => node.type === 'rest')).toBe(true);
    expect(map.nodes.filter((node) => node.row === 9).every((node) => node.type === 'boss')).toBe(true);
  });

  it('event nodes remain reachable from the start choices', () => {
    const map = generateActMap(2, 'event-reachability');
    const reachable = reachableIds(map);
    const eventIds = map.nodes.filter((node) => node.type === 'event').map((node) => node.id);

    expect(eventIds.length).toBeGreaterThan(0);
    for (const id of eventIds) expect(reachable.has(id)).toBe(true);
  });

  it('visiting an event node marks it as current and visited', () => {
    const map = generateActMap(3, 'event-visit');
    const event = map.nodes.find((node) => node.type === 'event');
    expect(event).toBeDefined();

    const updated = visitNode(map, event!.id);
    const visited = updated.nodes.find((node) => node.id === event!.id);

    expect(updated.currentNodeId).toBe(event!.id);
    expect(visited?.visited).toBe(true);
    expect(updated.completed).toBe(false);
  });
});

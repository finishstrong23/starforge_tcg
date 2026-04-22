// Map state types. Finalised by Phase 3 (map generator) to match the
// output shape of map-generation-algorithm.md. Row/node structure mirrors
// the MapGraph → Row → Node types from the spec.

export type NodeType =
  | 'combat'    // standard monster fight
  | 'elite'     // hard fight, better rewards
  | 'rest'      // heal or upgrade
  | 'shop'      // buy cards, relics, potions
  | 'anomaly'   // event / choice room
  | 'boss'      // act boss
  | 'entry';    // row-1 entry marker

export interface MapNode {
  id: string;               // stable within a map, e.g. "r7n2"
  row: number;              // 1..15 (1-indexed, matches spec)
  x: number;                // 0.0..1.0 horizontal position
  type: NodeType;
  outgoingEdges: string[];  // IDs of nodes in the next row this connects to
  visited: boolean;
  meta?: Record<string, unknown>;
}

export interface MapRow {
  index: number;    // 1..15 (matches node.row)
  nodes: MapNode[];
}

export interface ActMap {
  actNumber: 1 | 2 | 3;
  // Hex representation of the numeric seed used to generate this map.
  // Stored so the graph can be regenerated identically on load without
  // persisting the full edge list (per implementation note #5 in the spec).
  actSeed: string;
  rows: MapRow[];
  completed: boolean;
}

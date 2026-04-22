// Map state types. Phase 2 defines the shape needed for persistence to
// round-trip; Phase 3 (map generator) populates this with real data
// derived from the map-generation-algorithm.md spec. Keep fields loose
// enough that the Phase 3 port of map_generator_reference.py can fill
// them without further shape changes.

export type NodeType =
  | 'combat'       // standard monster fight
  | 'elite'        // hard fight, better rewards
  | 'rest'         // heal or upgrade
  | 'shop'         // buy cards, relics, potions
  | 'anomaly'      // design-doc term for event/choice rooms
  | 'boss'         // act boss
  | 'entry'        // row-0 entry point (always combat per design)
  | 'treasure';    // mid-act chest (if the map spec adds it)

export interface MapNode {
  id: string;                   // unique within a RunState across all acts
  actNumber: 1 | 2 | 3;
  row: number;                  // 0..11 for 12 steps per act
  col: number;                  // column within row (variable)
  type: NodeType;
  visited: boolean;
  connections: string[];        // ids of next-row nodes this connects to
  // Optional metadata filled in by Phase 3 (enemy template, anomaly id,
  // shop seed, etc.). Kept as a loose record so Phase 2 doesn't have to
  // know the map spec yet.
  meta?: Record<string, unknown>;
}

export interface ActMap {
  actNumber: 1 | 2 | 3;
  // Deterministic seed string used to generate this map. Derived from
  // RunState.seed; preserved so the generator can be re-run and the
  // exact same map is reproduced.
  actSeed: string;
  nodes: MapNode[];
  completed: boolean;
}

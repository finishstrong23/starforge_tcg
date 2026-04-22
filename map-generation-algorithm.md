# Map Generation Algorithm — Formal Specification

*STS-style procedural graph generation for the Shattered Reach. Source of truth for the map system. Claude Code consumes this directly.*

## Deliverable goals

1. **Every map is a unique branching graph** of 15 rows, entry to boss.
2. **No two runs ever produce identical maps**, up to cryptographic near-certainty.
3. **Every generated map is a valid, playable graph** — no dead ends, no unreachable rooms, no missing path to the boss.
4. **Maps feel STS-style** — 2-4 nodes per row, scattered rests and anomalies, varied routes with different risk/reward characters.
5. **Maps are deterministic from a seed** — the same seed always produces the same map, for replay, daily runs, and leaderboards.

## Core design principles

- **Visible variance** — each run's map is distinct enough that players recognize it as different from the last.
- **Readable routes** — 3-5 viable paths from entry to boss should be traceable at a glance.
- **Meaningful choices** — every step offers 2-4 options with distinct risk/reward.
- **Decision density over combat density** — combat is the baseline; rests, anomalies, and shops are the decision layer.

## Graph shape

Each act is a directed acyclic graph of 15 rows.

| Row | Purpose | Node count | Forced contents |
|-----|---------|------------|-----------------|
| 1 | Entry marker | 1 | Start (not a room) |
| 2 | First choice | 3 | All Combat (intro teaching) |
| 3 | Body | 2-4 random | Weighted roll |
| 4 | Body | 2-4 random | Weighted roll |
| 5 | Body | 2-4 random | Weighted roll |
| 6 | Body | 2-4 random | Weighted roll |
| 7 | Body | 2-4 random | Weighted roll |
| 8 | Body | 2-4 random | Weighted roll |
| 9 | Body | 2-4 random | Weighted roll |
| 10 | Body | 2-4 random | Weighted roll |
| 11 | Body | 2-4 random | Weighted roll |
| 12 | Body | 2-4 random | Weighted roll |
| 13 | Pre-boss convergence | 2-3 random | Weighted roll |
| 14 | Forced Rest | 1 | Rest (pre-boss) |
| 15 | Boss | 1 | Act boss |

**Hard cap:** no row ever exceeds 4 nodes. Matches STS2 readability.

**Total per act:** roughly 35-45 nodes. A single run traverses 14 of them (one per rows 2-13, plus rest, plus boss).

## Room type weights

Every body node (rows 3-13) rolls a room type by weighted random draw. Weights are flat across rows — no row-depth gating — so every kind of node can appear anywhere.

| Type | Weight |
|------|--------|
| Combat | 35 |
| Anomaly | 22 |
| Rest | 18 |
| Shop | 12 |
| Elite | 13 |
| **Total** | 100 |

Effect of these weights on a typical run: of 12 body rows × ~3 nodes each ≈ 36 body nodes, you'll see roughly 13 Combat, 8 Anomaly, 6 Rest, 4 Shop, 5 Elite. A player picks 11 of these to traverse. If they route carefully, they can often hit 2-3 rests and 2 shops per act without being forced through an elite.

## Connection rules

After nodes are placed, edges are generated connecting row N to row N+1. The algorithm builds edges to satisfy all of the following constraints:

**C1. Every node in rows 2-13 must have at least one incoming edge** (reachable from entry).

**C2. Every node in rows 2-13 must have at least one outgoing edge** (reaches a next row).

**C3. Edges never cross.** If row N has nodes at horizontal positions `x1 < x2` and row N+1 has nodes at positions `y1 < y2`, then an edge from `x1 → y2` cannot coexist with an edge from `x2 → y1`. This prevents the visual spaghetti that makes STS-style maps unreadable.

**C4. Every node may connect to 1-3 nodes in the next row.** Most nodes fan to 2. Nodes at the edges of a row typically have fewer options.

**C5. Every node in the next row has 1-3 incoming edges.** The graph converges and diverges naturally.

**C6. Row 14 (forced Rest) is reached by all edges from row 13.** Every row-13 node connects to the single Rest node.

**C7. Row 15 (boss) is reached by the single row-14 Rest node only.** One edge, Rest → Boss.

**C8. No orphan nodes.** If a placement + edge roll produces an unreachable node, the algorithm backtracks and regenerates that row.

## Run-level diversity constraints

Beyond per-map uniqueness, the generator enforces soft constraints to keep every run feeling fresh even across a long play session:

**D1. No Elite appears in row 2 or 3** of any act. Players need warmup.

**D2. At least 2 Rests appear somewhere in rows 3-13.** If the raw weighted roll produces fewer than 2 rests, one random Combat is promoted to Rest.

**D3. At least 1 Shop appears somewhere in rows 3-13.** Same promotion rule.

**D4. At least 3 Anomalies appear somewhere in rows 3-13.** Same promotion rule.

**D5. No two Elites in adjacent rows if there's only one viable path between them.** This prevents forced-elite-gauntlet maps. If adjacent-row elites would be on the same singleton path, one becomes a Combat.

## Seed and determinism

### Seed derivation

Each map is generated from a 64-bit seed composed as:

```
mapSeed = hash(runId, actNumber)
```

Where:
- `runId` is a unique 128-bit UUID generated once at run start. Sources: `crypto.randomUUID()` in-browser, or `Date.now() + user-id + random_bytes` for servers. This guarantees cryptographic uniqueness — the probability of two runs ever sharing a `runId` across all players, across all time, is effectively zero.
- `actNumber` is 1, 2, or 3.
- `hash` is a fast 64-bit hash (xxHash64 or SplitMix64 — both are deterministic, uniform, and cheap).

The same `runId` across resume (save → close → reopen) produces the same map. A new run always generates a new `runId`, always produces a new map.

### Daily seed override

For daily runs (all players share the same map today), `runId` is replaced by `hash(dateString_YYYY-MM-DD, "daily")`. All players entering the daily run on a given date get identical maps — necessary for leaderboard parity.

### RNG inside generation

Once the `mapSeed` is fixed, all randomness in map generation uses a single deterministic PRNG seeded with `mapSeed`. Recommended: **SplitMix64** for 64-bit state, or **Mulberry32** for 32-bit if simpler. Never use `Math.random()` — it's non-deterministic across implementations.

Every random choice in the algorithm — row widths, node type rolls, edge choices — pulls from this PRNG. This guarantees determinism: same seed → identical map, every single time.

## Generation algorithm

Stepwise procedure. Implement in this order.

### Phase 1: place nodes per row

```
for row = 1 to 15:
    if row == 1:
        place 1 Entry node centered at x = 0.5
    elif row == 2:
        place 3 nodes at x = [0.25, 0.5, 0.75], all type = Combat
    elif row == 14:
        place 1 Rest node centered at x = 0.5
    elif row == 15:
        place 1 Boss node centered at x = 0.5
    elif row == 13:
        count = random 2-3
        place count nodes evenly spaced, then apply horizontal jitter ±0.04
    else:  // rows 3-12
        count = random 2-4
        place count nodes evenly spaced, then apply horizontal jitter ±0.04
```

Horizontal jitter breaks perfect grid alignment so the map feels organic.

### Phase 2: roll room types for body nodes (rows 3-13)

```
for each body node:
    roll = weighted random (Combat=35, Anomaly=22, Rest=18, Shop=12, Elite=13)
    assign roll as the node's type
```

### Phase 3: apply diversity constraints

```
check D1: any Elite in rows 2 or 3? demote to Combat.
check D2: fewer than 2 Rests in rows 3-13? promote random Combats until 2+ Rests.
check D3: fewer than 1 Shop in rows 3-13? promote random Combat to Shop.
check D4: fewer than 3 Anomalies in rows 3-13? promote random Combats until 3+ Anomalies.
check D5: any adjacent-row Elites sharing a singleton path? demote second Elite.
```

### Phase 4: build edges

For each row N from 1 to 14, connect nodes in row N to nodes in row N+1.

```
for each node in row N:
    outgoing_count = random 1-3, capped to nodes_available_in_N+1
    select the next-row nodes by horizontal proximity (closest first)
    add edges, but reject any edge that would violate C3 (no-cross)
    if rejection leaves the node with 0 edges, force a single edge to the closest next-row node
```

Special cases:
- Row 13 → Row 14: all row-13 nodes connect to the single Rest node.
- Row 14 → Row 15: one edge, Rest → Boss.

### Phase 5: validate and repair

```
run a reachability check from Entry to Boss over the built graph.
any node in rows 2-13 with 0 incoming edges? force-add an edge from the closest previous-row node.
any node in rows 2-13 with 0 outgoing edges? force-add an edge to the closest next-row node.
validate: is the Boss reachable from Entry? (must be true; if false, regenerate from Phase 4.)
```

### Phase 6: return graph

Output data structure:

```typescript
type MapGraph = {
  actNumber: 1 | 2 | 3
  seed: string  // hex representation of mapSeed
  rows: Row[]
}

type Row = {
  index: number  // 1 to 15
  nodes: Node[]
}

type Node = {
  id: string  // stable within map, e.g. "r7n2"
  row: number
  x: number  // 0.0 to 1.0, horizontal position
  type: 'entry' | 'combat' | 'elite' | 'rest' | 'shop' | 'anomaly' | 'boss'
  outgoingEdges: string[]  // node IDs in next row
}
```

## Uniqueness analysis

### Why maps are effectively never duplicated

The `runId` is a 128-bit UUID. The probability that two separately-generated `runId`s collide is ~1 in 2^128. Across a billion runs per day for ten thousand years, expected collision count is still essentially zero.

Separately: the *space* of possible maps is enormous. A rough lower bound:

- Each of 11 body rows (3-13) has 3 possible node counts (2/3/4): 3^11 = 177,147 combinations just for row widths
- Each body node has 5 possible types with non-uniform weights: ~5^36 ≈ 1.5 × 10^25 combinations of typed nodes
- Edge configurations add another ~10^10+ variations per typed graph

Even accounting for diversity constraints collapsing some of that space, the realistic count of distinct valid maps is well above 10^30. Two random seeds producing structurally identical maps is astronomically unlikely.

### Determinism with uniqueness

The guarantee stack:
- **Unique seed per run** (runId is a 128-bit UUID, cryptographically random)
- **Seed → map is deterministic** (SplitMix64 / xxHash64)
- **Therefore:** two runs produce different maps with probability ≈ 1 − 2^-128

This is the strongest guarantee a procedurally-generated roguelite can make. Players will never see the same map twice, at any scale, across any playerbase.

## Balance levers for playtest

Five values the designer tunes during balance:

1. **Room type weights** (Combat=35, Anomaly=22, Rest=18, Shop=12, Elite=13). Fewer elites? Decrease from 13. More shops? Increase from 12.
2. **Row width distribution** (currently 2-4 uniform). Shift toward wider middle rows? Use triangular distribution (more 3s than 2s or 4s in rows 6-9).
3. **Diversity minimums** (2 Rests, 1 Shop, 3 Anomalies per act). Tune for run length feel.
4. **Edge density** (1-3 outgoing per node). Fewer edges = more constrained routes.
5. **Jitter magnitude** (±0.04 horizontal). More jitter = organic feel, less = grid-like.

All levers should live in a single config file so designers can tune without touching the algorithm.

## Claude Code implementation notes

1. **Use a single PRNG instance per map generation.** Seed it from `mapSeed`, run all rolls through it. Do not create new PRNG instances mid-generation — reproducibility will break.

2. **SplitMix64 is the recommended PRNG.** ~20 lines of TypeScript. Fast, passes statistical tests, deterministic across all platforms. Do not use `Math.random()`.

3. **Store the `mapSeed` with the run state.** This lets the map be regenerated identically on load. You do not need to serialize the full graph if seed + act number are stored — you can regenerate on demand.

4. **Validate on generation, not on load.** Run the Phase 5 validation immediately after Phase 4. If the map is malformed, regenerate (with a derived seed like `mapSeed + 1`) rather than crashing. Cap retries at 10 — if 10 retries all fail, the algorithm has a bug and the game should surface an error.

5. **Do not persist edge lists in save state.** Persist `runId`, `actNumber`, and `visitedNodes: string[]`. On load, regenerate the graph from the seed and overlay visited state. This keeps save state tiny and guarantees the map is correct.

6. **Test with 10,000 random seeds as a CI gate.** Every seed must produce a valid map (boss reachable, all nodes reachable, no orphans, all diversity constraints satisfied). If any seed fails, the algorithm has a bug. Add this as a unit test in the repo.

## Reference implementation

A Python reference implementation is provided at `map-generator-reference.py`. Claude Code should port it to TypeScript, preserving the algorithm exactly. The Python reference is runnable and produces ASCII visualizations so you can eyeball maps before trusting the port.

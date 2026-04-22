"""
Shattered Reach — Map Generation Reference Implementation
==========================================================

This is the source-of-truth reference for Claude Code to port to TypeScript.
Runnable. Deterministic. Produces ASCII visualizations for eyeball testing.

Usage:
    python map_generator_reference.py             # random seed
    python map_generator_reference.py --seed 42   # specific seed
    python map_generator_reference.py --test      # validate 10,000 seeds
"""

import argparse
import sys
import uuid
import hashlib
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


# ============================================================================
# PRNG — SplitMix64
# ============================================================================
# 64-bit deterministic PRNG. Seed it once per map; all rolls pull from it.
# Do NOT use Python's random module — we need platform-identical results with TS.

class SplitMix64:
    def __init__(self, seed: int):
        self.state = seed & 0xFFFFFFFFFFFFFFFF

    def next_u64(self) -> int:
        self.state = (self.state + 0x9E3779B97F4A7C15) & 0xFFFFFFFFFFFFFFFF
        z = self.state
        z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & 0xFFFFFFFFFFFFFFFF
        z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & 0xFFFFFFFFFFFFFFFF
        return z ^ (z >> 31)

    def rand_float(self) -> float:
        return self.next_u64() / (1 << 64)

    def rand_int(self, lo: int, hi: int) -> int:
        """Inclusive on both ends."""
        return lo + int(self.rand_float() * (hi - lo + 1))

    def weighted_pick(self, items: List, weights: List[int]) -> any:
        total = sum(weights)
        roll = self.rand_float() * total
        acc = 0
        for item, w in zip(items, weights):
            acc += w
            if roll < acc:
                return item
        return items[-1]


# ============================================================================
# Data types
# ============================================================================

class RoomType(Enum):
    ENTRY = 'entry'
    COMBAT = 'combat'
    ELITE = 'elite'
    REST = 'rest'
    SHOP = 'shop'
    ANOMALY = 'anomaly'
    BOSS = 'boss'


@dataclass
class Node:
    id: str
    row: int
    x: float
    type: RoomType
    outgoing: List[str] = field(default_factory=list)


@dataclass
class MapGraph:
    act_number: int
    seed: int
    rows: List[List[Node]]


# ============================================================================
# Configuration
# ============================================================================

TOTAL_ROWS = 15
ROW_BODY_START = 3
ROW_BODY_END = 13  # inclusive
ROW_PRE_BOSS_REST = 14
ROW_BOSS = 15

# Room type weights — total should be 100 for readability
ROOM_WEIGHTS = {
    RoomType.COMBAT: 35,
    RoomType.ANOMALY: 22,
    RoomType.REST: 18,
    RoomType.SHOP: 12,
    RoomType.ELITE: 13,
}

# Diversity minimums per act
MIN_RESTS = 2
MIN_SHOPS = 1
MIN_ANOMALIES = 3

JITTER_MAGNITUDE = 0.04
MAX_EDGES_PER_NODE = 3
MAX_RETRIES = 10


# ============================================================================
# Seed derivation
# ============================================================================

def derive_seed(run_id: str, act_number: int) -> int:
    """Map seed from runId + actNumber. Uses SHA-256 for hashing then truncates to 64 bits."""
    key = f'{run_id}|act{act_number}'.encode('utf-8')
    digest = hashlib.sha256(key).digest()
    return int.from_bytes(digest[:8], byteorder='big')


def daily_seed(date_str: str) -> str:
    """For daily runs, all players share one runId derived from date."""
    return f'daily-{date_str}'


# ============================================================================
# Phase 1: place nodes per row
# ============================================================================

def place_nodes(prng: SplitMix64) -> List[List[Node]]:
    rows: List[List[Node]] = [[] for _ in range(TOTAL_ROWS)]

    # Row 1: entry
    rows[0] = [Node(id='r1n0', row=1, x=0.5, type=RoomType.ENTRY)]

    # Row 2: 3 combat nodes
    for i, x in enumerate([0.25, 0.5, 0.75]):
        rows[1].append(Node(id=f'r2n{i}', row=2, x=x, type=RoomType.COMBAT))

    # Rows 3-12: 2-4 nodes per row
    for row_idx in range(ROW_BODY_START, ROW_BODY_END):  # 3..12
        count = prng.rand_int(2, 4)
        for i in range(count):
            base_x = (i + 1) / (count + 1)
            jitter = (prng.rand_float() - 0.5) * 2 * JITTER_MAGNITUDE
            x = max(0.05, min(0.95, base_x + jitter))
            rows[row_idx - 1].append(
                Node(id=f'r{row_idx}n{i}', row=row_idx, x=x, type=RoomType.COMBAT)
            )

    # Row 13: 2-3 nodes (pre-boss convergence)
    count = prng.rand_int(2, 3)
    for i in range(count):
        base_x = (i + 1) / (count + 1)
        jitter = (prng.rand_float() - 0.5) * 2 * JITTER_MAGNITUDE
        x = max(0.1, min(0.9, base_x + jitter))
        rows[12].append(Node(id=f'r13n{i}', row=13, x=x, type=RoomType.COMBAT))

    # Row 14: forced rest
    rows[13] = [Node(id='r14n0', row=14, x=0.5, type=RoomType.REST)]

    # Row 15: boss
    rows[14] = [Node(id='r15n0', row=15, x=0.5, type=RoomType.BOSS)]

    # Sort each row by x so edge crossing checks work
    for r in rows:
        r.sort(key=lambda n: n.x)

    return rows


# ============================================================================
# Phase 2: roll room types for body nodes
# ============================================================================

def roll_room_types(prng: SplitMix64, rows: List[List[Node]]):
    types = list(ROOM_WEIGHTS.keys())
    weights = list(ROOM_WEIGHTS.values())

    for row_idx in range(ROW_BODY_START - 1, ROW_BODY_END):  # 2..12 (0-indexed)
        if row_idx == 1:  # Row 2: forced all-combat
            continue
        for node in rows[row_idx]:
            node.type = prng.weighted_pick(types, weights)


# ============================================================================
# Phase 3: diversity constraints
# ============================================================================

def apply_diversity_constraints(prng: SplitMix64, rows: List[List[Node]]):
    # D1: no elite in rows 2 or 3
    for row_idx in [1, 2]:
        for node in rows[row_idx]:
            if node.type == RoomType.ELITE:
                node.type = RoomType.COMBAT

    # D2, D3, D4: minimum counts
    def count_type(t: RoomType) -> int:
        return sum(
            1
            for row_idx in range(ROW_BODY_START - 1, ROW_BODY_END)
            for node in rows[row_idx]
            if node.type == t
        )

    def promote_combats_to(target_type: RoomType, min_count: int):
        shortfall = min_count - count_type(target_type)
        if shortfall <= 0:
            return
        candidates = [
            node
            for row_idx in range(ROW_BODY_START - 1, ROW_BODY_END)
            for node in rows[row_idx]
            if node.type == RoomType.COMBAT
        ]
        prng_shuffle(prng, candidates)
        for i in range(min(shortfall, len(candidates))):
            candidates[i].type = target_type

    promote_combats_to(RoomType.REST, MIN_RESTS)
    promote_combats_to(RoomType.SHOP, MIN_SHOPS)
    promote_combats_to(RoomType.ANOMALY, MIN_ANOMALIES)

    # D5: no adjacent-row elites on singleton path — simplified check:
    # if a row has only one elite and the next row has only one elite and both rows have <=2 nodes,
    # demote the second.
    for row_idx in range(ROW_BODY_START - 1, ROW_BODY_END - 1):
        curr_elites = [n for n in rows[row_idx] if n.type == RoomType.ELITE]
        next_elites = [n for n in rows[row_idx + 1] if n.type == RoomType.ELITE]
        if (
            len(curr_elites) == 1
            and len(next_elites) == 1
            and len(rows[row_idx]) <= 2
            and len(rows[row_idx + 1]) <= 2
        ):
            next_elites[0].type = RoomType.COMBAT


def prng_shuffle(prng: SplitMix64, arr: List):
    """In-place Fisher-Yates shuffle with our PRNG."""
    for i in range(len(arr) - 1, 0, -1):
        j = prng.rand_int(0, i)
        arr[i], arr[j] = arr[j], arr[i]


# ============================================================================
# Phase 4: build edges
# ============================================================================

def build_edges(prng: SplitMix64, rows: List[List[Node]]):
    for row_idx in range(TOTAL_ROWS - 1):
        curr_row = rows[row_idx]
        next_row = rows[row_idx + 1]

        if not curr_row or not next_row:
            continue

        # Special cases
        if row_idx + 1 == ROW_PRE_BOSS_REST - 1 + 1:  # row 13 → row 14 (rest)
            rest_node = next_row[0]
            for node in curr_row:
                node.outgoing = [rest_node.id]
            continue

        if row_idx + 1 == ROW_BOSS - 1:  # row 14 (rest) → row 15 (boss)
            boss_node = next_row[0]
            curr_row[0].outgoing = [boss_node.id]
            continue

        if len(curr_row) == 1:
            # Single node — connect to 1-3 next-row nodes
            count = min(prng.rand_int(1, MAX_EDGES_PER_NODE), len(next_row))
            targets = sorted(next_row, key=lambda n: abs(n.x - curr_row[0].x))[:count]
            targets.sort(key=lambda n: n.x)
            curr_row[0].outgoing = [n.id for n in targets]
            continue

        # General case: each node picks 1-3 next-row targets by proximity, avoiding crosses.
        for i, node in enumerate(curr_row):
            desired = prng.rand_int(1, MAX_EDGES_PER_NODE)
            desired = min(desired, len(next_row))

            # Candidate next-row nodes, closest first by x-distance
            candidates = sorted(next_row, key=lambda n: abs(n.x - node.x))

            chosen: List[Node] = []
            for cand in candidates:
                if len(chosen) >= desired:
                    break
                # Check crossing: any edge (prev_node, prev_target) where prev_node.x < node.x
                # but prev_target.x > cand.x would cross our new edge.
                if not would_cross(curr_row, i, cand, rows):
                    chosen.append(cand)

            if not chosen:
                # Force one edge to the single closest node
                chosen = [candidates[0]]

            chosen.sort(key=lambda n: n.x)
            node.outgoing = [n.id for n in chosen]


def would_cross(curr_row: List[Node], node_idx: int, cand: Node, rows: List[List[Node]]) -> bool:
    """Check if adding edge from curr_row[node_idx] to cand would cross an existing edge."""
    node = curr_row[node_idx]
    next_row_idx = node.row  # row+1 is the target row, 0-indexed that's node.row (since rows are 1-indexed)
    next_row = rows[next_row_idx]
    id_to_node = {n.id: n for n in next_row}

    for i, other in enumerate(curr_row):
        if i == node_idx or not other.outgoing:
            continue
        for target_id in other.outgoing:
            target = id_to_node.get(target_id)
            if target is None:
                continue
            # Crossing: (other.x < node.x and target.x > cand.x) or (other.x > node.x and target.x < cand.x)
            if (other.x < node.x and target.x > cand.x) or (other.x > node.x and target.x < cand.x):
                return True
    return False


# ============================================================================
# Phase 5: validate and repair
# ============================================================================

def validate_and_repair(rows: List[List[Node]]) -> bool:
    all_nodes = {n.id: n for row in rows for n in row}

    # Build incoming-edge index
    incoming: dict = {nid: [] for nid in all_nodes}
    for n in all_nodes.values():
        for out in n.outgoing:
            incoming[out].append(n.id)

    # Every body node + row 13 + row 14 + row 15 must have incoming
    # Every node except boss must have outgoing
    # Repair by adding an edge to nearest previous/next row node
    for row_idx in range(1, TOTAL_ROWS):
        for node in rows[row_idx]:
            if not incoming[node.id]:
                # Force-add edge from closest previous-row node
                prev_row = rows[row_idx - 1]
                closest = min(prev_row, key=lambda n: abs(n.x - node.x))
                if node.id not in closest.outgoing:
                    closest.outgoing.append(node.id)
                    incoming[node.id].append(closest.id)

    for row_idx in range(TOTAL_ROWS - 1):
        for node in rows[row_idx]:
            if not node.outgoing:
                next_row = rows[row_idx + 1]
                closest = min(next_row, key=lambda n: abs(n.x - node.x))
                node.outgoing.append(closest.id)

    # Final reachability check: is boss reachable from entry?
    entry = rows[0][0]
    visited = set()
    stack = [entry.id]
    while stack:
        nid = stack.pop()
        if nid in visited:
            continue
        visited.add(nid)
        stack.extend(all_nodes[nid].outgoing)
    boss = rows[-1][0]
    return boss.id in visited


# ============================================================================
# Entry point
# ============================================================================

def generate_map(run_id: str, act_number: int) -> MapGraph:
    base_seed = derive_seed(run_id, act_number)

    for retry in range(MAX_RETRIES):
        seed = base_seed + retry
        prng = SplitMix64(seed)
        rows = place_nodes(prng)
        roll_room_types(prng, rows)
        apply_diversity_constraints(prng, rows)
        build_edges(prng, rows)
        if validate_and_repair(rows):
            return MapGraph(act_number=act_number, seed=seed, rows=rows)

    raise RuntimeError(f'Map generation failed after {MAX_RETRIES} retries — algorithm bug')


# ============================================================================
# ASCII visualization (eyeball-test your maps)
# ============================================================================

TYPE_SYMBOLS = {
    RoomType.ENTRY: '  START  ',
    RoomType.COMBAT: ' Combat  ',
    RoomType.ELITE: '  Elite  ',
    RoomType.REST: '  Rest   ',
    RoomType.SHOP: '  Shop   ',
    RoomType.ANOMALY: ' Anomaly ',
    RoomType.BOSS: '  BOSS   ',
}


def visualize_ascii(graph: MapGraph) -> str:
    lines = []
    lines.append(f'--- Map for Act {graph.act_number}, seed {graph.seed:016x} ---')
    lines.append('')

    WIDTH = 72
    for row_idx, row in enumerate(graph.rows):
        positions = [int(n.x * WIDTH) for n in row]
        node_line = [' '] * (WIDTH + 12)
        for n, p in zip(row, positions):
            symbol = TYPE_SYMBOLS[n.type]
            start = max(0, p - len(symbol) // 2)
            for i, c in enumerate(symbol):
                if start + i < len(node_line):
                    node_line[start + i] = c
        lines.append(f'Row {row_idx + 1:2d}: ' + ''.join(node_line).rstrip())

    # Stats
    counts = {t: 0 for t in RoomType}
    for row in graph.rows:
        for n in row:
            counts[n.type] += 1
    lines.append('')
    lines.append('Counts: ' + ', '.join(
        f'{t.value}={counts[t]}' for t in [
            RoomType.COMBAT, RoomType.ELITE, RoomType.ANOMALY, RoomType.REST, RoomType.SHOP,
        ]
    ))
    return '\n'.join(lines)


# ============================================================================
# CI validation — run 10,000 seeds, ensure all produce valid maps
# ============================================================================

def run_stress_test(n: int = 10000):
    print(f'Running stress test with {n} random seeds...')
    failures = 0
    for i in range(n):
        run_id = str(uuid.uuid4())
        try:
            g = generate_map(run_id, 1)
            # Extra check: enforce diversity constraints
            counts = {t: 0 for t in RoomType}
            for row_idx in range(ROW_BODY_START - 1, ROW_BODY_END):
                for node in g.rows[row_idx]:
                    counts[node.type] += 1
            if counts[RoomType.REST] < MIN_RESTS:
                failures += 1
                print(f'  Seed {run_id}: rest count {counts[RoomType.REST]} < {MIN_RESTS}')
            if counts[RoomType.SHOP] < MIN_SHOPS:
                failures += 1
                print(f'  Seed {run_id}: shop count {counts[RoomType.SHOP]} < {MIN_SHOPS}')
            if counts[RoomType.ANOMALY] < MIN_ANOMALIES:
                failures += 1
                print(f'  Seed {run_id}: anomaly count {counts[RoomType.ANOMALY]} < {MIN_ANOMALIES}')
        except Exception as e:
            failures += 1
            print(f'  Seed {run_id}: exception {e}')
    if failures == 0:
        print(f'PASS: all {n} seeds produced valid maps.')
    else:
        print(f'FAIL: {failures} of {n} seeds failed validation.')
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed', type=str, default=None, help='Hex seed or runId string')
    parser.add_argument('--act', type=int, default=1)
    parser.add_argument('--test', action='store_true', help='Run 10,000-seed stress test')
    args = parser.parse_args()

    if args.test:
        run_stress_test()
        return

    run_id = args.seed if args.seed else str(uuid.uuid4())
    graph = generate_map(run_id, args.act)
    print(f'runId: {run_id}')
    print(visualize_ascii(graph))


if __name__ == '__main__':
    main()

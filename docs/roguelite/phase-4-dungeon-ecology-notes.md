# Phase 4 Dungeon Ecology Notes

Last updated: May 17, 2026

## Goal

Phase 4 makes the dungeon feel like a place with memory, route identity, and non-combat consequences.

The first implementation slice makes `event` a first-class map node. This is intentionally small: before writing a large event pool, the route system, run phase routing, UI, and tests need to understand event nodes as their own kind of room.

## First Slice Shipped

- Added `event` to `NodeType`.
- Added `event` to `RunPhase`.
- Updated act map distributions to include two event nodes in each act middle.
- Added event node color, label, icon, and legend entry in `MapView`.
- Added `EventView`, a basic choice encounter with gold, heal, and risk/reward options.
- Routed event nodes through `DungeonRunContext`.
- Added `event_visited` telemetry.
- Added `tests/roguelite/dungeonMapEvents.test.ts`.

## Event Design Direction

Events should not be disguised rewards. Each event should ask a build-shaping question.

Good event choices:

- Trade current HP for long-run power.
- Trade gold for deck direction or route safety.
- Offer class-aware branches that use the current faction's resource.
- Add a curse, temporary burden, or route modifier in exchange for a meaningful prize.
- Ask whether the current deck wants consistency, greed, defense, or scaling.

Weak event choices:

- Free gold with no cost.
- Random card with no context.
- Cosmetic lore-only stops that do not change the run.
- Choices where one option is always correct.

## Next Recommended Phase 4 Slice

Continue with PH4-004:

1. Add a structured event definition schema.
2. Create 8 Act 1 event definitions.
3. Add class-aware choice conditions for at least 2 of them.
4. Pick events deterministically from the run seed and node id.
5. Add tests for event choice effects and save/resume behavior.

This turns the current event shell into a content-safe system rather than another hand-coded screen.

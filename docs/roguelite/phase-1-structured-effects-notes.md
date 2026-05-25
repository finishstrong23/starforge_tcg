# Phase 1 Structured Effects Notes

Last updated: May 17, 2026

## What Shipped

Phase 1 has started with the first safe migration slice:

- Added structured effect types to `src/dungeon/types/index.ts`.
- Added `src/dungeon/engine/structuredEffects.ts`.
- Added `src/dungeon/engine/effectValidation.ts`.
- Wired `playCard` so migrated cards use structured effects.
- Migrated all unique starter-deck cards for all four factions.
- Added `tests/roguelite/structuredEffects.test.ts`.

## Migrated Starter Definitions

Cogsmiths:

- `C-001` Rivet Strike
- `C-002` Plate Shield
- `C-041` Wrench

Pyroclast:

- `P-001` Cinder Strike
- `P-002` Scale Guard
- `P-041` Spark

Luminar:

- `L-001` Light Jab
- `L-002` Glow Ward
- `L-041` Glimmer

Warp Riders:

- `W-041` Strike
- `W-042` Step
- `W-043` Shimmer

## Hybrid Execution Rule

Migrated cards execute through structured effects when they are unaugmented.

If a card has Cogsmith augment text patches (`card.augments.length > 0`), it temporarily stays on the legacy text parser path. This preserves existing augment behavior while we migrate augment effects structurally in a later Phase 1 pass.

This rule was added because `C-029` Bulwark+ can patch a starter Skill's `cardText`; structured effects would otherwise ignore the patched text and regress block math.

## Validation

Validation now catches:

- Unknown effect opcodes.
- Empty effect lists.
- Invalid positive integer amounts.
- Malformed choice options.
- Malformed nested conditional/trigger effects.

Current verification:

- `npm run build`
- `npm test -- --runInBand tests/roguelite`
- `npm run lint` passes with the existing 7 warnings.

## Next Recommended Phase 1 Slice

Continue with PH1-005:

> Route combat RNG through seeded streams.

Start with the highest-impact random paths:

- `createCardInstance` instance suffixes.
- Combat deck shuffling.
- Flux state assignment.
- Random damage ranges.
- Chance self-damage.
- Random rift selection.

Then add a seed replay golden test that proves the same seed reproduces the same opening combat sequence.


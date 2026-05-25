# Phase 6 Balance Lab Notes

Last updated: May 17, 2026

## Goal

Phase 6 makes balance work measurable. The first slice is a local simulator/report command that can run before and after balance changes to catch obvious outliers.

## First Slice Shipped

- Added `src/dungeon/engine/balanceLab.ts`.
- Added five bot profiles:
  - `random`
  - `aggressive`
  - `defensive`
  - `value`
  - `archetype`
- Simulates all four current factions across multi-act combat samples.
- Tracks:
  - win rate
  - death act/floor
  - total turns
  - deck size
  - card picks
  - skipped card rewards
- Added `npm run balance:report` as the local report command.

## Current Scope

This is not yet a perfect player model. It is a deterministic pressure test that answers:

- Which factions/bot profiles are collapsing early?
- Which reward cards are over-picked by simple heuristics?
- Are future card/relic/event changes moving the report in an obvious direction?

The simulator intentionally uses the existing combat engine rather than a separate approximation, so crashes and parser regressions surface during balance runs.

## Next Recommended Slice

- Persist report snapshots under `reports/balance/`.
- Add a compare command for "before vs after".
- Track relic pick rates and relic win delta.
- Add potion usage heuristics.
- Add seed replay exports for failed/dead runs.
- Replace remaining `Math.random` combat paths with injected seeded streams so reports are deterministic without scoped `Math.random` overrides.

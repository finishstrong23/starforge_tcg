# Phase 7 Meta Progression Notes

Last updated: May 17, 2026

## Goal

Phase 7 adds long-term motivation without making players grind for power. The first slice records what happened in each run and recognizes achievements with badges.

## First Slice Shipped

- Added `src/dungeon/engine/metaProgression.ts`.
- Added dungeon-native local meta storage at `sf:dungeon:meta:v1`.
- Added recent run history, trimmed to the latest 50 runs.
- Added aggregate stats:
  - total runs
  - victories
  - best act reached
  - highest ascension by faction
  - total combats
  - total elites defeated
  - total bosses defeated
  - total cards played
- Added non-power challenge badges:
  - First Descent
  - Crown Claimed
  - Gatebreaker
  - Deep Delver
  - Elite Hunter
  - Boss Breaker
  - Library Run
  - Relic Hoard
  - Close Call
  - Untouched Crown
- Wired dungeon run-end transitions to archive meta summaries.
- Updated the run-end screen to show earned badges for the completed run.

## Design Boundary

No gameplay power is unlocked by this slice. This keeps meta progression motivational rather than mandatory. The player gets recognition, history, and goals, while each run still begins fair.

## Next Recommended Slice

- Add a run history screen from character select.
- Add custom seed and daily run entry points.
- Add badge filters and per-faction stats.
- Add unlock tracks for cosmetics only.
- Add save migration tests for future meta schema versions.

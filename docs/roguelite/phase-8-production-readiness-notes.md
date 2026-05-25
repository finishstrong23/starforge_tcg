# Phase 8 Production Readiness Notes

Phase 8 turns beta feedback into reproducible engineering input. The first slice focuses on two launch-critical surfaces: save compatibility and feedback export.

## Implemented Slice

- Added a versioned dungeon save snapshot:
  - storage key: `sf:dungeon:save:v1`
  - schema version: `2`
  - build version attached to every new save
  - last-saved timestamp attached to every new save
- Added save migration for legacy raw context saves.
- Added guards that reject completed run saves during hydration so players do not resume into a stale run-end screen.
- Added defaults for legacy saves that predate newer fields:
  - `seed`
  - `potions`
  - `runModifiers`
  - `runStats.totalDamageDealt`
- Added a beta feedback bundle exporter with:
  - build name/version/channel
  - privacy-light client path
  - seed, faction, ascension, act, phase, HP, gold
  - deck ids, relic ids, potion ids, run modifier ids
  - aggregate meta stats
  - last 100 telemetry events
- Added a run-end `Copy Feedback` button so players can paste a full repro bundle into Discord, GitHub, or a form.

## Save Fixtures And Beta Reports

- Added durable save fixtures in `tests/fixtures/dungeon-saves/`.
- Added fixture-driven regression coverage so every saved JSON sample must migrate or intentionally reject.
- Added beta report templates in `reports/`:
  - `README.md`
  - `qa-run-template.md`
  - `qa-run-template.json`
- Added tester-facing feedback privacy copy in the run-end UI.
- Added a standalone privacy note in `docs/roguelite/phase-8-feedback-privacy.md`.
- Added a persistent privacy panel with a remote telemetry opt-out.
- Remote opt-out blocks network telemetry while keeping local feedback export history.
- Added `npm run release:beta:check` as a repeatable beta gate for build, lint, save fixtures, feedback export, telemetry settings, and UI build.
- Added a public beta release checklist in `docs/roguelite/public-beta-release-checklist.md`.
- Added `npm run performance:budget` to guard JS, CSS, and large production image assets.
- Added public beta changelog and known-issues templates.
- Added compressed JPG combat backgrounds and changed the production background glob so large PNGs remain source art only.

## Verification

- Added focused save migration and feedback bundle tests in `tests/roguelite/phase8ProductionReadiness.test.ts`.
- Added focused telemetry opt-out tests in `tests/roguelite/telemetrySettings.test.ts`.

## Next Recommended Slice

- Add real production save samples to the fixture folder after each public beta build.
- Add screen-level runtime performance checks for map, combat, reward, and run-end screens.

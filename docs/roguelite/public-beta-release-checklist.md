# Public Beta Release Checklist

Use this checklist for every public beta build. The goal is to keep beta feedback actionable, protect tester trust, and catch save breakage before a build reaches players.

## Automated Gate

Run:

```bash
npm run release:beta:check
```

This gate verifies:

- TypeScript compiles.
- ESLint passes.
- Phase 8 save fixtures migrate or intentionally reject.
- Feedback export still includes build, seed, faction, run state, and recent telemetry.
- Remote telemetry opt-out still blocks network sends while preserving local feedback history.
- The Vite production build completes.
- The production bundle stays inside the current public beta performance budgets.

## Required Manual Smoke

- Start the app with `npm run dev`.
- Open a fresh run and confirm the Privacy panel is visible.
- Turn off `Send remote playtest events`.
- Confirm the checkbox stays off after a reload.
- Finish or abandon a test run and confirm `Copy Feedback` still produces a bundle.
- Capture at least one real save sample from the build and add it to `tests/fixtures/dungeon-saves/`.
- Record build version, seed, faction, ascension, and browser/device in `reports/qa-run-YYYY-MM-DD.md`.
- Fill in `public-beta-changelog-template.md`.
- Fill in `public-beta-known-issues-template.md`.

## Ship Criteria

- No save fixture failures.
- No new TypeScript, lint, or production build failures.
- Telemetry opt-out works in browser.
- Known high-severity issues are listed in the release notes.
- Background image sizes are acknowledged in the performance budget output.
- Rollback plan is clear: previous build version, owner, and deploy link.

## After Release

- Add the production save sample from this build to the fixture folder.
- Run `npm run telemetry:summary` on collected local telemetry exports when available.
- Promote repeated beta reports into backlog items with seed and feedback bundle attached.

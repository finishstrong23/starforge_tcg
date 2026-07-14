# STARFORGE: Shattered Reach — AI Assistant Guide

## Overview
STARFORGE is a single-player, Slay-the-Spire-style roguelite deck-builder ("Shattered Reach"): 4 factions (Pyroclast, Cogsmiths, Luminar, Warp Riders), 3 acts with procedurally generated branching maps, turn-based card combat, relics, potions, events, and ascension levels 0-10. TypeScript + React 18 + Vite. Deployed to Vercel from `main`.

> The repo name says "TCG" for historical reasons. The original 1v1 trading card game was removed — this repository is the dungeon roguelite only. `src/ui/App.tsx` boots straight into `DungeonRoot`; there is no menu, no multiplayer, no backend beyond a Vercel serverless telemetry intake (`api/event.ts`).

## Key Commands
```bash
npm run dev            # Vite dev server
npm test               # Jest (node env; ~750 tests, all deterministic)
npm run lint           # ESLint over src/
npm run build          # tsc typecheck/compile
npm run build:ui       # Vite production build → dist/
npm run preview        # Serve the production build locally
npm run balance:report        # Offline balance lab report
npm run telemetry:summary     # Aggregate telemetry logs
npm run release:beta:check    # The CI auto-merge gate, runnable locally
```

## Project Structure
```
src/
├── dungeon/              # THE LIVE GAME
│   ├── engine/           # Pure-TS game logic (all of it unit-testable)
│   │   ├── runReducer.ts       # Single mutation point for run state (all actions)
│   │   ├── combat.ts           # Combat engine (turns, intents, effects, deaths)
│   │   ├── mapgen.ts           # 4-rail act map generator (seeded; equal routes)
│   │   ├── nodeRewards.ts      # Seeded reward/shop/blessing rolls + shop pricing
│   │   ├── seededRng.ts        # hashSeed / mulberry32 / resumable stream
│   │   ├── relicEffects.ts     # All relic trigger handlers
│   │   ├── saveCompatibility.ts# localStorage save schema + migration
│   │   ├── draft.ts, heat.ts, ascension.ts, eventSelection.ts, ...
│   ├── data/             # Content: cards.ts (176), enemies.ts (28), relics.ts (26),
│   │                     #   potions.ts, events.ts (24), blessings.ts, curses.ts
│   ├── components/       # React views (renderers over persisted state, ~25 files)
│   ├── context/DungeonRunContext.tsx  # Provider: hydrate/persist + dispatch wrappers
│   └── config/mvp.ts     # Faction availability switch (all four live)
├── roguelite/            # LEGACY module. Still live: cards/ (starter decks, card pool
│                         #   re-exports) and types. DEAD for the live game: engine/,
│                         #   persistence/ (the live dungeon has its own).
└── ui/                   # App shell (fixed-viewport; screens own their scrolling)
tests/roguelite/          # All tests (Jest, node env, .ts only — no component tests)
scripts/                  # beta-readiness.mjs (CI gate), balance/telemetry/patch tools
docs/SHATTERED_REACH_MVP_STATUS.md  # DoD → evidence map for the MVP
```

## Architecture Rules (load-bearing — do not violate)

1. **Single card definition with `upgraded` flag.** A card's upgrade is expressed on the same `CardDefinition` via `upgradeText` / `upgradedCost` / `upgradedAttack` / `upgradedHealth` (+ optional `upgradeEffects`). Never create separate upgraded card definitions.
2. **All run-state mutations go through `runReducer.ts`.** Views dispatch actions; they never compute outcomes. Reward claims, shop purchases, and blessing picks are idempotent reducer actions guarded by persisted flags.
3. **No bare `Math.random` in any run-affecting path.** Node-level rolls use `createSeededRng(runSeed, <purpose>, act, nodeId)`; in-combat randomness goes through the persisted stream (`CombatState.rngState` via `withCombatRng` — internal code calls `combatRandom()`). This is what makes saves refresh-proof (no save-scumming) and full runs reproducible from a seed. The full-run certification suite will flake if you break this.
4. **Rolled offers persist with claim state.** Rewards (`RunState.pendingReward`), shop stock (`shopStock`), and blessing options (`blessingOptionIds`) live on `RunState` — never in component state.
5. **Combat effects** resolve primarily via regex over card text (`applySpellEffect`), with `structuredEffects.ts` as the migration path for cards carrying `effects` arrays. When adding cards, match existing text patterns exactly or add structured effects.
6. **Relics** are data (`data/relics.ts`) + handlers (`relicEffects.ts`). Triggers fired by the engine: `combat_start` (reducer), `combat_end`/acquisition `run_start` (reducer), `turn_start`/`turn_end`/`on_card_play`/`on_kill` (combat.ts). Relics are carried on `CombatState.relics`.
7. **UI shell is `overflow: hidden` at every level** (`html/body`, `#root`, `.starforge-app-shell`). Any screen that can grow taller than the viewport must set `height: 100%; overflowY: auto` on its root or it will clip.

## Save Format
`localStorage['sf:dungeon:save:v1']` — a `DungeonSaveSnapshot` (see `saveCompatibility.ts`). Written on every reducer transition; hydrated on boot with `ensureNodeStates()` healing legacy saves. Ended runs never rehydrate.

## Testing
- Jest, `testEnvironment: node`, ts-jest transforms `.ts` only — engine and reducer tests, no component/DOM tests. Put tests in `tests/roguelite/`.
- Key suites: `fullRunSimulation` (reducer-driven 3-act certification, all factions, refresh-resume), `liveMapgen` (3000-seed rail invariants: identical multiset per rail, elite window, chain edges), `nodeRewards` (save-scum hardening), `enemyBehaviors`, `relicSystem`, `pyroclastMvpMechanics`, per-faction `cardUpgrades*`.
- `tests/roguelite/mapgen.test.ts` targets the LEGACY `src/roguelite` generator (kept for the dead module); the live generator's suite is `liveMapgen.test.ts`.
- Everything must stay deterministic — a test that depends on shuffle luck is a bug.

### Visual verification (headless browser)
`playwright-core` is a devDependency and Chromium is preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. To drive a real mid-run screen: build a `ContextState` with the reducer in a throwaway jest test, write `createDungeonSaveSnapshot(state)` to JSON, then in Playwright `page.addInitScript` set `localStorage['sf:dungeon:save:v1']` (and `sf:tutorial:dismissed:v1` = `1`) before `page.goto` on `npm run preview`. The app hydrates directly into that screen.

## CI/CD
- `ci.yml`: lint + test + build on push/PR.
- `auto-deploy.yml`: pushes to `claude/**` branches auto-merge to `main` **gated on `scripts/beta-readiness.mjs`** — a green push to a `claude/**` branch ships to production Vercel. Run `npm run release:beta:check` before pushing.
- `deploy.yml`: Vercel deploy on push to `main`.

## Branch & Patch Workflow
- `main` deploys. Feature work on `claude/**` branches (auto-merged when the gate passes).
- `scripts/generate-patch.sh` / `apply-patch.sh` / `sync-to-main.sh` exist for the patch-based flow; the auto-merge path is the primary one.

## Conventions
- Engine logic lives in `.ts` modules under `src/dungeon/engine/` so it is testable; React components are thin renderers over persisted state.
- Content additions go in `src/dungeon/data/` and are validated by data-audit tests (`dungeonEvents`, `actContent`, `factionAudit`) — run them after any content change; unknown ids fail the suite.
- Every event must keep ≥2 faction-agnostic choices; faction-gated choices use `requiresFaction`.
- Telemetry via `logEvent()` (`engine/telemetry.ts`) — safe in node, no-ops outside the browser.

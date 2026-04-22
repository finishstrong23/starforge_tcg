# Phase 2 — Run State & Persistence

Deliverable: `RunState` type, IndexedDB schema, save/load/resume pipeline
for a roguelite run. No UI, no combat logic. Just data plumbing.

## What shipped

**Types** (new, under `src/roguelite/types/`)
- `map_state.ts` — `MapNode`, `ActMap`, `NodeType`. Loose shape so
  Phase 3's map generator fills in the details without shape rework.
- `combat_state.ts` — `CombatState`, `CombatPhase`, `EnemyCombatState`,
  `CombatActionLogEntry`. Includes the per-combat serialized RNG state
  (`rngState: string`) so a mid-combat save can resume deterministically.
- `run_state.ts` — `RunState`, `RunPhase`, `RunStats`. The full run
  snapshot: character, map, deck, relics, potions, combat state, stats.
  Schema-versioned (`schemaVersion: 1`).
- `meta_state.ts` — `MetaProgression`, `FactionMastery`, `AscensionProgress`,
  `CollectionUnlocks`, `RelicTokens`, `RunHistoryEntry`. The
  cross-run data that lives in a *separate database* from runs.

**Engine**
- `engine/rng.ts` — `SplitMix64` seeded PRNG. BigInt-based for
  correct uint64 arithmetic. Methods: `nextU64`, `nextU32`,
  `nextFloat`, `nextInt` (unbiased), `pick`, `shuffle`, `chance`,
  `derive` (for independent sub-streams per subsystem), `serialize` /
  `fromState` (hex round-trip).
- `engine/run.ts` — `createNewRun`, `materializeStarterDeck` (expands
  starter decks into unique-`instanceId` `CardInstance[]`),
  `saveCheckpoint`, `resumeLatestRun`, `endRun`.

**Persistence** (new, under `src/roguelite/persistence/`)
- `adapter.ts` — `StorageAdapter` interface, schema registry.
- `schema.ts` — database and object store definitions.
- `memory.ts` — `InMemoryAdapter` for tests and non-browser runtime.
- `indexeddb.ts` — `IndexedDBAdapter` for the browser runtime.
- `runStore.ts` — typed wrapper for run records (RunStore).
- `metaStore.ts` — typed wrapper for MetaProgression (MetaStore).
- `index.ts` — `createPersistence(adapter?)` factory that auto-picks
  IndexedDBAdapter in the browser and InMemoryAdapter in Node.

**Tests** (new, under `tests/roguelite/`)
- `rng.test.ts` — 9 tests covering determinism, derivation, bias,
  serialize/deserialize round-trip.
- `persistence.test.ts` — 9 tests covering save/load round-trip,
  mid-combat resume, `endRun` archiving, DB isolation.
- `run.test.ts` — 5 tests for `createNewRun` and
  `materializeStarterDeck` across all 4 factions.

**Total:** 23/23 Phase 2 tests pass. `npm run build` clean (only the
pre-existing `tsconfig.json baseUrl` deprecation warning, unchanged).

## Constraints honored

From the master build prompt's non-negotiables:

1. **Per-card-instance state** — every card in the starter deck is
   materialized to a `CardInstance` with a unique `instanceId`, and
   tests assert uniqueness. Augment state, Flux state, and Lumen state
   will attach to these instances in Phase 6.

2. **Deterministic RNG** — `SplitMix64`, seeded from the run's
   `seed` string. `derive(scope)` produces stable, independent
   sub-streams for subsystems (map, traits, combat, drops). Tests
   verify identical seeds produce identical sequences across 100
   samples and 50k-sample bias checks.

3. **Save after every action** — `RunStore.save` stamps
   `lastSavedAt = Date.now()` on every write; a mid-combat
   `CombatState` round-trips through save/load byte-identical (test
   "preserves a mid-combat CombatState through save/resume").

4. **Separate databases for meta vs run state** —
   `starforge_roguelite_runs` (v1) and `starforge_roguelite_meta` (v1)
   are distinct IndexedDB databases. Test "meta store is isolated
   from run store" wipes the runs DB and asserts meta survives
   intact.

5. **Trigger systems unified** — not in scope for Phase 2; noted for
   Phase 4 (combat) and Phase 7 (relics) to share one trigger-phase
   enum.

6. **No `localStorage` / `sessionStorage`** — verified by code search.
   IndexedDB only, and the adapter abstraction means the code path is
   swappable for tests without touching browser storage APIs.

## Design decisions & assumptions

1. **Placeholder defaults in `createNewRun`.** `DEFAULT_STARTING_HP = 80`,
   `DEFAULT_MAX_ENERGY = 3`, `DEFAULT_POTION_SLOTS = 3`,
   `DEFAULT_STARTING_GOLD = 0`. The master spec references
   `meta-progression-design.md` and `dungeon-map-design.md` for the
   authoritative numbers (per-faction HP, ascension modifiers,
   starting-gold rules). Those docs aren't in the repo yet. These
   values are tagged in code with a comment so Phase 6/11 can surface
   them from the design specs.

2. **`ActMap.actMaps: []` on new runs.** The map generator is Phase 3.
   A fresh run has `actMaps: []` until the player confirms character
   select and the generator runs. `RunState.phase === 'character_select'`
   is the sentinel.

3. **`createNewRun` phase is `'character_select'`.** A new run is
   created at character select and doesn't count as "active" until
   the player advances. `RunStore.getActive()` filters out
   `character_select` (and `run_end_win` / `run_end_loss`) so a
   stale selection doesn't get auto-resumed.

4. **`resumeLatestRun` only resumes the single most-recent active
   run.** The `runs` store is keyed by `runId` so multiple runs can
   technically coexist, but the public API treats "the active run" as
   a singleton. This matches STS-lineage UX and avoids having to
   build a run picker for the MVP.

5. **`endRun` writes to meta before deleting the run.** If the meta
   write fails, the run stays in the runs DB for retry. This biases
   toward preserving progress over clean state.

6. **`RunHistoryEntry` trimmed to 50.** Design doc in
   `meta-progression-design.md` will likely specify; 50 is a
   reasonable default for a scrollable stats panel and keeps the
   meta record size bounded.

7. **`recentRuns` is stored sorted newest-first on write** — reading
   code never has to sort. Trim-to-50 happens at write time.

8. **`schemaVersion: 1` on both `RunState` and `MetaProgression`.**
   On load, code should check this and migrate forward if needed.
   Phase 2 doesn't implement migrations (there's nothing to migrate
   yet); a later phase will add a migration registry.

9. **`CombatState.rngState: string`.** Serialized as a 16-char hex
   string via `SplitMix64.serialize()`. Resuming a combat calls
   `SplitMix64.fromState(rngState)` and continues exactly where the
   previous turn left off.

## Scope boundaries (things intentionally not built)

- No map generation — Phase 3.
- No combat engine — Phase 4.
- No Reactive Ecology trait rolling — Phase 5.
- No faction mechanic resolution — Phase 6.
- No relic or potion logic — Phases 7-8.
- No UI wiring — landing page at `src/dungeon/components/DungeonRoot.tsx`
  still shows the Phase-1 faction-select; it does not yet call
  `createNewRun` or `saveCheckpoint`. That's a Phase 9 (map / traversal
  UI) task.
- No migration framework yet. `schemaVersion` fields exist but are
  not yet consulted on load.

## Open questions for design-doc phases

Things I flagged during this phase that need the design docs to
resolve. None are blockers for Phase 3.

1. **Per-faction starting HP.** Currently 80 for all. Design spec
   may want faction-differentiated (e.g., Cogsmith starts higher
   because they scale slower, Warp Riders starts lower to match
   variance identity).

2. **Ascension tier modifiers.** `ascensionTier: number` field
   exists but is not yet consumed. Phase 11 wires up.

3. **Starting relics.** The master build prompt mentions "Starter
   relics apply automatically" in Phase 7. Currently `relics: []` at
   run start. Phase 7 will add starter-relic assignment; for now
   the field is empty.

4. **Potion slot count by ascension.** STS reduces potion slots at
   high ascension. `potionSlotCount: 3` default; may need to become
   a function of ascensionTier.

5. **Character name customization.** Current implementation uses the
   starter deck's fixed `characterName` (e.g., "Pyroclast Ignitor").
   Design doc may want player-entered names for run logs. Not
   blocking for Phase 3.

## TODO hooks for later phases

- [ ] Phase 3: populate `RunState.actMaps` using the map-generation
  algorithm. Each `ActMap` should carry `actSeed = runId.derive('act-N')`.
- [ ] Phase 4: use `CombatState.rngState` for every combat-scoped roll
  and re-serialize after each action. Use `derive('combat-<combatId>')`.
- [ ] Phase 4: add a `CombatEngine` that reads/writes `CombatState` as
  pure functions over turn transitions.
- [ ] Phase 5: populate `EnemyCombatState.traitIds` via the Reactive
  Ecology engine, keyed off the computed Threat Vector.
- [ ] Phase 6: attach `AugmentState`, `LumenState`, `FluxState` to
  specific `CardInstance`s. The types are already on `CardInstance` —
  just needs population logic.
- [ ] Phase 7: register relic trigger handlers through a shared
  trigger-phase enum that also covers evolution and status effects
  (master constraint #5).
- [ ] Phase 9: wire `createNewRun` → `saveCheckpoint` into the
  "Begin Run" button in `DungeonRoot.tsx`. Current button is disabled.
- [ ] Phase 11: implement `schemaVersion` migrations if the shape of
  `RunState` or `MetaProgression` changes.
- [ ] Consolidation: move the UI entry point from
  `src/dungeon/components/DungeonRoot.tsx` into `src/roguelite/ui/`.
  `src/dungeon/` is a stale placeholder from an earlier plan and
  should be removed once the roguelite lives entirely under
  `src/roguelite/`.

## Verification

```bash
npm run build       # tsc clean (only pre-existing baseUrl warning)
npx jest --testPathPattern='tests/roguelite'
# Test Suites: 3 passed, 3 total
# Tests:       23 passed, 23 total
```

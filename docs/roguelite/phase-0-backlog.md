# Phase 0 Backlog

Last updated: May 17, 2026

Status legend: todo, ready, blocked, done.

## Phase 0 Completion Checklist

| ID | Status | Task | Acceptance |
| --- | --- | --- | --- |
| PH0-001 | done | Create master plan | `docs/roguelite/master-plan.md` exists |
| PH0-002 | done | Create product bible | `docs/roguelite/phase-0-product-bible.md` exists |
| PH0-003 | done | Create vertical-slice spec | `docs/roguelite/phase-0-vertical-slice.md` exists |
| PH0-004 | done | Create backlog | `docs/roguelite/phase-0-backlog.md` exists |
| PH0-005 | ready | Review docs with owner | Owner confirms or edits priorities |
| PH0-006 | done | Initiate Phase 1 | Start structured effect schema and starter-deck migration |

## Phase 1: Engine Hardening

Goal: make content safe for Codex to author.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH1-001 | engine | done | Design `EffectDefinition` schema | Supports damage, block, draw, energy, status, exhaust, heat, lumen, augment, summon, rift, choice, conditional, trigger |
| PH1-002 | engine | done | Add effect resolver module | Effects execute without reading card text for migrated, unaugmented cards |
| PH1-003 | content | done | Migrate four starter decks | Starter cards use structured effects and preserve current behavior |
| PH1-004 | tests | done | Add effect validation tests | Invalid effect opcodes, ids, costs, and upgrade drift fail tests |
| PH1-005 | engine | ready | Route combat RNG through seeded streams | No combat-resolution `Math.random` remains |
| PH1-006 | engine | todo | Add save schema version and migration registry | Old saves load or fail with explicit migration error |
| PH1-007 | tooling | todo | Add content validation command | Command reports invalid cards, relics, potions, enemies |
| PH1-008 | tests | todo | Add seed replay golden test | Same seed reproduces map, rewards, and first combat RNG |

## Phase 2: Combat UX And Feel

Goal: make one fight feel premium and readable.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH2-001 | ui | todo | Add combat action queue | Card, enemy, relic, potion, status, and death actions animate in order |
| PH2-002 | ui | in_progress | Add exact card previews | Starter-slice hand cards show exact structured previews; full card pool pending |
| PH2-003 | ui | todo | Add keyword/status/relic/potion tooltips | Every inspectable game term has an explanation |
| PH2-004 | ui | todo | Add pile and power panels | Draw, discard, exhaust, powers, and history can be inspected |
| PH2-005 | ui | todo | Add animation speed control | Normal, fast, instant |
| PH2-006 | qa | todo | Add Playwright smoke suite | Class select to combat to reward to map path passes |
| PH2-007 | qa | todo | Add screenshot regression targets | Core screens captured at desktop and mobile widths |

## Phase 3: Class Identity V2

Goal: make the four factions feel like four different games.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH3-001 | design | in_progress | Audit each faction card pool | Initial V2 decision-loop audit exists; per-card archetype tags pending |
| PH3-002 | content | todo | Cut or rewrite stat-only filler | Each class has at least 5 build-around cards |
| PH3-003 | ui | in_progress | Add faction resource panels | Combat panel shows Heat, Lumens, Augments, and Flux/Rifts; deeper tooltips/polish pending |
| PH3-004 | content | todo | Add class-specific relic packages | At least 2 per class in slice |
| PH3-005 | tests | todo | Add archetype smoke simulations | Each archetype can defeat slice boss under reasonable seeds |

## Phase 4: Dungeon Ecology And Events

Goal: make the map and encounters react to the build.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH4-001 | engine | done | Add first-class `event` node type | Map and route UI support event nodes |
| PH4-002 | design | todo | Spec reactive ecology tags | Player deck and dungeon threats share comparable tags |
| PH4-003 | engine | todo | Implement encounter selection by tags | Encounters vary by class/build without hard-countering |
| PH4-004 | content | done | Add 8 slice events | Each has at least 2 choices and one class-aware branch where useful |
| PH4-005 | content | todo | Rework elites as build tests | 3 elites pressure different axes |
| PH4-006 | content | todo | Rework Act 1 boss | Boss pressures scaling, defense, and burst in readable phases |

## Phase 5: Content Expansion

Goal: expand only after slice systems are stable.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH5-001 | content | in_progress | Expand Act 1 content | 8 structured Act 1 events shipped; enemies, relics, potions pending |
| PH5-002 | content | todo | Build Acts 2 and 3 | Each act has theme, enemy pool, events, elites, boss |
| PH5-003 | art | todo | Replace placeholder enemy art | Consistent visual style for slice enemies |
| PH5-004 | audio | todo | Add baseline SFX | Card play, damage, block, reward, map, boss transitions |
| PH5-005 | tooling | todo | Add art prompt registry | Every card/enemy/relic/potion can point to prompt or asset |

## Phase 6: Balance Lab

Goal: make tuning measurable.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH6-001 | simulation | todo | Add deterministic playtest bot | Bot can complete runs without UI |
| PH6-002 | simulation | todo | Add bot profiles | Aggressive, defensive, value, random, archetype-seeking |
| PH6-003 | analytics | todo | Add local balance report | Reports win rate, death floor, picks, skips, relic deltas |
| PH6-004 | analytics | todo | Add seed repro export | Run summary includes seed, class, ascension, deck, relics, choices |
| PH6-005 | qa | todo | Add balance thresholds to CI | Extreme regressions are flagged before merge |

## Phase 7: Meta And Beta Readiness

Goal: prepare long-term play without distracting from the core loop.

| ID | Label | Status | Task | Acceptance |
| --- | --- | --- | --- | --- |
| PH7-001 | progression | todo | Extend ascension after A0-A10 balance | Higher levels add difficulty without invalidating builds |
| PH7-002 | progression | todo | Add unlock tracks | Unlocks reveal complexity, not mandatory power |
| PH7-003 | qa | todo | Add save compatibility tests | Old saves migrate across schema versions |
| PH7-004 | production | todo | Add feedback export | Player can export build, seed, logs, and telemetry |
| PH7-005 | production | todo | Add release checklist | Build, test, smoke, performance, known issues, rollback |

## Next Implementation Recommendation

Continue Phase 1 with PH1-005, then PH1-008.

Reason: structured effects are now scaffolded for the starter slice. Seeded combat RNG is the next foundation because it unlocks reliable replay, useful bug reports, and future balance simulation.

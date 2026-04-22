# STARFORGE Roguelite — Master Design Index & Build Prompt

*The complete design package and Claude Code orchestration prompt. Read this first.*

---

## Part 1: The design package (for the human)

### What this is

You are looking at the complete game design for **STARFORGE Roguelite**, a deckbuilder in the Slay the Spire lineage, set in the STARFORGE universe, with two signature mechanical differentiators: **Living Cards** (cards that evolve with play) and **Reactive Ecology** (enemies that adapt to your deck).

The design phase is complete. What follows is a map of the 22 deliverables and a structured build prompt for Claude Code.

### The full deliverable list

All files below were produced during the design phase and should be placed in `/docs/roguelite/` in the repo. The design markdown documents are authoritative spec. The spreadsheets are authoritative content data. The Python reference is the working map-generation algorithm to port to TypeScript.

| # | File | Type | Purpose |
|---|------|------|---------|
| 1 | `roguelite-planning-prompt.md` | Prompt | Phase 0 — initial codebase inventory & architecture (already consumed) |
| 2 | `claude-code-phase1-cards.md` | Prompt | Phase 1 — card content implementation (already produced) |
| 3 | `pyroclast-design.md` | Design | Pyroclast class: Heat mechanic, 3 archetypes, combos |
| 4 | `pyroclast-cards.xlsx` | Content | 40 Pyroclast cards with evolution paths |
| 5 | `luminar-design.md` | Design | Luminar class: Lumens/Channel mechanic |
| 6 | `luminar-cards.xlsx` | Content | 40 Luminar cards |
| 7 | `cogsmiths-design.md` | Design | Cogsmiths class: Augments (run-scoped deck modification) |
| 8 | `cogsmiths-cards.xlsx` | Content | 40 Cogsmiths cards |
| 9 | `warp-riders-design.md` | Design | Warp Riders class: Flux variance + Rifts |
| 10 | `warp-riders-cards.xlsx` | Content | 40 Warp Riders cards |
| 11 | `dungeon-map-design.md` | Design | Shattered Reach: 3 acts, 35 enemies, 12 Anomalies, 3 bosses |
| 12 | `dungeon-map.xlsx` | Content | Enemy pools, anomaly templates, shop/rest rules, boss stats |
| 13 | `map-generation-algorithm.md` | Design | Formal procedural graph generation spec |
| 14 | `map_generator_reference.py` | Reference | Working Python implementation (10,000-seed CI-tested) |
| 15 | `relics-design.md` | Design | 25 relics, tier structure, faction affinities |
| 16 | `relics.xlsx` | Content | Full relic pool with trigger phases |
| 17 | `reactive-ecology-design.md` | Design | 13-axis Threat Vector, trait adaptation engine |
| 18 | `reactive-ecology.xlsx` | Content | 30 traits across 6 categories, intensity curve |
| 19 | `potions-design.md` | Design | Combat consumables, 3-slot inventory |
| 20 | `potions.xlsx` | Content | 14 potions with effects |
| 21 | `meta-progression-design.md` | Design | 4 parallel progression tracks, Ascension ladder |
| 22 | `meta-progression.xlsx` | Content | XP tables, Ascension modifiers, unlocks |

### The one-paragraph game summary

A player picks one of four factions (Pyroclast, Luminar, Cogsmiths, Warp Riders) and descends through three acts of the Shattered Reach — a contested sector where a Hivemind infestation has fused with a Luminar relic-station. Each act is a procedurally-generated directed-acyclic-graph map of combats, anomalies, rest sites, shops, and elites, ending in an act boss. Cards evolve based on usage. Enemies adapt to what the player's deck has become. Between runs, a four-track meta-progression system awards XP that unlocks new cards, starter-deck variants, cosmetics, and a 20-tier Ascension difficulty ladder. The game ends at the Heartwake — a four-phase final boss that mirrors all four factions' mechanics back at the player.

### What "better than STS2" means in this design

Three mechanical innovations, none of which STS2 has:

1. **Living Cards** — cards evolve based on usage patterns within a run. Play a Strike 10 times, it becomes Blazing Strike. Hold a card in hand 5 turns without playing it, it gains new properties. Deck sculpting becomes an active mid-run loop instead of a binary upgrade choice.

2. **Reactive Ecology** — a 13-axis Threat Vector is computed from the player's deck. When maps generate, enemies roll trait slots weighted to counter the player. Poison-heavy deck meets cleansers. Lightning deck meets insulators. The dungeon adapts.

3. **Per-card-instance state** — Augments (Cogsmiths) and Flux states (Warp Riders) live on individual card copies, not card types. Two Rivet Strikes in the deck can have different modifications. This is the biggest engineering constraint in the whole project and the thing most likely to cause rework if missed.

---

## Part 2: The Claude Code build prompt

*Everything below this line is written for Claude Code. Paste it as-is or reference this file directly.*

---

# STARFORGE Roguelite — Master Build Prompt

## Your role

You are implementing the STARFORGE Roguelite mode end-to-end, working from a complete design package in `/docs/roguelite/`. The human designer has finished the design phase. Your job is to build the game across multiple phases, ONE PHASE AT A TIME, awaiting the human's explicit go-ahead before starting each next phase.

**Do not attempt to build everything at once.** Each phase is a standalone unit of work with acceptance criteria. When you finish a phase, stop, summarize what you built, and wait for the next prompt.

If anything in the design package is unclear, flag it — do not guess silently. If you need to make an implementation assumption, state it explicitly. The design package is authoritative; if this prompt conflicts with the design docs, the design docs win — ask the human first.

## Repo context

This is the STARFORGE codebase — an existing TCG with 1v1 PvE and 1v1 PvP modes. The roguelite is a new mode that lives in the same codebase. Existing stack:

- React + TypeScript + Vite (frontend)
- Pixi.js (card/combat rendering)
- Zustand or equivalent (state — honor existing convention)
- IndexedDB (run persistence)
- FastAPI + PostgreSQL on Railway (backend — existing, not heavily used for roguelite MVP)
- Vercel (deploy target)

Do NOT refactor or touch the existing PvE/PvP modes. The roguelite lives under `src/roguelite/`.

## Non-negotiable engineering constraints

These are the rules that must hold across every phase. Violations cause rewrites.

1. **Per-card-instance state is mandatory.** Every card in a player's deck has a unique `instanceId: string` (UUID). State like Augments (Cogsmith) and Flux states (Warp Rider) lives on the instance, not the card type. Two copies of the same card in a deck can have different state. Do not take shortcuts here.

2. **All randomness is deterministic from a seed.** Never `Math.random()`. Use SplitMix64 seeded from the runId. The map generator reference implementation demonstrates this. The same runId + act must always produce the same map.

3. **Run state persists to IndexedDB.** Save after every discrete player action (room entry, card picked, combat ended). Recovery from mid-run browser close must be seamless.

4. **Meta progression is a separate IndexedDB store from run state.** A corrupt run must never corrupt a player's mastery level or unlocks.

5. **Trigger systems are unified.** Evolution triggers, relic triggers, and status effect triggers all share one trigger-phase enum and handler pattern. Implement as one system, not three.

6. **No browser-storage APIs in artifacts.** If any part of this is built in an artifact-style component, do not use `localStorage` / `sessionStorage` — these are not supported in the target environment. Use React state or the IndexedDB layer.

## Phases

Below is the full build order. Each phase produces specific deliverables. After each phase, commit on a branch named `roguelite/phase-N-{shortname}` and wait for review.

### Phase 0 — Planning ✅ (already complete)
Codebase inventory, architecture proposal, phase breakdown. Document at `/docs/roguelite/00-plan.md`.

### Phase 1 — Card content ✅ (already prompted)
Type definitions for Card, CardInstance, EvolutionRule, per-faction state types. 160 base cards + 160 evolved cards + 4 signature cards in TypeScript. See `claude-code-phase1-cards.md`.

### Phase 2 — Run state and persistence
**Deliverable:** `RunState` type, IndexedDB schema, save/load/resume pipeline.
**Acceptance:** A player can start a run, close the browser, reopen, and resume exactly where they left off, including mid-combat if interrupted.
**Inputs:** All Phase 1 types. The map generation algorithm spec.
**Scope boundary:** No UI work. No combat logic. Just data plumbing.

### Phase 3 — Map generation
**Deliverable:** TypeScript port of `map_generator_reference.py`. Same algorithm, same determinism guarantees.
**Acceptance:** 10,000-seed CI test passes (port the Python test suite). Same seed produces byte-identical maps across platforms. Map data serializes/deserializes to/from IndexedDB cleanly.
**Inputs:** `map-generation-algorithm.md`, `map_generator_reference.py`.
**Scope boundary:** No UI rendering. No enemy trait rolls yet (that's Phase 5).

### Phase 4 — Combat engine core
**Deliverable:** Turn structure, energy, card play resolution, status effect pipeline, damage/block calculation, enemy AI telegraph system.
**Acceptance:** A combat can be played end-to-end via console/test harness using starter-deck cards against a single Act 1 enemy template. Status effects (Block, Vulnerable, Weak, Strength, Dexterity, Retain, Exhaust) all resolve correctly.
**Inputs:** All Phase 1 types. Class design docs (for understanding card effect semantics).
**Scope boundary:** No faction-specific mechanics (Heat, Lumens, Augments, Flux) yet — that's Phase 6. Basic cards only. Minimum viable UI.

### Phase 5 — Reactive Ecology engine
**Deliverable:** Threat Vector computation, trait pool, trait-rolling algorithm, integration with map generation.
**Acceptance:** Given a sample deck, the engine produces a Threat Vector. Given a Threat Vector + row depth, it rolls appropriate traits. All 30 traits have working effect implementations that hook into the combat engine from Phase 4.
**Inputs:** `reactive-ecology-design.md`, `reactive-ecology.xlsx`.
**Scope boundary:** UI display of traits is minimal — just tooltips. Fancy animations come later.

### Phase 6 — Faction mechanics
**Deliverable:** Heat (Pyroclast), Lumens/Channel (Luminar), Augments (Cogsmiths), Flux (Warp Riders). All signature mechanics fully functional in combat.
**Acceptance:** Each faction's starter deck can be played through a full combat, with all faction mechanics resolving correctly. The character-instance state flows through save/load cleanly.
**Inputs:** The four class design docs. Phase 1 type definitions.
**Scope boundary:** One faction at a time is fine if scope demands — do them in order: Pyroclast → Luminar → Cogsmiths → Warp Riders. Cogsmiths is the hardest (run-scoped state). Warp Riders is second hardest (RNG determinism).

### Phase 7 — Relic system
**Deliverable:** Relic type, trigger dispatch, all 25 relics implemented, relic collection UI, starter-relic assignment at character select.
**Acceptance:** Relics trigger correctly through the shared trigger system built in Phase 4. Starter relics apply automatically. Relic collection shows all acquired relics in combat HUD.
**Inputs:** `relics-design.md`, `relics.xlsx`.

### Phase 8 — Potion system
**Deliverable:** Potion inventory (3 slots), potion pickup logic, potion-use-action (distinct from card play), all 14 potions implemented.
**Acceptance:** Potions can be drunk during player turn only. Relics that trigger on card-played do NOT fire on potion use. Inventory persists across combats.
**Inputs:** `potions-design.md`, `potions.xlsx`.

### Phase 9 — Room types and map traversal UI
**Deliverable:** Visual map renderer (SVG or Pixi), "you are here" tracking, room entry logic for all 5 room types (Combat, Elite, Rest, Shop, Anomaly), Anomaly choice UI, Rest Site actions, Shop UI, Elite reward flow.
**Acceptance:** A player can traverse an entire act from entry to boss, interacting with all room types correctly.
**Inputs:** `dungeon-map-design.md`, `dungeon-map.xlsx`.

### Phase 10 — Boss fights and phase logic
**Deliverable:** All 3 boss fights implemented including phase transitions. Heartwake's four-phase faction-adaptive mechanics.
**Acceptance:** Each boss plays end-to-end correctly. Heartwake's phase changes trigger at the designed HP thresholds and use the correct faction mechanic per phase.
**Inputs:** `dungeon-map-design.md` (Bosses tab), all four class design docs (Heartwake references each).

### Phase 11 — Meta progression
**Deliverable:** XP tracking, mastery levels, Ascension ladder, Collection unlocks, Relic Vault, character select UI, post-run results screen.
**Acceptance:** Full run produces correct XP award. Mastery level-ups trigger between runs. Ascension tiers apply modifiers correctly. Relic Tokens can be spent at character select and affect the first-shop roll.
**Inputs:** `meta-progression-design.md`, `meta-progression.xlsx`.

### Phase 12 — Polish, balance pass, juice
**Deliverable:** Animation, sound, screen shake, card draw feel, combat pacing tuning, first full balance playtest pass.
**Acceptance:** The game feels good to play for an hour. Not "it works" — "you want to keep playing."
**Inputs:** Designer playtest feedback. Balance notes scattered throughout the design docs.

## Between-phase rules

After every phase completion:

1. Stop coding. Do not start the next phase.
2. Write a short summary: what was built, what was left as TODOs, what surprised you, any design-doc ambiguities resolved with assumptions.
3. Save the summary to `/docs/roguelite/phase-N-notes.md`.
4. Commit the branch and open a PR. Do not merge.
5. Wait for the human's explicit go-ahead to start the next phase.

## Surfacing problems

Three things to flag loudly if they happen:

- **Design doc conflict or ambiguity** — do not guess. Ask.
- **Engineering constraint tension** — if a design requires something that fights the existing codebase architecture, flag it immediately. Don't force-fit.
- **Scope overflow** — if a phase is taking significantly more work than estimated, stop and say so before spending the extra time. We will rescope.

## Final note

This design package represents a complete game. Two-hundred-plus hours of gameplay content, one of the most complex single-player systems in the roguelite deckbuilder genre, and a mechanical differentiator that no competing game has shipped. The design is tight. The engineering is possible. The risk is execution discipline.

Build one phase at a time. Ship each phase clean. Do not skip ahead. Do not cut corners on the engineering constraints section. When finished, this game is the real thing.

Begin with Phase 2 when prompted. Do not begin now.

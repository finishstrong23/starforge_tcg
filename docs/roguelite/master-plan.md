# Dungeon Run Master Plan

Last updated: June 22, 2026

## Target

Build a roguelite dungeon-run deckbuilder that can stand next to Slay the Spire 2 without feeling like a clone. STS2 is already in Steam Early Access as of March 5, 2026, with solo play, online co-op, five characters, relics, potions, evolving content, and built-in feedback/metrics. Our advantage cannot be "we also have cards, relics, and a map." It has to be a sharper identity, faster iteration, better readability, and systems that let Codex safely expand the game.

Official reference: https://store.steampowered.com/app/2868840/Slay_the_Spire_2/

Internal benchmark/originality guardrail: [STS2 Benchmark And STARFORGE Originality Guardrails](sts2-benchmark-and-originality.md)

## Product Pillars

1. Every class has a fantasy that changes how the player reads a turn.
   - Pyroclast: positive Heat momentum, frequent Vent turns, Ignite as a Heat-linked fire mark rather than renamed poison.
   - Luminar: storing light, choosing when to release it, defensive inevitability.
   - Cogsmiths: modifying cards, machine companions, long-run construction.
   - Warp Riders: unstable modes, rifts, probability, turn manipulation.

2. The dungeon is not just a path to combats.
   - Map choices must create memory: risk, tradeoffs, build-defining detours, act-specific events, and route commitments.

3. Combat must feel readable before it feels flashy.
   - Intent clarity, exact previews, clean card wording, visible resource state, and fast undo-free confidence are more important than extra effects.

4. The engine must be content-safe.
   - Codex will create much of the software, so cards, relics, enemies, and events need structured data, deterministic simulation, and validation gates.

5. The game should learn from every run.
   - Local telemetry, seed replay, balance simulations, and beta feedback must become first-class development tools.

## Current Assessment

The dungeon branch is a strong prototype, not a throwaway. It already has:

- 4 factions and 176 cards.
- 3-act maps with combats, elites, bosses, rests, shops, treasures, blessings, and rewards.
- 27 enemies, 26 relics, 14 potions, 6 blessings.
- Ascension 0-10, save persistence, telemetry, potion inventory, card upgrades, and cross-faction tests.
- A passing CI baseline after the current branch fixes: build, UI build, lint, and 579 Jest tests.

The biggest risks are:

- Card effects are parsed from natural-language text in `src/dungeon/engine/combat.ts`. This works for a prototype, but it will slow down future card design and create hidden bugs.
- Too much randomness still uses `Math.random` in UI and engine paths, which weakens seed replay and balance simulation.
- The UI is functional but still prototype-grade: inline styles, placeholder art, dense combat state, and limited animation/preview polish.
- Content breadth is ahead of content depth. The current card pool is large, but the game needs fewer "valid" effects and more build-defining effects.
- There is no full-run automated playtest bot, screenshot regression suite, or balance dashboard yet.

## Phase 0: Product Bible And Vertical Slice

Goal: Decide what "better than STS2" means for this game before expanding content.

Phase 0 docs:

- [Product Bible](phase-0-product-bible.md)
- [Vertical Slice Spec](phase-0-vertical-slice.md)
- [Backlog](phase-0-backlog.md)
- [STS2 Benchmark And Originality Guardrails](sts2-benchmark-and-originality.md)

Codex deliverables:

- Create a product bible covering pillars, player promise, class fantasies, run structure, combat language, art direction, and non-goals.
- Create and maintain a competitive benchmark that separates genre conventions from mechanics STARFORGE must own.
- Define the vertical slice: 1 act, 4 classes, 1 boss, 3 elites, 8 normal encounters, 10 relics, 8 potions, 2 event chains, polished combat UI.
- Write acceptance criteria for "fun enough to replay 10 times."
- Create a phase backlog in docs with labels: engine, UI, content, balance, QA, art, launch.

Exit criteria:

- A new contributor can read one doc and know what to build.
- Every later phase has measurable completion criteria.

## Phase 1: Engine Hardening

Goal: Make the game safe for rapid Codex-authored content.

Phase 1 docs:

- [Structured Effects Notes](phase-1-structured-effects-notes.md)

Codex deliverables:

- Replace regex-first card execution with a structured effect system.
- Keep player-facing text separate from executable effects.
- Add effect opcodes for damage, block, draw, energy, status, exhaust, summon, rift, lumen, augment, heat, conditional, choice, and trigger.
- Migrate a small slice first: starter cards for all 4 factions, then the rest by class.
- Route all RNG through seeded streams.
- Add save schema versioning and migrations.
- Add validation scripts that reject unimplemented effects, malformed cards, impossible costs, duplicate ids, and missing upgrade behavior.

Exit criteria:

- No new card needs a new regex.
- Every card can be simulated from structured data.
- Replaying a seed produces the same map, rewards, combats, and random effects.

## Phase 2: Combat UX And Game Feel

Goal: Make one fight feel premium and unambiguous.

Phase 2 docs:

- [Combat Preview Notes](phase-2-combat-preview-notes.md)

Codex deliverables:

- Build an action queue for card play, enemy actions, relic triggers, status ticks, deaths, and reward transitions.
- Add exact damage/block previews before card play.
- Add inspectable tooltips for every keyword, status, relic, potion, and faction resource.
- Add deck, draw, discard, exhaust, powers, and history panels.
- Add animation timing that can be skipped or sped up.
- Build mobile-first and desktop layouts as separate responsive compositions, not one stretched layout.
- Add Playwright smoke tests and screenshot checks for class select, map, combat, reward, shop, rest, and save/resume.

Exit criteria:

- A new player can understand why every number changed.
- A run can be played comfortably on mobile and desktop.
- Critical screens have automated visual coverage.

## Phase 3: Class Identity V2

Goal: Turn the four factions into four different games.

Phase 3 docs:

- [Class Identity Notes](phase-3-class-identity-notes.md)

Codex deliverables:

- Re-audit every faction around a unique decision loop.
- Cut or rewrite cards that are only stat variants.
- Add class-specific UI panels for Heat, Lumens, Augments, and Rifts.
- Create upgrade branches for signature cards where appropriate.
- Add class-specific relic packages and boss relics.
- Add starter relics or class passives if they deepen identity.

Exit criteria:

- Each faction has at least 3 viable archetypes.
- Each faction has at least 5 cards that players can build a whole run around.
- Players can identify the class from the hand and resource UI alone.

## Phase 4: Dungeon And Encounter Design

Goal: Make route selection and encounters produce stories.

Phase 4 docs:

- [Dungeon Ecology Notes](phase-4-dungeon-ecology-notes.md)

Codex deliverables:

- Add act themes with enemy pools, events, relics, and visual treatment.
- Add event nodes with real choices, costs, rewards, and class-aware branches.
- Add elite encounter identities with recognizable tests.
- Add boss mechanics that pressure different build types.
- Rework shops into meaningful decisions: card, relic, potion, remove, upgrade, transform, special service.
- Add map modifiers: cursed route, forge route, faction route, high-reward hazard route.

Exit criteria:

- Each act has a distinct strategic texture.
- Elite and boss previews let players route intentionally.
- Events are not just random rewards; they ask build-shaping questions.

## Phase 5: Content Expansion

Goal: Expand only after the engine and decision loops are stable.

Phase 5 docs:

- [Content Expansion Notes](phase-5-content-expansion-notes.md)

Codex deliverables:

- Move from 4 classes to 5 or 6 only when the first 4 are excellent.
- Add enemies, events, relics, potions, curses, colorless cards, and class-neutral build tools.
- Add rare events and unlockable act variants.
- Establish an art pipeline: placeholder, concept, final, VFX, sound.
- Replace emoji/placeholder art with consistent game assets.

Exit criteria:

- 50-run testers still see new choices.
- Content is additive without bloating card rewards.
- New content ships with simulation tests and validation.

## Phase 6: Balance Lab

Goal: Let the game tell us where it is broken.

Phase 6 docs:

- [Balance Lab Notes](phase-6-balance-lab-notes.md)

Codex deliverables:

- Build deterministic run simulators for each class and ascension.
- Add bot profiles: aggressive, defensive, value, random, archetype-seeking.
- Track win rate, death floor, average deck size, card pick rate, card skip rate, relic win delta, potion usage, boss damage, and turn counts.
- Add seed replay exports and bug repro links.
- Build a local balance report command.

Exit criteria:

- Every balance change can be compared against a prior report.
- Outlier cards and relics are found automatically.
- Manual testing focuses on fun, not arithmetic.

## Phase 7: Meta Progression And Replayability

Goal: Add long-term motivation without weakening roguelite purity.

Phase 7 docs:

- [Meta Progression Notes](phase-7-meta-progression-notes.md)

Codex deliverables:

- Extend ascension beyond 10 only after A0-A10 is balanced.
- Add unlock tracks for classes, relics, events, cosmetics, and challenge modes.
- Add daily run and custom seed modes.
- Add run history, stats, achievements, and challenge badges.
- Consider co-op only after solo combat, UI, and balance are excellent.

Exit criteria:

- Meta progression creates goals, not grind pressure.
- Expert players have high-skill ladders.
- New players unlock complexity at a healthy pace.

## Phase 8: Beta And Production Readiness

Goal: Make public testing useful instead of chaotic.

Phase 8 docs:

- [Production Readiness Notes](phase-8-production-readiness-notes.md)
- [Feedback Privacy Note](phase-8-feedback-privacy.md)
- [Public Beta Release Checklist](public-beta-release-checklist.md)
- [Public Beta Changelog Template](public-beta-changelog-template.md)
- [Public Beta Known Issues Template](public-beta-known-issues-template.md)

Codex deliverables:

- Add crash reporting and user-facing feedback export.
- Add privacy-conscious telemetry settings.
- Add regression tests for save compatibility.
- Add performance budgets for mobile and desktop.
- Add public demo build flow.
- Add changelog, known issues, and beta feedback templates.

Exit criteria:

- Beta feedback is tied to build version, seed, class, ascension, and run state.
- Patches can ship without breaking saves.
- The game has a repeatable release checklist.

## Recommended Next Step

Start with Phase 0, then immediately Phase 1. The most valuable first implementation phase is not more content; it is the structured effect engine plus seeded replay. That will let Codex add hundreds of cards, relics, and encounters later without turning the combat engine into a pile of special cases.

Suggested first task:

> Implement Phase 0 by creating the product bible and vertical-slice backlog, then scaffold Phase 1's structured effect schema and migrate the four starter decks as the first proof.

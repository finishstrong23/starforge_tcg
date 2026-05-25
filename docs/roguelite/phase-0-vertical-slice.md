# Phase 0 Vertical Slice Spec

Last updated: May 17, 2026

## Purpose

The vertical slice proves the game is worth scaling. It should be one polished act that demonstrates the full run loop, all four class fantasies, and the engineering workflow for Codex-created content.

This is not the content-complete game. It is the smallest version that can answer: "Would someone replay this ten times?"

## Slice Scope

### Classes

All four current factions stay in scope:

- Pyroclast.
- Luminar.
- Cogsmiths.
- Warp Riders.

Each class needs:

- 10-card starter deck.
- 25-card slice pool.
- 1 starter relic or passive.
- 3 build-around cards.
- 3 common reward cards that teach the class.
- 2 class-specific relics.
- 1 class-specific event branch.
- Dedicated resource UI.

### Act

One act, internally called Act 1: The Shattered Reach.

Target contents:

- 8 normal enemies.
- 3 elites.
- 1 boss.
- 8 event nodes.
- 10 relics.
- 8 potions.
- 1 shop inventory model.
- 1 rest site model.
- 1 treasure model.
- 1 boss reward model.

### Map

Use the existing 15-row act structure.

Required node types:

- Combat.
- Elite.
- Boss.
- Rest.
- Shop.
- Treasure.
- Event.

Route decisions should include:

- At least one early safe route.
- At least one elite-heavy route.
- At least one shop/rest tradeoff.
- At least one faction-reactive event path.
- At least one high-risk route modifier.

### Combat

The slice should support:

- Draw/discard/exhaust piles.
- Powers.
- Relics.
- Potions.
- Status effects.
- Enemy intents.
- Enemy multi-action turns.
- End-of-turn triggers.
- Card upgrades.
- Run persistence mid-combat.
- Seed replay.

### UI

Required polished screens:

- Class select.
- Opening blessing.
- Map.
- Combat.
- Reward.
- Shop.
- Rest site.
- Event.
- Boss reward.
- Run summary.
- Save/resume prompt.
- Debug seed/telemetry panel.

## Class Slice Targets

### Pyroclast

Decision loop:

Build Heat, choose whether to spend it, and decide when self-risk is worth faster lethal.

Required mechanics:

- Gain Heat.
- Spend Heat.
- Apply Burn/Ignite.
- Self-damage for upside.
- Heat threshold payoff.

Must-have build-arounds:

- Heat-spend finisher.
- Burn stacking engine.
- Self-damage scaling payoff.

### Luminar

Decision loop:

Store Lumens on Channel cards, defend long enough, then release value at the right moment.

Required mechanics:

- Channel cards.
- Lumen allocation.
- Release damage.
- Release block.
- Defensive scaling.

Must-have build-arounds:

- Multi-release payoff.
- Barrier/Block engine.
- Debuff-light hybrid.

### Cogsmiths

Decision loop:

Choose which card or machine to invest in, then survive while the build compounds.

Required mechanics:

- Attach Augments.
- Preserve permanent deck modifications where intended.
- Temporary combat modifications where intended.
- Summon drones/sentries.
- Count Augments on a card and across deck.

Must-have build-arounds:

- One-card carry.
- Drone board.
- Deck-wide machine scaling.

### Warp Riders

Decision loop:

Read the current Flux/Rift state, decide whether to accept variance, reroll, lock, or set up a future turn.

Required mechanics:

- Flux A/B/C state.
- Reroll.
- Lock.
- Rifts.
- Seeded variance.

Must-have build-arounds:

- Chaos damage.
- Precision lock.
- Rift stacking.

## Quality Bar

### First 60 Seconds

The player should:

- Pick a class.
- Understand its resource in one panel.
- Draft or confirm a starter direction.
- Enter the map.
- Start a combat.
- Know enemy intent before playing the first card.

### First 10 Runs

A player should:

- See at least two meaningfully different builds.
- Die for understandable reasons.
- Win or reach the boss by run 5-8 if experienced with the genre.
- Want to try a different class because it feels mechanically distinct.

### Fun Enough To Replay

The slice passes when a tester can truthfully say:

- "I had a plan."
- "The dungeon gave me a hard choice."
- "I lost because I misplayed or built wrong."
- "I want to try one more run."

## Engineering Acceptance Criteria

The vertical slice is ready to scale when:

- `npm run build` passes.
- `npm run build:ui` passes.
- `npm test -- --runInBand` passes.
- Lint passes with no new warnings in touched files.
- Playwright smoke test completes one run path through combat, reward, map, shop/rest, and boss.
- Seed replay reproduces map, rewards, combat RNG, and event choices.
- All cards in the slice have structured executable effects.
- All content ids are unique and validated.
- Save/load works from every slice screen.

## Content Acceptance Criteria

Each content item needs:

- Unique id.
- Display name.
- Player-facing text.
- Structured effect data.
- Rarity/tier.
- Tags for faction, archetype, and complexity.
- Test or simulator coverage.
- Placeholder art prompt or asset reference.

Enemies additionally need:

- Intent cycle.
- Damage budget.
- Defensive budget.
- Counterplay note.
- Which archetypes they pressure.

Events additionally need:

- At least 2 choices.
- Clear cost/reward.
- Class-aware branch when useful.
- No pure upside unless rare or gated.

## Out Of Scope For Slice

- Co-op.
- PvP.
- More than four classes.
- Full 3-act content volume.
- Public launch art pass.
- Localization.
- Mobile native builds.
- Daily runs.
- Full meta progression.

## Slice Risk Register

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Regex card execution slows content | Every new card can break hidden parser assumptions | Phase 1 structured effects |
| Randomness is not fully seeded | Seed replay and bug reports become unreliable | Route RNG through run streams |
| UI hides causality | Players blame the game instead of their decisions | Previews, logs, tooltips |
| Four classes are broad but shallow | Replayability collapses after novelty | Build-around cards and archetype tests |
| Content is balanced manually | Tuning becomes guesswork | Phase 6 simulator and reports |
| Placeholder art weakens first impression | The game feels like a prototype even when systems work | Asset pipeline after UX baseline |


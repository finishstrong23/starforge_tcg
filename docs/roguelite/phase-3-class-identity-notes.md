# Phase 3 Class Identity Notes

Last updated: May 17, 2026

## Goal

Phase 3 makes each faction readable from the player's hand and resource UI alone.

The first implementation slice adds a combat resource panel for all four factions. This does not solve class identity by itself, but it gives every faction a visible tactical dashboard instead of hiding its identity inside card text.

## First Slice Shipped

- Added `src/dungeon/engine/factionResources.ts`.
- Added `src/dungeon/components/FactionResourcePanel.tsx`.
- Mounted the panel in `CombatView`.
- Replaced the old Pyroclast-only Heat chip with the shared faction panel.
- Added `tests/roguelite/factionResources.test.ts`.

## Faction Decision Loops

### Pyroclast

Promise: build Heat, decide when to spend it, and survive the danger window.

Current strong signals:

- Heat generation is common and understandable.
- Several cards scale from current Heat or consume it for burst.
- Power cards can create turn-start or turn-end Heat engines.

Current weakness:

- The risk side of Heat is not visible enough in combat.
- Some cards are still just "damage plus Heat" without changing the decision.

V2 direction:

- Three archetypes: Heat bank, Heat spend burst, self-risk burn control.
- Build-around candidates: `P-014` Pyre Lance, `P-016` Glowing Resolve, `P-023` Meltdown, `P-034` Phoenix Form, `P-038` Everburn.
- UI must show Heat, payoff readiness, and danger threshold.

### Luminar

Promise: store Lumens on Channel cards, then choose the right release moment.

Current strong signals:

- Lumens already live on specific cards.
- Release cards create strong delayed payoff moments.
- Defense and healing fit the patient playstyle.

Current weakness:

- Lumen storage is spread across hand badges, making the total plan harder to scan.
- Some Lumen generator cards are hard to evaluate until the player knows which Channel cards are waiting.

V2 direction:

- Three archetypes: single-card charge, wide choir, stall-and-release.
- Build-around candidates: `L-004` Prism Strike, `L-006` Halo Ward, `L-017` Sunbeam, `L-031` Supernova, `L-032` Everlight.
- UI must show total stored Lumens, Channel count, and brightest release target.

### Cogsmiths

Promise: turn the deck into a machine by installing Augments and deploying constructs.

Current strong signals:

- Augments physically attach to cards.
- Construct cards create persistent combat objects.
- Several attacks count Augments on the card or across the deck.

Current weakness:

- The player cannot scan the whole machine state quickly.
- Augment cards and construct cards need clearer roles: install, payoff, maintenance, swarm.

V2 direction:

- Three archetypes: single super-card, wide installed network, construct pressure.
- Build-around candidates: `C-004` Socket Wrench, `C-021` Modular Strike, `C-031` Mecha Form, `C-034` Deploy Titan, `C-037` Machine God.
- UI must show attached Augments, active constructs, and Augment cards in hand.

### Warp Riders

Promise: live inside unstable modes, choosing when to ride variance and when to anchor it.

Current strong signals:

- Flux A/B/C card bodies are visually distinct on cards.
- Rifts exist as persistent combat effects.
- Several cards already create probability, cost, and turn-manipulation moments.

Current weakness:

- Flux state is visible per card, but the turn-level plan is not.
- Rifts are easy to miss unless the player watches the combat log.

V2 direction:

- Three archetypes: Flux sequencing, Rift stacking, probability burst.
- Build-around candidates: `W-018` Event Horizon, `W-026` Probability Reset, `W-029` Singularity, `W-036` Rift Master, `W-040` Genesis Bolt.
- UI must show active Rifts, Flux state distribution in hand, and the next shift rule.

## Next Recommended Phase 3 Slice

Continue with PH3-001 and PH3-002 together:

1. Add explicit archetype/build-role tags to card definitions.
2. Generate a class audit report from those tags.
3. Identify stat-only filler cards by faction.
4. Rewrite one low-identity common per faction into a mechanic-teaching card.

This is the cleanest next step because it turns the subjective design audit into data Codex can validate as the card pool grows.

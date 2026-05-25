# Phase 5 Content Expansion Notes

Last updated: May 17, 2026

## Goal

Phase 5 expands content only where the surrounding systems are ready to support it.

The first slice expands dungeon events because Phase 4 already made event nodes first-class. This turns the single hand-coded event screen into a structured event pool that Codex can safely grow.

## First Slice Shipped

- Added `DungeonEventDefinition`, `DungeonEventChoiceDefinition`, and `DungeonEventEffect` types.
- Added `src/dungeon/data/events.ts` with 8 structured Act 1 events.
- Added deterministic event selection in `src/dungeon/engine/eventSelection.ts`.
- Updated `EventView` to render selected event data rather than hard-coded content.
- Added faction-filtered choices through `requiresFaction`.
- Persisted the run seed on `RunState` for deterministic event selection.
- Added `event_choice` telemetry.
- Added `tests/roguelite/dungeonEvents.test.ts`.

## Act 1 Event Pool

- Derelict Signal
- Cinder Market
- Sunless Shrine
- Clockwork Morgue
- Rift Well
- Glass Orchard
- Bone Toll
- Forgotten Camp

## Second Slice Shipped

Events now support richer run-shaping rewards through the shared event effect schema:

- Gain or lose gold.
- Heal HP or take damage.
- Increase max HP, optionally healing by the increase.
- Add a specific card to the deck.
- Remove the first starter card or first deck card.
- Upgrade the first unupgraded deck card.
- Add a specific relic.
- Add a specific potion.

The Act 1 event pool now includes deck, relic, potion, and max-HP choices, so events can bend a run's direction instead of only moving health and gold totals.

## Third Slice Shipped

Events now support consequence effects that carry into the next fight:

- `add_curse` adds an unplayable Curse card to the deck.
- `map_modifier` queues a run modifier such as next-combat Block or enemy Vulnerable.
- `class_resource` queues class-specific combat starts such as Pyroclast Heat, Cogsmith Strength, or Warp Rider Rifts.

New supporting registries:

- `src/dungeon/data/curses.ts`
- `src/dungeon/data/runModifiers.ts`
- `src/dungeon/engine/runModifiers.ts`

The event UI can now show queued modifiers in the bottom run bar, and combat start consumes `next_combat` modifiers after applying them.

## Validation Added

- Event definition validation checks missing card, relic, potion, curse, and modifier references.
- Unit coverage confirms the Act 1 pool includes deck, relic, potion, upgrade, removal, max-HP, curse, map-modifier, and class-resource effects.
- `tests/roguelite/runModifiers.test.ts` pins next-combat modifier application and consumption.
- A live UI smoke on `Clockwork Morgue -> Salvage copper` confirmed React event dispatch and save persistence apply both gold and relic rewards.
- A live UI smoke on `Cinder Market -> Trade in live embers` confirmed React event dispatch and save persistence apply damage, card reward, and queued class-resource modifier.

## Next Recommended Phase 5 Slice

Add conditional event availability:

- conditional choices based on current deck, relics, gold, health, or prior event decisions
- visible disabled-state reasons for choices the player cannot currently take
- event memory flags so one event can affect later event choices

Then expand Acts 2 and 3 with harsher event variants that push specialization, sacrifice, and long-run planning.

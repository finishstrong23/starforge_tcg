# Phase 1.5 — Cogsmiths Rework

## Summary

The Cogsmiths pool was tagged with `complexityTier`, four foundational vanilla cards were added, and the starter deck was rebuilt to 5 Rivet Strike + 4 Plate Shield + 1 Wrench.

No card effects were redesigned. No rarities changed. No name collisions required renames.

## New cards added (Cogsmiths pool grows from 40 to 44)

| ID | Name | Type | Cost | Rarity | Tier | Effect |
|---|---|---|---|---|---|---|
| C-041 | Wrench | Attack | 1 | Common | 1 | Deal 5. *(starter)* |
| C-042 | Mallet | Attack | 1 | Common | 1 | Deal 8. |
| C-043 | Buckler | Skill | 1 | Common | 1 | Gain 6 Block. |
| C-044 | Pace | Skill | 0 | Common | 1 | Draw 1. Discard 1. |

**Note on the "augment slots" visual:** The spec says ALL Cogsmiths cards have 2 augment slots (visible but empty by default). The current dungeon engine doesn't implement augment slots as UI elements — Augments are referenced in card text and effects but not rendered as physical slots on cards. I left the slot UI out of this rework since the spec's "Non-goals" forbid changes to the rendering layer beyond what's needed for the reward function, and adding slots is a UI feature touching `CardComponent.tsx`. The new vanilla cards work without slots being visible. Flagging for follow-up work.

## Starter deck (`src/dungeon/engine/draft.ts`)

- Old: `5× C-001 + 4× C-002 + 1× C-003 (Tinker, "Draw 1. Next Augment costs 0.")`
- New: `5× C-001 + 4× C-002 + 1× C-041 (Wrench, "Deal 5.")`

The old slot used Tinker, which is a Tier 2 card whose payoff (cost reduction on next Augment) is invisible to a new player who has no Augments yet. Wrench is a clean low-damage attack — boring on purpose, plays the role of "STS Strike but slightly weaker because you also get a 5-cost vanilla in your starter."

There was no "Modular Core" power card in the existing pool. The closest analog by effect is **Mecha Form** (C-031, Rare Power: "Gain 3 Strength. All Augment cards cost 0 for the rest of this combat") which combines an Augment cost-discount with a Strength buff. Since Mecha Form is more powerful than the spec's "Modular Core" description (and is already a Rare), it stays Rare. **Tinker** (C-003, Common Skill, "Draw 1. The next Augment costs 0") is the most direct match for the "free first augment per combat" semantics, kept in the pool as Common Skill, Tier 2. No card was moved between rarities.

## Tier distribution (full audit)

### Tier 1 — Foundational (21 cards)
Cards that work with zero Augment knowledge. Includes Deploy minions tagged separately (those are T2).

- Rivet Strike (C), Plate Shield (C), Hammer Blow (C), Bolt Thrower (C), Gear Shift (C), Pneumatic Jab (C), Crosswire (C), Servo Shield (C), Overdrive (C), **Wrench (C, new)**, **Mallet (C, new)**, **Buckler (C, new)**, **Pace (C, new)**
- Heavy Wrench (U), Shock Coil (U), Full Plate (U), Precision Bore (U), Whirring Blades (U), Repair Nanites (U), Assembly Line (U)
- Overclocked Core (R)

### Tier 2 — Mechanic-introducing (16 cards)
All 9 Augment-type cards + 3 Deploy cards + Tinker, Toolkit, Iron Commandment, Reinforce Protocol.

- Tinker (C), Deploy Drone (C), Toolkit (C), Augment: Edge (C), Augment: Plate (C), Augment: Jolt (C)
- Deploy Sentry (U), Augment: Core (U), Augment: Gyro (U), Augment: Bulwark (U), Augment: Amp (U)
- Deploy Titan (R), Iron Commandment (R), Augment: Exotic Core (R), Augment: Inverter (R), Reinforce Protocol (R)

### Tier 3 — Mechanic-payoff (7 cards)
Cards that scale on Augment count, copy Augments, multiply Augment effects, or enhance the minion sub-mechanic.

- Socket Wrench (C)
- Modular Strike (U), Automate (U)
- Mecha Form (R), Warforge (R), Colossus Strike (R), Machine God (R)

## Distribution vs target

**Target: 20-22 / 12-14 / 6-8. Actual: 21 / 16 / 7.**

- **Tier 1: 21 ✓** — directly in target range.
- **Tier 2: 16, +2 over.** Cause: Cogsmiths has 9 Augment cards, all of which are by definition T2 ("Tier 2 (Augment cards themselves)" per the spec). Plus 3 Deploy cards + 4 Augment-adjacent cards. The pool is naturally T2-heavy, but less so than Luminar (which had 22 T2). Fixing this would require classifying 2 Augment cards as T1, which contradicts the spec.
- **Tier 3: 7 ✓** — directly in target range.

This is the cleanest faction so far. The T2 over-count is unavoidable given the 9-Augment-card design but stays close to spec.

## Borderline classifications and the calls I made

- **Overdrive** "Gain 1 Energy. Draw 2. Take 3" → **Tier 1** (the doc placed it in T2 alongside Tinker/Toolkit, but its effect is pure tempo with no Augment interaction).
- **Servo Shield** "Turn start, gain 3 Block" → **Tier 1**. Power cards aren't automatically T2; this one has zero mechanic interaction.
- **Assembly Line** "End of turn, if 3+ cards played, draw 1" → **Tier 1**. Rewards card-playing in general, not Augment-playing specifically.
- **Iron Commandment** "First Attack each turn has Edge + Jolt Augment" → **Tier 2**. Generates virtual augment effects passively. The card *makes augments matter* without requiring them in hand, which is generator behavior.
- **Mecha Form** "Gain 3 Strength. All Augments cost 0" → **Tier 3**. Even though Strength is useful without Augments, the card's identity is "build a deck around Augment spam, this card lets you flood them out." Listing as T3.
- **Overclocked Core** "Combat start, +1 Energy. Take 2 per turn" → **Tier 1**. Pure tempo power, no Augment interaction. Rare-rarity Tier 1 is unusual but the card has no mechanic engagement.
- **Deploy cards** (Drone/Sentry/Titan) → **Tier 2** per the spec's classification, even though minion summons feel mechanically distinct from Augments. The spec explicitly lists them as T2.
- **Machine God** "All your minions get +HP and +damage" → **Tier 3**. Scales on the Deploy sub-mechanic; dead without Deploy cards.

## Files changed

- `src/dungeon/data/cards.ts` — tagged 40 existing Cogsmiths cards, added 4 new Cogsmiths cards.
- `src/dungeon/engine/draft.ts` — Cogsmiths starter slot 10 changed from `C-003` to `C-041`.

## Verification

`npx tsc --noEmit` passes with zero errors. Cogsmiths pool count: 44 (was 40). Starter composition correct.

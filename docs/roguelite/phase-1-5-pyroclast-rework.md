# Phase 1.5 — Pyroclast Rework

## Summary

The Pyroclast pool was tagged with `complexityTier`, four foundational vanilla cards were added, the existing `Spark` was renamed to `Ember Tap` to free its name for the new starter card, and the starter deck was rebuilt to 5 Cinder Strike + 4 Scale Guard + 1 Spark.

No card effects were redesigned. No rarities changed.

## Type changes (`src/dungeon/types/index.ts`)

- New type `ComplexityTier = 1 | 2 | 3`.
- `CardDefinition.complexityTier?: ComplexityTier` — currently optional. Will be tightened to required after all four factions are tagged. Cards without the field default to Tier 1 in the reward roller.

## New cards added (Pyroclast pool grows from 40 to 44)

| ID | Name | Type | Cost | Rarity | Tier | Effect |
|---|---|---|---|---|---|---|
| P-041 | Spark | Attack | 1 | Common | 1 | Deal 4. Generate 1 Heat. *(starter card)* |
| P-042 | Bash | Attack | 1 | Common | 1 | Deal 8. |
| P-043 | Bracer | Skill | 1 | Common | 1 | Gain 6 Block. Draw 1. |
| P-044 | Rally | Skill | 0 | Common | 1 | Draw 2. Take 2. |

## Renames

- `P-012` was `Spark` (Skill, cost 0, "Gain 1 Heat. Draw 1 card.") → renamed to **Ember Tap**. Effect, type, cost, rarity unchanged. Reason: the new starter Spark needed the name for thematic onboarding.

## Starter deck (`src/dungeon/engine/draft.ts`)

- Old: `5× P-001 + 4× P-002 + 1× P-003 (Kindle, "Gain 3 Heat")`
- New: `5× P-001 + 4× P-002 + 1× P-041 (Spark, "Deal 4. Gain 1 Heat")`

The old slot used Kindle, which is a pure Heat generator with no other effect — a Tier 2 card in the starter, against the new design principle. Spark gives the player a usable damage card that happens to also accumulate the mechanic silently.

There was no "Molten Core" power card in the existing pool to move. Forge Heart (P-018, "Whenever you gain Heat, gain 1 Block") is the closest analog and remains in the pool as Uncommon Power, Tier 2.

## Tier distribution (full audit)

### Tier 1 — Foundational (19 cards)
Cards that work with zero Heat knowledge.

- Cinder Strike (C), Scale Guard (C), Ember Volley (C, BLITZ), Ash Cloud (C), Magma Fist (C), Heat Shimmer (C), Cauterize (C), Hot Wind (C), Rekindle (C), **Spark (C, new)**, **Bash (C, new)**, **Bracer (C, new)**, **Rally (C, new)**
- Dragonbreath (U), Soot Burst (U), Glass Cannon (U), Ash Dancer (U), Incinerator (U)
- Volcano (R)

### Tier 2 — Mechanic-introducing (16 cards)
Cards that generate Heat or apply Ignite/Burn but don't punish you for ignoring the resource.

- Kindle (C), Flame Lash (C), Oil Flask (C), Ember Tap (C, renamed)
- Forge Heart (U), Molten Skin (U), Overclock (U), Fuel the Flames (U), Searing Resolve (U), Spirit of Fire (U)
- Sunfire Blade (R), Immolate (R), Phoenix Form (R), Ring of Fire (R), Everburn (R), Dragon's Roar (R)

### Tier 3 — Mechanic-payoff (9 cards)
Cards that consume Heat or scale on Heat/Ignite — weak without prior investment.

- Blazing Charge (C), Pyre Lance (C), Glowing Resolve (C)
- Pyroclasm (U), Meltdown (U), Combustion (U)
- Sun's Fury (R), Forge Master (R), Magma Tide (R)

## Deviation from the doc's target curve

The doc target is 20–22 / 12–14 / 6–8. The actual audit lands at **19 / 16 / 9** (44 cards total).

- **Tier 1: 19 vs 20–22.** One card short of the lower bound. Adding a fifth vanilla card would push us in range, but the doc specifies four. Leaving as-is.
- **Tier 2: 16 vs 12–14.** Two cards over. The Pyroclast pool genuinely has more Heat-generators than the target allows — `Forge Heart`, `Molten Skin`, `Spirit of Fire`, `Phoenix Form`, and `Everburn` are all Heat generators or Heat-adjacent passives. Reducing this would require either redesigning effects (out of scope per the spec's "Non-goals") or moving cards to Tier 3, which would worsen the T3 over-count.
- **Tier 3: 9 vs 6–8.** One card over. The pool has eight cards that explicitly consume or scale on Heat (`Blazing Charge`, `Pyre Lance`, `Glowing Resolve`, `Pyroclasm`, `Meltdown`, `Sun's Fury`, `Forge Master`, `Magma Tide`) plus `Combustion` which scales on Ignite (a Heat-adjacent state).

Recommendation if curve correctness matters more than honest tagging: redesign one Tier 2 to be vanilla, accept the 16 → 15 T2 / 19 → 20 T1 swing.

## Borderline classifications and the calls I made

- **Heat Shimmer** "Gain 4 Block and 1 Heat" → **Tier 1**. Block is the headline; the +1 Heat is incidental flavor. A new player can read this as "gain block".
- **Hot Wind** "Deal 2 to all. Gain 1 Heat" → **Tier 1**. Same logic — vanilla AoE, Heat splash.
- **Ring of Fire** "Reflect 2, +2 if Heat ≥ 5" → **Tier 2** (was T3). The base reflect works without any Heat; the Heat>=5 bonus is the cherry on top, not the whole card.
- **Flame Lash** "Deal 8. If Heat ≥ 3, apply Ignite 2" → **Tier 2** (was T3). Base damage is the headline; the Ignite rider is conditional.
- **Glass Cannon** "+12 next attack, lose 5 HP" → **Tier 1**. Self-damage trade with no mechanic involvement.
- **Volcano** "Turn start, deal 4 to all" → **Tier 1**. Pure passive, no Heat interaction.
- **Forge Heart** "On Heat gain, gain 1 Block" → **Tier 2** (not T3). The card *enables* using Heat without punishing the player for not using it. A Tier 3 card would be one that's dead without Heat.

## Files changed

- `src/dungeon/types/index.ts` — added `ComplexityTier`, optional field on `CardDefinition`.
- `src/dungeon/data/cards.ts` — tagged 40 existing Pyroclast cards, added 4 new Pyroclast cards, renamed P-012 Spark → Ember Tap.
- `src/dungeon/engine/draft.ts` — Pyroclast starter slot 10 changed from `P-003` to `P-041`.

## What's NOT done yet (deferred to later phases)

- The reward weighting function (`getRewardWeights(roomNumber)`) — coming after all four factions.
- The 1,000-run simulation test — coming after the reward function.
- Tightening `complexityTier` from optional to required on `CardDefinition` — coming after all factions tagged.
- Other factions still untagged: Cogsmiths, Luminar, Warp Riders.

## Verification

`npx tsc --noEmit` passes with zero errors. Pyroclast pool count: 44 (was 40). Starter deck composition correct. Existing engine code is undisturbed — `applySpellEffect` already parses "deal N damage" / "gain N heat" patterns, so the new cards work without engine changes.

---

## 2026-07-24 — superseded in part by the heat-first pool rework

The Pyroclast Trials MVP (single-faction re-lock) reworked 22 of these cards
so that 42 of 44 touch Heat, retagged 4 tiers (P-008/P-029/P-042 → T2,
P-031 → T3), and steepened `getRewardWeights` to 60/35/5 · 35/45/20 ·
20/45/35. The starter now swaps one Cinder Strike for Spark. Full card table:
see the addendum in `card-upgrades-pyroclast.md`.

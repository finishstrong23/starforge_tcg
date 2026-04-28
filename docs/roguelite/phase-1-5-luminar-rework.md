# Phase 1.5 — Luminar Rework

## Summary

The Luminar pool was tagged with `complexityTier`, four foundational vanilla cards were added, and the starter deck was rebuilt to 5 Light Jab + 4 Glow Ward + 1 Glimmer.

No card effects were redesigned. No rarities changed. No name collisions required renames.

## New cards added (Luminar pool grows from 40 to 44)

| ID | Name | Type | Cost | Rarity | Tier | Keywords | Effect |
|---|---|---|---|---|---|---|---|
| L-041 | Glimmer | Skill | 1 | Common | 1 | ILLUMINATE | Gain 4 Block. Channel. *(starter)* |
| L-042 | Slash | Attack | 1 | Common | 1 | – | Deal 8. |
| L-043 | Bulwark | Skill | 1 | Common | 1 | – | Gain 7 Block. |
| L-044 | Insight | Skill | 0 | Common | 1 | – | Draw 1. |

**Note on Glimmer:** It carries the `ILLUMINATE` keyword and the "Channel" word in its text, matching the spec ("Goes in starter. Gains Lumens silently."). The base effect (4 Block) is fully usable without any Lumen knowledge — the player just sees they got a block — but the card *is* a Channel card under the hood, so when the player later picks up a Lumen generator from a reward, this card starts accumulating Lumens for future Release effects. This is the "infrastructure visible from turn 1 but inert" pattern from the spec.

## Starter deck (`src/dungeon/engine/draft.ts`)

- Old: `5× L-001 + 4× L-002 + 1× L-003 (Meditate, "Draw 2. Gain 1 Lumen on each Channel card")`
- New: `5× L-001 + 4× L-002 + 1× L-041 (Glimmer, "Gain 4 Block. Channel.")`

The old slot used Meditate, which is a Tier 2 card whose payoff (Lumens on Channel cards) is invisible to a new player who has no Channel cards yet. Glimmer gives the player a usable block + plants a Channel card in their starting deck so the mechanic is silently introduced.

There was no "Inner Sun" power card in the Luminar pool. Closest analogs that match the spec's "adds Lumens to Channel cards" description are Mantra (L-019) and Everlight (L-032), both already in the pool as Uncommon and Rare respectively. Neither was moved.

## Tier distribution (full audit)

### Tier 1 — Foundational (11 cards)
- Light Jab (C), Glow Ward (C), Beam (C), Ward of Dawn (C), **Glimmer (C, new)**, **Slash (C, new)**, **Bulwark (C, new)**, **Insight (C, new)**
- Solar Bolt (U)
- Stellar Body (R), Illumination (R)

### Tier 2 — Mechanic-introducing (22 cards)
Channel cards and Lumen generators. A Channel card's base effect always works without any Lumen interaction, but having it in your deck enables the rest of the engine.

- Meditate (C), Prism Strike (C), Radiance (C), Halo Ward (C), Sunrise (C), Hymn (C), Gleam (C), Steady Light (C), Inner Peace (C)
- Sunbeam (U), Aurora (U), Mantra (U), Focus (U), Blinding Flash (U), Astral Step (U), Starfall (U), Focused Beam (U), Moonlit Guard (U)
- Supernova (R), Everlight (R), Divine Intervention (R), Godlight (R)

### Tier 3 — Mechanic-payoff (11 cards)
Cards that consume Lumens, scale on Lumen totals, multiply Releases, or only do anything if you have Channel cards in hand.

- Chant (C), Harmonize (C), Searing Ray (C)
- Halo (U), Sacred Geometry (U), Enduring Light (U), Wisdom (U)
- Transcendence (R), Gravitas (R), Sun's Blessing (R), Apex (R)

## Major deviation from the doc's target curve

**Target: 20-22 / 12-14 / 6-8. Actual: 11 / 22 / 11.**

This is a much wider miss than Pyroclast and worth raising. The cause: Luminar's faction mechanic is **Channel itself**, not "Lumens" specifically. Roughly half of Luminar's 44-card pool consists of Channel cards (cards bearing the `ILLUMINATE` keyword and the word "Channel" in their text). By the spec's tier definition — "Tier 2: Channel cards or Lumen generators" — every one of those cards is Tier 2.

To hit the target T1 count of 20-22, I'd need to either:
1. Redesign 10+ Channel cards to remove the Channel keyword (out of scope per spec's "Non-goals: Do NOT redesign existing card effects").
2. Reclassify Channel cards as T1 because their base effect always fires (this would be dishonest tagging — a Channel card *is* the mechanic, not adjacent to it).
3. Add 10+ vanilla cards to Luminar (the spec specified 4).

I went with the honest reading. The Luminar reward roller will, in practice, draw mostly Tier 2 cards in mid-act because that's what the pool *is*. This is a faction identity feature, not a bug — Luminar is the "engine builder" faction whose entire kit revolves around accumulating and spending Lumens.

A possible Phase 2 fix: relax the tier-2 weighting for Luminar specifically, OR reclassify some lighter Channel cards (Halo Ward, Steady Light) as T1 because their Release riders are negligible without Lumens.

## Borderline classifications and the calls I made

- **Stellar Body** "First attack each turn reduced to 0" → **Tier 1**. Pure passive defensive. Upgrade adds Lumen, but base text is mechanic-free. Rare-rarity Tier 1 is unusual but matches the spec's "rarity is orthogonal to tier."
- **Illumination** "Reveal intents. Apply Vuln 3 to all" → **Tier 1**. The reveal + AoE Vulnerable is the entire card; no Lumens involved despite the ILLUMINATE keyword. The keyword name doesn't determine the tier, the actual effect does.
- **Solar Bolt** "Deal 14. Exhaust" → **Tier 1**. Pure damage even though it's Uncommon.
- **Searing Ray** "Deal 12. +2 per Channel card in hand" → **Tier 3**. Scales on Channel count; without Channel cards in hand, it's a 12-damage 2-cost (sub-rate). Mechanic-payoff.
- **Wisdom** "Draw cards = total Lumens" → **Tier 3**. Dead without Lumens.
- **Halo** "End of turn, Block = total Lumens" → **Tier 3**. Same logic as Wisdom.
- **Halo Ward** "Channel. Gain 6 Block. Release: +2/Lumen" → **Tier 2**. Borderline; the base 6 block is fully vanilla, but the card has the Channel keyword which makes it part of the mechanic infrastructure. Classifying as T1 would be defensible if "Channel without payoff use" counts as vanilla.
- **Mantra** "First card each turn gains Channel and 1 Lumen" → **Tier 2**. Generates Channel state + Lumens passively. Similar to Pyroclast's Spirit of Fire.
- **Blinding Flash** "Apply Weak/Vuln to all. Consume 1 Lumen per Channel card" → **Tier 2**. The Lumen consumption is a side effect, not a requirement; the AoE debuff fires regardless. Touches the mechanic so not T1.
- **Focus** "Gain 3 Lumens distributed across Channel cards" → **Tier 2**. Generator (the doc lists it as T3 but it's a generator by spec's own definition).

## Files changed

- `src/dungeon/data/cards.ts` — tagged 40 existing Luminar cards, added 4 new Luminar cards.
- `src/dungeon/engine/draft.ts` — Luminar starter slot 10 changed from `L-003` to `L-041`.

## Verification

`npx tsc --noEmit` passes with zero errors. Luminar pool count: 44 (was 40). Starter composition correct. Engine code untouched.

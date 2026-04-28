# Phase 1.5 — Warp Riders Rework

## Summary

The Warp Riders pool was tagged with `complexityTier`, four foundational vanilla cards were added, and the starter deck was rebuilt to 5 Strike + 4 Step + 1 Shimmer.

This is the most disruptive of the four faction reworks because **the previous starter (5× Glitch Strike + 4× Warp Step + 1× Twist) had Flux on every card except Twist**, violating the "no mechanic engagement on turn 1" principle. New vanilla Strike and Step replace those slots; the Flux versions stay in the regular pool as Tier 2.

No card effects were redesigned. No rarities changed. No name collisions.

## New cards added (Warp Riders pool grows from 40 to 44)

| ID | Name | Type | Cost | Rarity | Tier | Effect |
|---|---|---|---|---|---|---|
| W-041 | Strike | Attack | 1 | Common | 1 | Deal 6. *(starter)* |
| W-042 | Step | Skill | 1 | Common | 1 | Gain 5 Block. *(starter)* |
| W-043 | Shimmer | Skill | 1 | Common | 1 | Choose: deal 4 OR gain 4 Block. *(starter)* |
| W-044 | Drift | Skill | 1 | Common | 1 | Gain 4 Block. Draw 1. |

**Note on Shimmer:** The spec calls this a "choice card" — player picks damage or block when the card is played. There's no RNG and no Flux state shifting; the player has full control. This is the only Warp Riders starter card that does anything thematically faction-flavored (Warp Riders are about choices and probability), but it does it without exposing the player to any mechanic complexity.

**Note on Drift:** Goes into the regular pool, not the starter. The starter-flavor slot is Shimmer. Drift is just a vanilla cycle skill for the pool.

## Starter deck (`src/dungeon/engine/draft.ts`)

- **Old:** `5× W-001 (Glitch Strike, Flux) + 4× W-002 (Warp Step, Flux) + 1× W-003 (Twist, Flux reroller)`
- **New:** `5× W-041 (Strike, Deal 6) + 4× W-042 (Step, Gain 5 Block) + 1× W-043 (Shimmer, choose dmg/block)`

This is the largest starter change of the four factions. Every card in the old starter touched Flux. The new starter has zero Flux cards, zero Rifts, zero RNG. A new player picks Warp Riders, sees three completely vanilla card types, and only encounters Flux when they choose to pick a Flux card from a card reward.

**Glitch Strike and Warp Step remain in the regular pool as Tier 2 Common cards.** They keep their original IDs (W-001, W-002) and effects unchanged. They'll show up in card rewards once the player has accumulated some room depth and the reward roller starts pushing T2 cards.

There was no "Probability Anchor" card in the existing pool. The closest analog by effect is **Reality Anchor** (W-039, Rare Power: "At start of each turn, lock one Flux card in your hand to a state of your choice"). It was already a Rare in the pool and tagged Tier 3. No card was moved between rarities.

## Tier distribution (full audit)

### Tier 1 — Foundational (17 cards)
Cards that work with no Flux/Rift/RNG knowledge.

- Unstable Bolt (C), Pocket Dim (C), Phase Slash (C), Echo (C), Void Whisper (C), Anomaly (C), Stutter Step (C), Fold Space (C), **Strike (C, new)**, **Step (C, new)**, **Shimmer (C, new)**, **Drift (C, new)**
- Chaos Bolt (U), Paradox Strike (U), Time Skip (U), Collapsing Star (U), Mirror Self (U)

### Tier 2 — Mechanic-introducing (15 cards)
Flux cards, Rift openers, Flux mitigation.

- Glitch Strike (C), Warp Step (C), Spatial Strike (C), Reality Crack (C), Warped Blade (C), Quantum Guard (C), Dimensional Rift (C)
- Event Horizon (U), Rift Walker (U), Tesseract (U), Dimensional Shield (U), Warp Strike (U), Probability Reset (U), Entropy (U), Singularity (U)

### Tier 3 — Mechanic-payoff (12 cards)
Flux locks, multipliers, RNG payoffs, big finishers.

- Twist (C)
- Probability Wave (U)
- The Archer (R), Cosmic Choir (R), The Burning Face of the World (R), Mistress of the Mysteries (R), Omniverse Slash (R), Rift Master (R), Schrödinger (R), Chrono Break (R), Reality Anchor (R), Genesis Bolt (R)

## Distribution vs target

**Target: 20-22 / 12-14 / 6-8. Actual: 17 / 15 / 12.**

- **Tier 1: 17, 3 short.** Adding more than 4 vanilla cards would exceed the spec's prescribed count. The 4 added (Strike, Step, Shimmer, Drift) hit the spec exactly.
- **Tier 2: 15, 1 over.** Close to target.
- **Tier 3: 12, 4 over.** Cause: every Rare in the pool except none. All 10 Rare cards interact with Flux, Rifts, or probability multiplication and qualify as T3 by strict definition. The pool is intentionally heavy on rare-tier "build-around" payoff cards.

To hit the strict T1/T3 targets, the spec would need to either prescribe more vanilla additions for Warp Riders or accept that the high-rarity end of this faction is mechanically rich. Per "Non-goals: do not redesign," I left effects untouched.

## Borderline classifications and the calls I made

- **Stutter Step** "Gain 6 Block. Reroll Flux" → **Tier 1**. Per the spec's explicit list ("Stutter Step" appears in the doc's T1 enumeration). Base block is fully vanilla; reroll only matters if you have Flux cards.
- **Phase Slash** "Deal 6. Shuffle into draw pile" → **Tier 1**. Has the PHASE keyword but no Flux/Rift interaction in the effect — it's a cycle attack.
- **Anomaly / Unstable Bolt / Chaos Bolt / Collapsing Star** (random-damage cards) → **Tier 1**. Per the spec's explicit guidance ("damage ranges but no Flux state shifting"). These are mechanically distinct from Flux even though they read as "random." A new player understands "deal 4-12 damage" without needing to know what Flux is.
- **Paradox Strike** "Deal 14. 50% take 6 self damage" → **Tier 1**. Random self-damage is part of the "STS Self-Repair Hammer" archetype, not a Flux/Rift mechanic.
- **Time Skip** "Skip enemy turn" → **Tier 1**. Pure utility, no mechanic interaction.
- **Mirror Self** "Add 2 copies of cards in hand, cost 0" → **Tier 1**. Tempo/copy effect, no Flux engagement.
- **Tesseract** "Lock a Flux card's state" → **Tier 2**. Per spec ("Flux mitigation"). Borderline T3 since it requires Flux cards to do anything, but the spec lists it as T2 mitigation.
- **Event Horizon** "Flux cards no longer shift" → **Tier 2**. Pure Flux mitigation (turns the mechanic off).
- **Entropy** "Enemy damage is randomized" → **Tier 2**. Doesn't directly engage Flux but introduces random/chaos energy. Borderline.
- **Mistress of the Mysteries** "Reveal top card, play for -1" → **Tier 3**. Tempo effect that's strong but doesn't directly engage Flux. Spec lists in T3; borderline T2.
- **Omniverse Slash** "5 hits, each 50% double" → **Tier 3** per spec, even though the effect is "more random damage." The 50% multiplier per hit is a probability payoff effect.
- **All Rares (W-031 through W-040)** → **Tier 3**. Every Rare in the pool is either a Flux lock, RNG multiplier, Rift extender, or big AoE finisher. None are vanilla.

## Files changed

- `src/dungeon/data/cards.ts` — tagged 40 existing Warp Riders cards, added 4 new Warp Riders cards.
- `src/dungeon/engine/draft.ts` — Warp Riders starter changed from `5× W-001 + 4× W-002 + 1× W-003` to `5× W-041 + 4× W-042 + 1× W-043`.

## Verification

`npx tsc --noEmit` passes with zero errors. Warp Riders pool count: 44 (was 40). Starter composition correct. Glitch Strike (W-001) and Warp Step (W-002) remain in the pool as Tier 2 Common cards with effects unchanged.

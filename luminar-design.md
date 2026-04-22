# Luminar — Card Collection Design

*Roguelite mode, STARFORGE universe. Class 2 of 4.*

## Faction identity

Luminar are star-priests and celestial channelers, beings who draw power from held light — radiation absorbed, refracted, and released in controlled bursts. Their cosmology treats patience as worship and haste as heresy. Where the Pyroclast erupt, the Luminar *gather*. A Luminar at full charge is the most dangerous thing on the battlefield; a Luminar caught unprepared is a candle.

Mechanically, this is a class for players who can delay gratification. Every turn you hold a Channel card is a turn it gets more dangerous — but also a turn you didn't swing. The tension of the class is always "one more turn?" and the payoff, when it comes, is closer to a nuclear strike than a weapon swing. Luminar has the highest ceiling of any faction in the roster and the slowest floor.

## Core mechanic: Lumens (Channel)

Cards with the **Channel** keyword accumulate **Lumens** while held in hand — +1 Lumen at the start of each turn, capped at 5 Lumens per card (raisable via certain powers). When a Channel card is played, its **Release** clause fires, scaling with the Lumens it had stored.

Lumens are stored *on the individual card*, not on the player. Two copies of the same Channel card in hand each track their Lumens independently. A Channel card shuffled back into the deck loses its Lumens; one discarded at end of turn keeps them, because the card itself is persistent state.

**Retain synergy:** the standard Retain keyword (card stays in hand between turns) is mechanically precious for Luminar. A Retain'd Channel card sits in hand forever, accumulating Lumens. Several Luminar cards interact explicitly with this.

**Design intent:** every turn is a held-breath question. Play the card now for a guaranteed-adequate result, or hold another turn and potentially swing the fight? Unlike Pyroclast's Heat (a shared pool), Lumens force per-card tracking — meaning hand size, draw order, and card selection all matter more than in any other class.

## Archetypes

### Channel Storm
**Win condition:** Hold 3-5 Channel cards across many turns, then release them all in one annihilating burst.

Engine cards: Meditate, Radiance, Sunrise, Mantra, Everlight
Payoff cards: Supernova, Sunbeam, Apex, Prism Strike, Godlight

The slowest archetype and the highest damage ceiling. Apex alone can end a boss fight — it releases every Channel card in hand simultaneously without actually playing them, so your single-turn output scales with hand size. A fully-charged Apex turn can deal 200+ damage. This archetype is what happens when a patient Luminar is allowed to cook.

### Radiant Shield
**Win condition:** Convert stored Lumens into perpetual block and healing. Outlast the fight.

Engine cards: Halo (power), Steady Light, Hymn, Moonlit Guard, Stellar Body
Payoff cards: Halo Ward, Ward of Dawn, Divine Intervention

Plays similar to STS1 Barricade-style defensive decks but with an active resource. Halo turns stored Lumens into block each turn, so you're *rewarded* for holding cards rather than playing them. Stellar Body zeroes the first attack per turn. Can stall virtually any fight; struggles against enemies that ignore block (if we add any — we should).

### Lightweave
**Win condition:** Sequence cards to multiply Release triggers. Execution-heavy.

Engine cards: Sacred Geometry, Chant, Mantra, Focus
Payoff cards: Gravitas (power), Godlight, Starfall, Supernova

Sacred Geometry duplicates the next Release effect. Gravitas doubles all Releases passively. Chant temporarily inflates the next Release's Lumen count. These stack multiplicatively. A Sacred Geometry → Chant (+3 Lumens) → Supernova turn with Gravitas active can hit for obscene numbers. Highest skill ceiling, most sensitive to draw order.

## Combo chains

1. **Stored sunrise** — Meditate → Mantra active → draw Channel cards → hold 3-4 turns → Apex. Every card in hand fires its Release at 3+ Lumens simultaneously. Closes acts.

2. **Halo engine** — Halo (power) + Retain'd Steady Light + held Prism Strike. Every turn, Halo converts stored Lumens into block; cards keep accumulating because Retain never lets them leave. Block scales linearly with hand-size × turns held.

3. **Doubled crescendo** — Sacred Geometry → Chant (+3 Lumens) → Supernova. Supernova base 20 to all + 10 per Lumen, doubled by Sacred Geometry: ~100 damage AoE in one turn. With Gravitas active, this is tripled, not doubled.

4. **Everlight ramp** — Everlight (power) + Sun's Blessing (max Lumens +3) + any Channel card held 8 turns. By turn 8, the Channel card has 8 Lumens stored. A single Prism Strike release at 8 Lumens = 30 damage. A Supernova Release at 8 Lumens = 100 damage to all.

5. **Providence fakeout** — Divine Intervention → take a deliberately huge hit → revive at 10 HP with 5 Lumens distributed → Godlight (huge damage + heal for full). Used against bosses with predictable big-swing turns.

## Boss fight scaling

Luminar runs slower than Pyroclast. Expected damage/block curves:

| Turn | Channel Storm | Radiant Shield | Lightweave |
|------|---------------|----------------|------------|
| 3 | ~15 dmg (single Prism Strike, 3 Lumens) | ~18 Block/turn | ~18 dmg |
| 5 | ~40 dmg (Sunbeam at 5 Lumens) | ~28 Block/turn, healing stable | ~50 dmg (doubled Release) |
| 7 | ~80 dmg (Supernova at 5 Lumens) | ~38 Block, Stellar Body trigger | ~90 dmg (Gravitas + Sacred Geometry) |
| 9 | ~130 dmg (Gravitas-doubled Supernova) | Attrition advantage | ~140 dmg |
| 10+ | ~200+ dmg (Apex release-all) | Wins by grind | — |

Luminar kill turns land 2-3 turns later than Pyroclast, but the damage numbers are higher. Bosses designed for Luminar fights should have ~250-400 HP and damage patterns that reward survival rather than punish it. Avoid putting a "if combat lasts >8 turns you lose" mechanic on any boss accessible to Luminar — it invalidates their entire identity.

## Starter deck (10 cards)

| Count | Card | Rarity | Cost | Effect |
|-------|------|--------|------|--------|
| 5 | Light Jab | Basic | 1 | Deal 6 damage |
| 4 | Glow Ward | Basic | 1 | Gain 5 Block |
| 1 | Inner Sun | Special | Power 1 | At start of each turn, gain 1 Lumen on your leftmost Channel card |

Inner Sun teaches the core loop in the first combat. New players will see a Channel card gain Lumens passively, release it at 2-3 Lumens for a visibly-bigger effect, and internalize "holding is good" without being told. It's a deliberately mild trigger — Mantra and Everlight are the scaled-up versions of this idea available later in the pool.

## Status effects unique to Luminar

- **Channel** — Card keyword. While this card is in hand, it gains 1 Lumen per turn (cap 5, raisable).
- **Lumens** — Per-card resource, consumed on Release. Lost if card is shuffled into the deck.
- **Release** — Triggered clause on Channel cards. Fires when the card is played, scaling with Lumens stored.
- **Retain** (universal) — Card stays in hand between turns. Critical interaction with Channel; several Luminar cards grant this.

## Card list

See `luminar-cards.xlsx` for the full 40-card collection with evolution triggers and combo tags. Same rarity color coding as Pyroclast: common (gray), uncommon (blue), rare (gold).

## Design notes for Claude Code implementation

Three UI things matter more for Luminar than for any other class:

1. **Lumen counters must be visible per card.** Every Channel card in hand displays its current Lumen count as a large number, not a buried icon. Players need to know at a glance which card is closest to peak without hovering each one.

2. **Release effects should animate distinctly from normal card play.** When a Channel card is released at 5 Lumens, the visual should feel different from releasing it at 1. Screen shake, longer flash, sound pitch — whatever conveys "this is a bigger event." If release feels the same regardless of Lumen count, the whole archetype reads as flat.

3. **Retain indicator on cards.** Any card that has Retain should be visually marked (e.g., glow or a hold icon) so players don't accidentally discard them with a discard effect. This matters especially because Luminar's Halo power scales with Retain'd Channel cards in hand — a misplay here can undo 4 turns of setup.

One engineering note: Lumens need to be per-card-instance state, not per-card-type. If the engine stores Lumens as "Prism Strike has 3 Lumens" rather than "this specific copy of Prism Strike has 3 Lumens," the whole mechanic breaks with multiple copies in hand. The data model should treat each card instance as a distinct object carrying its own Lumen count.

## Next steps

1. ✅ **Pyroclast** — Heat, aggression
2. ✅ **Luminar** — Lumens, patience (this doc)
3. **Cogsmiths** — Augments, modular deckbuilding
4. **Warp Riders** — Flux, variance mastery

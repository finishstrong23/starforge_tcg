# Pyroclast — Card Collection Design

*Roguelite mode, STARFORGE universe. Class 1 of 4.*

## Faction identity

Pyroclast are volcanic-born war-creatures, forged in magma flues and tempered at the edge of eruption. Their culture is combustion as virtue — restraint is weakness, and the only real sin is letting your forge go cold. They fight the way a volcano erupts: building pressure until it cannot be contained, then releasing it in a single annihilating moment.

Mechanically, this means Pyroclast rewards players who can ride the edge of overheating without falling off. The faction's skill ceiling is in managing when to stockpile Heat and when to spend it. Their skill floor is low — even badly-played Pyroclast decks deal damage.

## Core mechanic: Heat

Heat is a combat-scoped resource that starts at 0 and caps at 12. Playing Pyroclast cards generates Heat; certain cards consume Heat to deal massive scaling damage. Heat does not carry between combats.

**Overheat penalty:** At Heat 10+, you take 2 unblockable damage at the start of each turn. This is survivable and intentional — it's the cost of running near the red line, not a hard punishment. Many builds want to sit at 10+ briefly before dumping Heat in one explosive turn.

**Design intent:** Heat creates a tempo decision every turn. Spend it now for reliable damage? Bank it for a finisher? Let it push past 10 and accept the penalty for one more turn? Every Pyroclast card is tuned against this question.

## Archetypes

The 40-card pool supports three overlapping archetypes. Most runs will blend two.

### Heat Snowball
**Win condition:** Accumulate Heat over 5-8 turns, then discharge with a scaling finisher.

Engine cards: Kindle, Spark, Spirit of Fire, Everburn, Forge Heart
Payoff cards: Meltdown, Sun's Fury, Pyre Lance, Pyroclasm, Magma Tide

This is the obvious Pyroclast playstyle and the easiest to pilot. Turn 1-6 is setup; turn 7-8 is a single attack for 40+ damage. Excellent against high-HP bosses, weaker against swarms.

### Ignite Stack
**Win condition:** Apply massive Ignite stacks, then detonate for multi-turn DoT damage.

Enabler cards: Oil Flask, Flame Lash, Sunfire Blade, Dragonbreath
Payoff cards: Combustion, Immolate, Volcano

Ignite deals 3 turns of damage at its stack value. Four Ignite means 12 damage guaranteed over 3 turns — and Combustion triggers Ignite immediately for its full value, letting you front-load what would otherwise be slow DoT. This archetype melts bosses who have threatening turn-2 attacks, because you apply the kill before their swing lands.

### Self-Burn / Phoenix
**Win condition:** Take damage deliberately to fuel payoff cards; survive with Phoenix Form.

Engine cards: Glass Cannon, Overclock, Cauterize, Immolate
Payoff cards: Phoenix Form, Ring of Fire, Forge Master (indirectly)

Highest skill ceiling. You're deliberately running at low HP to enable burst turns, relying on Phoenix Form as a safety net. Plays well against fights you've scouted — knowing enemy damage patterns means knowing how low you can go.

## Combo chains

Five combos the deck wants to enable. Each combines 2-4 cards for compounding effect.

1. **Detonation chain** — Oil Flask → Flame Lash (Ignite 4) → Combustion (triggers Ignite = 12 immediate + Ignite again over 3 turns = 24 total from two cards)

2. **Heat dump finisher** — Kindle → Kindle → Spirit of Fire active → Pyre Lance. Turn 4: Heat at ~10, Pyre Lance hits for 24+ while consuming all Heat.

3. **Infinite draw engine** — Forge Master + Fuel the Flames. Exhaust a 2-cost card, gain 6 Heat, draw 2 cards from Forge Master's trigger. If one of those is another Fuel the Flames, repeat.

4. **Overheat tank** — Molten Skin + Heat Shimmer + Glowing Resolve. Turn loop: play block, gain Heat from Molten Skin at turn end, block scales with Heat next turn. Heat 8 = 24 Block from Glowing Resolve alone.

5. **Revival burst** — Phoenix Form + Immolate + Glass Cannon. Drop to 0, revive at 15 HP with 3 Heat, immediately Immolate for 22 + Burn self-damage triggers Ring of Fire returns, end combat.

## Boss fight scaling

The rares in this pool are designed to feel like win conditions in the elite/boss fights specifically. Designed scaling by turn count:

| Turn | Heat Snowball output | Ignite Stack output | Self-Burn output |
|------|---------------------|---------------------|------------------|
| 3 | ~18 dmg | ~20 dmg (Ignite chain) | ~25 dmg (Glass Cannon'd) |
| 5 | ~45 dmg | ~50 dmg (Volcano + Combustion) | ~35 dmg (if revived) |
| 7 | ~80 dmg (Sun's Fury w/ Heat 8+) | ~70 dmg (stacked Ignite) | ~60 dmg (+Phoenix trigger) |
| 9 | ~130 dmg (Meltdown w/ Heat 12) | — | — |

Bosses should have 200-350 HP depending on difficulty. All three archetypes can kill inside 7 turns with good draws.

## Starter deck (10 cards)

| Count | Card | Rarity | Cost | Effect |
|-------|------|--------|------|--------|
| 5 | Cinder Strike | Basic | 1 | Deal 6 damage |
| 4 | Scale Guard | Basic | 1 | Gain 5 Block |
| 1 | Molten Core | Special | Power 1 | At turn start, if Heat ≥ 3, gain 1 Strength |

Molten Core is the character-identity card — every Pyroclast run starts with it, and it quietly teaches new players that holding Heat has reward. First combat will see them gain Heat, trigger Molten Core, watch their damage tick up, and internalize the feedback loop.

## Status effects unique to Pyroclast

- **Heat** — Resource, 0 at combat start, cap 12, self-damage at 10+
- **Burn** — Burn cards (non-playable) that deal 2 damage when drawn and then exhaust themselves
- **Ignite** — Deals X damage at turn start for 3 turns; stack value does not decay with duration

## Card list

See `pyroclast-cards.xlsx` for the full 40-card collection with evolution triggers, evolved effects, and combo tags. Rarity color coding: common (gray), uncommon (blue), rare (gold).

## Design notes for Claude Code implementation

When this pool gets built, three things must be enforced:

1. **Heat is visible** — a dedicated UI element on the combat screen, not buried in status effect icons. The whole archetype reads wrong if players can't see it at a glance.

2. **Evolution counters are visible** — every card in hand shows its progress toward evolution ("5/10 plays to Blazing Strike"). Hidden evolution destroys the sculpture feel.

3. **Ignite is distinct from Burn status** — they share fire imagery but function differently. UI should color-code them (Ignite = orange ring around enemy, Burn = the card-in-deck icon). Conflating them is the most likely bug.

## Next steps

Pyroclast pool is complete. Remaining factions in sequence:

1. ✅ **Pyroclast** — Heat, aggression (this doc)
2. **Cogsmiths** — Augments, modular deckbuilding
3. **Luminar** — Channel, deferred payoff
4. **Warp Riders** — Flux, variance mastery

Each will get its own design doc + spreadsheet on the same template. Mechanics do not overlap — a Pyroclast card in a Cogsmith run would feel foreign, which is what we want for identity.

# Pyroclast — Card Collection Design

*Roguelite mode, STARFORGE universe. Class 1 of 4.*

## Faction identity

Pyroclast are volcanic-born war-creatures, forged in magma flues and tempered at the edge of eruption. Their culture is combustion as virtue — restraint is weakness, and the only real sin is letting your forge go cold. They fight the way a volcano erupts: building pressure until it cannot be contained, then releasing it in a single annihilating moment.

Mechanically, this means Pyroclast rewards players who keep Heat moving. The faction's skill ceiling is in building Heat, Venting it for immediate value, and rebuilding before future Heat gains are wasted. Their skill floor is low — even badly-played Pyroclast decks deal damage — but the best runs should feel like a furnace engine, not a poison deck with fire names.

## Core mechanic: Heat

Heat is a combat-scoped resource that starts at 0 and caps at 10. Playing Pyroclast cards generates Heat; Vent cards spend Heat for damage, Block, draw, healing, or Ignite payoffs. Heat does not carry between combats.

**No overheat penalty:** Heat never damages the player by itself. Sitting at the cap only wastes future Heat gains, which creates positive pressure to spend it often.

**Design intent:** Heat creates a tempo decision every turn. Build now? Vent now? Hold at Blazing because a payoff is in hand? Every Pyroclast card should be tuned against this question.

## Archetypes

The 40-card pool supports three overlapping archetypes. Most runs will blend two.

### Heat Snowball
**Win condition:** Accumulate Heat over 5-8 turns, then discharge with a scaling finisher.

Engine cards: Kindle, Spark, Spirit of Fire, Everburn, Forge Heart
Payoff cards: Meltdown, Sun's Fury, Pyre Lance, Pyroclasm, Magma Tide

This is the obvious Pyroclast playstyle and the easiest to pilot. Turn 1-6 is setup; turn 7-8 is a single attack for 40+ damage. Excellent against high-HP bosses, weaker against swarms.

### Ignite Detonation
**Win condition:** Apply Ignite, then cash it in through Heat/Vent payoffs instead of letting it behave like renamed poison.

Enabler cards: Oil Flask, Flame Lash, Sunfire Blade, Dragonbreath
Payoff cards: Combustion, Immolate, Volcano

The current implementation is a simple decay status: Ignite X deals X damage during that character's turn, then decreases by 1. That is readable, but too close to poison-style decay to be a headline mechanic. The preferred MVP direction is to make Vent cards detonate or amplify Ignite so the player actively chooses when to cash it in.

### Phoenix Recovery
**Win condition:** Use healing, Cauterize, and recovery payoffs to stay aggressive while Venting Heat.

Engine cards: Glass Cannon, Overclock, Cauterize, Immolate
Payoff cards: Phoenix Form, Ring of Fire, Forge Master (indirectly)

Highest skill ceiling. You are not punished by Heat itself, but you may choose cards that trade HP, Ignite, or recovery timing for tempo. Plays well against fights you've scouted — knowing enemy damage patterns means knowing when recovery can buy another aggressive turn.

## Combo chains

Five combos the deck wants to enable. Each combines 2-4 cards for compounding effect.

1. **Detonation chain** — Oil Flask -> Flame Lash -> Vent payoff. Apply Ignite, then use a Heat spender to detonate or amplify the mark.

2. **Heat dump finisher** — Kindle → Kindle → Spirit of Fire active → Pyre Lance. Turn 4: Heat at ~10, Pyre Lance hits for 24+ while consuming all Heat.

3. **Infinite draw engine** — Forge Master + Fuel the Flames. Exhaust a 2-cost card, gain 6 Heat, draw 2 cards from Forge Master's trigger. If one of those is another Fuel the Flames, repeat.

4. **Overheat tank** — Molten Skin + Heat Shimmer + Glowing Resolve. Turn loop: play block, gain Heat from Molten Skin at turn end, block scales with Heat next turn. Heat 8 = 24 Block from Glowing Resolve alone.

5. **Phoenix tempo** — Phoenix Form + Cauterize effects + Vent payoff. Heal or stabilize, then spend Heat before the enemy's next pressure turn.

## Boss fight scaling

The rares in this pool are designed to feel like win conditions in the elite/boss fights specifically. Designed scaling by turn count:

| Turn | Heat Snowball output | Ignite Detonation output | Phoenix Recovery output |
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

- **Heat** — Resource, 0 at combat start, cap 10, never damages the player by itself.
- **Ignite** — Current: deals X damage during that character's turn, then decreases by 1. Target: fire mark that can be detonated or amplified by Vent effects.

## Card list

See `pyroclast-cards.xlsx` for the full 40-card collection with evolution triggers, evolved effects, and combo tags. Rarity color coding: common (gray), uncommon (blue), rare (gold).

## Design notes for Claude Code implementation

When this pool gets built, three things must be enforced:

1. **Heat is visible** — a dedicated UI element on the combat screen, not buried in status effect icons. The whole archetype reads wrong if players can't see it at a glance.

2. **Evolution counters are visible** — every card in hand shows its progress toward evolution ("5/10 plays to Blazing Strike"). Hidden evolution destroys the sculpture feel.

3. **Ignite must become distinct from poison-style decay** — if the rule remains simple decay, it is a support status only. If it is meant to carry class identity, it must interact with Heat/Vent.

## Next steps

Pyroclast pool is complete. Remaining factions in sequence:

1. ✅ **Pyroclast** — Heat, aggression (this doc)
2. **Cogsmiths** — Augments, modular deckbuilding
3. **Luminar** — Channel, deferred payoff
4. **Warp Riders** — Flux, variance mastery

Each will get its own design doc + spreadsheet on the same template. Mechanics do not overlap — a Pyroclast card in a Cogsmith run would feel foreign, which is what we want for identity.

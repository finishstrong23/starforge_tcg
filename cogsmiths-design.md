# Cogsmiths — Card Collection Design

*Roguelite mode, STARFORGE universe. Class 3 of 4.*

## Faction identity

Cogsmiths are artificers — tinker-engineers who believe the soul of a weapon is forged through use and modification, not inheritance. Their warbands travel with portable workshops and field-adapt gear between battles. A Cogsmith is only ever half a fighter; the other half is what they've *built*. Their greatest warriors are known less by their names than by the signatures of their modified kit: the Edge-Plated Hammer of the Third Furnace, the Gyro-Amped Lance of Vaspa Deep.

Mechanically, this is the deckbuilding class. Where Pyroclast makes combat decisions and Luminar makes hand-management decisions, Cogsmiths make *deck-level* decisions. A well-augmented deck by room 15 is a fundamentally different thing than the deck you started with. The class is slow to power up — you need time and augment draws — but once it spins up, it becomes impossible to stop. Cogsmith runs are the ones that feel like you *built something* rather than played it.

## Core mechanic: Augments

A new card type: **Augment**. Augments are played from hand during combat, but instead of dealing damage or block, they **attach to another card in your hand**, permanently modifying it for the rest of the run. The Augment card exhausts on use; the modification lives on the host card forever.

- Every non-Augment Cogsmith card has **2 Augment slots**.
- You can attach two of the same Augment (Edge + Edge = +6 damage).
- Augments persist across combats and acts — they are run-state, not combat-state.
- Augmented cards return to your deck between fights still carrying their augments.
- If a card is removed from your deck (transformation, hard exhaust), the augments go with it.

**Augment categories available in the pool:**

| Category | Effect family | Available at |
|----------|--------------|--------------|
| Edge | +damage on attacks | Common |
| Plate | +block on skills | Common |
| Jolt | Applies Weak on attacks | Common |
| Core | Card draw trigger | Uncommon |
| Gyro | Cost reduction | Uncommon |
| Bulwark | Block retention | Uncommon |
| Amp | Conditional multiplier | Uncommon |
| Exotic Core | 0-cost + non-exhausting | Rare |
| Inverter | Convert single-target to AoE | Rare |

**Design intent:** Augments create a second deckbuilding layer *inside* the deckbuilding game. You're not just picking cards from rewards — you're sculpting the cards you already have. The interesting decision is always "which card gets this augment?" and that decision compounds. A Jolt on a 1-cost cheap attack has very different value than the same Jolt on Colossus Strike. Knowing which is right requires reading the rest of your deck.

## Archetypes

### Heavy Plating
**Win condition:** Stack Plate and Bulwark augments on defensive cards. Summon Drones and Sentries. Win by attrition.

Engine cards: Servo Shield, Gear Shift, Assembly Line, Deploy Drone, Deploy Sentry
Payoff cards: Full Plate, Deploy Titan, Machine God, Augment: Bulwark (stacked)

The tanky archetype. A Plate Shield with Plate+Bulwark augments becomes 6→12 Block that persists across turns. Stack a few of these plus Drones/Sentries dealing passive damage and you outlast anything. Struggles against multi-target AoE, wants single-enemy fights. Boss-safe because most bosses don't have hand-attacks.

### Overclock Combo
**Win condition:** Chain cheap cards for energy and draw, then fuel big attacks in one explosive turn.

Engine cards: Overdrive, Overclocked Core, Crosswire, Tinker, Assembly Line
Payoff cards: Heavy Wrench, Pneumatic Jab, Whirring Blades, Repair Nanites

The combo archetype. Augment cheap cards with Gyro (cost -1) and Core (draw on play) — suddenly they're free-to-play cyclers. Combine with Overclocked Core for extra energy and you chain 8-10 cards per turn. Assembly Line rewards this directly. Payoff is any big attack, fueled by all the energy you've generated. Highest APM class.

### Siege Engine
**Win condition:** Stack Edge + Amp augments on a single big attack. Nuke bosses in one hit.

Engine cards: Toolkit, Automate, Reinforce Protocol, Tinker
Payoff cards: Colossus Strike, Modular Strike, Socket Wrench, Iron Commandment

The boss-killer archetype. Colossus Strike deals 30 damage + 25 per augment on itself. With Edge+Amp attached and Amp triggered that turn, it's ~120 damage for 3 energy. With Exotic Core attached (0-cost, non-exhausting), you can do it twice in one turn. Slower to come online — you need the augment draws — but the highest single-turn damage in the pool.

## Combo chains

1. **Augment factory** — Toolkit → Automate → stack augments fast. Toolkit generates a random augment; Automate copies one already attached. Result: you can go from 0 augments to 4 augments in 3-4 turns. Modular Strike becomes an 22+ damage 1-cost card.

2. **Drone army** — Deploy Drone + Deploy Sentry + Deploy Titan + Assembly Line + Machine God. Every summon buffed by Machine God, passive damage every turn, Assembly Line drawing extra cards whenever you play 3+. Sets up a board that doesn't need you to attack — the units do it.

3. **Overclock loop** — Overclocked Core (power, extra energy) + Overdrive (gain 1 energy, draw 2) + cheap cards augmented with Gyro (cost -1). Free cycling. Easily 10+ cards per turn with the right draws.

4. **Exotic Core nuke** — Augment: Exotic Core attached to Colossus Strike. Now it's a 0-cost 30+ damage attack that doesn't exhaust. Add Edge+Amp and it's 80+. Play it multiple times in one turn if energy allows.

5. **Commandment turn** — Iron Commandment (power) makes your first attack each turn free-augmented with Edge+Jolt. Combined with Crosswire (next attack costs 0), your first attack is free, deals +3 damage, and applies Weak — then the *rest* of your attacks benefit from that Weak target.

## Boss fight scaling

Cogsmiths scale by *run progress*, not combat turn — accumulated augments matter more than which turn you're on.

| Room # | Heavy Plating | Overclock Combo | Siege Engine |
|--------|---------------|-----------------|--------------|
| 3 | ~12 Block/turn | ~18 dmg | ~22 dmg (Modular Strike +1 augment) |
| 7 (first elite) | ~25 Block + 6 dmg drones | ~40 dmg + 6 draws | ~55 dmg (Modular Strike +3 augments) |
| 10 (mid-act boss) | ~40 Block + 12 dmg | ~70 dmg per turn | ~90 dmg (Colossus Strike augmented) |
| 13 (act boss) | Attrition victory | ~100+ dmg combo turns | ~150+ dmg (Exotic Core + Colossus) |

The Cogsmith scaling curve is the flattest of the three factions covered so far — you're ~20% below Pyroclast's output at room 3 and ~30% above at room 13. This is intentional. Cogsmiths should feel underwhelming in the first elite and dominant in the boss.

## Starter deck (10 cards)

| Count | Card | Rarity | Cost | Effect |
|-------|------|--------|------|--------|
| 5 | Rivet Strike | Basic | 1 | Deal 7 damage |
| 4 | Plate Shield | Basic | 1 | Gain 6 Block |
| 1 | Modular Core | Special | Power 1 | The first Augment you play each combat costs 0 |

Modular Core teaches Augments immediately. First augment draw in a combat is free — so there's no energy cost to experiment. By fight 2-3, the player has augmented a starter card, watched it hit harder, and understood the loop viscerally. This is the most important starter teaching card of any faction because the mechanic is the most structurally different.

## Status effects and keywords unique to Cogsmiths

- **Augment** — New card type. Plays to attach to a card in hand; exhausts on attach. Modifier persists on host card for the rest of the run.
- **Slot** — Each non-Augment card has 2 slots visible on its frame. Augments fill slots.
- **Drone / Sentry / Titan** — Summoned ally types with their own HP and per-turn damage. Die when HP depleted or duration expires.
- **Overcharge** — Temporary +1 energy next turn, costs 3 HP when triggered.

## Card list

See `cogsmiths-cards.xlsx` for the full 40-card collection. Pool distribution: 16 common (3 Augments, 13 hosts), 14 uncommon (4 Augments, 10 hosts), 10 rare (3 Augments, 7 hosts). 10 total Augments across the pool.

## Design notes for Claude Code implementation

Four things the engine must get right, in order of risk:

1. **Per-card-instance state is non-negotiable.** Every card in the player's deck needs a unique instance ID and its own augment array. Do not treat "Rivet Strike has Edge" as a card-type property — it is a card-instance property. Two copies of Rivet Strike in the deck may have completely different augments. This is the biggest engineering surface for Cogsmiths and the single easiest thing to get wrong.

2. **Run-save serialization must include augment state.** When the player saves mid-run (close browser, return later), their augmented deck state must round-trip perfectly through IndexedDB. Test this early with a 10-augment deck before shipping. A bug here erases hours of player progress.

3. **Augment UI must show slots visually on every card.** Each card frame should have two slot indicators (empty circles when unfilled, filled with the augment icon when filled). Players should glance at their hand and see at a glance which cards are augmented and with what. Burying this in a tooltip fails the class.

4. **Augments on exhaust cards need clear tooltip.** If Hammer Blow (exhausts on play) is augmented with Edge, new players may worry the augment is lost when Hammer Blow exhausts. It isn't — exhaust is combat-scoped, augments are run-scoped. The card returns to the deck between combats with its augments intact. This needs a tooltip: "Exhausted cards return to your deck between combats."

One design knob to watch: the Inverter rare augment converts a single-target attack to AoE. This is mechanically strong and could be broken on certain hosts (e.g., Inverter + Colossus Strike = 30+ damage to *all* enemies). That might be intended power for a rare, but flag it for playtest.

## Next steps

1. ✅ **Pyroclast** — Heat, aggression
2. ✅ **Luminar** — Lumens, patience
3. ✅ **Cogsmiths** — Augments, deckbuilding (this doc)
4. **Warp Riders** — Flux, variance mastery

Warp Riders is the final faction. Their Flux mechanic is the hardest to balance because it involves RNG — cards that shift states between turns. Worth at least a short mechanic conversation before the card list, same as we did here for Augments.

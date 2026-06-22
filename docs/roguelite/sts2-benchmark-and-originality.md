# STS2 Benchmark And STARFORGE Originality Guardrails

Last updated: June 22, 2026

## Purpose

STARFORGE Dungeon Run is being built for players who understand Slay the Spire-style deckbuilders. That means the game can use familiar genre language: cards, energy, block, relics, potions, maps, elites, bosses, rewards, shops, events, and run scaling.

The design goal is not to copy those systems one-for-one. The goal is to understand why they work, then build a legally and creatively distinct STARFORGE version with its own class loops, names, tuning, art, UI, and encounter ecology.

Official public reference for the comparison target:

- https://store.steampowered.com/app/2868840/Slay_the_Spire_2/

## Legal And Creative Boundary

This is not legal advice. Product decisions should stay inside these practical boundaries:

- Do study genre conventions and player expectations.
- Do not copy exact art, UI layout, characters, enemy names, card names, relic names, writing style, event text, icons, or audiovisual presentation.
- Do not rely on a renamed version of a signature mechanic if the play pattern is identical.
- Do not use "STS2 but with different nouns" as an implementation rule.
- Do define every STARFORGE class by a unique question the player answers each turn.
- Do test similarities honestly. If a STARFORGE mechanic can be explained as "it is exactly like X from STS," it needs a stronger twist or a deliberate reason to remain generic.

## What STS-Like Players Already Expect

These are table stakes, not advantages:

| System | Expected Baseline |
|---|---|
| Energy | Each turn gives a limited resource for card play. |
| Hand/deck/discard | Draw, discard, reshuffle, exhaust/remove are readable and deterministic enough to plan around. |
| Block | Defensive value usually protects for the turn and then clears. |
| Enemy intents | The player sees what enemies plan to do before committing cards. |
| Rewards | Card reward choices shape the deck after fights. |
| Relics | Passive run modifiers create build-defining rules. |
| Potions | Limited-use tactical spikes solve bad turns. |
| Map | Branching path creates risk/reward routing. |
| Elites/bosses | Major fights test whether the deck has a plan, not just numbers. |
| Ascension/challenge | Replays get harder through rules modifiers. |

STARFORGE needs these to feel competent. They cannot be the reason the game wins.

## Where STARFORGE Must Be Better

1. **Class resource clarity**
   - Every faction resource must be visible, inspectable, and linked to card previews.
   - The player should know what the resource does before drafting three cards around it.

2. **More active class loops**
   - A faction should ask a repeatable question every turn.
   - "Do I play my best card?" is not enough.

3. **Cleaner status language**
   - If a status is poison-like, say what makes it different.
   - If it is not different, redesign it or treat it as a generic supporting status instead of a class identity.

4. **Reactive dungeon identity**
   - Route, event, enemy, and boss pressure should respond to the player's build lane.
   - This should feel like the dungeon is noticing the deck, not like hard counters.

5. **Codex-safe content pipeline**
   - Effects should be structured and validated, not inferred from fragile regex text.
   - Every new card/relic/enemy should be testable by automation.

## Pyroclast Similarity Audit

### Heat

Current desired STARFORGE identity:

- Heat is a positive momentum resource.
- Heat never damages the player by itself.
- Heat caps at 10.
- Extra Heat at cap is wasted.
- The fun decision is spending Heat often before future gains are wasted.
- The class loop is Build -> Vent -> Build again.

This is distinct enough if the UI and card pool make frequent Vent turns the center of play.

### Ignite

Current implementation:

- Ignite X deals X damage during the affected character's turn.
- Ignite then decreases by 1.

This is too close to a standard poison-style decay mechanic to carry Pyroclast identity by itself. It can remain as a supporting fire status, but it should not be presented as the faction's main original hook unless it changes.

### Better Ignite Directions

Pick one after playtesting prototypes:

| Direction | Rule | Why It Is More Original |
|---|---|---|
| Detonate | Ignite stacks sit on the enemy; Vent cards can consume Ignite for burst damage. | Turns DoT into a timing/resource interaction with Heat. |
| Kindling | Ignite makes the next Heat/Vent effect stronger against that enemy. | Links enemy state to the player resource loop. |
| Flare Tick | Ignite deals a small tick each turn, but Blazing/Vent cards trigger bonus immediate ticks. | Keeps the burn fantasy while making active card play matter. |
| Spreading Fire | At turn end, Ignite jumps or splashes if the enemy was damaged by a Vent card. | Makes multi-enemy fights tactically different. |
| Armor Melt | Ignite reduces enemy Block/Shield effectiveness before dealing damage. | Creates a Pyro-specific answer to defensive enemies. |

Recommendation: **Detonate + Kindling hybrid**.

Proposed MVP rule:

> Ignite is a fire mark on enemies. At the start of the enemy turn, it deals half its stacks rounded up, then loses 1 stack. When you Vent Heat into an Ignited enemy, consume up to 3 Ignite to deal that much bonus damage and gain 1 Heat back.

Why this works:

- It is still intuitive: fire hurts over time.
- It is no longer only poison with a new name.
- It creates a Pyro turn question: "Do I let this burn, or Vent now and cash it in?"
- It makes Heat and Ignite part of one engine instead of two separate damage systems.

Open risk:

- The rule may be too wordy for a first fight. If so, keep passive Ignite simple in act 1 and introduce Detonate through uncommon cards/relics.

## Benchmark Checklist For Every New Mechanic

Before implementing a mechanic, answer:

1. What familiar deckbuilder expectation does this satisfy?
2. What does STARFORGE add that changes the decision?
3. Can the player understand it from UI feedback, not a guide?
4. Is it testable with deterministic state changes?
5. If compared to STS2 by a player, what is our one-sentence answer for why it exists?

If question 2 or 5 is weak, redesign before adding content around it.

## Immediate Design Actions

1. Keep Heat as the Pyroclast MVP's main identity.
2. Stop describing Ignite as a unique headline mechanic until it has a Heat-linked twist.
3. Prototype Ignite Detonate in a small slice: 3 cards, 1 relic, 1 enemy.
4. Add combat tooltips for Ignite and Heat before changing more card text.
5. Update Pyroclast card roles so "Burn Control" becomes "Ignite Detonation."
6. Use balance tests to compare current poison-like Ignite against the new prototype.


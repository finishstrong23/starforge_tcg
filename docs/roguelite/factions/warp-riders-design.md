# Warp Riders — Card Collection Design

*Roguelite mode, STARFORGE universe. Class 4 of 4 — the final class.*

## Faction identity

Warp Riders are dimensional raiders — warband-caravans who ride the tears between worlds and carry the instability of the warp with them. Their weapons exist in multiple states at once. Their armor phases between timelines. Their battle-doctrine is not discipline but *surrender* — to the chaos, to the drift, to the universe's refusal to settle into one answer. The oldest Warp Rider proverb is that *arrows in the dark always find a target.*

A Warp Rider in combat is never where you think they are a second ago. Their sword might deal 4 damage or 20 depending on how the light caught the edge this turn. You plan against them the way you plan against weather — by accepting you cannot plan, and moving anyway.

Mechanically, this is the chaos class. High variance, high ceiling, high floor-risk. Warp Riders has the widest damage output range of any faction in the roster. A good turn can end fights. A bad turn can cost you the run. The class rewards players who make peace with randomness — not players who try to eliminate it. The mitigation tools exist to let you *steer* the chaos, never to banish it.

## Core mechanic: Flux

Cards with the **Flux** keyword have three variant states, labeled A / B / C. At the **start of each turn**, each Flux card in your hand independently rerolls its state (roughly 1/3 odds per outcome). When played, the card executes whichever state it's currently in.

**Why turn-start instead of on-draw:** predictable timing, unpredictable outcome. You always know *when* the universe will reshuffle — you don't know *how*. This is the sweet spot between "mechanic is noise" (on-draw) and "mechanic is static" (never shifts).

Mitigation tools exist at every tier:
- **Reroll** (common) — forces an immediate state change. Used when your current state is bad.
- **Lock** (uncommon/rare) — fixes the current state, turning off the mechanic for that card.
- **Tesseract** (uncommon) — combat-long lock.
- **Reality Anchor** (rare) — locks one card per turn automatically.
- **Event Horizon** (rare) — stops all Flux shifts passively.

## Secondary mechanic: Rifts

**Rifts** are temporary board zones opened by certain Warp Rider cards. They apply a passive effect for 1-3 turns, then close. Multiple Rifts stack. The pool includes five Rift types:

| Rift type | Effect |
|-----------|--------|
| Cost Rift | One random card costs 0 per turn |
| Damage Rift | All your attacks deal +3 damage |
| Flux Rift | All Flux cards in hand lock to their current state |
| Echo Rift | First card played each turn echoes (plays twice) |
| Genesis Rift | All cards cost -1 Energy (rare; ultimate-tier) |

Rifts give the class a **positional/strategic** layer on top of its RNG layer. Rift Architect decks are the ones that plan 3 turns ahead instead of 1.

## Archetypes

### Chaos Storm
**Win condition:** Play the biggest, most variable cards and accept the rolls. Huge upside.

Engine cards: Unstable Bolt, Anomaly, Chaos Bolt, Collapsing Star
Payoff cards: The Burning Face of the World, Omniverse Slash, Schrödinger, Chrono Break

The swingiest archetype in the entire roguelite. Schrödinger multiplies all damage this turn by 0 or 2 — a coin flip on your kill turn. Omniverse Slash rolls five independent double-damage checks. This archetype wins fights that should have been unwinnable and loses fights that should have been safe. High-stakes pilot class.

### Precision Phase
**Win condition:** Mitigate the RNG with Lock/Reroll effects. Turn Flux from a liability into a consistent tool.

Engine cards: Twist, Tesseract, Event Horizon, Reality Anchor, Probability Wave
Payoff cards: The Archer, Dimensional Shield (locked to A), Warp Strike (locked to A)

The sniper archetype. Event Horizon is the key power — it turns off all Flux shifts entirely, so you play every Flux card in whatever state you last saw. The Archer rewards this with guaranteed 20 damage plus a passive state-lock on your next Flux play. Lowest ceiling, highest floor. Safest Warp Rider build.

### Rift Architect
**Win condition:** Open many Rifts. Stack them. Turn the battlefield itself into a damage/utility amplifier.

Engine cards: Reality Crack, Dimensional Rift, Rift Walker, Mistress of the Mysteries
Payoff cards: Rift Master, Genesis Bolt, Cosmic Choir (indirect)

The strategic archetype. Rift Master doubles Rift duration *and* effects — a single Rift Walker with Rift Master active creates three Rifts that each last 4 turns and hit twice as hard. Mistress of the Mysteries reveals your draw pile and gives you a -1 cost on the top card, letting you plan Rift timing against your own deck. Highest skill ceiling for strategic play.

## Combo chains

1. **Locked burst** — Tesseract + Mirror Self + big Flux card (like Warp Strike at state A). Copy the best-state Flux card, lock both, play both for ~40 damage on a 1-cost base.

2. **Choir trigger engine** — Cosmic Choir (power) + any 3-4 Flux cards in hand. Every turn start triggers 3-4 shifts, each dealing 3 damage. ~10-15 passive damage per turn with no additional plays.

3. **Burning finale** — Mistress of the Mysteries reveals The Burning Face of the World on top of deck → play it for -1 cost (3→2 energy). 40 damage to all enemies, 3 Rifts opened, Vulnerable 2 applied. Single-card fight-ender.

4. **Rift stack** — Rift Walker + Rift Master + any Rift-opening card. 3 Rifts open → doubled to 6 effects, doubled duration (4 turns instead of 2). Battlefield is warped for the rest of combat.

5. **Chrono loop** — Chrono Break + a strong previous turn. Costs 3 energy to replay everything you did last turn — meaning a good setup turn can be *played twice*. Best with front-loaded damage turns.

## Boss fight scaling

Warp Riders scaling is presented as a range because variance is the whole point.

| Room # | Chaos Storm | Precision Phase | Rift Architect |
|--------|-------------|-----------------|----------------|
| 3 | 8-30 dmg (wide range) | ~16 dmg consistent | ~20 dmg + 1 Rift active |
| 7 (first elite) | 20-80 dmg (Omniverse Slash) | ~40 dmg (Event Horizon locks) | ~60 dmg (2 Rifts stacked) |
| 10 (mid-act boss) | 50-150 dmg (Cosmic Choir trigger chains) | ~70 dmg reliable | ~100 dmg (Rift Master doubling) |
| 13 (act boss) | 80-250 dmg (Burning Face turn) | ~120 dmg (precision kill) | ~150 dmg (Genesis Rift turns) |

A Chaos Storm deck at room 13 can deal either 80 damage (bad rolls, limped over the line) or 250 damage (Schrödinger's 2x on a Burning Face turn). The 80 result still clears most bosses; the 250 result ends them in one turn. Precision Phase trades this range for consistency — you'll never have the 250 turn, but you'll also never have the 80 turn.

## Starter deck (10 cards)

| Count | Card | Rarity | Cost | Effect |
|-------|------|--------|------|--------|
| 5 | Glitch Strike | Basic | 1 | Flux: A=4 dmg / B=8 dmg / C=6 dmg + draw 1 |
| 4 | Warp Step | Basic | 1 | Flux: A=5 Block / B=3 Block + 1 energy next turn / C=7 Block |
| 1 | Probability Anchor | Special | Power 1 | Once per turn, lock one Flux card in your hand to its current state. |

Probability Anchor teaches the mitigation side of the mechanic from turn 1. The starter deck is 90% Flux cards, so new players immediately experience the shift-reshuffle-commit loop — and also have a built-in tool to tame one card per turn, which prevents early-run frustration.

## Status effects and keywords unique to Warp Riders

- **Flux** — Card keyword. Card has 3 variant states (A/B/C), randomly rerolls at turn start.
- **Lock** — Flux card state is fixed, no longer shifts at turn start.
- **Reroll** — Immediately force a Flux card to pick a new state.
- **Rift** — Board zone with a passive effect and a duration (in turns). Multiple Rifts stack.

## Card list

See `warp-riders-cards.xlsx`. Includes a Flux State Reference tab showing all A/B/C variants in one grid — essential during playtest because memorizing 12+ Flux cards × 3 states each is impractical.

## Design notes for Claude Code implementation

Five things the engine has to handle, in order of subtlety:

1. **RNG must be seeded per-run and visible in debug.** For balance testing and player trust, every Flux roll needs a deterministic source. Seed at run start from the run ID, derive per-roll from turn number + card instance ID. This way a run can be replayed for bug reports, and "the game cheated" complaints can be investigated.

2. **Flux state is per-card-instance state, not per-card-type.** Same caveat as Cogsmiths Augments. Two copies of Glitch Strike in hand may be in different states. Don't short-circuit this.

3. **Flux display cycles through all three states on the card.** Hovering a Flux card should show its current state prominently with A/B/C legend visible underneath. Players must be able to *read* a Flux card in one glance. Burying states in a tooltip fails the class.

4. **Rift UI needs a persistent zone above or below the combat area.** When 3 Rifts are active, players need to see all 3 at once with remaining duration on each. Not a tooltip. Not an icon row. A visible zone.

5. **Chrono Break needs a turn log.** The card replays "every card play from your previous turn, in order." The engine must log card plays per turn and replay them exactly — including their resolution order, targets, and Flux states at time of play. Easiest place to introduce bugs in the whole roguelite.

One balance note: Schrödinger (Rare, Skill 2) multiplies *all* damage this turn by 0 or 2. That includes damage you take. Intentional — the card is a high-stakes gamble in both directions. If playtesting shows it feels too swingy even for this class, the fallback is 0.5x/2x instead of 0/2x.

## Cross-faction notes

This completes the four-class roster. A few observations from the whole design:

- **Pyroclast** scales combat-turn: faster fights, explosive mid-combat.
- **Luminar** scales combat-turn slower: later fights, held-breath pattern.
- **Cogsmiths** scales run-progress: augments accumulate across rooms.
- **Warp Riders** scales through *variance*: same turn can produce dramatically different outcomes.

No two classes share a scaling axis. A player bouncing between classes will feel four genuinely different games, which is exactly what we want for class-based replay value.

The Reactive Ecology system (the other half of the roguelite's design pillars) reads each faction's threat vector differently — Pyroclast triggers cleanser/block-heavy counters, Luminar triggers burst/discard counters, Cogsmiths triggers artifact-disruption counters, Warp Riders triggers consistency-breakers. That means picking a class doesn't just change your deck — it changes *what the dungeon becomes*. That's the design thesis the whole game runs on, and with all four classes in place, we're ready to spec the ecology.

## All four factions complete

1. ✅ **Pyroclast** — Heat, aggression
2. ✅ **Luminar** — Lumens, patience
3. ✅ **Cogsmiths** — Augments, deckbuilding
4. ✅ **Warp Riders** — Flux, variance (this doc)

Next meaningful design phase: the Reactive Ecology system — how enemy encounters are rolled based on what's in your deck.

# Reactive Ecology — System Design

*The enemy adaptation engine. The load-bearing differentiator of the whole roguelite.*

## What this system is

Every STS-style game uses fixed enemy pools — Act 2 has the same enemies every run, and once you know them, the meta calcifies. Players solve the tier list, memorize counters, and the game becomes execution rather than adaptation.

Reactive Ecology breaks this. Enemies in Shattered Reach are templates with **adaptive trait slots** that get populated based on what you've built. Your deck's composition is continuously analyzed into a **Threat Vector** — a numerical summary of what kind of threat you pose. When the map generates enemies for upcoming rooms, the game reads your Threat Vector and rolls enemy traits from pools weighted to counter you.

Heavy poison deck? Act 2 cleansers. Lightning-focused? Insulators. Big single-target? Swarm enemies. Block-heavy turtle? Block-ignorers. Flux-spam? Consistency-punishers.

The point: **there is no optimal deck**, because the optimal deck is conditional on the run and what's already on the map. Every run is a negotiation between what you want to build and what the dungeon will become in response.

## Design principles

Five rules that govern the whole system. These are the acceptance criteria.

1. **Adaptation must be readable, not invisible.** Players need to see *why* the enemy they're facing is hard for them. Trait names are shown on hover ("Cleanser: immune to poison"). Players who lose to a counter should understand what happened.

2. **Adaptation must be moderate, not oppressive.** A Pyroclast-focused deck meeting an armored room 7 enemy feels fair; meeting an armored room 2 enemy feels unfair. Early rooms should be minimally adapted; late rooms heavily adapted. The curve matters.

3. **Adaptation must be recoverable.** Every counter the system rolls should be beatable if the player *pivots*. Never roll traits that hard-counter the player's entire deck — roll traits that make their current strategy harder so they have to dip into secondary strategies.

4. **Adaptation is per-act, not per-combat.** The Threat Vector is evaluated when a new act's map is generated. All of that act's enemies are baked in at map-gen time. Mid-act, you can see your threats and plan. No on-the-fly adaptation — that would feel like cheating.

5. **Adaptation must be deterministic from the map seed.** The same runId + act + deck state must produce the same enemy traits. This keeps saves consistent and daily runs fair across players.

## The Threat Vector

A single data structure, recomputed whenever the deck changes. Five axes, each normalized to 0.0-1.0.

| Axis | What it measures | How it's calculated |
|------|------------------|---------------------|
| `damageType.physical` | % of attacks that are pure physical damage | Count cards with "Deal X damage" / total attack cards |
| `damageType.elemental` | % of attacks that apply Burn/Ignite/Weak/Vulnerable | Count attacks with status rider / total attacks |
| `damageType.dot` | Relative Burn/Ignite density | Sum of Burn/Ignite values across deck / deck size |
| `scaling.burst` | Bias toward single-turn huge damage | Count cards with damage >15 or multipliers / deck size |
| `scaling.sustained` | Bias toward small consistent damage | Count cards with damage 3-9 and multi-hit / deck size |
| `scaling.tempo` | Card cycling and energy economy density | Count cards with "draw" or "gain Energy" / deck size |
| `defense.block` | Block density | Count Block-granting cards / deck size |
| `defense.retain` | Retain density | Count Retain'd or Retain-granting cards / deck size |
| `defense.healing` | Heal density | Count healing cards and relics / deck size |
| `mechanic.heat` | Pyroclast signature weight | Heat-generating cards / deck size |
| `mechanic.lumens` | Luminar signature weight | Channel cards / deck size |
| `mechanic.augment` | Cogsmith signature weight | Augments attached across deck / deck size |
| `mechanic.flux` | Warp Rider signature weight | Flux cards / deck size |

Thirteen axes total, but functionally three clusters: **how you hurt them** (damage type + scaling), **how you survive** (defense), **what mechanic you rely on** (faction signature).

### Threat Vector computation

Runs on every deck change event: card added, card removed, card evolved, Augment attached, relic acquired. Pseudocode:

```
function computeThreatVector(deck, relics) -> ThreatVector:
    tv = new ThreatVector (all zeros)
    for each card in deck:
        accumulate into relevant axes
    for each relic:
        accumulate into relevant axes
    normalize all axes to 0.0-1.0
    return tv
```

Normalization is simple: divide each raw count by the biggest plausible value for that axis. `damageType.dot` for instance is capped at 0.5 because half the deck being pure DoT is the plausible ceiling.

### The Threat Vector is visible to the player

In the run HUD, show a small panel: "Ecology Read" with the top 3 axes. "The Reach sees you as: burst damage, high block, Pyroclast resonance." Players know exactly how they're being read. This is the "readable, not invisible" principle in action.

## Enemy trait slots

Every enemy template has 1-3 slots that get filled when the map is generated. Slots are sized by enemy tier:

| Enemy tier | Slot count |
|------------|------------|
| Regular | 1 |
| Elite | 2 |
| Act boss | 3 |
| Final boss (Heartwake) | 4 (one per phase) |

Each slot draws from a pool weighted by the Threat Vector. Some traits are neutral (always viable, never counter-specific). Some traits are specifically counter-weighted to one or two Threat Vector axes.

## The Trait Pool

30 traits across 5 categories. Categories correspond to Threat Vector axes.

### Damage-counter traits (counter high damage output)

1. **Armored** — +5 Block per turn passively. *(counters `damageType.physical`)*
2. **Thick-Skinned** — Takes −3 damage from all hits (min 1). *(counters `scaling.sustained`)*
3. **Evasive** — 30% chance to dodge single-target attacks. *(counters `scaling.burst`)*
4. **Ablative** — Takes 50% damage from the first attack each turn. *(counters `scaling.tempo`)*
5. **Regenerating** — Heals 5 HP at end of turn. *(counters low-damage runs broadly)*
6. **Hardened** — Immune to Vulnerable. *(counters `damageType.elemental`)*

### Status-counter traits (counter DoT and debuff strategies)

7. **Cleanser** — Removes all debuffs at end of its turn. *(counters `damageType.dot`)*
8. **Purging** — Burn and Ignite do half damage against this enemy. *(counters `damageType.dot`)*
9. **Steadfast** — Immune to Weak. *(counters `damageType.elemental`)*
10. **Absorbent** — Gains 1 Strength when Burn is applied to it. *(counters DoT, hard)*

### Disruption traits (counter specific faction mechanics)

11. **Dampener** — Reduces your Heat gain by 50%. *(counters `mechanic.heat`)*
12. **Silencing** — Channel cards lose 1 Lumen per turn. *(counters `mechanic.lumens`)*
13. **Anti-Augment** — At combat start, one random Augment in your deck is disabled for this fight. *(counters `mechanic.augment`)*
14. **Anchoring** — All your Flux cards lock to state B (middle value) for combat. *(counters `mechanic.flux`)*
15. **Draining** — Steals 1 Energy from you at combat start. *(counters `scaling.tempo`)*
16. **Disruptive** — 25% chance to force-discard a random card from your hand each turn. *(counters hand-control decks)*

### Defense-counter traits (counter block-heavy play)

17. **Piercing** — Ignores 50% of your Block. *(counters `defense.block`)*
18. **Rending** — Attack damage ignores Block entirely. *(counters `defense.block` hard)*
19. **Decaying** — Your Block is halved at turn start. *(counters `defense.retain`)*
20. **Anti-Heal** — You cannot heal during this combat. *(counters `defense.healing`)*

### Tempo-counter traits (counter combo/cycling decks)

21. **Accelerating** — +1 Strength every turn. *(counters long fights)*
22. **Urgent** — At turn 5+, gains a second action per turn. *(counters stall decks)*
23. **Swarm** — Summons 1 additional low-HP enemy per turn. *(counters AoE-weak decks)*
24. **Splitting** — When killed, splits into 2 half-HP copies. *(counters burst, rewards AoE)*
25. **Echoing** — Copies the debuff you applied last turn and applies it to you. *(counters debuff spam)*

### Neutral traits (rolled at low TV weight, "flavor" fills)

26. **Bristled** — Deals 3 damage back whenever attacked. *(neutral, slight damage punish)*
27. **Intimidating** — Applies Weak 1 at combat start. *(neutral, small debuff)*
28. **Lumbering** — Only acts every other turn, but deals double damage when it does. *(neutral, pattern variation)*
29. **Coordinated** — Grants +2 damage to adjacent enemies in its row. *(neutral, group-play change)*
30. **Fragile** — HP −25%, but +50% damage output. *(neutral, glass-cannon variant)*

## Adaptation intensity curve

How aggressively the system rolls counter-traits scales across the run:

| Room # | Counter-weight | Neutral-weight |
|--------|----------------|----------------|
| Rows 2-3 | 0% | 100% (all neutral) |
| Rows 4-6 | 30% | 70% |
| Rows 7-9 | 55% | 45% |
| Rows 10-12 | 75% | 25% |
| Row 13 (pre-boss) | 85% | 15% |
| Act boss | 90% | 10% |
| Final boss | Custom (phase-gated, see below) |

Early rooms teach without punishing. Late rooms punish specifically. Players can anticipate the pressure and pivot mid-act.

## Trait roll algorithm

For each enemy placed on the map:

```
function rollTraits(enemyTemplate, threatVector, roomDepth, prng) -> Trait[]:
    slots = enemyTemplate.slotCount
    traits = []
    
    for i in 0..slots:
        if roll counter-trait:
            axis = weighted_pick_axis(threatVector)  // bigger axes more likely
            pool = TRAITS_BY_COUNTER_AXIS[axis]
            trait = prng.pick(pool, excluding=traits)
        else:
            trait = prng.pick(NEUTRAL_POOL, excluding=traits)
        traits.append(trait)
    
    return traits
```

Key details:

- `weighted_pick_axis` makes axes the player scores high on MORE likely to roll counters. If Pyroclast deck has Heat at 0.8 and Lumens at 0.0, Dampener is much more likely than Silencing.
- Counter-trait probability is `counter_weight` from the intensity curve above.
- `excluding=traits` prevents a single enemy from rolling the same trait twice.
- Some trait combinations are banned. See Conflict Rules below.

## Conflict rules

Traits that shouldn't stack on a single enemy (creates unfun combinations):

- Not both `Rending` and `Piercing` (redundant, all-or-nothing block counter)
- Not both `Evasive` and `Ablative` (players can't land hits at all)
- Not both `Anti-Heal` and `Regenerating` (nonsensical combo)
- Not both `Urgent` and `Accelerating` (too much scaling)
- Not both `Disruptive` and `Draining` (resource starvation compound)

## Boss adaptation — The Heartwake

The final boss's 4-phase structure means each phase gets one trait rolled independently against the Threat Vector axis most relevant to that phase.

| Phase | Fixed mechanic | Trait slot roll |
|-------|----------------|-----------------|
| 1 (Heat phase) | Uses Heat patterns | Roll vs `mechanic.heat` |
| 2 (Channel phase) | Uses Lumen patterns | Roll vs `mechanic.lumens` |
| 3 (Augment phase) | Uses Augment patterns | Roll vs `mechanic.augment` |
| 4 (Flux phase) | Uses Flux patterns | Roll vs `mechanic.flux` |

This creates the satisfying payoff: whichever faction you mastered gets its own phase against you, traited specifically to punish your build. No two Heartwake fights are the same shape.

## Interaction with relics and cards

Some player-side tools exist specifically to interact with this system:

- **Void Compass relic** previews telegraphed actions — effectively, reveals enemy traits 3 turns early.
- **Cursebreaker's Medallion** removes one random debuff at combat start — counters enemies with `Intimidating` or `Echoing`.
- **Illumination** card (Luminar rare) reveals all enemy intents — shows you the trait read.
- **The Cartographer's Skull** Anomaly choice reveals all future room traits at once.

Each of these is an intentional design "out" — tools that let observant players see the counter-pressure coming and plan around it. Preserves the "recoverable" design principle.

## Example: Threat Vector in action

A run 10 rooms deep with this Threat Vector:
- `damageType.dot`: 0.65 (heavy Ignite/Burn deck)
- `mechanic.heat`: 0.70 (Pyroclast core)
- `scaling.burst`: 0.45 (has Meltdown / Sun's Fury)
- All other axes: below 0.3

Next enemy is a regular (1 slot). System rolls 75% counter → 25% neutral. Counter rolled. Pick axis by weight: DoT (0.65) and Heat (0.70) most likely. DoT rolled. Pool: {Cleanser, Purging, Steadfast, Absorbent}. Picks Purging.

Player enters combat. Enemy frame shows: "Purging — Burn and Ignite do half damage." Player reads this, sees their Ignite Stack plan is weakened, shifts to direct damage with Pyre Lance and Sun's Fury instead. Fight is harder but winnable.

If the player had a wider deck — say they'd picked up a Physical-damage rare — the pivot would be smoother. This is why diversity helps. The system rewards draft variance indirectly.

## Implementation notes for Claude Code

Eight things the engine must handle:

1. **ThreatVector is a first-class data type in the run state.** Recompute on every deck change. Cache the result on the run object. Don't recompute per-frame.

2. **Trait rolls happen at map generation time, not at combat start.** When `generateMap(runId, actNumber)` runs, compute ThreatVector from the current deck state and bake trait rolls into the generated map nodes. Trait data is part of the map graph.

3. **Trait data structure on each node:**
   ```typescript
   type CombatNode = MapNode & {
     enemies: {
       templateId: string
       rolledTraits: TraitId[]
     }[]
   }
   ```

4. **Determinism is mandatory.** The trait roller pulls from the same SplitMix64 seeded with `mapSeed`. Same seed + same ThreatVector must produce identical traits every time.

5. **Between acts, the ThreatVector is recomputed.** Player might have picked up new cards/relics in Act 1. Act 2's map is generated against the updated vector. This is what makes the run feel like an escalating conversation between player and dungeon.

6. **Player-facing UI shows trait names on hover.** Never hide trait info. Beside each enemy portrait, show the traits with short tooltips. Players who lose to a counter should always understand why.

7. **Top-of-act preview UI.** When player enters a new act, show a small "Ecology Read" panel: the 3 highest Threat Vector axes and a one-line summary of how the dungeon sees them. "The Reach reads you as: burst damage, Heat-heavy, low defense. Expect resistance."

8. **Trait definitions live in a single data file.** Not hardcoded in enemy definitions. This lets trait effects be tuned independently of enemy stats. `/src/roguelite/data/traits.ts`.

## Balance knobs for playtest

Seven tunables likely to need adjustment:

1. **Adaptation intensity curve** (the counter-weight percentages per row range). If runs feel too punishing, soften. If they feel samey, stiffen.

2. **Individual trait severity.** `Rending` (Block ignored entirely) is the hardest trait in the pool and may need to be gated to Elites only. `Anti-Heal` could be similarly restricted.

3. **Axis weighting in `weighted_pick_axis`.** Linear weighting means a 0.8 axis is 8x as likely as 0.1. Could be softened to sqrt weighting (0.8 → 2.8x) if counters feel too aggressive.

4. **Cleanser + Purging overlap.** Both counter DoT. May need to ensure only one can roll on a single enemy.

5. **Neutral trait ratio.** Some runs will want to feel safer — tuning neutral ratio up by 10-15% at rooms 10-12 could ease late-run stress.

6. **Boss adaptation.** Whether all 3 elite traits roll counter-weighted or whether one is always neutral (so elites have some predictability) is a playtest call.

7. **Heartwake phase-trait severity.** Four counter-traits in one boss fight is a lot. May need to tune each phase to softer traits than a normal elite would roll.

## Design notes

The Reactive Ecology is the thing that makes "better than STS2" a real claim rather than marketing. The system has three properties STS lacks:

- **Personalized difficulty.** Two players running the same class with different decks fight different dungeons. The game *notices* what you built.
- **Evolving threat throughout a run.** Act 2 is not a fixed challenge. It's a challenge calibrated to you as-of Act 1's end.
- **Emergent replayability.** Not "here are the other classes" replay. Rather "every class has infinite shapes because the dungeon is conditional on the shape."

This is the thing that, if we get it right, makes STARFORGE roguelite a game people talk about instead of "the STS-like with that sci-fi art."

The risk: all of this depends on playtest feeling. If counter-rolls feel unfair, the system fails. If they feel invisible, the system fails. The UI and tooltip work is as important as the algorithm.

## Next steps

1. ✅ Reactive Ecology (this doc)
2. **Potions** — combat-use consumables, 3-slot inventory. Smaller scope, ~10-12 potions.
3. **Meta progression** — between-run unlocks, Ascension-style difficulty tiers.

With Reactive Ecology spec'd, the core game design is essentially complete. Potions and meta-progression are the remaining systems, both smaller-scope. After those, the design phase is done and implementation owns the project.

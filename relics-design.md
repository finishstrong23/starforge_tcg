# Relic Pool Design — MVP

*Roguelite mode, STARFORGE universe. 20 relics for the first playable build.*

## What relics are

Relics are passive artifacts acquired during a run. Once picked up, they trigger automatically — you never "play" them. Every relic alters the rules of the run in some way: buffing a mechanic, adding a trigger, changing a combat stat, or opening a new strategic layer.

Unlike cards (which you draw into hand) and potions (which you consume), relics are the third layer of player power — the part of your build that runs silently in the background and shapes how every fight plays out. STS1 players know them as the difference between a run that feels *okay* and a run that feels *broken in your favor*.

## Design targets

Five rules this pool follows:

1. **Every faction has relics that amplify its mechanic.** Pyroclast Heat, Luminar Lumens, Cogsmith Augments, Warp Rider Flux — each has 2-3 relics tuned for it. A Pyroclast player who opens a Luminar-focused relic has a useless pickup, which is fine; it forces rerolling via the shop.

2. **Faction-neutral relics dominate the common tier.** 60% of relics work regardless of class. This keeps early runs feeling rewarding rather than punishing newbies who don't know the pool.

3. **Rare relics are build-defining.** They're what turn a mediocre deck into a win. A rare pickup should feel like *oh, the run just became this*.

4. **Boss relics are asymmetric gambles.** Every boss relic is incredibly powerful with a meaningful downside. You pick one after every act boss and have to live with it.

5. **No relic duplicates within a run.** Once you have a relic, it doesn't show up again in reward pools.

## Tier distribution

| Tier | Count | Where found | When acquired |
|------|-------|-------------|---------------|
| Starter | 4 | Fixed — one per character | Granted at run start |
| Common | 8 | Elite rewards, shop, events | Throughout the run |
| Uncommon | 5 | Elite rewards, shop, events | Act 2+ biased |
| Rare | 5 | Elite rewards (10%), shop (rarely), events | Uncommon in Act 1, more in Act 3 |
| Boss | 3 | Post-boss reward, player picks 1 of 3 | Only after Act 1 and Act 2 bosses |

Total **25 relic entries** (20 core + 4 starters + boss pool), but the tier counts shown refer only to what rolls into reward pools. Starter relics aren't in the reward pool because you already have yours.

## Starter relics (one per character)

Each character begins with a faction-themed relic that subtly teaches their core mechanic alongside the signature power card.

### Pyroclast Ignitor — **Forgeheart Ember**
*The dying coal from your father's forge, still warm.*
- Combat start: gain 2 Heat.

Quiet teaching relic. Players begin every fight already at 2 Heat, so they see their Heat meter non-zero from turn 1. This establishes that Heat is always accumulating.

### Cogsmith Artificer — **Pattern Caliper**
*A gauge for measuring modifications. Inherited.*
- The first Augment attached to each card costs 0.

This is stronger than Modular Core on your starter deck (which only applies to the first Augment *per combat*). Pattern Caliper applies *per card*, so every base card you own can be freely augmented once without cost.

### Luminar Channeler — **Suncaller's Lens**
*Focuses the morning light through prayer.*
- All Channel cards in hand have +1 Max Lumens.

Raises the Lumen ceiling from 5 to 6 on every Channel card. Subtle but run-long effect.

### Warp Rider Shiftblade — **Navigator's Bone**
*A Warp Rider finger bone, still warm.*
- Once per combat, force-reroll one Flux card's state.

The mitigation starter. One free reroll per fight, rechargeable.

## Common relics (8) — mostly faction-neutral

### **Ironbark Amulet**
*Dense wood plating from a Bloodoak tree, cured in ash.*
- Max HP +8.

The most common relic in the pool. Always a welcome pickup. Weight: max health scaling is the baseline economy of roguelite runs.

### **Fueled Boots**
*Pyroclast-forged, hum when you walk.*
- Gain 1 Energy on the first turn of every combat.

One of the strongest economy relics. STS1's Lantern if you know it. Every combat starts with +1 Energy for one turn, which means an extra card play per fight — which compounds across 35 fights in a run.

### **Stasis Cube**
*A 2-inch cube that vibrates at a frequency just below hearing.*
- At start of each combat, add 1 random Block card to your hand.

Free block card per fight. Especially good for aggressive decks that didn't draft enough defense.

### **Preserver's Salve**
*Stolen from a Luminar infirmary.*
- At end of every combat, heal 2 HP.

Simple, reliable. 2 HP × 35 combats = 70 HP of healing across a run. Quietly excellent.

### **Archivist's Orb**
*A recording device that remembers only the strong.*
- At the start of every combat, draw 1 additional card.

The engine relic for any draw-dependent build. STS1's Bird-Faced Urn energy if you know it.

### **Stasis Coil**
*Wraps around your arm. Cold to the touch.*
- Whenever you play a card, 10% chance to reduce its cost by 1 this turn.

Low-ceiling but high-frequency. Over a run you'll save 30-40 Energy total, which lets you finish fights a turn earlier.

### **Gutterspeak Coin**
*A coin from a faction that no longer exists.*
- Gain 1 gold at the end of every combat.

Run-long economy. Not flashy, stacks into maybe 35 extra gold. Pair with shops.

### **Sparkthief's Glove**
*Charges from electrical ambient. Crackles softly.*
- Once per combat, the first Attack you play deals +3 damage.

Flat damage bonus to first attack. Good in every archetype because every archetype has first-attacks.

## Uncommon relics (5) — faction-flavored, generally useful

### **Forgemaster's Sigil** (Cogsmith-themed, universal)
*Brand of a Cogsmith master artisan.*
- The first time you play a card each combat, it is temporarily augmented with +2 damage or +2 Block.

Works for any class but especially good for Cogsmith (stacks with existing Augments).

### **Starseer's Pendant** (Luminar-themed, universal)
*Crystallized starlight. Warm to the touch.*
- Whenever you retain a card between turns, gain 1 Block.

Any class can use Retain. Huge for Luminar (Halo decks); solid for anyone with Retain sources.

### **Void Compass** (Warp Rider-themed, universal)
*Points at something, but not north.*
- At combat start, preview the first enemy's telegraphed action for the next 3 turns.

Information advantage. Planning tool. Especially strong against bosses with phase transitions.

### **Overclocked Core**
*A reactor chip that has forgotten how to be safe.*
- Gain 1 additional Energy at combat start. Lose 5 Max HP.

The classic risk-reward economy relic. +1 energy forever is enormous; -5 Max HP is painful but survivable.

### **Cursebreaker's Medallion**
*Burns away what shouldn't be on you.*
- At start of combat, remove one random debuff from your hand's status effects.

Defensive tempo. Useful in acts 2 and 3 where enemies apply stacking debuffs.

## Rare relics (5) — build-defining

### **Crown of the Unburnt** (Pyroclast payoff)
*A crown forged from congealed lava. Heavy.*
- You can sit at Heat 10+ without taking the overheat penalty.

Pyroclast Heat cap effectively removed. The crown turns Heat Snowball from "ride the edge" into "ride past the edge and don't fall off." Build-defining for Pyroclast, useless otherwise.

### **The Chorus Shard** (Luminar payoff)
*A piece of the Cosmic Choir, carved small.*
- All Release effects are triggered twice.

Stacks multiplicatively with Gravitas and Sacred Geometry. A Supernova with Gravitas + Chorus Shard fires four times. Build-defining for Luminar.

### **Modular Heart** (Cogsmith payoff)
*An engine that is also a blueprint.*
- Every card in your deck gains a third Augment slot.

Changes the Cogsmith ceiling from 2-slot to 3-slot cards. Siege Engine decks with this can stack Edge + Edge + Amp on a single Colossus Strike. Build-defining for Cogsmith.

### **The Unmoored Eye** (Warp Rider payoff)
*An eye that cannot settle on what it sees.*
- At start of each turn, you may choose one Flux card in your hand and lock it to a state of your choice.

Turns Warp Riders' variance into precision. Stacks with Reality Anchor for 2 locks per turn. Build-defining for Warp Riders.

### **Runekeeper's Tome** (class-neutral)
*A book that remembers every fight you've won.*
- Every 3rd combat, add a random rare card to your hand at combat start.

Deck-inflating engine. Over a run you gain 10+ free rare cards, many of them usable even off-class. High ceiling.

## Boss relics (3) — picked one of three after Act 1 and Act 2 bosses

Every boss relic has a significant downside.

### **The Hierophant's Censer**
*The relic of a fallen Hivemind priest.*
- At combat start, draw 2 extra cards. All cards cost +1 Energy for the first turn.

Powerful draw, painful opener. Decks with Overclocked Core or free-card sources love it; tight energy decks suffer.

### **Spire-Glass Lens**
*Cracked but functional.*
- Whenever you kill an enemy, gain 1 Max HP. Whenever you take HP damage, you cannot heal for the rest of that combat.

Run-long HP scaling with a combat-scoped drawback. Makes full-HP runs insanely tanky; punishes any combat where you slip.

### **Heartwake Echo**
*A fragment of the final boss, reluctantly yours.*
- At combat start, copy the effect of a random relic in your collection for this fight only. Permanently lose 10% max HP.

Variance bomb. Great if you've got a big relic collection; mediocre if you don't. The HP cost means you're paying for the potential every run.

## Interaction with the 12 Anomalies

Six of the 12 Anomaly templates explicitly reference relics:

- **#1 Drifting Forge** — "Gain a random rare relic. Lose 15% max HP."
- **#4 Ignitor's Tomb** — "Gain a Pyroclast-faction relic. Take 10 damage."
- **#8 Hollowed Acolyte** — (indirectly, via rare card)
- **#10 Warp-Crazed Merchant** — "Pay 50 gold: receive a random relic."
- **#11 Sealed Reliquary** — "Force it open: gain 2 relics. 30% chance to lose 25% max HP."
- **#12 Choir Fragment** — "Trap it: gain unique relic Shard of the Choir."

The Shard of the Choir is intentionally not in the main pool — it's an Anomaly-only relic. Implementation spec:

### **Shard of the Choir** (anomaly-exclusive)
*A piece of disembodied singing, trapped in obsidian.*
- Whenever a Flux card in your hand shifts state, deal 2 damage to a random enemy. Whenever you play any card, take 1 damage.

High-frequency trigger with a self-harm cost. Plays like a mini Cosmic Choir that works for any class but hurts you steadily.

## Design notes for Claude Code implementation

Five things the engine must handle:

1. **Relics have triggers, not just stats.** Every relic needs a trigger-phase enum (`combat_start`, `turn_start`, `card_played`, `card_retained`, `enemy_killed`, `damage_taken`, `combat_end`, etc.) and a handler function. Implement the trigger system alongside the evolution system — they're structurally identical.

2. **Relics are per-run state, not per-combat.** Store them in `RunState.relics: Relic[]`. Serialize with the save. Boss relics and Anomaly-acquired relics must survive save/reload.

3. **Relic descriptions parse to trigger specs the same way cards do.** Keep the `description: string` pattern. The combat engine parses them. Don't prematurely structure.

4. **Build a relic collection UI that shows all acquired relics at all times.** Players need to see what they have at a glance, not hover for tooltips. Place it in the combat HUD, always visible.

5. **Starter relic assignment happens at character select, not run start.** When a player picks a character, the starter relic is added to their fresh deck. Keep this decoupled — a player rerolling their character should see a different starter relic.

## Balance notes for playtest

Three relics to watch:

- **Fueled Boots** is likely too strong as a common. STS1's Lantern is uncommon for this reason. If playtest confirms, move to uncommon tier.
- **Modular Heart** could be broken with Exotic Core augment (0-cost, non-exhaust). Three slots × Exotic Core on Colossus Strike = infinite-damage turn. Possibly gate this via the Augment system (hard limit: one Exotic Core per card).
- **The Unmoored Eye** + **Reality Anchor** gives 2 free locks per turn, effectively turning off Flux entirely. This might be intentional power for dedicated Precision Phase builds, but playtest the synergy carefully.

## Card list

See `relics.xlsx` for the full pool with tier color coding (starter gray, common green, uncommon blue, rare gold, boss red).

## Next steps

1. ✅ **Relics** — this doc.
2. **Reactive Ecology** — enemy trait-slot roller driven by deck threat vector.
3. **Potions** — combat-use consumables, 3-slot inventory.
4. **Meta progression** — between-run unlocks, Ascension-tier difficulty.

# Potion Pool Design — MVP

*Roguelite mode, STARFORGE universe. 14 potions for the first playable build.*

## What potions are

Potions are single-use combat consumables. You carry up to 3 at a time in a visible inventory slot. You can drink one at any point during your own turn for an immediate, dramatic effect — no Energy cost, no card in hand required, no action resolution. Potions are the "oh shit" button and the "let's cook" button rolled into one.

Unlike cards (draw-dependent) and relics (always-on), potions are a **discretionary burst resource**. Players hoard them until the moment calls for them, then spend them to swing a turn. The interesting decision is always *when* to drink — not every fight needs a potion, but every fight *could*.

## Why this system exists

Three design problems potions solve:

1. **Unlucky draws need an escape valve.** A bad early hand against a dangerous enemy can spiral into a loss. Potions let players claw back tempo.

2. **Boss fights need one-more-tool.** STS1's biggest design insight was that elite/boss fights feel more satisfying when the player has a resource they've been saving. The potion you've held for three rooms becomes the turn you win.

3. **Inventory management is a fun meta-decision.** With only 3 slots, every potion pickup forces a choice: drink now for marginal value, or discard for a future pickup. This layers a second mini-economy on top of gold/cards/relics.

## Design targets

Five rules this pool follows:

1. **Every potion is dramatic.** No "heal 5 HP" filler. Potions are events. A potion should feel like it changed the combat.

2. **Faction-neutral by default.** Most potions work for any class. Faction-themed potions are rare and highly rewarded when you're the right class for them.

3. **Damage potions are rare and expensive.** Direct-damage potions trivialize fights if common. Most of the pool grants utility (block, draw, energy, buffs) instead of damage.

4. **Every potion is readable in one sentence.** Tooltip-scale description. No complex conditionals.

5. **Potions can be upgraded by certain relics.** A relic called Alchemist's Satchel (future addition, not in MVP) could double potion effects. Design with this upgrade path in mind.

## Inventory and acquisition

- **3 slots maximum.** Visible in the combat HUD at all times.
- **Dropped from combats at ~40% rate.** Elite fights always drop one.
- **Purchasable in shops.** Act 1: 50 gold. Act 2: 75 gold. Act 3: 100 gold.
- **Some Anomalies reward potions** (the Gyrospore Bloom anomaly specifically: "Harvest — Gain a potion of your choice").
- **Discard rule.** When inventory is full and you acquire a new potion, you choose to discard one (old or new). No forced losses.

## Rarity tiers

| Tier | Count | Drop weight |
|------|-------|-------------|
| Common | 7 | 65% |
| Uncommon | 5 | 28% |
| Rare | 2 | 7% |

## The pool

### Common potions (7)

**Block Draught**
*Thick, gray, tastes like iron shavings.*
- Gain 12 Block.

The baseline defensive potion. Always useful, never flashy. Most-drunk potion in the game.

**Swift Brew**
*A wisp of pale smoke rises continuously from the bottle.*
- Draw 3 cards.

Tempo recovery. Used when a bad opening hand needs to become a good one.

**Surge Vial**
*Fizzes when uncorked. Tastes like copper.*
- Gain 2 Energy.

The combo enabler. Hold this for the turn you need to chain five cards.

**Kindling Flask** (Pyroclast-flavored, universal)
*Sealed Pyroclast firestarter.*
- Apply Ignite 4 to all enemies.

Strong opener against multiple enemies. Usable by any class, exceptional for Pyroclast.

**Focus Tincture**
*Cool, blue-green, faintly luminescent.*
- Gain 2 Strength this combat.

Flat damage buff for the rest of the fight. Turns long fights into short ones.

**Stoneblood Elixir**
*Heavy bottle, rust-colored contents.*
- Gain 2 Dexterity this combat.

The defensive counterpart to Focus Tincture. Blocks scale for the rest of the fight.

**Cleansing Draft**
*Smells like ozone before a storm.*
- Remove all debuffs from yourself.

Situational but saves runs. Especially valuable against Act 3 enemies that stack debuffs.

### Uncommon potions (5)

**Forgefire Flask** (Pyroclast-flavored, universal)
*Glows from within. Warm even through the glass.*
- Deal 20 damage to target enemy. Gain 3 Heat.

Damage + resource. The Pyroclast flavor gives it extra value for Heat builds, but the damage alone is strong for anyone.

**Lumen Infusion** (Luminar-flavored, universal)
*A bottle of captured sunrise.*
- Add 3 Lumens distributed freely across Channel cards in your hand. If no Channel cards in hand, gain 12 Block instead.

Dual-effect. Luminar players get the primary effect; other classes get a fallback so the potion is never a dead draw.

**Wyrmfire Breath** (aggressive)
*Do not inhale.*
- Deal 10 damage to all enemies. Apply Ignite 2 to all.

The panic-button AoE. Turns a 4-enemy wipe scenario into a 1-2 enemy scenario instantly.

**Aegis Mixture**
*Thick silver liquid, reflects no light.*
- Gain 20 Block. Next turn, gain 20 Block.

Two-turn defensive wall. For fights where you need to survive specifically two big incoming hits.

**Tactician's Brew**
*Clear liquid, smells like nothing.*
- Draw 4 cards. Gain 1 Energy.

Massive tempo swing. Best held for a turn where you want to dump everything.

### Rare potions (2)

**Phoenix Vial**
*The bottle is warm. A single spark moves inside it, never dying.*
- Heal to full HP. Exhaust all cards in your hand.

Run-saving. When drunk at 1 HP, it rewrites the fight. The card-exhaust cost prevents it from being a combo tool — you use it to *survive*, not to *win*.

**Chronoshift Philter**
*Liquid that seems to flow backward in the bottle.*
- Take another turn immediately after this one. All cards in your hand are replaced with a new random draw.

The rarest, most dramatic potion. Two turns in one — but your current hand is wiped, so you can't simply double-dip your best setup. Used for boss-killing turns where you need more card pulls than a single turn gives.

## Faction-specific interactions

| Faction | Best-in-class potions | Reason |
|---------|----------------------|--------|
| Pyroclast | Kindling Flask, Forgefire Flask | DoT and Heat synergy |
| Luminar | Lumen Infusion, Swift Brew, Tactician's Brew | Draw-heavy, Channel card enablement |
| Cogsmiths | Surge Vial, Tactician's Brew | Energy/draw enables cheap-card cycling |
| Warp Riders | Cleansing Draft, Chronoshift Philter | Pivot tools against bad Flux rolls |

No potion is hard-gated to a class. These are just where each potion shines.

## Implementation notes for Claude Code

Five things the engine must handle:

1. **Potion inventory is per-run state.** Stored as `RunState.potions: (Potion | null)[]` with length 3. Nulls are empty slots. Serialize on save.

2. **Drinking is not a card play.** The combat engine must expose a separate "use potion" action that does not trigger card-played events. Relics that trigger on "card played" should NOT fire when a potion is drunk. This matters for things like Stasis Coil (10% chance card-cost reduction on card play).

3. **Potions are usable only on the player's turn.** Disable the potion UI during enemy turns. Players also cannot use a potion mid-card-resolution.

4. **Potion effects resolve immediately.** No animation queue. No stacking. Drink → effect → done. This differs from card play, which goes through the resolution pipeline.

5. **The inventory UI shows all 3 slots at all times.** Even empty slots render as empty bottles, so players are always aware of their carry capacity. Unfilled slots are a constant reminder to pick up more.

## Balance notes for playtest

Three potions to watch:

- **Phoenix Vial** is intentionally run-saving but the hand-exhaust cost might be too lenient. If players consistently drink it at full HP to cycle their deck, change the exhaust to also discard the draw pile or make it exhaust-self-into-combat only.
- **Chronoshift Philter** is the power peak of the pool. Two turns in one can trivialize boss fights. The hand-replace cost is the balance lever — playtest whether it's enough. If not, add "take 15 damage" or similar.
- **Tactician's Brew** (4 draw + 1 energy) is close in power to Chronoshift. Watch if it invalidates the rare tier. If so, drop to 3 draw.

## Card list

See `potions.xlsx` for the full pool with tier color coding matching the rest of the project — common (gray), uncommon (blue), rare (gold).

## Next steps

1. ✅ **Potions** (this doc)
2. **Meta progression** — between-run unlocks, Ascension-style difficulty tiers. Can ship MVP without this but runs get stale without replay incentives.

After meta progression, the design phase is complete and implementation owns the project end-to-end.

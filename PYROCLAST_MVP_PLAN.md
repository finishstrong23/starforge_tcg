# STARFORGE Dungeon Run - Pyroclast MVP Plan

## MVP Thesis

The MVP should stop trying to prove that STARFORGE can support many factions at once. It should prove that one faction can feel excellent.

For the first public MVP, STARFORGE Dungeon Run is a Pyroclast-only roguelite deckbuilder about building Heat, spending it often, and keeping combat momentum high.

The player fantasy:

> I am carrying a furnace. Every turn I decide how to feed it, where to spend it, and how to keep the pressure rolling.

## Why Pyroclast First

Pyroclast is the cleanest faction for an MVP because the fantasy is immediate:

- Fire is easy to understand.
- Heat can become a visible, exciting meter.
- Damage, Burn, Block, and Heat spending are readable effects.
- The faction can feel aggressive without needing many subsystems.
- It creates emotional decisions: build Heat, spend Heat, or convert Heat into survival before the enemy takes over.

This is stronger than launching four partial factions. A player will forgive a focused MVP with one great faction. They will not forgive four shallow factions that all feel unfinished.

## Current Heat Problems

The current implementation has the pieces of a resource system, but not the feeling of one.

1. Heat builds, but the player often does not know what to do with it.
2. Heat payoffs are scattered across cards instead of being presented as a core loop.
3. Heat does not create enough positive pressure to spend it often.
4. Some cards consume Heat, some scale from Heat, and some merely check Heat thresholds, but the game does not explain the difference.
5. The Heat HUD shows a number, but it does not preview consequences or suggest decisions.
6. Heat cards are not divided into clear roles, so drafting can feel mushy.

The result: Heat is present, but not engaging.

## New Heat Design

Heat should be a positive momentum resource. It never hurts the player by itself. The only downside to sitting at high Heat is opportunity cost: if you stay capped, future Heat gains are wasted, and you missed chances to turn Heat into damage, Block, draw, Burn, or other tempo.

Heat should become a resource with three rewarding states:

| Heat Range | State | Player Feeling | Gameplay Meaning |
|---|---|---|---|
| 0-3 | Building | I need fuel | Builders matter, small spenders are useful |
| 4-7 | Hot | I have options | Most Heat cards are online |
| 8-10 | Blazing | I am ready | Best bonuses are online, spend now to keep momentum |

Recommended resource cap: **10 Heat** for MVP.

### Core Rule

Heat is always beneficial:

- Heat cap is 10.
- Heat never damages the player.
- Heat does not decay by default.
- Gaining Heat at cap wastes the extra Heat.
- Spending Heat should feel frequent, exciting, and useful.
- The best Pyroclast play is not "save Heat for the end." The best play is "build and spend Heat throughout the fight to stay ahead."

This creates a friendly but strategic loop:

1. Build Heat.
2. Reach Hot or Blazing.
3. Spend Heat for immediate impact.
4. Drop back down.
5. Build again.

The player should feel rewarded along the way, not punished for engaging with the resource.

### Core Verbs

All Pyroclast cards should use one of these verbs:

- **Build**: Gain Heat.
- **Vent**: Spend Heat for damage, Block, draw, or healing.
- **Flare**: Do something extra if Heat is 4+.
- **Blazing**: Do something extra if Heat is 8+.
- **Burn**: Apply enemy damage over time.
- **Cauterize**: Convert Heat or Burn into survival.

Avoid synonyms like "consume all Heat" unless the card also says what the player gets. Prefer "Vent X Heat" or "Vent all Heat." Vent should mean "spend Heat for value," not "avoid punishment."

## Player-Facing Rules Text

Heat tooltip:

> Heat powers Pyroclast cards. Build it with fire cards, then Vent it for damage, Block, draw, or Burn. Heat caps at 10; extra Heat is wasted, so spend it often.

Short HUD labels:

- `Building`: 0-3 Heat
- `Hot`: 4-7 Heat
- `Blazing`: 8-10 Heat

Card text should use consistent templates:

- `Gain 2 Heat.`
- `Flare 4: Deal 5 more damage.`
- `Blazing 8: Apply 4 Burn.`
- `Vent up to 4 Heat. Deal 4 damage per Heat vented.`
- `Vent all Heat. Gain 2 Block per Heat vented.`

## Pyroclast Archetypes

The MVP should support four Pyroclast draft lanes.

### 1. Furnace Aggro

Fast damage, small Heat gains, quick venting.

Player fantasy: "I keep the fire moving and end fights fast."

Key cards:

- Cheap attacks that gain 1-2 Heat.
- Attacks that Vent 2-4 Heat for bonus damage.
- Low-cost Burn setup.

### 2. Blazing Tempo

Reach 8+ Heat, then spend repeatedly to keep pressure high.

Player fantasy: "I keep the furnace roaring and cash it out before I waste fuel."

Key cards:

- Heat builders.
- Blazing threshold cards.
- Efficient Vent attacks.
- Defensive tools that spend Heat.
- Cards that replace wasted Heat with value when already Blazing.

### 3. Burn Control

Apply Burn, survive, and let enemies melt.

Player fantasy: "I set the room on fire and endure."

Key cards:

- Burn application.
- Weak/Vulnerable support.
- Block from Heat.
- Cards that spread or amplify Burn.

### 4. Phoenix Recovery

Recovery and resilience for players who want to spend HP or Burn as a secondary resource.

Player fantasy: "I recover through the fire and keep fighting."

Key cards:

- HP cost cards.
- Healing.
- Cauterize effects.
- Relics that reward healing, Burn conversion, or Heat spending.

## Card Role Targets

The Pyroclast MVP should have about 40 cards, but each card must have a job.

Target mix:

| Role | Count | Purpose |
|---|---:|---|
| Basic attacks | 5-7 | Reliable damage and starter deck support |
| Basic defense | 5-7 | Block, Heat-safe survival |
| Heat builders | 8-10 | Make the resource move |
| Vent spenders | 8-10 | Let players cash out |
| Flare/Blazing payoffs | 8-10 | Reward reaching Heat thresholds |
| Burn cards | 6-8 | Enable Burn Control |
| Recovery cards | 4-6 | Enable Phoenix lane |
| Powers | 5-7 | Define run identity |

Every card should answer at least one question:

- Does this build Heat?
- Does this spend Heat?
- Does this reward being Hot or Blazing?
- Does this keep me alive while I spend Heat?
- Does this define a deck lane?

Cards that only deal normal damage and do not support a lane should be cut or demoted to starter/simple filler.

## Starter Deck Direction

Starter deck should teach Heat without overwhelming the player.

Recommended starter deck:

- 4x Cinder Strike: basic damage.
- 3x Scale Guard: basic Block.
- 2x Spark: small damage plus 1 Heat.
- 1x Kindle: gain 3 Heat.

This teaches:

- Attack.
- Block.
- Build Heat.
- Watch the Heat meter.

The starter deck can include one simple Vent card if testing shows players need to feel the loop before the first draft. Otherwise, let the first draft create the "aha" moment: "Oh, this is what Heat is for."

## Opening Draft Direction

The opening draft should always offer one card from each role:

1. A Heat builder.
2. A Vent spender.
3. A defensive or Burn option.

This guarantees the player sees how Heat connects to choices before the first fight.

Example first-pick set:

- **Fuel the Flames**: Gain Heat quickly.
- **Blazing Charge**: Vent Heat for damage.
- **Glowing Resolve**: Turn Heat into Block.

## Heat UI Requirements

The Heat UI needs to teach, tempt, and encourage spending.

Required:

- Always-visible Heat meter in combat.
- Range labels: Building, Hot, Blazing.
- Clear cap indicator at 10 Heat.
- When at cap, show friendly opportunity text: `Spend Heat - future Heat is wasted.`
- Card preview lines should show expected Heat spent or bonus damage.
- When Heat changes, show a small floating `+2 Heat`, `Vent 4`, or `At cap` feedback.

The player should never ask, "What did Heat do?" or "Why should I spend it now?"

## Relics

Pyroclast MVP relics should reinforce the Heat loop.

Target relic types:

- Gain 1 Heat at combat start.
- First Vent each combat deals +4 damage.
- At Blazing Heat, gain 3 Block each turn.
- Burn deals +1 damage.
- When you Vent 5+ Heat, draw 1 card once per turn.
- Rest sites heal less, but upgrade an extra Pyro card.
- Venting 6+ Heat heals 2 HP.

Avoid relics that reference Lumens, Augments, Flux, Channel, or other hidden faction systems.

## Potions

Pyro-compatible potion targets:

- Gain 4 Heat.
- Vent all Heat for Block.
- Apply Burn to all enemies.
- Double next Vent payoff.
- Fill Heat to 10.
- Double next Vent payoff.
- Heal and Vent up to 3 Heat for extra healing.

Potions should create tactical spikes, not new mechanics.

## Events

Pyro events should ask flavorful Heat-momentum questions.

Examples:

- **The Kiln Door**: Gain a rare Pyro card and start next combat at 6 Heat.
- **Ash Pilgrim**: Lose HP to upgrade a Heat card.
- **Cooling Pool**: Remove a card or reduce Max HP to gain a relic.
- **The Phoenix Brand**: Gain a recovery relic that rewards Venting Heat.

Events should reinforce the central question: "How do I turn this fire into tempo right now?"

## Enemy Design For Pyro MVP

Enemies should test Heat decisions.

Enemy categories:

- Low-HP enemies that reward aggression.
- Shielding enemies that reward spending Heat before defenses stack too high.
- Burn-resistant enemy once per act, used sparingly.
- Multi-hit enemies that pressure Block choices.
- Elite that pressures players to keep Heat moving instead of hoarding it.
- Boss that has phases:
  1. Learn: normal intents.
  2. Pressure: stronger attacks if the player fails to build and spend Heat.
  3. Race: boss scales while player repeatedly builds and spends Heat.

The boss should not be a generic HP wall. It should ask: "Can you keep your Heat moving under pressure?"

## What Gets Hidden

For MVP, hide:

- Cogsmiths, Luminar, Warp Riders from faction select.
- Off-faction rewards.
- Off-faction shop cards.
- Off-faction event choices.
- Relics that mention Augments, Lumens, Flux, Channel, or faction-specific non-Pyro mechanics.
- Tutorial copy for hidden systems.

Do not delete these systems. Gate them behind a later expansion flag.

## MVP Phases

### Phase 0 - Pyroclast Product Lock

Status: **implemented**. The MVP entry flow is Pyroclast-only through a central config, and visible Heat language has been updated away from punishment/overheat framing.

- Show only Pyroclast in faction select.
- Update landing/setup copy to describe Pyroclast MVP.
- Keep hidden factions in code and assets.
- Add a central MVP faction config.

Acceptance:

- A new player can only start as Pyroclast.
- No off-faction selection UI is visible.

### Phase 1 - Heat Rules Rework

- Add Heat cap 10.
- Add clear Heat tooltip/rule text.
- Add cap-state UI: extra Heat is wasted at 10.
- Add Vent preview lines.
- Standardize Heat log messages.

Acceptance:

- Player can predict and understand every Heat change.
- High Heat feels exciting, useful, and spendable.
- Heat never damages the player by itself.

### Phase 2 - Pyro Card Rework

- Audit P-001 through P-044.
- Assign every card to Build, Vent, Flare, Blazing, Burn, or Cauterize.
- Rewrite unclear cards.
- Remove or replace cards that do not support the Pyro loop.
- Ensure starter deck and opening draft teach Heat.

Acceptance:

- Every Pyro card has a clear role.
- First draft offers Build, Vent, and defensive/Burn choices.

### Phase 3 - Pyro Content Gate

- Rewards only offer Pyro-compatible cards.
- Shop only sells Pyro-compatible cards/relics/potions.
- Events only show Pyro-compatible choices.
- Hidden faction mechanics never appear in a Pyro MVP run.

Acceptance:

- No Lumens, Augments, Flux, Channel, Cogsmiths, Luminar, or Warp Riders content appears.

### Phase 4 - Pyro Balance Pass

- Tune enemy HP/damage around the new Heat curve.
- Tune elites and boss around frequent Heat spending.
- Tune card rarity and rewards.
- Run repeated playtests.

Acceptance:

- A skilled player can win.
- A new player can understand why they lost.
- Heat timing creates memorable turns.

### Phase 5 - Pyro UX And Art Polish

- Improve Heat meter.
- Add Heat change animations.
- Review Pyro token art.
- Replace any generic Pyro cards/relics/potions with stronger Pyro symbols.
- Improve mobile readability.

Acceptance:

- Heat is visible, readable, and exciting.
- Pyro art feels like one coherent set.

### Phase 6 - MVP QA And Launch

- Full run QA.
- Mobile/browser QA.
- Vercel deployment check.
- Gather feedback specifically on Heat fun, clarity, and run replayability.

Acceptance:

- MVP is playable end-to-end on Vercel.
- Build, UI build, lint, and gameplay smoke checks pass.

## Fun Checklist

Before shipping, ask these after every playtest:

1. Did I understand Heat within two fights?
2. Did I spend Heat multiple times in one fight?
3. Did Heat help me win a fight?
4. Did I ever hit 10 Heat and feel motivated to spend it?
5. Did I have a satisfying Vent or Blazing moment?
6. Did I draft toward a recognizable Pyro lane?
7. Did I lose for a reason I understood?
8. Would I start another run?

If the answer to any of the first five is no, Heat still is not fun enough.

## North Star

The MVP wins if players describe Pyroclast like this:

> "It is easy to understand, and every fight gives me a reason to build Heat, spend it, and build it again."

# Phase 0 Product Bible

Last updated: May 17, 2026

Working title: STARFORGE: Dungeon Run

## Player Promise

Build a sci-fantasy roguelite deckbuilder where every run asks the player to master a faction's dangerous power source, not just draft efficient cards. The game should feel familiar enough that a Slay the Spire player understands the first click, then distinct enough that they cannot solve it with old habits.

The core promise:

> Pick a faction, enter a living dungeon that adapts to your build, and forge unstable cards into a deck that feels handcrafted by the end of the run.

## Product Position

This is not a trading card game mode anymore. It is the game.

The comparison target is Slay the Spire 2, but the design target is not cloning its surface grammar. STS2 already has the genre basics: characters, card rewards, relics, potions, elites, bosses, branching routes, solo play, co-op, metrics, and Early Access iteration. Our advantage has to come from three things:

- Stronger faction fantasy per turn.
- A dungeon that reacts to the player's build.
- A content pipeline that lets Codex add and verify content safely.

## Design Pillars

### 1. Four Classes, Four Mental Models

Each class should change how the player evaluates a hand.

- Pyroclast asks: "How hot can I run before the fight burns me back?"
- Luminar asks: "Do I release stored light now, or survive long enough for a larger payoff?"
- Cogsmiths asks: "Which card is becoming my machine for the rest of the run?"
- Warp Riders asks: "Can I steer this unstable turn into the line I need?"

If two factions reward the same sequencing pattern, one of them needs redesign.

### 2. Reactive Ecology

The dungeon should read the player's threat vector and respond. This does not mean hard-countering the player. It means the dungeon's enemies, events, and rewards should create different problems for different builds.

- Pyroclast routes can attract cleansing, armor, burn-punish, and burst-race encounters.
- Luminar routes can attract disruption, delayed-pressure, and release-timing checks.
- Cogsmith routes can attract artifact disruption, board pressure, and long-fight punishers.
- Warp Rider routes can attract consistency checks, state locks, and risk-amplifying events.

The thesis: picking a class changes what the dungeon becomes.

### 3. Readability Before Flash

The player must know why every number changed. Visual polish matters, but confidence matters first.

Combat needs:

- Exact enemy intents.
- Exact damage and block previews.
- Clear resource panels.
- Inspectable tooltips.
- A readable action log.
- Fast animations with skip/speed controls.

The player should blame their choice, not the UI.

### 4. Cards Are Data, Not Regex

Natural-language card text is for players. Structured effects are for the engine.

Long-term content scale depends on moving card, relic, potion, event, and enemy behavior into validated data. A card should fail validation if its executable effect and display text drift apart.

### 5. Every Run Teaches The Team

The game needs telemetry and replay from the start, not as launch polish.

Every run should be able to answer:

- What seed was played?
- Which class and ascension?
- Where did the player die or win?
- Which cards were picked, skipped, upgraded, and removed?
- Which relics changed win rate?
- Which enemy or boss caused abnormal deaths?
- Which turns took too long or produced unclear outcomes?

## Non-Goals

- Do not rebuild the old TCG.
- Do not add PvP before the solo dungeon loop is excellent.
- Do not add co-op before solo combat, UI, and balance are stable.
- Do not expand to ten factions before four factions feel deep.
- Do not add card quantity to hide weak class identity.
- Do not make the first screen a marketing landing page.
- Do not rely on placeholder emoji art for public-facing builds.
- Do not ship new content that cannot be simulated or validated.

## Run Structure

Baseline run:

- 4 playable factions at the start.
- 3 acts.
- 15 rows per act.
- Each act ends with a boss.
- Rest before boss.
- Nodes: combat, elite, boss, rest, shop, treasure, event.
- Early run teaches core card play.
- Mid run introduces faction payoffs and deck-shaping events.
- Late run tests scaling, consistency, and defensive planning.

The current code uses `treasure` but not a first-class `event` node. Phase 1 or Phase 4 should add event nodes as a proper node type, not overload treasure.

## Combat Language

Use a consistent vocabulary.

- Damage: reduces enemy HP after block/shield.
- Block: temporary player protection that usually clears each enemy turn.
- Shield: enemy or special protection when the existing engine uses it, but avoid mixing with Block in player-facing text unless mechanically different.
- Status: Burn, Weak, Vulnerable, Strength, Dexterity, Barrier, Phase, Stealth.
- Exhaust: removed from the combat.
- Power: persistent combat modifier after play.
- Trigger: combat-start, turn-start, card-play, turn-end, combat-end, rest, shop, death.

Every card should use one of these templates:

- Deal N damage.
- Gain N Block.
- Draw N.
- Gain N Energy.
- Apply STATUS N.
- Exhaust.
- At TRIGGER, EFFECT.
- If CONDITION, EFFECT.
- Choose one: EFFECT or EFFECT.
- Faction mechanic sentence, then payoff sentence.

## Faction Fantasies

### Pyroclast

Fantasy: wildfire discipline. The class wins by converting danger into tempo.

Primary resources:

- Heat as a buildup/spend resource.
- Burn/Ignite as delayed enemy damage.
- Self-damage as optional acceleration.

Archetypes:

- Heat burst: build Heat, cash it in for lethal turns.
- Burn control: stack delayed damage while defending.
- Pain engine: take damage for Energy, draw, or scaling.

Class risk:

- Runs can overcommit to offense and die to elites.

### Luminar

Fantasy: patient radiance. The class wins by storing light until a release point.

Primary resources:

- Lumens on Channel cards.
- Barrier/Block for long fights.
- Release effects that convert stored value.

Archetypes:

- Channel release: charge cards and fire them at the right moment.
- Defensive sun: outlast with Block, Barrier, and scaling.
- Debuff illumination: weaken enemies while setting up.

Class risk:

- Runs can become too slow and fail burst checks.

### Cogsmiths

Fantasy: build the machine while fighting inside it.

Primary resources:

- Augments attached to cards.
- Summons/drones.
- Deck-wide construction payoffs.

Archetypes:

- One perfect card: stack Augments onto a carry card.
- Assembly board: use drones/summons for repeated output.
- Machine scaling: reward long-run modifications.

Class risk:

- Runs can spend too much time building and not enough time surviving.

### Warp Riders

Fantasy: steering impossible probability.

Primary resources:

- Flux states.
- Rifts.
- State locks/rerolls.

Archetypes:

- Chaos storm: accept high variance for huge turns.
- Precision phase: lock or reroll to convert randomness into consistency.
- Rift architect: build temporary battlefield zones that compound.

Class risk:

- Runs can feel unfair if variance is not readable and steerable.

## Art Direction

The game should read as sci-fantasy dungeon cosmic horror, not generic medieval fantasy and not sterile spaceship UI.

Visual principles:

- High-contrast cards with readable costs and effects.
- Faction color language, but avoid one-note palettes.
- Enemies should have strong silhouettes and readable intent states.
- Relics and potions should look like objects, not just icons.
- The map should feel like an expedition through hostile space-forge ruins.
- Effects should be legible: fire, light, machinery, rift distortion.

Placeholder art is acceptable in internal builds. Public builds need a consistent asset pass.

## UX Bar

The player should be able to:

- Start a run in under 20 seconds.
- Understand a card reward without opening an external guide.
- Know the enemy's next action before playing a card.
- Preview whether a card play kills, blocks enough, or changes a resource.
- Inspect all relics, potions, statuses, and keywords.
- Save and resume without thinking about it.
- Replay or share a seed when something interesting happens.

## Phase 0 Acceptance Criteria

Phase 0 is complete when:

- This product bible exists and is linked from the master plan.
- The vertical-slice spec exists and names exact content counts.
- The backlog exists with labeled, sequenced tasks.
- Phase 1 has a clear first implementation target.
- The current risk register is explicit.


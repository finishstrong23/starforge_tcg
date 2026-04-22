# Faction Mechanics — Detailed Rules

## Table of Contents
1. Astromancers
2. Biotitans
3. Chronobound
4. Cogsmiths
5. Crystalline
6. Hivemind
7. Luminar
8. Neutral
9. Warp Riders
10. Pyroclast
11. Voidborn

---

## 1. Astromancers

**Identity:** Cosmic mages who channel stellar energy to amplify spells.

**Core Mechanic — Spell Amplification:**
- Astromancer minions with the "Spell Damage +X" keyword increase ALL spell damage by X.
- Spell Damage stacks across multiple minions on the board.
- Spell Damage applies to the spell's DAMAGE component only, not healing or other effects.
- Hero Power: Deal 1 damage to a target (affected by Spell Damage).

**Test Cases:**
- Verify Spell Damage +1 adds exactly 1 to each damage instance of a spell
- Verify stacking: two Spell Damage +1 minions = +2 total
- Verify Spell Damage does NOT increase healing from spells
- Verify Spell Damage does NOT increase non-damage effects (draw, summon)
- Verify hero power damage is increased by Spell Damage
- Verify Spell Damage is lost when the minion providing it is destroyed mid-spell (edge case: spell targets the Spell Damage minion itself)

**STARFORGE Examples:**
- Epic Astromancers may transform when a certain number of spells have been cast (e.g., "STARFORGE: Cast 5 spells this game")
- Transformed version typically gains increased Spell Damage and a powerful spell-related effect

---

## 2. Biotitans

**Identity:** Living ecosystems — massive organisms that heal and grow.

**Core Mechanic — Regeneration & Overheal:**
- Biotitan minions can have "Regenerate X" — restore X health at start of your turn.
- Regeneration CANNOT exceed the minion's max health (caps at original health stat).
- Overheal: Some Biotitan cards heal PAST max health, granting temporary bonus health.
- Overheal bonus health decays by 1 at the end of each turn.
- Hero Power: Restore 2 health to a friendly character.

**Test Cases:**
- Verify Regenerate X restores exactly X health, capped at max health
- Verify Overheal increases health above max
- Verify Overheal bonus decays by 1 per turn
- Verify hero power heals for exactly 2
- Verify healing a full-health target with Overheal works (health goes above max)
- Verify healing a full-health target WITHOUT Overheal does nothing
- Verify Regenerate triggers at start of turn, BEFORE draw phase
- Verify destroyed minions do NOT regenerate

---

## 3. Chronobound

**Identity:** Time manipulators who bend turns and tempo.

**Core Mechanic — Turn Manipulation:**
- Chronobound cards can grant extra actions, skip opponent turns (partially), or rewind effects.
- "Extra Turn" cards give the player an additional turn after the current one. They still draw and gain a crystal.
- "Time Freeze" effects skip the opponent's next Action Phase (they still draw and gain crystals).
- Hero Power: Give a friendly minion +1 attack this turn only.

**Test Cases:**
- Verify Extra Turn properly chains (your turn → your extra turn → opponent turn)
- Verify crystal gain works correctly on extra turns (+1 max, refill)
- Verify draw phase happens on extra turns
- Verify Time Freeze only skips Action Phase, not Draw/Crystal phases
- Verify multiple Extra Turns stack correctly (2 extra turn cards = 2 extra turns)
- Verify end-of-turn effects fire on each turn including extra turns
- Verify opponent's start-of-turn effects fire after your extra turn(s) end
- Edge case: Extra Turn when at 10 crystals (no gain, but should still function)
- Edge case: Fatigue during extra turn (draw damage still applies)

**CRITICAL TEST:** Turn state machine must be rock-solid. Any bug here breaks the entire game flow. Extra turn interactions are the #1 source of game-breaking bugs in TCGs.

---

## 4. Cogsmiths

**Identity:** Engineers and artificers with Mech tribal synergy.

**Core Mechanic — Artifact/Mech Synergy:**
- Cogsmiths gain bonuses when Mech-tribe minions are on the board or played.
- "Magnetic" keyword: A Mech played to the LEFT of another Mech merges into it (stats combine).
- Non-Mech Cogsmith cards often buff or interact with Mechs specifically.
- Hero Power: Summon a 1/1 Mech token.

**Test Cases:**
- Verify Magnetic merge: stats add correctly (attack + attack, health + health)
- Verify Magnetic merge: keywords combine (both minions' keywords apply to merged unit)
- Verify Magnetic only triggers when placed to the LEFT of a Mech
- Verify Magnetic doesn't trigger if target is not a Mech tribe
- Verify Mech-count-dependent effects count correctly
- Verify hero power token has tribe: "Mech"
- Verify Magnetic merge preserves damage (if target Mech was damaged)
- Edge case: Magnetic onto a full-health Mech (health should increase above current max — it becomes new max)
- Edge case: Board is full, Magnetic merge should work (doesn't take new slot)

---

## 5. Crystalline

**Identity:** Living crystal entities that manipulate mana flow.

**Core Mechanic — Mana Manipulation:**
- Crystalline cards can: gain temporary crystals (this turn only), gain permanent crystals, reduce card costs, destroy opponent's crystals.
- Temporary crystals vanish at end of turn.
- Permanent crystal gain increases max crystals (still capped at 10).
- Cost reduction effects modify the card in hand. Multiple reductions stack.
- Hero Power: Gain 1 temporary crystal this turn.

**Test Cases:**
- Verify temporary crystals add to current but not max
- Verify temporary crystals vanish at end of turn
- Verify permanent crystal gain increases max (capped at 10)
- Verify cost reduction modifies the correct card in hand
- Verify cost reduction stacks (two -1 effects = -2 total)
- Verify cost cannot go below 0
- Verify crystal destruction reduces opponent's max crystals
- Verify hero power grants exactly 1 temporary crystal
- Edge case: Gain permanent crystal at 10 max (should be no-op, no error)
- Edge case: Cost reduction on a 0-cost card (stays at 0, no negative)
- Edge case: Multiple temporary crystal sources in one turn stack correctly

**CRITICAL TEST:** Mana bugs are the most exploitable bugs in TCGs. Any overspend or infinite mana loop must be caught immediately.

---

## 6. Hivemind

**Identity:** Insectoid swarm that grows stronger in numbers.

**Core Mechanic — Adjacent Buffs & Swarm:**
- Hivemind minions buff adjacent minions (to their left and right on the board).
- "Swarm" keyword: When this minion is summoned, also summon a 1/1 Hiveling token.
- Board POSITION matters. Minions at positions 1-7, adjacency = position ±1.
- Buff auras are continuous — they apply while the source is alive and remove when it dies.

**Test Cases:**
- Verify adjacent buff applies to exactly the left and right neighbors
- Verify buff removes when source minion dies
- Verify moving/reordering minions updates adjacency (if reorder is possible)
- Verify Swarm token appears in adjacent slot
- Verify Swarm token counts as a Hivemind minion for other buffs
- Verify board position tracking: place minion between two Hivemind buffers → gets both buffs
- Verify edge positions: leftmost minion has no left neighbor, rightmost has no right neighbor
- Verify board full (7 minions): Swarm cannot summon token (no error, just no summon)
- Edge case: Buff source dies mid-combat → buff should remove immediately, potentially killing adjacent minion if it was surviving on the buff

---

## 7. Luminar

**Identity:** Celestial beings with protective light magic.

**Core Mechanic — Shields & Divine Protection:**
- Luminar cards frequently grant Divine Shield.
- "Blessing" effects grant temporary stat buffs (+attack/+health) that persist until end of turn or permanently depending on card text.
- "Holy Nova" style effects: deal damage to all enemies AND heal all friendlies simultaneously.
- Hero Power: Give a friendly minion Divine Shield (if it doesn't already have one).

**Test Cases:**
- Verify Divine Shield blocks exactly 1 instance of damage (any amount)
- Verify Divine Shield is consumed after blocking, showing visual removal
- Verify hero power cannot give Divine Shield to a minion that already has it
- Verify Blessing stat buffs apply correctly (permanent vs temporary per card text)
- Verify AoE heal + damage resolves correctly (all targets in one pass)
- Verify Divine Shield blocks Poisonous (shield absorbs hit, minion survives)
- Edge case: Divine Shield + Lifesteal attack — shield blocks damage, does attacker still lifesteal? (No — no damage dealt means no lifesteal)

---

## 8. Neutral

**Identity:** Universal cards available to all factions.

**Core Mechanic:** No faction-specific mechanic. Neutral cards provide utility, card draw, removal, and stat bodies that complement any faction strategy.

**Test Cases:**
- Verify Neutral cards can be included in any faction's deck
- Verify Neutral cards do NOT benefit from faction-specific auras (unless explicitly stated)
- Verify Neutral cards interact correctly with all 10 faction mechanics
- Verify Neutral Legendary cards follow 1-copy-per-deck rule
- Cross-faction combo testing: Neutral utility + each faction's mechanic

---

## 9. Warp Riders

**Identity:** Spectral pirates who strike from the shadows.

**Core Mechanic — Stealth & Evasion:**
- "Stealth" keyword: Cannot be targeted by enemy spells or attacks until it attacks.
- "Evasion" keyword: 50% chance to dodge an attack (random, per instance).
- Corsair cards can re-enter Stealth after attacking under specific conditions.
- Hero Power: Give a friendly minion Stealth until your next turn.

**Test Cases:**
- Verify Stealth minion cannot be selected as attack target
- Verify Stealth minion cannot be targeted by enemy single-target spells
- Verify Stealth IS hit by AoE (area of effect) spells/effects
- Verify Stealth breaks when the minion attacks
- Verify re-Stealth effects properly re-apply the untargetable state
- Verify Evasion random chance works (over many trials, ~50% dodge rate)
- Verify Evasion triggers visually (dodge animation)
- Verify hero power Stealth expires at start of your next turn
- Edge case: Stealth minion with Taunt — Taunt is ignored while Stealthed (enemies can bypass)
- Edge case: AoE reveals Stealth? No — AoE damages but does not break Stealth

---

## 10. Pyroclast

**Identity:** Volcanic entities focused on pure destruction.

**Core Mechanic — Direct Damage & Burn:**
- Pyroclast spells deal high damage. Many can target face (hero) directly.
- "Burn" keyword: At end of turn, deal X damage to the affected target.
- Burn effects stack (multiple burns = multiple triggers per turn).
- Hero Power: Deal 2 damage to the enemy hero.

**Test Cases:**
- Verify direct damage spells can target both minions and heroes
- Verify Burn damage ticks at end of the affected player's turn
- Verify Burn stacks: 2 Burn(1) effects = 2 damage per turn
- Verify Burn persists across turns until the target dies or Burn is removed
- Verify Burn on hero contributes to lethal correctly
- Verify hero power deals exactly 2 to enemy hero (not minions)
- Verify Spell Damage (from Astromancers) increases Pyroclast spell damage
- Edge case: Burn kills a minion at end of turn → Deathrattle triggers
- Edge case: Burn on hero reduces to 0 → game ends at end of turn, not mid-turn

---

## 11. Voidborn

**Identity:** Abyssal creatures that sacrifice to gain power.

**Core Mechanic — Sacrifice & Life Drain:**
- Voidborn cards often require destroying friendly minions to activate powerful effects.
- "Drain" keyword: Damage dealt to target also heals your hero for that amount.
- "Soul Harvest" effects: Gain +1/+1 for each friendly minion that died this game.
- Hero Power: Deal 2 damage to a minion and heal your hero for 2.

**Test Cases:**
- Verify sacrifice effects require a valid friendly minion to target
- Verify sacrifice cannot target the card itself (unless card text says so)
- Verify Drain heals hero for exact damage dealt (not overkill)
- Verify Drain with Divine Shield: 0 damage dealt = 0 healing
- Verify Soul Harvest counter tracks all friendly minion deaths across the game
- Verify hero power heals only when it deals damage to a minion (not on empty target)
- Verify sacrifice on a minion with Deathrattle: Deathrattle triggers
- Edge case: Sacrifice the last friendly minion → effect still resolves, board is now empty
- Edge case: Drain overkill — minion has 1 health, Drain deals 5 damage — hero heals for 1 (actual damage) or 5 (attack value)? Depends on card text; verify per card.

# Test Scenarios — STARFORGE TCG

Predefined test cases organized by game system. Use these for Playwright tests (Layer 2) and Chrome Agent directives (Layer 3).

---

## 1. Card Rendering Suite

### 1.1 — All Cards Load
**Objective:** Every card in the database renders with correct data.
**Method:** Iterate through all 859 cards in card-schema.json. For each card:
- Navigate to card gallery / collection view
- Verify card name, cost, attack, health, and cardText match schema
- Verify card art loads (HTTP 200 for `public/cards/{id}.png/.webp/.jpg`)
- Verify rarity gem color matches rarity field
- Verify faction badge/color matches faction field

### 1.2 — Card Text Overflow
**Objective:** No card text overflows its text box.
**Method:** For each card, check that the `cardText` element's scrollHeight <= its clientHeight. Flag any overflow.

### 1.3 — Missing Art Fallback
**Objective:** Cards with missing art show a placeholder, not a broken image.
**Method:** Temporarily rename a card's art file. Load the card. Verify placeholder image appears (not a broken image icon or white box).

---

## 2. Mana System Suite

### 2.1 — Crystal Ramp
**Objective:** Crystals increment by 1 each turn up to 10.
**Method:** Start a game. Verify Turn 1 = 1 crystal, Turn 2 = 2, ..., Turn 10 = 10, Turn 11 = 10 (no further gain).

### 2.2 — Card Play Cost Enforcement
**Objective:** Cannot play a card that costs more than current crystals.
**Method:** With 3 crystals available, attempt to play a 5-cost card. Verify: card stays in hand, crystals unchanged, visual/audio feedback indicates insufficient mana.

### 2.3 — Crystal Refill
**Objective:** Crystals refill to max at start of each turn.
**Method:** Spend 3 of 5 crystals. End turn. Opponent acts. On your next turn, verify crystals = 6/6 (gained 1 max, refilled to new max).

### 2.4 — Temporary Crystal (Crystalline)
**Objective:** Temporary crystals add to current but vanish at end of turn.
**Method:** At 5/5 crystals, play a Crystalline card that grants 2 temporary crystals. Verify display shows 7/5 (or 5+2/5). End turn. Next turn verify 6/6 (normal ramp, no carryover).

### 2.5 — Overload Lock
**Objective:** Overload correctly locks crystals next turn.
**Method:** Play an Overload(2) card at 5/5 crystals. End turn. Next turn should show 4/6 (gained 1 max to 6, but 2 locked, so 4 available). Following turn: 7/7 (normal, no lock).

---

## 3. Combat Suite

### 3.1 — Basic Minion Trade
**Objective:** Damage math is correct in minion vs minion combat.
**Method:** Player has a 3/2 minion. Opponent has a 2/3 minion. Attack opponent minion. After combat: Player minion = 3/0 (destroyed), Opponent minion = 2/0 (wait — 2/3 takes 3 damage = 2/0, destroyed). Both should die. If either survives, bug.

### 3.2 — Minion Attacks Hero
**Objective:** Minion damage correctly reduces hero health.
**Method:** Attack enemy hero (30 health) with a 4/5 minion. Verify hero health = 26. Minion takes no damage (heroes don't counter-attack without a weapon).

### 3.3 — Summoning Sickness
**Objective:** Newly played minions cannot attack.
**Method:** Play a vanilla minion (no Rush/Charge). Attempt to attack with it. Verify: attack is blocked, "can't attack this turn" visual indicator.

### 3.4 — Rush vs Charge
**Objective:** Rush allows minion attacks, Charge allows all attacks.
**Method A (Rush):** Play a Rush minion. Verify it CAN attack enemy minions but CANNOT attack enemy hero this turn.
**Method B (Charge):** Play a Charge minion. Verify it CAN attack enemy minions AND enemy hero this turn.

### 3.5 — Taunt Enforcement
**Objective:** Must attack Taunt before other targets.
**Method:** Opponent has a Taunt minion and a non-Taunt minion. Attempt to attack the non-Taunt minion. Verify: blocked. Attempt to attack hero. Verify: blocked. Attack Taunt minion. Verify: allowed. After Taunt dies, verify other targets become valid.

### 3.6 — Overkill
**Objective:** Excess damage doesn't carry over to hero (unless card says so).
**Method:** Attack a 1-health minion with a 10-attack minion. Verify: minion dies, excess 9 damage is NOT applied to hero.

---

## 4. STARFORGE Transformation Suite

### 4.1 — Basic Transform Trigger
**Objective:** Card transforms when condition is met.
**Method:** Play an Epic card with a known starforgeCondition (e.g., "Cast 3 spells"). Meet the condition. Verify: card visually transforms (new art, glow border), stats update to STARFORGE values.

### 4.2 — Transform Heals to Full
**Objective:** Damaged card transforms to full STARFORGE health.
**Method:** Play an Epic card (5 health). Deal 3 damage to it (now 2 health). Trigger STARFORGE. Verify: health becomes STARFORGE health value (e.g., 8), NOT 2 or 5.

### 4.3 — Transform on Opponent Turn
**Objective:** If condition is met during opponent's turn, transform still triggers.
**Method:** Play a card whose starforgeCondition could be met by opponent's actions (e.g., "3 minions die"). On opponent's turn, if they kill enough minions to meet condition, verify transform fires.

### 4.4 — Silenced Card Cannot Transform
**Objective:** Silence prevents STARFORGE.
**Method:** Play an Epic card. Silence it. Meet the starforgeCondition. Verify: NO transform occurs.

### 4.5 — Double Transform Prevention
**Objective:** Already-transformed card ignores condition.
**Method:** Transform a card. Create the same condition again. Verify: no second transformation, no visual glitch, no error.

### 4.6 — Full Board Transform
**Objective:** Transform works with 7 minions on board (no new slot needed).
**Method:** Fill board to 7 minions including an Epic. Trigger its STARFORGE. Verify: transforms in place, board stays at 7, no "board full" error.

---

## 5. Faction-Specific Scenarios

### 5.1 — Hivemind Adjacency
**Objective:** Buff applies to exactly left and right neighbors.
**Method:** Board positions [1: Minion A] [2: Hivemind Buffer (+1/+1 adjacent)] [3: Minion B]. Verify: A has +1/+1, B has +1/+1. Minions at positions 4+ have no buff. Buffer itself has no self-buff.

### 5.2 — Chronobound Extra Turn
**Objective:** Extra turn functions correctly.
**Method:** Play an Extra Turn card. End your turn. Verify: you get another turn (draw, crystal gain, full action phase). After extra turn ends, opponent gets their turn.

### 5.3 — Pyroclast Burn Stack
**Objective:** Multiple burns stack.
**Method:** Apply Burn(1) twice to a minion (3/5). End turn. Verify: minion takes 2 damage → now 3/3 (not 1 damage from one Burn). Next end of turn: another 2 damage → 3/1.

### 5.4 — Voidborn Sacrifice
**Objective:** Sacrifice destroys friendly minion and activates effect.
**Method:** Play a "Sacrifice a friendly minion: deal 5 damage" card. Target a friendly 2/2. Verify: 2/2 is destroyed, 5 damage dealt to chosen target, Deathrattle on sacrificed minion triggers.

### 5.5 — Cogsmiths Magnetic
**Objective:** Magnetic merges correctly.
**Method:** Have a 2/3 Mech on board. Play a 3/2 Magnetic Mech to its LEFT. Verify: merged minion is 5/5 with combined keywords. Board count stays the same (no new slot used).

---

## 6. Edge Case / Chaos Scenarios

### 6.1 — Empty Deck Fatigue
**Objective:** Drawing from empty deck deals increasing fatigue damage.
**Method:** Deplete deck. Draw attempt 1: 1 damage to hero. Draw attempt 2: 2 damage. Draw attempt 3: 3 damage. Verify counter increments correctly.

### 6.2 — Full Hand Overdraw
**Objective:** Drawing with 10 cards in hand burns the drawn card.
**Method:** Have 10 cards in hand. Start turn (draw phase). Verify: drawn card is destroyed (shown briefly then burned), hand stays at 10.

### 6.3 — Simultaneous Lethal
**Objective:** Both heroes at 0 health = draw.
**Method:** Engineer a scenario where an attack kills the opponent's hero but a triggered effect (Deathrattle) kills your hero simultaneously. Verify: game is a draw, not a win for either side.

### 6.4 — 0-Cost Card
**Objective:** 0-cost cards can always be played.
**Method:** With 0 crystals remaining, play a 0-cost card. Verify: card resolves normally.

### 6.5 — Board Full (7 Minions)
**Objective:** Cannot summon/play minions beyond 7.
**Method:** Fill board to 7. Attempt to play an 8th minion. Verify: blocked, card stays in hand, crystals not spent.

### 6.6 — Keyword Interaction: Divine Shield + Poisonous
**Objective:** Divine Shield absorbs Poisonous attack.
**Method:** Divine Shield minion is attacked by Poisonous minion. Verify: Shield is consumed, Divine Shield minion survives (Poisonous only destroys on actual damage dealt, shield prevents damage).

---

## 7. UI/UX Scenarios

### 7.1 — Responsive Breakpoints
**Objective:** Game is playable at common viewport sizes.
**Method:** Test at: 1920x1080, 1366x768, 1024x768, 375x812 (mobile). Verify: cards readable, buttons clickable, no overlap.

### 7.2 — Card Hover Tooltip
**Objective:** Hovering a card shows enlarged view with full text.
**Method:** Hover each card type. Verify: tooltip appears within 200ms, shows full cardText and flavorText, tooltip doesn't clip screen edges.

### 7.3 — End Turn Button
**Objective:** End Turn button works and shows feedback.
**Method:** Click End Turn. Verify: turn passes, button becomes disabled during opponent turn, re-enables on your turn.

### 7.4 — Drag-and-Drop Card Play
**Objective:** Dragging a card from hand to board plays it.
**Method:** Drag a playable card to the board area. Verify: card is placed, crystals are spent, hand updates. Drag an unplayable card: verify it snaps back to hand.

---

## 8. Chrome Agent Directive Templates

Copy-paste these into Claude in Chrome side panel for exploratory testing sessions:

**Smoke Test:**
> Play one complete game with any faction. Report any crashes, visual glitches, wrong card data, or unexpected behaviors. Screenshot anything that looks wrong.

**Faction Deep Dive:**
> Play 3 consecutive games using {FACTION_NAME} faction decks. Focus on testing faction-specific mechanics. Try to trigger STARFORGE on at least one card per game. Report all bugs using the standard template.

**Stress Test:**
> Try to break the game. Play 0-cost cards rapidly. Fill the board. Empty your deck. Try to play cards with insufficient mana. Try to attack invalid targets. Report every error or unexpected behavior.

**New Player Test:**
> Pretend you have never played a card game before. Navigate the game from the main menu. Try to understand the rules from the UI alone. Report any confusion, missing tooltips, unclear buttons, or dead-end states.

**Visual Regression:**
> Open the full card collection. Scroll through all 11 factions. Screenshot any card with: missing art, overflow text, wrong rarity color, misaligned elements, or broken layout.

---
name: starforge-qa
description: "Automated QA and beta testing skill for STARFORGE TCG, a sci-fi fantasy digital card game. Use this skill whenever testing, debugging, playing, or validating any aspect of the STARFORGE game — including card rendering, mana mechanics, combat logic, STARFORGE transformations, faction abilities, UI states, deck building, or game flow. Also trigger when writing Playwright tests, generating bug reports, doing exploratory gameplay testing via Claude in Chrome, or reviewing test results. If the user mentions STARFORGE bugs, QA, testing, card validation, or gameplay issues, use this skill."
---

# STARFORGE TCG — QA & Beta Testing Skill

This skill enables Claude to act as an expert QA tester for STARFORGE TCG. Claude uses this knowledge to write automated tests, play the game exploratorily via the browser, identify bugs, and produce structured bug reports.

## Quick Reference

| Resource | Path | When to Read |
|----------|------|-------------|
| Faction mechanics | `faction-rules.md` | Testing any faction-specific ability or interaction |
| Test scenarios | `test-scenarios.md` | Writing new Playwright tests or Chrome Agent directives |
| Bug report template | `bug-template.md` | Logging any bug from any testing layer |
| Card schema data | `card-schema.json` | Validating card data, stats, or rendering |
| Known bugs | `known-bugs.md` | Before reporting — check if already logged |

Read the relevant reference file(s) before executing any test action.

---

## Game Architecture

**Deployment:** Vercel (repo: `finishstrong23/starforge_tcg`)
**Frontend:** React + Vite
**Card art path:** `public/cards/{cardId}.png` (also `.webp`, `.jpg`)
**Live URL:** `https://starforge-tcg.vercel.app`

---

## Core Game Rules

### Turn Structure

1. **Start of Turn** — Active player gains +1 max crystal (cap: 10). All crystals refill.
2. **Draw Phase** — Draw 1 card from deck. (First player skips draw on Turn 1.)
3. **Action Phase** — Play cards from hand (spend crystals), attack with minions, use hero power.
4. **End of Turn** — End-of-turn effects trigger. Pass to opponent.

### Crystal Mana System

- Players start with 0 crystals. Gain +1 max crystal per turn, up to 10.
- Playing a card costs crystals equal to its `cost` field.
- A card CANNOT be played if `player.currentCrystals < card.cost`. This is a hard rule.
- Unspent crystals do NOT carry over (crystals refill to max each turn).
- Some Crystalline faction cards manipulate mana (gain temporary crystals, reduce costs). These are exceptions that must follow the card's `cardText` exactly.

### Card Types

| Type | Behavior |
|------|----------|
| Minion | Placed on board. Has attack/health. Can attack after 1 turn (unless has Rush or Charge). |
| Spell | Played from hand, effect resolves immediately, goes to graveyard. No attack/health. |
| Weapon | Equipped to hero. Hero can attack with weapon's attack value. Loses 1 durability per attack. |
| Hero Power | Innate ability, costs 2 crystals, once per turn. Faction-specific. |

### Combat Rules

- Minions can attack once per turn (unless they have Windfury).
- Attacking minion deals its `attack` value to the target. Target deals its `attack` back (if minion).
- A minion/hero with `health <= 0` is destroyed/loses.
- Minions CANNOT attack the turn they are played UNLESS they have **Rush** (can attack minions) or **Charge** (can attack anything).
- **Taunt** minions must be attacked first — opponent cannot bypass Taunt to hit face or other minions.

### Win/Loss Conditions

- A hero reduced to 0 health loses the game.
- A player forced to draw from an empty deck takes fatigue damage (1, then 2, then 3, etc.).
- If both heroes die simultaneously, the game is a draw.

### Deck Rules

- 30 cards per deck.
- Max 2 copies of any card (except Legendary: max 1 copy).
- Decks can include cards from 1 faction + Neutral cards.

---

## STARFORGE Transformation Mechanic

The signature mechanic. Epic and Legendary minions can transform into more powerful versions when specific conditions are met.

### Rules

1. **Eligibility:** Only cards with `rarity: "Epic"` or `rarity: "Legendary"` AND a defined `starforgeCondition` can transform.
2. **Trigger:** The condition in `starforgeCondition` must be met while the card is on the board.
3. **Transformation:** When triggered, the card's art, stats (attack/health), and `cardText` change to the STARFORGE version. This is permanent for the rest of the game.
4. **Visual indicator:** Transformed cards should display a glowing border effect and updated art.
5. **Health behavior:** If the card was damaged before transforming, its health becomes the STARFORGE health (full, not carrying over damage). This is intentional.

### Edge Cases to Test

- Transform trigger fires during combat (mid-attack resolution)
- Transform when board is full (7 minions) — card transforms in place, no new slot needed
- Transform condition met on opponent's turn (should still trigger)
- Transform of a silenced minion (silence removes the transform ability — should NOT transform)
- Double-transform attempt (already transformed card meets condition again — should be no-op)
- Transform visual appears within 1 second of condition being met

---

## Keywords Reference

| Keyword | Effect | Test Focus |
|---------|--------|------------|
| Taunt | Must be attacked before other targets | Target selection enforcement |
| Charge | Can attack any target the turn it's played | Immediate attack availability |
| Rush | Can attack minions (not heroes) the turn it's played | Attack restriction to minions only |
| Divine Shield | Negates the first instance of damage | Shield removal after first hit |
| Stealth | Cannot be targeted until it attacks | Target list filtering |
| Windfury | Can attack twice per turn | Attack counter reset |
| Lifesteal | Damage dealt heals the hero | Health restoration math |
| Deathrattle | Effect triggers when destroyed | Trigger timing and ordering |
| Battlecry | Effect triggers when played from hand | Only from hand, not from summon effects |
| Overload (X) | Next turn, X crystals are locked | Crystal lock on correct turn |
| Silence | Remove all card text and keywords | Full text/keyword strip |
| Poisonous | Destroy any minion damaged by this | Destruction regardless of health |

---

## Rarity Distribution

| Rarity | Count | Copy Limit | STARFORGE Eligible |
|--------|-------|------------|-------------------|
| Common | ~340 | 2 per deck | No |
| Rare | ~260 | 2 per deck | No |
| Epic | ~170 | 2 per deck | Yes |
| Legendary | ~89 | 1 per deck | Yes |

---

## Card Schema Validation

Every card in `card-schema.json` must have these fields:

```
{
  "id": string,          // Unique identifier (e.g., "AST-001")
  "name": string,        // Display name
  "faction": enum,       // One of 11 factions
  "type": enum,          // "Minion" | "Spell" | "Weapon"
  "tribe": string|null,  // Sub-type (e.g., "Mech", "Beast", "Dragon")
  "rarity": enum,        // "Common" | "Rare" | "Epic" | "Legendary"
  "cost": integer,       // 0-10 crystal cost
  "attack": integer|null,// Minions/Weapons only, >= 0
  "health": integer|null,// Minions only, >= 1
  "keywords": array,     // From Keywords Reference above
  "cardText": string,    // Ability/effect description
  "flavorText": string,  // Lore text
  "collectible": boolean,// true = obtainable by players
  "set": string,         // Card set identifier
  "artPrompt": string    // DALL-E 3 prompt for art generation
}
```

### Validation Rules

- `cost` must be 0-10 (inclusive)
- `attack` must be non-negative for Minions/Weapons, null for Spells
- `health` must be >= 1 for Minions, null for Spells/Weapons
- `faction` must be one of: Astromancers, Biotitans, Chronobound, Cogsmiths, Crystalline, Hivemind, Luminar, Neutral, Phantom Corsairs, Pyroclast, Voidborn
- `rarity` must be one of: Common, Rare, Epic, Legendary
- `type` must be one of: Minion, Spell, Weapon
- `keywords` entries must all exist in the Keywords Reference
- `id` format: `{FACTION_PREFIX}-{3-digit-number}` (e.g., AST-001, BIO-042)
- Legendary cards: if `starforgeCondition` exists, validate it's a non-empty string
- Art file must exist at `public/cards/{id}.png` OR `.webp` OR `.jpg`

---

## UI Expectations

### Game Board Layout

```
┌─────────────────────────────────────┐
│  Opponent Hero [health] [hero power]│
│  Opponent Hand (card backs, count)  │
│  ─────────────────────────────────  │
│  Opponent Board (up to 7 minions)   │
│  ═══════════════════════════════════│
│  Player Board (up to 7 minions)     │
│  ─────────────────────────────────  │
│  Player Hand (visible cards)        │
│  Player Hero [health] [crystals]    │
│  [End Turn Button]  [Deck count]    │
└─────────────────────────────────────┘
```

### Expected UI States to Verify

- **Playable cards** in hand should have a green glow when player has enough crystals
- **Unplayable cards** should appear dimmed or have no glow
- **Valid attack targets** should highlight when selecting an attacker
- **Taunt minions** should have a visible shield/taunt indicator
- **STARFORGE-ready** cards (condition almost met) may show a subtle pulse (optional)
- **Transformed cards** show updated art + glowing border
- **End of game** screen shows winner, stats summary
- **Crystal counter** displays `current/max` (e.g., "3/5")
- **Deck counter** shows remaining cards
- **Fatigue indicator** appears when deck is empty

---

## Bug Reporting

When a bug is found (from any testing layer), use the template in `bug-template.md`.

### Severity Classification

| Severity | Definition | Examples |
|----------|-----------|---------|
| CRITICAL | Game-breaking, crash, data loss | Infinite loop, white screen, save corruption |
| HIGH | Wrong game logic, unfair outcomes | Wrong damage calc, mana allows overspend, transform doesn't trigger |
| MEDIUM | UI wrong but game still works | Card text overflow, wrong animation, tooltip missing |
| LOW | Minor visual issues | Slight misalignment, font inconsistency |
| COSMETIC | Polish items | Missing card art placeholder, color mismatch |

### Report Output

Save reports to `reports/` directory in the repo:
- `reports/qa-run-{YYYY-MM-DD}.md` — Human-readable markdown
- `reports/qa-run-{YYYY-MM-DD}.json` — Machine-readable JSON array of bugs

For CRITICAL/HIGH bugs, also create GitHub Issues:
```bash
gh issue create --title "[SF-BUG] {summary}" --body "{full report}" --label "bug,{severity},{faction}"
```

---

## Testing Layers

### Layer 2: Playwright Tests

Test files live in `tests/` directory. Config targets the Vercel deployment.

**Naming convention:** `{system}.spec.ts` or `factions/{faction}.spec.ts`

**Test structure pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Mana System', () => {
  test('cannot play card when insufficient crystals', async ({ page }) => {
    await page.goto('/game');
    // Setup: get to a state with known crystal count
    // Action: attempt to play a card costing more than available
    // Assert: card remains in hand, crystals unchanged, error feedback shown
  });
});
```

**Key testing patterns:**
- Use `data-testid` attributes for reliable selectors
- Capture screenshots on failure: `await page.screenshot({ path: 'evidence.png' })`
- Test against preview deployments for pre-merge validation
- Group related assertions in `test.describe` blocks by game system

### Layer 3: Chrome Agent Directives

When playing via Claude in Chrome, follow this protocol:

1. **State your test objective** before starting (e.g., "Testing Hivemind swarm buff mechanic")
2. **Narrate observations** as you play (what you clicked, what happened, what you expected)
3. **Screenshot anomalies** immediately when spotted
4. **Record GIF** of any bug that involves animation or timing
5. **Complete the game** if possible (don't abandon mid-match)
6. **Produce report** in bug-template.md format at end of session
7. **Check known-bugs.md** before reporting to avoid duplicates

---

## Faction Quick Reference

For full faction mechanics, read `faction-rules.md`. Summary:

| Faction | Core Mechanic | Key Testing Focus |
|---------|--------------|-------------------|
| Astromancers | Spell amplification & spell damage bonuses | Damage calculation with bonuses |
| Biotitans | Health regeneration & overheal | Healing caps, overheal interactions |
| Chronobound | Extra turns & turn manipulation | Turn state machine correctness |
| Cogsmiths | Artifact/Mech synergy & buffs | Tribal tag detection, buff stacking |
| Crystalline | Mana manipulation & ramp | Crystal overflow, temporary mana edge cases |
| Hivemind | Adjacent minion buffs & swarm | Position-aware buffs, board ordering |
| Luminar | Shields & divine protection | Shield stacking, damage prevention order |
| Neutral | Universal utility cards | Cross-faction interaction correctness |
| Phantom Corsairs | Stealth & evasion | Target filtering, stealth break timing |
| Pyroclast | Direct damage & burn effects | Damage routing, overkill handling |
| Voidborn | Sacrifice & life drain | Self-damage triggers, drain math |

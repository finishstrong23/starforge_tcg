# Bug Report Template — STARFORGE TCG

Use this template for ALL bugs regardless of which testing layer found them.

---

## Markdown Format (for reports/qa-run-{date}.md)

```markdown
### SF-BUG-{YYYYMMDD}-{SEQ}

**Severity:** CRITICAL | HIGH | MEDIUM | LOW | COSMETIC
**Category:** MECHANIC | UI | PERFORMANCE | DATA | CRASH | VISUAL
**Faction:** {Affected faction or "Global"}
**Cards Involved:** {Card IDs, comma-separated}
**Source:** PLAYWRIGHT | CHROME_AGENT | MANUAL
**Detected:** {ISO 8601 timestamp}

**Summary:** {One-line description}

**Steps to Reproduce:**
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Expected Behavior:** {What should happen per game rules}

**Actual Behavior:** {What actually happened}

**Game State at Time of Bug:**
- Turn: {number}
- Active Player Crystals: {current}/{max}
- Player Board: {minion names/IDs}
- Opponent Board: {minion names/IDs}
- Player Hand Size: {number}
- Player Health: {number}
- Opponent Health: {number}

**Evidence:**
- Screenshot: {path or URL}
- GIF: {path or URL}
- Console Log: {error text if applicable}

**Notes:** {Additional context, suspected cause, or workaround}
```

---

## JSON Format (for reports/qa-run-{date}.json)

```json
{
  "bug_id": "SF-BUG-20260314-001",
  "severity": "HIGH",
  "category": "MECHANIC",
  "faction": "Hivemind",
  "cards_involved": ["HIV-023", "HIV-041"],
  "summary": "Adjacent buff not applying to right neighbor",
  "steps_to_reproduce": [
    "Play Hivemind Buffer (HIV-023) at board position 2",
    "Play any minion at board position 3",
    "Observe position 3 minion stats"
  ],
  "expected_behavior": "Position 3 minion gains +1/+1 from adjacency buff",
  "actual_behavior": "Position 3 minion shows base stats, no buff applied",
  "evidence": {
    "screenshot": "reports/gifs/SF-BUG-20260314-001.png",
    "gif": null,
    "console_log": "No errors in console"
  },
  "source_layer": "CHROME_AGENT",
  "detected_at": "2026-03-14T14:32:00Z",
  "game_state": {
    "turn": 5,
    "player_crystals": "3/5",
    "player_board": ["HIV-023", "NEU-010"],
    "opponent_board": ["PYR-005"],
    "player_hand_size": 4,
    "player_health": 28,
    "opponent_health": 30
  },
  "notes": "Left neighbor (position 1) IS receiving the buff correctly. Only right side is broken."
}
```

---

## GitHub Issue Format

For CRITICAL and HIGH severity bugs, auto-create issues:

```bash
gh issue create \
  --title "[SF-BUG-{ID}] {summary}" \
  --body "$(cat <<'EOF'
## Bug Report

**Severity:** {severity}
**Category:** {category}
**Faction:** {faction}
**Cards:** {card IDs}
**Found by:** {source_layer}

### Steps to Reproduce
1. {step 1}
2. {step 2}
3. {step 3}

### Expected
{expected_behavior}

### Actual
{actual_behavior}

### Game State
Turn {turn}, Crystals {crystals}, Board: {board state}

### Evidence
{screenshot/gif links}

### Notes
{additional context}
EOF
)" \
  --label "bug,{severity_lowercase},{faction_lowercase}"
```

---

## Severity Quick Reference

| Severity | Auto-Create Issue? | Blocks Release? |
|----------|-------------------|-----------------|
| CRITICAL | Yes, immediately | Yes |
| HIGH | Yes, same day | Yes |
| MEDIUM | Yes, batched daily | No |
| LOW | No, log only | No |
| COSMETIC | No, log only | No |

---

## Category Definitions

| Category | What It Covers |
|----------|---------------|
| MECHANIC | Wrong game logic: damage, mana, keywords, transforms, faction abilities |
| UI | Layout, responsiveness, missing elements, wrong state display |
| PERFORMANCE | Lag, slow loading, frame drops, memory leaks |
| DATA | Card schema errors, wrong stats, missing fields, data mismatch |
| CRASH | White screen, infinite loop, unrecoverable error, browser tab crash |
| VISUAL | Card art issues, animation glitches, color/font problems |

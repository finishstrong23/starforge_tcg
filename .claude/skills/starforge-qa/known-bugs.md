# Known Bugs — STARFORGE TCG

Check this file BEFORE reporting a new bug to avoid duplicates.
Last updated: 2026-03-15

---

## Active Known Issues

### SF-BUG-20260315-001 — 4 pre-existing GameEngine test failures
- **Severity:** MEDIUM
- **Status:** OPEN
- **Faction:** Global
- **First Detected:** 2026-03-14
- **Description:** 4 tests in `tests/engine/GameEngine.test.ts` fail due to card IDs not found in the database. Pre-existing issue unrelated to recent changes.

### SF-BUG-20260315-002 — Banishing effect unverified
- **Severity:** LOW
- **Status:** OPEN
- **Faction:** Voidborn
- **First Detected:** 2026-03-15
- **Description:** Banish keyword/effect has not been confirmed working in gameplay. Needs testing.

### SF-BUG-20260315-003 — Agent Zero card not found
- **Severity:** MEDIUM
- **Status:** OPEN
- **Faction:** Unknown
- **First Detected:** 2026-03-15
- **Description:** User reported Agent Zero's deploy ability didn't work, but no card with this name exists in SampleCards.ts or ExpansionCards.ts. May be a renamed card or misremembered name.

### SF-BUG-20260315-004 — Yesterday's Ghost card not found
- **Severity:** MEDIUM
- **Status:** OPEN
- **Faction:** Chronobound
- **First Detected:** 2026-03-15
- **Description:** User reported Yesterday's Ghost summoned wrong minion instead of adding a copy to hand. No card with this name exists in codebase. May be renamed.

---

## Resolved Issues

### SF-BUG-20260315-R01 — IMMOLATE keyword redundant with LAST_WORDS
- **Severity:** MEDIUM
- **Status:** RESOLVED
- **Faction:** Pyroclast
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Removed IMMOLATE keyword entirely. All Pyroclast cards now use LAST_WORDS + ON_DEATH effects instead.
- **Commit:** Batch 1 commit

### SF-BUG-20260315-R02 — Fire Cultist effect not working
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Pyroclast
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Changed targetType from RANDOM_ENEMY to ALL_CHARACTERS.

### SF-BUG-20260315-R03 — Supernova card not working
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Pyroclast
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Changed from broken ON_DEATH to ON_PLAY with DESTROY ALL_MINIONS + DAMAGE ENEMY_HERO 5.

### SF-BUG-20260315-R04 — Biosurge empty effects
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Biotitans
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Added BUFF +3/+3 and ADAPT effects.

### SF-BUG-20260315-R05 — Hive Matriarch empty effects
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Hivemind
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Added SUMMON 3 tokens + ADAPT all friendly minions.

### SF-BUG-20260315-R06 — Game freezes on opponent turn 5-6
- **Severity:** CRITICAL
- **Status:** RESOLVED
- **Faction:** Global
- **First Detected:** 2026-03-14
- **Resolved:** 2026-03-14
- **Fix:** Added 20s safety timeout to AI turn loop, game status check, and error recovery (force END_TURN on exception). Reduced AI delay to 1.2s.

### SF-BUG-20260315-R07 — Thought Shredder deploy not discarding opponent's card
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Voidborn
- **First Detected:** 2026-03-15
- **Resolved:** 2026-03-15
- **Fix:** Fixed `executeDiscard` to target opponent when targetType is ENEMY_HERO. Fixed data from `{ count: 1 }` to `{ value: 1 }`.

### SF-BUG-20260315-R08 — Echo keyword not working
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Global
- **First Detected:** 2026-03-15
- **Resolved:** 2026-03-15
- **Fix:** Added Echo processing for spells (was only on minions). Added `cleanupEchoCopies` at end of turn.

### SF-BUG-20260315-R09 — Rift Walker not reducing hand card costs
- **Severity:** HIGH
- **Status:** RESOLVED
- **Faction:** Chronobound
- **First Detected:** 2026-03-15
- **Resolved:** 2026-03-15
- **Fix:** Added MODIFY_COST effect with amount: -1. Added temporary cost reset in `clearTemporaryBuffs`. Added green/red cost badge visuals.

### SF-BUG-20260315-R10 — Null Anchor structure not functioning
- **Severity:** MEDIUM
- **Status:** RESOLVED
- **Faction:** Voidborn
- **First Detected:** 2026-03-15
- **Resolved:** 2026-03-15
- **Fix:** Added ON_TURN_START effect dealing 2 damage to enemy hero. Added orange glow for structures on board.

---

## How to Use This File

### Adding a Known Bug
When a bug is confirmed and logged, add it here:

```markdown
### SF-BUG-{ID} — {summary}
- **Severity:** {severity}
- **Status:** OPEN | IN_PROGRESS | RESOLVED | WONT_FIX
- **Faction:** {faction}
- **First Detected:** {date}
- **Description:** {brief description}
```

### Moving to Resolved
When fixed, move the entry to "Resolved Issues" and add:
```markdown
- **Resolved:** {date}
- **Fix:** {brief description of the fix}
- **Commit:** {git commit hash}
```

### QA Testers: Before Reporting
1. Search this file for the card ID or mechanic name
2. If the bug matches a known issue, do NOT re-report — add a comment noting you reproduced it
3. If it's a new bug, proceed with the standard bug-template.md format

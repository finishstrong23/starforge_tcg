# Known Bugs — STARFORGE TCG

Check this file BEFORE reporting a new bug to avoid duplicates.
Last updated: 2026-03-14

---

## Active Known Issues

_No known bugs logged yet. This file will be populated as QA runs begin._

---

## Resolved Issues

_No resolved issues yet._

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

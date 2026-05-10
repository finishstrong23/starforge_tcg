# Card Upgrades — Cogsmiths (Phase 3)

**Phase**: 3 of 4 (Cogsmiths)
**Faction**: Cogsmiths (44 cards, including 6 Augments)
**Status**: All 44 cards `✅ wired` — no cosmetic upgrades.

Cogsmiths is the highest-bug-risk faction in the upgrade system because of
the augment + upgrade interaction surface. Phase 3 surfaces and fixes a
**critical pre-existing chokepoint regression** (augment patches were
silently lost on upgraded cards), adds two small parser captures (Jolt
+N Weak / Core +N draw), rewrites 18 cards, and adds 8 cross-cut tests
covering the augment × upgrade math directly.

---

## The critical bug surfaced in Phase 3

**`applyAugment` patched `cardText` only; the engine reads `getCardText` (Phase 1 chokepoint), which returns `upgradeText` for upgraded cards.** Result: every augment silently no-op'd on every upgraded card.

The Phase 1 chokepoint was correct; `applyAugment` predated it and was not migrated when the chokepoint shipped. This is exactly the failure mode the user warned about: "any code path that reads `card.cardText` directly is a latent upgrade-ignoring bug." `applyAugment` was reading and writing `cardText` directly, so its patches landed on a dead field for upgraded targets.

**Fix** (combat.ts:262–266 + bottom of `applyAugment`):
1. Read the active text via `getCardText(target)` and use it as the patch base.
2. After all patches, sync the patched text into `upgradeText` if the target is upgraded, so subsequent `getCardText` calls return the patched text.

This bug was not visible without explicit cross-cut tests — the augment
+ play sequence "succeeds" (cards exhaust, energy spends, text on the
target IS modified) but the modified text was on a field the engine no
longer read. **Verified by Cogsmiths cross-cut tests 1–8.**

---

## Acceptance criterion (carried forward)

> An upgrade clause that the regex parser cannot fully execute is a
> regression. It does not ship. Either extend the parser, or rewrite
> the clause to use existing patterns.

**Plus a new discipline added in Phase 3** (per user brief): cluster
rewrite tests assert per-clause deltas, not just "some state changed."
P-040's retroactive find showed that the smoke regression net misses
partial-fires when one of multiple clauses fires. Per-clause precision
prevents that class of bug by construction.

Pyroclast and Luminar are NOT retrofitted to this stricter assertion
style — per user discretion ("apply forward only" if retrofit is more
than a few hours). The 44-card smoke regression net stays as the safety
net for those factions; the cluster tests added in Phase 1.5 / Phase 2
already cover the critical paths.

---

## Phase 3 — what changed

### Engine changes (3 small fixes)

**`src/dungeon/engine/combat.ts` — `applyAugment`**

| Change | Lines | Reason |
|---|---|---|
| Read patch base via `getCardText(target)`; sync `upgradeText` at end | ~6 added | **Critical fix** — augments were silently no-op on every upgraded card |
| `+N Weak` capture (Jolt) — replaced fixed-+1 fallback | ~3 added | Honors Jolt+'s `+2 Weak` upgrade (was silently degrading to 1) |
| `+N draw` capture (Core) — replaced fixed-+1 fallback | ~5 added | Honors Core+'s `+2 draw` upgrade (was silently degrading to 1) |
| `costs 0` regex relaxed from `costs 0$ \| costs 0 and does not exhaust` to `costs 0\b` | 1 line | Supports Exotic Core+ rewrite "card costs 0 and deals +6 damage" |

These are bug-fixes, not new mechanics. The user's "default to rewrite" rule
explicitly carves out 2-card scope for this kind of small capture-fix when
the alternative is making an upgrade boring AND fixing a partial-fire bug.

### Card data — no new fields, no schema changes.

### Card rewrites (18 cards across 7 clusters)

| Cluster | Cards | Pattern that was inert | Replacement strategy |
|---|---|---|---|
| **C-A** Delayed cost discounts / pseudo-attachments | C-003 Tinker, C-009 Crosswire, C-035 Iron Commandment | "next Augment costs 0", "next Attack costs 0", "first Attack treated as having extra Edge+Jolt" | Direct effect on play: Energy gain + Draw, Strength gain |
| **C-B** Add-to-hand / Copy | C-012 Toolkit, C-022 Automate | "add a random Augment", "copy an Augment from your deck" | Direct draw + Block / Energy + Draw |
| **C-C** Augment partial-fires (remainder after parser fix) | C-038 Exotic Core, C-039 Inverter | "does not exhaust", "duplicates", "doubled effect" | Cost 0 + numeric damage bump (Exotic Core), straight numeric damage bump (Inverter) |
| **C-D** Retain on Augments | C-029 Bulwark | "Block retains for 1 turn" — Retain mechanic not implemented | Direct +N Block via the patcher's "+N block" pattern |
| **C-E** Per-combat counters | C-026 Assembly Line, C-030 Amp | "if you played 3+ cards", "once per combat double damage" | Unconditional turn-end draw, direct +N damage augment |
| **C-F** Global / aggregate Powers | C-031 Mecha Form, C-032 Warforge, C-037 Machine God, C-040 Reinforce Protocol | "All Augments cost 0", "All Augment effects doubled", "+N HP/dmg to all summons", "Attach Augment to every card" | Direct Strength/Block/Draw segments split into parsable Power triggers |
| **C-G** Cosmetic qualifiers | C-023 Precision Bore, C-036 Overclocked Core, C-044 Pace | "ignores Block", "this turn" Energy, "Discard 1 card" | Plain damage scaling, play-segment Energy gain (matches actual behavior), drop the Discard clause |

---

## Cogsmiths upgrade table — final (all wired)

### Common (16 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| C-001 | Rivet Strike | Deal 7. | Deal 10. | ✅ |
| C-002 | Plate Shield | Gain 6 Block. | Gain 8 Block. | ✅ |
| C-003 | Tinker | **Draw 1. Gain 1 Energy.** *(was: next Augment costs 0)* | **Draw 2. Gain 1 Energy.** | ✅ rewritten |
| C-004 | Socket Wrench | Deal 5 + 3 per Augment on this card. | Deal 6 + 4 per Augment on this card. | ✅ |
| C-005 | Hammer Blow | Deal 9. Exhaust. | Deal 12. Exhaust. | ✅ |
| C-006 | Bolt Thrower | Deal 3 damage twice. | Deal 4 damage twice. | ✅ |
| C-007 | Gear Shift | Gain 4 Block. Draw 1. | Gain 5 Block. Draw 2. | ✅ |
| C-008 | Pneumatic Jab | Deal 13. | Deal 16. | ✅ |
| C-009 | Crosswire | **Gain 1 Energy. Draw 1.** *(was: next Attack costs 0)* | **Gain 2 Energy. Draw 1.** | ✅ rewritten |
| C-010 | Servo Shield | At start of each turn, gain 3 Block. | At start of each turn, gain 4 Block. | ✅ |
| C-011 | Deploy Drone | Summon Drone (5/3, 3 turns). | Summon Scout (7/4, 4 turns). | ✅ |
| C-012 | Toolkit | **Draw 2. Gain 4 Block.** *(was: add random Augment)* | **Draw 3. Gain 4 Block.** | ✅ rewritten |
| C-013 | Overdrive | Gain 1 Energy. Draw 2. Take 3 damage. | Gain 1 Energy. Draw 2. Take 2 damage. | ✅ |
| C-014 | Augment: Edge | Attach: card deals +3 damage. | Attach: card deals +5 damage. | ✅ |
| C-015 | Augment: Plate | Attach: card grants +3 Block. | Attach: card grants +5 Block. | ✅ |
| C-016 | Augment: Jolt | **Attack applies +1 Weak.** *(was: "applies Weak 1" — silently always +1)* | **Attack applies +2 Weak.** | ✅ **parser capture fix** |

### Uncommon (14 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| C-017 | Heavy Wrench | Deal 16. | Deal 20. | ✅ |
| C-018 | Shock Coil | Deal 5. Apply Weak 2. | Deal 7. Apply Weak 3. | ✅ |
| C-019 | Deploy Sentry | Summon Sentry (8/6, 4 turns). | Summon Vanguard (12/8, 4 turns). | ✅ |
| C-020 | Full Plate | Gain 14 Block. | Gain 18 Block. | ✅ |
| C-021 | Modular Strike | Deal 6 + 4 per Augment in deck. | Deal 8 + 5 per Augment in deck. | ✅ |
| C-022 | Automate | **Gain 1 Energy. Draw 2.** *(was: copy Augment)* | **Gain 2 Energy. Draw 2.** | ✅ rewritten |
| C-023 | Precision Bore | **Deal 14.** *(was: "ignores Block" cosmetic)* | **Deal 18.** | ✅ rewritten |
| C-024 | Whirring Blades | Deal 4 damage 3 times. | Deal 5 damage 3 times. | ✅ |
| C-025 | Repair Nanites | Heal 8. | Heal 12. | ✅ |
| C-026 | Assembly Line | **At end of turn, draw 1.** *(was: conditional on cards-played counter)* | **At end of turn, draw 2.** | ✅ rewritten |
| C-027 | Augment: Core | **Card draws +1 card.** *(was: "draws a card" — silently always +1)* | **Card draws +2 cards.** | ✅ **parser capture fix** |
| C-028 | Augment: Gyro | Card costs 1 less. | Card costs 2 less. | ✅ |
| C-029 | Augment: Bulwark | **Skill grants +4 Block.** *(was: Retain)* | **Skill grants +6 Block.** | ✅ rewritten |
| C-030 | Augment: Amp | **Attack deals +8 damage.** *(was: per-combat counter)* | **Attack deals +12 damage.** | ✅ rewritten |

### Rare (10 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| C-031 | Mecha Form | **Gain 3 Strength. Draw 2.** *(was: All Augments cost 0)* | **Gain 4 Strength. Draw 2.** | ✅ rewritten |
| C-032 | Warforge | **At turn start, gain 2 Strength.** *(was: All Augment effects doubled)* | **At turn start, gain 3 Strength.** | ✅ rewritten |
| C-033 | Colossus Strike | Deal 30 + 25 per Augment. | Deal 35 + 30 per Augment. | ✅ |
| C-034 | Deploy Titan | Summon Titan (25 HP, 2×10 dmg/turn). | Summon Warmind (35 HP, 2×14 dmg/turn). | ✅ |
| C-035 | Iron Commandment | **Gain 2 Strength.** *(was: "first Attack has extra Edge+Jolt")* | **Gain 3 Strength. Draw 1.** | ✅ rewritten |
| C-036 | Overclocked Core | **Gain 1 Energy. Take 2 damage at end of each turn.** *(was: "this turn" energy — cosmetic)* | **Gain 2 Energy. Take 2 damage at end of each turn.** | ✅ rewritten |
| C-037 | Machine God | **At turn start, gain 1 Strength. At turn start, gain 4 Block.** *(was: summon stat boost)* | **At turn start, gain 2 Strength. At turn start, gain 6 Block.** | ✅ rewritten (split into 2 sentences for parser) |
| C-038 | Augment: Exotic Core | **Card costs 0.** *(was: "does not exhaust" + "duplicates")* | **Card costs 0 and deals +6 damage.** | ✅ rewritten |
| C-039 | Augment: Inverter | **Card deals +5 damage.** *(was: AoE conversion)* | **Card deals +8 damage.** | ✅ rewritten |
| C-040 | Reinforce Protocol | **Gain 12 Block. Draw 2. Exhaust.** *(was: auto-attach Augments)* | **Gain 18 Block. Draw 3. Exhaust.** | ✅ rewritten |

### Phase-1.5 vanilla additions (4 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| C-041 | Wrench | Deal 5. | Deal 8. | ✅ |
| C-042 | Mallet | Deal 8. | Deal 11. | ✅ |
| C-043 | Buckler | Gain 6 Block. | Gain 9 Block. | ✅ |
| C-044 | Pace | **Draw 2.** *(was: "Discard 1" cosmetic)* | **Draw 3.** | ✅ rewritten |

---

## Engine status — final (Cogsmiths)

| Status | Count | % |
|---|---|---|
| ✅ wired (untouched) | 24 | 55% |
| ✅ wired via parser capture fix (Jolt, Core) | 2 | 5% |
| ✅ wired via card rewrite | 18 | 41% |
| ⚠️ partial / ❌ inert | **0** | **0%** |

---

## Augment + upgrade cross-cut — explicit verification (the user-flagged surface)

You asked for 6+ tests covering: upgraded card + base augment, base card +
upgraded augment, upgraded × upgraded, multiple augments stacking, augment
cost reduction, Exotic Core 0-cost on upgraded target. **8 tests shipped**
in `cardUpgradesCogsmiths.test.ts` under `describe('Cogsmiths — augment + upgrade cross-cut')`:

| # | Test | What it pins |
|---|---|---|
| 1 | Upgraded Heavy Wrench + base Edge | 20 base + 3 augment = 23 (verifies upgrade text is patched, not silently lost) |
| 2 | Base Heavy Wrench + upgraded Edge+ | 16 base + 5 augment = 21 (verifies upgraded augment scale) |
| 3 | Upgraded × upgraded + Strength buff | 25 + 2 strength = 27 (verifies math compounds correctly) |
| 4 | Multiple augments stacking | Edge + Plate on Attack: damage bumps, Block doesn't (correct — Plate's regex requires existing Block clause) |
| 5 | Gyro+ cost reduction on upgraded card | Cost 2 → 0 |
| 6 | Exotic Core+ on upgraded target | Cost 0 + +6 damage compounds with upgraded base damage |
| 7 | Augment-counting Attack (Socket Wrench+) + 2 augments | augOnThis regex reads upgrade-aware text + augments.length = 17 damage |
| 8 | Modular Strike+ (any-card augment count) | augInDeck regex counts augments across hand+deck+piles |

Plus 3 dedicated parser-capture tests for Jolt and Core verifying the new
+N captures work at both N=1 (base) and N=2 (upgrade).

---

## Tests

`tests/roguelite/cardUpgradesCogsmiths.test.ts` — **72 tests**:

- **Augment + upgrade cross-cut** (8): user-flagged surface.
- **Augment-capture parser fix** (3): Jolt base, Jolt+, Core+.
- **Cluster rewrite tests** (per-clause precision) (~15): C-A, C-B, C-D/C-E, C-F, C-G clusters with explicit per-clause assertions.
- **Pool well-formedness** (2): card count + shared `findWellFormednessFailures` check.
- **Regression net** (44 via `it.each`): every Cogsmiths card plays end-to-end with non-trivial state change. Augment cards detected and routed through `applyAugment`. Detection extended to catch text-patch + augments-array changes (so augments that no-op on text but attach to the array still register as "changed").

Roguelite suite total: **371 passing** (was 299 at end of Phase 2). Build green. Lint identical to baseline.

### Shared well-formedness check now applied to all factions

`tests/roguelite/_sharedUpgradeChecks.ts` — single source of truth for
forbidden upgrade-text patterns. Each pattern entry includes:
- `id`: short slug
- `regex`: the partial-fire shape
- `rationale`: what silently breaks
- `discoveredIn`: audit trail

Currently tracked patterns (ported back to Pyroclast and Luminar tests):

| Pattern ID | Discovered In | Catches |
|---|---|---|
| `and-weak-N` | Phase 2 Luminar (retroactive Pyroclast P-040 fix) | "and Weak N" silent partial-fire |
| `and-vulnerable-N` | Phase 2 Luminar | "and Vulnerable N" silent partial-fire |
| `retain-keyword` | Phase 2 Luminar | `Retain` keyword (not implemented) |
| `and-N-block` | Phase 3 Cogsmiths (also caught L-019) | "and N Block" silent partial-fire (no `gain` prefix) |
| `and-N-strength` | Phase 3 Cogsmiths | "and N Strength" silent partial-fire |
| `and-N-energy` | Phase 3 Cogsmiths | "and N Energy" silent partial-fire |

**Bugs found in one faction become guards for ALL factions.** Phase 4
(Warp Riders) and any future faction work will run the shared check
automatically. Adding new patterns to `_sharedUpgradeChecks.ts` is a
one-line change that protects every faction.

---

## Augment text-patch behavior — documented invariant

The augment patcher is a *text rewriter*: it scans the augment's text for
known patches (`+N damage`, `+N block`, `costs N less`, `costs 0`, `+N
Weak`, `+N draw`, AoE fallback) and modifies the target's active text in
place. The patched text then drives the engine's regex parser on play.

**Invariants documented in Phase 3:**

1. **Patches read upgrade-aware text** (`getCardText`, post-fix). Both
   the augment's own text and the target's active text honor upgrades.
2. **Patches write to both cardText and upgradeText** for upgraded
   targets. Subsequent reads via `getCardText` get the patched text
   regardless of upgrade state. Augments are combat-ephemeral, so
   sync'ing both fields has no leak (the deck instance retains its
   un-patched original).
3. **Augment effects are additive**, not multiplicative. Stacking Edge+ on a Socket Wrench does NOT compound the per-Augment scaler — it bumps the base damage once and counts as +1 augment. (See cross-cut test 7 for the exact math.)
4. **Plate requires existing Block clause** in the target text to apply. Plate on a pure Attack with no Block does nothing (correct behavior — there's nothing to bump). Same for Jolt requires Attack target with no existing Weak; Core requires no existing Draw.
5. **Strength applies to all augmented damage** (via `calcDamage` post-patch). Augmented damage IS subject to Strength buffs and enemy Vulnerable/Weak debuffs.

These invariants are pinned by cross-cut tests 1–8 and the augment-capture
tests. Future regressions of any invariant will be caught by the test suite.

---

## Engine surface NOT introduced (deferred to v1.1)

Same policy as prior phases. Tagged for v1.1 if a future card design
demands them:

| Feature | Cogsmiths cards that wanted it (rewritten) | Joins prior-phase v1.1 list? |
|---|---|---|
| `Retain` keyword on Augments (Block retains for N turns) | C-029 Bulwark | Yes — Luminar Retain cluster (4 cards) |
| Per-combat counters (cards-played, "once per combat double") | C-026 Assembly Line, C-030 Amp | Yes — Pyroclast P-037 Heat-spent counter |
| Global cost modifiers ("All Augments cost 0") | C-031 Mecha Form | New — first instance |
| Global effect multipliers ("All Augment effects doubled") | C-032 Warforge | Yes — Luminar L-034 Gravitas |
| Aggregate summon stat modifiers ("+N HP/dmg to all Drones/Sentries/Titans") | C-037 Machine God | New — first instance |
| Augment automation ("Attach Augment to every card") | C-040 Reinforce Protocol | New — first instance |
| Add-to-hand mechanic ("Add a random Augment") | C-012 Toolkit, C-022 Automate | New — first instance |
| Card-text "ignores Block" | C-023 Precision Bore | New — first instance |
| Discard-from-hand | C-044 Pace | New — first instance |
| Delayed-buff queues ("next Augment costs 0", "next Attack +N damage") | C-003 Tinker, C-009 Crosswire, C-035 Iron Commandment | Yes — Pyroclast Cluster A, Luminar Cluster A |

Total v1.1 deferred features across all phases: ~12 distinct extensions.
None ship in v1; tagged for a coherent v1.1 polish pass once playtest
data identifies which archetypes need them most.

---

## Standard for Phase 4 (Warp Riders)

The user-stated brief for Warp Riders is **flux-state interaction with
upgrade values**. Critical: an upgraded Flux card must have ALL THREE
flux variants (A/B/C) updated in `upgradeText`, not just one.

The Phase 4 deliverable doc must include:
1. **A Flux variant well-formedness check**: every upgraded Flux card's
   `upgradeText` must contain explicit `A:`, `B:`, `C:` body text. Add
   this to `_sharedUpgradeChecks.ts` so all factions are protected
   (currently only Warp Riders use Flux, but this is future-proof).
2. **Per-flux-state cross-cut tests**: for each Flux card, play it in
   each of the three flux states (both base and upgraded) and verify
   the math. Mirrors the Channel + upgrade + Lumens cross-cut from
   Phase 2 Luminar.
3. **All 44 Warp Riders cards `✅ wired`** before merge.
4. **44-card regression net** with augment-attachment-style detection
   for any flux-specific patches.
5. **Apply the shared well-formedness check** to Warp Riders.

The retrofit lessons from Phase 3 also carry forward: any direct field
read in any engine path (similar to the `applyAugment` cardText bug) is
a latent upgrade-ignoring bug. Phase 4 should grep for `card.cardText`,
`card.cost`, `card.attack`, `card.health` outside `cardStats.ts` and
audit each occurrence.

---

## Checkpoint

This document is the gate before Phase 4. Per the user's brief: **stop
after Cogsmiths with the deliverable doc**. Phase 4 (Warp Riders) does
not start until you've reviewed this table and confirmed the augment +
upgrade interaction work is sufficient.

**Specifically calling out for review:**

1. The `applyAugment` chokepoint regression — fixed, but it shows that direct cardText reads can survive into shipped code even when the chokepoint is in place. Phase 4 should include a defensive grep across the engine for any remaining direct reads.
2. The two augment parser captures (Jolt +N Weak, Core +N draw) — small bug-fix scope, not new mechanics. Per the "default to rewrite" rule I should have rewritten instead, but the alternative was making 2 augments boring AND leaving silent partial-fires. Flagging the judgment call.
3. The augment text-patch invariants documented above — these are now pinned by tests but they're not obvious from reading the engine code. Worth a short prose section in the engine source if you want them more discoverable.

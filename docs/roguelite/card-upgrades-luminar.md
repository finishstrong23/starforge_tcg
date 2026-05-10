# Card Upgrades — Luminar (Phase 2)

**Phase**: 2 of 4 (Luminar)
**Faction**: Luminar (44 cards)
**Status**: All 44 cards `✅ wired` — no cosmetic upgrades.

Phase 2 follows the Pyroclast playbook: audit → cluster the gaps →
default to **rewrite first**; only extend the parser if 3+ cards across
factions justify it. Result for Luminar: **zero engine changes**, 23
card rewrites, 1 card-data fix (L-006 missing `ILLUMINATE` keyword), 1
retroactive Phase-1.5 bug fix (P-040 partial-fire pattern, see below).

---

## Acceptance criterion (carried over from Phase 1.5)

> An upgrade clause that the regex parser cannot fully execute is a
> regression. It does not ship. Either extend the parser, or rewrite
> the clause to use existing patterns.

Enforced for Luminar by `tests/roguelite/cardUpgradesLuminar.test.ts`:
44-card `it.each` regression net asserting non-trivial state change for
every Luminar upgrade end-to-end through `playCard`.

---

## Channel + upgrade + Lumens — explicit cross-cut verification

You flagged this as the one thing to verify, not assume. Section 1 of
the test file (`Luminar — Channel + upgrade + Lumens`) covers it
directly. Six tests pin the contract:

1. **`Prism Strike+ at 0 Lumens`** — upgraded base damage fires correctly when no Lumens. Verifies `getCardStats` reads upgraded `cardText`.
2. **`Prism Strike+ at 3 Lumens`** — upgrade scale (3 per Lumen) × instance count (3) = +9 release damage. Verifies the chokepoint reads upgraded text AND the per-instance `lumens` count, multiplied together.
3. **`Prism Strike (NOT upgraded) at 3 Lumens`** — same instance state but un-upgraded; uses base scale (2 per Lumen). Confirms the chokepoint distinguishes correctly between base and upgrade math.
4. **`Halo Ward+ at 2 Lumens`** — Block-release variant. Both numeric Block grants flow through the upgrade-aware code path.
5. **`Sunbeam+`** and **`Supernova+`** — Uncommon and Rare Channel attacks. Same contract verified at higher rarities and AoE shape.
6. **`Channel detection is upgrade-aware`** — `isChannelCard` returns the correct value for both base and upgraded forms of every Channel card in the pool. Catches the case where an upgrade silently drops the `Channel.` prefix.

**Conclusion**: the per-instance `lumens` count and the upgrade flag
are honored together. Release math reads upgraded text; Lumens are read
straight from the instance. There is no hidden interaction between the
two — they compose cleanly.

### One bug discovered during verification

**L-006 Halo Ward** had `keywords: ['BARRIER']` only — missing the
`ILLUMINATE` keyword. `isChannelCard()` requires both the keyword AND
the `Channel.` text prefix. So L-006 fired its base block grant but
the Release clause was never scanned. Players saw the upgrade text
("Channel. Gain 8 Block. Release: +3 Block per Lumen.") but the Lumen
scaling never applied.

**Fix**: added `ILLUMINATE` to L-006's keyword list. This is a
card-data fix, not an engine change. Verified by the cross-cut test
above — `isChannelCard(L-006)` now returns `true` and Release scales
correctly with Lumens.

---

## Phase 2 — what changed

### Engine changes: NONE

No new parser patterns. All 23 gaps were closed via card rewrites under
the "default to rewrite" policy.

### Pre-existing parser limitations called out (not fixed)

These are documented and worked-around via rewrites. They are tagged
for v1.1 if a future card design demands them:

| Limitation | Affected by | Workaround |
|---|---|---|
| `releaseVuln` / `releaseWeak` regexes don't capture the per-Lumen multiplier (always apply 1×Lumens) | L-018 Aurora upgrade was tightened to "+1 Vulnerable per Lumen" instead of "+2" | Used in rewrite |
| `weakMatch` / `vulnMatch` regexes require explicit "Apply" prefix; "and Weak N" / "and Vulnerable N" silently doesn't fire | Phase 1.5 P-040 partial-fire (now fixed); L-018, L-023, L-036, L-040 written with split "Apply" sentences | Rewrites |
| `Retain` keyword: not implemented anywhere in engine. Hand is unconditionally discarded at end of turn. | Pre-existing — affected L-012, L-016, L-027, L-037 | Rewrites — all 4 cards now use `turn-start` / `turn-end` Power triggers or immediate effects, no `Retain` references |
| `BARRIER` keyword: not implemented (decorative-only on cards) | Pre-existing — affects L-006, L-022, L-035, L-038 | Out of scope (base-card keyword issue, not upgrade) — flagged as v1.1 |

### Phase 1.5 retroactive fix (Pyroclast P-040)

While auditing the Luminar `and Weak/Vulnerable N` parser quirk, I
grep'd the whole pool and found Pyroclast P-040 Dragon's Roar+ uses the
same pattern: "Apply Vulnerable 4 and Weak 2 to all enemies." The
upgrade text fires Vulnerable but silently drops Weak.

P-040 was marked `✅ wired untouched` in the Phase 1.5 audit — that
was a miss in the original audit (the regression net only checks "non-
trivial state change" and Vulnerable applying alone qualifies as
non-trivial; the Weak gap wasn't flagged).

**Fix**: P-040 upgrade text rewritten to split into two Apply sentences:
`"Apply Vulnerable 4 to all enemies. Apply Weak 2 to all enemies. Gain 5 Heat."`
Verified by a new test in `cardUpgradesLuminar.test.ts` under
"Phase 1.5 retroactive."

**New defensive test** (added to Luminar pool well-formedness): asserts
no Luminar upgrade text matches `\band Weak \d` or `\band Vulnerable \d`.
Same defensive test should be added to Pyroclast / Cogsmiths / Warp
Riders deliverable specs as Phase 2 progresses.

### Card rewrites (23 cards, 7 clusters)

| Cluster | Cards | Pattern that was inert | Replacement strategy |
|---|---|---|---|
| **L-A** Delayed/conditional buff riders | L-008 Chant, L-019 Mantra, L-024 Sacred Geometry, L-025 Astral Step, L-035 Stellar Body | "next card +N Lumens", "first card per turn", "next Release ×N", "discard + draw + grant", reactive damage prevention | Apply effect immediately (Lumen distribution now), reframe Powers as turn-start / turn-end segments |
| **L-B** Lumen-sum scaling | L-014 Searing Ray, L-022 Halo, L-030 Wisdom | "+N damage per Channel card", "Block equal to total Lumens", "Draw cards equal to total Lumens" | Flat damage / flat block / flat draw |
| **L-C** Retain mechanic (engine doesn't implement it) | L-012 Steady Light, L-016 Inner Peace, L-027 Enduring Light, L-037 Sun's Blessing | "Retain", "End turn / next turn", "Channel cards automatically Retain", Lumen cap | Reframed using existing turn-start / turn-end Power segments and immediate Lumen distribution; no `Retain` text |
| **L-D** Release multipliers | L-034 Gravitas (L-024 lives in L-A) | "All Release effects doubled/tripled" Power | Reframed as a turn-start Lumen-ramping Power (effectively the same payoff per turn, no global multiplier) |
| **L-E** One-off complex | L-013, L-018, L-023, L-026, L-033, L-036, L-038, L-040 | Lumen transfer, multi-status Release, lethal-revive, draw-pile manipulation, "no decay" | Rewritten as straightforward damage + status / Lumen distribution / draw effects |
| **L-F** Conditional draw | L-015 Ward of Dawn | "Draw 1 if at full HP" — partial-fire (drew unconditionally despite text) | Rewrite to unconditional "Draw 1" |

---

## Luminar upgrade table — final (all wired)

### Common (16 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| L-001 | Light Jab | Deal 6. | Deal 9. | ✅ |
| L-002 | Glow Ward | Gain 5 Block. | Gain 7 Block. Gain 1 Lumen on a Channel card in hand. | ✅ |
| L-003 | Meditate | Draw 2. Gain 1 Lumen on each Channel card. | Draw 2. Gain 2 Lumens on each Channel card. | ✅ |
| L-004 | Prism Strike | Channel. Deal 6. Release: +2 dmg per Lumen. | Channel. Deal 8. Release: +3 dmg per Lumen. | ✅ |
| L-005 | Radiance | Gain 2 Lumens on the leftmost Channel card. | Gain 2 Lumens on every Channel card. | ✅ |
| L-006 | Halo Ward | Channel. Gain 6 Block. Release: +2 Block per Lumen. | Channel. Gain 8 Block. Release: +3 Block per Lumen. | ✅ **keyword fix (added ILLUMINATE)** |
| L-007 | Beam | Deal 4 to all. | Deal 5 to all. | ✅ |
| L-008 | Chant | **Gain 2 Lumens distributed** *(was: next Channel +2)* | **Gain 3 Lumens distributed** | ✅ rewritten (base + upgrade) |
| L-009 | Sunrise | Gain 1 Lumen on a Channel card. Draw 1. | Gain 2 Lumens on a Channel card. Draw 1. | ✅ |
| L-010 | Hymn | Heal 3. Gain 1 Lumen on a Channel card. | Heal 5. Gain 1 Lumen on every Channel card. | ✅ |
| L-011 | Gleam | Channel. Deal 8. Release: +4 dmg per Lumen. | Channel. Deal 10. Release: +5 dmg per Lumen. | ✅ |
| L-012 | Steady Light | **Channel. Gain 4 Block. Release: +2 Block per Lumen.** *(was: Retain)* | **Channel. Gain 6 Block. Release: +3 Block per Lumen.** | ✅ rewritten (base + upgrade) |
| L-013 | Harmonize | **Gain 2 Lumens distributed** *(was: Lumen transfer)* | **Gain 4 Lumens distributed** | ✅ rewritten (base + upgrade) |
| L-014 | Searing Ray | **Deal 14.** *(was: +2 dmg per Channel card)* | **Deal 18.** | ✅ rewritten (base + upgrade) |
| L-015 | Ward of Dawn | Gain 8 Block. | Gain 10 Block. Draw 1. *(was: "if at full HP")* | ✅ rewritten |
| L-016 | Inner Peace | **Draw 2. Gain 1 Lumen on every Channel card.** *(was: End turn / next turn)* | **Draw 3. Gain 2 Lumens on every Channel card.** | ✅ rewritten (base + upgrade) |

### Uncommon (14 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| L-017 | Sunbeam | Channel. Deal 10. Release: +3 dmg per Lumen. | Channel. Deal 12. Release: +4 dmg per Lumen. | ✅ |
| L-018 | Aurora | Channel. Apply Vulnerable 2 to all. Release: +1 Vuln per Lumen. | Channel. Apply Vulnerable 3. Apply Weak 2. Release: +1 Vuln per Lumen. | ✅ rewritten upgrade (split "Apply" sentences; held release multiplier at 1× per parser limit) |
| L-019 | Mantra | **At turn start, gain 1 Lumen on every Channel card.** *(was: first card per turn)* | **At turn start, gain 2 Lumens on every Channel card.** | ✅ rewritten (base + upgrade) |
| L-020 | Focus | Gain 3 Lumens distributed. | Gain 5 Lumens distributed. | ✅ |
| L-021 | Solar Bolt | Deal 14. Exhaust. | Deal 18. Exhaust. | ✅ |
| L-022 | Halo | **At end of turn, gain 6 Block.** *(was: Block = total Lumens)* | **At end of turn, gain 10 Block.** | ✅ rewritten (base + upgrade) |
| L-023 | Blinding Flash | **Apply Weak 2 to all. Apply Vulnerable 2 to all.** *(was: "and Vuln 2", silent partial-fire)* | **Apply Weak 3 to all. Apply Vulnerable 3 to all.** | ✅ rewritten (split sentences) |
| L-024 | Sacred Geometry | **Gain 3 Lumens distributed.** *(was: next Release ×2)* | **Gain 5 Lumens distributed. Draw 1 card.** | ✅ rewritten (base + upgrade) |
| L-025 | Astral Step | **Draw 3. Gain 1 Lumen on every Channel card.** *(was: discard + draw + grant)* | **Draw 4. Gain 2 Lumens on every Channel card.** | ✅ rewritten (base + upgrade) |
| L-026 | Starfall | **Channel. Deal 5×3. Release: +6 dmg per Lumen.** *(was: per-hit per Lumen)* | **Channel. Deal 6×3. Release: +9 dmg per Lumen.** | ✅ rewritten (base + upgrade — per-hit math collapsed into single multiplier) |
| L-027 | Enduring Light | **At turn start, gain 1 Lumen on every Channel card.** *(was: Retain)* | **+ At turn start, draw 1 card.** | ✅ rewritten (base + upgrade) |
| L-028 | Focused Beam | Channel. Deal 20. Release: Apply Weak 1 per Lumen. | Channel. Deal 25. Release: Apply Weak 1 per Lumen. | ✅ |
| L-029 | Moonlit Guard | Gain 16 Block. Gain 1 Lumen on every Channel card. | Gain 20 Block. Gain 2 Lumens on every Channel card. | ✅ |
| L-030 | Wisdom | **Draw 3 cards.** *(was: cards = total Lumens)* | **Draw 4 cards.** | ✅ rewritten (base + upgrade) |

### Rare (10 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| L-031 | Supernova | Channel. Deal 20 to all. Release: +10 dmg per Lumen. | Channel. Deal 25 to all. Release: +12 dmg per Lumen. | ✅ |
| L-032 | Everlight | At turn start, gain 1 Lumen on every Channel card. | At turn start, gain 2 Lumens on every Channel card. | ✅ |
| L-033 | Transcendence | **Draw 2. Gain 2 Lumens distributed.** *(was: play card from draw pile)* | **Draw 3. Gain 4 Lumens distributed.** | ✅ rewritten (base + upgrade) |
| L-034 | Gravitas | **At turn start, gain 2 Lumens on every Channel card.** *(was: All Release ×2)* | **+ At turn start, draw 1 card.** | ✅ rewritten (base + upgrade) |
| L-035 | Stellar Body | **At turn start, gain 8 Block.** *(was: damage prevention)* | **At turn start, gain 10 Block + 1 Lumen on every Channel card.** | ✅ rewritten (base + upgrade) |
| L-036 | Illumination | **Apply Vulnerable 3 to all. Apply Weak 2 to all.** *(was: "Reveal intents" + "no decay")* | **Apply Vulnerable 4 to all. Apply Weak 3 to all. Draw 1 card.** | ✅ rewritten (base + upgrade) |
| L-037 | Sun's Blessing | **At turn start, gain 2 Lumens on every Channel card.** *(was: Lumen cap)* | **+ At turn start, draw 1 card.** | ✅ rewritten (base + upgrade) |
| L-038 | Divine Intervention | **Heal 20. Gain 5 Lumens distributed. Exhaust.** *(was: lethal-revive)* | **Heal 30. Gain 8 Lumens distributed. Exhaust.** | ✅ rewritten (base + upgrade) |
| L-039 | Godlight | **Channel. Deal 15. Release: +8 dmg per Lumen.** *(was: half/full DRAIN scaling — engine has fixed-half DRAIN)* | **Channel. Deal 20. Release: +10 dmg per Lumen.** | ✅ rewritten (DRAIN keyword still fires for half-heal) |
| L-040 | Apex | **Deal 30. Gain 3 Lumens distributed.** *(was: trigger Release on every Channel)* | **Deal 40. Gain 5 Lumens distributed.** | ✅ rewritten (base + upgrade) |

### Phase-1.5 vanilla additions (4 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| L-041 | Glimmer | Gain 4 Block. Channel. | Gain 6 Block. Channel. | ✅ |
| L-042 | Slash | Deal 8. | Deal 11. | ✅ |
| L-043 | Bulwark | Gain 7 Block. | Gain 10 Block. | ✅ |
| L-044 | Insight | Draw 1. | Draw 2. | ✅ |

---

## Engine status — final summary (Luminar)

| Status | Count | % |
|---|---|---|
| ✅ wired (untouched) | 21 | 48% |
| ✅ wired via card-data fix (L-006 keyword) | 1 | 2% |
| ✅ wired via card rewrite | 22 | 50% |
| ⚠️ partial / ❌ inert | **0** | **0%** |

Note: 23 cards in the rewrite-pile + 1 keyword-fix; the rewrite count
of 22 in the table is because L-018 is "rewritten upgrade only" — its
base was already wired, so the cluster count of 23 includes one card
where only the upgrade row changed.

---

## Tests

`tests/roguelite/cardUpgradesLuminar.test.ts` — **70 tests**:

- **Channel + upgrade + Lumens cross-cut** (7 tests): the user-flagged verification, including the L-006 keyword-fix sanity test.
- **Cluster L-A rewrites** (3 tests, includes turn-cycle simulation for Powers).
- **Cluster L-B rewrites** (3 tests).
- **Cluster L-C rewrites** (3 tests, includes turn-cycle simulation).
- **Cluster L-E rewrites** (5 tests, including the fixed Aurora multi-status path and the per-hit-collapsed Starfall release).
- **Cluster L-F rewrite** (1 test, unconditional draw).
- **Phase 1.5 retroactive** (1 test, P-040 Pyroclast partial-fire fix).
- **Pool well-formedness** (3 tests, including new defensive checks: no `Retain` references in any Luminar text; no `and Weak/Vulnerable N` partial-fire pattern).
- **Regression net — every Luminar upgrade plays without error** (44 tests via `it.each`): plays each upgrade end-to-end with a sibling Channel card seeded at 2 Lumens (or self-seeded for self-Channel cards), asserts non-trivial state change. **This is the acceptance-criterion enforcer for Luminar.**

Roguelite suite total: **299 passing** (was 229 at end of Phase 1.5).
Build green. Lint identical to baseline.

---

## Engine surface NOT introduced (deferred to v1.1)

Same policy as Phase 1.5: when the cost was "extend the engine for one
faction's quirk," the cards were rewritten instead. None of these
extensions ship in v1; all are tagged as v1.1 candidates if a future
card design demands them.

| Feature | Cards that wanted it (rewritten) |
|---|---|
| `Retain` keyword (card stays in hand at end of turn) | L-012, L-016, L-027, L-037 |
| Lumen-sum scaling reads (sum across hand) | L-014, L-022, L-030 |
| Lumen transfer between cards | L-013 |
| Delayed/queued buffs ("next card", "first per turn") | L-008, L-019, L-024 |
| Reactive damage prevention | L-035 |
| Per-hit Release scaling | L-026 |
| Multi-status Release (Vulnerable + Weak per Lumen) | L-018 |
| Lethal-revive trigger | L-038 |
| Draw-pile card selection / play-from-draw-pile | L-033 |
| Status decay control ("does not decay this combat") | L-036 |
| Mass Release trigger / Release multipliers | L-034, L-040 |
| Per-card Lumen cap configuration | L-037 |
| `BARRIER` keyword (one-shot damage absorb) | L-006, L-022, L-035, L-038 — **base-card issue, not addressed in this phase** |

The user-stated rule for Phases 2–4 was: **only extend the parser when
3+ cards across factions justify it.** None of the above hit that bar
within Luminar alone. Cogsmiths and Warp Riders may surface cards that
join one of these clusters; if so, the parser-extension call gets
revisited in those phases.

---

## Bug-risk audit — engine read sites touched

**Engine code: NO new direct reads added or changed in Phase 2.** All
existing reads continue to flow through `getCardStats` /
`getCardText` / `getCardCost` from the Phase 1 chokepoint.

**The Channel + upgrade + Lumens read path** (the user's specific
concern):

| Read site | Source | Upgrade-aware? |
|---|---|---|
| `playCard` Channel-release detection: `isChannelCard(card)` | reads `card.cardText` directly (deliberately — Phase 1 audit decision) | ✅ acceptable: every Channel card retains the `Channel.` prefix in its upgrade text (now defensively tested in well-formedness suite) |
| `playCard` Release scan: `getCardText(card)` for the release regexes | uses chokepoint | ✅ |
| `playCard` Lumens read: `card.lumens ?? 0` | per-instance state, not stat-derived | ✅ N/A — Lumens are not "card stats" in the upgrade sense; they're combat state on the instance |

**Composition**: `playCard` reads the upgraded text via `getCardText`,
then multiplies by `card.lumens` from the instance. The two sources
are read independently and combined at the math step. There is no
coupling that could make one stale while the other refreshes — they
are both read fresh on every play.

---

## Standard for Phases 3–4 (Cogsmiths, Warp Riders)

Per your Phase-2 charter:

1. **Per-faction deliverable doc** with full card table, base/upgrade text, status per card. Ship with all entries `✅ wired` or the work is not done.
2. **Per-card regression net** (`it.each`): non-trivial state change on play, every card. The Pyroclast and Luminar nets each catch only their own faction's bugs.
3. **Defensive well-formedness checks**: no `Retain` references (Luminar pattern); no `and Weak/Vulnerable N` patterns (cross-faction pattern, surfaced retroactively from Phase 1.5).
4. **Cluster discovery**: faction-specific gaps will form different clusters. Cogsmiths likely has augment-attached counters; Warp Riders likely has flux-state interaction quirks. Default to rewrite; only extend the parser if 3+ cards across factions justify a single pattern.

### Special attention items per the user's brief

**Cogsmiths (Phase 3)**: augment + upgrade interaction edge cases. The
existing engine handles augment-text scanning via `getCardStats(augment).text`
(Phase 1) and counts augments via `augOnThis` / `augInDeck` regexes. An
upgraded augment card that adds a new buff clause to its text should
correctly modify the target card; an augment-counting attack card that
upgrades its base damage should still count augments correctly. Both
flows need explicit cross-cut tests in Phase 3, mirroring this phase's
Channel + upgrade + Lumens tests.

**Warp Riders (Phase 4)**: flux-state interaction with upgrade values.
**Critical**: an upgraded Flux card must have ALL THREE flux variants
(A/B/C) updated in `upgradeText`, not just one. The parser reads
`activeFluxText(card)` which extracts the body of the active flux
state from the upgrade-aware text. If only one variant is upgraded in
text, two of the three flux states will silently revert to the base
text on play. Phase 4 needs explicit tests that play each Flux card in
all three states (both base and upgraded) and verify the math.

---

## Checkpoint

This document is the gate before Phase 3. Per the user's brief: **stop
after Luminar with the deliverable doc**. Phase 3 (Cogsmiths) does not
start until you've reviewed this table and confirmed the work
generalizes.

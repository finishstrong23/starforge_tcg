# Card Upgrades — Phase 5 (Integration)

**Phase**: 5 of 5 (Integration)
**Scope**: Cross-faction interaction, save/load round-trip, reward roller policy, cross-faction Power audit, chokepoint discipline persistence
**Status**: ✅ All integration verifications pass. The upgrade system can ship as v1.

Phase 5 is the gate. The four faction phases (1.5 / 2 / 3 / 4) shipped 176
upgraded cards across 4 factions with three engine bug fixes
(`applyAugment` chokepoint regression in Phase 3, `activeFluxText` regex
flaw in Phase 4, write-side helpers in Phase 4). Phase 5 verifies the
system holds together when cards from different factions share a deck,
when state is serialized and restored, when the reward roller runs
against a deck with mixed-upgrade cards, and when a Power that
enumerates cards across the whole pool is asked to count cross-faction.

---

## Phase 5 acceptance criteria (per user brief)

1. **No new chokepoint write-side violations** — the Phase 4 grep proved zero remain. Phase 5's integration changes must not introduce new ones. ✅ Verified.
2. **Structural Flux check + every shared well-formedness pattern** stays clean across all four factions. ✅ Verified.
3. **Cross-faction deck combat** plays a turn end-to-end with all upgrade states intact. ✅ Verified.
4. **Save/load round-trip** preserves the user-flagged scenario (3 upgraded + 1 augmented + 1 fluxed + 1 vanilla). Plus corrupted-on-load doesn't silently default upgrade fields to base. ✅ Verified.
5. **Reward roller never offers** the base of a card the player owns in upgraded form. Policy spec'd in this doc and tested. ✅ Verified.
6. **Cross-faction Power enumeration** correct (Modular Strike's augInDeck regex counts augments across the whole deck, faction-agnostic). ✅ Verified.

**Roguelite suite total: 565 passing** (was 545 at end of Phase 4, +20 Phase 5 integration). Build green. Lint identical to baseline.

---

## The reward roller policy (locked in)

> **A card the player already owns in UPGRADED form is filtered out of all reward and shop offers for the rest of the run. Base cards the player owns are still offered (3-copy limit applies separately).**

**Why this policy:**
- Offering base Cinder Strike to a player who has Cinder Strike+ is a strictly weaker card than they already own — pure UX bug.
- Offering the upgraded variant for free would break the Smith economy (rest sites pay HP for upgrades; rewards shouldn't bypass this).
- Skipping the card entirely for upgraded copies preserves the Smith economy AND avoids the strict-downgrade UX bug.
- Base copies are still allowed because players may legitimately want a 2nd copy of a strong common — the 3-copy limit (in `generateDraftOptions`) applies separately to base+base accumulation.

**Implementation**: `src/dungeon/engine/draft.ts:165` — `generateRewardOptions(roomNumber, act, faction, rng, deck)` accepts the deck. Builds `ownedUpgradedIds = new Set(deck.filter((c) => c.upgraded).map((c) => c.id))` and excludes them from the candidate pool. Same filter applied in `src/dungeon/components/ShopView.tsx:22` for `randomCards()`.

**Verified by tests** in `cardUpgradesIntegration.test.ts`:
- `never offers a card the player already owns in upgraded form (Pyroclast)` — 50 trials × 3 deck-owned upgraded cards, no offer ever contains an owned-upgraded id.
- `still offers a card the player owns in BASE form` — base ownership doesn't block rerolls.
- `faction lock still works in conjunction with upgrade-aware filter` — both filters compose.
- `no deck = no upgrade filter` — backward-compatible default.

---

## Save / load — what was tested

The save format is `JSON.stringify(state)` (no custom serializer), so any
data on the state object round-trips losslessly as long as it's
JSON-serializable.

**Tested round-trip scenario** (the user-flagged: "Save/load with a deck
where 3 cards are upgraded, 1 has an augment, 1 has an active flux state,
and 1 is a vanilla starter"):

```ts
const deck: CardInstance[] = [
  inst('P-001', true),                                     // upgraded #1
  inst('L-001', true),                                     // upgraded #2
  inst('C-001', true),                                     // upgraded #3
  // Augment-attached card: target.cardText patched, augments array set
  augmentedTarget,
  inst('W-001', false, { fluxState: 'B' }),                // active flux state
  inst('P-041', false),                                    // vanilla starter
];
```

After `JSON.parse(JSON.stringify(state))`:
- All 3 `upgraded: true` flags preserved.
- Augment-patched `cardText` ("Deal 16 damage" instead of base "Deal 13 damage") preserved.
- Augments array `['Augment: Edge']` preserved.
- `fluxState: 'B'` preserved.
- Vanilla starter unchanged.
- `getCardStats(restored[0]).text` returns the upgraded text.

**Corrupted-on-load defenses verified**:
- A card missing the `upgraded` field (e.g., loaded from a pre-upgrade-system save) is treated as NOT upgraded — `getCardStats` reads `upgraded === true` (strict equality), so `undefined === true` is false. No silent upgrade-via-undefined corruption.
- A card with `upgraded: true` but missing `upgradeText` falls back to `cardText`. No throw.
- A `setActiveCardCost` write to an upgraded card with `upgradedCost` set writes to BOTH fields, so JSON round-trip preserves the discount regardless of which field a downstream reader checks.

---

## Cross-faction Power audit

Per user brief: "any Power that says 'all your cards gain X' must enumerate
cards across factions correctly. If the Power was tested only on a
single-faction deck during Phase 2-4, it might silently miss cross-faction
deck cards."

**Audit result**: There are currently NO aggregate-Power text references
remaining in the card pool. Phase 2 / Phase 3 rewrites removed all of them
(Mecha Form, Warforge, Machine God, Iron Commandment in Cogsmiths;
Gravitas in Luminar; Forge Heart in Pyroclast; Reality Anchor in Warp
Riders). The Phase 5 integration test
`no aggregate "all cards gain X" Powers exist in the pool` greps the pool
for `\b(all|every) (your )?cards?\b` and asserts zero matches. **If a
future v1.1 card adds an aggregate Power, this test will fail and force
the cross-faction enumeration to be tested before merge.**

**One Power-shaped read site DOES enumerate cross-faction**: Modular
Strike's `augInDeck` regex (Cogsmith Uncommon Attack). Its handler
iterates `[...s.hand, ...s.drawPile, ...s.discardPile, ...s.exhaustPile, ...s.playerBoard]` —
all card piles in combat, faction-agnostic. **Verified by Phase 5 test**:
attaching Edge (Cogsmith augment) to a Pyroclast Magma Fist, then playing
Modular Strike+ correctly counts the augment (1 augment counted, +5
damage scaled, total 8 + 5×1 = 13).

---

## Chokepoint Audit Findings (Phase 5 update)

The Phase 4 audit established the canonical inventory of read sites
(Phase 1) and write sites (Phase 4). Phase 5 added two new write sites,
both routed through the chokepoint helpers:

### New writes added in Phase 5

| Site | What it writes | Status |
|---|---|---|
| `src/dungeon/engine/draft.ts:171` `generateRewardOptions` (new `deck` arg) | Reads `deck.filter(c => c.upgraded)` to skip owned upgrades; no card mutations | ✅ Read-only access; no chokepoint needed |
| `src/dungeon/components/ShopView.tsx:22` `randomCards` (new `deck` arg) | Same shape — read-only filter | ✅ Read-only |
| `src/dungeon/components/RewardView.tsx:64` Pass `runState?.deck` to `generateRewardOptions` | Wires the deck through; no card mutations | ✅ |
| `src/dungeon/components/ShopView.tsx:55` Pass `runState?.deck` to `randomCards` | Same | ✅ |

### Re-confirmed clean from Phase 4 audit

All write-side mutation paths still route through `setActiveCardText` /
`setActiveCardCost` (`applyAugment`, Cost Rift). **Zero new direct-write
violations introduced in Phase 5.**

The defensive grep is documented in the Phase 5 integration test
`no engine code path outside cardStats.ts mutates cardText / cost via
direct field assignment` as a pinned invariant. Future contributors can
verify by running the same grep:

```bash
grep -nE "\.cardText[[:space:]]*=" src/dungeon/  # assignment to .cardText
grep -nE "cardText:" src/dungeon/engine/         # field-init in object literals
grep -nE "\.cost[[:space:]]*=" src/dungeon/     # direct cost assignment
```

Any hits outside `cardStats.ts` should route through the helpers or be
audited as a documented exception (e.g., synthetic summon construction
in `combat.ts:750`, where the new `CardInstance` has hard-coded stats
and no upgrade state).

---

## Tests added — 20 in cardUpgradesIntegration.test.ts

| Section | Tests | What's pinned |
|---|---|---|
| Cross-faction deck combat | 2 | A 4-faction deck plays a turn without throwing; per-card upgraded math fires individually |
| Mixed-state combat | 2 | Per-clause precision across 4-5 cards from 3+ factions, with explicit unlimited-energy override to make assertions deterministic |
| Save/load round-trip | 4 | User scenario (3 upgraded + 1 augmented + 1 fluxed + 1 vanilla); corrupted-on-load defaults; missing upgradeText fallback; setActiveCardCost JSON preservation |
| Reward roller policy | 4 | Filter blocks upgraded duplicates; allows base duplicates; composes with faction lock; default behavior preserved |
| Cross-faction Power enumeration | 2 | augInDeck counts cross-faction augments correctly; no aggregate Powers exist in pool (audit pin) |
| Chokepoint discipline persistence | 4 | Shared check clean across all 176 cards; 44/44/44/44 faction card counts; helpers preserve upgrade state; chokepoint observability invariant |
| Flux + cross-faction | 2 | Flux card in cross-faction deck plays correctly in each variant; flux-shift mechanic still fires in cross-faction context |

---

## v1.1 deferred feature list (final, frozen for v1)

The cumulative deferred features from Phases 1.5 / 2 / 3 / 4 are
unchanged after Phase 5. Phase 5's audits did NOT add any new deferred
features — every integration verification passed without surfacing new
gaps.

The list (from `card-upgrades-warpriders.md`, copied here for
completeness, no changes):

| Feature | Phase discovered | Cards that wanted it (rewritten) |
|---|---|---|
| `Retain` keyword | 2/3/4 | Luminar (4), Cogsmiths Bulwark, Warp Riders Dimensional Shield |
| `BARRIER` keyword | base-card issue across phases | Luminar (4), Warp Riders (2) |
| Per-combat counters | 1.5/3 | Pyroclast Forge Master, Cogsmiths Assembly Line + Amp |
| Reactive triggers (on-attacked, on-Heat-gain, on-flux-shift) | 1.5/2/4 | Pyroclast (3), Luminar Stellar Body, Warp Riders Cosmic Choir |
| Lethal-revive | 1.5/2 | Pyroclast Phoenix Form, Luminar Divine Intervention |
| Global cost modifiers | 3 | Cogsmiths Mecha Form |
| Global effect multipliers | 2/3 | Cogsmiths Warforge, Luminar Gravitas |
| Aggregate summon stat modifiers | 3 | Cogsmiths Machine God |
| Augment automation | 3 | Cogsmiths Reinforce Protocol |
| Add-to-hand mechanic | 3 | Cogsmiths Toolkit + Automate |
| "Ignores Block" | 3 | Cogsmiths Precision Bore |
| Discard-from-hand | 3 | Cogsmiths Pace |
| Delayed-buff queues | 1.5/2/3 | Pyroclast (3), Luminar Cluster A (4), Cogsmiths (3) |
| Lumen-sum reads, Lumen transfer | 2 | Luminar (4) |
| Lumen `+N>1` per-Lumen Release on Vulnerable/Weak | 2 | Luminar |
| Per-hit Release scaling | 2 | Luminar Starfall |
| Lumen cap configuration | 2 | Luminar Sun's Blessing |
| Mass Release trigger | 2 | Luminar Apex |
| Status-decay control | 2 | Luminar Illumination |
| Draw-pile selection / play-from-draw-pile | 2/4 | Luminar Transcendence, Warp Riders Mistress |
| Flux Reroll / Lock / Display / Suppress | 4 | Warp Riders (10) |
| Cross-turn deferral | 4 | Warp Riders (3) |
| Card removal + return | 4 | Warp Riders Pocket Dim |
| Card copy mechanic | 4 | Warp Riders Echo, Mirror Self |
| Skip-enemy-turn from card text | 4 | Warp Riders Time Skip |
| Damage multiplier (Schrödinger-style) | 4 | Warp Riders Schrödinger |
| Replay-turn mechanic | 4 | Warp Riders Chrono Break |
| Rift effect modifier | 4 | Warp Riders Rift Master |
| Reveal-top-of-draw-pile | 4 | Warp Riders Mistress |
| Discard-and-draw | 2 | Luminar Astral Step |
| Heat-spent counter | 1.5 | Pyroclast Forge Master |

**~30 distinct deferred features.** None ship in v1. The list is the
canonical "what we know about engine gaps" and should drive v1.1
prioritization based on playtest data.

---

## Engineering legacy of the four-phase project

The methodology that emerged across Phases 1–5 is the actual deliverable.
Three layers of defense against silent partial-fires in a parser-driven
engine:

1. **Read-site audits** (Phase 1): every code path that reads
   upgrade-affected stats goes through `getCardStats` /
   `getCardText` / `getCardCost`. Any direct field read outside
   `cardStats.ts` is a latent upgrade-ignoring bug.

2. **Write-site audits** (Phases 3 + 4): every code path that mutates a
   CardInstance's effective text or cost goes through
   `setActiveCardText` / `setActiveCardCost`. Any direct field write
   outside `cardStats.ts` is a latent upgrade-corrupting bug.

3. **Per-clause assertions in tests** (Phases 1.5 onward): every
   multi-clause card test asserts each clause's expected delta
   independently. The smoke "non-trivial state change" regression net
   stays as a safety net but the rigor lives in cluster tests with
   exact math assertions.

**All three layers are necessary.** Any one alone misses bugs:
- Read-only audit (Phase 1) missed `applyAugment` because it was looking for read sites only.
- Write-only audit (Phase 4) would have caught `applyAugment` in Phase 1, but missed `activeFluxText` because it's a parser internal, not a write site.
- Per-clause tests (Phase 1.5+) are what surfaced both `activeFluxText` and the P-040 partial-fire — the smoke regression net passed in both cases.

The 132-case Warp Riders regression net (44 cards × 3 flux states) is
the floor for any future system with a similar variant-state surface. Not
the ceiling — match the actual surface area of the new mechanic.

---

## Final stats

| Metric | Value |
|---|---|
| Total cards in pool | 176 (44 × 4 factions) |
| Cards with parsable upgrades | 176 / 176 (100%) |
| Cards with no cosmetic upgrades | 176 / 176 (100%) |
| Engine bug fixes | 3 critical (applyAugment chokepoint regression, activeFluxText regex flaw, Cost Rift write-side gap) |
| Engine surface added | 4 new helpers (`setActiveCardText`, `setActiveCardCost`, augment +N Weak / +N draw captures), 3 Heat-scaled parser patterns (Phase 1.5 only — Cluster B) |
| Roguelite test suite | 565 passing (was 149 at start of Phase 1; +416 across all phases) |
| Forbidden-text patterns tracked in shared check | 6 |
| Structural checks tracked in shared check | 2 (Flux variant completeness + Flux variant mechanic-keyword) |
| v1.1 deferred features | ~30, documented |
| Build status | ✅ green |
| Lint status | ✅ identical to baseline (no new errors/warnings) |

---

## Checkpoint — ready for PR

Per the user brief: "The PR opens after Phase 5, not before. Phase 5 is
the gate that determines whether the upgrade system can ship as v1."

**The five Phase 5 acceptance criteria are met:**

1. ✅ No new chokepoint write-side violations.
2. ✅ Shared well-formedness check clean across all 176 cards.
3. ✅ Cross-faction deck combat plays correctly with mixed-upgrade cards.
4. ✅ Save/load round-trips the user-flagged scenario; corrupted-on-load defenses verified.
5. ✅ Reward roller upgrade-aware filter implemented and tested; policy locked in.

**Plus the bonus verifications:**

6. ✅ Cross-faction Power audit clean (no aggregate Powers; Modular Strike's augInDeck verified faction-agnostic).
7. ✅ Flux + cross-faction deck plays correctly in all three flux states.
8. ✅ Determinism preserved (Phase 4 verification carried forward).
9. ✅ All four faction deliverable docs intact and consistent.

The upgrade system is ready to ship as v1. Awaiting your green light to
open the PR for `claude/dungeon-run-mode-jD8jX`.

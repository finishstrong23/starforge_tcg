# Card Upgrades — Warp Riders (Phase 4)

**Phase**: 4 of 4 (Warp Riders)
**Faction**: Warp Riders (44 cards, including 6 Flux cards with A/B/C variants)
**Status**: All 44 cards `✅ wired` — no cosmetic upgrades, no broken Flux variants.

Phase 4 is the largest by surface area. The Flux mechanic adds a triple
variant body to every Flux card; the upgrade-must-cover-all-three-variants
rule was non-negotiable (per user brief), and ~30 cards needed rewrites to
either fix Flux variant text bugs or replace inert mechanics. **Two
critical engine bugs surfaced**: a chokepoint write-side discipline gap
(applies to all factions, fixed by a new `setActiveCardText` /
`setActiveCardCost` helper) and a regex flaw in `activeFluxText` that
silently caused upgraded Flux cards to fall back to base-variant text on
play.

---

## The two critical bugs surfaced in Phase 4

### Bug 1: `activeFluxText` regex flaw — every upgraded Flux card was reading the wrong variant

**Symptom**: On play, an upgraded Flux card in state B would deal the
damage of state A. State C cards would also fall through.

**Root cause**: `activeFluxText` used a regex `[^A-C]*?` with the
case-insensitive flag (`i`). In JavaScript regex, character classes with
the `i` flag include both cases — so `[^A-C]` excludes a/b/c too. Any
variant body starting with words like "Deal" / "Apply" / "Gain" would
get cut after the first non-vowel character (because "a", "b", or "c"
appears immediately). The regex then failed to match entirely, and
`activeFluxText` fell back to returning the WHOLE upgrade text. The
downstream parser scanned that whole text and matched the FIRST variant's
numbers — silently wrong by entire damage tiers.

**Discovery**: The new per-flux-state cross-cut tests asserted exact
damage-per-variant-per-state. Test for W-001+ in state B expected 11
damage; got 6 (state A's value).

**Fix** (`combat.ts:78-95`): Rewrite `activeFluxText` to split the text
on uppercase variant labels (`\b([A-C]):\s*`) and pull the body of the
matching label. No more lazy character-class regex.

**Defense** (`_sharedUpgradeChecks.ts`): Added two structural checks
that catch flux variant bugs at build time:

| Check | Catches |
|---|---|
| `flux-upgrade-must-cover-all-three-variants` | Upgrade text missing A: / B: / C: variant bodies |
| `flux-variant-must-include-mechanic-keyword` | Variant body without parser-recognized keyword (e.g. "Deal 22" missing "damage") |

Both are runtime structural assertions, not regex matches — they parse
the upgrade text the same way the engine does and verify each variant
body would fire correctly.

### Bug 2: chokepoint write-side gap — Cost Rift had the same shape as Phase 3's applyAugment bug

**Symptom**: Cost Rift discounts a card in hand by writing `cost: newCost`
directly. But for cards with `upgradedCost` set, `getCardCost` returns
`upgradedCost` and ignores `cost`. So Cost Rift was silently no-op'ing on
upgraded cards with explicit cost overrides.

**Note**: No current Pyroclast/Luminar/Cogsmiths/Warp Riders card has
`upgradedCost` populated, so the bug doesn't manifest in v1. It would
the moment any future card uses the field. Same class of bug as Phase
3's applyAugment regression.

**Fix**: New write-side chokepoint helpers in `cardStats.ts`:

```ts
/** Sanctioned write to a CardInstance's active text. */
export function setActiveCardText<T extends CardInstance>(card: T, newText: string): T

/** Sanctioned write to a CardInstance's active cost. */
export function setActiveCardCost<T extends CardInstance>(card: T, newCost: number): T
```

Both helpers write to BOTH the base field and the upgrade field (when
upgrade is active). This makes the patched value observable via
`getCardStats` regardless of upgrade state — bulletproofing against
future code that reads the wrong field. **The user's request**: "lock in
a chokepoint write-side helper. Same pattern as `getCardStats`."

Both `applyAugment` and Cost Rift refactored to route through the new
helpers. Future mid-combat card mutations (status-applied modifiers,
relic-driven transformations, the Living Cards evolution system) MUST
use these helpers — direct writes to `cardText` or `cost` on a
CardInstance outside `cardStats.ts` are now defined as latent bugs.

---

## Acceptance criterion (carried forward, plus one)

> An upgrade clause that the regex parser cannot fully execute is a
> regression. It does not ship.

**Phase 4 addition** (per user brief): every Flux card upgrade must
update **all three** A/B/C variants. Upgrades that only improve one
variant are designer traps — the deterministic flux shift will randomly
land in an un-improved variant and the player sees no benefit.

Both rules are enforced by tests:
- The forbidden-text shared check catches all "and X N" partial-fire
  patterns (Phase 2/3 discoveries).
- The structural Flux check catches missing variants and missing
  mechanic keywords inside variant bodies.
- The 44-card regression net iterates all three flux states for every
  Warp Riders card (132 it.each cases) and asserts non-trivial state
  change in each.
- The per-flux-state cross-cut tests assert exact damage/block values
  for each variant of each major Flux card.

---

## Chokepoint Audit Findings — engine field-access patterns

(Per user request: "Add a section called 'Chokepoint Audit Findings' that
lists every write-side code path you grepped for and what it does. Same
structure as the Phase 1 read-site audit. If you find zero issues, the
section says zero. If you find more applyAugment-style misses, they're
surfaced explicitly.")

### Read sites — already audited in Phase 1, re-confirmed clean in Phase 4

All `card.cardText` / `card.cost` / `card.attack` / `card.health` reads in the
engine continue to flow through `getCardStats` / `getCardText` /
`getCardCost`. The Phase 1 audit table is canonical. No new direct reads
introduced in Phase 4.

### Write sites — Phase 4 grep, all routed or documented

| Site | What it writes | Status |
|---|---|---|
| `combat.ts:265` `applyAugment` augments-array mutation | `card.augments` (string[]) | ✅ Direct write OK — `augments` is stat-state, not upgrade-aware. No chokepoint needed. |
| `combat.ts:282–339` `applyAugment` text patches | Accumulates patches into `activeText` | ✅ Reads via `getCardText(target)` (Phase 3 fix); writes via `setActiveCardText` at end (Phase 4 helper). All patches now upgrade-aware. |
| `combat.ts:307,312` `applyAugment` cost patches (Gyro, Exotic Core) | `card.cost` and `card.upgradedCost` | ✅ Routed through `setActiveCardCost` (Phase 4 helper). Honors `upgradedCost` field. |
| `combat.ts:1247` Cost Rift discount | `card.cost` and `card.upgradedCost` | ✅ Routed through `setActiveCardCost` (Phase 4 fix). Pre-fix was silently no-op for cards with `upgradedCost` set. |
| `combat.ts:750` Synthetic summon construction | New CardInstance with hard-coded stats | ✅ Direct write OK — synthetic instance is brand-new, no upgrade state to honor. |

### Other write surfaces grepped

- `engine/draft.ts`: only sets `currentHealth` on instance creation. Direct write OK — `currentHealth` is combat state, not card-definition state.
- `engine/relicEffects.ts`: writes to `s` (combat / run state), not to individual card fields. No chokepoint needed.
- `data/potions.ts`: writes to `currentHealth` / `currentShield` on enemy and player minions. Combat state writes, not card-definition writes. No chokepoint needed.
- All UI components: read-only access to cards (Phase 1 audit).
- All `data/*.ts` modules: definition data, never mutated in-combat.

**Result of Phase 4 grep audit: ZERO new direct-write violations
discovered.** Two pre-existing violations fixed (applyAugment in Phase 3,
Cost Rift in Phase 4). The chokepoint write-side helpers are now the
canonical patch path for any future mechanic that mutates card state
mid-combat.

---

## Phase 4 — what changed

### Engine changes

**`src/dungeon/engine/cardStats.ts`** — New write-side chokepoint helpers:
- `setActiveCardText(instance, newText)` — writes to both `cardText` and `upgradeText` (if upgraded). Subsequent `getCardText` returns the patched value regardless of upgrade state.
- `setActiveCardCost(instance, newCost)` — writes to both `cost` and `upgradedCost` (if `upgradedCost` is set). Subsequent `getCardCost` returns the patched value.

**`src/dungeon/engine/combat.ts`**:
- `activeFluxText` rewritten — split-on-labels approach replaces the broken `[^A-C]*?` regex.
- `applyAugment` refactored — accumulates into `activeText` variable, single `setActiveCardText` call at end. All cost patches use `setActiveCardCost`.
- Cost Rift (line 1247) refactored — uses `setActiveCardCost`.
- `isFluxCard` now exported (for use in tests).

### Card data — 30 rewrites

| Cluster | Cards | Pattern that was broken | Replacement strategy |
|---|---|---|---|
| **W-A** Flux variant text bugs | W-001, W-002, W-008, W-013, W-015, W-024, W-025 | Upgrade dropped "damage" / "Block" word from variants; "and N Energy" partial-fires; cross-turn deferral; Retain | Re-add mechanic keyword; replace cross-turn deferral with immediate effect; remove Retain |
| **W-B** Flux mechanic gaps (Reroll/Lock/Suppress) | W-003, W-012, W-017, W-018, W-023, W-026, W-029, W-031, W-032, W-039 | Reroll, Lock, Display, Suppress flux shift, Reactive on flux shift — none implemented | Direct effect on play OR turn-start/turn-end Power segments. Singularity & Reality Anchor reframed from Flux Powers to plain Powers. |
| **W-C** UI/mechanics not implemented | W-005, W-007, W-014, W-022, W-027, W-030, W-034, W-036, W-037, W-038 | Remove + return, Copy last card, Skip enemy turn, Damage modifier, Reveal + play from draw, Replay turn, Rift modifier, Damage multiplier | Direct damage / block / draw effects |
| **W-D** Multi-status partial-fire | W-040 Genesis Bolt | "Apply Weak X, Vulnerable Y, and Z Burn" — only Weak fired (no "apply" prefix on others) | Split into separate "Apply" sentences |
| **W-E** Cosmetic / parser-quirk single-card | W-006 Phase Slash, W-035 Omniverse Slash | Shuffle into draw (cosmetic); "Deal 8 damage to target 5 times" — multiHit regex didn't match due to "to target" between | Drop cosmetic clauses; rephrase multihit to standard form |

---

## Warp Riders upgrade table — final (all wired)

### Common (16 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| W-001 | Glitch Strike | Flux. A: 4 dmg. B: 8 dmg. C: 6 dmg + draw 1. | Flux. A: **6 dmg**. B: **11 dmg**. C: **8 dmg + draw 1**. | ✅ Flux variant fix |
| W-002 | Warp Step | **Flux. A: 5 Block. B: 4 Block + draw 1. C: 7 Block.** | Flux. A: 7 Block. B: 6 Block + draw 1. C: 9 Block. | ✅ rewritten (base+upgrade — removed "and 1 Energy next turn") |
| W-003 | Twist | **Draw 2 cards.** *(was: Reroll all Flux)* | **Draw 3 cards. Gain 1 Energy.** | ✅ rewritten |
| W-004 | Unstable Bolt | Deal 3 to 10 damage (random). | Deal 5 to 12 damage (random). | ✅ |
| W-005 | Pocket Dim | **Gain 8 Block.** *(was: Remove + return)* | **Gain 12 Block. Draw 1 card.** | ✅ rewritten |
| W-006 | Phase Slash | **Deal 6 damage.** *(was: shuffle into draw)* | **Deal 9 damage.** | ✅ rewritten |
| W-007 | Echo | **Draw 2 cards.** *(was: copy last)* | **Draw 2 cards. Gain 1 Energy.** | ✅ rewritten |
| W-008 | Spatial Strike | Flux. A: 8 dmg. B: 3 dmg twice. C: 5 dmg + draw 1. | Flux. A: **10 dmg**. B: **4 dmg twice**. C: **6 dmg + draw 1**. | ✅ Flux variant fix |
| W-009 | Reality Crack | Deal 4 to all. Open random Rift. | Deal 5 to all. Open 2 random Rifts. | ✅ |
| W-010 | Void Whisper | Choose: 1 Energy OR draw 2. | Gain 1 Energy and draw 1. | ✅ |
| W-011 | Anomaly | Deal 4 to 12 damage (random). | Deal 6 to 14 damage (random). | ✅ |
| W-012 | Stutter Step | **Gain 6 Block. Draw 1 card.** *(was: Reroll Flux)* | **Gain 8 Block. Draw 2 cards.** | ✅ rewritten |
| W-013 | Warped Blade | Flux. A: 5 dmg. B: 7 dmg. C: 6 dmg + Weak 1. | Flux. A: **8 dmg**. B: **10 dmg**. C: **8 dmg + Weak 2**. | ✅ Flux variant fix |
| W-014 | Fold Space | **Draw 2 cards.** *(was: return from discard)* | **Draw 3 cards.** | ✅ rewritten |
| W-015 | Quantum Guard | **Flux. A: 5 Block. B: 8 Block. C: 6 Block + draw 1.** | Flux. A: 8 Block. B: 11 Block. C: 8 Block + draw 1. | ✅ rewritten (base+upgrade — removed "and N Block next turn") |
| W-016 | Dimensional Rift | Open Cost Rift for 2 turns. | Open Cost Rift for 3 turns: 2 random cards cost 0 each turn. | ✅ |

### Uncommon (14 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| W-017 | Probability Wave | **Draw 1. Gain 6 Block.** *(was: display highest variant)* | **Draw 2. Gain 6 Block.** | ✅ rewritten |
| W-018 | Event Horizon | **At turn start, gain 4 Block.** *(was: suppress flux shift)* | **At turn start, gain 5 Block. At turn start, gain 1 Energy.** | ✅ rewritten |
| W-019 | Chaos Bolt | Deal 6 to 20 damage (random). | Deal 8 to 24 damage (random). | ✅ |
| W-020 | Rift Walker | Open 3 random Rifts for 2 turns. | Open 3 random Rifts for 3 turns. | ✅ |
| W-021 | Paradox Strike | Deal 14. 50% chance to take 6 self damage. | Deal 18. 50% chance to take 4 self damage. | ✅ |
| W-022 | Time Skip | **Deal 20 damage. Exhaust.** *(was: skip enemy turn)* | **Deal 28 damage. Exhaust.** | ✅ rewritten |
| W-023 | Tesseract | **Gain 8 Block. Draw 2 cards.** *(was: lock Flux)* | **Gain 12 Block. Draw 2 cards.** | ✅ rewritten |
| W-024 | Dimensional Shield | **Flux. A: 20 Block. B: 14 Block + draw 1. C: 18 Block.** | Flux. A: 25 Block. B: 18 Block + draw 1. C: 22 Block. | ✅ rewritten (Retain + cross-turn removed) |
| W-025 | Warp Strike | Flux. A: 18 dmg. B: 10 dmg + Vuln 2. C: 12 dmg twice. | Flux. A: **22 dmg**. B: **14 dmg + apply Vuln 3**. C: **14 dmg twice**. | ✅ Flux variant fix |
| W-026 | Probability Reset | **Draw 3 cards.** *(was: Reroll all)* | **Draw 4 cards. Gain 4 Block.** | ✅ rewritten |
| W-027 | Entropy | **At turn start, gain 4 Block.** *(was: enemy damage modifier)* | **At turn start, gain 6 Block. At turn start, draw 1 card.** | ✅ rewritten |
| W-028 | Collapsing Star | Deal 8 to 20 damage (random). Take 3. | Deal 10 to 24 damage. Take 3. | ✅ |
| W-029 | Singularity | **At turn start, draw 1 card.** *(was: Flux Power firing all on play)* | **At turn start, draw 1 card. At turn start, gain 1 Block.** | ✅ rewritten (no longer Flux) |
| W-030 | Mirror Self | **Draw 3 cards.** *(was: copy 2 from hand)* | **Draw 4 cards.** | ✅ rewritten |

### Rare (10 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| W-031 | The Archer | **Deal 22 damage. Apply Weak 2.** *(was: ignore evasion + lock)* | **Deal 28 damage. Apply Weak 3.** | ✅ rewritten |
| W-032 | Cosmic Choir | **At turn start, deal 3 dmg. At turn start, gain 1 Block.** *(was: reactive on flux shift)* | **At turn start, deal 5 dmg. At turn start, gain 2 Block.** | ✅ rewritten |
| W-033 | The Burning Face of the World | Deal 40 to all. Apply Vuln 2 to all enemies. Open 3 random Rifts. Exhaust. | Deal 55 to all. Apply Vuln 3 to all enemies. Open 4 random Rifts. Exhaust. | ✅ |
| W-034 | Mistress of the Mysteries | **At turn start, draw 1 card.** *(was: reveal + play from draw)* | **At turn start, draw 1 card. At turn start, gain 1 Energy.** | ✅ rewritten |
| W-035 | Omniverse Slash | **Deal 8 damage 5 times.** *(was: "to target 5 times" — regex didn't match)* | **Deal 10 damage 5 times.** | ✅ rewritten |
| W-036 | Rift Master | **Open 2 random Rifts for 3 turns.** *(was: rift modifier)* | **Open 3 random Rifts for 3 turns.** | ✅ rewritten |
| W-037 | Schrödinger | **Deal 5 to 25 damage (random). Exhaust.** *(was: damage multiplier)* | **Deal 10 to 30 damage (random). Exhaust.** | ✅ rewritten |
| W-038 | Chrono Break | **Draw 4 cards. Exhaust.** *(was: replay turn)* | **Draw 6 cards. Gain 1 Energy. Exhaust.** | ✅ rewritten |
| W-039 | Reality Anchor | **At turn start, gain 6 Block.** *(was: lock Flux at turn start)* | **At turn start, gain 8 Block. At turn start, draw 1 card.** | ✅ rewritten |
| W-040 | Genesis Bolt | **Deal 25. Apply Weak 2 to all. Apply Vuln 2 to all. Apply 4 Burn to all. Open Genesis Rift.** *(was: "Weak X, Vuln Y, Z Burn" — only Weak fired)* | Deal 32. Apply Weak 3. Apply Vuln 3. Apply 5 Burn. Open Genesis Rift. | ✅ rewritten (split sentences) |

### Phase-1.5 vanilla additions (4 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| W-041 | Strike | Deal 6. | Deal 9. | ✅ |
| W-042 | Step | Gain 5 Block. | Gain 8 Block. | ✅ |
| W-043 | Shimmer | Choose: deal 4 OR gain 4 Block. | Choose: deal 6 OR gain 6 Block. | ✅ |
| W-044 | Drift | Gain 4 Block. Draw 1. | Gain 6 Block. Draw 1. | ✅ |

---

## Engine status — final (Warp Riders)

| Status | Count | % |
|---|---|---|
| ✅ wired (untouched) | 14 | 32% |
| ✅ wired via Flux variant text fix | 4 | 9% |
| ✅ wired via card rewrite | 26 | 59% |
| ⚠️ partial / ❌ inert | **0** | **0%** |

Plus 2 critical engine fixes (`activeFluxText` and write-side chokepoint).

---

## Tests

`tests/roguelite/cardUpgradesWarpRiders.test.ts` — **174 tests**:

- **Per-flux-state cross-cut** (24): 4 Flux cards × 3 states × {base, upgraded} with explicit damage/block math. **The user-flagged "all three variants" rule.**
- **Determinism** (2): upgrade flag does NOT affect PRNG sequence (initial state assignment + flux-shift sequence).
- **Relic + flux + upgrade** (2): Unmoored Eye fires on both base and upgraded Flux cards; does NOT misfire on non-Flux upgraded cards.
- **Cluster rewrite tests** (per-clause precision) (~10): W-A flux variant fixes, W-B mechanic gaps, W-D Genesis Bolt partial-fire fix.
- **Pool well-formedness** (4): card count + shared check + Flux variant completeness + Flux variant mechanic-keyword check.
- **44-card regression net × 3 flux states** (132 it.each cases): every Warp Riders card upgrade plays end-to-end in each of the three flux states.
- **`activeFluxText` chokepoint sanity** (2): regression tests for the Phase 4 fix — extracts the right body for upgraded vs base cards in any state.

Roguelite suite total: **545 passing** (was 371 at end of Phase 3, +174 Warp Riders).
Build green. Lint identical to baseline.

---

## Shared well-formedness check — final state across all factions

`tests/roguelite/_sharedUpgradeChecks.ts` now tracks **6 forbidden-text
patterns** + **2 structural checks**:

| Type | Check ID | Discovered In |
|---|---|---|
| Forbidden text | `and-weak-N` | Phase 2 Luminar |
| Forbidden text | `and-vulnerable-N` | Phase 2 Luminar |
| Forbidden text | `retain-keyword` | Phase 2 Luminar |
| Forbidden text | `and-N-block` | Phase 3 Cogsmiths |
| Forbidden text | `and-N-strength` | Phase 3 Cogsmiths |
| Forbidden text | `and-N-energy` | Phase 3 Cogsmiths |
| Structural | `flux-upgrade-must-cover-all-three-variants` | Phase 4 Warp Riders |
| Structural | `flux-variant-must-include-mechanic-keyword` | Phase 4 Warp Riders |

All four factions' tests run the full check. Adding a new pattern is a
one-line change in `_sharedUpgradeChecks.ts` that protects every faction
on the next test run.

---

## Engine surface NOT introduced (deferred to v1.1, full project list)

The cumulative v1.1 candidates across all four phases:

| Feature | Faction(s) where wanted (rewritten) |
|---|---|
| `Retain` keyword (card stays in hand at end of turn) | Luminar (4), Cogsmiths Bulwark, Warp Riders Dimensional Shield |
| `BARRIER` keyword (one-shot damage absorb) | Luminar (4 cards), Warp Riders (2 cards) — base-card issue |
| Per-combat counters (cards-played, Heat-spent, Lumens-spent, "once per combat") | Pyroclast Forge Master, Cogsmiths Assembly Line + Amp |
| Heat-spent counter | Pyroclast Forge Master |
| Reactive triggers (on-attacked, on-Heat-gain, on-flux-shift) | Pyroclast (3), Luminar Stellar Body, Warp Riders Cosmic Choir |
| Lethal-revive | Pyroclast Phoenix Form, Luminar Divine Intervention |
| Global cost modifiers ("All Augments cost 0", "All cards cost -1") | Cogsmiths Mecha Form |
| Global effect multipliers ("All Augment effects doubled", "All Release doubled") | Cogsmiths Warforge, Luminar Gravitas |
| Aggregate summon stat modifiers | Cogsmiths Machine God |
| Augment automation ("Attach Augment to every card") | Cogsmiths Reinforce Protocol |
| Add-to-hand mechanic | Cogsmiths Toolkit + Automate |
| Card-text "ignores Block" | Cogsmiths Precision Bore |
| Discard-from-hand | Cogsmiths Pace |
| Delayed-buff queues ("next attack +N", "first card per turn") | Pyroclast (3), Luminar Cluster A (4), Cogsmiths (3) |
| Lumen-sum reads, Lumen transfer | Luminar (4) |
| Lumen `+N>1` per Lumen Release on Vulnerable/Weak | Luminar |
| Per-hit Release scaling | Luminar Starfall |
| Lumen cap configuration | Luminar Sun's Blessing |
| Mass Release trigger | Luminar Apex |
| Status-decay control ("does not decay this combat") | Luminar Illumination |
| Draw-pile selection / play-from-draw-pile | Luminar Transcendence, Warp Riders Mistress |
| Flux Reroll / Lock / Display / Suppress | Warp Riders (10 cards) |
| Cross-turn deferral ("N Energy/Block next turn") | Warp Riders (Warp Step, Quantum Guard, Dimensional Shield) |
| Card removal + return mechanic | Warp Riders Pocket Dim |
| Card copy mechanic ("copy last card", "copy 2 from hand") | Warp Riders Echo, Mirror Self |
| Skip-enemy-turn from card text | Warp Riders Time Skip (engine has skipNextEnemyTurn flag, but no parser) |
| Damage multiplier (Schrödinger-style) | Warp Riders Schrödinger |
| Replay-turn mechanic | Warp Riders Chrono Break |
| Rift effect modifier | Warp Riders Rift Master |
| Reveal-top-of-draw-pile | Warp Riders Mistress of the Mysteries |
| Discard-and-draw | Luminar Astral Step |

Total: ~30 distinct deferred features. None ship in v1.

---

## Phase 5 — Integration pass (per user brief)

> "Don't claim the upgrade system shipped until Phase 5 (the integration
> pass) confirms all four factions work together — a deck mixing factions
> (which can happen via certain Anomaly rewards) plays correctly with
> mixed upgrade states."

Phase 5 is the integration verification:

1. **Cross-faction deck test**: build a deck with cards from all 4 factions, mix base + upgraded, verify combat plays end-to-end.
2. **Mixed-state regression net**: a single combat with cards from each faction, randomly upgraded, simulating the deck-state a real run produces.
3. **Save persistence**: serialize a mid-combat state with mixed-upgrade cards from multiple factions, deserialize, verify state restored faithfully.
4. **Reward roller cross-faction guard**: confirm the Phase 1.5 faction-locked rewards still work — the upgrade system should not have re-introduced cross-faction rewards.

Phase 5 is small (no new card data; integration tests only) but it's the
final gate before "shipped." Awaiting user green light to proceed.

---

## Checkpoint

**Per the user's brief**: stop after Warp Riders with the deliverable doc.
Phase 5 (integration) does not start until you've reviewed this table
and the Chokepoint Audit Findings.

**Specifically calling out for review**:

1. The two engine bugs surfaced and fixed (`activeFluxText` regex flaw, write-side chokepoint helper). Both are meaningful: `activeFluxText` was wrong for every upgraded Flux card on every play; the write-side helper closes the same class of bug as Phase 3's applyAugment regression (with Cost Rift as the second instance found by audit).
2. The "Flux variant must cover all three" rule is enforced at build time by structural checks. Future card additions can't accidentally drop a variant.
3. The cumulative v1.1 deferred feature list (~30 items) is the canonical "what we know about engine gaps" — useful for v1.1 prioritization based on playtest data.
4. The defensive grep audit found ZERO new write-side violations beyond Cost Rift. Engine is now clean.
5. The 132-test regression net iterates all flux states for every Warp Riders card. Any future regression in `activeFluxText` or the parser will surface immediately.

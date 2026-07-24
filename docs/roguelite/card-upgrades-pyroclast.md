# Card Upgrades — Pyroclast (Phases 1 + 1.5)

**Phase**: 1 + 1.5 of 4 (type system, chokepoint, parser hardening, full Pyroclast wiring)
**Faction**: Pyroclast (44 cards)
**Status**: All 44 cards `✅ wired` — no cosmetic upgrades.

Phase 1 shipped the upgrade-stat chokepoint (`getCardStats`). Phase 1.5
hardened it: every Pyroclast upgrade clause the engine could not parse was
either wired via a small parser extension or rewritten to use existing
patterns. The acceptance criterion for the rest of the upgrade system is
locked in: **no upgrade text may ship that the engine cannot fully
execute.**

---

## Acceptance criterion (locks in for Phases 2–4)

> An upgrade clause that the regex parser cannot fully execute is a
> regression. It does not ship. Either extend the parser, or rewrite the
> clause to use existing patterns.

This is enforced by the per-card playability test in
`tests/roguelite/cardUpgrades.test.ts` — every Pyroclast card's upgrade
must produce a non-trivial state change when played end-to-end through
`playCard`. Phase 2 will mirror this for Luminar / Cogsmiths / Warp Riders.

---

## Architectural Choice: Option B (single definition + state)

The spec recommended **Option A** (separate `_plus` definitions). This
codebase ships on **Option B**, for these reasons:

1. **40% already built**: `CardDefinition.upgradeText?: string` and
   `CardInstance.upgraded: boolean` already existed; all 176 cards
   already had `upgradeText` populated.
2. **Save format compatible**: existing `RunState` saves serialise
   `upgraded: boolean` per instance. Option A would force a save
   migration.
3. **Engine is regex-driven on text**, not data-driven on a structured
   `CardEffect`. The engine already read `card.upgraded ? upgradeText :
   cardText` in 5+ places — finishing the chokepoint refactor was a
   one-day task; rebuilding the engine to read structured effects would
   be a multi-day refactor.

### How "upgradedEffect" is expressed in Option B

The spec's `upgradedEffect?: CardEffect` does not exist as a standalone
field, because there is no `CardEffect` type — the engine parses card
text via regex. **The `upgradeText` field IS the effect-override
mechanism.** Numeric overrides for stats that don't appear in card text
body (`upgradedCost`, `upgradedAttack`, `upgradedHealth`) are added as
siblings on `CardDefinition` for completeness but are not currently used
by any Pyroclast card.

```ts
interface CardDefinition {
  upgradeText?: string;       // primary effect-override mechanism
  upgradedCost?: number;      // optional numeric override (rare)
  upgradedAttack?: number;
  upgradedHealth?: number;
  upgraded?: boolean;
}
```

---

## The chokepoint: `getCardStats(instance)`

`src/dungeon/engine/cardStats.ts` is the **only sanctioned way** for the
engine or UI to read upgrade-affected card stats.

```ts
export interface CardStats {
  cost: number;
  attack: number | undefined;
  health: number | undefined;
  text: string;
}
export function getCardStats(card): CardStats
export function getCardText(card): string
export function getCardCost(card): number
```

**Rule**: any code path that reads `card.attack`, `card.health`,
`card.cost`, or `card.cardText` directly (outside this module) is a
latent upgrade-ignoring bug.

---

## Phase 1.5 — what changed

### Parser extensions added (3 patterns, ~50 lines in `applySpellEffect`)

| Pattern | Regex | Cards wired |
|---|---|---|
| Heat-scaled damage | `/deal damage equal to (?:your\s+)?(?:current\s+)?heat(?:\s*[x×*]\s*(\d+))?/` | P-023 Meltdown, P-039 Magma Tide |
| Block per Heat | `/gain (\d+) block per heat(?:\s*\(up to (\d+) heat(?:\s+counted)?\))?/` | P-016 Glowing Resolve |
| Heat-conditional bonus damage | extension to existing `heatCondMatch` (adds `deal M more damage` sub-pattern) | P-036 Sun's Fury |

These patterns scale Heat as a coefficient without consuming it. Heat
stays on the playerHeat counter after the damage / block lands.

### Bug fix added (1 regex)

| Site | Was | Now |
|---|---|---|
| Self-target Ignite/Burn | `/apply (?:(\d+) (?:burn\|ignite)\|ignite (\d+))/` always routed to enemy | New `selfBurnMatch` regex catches `apply N (burn\|ignite) to (yourself\|you)` and routes to `playerStatusEffects` first; falls through to enemy match otherwise. |

This fixes P-020 Overclock+ (`Apply Ignite 2 to yourself` was hitting
the enemy instead of the player).

### Card rewrites (18 cards)

All rewrites preserve the design *intent* of the card while replacing
unparsable clauses with parsable equivalents. No engine work is required
to make any of them function.

| Cluster | Cards | Pattern that was inert | Replacement strategy |
|---|---|---|---|
| **A** Next-attack riders | P-003 Kindle, P-007 Oil Flask, P-024 Glass Cannon | "Your next attack deals +N" / "applies status N" | Apply effect immediately (Ignite N now, Draw 1 now); P-024 converted from Skill to Attack with direct damage |
| **B** Heat scaling | P-014 Pyre Lance, P-021 Pyroclasm, P-037 Forge Master | "+ damage equal to Heat consumed", "Spend N Heat for +M damage", "Every N Heat spent, draw 1" | First two: rephrase to "Consume all Heat" (wired). P-037 reframed as "At turn start, draw N + gain 1 Heat" — same flavor, no Heat-spent counter required. |
| **C** Reactive-trigger Powers | P-018 Forge Heart, P-034 Phoenix Form, P-035 Ring of Fire | "Whenever you gain Heat", lethal-revive, "Whenever attacked" | Rewritten as turn-start / play-and-turn-start Powers (turn-start AoE damage, on-play heal + ongoing Heat ramp, etc.) |
| **D** Cross-turn bookkeeping | P-019 Molten Skin, P-030 Spirit of Fire, P-038 Everburn | "Keep N Block next turn", lethal-survive, "Combat starts with N Heat" | Rewritten using `play` + `turn-start` / `turn-end` Power segments. P-038's combat-start Heat became a play-segment Heat gain. |
| **E** On-kill / on-hit | P-025 Combustion, P-026 Ash Dancer, P-029 Incinerator, P-033 Immolate | On-kill draws/copies, on-hit Ignite trigger, Burn-shuffle | All rewritten as straightforward damage + status effects with no conditional branches. |
| **F** UI-flow gaps | P-015 Rekindle, P-027 Fuel the Flames | "Return X from discard", "Exhaust a card from hand" | Rewritten as deck-draw + Heat skill (Rekindle) and direct Heat gain (Fuel the Flames) — no modal pickers needed. |

Pre-existing engine gaps that needed broader infrastructure (Heat-spent
counters, lethal-revive triggers, exhaust-from-hand modals, on-kill
hooks) are **not** introduced by this work; they're tagged as v1.1
candidates if a future card design wants them. None of those features
ship in v1.

---

## Pyroclast upgrade table — final (all wired)

### Common (16 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| P-001 | Cinder Strike | Deal 6. | Deal 9. | ✅ |
| P-002 | Scale Guard | Gain 5 Block. | Gain 7 Block and 1 Heat. | ✅ |
| P-003 | Kindle | Gain 3 Heat. | Gain 4 Heat. **Draw 1 card.** *(was: Next attack +2)* | ✅ rewritten |
| P-004 | Flame Lash | Deal 8. If Heat ≥ 3, apply Ignite 2. | Deal 10. Apply Ignite 3. | ✅ |
| P-005 | Ember Volley | Deal 3 damage 3 times. | Deal 4 damage 3 times. | ✅ |
| P-006 | Ash Cloud | Apply 2 Weak to all. | Apply 2 Weak to all. Gain 5 Block. | ✅ |
| P-007 | Oil Flask | **Apply Ignite 3.** *(was: Next attack applies Ignite 2)* | **Apply Ignite 5.** | ✅ rewritten (base + upgrade) |
| P-008 | Magma Fist | Deal 13. | Deal 16. Apply Ignite 2. | ✅ |
| P-009 | Heat Shimmer | Gain 4 Block and 1 Heat. | Gain 6 Block and 2 Heat. | ✅ |
| P-010 | Blazing Charge | Deal 4 + 4 per Heat spent (up to 5). | Deal 4 + 6 per Heat spent (up to 5). | ✅ |
| P-011 | Cauterize | Heal 4. Take 2. | Heal 6. Take 1. | ✅ |
| P-012 | Ember Tap | Gain 1 Heat. Draw 1. | Gain 2 Heat. Draw 1. | ✅ |
| P-013 | Hot Wind | Deal 2 to all. Gain 1 Heat. | Deal 3 to all. Gain 2 Heat. | ✅ |
| P-014 | Pyre Lance | Deal 14 damage. Consume all Heat. | **Deal 18 damage. Consume all Heat.** *(was: + damage equal to Heat consumed)* | ✅ rewritten |
| P-015 | Rekindle | **Draw 2 cards. Gain 1 Heat.** *(was: Return Pyroclast card from discard)* | **Draw 3 cards. Gain 2 Heat.** | ✅ rewritten (base + upgrade) |
| P-016 | Glowing Resolve | Gain 3 Block per Heat (up to 4). | Gain 4 Block per Heat (up to 4). | ✅ **parser extension** |

### Uncommon (14 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| P-017 | Dragonbreath | Deal 7 to all. | Deal 9 to all. Apply Ignite 1 to all. | ✅ |
| P-018 | Forge Heart | **At turn start, gain 4 Block.** *(was: Whenever you gain Heat)* | **At turn start, gain 6 Block and 1 Heat.** | ✅ rewritten (base + upgrade) |
| P-019 | Molten Skin | At end of turn, gain 2 Heat. | At end of turn, gain 3 Heat. At end of turn, gain 4 Block. *(was: Keep 5 Block)* | ✅ rewritten |
| P-020 | Overclock | Draw 2. Apply Ignite 2 to yourself. | Draw 3. Apply Ignite 2 to yourself. | ✅ **regex fix (self-target)** |
| P-021 | Pyroclasm | Deal 9 to all. Consume all Heat. | **Deal 12 to all. Consume all Heat.** *(was: Spend 5 Heat for +M)* | ✅ rewritten (base + upgrade) |
| P-022 | Soot Burst | Apply Vulnerable 1. | Apply Vulnerable 2. | ✅ |
| P-023 | Meltdown | Deal damage equal to your current Heat × 3. | Deal damage equal to your current Heat × 4. | ✅ **parser extension** |
| P-024 | Glass Cannon | **Deal 14 damage. Lose 5 HP.** *(was: Skill — next attack +12)* | **Deal 18 damage. Lose 3 HP.** | ✅ rewritten (type changed Skill→Attack) |
| P-025 | Combustion | **Deal 8 damage. Apply Ignite 3.** *(was: trigger Ignite on hit)* | **Deal 12 damage. Apply Ignite 4.** | ✅ rewritten (base + upgrade) |
| P-026 | Ash Dancer | **Deal 7 damage. Draw 1 card.** *(was: on-kill draw 2)* | **Deal 9 damage. Draw 2 cards.** | ✅ rewritten (base + upgrade) |
| P-027 | Fuel the Flames | **Gain 4 Heat. Take 2 damage.** *(was: Exhaust card from hand)* | **Gain 6 Heat.** | ✅ rewritten (base + upgrade) |
| P-028 | Searing Resolve | Gain 8 Block. If full HP, gain 3 Heat. | Gain 10 Block and 3 Heat. | ✅ |
| P-029 | Incinerator | **Deal 12 damage. Exhaust.** *(was: on-kill add a copy)* | **Deal 18 damage. Exhaust.** | ✅ rewritten (base + upgrade) |
| P-030 | Spirit of Fire | At turn start, gain 2 Heat. | **At turn start, gain 3 Heat and heal 2 HP.** *(was: survive lethal)* | ✅ rewritten |

### Rare (10 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| P-031 | Sunfire Blade | Deal 18, apply Ignite 4. | Deal 22, apply Ignite 5. | ✅ |
| P-032 | Volcano | At start of each turn, deal 4 to all. | At start of each turn, deal 6 to all. | ✅ |
| P-033 | Immolate | **Deal 22 to all. Apply Ignite 2.** *(was: Burn-shuffle into discard)* | **Deal 28 to all. Apply Ignite 4.** | ✅ rewritten (base + upgrade) |
| P-034 | Phoenix Form | **Heal 15 HP. Gain 3 Heat. At turn start, gain 1 Heat.** *(was: lethal-revive)* | **Heal 25 HP. Gain 5 Heat. At turn start, gain 2 Heat.** | ✅ rewritten (base + upgrade) |
| P-035 | Ring of Fire | **At turn start, deal 4 damage to all enemies.** *(was: thorns)* | **At turn start, deal 6 damage to all enemies and apply Ignite 1.** | ✅ rewritten (base + upgrade) |
| P-036 | Sun's Fury | Deal 28. If Heat ≥ 8, deal 14 more damage. | Deal 32. If Heat ≥ 6, deal 14 more damage. | ✅ **parser extension** |
| P-037 | Forge Master | **At turn start, draw 1 card and gain 1 Heat.** *(was: Heat-spent counter)* | **At turn start, draw 2 cards and gain 1 Heat.** | ✅ rewritten (base + upgrade) |
| P-038 | Everburn | **Gain 5 Heat. At turn start, gain 1 Heat.** *(was: "Combat starts with N Heat")* | **Gain 8 Heat. At turn start, gain 2 Heat.** | ✅ rewritten (text-form only — same intent) |
| P-039 | Magma Tide | Deal damage equal to Heat to 3 random enemies. | Deal damage equal to Heat to 4 chosen enemies. | ✅ **parser extension** |
| P-040 | Dragon's Roar | Apply Vuln 3 to all. Gain 4 Heat. | Apply Vuln 4 + Weak 2 to all. Gain 5 Heat. | ✅ |

### Phase-1.5 vanilla additions (4 cards)

| ID | Name | Base | Upgrade | Status |
|---|---|---|---|---|
| P-041 | Spark | Deal 4. Generate 1 Heat. | Deal 6. Generate 2 Heat. | ✅ |
| P-042 | Bash | Deal 8. | Deal 11. | ✅ |
| P-043 | Bracer | Gain 6 Block. Draw 1. | Gain 8 Block. Draw 1. | ✅ |
| P-044 | Rally | Draw 2. Take 2. | Draw 2. *(no self-damage)* | ✅ |

---

## Engine status — final summary

| Status | Count | % |
|---|---|---|
| ✅ wired (untouched in 1.5) | 19 | 43% |
| ✅ wired via parser extension | 4 | 9% |
| ✅ wired via regex bug fix | 1 | 2% |
| ✅ wired via card rewrite | 20 | 46% |
| ⚠️ partial / ❌ inert | **0** | **0%** |

Every Pyroclast upgrade now produces the gameplay effect its text
describes. No card lies to the player.

---

## Tests

`tests/roguelite/cardUpgrades.test.ts` — 80 tests (was 13 in Phase 1):

- **Phase 1 chokepoint contract** (5 tests, unchanged from Phase 1)
- **Pyroclast upgrades — engine wiring** (6 tests, unchanged)
- **Pool well-formedness** (2 tests, unchanged)
- **Phase 1.5 — Cluster B parser extension** (4 tests): Glowing Resolve,
  Meltdown, Magma Tide, Sun's Fury — verifying Heat scaling math
- **Phase 1.5 — Cluster G** (1 test): Overclock self-Ignite routes to
  player, not enemy
- **Phase 1.5 — Cluster A rewrites** (3 tests)
- **Phase 1.5 — Cluster B rewrites** (3 tests)
- **Phase 1.5 — Cluster C rewrites** (3 tests, includes turn-cycle
  simulation for Powers via `endPlayerTurn` → `executeEnemyTurn`)
- **Phase 1.5 — Cluster D rewrites** (3 tests)
- **Phase 1.5 — Cluster E rewrites** (4 tests)
- **Phase 1.5 — Cluster F rewrites** (2 tests)
- **Regression net — every Pyroclast upgrade plays without error** (44
  tests via `it.each`): plays each upgrade end-to-end with seeded Heat,
  asserts non-trivial state change. This is the **acceptance-criterion
  enforcer** for "no cosmetic upgrades."

Full roguelite suite: **229 passing** (was 162 at end of Phase 1).
Build green. Lint identical to baseline.

---

## Bug-risk audit — engine read sites touched

### Rerouted through `getCardStats` / `getCardText` / `getCardCost` (Phase 1)

**`src/dungeon/engine/combat.ts`**

| Site | Was | Now |
|---|---|---|
| `powerSegmentsForTrigger` | inline `card.upgraded ? upgradeText ?? cardText : cardText` | `getCardText(card)` |
| `activeFluxText` | same inline ternary, twice | `getCardText(card)` (twice) |
| `applyAugment` cost gate + spend | `augment.cost` direct | `getCardStats(augment).cost` |
| `applyAugment` text scan | inline ternary | `getCardStats(augment).text` |
| `getCardChoice` | inline ternary | `getCardText(card)` |
| `playCard` cost gate + spend | `card.cost` direct | `getCardStats(card).cost` |
| `playCard` Channel release scan | inline ternary | `getCardText(card)` |
| `playCard` minion / structure `currentHealth` init | `card.health ?? N` | `stats.health ?? N` |
| `playCard` exhaust check | base text + upgrade text OR'd | `stats.text` (single source — *behaviour-correcting*) |
| `applySpellEffect` rawText fallback | `card.cardText` | `getCardText(card)` |
| `processDeaths` LAST_WORDS log + IMMOLATE damage | `dead.cardText`, `dead.attack ?? 3` | `getCardStats(dead)` |
| `attackWithMinion` minion damage | `attacker.attack ?? 0` | `getCardStats(attacker).attack ?? 0` |
| Cost Rift discount | `target.cost ?? 0` | `getCardCost(target)` |

**`src/dungeon/engine/relicEffects.ts`**

| Site | Was | Now |
|---|---|---|
| Unmoored Eye flux scan | `c.cardText.toLowerCase().includes('flux')` | `getCardText(c).toLowerCase().includes('flux')` |
| Shard of the Choir flux check | `ctx.cardPlayed?.cardText…` | `getCardText(ctx.cardPlayed)…` |

**UI**: CardComponent (cost badge + body text + minion stats + Flux body
extraction); CombatView (tooltip block, hand affordance check,
channel-card-in-hand detection, persistent-power tooltip strings);
HandComponent (affordable check); DeckViewer (cost-sort comparator).

### New engine surface added in Phase 1.5

**`src/dungeon/engine/combat.ts`**

| Section | Added |
|---|---|
| Heat-scaled damage (`heatScaleMatch`, before `dmgMatch`) | New regex pattern + multiplier handling. Honors `getCardText` via `applySpellEffect`'s `rawText`. |
| Heat-scaled block (`blockPerHeatMatch`, before `shieldMatch`) | New regex pattern + cap handling. |
| Heat-conditional bonus damage (extends `heatCondMatch`) | New `condDmgMatch` sub-pattern inside the existing block. |
| Self-target burn/Ignite (`selfBurnMatch`, before `burnMatch`) | New regex routing self-Ignite to `playerStatusEffects`; falls through to enemy match otherwise. |

All four extensions read upgrade-aware text via the existing chokepoint
flow — `applySpellEffect`'s `rawText` is fed by `getCardText(card)` (or
the Flux body, which itself routes through `getCardText`). **No new
direct reads of `card.cardText` were introduced.**

### Intentionally left direct (NOT a bug)

Same as Phase 1 audit:

- `relicEffects.ts:78` — CARD_POOL filter for "Skill that grants Block" (filters base definitions, never upgraded)
- `combat.ts` `isFluxCard` and `isChannelCard` regex on `cardText` (detection only; both base and upgrade text begin with the keyword for every relevant card)
- `combat.ts` enemy-minion `target.attack` for counter-damage (enemy minions don't carry upgrade state)
- Synthetic summon cards (drone/sentry/titan) — constructed inline with hard-coded stats
- `DungeonRoot.tsx:342` landing-page deck preview — different `Card` type

### Heat-path re-audit (the user-flagged surface, post-1.5)

| Heat path | Source text | Upgrade-aware? |
|---|---|---|
| `Gain N Heat` / `Generate N Heat` / `and N Heat` | regex on `getCardText`-driven `text` | ✅ |
| `Deal N + M per Heat spent (up to X heat)` | regex on `text` | ✅ |
| `Consume all Heat` | regex on `text` | ✅ |
| `If Heat ≥ N, apply Ignite M` (existing burn branch) | regex on `text` | ✅ |
| `If Heat ≥ N, deal M more damage` (new in 1.5) | regex on `text` | ✅ |
| `Gain N Block per Heat` (new in 1.5) | regex on `text` | ✅ |
| `Deal damage equal to Heat × N` (new in 1.5) | regex on `text` | ✅ |
| Power "at turn start, gain N Heat" segments | `powerSegmentsForTrigger` → `getCardText` | ✅ |

All Heat-related parsing flows through the single chokepoint.

---

## Standard for Phases 2–4

The same playability-test pattern is the gate for every Phase 2 card.
The Phase 2 deliverable doc (per faction) must:

1. List every card with base/upgrade text and per-card engine status.
2. Have **all entries at `✅ wired`** before merging.
3. Add a per-card unit test mirroring the regression net in
   `tests/roguelite/cardUpgrades.test.ts`'s `it.each` block.
4. Document any new parser extensions or regex fixes with a Phase 1.5–
   style entry in this audit doc (or a sibling).

Phase 2 will not start until the user reviews this doc.

---

## 2026-07-24 addendum — heat-first pool rework (Pyroclast Trials MVP)

The MVP re-locked to Pyroclast with the design bar "nearly every card
generates, spends, or scales with Heat" (42 of 44; P-001 Cinder Strike stays
the canonical vanilla, P-044 Rally stays neutral velocity). 22 cards were
retexted, P-004 got an honesty fix (text now matches actual engine behavior),
and 4 cards were retagged (P-008/P-029/P-042 T1→2, P-031 T2→3). All texts
reuse already-supported parser patterns — no engine changes. Structured-effects
cards (P-001/002/003/010/041) untouched. Starter deck swaps one Cinder Strike
for Spark (P-041). Reward tier weights steepened to 60/35/5 · 35/45/20 ·
20/45/35.

| ID | Card | New base text | New upgrade text |
|---|---|---|---|
| P-005 | Ember Volley | Deal 3 damage 3 times. Gain 1 Heat. | Deal 4 damage 3 times. Gain 1 Heat. |
| P-006 | Ash Cloud | Apply 2 Weak to all enemies. Gain 1 Heat. | Apply 2 Weak to all enemies. Gain 5 Block. Gain 1 Heat. |
| P-007 | Oil Flask | Apply Ignite 3. Gain 1 Heat. | Apply Ignite 5. Gain 2 Heat. |
| P-008 | Magma Fist (T1→T2) | Deal 13 damage. If Heat >= 3, deal 5 more damage. | Deal 16 damage. Apply Ignite 2. If Heat >= 3, deal 5 more damage. |
| P-011 | Cauterize | Heal 4 HP. Gain 2 Heat. | Heal 6 HP. Gain 3 Heat. |
| P-017 | Dragonbreath | Deal 7 damage to all enemies. Gain 2 Heat. | Deal 9 damage to all enemies. Apply Ignite 1 to all. Gain 2 Heat. |
| P-018 | Forge Heart | At turn start, gain 4 Block and 1 Heat. | At turn start, gain 6 Block and 2 Heat. |
| P-020 | Overclock | Draw 2 cards. Gain 2 Heat. Apply Ignite 2 to yourself. | Draw 3 cards. Gain 2 Heat. Apply Ignite 2 to yourself. |
| P-022 | Soot Burst | Apply Vulnerable 1 to all enemies. Gain 1 Heat. | Apply Vulnerable 2 to all enemies. Gain 1 Heat. |
| P-024 | Glass Cannon | Deal 14 damage. Lose 5 HP. Gain 2 Heat. | Deal 18 damage. Lose 3 HP. Gain 2 Heat. |
| P-025 | Combustion | Deal 8 damage. Apply Ignite 3. If Heat >= 5, apply Ignite 3. | Deal 12 damage. Apply Ignite 4. If Heat >= 5, apply Ignite 4. |
| P-026 | Ash Dancer | Deal 7 damage. Draw 1 card. Gain 1 Heat. | Deal 9 damage. Draw 2 cards. Gain 1 Heat. |
| P-029 | Incinerator (T1→T2) | Deal 12 damage. If Heat >= 4, deal 6 more damage. Exhaust. | Deal 18 damage. If Heat >= 4, deal 6 more damage. Exhaust. |
| P-031 | Sunfire Blade (T2→T3) | Deal 18 damage. Apply Ignite 4. If Heat >= 6, apply Ignite 4. | Deal 22 damage. Apply Ignite 5. If Heat >= 6, apply Ignite 5. |
| P-032 | Volcano | At start of each turn, deal 4 damage to all enemies and gain 1 Heat. | Same with 6 damage. |
| P-033 | Immolate | Deal 22 damage to all enemies. Apply Ignite 2. If Heat >= 5, apply Ignite 3. | Deal 28 damage to all enemies. Apply Ignite 4. If Heat >= 5, apply Ignite 4. |
| P-035 | Ring of Fire | Gain 2 Heat. At turn start, deal 4 damage to all enemies. | Gain 3 Heat. At turn start, deal 6 damage to all enemies and apply Ignite 1. |
| P-042 | Bash (T1→T2) | Deal 8 damage. If Heat >= 4, deal 4 more damage. | Deal 11 damage. If Heat >= 4, deal 5 more damage. |
| P-043 | Bracer | Gain 5 Block. Draw 1 card. Gain 1 Heat. | Gain 7 Block. Draw 1 card. Gain 1 Heat. |
| P-004 | Flame Lash (honesty fix) | Deal 8 damage. Apply Ignite 2. If Heat >= 3, apply Ignite 2. | (upgrade unchanged) |

Parser rules honored: conditional ignite is written as two clauses (the
`apply ignite N` regex fires unconditionally, so the guaranteed part is its
own sentence); the safe conditional rider is `If Heat >= N, deal M more
damage.`; no parser-only `+ M per Heat spent` cards (double-fire — P-010
works only via structured `vent_damage`).

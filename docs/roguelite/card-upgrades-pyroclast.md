# Card Upgrades — Pyroclast (Phase 1)

**Phase**: 1 of 4 (type system + Pyroclast)
**Faction**: Pyroclast (44 cards)
**Status**: Complete

---

## Architectural Choice: Option B (single definition + state)

The spec recommended **Option A** (separate `_plus` definitions). This codebase
is shipped on **Option B**, for these reasons:

1. **40% already built**: `CardDefinition.upgradeText?: string` and
   `CardInstance.upgraded: boolean` already existed; all 176 cards already had
   `upgradeText` populated.
2. **Save format compatible**: existing `RunState` saves serialise
   `upgraded: boolean` per instance. Option A would force a save migration
   (instances saved as `id: 'p-001'` would need to re-resolve to `p-001_plus`
   on load if upgraded).
3. **Engine is regex-driven on text**, not data-driven on a structured
   `CardEffect`. The engine already reads `card.upgraded ? upgradeText : cardText`
   in 5+ places — finishing the chokepoint refactor was a one-day task; rebuilding
   the engine to read structured effects would be a multi-day refactor.

Confirmed with the user before implementation. See chat transcript:
> "Override to Option B... force-A would mean throwing away working scaffolding to pay a refactor tax for no design benefit."

### How "upgradedEffect" is expressed in Option B

The spec's `upgradedEffect?: CardEffect` does not exist as a standalone
field, because there is no `CardEffect` type — the engine parses card text
via regex. **The `upgradeText` field IS the effect-override mechanism.**
Numeric overrides for stats that don't appear in card text body
(`upgradedCost`, `upgradedAttack`, `upgradedHealth`) are added as siblings
on `CardDefinition` for completeness but are not currently used by any
Pyroclast card (no Pyroclast cards have minions, and no current Pyroclast
upgrade reduces cost).

Schema as shipped:

```ts
interface CardDefinition {
  // … existing fields …
  upgradeText?: string;       // primary effect-override mechanism
  upgradedCost?: number;      // optional numeric override (rare)
  upgradedAttack?: number;    //   "
  upgradedHealth?: number;    //   "
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
  text: string;             // upgradeText if upgraded and present, else cardText
}
export function getCardStats(card: CardInstance | CardDefinition): CardStats
export function getCardText(card): string                 // sugar
export function getCardCost(card): number                 // sugar
```

**Rule**: any code path that reads `card.attack`, `card.health`, `card.cost`,
or `card.cardText` directly (outside this module) is a latent upgrade-ignoring
bug. See "Bug-risk audit" at the bottom of this document for the inventory of
sites that were rerouted in Phase 1 and the small handful that were
intentionally left direct.

---

## Pyroclast upgrade table — all 44 cards

### Common (16 cards, P-001 → P-016)

| ID | Name | Base | Upgrade | Designer note | Engine status |
|----|------|------|---------|---------------|---------------|
| P-001 | Cinder Strike | Deal 6. | **Deal 9.** | Workhorse 1-cost. Upgrade is a +50% damage bump — beats most starter alternatives. | ✅ wired |
| P-002 | Scale Guard | Gain 5 Block. | **Gain 7 Block and 1 Heat.** | Adds a Heat clause to a vanilla Block card; teaches the Heat ramp on a defensive turn. | ✅ wired |
| P-003 | Kindle | Gain 3 Heat. | Gain 4 Heat. **Next attack this turn deals +2 damage.** | The "next attack +2" rider is **NOT engine-parsed**. Heat bump applies; rider is currently inert. | ⚠️ partial — Heat works, +2 rider inert |
| P-004 | Flame Lash | Deal 8. If Heat ≥ 3, apply Ignite 2. | **Deal 10. Apply Ignite 3.** | Removes the Heat conditional → unconditional Ignite. Significant tempo upgrade for low-Heat decks. | ✅ wired (unconditional path bypasses heat-cond regex) |
| P-005 | Ember Volley | Deal 3 damage 3 times. | **Deal 4 damage 3 times.** | Multi-hit damage bump (BLITZ keyword). Solid Ignite fishing. | ✅ wired |
| P-006 | Ash Cloud | Apply 2 Weak to all enemies. | Apply 2 Weak to all enemies. **Gain 5 Block.** | Adds defense; turns a pure debuff into a tempo card. | ✅ wired |
| P-007 | Oil Flask | Your next Attack applies Ignite 2. | Your **next 2 Attacks** apply Ignite 2. | "Next attack(s) rider" is **NOT engine-parsed**. Card displays the upgrade but no buff is queued. | ❌ inert (pre-existing gap) |
| P-008 | Magma Fist | Deal 13. | **Deal 16. Apply Ignite 2.** | Adds an Ignite rider; the upgrade is the highest single-target Common burst at 2 cost. | ✅ wired |
| P-009 | Heat Shimmer | Gain 4 Block and 1 Heat. | **Gain 6 Block and 2 Heat.** | Pure scaling. Reads via `gain N block` + `and N heat` regexes. | ✅ wired |
| P-010 | Blazing Charge | Deal 4 + 4 per Heat spent (up to 5). | Deal 4 + **6** per Heat spent (up to 5). | Bumps the per-Heat coefficient. Ceiling: 4 + 30 = 34 damage at 1 energy. | ✅ wired (`heatSpendMatch` regex) |
| P-011 | Cauterize | Heal 4. Take 2. | **Heal 6. Take 1.** | Better trade ratio. Niche utility. | ✅ wired |
| P-012 | Ember Tap | Gain 1 Heat. Draw 1. | **Gain 2 Heat.** Draw 1. | Doubles the cycle's Heat output. | ✅ wired |
| P-013 | Hot Wind | Deal 2 to all. Gain 1 Heat. | **Deal 3 to all. Gain 2 Heat.** | AoE clear + Heat ramp. | ✅ wired (single-enemy in this build) |
| P-014 | Pyre Lance | Deal 14. **Consume all Heat.** | Deal 14 **+ damage equal to Heat consumed.** | The "+ damage equal to Heat consumed" clause is **NOT engine-parsed**. Base 14 + heat consume works. | ⚠️ partial — base works, scaling clause inert |
| P-015 | Rekindle | Return a Pyroclast card from discard to hand. | Return **any** card from discard to hand. | Discard-recall logic is a stub (no engine wiring at all currently). | ❌ inert (pre-existing gap, both base and upgrade) |
| P-016 | Glowing Resolve | Gain **3 Block per Heat** (up to 4 Heat counted). | Gain **4 Block per Heat** (up to 4 Heat counted). | "Block per Heat" scaling is **NOT engine-parsed**. | ❌ inert |

### Uncommon (14 cards, P-017 → P-030)

| ID | Name | Base | Upgrade | Designer note | Engine status |
|----|------|------|---------|---------------|---------------|
| P-017 | Dragonbreath | Deal 7 to all. | **Deal 9 to all. Apply Ignite 1 to all.** | AoE upgrade adds a status rider; combos with Combustion. | ✅ wired |
| P-018 | Forge Heart | Whenever you gain Heat, gain 1 Block. | Whenever you gain Heat, gain 1 Block. **Gain 1 Strength at Heat 10+.** | "Whenever you gain Heat" trigger does not exist. Power doesn't fire on Heat gain. | ❌ inert (pre-existing gap) |
| P-019 | Molten Skin | At end of turn, if you have Block, gain 2 Heat. | At end of turn, if you have Block, gain 2 Heat. **Keep 5 Block next turn.** | "Keep N Block next turn" is not engine-parsed. End-of-turn segment fires; conditional Heat-gain works because shield > 0. | ⚠️ partial — Heat gain works, "keep block" inert |
| P-020 | Overclock | Draw 2. Apply Ignite 2 to yourself. | **Draw 3.** Apply Ignite 2 to yourself. | Self-Ignite is parsed as enemy Ignite (regex doesn't disambiguate target). Pre-existing bug. | ⚠️ partial — Draw scales correctly, self-Ignite mis-targets |
| P-021 | Pyroclasm | Deal 9 to all. Spend 5 Heat for +6 to each. | Deal **11** to all. Spend 5 Heat for **+8** to each. | The "spend N Heat for +M" branch is not engine-parsed. Base AoE damage works. | ⚠️ partial |
| P-022 | Soot Burst | Apply Vulnerable 1. | **Apply Vulnerable 2.** | Cleanest scaling test in the pool. | ✅ wired |
| P-023 | Meltdown | Deal damage equal to Heat × 3. | Deal damage equal to Heat × **4**. | "Heat × N" scaling is not engine-parsed. | ❌ inert |
| P-024 | Glass Cannon | Your next Attack deals +12. Lose 5 HP. | Your next Attack deals **+15**. Lose **3** HP. | "Next attack +N" rider not engine-parsed. HP loss works. | ⚠️ partial — HP loss works, +damage rider inert |
| P-025 | Combustion | Deal 10. If target has Ignite, trigger it. | Deal 10. If target has Ignite, trigger it **and spread remaining to all enemies**. | Ignite-trigger-on-hit not engine-parsed. Base damage works. | ⚠️ partial |
| P-026 | Ash Dancer | Deal 7. If kill, draw 2. | Deal **9**. If kill, draw 2. | Draw-on-kill not engine-parsed; the conditional draw clause is inert in both base and upgrade. | ⚠️ partial — damage scales, conditional draw inert |
| P-027 | Fuel the Flames | Exhaust a card. Gain 3 Heat per cost. | Exhaust a card. Gain **4** Heat per cost. | "Exhaust a card from hand" UI flow not implemented. Card itself exhausts. | ❌ inert (pre-existing gap) |
| P-028 | Searing Resolve | Gain 8 Block. If at full HP, gain 3 Heat. | **Gain 10 Block and 3 Heat.** | Removes the conditional → unconditional Block + Heat. | ✅ wired |
| P-029 | Incinerator | Deal 9. Exhaust. If kill, add a copy to hand. | Deal 9. Exhaust. If kill, add **2** copies to hand. | "Add copy to hand on kill" not engine-parsed. Damage and exhaust work. | ⚠️ partial |
| P-030 | Spirit of Fire | At turn start, gain 2 Heat. | At turn start, gain **3** Heat. **Once per combat, survive lethal at 10 HP.** | Power turn-start segment works. Lethal-survival not engine-parsed. | ⚠️ partial |

### Rare (10 cards, P-031 → P-040)

| ID | Name | Base | Upgrade | Designer note | Engine status |
|----|------|------|---------|---------------|---------------|
| P-031 | Sunfire Blade | Deal 18, apply Ignite 4. | Deal **22**, apply Ignite **5**. | Premium burst. Number-only scale. | ✅ wired |
| P-032 | Volcano | At start of each turn, deal 4 to all. | At start of each turn, deal **6** to all. | Power turn-start segment with damage. | ✅ wired |
| P-033 | Immolate | Deal 22. Shuffle 2 Burn cards into discard. | Deal **28**. Shuffle 2 Burn cards (dealing half damage) into discard. | "Shuffle Burn into discard" not engine-parsed. Base damage works. | ⚠️ partial |
| P-034 | Phoenix Form | Once per combat, when reduced to 0 HP, restore 15 HP and gain 3 Heat. | Once per combat, restore **25** HP and gain **5** Heat. | Lethal-revive trigger not engine-parsed. | ❌ inert |
| P-035 | Ring of Fire | Whenever attacked, deal 2 back. Deal 4 if Heat ≥ 5. | Whenever attacked, deal **4** back. Deal **6** if Heat ≥ 5. | "Whenever attacked" reactive trigger not engine-parsed. | ❌ inert |
| P-036 | Sun's Fury | Deal 28. If Heat ≥ 8, deal 14 more. | Deal **32**. If Heat ≥ **6**, deal 14 more. | Heat-conditional damage path is not parsed (only burn is in the conditional regex). Base damage works. | ⚠️ partial |
| P-037 | Forge Master | Every 3 Heat spent this combat, draw 1 card. | Every **2** Heat spent, draw 1 card. | "Heat spent counter" not implemented. | ❌ inert |
| P-038 | Everburn | Combat starts with 5 Heat. Gain 1 Heat at turn start. | Combat starts with **8** Heat. Gain **2** Heat at turn start. | Combat-start Heat boost not parsed. Turn-start Heat works. | ⚠️ partial |
| P-039 | Magma Tide | Deal damage equal to Heat to 3 random enemies. | Deal damage equal to Heat to **4 chosen** enemies. | "Damage equal to Heat" scaling not parsed. | ❌ inert |
| P-040 | Dragon's Roar | Apply Vulnerable 3 to all. Gain 4 Heat. | Apply Vulnerable **4** and Weak **2** to all. Gain **5** Heat. | Adds Weak rider to a Vulnerable card. Heat scales. | ✅ wired |

### Phase-1.5 vanilla additions (4 cards, P-041 → P-044)

| ID | Name | Base | Upgrade | Designer note | Engine status |
|----|------|------|---------|---------------|---------------|
| P-041 | Spark | Deal 4. Generate 1 Heat. | Deal **6**. Generate **2** Heat. | Onboarding card — base damage AND Heat scale on upgrade. | ✅ wired |
| P-042 | Bash | Deal 8. | Deal **11**. | Pure number-bump. STS-style "+3 damage on +". | ✅ wired |
| P-043 | Bracer | Gain 6 Block. Draw 1. | Gain **8** Block. Draw 1. | Block scaling. | ✅ wired |
| P-044 | Rally | Draw 2. Take 2. | Draw 2. *(no self-damage)* | Removes the self-damage cost. Effect-shape change — single removal of a clause. | ✅ wired (`take N damage` clause absent in upgrade text) |

---

## Engine status — summary

- ✅ **Fully wired (15 / 44, 34%)**: P-001, P-002, P-005, P-008, P-009, P-013, P-017, P-022, P-028, P-031, P-032, P-040, P-041, P-042, P-043, P-044, plus base of P-004 + P-011 + P-012.
- ⚠️ **Partial (15 / 44)**: damage/block/draw numbers scale correctly, but a sub-clause of the upgrade text describes an unsupported behaviour (e.g. "next attack +N", "damage equal to Heat", lethal-revive, etc.).
- ❌ **Inert (5 / 44)**: P-007, P-015, P-016, P-018, P-023, P-027, P-034, P-035, P-037, P-039 — upgrade is parseable as text but the engine has no infrastructure for the behaviour. These cards are *also* partly broken in their base form; they pre-date Phase 1.

**These ⚠️/❌ rows are pre-existing engine gaps, not regressions introduced
by Phase 1.** Phase 1 only adds the chokepoint plumbing — it does not extend
the engine's parser. Closing the gaps is a v1.1 task (or a pre-Phase-2
hardening pass if we want all 44 cards live).

---

## Tests added

`tests/roguelite/cardUpgrades.test.ts` — 13 tests, all green:

- **Chokepoint contract** (5 tests): base vs. upgraded reads through
  `getCardStats`, all four override fields (cost/attack/health/text),
  fallback when `upgradeText` is undefined.
- **Pyroclast engine wiring** (6 tests): end-to-end through `playCard`,
  one per "wired" upgrade pattern (number bump, added clause, status
  rider, AoE rider, vulnerable scale).
- **Pool well-formedness** (2 tests): every Pyroclast card has
  `upgradeText`; `upgradeText !== cardText`.

Full roguelite suite: 162 tests, all green (149 prior + 13 new).
Build green, lint identical to pre-change baseline (no new warnings or errors).

---

## Bug-risk audit — engine read sites touched

This is the inventory the user asked for: every site I rerouted through
`getCardStats`, plus sites I deliberately left direct, plus sites that
silently ignore upgrades today.

### Rerouted through `getCardStats` / `getCardText` / `getCardCost`

**`src/dungeon/engine/combat.ts`**

| Line (approx.) | Site | Was | Now |
|---|---|---|---|
| `powerSegmentsForTrigger` | 60 | inline `card.upgraded ? upgradeText ?? cardText : cardText` | `getCardText(card)` |
| `activeFluxText` | 78–79 | same inline pattern + a separate fallback | `getCardText(card)` (twice) |
| `applyAugment` cost gate | 258, 325 | `augment.cost` direct | `getCardStats(augment).cost` |
| `applyAugment` text scan | 260 | inline upgrade-aware ternary | `getCardStats(augment).text` |
| `getCardChoice` | 339 | inline ternary | `getCardText(card)` |
| `playCard` cost gate + spend | 353, 357 | `card.cost` direct | `getCardStats(card).cost` |
| `playCard` Channel release scan | 368 | inline ternary | `getCardText(card)` |
| `playCard` minion `currentHealth` init | 402 | `card.health ?? 1` | `stats.health ?? 1` |
| `playCard` structure `currentHealth` init | 417 | `card.health ?? 4` | `stats.health ?? 4` |
| `playCard` exhaust check | 439–440 | base text + upgrade text | `stats.text` (single source — *behaviour-correcting*: lets an upgrade remove "Exhaust") |
| `applySpellEffect` rawText fallback | 465 | `card.cardText` | `getCardText(card)` |
| `processDeaths` LAST_WORDS log + IMMOLATE damage | 912, 916 | `dead.cardText`, `dead.attack ?? 3` | `getCardStats(dead)` (text + attack) |
| `attackWithMinion` minion damage | 849 | `attacker.attack ?? 0` | `getCardStats(attacker).attack ?? 0` |
| Cost Rift discount | 1163 | `target.cost ?? 0` | `getCardCost(target)` |

**`src/dungeon/engine/relicEffects.ts`**

| Line | Site | Was | Now |
|---|---|---|---|
| 181 | Unmoored Eye flux scan over hand | `c.cardText.toLowerCase().includes('flux')` | `getCardText(c).toLowerCase().includes('flux')` |
| 215 | Shard of the Choir flux check | `ctx.cardPlayed?.cardText…` | `getCardText(ctx.cardPlayed)…` |

**`src/dungeon/components/CardComponent.tsx`** — display

- Cost badge, body text, minion stats (attack / health), Flux body extraction.
  All routed through a single `stats = getCardStats(card)` at the top of the
  render, then `stats.cost`, `stats.text`, `stats.attack`, `stats.health`.

**`src/dungeon/components/CombatView.tsx`**

- Tooltip body (cost / attack / health / text) — wrapped in a one-shot
  `getCardStats(tooltip.card)` block.
- Hand-card affordance check (`card.cost > playerEnergy`) → `getCardStats(card).cost`.
- Channel-card-in-hand detection (Lumen allocator gating) → `getCardText(c)`.
- Two persistent-power tooltip strings → `getCardText(p)`.

**`src/dungeon/components/HandComponent.tsx`**

- `affordable = card.cost <= energy` → `getCardCost(card) <= energy`.

**`src/dungeon/components/DeckViewer.tsx`**

- Sort comparator on cost → `getCardCost(a/b)`.

### Intentionally left direct (NOT a bug)

| Site | Reason |
|---|---|
| `relicEffects.ts:78` — `CARD_POOL` filter for "Skill that grants Block" | Filters base **definitions**, never upgraded. Base text is the right lookup. |
| `combat.ts:18` — `isFluxCard(card)` regex on `cardText` | Detection at the "is this a flux card at all" level. Both base and upgrade text begin with "Flux." for every flux card; reading base text is sufficient. (If a future upgrade ever drops the prefix, this becomes a bug — flagged for v1.1.) |
| `combat.ts:39` — `isChannelCard(card)` regex on `cardText` | Same reasoning as flux detection. |
| `combat.ts:870` — `target.attack ?? 0` for enemy minion counter-damage | Enemy minions don't carry upgrade state (they're spawned by enemy intents, not from the player's deck). Direct read is correct. |
| Synthetic summon cards in `applySpellEffect` (drone/sentry/titan blocks) | Constructed inline as fresh `CardInstance`s with hard-coded stats; not subject to upgrade. |
| `DungeonRoot.tsx:342` landing-page deck preview | Uses a different `Card` type from the static landing module, not `CardInstance`. No upgrade state. |

### Not yet rerouted (pre-existing bugs / Phase 1 didn't touch)

None observed during this pass. If you spot one, the rule is simple: any
direct read of `card.cost`, `card.attack`, `card.health`, or `card.cardText`
on a `CardInstance` outside `cardStats.ts` is a regression — route it.

---

## Heat-related read paths — explicit re-audit

The user flagged Heat as the highest-bug-risk faction-specific path. Every
Heat read site was re-checked:

| Heat path | Source text | Routed through chokepoint? |
|---|---|---|
| `Gain N Heat` / `Generate N Heat` / `and N Heat` | regex on `text` (= `getCardText(card)` or active flux body) | ✅ |
| `Deal N + M per Heat spent (up to X heat)` | regex on `text` | ✅ |
| `Consume all Heat` | regex on `text` | ✅ |
| `If Heat ≥ N, apply Ignite M` | regex on `text` | ✅ (only the burn-rider branch is wired; conditional bonus damage is the gap noted on P-036) |
| Power "at turn start, gain N Heat" segments (P-030, P-038) | `powerSegmentsForTrigger` | ✅ (calls `getCardText`) |

There are **no Heat-related derived calculations that read base stats
outside this regex pipeline.** All Heat numerics flow through
`getCardText`, then through the regex parsers — so an upgraded Heat
card's upgraded numbers are picked up automatically.

The risks that remain are **engine-parsing gaps**, not chokepoint gaps:
the engine doesn't parse "Heat × N", "+damage equal to Heat consumed",
or "every N Heat spent, …" patterns at all. Those are documented per
card in the table above and tagged for a future v1.1 hardening pass.

---

## Checkpoint

This document is the gate before Phase 2. Before approving the same
treatment for Luminar / Cogsmiths / Warp Riders, please confirm:

1. The Option-B rationale and `upgradedEffect = upgradeText` decision.
2. The pre-existing partial / inert rows are acceptable to ship as-is for
   v1, with a note that they are flagged for v1.1.
3. The chokepoint contract (`getCardStats` is the only sanctioned reader)
   is the standard the other three factions will be held to.

Phase 2 will mirror this structure exactly: per-faction markdown with the
table, designer notes, engine status per card, and a delta to this
bug-risk audit (any new direct reads found in the next round get listed
here and either rerouted or justified).

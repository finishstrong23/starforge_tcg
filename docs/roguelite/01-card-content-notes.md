# 01 — Card Content Implementation Notes

Phase 1 of the roguelite build: typed card data + starter decks. No combat,
UI, or state tracking yet — those are later phases. This note records
decisions, caveats, and open questions for the next phase.

## What shipped

- 6 type modules under `src/roguelite/types/` (card, card instance,
  evolution, faction mechanics, starter deck, status effect).
- 4 faction card files under `src/roguelite/cards/`, auto-generated from the
  xlsx spreadsheets under `docs/roguelite/factions/`. Each file exports
  `*_BASE_CARDS`, `*_EVOLVED_CARDS`, and a combined `*_CARDS`.
- `signature_cards.ts` with the 4 starter-only Power cards (Molten Core,
  Inner Sun, Modular Core, Probability Anchor). Not in any faction's main
  pool.
- `starter_decks.ts` with `STARTER_DECKS: Record<FactionId, StarterDeck>`.
- `cards/index.ts` exports `ALL_ROGUELITE_CARDS` (324 entries) and
  `CARD_BY_ID` (lookup map).
- `type_tests.ts` exercises each faction's extension types and every
  TriggerType variant. Runtime-inert — exists to fail `tsc` if the type
  shape regresses.

Acceptance criteria verified via a compile + runtime check:

```
OK: 324 cards total
OK: per-card field scoping (fluxStates on WR only, augmentCategory on
    Cogsmith Augments only)
OK: 4 starter decks reference real cards
Split: 160 base + 160 evolved + 4 signature
Flux: 16 (8 base + 8 evolved)   Augment: 18 (9 base + 9 evolved)
Per faction: Pyroclast 81, Luminar 81, Cogsmiths 81, WarpRiders 81
ALL CHECKS PASS
```

## Design-doc ambiguities resolved

1. **Cogsmiths Augment count.** Design doc (`cogsmiths-design.md` §Card
   list) says "10 Augments across the pool"; spreadsheet ships **9**
   (Edge, Plate, Jolt, Core, Gyro, Bulwark, Amp, Exotic Core, Inverter).
   I trusted the spreadsheet per the prompt's "spreadsheet is authoritative"
   rule, but flag for content review: is the missing 10th Augment
   intentional, or a spreadsheet oversight?

2. **Evolved-card rarity/type/cost.** Spreadsheets don't restate these
   columns for the evolved form. Assumption: evolved forms inherit the base
   card's rarity, type, and cost. This matches how `Cinder Strike (Common,
   Attack, cost 1)` evolves to `Blazing Strike (Common, Attack, cost 1)` —
   the evolved effect deals more damage but the card's place in the pool
   and economy doesn't shift. Flag if this is wrong for any card.

3. **Signature card IDs.** Design docs don't assign IDs to Molten Core /
   Inner Sun / Modular Core / Probability Anchor. Invented `SIG-PY-001`,
   `SIG-LU-001`, `SIG-CO-001`, `SIG-WR-001`. Happy to rename.

4. **Signature card archetype.** Set to `'Signature'` (string) since the
   spreadsheet has archetypes like `'Basic'`, `'Heat Snowball'`, etc.
   Combat engine can treat `'Signature'` as a special bucket if needed.

5. **Rarity union.** Design docs use `Common | Uncommon | Rare` for the
   pool and `Basic | Special` for starter-deck cards. Phase 0 planning
   hinted at using 4-tier rarity. Went with the design-doc union:
   `Common | Uncommon | Rare | Basic | Special`. Basic is used on the 5x/4x
   starter cards (P-001, P-002, L-001, L-002, etc.) — their `rarity` in the
   main pool's xlsx **is `Common`**, not `Basic`, per the spreadsheet.
   Basic only shows up in starter-deck sheets as a category label. I kept
   the main-pool Common value on those cards.

6. **Warp Rider cards that mention Flux but aren't Flux cards.** Cards
   like Twist, Tesseract, Event Horizon, Reality Anchor, Cosmic Choir, and
   Probability Wave reference Flux mechanics in their descriptions but do
   not themselves have A/B/C states — they manipulate other Flux cards. I
   only populated `fluxStates` on cards whose effect text literally follows
   the `Flux. A: … B: … C: …` pattern. Per the prompt: "Cards with type
   'Skill'/'Attack'/'Power' that contain 'Flux.' in their description are
   Flux cards" — I interpreted this as requiring the A/B/C state structure
   to be parseable from the description. If the combat engine needs those
   non-state Flux-interacting cards tagged separately, propose adding an
   `isFluxInteracting?: boolean` field in a later phase.

## Spreadsheet data notes

- No data cleanup was needed. All 4 spreadsheets have consistent headers
  (`ID, Name, Rarity, Type, Cost, Effect, Archetype, Evolution Trigger,
  Evolves Into, Evolved Effect`), no trailing whitespace issues, no
  null costs on non-Power cards, no orphaned rows.
- Cogsmiths has one extra sheet: `Augment Reference` (quick reference
  table of the 9 augments). Did not ingest — same data is on the main
  sheet.
- Warp Riders has one extra sheet: `Flux State Reference` (A/B/C grid
  for 8 Flux cards + a Rifts table). Did not ingest — same data is
  parsed from the `Effect` column of the main sheet.

## Trigger classification: 18 TriggerTypes

The `TriggerType` enum in `evolution.ts` covers all trigger shapes I saw:

```
play_count, play_with_condition, play_in_boss, play_all_flux_states,
hold_turns, hold_then_play, kill_count, trigger_count,
trigger_with_condition, ability_use_count, attach_count, release_count,
release_with_condition, survived_combats, survived_attacks, revived,
draw_via_this, rift_open_count
```

Classification is done by a pattern-match script
(`/tmp/gen_cards.py` during this build, to be productionized under
`scripts/` in a later phase if desired). The heuristic is:

- Check for the most specific phrase first (e.g., "Released at 5 Lumens"
  maps to `release_with_condition` before "Released 5 times" falls through
  to `release_count`).
- `threshold` is the first integer in the trigger string, defaulting to 1
  for triggers like "Revived at least once" or "Played in all 3 states."
- The original trigger text is preserved verbatim in `conditionText` for
  downstream parsing when the combat engine is built.

## Ambiguities left for the combat-engine phase

These are effect descriptions I flagged while generating. Not
blocking — just log items for the phase that wires up resolution:

1. **Cogsmiths Inverter augment.** The xlsx effect row for Inverter says
   "Single-target → AoE." That's a transformation on the host card's
   *resolution*, not on its `description` field. The engine will need to
   detect which attacks are single-target and rewrite them on-the-fly.
   Design doc flags this as "mechanically strong, could be broken on
   Colossus Strike" — flagged for playtest.

2. **Warp Rider Schrödinger.** Multiplies all damage this turn by 0 or 2,
   *including damage taken*. The engine needs a turn-scoped damage
   multiplier that applies to both sides. Design doc says fallback is
   0.5x/2x if 0/2x feels too swingy.

3. **Warp Rider Chrono Break.** Replays "every card play from your
   previous turn, in order." Requires the engine to log each turn's card
   plays including resolution order, targets, and Flux states at time of
   play. Design doc specifically calls this out as "the easiest place to
   introduce bugs in the whole roguelite."

4. **Luminar Apex.** Releases every Channel card in hand *without playing
   them* — they don't go to the discard pile, don't consume energy, just
   fire their Release clauses simultaneously. The engine needs a
   "virtual play" path that bypasses cost, position, and discard.

5. **Pyroclast Heat-spending cards** (e.g. Blazing Charge "Deal 4 damage +
   4 per Heat spent (up to 5 Heat)"). The description doesn't specify
   whether "spent" is player-chosen or maximal. Assumed player-chosen
   (up to the cap). Flag if wrong.

6. **Luminar Mantra / Inner Sun.** Inner Sun grants 1 Lumen to the
   "leftmost" Channel card each turn. Engine needs a stable hand ordering
   — `CardInstance[]` is ordered by array position today, which works as
   long as hand mutations preserve index semantics.

7. **Signature card in deck at run start.** The starter deck has 10
   cards (5 + 4 + 1). The signature is a Power with `cost: 1`. Unclear
   whether it auto-plays turn 1 or needs to be drawn first. All 4
   signatures read as "At start of each turn…" — suggesting they need to
   be played once, then activate from then on. Assumed that; confirm.

## TODO hooks left for later phases

- [ ] `src/roguelite/engine/` — combat engine (pure functions over
  `RunState` + `CombatState`).
- [ ] `src/roguelite/engine/evolution.ts` — increments
  `CardInstance.evolutionProgress.count` on matching events and swaps the
  card's `cardId` when threshold hits.
- [ ] `src/roguelite/engine/flux.ts` — turn-start reroll for every
  non-locked Flux card in hand. Must be seeded per-run (run id + turn +
  instance id) for reproducibility.
- [ ] `src/roguelite/engine/augment.ts` — attach-augment-to-host flow,
  exhaust logic, persistence across combats.
- [ ] `src/roguelite/persistence/` — IndexedDB save that round-trips the
  full `RunState` including augmented deck.
- [ ] `src/roguelite/data/enemies.ts` — 3 acts × 12 steps per design note.
- [ ] `src/roguelite/data/rifts.ts` — 5 Rift types from the Warp Riders
  Flux State Reference sheet, already typed in `faction_mechanics.ts` but
  not instantiated yet.
- [x] Global rename Phantom Corsairs → Warp Riders across
  `src/types/Race.ts` and consumers. Done in a follow-up commit after
  this doc was written.
- [ ] Productionize the one-shot generator script under `scripts/` so the
  card data can be re-generated when the spreadsheets change.

## How to regenerate the card files

The generator script lives at `/tmp/gen_cards.py` during this build. To
regenerate after a spreadsheet edit:

```bash
pip install openpyxl
python3 /tmp/gen_cards.py
```

Output lands at `src/roguelite/cards/{pyroclast,luminar,cogsmiths,warp_riders}.ts`.
Signature cards and starter decks are hand-authored and not touched by the
generator. A proper `scripts/` version should be added in the next phase
so this isn't lost from `/tmp`.

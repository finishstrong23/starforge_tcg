# Phase 2 Combat Preview Notes

Last updated: May 17, 2026

## What Shipped

Phase 2 has started with exact in-hand previews for cards that have structured effects.

Files:

- `src/dungeon/engine/cardPreview.ts`
- `src/dungeon/components/CardComponent.tsx`
- `src/dungeon/components/HandComponent.tsx`
- `src/dungeon/components/CombatView.tsx`
- `tests/roguelite/cardPreview.test.ts`

## Behavior

Cards with structured effects now show compact preview pills in hand:

- `Deal N`
- `Block +N`
- `Heat +N`
- `Draw N`
- `Energy +N`
- `Enemy weak +N`
- `Choose: ... or ...`

The preview accounts for:

- Strength.
- Weak.
- Vulnerable.
- Dexterity.
- Upgraded `upgradeEffects`.
- Structured choice branches.

Legacy parser-only cards intentionally do not claim an exact preview yet.

## Current Scope

This covers the Phase 1 structured starter slice. The preview system is built as an engine helper so it can expand as more cards migrate away from parser text.

## Next Recommended Phase 2 Slice

Continue PH2-002 by adding previews for:

- Legacy deterministic parser cards while they await migration.
- Targeted enemy minions.
- Power trigger outcomes.
- Augment target previews.
- Potion previews.

Then move into PH2-003 tooltips for all preview terms.


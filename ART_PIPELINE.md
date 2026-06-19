# STARFORGE Art Pipeline

## Asset Roots

Generated production assets live under `public/` so Vite serves them without code changes.

```text
public/
  cards/{cardId}.png
  art/dungeon/backgrounds/{sceneId}.png
  art/dungeon/bosses/{bossId}.png
  art/dungeon/relics/{relicId}.png
  art/dungeon/factions/{raceLowercase}.png
  art/dungeon/bundles/{bundleId}.png
  art/dungeon/potions/{potionId}.png
  art/dungeon/map/{nodeType}.png
  art/ui/{assetId}.png
```

The game must never break when an asset is missing. Missing art falls back to procedural card art, emoji placeholders, initials, or simple symbolic UI.

## File Naming

- Use existing lowercase IDs exactly.
- Preserve underscores in IDs.
- Use `.png` for masters.
- Use `.webp` later only for optimized deploy copies.
- Keep `public/art/dungeon/factions/phantom_corsairs.png` as the runtime alias for the Warp Riders visual lane while the repo uses `Race.PHANTOM_CORSAIRS`.

## Basic Token Prompt Template

```text
Original STARFORGE Dungeon Run art, Basic Token Style.
Subject: [one symbolic subject].
Faction: [faction or neutral].
Composition: centered token, thick dark outline, 3-5 major shapes, plain backplate, readable at mobile size.
Colors: [3-5 flat colors].
Shading: one soft shadow color, one tiny highlight accent, no gradients except a simple backplate if needed.
Style: clean flat-color fantasy game asset, chunky simple shapes, minimal detail, consistent mobile-readable design.
Restrictions: no realism, no cinematic lighting, no complex rendering, no dense sci-fi detail, no anime polish, no text, no logos, no UI, no imitation of any specific game.
```

## Generation Workflow

1. Generate only a small batch.
2. Reject anything that looks like splash art, anime portraiture, realistic fantasy, dense sci-fi, or detailed concept art.
3. Copy accepted files into the target `public/` path.
4. Check each asset at actual UI size.
5. Do not generate the next batch until the current style is accepted in-game.

## Pilot Pack Order

1. 4 faction tokens: Pyroclast, Cogsmiths, Luminar, Warp Riders.
2. 4 flat scene backgrounds: combat, shop, rest, boss.
3. 6 card arts only after the faction/background style is approved.
4. Bosses, relics, map icons, and full card coverage after the card slice is approved.

## Quality Gates

- One-second read: subject is obvious immediately.
- Thumbnail test: recognizable at 72x105 card-hand size or 32px icon size.
- Shape test: main subject works in silhouette.
- Complexity test: 3-5 major shapes and 3-5 main colors.
- Consistency test: thick outlines and flat shading match the set.
- Rejection test: reject realistic lighting, complex rendering, over-detail, dark sci-fi, anime polish, or cinematic atmosphere.

## Implementation Contract

- Card art loads from `public/cards/` through `src/ui/components/CardArt.tsx`.
- Non-card dungeon art loads through `src/ui/utils/artAssets.ts` and `src/ui/components/ArtImage.tsx`.
- Art paths are additive and optional.
- Keep labels and tooltips for accessibility.

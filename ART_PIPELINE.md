# STARFORGE Art Pipeline

## Asset Roots

Generated production assets live under `public/` so Vite serves them without code changes.

```text
public/
  cards/{cardId}.svg
  art/dungeon/backgrounds/{sceneId}.png
  art/dungeon/bosses/{bossId}.svg
  art/dungeon/relics/{relicId}.svg
  art/dungeon/factions/{raceLowercase}.svg
  art/dungeon/bundles/{bundleId}.png
  art/dungeon/potions/{potionId}.svg
  art/dungeon/map/{nodeType}.svg
  art/ui/{assetId}.svg
```

The game must never break when an asset is missing. Missing art falls back to procedural card art, emoji placeholders, initials, or simple symbolic UI.

## File Naming

- Use existing lowercase IDs exactly.
- Preserve underscores in IDs.
- Use `.svg` for clean symbolic/token assets.
- Use `.png` only for generated faction splash masters and other future raster art that cannot be represented cleanly as SVG.
- Use `.webp` later only for optimized deploy copies.
- Keep `public/art/dungeon/factions/phantom_corsairs.png` as the legacy raster alias for the Warp Riders visual lane while the repo uses `Race.PHANTOM_CORSAIRS`.

## Background Prompt Template

Use this for main screen/background art. Backgrounds should be raster art, not
flat token SVGs.

```text
Original STARFORGE Dungeon Run art, Simple Cartoon Adventure Style.
Asset type: 16:9 game background.
Scene: [specific game screen/location].
Composition: wide full-screen stage, strong foreground framing, clear midground, quiet UI-safe space, readable large shapes.
Style: bright clean cartoon game background, confident dark outlines, appealing chunky forms, restrained detail, simple soft color fills, light texture, polished but not over-rendered.
Mood: fun, accessible, adventurous, broad-audience, energetic.
Restrictions: no crystals, no gemstones, no glowing mineral shards, no text, no logos, no UI, no characters unless explicitly needed, no photorealism, no cinematic clutter, no dense collectible-card rendering, no dark moody palette, no elementary flat icon look, no imitation of any specific game.
```

## Icon And Token Prompt Template

```text
Original STARFORGE Dungeon Run art, Friendly Arcade Token Style.
Subject: [one symbolic subject].
Faction: [faction or neutral].
Composition: centered token, thick dark outline, 3-5 major shapes, plain backplate, readable at mobile size.
Colors: [3-5 flat colors].
Shading: one soft shadow color, one tiny highlight accent, no gradients except a simple backplate if needed.
Style: clean flat-color arcade fantasy game asset, chunky simple shapes, minimal detail, expressive but not horror, fun and accessible, consistent mobile-readable design.
Restrictions: no realism, no cinematic lighting, no complex rendering, no dense sci-fi detail, no dark moody palette, no anime polish, no text, no logos, no UI, no imitation of any specific game.
```

## Generation Workflow

1. Generate only a small batch.
2. Reject anything that looks like splash art, anime portraiture, realistic fantasy, dense sci-fi, grim horror, detailed concept art, or crystal/gemstone filler.
3. Copy accepted files into the target `public/` path.
4. Check each asset at actual UI size.
5. Do not generate the next batch until the current style is accepted in-game.

## Pilot Pack Order

1. Background pilot: Pyroclast courtyard/class-select/combat tone-setter.
2. Background suite: combat, map, shop, rest, reward, event, boss, victory/defeat.
3. Enemy portrait style pass after background tone is approved.
4. Card/relic/potion/icon passes after enemies and backgrounds feel cohesive.

## Quality Gates

- One-second read: subject is obvious immediately.
- Thumbnail test: recognizable at 72x105 card-hand size or 32px icon size.
- Shape test: main subject works in silhouette.
- Complexity test: 3-5 major shapes and 3-5 main colors.
- Consistency test: thick outlines and flat shading match the set.
- Rejection test: reject realistic lighting, complex rendering, over-detail, dark sci-fi, grim fantasy, anime polish, cinematic atmosphere, crystal/gemstone filler, or elementary placeholder art.

## Current MVP Style Target

Pyroclast MVP art should feel like an original bright cartoon adventure card battler. Backgrounds should lead with simple readable composition; enemies, map nodes, and icons should inherit the same outline confidence and color warmth. The tone should be fun and accessible for a broad audience, not dark, moody, intimidating, over-rendered, or elementary.

## Implementation Contract

- Card art loads from `public/cards/` through `src/ui/components/CardArt.tsx`.
- Non-card dungeon art loads through `src/ui/utils/artAssets.ts` and `src/ui/components/ArtImage.tsx`.
- Art paths are additive and optional.
- Keep labels and tooltips for accessibility.

# Dungeon Background Policy

The Pyroclast MVP uses only original STARFORGE polished cartoon stage
backgrounds: bright, readable, professional raster scenes with confident
outlines, appealing shapes, and enough quiet space for UI.

Do not add unrelated uploaded JPG, PNG, or WebP scene art to this directory.
Combat backgrounds are selected deliberately through `index.ts` so the run
stays visually consistent and app-ready.

## Adding a New Background

1. Create a 16:9 PNG/WebP in `public/art/dungeon/backgrounds/`.
2. Keep the scene polished but readable: large shapes, clean silhouettes, and
   tasteful detail rather than flat icon art.
3. Leave open space for UI overlays.
4. Reject dark, moody, realistic, elementary, or cluttered scenes.
5. Add the new asset URL to `BACKGROUNDS` in `index.ts` only if combat should
   randomly use it.

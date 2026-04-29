# Dungeon Combat Backgrounds

Drop image files (`.jpg`, `.jpeg`, `.png`, `.webp`) into this directory and
they'll be bundled automatically by Vite. The combat view picks one at random
per encounter, seeded by the enemy ID so the same encounter always shows the
same scene.

## Adding new backgrounds

1. Save the image here. Recommended size: 1920×1080 or larger, JPG for
   photo-style scenes, PNG for crisp UI-style scenes.
2. Recommended naming: `bg-<theme>-<short-tag>.<ext>`.
   Examples:
   - `bg-starship-deck.jpg`
   - `bg-jungle-ruins.jpg`
   - `bg-forge-lava.jpg`
   - `bg-void-purple.jpg`
   - `bg-temple-fire.jpg`
3. Commit the file. The build picks it up on the next deploy.

## Code

The loader (`index.ts`) exports `BACKGROUNDS` (array of bundled URLs) and
`pickRandomBackground(seed?)`. `CombatView.tsx` calls it with the current
enemy's ID as the seed.

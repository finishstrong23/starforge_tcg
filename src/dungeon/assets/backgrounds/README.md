# Dungeon Combat Backgrounds

Drop compressed image files (`.jpg`, `.jpeg`, `.webp`) into this directory and
they'll be bundled automatically by Vite. The combat view picks one at random
per encounter, seeded by the enemy ID so the same encounter always shows the
same scene. Large `.png` files may live here as source art, but they are not
bundled into production builds.

## Adding new backgrounds

1. Save the image here. Recommended size: 1920x1080 or larger. Use JPG or WebP
   for anything that ships in the app.
2. Recommended naming: `bg-<theme>-<short-tag>.<ext>`.
   Examples:
   - `bg-starship-deck.jpg`
   - `bg-jungle-ruins.jpg`
   - `bg-forge-lava.jpg`
   - `bg-void-purple.jpg`
   - `bg-temple-fire.jpg`
3. Commit the compressed file. The build picks it up on the next deploy.

## Code

The loader (`index.ts`) exports `BACKGROUNDS` (array of bundled URLs) and
`pickRandomBackground(seed?)`. `CombatView.tsx` calls it with the current
enemy's ID as the seed.

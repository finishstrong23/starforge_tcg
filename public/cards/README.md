# Card Art — Drop Your PNGs Here

Adding custom art to a STARFORGE card is dead simple. Just drop a
PNG (or WEBP / JPG) into this folder, name it after the card, and
refresh the game. That's it — no card IDs, no code changes, no build
step.

## The simple way

Name the file after the card. Any of these work:

```
public/cards/Sparktinkerer.png      ← exact card name
public/cards/sparktinkerer.png      ← lowercase
public/cards/spark tinkerer.png     ← spaces are fine
public/cards/spark_tinkerer.png     ← underscores
public/cards/spark-tinkerer.png     ← hyphens
```

Capitalization, spaces, underscores and hyphens are all ignored when
matching. `Gear Golem.png`, `gear_golem.png` and `GearGolem.png`
all map to the same card.

**Supported extensions:** `.png`, `.webp`, `.jpg` (checked in that
order — first match wins).

## Which filename do I use?

Either:

1. Just type the card's display name as it appears in game — e.g.
   drop `Voidcaller.png` here for the card "Voidcaller".
2. Or run `npm run list-cards` to print every card name so you can
   copy-paste. It also shows the card ID in case you prefer that.

## What happens if there's no custom art?

You get the procedural SVG fallback — the auto-generated race-themed
artwork the game already ships with. Removing your PNG reverts to
the fallback automatically.

## Sizing

Any dimensions work. The game uses `object-fit: cover` so the image
is cropped to fit the card frame. For best results use a roughly
3:2 aspect ratio (e.g. `600 × 400`, `1200 × 800`) and keep the
subject centered. Transparent PNGs are fine.

## Legacy: using card IDs

The old `cog_m1.png` (card ID) naming still works as a fallback if
you already had files named that way. You don't need to rename
anything.

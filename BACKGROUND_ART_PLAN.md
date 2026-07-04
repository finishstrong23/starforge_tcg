# STARFORGE Background Art Plan

## Direction

Backgrounds set the game's tone. They should be **simple cartoon adventure
stage art**: bright, readable, charming, and professionally composed with
chunky shapes and restrained detail. They should not look like flat SVG token
art, dark sci-fi concept art, over-rendered collectible-card splash art, or
elementary placeholder drawings.

The quality bar is:

- broad-audience and fun
- clean silhouettes and confident outlines
- simple soft fills with light texture
- simple enough to sit behind UI
- artful enough to feel like a real game world
- no crystals, gemstones, or glowing mineral shards as default scenery
- no text, no logos, no UI baked into the image
- no imitation of any specific existing game

## Approved Pilot

| Asset | File | Usage | Status |
|---|---|---|---|
| Pyroclast courtyard | `public/art/dungeon/backgrounds/pyroclast_courtyard.png` | Class select and standard combat tone-setter | Pilot installed |
| Pyroclast combat arena | `public/art/dungeon/backgrounds/combat_pyroclast_arena.png` | Alternate combat background | Installed, not active |
| Ash garden encounter | `public/art/dungeon/backgrounds/combat_ash_garden.png` | Alternate combat background with crystals | Installed, not active |
| Ash garden encounter, no crystals | `public/art/dungeon/backgrounds/combat_ash_garden_no_crystals.png` | Alternate combat background | Installed, not active |
| Ash garden encounter, crystal v2 | `public/art/dungeon/backgrounds/combat_ash_garden_crystal_v2.png` | Alternate combat background | Installed, not active |
| Canyon river crossing | `public/art/dungeon/backgrounds/combat_canyon_river_crossing.png` | Alternate combat background with crystals | Installed, not active |
| Simple canyon river crossing | `public/art/dungeon/backgrounds/combat_canyon_river_simple.png` | Active standard enemy encounter background | Installed |
| Pyroclast overworld map | `public/art/dungeon/backgrounds/map_overworld.png` | Map route background | Installed |
| Pyroclast shop stall | `public/art/dungeon/backgrounds/shop_stall.png` | Alternate shop background | Installed, not active |
| Crystal bazaar shop | `public/art/dungeon/backgrounds/shop_crystal_bazaar.png` | Alternate shop background with crystals | Installed, not active |
| Canyon bazaar shop, no crystals | `public/art/dungeon/backgrounds/shop_bazaar_no_crystals.png` | Active shop background | Installed |
| Healing spring rest site | `public/art/dungeon/backgrounds/rest_healing_spring.png` | Alternate daytime rest site background | Installed, not active |
| Moonlit oasis rest site | `public/art/dungeon/backgrounds/rest_moonlit_oasis.png` | Alternate night rest site background | Installed, not active |
| Greenhouse rest site | `public/art/dungeon/backgrounds/rest_greenhouse.png` | Alternate rest site background with crystals | Installed, not active |
| Greenhouse rest site, no crystals | `public/art/dungeon/backgrounds/rest_greenhouse_no_crystals.png` | Active rest site background | Installed |
| Simple reward treasury | `public/art/dungeon/backgrounds/reward_treasury_simple.png` | Active reward background | Installed |

## Background Suite

Generate and approve these one at a time.

| Priority | Screen | Target file | Art brief |
|---|---|---|---|
| P0 | Class select / landing | `pyroclast_courtyard.png` | Bright Pyroclast training courtyard with banners, stone arena, sky, and UI-safe open space. Needs future no-crystal/simple pass. |
| P0 | Standard combat | `combat_canyon_river_simple.png` | Simple canyon river crossing with turquoise water, stepping stones, plain bridges, warm cliffs, orange flags, and a raised upper enemy platform. Installed and active. |
| P0 | Map screen | `map_overworld.png` | Cheerful illustrated route-map backdrop: cliffs, paths, banners, landmarks, and empty space for node graph. Installed. |
| P0 | Shop | `shop_bazaar_no_crystals.png` | Bright canyon bazaar carved into stone, with colorful awnings, pottery, potion shelves, relic pedestals, coin trays, and readable central UI space. Installed and active. |
| P0 | Rest site | `rest_greenhouse_no_crystals.png` | Cozy greenhouse built into ancient stone ruins, with mint healing plants, cushions, basins, pottery, vines, and warm sunlight. Installed and active. |
| P1 | Reward | `reward_treasury_simple.png` | Simple bright treasure alcove with chests, coin bowls, banners, pottery, warm stone, and a clear reward pedestal. Installed and active. |
| P1 | Event | `event_crossroads.png` | Curious crossroads alcove with signposts, banners, and mystery props without going spooky. |
| P1 | Boss | `boss_gate.png` | Big imposing volcanic gate/arena, still colorful and readable, not horror or grimdark. |
| P2 | Victory | `victory_plaza.png` | Celebration version of the courtyard with brighter sky and banners. |
| P2 | Defeat | `defeat_plaza.png` | Softer dimmed version of the courtyard, disappointed but not depressing. |

## Prompt Template

```text
Use case: stylized-concept
Asset type: 1920x1080 game background for STARFORGE Dungeon Run
Primary request: Create an original simple cartoon adventure background for [screen]. It should be bright, fun, readable, and professionally illustrated, not elementary or placeholder-like.
Scene/backdrop: [specific location].
Style/medium: original clean cartoon game background, confident thick outlines, appealing chunky forms, simple soft color fills, light texture, restrained detail, polished but not over-rendered.
Composition/framing: wide 16:9 full-screen background, large readable shapes, strong foreground framing, clear midground, open UI-safe space in [area].
Lighting/mood: warm, welcoming, adventurous, energetic, broad-audience.
Color palette: [screen-specific palette].
Constraints: no crystals, no gemstones, no glowing mineral shards, no text, no logos, no UI, no characters unless explicitly requested, no photorealism, no horror, no grim fantasy, no dense sci-fi machinery, no dense collectible-card rendering, no childish doodles, no flat SVG icon look, no imitation of any specific existing game.
```

## Approval Rule

Do not generate the full suite in one blind batch. Approve the visual quality
of one background in-game first, then use it as the style anchor for the next
screen. If a background looks too dark, too plain, too detailed, or too childish,
reject it before wiring it into the game.

# STARFORGE Art Asset Manifest

This manifest tracks the Basic Token Style asset replacement plan. Previous generated faction/background art is rejected because it was too detailed, too polished, and too illustrative.

## Style Anchor

```text
Original STARFORGE Dungeon Run art, Basic Token Style.
Clean flat-color fantasy game asset with thick dark outlines, chunky simple shapes, symbolic readable subject, minimal detail, limited palette, soft single shadow, tiny highlight accents, bright friendly colors, consistent mobile-readable design.
No realism, no cinematic lighting, no complex rendering, no dense sci-fi detail, no anime polish, no text, no logos, no UI, no imitation of any specific game.
```

## Path Conventions

| Asset type | Target filename |
|---|---|
| Card art | `public/cards/{cardId}.png` |
| Boss art | `public/art/dungeon/bosses/{bossId}.png` |
| Relic icon | `public/art/dungeon/relics/{relicId}.png` |
| Faction token | `public/art/dungeon/factions/{raceLowercase}.png` |
| Card bundle art | `public/art/dungeon/bundles/{bundleId}.png` |
| Potion icon | `public/art/dungeon/potions/{potionId}.png` |
| Scene background | `public/art/dungeon/backgrounds/{sceneId}.png` |
| Map icon | `public/art/dungeon/map/{nodeType}.png` |
| UI art | `public/art/ui/{assetId}.png` |

## Current Visual Audit

| Surface | Current source | Replacement target |
|---|---|---|
| Core card art | `src/ui/components/CardArt.tsx` | `public/cards/{cardId}.png` |
| Dungeon faction select | `src/ui/components/DungeonRun.tsx` | Basic faction tokens in `public/art/dungeon/factions/` |
| Dungeon backgrounds | `src/ui/components/DungeonRun.tsx` | Flat scene panels in `public/art/dungeon/backgrounds/` |
| Dungeon bosses | `src/dungeon/DungeonData.ts` | Basic enemy tokens in `public/art/dungeon/bosses/` |
| Dungeon relics | `src/dungeon/DungeonData.ts` | Basic relic icons in `public/art/dungeon/relics/` |
| Card bundles | `src/dungeon/DungeonData.ts` | Basic bundle icons in `public/art/dungeon/bundles/` |

## Pilot Assets

| Asset id | Type | Faction | Priority | Target filename | Basic Token subject |
|---|---|---|---|---|---|
| `faction:pyroclast` | Faction token | Pyroclast | P0 | `public/art/dungeon/factions/pyroclast.png` | Lava mask plus hammer and flame triangle |
| `faction:cogsmiths` | Faction token | Cogsmiths | P0 | `public/art/dungeon/factions/cogsmiths.png` | Gear core plus wrench and simple drone |
| `faction:luminar` | Faction token | Luminar | P0 | `public/art/dungeon/factions/luminar.png` | Halo shield plus star prism |
| `faction:warpriders` | Faction token | Warp Riders | P0 | `public/art/dungeon/factions/warpriders.png` | Portal ring plus crescent blade and split mask |
| `faction:phantom_corsairs` | Faction token alias | Warp Riders / Phantom Corsairs | P0 | `public/art/dungeon/factions/phantom_corsairs.png` | Same file as `warpriders.png` while repo uses `Race.PHANTOM_CORSAIRS` |
| `background:combat` | Scene panel | Neutral | P0 | `public/art/dungeon/backgrounds/combat.png` | Flat arena panel with ring floor, banners, crystals |
| `background:shop` | Scene panel | Neutral | P0 | `public/art/dungeon/backgrounds/shop.png` | Flat merchant stall panel with relic shapes |
| `background:rest` | Scene panel | Neutral | P0 | `public/art/dungeon/backgrounds/rest.png` | Flat camp shrine panel with cushions and healing flame |
| `background:boss` | Scene panel | Neutral | P0 | `public/art/dungeon/backgrounds/boss.png` | Flat boss door panel with crystal seal |

## Next Card Slice

Generate these only after the P0 faction/background style is approved in-game.

| Asset id | Target filename | Basic Token subject |
|---|---|---|
| `card:pyro_flame_imp` | `public/cards/pyro_flame_imp.png` | Simple flame imp head token |
| `card:pyro_emberblade` | `public/cards/pyro_emberblade.png` | Molten sword icon |
| `card:pyro_fire_bolt` | `public/cards/pyro_fire_bolt.png` | Fire bolt shape from small gauntlet |
| `card:cog_gear_grinder` | `public/cards/cog_gear_grinder.png` | Blocky gear creature token |
| `card:cog_iron_defender` | `public/cards/cog_iron_defender.png` | Shield robot icon |
| `card:cog_repair_bot` | `public/cards/cog_repair_bot.png` | Chunky repair drone token |

## Generation Notes

- Prefer symbolic art over character portraits.
- No generated asset should look like a full splash illustration.
- Backgrounds should be flat panels behind UI, not detailed landscapes.
- Relic and potion icons should look like collectible board-game pieces.

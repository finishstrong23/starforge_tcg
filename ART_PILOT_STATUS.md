# STARFORGE Pilot Art Pack Status

## Current Target

**Basic Token Style**: flat, bright, symbolic, thick-lined, low-detail, and consistent.

The previous generated faction/background packs were rejected because they were too dark, too sci-fi, too glossy, or too detailed. The paths below have since been overwritten with the Basic Token pass.

## Replaced Paths

- `public/art/dungeon/factions/pyroclast.png`
- `public/art/dungeon/factions/cogsmiths.png`
- `public/art/dungeon/factions/luminar.png`
- `public/art/dungeon/factions/warpriders.png`
- `public/art/dungeon/factions/phantom_corsairs.png`
- `public/art/dungeon/backgrounds/combat.png`
- `public/art/dungeon/backgrounds/shop.png`
- `public/art/dungeon/backgrounds/rest.png`
- `public/art/dungeon/backgrounds/boss.png`
- `public/art/dungeon/backgrounds/draft.svg`
- `public/art/dungeon/backgrounds/reward.svg`
- `public/art/dungeon/backgrounds/blessing.svg`
- `public/art/dungeon/backgrounds/event.svg`
- `public/art/dungeon/backgrounds/victory.svg`
- `public/art/dungeon/backgrounds/defeat.svg`

## P0 Replacement Status

| Asset id | Runtime path | Status | QA notes |
|---|---|---|---|
| `faction:pyroclast` | `public/art/dungeon/factions/pyroclast.png` | Installed Basic Token pass | Lava mask, hammer, and flame triangle token. |
| `faction:cogsmiths` | `public/art/dungeon/factions/cogsmiths.png` | Installed Basic Token pass | Gear core, wrench, and drone token. |
| `faction:luminar` | `public/art/dungeon/factions/luminar.png` | Installed Basic Token pass | Halo shield and star prism token. |
| `faction:warpriders` | `public/art/dungeon/factions/warpriders.png` | Installed Basic Token pass | Portal, split mask, and crescent blade token. |
| `faction:phantom_corsairs` | `public/art/dungeon/factions/phantom_corsairs.png` | Installed Basic Token alias | Same accepted file as `warpriders.png`. |
| `background:combat` | `public/art/dungeon/backgrounds/combat.png` | Installed Basic Token pass | Flat arena panel with banners and crystals. |
| `background:shop` | `public/art/dungeon/backgrounds/shop.png` | Installed Basic Token pass | Flat shop panel with relic silhouettes. |
| `background:rest` | `public/art/dungeon/backgrounds/rest.png` | Installed Basic Token pass | Flat rest panel with cushions and healing flame. |
| `background:boss` | `public/art/dungeon/backgrounds/boss.png` | Installed Basic Token pass | Flat boss-door panel with crystal seal. |
| `background:supporting` | `public/art/dungeon/backgrounds/{draft,reward,blessing,event,victory,defeat}.svg` | Installed Basic Token SVG pass | Six supporting screens now use flat token scene panels behind UI overlays. |
| `map:*` | `public/art/dungeon/map/{nodeType}.svg` | Installed Basic Token SVG pass | Seven map node tokens are live through the art registry. |
| `enemy:BOSS-*` | `public/art/dungeon/bosses/{bossId}.svg` | Installed Basic Token SVG pass | Three boss tokens are live through the art registry. |
| `enemy:EL-*` | `public/art/dungeon/enemies/{enemyId}.svg` | Installed Basic Token SVG pass | Four elite enemy tokens are live through the art registry. |
| `enemy:E1-*`, `E2-*`, `E3-*` | `public/art/dungeon/enemies/{enemyId}.svg` | Installed Basic Token SVG pass | Twenty normal enemy tokens are live through the art registry. |
| `potion:*` | `public/art/dungeon/potions/{potionId}.svg` | Installed Basic Token SVG pass | Fourteen potion tokens are live through inventory, rewards, pickup, and shop UI. |
| `relic:*` | `public/art/dungeon/relics/{relicId}.svg` | Installed Basic Token SVG pass | All twenty-six relic tokens are live through relic bar, rewards, and shop UI. |
| `card:C/P/L/W pilot` | `public/cards/{cardId}.svg` | Installed Basic Token SVG pass | Sixteen pilot card arts are live through card rendering. |
| `card:authored-batch-2` | `public/cards/{cardId}.svg` | Installed Basic Token SVG pass | Thirty-three starter and early reward cards now have authored tokens. |
| `card:authored-batch-3` | `public/cards/{cardId}.svg` | Installed Basic Token SVG pass | Thirty uncommon reward cards now have authored tokens. |
| `card:authored-batch-4` | `public/cards/{cardId}.svg` | Installed Basic Token SVG pass | Forty rare and high-impact reward cards now have authored tokens. |
| `card:authored-batch-5` | `public/cards/{cardId}.svg` | Installed Basic Token SVG pass | Fifty-seven final gap cards now have authored tokens, completing current card coverage. |
| `intent:*` | `public/art/dungeon/ui/intent_{intentType}.svg` | Installed Basic Token SVG pass | Six enemy intent tokens are live through combat enemy telegraphs. |
| `status:*` | `public/art/dungeon/status/{statusId}.svg` | Installed Basic Token SVG pass | Nine status tokens are live through enemy, player, and card status chips. |
| `ui:piles` | `public/art/dungeon/ui/{card_back,draw_pile,discard_pile}.svg` | Installed Basic Token SVG pass | Draw/discard pile tokens are live in hand/combat UI; card back asset is ready for future card-back surfaces. |
| `ui:shop_misc` | `public/art/dungeon/ui/{gold,card_removal}.svg` | Installed Basic Token SVG pass | Shop prices, gold balance, and card-removal service now use token icons. |
| `ui:tutorial-icons` | `public/art/dungeon/ui/tutorial_{energy,relics,map}.svg` | Installed Basic Token SVG pass | First-run tutorial now uses token icons instead of emoji glyphs. |
| `potion:drink-burst` | `public/art/dungeon/potions/effects/{category}.svg` | Installed Basic Token SVG pass | Potion drink animation now uses category token sigils, including Phoenix. |
| `ui:faction-resource-panel` | `public/art/dungeon/ui/resource_{faction}.svg` | Installed Basic Token SVG pass | Combat HUD resource panel now has faction-specific token header art. |
| `combat-log:icon-strategy` | `src/dungeon/components/CombatView.tsx` | Installed text-token pass | Combat log now strips raw glyph prefixes and displays consistent category badges. |
| `map:path-motifs` | `src/dungeon/components/MapView.tsx` | Installed SVG route pass | Map connectors now use rounded board-route rails with active path markers. |
| `ui:text-glyph-cleanup` | Dungeon UI components | Installed visible text pass | Major screen headers, modal labels, status fallbacks, and action chips now avoid emoji/mojibake. |
| `card:surface-glyph-cleanup` | `src/dungeon/components/CardComponent.tsx` | Installed card text-chip pass | Card stats, Lumens, Flux, summons, augments, and status fallbacks now use readable text chips. |
| `ui:potion-modal-fallbacks` | Potion inventory, pickup, shop, lumen modal, telemetry panel | Installed text fallback pass | Potion and small modal fallback labels now use readable ASCII chips instead of emoji/mojibake. |
| `blessing:*` | `public/art/dungeon/blessings/{blessingId}.svg`, `BlessingView` | Installed Basic Token SVG pass | Six act-start blessing choices now render simple token icons with ASCII fallbacks. |
| `combat:choice-modal-labels` | `CombatView` | Installed text fallback pass | Choice and augment modal headers now avoid decorative glyph prefixes. |

## Next Batch

Phase 2 registry foundation is implemented. The active dungeon UI now has image slots for map nodes, cards, enemies, intents, status chips, relics, potions, shop offers, reward offers, and card pile UI. Missing cards use a procedural Basic Token SVG fallback instead of a tiny faction glyph, while other missing images still fall back safely to their current glyph/emoji.

The next batch should generate the smallest asset set that changes every core screen.

| Asset id | Target path | Status |
|---|---|---|
| `card:remaining` | `public/cards/{cardId}.svg` | Complete for current dungeon card IDs; procedural fallback remains as a safe future-card fallback |
| `ui:remaining-polish` | `public/art/dungeon/ui/{assetId}.svg` | Later utility polish outside the shop |

## QA Checklist

- Thick dark outlines.
- 3-5 major shapes.
- 3-5 main colors.
- One soft shadow color.
- One tiny highlight accent.
- Symbolic subject, not a detailed scene.
- Readable at mobile card size.
- Reject realism, cinematic lighting, dense sci-fi, anime polish, painterly splash detail, and text.

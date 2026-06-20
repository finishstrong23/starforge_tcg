# STARFORGE Art Asset Manifest

This manifest tracks the Basic Token Style asset replacement plan. Previous generated faction/background art is rejected because it was too detailed, too polished, and too illustrative.

## Style Anchor

```text
Original STARFORGE Dungeon Run art, Basic Token Style.
Clean flat-color fantasy game asset with thick dark outlines, chunky simple shapes, symbolic readable subject, minimal detail, limited palette, soft single shadow, tiny highlight accents, bright friendly colors, consistent mobile-readable design.
No realism, no cinematic lighting, no complex rendering, no dense sci-fi detail, no anime polish, no text, no logos, no UI, no imitation of any specific game.
```

## Path Conventions

The first Basic Token implementation pass uses SVG for simple symbolic icons because it keeps outlines crisp, file sizes small, and revisions fast. PNG remains acceptable for generated painterly/raster assets such as backgrounds and future card art.

| Asset type | Target filename |
|---|---|
| Card art | `public/cards/{cardId}.svg` |
| Boss art | `public/art/dungeon/bosses/{bossId}.svg` |
| Relic icon | `public/art/dungeon/relics/{relicId}.svg` |
| Faction token | `public/art/dungeon/factions/{raceLowercase}.png` |
| Card bundle art | `public/art/dungeon/bundles/{bundleId}.png` |
| Potion icon | `public/art/dungeon/potions/{potionId}.svg` |
| Scene background | `public/art/dungeon/backgrounds/{sceneId}.png` |
| Map icon | `public/art/dungeon/map/{nodeType}.svg` |
| Status icon | `public/art/dungeon/status/{statusId}.png` |
| UI art | `public/art/dungeon/ui/{assetId}.png` |

## Phase 1 Full In-Game Visual Audit

Status key:

- `Done`: Basic Token image exists and is wired into the active dungeon UI.
- `Placeholder`: emoji, plain glyph, gradient, text-only visual, or shape-only UI still carries the visual meaning.
- `Missing asset`: UI has a slot or data concept but no production image path yet.

| Surface | Active source | Current state | Priority | Replacement target |
|---|---|---|---|---|
| Faction select art | `src/dungeon/components/DungeonRoot.tsx` | Done for 4 factions | P0 | `public/art/dungeon/factions/{faction}.png` |
| Main faction-select background | `src/dungeon/components/DungeonRoot.tsx` | Done, uses combat scene | P1 | Dedicated `public/art/dungeon/backgrounds/class_select.png` |
| Combat backgrounds | `src/dungeon/components/CombatView.tsx`, `src/dungeon/assets/backgrounds/index.ts` | Partly done; Basic Token combat/boss mixed with old detailed jpgs | P0 | `public/art/dungeon/backgrounds/combat_{theme}.png` |
| Shop background | `src/dungeon/components/ShopView.tsx` | Done, but needs visual QA | P0 | `public/art/dungeon/backgrounds/shop.png` |
| Rest background | `src/dungeon/components/RestSiteView.tsx` | Done, but needs visual QA | P0 | `public/art/dungeon/backgrounds/rest.png` |
| Boss background | `src/dungeon/components/CombatView.tsx` | Done for boss combat | P0 | `public/art/dungeon/backgrounds/boss.png` |
| Draft screen background | `src/dungeon/components/DraftView.tsx` | Placeholder gradient | P1 | `public/art/dungeon/backgrounds/draft.png` |
| Reward screen background | `src/dungeon/components/RewardView.tsx` | Placeholder gradient and emoji headers | P1 | `public/art/dungeon/backgrounds/reward.png` |
| Blessing screen background | `src/dungeon/components/BlessingView.tsx` | Placeholder gradient and blessing emojis | P1 | `public/art/dungeon/backgrounds/blessing.png` |
| Event screen background | `src/dungeon/components/EventView.tsx` | Placeholder gradient/tone colors | P1 | `public/art/dungeon/backgrounds/event.png` |
| Run end screen | `src/dungeon/components/DungeonRoot.tsx` | Emoji victory/defeat header | P2 | `public/art/dungeon/backgrounds/victory.png`, `defeat.png` |
| Map node icons | `src/dungeon/components/MapView.tsx` | SVG Basic Token pass installed | P0 | `public/art/dungeon/map/{nodeType}.svg` |
| Map connector/path art | `src/dungeon/components/MapView.tsx` | Dotted SVG lines only | P1 | Optional path/route motif in CSS/SVG |
| Enemy art | `src/dungeon/data/enemies.ts`, `src/dungeon/components/EnemyComponent.tsx` | 24 normal/elite enemy SVGs installed | P0 | `public/art/dungeon/enemies/{enemyId}.svg` |
| Boss art | `src/dungeon/data/enemies.ts`, `src/dungeon/components/EnemyComponent.tsx` | 3 boss SVGs installed | P0 | `public/art/dungeon/bosses/{bossId}.svg` |
| Enemy intent icons | `src/dungeon/components/EnemyComponent.tsx` | Emoji for defend/summon and text symbols for intents | P1 | `public/art/dungeon/ui/intent_{intentType}.png` |
| Enemy/player status icons | `src/dungeon/components/EnemyComponent.tsx`, `CombatView.tsx`, `CardComponent.tsx` | Emoji status badges | P1 | `public/art/dungeon/status/{statusId}.png` |
| Card art | `src/dungeon/components/CardComponent.tsx` | 16-card SVG pilot installed; remaining cards use fallback faction glyphs | P0 for first 16, P1 for all 176 | `public/cards/{cardId}.svg` |
| Card backs / draw pile / discard pile | `src/dungeon/components/HandComponent.tsx` | Unicode playing-card glyphs | P1 | `public/art/dungeon/ui/card_back.png`, `draw_pile.png`, `discard_pile.png` |
| Relic icons | `src/dungeon/data/relics.ts`, `RelicBar.tsx`, rewards/shop | 26 SVG icons installed | P0 for visible relic bar/shop/rewards | `public/art/dungeon/relics/{relicId}.svg` |
| Potion icons | `src/dungeon/components/PotionInventory.tsx`, `PotionPickupModal.tsx`, `ShopView.tsx` | 14 SVG icons installed | P0 | `public/art/dungeon/potions/{potionId}.svg` |
| Potion drink burst | `src/dungeon/components/PotionDrinkBurst.tsx` | Emoji sigils in animation | P2 | `public/art/dungeon/potions/effects/{category}.png` or CSS token shapes |
| Faction resource panel | `src/dungeon/components/FactionResourcePanel.tsx` | Text/color meter only | P1 | `public/art/dungeon/ui/resource_{faction}.png` |
| Tutorial icons | `src/dungeon/components/TutorialOverlay.tsx` | Emoji step icons | P2 | `public/art/dungeon/ui/tutorial_{step}.png` |
| Telemetry/debug icon | `src/dungeon/components/TelemetryDebugPanel.tsx` | Emoji chart | P3 | Keep developer-only or replace with CSS icon |
| Combat log emojis | `src/dungeon/engine/combat.ts`, `relicEffects.ts`, `potions.ts` | Emoji embedded in log strings | P2 | Text-only log tags or registry-backed small icons |

## Phase 1 Priority Rollout

1. P0 map/enemy/potion/relic/card pilot: these are visible constantly during a run and still look placeholder-heavy.
2. P1 supporting screens: draft, reward, blessing, event, draw/discard piles, status and intent icons.
3. P2 polish: combat log icon strategy, run-end screen, tutorial icons, potion burst sigils.
4. P3 developer-only telemetry visuals.

## Active Asset Queues

### Map Nodes

All map icons are P0 because the map is the route-selection screen and currently uses emoji symbols.

| Asset id | Type | Priority | Target filename | Notes |
|---|---|---|---|---|
| `map:combat` | Map icon | P0 | `public/art/dungeon/map/combat.png` | Crossed simple blades or burst token |
| `map:elite` | Map icon | P0 | `public/art/dungeon/map/elite.png` | Crowned skull-mask token, not realistic skull |
| `map:boss` | Map icon | P0 | `public/art/dungeon/map/boss.png` | Chunky crown/door seal token |
| `map:rest` | Map icon | P0 | `public/art/dungeon/map/rest.png` | Camp shrine/healing flame token |
| `map:shop` | Map icon | P0 | `public/art/dungeon/map/shop.png` | Coin pouch/merchant sign token |
| `map:treasure` | Map icon | P0 | `public/art/dungeon/map/treasure.png` | Chest/gem token |
| `map:event` | Map icon | P0 | `public/art/dungeon/map/event.png` | Question rune/token swirl |

### Enemies And Bosses

Enemy data source: `src/dungeon/data/enemies.ts`. All 27 enemy entries currently use emoji `art` fields. Bosses should get larger square token art first, then the 24 normal/elite enemies.

| Asset id | Type | Priority | Target filename | Subject |
|---|---|---|---|---|
| `enemy:BOSS-01` | Boss art | P0 | `public/art/dungeon/bosses/BOSS-01.png` | Scoria Titan |
| `enemy:BOSS-02` | Boss art | P0 | `public/art/dungeon/bosses/BOSS-02.png` | Null Shepherd |
| `enemy:BOSS-03` | Boss art | P0 | `public/art/dungeon/bosses/BOSS-03.png` | The Starforged |
| `enemy:E1-01` | Enemy art | P0 | `public/art/dungeon/enemies/E1-01.png` | Cogsworn Scout |
| `enemy:E1-02` | Enemy art | P0 | `public/art/dungeon/enemies/E1-02.png` | Ember Houndling |
| `enemy:E1-03` | Enemy art | P0 | `public/art/dungeon/enemies/E1-03.png` | Chantling |
| `enemy:E1-04` | Enemy art | P0 | `public/art/dungeon/enemies/E1-04.png` | Rift Nibbler |
| `enemy:E1-05` | Enemy art | P0 | `public/art/dungeon/enemies/E1-05.png` | Wire-Tangle |
| `enemy:E1-06` | Enemy art | P0 | `public/art/dungeon/enemies/E1-06.png` | Glasspicker |
| `enemy:E1-07` | Enemy art | P0 | `public/art/dungeon/enemies/E1-07.png` | Sump Gremlin |
| `enemy:E1-08` | Enemy art | P0 | `public/art/dungeon/enemies/E1-08.png` | Null Suit |
| `enemy:E2-01` | Enemy art | P1 | `public/art/dungeon/enemies/E2-01.png` | Magma Strider |
| `enemy:E2-02` | Enemy art | P1 | `public/art/dungeon/enemies/E2-02.png` | Halo Sentinel |
| `enemy:E2-03` | Enemy art | P1 | `public/art/dungeon/enemies/E2-03.png` | Forgewright |
| `enemy:E2-04` | Enemy art | P1 | `public/art/dungeon/enemies/E2-04.png` | Rift-Stalker |
| `enemy:E2-05` | Enemy art | P1 | `public/art/dungeon/enemies/E2-05.png` | Blast Furnace |
| `enemy:E2-06` | Enemy art | P1 | `public/art/dungeon/enemies/E2-06.png` | Circuit Priest |
| `enemy:E2-07` | Enemy art | P1 | `public/art/dungeon/enemies/E2-07.png` | Split Reaver |
| `enemy:E3-01` | Enemy art | P1 | `public/art/dungeon/enemies/E3-01.png` | Ashen Colossus |
| `enemy:E3-02` | Enemy art | P1 | `public/art/dungeon/enemies/E3-02.png` | Starbound Inquisitor |
| `enemy:E3-03` | Enemy art | P1 | `public/art/dungeon/enemies/E3-03.png` | Warforge Sovereign |
| `enemy:E3-04` | Enemy art | P1 | `public/art/dungeon/enemies/E3-04.png` | Paradox Maw |
| `enemy:E3-05` | Enemy art | P1 | `public/art/dungeon/enemies/E3-05.png` | Broken Choir |
| `enemy:EL-01` | Elite art | P0 | `public/art/dungeon/enemies/EL-01.png` | Gearforged Juggernaut |
| `enemy:EL-02` | Elite art | P0 | `public/art/dungeon/enemies/EL-02.png` | Sunfire Herald |
| `enemy:EL-03` | Elite art | P0 | `public/art/dungeon/enemies/EL-03.png` | Magma Tyrant |
| `enemy:EL-04` | Elite art | P0 | `public/art/dungeon/enemies/EL-04.png` | Rift Warden |

### Cards

Card data source: `src/dungeon/data/cards.ts`. There are 176 current dungeon cards: 44 Cogsmiths, 40 Pyroclast IDs present plus starter/reward cards through `P-044`, 43 Luminar IDs present through `L-044`, and 44 Warp Riders. The active card UI currently renders only a faction glyph in the art box, so every card needs an image slot and fallback.

Card art target: `public/cards/{cardId}.svg`.

P0 first card-art slice:

| Asset id | Type | Faction | Priority | Target filename | Subject |
|---|---|---|---|---|---|
| `card:C-001` | Card art | Cogsmiths | Done | `public/cards/C-001.svg` | Rivet strike bolt icon |
| `card:C-002` | Card art | Cogsmiths | Done | `public/cards/C-002.svg` | Plate shield token |
| `card:C-011` | Card art | Cogsmiths | Done | `public/cards/C-011.svg` | Small deploy drone token |
| `card:C-014` | Card art | Cogsmiths | Done | `public/cards/C-014.svg` | Augment edge module |
| `card:P-001` | Card art | Pyroclast | Done | `public/cards/P-001.svg` | Cinder strike flame fist |
| `card:P-002` | Card art | Pyroclast | Done | `public/cards/P-002.svg` | Scale guard shield |
| `card:P-003` | Card art | Pyroclast | Done | `public/cards/P-003.svg` | Kindle spark token |
| `card:P-018` | Card art | Pyroclast | Done | `public/cards/P-018.svg` | Forge heart icon |
| `card:L-001` | Card art | Luminar | Done | `public/cards/L-001.svg` | Light jab prism |
| `card:L-002` | Card art | Luminar | Done | `public/cards/L-002.svg` | Glow ward halo shield |
| `card:L-008` | Card art | Luminar | Done | `public/cards/L-008.svg` | Chant halo token |
| `card:L-024` | Card art | Luminar | Done | `public/cards/L-024.svg` | Sacred geometry icon |
| `card:W-001` | Card art | Warp Riders | Done | `public/cards/W-001.svg` | Glitch strike slash |
| `card:W-002` | Card art | Warp Riders | Done | `public/cards/W-002.svg` | Warp step footprint portal |
| `card:W-004` | Card art | Warp Riders | Done | `public/cards/W-004.svg` | Unstable bolt token |
| `card:W-016` | Card art | Warp Riders | Done | `public/cards/W-016.svg` | Dimensional rift icon |

Full card queue after P0:

| Faction | Current IDs | Priority | Notes |
|---|---|---|---|
| Cogsmiths | `C-001` through `C-044` | P1 | Use gears, wrenches, drones, plates, rivets, simple robot tokens |
| Pyroclast | `P-001` through `P-044`, with data gaps where IDs are unused | P1 | Use flame triangles, lava masks, hammers, fists, shields, molten hearts |
| Luminar | `L-001` through `L-044`, with data gaps where IDs are unused | P1 | Use halos, stars, prisms, shields, beams, symmetric tokens |
| Warp Riders | `W-001` through `W-044` | P1 | Use portals, crescent blades, split masks, glitch slashes, rift rings |

### Relics

Relic data source: `src/dungeon/data/relics.ts`. All 26 relics are wired through the art registry and now have Basic Token SVG icons.

P0 relics are common, starter, and shop-visible relics. Boss/rare relics are P1 unless they are commonly surfaced by rewards.

| Asset id | Type | Priority | Target filename | Subject |
|---|---|---|---|---|
| `relic:R-S01` | Relic icon | Done | `public/art/dungeon/relics/R-S01.svg` | Forgeheart Ember |
| `relic:R-S02` | Relic icon | Done | `public/art/dungeon/relics/R-S02.svg` | Pattern Caliper |
| `relic:R-S03` | Relic icon | Done | `public/art/dungeon/relics/R-S03.svg` | Suncaller's Lens |
| `relic:R-S04` | Relic icon | Done | `public/art/dungeon/relics/R-S04.svg` | Navigator's Bone |
| `relic:R-C01` through `relic:R-C08` | Relic icons | Done | `public/art/dungeon/relics/{relicId}.svg` | Common relic set |
| `relic:R-U01` through `relic:R-U05` | Relic icons | Done | `public/art/dungeon/relics/{relicId}.svg` | Uncommon relic set |
| `relic:R-R01` through `relic:R-R05` | Relic icons | Done | `public/art/dungeon/relics/{relicId}.svg` | Rare relic set |
| `relic:R-B01` through `relic:R-B03` | Boss relic icons | Done | `public/art/dungeon/relics/{relicId}.svg` | Boss relic set |
| `relic:R-A01` | Relic icon | Done | `public/art/dungeon/relics/R-A01.svg` | Shard of the Choir |

### Potions

Potion data source: `src/dungeon/data/potions.ts`. All 14 potion surfaces are wired through the art registry and now have Basic Token SVG icons.

| Asset id | Type | Priority | Target filename | Liquid/shape cue |
|---|---|---|---|---|
| `potion:block_draught` | Potion icon | Done | `public/art/dungeon/potions/block_draught.svg` | Blue shield bottle |
| `potion:swift_brew` | Potion icon | Done | `public/art/dungeon/potions/swift_brew.svg` | Teal wing bottle |
| `potion:surge_vial` | Potion icon | Done | `public/art/dungeon/potions/surge_vial.svg` | Yellow energy vial |
| `potion:kindling_flask` | Potion icon | Done | `public/art/dungeon/potions/kindling_flask.svg` | Orange spark flask |
| `potion:focus_tincture` | Potion icon | Done | `public/art/dungeon/potions/focus_tincture.svg` | Gold strength dropper |
| `potion:stoneblood_elixir` | Potion icon | Done | `public/art/dungeon/potions/stoneblood_elixir.svg` | Gray-blue heavy elixir |
| `potion:cleansing_draft` | Potion icon | Done | `public/art/dungeon/potions/cleansing_draft.svg` | Clear green cleansing bottle |
| `potion:forgefire_flask` | Potion icon | Done | `public/art/dungeon/potions/forgefire_flask.svg` | Red forgefire flask |
| `potion:lumen_infusion` | Potion icon | Done | `public/art/dungeon/potions/lumen_infusion.svg` | Ivory/gold star vial |
| `potion:wyrmfire_breath` | Potion icon | Done | `public/art/dungeon/potions/wyrmfire_breath.svg` | Dragon flame bottle |
| `potion:aegis_mixture` | Potion icon | Done | `public/art/dungeon/potions/aegis_mixture.svg` | Shield crest mixture |
| `potion:tacticians_brew` | Potion icon | Done | `public/art/dungeon/potions/tacticians_brew.svg` | Board-piece brew |
| `potion:phoenix_vial` | Potion icon | Done | `public/art/dungeon/potions/phoenix_vial.svg` | Phoenix sun vial |
| `potion:chronoshift_philter` | Potion icon | Done | `public/art/dungeon/potions/chronoshift_philter.svg` | Violet clock philter |

### Status, Intent, And UI Icons

| Asset id | Type | Priority | Target filename | Current source |
|---|---|---|---|---|
| `status:burn` | Status icon | P1 | `public/art/dungeon/status/burn.png` | `CombatView`, `EnemyComponent`, `CardComponent` |
| `status:poison` | Status icon | P1 | `public/art/dungeon/status/poison.png` | `CombatView`, `EnemyComponent`, `CardComponent` |
| `status:shield` | Status icon | P1 | `public/art/dungeon/status/shield.png` | Player/enemy shield badges |
| `status:strength` | Status icon | P1 | `public/art/dungeon/status/strength.png` | Status badges |
| `status:weak` | Status icon | P1 | `public/art/dungeon/status/weak.png` | Status badges |
| `status:vulnerable` | Status icon | P1 | `public/art/dungeon/status/vulnerable.png` | Status badges |
| `status:barrier` | Status icon | P1 | `public/art/dungeon/status/barrier.png` | Status badges |
| `status:stealth` | Status icon | P2 | `public/art/dungeon/status/stealth.png` | Status badges |
| `status:phase` | Status icon | P1 | `public/art/dungeon/status/phase.png` | Status badges |
| `intent:attack` | Intent icon | P1 | `public/art/dungeon/ui/intent_attack.png` | `EnemyComponent` |
| `intent:defend` | Intent icon | P1 | `public/art/dungeon/ui/intent_defend.png` | `EnemyComponent` |
| `intent:buff` | Intent icon | P1 | `public/art/dungeon/ui/intent_buff.png` | `EnemyComponent` |
| `intent:debuff` | Intent icon | P1 | `public/art/dungeon/ui/intent_debuff.png` | `EnemyComponent` |
| `intent:summon` | Intent icon | P1 | `public/art/dungeon/ui/intent_summon.png` | `EnemyComponent` |
| `intent:special` | Intent icon | P1 | `public/art/dungeon/ui/intent_special.png` | `EnemyComponent` |
| `ui:card_back` | UI art | P1 | `public/art/dungeon/ui/card_back.png` | `HandComponent` |
| `ui:draw_pile` | UI art | P1 | `public/art/dungeon/ui/draw_pile.png` | `HandComponent` |
| `ui:discard_pile` | UI art | P1 | `public/art/dungeon/ui/discard_pile.png` | `HandComponent` |
| `ui:gold` | UI icon | P1 | `public/art/dungeon/ui/gold.png` | `ShopView` |
| `ui:card_removal` | UI icon | P2 | `public/art/dungeon/ui/card_removal.png` | `ShopView` |

## Pilot Assets Already Created

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

## Completed Visible Token Slice

Phase 2 registry and UI image slots are implemented. The first visible Basic Token SVG slice is installed:

1. Map node icons: 7 assets.
2. Enemy art: 24 normal/elite assets.
3. Boss art: 3 assets.
4. Potion icons: 14 assets.
5. Relic icons: 26 assets.

The next remaining visual batch is the 16-card pilot from the P0 card-art table above.

## Generation Notes

- Prefer symbolic art over character portraits.
- No generated asset should look like a full splash illustration.
- Backgrounds should be flat panels behind UI, not detailed landscapes.
- Relic and potion icons should look like collectible board-game pieces.

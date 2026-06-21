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
| Potion effect icon | `public/art/dungeon/potions/effects/{category}.svg` |
| Scene background | `public/art/dungeon/backgrounds/{sceneId}.png` |
| Map icon | `public/art/dungeon/map/{nodeType}.svg` |
| Status icon | `public/art/dungeon/status/{statusId}.svg` |
| UI art | `public/art/dungeon/ui/{assetId}.svg` |

## Phase 1 Full In-Game Visual Audit

Status key:

- `Done`: Basic Token image exists and is wired into the active dungeon UI.
- `Placeholder`: plain glyph, gradient, text-only visual, or shape-only UI still carries the visual meaning.
- `Missing asset`: UI has a slot or data concept but no production image path yet.

| Surface | Active source | Current state | Priority | Replacement target |
|---|---|---|---|---|
| Faction select art | `src/dungeon/components/DungeonRoot.tsx` | Done for 4 factions | P0 | `public/art/dungeon/factions/{faction}.png` |
| Main faction-select background | `src/dungeon/components/DungeonRoot.tsx` | Done, uses combat scene | P1 | Dedicated `public/art/dungeon/backgrounds/class_select.png` |
| Combat backgrounds | `src/dungeon/components/CombatView.tsx`, `src/dungeon/assets/backgrounds/index.ts` | Partly done; Basic Token combat/boss mixed with old detailed jpgs | P0 | `public/art/dungeon/backgrounds/combat_{theme}.png` |
| Shop background | `src/dungeon/components/ShopView.tsx` | Done, but needs visual QA | P0 | `public/art/dungeon/backgrounds/shop.png` |
| Rest background | `src/dungeon/components/RestSiteView.tsx` | Done, but needs visual QA | P0 | `public/art/dungeon/backgrounds/rest.png` |
| Boss background | `src/dungeon/components/CombatView.tsx` | Done for boss combat | P0 | `public/art/dungeon/backgrounds/boss.png` |
| Draft screen background | `src/dungeon/components/DraftView.tsx` | Done with Basic Token SVG scene panel | P1 | `public/art/dungeon/backgrounds/draft.svg` |
| Reward screen background | `src/dungeon/components/RewardView.tsx` | Done with Basic Token SVG scene panel | P1 | `public/art/dungeon/backgrounds/reward.svg` |
| Blessing screen background | `src/dungeon/components/BlessingView.tsx` | Done with Basic Token SVG scene panel | P1 | `public/art/dungeon/backgrounds/blessing.svg` |
| Event screen background | `src/dungeon/components/EventView.tsx` | Done with Basic Token SVG scene panel | P1 | `public/art/dungeon/backgrounds/event.svg` |
| Run end screen | `src/dungeon/components/DungeonRoot.tsx` | Done with victory/defeat Basic Token SVG scene panels | P2 | `public/art/dungeon/backgrounds/victory.svg`, `defeat.svg` |
| Map node icons | `src/dungeon/components/MapView.tsx` | SVG Basic Token pass installed | P0 | `public/art/dungeon/map/{nodeType}.svg` |
| Map connector/path art | `src/dungeon/components/MapView.tsx` | Done with rounded route rails, active-path markers, and muted future paths | P1 | CSS/SVG route motif |
| Enemy art | `src/dungeon/data/enemies.ts`, `src/dungeon/components/EnemyComponent.tsx` | 24 normal/elite enemy SVGs installed | P0 | `public/art/dungeon/enemies/{enemyId}.svg` |
| Boss art | `src/dungeon/data/enemies.ts`, `src/dungeon/components/EnemyComponent.tsx` | 3 boss SVGs installed | P0 | `public/art/dungeon/bosses/{bossId}.svg` |
| Enemy intent icons | `src/dungeon/components/EnemyComponent.tsx` | Done with six Basic Token SVGs | P1 | `public/art/dungeon/ui/intent_{intentType}.svg` |
| Enemy/player status icons | `src/dungeon/components/EnemyComponent.tsx`, `CombatView.tsx`, `CardComponent.tsx` | Done with nine Basic Token SVGs | P1 | `public/art/dungeon/status/{statusId}.svg` |
| Card art | `src/dungeon/components/CardComponent.tsx` | Done for all 176 current dungeon cards; procedural fallback remains for future cards | P0 for first 16, P1 for all 176 | `public/cards/{cardId}.svg` |
| Card backs / draw pile / discard pile | `src/dungeon/components/HandComponent.tsx`, `src/dungeon/components/CombatView.tsx` | Done for draw/discard/card-back SVGs; draw/discard and empty-hand card back wired into active UI | P1 | `public/art/dungeon/ui/card_back.svg`, `draw_pile.svg`, `discard_pile.svg` |
| Relic icons | `src/dungeon/data/relics.ts`, `RelicBar.tsx`, rewards/shop | 26 SVG icons installed | P0 for visible relic bar/shop/rewards | `public/art/dungeon/relics/{relicId}.svg` |
| Potion icons | `src/dungeon/components/PotionInventory.tsx`, `PotionPickupModal.tsx`, `ShopView.tsx` | 14 SVG icons installed | P0 | `public/art/dungeon/potions/{potionId}.svg` |
| Potion drink burst | `src/dungeon/components/PotionDrinkBurst.tsx` | Done with eight category SVGs plus Phoenix SVG | P2 | `public/art/dungeon/potions/effects/{category}.svg` |
| Faction resource panel | `src/dungeon/components/FactionResourcePanel.tsx` | Done with four Basic Token SVG header icons | P1 | `public/art/dungeon/ui/resource_{faction}.svg` |
| Tutorial icons | `src/dungeon/components/TutorialOverlay.tsx` | Done with three Basic Token SVGs | P2 | `public/art/dungeon/ui/tutorial_{step}.svg` |
| Telemetry/debug icon | `src/dungeon/components/TelemetryDebugPanel.tsx` | Emoji chart | P3 | Keep developer-only or replace with CSS icon |
| Combat log prefixes | `src/dungeon/components/CombatView.tsx`, engine log producers | Done with renderer-level text-token badges; engine strings remain compatible | P2 | Text-only log tags |

## Phase 1 Priority Rollout

1. P0 map/enemy/potion/relic/card pilot: these are visible constantly during a run and still look placeholder-heavy.
2. P1 supporting screens: draft, reward, blessing, event, draw/discard piles, status and intent icons.
3. P2 polish: combat log icon strategy, run-end screen, tutorial icons, potion burst sigils.
4. P3 developer-only telemetry visuals.

## Active Asset Queues

### Map Nodes

All map icons were P0 because the map is the route-selection screen. The current map icon set is installed as Basic Token SVGs.

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

Enemy data source: `src/dungeon/data/enemies.ts`. All 27 enemy entries now have Basic Token SVG art paths through the art registry, with short text-token fallbacks in data if an image fails to load.

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

Card data source: `src/dungeon/data/cards.ts`. There are 176 current dungeon cards: 44 Cogsmiths, 40 Pyroclast IDs present plus starter/reward cards through `P-044`, 43 Luminar IDs present through `L-044`, and 44 Warp Riders. The active card UI loads authored SVGs first, then falls back to a procedural Basic Token SVG when an authored file is missing.

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

Batch 2 starter/reward authored SVGs:

| Asset id | Type | Faction | Priority | Target filename | Subject |
|---|---|---|---|---|---|
| `card:C-003` through `card:C-010` | Card art | Cogsmiths | Done | `public/cards/{cardId}.svg` | Tinker, wrench, hammer, bolt, shield, jab, wire, servo tokens |
| `card:C-041` | Card art | Cogsmiths | Done | `public/cards/C-041.svg` | Starter wrench token |
| `card:P-004` through `card:P-011` | Card art | Pyroclast | Done | `public/cards/{cardId}.svg` | Flame, volley, ash, oil, fist, heat, charge, cauterize tokens |
| `card:P-041` | Card art | Pyroclast | Done | `public/cards/P-041.svg` | Starter spark token |
| `card:L-003` through `card:L-007` | Card art | Luminar | Done | `public/cards/{cardId}.svg` | Meditation, prism, radiance, halo, beam tokens |
| `card:L-041` | Card art | Luminar | Done | `public/cards/L-041.svg` | Starter glimmer token |
| `card:W-003`, `card:W-005` through `card:W-009` | Card art | Warp Riders | Done | `public/cards/{cardId}.svg` | Twist, shield, slash, echo, strike, crack tokens |
| `card:W-041` through `card:W-043` | Card art | Warp Riders | Done | `public/cards/{cardId}.svg` | Starter strike, step, shimmer tokens |

Batch 3 uncommon reward authored SVGs:

| Asset id | Type | Faction | Priority | Target filename | Subject |
|---|---|---|---|---|---|
| `card:C-017` through `card:C-024` | Card art | Cogsmiths | Done | `public/cards/{cardId}.svg` | Heavy wrench, shock coil, sentry, plate, modular strike, automate, bore, blades tokens |
| `card:P-017`, `card:P-019` through `card:P-024` | Card art | Pyroclast | Done | `public/cards/{cardId}.svg` | Dragonbreath, molten skin, overclock, pyroclasm, soot, meltdown, glass cannon tokens |
| `card:L-017` through `card:L-023` | Card art | Luminar | Done | `public/cards/{cardId}.svg` | Sunbeam, aurora, mantra, focus, solar bolt, halo, flash tokens |
| `card:W-017` through `card:W-024` | Card art | Warp Riders | Done | `public/cards/{cardId}.svg` | Probability, horizon, chaos, rift, paradox, time, tesseract, shield tokens |

Batch 4 rare and high-impact authored SVGs:

| Asset id | Type | Faction | Priority | Target filename | Subject |
|---|---|---|---|---|---|
| `card:C-031` through `card:C-040` | Card art | Cogsmiths | Done | `public/cards/{cardId}.svg` | Mecha form, warforge, colossus, titan, commandment, core, machine god, exotic core, inverter, reinforce tokens |
| `card:P-031` through `card:P-040` | Card art | Pyroclast | Done | `public/cards/{cardId}.svg` | Sunfire blade, volcano, immolate, phoenix, ring, fury, forge master, everburn, magma tide, dragon roar tokens |
| `card:L-031` through `card:L-040` | Card art | Luminar | Done | `public/cards/{cardId}.svg` | Supernova, everlight, transcendence, gravitas, stellar body, illumination, sun blessing, divine intervention, godlight, apex tokens |
| `card:W-031` through `card:W-040` | Card art | Warp Riders | Done | `public/cards/{cardId}.svg` | Archer, choir, burning face, mistress, omniverse, rift master, Schrodinger, chrono break, reality anchor, genesis bolt tokens |

Batch 5 final card gap authored SVGs:

| Asset id | Type | Faction | Priority | Target filename | Subject |
|---|---|---|---|---|---|
| `card:C-012`, `card:C-013`, `card:C-015`, `card:C-016`, `card:C-025` through `card:C-030`, `card:C-042` through `card:C-044` | Card art | Cogsmiths | Done | `public/cards/{cardId}.svg` | Toolkit, overdrive, augment, nanite, assembly, starter, and support tokens |
| `card:P-012` through `card:P-016`, `card:P-025` through `card:P-030`, `card:P-042` through `card:P-044` | Card art | Pyroclast | Done | `public/cards/{cardId}.svg` | Ember, wind, lance, rekindle, resolve, combustion, dancer, starter, and support tokens |
| `card:L-009` through `card:L-016`, `card:L-025` through `card:L-030`, `card:L-042` through `card:L-044` | Card art | Luminar | Done | `public/cards/{cardId}.svg` | Sunrise, hymn, gleam, ward, harmonize, ray, step, star, starter, and insight tokens |
| `card:W-010` through `card:W-015`, `card:W-025` through `card:W-030`, `card:W-044` | Card art | Warp Riders | Done | `public/cards/{cardId}.svg` | Whisper, anomaly, step, blade, fold, guard, entropy, singularity, mirror, and drift tokens |

Full card queue after P0:

| Faction | Current IDs | Priority | Notes |
|---|---|---|---|
| Cogsmiths | `C-001` through `C-044` | Done | All current Cogsmiths dungeon cards have authored SVG tokens |
| Pyroclast | `P-001` through `P-044` | Done | All current Pyroclast dungeon cards have authored SVG tokens |
| Luminar | `L-001` through `L-044` | Done | All current Luminar dungeon cards have authored SVG tokens |
| Warp Riders | `W-001` through `W-044` | Done | All current Warp Riders dungeon cards have authored SVG tokens |

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
| `status:burn` | Status icon | Done | `public/art/dungeon/status/burn.svg` | `CombatView`, `EnemyComponent`, `CardComponent` |
| `status:poison` | Status icon | Done | `public/art/dungeon/status/poison.svg` | `CombatView`, `EnemyComponent`, `CardComponent` |
| `status:shield` | Status icon | Done | `public/art/dungeon/status/shield.svg` | Player/enemy shield badges |
| `status:strength` | Status icon | Done | `public/art/dungeon/status/strength.svg` | Status badges |
| `status:weak` | Status icon | Done | `public/art/dungeon/status/weak.svg` | Status badges |
| `status:vulnerable` | Status icon | Done | `public/art/dungeon/status/vulnerable.svg` | Status badges |
| `status:barrier` | Status icon | Done | `public/art/dungeon/status/barrier.svg` | Status badges |
| `status:stealth` | Status icon | Done | `public/art/dungeon/status/stealth.svg` | Status badges |
| `status:phase` | Status icon | Done | `public/art/dungeon/status/phase.svg` | Status badges |
| `intent:attack` | Intent icon | Done | `public/art/dungeon/ui/intent_attack.svg` | `EnemyComponent` |
| `intent:defend` | Intent icon | Done | `public/art/dungeon/ui/intent_defend.svg` | `EnemyComponent` |
| `intent:buff` | Intent icon | Done | `public/art/dungeon/ui/intent_buff.svg` | `EnemyComponent` |
| `intent:debuff` | Intent icon | Done | `public/art/dungeon/ui/intent_debuff.svg` | `EnemyComponent` |
| `intent:summon` | Intent icon | Done | `public/art/dungeon/ui/intent_summon.svg` | `EnemyComponent` |
| `intent:special` | Intent icon | Done | `public/art/dungeon/ui/intent_special.svg` | `EnemyComponent` |
| `rift:cost` through `rift:chaos` | Rift icon | Done | `public/art/dungeon/rifts/{riftType}.svg` | `CombatView` active rift chips |
| `ui:card_back` | UI art | Done | `public/art/dungeon/ui/card_back.svg` | `HandComponent` empty-hand state |
| `ui:draw_pile` | UI art | Done | `public/art/dungeon/ui/draw_pile.svg` | `HandComponent`, `CombatView` |
| `ui:discard_pile` | UI art | Done | `public/art/dungeon/ui/discard_pile.svg` | `HandComponent` |
| `ui:gold` | UI icon | Done | `public/art/dungeon/ui/gold.svg` | `ShopView` prices and gold balance |
| `ui:card_removal` | UI icon | Done | `public/art/dungeon/ui/card_removal.svg` | `ShopView` removal service |
| `ui:combat_log` | UI icon | Done | `public/art/dungeon/ui/combat_log.svg` | `CombatView` log toggle button |
| `ui:tutorial_energy` | UI icon | Done | `public/art/dungeon/ui/tutorial_energy.svg` | `TutorialOverlay` |
| `ui:tutorial_relics` | UI icon | Done | `public/art/dungeon/ui/tutorial_relics.svg` | `TutorialOverlay` |
| `ui:tutorial_map` | UI icon | Done | `public/art/dungeon/ui/tutorial_map.svg` | `TutorialOverlay` |
| `blessing:vigor` through `blessing:channel` | Blessing icons | Done | `public/art/dungeon/blessings/{blessingId}.svg` | `BlessingView` |
| `ui:resource_pyroclast` | UI icon | Done | `public/art/dungeon/ui/resource_pyroclast.svg` | `FactionResourcePanel` |
| `ui:resource_cogsmiths` | UI icon | Done | `public/art/dungeon/ui/resource_cogsmiths.svg` | `FactionResourcePanel` |
| `ui:resource_luminar` | UI icon | Done | `public/art/dungeon/ui/resource_luminar.svg` | `FactionResourcePanel` |
| `ui:resource_warpriders` | UI icon | Done | `public/art/dungeon/ui/resource_warpriders.svg` | `FactionResourcePanel` |
| `potion_effect:Defense` through `potion_effect:Extreme` | Potion effect icons | Done | `public/art/dungeon/potions/effects/{category}.svg` | `PotionDrinkBurst` |
| `potion_effect:Phoenix` | Potion effect icon | Done | `public/art/dungeon/potions/effects/phoenix.svg` | `PotionDrinkBurst` |

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
| `background:draft` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/draft.svg` | Flat draft-table panel with card-token shapes |
| `background:reward` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/reward.svg` | Flat reward shrine panel with token prizes |
| `background:blessing` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/blessing.svg` | Flat halo shrine panel with simple blessing geometry |
| `background:event` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/event.svg` | Flat mystery panel with portal/question motif |
| `background:victory` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/victory.svg` | Flat crown and cleared-path panel |
| `background:defeat` | Scene panel | Neutral | Done | `public/art/dungeon/backgrounds/defeat.svg` | Flat broken-mask panel |

## Completed Visible Token Slice

Phase 2 registry and UI image slots are implemented. The first visible Basic Token SVG slice is installed:

1. Map node icons: 7 assets.
2. Enemy art: 24 normal/elite assets.
3. Boss art: 3 assets.
4. Potion icons: 14 assets.
5. Relic icons: 26 assets.
6. Card fallback coverage: every card without authored art now receives a procedural Basic Token SVG based on faction, type, and id.
7. Combat UI icons: 6 intent SVGs, 9 status SVGs, and draw/discard/card-back SVGs.
8. Supporting scene panels: draft, reward, blessing, event, victory, and defeat SVG backgrounds.
9. Shop utility icons: gold and card-removal SVGs wired into shop pricing and services.
10. Card art batch 2: 33 starter and early reward SVGs.
11. Card art batch 3: 30 uncommon reward SVGs.
12. Card art batch 4: 40 rare and high-impact reward SVGs.
13. Card art batch 5: 57 final gap SVGs, completing authored coverage for all current dungeon cards.
14. Tutorial icons: 3 Basic Token SVGs wired into first-run tutorial.
15. Potion drink burst sigils: 8 category SVGs plus Phoenix SVG wired into potion use animation.
16. Faction resource panel icons: 4 Basic Token SVGs wired into the combat HUD resource panel.
17. Combat log polish: raw glyph prefixes are stripped at render time and replaced by consistent text-token badges.
18. Map route polish: dotted connector lines replaced with rounded board-route rails and active path markers.
19. Visible text/glyph polish: major dungeon screen headers, modal labels, status fallbacks, and action chips now avoid emoji/mojibake.
20. Card surface glyph polish: card stats, Lumens, Flux, summons, augments, and status fallbacks now use readable text chips.
21. Potion/modal fallback polish: potion inventory, pickup, lumen allocation, shop potion prices, and telemetry fallback labels now use readable ASCII chips instead of emoji/mojibake.
22. Blessing/token modal polish: act-start blessing choices now use six Basic Token SVG icons with ASCII fallbacks instead of raw emoji glyphs; combat choice and augment modal headers no longer use decorative glyph prefixes.
23. Relic/enemy fallback polish: relic and enemy data fallback art fields now use readable ASCII chips instead of raw emoji glyphs if SVG assets fail to load.
24. Enemy intent text polish: enemy intent descriptions and death notes now use simple ASCII separators for cleaner combat tooltips.
25. Relic/potion log source polish: relic effect logs and potion drink logs now emit clean text so combat log badges do not depend on stripped emoji prefixes.
26. Core combat log source polish: combat engine logs now emit clean text without emoji prefixes, arrows, or multiply glyphs.
27. Ascension text polish: ascension modifier summaries now use simple ASCII separators in run setup and summary UI.
28. Relic log emoji cleanup: Starseer's Pendant now emits clean text instead of a raw star glyph in combat logs.
29. Token naming cleanup: status, rift, intent, enemy, and relic fallback internals now use token language instead of emoji language.
30. Rift HUD token art: active rifts now use four Basic Token SVG icons in the combat status row instead of a bare text marker.
31. Power HUD token art: active Power chips now use card token art with a PWR fallback instead of a plain text marker.
32. Empty hand card-back art: the combat hand area now shows the Basic Token card-back asset when no cards are in hand.
33. Combat log button token art: the top-right combat-log toggle now uses a Basic Token SVG instead of a raw visible glyph.

The next remaining visual batch is remaining low-priority developer/debug polish and final visual QA cleanup.

## Generation Notes

- Prefer symbolic art over character portraits.
- No generated asset should look like a full splash illustration.
- Backgrounds should be flat panels behind UI, not detailed landscapes.
- Relic and potion icons should look like collectible board-game pieces.

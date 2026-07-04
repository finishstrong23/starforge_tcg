# STARFORGE Art Direction V2

## Goal

V2 explores a simpler visual direction without scrapping the current art. The
target is **Chunky Board Game Token Style**: clean, readable, low-detail game
pieces on shallow tabletop-style stages.

This direction is inspired by the design principle of simple readable card
battlers, not by copying any shipped game's exact art, compositions, characters,
UI, card frames, enemies, or rendering style.

## Style Anchor

```text
Original STARFORGE Dungeon Run art, Chunky Board Game Token Style.
Simple clean cartoon game art with thick dark outlines, large readable shapes, flat colors, one soft shadow, minimal texture, low detail, and a playful tabletop card-battler feel.
Use shallow stage-board composition, not expansive scenery.
No crystals, no gemstones, no cinematic lighting, no painterly splash art, no dense fantasy rendering, no text, no logos, no UI, no imitation of any specific game.
```

## Core Rules

- Favor game pieces over illustrations.
- Use 3-6 large shapes per focal subject.
- Use 4-6 main colors per asset.
- Use one soft shadow and one tiny highlight at most.
- Keep outlines thick, dark, and confident.
- Backgrounds should feel like shallow stage boards, not locations to explore.
- No crystals, gemstones, or mineral shards as decoration.
- No complex rendering, cinematic lighting, or dense fantasy painting.
- No large scenic vistas unless the UI truly needs a screen-setting image.

## Background Rules

- 1920x1080.
- Treat the screen like a board mat with a few props.
- Use 60% or more UI-safe open space.
- Use 2-3 depth layers max: foreground edge props, play surface, simple backdrop.
- Prefer stone tiles, cloth banners, painted signs, water strips, plants, doors,
  props, and silhouettes over worldbuilding detail.
- Enemy stages should be obvious at a glance.
- Reward/shop/rest/event backgrounds should be recognizable from one big prop.

## Card Art Rules

- 1024x1536.
- One symbol, object, or creature token.
- No scene illustration.
- No portrait rendering.
- No tiny details that vanish in hand size.
- Use a simple backplate or colored shape behind the subject.

## Enemy Rules

- 1024x1024.
- One readable enemy token.
- Expressive, broad-audience, and game-like.
- Not mascot-cute, not scary-realistic.
- One obvious threat idea per enemy.

## Test Pack

Generate only three V2 pilot assets before replacing anything:

1. `v2_combat_board_pyroclast.png` - shallow combat board background.
2. `v2_enemy_ember_hound.png` - one enemy portrait/token.
3. `v2_card_emberblade.png` - one vertical card art token.

## Pilot Candidates

These files are approval candidates only. They are not wired into the active
game yet.

| Asset | Path | Notes |
|---|---|---|
| Combat board | `public/art/dungeon/v2/pilots/v2_combat_board_pyroclast.png` | Best test for shallow stage-board composition and reduced world detail. |
| Enemy token | `public/art/dungeon/v2/pilots/v2_enemy_ember_hound.png` | Reads clearly, but may still need flatter shading in the final pass. |
| Card token | `public/art/dungeon/v2/pilots/v2_card_emberblade.png` | Strongest V2 read: one object, simple silhouette, clear mobile-scale shape. |

## Approval Criteria

- It reads faster than the current art.
- It has less world background and less detail.
- It feels like a consistent game-piece system.
- It still looks professional, not childish or temporary.
- It does not rely on crystals, glow, painterly polish, or dense props.

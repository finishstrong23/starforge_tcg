# STARFORGE Dungeon Run UI Readability Plan

Last updated: June 22, 2026

## Problem

The game currently feels like a website being zoomed in and out, not like an app with an intentional play surface. At 100% browser zoom, the most important information is too small:

- Hand cards are only `108x155`.
- Normal card rules text is `7px`.
- Card names are `9px`.
- Preview pills are `6px`.
- Player/enemy HUD labels often sit between `7px` and `11px`.
- Combat uses many absolute-positioned panels, so the hand is squeezed between fixed left/right offsets.
- Browser zoom changes the whole composition, which makes the UI feel unstable instead of designed.

The core issue is not only font size. The whole combat screen needs an app-style layout model with fixed readability targets.

## Design Goal

At 100% browser zoom, on a normal desktop display and on mobile, the player should be able to read:

1. Every card name in hand.
2. The primary effect of every card in hand.
3. Enemy HP, intent, and statuses.
4. Player HP, energy, Heat, potions, draw/discard, and End Turn.
5. The currently selected card preview.

No player should need browser zoom to play.

## UI Principles

### 1. App Surface, Not Web Page

Dungeon Run should behave like a fixed game stage inside the browser:

- One full-screen app shell.
- No normal webpage scrolling during combat.
- Stable combat regions: top HUD, enemy zone, board zone, hand zone, bottom action bar.
- Browser zoom should not be part of normal play.

### 2. Bigger Cards, Less Tiny Text

The current card is too small for rules text. Target card sizes:

| Context | Current | Target |
|---|---:|---:|
| Hand card desktop | `108x155` | `150x215` minimum |
| Draft/reward card | `158x226` | `180x260` |
| Board compact card | `64x88` | `78x108` |
| Card name | `9px` | `13px` |
| Card rules text | `7px` | `12px` minimum |
| Preview pill text | `6px` | `10px` |

Cards should show fewer things better. Tiny rarity letters and cramped keyword chips should lose priority to the card name, cost, art symbol, and rules text.

### 3. Inspect Instead Of Cram

Small hand cards cannot carry every detail. Add a card inspect panel:

- Hover/focus/long-press a card to show a large readable card detail panel.
- Selected card detail should appear near the right side or bottom center.
- The inspect panel should show full text, preview math, keywords, upgrades, and status explanations.
- Hand cards only need abbreviated readable text.

This gives us both readable cards and enough screen space for combat.

### 4. Use A Readable Font Stack

Current `Segoe UI, Tahoma, Geneva, Verdana` is serviceable but not game-optimized. Use a cleaner app font stack:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Do not rely on external webfont loading for MVP. If a font is packaged later, use Inter or Atkinson Hyperlegible.

Rules:

- Body UI minimum: `13px`.
- Important labels: `14px`.
- Card text minimum: `12px`.
- Combat log minimum: `12px`.
- Avoid excessive letter spacing on small labels; it makes text harder to read.
- Do not use viewport-scaled font sizes.

### 5. Symmetric Combat Composition

Current combat has:

- Player HUD top-left.
- Menu/log top-right.
- Faction resource right.
- Relics left.
- Energy bottom-left.
- Heat/discard/end turn bottom-right.
- Hand squeezed between `left: 110` and `right: 220`.

This makes the screen feel asymmetrical and cramped.

Target composition:

```text
Top bar:
  Player HP / gold / potions    Enemy intent/status    Menu/log

Center:
  Enemy area
  Enemy minions
  Player minions

Bottom:
  Energy     Hand cards     End Turn
  Heat/resource bar integrated above or below hand

Side drawer:
  Relics, deck, discard, combat log, run menu
```

The permanent combat surface should prioritize cards and enemy state. Secondary info should move into collapsible drawers or compact bars.

## Recommended Phases

### Phase 1 - Readability Baseline

Goal: Make the game playable at 100% zoom without redesigning every screen.

Tasks:

- Increase normal `CardComponent` hand card size to about `150x215`.
- Increase hand card text to `12px`, name to `13px`, preview pills to `10px`.
- Increase draft/reward card size and text slightly.
- Replace excessive small label letter spacing in combat HUD.
- Increase combat HUD labels to at least `11-13px`.
- Allow the hand row to horizontally scroll or fan instead of wrapping into tiny rows.
- Keep board cards compact, but make their tooltips/inspect view readable.

Acceptance:

- At 100% zoom, hand cards are readable on a 1440px or wider desktop.
- At 100% zoom, a 5-card hand does not overlap HUD.
- Card text no longer uses sub-10px font sizes except decorative rarity/status microtext.

### Phase 2 - Combat Layout Reframe

Goal: Stop squeezing the hand between fixed HUD panels.

Tasks:

- Convert combat screen from scattered absolute panels to a fixed grid:
  - `top: status/menu`
  - `middle: enemy/board`
  - `bottom: resource + hand + actions`
- Move Heat from the bottom-right mini-HUD into a full bottom resource strip.
- Move discard/draw/relics into either the bottom strip or a side drawer.
- Keep End Turn in a consistent bottom-right action slot.
- Add responsive breakpoints:
  - Desktop: large hand cards, side inspect panel.
  - Tablet: horizontal hand scroll, bottom inspect panel.
  - Mobile: one selected/inspect card enlarged, hand carousel.

Acceptance:

- Combat looks centered and intentional.
- The hand owns enough horizontal space for readable cards.
- HUD no longer competes with card text.

### Phase 3 - Card Inspect System

Goal: Let cards stay playable while full text is always accessible.

Tasks:

- Add a `CardInspectPanel` component.
- Show full card text and exact preview math for hovered/selected card.
- Support mouse hover, keyboard focus, and touch long-press/tap.
- Include status/keyword explanations.
- Use the same inspect panel in draft, reward, shop, deck viewer, and combat.

Acceptance:

- Every card can be inspected without changing browser zoom.
- Long card text is readable without cramming it onto the small card body.
- Mobile users can inspect cards with one tap.

### Phase 4 - App Shell And Scale Tokens

Goal: Make sizing consistent and tunable.

Tasks:

- Add CSS variables for dungeon UI scale:
  - `--dungeon-font-xs`
  - `--dungeon-font-sm`
  - `--dungeon-font-md`
  - `--dungeon-card-hand-w`
  - `--dungeon-card-hand-h`
  - `--dungeon-card-board-w`
  - `--dungeon-card-board-h`
  - `--dungeon-panel-gap`
- Move repeated inline sizes out of components where practical.
- Add a dev-only UI scale toggle if needed: Compact / Comfortable / Large.

Acceptance:

- A single size change does not require editing five components.
- Desktop and mobile sizing can be tuned independently.

### Phase 5 - Visual QA

Goal: Prevent readability regressions.

Tasks:

- Add Playwright screenshot checks for:
  - Combat at 1920x1080.
  - Combat at 1366x768.
  - Combat at mobile portrait.
  - Draft/reward card selection.
  - Map.
  - Shop.
- Add basic assertions:
  - No hand card text below `12px` in normal mode.
  - End Turn visible.
  - Enemy HP/intent visible.
  - Heat visible.
  - No critical HUD overlap.

Acceptance:

- Any future tiny-text regression fails QA.

## First Implementation Recommendation

Start with Phase 1 only:

1. Increase hand card dimensions and text sizes.
2. Change the hand to a horizontal scroll/fan instead of wrapping.
3. Increase combat HUD font sizes.
4. Add a simple selected-card detail preview if the larger hand cards still feel cramped.

Do not start with a full layout rewrite. The fastest useful test is whether readable hand cards at 100% zoom make the game feel playable. If that works, then Phase 2 can reorganize the combat surface around the new card size.

## Files To Touch First

- `src/dungeon/components/CardComponent.tsx`
- `src/dungeon/components/HandComponent.tsx`
- `src/dungeon/components/CombatView.tsx`
- `src/dungeon/components/EnemyComponent.tsx`
- `src/dungeon/components/FactionResourcePanel.tsx`
- `src/ui/styles/global.css`


# STARFORGE TCG — AI Assistant Guide

## Overview
STARFORGE TCG is a mobile-first Trading Card Game featuring 10 asymmetric alien races and a unique card transformation system (STARFORGE). Built with TypeScript, React, and Vite, with Capacitor for native mobile deployment. Deployed to Vercel from the `main` branch.

## Key Commands
```bash
npm run dev          # Start dev server (port 3000, network-accessible)
npm run build:ui     # Production build (Vite → dist/)
npm run build        # TypeScript compile only (tsc → dist/)
npm test             # Run tests (Jest + ts-jest)
npm run test:watch   # Watch mode for tests
npm run test:coverage # Tests with coverage report
npm run lint         # ESLint (src/**/*.ts,tsx)
npm run preview      # Preview production build locally
```

### Mobile (Capacitor)
```bash
npm run cap:sync     # Build + sync to native projects
npm run cap:android  # Build, sync, and open Android Studio
npm run cap:ios      # Build, sync, and open Xcode
```

## Project Structure
```
src/
├── index.ts              # Main entry point, exports all modules + quick-start helpers
├── assets.d.ts           # Asset type declarations
├── assets/               # Static assets (logo.png, board.png, background.png)
├── types/                # Core type definitions
│   ├── Card.ts           # Card, CardDefinition, CardInstance types
│   ├── Effects.ts        # Effect system types
│   ├── Game.ts           # GameState, TurnPhase, etc.
│   ├── Keywords.ts       # 21 keywords (CombatKeyword, TriggerKeyword, OriginalKeyword)
│   ├── Player.ts         # Player state types
│   ├── Race.ts           # 10 races enum + metadata (Race, RaceInfo, RaceData)
│   └── Starforge.ts      # STARFORGE transformation types
├── engine/               # Core game engine
│   ├── GameEngine.ts     # Main game loop, turn management, game actions
│   └── EffectResolver.ts # Card effect resolution pipeline
├── combat/               # Combat system
│   ├── CombatResolver.ts # Attack resolution, keyword interactions
│   └── DeathProcessor.ts # Death triggers, Last Words processing
├── cards/                # Card system
│   ├── CardDatabase.ts   # Card registry (globalCardDatabase)
│   └── CardFactory.ts    # Card instance creation (globalCardFactory)
├── data/                 # Card data definitions
│   ├── SampleCards.ts    # Base set card definitions
│   ├── ExpansionCards.ts # Expansion card definitions
│   ├── BalancedStarterDecks.ts # Pre-built balanced decks per race
│   └── CardCollection.ts # Collection management
├── game/                 # Game state management
│   ├── GameState.ts      # State initialization and management
│   ├── Board.ts          # Board/field zone logic
│   └── Zone.ts           # Zone types (hand, deck, field, graveyard)
├── ai/                   # AI opponents
│   ├── AIPlayer.ts       # AI decision-making logic
│   └── AIBattleSimulator.ts # AI battle simulation
├── heroes/               # Hero system
│   └── HeroDefinitions.ts # Hero powers and stats per race
├── events/               # Event system
│   ├── EventEmitter.ts   # Pub/sub event bus
│   ├── GameEvent.ts      # Event type definitions
│   └── FactionWars.ts    # Faction wars event mode
├── campaign/             # Single-player campaign
│   ├── CampaignData.ts   # Campaign level/story data
│   └── CampaignState.ts  # Campaign progress state
├── dungeon/              # Dungeon run mode
│   ├── DungeonData.ts    # Dungeon encounters/rewards
│   └── DungeonState.ts   # Dungeon run state
├── puzzle/               # Puzzle mode
│   ├── PuzzleData.ts     # Puzzle definitions
│   └── PuzzleState.ts    # Puzzle progress state
├── tagteam/              # Tag team mode (2v2)
│   ├── TagTeamData.ts    # Tag team rules/data
│   └── TagTeamState.ts   # Tag team game state
├── progression/          # Player progression systems
│   ├── Achievements.ts   # Achievement definitions and tracking
│   ├── BattlePass.ts     # Battle pass tiers and rewards
│   ├── CardCosmetics.ts  # Card skins, borders, effects
│   ├── CardPacks.ts      # Pack opening system
│   ├── CraftingSystem.ts # Card crafting/disenchanting
│   ├── DailyQuests.ts    # Daily quest generation
│   ├── ReplaySystem.ts   # Game replay recording/playback
│   ├── SeasonalRewards.ts # Season-end rewards
│   └── TournamentMode.ts # Tournament bracket system
├── stats/                # Statistics and ratings
│   ├── GameStats.ts      # Per-game statistics tracking
│   └── PvPRating.ts      # ELO/MMR rating system
├── analytics/            # Analytics
│   └── AnalyticsService.ts # Event tracking service
├── cosmetics/            # Cosmetic items
│   └── BoardPets.ts      # Board pet companions
├── audio/                # Audio
│   └── SoundManager.ts   # Sound effect and music management
├── lore/                 # Game lore
│   └── CardVoicelines.ts # Card voice line data
├── mobile/               # Mobile-specific
│   └── MobileOptimization.ts # Mobile performance optimizations
├── i18n/                 # Internationalization (stub)
├── legal/                # Legal text (stub)
├── utils/                # Utilities
│   ├── DeckCodes.ts      # Deck import/export codes
│   ├── ids.ts            # ID generation
│   ├── random.ts         # Seeded random utilities
│   ├── shuffle.ts        # Array shuffling
│   └── object.ts         # Object helpers
└── ui/                   # React UI layer
    ├── main.tsx          # React entry point
    ├── App.tsx           # Root app component with routing
    ├── accessibility.ts  # Accessibility utilities
    ├── capacitor.ts      # Capacitor native bridge setup
    ├── context/          # React context providers
    │   ├── GameContext.tsx    # Single-player game state context
    │   └── PvPGameContext.tsx # PvP multiplayer context
    ├── network/
    │   └── MultiplayerManager.ts # PeerJS-based P2P multiplayer
    ├── styles/
    │   └── global.css    # Global CSS styles
    └── components/       # ~50 React components (see below)
```

### Key UI Components
| Component | Purpose |
|---|---|
| `MainMenu.tsx` | Main menu with game mode selection |
| `GameBoard.tsx` | Primary game board (field, hands, heroes) |
| `Card.tsx` | Card rendering with keywords, stats, art |
| `DeckBuilder.tsx` | Deck construction interface |
| `CollectionManager.tsx` | Card collection browser |
| `CampaignMap.tsx` / `CampaignGame.tsx` | Campaign mode UI |
| `DungeonRun.tsx` | Dungeon run mode |
| `PuzzleMode.tsx` | Puzzle challenges |
| `TagTeamMode.tsx` | 2v2 tag team mode |
| `Lobby.tsx` | Multiplayer lobby |
| `PackOpening.tsx` | Card pack opening animation |
| `StarforgeLogo.tsx` | Logo component (uses raw GitHub URLs with commit SHAs) |
| `SpaceBackground.tsx` | Animated space background |

## Tech Stack
- **Language**: TypeScript 5.3 (strict mode, ES2020 target)
- **UI**: React 18 + Vite 5
- **Testing**: Jest 29 + ts-jest
- **Linting**: ESLint 8 + @typescript-eslint
- **Mobile**: Capacitor 8 (Android + iOS)
- **Multiplayer**: PeerJS (P2P WebRTC)
- **Build output**: `dist/` directory

## TypeScript Configuration
- Strict mode enabled (`strict: true`, `strictNullChecks`, `noImplicitAny`, `noImplicitReturns`)
- Module resolution: `bundler`
- Path aliases configured in `tsconfig.json`, `vite.config.ts`, and `jest.config.js`:
  - `@/*` → `src/*`
  - `@types/*` → `src/types/*`
  - `@cards/*`, `@game/*`, `@combat/*`, `@events/*`, `@heroes/*`, `@utils/*`, etc.

## ESLint Rules
- `@typescript-eslint/no-unused-vars`: warn (underscore-prefixed args/vars ignored)
- `@typescript-eslint/no-explicit-any`: warn
- `no-console`: off
- JS files are ignored (only `.ts`/`.tsx` linted)

## Testing
- Tests live in `tests/` directory, mirroring `src/` structure
- Test patterns: `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**/*.ts`
- Current test files:
  - `tests/engine/GameEngine.test.ts` — Core engine tests
  - `tests/engine/EffectResolver.test.ts` — Effect resolution tests
  - `tests/combat/CombatResolver.test.ts` — Combat system tests
  - `tests/combat/DeathProcessor.test.ts` — Death processing tests
  - `tests/keywords/KeywordIntegration.test.ts` — Keyword interaction tests
  - `tests/ai/AIPlayer.test.ts` — AI player tests
- Run `npm test` before committing changes to engine, combat, or AI code

## Game Architecture

### Core Concepts
- **10 Races**: Cogsmiths, Luminar, Pyroclast, Voidborn, Biotitans, Crystalline, Phantom Corsairs, Hivemind, Astromancers, Chronobound (+ Neutral)
- **21 Keywords**: 8 combat (Guardian, Barrier, Swift, Blitz, etc.), 2 trigger (Deploy, Last Words), 11 original (Salvage, Upgrade, Illuminate, Immolate, STARFORGE, etc.)
- **STARFORGE**: Unique mechanic — cards transform/upgrade mid-game
- **Crystal System**: Mana/resource system (crystals per turn)

### Game Flow
1. `GameEngine.initializeGame(player1Setup, player2Setup)` — sets up game state
2. Players alternate turns: Draw → Play cards → Attack → End turn
3. `EffectResolver` handles card effects; `CombatResolver` resolves attacks
4. `DeathProcessor` handles destroy triggers and Last Words

### Key Singletons
- `globalCardDatabase` — Card definition registry
- `globalCardFactory` — Card instance factory
- Use `initializeSampleDatabase()` or `initializeFullDatabase()` to populate

## Branch Strategy
- `main` — deployed branch (Vercel auto-deploys)
- Feature branches — create from `main`, merge back via PR or sync script

## Patch System
Patch-based workflow for tracking and replaying incremental changes.

### Creating a patch
```bash
./scripts/generate-patch.sh main my-feature-name
```
Creates `patches/NNNN-my-feature-name.patch` with the diff from main.

### Applying patches to main
```bash
git checkout main
./scripts/apply-patch.sh --all                    # apply all unapplied patches
./scripts/apply-patch.sh patches/0002-foo.patch   # apply one specific patch
git commit -am "Apply patch: description"
git push origin main
```

### Full sync (when patches can't apply cleanly)
```bash
./scripts/sync-to-main.sh
```
Replaces main's content with the current branch.

### Patch tracking
- `patches/.applied` tracks which patches have been applied
- Patches are numbered sequentially: `0001-`, `0002-`, etc.

## Asset URLs
Logo and images use raw GitHub URLs with commit SHAs to bypass CDN caching:
```
https://raw.githubusercontent.com/finishstrong23/starforge_tcg/{commit-sha}/src/assets/logo.png
```
When updating assets, update the commit SHA in `src/ui/components/StarforgeLogo.tsx`.

## Conventions
- Card definitions go in `src/data/` — each definition uses the `CardDefinition` type from `src/types/Card.ts`
- New game modes follow the pattern: data file + state file in a dedicated `src/{mode}/` directory, with a corresponding UI component in `src/ui/components/`
- Progression features go in `src/progression/`
- All modules export through `index.ts` barrel files
- The main `src/index.ts` re-exports the public API for the game engine
- Use the existing event system (`EventEmitter`) for decoupled communication between systems

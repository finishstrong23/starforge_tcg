# Co-op Dungeon Run — Implementation Plan

## What Makes Slay the Spire 2 Co-op Addictive (and how we steal it)

### Core Hooks
1. **Branching map with meaningful choices** — Not linear boss progression. A map with paths: combat, elite, event, shop, rest, treasure. Players vote/negotiate on which path.
2. **Asymmetric synergy** — Two different races complement each other. Already have TagTeam synergies (10 defined pairs). Co-op builds on that.
3. **Individual deck building, shared consequences** — Each player builds their own deck from their race pool, but share HP and relics. One player's bad draft hurts both.
4. **Escalating difficulty with elite/boss gates** — Floor difficulty ramps. Elites are optional but give better relics. Bosses end each act.
5. **Events with risk/reward narrative** — Random encounters with choices (gain relic but lose HP, transform cards, gamble, etc.)
6. **Shared HP pool creates tension** — Can't just YOLO. Both players need to play well.
7. **Meta-progression** — Unlock new relics, events, and harder difficulties (Ascension levels) across runs.
8. **The "one more run" loop** — Runs are 20-30 min. Short enough to retry, long enough to invest.

---

## Architecture

### New Files

```
src/coop/
├── CoopDungeonData.ts    # Map generation, node types, events, shop items
├── CoopDungeonState.ts   # Run state, progression, persistence
└── CoopDungeonEngine.ts  # Co-op combat adapter (2 players vs 1 AI boss)

src/ui/components/
├── CoopDungeon.tsx        # Main co-op dungeon component (orchestrator)
├── CoopDungeonMap.tsx     # Branching map visualization
├── CoopDungeonLobby.tsx   # Co-op lobby (create/join room, pick races)
├── CoopDungeonBattle.tsx  # Co-op battle screen (2 players vs AI)
├── CoopDungeonEvent.tsx   # Random event screen
├── CoopDungeonShop.tsx    # Shop screen
└── CoopDungeonReward.tsx  # Post-combat reward selection

src/ui/context/
└── CoopGameContext.tsx    # Co-op game state provider (extends PvP pattern)
```

### Leveraged Existing Systems
- `MultiplayerManager` — P2P networking (host/guest pattern)
- `DungeonData` — Bosses, relics, card bundles (reused + extended)
- `TagTeamData` — Race synergies (10 pairs with bonuses)
- `GameEngine` — Core combat engine (used for each encounter)
- `PvPGameContext` — Host/guest state sync pattern

---

## Step-by-Step Implementation

### Phase 1: Co-op Dungeon Data & State (Backend)

**Step 1: CoopDungeonData.ts** — Map generation and content
- `MapNode` type: { id, type, connections[], floor, rewards? }
- Node types: `COMBAT | ELITE | EVENT | SHOP | REST | TREASURE | BOSS`
- `CoopMap` type: 3 acts, each with 12-15 nodes in 4-5 rows
- Map generation algorithm: start node → branching paths → converge at boss
- `CoopEvent` type: { id, title, description, choices[] } — 15+ events
  - "Alien Forge": Transform a random card into a higher-rarity version
  - "Void Rift": Gain a powerful relic, lose 5 shared HP
  - "Crystalline Cache": Each player discovers a card from the other's race
  - "Smuggler's Deal": Pay gold for random relic OR keep gold
  - "Training Grounds": Remove a card from your deck for free
  - "Temporal Echo": Copy your partner's last-played card into your deck
- `ShopItem` type: cards, relics, card removal, HP restore
- Co-op relics (new): 10+ relics with partner synergy effects
  - "Resonance Core": When your partner plays a spell, gain +1 crystal next turn
  - "Shared Shield": Barrier on your minions also applies to partner's hero
  - "Dual Draw": When either player's deck is empty, both draw from a shared pool
- Elite encounters: Harder bosses with better drops (unique relics)
- Act bosses: 3 major bosses, one per act (harder than elites)

**Step 2: CoopDungeonState.ts** — Run state management
- `CoopRunState`: { players[2], sharedHP, maxHP, map, currentNodeId, act, floor, relics, gold, seed }
- Player state: { race, deck, playerName }
- Save/load to localStorage (host persists, syncs to guest)
- Phase machine: `LOBBY → MAP → PRE_COMBAT → COMBAT → REWARD → EVENT → SHOP → REST → MAP → ... → VICTORY/DEFEAT`
- Map traversal: Both players must agree on next node (host picks, guest confirms OR majority vote)
- Gold system: Shared pool, earned from combat, spent in shop

**Step 3: CoopDungeonEngine.ts** — Co-op combat adapter
- Wraps `GameEngine` for 2v1 (2 human players vs 1 AI boss)
- **Turn order**: Player 1 → Player 2 → Boss (3-way rotation)
- **Shared board**: Each player has their own 4-slot board half (total 8 slots vs boss's 7)
- **Shared HP pool**: Both players share `sharedHP` — boss attacks reduce this
- **Individual hands/decks/crystals**: Each player draws from their own deck
- **Cross-player targeting**: Players can buff/heal partner's minions
- **Boss mechanics**: Bosses get increasing power each act, special phases, enrage timers
- Adapts existing GameEngine by running it with custom rules overlay

### Phase 2: Multiplayer Networking

**Step 4: Co-op networking layer**
- Extend `MultiplayerManager` with co-op message types:
  - `coop_run_state` — Full run state sync from host
  - `coop_map_vote` — Node selection voting
  - `coop_action` — In-combat action from either player
  - `coop_reward_choice` — Card/relic selection
  - `coop_event_choice` — Event decision
  - `coop_shop_purchase` — Shop transaction
  - `coop_ready` — Player ready signal
- Host authority: Host runs CoopDungeonEngine, processes all actions, syncs state
- Guest receives state updates, sends actions to host
- State sync: After every action/transition, host sends full run state to guest

**Step 5: CoopGameContext.tsx** — React context for co-op
- Combines PvPGameContext pattern (host/guest roles) with dungeon state
- Exposes: runState, combatState, playerHand, partnerBoard, bossBoard, actions
- Handles phase transitions (map → combat → reward → map)
- Manages network message routing

### Phase 3: UI Components

**Step 6: CoopDungeonLobby.tsx** — Room creation and race selection
- Create/join room flow (reuses MultiplayerManager)
- Both players pick races (show synergy bonus if compatible pair)
- Ready-up system
- Chat/ping communication

**Step 7: CoopDungeonMap.tsx** — Branching map visualization
- SVG/Canvas rendered map with connected nodes
- Current position highlighted
- Upcoming nodes show type icons (sword=combat, skull=elite, ?=event, coin=shop, campfire=rest, chest=treasure, crown=boss)
- Path selection: tap a connected node, partner sees your vote
- Fog of war: nodes 2+ floors ahead are dimmed
- Scrollable vertically (mobile-first)

**Step 8: CoopDungeonBattle.tsx** — Co-op combat screen
- Modified GameBoard layout: Player 1 board (left/bottom) + Player 2 board (right/bottom) vs Boss (top)
- Turn indicator shows whose turn it is (P1, P2, or Boss)
- Shared HP bar prominently displayed
- Partner's hand shown as card backs (count only)
- Boss intent system: Shows what boss will do next turn (attack, summon, buff)
- Active player controls their board; inactive player spectates with pings

**Step 9: CoopDungeonReward.tsx** — Post-combat rewards
- Card bundle selection (each player picks independently from their race pool)
- Relic selection (shared — players vote or host picks)
- Gold reward display
- "Skip" option for cards

**Step 10: CoopDungeonEvent.tsx + CoopDungeonShop.tsx**
- Event: Story text + 2-3 choices, both players vote
- Shop: Browse cards (race-specific), relics, card removal, HP restore
  - Each player can buy cards for themselves
  - Relics/HP are shared purchases from shared gold

**Step 11: CoopDungeon.tsx** — Main orchestrator
- Phase-based rendering (lobby → map → battle → reward → etc.)
- SpaceBackground + dark theme consistent with existing dungeon
- Run summary on victory/defeat
- "Play Again" flow

### Phase 4: Boss Design & Balance

**Step 12: Co-op boss encounters**
- **Act 1 (3 combats + 1 elite + 1 boss)**: Introductory encounters
  - Normal: 25-35 HP bosses, simple mechanics
  - Elite: 40 HP, one special ability
  - Boss: 50 HP, hero power + special rule + phase transition at 50% HP
- **Act 2 (3 combats + 2 elites + 1 boss)**: Mid-game ramp
  - Normal: 35-50 HP, more keywords
  - Elite: 55 HP, minion summoning
  - Boss: 70 HP, two phases, enrage at 25%
- **Act 3 (2 combats + 2 elites + 1 boss)**: Final gauntlet
  - Normal: 50-60 HP, complex mechanics
  - Elite: 70 HP, board-wipes
  - Boss: 100 HP, three phases, unique mechanic per boss

**Step 13: Boss intent system**
- Each boss turn: show intent icon above boss (attack X, summon, buff, heal, AoE)
- Players can plan around known boss moves
- Some bosses have hidden intents (elite/act 3)

### Phase 5: Polish & Meta

**Step 14: Co-op relics with synergy effects**
- 20 co-op-specific relics that reward teamwork

**Step 15: Persistence and history**
- Co-op run history (both player names, races, result, bosses defeated)
- Best co-op synergy tracking

**Step 16: Integration**
- Add "Co-op Dungeon" to MainMenu
- Route in App.tsx
- Mobile-responsive layouts

---

## Implementation Order (what to build first)

1. **CoopDungeonData.ts** — Map gen, events, shop, co-op relics
2. **CoopDungeonState.ts** — Run state machine
3. **CoopDungeonEngine.ts** — 2v1 combat adapter
4. **CoopGameContext.tsx** — Network + state context
5. **CoopDungeonLobby.tsx** — Create/join, race pick
6. **CoopDungeonMap.tsx** — Map visualization
7. **CoopDungeonBattle.tsx** — Combat screen
8. **CoopDungeonReward.tsx** — Rewards
9. **CoopDungeonEvent.tsx + Shop** — Events and shop
10. **CoopDungeon.tsx** — Orchestrator + menu integration
11. **Boss design** — Act 1-3 bosses with intents
12. **Polish** — Animations, balance, persistence

Total: ~12 implementation steps, each building on the last.

# STARFORGE TCG - Launch Roadmap

**Goal: Compete from Day One**

This roadmap transforms StarForge from a working prototype into a polished, competitive digital TCG that can stand alongside Hearthstone, Marvel Snap, and other market leaders at launch.

---

## Current State Assessment

### What We Have (Strengths)
- **800+ cards** across 10 unique alien factions with distinct playstyles
- **21 keywords** including 11 original mechanics (STARFORGE, ADAPT, ECHO, etc.)
- **Working game engine** with full combat resolution, keyword interactions, buffs/debuffs
- **AI opponent** with Easy/Medium/Hard difficulty and battle simulation
- **PvP multiplayer** via peer-to-peer WebRTC (PeerJS)
- **Story mode** with 10-planet galactic conquest campaign
- **Deckbuilder** with collection management and crafting
- **Progression systems** — battle pass, achievements, daily quests, seasonal rewards
- **Competitive features** — tournaments, replays, leaderboard, meta dashboard
- **Mobile port** via Capacitor (Android + iOS scaffolding)
- **Visual polish** — card art, VFX, attack animations, hero intros

### What's Missing (Critical Gaps)
- ~~**No backend server**~~ **DONE** — Express server with auth, WebSocket game server, matchmaking
- ~~**No accounts/auth**~~ **DONE** — JWT auth with registration, login, refresh tokens, player profiles
- ~~**No matchmaking**~~ **DONE** — MMR-based matchmaking service with expanding range
- **No real economy** — packs/crafting/currency are local-only (payment processing needed)
- ~~**No anti-cheat**~~ **DONE** — Server-authoritative WebSocket game server validates actions
- ~~**No analytics**~~ **DONE** — Client SDK + server ingestion + balance/retention dashboards
- **No monetization infrastructure** — no payment processing, no storefront
- **No content pipeline** — card data lives in a TypeScript file, no CMS
- **Limited testing** — engine tests exist, but no E2E, no load testing
- ~~**No CI/CD**~~ **DONE** — GitHub Actions pipeline for lint, test, build

---

## Phase 0: Foundation (Weeks 1-3)
*"You can't compete without infrastructure."*

### 0.1 Backend & Auth
- [x] Set up backend service (Node.js/Express with TypeScript)
- [x] User authentication (email/password with JWT + refresh tokens)
- [x] Player profiles with persistent state (collection, decks, rank, currency)
- [x] Server-side game state validation (WebSocket game server)
- [x] Database schema design (PostgreSQL with migrations)
- [ ] OAuth providers (Google, Apple, Discord)

### 0.2 CI/CD & DevOps
- [x] GitHub Actions pipeline: lint, test, build on every PR
- [ ] Automated deployment (Vercel/Netlify for web, Fastlane for mobile)
- [ ] Environment management (dev, staging, production)
- [ ] Error tracking (Sentry) and logging

### 0.3 Analytics Foundation
- [x] Event tracking SDK (custom client-side with batch upload)
- [x] Core funnel metrics: screen views, tutorial completion, game starts
- [x] Game balance telemetry: win rates by faction, card play rates, game length distribution
- [ ] A/B testing framework for tuning rewards and progression

---

## Phase 1: Competitive Core (Weeks 4-8)
*"Make the game worth playing every day."*

### 1.1 Server-Authoritative Multiplayer
- [x] Replace P2P with client-server architecture (WebSocket game server)
- [x] Server-side game engine execution (clients send actions, server resolves)
- [x] Reconnection handling (resume games after disconnect)
- [x] Anti-cheat: all RNG is server-side, state is authoritative
- [x] Spectator mode foundation (backend + frontend browse/watch UI)

### 1.2 Matchmaking & Ranked
- [x] MMR-based matchmaking (Elo or Glicko-2 rating system)
- [x] Ranked ladder with divisions (Bronze > Silver > Gold > Diamond > Master > Legend)
- [x] Casual queue (hidden MMR, no rank loss)
- [x] Queue times under 30 seconds (bots backfill if needed)
- [x] Seasonal resets with rewards based on peak rank

### 1.3 New Player Experience
- [x] Interactive tutorial (5-7 minutes, teaches core mechanics step-by-step)
- [x] Guided first-week experience: free starter deck per day for first 3 days
- [x] Bot opponents for ranks below Silver (smooth difficulty curve)
- [x] "Apprentice ranks" that can't lose stars (Bronze 10 through Bronze 1)
- [x] Tooltips and keyword glossary accessible in-game

### 1.4 Daily Engagement Loop
- [x] 3 daily quests (reroll 1 per day), e.g. "Win 3 games as Pyroclast"
- [x] Weekly challenge with premium currency reward
- [x] First-win-of-the-day bonus (gold + XP)
- [x] Login streak bonuses (3-day, 7-day, 14-day, 30-day)

---

## Phase 2: Economy & Monetization (Weeks 6-10)
*"Free-to-play done right — generous but sustainable."*

### 2.1 Currency System
- [x] **Gold** (soft currency): earned from quests, wins, achievements
- [x] **Stardust** (crafting currency): earned from disenchanting duplicate/unwanted cards
- [x] **Nebula Gems** (premium currency): purchased with real money
- [x] Clear exchange rates: 100 Gold = 1 pack, crafting costs by rarity

### 2.2 Card Acquisition
- [x] Booster packs (5 cards, guaranteed 1 rare or better) — purchasable with Gold or Gems
- [x] Duplicate protection (no more than 2 of the same Legendary)
- [x] Crafting system: disenchant cards into Stardust, craft specific cards you want
- [x] Pity timer: guaranteed Legendary within every 40 packs
- [ ] Starter bundles for new players (high value, one-time purchase)

### 2.3 Monetization
- [x] Battle Pass (free + premium track, ~60 tiers per season)
- [ ] Cosmetic shop: card backs, hero skins, board themes, emotes
- [ ] Pre-built deck bundles (great for new players who want to compete immediately)
- [ ] Season pass / expansion pre-order with bonus cosmetics
- [x] **No pay-to-win**: cosmetics and acceleration only, never exclusive gameplay content

### 2.4 Payment Infrastructure
- [ ] Stripe integration (web)
- [ ] Apple IAP and Google Play Billing (mobile)
- [ ] Receipt validation server-side
- [ ] Regional pricing
- [ ] Refund handling

---

## Phase 3: Content & Meta (Weeks 8-12)
*"A living game needs a living metagame."*

### 3.1 Balance Framework
- [ ] Automated balance dashboards (win rate, play rate, mirror match rate per faction)
- [ ] Card nerf/buff pipeline (hot-fix capable without app update)
- [ ] Full dust refund for nerfed cards (14-day window)
- [ ] Balance patch cadence: bi-weekly micro-patches, monthly major patches
- [ ] Internal playtesting team / community council

### 3.2 Expansion Pipeline
- [ ] Card data moved to server/CMS (not hardcoded TypeScript)
- [ ] Expansion framework: new keyword, 100-130 new cards per set
- [ ] Expansion release cadence: every 4 months (3 per year)
- [ ] Card reveal season: daily card reveals for 2 weeks before launch
- [ ] **Expansion 1 designed and ready** before launch (releases 4 months post-launch)

### 3.3 Game Modes
- [ ] **Standard Ranked** — core competitive mode
- [ ] **Casual** — unranked, for quest completion and testing decks
- [ ] **Story/Campaign** — single-player, already built, polish and expand
- [ ] **Arena/Draft** — draft a deck from random card offers, play until 3 losses or 12 wins
- [ ] **Tavern Brawl / Weekly Event** — rotating rule-bending mode (keeps the game fresh)
- [ ] **Friendly Challenge** — play friends with any deck (already have P2P, upgrade it)

### 3.4 Social Features
- [ ] Friends list (add by username or link)
- [ ] In-game chat (opt-in, with mute/report)
- [ ] Spectate friends' games
- [ ] Share decks via link/code (importable deck strings)
- [ ] Guilds/clans (Phase 3.5 stretch goal)

---

## Phase 4: Polish & Launch Prep (Weeks 10-14)
*"First impressions are everything."*

### 4.1 Visual & Audio Polish
- [ ] Professional card art for all 800+ cards (consistent style, high resolution)
- [ ] Particle effects for keywords (BARRIER shimmer, IMMOLATE flames, etc.)
- [ ] Board themes (1 per faction, unlockable)
- [ ] Sound design pass: every action has satisfying audio feedback
- [ ] Music: menu theme, battle themes (per faction), victory/defeat stingers
- [ ] Cinematic trailer (60-90 seconds)

### 4.2 Mobile Optimization
- [ ] Performance profiling (60fps target on mid-range devices)
- [ ] Battery and memory optimization
- [ ] Offline mode for story/campaign
- [ ] Push notifications (daily quests ready, friend challenge, new expansion)
- [ ] App Store / Play Store listing assets (screenshots, description, keywords)

### 4.3 Accessibility
- [ ] Colorblind modes (deuteranopia, protanopia, tritanopia)
- [ ] Screen reader support for menus
- [ ] Scalable UI text
- [ ] Reduced motion option
- [ ] Keyboard navigation (desktop)

### 4.4 Localization
- [ ] English (launch language)
- [ ] Card text and UI strings externalized to i18n files
- [ ] Priority languages for post-launch: Spanish, Portuguese, French, German, Japanese, Korean, Chinese (Simplified)

### 4.5 Legal & Compliance
- [ ] Terms of Service and Privacy Policy
- [ ] COPPA compliance (age gate if needed)
- [ ] GDPR data handling (EU users)
- [ ] Loot box probability disclosure (required in many regions)
- [ ] Content ratings (ESRB, PEGI)

---

## Phase 5: Soft Launch (Weeks 14-18)
*"Test with real players before going big."*

### 5.1 Closed Beta
- [ ] Limited invite (1,000-5,000 players)
- [ ] Beta key distribution via Discord, social media, content creators
- [ ] In-game feedback button
- [ ] Discord community server with bug-report and suggestion channels
- [ ] Daily monitoring of crash rates, session length, retention

### 5.2 Soft Launch (Regional)
- [ ] Launch in 1-2 smaller markets (e.g., Philippines, New Zealand, Canada)
- [ ] Validate server infrastructure under real load
- [ ] Tune economy: are players earning too much/too little?
- [ ] Tune matchmaking: are queue times acceptable?
- [ ] Tune difficulty: are new players churning at the tutorial? At rank floors?

### 5.3 Content Creator Program
- [ ] Seed 50-100 TCG/gaming content creators with early access
- [ ] Provide press kit (art assets, key facts, trailer)
- [ ] Exclusive card back for "Founders" who play during beta
- [ ] Streamer overlay/extension support (Twitch)

---

## Phase 6: Global Launch
*"Ship it."*

### 6.1 Launch Day Checklist
- [ ] Web (desktop browser) — live on custom domain
- [ ] Android — live on Google Play Store
- [ ] iOS — live on Apple App Store
- [ ] Steam — live on Steam (Electron/Tauri wrapper or native)
- [ ] Launch event: limited-time quests, free Legendary, double XP weekend

### 6.2 Launch Marketing
- [ ] Launch trailer across YouTube, Twitter/X, TikTok, Reddit
- [ ] App Store featuring pitch (Apple and Google editorial teams)
- [ ] Reddit AMAs in r/games, r/digitalcardgames
- [ ] Cross-promotion with TCG community Discord servers
- [ ] Press outreach to gaming outlets (PC Gamer, TouchArcade, Pocket Gamer)

### 6.3 Launch Week Monitoring
- [ ] 24/7 on-call for critical bugs
- [ ] Hourly server health dashboards
- [ ] Community management (Discord, social media, app store reviews)
- [ ] Emergency hotfix pipeline tested and ready
- [ ] Day-1, Day-3, Day-7 retention targets tracked in real time

---

## Phase 7: Post-Launch Growth (Months 2-6)
*"The game starts at launch."*

### 7.1 Live Operations Cadence
- **Weekly**: Tavern Brawl rotation, minor bug fixes
- **Bi-weekly**: Balance micro-patch (stat adjustments)
- **Monthly**: Battle Pass season, ranked season reset, major balance patch
- **Quarterly**: New expansion (100+ cards), new keyword, new game mode

### 7.2 Esports & Competitive
- [ ] Official tournament system with in-game registration
- [ ] Weekly community tournaments (automated Swiss/elimination brackets)
- [ ] Monthly invitational (top 64 Legend players)
- [ ] Quarterly championship with prize pool
- [ ] API for third-party tournament organizers

### 7.3 Community & Retention
- [ ] Deck sharing hub (in-game, browse popular/winning decks)
- [ ] Achievement system expansion
- [ ] Guild wars / clan battles
- [ ] Seasonal cosmetic rewards (limited-edition card backs, boards)
- [ ] Community card design contests

### 7.4 Platform Expansion
- [ ] Nintendo Switch (stretch goal)
- [ ] Cross-play and cross-progression across all platforms
- [ ] Tablet-optimized UI

---

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Day-1 Retention | > 40% | Are players hooked? |
| Day-7 Retention | > 20% | Is the loop working? |
| Day-30 Retention | > 10% | Is there long-term depth? |
| Avg Session Length | 15-25 min | Sweet spot for card games |
| Games per Session | 2-4 | Healthy engagement |
| Avg Game Duration | 6-10 min | Fast enough to be mobile-friendly |
| Conversion Rate (F2P > Paid) | 3-5% | Industry standard for F2P |
| ARPDAU | $0.10-0.30 | Sustainable revenue |
| Faction Win Rates | 45-55% | Balanced meta |
| Matchmaking Wait | < 30s | Players won't wait longer |
| Crash Rate | < 0.5% | Stability |

---

## Competitive Differentiators vs. the Market

What makes StarForge worth playing over Hearthstone, Marvel Snap, Legends of Runeterra, etc.:

1. **10 asymmetric factions** — More strategic diversity than most competitors (HS has ~11 classes but they share neutral cards more heavily). Each faction has a genuinely different playstyle and win condition.

2. **STARFORGE mechanic** — A unique endgame transformation that gives every deck a comeback/finisher mechanic. No other TCG has this.

3. **21 keywords** — Deep mechanical space including 11 original keywords not found in other games (PHASE, IMMOLATE, SALVAGE, ADAPT, RESONATE, etc.).

4. **Sci-fi setting** — The market is saturated with fantasy TCGs. StarForge's alien-factions-in-space theme is fresh and distinctive.

5. **Generous F2P model** — Learn from competitors' mistakes. No pay-to-win, generous quest rewards, crafting system, pity timers. Win the community's trust.

6. **Cross-platform from day one** — Web + Android + iOS simultaneously. Low barrier to entry.

---

## Budget & Resource Priorities

If resources are limited, here's the priority stack — each row only matters after the row above it is solid:

| Priority | Area | Reason |
|----------|------|--------|
| 1 | Server-authoritative multiplayer + matchmaking | Without this, competitive play is impossible |
| 2 | Account system + persistence | Without this, no one keeps playing |
| 3 | New player experience (tutorial + onboarding) | Without this, no one starts playing |
| 4 | Daily engagement loop (quests + rewards) | Without this, no one comes back |
| 5 | Economy + monetization | Without this, you can't sustain the game |
| 6 | Balance + analytics | Without this, the meta goes stale |
| 7 | Polish (art, audio, VFX) | Without this, first impressions suffer |
| 8 | Content pipeline (expansions) | Without this, the game dies after 3 months |
| 9 | Social features + esports | These drive long-term community growth |
| 10 | Platform expansion | Broader reach once the core is proven |

---

## Timeline Summary

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| Phase 0: Foundation | Weeks 1-3 | Backend, auth, CI/CD live |
| Phase 1: Competitive Core | Weeks 4-8 | Server multiplayer, ranked ladder, matchmaking |
| Phase 2: Economy | Weeks 6-10 | Monetization, payment processing, battle pass |
| Phase 3: Content & Meta | Weeks 8-12 | Balance tools, draft mode, social features |
| Phase 4: Polish | Weeks 10-14 | Art, audio, accessibility, localization |
| Phase 5: Soft Launch | Weeks 14-18 | Closed beta, soft launch, creator program |
| Phase 6: Global Launch | Week 18 | Ship on all platforms |
| Phase 7: Post-Launch | Months 5-12+ | Expansions, esports, community growth |

**Total time to global launch: ~4.5 months from start of Phase 0.**

---

*"The best time to launch was yesterday. The second best time is when you're actually ready."*

*StarForge has a strong mechanical foundation. The gap to competitive viability is infrastructure, economy, and polish — not gameplay. Build the server, nail the new player experience, and ship.*

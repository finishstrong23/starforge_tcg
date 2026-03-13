# SolanaDEX — Full Buildout Plan

## Current State
- Frontend is ~40% production-ready (UI shell exists, but transactions are mocked, pools are hardcoded, no balances)
- Smart contract (Anchor) exists but not deployed
- Indexer exists but not running anywhere
- Currently deployed via starforge Vercel project (wrong identity)
- No branding, no custom domain, no README

---

## Phase 1: Identity & Infrastructure (Week 1)
**Goal: Own brand, own deployment, clean foundation**

### 1.1 Vercel Setup
- [ ] Create NEW Vercel project from `finishstrong23/solana-dex` repo
- [ ] Set root directory to `frontend/`
- [ ] Delete or disconnect the old starforge-based deployment
- [ ] Configure environment variables (RPC endpoint, program ID, indexer URL)

### 1.2 Branding & Meta
- [ ] Pick a real name (e.g., "NovaDEX", "ForgeSwap", "AetherDEX" — or keep "SolanaDEX")
- [ ] Add proper meta tags (title, description, Open Graph, favicon)
- [ ] Add a logo/wordmark to the sidebar
- [ ] Update `layout.tsx` with real app name and metadata
- [ ] Optional: custom domain (e.g., solanadex.xyz)

### 1.3 Project Cleanup
- [ ] Add a proper README.md to the repo
- [ ] Remove the `solana-dex/` folder from starforge_tcg repo
- [ ] Set up `.env.local.example` with all required env vars documented
- [ ] Add proper `.gitignore` (node_modules, .next, target, .env)

---

## Phase 2: Core Functionality — Make It Real (Weeks 2-3)
**Goal: Swap, pools, and balances actually work on devnet**

### 2.1 Smart Contract Deployment
- [ ] Install Anchor CLI + Solana CLI locally
- [ ] Deploy AMM contract to Solana devnet
- [ ] Record program ID and update env vars
- [ ] Create 2-3 test pools (SOL/USDC, SOL/USDT) on devnet with seed liquidity

### 2.2 On-Chain Pool Fetching (replace mocks)
- [ ] Rewrite `usePools.ts` to fetch pool accounts from on-chain via Anchor
- [ ] Parse pool state (reserves, LP supply, fee rate, token mints)
- [ ] Add real-time reserve updates
- [ ] Display actual TVL, volume from on-chain + indexer data

### 2.3 Token Balances & Metadata
- [ ] Fetch user's SPL token balances when wallet connected
- [ ] Display balances in swap card ("Balance: 12.5 SOL")
- [ ] Fetch token metadata (name, symbol, decimals, logo) from token registry
- [ ] Replace hardcoded token list with dynamic token discovery

### 2.4 Real Transaction Building
- [ ] **Swap**: Build actual swap instruction via Anchor, sign & send
- [ ] **Add Liquidity**: Build add_liquidity instruction, handle token approvals
- [ ] **Remove Liquidity**: Build remove_liquidity instruction, burn LP tokens
- [ ] **Create Pool**: Build initialize_pool instruction
- [ ] Add transaction confirmation polling + toast notifications
- [ ] Show pending/confirmed/failed states

### 2.5 Indexer Deployment
- [ ] Deploy indexer to Railway/Render/Fly.io (lightweight Node.js service)
- [ ] Point it at devnet RPC + program ID
- [ ] Set `NEXT_PUBLIC_INDEXER_URL` in Vercel env vars
- [ ] Verify candle data, swap history, protocol stats all flow through

---

## Phase 3: UX & Performance (Week 4)
**Goal: Fast, polished, production-quality experience**

### 3.1 Loading & Performance
- [ ] Add loading skeletons to Dashboard and PoolDetail pages
- [ ] Stop polling when tab is hidden (Page Visibility API)
- [ ] Add request deduplication / SWR-style caching (consider `swr` or `react-query`)
- [ ] Lazy-load PriceChart component (it's heavy)
- [ ] Memoize expensive computations (pool sorting, price calculations)
- [ ] Add error boundaries around each page section

### 3.2 Chart Improvements
- [ ] Fix chart not loading on first click (recreate issue)
- [ ] Add price impact visualization on swap
- [ ] Show 24h price change indicators
- [ ] Persist chart interval preference in localStorage
- [ ] Handle empty candle data gracefully (show "No data" state)

### 3.3 UX Polish
- [ ] Add toast notifications for tx success/failure (replace modal)
- [ ] Add "Max" button for token input (use full balance)
- [ ] Show price impact warning when > 5%
- [ ] Add transaction history to wallet dropdown
- [ ] Mobile responsive audit (sidebar → bottom nav on mobile)
- [ ] Add keyboard shortcuts (Escape to close modals, Enter to confirm)

---

## Phase 4: Security & Testing (Week 5)
**Goal: Safe for real users**

### 4.1 Smart Contract Audit
- [ ] Add input validation to all instructions (overflow checks, zero-amount guards)
- [ ] Test edge cases: empty pools, max u64 amounts, rounding dust
- [ ] Write comprehensive Anchor test suite (`anchor test`)
- [ ] Consider a lightweight audit or peer review

### 4.2 Frontend Security
- [ ] Validate all user inputs (amounts, addresses, slippage)
- [ ] Add rate limiting awareness (handle 429s from RPC)
- [ ] Sanitize any user-provided data displayed in UI
- [ ] Add CSP headers in Vercel config

### 4.3 Testing
- [ ] Unit tests for swap estimation, price impact calculations
- [ ] Component tests for SwapCard, PoolDetail (React Testing Library)
- [ ] E2E test: connect wallet → swap → verify (Playwright or Cypress)
- [ ] Integration test: indexer → frontend data pipeline

---

## Phase 5: Growth Features (Weeks 6-8)
**Goal: Features that make users come back**

### 5.1 Analytics Dashboard
- [ ] Real protocol TVL tracking over time
- [ ] Volume charts (24h, 7d, 30d)
- [ ] Top traders leaderboard
- [ ] Fee revenue tracking for LPs

### 5.2 Advanced Trading
- [ ] Limit orders (off-chain order book or on-chain)
- [ ] Multi-hop routing (SOL → USDC → RAY via 2 pools)
- [ ] Price alerts (browser notifications)
- [ ] Favorites / watchlist for pools

### 5.3 LP Features
- [ ] LP position dashboard (your liquidity, earned fees, IL calculator)
- [ ] LP rewards / farming program
- [ ] Auto-compound option

### 5.4 Token Management
- [ ] Custom token import (paste mint address)
- [ ] Token search with autocomplete
- [ ] Recently used tokens
- [ ] Popular/trending tokens section

### 5.5 Social & Community
- [ ] Share trade links
- [ ] Referral program
- [ ] Discord/Telegram integration for alerts

---

## Phase 6: Mainnet Launch (Week 9+)
**Goal: Go live on Solana mainnet**

### 6.1 Pre-Launch
- [ ] Deploy contract to mainnet-beta
- [ ] Environment switching (devnet ↔ mainnet toggle or separate deployments)
- [ ] Final security review
- [ ] Seed initial liquidity pools
- [ ] Custom domain + SSL

### 6.2 Launch
- [ ] Announce on Twitter/Discord
- [ ] Submit to Solana ecosystem directory
- [ ] Submit to DeFi aggregators (Jupiter, etc.)
- [ ] Monitor error rates, performance, indexer health

### 6.3 Post-Launch
- [ ] Bug bounty program
- [ ] Community feedback loop
- [ ] Iterate based on usage data

---

## Tech Stack Summary
| Layer | Technology |
|-------|------------|
| Smart Contract | Anchor (Rust) on Solana |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Charts | lightweight-charts (TradingView) |
| Wallet | @solana/wallet-adapter (Phantom, Solflare) |
| Indexer | Node.js, SQLite, Express REST API |
| Hosting (Web) | Vercel |
| Hosting (Indexer) | Railway / Render / Fly.io |
| Domain | TBD |

---

## Immediate Next Steps (Do Now)
1. **Create new Vercel project** from `finishstrong23/solana-dex` repo
2. **Pick a name** and update branding
3. **Deploy contract to devnet** and get real program ID
4. **Replace mocked data** with on-chain reads
5. **Deploy indexer** so charts and history work

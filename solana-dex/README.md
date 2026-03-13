# SolanaDEX

Decentralized token exchange built on Solana with a constant product AMM.

## Architecture

| Component | Directory | Tech |
|-----------|-----------|------|
| Smart Contract | `programs/solana-dex/` | Anchor (Rust) |
| Frontend | `frontend/` | Next.js 14, React 18, Tailwind CSS |
| Indexer | `indexer/` | Node.js, SQLite, Express |

## Features

- **Token Swaps** — Instant swaps with configurable slippage tolerance
- **Liquidity Pools** — Create pools, add/remove liquidity, earn trading fees
- **Price Charts** — OHLCV candle charts via TradingView lightweight-charts
- **Dashboard** — Protocol-wide TVL, volume, and fee metrics
- **Wallet Integration** — Phantom and Solflare support

## Quick Start

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Indexer
```bash
cd indexer
npm install
npm run dev
```

### Smart Contract
```bash
# Requires Anchor CLI + Solana CLI
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Environment Variables

Set these in Vercel or `.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_RPC_ENDPOINT` | Solana RPC URL | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_PROGRAM_ID` | Deployed AMM program ID | — |
| `NEXT_PUBLIC_INDEXER_URL` | Indexer REST API URL | `http://localhost:3001` |

## Deployment

**Frontend**: Deploy to Vercel with root directory set to `frontend/`.

**Indexer**: Deploy to Railway, Render, or Fly.io.

**Contract**: Deploy via `anchor deploy` to devnet or mainnet-beta.

## License

MIT

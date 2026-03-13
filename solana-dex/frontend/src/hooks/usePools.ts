"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getProgram } from "@/utils/program";
import { PublicKey } from "@solana/web3.js";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001";

// Known token metadata (extend as needed or fetch dynamically)
const TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
  So11111111111111111111111111111111111111112: { symbol: "SOL", decimals: 9 },
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": {
    symbol: "USDC",
    decimals: 6,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    decimals: 6,
  },
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": {
    symbol: "RAY",
    decimals: 6,
  },
};

function getTokenSymbol(mint: string): string {
  return TOKEN_META[mint]?.symbol || mint.slice(0, 4) + "...";
}

function getTokenDecimals(mint: string): number {
  return TOKEN_META[mint]?.decimals ?? 6;
}

export interface PoolInfo {
  address: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenADecimals: number;
  tokenBDecimals: number;
  reserveA: number;
  reserveB: number;
  tvl: number;
  volume24h: number;
  feeRate: number;
  apr: number;
  totalLpSupply: number;
  lpMint: string;
  tokenAVault: string;
  tokenBVault: string;
}

export function usePools() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      setError(null);

      // Try fetching on-chain pool accounts
      let onChainPools: PoolInfo[] = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const program = getProgram(connection, wallet as any) as any;
        const allPoolAccounts = await program.account.pool.all();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChainPools = allPoolAccounts.map((acc: any) => {
          const pool = acc.account;
          const tokenAMint = (pool.tokenAMint as PublicKey).toBase58();
          const tokenBMint = (pool.tokenBMint as PublicKey).toBase58();
          const decimalsA = getTokenDecimals(tokenAMint);
          const decimalsB = getTokenDecimals(tokenBMint);
          const reserveA =
            Number(pool.reserveA) / Math.pow(10, decimalsA);
          const reserveB =
            Number(pool.reserveB) / Math.pow(10, decimalsB);

          return {
            address: acc.publicKey.toBase58(),
            tokenAMint,
            tokenBMint,
            tokenASymbol: getTokenSymbol(tokenAMint),
            tokenBSymbol: getTokenSymbol(tokenBMint),
            tokenADecimals: decimalsA,
            tokenBDecimals: decimalsB,
            reserveA,
            reserveB,
            tvl: 0, // Will be enriched by indexer
            volume24h: 0,
            feeRate: Number(pool.feeRate),
            apr: 0,
            totalLpSupply: Number(pool.totalLpSupply),
            lpMint: (pool.lpMint as PublicKey).toBase58(),
            tokenAVault: (pool.tokenAVault as PublicKey).toBase58(),
            tokenBVault: (pool.tokenBVault as PublicKey).toBase58(),
          };
        });
      } catch (err) {
        console.warn("On-chain pool fetch failed, trying indexer:", err);
      }

      // Enrich with indexer data (volume, TVL, APR)
      try {
        const res = await fetch(`${INDEXER_URL}/api/pools/stats`);
        if (res.ok) {
          const json = await res.json();
          const indexerPools = json.data || json;

          if (onChainPools.length > 0) {
            // Merge indexer stats into on-chain data
            const indexerMap = new Map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              indexerPools.map((p: any) => [p.pool_address, p])
            );
            onChainPools = onChainPools.map((pool) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const stats = indexerMap.get(pool.address) as any;
              if (stats) {
                return {
                  ...pool,
                  tvl: stats.tvl || pool.reserveA * 2, // rough estimate
                  volume24h: stats.volume_24h || 0,
                  apr: stats.volume_24h
                    ? ((stats.volume_24h * pool.feeRate) /
                        10000 /
                        (stats.tvl || 1)) *
                      365 *
                      100
                    : 0,
                };
              }
              return pool;
            });
          } else {
            // No on-chain data available — use indexer as source of truth
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChainPools = indexerPools.map((p: any) => ({
              address: p.pool_address,
              tokenAMint: p.token_a_mint || "",
              tokenBMint: p.token_b_mint || "",
              tokenASymbol: p.token_a_symbol || "???",
              tokenBSymbol: p.token_b_symbol || "???",
              tokenADecimals: 6,
              tokenBDecimals: 6,
              reserveA: p.reserve_a || 0,
              reserveB: p.reserve_b || 0,
              tvl: p.tvl || 0,
              volume24h: p.volume_24h || 0,
              feeRate: p.fee_rate || 25,
              apr: p.volume_24h
                ? ((p.volume_24h * (p.fee_rate || 25)) /
                    10000 /
                    (p.tvl || 1)) *
                  365 *
                  100
                : 0,
              totalLpSupply: p.total_lp_supply || 0,
              lpMint: "",
              tokenAVault: "",
              tokenBVault: "",
            }));
          }
        }
      } catch {
        console.warn("Indexer unavailable, using on-chain data only");
      }

      setPools(onChainPools);
    } catch (err) {
      console.error("Failed to fetch pools:", err);
      setError("Failed to load pools");
    } finally {
      setLoading(false);
    }
  }, [connection, wallet]);

  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 30_000);
    return () => clearInterval(interval);
  }, [fetchPools]);

  return { pools, loading, error, refresh: fetchPools };
}

export function usePool(address: string) {
  const { pools, loading, error } = usePools();
  const pool = pools.find((p) => p.address === address);
  return { pool, loading, error };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:3001";

// --- Interfaces ---

export interface PoolStats {
  pool_address: string;
  token_a_mint: string;
  token_b_mint: string;
  token_a_symbol: string;
  token_b_symbol: string;
  reserve_a: number;
  reserve_b: number;
  total_lp_supply: number;
  fee_rate: number;
  volume_24h: number;
  volume_7d: number;
  fees_24h: number;
  total_fees: number;
  trade_count: number;
  price_change_24h: number;
  tvl: number;
  price: number;
}

export interface ProtocolStats {
  total_pools: number;
  total_24h_volume: number;
  total_tvl: number;
  total_24h_fees: number;
  total_swaps: number;
}

export interface SwapRecord {
  id: number;
  pool_address: string;
  user_address: string;
  swap_direction: number; // 0 = A→B, 1 = B→A
  amount_in: string;
  amount_out: string;
  fee_amount: string;
  price: number;
  signature: string;
  block_time: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Simple in-memory cache: url → { data, timestamp }
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5_000; // 5 seconds stale-while-revalidate

// --- Generic fetcher with visibility-aware polling + caching ---

function useAutoFetch<T>(
  url: string | null,
  refreshInterval: number
): FetchState<T> & { refresh: () => void } {
  const [state, setState] = useState<FetchState<T>>(() => {
    // Initialize from cache if available
    if (url) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { data: cached.data as T, loading: false, error: null };
      }
    }
    return { data: null, loading: true, error: null };
  });
  const abortRef = useRef<AbortController | null>(null);
  const visibleRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    // Skip fetch if tab is hidden
    if (!visibleRef.current) return;

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const result = json.data !== undefined ? json.data : json;

      // Update cache
      cache.set(url, { data: result, timestamp: Date.now() });

      setState({ data: result, loading: false, error: null });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Fetch failed",
      }));
    }
  }, [url]);

  // Page Visibility: pause polling when hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibleRef.current = !document.hidden;
      // Refresh immediately when becoming visible again
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    if (!url) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchData, refreshInterval, url]);

  return { ...state, refresh: fetchData };
}

// --- Hooks ---

export function usePoolStats(poolAddress?: string) {
  const url = poolAddress
    ? `${INDEXER_URL}/api/pools/${poolAddress}/stats`
    : `${INDEXER_URL}/api/pools/stats`;
  return useAutoFetch<PoolStats>(url, 30_000);
}

export function useProtocolStats() {
  return useAutoFetch<ProtocolStats>(
    `${INDEXER_URL}/api/protocol/stats`,
    30_000
  );
}

export function useSwaps(poolAddress: string, limit: number = 50) {
  const url = poolAddress
    ? `${INDEXER_URL}/api/swaps?pool=${poolAddress}&limit=${limit}`
    : null;
  return useAutoFetch<SwapRecord[]>(url, 15_000);
}

export function useUserSwaps(walletAddress: string | null) {
  const url = walletAddress
    ? `${INDEXER_URL}/api/swaps/user?address=${walletAddress}`
    : null;
  return useAutoFetch<SwapRecord[]>(url, 15_000);
}

export function useCandles(poolAddress: string, interval: string) {
  const lookbackMs: Record<string, number> = {
    "1m": 24 * 60 * 60 * 1000,
    "5m": 2 * 24 * 60 * 60 * 1000,
    "15m": 4 * 24 * 60 * 60 * 1000,
    "1h": 7 * 24 * 60 * 60 * 1000,
    "4h": 30 * 24 * 60 * 60 * 1000,
    "1D": 180 * 24 * 60 * 60 * 1000,
  };

  const now = Date.now();
  const from = Math.floor(
    (now - (lookbackMs[interval] || lookbackMs["1h"])) / 1000
  );
  const to = Math.floor(now / 1000);

  const apiInterval = interval === "1D" ? "1d" : interval;
  const url = poolAddress
    ? `${INDEXER_URL}/api/candles?pool=${poolAddress}&interval=${apiInterval}&from=${from}&to=${to}`
    : null;
  return useAutoFetch<CandleData[]>(url, 10_000);
}

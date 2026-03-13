"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePoolStats } from "@/hooks/useIndexerApi";
import { usePool } from "@/hooks/usePools";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useLiquidity } from "@/hooks/useLiquidity";
import { useToast } from "./Toast";
import { ErrorBoundary } from "./ErrorBoundary";
import PriceChart from "./PriceChart";
import TransactionHistory from "./TransactionHistory";
import UserHistory from "./UserHistory";

interface PoolDetailProps {
  poolId: string;
}

export default function PoolDetail({ poolId }: PoolDetailProps) {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");
  const [historyTab, setHistoryTab] = useState<"trades" | "yours">("trades");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpAmount, setLpAmount] = useState("");

  const { data: poolStats, loading: statsLoading } = usePoolStats(poolId);
  const { pool: onChainPool } = usePool(poolId);
  const { getBalance } = useTokenBalances();
  const { addLiquidity, removeLiquidity, loading: txLoading } = useLiquidity();
  const { showToast, updateToast } = useToast();

  const pool = {
    tokenAMint: onChainPool?.tokenAMint || "",
    tokenBMint: onChainPool?.tokenBMint || "",
    tokenASymbol: poolStats?.token_a_symbol || onChainPool?.tokenASymbol || "Token A",
    tokenBSymbol: poolStats?.token_b_symbol || onChainPool?.tokenBSymbol || "Token B",
    tokenADecimals: onChainPool?.tokenADecimals || 6,
    tokenBDecimals: onChainPool?.tokenBDecimals || 6,
    reserveA: poolStats?.reserve_a || onChainPool?.reserveA || 0,
    reserveB: poolStats?.reserve_b || onChainPool?.reserveB || 0,
    tvl: poolStats?.tvl || onChainPool?.tvl || 0,
    volume24h: poolStats?.volume_24h || 0,
    volume7d: poolStats?.volume_7d || 0,
    feeRate: poolStats?.fee_rate || onChainPool?.feeRate || 25,
    fees24h: poolStats?.fees_24h || 0,
    totalFees: poolStats?.total_fees || 0,
    tradeCount: poolStats?.trade_count || 0,
    priceChange24h: poolStats?.price_change_24h || 0,
    totalLpSupply: poolStats?.total_lp_supply || onChainPool?.totalLpSupply || 1,
    lpMint: onChainPool?.lpMint || "",
    tokenAVault: onChainPool?.tokenAVault || "",
    tokenBVault: onChainPool?.tokenBVault || "",
  };

  const balanceA = pool.tokenAMint ? getBalance(pool.tokenAMint) : 0;
  const balanceB = pool.tokenBMint ? getBalance(pool.tokenBMint) : 0;
  const lpBalance = pool.lpMint ? getBalance(pool.lpMint) : 0;

  const price = pool.reserveA > 0 ? pool.reserveB / pool.reserveA : 0;

  const handleAddLiquidity = async () => {
    if (!amountA || !amountB || !onChainPool) return;

    const toastId = showToast("loading", "Adding liquidity...");
    try {
      const sig = await addLiquidity(
        poolId,
        pool.tokenAMint,
        pool.tokenBMint,
        pool.tokenAVault,
        pool.tokenBVault,
        pool.lpMint,
        parseFloat(amountA),
        parseFloat(amountB),
        pool.tokenADecimals,
        pool.tokenBDecimals
      );
      updateToast(toastId, "success", "Liquidity added!", sig);
      setAmountA("");
      setAmountB("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add liquidity";
      updateToast(toastId, "error", message);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!lpAmount || !onChainPool) return;

    const toastId = showToast("loading", "Removing liquidity...");
    try {
      const sig = await removeLiquidity(
        poolId,
        pool.tokenAMint,
        pool.tokenBMint,
        pool.tokenAVault,
        pool.tokenBVault,
        pool.lpMint,
        Math.floor(parseFloat(lpAmount) * 1e6)
      );
      updateToast(toastId, "success", "Liquidity removed!", sig);
      setLpAmount("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove liquidity";
      updateToast(toastId, "error", message);
    }
  };

  return (
    <div>
      {/* Pool Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex -space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-lg font-bold border-2 border-dark-900 z-10">
            {pool.tokenASymbol[0]}
          </div>
          <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-lg font-bold border-2 border-dark-900">
            {pool.tokenBSymbol[0]}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {pool.tokenASymbol}/{pool.tokenBSymbol}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-dark-400">
              Fee: {(pool.feeRate / 100).toFixed(2)}%
            </span>
            {pool.priceChange24h !== 0 && (
              <span
                className={`text-sm font-medium ${
                  pool.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {pool.priceChange24h >= 0 ? "+" : ""}
                {pool.priceChange24h.toFixed(2)}% (24h)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Current Price"
          value={price > 0 ? price.toFixed(4) : "--"}
          loading={statsLoading}
        />
        <StatCard label="TVL" value={`$${pool.tvl.toLocaleString()}`} loading={statsLoading} />
        <StatCard
          label="24h Volume"
          value={`$${pool.volume24h.toLocaleString()}`}
          loading={statsLoading}
        />
        <StatCard
          label="24h Fees"
          value={`$${pool.fees24h.toLocaleString()}`}
          loading={statsLoading}
        />
      </div>

      {/* Main Content: Chart + Liquidity Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ErrorBoundary>
            <PriceChart poolAddress={poolId} height={400} />
          </ErrorBoundary>
        </div>

        {/* Liquidity Management */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === "add"
                  ? "bg-primary-600 text-white"
                  : "bg-dark-800 text-dark-400 hover:text-white"
              }`}
            >
              Add
            </button>
            <button
              onClick={() => setActiveTab("remove")}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === "remove"
                  ? "bg-primary-600 text-white"
                  : "bg-dark-800 text-dark-400 hover:text-white"
              }`}
            >
              Remove
            </button>
          </div>

          {activeTab === "add" ? (
            <div className="space-y-3">
              <div className="bg-dark-800 rounded-xl p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-dark-400">{pool.tokenASymbol}</span>
                  <span className="text-xs text-dark-400">
                    Balance: {connected ? balanceA.toFixed(4) : "--"}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold outline-none placeholder-dark-600"
                />
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-dark-400">{pool.tokenBSymbol}</span>
                  <span className="text-xs text-dark-400">
                    Balance: {connected ? balanceB.toFixed(4) : "--"}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold outline-none placeholder-dark-600"
                />
              </div>
              <button
                onClick={handleAddLiquidity}
                disabled={!connected || !amountA || !amountB || txLoading}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  connected && amountA && amountB && !txLoading
                    ? "bg-primary-600 hover:bg-primary-700 text-white"
                    : "bg-dark-700 text-dark-400 cursor-not-allowed"
                }`}
              >
                {!connected
                  ? "Connect Wallet"
                  : txLoading
                  ? "Confirming..."
                  : "Add Liquidity"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-dark-800 rounded-xl p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-dark-400">LP Tokens</span>
                  <span className="text-xs text-dark-400">
                    Balance: {connected ? lpBalance.toFixed(4) : "--"}
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={lpAmount}
                  onChange={(e) => setLpAmount(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold outline-none placeholder-dark-600"
                />
              </div>
              {lpAmount && pool.totalLpSupply > 0 && (
                <div className="bg-dark-800/50 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="text-dark-400">You will receive:</div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">{pool.tokenASymbol}</span>
                    <span>
                      ~{((parseFloat(lpAmount) / pool.totalLpSupply) * pool.reserveA).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">{pool.tokenBSymbol}</span>
                    <span>
                      ~{((parseFloat(lpAmount) / pool.totalLpSupply) * pool.reserveB).toFixed(4)}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleRemoveLiquidity}
                disabled={!connected || !lpAmount || txLoading}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  connected && lpAmount && !txLoading
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-dark-700 text-dark-400 cursor-not-allowed"
                }`}
              >
                {!connected
                  ? "Connect Wallet"
                  : txLoading
                  ? "Confirming..."
                  : "Remove Liquidity"}
              </button>
            </div>
          )}

          {/* Pool Stats */}
          <div className="mt-5 pt-5 border-t border-dark-700 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-400">{pool.tokenASymbol} Reserve</span>
              <span>{pool.reserveA.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">{pool.tokenBSymbol} Reserve</span>
              <span>{pool.reserveB.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">7d Volume</span>
              <span>${pool.volume7d.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-400">Total Trades</span>
              <span>{pool.tradeCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setHistoryTab("trades")}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${
              historyTab === "trades"
                ? "bg-primary-600 text-white"
                : "bg-dark-800 text-dark-400 hover:text-white"
            }`}
          >
            Trades
          </button>
          {connected && (
            <button
              onClick={() => setHistoryTab("yours")}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-colors ${
                historyTab === "yours"
                  ? "bg-primary-600 text-white"
                  : "bg-dark-800 text-dark-400 hover:text-white"
              }`}
            >
              Your History
            </button>
          )}
        </div>

        <ErrorBoundary>
          {historyTab === "trades" ? (
            <TransactionHistory poolAddress={poolId} />
          ) : (
            <UserHistory />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
      <div className="text-sm text-dark-400 mb-1">{label}</div>
      {loading ? (
        <div className="h-7 w-20 bg-dark-700 rounded animate-pulse" />
      ) : (
        <div className="text-lg font-semibold">{value}</div>
      )}
    </div>
  );
}

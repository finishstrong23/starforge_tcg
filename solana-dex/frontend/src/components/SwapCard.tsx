"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSwap } from "@/hooks/useSwap";
import { usePools } from "@/hooks/usePools";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useToast } from "./Toast";
import TokenSelector from "./TokenSelector";
import SlippageSettings from "./SlippageSettings";

export default function SwapCard() {
  const { connected } = useWallet();
  const [tokenA, setTokenA] = useState<string>("");
  const [tokenB, setTokenB] = useState<string>("");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);
  const [direction, setDirection] = useState<"AtoB" | "BtoA">("AtoB");

  const { swap, estimateOutput, loading, priceImpact } = useSwap();
  const { pools } = usePools();
  const { getBalance } = useTokenBalances();
  const { showToast, updateToast } = useToast();

  // Find the matching pool for the selected token pair
  const matchedPool = useMemo(() => {
    if (!tokenA || !tokenB) return null;
    return pools.find(
      (p) =>
        (p.tokenAMint === tokenA && p.tokenBMint === tokenB) ||
        (p.tokenAMint === tokenB && p.tokenBMint === tokenA)
    );
  }, [tokenA, tokenB, pools]);

  // Calculate effective direction based on pool token ordering
  const effectiveDirection = useMemo(() => {
    if (!matchedPool) return direction;
    if (matchedPool.tokenAMint === tokenA) return "AtoB";
    return "BtoA";
  }, [matchedPool, tokenA, direction]);

  // Estimate output when input changes
  useEffect(() => {
    if (amountIn && matchedPool) {
      const reserveIn =
        effectiveDirection === "AtoB"
          ? matchedPool.reserveA
          : matchedPool.reserveB;
      const reserveOut =
        effectiveDirection === "AtoB"
          ? matchedPool.reserveB
          : matchedPool.reserveA;
      const estimate = estimateOutput(
        reserveIn,
        reserveOut,
        parseFloat(amountIn),
        matchedPool.feeRate
      );
      setAmountOut(estimate > 0 ? estimate.toFixed(6) : "");
    } else {
      setAmountOut("");
    }
  }, [amountIn, matchedPool, effectiveDirection, estimateOutput]);

  const balanceA = tokenA ? getBalance(tokenA) : 0;
  const balanceB = tokenB ? getBalance(tokenB) : 0;

  const handleSwap = useCallback(async () => {
    if (!amountIn || !matchedPool) return;

    const toastId = showToast("loading", "Confirming swap...");

    try {
      const decimalsIn =
        effectiveDirection === "AtoB"
          ? matchedPool.tokenADecimals
          : matchedPool.tokenBDecimals;
      const minOut = parseFloat(amountOut) * (1 - slippage / 100);

      const sig = await swap(
        matchedPool.address,
        matchedPool.tokenAMint,
        matchedPool.tokenBMint,
        matchedPool.tokenAVault,
        matchedPool.tokenBVault,
        parseFloat(amountIn),
        minOut,
        decimalsIn,
        effectiveDirection
      );

      updateToast(toastId, "success", "Swap confirmed!", sig);
      setAmountIn("");
      setAmountOut("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Swap failed";
      updateToast(toastId, "error", message);
    }
  }, [
    amountIn,
    amountOut,
    matchedPool,
    slippage,
    effectiveDirection,
    swap,
    showToast,
    updateToast,
  ]);

  const handleFlip = () => {
    setTokenA(tokenB);
    setTokenB(tokenA);
    setAmountIn(amountOut);
    setDirection(direction === "AtoB" ? "BtoA" : "AtoB");
  };

  const handleMaxA = () => {
    if (balanceA > 0) {
      setAmountIn(balanceA.toString());
    }
  };

  const noPool = tokenA && tokenB && !matchedPool;

  return (
    <div className="w-full max-w-md">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 glow-primary">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Swap</h2>
          <button
            onClick={() => setShowSlippage(!showSlippage)}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        {/* Slippage Settings */}
        {showSlippage && (
          <SlippageSettings slippage={slippage} setSlippage={setSlippage} />
        )}

        {/* From Token */}
        <div className="bg-dark-800 rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">From</span>
            <button
              onClick={handleMaxA}
              className="text-sm text-dark-400 hover:text-primary-400 transition-colors"
            >
              Balance: {connected ? balanceA.toFixed(4) : "--"}
              {connected && balanceA > 0 && (
                <span className="ml-1 text-primary-400 text-xs">MAX</span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.00"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder-dark-600"
            />
            <TokenSelector
              selectedToken={tokenA}
              onSelect={setTokenA}
              excludeToken={tokenB}
            />
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={handleFlip}
            className="p-2 bg-dark-800 border border-dark-600 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="bg-dark-800 rounded-xl p-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">To</span>
            <span className="text-sm text-dark-400">
              Balance: {connected ? balanceB.toFixed(4) : "--"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="0.00"
              value={amountOut}
              readOnly
              className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder-dark-600"
            />
            <TokenSelector
              selectedToken={tokenB}
              onSelect={setTokenB}
              excludeToken={tokenA}
            />
          </div>
        </div>

        {/* No pool warning */}
        {noPool && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
            No liquidity pool exists for this token pair
          </div>
        )}

        {/* Price Impact & Info */}
        {priceImpact > 0 && matchedPool && (
          <div className="mt-4 p-3 bg-dark-800 rounded-lg space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Price Impact</span>
              <span
                className={
                  priceImpact > 5
                    ? "text-red-400"
                    : priceImpact > 1
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              >
                {priceImpact.toFixed(2)}%
              </span>
            </div>
            {priceImpact > 5 && (
              <p className="text-xs text-red-400">
                High price impact! Consider reducing your trade size.
              </p>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Slippage Tolerance</span>
              <span className="text-dark-300">{slippage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Fee</span>
              <span className="text-dark-300">
                {(matchedPool.feeRate / 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={
            !connected ||
            !amountIn ||
            !tokenA ||
            !tokenB ||
            !matchedPool ||
            loading
          }
          className={`w-full mt-4 py-4 rounded-xl font-semibold text-lg transition-all ${
            connected &&
            amountIn &&
            tokenA &&
            tokenB &&
            matchedPool &&
            !loading
              ? "bg-primary-600 hover:bg-primary-700 text-white glow-primary"
              : "bg-dark-700 text-dark-400 cursor-not-allowed"
          }`}
        >
          {!connected
            ? "Connect Wallet"
            : loading
            ? "Confirming..."
            : !tokenA || !tokenB
            ? "Select Tokens"
            : noPool
            ? "No Pool Available"
            : !amountIn
            ? "Enter Amount"
            : "Swap"}
        </button>
      </div>
    </div>
  );
}

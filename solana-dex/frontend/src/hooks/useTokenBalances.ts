"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

// SPL Token Program
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

interface TokenBalance {
  mint: string;
  amount: number; // raw lamports / smallest unit
  decimals: number;
  uiAmount: number; // human-readable
}

export function useTokenBalances() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalances(new Map());
      return;
    }

    setLoading(true);
    try {
      const map = new Map<string, TokenBalance>();

      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      map.set(SOL_MINT, {
        mint: SOL_MINT,
        amount: solBalance,
        decimals: 9,
        uiAmount: solBalance / LAMPORTS_PER_SOL,
      });

      // Fetch all SPL token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      for (const { account } of tokenAccounts.value) {
        const parsed = account.data.parsed;
        if (parsed.type === "account") {
          const info = parsed.info;
          map.set(info.mint, {
            mint: info.mint,
            amount: Number(info.tokenAmount.amount),
            decimals: info.tokenAmount.decimals,
            uiAmount: info.tokenAmount.uiAmount ?? 0,
          });
        }
      }

      setBalances(map);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, connected]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchBalances();

    // Refresh every 30s
    const interval = setInterval(fetchBalances, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  const getBalance = useCallback(
    (mint: string): number => {
      return balances.get(mint)?.uiAmount ?? 0;
    },
    [balances]
  );

  return { balances, loading, getBalance, refresh: fetchBalances };
}

"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "@/utils/program";

export function useSwap() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);

  const estimateOutput = useCallback(
    (
      reserveIn: number,
      reserveOut: number,
      amountIn: number,
      feeRate: number
    ): number => {
      if (reserveIn <= 0 || reserveOut <= 0 || amountIn <= 0) return 0;

      const fee = (amountIn * feeRate) / 10000;
      const effectiveAmountIn = amountIn - fee;
      const amountOut =
        (reserveOut * effectiveAmountIn) / (reserveIn + effectiveAmountIn);

      // Calculate price impact
      const spotPrice = reserveOut / reserveIn;
      const executionPrice = amountOut / amountIn;
      const impact = Math.abs((spotPrice - executionPrice) / spotPrice) * 100;
      setPriceImpact(impact);

      return amountOut;
    },
    []
  );

  const swap = useCallback(
    async (
      poolAddress: string,
      tokenAMint: string,
      tokenBMint: string,
      tokenAVault: string,
      tokenBVault: string,
      amountIn: number,
      minAmountOut: number,
      decimalsIn: number,
      direction: "AtoB" | "BtoA"
    ): Promise<string> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const program = getProgram(connection, wallet as any);

        const userPubkey = wallet.publicKey;
        const mintA = new PublicKey(tokenAMint);
        const mintB = new PublicKey(tokenBMint);

        // Get or create user token accounts
        const userTokenA = getAssociatedTokenAddressSync(mintA, userPubkey);
        const userTokenB = getAssociatedTokenAddressSync(mintB, userPubkey);

        // Check if ATAs exist, create if needed
        const preInstructions = [];
        const ataA = await connection.getAccountInfo(userTokenA);
        if (!ataA) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              userPubkey,
              userTokenA,
              userPubkey,
              mintA,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
        const ataB = await connection.getAccountInfo(userTokenB);
        if (!ataB) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              userPubkey,
              userTokenB,
              userPubkey,
              mintB,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        const amountInBN = new BN(
          Math.floor(amountIn * Math.pow(10, decimalsIn))
        );
        const minOutBN = new BN(
          Math.floor(minAmountOut * Math.pow(10, decimalsIn))
        );

        const swapDirection =
          direction === "AtoB" ? { aToB: {} } : { bToA: {} };

        const tx = await program.methods
          .swap(amountInBN, minOutBN, swapDirection)
          .accounts({
            pool: new PublicKey(poolAddress),
            userTokenA,
            userTokenB,
            tokenAVault: new PublicKey(tokenAVault),
            tokenBVault: new PublicKey(tokenBVault),
            user: userPubkey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .preInstructions(preInstructions)
          .rpc({ commitment: "confirmed" });

        return tx;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return { swap, estimateOutput, loading, priceImpact };
}

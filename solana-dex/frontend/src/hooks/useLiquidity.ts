"use client";

import { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { getProgram, findPoolPda } from "@/utils/program";

export function useLiquidity() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  const addLiquidity = useCallback(
    async (
      poolAddress: string,
      tokenAMint: string,
      tokenBMint: string,
      tokenAVault: string,
      tokenBVault: string,
      lpMint: string,
      amountA: number,
      amountB: number,
      decimalsA: number,
      decimalsB: number,
      minLpTokens: number = 0
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
        const lpMintPk = new PublicKey(lpMint);

        const userTokenA = getAssociatedTokenAddressSync(mintA, userPubkey);
        const userTokenB = getAssociatedTokenAddressSync(mintB, userPubkey);
        const userLpToken = getAssociatedTokenAddressSync(
          lpMintPk,
          userPubkey
        );

        // Create LP ATA if it doesn't exist
        const preInstructions = [];
        const lpAta = await connection.getAccountInfo(userLpToken);
        if (!lpAta) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              userPubkey,
              userLpToken,
              userPubkey,
              lpMintPk,
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        const amountABN = new BN(
          Math.floor(amountA * Math.pow(10, decimalsA))
        );
        const amountBBN = new BN(
          Math.floor(amountB * Math.pow(10, decimalsB))
        );
        const minLpBN = new BN(minLpTokens);

        const tx = await program.methods
          .addLiquidity(amountABN, amountBBN, minLpBN)
          .accounts({
            pool: new PublicKey(poolAddress),
            userTokenA,
            userTokenB,
            tokenAVault: new PublicKey(tokenAVault),
            tokenBVault: new PublicKey(tokenBVault),
            lpMint: lpMintPk,
            userLpToken,
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

  const removeLiquidity = useCallback(
    async (
      poolAddress: string,
      tokenAMint: string,
      tokenBMint: string,
      tokenAVault: string,
      tokenBVault: string,
      lpMint: string,
      lpTokenAmount: number,
      minAOut: number = 0,
      minBOut: number = 0
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
        const lpMintPk = new PublicKey(lpMint);

        const userTokenA = getAssociatedTokenAddressSync(mintA, userPubkey);
        const userTokenB = getAssociatedTokenAddressSync(mintB, userPubkey);
        const userLpToken = getAssociatedTokenAddressSync(
          lpMintPk,
          userPubkey
        );

        // Create ATAs for receiving tokens if they don't exist
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

        const lpAmountBN = new BN(lpTokenAmount);
        const minAOutBN = new BN(minAOut);
        const minBOutBN = new BN(minBOut);

        const tx = await program.methods
          .removeLiquidity(lpAmountBN, minAOutBN, minBOutBN)
          .accounts({
            pool: new PublicKey(poolAddress),
            userTokenA,
            userTokenB,
            tokenAVault: new PublicKey(tokenAVault),
            tokenBVault: new PublicKey(tokenBVault),
            lpMint: lpMintPk,
            userLpToken,
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

  const createPool = useCallback(
    async (
      tokenAMint: string,
      tokenBMint: string,
      feeRate: number
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

        const [poolPda] = findPoolPda(mintA, mintB);

        // Generate keypairs for vaults and LP mint
        const tokenAVault = Keypair.generate();
        const tokenBVault = Keypair.generate();
        const lpMint = Keypair.generate();

        const tx = await program.methods
          .initializePool(feeRate)
          .accounts({
            pool: poolPda,
            tokenAMint: mintA,
            tokenBMint: mintB,
            tokenAVault: tokenAVault.publicKey,
            tokenBVault: tokenBVault.publicKey,
            lpMint: lpMint.publicKey,
            admin: userPubkey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: PublicKey.default,
          })
          .signers([tokenAVault, tokenBVault, lpMint])
          .rpc({ commitment: "confirmed" });

        return tx;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return { addLiquidity, removeLiquidity, createPool, loading };
}

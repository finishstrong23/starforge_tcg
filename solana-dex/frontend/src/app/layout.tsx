import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./client-layout";

export const metadata: Metadata = {
  title: "SolanaDEX — Decentralized Token Exchange on Solana",
  description:
    "Swap tokens instantly with minimal slippage. Provide liquidity and earn trading fees on Solana's fastest AMM.",
  keywords: [
    "Solana",
    "DEX",
    "AMM",
    "DeFi",
    "swap",
    "liquidity",
    "trading",
  ],
  openGraph: {
    title: "SolanaDEX",
    description:
      "Swap tokens instantly with minimal slippage on Solana.",
    type: "website",
    siteName: "SolanaDEX",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolanaDEX",
    description:
      "Swap tokens instantly with minimal slippage on Solana.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-950 text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

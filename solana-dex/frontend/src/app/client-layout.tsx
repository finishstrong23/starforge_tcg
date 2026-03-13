"use client";

import { WalletProviders } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/Toast";
import { Sidebar } from "@/components/Sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProviders>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">{children}</main>
        </div>
      </ToastProvider>
    </WalletProviders>
  );
}

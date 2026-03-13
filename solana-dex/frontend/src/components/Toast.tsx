"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  txSignature?: string;
}

interface ToastContextType {
  showToast: (
    type: ToastType,
    message: string,
    txSignature?: string
  ) => number;
  dismissToast: (id: number) => void;
  updateToast: (
    id: number,
    type: ToastType,
    message: string,
    txSignature?: string
  ) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, message: string, txSignature?: string): number => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, type, message, txSignature }]);

      // Auto-dismiss after 6s (except loading)
      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      }

      return id;
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback(
    (id: number, type: ToastType, message: string, txSignature?: string) => {
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, type, message, txSignature } : t
        )
      );
      // Auto-dismiss after update
      if (type !== "loading") {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      }
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, updateToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const bgColor = {
    success: "border-green-500/30 bg-green-500/10",
    error: "border-red-500/30 bg-red-500/10",
    info: "border-primary-500/30 bg-primary-500/10",
    loading: "border-yellow-500/30 bg-yellow-500/10",
  }[toast.type];

  const iconColor = {
    success: "text-green-400",
    error: "text-red-400",
    info: "text-primary-400",
    loading: "text-yellow-400",
  }[toast.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${bgColor} backdrop-blur-sm animate-slideIn`}
    >
      <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
        {toast.type === "loading" ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : toast.type === "success" ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : toast.type === "error" ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{toast.message}</p>
        {toast.txSignature && (
          <a
            href={`https://explorer.solana.com/tx/${toast.txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-400 hover:text-primary-300 mt-1 inline-block"
          >
            View on Explorer &rarr;
          </a>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-dark-400 hover:text-white"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

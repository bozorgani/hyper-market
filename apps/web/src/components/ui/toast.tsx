"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  action?: {
    label: string;
    href: string;
  };
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-50 text-green-900",
  error: "border-red-500/30 bg-red-50 text-red-900",
  info: "border-blue-500/30 bg-blue-50 text-blue-900",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((currentToasts) => [...currentToasts, { ...toast, id }]);
    window.setTimeout(() => dismissToast(id), 4500);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 left-4 z-[90] grid w-[calc(100%-2rem)] max-w-sm gap-3 sm:bottom-6 sm:left-6"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "relative rounded-2xl border p-4 pl-11 text-right shadow-lg transition",
              toastStyles[toast.type],
            )}
          >
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="بستن پیام"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="font-black">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-sm leading-6 opacity-80">{toast.description}</p> : null}
            {toast.action ? (
              <Link
                href={toast.action.href}
                onClick={() => dismissToast(toast.id)}
                className="mt-3 inline-flex min-h-9 items-center rounded-xl bg-white/80 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              >
                {toast.action.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

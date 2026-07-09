"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          const message = error instanceof Error ? error.message.toLowerCase() : "";
          if (message.includes("اطلاعات ورود") || message.includes("مجوز")) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // Error handling is now per-component – no global toast to avoid duplicate UX noise (Issue #19)
      },
      mutations: {
        retry: 0,
      },
    },
    // QueryCache onError toast removed – Issue #19
    // Prevents duplicate toasts, stale closure, and noisy global error handling.
    // Components should handle errors with useQuery({ ... , meta }) or UI-level ErrorState.
  });
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProviders>{children}</AppProviders>
    </ToastProvider>
  );
}

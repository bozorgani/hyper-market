"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";

function createQueryClient(showToast?: ReturnType<typeof useToast>["showToast"]) {
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
      },
      mutations: {
        retry: 0,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (!showToast) return;
        showToast({
          type: "error",
          title: "دریافت اطلاعات ناموفق بود",
          description: error instanceof Error ? error.message : undefined,
        });
      },
    }),
  });
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [queryClient] = useState(() => createQueryClient(showToast));
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

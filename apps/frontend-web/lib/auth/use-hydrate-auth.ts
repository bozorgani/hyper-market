"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth/store";

export function useHydrateAuth(): void {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}

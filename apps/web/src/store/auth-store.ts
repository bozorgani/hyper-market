"use client";

import { create } from "zustand";
import { api } from "@/services/api";
import type { User } from "@/types/domain";

const DEVICE_KEY = "hyper_market_device_id";

// Legacy keys – cleaned once on hydrate to remove XSS-able sessionStorage data
const LEGACY_KEYS = [
  "hyper_market_access_token",
  "hyper_market_refresh_token",
  "hyper_market_user",
];

let hydrationPromise: Promise<void> | null = null;

type LoginInput = {
  email?: string;
  phoneNumber?: string;
  password: string;
};

type AuthState = {
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  refreshSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
};

function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let deviceId = window.localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, deviceId);
    }
    return deviceId;
  } catch {
    // localStorage may be blocked (private mode) – continue without deviceId
    return null;
  }
}

function clearLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    LEGACY_KEYS.forEach((key) => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore storage access errors
  }
}

async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me", { _skipAuthRedirect: true });
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,

  setUser: (user) => set({ user }),

  hydrate: async () => {
    if (get().hydrated) return;
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      clearLegacyAuthStorage();

      try {
        const user = await fetchCurrentUser();
        set({ user, hydrated: true });
      } catch {
        set({ user: null, hydrated: true });
      }
    })().finally(() => {
      hydrationPromise = null;
    });

    return hydrationPromise;
  },

  login: async (input: LoginInput) => {
    const deviceId = getDeviceId();
    const payload = deviceId ? { ...input, deviceId } : input;

    await api.post("/auth/login", payload);
    const user = await fetchCurrentUser();

    set({ user });
  },

  refreshSession: async () => {
    try {
      await api.post("/auth/refresh", {});
      const user = await fetchCurrentUser();
      set({ user });
      return user;
    } catch {
      set({ user: null });
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // ensure client cleanup even if server fails
    } finally {
      clearLegacyAuthStorage();
      set({ user: null });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },
}));

// Optional: expose a selector-stable helper for components that previously
// read accessToken / refreshToken (now always null) – keeps backward compat
// during migration. Remove in next major.
export const useAuthToken = () => null;

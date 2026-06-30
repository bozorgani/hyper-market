"use client";

import { create } from "zustand";
import { api } from "@/services/api";
import type { User } from "@/types/domain";

const TOKEN_KEY = "hyper_market_access_token";
const USER_KEY = "hyper_market_user";
const DEVICE_KEY = "hyper_market_device_id";
const REFRESH_TOKEN_KEY = "hyper_market_refresh_token";

type LoginInput = {
  email?: string;
  phoneNumber?: string;
  password: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  refreshSession: () => Promise<User | null>;
  logout: () => Promise<void>;
};

function getDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

function clearLegacyTokenStorage(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function clearStoredSession(): void {
  clearLegacyTokenStorage();
  window.sessionStorage.removeItem(USER_KEY);
}

function persistUser(user: User): void {
  clearLegacyTokenStorage();
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me", { _skipAuthRedirect: true });
  persistUser(data);
  return data;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,

  hydrate: async () => {
    clearLegacyTokenStorage();

    try {
      const user = await fetchCurrentUser();
      set({ user, accessToken: null, refreshToken: null, hydrated: true });
      return;
    } catch {
      clearStoredSession();
      set({ user: null, accessToken: null, refreshToken: null, hydrated: true });
    }
  },

  login: async (input: LoginInput) => {
    const deviceId = getDeviceId();
    const payload = {
      ...input,
      deviceId,
    };

    await api.post("/auth/login", payload);
    const user = await fetchCurrentUser();

    set({
      user,
      accessToken: null,
      refreshToken: null,
    });
  },

  refreshSession: async () => {
    try {
      await api.post("/auth/refresh", {});
      const user = await fetchCurrentUser();
      set({ user, accessToken: null, refreshToken: null });
      return user;
    } catch {
      clearStoredSession();
      set({ user: null, accessToken: null, refreshToken: null });
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Client cleanup must still happen even if server logout fails.
    }

    clearStoredSession();
    set({ user: null, accessToken: null, refreshToken: null });
    window.location.href = "/login";
  },
}));

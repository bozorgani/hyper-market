"use client";

import { create } from "zustand";
import { api } from "@/services/api";
import type { User } from "@/types/domain";

const TOKEN_KEY = "hyper_market_access_token";
const USER_KEY = "hyper_market_user";
const DEVICE_KEY = "hyper_market_device_id";
const REFRESH_TOKEN_KEY = "hyper_market_refresh_token";

type JwtPayload = {
  sub: string;
  role: string;
  sessionId?: string;
  deviceId?: string;
};

type LoginInput = {
  email?: string;
  phoneNumber?: string;
  password: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (input: LoginInput) => Promise<void>;
  refreshSession: () => Promise<string | null>;
  logout: () => void;
};

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromToken(token: string): User {
  const payload = decodeToken(token);
  if (!payload?.sub || !payload.role) {
    throw new Error("Invalid authentication token");
  }
  return {
    id: payload.sub,
    role: payload.role,
    sessionId: payload.sessionId,
    deviceId: payload.deviceId,
  };
}

function getDeviceId() {
  let deviceId = window.localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

function clearStoredSession(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function persistSession(accessToken: string, refreshToken: string): User {
  const user = userFromToken(accessToken);
  window.sessionStorage.setItem(TOKEN_KEY, accessToken);
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  hydrate: () => {
    const accessToken = window.sessionStorage.getItem(TOKEN_KEY);
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const storedUser = window.sessionStorage.getItem(USER_KEY);
    if (!accessToken || !refreshToken || !storedUser) {
      set({ hydrated: true });
      return;
    }
    try {
      set({ accessToken, refreshToken, user: JSON.parse(storedUser) as User, hydrated: true });
    } catch {
      clearStoredSession();
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
    }
  },
  login: async (input) => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      ...input,
      deviceId: getDeviceId(),
    });
    const user = persistSession(data.accessToken, data.refreshToken);
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user, hydrated: true });
  },
  refreshSession: async () => {
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearStoredSession();
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
      return null;
    }

    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredSession();
      set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
      return null;
    }

    const data = (await response.json()) as AuthResponse;
    const user = persistSession(data.accessToken, data.refreshToken);
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken, user, hydrated: true });
    return data.accessToken;
  },
  logout: () => {
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (refreshToken) {
      void fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }

    clearStoredSession();
    set({ accessToken: null, refreshToken: null, user: null, hydrated: true });
  },
}));

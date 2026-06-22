"use client";

import { create } from "zustand";
import { apiClient } from "@/lib/api/client";

const ACCESS_TOKEN_KEY = "hyper_market_access_token";
const USER_KEY = "hyper_market_user";

type JwtPayload = {
  sub: string;
  role: string;
  sessionId?: string;
  deviceId?: string;
  tokenVersion?: number;
  jti?: string;
  exp?: number;
};

export type AuthUser = {
  id: string;
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
  refreshToken?: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setAccessToken: (token: string) => void;
  hydrate: () => void;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

function createDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}`;
}

function getDeviceId(): string {
  const existingDeviceId = window.localStorage.getItem("hyper_market_device_id");
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const deviceId = createDeviceId();
  window.localStorage.setItem("hyper_market_device_id", deviceId);
  return deviceId;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = window.atob(normalizedPayload);
    return JSON.parse(decodedPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeJwt(token);
  if (!payload?.sub || !payload.role) {
    return null;
  }

  return {
    id: payload.sub,
    role: payload.role,
    sessionId: payload.sessionId,
    deviceId: payload.deviceId,
  };
}

function persistSession(accessToken: string, user: AuthUser): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,

  setAccessToken: (token) => {
    const user = userFromToken(token);
    if (user) {
      persistSession(token, user);
      set({ accessToken: token, user });
    }
  },

  hydrate: () => {
    if (typeof window === "undefined") {
      return;
    }

    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (!accessToken || !storedUser) {
      set({ hydrated: true });
      return;
    }

    try {
      set({
        accessToken,
        user: JSON.parse(storedUser) as AuthUser,
        hydrated: true,
      });
    } catch {
      clearSession();
      set({ accessToken: null, user: null, hydrated: true });
    }
  },

  login: async (input) => {
    const response = await apiClient.post<AuthResponse, LoginInput & { deviceId: string }>(
      "/auth/login",
      {
        ...input,
        deviceId: getDeviceId(),
      },
    );

    const user = userFromToken(response.accessToken);
    if (!user) {
      throw new Error("Invalid authentication response");
    }

    persistSession(response.accessToken, user);
    set({ accessToken: response.accessToken, user, hydrated: true });
  },

  logout: () => {
    clearSession();
    set({ accessToken: null, user: null, hydrated: true });
  },
}));

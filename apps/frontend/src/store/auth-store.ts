"use client";

import { create } from "zustand";
import { api } from "@/services/api";
import type { User } from "@/types/domain";

const TOKEN_KEY = "hyper_market_access_token";
const USER_KEY = "hyper_market_user";
const DEVICE_KEY = "hyper_market_device_id";

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

type AuthState = {
  user: User | null;
  accessToken: string | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (input: LoginInput) => Promise<void>;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrated: false,
  hydrate: () => {
    const accessToken = window.sessionStorage.getItem(TOKEN_KEY);
    const storedUser = window.sessionStorage.getItem(USER_KEY);
    if (!accessToken || !storedUser) {
      set({ hydrated: true });
      return;
    }
    try {
      set({ accessToken, user: JSON.parse(storedUser) as User, hydrated: true });
    } catch {
      window.sessionStorage.removeItem(TOKEN_KEY);
      window.sessionStorage.removeItem(USER_KEY);
      set({ accessToken: null, user: null, hydrated: true });
    }
  },
  login: async (input) => {
    const { data } = await api.post<{ accessToken: string }>("/auth/login", {
      ...input,
      deviceId: getDeviceId(),
    });
    const user = userFromToken(data.accessToken);
    window.sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ accessToken: data.accessToken, user, hydrated: true });
  },
  logout: () => {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
    set({ accessToken: null, user: null, hydrated: true });
  },
}));

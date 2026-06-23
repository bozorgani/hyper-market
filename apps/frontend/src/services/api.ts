import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const TOKEN_KEY = "hyper_market_access_token";
const USER_KEY = "hyper_market_user";
const REFRESH_TOKEN_KEY = "hyper_market_refresh_token";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
};

type JwtPayload = {
  sub: string;
  role: string;
  sessionId?: string;
  deviceId?: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function localizeApiMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("unauthorized") || normalized.includes("invalid credentials")) return "اطلاعات ورود معتبر نیست.";
  if (normalized.includes("forbidden")) return "شما مجوز انجام این عملیات را ندارید.";
  if (normalized.includes("not found")) return "موردی یافت نشد.";
  if (normalized.includes("insufficient")) return "موجودی کافی نیست.";
  if (normalized.includes("timeout")) return "زمان پاسخ‌گویی سرور به پایان رسید.";
  if (normalized.includes("network")) return "ارتباط با سرور برقرار نشد.";
  return message;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as JwtPayload;
  } catch {
    return null;
  }
}

function persistTokens(accessToken: string, refreshToken: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, accessToken);
  window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  const payload = decodeToken(accessToken);
  if (payload?.sub && payload.role) {
    window.sessionStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id: payload.sub,
        role: payload.role,
        sessionId: payload.sessionId,
        deviceId: payload.deviceId,
      }),
    );
  }
}

function clearStoredSession(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((promise) => {
    if (error || !token) {
      promise.reject(error);
      return;
    }

    promise.resolve(token);
  });

  failedQueue = [];
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Refresh token failed");
  }

  const data = (await response.json()) as AuthResponse;
  persistTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (typeof window !== "undefined" && error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        clearStoredSession();
        redirectToLogin();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((queueError) => Promise.reject(queueError));
      }

      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken(refreshToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearStoredSession();
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join("، ")
      : message || error.response?.data?.error || error.message || "خطای غیرمنتظره رخ داد.";

    return Promise.reject(new Error(localizeApiMessage(normalizedMessage)));
  },
);

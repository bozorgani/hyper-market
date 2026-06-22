import { useAuthStore } from "@/lib/auth/store";

export type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(status: number, payload: ApiErrorPayload | null) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(", ")
      : payload?.message || payload?.error || "Request failed";
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const API_BASE_URL = "/api/v1";
let refreshPromise: Promise<string | null> | null = null;
let refreshAccessToken: (() => Promise<string | null>) | null = null;

export function configureRefreshFlow(
  handler: (() => Promise<string | null>) | null,
): void {
  refreshAccessToken = handler;
}

async function parseError(response: Response): Promise<ApiErrorPayload | null> {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  shouldRetry = true,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && shouldRetry && refreshAccessToken) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const nextToken = await refreshPromise;
    if (nextToken) {
      useAuthStore.getState().setAccessToken(nextToken);
      return request<T>(path, options, false);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T, TBody extends object>(path: string, body: TBody) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

"use server";

import { cookies, headers } from "next/headers";

const CSRF_TOKEN_COOKIE = "hyper_market_csrf_token";
const CSRF_TOKEN_HEADER = "x-csrf-token";

function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured?.startsWith("http")) return configured.replace(/\/$/, "");
  return "http://localhost:3001/api/v1";
}

function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured?.startsWith("http")) return new URL(configured).origin;
  return "http://localhost:3000";
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const csrfToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
  const requestId = headerStore.get("x-request-id") ?? crypto.randomUUID();

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(csrfToken ? { [CSRF_TOKEN_HEADER]: csrfToken } : {}),
      ...(init.idempotencyKey ? { "idempotency-key": init.idempotencyKey } : {}),
      origin: getSiteOrigin(),
      "x-request-id": requestId,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      const bodyMessage = body?.message;
      message = Array.isArray(bodyMessage) ? bodyMessage.join("، ") : bodyMessage || body?.error || message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

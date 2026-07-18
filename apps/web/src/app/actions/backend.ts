"use server";

import { cookies, headers } from "next/headers";
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from "@/lib/constants";

function getApiBaseUrl(): string {
  const configured = process.env.SERVER_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured?.startsWith("http")) return configured.replace(/\/$/, "");
  return "http://localhost:3001/api/v1";
}

function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured?.startsWith("http")) return new URL(configured).origin;
  return "http://localhost:3000";
}

/**
 * Validates CSRF token before making any backend request.
 * This prevents CSRF attacks by ensuring the request originates from a legitimate session.
 * 
 * Security checks:
 * 1. CSRF token must exist in cookies
 * 2. In production, token must be at least 32 characters (minimum entropy requirement)
 * 
 * @throws Error if CSRF validation fails
 */
async function validateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let csrfToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  
  if (!csrfToken) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/csrf-token`, {
        method: "GET",
      });
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        const match = setCookieHeader.match(/hyper_market_csrf_token=([^;]+)/);
        if (match) {
          csrfToken = match[1];
          cookieStore.set(CSRF_TOKEN_COOKIE, csrfToken, {
            httpOnly: false,
            path: "/",
          });
        }
      }
    } catch (err) {
      console.error("[SECURITY] Failed to recover CSRF token in Server Action", err);
    }
  }
  
  if (!csrfToken) {
    throw new Error("CSRF token missing - please refresh the page and try again");
  }
  
  // In production, enforce stricter validation
  if (process.env.NODE_ENV === "production") {
    // Check minimum length for security
    if (csrfToken.length < 32) {
      console.error("[SECURITY] Invalid CSRF token length detected");
      throw new Error("Invalid CSRF token - please refresh the page and try again");
    }
    
    // Check for suspicious patterns (e.g., all same characters)
    if (/^(.)\1+$/.test(csrfToken)) {
      console.error("[SECURITY] Suspicious CSRF token pattern detected");
      throw new Error("Invalid CSRF token - please refresh the page and try again");
    }
  }
  
  return csrfToken;
}

export async function backendFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  // Validate CSRF token before making any request
  const csrfToken = await validateCsrfToken();
  
  const cookieStore = await cookies();
  const headerStore = await headers();
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

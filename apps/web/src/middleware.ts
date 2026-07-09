import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin route protection middleware.
 *
 * Instead of making an API call to /auth/me on every admin page navigation
 * (which was slow and added unnecessary backend load), this middleware
 * reads the JWT access token from the cookie and extracts the role claim
 * via lightweight base64 decoding.
 *
 * Security notes:
 *   - The JWT is NOT verified here (signature check) — that happens on the
 *     backend via JwtStrategy. This middleware only provides a fast first
 *     line of defense to redirect non-admin users early.
 *   - If the token is expired, tampered, or has a stale role, the backend
 *     will reject it on the next API call, and the client-side auth store
 *     will redirect the user to login.
 *   - The definitive RBAC check still happens server-side via
 *     RolesGuard + PermissionsGuard on every API endpoint.
 */

const ACCESS_TOKEN_COOKIE = 'hyper_market_access_token';
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin']);
const ADMIN_PATHS = ['/admin'];
// Customer PII routes – require any authenticated user
const CUSTOMER_PROTECTED_PATHS = [
  '/profile',
  '/orders',
  '/checkout',
  '/wishlist',
  '/cart',
  '/order/success',
];
// Public auth pages – redirect authenticated users away (optional, can be handled client-side)
// const AUTH_PUBLIC_PATHS = ['/login', '/register', '/verify-otp'];

/**
 * Validates if a redirect URL is safe to use.
 * Prevents Open Redirect attacks by ensuring redirects only go to:
 * 1. Relative paths (starting with /)
 * 2. Same-origin URLs
 * 3. Whitelisted domains (for production)
 * 
 * @param url - The URL to validate
 * @param requestUrl - The current request URL for origin comparison
 * @returns true if the URL is safe for redirect
 */
function isSafeRedirectUrl(url: string, requestUrl: URL): boolean {
  try {
    // Allow relative paths (but not protocol-relative URLs like //evil.com)
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Additional check: ensure it doesn't contain suspicious patterns
      if (url.includes('..') || url.includes('@')) {
        return false;
      }
      return true;
    }

    // Parse the URL
    const redirectUrl = new URL(url, requestUrl.origin);
    const currentOrigin = requestUrl.origin;

    // Allow same-origin URLs
    if (redirectUrl.origin === currentOrigin) {
      return true;
    }

    // In production, only allow whitelisted domains
    if (process.env.NODE_ENV === 'production') {
      const allowedDomains = (process.env.ALLOWED_REDIRECT_DOMAINS || '')
        .split(',')
        .map(d => d.trim())
        .filter(Boolean);
      
      const hostname = redirectUrl.hostname + (redirectUrl.port ? `:${redirectUrl.port}` : '');
      return allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    }

    // In development, be more permissive but still block obvious attacks
    return false;
  } catch {
    // If URL parsing fails, it's not safe
    return false;
  }
}

/**
 * Decode the JWT payload without signature verification.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Base64url decode the payload (second part)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const jsonPayload = decodeURIComponent(
      atob(base64 + padding)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Extract the user's role from the access token cookie.
 */
function getRoleFromCookie(request: NextRequest): string | null {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.role !== 'string') {
    return null;
  }

  return payload.role;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
  const isCustomerProtectedPath = CUSTOMER_PROTECTED_PATHS.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (!isAdminPath && !isCustomerProtectedPath) {
    return NextResponse.next();
  }

  const role = getRoleFromCookie(request);
  const isAuthenticated = Boolean(role);

  // --- Admin RBAC ---
  if (isAdminPath) {
    if (!role || !ADMIN_ROLES.has(role)) {
      const loginUrl = new URL('/login', request.url);

      const redirectPath = pathname + request.nextUrl.search;
      if (isSafeRedirectUrl(redirectPath, request.nextUrl)) {
        loginUrl.searchParams.set('redirect', redirectPath);
      } else {
        console.warn(`[SECURITY] Blocked potentially unsafe redirect attempt: ${redirectPath}`);
      }

      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // --- Customer PII protection ---
  if (isCustomerProtectedPath) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      const redirectPath = pathname + request.nextUrl.search;
      if (isSafeRedirectUrl(redirectPath, request.nextUrl)) {
        loginUrl.searchParams.set('redirect', redirectPath);
      }
      // Don't set error=unauthorized for normal auth redirect – cleaner UX
      return NextResponse.redirect(loginUrl);
    }
    // Authenticated – allow (role-based fine-grained check happens in API)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/orders/:path*',
    '/checkout/:path*',
    '/wishlist/:path*',
    '/cart/:path*',
    '/cart',
    '/order/success/:path*',
    '/order/success',
    '/profile',
    '/orders',
    '/checkout',
    '/wishlist',
  ],
};

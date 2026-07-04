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
  if (!isAdminPath) {
    return NextResponse.next();
  }

  const role = getRoleFromCookie(request);

  if (!role || !ADMIN_ROLES.has(role)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

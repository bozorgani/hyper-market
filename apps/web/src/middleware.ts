import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Admin route protection middleware + CSP nonce hardening (Issue #17).
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
 *
 * CSP Nonce (Issue #17):
 *   - Generates a per-request cryptographic nonce.
 *   - Injects Content-Security-Policy with 'nonce-<value>' + 'strict-dynamic'
 *   - Removes 'unsafe-inline' from script-src in production-capable policy.
 *   - Exposes nonce via 'x-nonce' header for Server Components (headers()).
 *   - Style-src still allows 'unsafe-inline' temporarily (Tailwind runtime),
 *     to be phased out with hashes in Task 23 follow-up.
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

/**
 * Generate a CSP nonce – cryptographically strong, base64.
 * Uses Web Crypto API available in Edge runtime.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Convert to base64
  let binary = '';
  array.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Build Content-Security-Policy with per-request nonce.
 * - script-src: 'self' 'nonce-xxx' 'strict-dynamic' [unsafe-eval in dev] 'unsafe-inline' (fallback for older browsers)
 * - style-src: 'self' 'unsafe-inline' https://unpkg.com (Tailwind runtime – to be hardened with hashes later)
 * - Removes blanket 'unsafe-inline' from script-src in modern browsers via nonce+strict-dynamic
 */
function buildCsp(nonce: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const cspMode = process.env.CSP_MODE ?? 'report-only';
  const apiOrigin = originFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const siteOrigin = originFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const cspReportEndpoint = process.env.CSP_REPORT_ENDPOINT ?? '/api/csp-report';

  const connectSources = [
    "'self'",
    apiOrigin,
    siteOrigin,
    'https://nominatim.openstreetmap.org',
  ].filter(Boolean);

  const imageSources = [
    "'self'",
    'data:',
    'blob:',
    apiOrigin,
    siteOrigin,
    'https://*.tile.openstreetmap.org',
    'https://tile.openstreetmap.org',
    'https://placehold.co',
  ].filter(Boolean);

  // script-src: nonce + strict-dynamic is the modern secure pattern.
  // We KEEP 'unsafe-inline' as a fallback for Safari <15.4 / old browsers – 
  // browsers that support nonce will ignore unsafe-inline when nonce is present.
  // 'unsafe-eval' only in development (Next.js dev overlay needs it).
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallback for legacy browsers – will be ignored by nonce-aware browsers
    "'unsafe-inline'",
    !isProduction ? "'unsafe-eval'" : null,
    'https:',
    // Allow blob: workers
    'blob:',
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "font-src 'self' data:",
    // style-src: still needs unsafe-inline for Tailwind + Next.js – Phase 2 will add hashes
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src-elem 'self' 'unsafe-inline' https://unpkg.com",
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrc}`,
    `connect-src ${connectSources.join(' ')}`,
    `img-src ${imageSources.join(' ')}`,
    `media-src ${imageSources.join(' ')}`,
    cspMode === 'enforce' ? 'upgrade-insecure-requests' : null,
    `report-uri ${cspReportEndpoint}`,
    // Report-To is deprecated but keep report-uri for compatibility
  ]
    .filter(Boolean)
    .join('; ');

  return directives;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- CSP Nonce generation (applies to ALL routes matched) ----
  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const cspMode = process.env.CSP_MODE ?? 'report-only';
  const cspHeaderName =
    cspMode === 'enforce'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only';

  // Clone request headers to pass nonce downstream to Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-csp-nonce', nonce);
  // For Next.js to forward nonce to its own inline scripts (best-effort)
  requestHeaders.set('x-middleware-request-nonce', nonce);

  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
  const isCustomerProtectedPath = CUSTOMER_PROTECTED_PATHS.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  );

  // Helper to attach security + CSP headers to any response
  const withSecurityHeaders = (res: NextResponse) => {
    res.headers.set('x-nonce', nonce);
    res.headers.set('Content-Security-Policy-Nonce', nonce);
    res.headers.set(cspHeaderName, csp);
    // Harden additional response headers (defense-in-depth, mirrors next.config)
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.headers.set('Cross-Origin-Resource-Policy', 'same-site');
    res.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()'
    );
    return res;
  };

  // --- Admin RBAC ---
  if (isAdminPath) {
    const role = getRoleFromCookie(request);
    if (!role || !ADMIN_ROLES.has(role)) {
      const loginUrl = new URL('/login', request.url);
      const redirectPath = pathname + request.nextUrl.search;
      if (isSafeRedirectUrl(redirectPath, request.nextUrl)) {
        loginUrl.searchParams.set('redirect', redirectPath);
      } else {
        console.warn(`[SECURITY] Blocked potentially unsafe redirect attempt: ${redirectPath}`);
      }
      loginUrl.searchParams.set('error', 'unauthorized');
      const res = NextResponse.redirect(loginUrl);
      return withSecurityHeaders(res);
    }
    // Authenticated admin – continue with CSP
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withSecurityHeaders(res);
  }

  // --- Customer PII protection ---
  if (isCustomerProtectedPath) {
    const role = getRoleFromCookie(request);
    const isAuthenticated = Boolean(role);
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      const redirectPath = pathname + request.nextUrl.search;
      if (isSafeRedirectUrl(redirectPath, request.nextUrl)) {
        loginUrl.searchParams.set('redirect', redirectPath);
      }
      const res = NextResponse.redirect(loginUrl);
      return withSecurityHeaders(res);
    }
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    return withSecurityHeaders(res);
  }

  // --- Public routes: still apply CSP nonce ---
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return withSecurityHeaders(res);
}

export const config = {
  // Run on all app routes – exclude static assets, images, api internals
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, manifest files
     * - public asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|json|xml)$).*)',
  ],
};

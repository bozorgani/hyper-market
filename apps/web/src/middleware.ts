import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'];
const ADMIN_PATHS = ['/admin'];

function getApiBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

  if (configuredBaseUrl.startsWith('http://') || configuredBaseUrl.startsWith('https://')) {
    return configuredBaseUrl;
  }

  return new URL(configuredBaseUrl, request.url).toString().replace(/\/$/, '');
}

async function getVerifiedCurrentUser(request: NextRequest) {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return null;
  }

  try {
    const response = await fetch(`${getApiBaseUrl(request)}/auth/me`, {
      method: 'GET',
      headers: { cookie },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<{ role?: string }>;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
  if (!isAdminPath) {
    return NextResponse.next();
  }

  const user = await getVerifiedCurrentUser(request);

  if (!user?.role || !ADMIN_ROLES.includes(user.role)) {
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

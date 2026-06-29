import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'];
const ADMIN_PATHS = ['/admin'];

function decodeJwtPayload(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // فقط مسیرهای ادمین را چک می‌کنیم
  const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));
  if (!isAdminPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get('hyper_market_access_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);

  if (!payload || !payload.role || !ADMIN_ROLES.includes(payload.role)) {
    // کاربر ادمین نیست
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  // کاربر ادمین است → اجازه دسترسی
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
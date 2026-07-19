import { Request } from 'express';

export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.cookie;
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey) {
      result[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    }
  }
  return result;
}

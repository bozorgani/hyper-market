export interface JwtPayload {
  sub: string;
  role: string;
  sessionId: string;
  deviceId: string;
  tokenVersion: number;
  jti: string;
  iat?: number;
  exp?: number;
}

import type { NextConfig } from "next";

function originFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const isProduction = process.env.NODE_ENV === "production";
const cspMode = process.env.CSP_MODE ?? "report-only";
const apiOrigin = originFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const siteOrigin = originFromUrl(process.env.NEXT_PUBLIC_SITE_URL);
const cspReportEndpoint = process.env.CSP_REPORT_ENDPOINT ?? "/api/csp-report";

const connectSources = [
  "'self'",
  apiOrigin,
  siteOrigin,
  "https://nominatim.openstreetmap.org",
].filter(Boolean);

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  apiOrigin,
  siteOrigin,
  "https://*.tile.openstreetmap.org",
  "https://tile.openstreetmap.org",
].filter(Boolean);

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "font-src 'self' data:",
  // Next.js and a few components still need inline style attributes/classes.
  // Script nonces/hashes should be introduced before switching CSP_MODE=enforce.
  `style-src 'self' 'unsafe-inline' https://unpkg.com`,
  `style-src-elem 'self' 'unsafe-inline' https://unpkg.com`,
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  `connect-src ${connectSources.join(" ")}`,
  `img-src ${imageSources.join(" ")}`,
  `media-src ${imageSources.join(" ")}`,
  "upgrade-insecure-requests",
  `report-uri ${cspReportEndpoint}`,
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-Download-Options", value: "noopen" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
  {
    key: cspMode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

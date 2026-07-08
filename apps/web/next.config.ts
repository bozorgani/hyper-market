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
  "https://placehold.co",
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
  // Prevent clickjacking attacks
  { key: "X-Frame-Options", value: "DENY" },
  
  // Prevent MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  
  // Control referrer information
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  
  // Enable DNS prefetching for better performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  
  // Prevent Adobe products from embedding
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  
  // Prevent IE from opening downloads in site context
  { key: "X-Download-Options", value: "noopen" },
  
  // Prevent XSS in older browsers (modern browsers use CSP)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  
  // Control cross-origin behavior
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()",
  },
  
  // Enforce HTTPS in production
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
  
  // Content Security Policy
  {
    key: cspMode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
    value: cspDirectives,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/v1/products/images/**",
      },
      {
        protocol: "https",
        hostname: "**.hypermarket.ir",
        pathname: "/api/v1/products/images/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      // Add production domain when deployed
      // {
      //   protocol: "https",
      //   hostname: "api.yourdomain.com",
      //   pathname: "/api/v1/products/images/**",
      // },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Enable React strict mode for better performance
  reactStrictMode: true,
  
  // Optimize bundle size
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;

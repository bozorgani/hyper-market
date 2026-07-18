import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

function getConfiguredApiImagePattern(): ImageRemotePattern | null {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured?.startsWith("http")) return null;

  try {
    const url = new URL(configured);
    const basePath = url.pathname.replace(/\/$/, "");
    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: `${basePath || ""}/**`,
    };
  } catch {
    return null;
  }
}

const configuredApiImagePattern = getConfiguredApiImagePattern();

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
  { key: "X-XSS-Protection", value: "0" },
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
  // Content-Security-Policy is generated dynamically in proxy.ts with a per-request nonce.
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    remotePatterns: [
      ...(configuredApiImagePattern ? [configuredApiImagePattern] : []),
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hypermarket.ir",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.hypermarket.ir",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "up.railway.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.up.railway.app",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: false,
    contentDispositionType: "inline",
  },

  reactStrictMode: true,
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
  },
};

export default nextConfig;

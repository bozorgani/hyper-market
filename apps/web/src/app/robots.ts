import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";
  try {
    return new URL(url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/categories"],
        disallow: [
          "/search",
          "/admin",
          "/admin/*",
          "/api/",
          "/cart",
          "/checkout",
          "/orders",
          "/profile",
          "/profile/*",
          "/wishlist",
          "/login",
          "/forgot-password",
          "/register",
          "/verify-otp",
          "/order/success",
          "/*?*sort=",
          "/*?*page=",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

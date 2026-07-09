import type { MetadataRoute } from "next";

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://hypermarket.example.com";
  try {
    return new URL(url).origin;
  } catch {
    return "https://hypermarket.example.com";
  }
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/products", "/categories", "/search"],
        disallow: [
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

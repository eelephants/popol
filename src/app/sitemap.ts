import type { MetadataRoute } from "next";
import { POPULAR_TICKERS } from "@/lib/popular";

const SITE_URL = "https://popol-topaz.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...POPULAR_TICKERS.map((p) => ({
      url: `${SITE_URL}/stock/${p.ticker}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

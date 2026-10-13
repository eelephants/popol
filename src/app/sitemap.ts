import type { MetadataRoute } from "next";
import { SEED_TICKERS } from "@/lib/popular";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/allocate`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...SEED_TICKERS.map((p) => ({
      url: `${SITE_URL}/stock/${p.ticker}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

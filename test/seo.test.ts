import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { metadata as allocateMeta } from "@/app/allocate/layout";
import { SEED_TICKERS } from "@/lib/popular";
import { SITE_URL } from "@/lib/site";

describe("sitemap", () => {
  const urls = sitemap().map((e) => e.url);

  it("lists the allocate page", () => {
    expect(urls).toContain(`${SITE_URL}/allocate`);
  });

  it("lists every seed ticker in both markets", () => {
    for (const p of SEED_TICKERS) {
      expect(urls).toContain(`${SITE_URL}/stock/${p.ticker}`);
    }
  });
});

describe("allocate metadata", () => {
  it("has its own canonical instead of inheriting the home page's", () => {
    expect(allocateMeta.alternates?.canonical).toBe("/allocate");
  });

  // A child openGraph object replaces the root one wholesale, so the share
  // image must be restated here.
  it("keeps the share image", () => {
    expect(allocateMeta.openGraph?.images).toBeTruthy();
  });
});

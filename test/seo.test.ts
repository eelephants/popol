import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import { metadata as allocateMeta } from "@/app/allocate/layout";
import { metadata as readerMeta } from "@/app/reader/layout";
import { SEED_TICKERS } from "@/lib/popular";
import { SITE_URL } from "@/lib/site";
import type { NextConfig } from "next";
// @ts-expect-error -- next.config.mjs is plain JS and allowJs is off
import rawNextConfig from "../next.config.mjs";

const nextConfig: NextConfig = rawNextConfig;

describe("sitemap", () => {
  const urls = sitemap().map((e) => e.url);

  it("lists the allocate and reader pages", () => {
    expect(urls).toContain(`${SITE_URL}/allocate`);
    expect(urls).toContain(`${SITE_URL}/reader`);
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

describe("non-page files", () => {
  it("send X-Robots-Tag: noindex for the PWA manifest and service worker", async () => {
    const rules = await nextConfig.headers!();
    for (const path of ["/manifest.webmanifest", "/sw.js"]) {
      const rule = rules.find((r) => r.source === path);
      expect(rule?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex" });
    }
  });
});

describe("reader metadata", () => {
  it("has its own canonical and keeps the share image", () => {
    expect(readerMeta.alternates?.canonical).toBe("/reader");
    expect(readerMeta.openGraph?.images).toBeTruthy();
  });
});

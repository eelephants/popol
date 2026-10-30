import { describe, it, expect } from "vitest";
import { GUIDES, GUIDE_CATEGORIES, blockText, readingMinutes } from "@/lib/guides";
import { stockNarrative } from "@/lib/stockNarrative";
import { enrichStock } from "@/lib/enrich";
import { DEFAULT_THRESHOLDS } from "@/lib/types";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/site";

const bodyLength = (slug: string) => {
  const g = GUIDES.find((x) => x.slug === slug)!;
  return g.sections.flatMap((s) => s.body.flatMap(blockText)).join("").replace(/\s/g, "").length;
};

describe("guides", () => {
  it("have unique URL-safe slugs", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("link only to guides that exist, never to themselves", () => {
    const slugs = new Set(GUIDES.map((g) => g.slug));
    for (const g of GUIDES) {
      expect(g.related.length).toBeGreaterThan(0);
      for (const r of g.related) {
        expect(slugs.has(r)).toBe(true);
        expect(r).not.toBe(g.slug);
      }
    }
  });

  it("fill every category", () => {
    for (const c of GUIDE_CATEGORIES) expect(GUIDES.some((g) => g.category === c)).toBe(true);
  });

  // 심사·검색이 '얇은 페이지'로 보지 않도록 글마다 본문을 충분히 둔다.
  it("each carry a substantial body", () => {
    for (const g of GUIDES) {
      expect(bodyLength(g.slug), g.slug).toBeGreaterThan(1000);
      expect(readingMinutes(g)).toBeGreaterThanOrEqual(2);
    }
  });

  it("are listed in the sitemap with the about/terms/contact pages", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of ["/guide", "/about", "/terms", "/contact"]) expect(urls).toContain(`${SITE_URL}${p}`);
    for (const g of GUIDES) expect(urls).toContain(`${SITE_URL}/guide/${g.slug}`);
  });
});

describe("stockNarrative", () => {
  const item = {
    ticker: "TEST", name: "테스트", buyThesis: "", sellRisk: "",
    theme: { aiInfra: false, trump: false, tariff: false }, highOverride: null,
  };
  const closes = Array.from({ length: 250 }, (_, i) => 100 - i * 0.06);
  const s = enrichStock(item, {
    quote: { price: 85, previousClose: 86, volume: 2000, high52: 100, low52: 70, marketTime: Date.now(), currency: "USD" },
    history: { closes, volumes: closes.map(() => 1000) },
    valuation: { per: null, psr: null, pbr: null, roe: null },
    usdKrw: 1400,
    thresholds: DEFAULT_THRESHOLDS,
    isStale: false,
  });
  const lines = stockNarrative(s);

  it("describes the deepest reached buy zone", () => {
    expect(lines.find((l) => l.topic === "매수존")!.text).toContain("52주 최고가보다 15.0% 낮고, −15% 매수존 안에");
  });

  it("reads RSI and the 200-day trend with the screen's thresholds", () => {
    expect(lines.find((l) => l.topic === "RSI")!.text).toContain("침체권");
    expect(lines.find((l) => l.topic === "추세")!.text).toMatch(/200일 평균보다 [0-9.]+% 아래/);
  });

  it("points every line at an existing guide", () => {
    const slugs = new Set(GUIDES.map((g) => g.slug));
    for (const l of lines) expect(slugs.has(l.guide)).toBe(true);
  });
});

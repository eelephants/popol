import { describe, it, expect } from "vitest";
import { enrichStock } from "@/lib/enrich";
import { DEFAULT_THRESHOLDS, type WatchlistItem } from "@/lib/types";

const item: WatchlistItem = {
  ticker: "NVDA", name: "엔비디아", buyThesis: "AI 곡괭이", sellRisk: "미중/관세",
  theme: { aiInfra: true, trump: true, tariff: false }, highOverride: null,
};

const closes = Array.from({ length: 250 }, (_, i) => 100 - i * 0.06);
const volumes = Array.from({ length: 250 }, () => 1000);

it("combines config + market data into an EnrichedStock", () => {
  const s = enrichStock(item, {
    quote: { price: 85, previousClose: 86, volume: 2000, high52: 100, low52: 70, marketTime: Date.now() },
    history: { closes, volumes },
    valuation: { per: 30, psr: 20, pbr: 40, roe: 90 },
    usdKrw: 1500,
    thresholds: DEFAULT_THRESHOLDS,
    isStale: false,
  });
  expect(s.ticker).toBe("NVDA");
  expect(s.score).toBe(2);
  expect(s.high).toBe(100);
  expect(s.highSource).toBe("52w");
  expect(s.zones.find((z) => z.pct === 15)!.price).toBe(85);
  expect(s.zoneStatus).toBe("in-zone");
  expect(s.priceKrw).toBe(85 * 1500);
  expect(s.rsi14).toBe(0);
  expect(s.valuationBadges.per).toBe("fail");
  expect(s.volumeSpike).toBe(2);
});

it("uses sheet high override when provided", () => {
  const s = enrichStock(
    { ...item, highOverride: 120 },
    { quote: { price: 85, previousClose: 86, volume: 1000, high52: 100, low52: 70, marketTime: 0 },
      history: null, valuation: { per: null, psr: null, pbr: null, roe: null },
      usdKrw: null, thresholds: DEFAULT_THRESHOLDS, isStale: false },
  );
  expect(s.high).toBe(120);
  expect(s.highSource).toBe("sheet");
  expect(s.rsi14).toBeNull();
  expect(s.priceKrw).toBeNull();
});

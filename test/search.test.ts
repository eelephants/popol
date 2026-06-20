import { describe, it, expect } from "vitest";
import { filterByMarket } from "@/lib/providers/search";

const sample = [
  { symbol: "AAPL", name: "Apple", exchange: "NASDAQ" },
  { symbol: "005930.KS", name: "SamsungElec", exchange: "Korea" },
  { symbol: "247540.KQ", name: "EcoProBM", exchange: "Korea" },
];

describe("filterByMarket", () => {
  it("KR keeps only .KS/.KQ symbols", () => {
    expect(filterByMarket(sample, "KR").map((m) => m.symbol)).toEqual(["005930.KS", "247540.KQ"]);
  });
  it("US excludes .KS/.KQ symbols", () => {
    expect(filterByMarket(sample, "US").map((m) => m.symbol)).toEqual(["AAPL"]);
  });
});

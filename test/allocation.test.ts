import { describe, it, expect } from "vitest";
import { allocate, toKrw, formatMoney, convertAmount, formatShares, type AllocRow } from "@/lib/allocation";

const row = (over: Partial<AllocRow> = {}): AllocRow => ({
  symbol: "AAPL", name: "Apple", pct: 60, priceKrw: 100_000, ...over,
});

describe("allocate", () => {
  it("splits the total by percent and allows fractional shares", () => {
    const a = allocate(10_000_000, [row({ pct: 33, priceKrw: 400_000 })]);
    expect(a.rows[0].amountKrw).toBe(3_300_000);
    expect(a.rows[0].shares).toBe(8.25); // 소수점 매수 — 8주로 내리지 않는다
    expect(a.rows[0].filledKrw).toBe(3_300_000);
    expect(a.rows[0].leftoverKrw).toBe(0);
  });

  it("floors the share count at 6 decimals, the broker limit", () => {
    const a = allocate(50_000_000, [row({ pct: 33.3, priceKrw: 448_405.62 })]);
    expect(a.rows[0].amountKrw).toBe(16_650_000);
    expect(a.rows[0].shares).toBe(37.131559); // 37.1315596… → 내림
    expect(a.rows[0].leftoverKrw).toBeGreaterThan(0);
    expect(a.rows[0].leftoverKrw).toBeLessThan(1); // 남는 건 1원 미만
  });

  it("reports the unallocated remainder as cash when percents sum under 100", () => {
    const a = allocate(10_000_000, [row({ pct: 60 }), row({ symbol: "MSFT", pct: 20 })]);
    expect(a.pctTotal).toBe(80);
    expect(a.cashPct).toBe(20);
    expect(a.cashKrw).toBe(2_000_000);
    expect(a.overAllocated).toBe(false);
  });

  it("flags over-allocation when percents sum above 100", () => {
    const a = allocate(10_000_000, [row({ pct: 70 }), row({ symbol: "MSFT", pct: 50 })]);
    expect(a.pctTotal).toBe(120);
    expect(a.overAllocated).toBe(true);
    expect(a.cashPct).toBe(0);
    expect(a.cashKrw).toBe(0);
  });

  it("buys a part of a share when one share costs more than the allocated amount", () => {
    const a = allocate(1_000_000, [row({ pct: 10, priceKrw: 500_000 })]);
    expect(a.rows[0].shares).toBe(0.2);
    expect(a.rows[0].filledKrw).toBe(100_000);
    expect(a.rows[0].leftoverKrw).toBe(0);
  });

  it("leaves share math null when the price is unavailable (FX lookup failed)", () => {
    const a = allocate(10_000_000, [row({ pct: 60, priceKrw: null })]);
    expect(a.rows[0].amountKrw).toBe(6_000_000);
    expect(a.rows[0].shares).toBeNull();
    expect(a.rows[0].filledKrw).toBeNull();
    expect(a.rows[0].leftoverKrw).toBeNull();
  });

  it("excludes priceless rows from the leftover total instead of counting them as zero", () => {
    const a = allocate(50_000_000, [
      row({ pct: 33.3, priceKrw: 448_405.62 }),
      row({ symbol: "MSFT", pct: 10, priceKrw: null }),
    ]);
    expect(a.leftoverKrw).toBe(a.rows[0].leftoverKrw);
  });

  it("returns zeroed rows for a zero or negative total", () => {
    const a = allocate(0, [row()]);
    expect(a.rows[0].amountKrw).toBe(0);
    expect(a.rows[0].shares).toBe(0);
    expect(a.cashKrw).toBe(0);
  });
});

describe("toKrw", () => {
  it("passes a won amount through untouched", () => {
    expect(toKrw(10_000_000, "KRW", 1300)).toBe(10_000_000);
  });

  it("converts a dollar amount at the given rate", () => {
    expect(toKrw(10_000, "USD", 1300)).toBe(13_000_000);
  });

  it("returns null for a dollar amount with no rate available", () => {
    expect(toKrw(10_000, "USD", null)).toBeNull();
  });

  it("still passes won through when no rate is available", () => {
    expect(toKrw(10_000_000, "KRW", null)).toBe(10_000_000);
  });
});

describe("formatMoney", () => {
  it("renders won with a symbol and thousands separators", () => {
    expect(formatMoney(12_345_678, "KRW", 1300)).toBe("₩12,345,678");
  });

  it("converts to dollars at the given rate", () => {
    expect(formatMoney(13_000_000, "USD", 1300)).toBe("$10,000.00");
  });

  it("always shows cents so amounts in a row line up", () => {
    expect(formatMoney(42_671_888, "USD", 1532)).toBe("$27,853.71");
    expect(formatMoney(0, "USD", 1532)).toBe("$0.00");
  });

  it("falls back to won when dollars are requested without a rate", () => {
    expect(formatMoney(12_345_678, "USD", null)).toBe("₩12,345,678");
  });
});

describe("convertAmount", () => {
  it("keeps the same wealth when switching the display currency", () => {
    expect(convertAmount(13_000_000, "KRW", "USD", 1300)).toBe(10_000);
    expect(convertAmount(10_000, "USD", "KRW", 1300)).toBe(13_000_000);
  });

  it("rounds won to whole units and dollars to cents", () => {
    expect(convertAmount(50_000_000, "KRW", "USD", 1532)).toBe(32637.08);
    expect(convertAmount(32_637.08, "USD", "KRW", 1532)).toBe(50_000_007); // 왕복 환산은 무손실이 아니다
  });

  it("returns the amount untouched when the currency is unchanged", () => {
    expect(convertAmount(12_345, "KRW", "KRW", 1300)).toBe(12_345);
  });

  it("returns the amount untouched when no rate is available", () => {
    expect(convertAmount(50_000_000, "KRW", "USD", null)).toBe(50_000_000);
  });
});

describe("formatShares", () => {
  it("shows fractional shares to the broker's 6 decimals", () => {
    expect(formatShares(37.131559)).toBe("37.131559");
    expect(formatShares(8.25)).toBe("8.25");
    expect(formatShares(0.2)).toBe("0.2");
  });

  it("drops the decimal point for whole shares", () => {
    expect(formatShares(135)).toBe("135");
  });

  it("groups thousands", () => {
    expect(formatShares(1234.5)).toBe("1,234.5");
  });
});

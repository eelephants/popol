import { describe, it, expect } from "vitest";
import {
  levelOf, averageScore, ACTIONS, CHART_READER, STOCK_READER, CONTRARIAN_READER,
  upsideScore, putCallScore, vixScore, hySpreadScore,
} from "@/lib/readers";
import { fairPrice, customTarget, peg, median } from "@/lib/fairPrice";
import { concentration, sizeClass, weightFlag } from "@/lib/concentration";
import { lookupSector } from "@/lib/sectorMap";

const spec = (list: typeof CHART_READER, key: string) => list.find((s) => s.key === key)!;

describe("levelOf / averageScore", () => {
  // 예시: 차트 1,1,1,2 → 1.25 불안 / 주가 4,3,5,3 → 3.75 과열 / 역발상 1,3,1,4,3 → 2.4 중립
  it("matches the worked examples for the three readers", () => {
    expect(averageScore([1, 1, 1, 2])).toBe(1.25);
    expect(levelOf(1.25)).toBe("불안");
    expect(averageScore([4, 3, 5, 3])).toBe(3.75);
    expect(levelOf(3.75)).toBe("과열");
    expect(averageScore([1, 3, 1, 4, 3])).toBeCloseTo(2.4);
    expect(levelOf(2.4)).toBe("중립");
  });
  it("puts boundaries on the lower level, with boundaries on the lower level", () => {
    expect(levelOf(1)).toBe("공포");
    expect(levelOf(2)).toBe("불안");
    expect(levelOf(4)).toBe("과열");
    expect(levelOf(5)).toBe("광기");
  });
  it("averages only the indicators that have a value", () => {
    expect(averageScore([null, 4, null, 2])).toBe(3);
    expect(averageScore([null, null])).toBeNull();
  });
  it("maps each level to its trading action", () => {
    expect(ACTIONS["공포"]).toBe("역발상 매수(장기)");
    expect(ACTIONS["광기"]).toBe("분할 매도");
  });
});

describe("chart reader bands", () => {
  it("scores breadth with the lower bound inclusive", () => {
    const s = spec(CHART_READER, "breadth200").score;
    expect([85, 80, 75, 50, 25, 20, 10].map(s)).toEqual([5, 5, 4, 3, 2, 2, 1]);
  });
  it("scores 200-day disparity", () => {
    const s = spec(CHART_READER, "disparity200").score;
    expect([16, 12, 0, -12, -20].map(s)).toEqual([5, 4, 3, 2, 1]);
  });
  it("scores RSI with 20 on the fear side", () => {
    const s = spec(CHART_READER, "rsi").score;
    expect([85, 65, 45, 25, 20, 10].map(s)).toEqual([5, 4, 3, 2, 1, 1]);
    expect(s(null)).toBeNull();
  });
});

describe("stock reader bands", () => {
  it("scores market and stock P/E, null for losses", () => {
    expect([20, 18.5, 17, 15.5, 14].map(spec(STOCK_READER, "marketPe").score)).toEqual([5, 4, 3, 2, 1]);
    expect([60, 35, 25, 15, 8].map(spec(STOCK_READER, "stockPe").score)).toEqual([5, 4, 3, 2, 1]);
    expect(spec(STOCK_READER, "stockPe").score(-12)).toBeNull();
  });
  it("scores upside with 10-20% as 2", () => {
    expect([-3, 2, 7, 12, 17, 25].map(upsideScore)).toEqual([5, 4, 3, 2, 2, 1]);
  });
  it("scores PEG", () => {
    expect([3, 2.2, 1.7, 1.2, 0.8].map(spec(STOCK_READER, "peg").score)).toEqual([5, 4, 3, 2, 1]);
  });
});

describe("contrarian reader bands", () => {
  it("scores bull-bear spread and margin debt", () => {
    expect([35, 25, 0, -25, -40].map(spec(CONTRARIAN_READER, "bullBear").score)).toEqual([5, 4, 3, 2, 1]);
    expect([45, 30, 0, -25, -35].map(spec(CONTRARIAN_READER, "marginDebt").score)).toEqual([5, 4, 3, 2, 1]);
  });
  it("scores put/call and VIX in the inverse direction", () => {
    expect([0.35, 0.45, 0.8, 1.1, 1.3].map(putCallScore)).toEqual([5, 4, 3, 2, 1]);
    expect([12, 18, 25, 35, 45].map(vixScore)).toEqual([5, 4, 3, 2, 1]);
  });
  it("reads the high-yield spread by its path, not only its level", () => {
    expect(hySpreadScore({ latest: 2.8, low1y: 2.6, peak3m: 3.0 })).toBe(5);
    expect(hySpreadScore({ latest: 3.7, low1y: 2.6, peak3m: 3.8 })).toBe(4);
    expect(hySpreadScore({ latest: 3.6, low1y: 3.1, peak3m: 3.8 })).toBe(3);
    expect(hySpreadScore({ latest: 5.4, low1y: 3.1, peak3m: 5.4 })).toBe(2);
    expect(hySpreadScore({ latest: 4.9, low1y: 3.1, peak3m: 6.2 })).toBe(1);
    expect(hySpreadScore(null)).toBeNull();
  });
});

describe("fairPrice", () => {
  it("matches the TSLA worked example", () => {
    const r = fairPrice([1.63, 3.62, 4.3, 2.04, 1.69, 2.39], 330, 20.23);
    expect(r.medianGrowthPct).toBeCloseTo(18.78453, 4);
    expect(r.needsAdjustment).toBe(true); // 역성장 + 122% 변동
    expect(r.currentMultiple).toBeCloseTo(195.2663, 3);
    expect(r.base!.normalMultiple[1]).toBeCloseTo(37.56906, 4);
    expect(r.base!.fairRange[0]).toBeCloseTo(31.74586, 4);
    expect(r.base!.targetConservative).toBeCloseTo(63.49171, 4);
    expect(r.base!.targetBull).toBeCloseTo(79.36464, 4);
    expect(r.base!.upsideConservativePct).toBeCloseTo(-80.76009, 3);
    expect(r.adjusted!.fairRange).toEqual([expect.closeTo(34.1887, 4), expect.closeTo(68.3774, 4)]);
    expect(r.adjusted!.targetBull).toBeCloseTo(85.47175, 4);
    expect(r.adjusted!.upsideBullPct).toBeCloseTo(-74.09947, 3);
  });
  it("matches the MSFT worked example and its direct calculation", () => {
    const r = fairPrice([5.76, 8.05, 9.65, 9.68, 11.2, 12.88], 370, 13.98);
    expect(r.medianGrowthPct).toBeCloseTo(15.70248, 4);
    expect(r.base!.targetConservative).toBeCloseTo(351.73554, 4);
    expect(r.base!.upsideConservativePct).toBeCloseTo(-4.93634, 3);
    expect(r.adjusted!.targetConservative).toBeCloseTo(313.152, 4);
    const c = customTarget(50, r.forwardEps, 370)!;
    expect(c.target).toBeCloseTo(560, 6);
    expect(c.upsidePct).toBeCloseTo(51.35135, 3);
  });
  it("leaves the valuation empty when growth or forward EPS is not positive", () => {
    const r = fairPrice([2, 1.5, 1, 0.8, 0.6, 0.5], 10, null);
    expect(r.medianGrowthPct!).toBeLessThan(0);
    expect(r.base).toBeNull();
    expect(r.adjusted).toBeNull();
  });
  it("works with only some EPS entered", () => {
    const r = fairPrice([null, null, null, 4, 5, null], 100, null);
    expect(r.medianGrowthPct).toBeCloseTo(25, 6);
    expect(r.base!.targetConservative).toBeCloseTo(250, 6);
  });
  it("median and PEG helpers", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(peg(30, 15)).toBe(2);
    expect(peg(30, -5)).toBeNull();
  });
});

describe("concentration (몰빵지수)", () => {
  // 예시 포트폴리오, 단위 만원
  const sample = [
    { ticker: "TSLA", name: "Tesla", amount: 1181 },
    { ticker: "NVDA", name: "NVIDIA", amount: 59 },
    { ticker: "AMZN", name: "Amazon", amount: 115 },
    { ticker: "AAPL", name: "Apple", amount: 97 },
    { ticker: "PLTR", name: "Palantir", amount: 110 },
  ].map((h) => ({ ...h, sector: lookupSector(h.ticker)!.sector }));

  it("reproduces the sample's weights and sector split", () => {
    const r = concentration(sample);
    expect(r.total).toBe(1562);
    expect(r.rows[0].weightPct).toBeCloseTo(75.60819, 4);
    expect(r.rows[0].flag).toBe("reduce");
    expect(r.top!.ticker).toBe("TSLA");
    const tech = r.sectors.find((s) => s.sector === "기술")!;
    const disc = r.sectors.find((s) => s.sector === "경기소비재")!;
    expect(tech.weightPct).toBeCloseTo(17.02945, 4);
    expect(disc.weightPct).toBeCloseTo(82.97055, 4);
    expect(r.sectors.reduce((s, x) => s + x.weightPct, 0)).toBeCloseTo(100, 9);
  });
  it("classifies size and weight flags", () => {
    expect(sizeClass(3_816_821)).toBe("초대형");
    expect(sizeClass(176_888)).toBe("대형");
    expect(sizeClass(5_963)).toBe("중형");
    expect(sizeClass(null)).toBeNull();
    expect([35, 30, 25, 20, 19.9].map(weightFlag)).toEqual(["reduce", "reduce", "review", "review", "ok"]);
  });
  it("puts unknown tickers under 미분류 and ignores empty amounts", () => {
    const r = concentration([
      { ticker: "005930.KS", name: "삼성전자", amount: 300, sector: null },
      { ticker: "AAPL", name: "Apple", amount: 0, sector: "기술" },
    ]);
    expect(r.total).toBe(300);
    expect(r.sectors).toEqual([{ sector: "미분류", weightPct: 100 }]);
  });
  it("looks up the sector table", () => {
    expect(lookupSector("o")).toEqual({ sector: "리츠", marketCapM: 5963 });
    expect(lookupSector("BRK-B")?.sector).toBe("금융");
    expect(lookupSector("ZZZZ")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { forwardFromForecast, monthIndex } from "@/lib/providers/nasdaq";
import { parseAaii } from "@/lib/providers/aaii";

describe("forwardFromForecast (Nasdaq consensus)", () => {
  // MSFT: SEC 마지막 실적 FY2026(6월 결산) 17.95, Nasdaq 연간 컨센서스 FY2027~FY2030
  const msft = [
    { fiscalEnd: "Jun 2027", eps: 19.65 },
    { fiscalEnd: "Jun 2028", eps: 23.25 },
    { fiscalEnd: "Jun 2029", eps: 28.29 },
    { fiscalEnd: "Jun 2030", eps: 33.49 },
  ];

  it("takes the two fiscal years after the last reported one", () => {
    const f = forwardFromForecast(msft, { periodEnd: "2026-06-30", value: 17.95 })!;
    expect(f.next).toEqual([{ label: "FY2027", eps: 19.65 }, { label: "FY2028", eps: 23.25 }]);
  });

  it("computes the multi-year CAGR from the last actual to the furthest estimate", () => {
    const f = forwardFromForecast(msft, { periodEnd: "2026-06-30", value: 17.95 })!;
    expect(f.growthPct).toBeCloseTo((Math.pow(33.49 / 17.95, 1 / 4) - 1) * 100, 6);
    expect(f.growthBasis).toBe("FY2026 실적 → FY2030 예상, 4년 연평균");
  });

  it("skips estimates for years already reported", () => {
    const rows = [{ fiscalEnd: "Dec 2025", eps: 5 }, ...msft];
    const f = forwardFromForecast(rows, { periodEnd: "2026-06-30", value: 17.95 })!;
    expect(f.next[0].label).toBe("FY2027");
  });

  it("falls back to the first estimate as the base without reported EPS", () => {
    const f = forwardFromForecast(msft, null)!;
    expect(f.next[0].eps).toBe(19.65);
    expect(f.growthPct).toBeCloseTo((Math.pow(33.49 / 19.65, 1 / 3) - 1) * 100, 6);
    expect(f.growthBasis).toContain("FY2027 예상");
  });

  it("leaves growth empty for losses or too short a span", () => {
    expect(forwardFromForecast([{ fiscalEnd: "Dec 2027", eps: 1 }], { periodEnd: "2026-12-31", value: -2 })!.growthPct).toBeNull();
    expect(forwardFromForecast([{ fiscalEnd: "Dec 2027", eps: 2 }], { periodEnd: "2026-12-31", value: 1 })!.growthPct).toBeNull();
    expect(forwardFromForecast([], null)).toBeNull();
  });

  it("parses fiscal month labels", () => {
    expect(monthIndex("Jun 2027")).toBe(2027 * 12 + 5);
    expect(monthIndex("Sept 2026")).toBe(2026 * 12 + 8);
    expect(monthIndex("FY27")).toBeNull();
  });
});

describe("parseAaii", () => {
  const html = `
    <table><tr align="center"><td class="tableSubHd2">Reported Date</td><td>Bullish</td><td>Neutral</td><td>Bearish</td></tr>
    <tr align="center" bgcolor="ffffff"> <td align="left" class="tableTxt">Oct 21</td> <td align="right" class="tableTxt">36.9% </td>
      <td align="right" class="tableTxt">17.3%</td> <td align="right" class="tableTxt">45.8% </td> </tr>
    <tr><td class="tableTxt">Oct 14</td><td>38.7%</td><td>19.7%</td><td>41.6%</td></tr></table>`;

  it("reads the latest week and the bull-bear spread", () => {
    expect(parseAaii(html)).toEqual({ reportedDate: "Oct 21", bullish: 36.9, neutral: 17.3, bearish: 45.8, spread: -8.9 });
  });

  it("returns null when the table is missing", () => {
    expect(parseAaii("<html><body>blocked</body></html>")).toBeNull();
  });
});

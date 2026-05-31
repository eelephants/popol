import { describe, it, expect } from "vitest";
import { themeScore, valuationBadges, macroRegime } from "@/lib/scoring";
import { DEFAULT_THRESHOLDS } from "@/lib/types";

describe("themeScore", () => {
  it("sums the three theme flags", () => {
    expect(themeScore({ aiInfra: true, trump: true, tariff: true })).toBe(3);
    expect(themeScore({ aiInfra: true, trump: false, tariff: true })).toBe(2);
    expect(themeScore({ aiInfra: false, trump: false, tariff: false })).toBe(0);
  });
});

describe("valuationBadges", () => {
  const T = DEFAULT_THRESHOLDS; // PER<=15, PSR[1.5,3], PBR<=1.5, ROE[15,20]
  it("passes when all within rule", () => {
    expect(valuationBadges({ per: 12, psr: 2, pbr: 1.2, roe: 17 }, T)).toEqual({
      per: "pass", psr: "pass", pbr: "pass", roe: "pass",
    });
  });
  it("warns near the boundary and on ROE above the cap", () => {
    expect(valuationBadges({ per: 17, psr: 3.4, pbr: 1.7, roe: 25 }, T)).toEqual({
      per: "warn", psr: "warn", pbr: "warn", roe: "warn",
    });
  });
  it("fails when far off and ROE below floor", () => {
    expect(valuationBadges({ per: 40, psr: 6, pbr: 5, roe: 5 }, T)).toEqual({
      per: "fail", psr: "fail", pbr: "fail", roe: "fail",
    });
  });
  it("returns na for missing or negative PER (e.g. ETFs / unprofitable)", () => {
    expect(valuationBadges({ per: null, psr: null, pbr: null, roe: null }, T)).toEqual({
      per: "na", psr: "na", pbr: "na", roe: "na",
    });
    expect(valuationBadges({ per: -8, psr: 2, pbr: 1, roe: 17 }, T).per).toBe("na");
  });
});

describe("macroRegime", () => {
  it("extreme fear → aggressive shallow zones", () => {
    const r = macroRegime(18, 4.4, 3.5, 40);
    expect(r.regime).toBe("extreme-fear");
    expect(r.activeZones).toEqual([10, 15]);
  });
  it("extreme greed → only the deepest zone", () => {
    expect(macroRegime(82, 4.4, 3.0, 20).activeZones).toEqual([25]);
  });
  it("high-yield stress bumps one notch more cautious", () => {
    const r = macroRegime(40, 4.6, 6.0, 95);
    expect(r.activeZones).toEqual([20]);
  });
  it("carries the raw inputs through", () => {
    const r = macroRegime(50, 4.5, 3.2, 55);
    expect(r.fng).toBe(50);
    expect(r.tenYear).toBe(4.5);
    expect(r.hySpread).toBe(3.2);
  });
});

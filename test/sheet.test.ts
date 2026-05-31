import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseWatchlistCsv } from "@/lib/sheet";

const csv = readFileSync(fileURLToPath(new URL("./fixtures/sheet.csv", import.meta.url)), "utf8");

describe("parseWatchlistCsv", () => {
  const cfg = parseWatchlistCsv(csv);

  it("reads only numbered rows with a ticker, stopping at the blank row", () => {
    expect(cfg.items.map((i) => i.ticker)).toEqual(["TSLA", "PLTR", "QQQM", "XLU"]);
  });
  it("maps thesis, risk and theme flags (O/X → bool)", () => {
    const tsla = cfg.items[0];
    expect(tsla.name).toBe("테슬라");
    expect(tsla.buyThesis).toBe("자율주행/로봇");
    expect(tsla.sellRisk).toBe("미중/관세");
    expect(tsla.theme).toEqual({ aiInfra: true, trump: true, tariff: false });
  });
  it("treats empty theme cells as false (ETF rows)", () => {
    const qqqm = cfg.items.find((i) => i.ticker === "QQQM")!;
    expect(qqqm.theme).toEqual({ aiInfra: false, trump: false, tariff: false });
  });
  it("reads the manual high as override when present", () => {
    expect(cfg.items[0].highOverride).toBe(498.83);
  });
  it("parses user valuation thresholds from the bottom block", () => {
    expect(cfg.thresholds.roeRange).toEqual([15, 20]);
    expect(cfg.thresholds.perMax).toBe(15);
    expect(cfg.thresholds.psrRange).toEqual([1.5, 3]);
    expect(cfg.thresholds.pbrMax).toBe(1.5);
  });
});

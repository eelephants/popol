import { describe, it, expect } from "vitest";
import { resolveKrName } from "@/lib/krStocks";

describe("resolveKrName", () => {
  it("resolves an exact Korean name to its ticker", () => {
    const r = resolveKrName("삼성전자");
    expect(r.some((m) => m.symbol === "005930.KS")).toBe(true);
  });
  it("ignores surrounding spaces and is case-insensitive", () => {
    expect(resolveKrName(" 삼성 전자 ").some((m) => m.symbol === "005930.KS")).toBe(true);
  });
  it("partial query matches multiple Samsung names", () => {
    const syms = resolveKrName("삼성").map((m) => m.symbol);
    expect(syms).toContain("005930.KS");
    expect(syms.length).toBeGreaterThan(1);
  });
  it("labels exchange from suffix", () => {
    const ecopro = resolveKrName("에코프로비엠").find((m) => m.symbol === "247540.KQ");
    expect(ecopro?.exchange).toBe("코스닥");
    const samsung = resolveKrName("삼성전자").find((m) => m.symbol === "005930.KS");
    expect(samsung?.exchange).toBe("코스피");
  });
  it("returns [] for empty or unknown queries", () => {
    expect(resolveKrName("")).toEqual([]);
    expect(resolveKrName("zzzznotarealstock")).toEqual([]);
  });
});
